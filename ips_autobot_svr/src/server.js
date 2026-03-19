require('dotenv').config();
const app = require('./app');
const config = require('./config');
const { cleanupOldLogFiles } = require('./utils/logger');

const port = config.port;

app.listen(port, () => {
  console.log(`ips_autobot_svr listening on port ${port}`);
});

// Run log retention cleanup daily (delete files older than LOG_RETENTION_DAYS)
const dayMs = 24 * 60 * 60 * 1000;
setInterval(cleanupOldLogFiles, dayMs);
cleanupOldLogFiles();
