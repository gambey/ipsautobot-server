const userService = require('../services/userService');
const jwtAuth = require('../middleware/auth');
const { userLoginLogger } = require('../utils/logger');
const pool = require('../config/db');

async function writeUserLoginLog(userId, phone, ip, success) {
  userLoginLogger.info({ userId, phone, ip, success });
  await pool.query(
    'INSERT INTO user_login_logs (user_id, phone, ip, success) VALUES (?, ?, ?, ?)',
    [userId || null, phone, ip || null, success ? 1 : 0]
  ).catch(() => {});
}

async function listUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const rawUsername = req.query.username;
    const username = typeof rawUsername === 'string' && rawUsername.trim() ? rawUsername.trim() : undefined;
    const rawPhone = req.query.phone;
    const phone = typeof rawPhone === 'string' && rawPhone.trim() ? rawPhone.trim() : undefined;
    const status = req.query.status !== undefined && req.query.status !== '' ? parseInt(req.query.status, 10) : undefined;
    const created_at_from = req.query.created_at_from || undefined;
    const created_at_to = req.query.created_at_to || undefined;
    const last_login_from = req.query.last_login_from || undefined;
    const last_login_to = req.query.last_login_to || undefined;

    const result = await userService.list({
      page,
      limit,
      username,
      phone,
      status: status === 0 || status === 1 ? status : undefined,
      created_at_from,
      created_at_to,
      last_login_from,
      last_login_to,
    });
    res.json({ code: 0, data: result });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, phone, password, member_type: memberType } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: 'Phone and password required' });
    }
    const existing = await userService.findByPhone(phone);
    if (existing) {
      return res.status(409).json({ code: 409, message: 'Phone already registered' });
    }
    const id = await userService.create({ username: username || null, phone, password, memberType: memberType ?? 0 });
    res.status(201).json({ code: 0, data: { id, username: username || null, phone } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { phone, username, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress;
    const account = username != null && String(username).trim() !== '' ? String(username).trim() : (phone != null ? String(phone).trim() : '');
    if (!password) {
      await writeUserLoginLog(null, account || '', ip, false);
      return res.status(400).json({ code: 400, message: 'Password required' });
    }
    if (!account) {
      await writeUserLoginLog(null, '', ip, false);
      return res.status(400).json({ code: 400, message: 'Phone or username required' });
    }
    const user = (username != null && String(username).trim() !== '')
      ? await userService.findByUsername(String(username).trim())
      : await userService.findByPhone(phone);
    if (!user) {
      await writeUserLoginLog(null, account, ip, false);
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }
    if (user.status !== 1) {
      await writeUserLoginLog(user.id, account, ip, false);
      return res.status(403).json({ code: 403, message: 'User disabled' });
    }
    const ok = await userService.verifyPassword(password, user.password_hash);
    if (!ok) {
      await writeUserLoginLog(user.id, account, ip, false);
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }
    await userService.updateLastLogin(user.id, ip);
    await writeUserLoginLog(user.id, account, ip, true);
    const token = jwtAuth.sign({ id: user.id, role: 'user', phone: user.phone });
    res.json({
      code: 0,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          member_type: user.member_type,
          member_expire_at: user.member_expire_at,
          last_login_at: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { newPassword, userId: bodyUserId } = req.body;
    const isAdmin = req.auth.role === 'admin';
    const targetUserId = isAdmin && bodyUserId != null ? bodyUserId : req.auth.id;
    if (!newPassword) {
      return res.status(400).json({ code: 400, message: 'New password required' });
    }
    if (targetUserId !== req.auth.id && !isAdmin) {
      return res.status(403).json({ code: 403, message: 'Cannot change other user password' });
    }
    const user = await userService.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    await userService.changePassword(targetUserId, newPassword);
    res.json({ code: 0, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

async function disableUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ code: 400, message: 'Invalid user id' });
    }
    const user = await userService.findById(targetId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    await userService.setDisabled(targetId, true);
    res.json({ code: 0, message: 'User disabled' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  login,
  changePassword,
  disableUser,
};
