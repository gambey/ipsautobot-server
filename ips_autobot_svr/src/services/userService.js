const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { appColumnMap } = require('../utils/clientApp');

/** @typedef {'zhiling'|'yifei'} ClientApp */

const SALT_ROUNDS = 10;

const LIST_USER_COLS = `id, username, phone, created_at, last_login_at, status,
  member_type_zhiling, member_type_yifei,
  member_expire_at_zhiling, member_expire_at_yifei,
  score_zhiling, score_yifei,
  \`30d_score_zhiling\`, \`90d_score_zhiling\`, \`180d_score_zhiling\`, \`365d_score_zhiling\`,
  \`30d_score_yifei\`, \`90d_score_yifei\`, \`180d_score_yifei\`, \`365d_score_yifei\`,
  mac_addr_zhiling, mac_addr_yifei`;

const FULL_USER_COLS = `${LIST_USER_COLS}, password_hash, login_ip`;

/**
 * @param {import('../utils/clientApp').appColumnMap} app
 */
function clientSliceFromRow(row, app) {
  const a = app === 'zhiling' ? 'zhiling' : 'yifei';
  return {
    member_type: row[`member_type_${a}`],
    member_expire_at: row[`member_expire_at_${a}`],
    score: row[`score_${a}`] != null ? row[`score_${a}`] : 0,
    '30d_score': row[`30d_score_${a}`] != null ? row[`30d_score_${a}`] : 300,
    '90d_score': row[`90d_score_${a}`] != null ? row[`90d_score_${a}`] : 900,
    '180d_score': row[`180d_score_${a}`] != null ? row[`180d_score_${a}`] : 1800,
    '365d_score': row[`365d_score_${a}`] != null ? row[`365d_score_${a}`] : 3600,
    mac_addr: row[`mac_addr_${a}`] != null ? row[`mac_addr_${a}`] : null,
  };
}

function attachClients(row) {
  if (!row) return null;
  const {
    password_hash: _p,
    login_ip: _l,
    ...rest
  } = row;
  const base = {
    id: rest.id,
    username: rest.username,
    phone: rest.phone,
    status: rest.status,
    created_at: rest.created_at,
    last_login_at: rest.last_login_at,
  };
  return {
    ...base,
    clients: {
      zhiling: clientSliceFromRow(row, 'zhiling'),
      yifei: clientSliceFromRow(row, 'yifei'),
    },
  };
}

