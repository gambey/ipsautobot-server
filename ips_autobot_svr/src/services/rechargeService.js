const pool = require('../config/db');

const TABLES = { zhiling: 'recharge_records_zhiling', yifei: 'recharge_records_yifei' };

function tableForApp(app) {
  const t = TABLES[app];
  if (!t) {
    const err = new Error('Invalid app');
    err.statusCode = 400;
    throw err;
  }
  return t;
}

async function create(app, { userId, username, amount, result }) {
  const table = tableForApp(app);
  const [r] = await pool.query(
    `INSERT INTO \`${table}\` (user_id, username, recharge_date, amount, result) VALUES (?, ?, NOW(), ?, ?)`,
    [userId, username, amount, result ? 1 : 0]
  );
  return r.insertId;
}

async function list(app, page = 1, limit = 20, filters = {}) {
  const table = tableForApp(app);
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const l = Math.min(100, Math.max(1, limit));
  let where = [];
  let params = [];
  if (filters.user_id) {
    where.push('user_id = ?');
    params.push(filters.user_id);
  }
  if (filters.result !== undefined && filters.result !== '') {
    where.push('result = ?');
    params.push(filters.result ? 1 : 0);
  }
  if (filters.start_date) {
    where.push('recharge_date >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    where.push('recharge_date <= ?');
    params.push(filters.end_date);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, user_id, username, recharge_date, amount, result, created_at FROM \`${table}\` ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM \`${table}\` ${whereClause}`,
    params
  );
  return { list: rows, total, app };
}

async function findById(app, id) {
  const table = tableForApp(app);
  const [rows] = await pool.query(
    `SELECT id, user_id, username, recharge_date, amount, result, created_at FROM \`${table}\` WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  list,
  findById,
  TABLES,
};
