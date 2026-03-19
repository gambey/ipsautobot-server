/**
 * Add username column to users table (for existing DBs created before this field).
 * Run once: node scripts/migrate-add-user-username.js
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
      ALTER TABLE users
      ADD COLUMN username VARCHAR(64) DEFAULT NULL COMMENT '用户名' AFTER id
    `);
    console.log('Migration done: users.username added (or already present).');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column users.username already exists. Skip.');
    } else {
      throw err;
    }
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
