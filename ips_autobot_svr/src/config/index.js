require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'gR7iKWTvQLLqhhwn',
    database: process.env.DB_NAME || 'ips_autobot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  rsa: {
    privateKeyPem: process.env.RSA_PRIVATE_KEY_PEM || '',
    publicKeyPem: process.env.RSA_PUBLIC_KEY_PEM || '',
  },

  log: {
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
    maxSize: '30m',
    maxFiles: 5,
  },
};
