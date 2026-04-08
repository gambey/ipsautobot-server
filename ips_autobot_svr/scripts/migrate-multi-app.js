/**
 * Multi-app (zhiling / yifei): split users MAC/member/score/tiers; recharge tables; score_record.client_app.
 * Run: npm run db:migrate-multi-app
 *
 * Idempotent: safe to run multiple times.
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

async function columnExists(conn, table, column) {
  const [r] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return r[0].c > 0;
}

async function indexExists(conn, table, indexName) {
  const [r] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [table, indexName]
  );
  return r[0].c > 0;
}

async function tableExists(conn, name) {
  const [r] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [name]
  );
  return r[0].c > 0;
}

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    const stmts = [
      "ALTER TABLE users ADD COLUMN member_type_zhiling TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '智灵'",
      "ALTER TABLE users ADD COLUMN member_type_yifei TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '翼飞'",
      "ALTER TABLE users ADD COLUMN member_expire_at_zhiling DATETIME DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN member_expire_at_yifei DATETIME DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN score_zhiling INT NOT NULL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN score_yifei INT NOT NULL DEFAULT 0",
      'ALTER TABLE users ADD COLUMN `30d_score_zhiling` INT NOT NULL DEFAULT 300',
      'ALTER TABLE users ADD COLUMN `90d_score_zhiling` INT NOT NULL DEFAULT 900',
      'ALTER TABLE users ADD COLUMN `180d_score_zhiling` INT NOT NULL DEFAULT 1800',
      'ALTER TABLE users ADD COLUMN `365d_score_zhiling` INT NOT NULL DEFAULT 3600',
      'ALTER TABLE users ADD COLUMN `30d_score_yifei` INT NOT NULL DEFAULT 300',
      'ALTER TABLE users ADD COLUMN `90d_score_yifei` INT NOT NULL DEFAULT 900',
      'ALTER TABLE users ADD COLUMN `180d_score_yifei` INT NOT NULL DEFAULT 1800',
      'ALTER TABLE users ADD COLUMN `365d_score_yifei` INT NOT NULL DEFAULT 3600',
      "ALTER TABLE users ADD COLUMN mac_addr_zhiling VARCHAR(32) DEFAULT NULL COMMENT 'zhiling MAC'",
      "ALTER TABLE users ADD COLUMN mac_addr_yifei VARCHAR(32) DEFAULT NULL COMMENT 'yifei MAC'",
    ];
    for (const sql of stmts) {
      try {
        await conn.query(sql);
        console.log('OK:', sql.slice(0, 70));
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('Skip duplicate column');
        } else throw e;
      }
    }

    if (await columnExists(conn, 'users', 'mac_addr')) {
      console.log('Copy legacy mac_addr -> mac_addr_zhiling');
      await conn.query('UPDATE users SET mac_addr_zhiling = mac_addr WHERE mac_addr IS NOT NULL');
    }
    if (await columnExists(conn, 'users', 'member_expire_at')) {
      await conn.query('UPDATE users SET member_expire_at_zhiling = member_expire_at WHERE member_expire_at IS NOT NULL');
    }
    if (await columnExists(conn, 'users', 'member_type')) {
      await conn.query('UPDATE users SET member_type_zhiling = member_type');
    }
    if (await columnExists(conn, 'users', 'score')) {
      await conn.query('UPDATE users SET score_zhiling = COALESCE(score, 0)');
    }
    for (const [col, dest] of [
      ['30d_score', '`30d_score_zhiling`'],
      ['90d_score', '`90d_score_zhiling`'],
      ['180d_score', '`180d_score_zhiling`'],
      ['365d_score', '`365d_score_zhiling`'],
    ]) {
      if (await columnExists(conn, 'users', col)) {
        await conn.query(`UPDATE users SET ${dest} = COALESCE(\`${col}\`, ${dest})`);
      }
    }

    if (await indexExists(conn, 'users', 'uq_users_mac_addr')) {
      console.log('DROP INDEX uq_users_mac_addr');
      await conn.query('ALTER TABLE users DROP INDEX uq_users_mac_addr');
    }

    if (!(await indexExists(conn, 'users', 'uq_users_mac_zhiling'))) {
      await conn.query('CREATE UNIQUE INDEX uq_users_mac_zhiling ON users (mac_addr_zhiling)');
      console.log('Created uq_users_mac_zhiling');
    }
    if (!(await indexExists(conn, 'users', 'uq_users_mac_yifei'))) {
      await conn.query('CREATE UNIQUE INDEX uq_users_mac_yifei ON users (mac_addr_yifei)');
      console.log('Created uq_users_mac_yifei');
    }

    const dropLegacy = [
      'mac_addr',
      'member_expire_at',
      'member_type',
      'score',
      '30d_score',
      '90d_score',
      '180d_score',
      '365d_score',
    ];
    for (const name of dropLegacy) {
      if (await columnExists(conn, 'users', name)) {
        console.log(`DROP COLUMN users.${name}`);
        await conn.query(`ALTER TABLE users DROP COLUMN \`${name}\``);
      }
    }

    if ((await tableExists(conn, 'recharge_records')) && !(await tableExists(conn, 'recharge_records_zhiling'))) {
      await conn.query('RENAME TABLE recharge_records TO recharge_records_zhiling');
      console.log('RENAMED recharge_records -> recharge_records_zhiling');
    }
    if (!(await tableExists(conn, 'recharge_records_yifei'))) {
      await conn.query(`
        CREATE TABLE recharge_records_yifei (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNSIGNED NOT NULL,
          username VARCHAR(64) NOT NULL,
          recharge_date DATETIME NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          result TINYINT UNSIGNED NOT NULL COMMENT '0=失败 1=成功',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created recharge_records_yifei');
    }

    if (!(await columnExists(conn, 'score_record', 'client_app'))) {
      await conn.query(`
        ALTER TABLE score_record
        ADD COLUMN client_app VARCHAR(16) NOT NULL DEFAULT 'zhiling' COMMENT 'zhiling|yifei' AFTER user_id
      `);
      await conn.query(`UPDATE score_record SET client_app = 'zhiling'`);
      console.log('Added score_record.client_app');
    }

    console.log('Multi-app migration done.');
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
