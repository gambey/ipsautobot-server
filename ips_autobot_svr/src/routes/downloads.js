const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware, requireUser } = require('../middleware/auth');

const router = express.Router();

/** App root = directory containing package.json (this file is src/routes/downloads.js). */
const APP_ROOT = path.resolve(__dirname, '..', '..');
const CLIENT_SETTINGS_ZIP = path.join(APP_ROOT, 'client_settings.zip');
const CLIENT_SETTINGS_YIFEI_ZIP = path.join(APP_ROOT, 'client_settings_yifei.zip');

function registerZipDownload(routePath, filePath, downloadName) {
  router.get(routePath, authMiddleware, requireUser, (req, res, next) => {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: `${downloadName} not found` });
    }
    res.download(filePath, downloadName, (err) => {
      if (err) next(err);
    });
  });
}

/**
 * @openapi
 * /api/client-settings.zip:
 *   get:
 *     summary: Download bundled client settings archive
 *     description: >-
 *       Returns client_settings.zip from the application root (same folder as package.json), not process.cwd().
 *       Requires user JWT in Authorization Bearer header; admin tokens are rejected.
 *     tags: [Downloads]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: ZIP file
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not present on server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Missing, invalid, or expired token
 *       403:
 *         description: User role required (admin JWT not allowed)
 */
registerZipDownload('/client-settings.zip', CLIENT_SETTINGS_ZIP, 'client_settings.zip');

/**
 * @openapi
 * /api/client-settings-yifei.zip:
 *   get:
 *     summary: Download yifei client settings archive
 *     description: >-
 *       Returns client_settings_yifei.zip from the application root (same folder as package.json).
 *       Requires user JWT in Authorization Bearer header; admin tokens are rejected.
 *     tags: [Downloads]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: ZIP file
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not present on server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Missing, invalid, or expired token
 *       403:
 *         description: User role required (admin JWT not allowed)
 */
registerZipDownload('/client-settings-yifei.zip', CLIENT_SETTINGS_YIFEI_ZIP, 'client_settings_yifei.zip');

module.exports = router;
