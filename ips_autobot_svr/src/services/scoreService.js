const pool = require('../config/db');

function resolveTierKey(tierDays, app) {
  const t = parseInt(tierDays, 10);
  const suffix = app;
  if (t === 30) return `30d_score_${suffix}`;
  if (t === 90) return `90d_score_${suffix}`;
  if (t === 180) return `180d_score_${suffix}`;
  if (t === 365) return `365d_score_${suffix}`;
  return null;
}

function scoreColumnForApp(app) {
  return app === 'zhiling' ? 'score_zhiling' : 'score_yifei';
}

/**
 * @param {object} params
 * @param {'zhiling'|'yifei'} params.app
 */
async function changeScore({ userId, scoreChange, changeType, tierDays, app }) {
  const type = parseInt(changeType, 10);
  if (!(type === 0 || type === 1)) {
    const err = new Error('change_type must be 0 or 1');
    err.statusCode = 400;
    throw err;
  }
  const tierKey = resolveTierKey(tierDays, app);
  if (!tierKey) {
    const err = new Error('tier_days must be one of 30, 90, 180, 365');
    err.statusCode = 400;
    throw err;
  }

  const scoreCol = scoreColumnForApp(app);
  const tierCol = `\`${tierKey}\``;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users] = await conn.query(
      `SELECT id, username, phone, ${scoreCol}, ${tierCol}
       FROM users WHERE id = ? FOR UPDATE`,
      [userId]
    );
    if (users.length === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const user = users[0];
    const delta = parseInt(scoreChange ?? user[tierKey], 10);
    if (!Number.isInteger(delta) || delta <= 0) {
      const err = new Error('tier score must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    const before = parseInt(user[scoreCol] || 0, 10);
    const signedDelta = type === 0 ? delta : -delta;
    const after = before + signedDelta;
    if (after < 0) {
      const err = new Error('Insufficient score');
      err.statusCode = 400;
      throw err;
    }

    await conn.query(`UPDATE users SET ${scoreCol} = ? WHERE id = ?`, [after, user.id]);
    const [insertRes] = await conn.query(
      `INSERT INTO score_record
       (user_id, client_app, username, phone, score_before, score_after, score_change, change_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user.id, app, user.username || null, user.phone, before, after, delta, type]
    );

    const [records] = await conn.query(
      `SELECT id, user_id, client_app, username, phone, score_before, score_after, score_change, change_type, created_at
       FROM score_record WHERE id = ?`,
      [insertRes.insertId]
    );
    await conn.commit();
    return { record: records[0], score: after, app };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function list(page = 1, limit = 20, filters = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];

  if (filters.client_app) {
    where.push('client_app = ?');
    params.push(filters.client_app);
  }
  if (filters.user_id) {
    where.push('user_id = ?');
    params.push(parseInt(filters.user_id, 10));
  }
  if (filters.username && String(filters.username).trim()) {
    where.push('username LIKE ?');
    params.push(`%${String(filters.username).trim()}%`);
  }
  if (filters.phone && String(filters.phone).trim()) {
    where.push('phone LIKE ?');
    params.push(`%${String(filters.phone).trim()}%`);
  }
  if (filters.change_type !== undefined && filters.change_type !== '') {
    const ct = parseInt(filters.change_type, 10);
    if (ct === 0 || ct === 1) {
      where.push('change_type = ?');
      params.push(ct);
    }
  }
  if (filters.start_date) {
    where.push('created_at >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    where.push('created_at <= ?');
    params.push(filters.end_date);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, user_id, client_app, username, phone, score_before, score_after, score_change, change_type, created_at
     FROM score_record
     ${whereSql}
     ORDER BY id DESC
     LIMIT ?, ?`,
    [...params, offset, safeLimit]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM score_record ${whereSql}`,
    params
  );
  const sumWhere = where.length ? `${whereSql} AND change_type = 0` : 'WHERE change_type = 0';
  const sumParams = where.length ? [...params] : [];
  const [[sumRow]] = await pool.query(
    `SELECT COALESCE(SUM(score_change), 0) AS sum_add
     FROM score_record
     ${sumWhere}`,
    sumParams
  );
  return {
    items: rows,
    total,
    page: safePage,
    limit: safeLimit,
    sum_add: parseInt(sumRow?.sum_add, 10) || 0,
  };
}

module.exports = {
  changeScore,
  list,
  resolveTierKey,
};
