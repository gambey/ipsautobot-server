const pool = require('../config/db');

async function getAdminLoginLogs(page = 1, limit = 20, filters = {}) {
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const l = Math.min(100, Math.max(1, limit));
  let where = [];
  let params = [];
  if (filters.username) {
    where.push('username LIKE ?');
    params.push(`%${filters.username}%`);
  }
  if (filters.success !== undefined && filters.success !== '') {
    where.push('success = ?');
    params.push(filters.success ? 1 : 0);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, admin_id, username, ip, success, created_at FROM admin_login_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM admin_login_logs ${whereClause}`,
    params
  );
  return { list: rows, total };
}

async function getUserLoginLogs(page = 1, limit = 20, filters = {}) {
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const l = Math.min(100, Math.max(1, limit));
  let where = [];
  let params = [];
  if (filters.phone) {
    where.push('phone LIKE ?');
    params.push(`%${filters.phone}%`);
  }
  if (filters.success !== undefined && filters.success !== '') {
    where.push('success = ?');
    params.push(filters.success ? 1 : 0);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, user_id, phone, ip, success, created_at FROM user_login_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM user_login_logs ${whereClause}`,
    params
  );
  return { list: rows, total };
}

module.exports = {
  getAdminLoginLogs,
  getUserLoginLogs,
};
