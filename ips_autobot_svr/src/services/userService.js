const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

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
    `SELECT id, username, phone, created_at, last_login_at, status, member_type, member_expire_at
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

  return { items: rows, total, page: safePage, limit: safeLimit };
}

async function findByPhone(phone) {
  const [rows] = await pool.query(
    'SELECT id, username, phone, password_hash, login_ip, last_login_at, created_at, member_type, member_expire_at, status FROM users WHERE phone = ?',
    [phone]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, username, phone, password_hash, login_ip, last_login_at, created_at, member_type, member_expire_at, status FROM users WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, phone, login_ip, last_login_at, created_at, member_type, member_expire_at, status FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function create({ username, phone, password, memberType = 0 }) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (username, phone, password_hash, member_type) VALUES (?, ?, ?, ?)',
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

module.exports = {
  list,
  findByPhone,
  findByUsername,
  findById,
  create,
  verifyPassword,
  updateLastLogin,
  changePassword,
  setDisabled,
};
