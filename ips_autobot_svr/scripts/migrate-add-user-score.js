/**
 * Add score column to users and create score_record table.
 * Run once: node scripts/migrate-add-user-score.js
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

async function ensureIndex(conn, tableName, indexName, ddl) {
  const [rows] = await conn.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [indexName]);
  if (rows.length > 0) {
    console.log(`Index ${indexName} already exists on ${tableName}. Skip.`);
    return;
  }
  await conn.query(ddl);
  console.log(`Index ${indexName} created.`);
}

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(`
      ALTER TABLE users
      ADD COLUMN score INT NOT NULL DEFAULT 0 COMMENT '用户积分' AFTER member_expire_at
    `);
    console.log('Column users.score added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column users.score already exists. Skip.');
    } else {
      throw err;
    }
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS score_record (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      username VARCHAR(64) DEFAULT NULL,
      phone VARCHAR(32) NOT NULL,
      score_before INT NOT NULL,
      score_after INT NOT NULL,
      score_change INT NOT NULL,
      change_type TINYINT UNSIGNED NOT NULL COMMENT '0=增加 1=减少',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Table score_record ensured.');

  await ensureIndex(conn, 'score_record', 'idx_user_id', 'CREATE INDEX idx_user_id ON score_record (user_id)');
  await ensureIndex(conn, 'score_record', 'idx_phone', 'CREATE INDEX idx_phone ON score_record (phone)');
  await ensureIndex(conn, 'score_record', 'idx_change_type', 'CREATE INDEX idx_change_type ON score_record (change_type)');
  await ensureIndex(conn, 'score_record', 'idx_created_at', 'CREATE INDEX idx_created_at ON score_record (created_at)');
}

migrate()
  .then(() => {
    console.log('Migration done: users.score + score_record.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err && (err.stack || err.message || err));
    process.exit(1);
  });
