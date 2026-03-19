const path = require('path');
const fs = require('fs');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');

const logDir = path.join(process.cwd(), 'logs');

const rotateOpts = {
  maxSize: config.log.maxSize,
  maxFiles: config.log.maxFiles,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
};

function createLoginLogger(name) {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        ...rotateOpts,
        filename: path.join(logDir, `${name}-%DATE%.log`),
      }),
    ],
  });
}

const adminLoginLogger = createLoginLogger('admin-login');
const userLoginLogger = createLoginLogger('user-login');

/** Delete log files older than LOG_RETENTION_DAYS. Call periodically (e.g. daily). */
function cleanupOldLogFiles() {
  const retentionDays = config.log.retentionDays || 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  if (!fs.existsSync(logDir)) return;
  const files = fs.readdirSync(logDir);
  for (const f of files) {
    if (!f.match(/^(admin-login|user-login)-\d{4}-\d{2}-\d{2}/)) continue;
    const full = path.join(logDir, f);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
    } catch (_) {}
  }
}

module.exports = {
  adminLoginLogger,
  userLoginLogger,
  cleanupOldLogFiles,
};
