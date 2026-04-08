/**
 * Normalize users.member_expire_at_* to end-of-day 23:59:59 (zhiling / yifei).
 * Run once: node scripts/normalize-user-expire-eod.js
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

async function normalizeCol(conn, col) {
  const [exists] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['users', col]
  );
  if (exists[0].c === 0) {
    console.log(`Skip ${col} (column missing)`);
    return;
  }
  const [result] = await conn.query(
    `
    UPDATE users
    SET ${col} = TIMESTAMP(DATE(${col}), '23:59:59')
    WHERE ${col} IS NOT NULL
      AND TIME(${col}) <> '23:59:59'
  `
  );
  console.log(`Normalize ${col}. affected_rows=${result.affectedRows}`);
}

async function run() {
  const conn = await mysql.createConnection(config);
  try {
    await normalizeCol(conn, 'member_expire_at_zhiling');
    await normalizeCol(conn, 'member_expire_at_yifei');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Normalize failed:', err && (err.stack || err.message || err));
  process.exit(1);
});
