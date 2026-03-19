const logService = require('../services/logService');

async function adminLoginLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const filters = {
      username: req.query.username,
      success: req.query.success,
    };
    const data = await logService.getAdminLoginLogs(page, limit, filters);
    res.json({ code: 0, data });
  } catch (err) {
    next(err);
  }
}

async function userLoginLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const filters = {
      phone: req.query.phone,
      success: req.query.success,
    };
    const data = await logService.getUserLoginLogs(page, limit, filters);
    res.json({ code: 0, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLoginLogs,
  userLoginLogs,
};
