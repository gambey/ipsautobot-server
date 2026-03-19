const express = require('express');
const { authMiddleware, requireAdmin, requireUserOrAdmin } = require('../middleware/auth');
const rechargeController = require('../controllers/rechargeController');

const router = express.Router();

/**
 * @openapi
 * /api/recharge:
 *   post:
 *     summary: Create recharge record (admin or user)
 *     tags: [Recharge]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               user_id: { type: integer }
 *               username: { type: string, description: "phone or username" }
 *               amount: { type: number }
 *               result: { type: integer, enum: [0, 1], default: 1 }
 *     responses:
 *       201:
 *         description: Recharge record created
 *       404:
 *         description: User not found
 */
router.post('/', authMiddleware, requireUserOrAdmin, rechargeController.createRecord);

/**
 * @openapi
 * /api/recharge:
 *   get:
 *     summary: List recharge records (admin sees all, user sees own)
 *     tags: [Recharge]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *       - in: query
 *         name: result
 *         schema: { type: integer, enum: [0, 1] }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated recharge records
 */
router.get('/', authMiddleware, requireUserOrAdmin, rechargeController.list);

module.exports = router;