async function list({ page = 1, limit = 20, username, phone, status, created_at_from, created_at_to, last_login_from, last_login_to }) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;
  const where = [];
  const params = [];

  if (username && String(username).trim()) {
    where.push('username LIKE ?');
    params.push(`%${String(username).trim()}%`);
  }
  if (phone && String(phone).trim()) {
    where.push('phone LIKE ?');
    params.push(`%${String(phone).trim()}%`);
  }
  if (status !== undefined && status !== '' && (status === 0 || status === 1)) {
    where.push('status = ?');
    params.push(status);
  }
  if (created_at_from) {
    where.push('created_at >= ?');
    params.push(created_at_from);
  }
  if (created_at_to) {
    where.push('created_at <= ?');
    params.push(created_at_to);
  }
  if (last_login_from) {
    where.push('last_login_at >= ?');
    params.push(last_login_from);
  }
  if (last_login_to) {
    where.push('last_login_at <= ?');
    params.push(last_login_to);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ${LIST_USER_COLS}
     FROM users
     ${whereSql}
     ORDER BY created_at ASC
     LIMIT ?, ?`,
    [...params, offset, safeLimit]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`,
    params
  );

  return {
    items: rows.map((r) => attachClients(r)),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function findByPhone(phone) {
  const [rows] = await pool.query(
    `SELECT ${FULL_USER_COLS} FROM users WHERE phone = ?`,
    [phone]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const [rows] = await pool.query(
    `SELECT ${FULL_USER_COLS} FROM users WHERE username = ?`,
    [username]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${FULL_USER_COLS} FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByMacAddr(macAddr, app) {
  const col = appColumnMap(app).mac;
  const [rows] = await pool.query(`SELECT id, username, phone, ${col} AS mac_addr FROM users WHERE ${col} = ?`, [macAddr]);
  return rows[0] || null;
}

async function getMacAddrByUserId(userId, app) {
  const user = await findById(userId);
  if (!user) return null;
  const col = app === 'zhiling' ? 'mac_addr_zhiling' : 'mac_addr_yifei';
  return user[col] != null ? user[col] : null;
}

/** @param {ClientApp} app */
async function updateMacAddr(userId, macAddr, app) {
  const cols = appColumnMap(app);
  const macCol = cols.mac;
  const [conflict] = await pool.query(
    `SELECT id FROM users WHERE ${macCol} = ? AND id != ? LIMIT 1`,
    [macAddr, userId]
  );
  if (conflict.length > 0) {
    const err = new Error('MAC already bound to another user for this app');
    err.code = 'MAC_CONFLICT';
    throw err;
  }
  try {
    await pool.query(`UPDATE users SET ${macCol} = ? WHERE id = ?`, [macAddr, userId]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
      const dup = new Error('MAC already bound to another user for this app');
      dup.code = 'MAC_CONFLICT';
      throw dup;
    }
    throw e;
  }
}

async function clearMacAddr(userId, app) {
  const macCol = appColumnMap(app).mac;
  await pool.query(`UPDATE users SET ${macCol} = NULL WHERE id = ?`, [userId]);
}

async function create({ username, phone, password, memberType = 0 }) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (username, phone, password_hash, member_type_zhiling, member_type_yifei) VALUES (?, ?, ?, ?, 0)',
    [username || null, phone, hash, memberType]
  );
  return result.insertId;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function updateLastLogin(id, ip) {
  await pool.query('UPDATE users SET last_login_at = NOW(), login_ip = ? WHERE id = ?', [ip || null, id]);
}

async function changePassword(id, newPassword) {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
}

async function setDisabled(id, disabled) {
  await pool.query('UPDATE users SET status = ? WHERE id = ?', [disabled ? 0 : 1, id]);
}

async function updateUserById(id, payload = {}) {
  const fields = [];
  const params = [];

  const addField = (name, value) => {
    fields.push(`${name} = ?`);
    params.push(value);
  };
  const addFieldExpr = (expr, value) => {
    fields.push(expr);
    params.push(value);
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'username')) {
    const v = payload.username;
    addField('username', v == null || String(v).trim() === '' ? null : String(v).trim());
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    addField('phone', String(payload.phone).trim());
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    addField('status', parseInt(payload.status, 10));
  }

  const apps = ['zhiling', 'yifei'];
  for (const app of apps) {
    const mt = `member_type_${app}`;
    if (Object.prototype.hasOwnProperty.call(payload, mt)) {
      addField(mt, parseInt(payload[mt], 10));
    }
    const me = `member_expire_at_${app}`;
    if (Object.prototype.hasOwnProperty.call(payload, me)) {
      if (payload[me] == null || payload[me] === '') {
        addField(me, null);
      } else {
        addFieldExpr(`${me} = TIMESTAMP(DATE(?), '23:59:59')`, payload[me]);
      }
    }
    const sc = `score_${app}`;
    if (Object.prototype.hasOwnProperty.call(payload, sc)) {
      addField(sc, parseInt(payload[sc], 10));
    }
    for (const d of [30, 90, 180, 365]) {
      const k = `${d}d_score_${app}`;
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        addField(`\`${d}d_score_${app}\``, parseInt(payload[k], 10));
      }
    }
    const mac = `mac_addr_${app}`;
    if (Object.prototype.hasOwnProperty.call(payload, mac)) {
      addField(mac, payload[mac]);
    }
  }

  if (fields.length === 0) return;
  params.push(id);
  try {
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const e = new Error('Phone or MAC already exists');
      e.code = 'USER_UNIQUE_CONFLICT';
      throw e;
    }
    throw err;
  }
}

/** @param {ClientApp} app */
async function addMemberExpireDays(id, days, app) {
  const d = parseInt(days, 10);
  if (!Number.isInteger(d) || d <= 0) {
    const err = new Error('member_expire_days must be positive integer');
    err.statusCode = 400;
    throw err;
  }
  const col = appColumnMap(app).memberExpire;
  await pool.query(
    `UPDATE users
     SET ${col} = CASE
       WHEN ${col} IS NULL THEN TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL ? DAY), '23:59:59')
       ELSE TIMESTAMP(DATE(DATE_ADD(${col}, INTERVAL ? DAY)), '23:59:59')
     END
     WHERE id = ?`,
    [d, d, id]
  );
}

/** Subtract days from app-specific expiry; result not before today 23:59:59. @param {ClientApp} app */
async function subtractMemberExpireDays(id, days, app) {
  const d = parseInt(days, 10);
  if (!Number.isInteger(d) || d <= 0) {
    const err = new Error('member_reduce_days must be positive integer');
    err.statusCode = 400;
    throw err;
  }
  const col = appColumnMap(app).memberExpire;
  await pool.query(
    `UPDATE users
     SET ${col} = CASE
       WHEN ${col} IS NULL THEN NULL
       ELSE GREATEST(
         TIMESTAMP(DATE(DATE_SUB(${col}, INTERVAL ? DAY)), '23:59:59'),
         TIMESTAMP(CURDATE(), '23:59:59')
       )
     END
     WHERE id = ?`,
    [d, id]
  );
}

module.exports = {
  list,
  findByPhone,
  findByUsername,
  findById,
  findByMacAddr,
  getMacAddrByUserId,
  updateMacAddr,
  clearMacAddr,
  create,
  verifyPassword,
  updateLastLogin,
  changePassword,
  setDisabled,
  updateUserById,
  addMemberExpireDays,
  subtractMemberExpireDays,
  attachClients,
  clientSliceFromRow,
};
