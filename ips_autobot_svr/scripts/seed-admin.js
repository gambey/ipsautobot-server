/**
 * Create initial admin account (idempotent).
 * Username: admin, Password: admin123
 * Usage: npm run db:seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const INITIAL_ADMIN = {
  username: 'admin',
  password: 'admin123',
  phone: null,
};

const SALT_ROUNDS = 10;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'gR7iKWTvQLLqhhwn',
  database: process.env.DB_NAME || 'ips_autobot',
};

async function seed() {
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.query(
      'SELECT id FROM admins WHERE username = ?',
      [INITIAL_ADMIN.username]
    );
    if (rows.length > 0) {
      console.log('Initial admin already exists (username: admin). Skip seed.');
      return;
    }
    const hash = await bcrypt.hash(INITIAL_ADMIN.password, SALT_ROUNDS);
    await conn.query(
      'INSERT INTO admins (username, password_hash, phone) VALUES (?, ?, ?)',
      [INITIAL_ADMIN.username, hash, INITIAL_ADMIN.phone]
    );
    console.log('Initial admin created. Username: admin, Password: admin123');
    console.log('Please change the password after first login.');
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
