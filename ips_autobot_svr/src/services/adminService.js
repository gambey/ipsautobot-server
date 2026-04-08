const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash, admin_type, phone, created_at, last_login_at FROM admins WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, admin_type, phone, created_at, last_login_at FROM admins WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function list({ page = 1, limit = 20, username }) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;
  const where = [];
  const params = [];

  if (username) {
    where.push('username LIKE ?');
    params.push(`%${username}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT id, username, admin_type, phone, created_at, last_login_at
     FROM admins
     ${whereSql}
     ORDER BY created_at ASC
     LIMIT ?, ?`,
    [...params, offset, safeLimit]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM admins ${whereSql}`,
    params
  );

  return { items: rows, total, page: safePage, limit: safeLimit };
}

async function create({ username, password, phone, adminType = 1 }) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO admins (username, password_hash, admin_type, phone) VALUES (?, ?, ?, ?)',
    [username, hash, adminType, phone || null]
  );
  return result.insertId;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function updateLastLoginAt(id) {
  await pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [id]);
}

async function changePassword(id, newPassword) {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, id]);
}

async function remove(id) {
  await pool.query('DELETE FROM admins WHERE id = ?', [id]);
}

module.exports = {
  findByUsername,
  findById,
  list,
  create,
  verifyPassword,
  updateLastLoginAt,
  changePassword,
  remove,
};
