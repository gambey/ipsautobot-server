const scoreService = require('../services/scoreService');
const userService = require('../services/userService');
const { parseApp } = require('../utils/clientApp');

async function changeScore(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.body.app || req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const {
      user_id: userId,
      phone,
      score_change: scoreChange,
      change_type: changeType,
      tier_days: tierDays,
    } = req.body;
    if (changeType == null || tierDays == null) {
      return res.status(400).json({ code: 400, message: 'change_type and tier_days are required' });
    }

    let targetUserId = null;
    if (userId != null && userId !== '') {
      const parsed = parseInt(userId, 10);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ code: 400, message: 'Invalid user_id' });
      }
      targetUserId = parsed;
    } else if (phone && String(phone).trim()) {
      const user = await userService.findByPhone(String(phone).trim());
      if (!user) {
        return res.status(404).json({ code: 404, message: 'User not found' });
      }
      targetUserId = user.id;
    } else {
      return res.status(400).json({ code: 400, message: 'user_id or phone required' });
    }

    const result = await scoreService.changeScore({
      userId: targetUserId,
      scoreChange,
      changeType,
      tierDays,
      app,
    });
    return res.status(201).json({ code: 0, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ code: err.statusCode, message: err.message });
    }
    return next(err);
  }
}

async function listScoreRecords(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const isUser = req.auth.role === 'user';

    const filters = {
      client_app: app,
      user_id: req.query.user_id,
      username: req.query.username,
      phone: req.query.phone,
      change_type: req.query.change_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };
    if (isUser) {
      filters.user_id = String(req.auth.id);
      delete filters.username;
      delete filters.phone;
    }

    const data = await scoreService.list(page, limit, filters);
    return res.json({ code: 0, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  changeScore,
  listScoreRecords,
};
