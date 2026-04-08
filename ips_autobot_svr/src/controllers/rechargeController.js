const rechargeService = require('../services/rechargeService');
const userService = require('../services/userService');
const { parseApp } = require('../utils/clientApp');

async function createRecord(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.body.app || req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const { user_id: userId, username: bodyUsername, amount, result } = req.body;
    const uid = userId != null ? parseInt(userId, 10) : null;
    if (!uid && !bodyUsername) {
      return res.status(400).json({ code: 400, message: 'user_id or username required' });
    }
    if (amount == null || amount === '') {
      return res.status(400).json({ code: 400, message: 'amount required' });
    }
    let uidFinal = uid;
    let usernameFinal = bodyUsername;
    if (uidFinal && !usernameFinal) {
      const user = await userService.findById(uidFinal);
      if (!user) return res.status(404).json({ code: 404, message: 'User not found' });
      usernameFinal = (user.username && String(user.username).trim()) ? user.username : user.phone;
    } else if (usernameFinal && !uidFinal) {
      const user = await userService.findByPhone(bodyUsername);
      if (!user) return res.status(404).json({ code: 404, message: 'User not found' });
      uidFinal = user.id;
    }
    const id = await rechargeService.create(app, {
      userId: uidFinal,
      username: usernameFinal,
      amount: parseFloat(amount),
      result: result !== undefined ? result : 1,
    });
    const row = await rechargeService.findById(app, id);
    res.status(201).json({ code: 0, data: { ...row, app } });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const filters = {
      user_id: req.query.user_id,
      result: req.query.result,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };
    const isUser = req.auth.role === 'user';
    if (isUser) {
      filters.user_id = String(req.auth.id);
    }
    const data = await rechargeService.list(app, page, limit, filters);
    res.json({ code: 0, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRecord,
  list,
};
