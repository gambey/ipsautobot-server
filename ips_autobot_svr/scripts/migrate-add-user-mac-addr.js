/**
 * Add mac_addr column and unique index to users (global unique MAC binding).
 * Run once: node scripts/migrate-add-user-mac-addr.js
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
      ADD COLUMN mac_addr VARCHAR(32) DEFAULT NULL COMMENT '网卡 MAC'
      AFTER member_expire_at
    `);
    console.log('Migration step 1: users.mac_addr column added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column users.mac_addr already exists. Skip add column.');
    } else {
      throw err;
    }
  }

  try {
    await conn.query(`
      CREATE UNIQUE INDEX uq_users_mac_addr ON users (mac_addr)
    `);
    console.log('Migration step 2: UNIQUE INDEX uq_users_mac_addr created.');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('Index uq_users_mac_addr already exists. Skip.');
    } else {
      throw err;
    }
  }

  console.log('Migration done: users.mac_addr + unique index.');
  await conn.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
