/**
 * Add users score tier columns:
 * - 30d_score default 300
 * - 90d_score default 900
 * - 180d_score default 1800
 * - 365d_score default 3600
 *
 * Run once: node scripts/migrate-add-user-score-tiers.js
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

async function addColumnIfMissing(conn, columnName, ddl) {
  try {
    await conn.query(ddl);
    console.log(`Column users.${columnName} added.`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`Column users.${columnName} already exists. Skip.`);
      return;
    }
    throw err;
  }
}

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    await addColumnIfMissing(
      conn,
      '30d_score',
      "ALTER TABLE users ADD COLUMN `30d_score` INT NOT NULL DEFAULT 300 COMMENT '30天积分' AFTER score"
    );
    await addColumnIfMissing(
      conn,
      '90d_score',
      "ALTER TABLE users ADD COLUMN `90d_score` INT NOT NULL DEFAULT 900 COMMENT '90天积分' AFTER `30d_score`"
    );
    await addColumnIfMissing(
      conn,
      '180d_score',
      "ALTER TABLE users ADD COLUMN `180d_score` INT NOT NULL DEFAULT 1800 COMMENT '180天积分' AFTER `90d_score`"
    );
    await addColumnIfMissing(
      conn,
      '365d_score',
      "ALTER TABLE users ADD COLUMN `365d_score` INT NOT NULL DEFAULT 3600 COMMENT '365天积分' AFTER `180d_score`"
    );
  } finally {
    await conn.end();
  }
}

migrate()
  .then(() => {
    console.log('Migration done: users score tier columns added.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err && (err.stack || err.message || err));
    process.exit(1);
  });
