const express = require('express');
const { decryptPasswordFields } = require('../middleware/decryptPassword');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, passwordEncrypted]
 *             properties:
 *               username: { type: string }
 *               passwordEncrypted: { type: string, description: RSA encrypted password }
 *     responses:
 *       200:
 *         description: Login success, returns JWT and admin info
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', decryptPasswordFields, adminController.login);

/**
 * @openapi
 * /api/admin:
 *   get:
 *     summary: List admins (admin only)
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Admin list
 *   post:
 *     summary: Create admin (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, passwordEncrypted]
 *             properties:
 *               username: { type: string }
 *               passwordEncrypted: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Admin created
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, requireAdmin, adminController.listAdmins);
router.post('/', authMiddleware, requireAdmin, decryptPasswordFields, adminController.createAdmin);

/**
 * @openapi
 * /api/admin/{id}:
 *   delete:
 *     summary: Delete admin (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Admin deleted
 *       400:
 *         description: Cannot delete self or invalid id
 *       404:
 *         description: Admin not found
 */
router.delete('/:id', authMiddleware, requireAdmin, adminController.deleteAdmin);

/**
 * @openapi
 * /api/admin/password:
 *   put:
 *     summary: Change current admin password
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPasswordEncrypted, newPasswordEncrypted]
 *             properties:
 *               oldPasswordEncrypted: { type: string }
 *               newPasswordEncrypted: { type: string }
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Invalid old password
 */
router.put('/password', authMiddleware, requireAdmin, decryptPasswordFields, adminController.changePassword);

module.exports = router;
