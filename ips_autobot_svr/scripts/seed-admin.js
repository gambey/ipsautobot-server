/**
 * Create initial admin account (idempotent).
 * Username: admin, Password: admin123
 * The account is always 超级管理员 (admin_type=0); if `admin` already exists as normal admin, it is upgraded.
 * Usage: npm run db:seed
 * Manual SQL (if you cannot run this script): UPDATE admins SET admin_type = 0 WHERE username = 'admin';
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

/** 0 = super admin, 1 = normal admin (see schema / admins.admin_type) */
const SUPER_ADMIN_TYPE = 0;

const INITIAL_ADMIN = {
  username: 'admin',
  password: 'admin123',
  phone: null,
  admin_type: SUPER_ADMIN_TYPE,
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
      'SELECT id, admin_type FROM admins WHERE username = ?',
      [INITIAL_ADMIN.username]
    );
    if (rows.length > 0) {
      const t = rows[0].admin_type;
      // NULL must not be treated as super admin (Number(null) is 0 in JS).
      const isSuper =
        t !== null && t !== undefined && Number(t) === SUPER_ADMIN_TYPE;
      if (!isSuper) {
        await conn.query('UPDATE admins SET admin_type = ? WHERE username = ?', [
          SUPER_ADMIN_TYPE,
          INITIAL_ADMIN.username,
        ]);
        console.log("Existing user 'admin' set to super admin (admin_type=0).");
      } else {
        console.log("Initial admin already exists (username: admin, super admin). Skip seed.");
      }
      return;
    }

    const hash = await bcrypt.hash(INITIAL_ADMIN.password, SALT_ROUNDS);
    await conn.query(
      'INSERT INTO admins (username, password_hash, phone, admin_type) VALUES (?, ?, ?, ?)',
      [INITIAL_ADMIN.username, hash, INITIAL_ADMIN.phone, INITIAL_ADMIN.admin_type]
    );
    console.log('Initial admin created (super admin). Username: admin, Password: admin123');
    console.log('Please change the password after first login.');
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
