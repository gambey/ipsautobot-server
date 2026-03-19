/**
 * Run schema against existing DB. Ensure MySQL is up (e.g. docker-compose up -d) and DB exists.
 * Usage: npm run db:init
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'gR7iKWTvQLLqhhwn',
  database: process.env.DB_NAME || 'ips_autobot',
  multipleStatements: true,
};

async function init() {
  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(sql);
    console.log('Schema applied successfully.');
  } finally {
    await conn.end();
  }
}

init().catch((err) => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
