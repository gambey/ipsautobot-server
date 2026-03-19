const pool = require('../config/db');

async function create({ userId, username, amount, result }) {
  const [r] = await pool.query(
    'INSERT INTO recharge_records (user_id, username, recharge_date, amount, result) VALUES (?, ?, NOW(), ?, ?)',
    [userId, username, amount, result ? 1 : 0]
  );
  return r.insertId;
}

async function list(page = 1, limit = 20, filters = {}) {
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
    `SELECT id, user_id, username, recharge_date, amount, result, created_at FROM recharge_records ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM recharge_records ${whereClause}`,
    params
  );
  return { list: rows, total };
}

module.exports = {
  create,
  list,
};
