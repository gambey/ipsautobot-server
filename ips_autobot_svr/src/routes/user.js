const express = require('express');
const { decryptPasswordFields } = require('../middleware/decryptPassword');
const { authMiddleware, requireAdmin, requireUserOrAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users (admin only)
 *     tags: [User]
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
 *         name: phone
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: integer, enum: [0, 1] }
 *       - in: query
 *         name: created_at_from
 *         schema: { type: string }
 *       - in: query
 *         name: created_at_to
 *         schema: { type: string }
 *       - in: query
 *         name: last_login_from
 *         schema: { type: string }
 *       - in: query
 *         name: last_login_to
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User list
 *   post:
 *     summary: Create user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, passwordEncrypted]
 *             properties:
 *               username: { type: string, description: User display name }
 *               phone: { type: string }
 *               passwordEncrypted: { type: string }
 *               member_type: { type: integer, enum: [0, 1], description: "0=normal 1=paid" }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Phone already registered
 */
router.get('/', authMiddleware, requireAdmin, userController.listUsers);
router.post('/', decryptPasswordFields, userController.createUser);

/**
 * @openapi
 * /api/users/login:
 *   post:
 *     summary: User login (by phone or username)
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordEncrypted]
 *             properties:
 *               phone: { type: string, description: Phone number (use either phone or username) }
 *               username: { type: string, description: Username (use either phone or username) }
 *               passwordEncrypted: { type: string }
 *     responses:
 *       200:
 *         description: Login success, returns JWT and user info
 *       400:
 *         description: Phone or username and password required
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', decryptPasswordFields, userController.login);

/**
 * @openapi
 * /api/users/password:
 *   put:
 *     summary: Change password (no old password required; user self or admin for another user)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPasswordEncrypted]
 *             properties:
 *               newPasswordEncrypted: { type: string }
 *               userId: { type: integer, description: "Admin only: target user id" }
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/password', authMiddleware, requireUserOrAdmin, decryptPasswordFields, userController.changePassword);

/**
 * @openapi
 * /api/users/{id}/disable:
 *   put:
 *     summary: Disable user (admin only)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User disabled
 *       404:
 *         description: User not found
 */
router.put('/:id/disable', authMiddleware, requireAdmin, userController.disableUser);

module.exports = router;
