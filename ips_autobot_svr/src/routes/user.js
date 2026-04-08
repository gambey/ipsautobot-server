const express = require('express');
const { decryptPasswordFields } = require('../middleware/decryptPassword');
const { authMiddleware, requireAdmin, requireUserOrAdmin, requireUser, requireSuperAdmin } = require('../middleware/auth');
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           username: { type: string, nullable: true }
 *                           phone: { type: string }
 *                           status: { type: integer }
 *                           created_at: { type: string }
 *                           last_login_at: { type: string, nullable: true }
 *                           clients:
 *                             type: object
 *                             description: Per-app zhiling and yifei slices (MAC, score, tiers, member_type, member_expire_at)
 *                             properties:
 *                               zhiling: { type: object }
 *                               yifei: { type: object }
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
 *               member_type: { type: integer, enum: [0, 1], description: "Initial member_type for zhiling client only; yifei starts as 0" }
 *     responses:
 *       201:
 *         description: User created; response includes clients.zhiling and clients.yifei defaults
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
 *         description: Login success; user object has shared fields and clients.zhiling / clients.yifei
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         username: { type: string, nullable: true }
 *                         phone: { type: string }
 *                         status: { type: integer }
 *                         created_at: { type: string }
 *                         clients: { type: object }
 *                         last_login_at: { type: string, format: date-time }
 *       400:
 *         description: Phone or username and password required
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', decryptPasswordFields, userController.login);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, requireUser, userController.me);

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
 * /api/users/mac:
 *   get:
 *     summary: Get bound MAC for current user or admin-specified user
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: app
 *         required: true
 *         schema: { type: string, enum: [zhiling, yifei] }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *         description: Required when caller is admin
 *     responses:
 *       200:
 *         description: Current mac_addr for app or null
 *       400:
 *         description: Missing userId for admin
 *   put:
 *     summary: Bind or update MAC (globally unique)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mac_addr, app]
 *             properties:
 *               app: { type: string, enum: [zhiling, yifei] }
 *               mac_addr: { type: string }
 *               userId: { type: integer, description: Admin only — target user id }
 *     responses:
 *       200:
 *         description: MAC bound for app
 *       400:
 *         description: Invalid MAC or missing userId for admin
 *       409:
 *         description: MAC already used by another user
 */
router.get('/mac', authMiddleware, requireUserOrAdmin, userController.getMac);
router.put('/mac', authMiddleware, requireUserOrAdmin, userController.putMac);

/**
 * @openapi
 * /api/users/mac/verify:
 *   post:
 *     summary: Verify MAC matches bound value (user JWT only)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mac_addr, app]
 *             properties:
 *               app: { type: string, enum: [zhiling, yifei] }
 *               mac_addr: { type: string }
 *     responses:
 *       200:
 *         description: matched true/false per app; unbound returns matched false
 */
router.post('/mac/verify', authMiddleware, requireUser, userController.verifyMac);

/**
 * @openapi
 * /api/users/{id}/mac:
 *   delete:
 *     summary: Unbind user MAC (super admin only)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Target user id
 *       - in: query
 *         name: app
 *         required: true
 *         schema: { type: string, enum: [zhiling, yifei] }
 *     responses:
 *       200:
 *         description: MAC cleared for app
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     mac_addr: { type: string, nullable: true, example: null }
 *       403:
 *         description: Super admin required
 *       404:
 *         description: User not found
 */
router.delete('/:id/mac', authMiddleware, requireSuperAdmin, userController.unbindMac);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Update user profile fields (admin only; normal admin has limited fields)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, nullable: true }
 *               phone: { type: string }
 *               status: { type: integer, enum: [0, 1] }
 *               clients:
 *                 type: object
 *                 properties:
 *                   zhiling:
 *                     type: object
 *                     description: Super-admin fields for zhiling; member_expire_at editable by admin
 *                     properties:
 *                       member_type: { type: integer, enum: [0, 1] }
 *                       member_expire_at: { type: string, format: date-time, nullable: true }
 *                       member_expire_days: { type: integer, minimum: 1 }
 *                       member_reduce_days: { type: integer, minimum: 1 }
 *                       score: { type: integer, minimum: 0 }
 *                       30d_score: { type: integer, minimum: 0 }
 *                       90d_score: { type: integer, minimum: 0 }
 *                       180d_score: { type: integer, minimum: 0 }
 *                       365d_score: { type: integer, minimum: 0 }
 *                       mac_addr: { type: string, nullable: true }
 *                   yifei:
 *                     type: object
 *                     properties:
 *                       member_type: { type: integer, enum: [0, 1] }
 *                       member_expire_at: { type: string, format: date-time, nullable: true }
 *                       member_expire_days: { type: integer, minimum: 1 }
 *                       member_reduce_days: { type: integer, minimum: 1 }
 *                       score: { type: integer, minimum: 0 }
 *                       30d_score: { type: integer, minimum: 0 }
 *                       90d_score: { type: integer, minimum: 0 }
 *                       180d_score: { type: integer, minimum: 0 }
 *                       365d_score: { type: integer, minimum: 0 }
 *                       mac_addr: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: User updated; data includes clients
 *       403:
 *         description: Admin required
 */
router.put('/:id', authMiddleware, requireAdmin, userController.updateUser);

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
router.put('/:id/enable', authMiddleware, requireAdmin, userController.enableUser);

module.exports = router;
