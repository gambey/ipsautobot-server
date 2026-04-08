const express = require('express');
const { authMiddleware, requireAdmin, requireUserOrAdmin } = require('../middleware/auth');
const scoreController = require('../controllers/scoreController');

const router = express.Router();

/**
 * @openapi
 * /api/score/change:
 *   post:
 *     summary: Increase or deduct user score (admin only)
 *     tags: [Score]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [change_type, tier_days, app]
 *             properties:
 *               app: { type: string, enum: [zhiling, yifei], description: Client app for score columns and score_record }
 *               user_id: { type: integer, description: Target user id (or use phone) }
 *               phone: { type: string, description: Target user phone (or use user_id) }
 *               tier_days: { type: integer, enum: [30, 90, 180, 365], description: "Score tier days" }
 *               score_change: { type: integer, minimum: 1, description: Optional override amount; defaults to selected tier score from users table for this app }
 *               change_type: { type: integer, enum: [0, 1], description: "0=add, 1=deduct" }
 *     responses:
 *       201:
 *         description: Score changed and record created
 *       400:
 *         description: Bad request or insufficient score
 *       404:
 *         description: User not found
 */
router.post('/change', authMiddleware, requireAdmin, scoreController.changeScore);

/**
 * @openapi
 * /api/score/records:
 *   get:
 *     summary: List score records (admin sees all, user sees own)
 *     tags: [Score]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: app
 *         required: true
 *         schema: { type: string, enum: [zhiling, yifei] }
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
 *         name: username
 *         schema: { type: string }
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *       - in: query
 *         name: change_type
 *         schema: { type: integer, enum: [0, 1] }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated score records
 */
router.get('/records', authMiddleware, requireUserOrAdmin, scoreController.listScoreRecords);

module.exports = router;
