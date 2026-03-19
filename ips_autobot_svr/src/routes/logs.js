const express = require('express');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const logController = require('../controllers/logController');

const router = express.Router();

/**
 * @openapi
 * /api/logs/admin-login:
 *   get:
 *     summary: List admin login logs (admin only)
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: username
 *         schema: { type: string }
 *       - in: query
 *         name: success
 *         schema: { type: integer, enum: [0, 1] }
 *     responses:
 *       200:
 *         description: Paginated admin login logs
 */
router.get('/admin-login', authMiddleware, requireAdmin, logController.adminLoginLogs);

/**
 * @openapi
 * /api/logs/user-login:
 *   get:
 *     summary: List user login logs (admin only)
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *       - in: query
 *         name: success
 *         schema: { type: integer, enum: [0, 1] }
 *     responses:
 *       200:
 *         description: Paginated user login logs
 */
router.get('/user-login', authMiddleware, requireAdmin, logController.userLoginLogs);

module.exports = router;
