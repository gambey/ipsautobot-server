const mysql = require('mysql2/promise');
const config = require('./index');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  // Keep DATETIME as DB strings to avoid timezone conversion drift (e.g. 23:59:59 -> 07:59:59).
  dateStrings: true,
  waitForConnections: config.db.waitForConnections,
  connectionLimit: config.db.connectionLimit,
  queueLimit: config.db.queueLimit,
});

module.exports = pool;
