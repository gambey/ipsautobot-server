/**
 * Add admin_type to admins table.
 * Run once: node scripts/migrate-add-admin-type.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'gR7iKWTvQLLqhhwn',
  database: process.env.DB_NAME || 'ips_autobot',
};

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(`
      ALTER TABLE admins
      ADD COLUMN admin_type TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '0=超级管理员 1=普通管理员'
      AFTER password_hash
    `);
    console.log('Column admins.admin_type added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column admins.admin_type already exists. Skip.');
    } else {
      throw err;
    }
  }

  await conn.query("UPDATE admins SET admin_type = 0 WHERE username = 'admin'");
  console.log("Ensured username='admin' is super admin.");
  await conn.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err && (err.stack || err.message || err));
  process.exit(1);
});
