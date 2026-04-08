const userService = require('../services/userService');
const jwtAuth = require('../middleware/auth');
const { userLoginLogger } = require('../utils/logger');
const pool = require('../config/db');
const { normalizeMac, macEqualsNormalized } = require('../utils/mac');
const { parseApp } = require('../utils/clientApp');

function buildUserProfile(user) {
  return userService.attachClients(user);
}

const DEFAULT_CLIENT = { member_type: 0, member_expire_at: null, score: 0, mac_addr: null, '30d_score': 300, '90d_score': 900, '180d_score': 1800, '365d_score': 3600 };

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
    res.status(201).json({
      code: 0,
      data: {
        id,
        username: username || null,
        phone,
        clients: {
          zhiling: { ...DEFAULT_CLIENT, member_type: memberType ?? 0 },
          yifei: { ...DEFAULT_CLIENT },
        },
      },
    });
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
    const profile = buildUserProfile(user);
    res.json({
      code: 0,
      data: {
        token,
        user: { ...profile, last_login_at: new Date().toISOString() },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userService.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    return res.json({ code: 0, data: buildUserProfile(user) });
  } catch (err) {
    return next(err);
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

async function getMac(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const isAdmin = req.auth.role === 'admin';
    let targetUserId;
    if (isAdmin) {
      const q = req.query.userId;
      if (q == null || q === '') {
        return res.status(400).json({ code: 400, message: 'userId query parameter required for admin' });
      }
      targetUserId = parseInt(q, 10);
      if (Number.isNaN(targetUserId)) {
        return res.status(400).json({ code: 400, message: 'Invalid userId' });
      }
    } else {
      targetUserId = req.auth.id;
    }
    const user = await userService.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    const mac = userService.clientSliceFromRow(user, app).mac_addr;
    res.json({ code: 0, data: { app, mac_addr: mac } });
  } catch (err) {
    next(err);
  }
}

async function putMac(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.body.app || req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const { mac_addr: rawMac, userId: bodyUserId } = req.body;
    const isAdmin = req.auth.role === 'admin';
    let targetUserId;
    if (isAdmin) {
      if (bodyUserId == null || bodyUserId === '') {
        return res.status(400).json({ code: 400, message: 'userId required for admin' });
      }
      targetUserId = parseInt(bodyUserId, 10);
      if (Number.isNaN(targetUserId)) {
        return res.status(400).json({ code: 400, message: 'Invalid userId' });
      }
    } else {
      if (bodyUserId != null && bodyUserId !== '') {
        return res.status(403).json({ code: 403, message: 'Cannot set userId' });
      }
      targetUserId = req.auth.id;
    }
    let normalized;
    try {
      normalized = normalizeMac(rawMac);
    } catch (e) {
      return res.status(400).json({ code: 400, message: e.message || 'Invalid MAC address' });
    }
    const user = await userService.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    try {
      await userService.updateMacAddr(targetUserId, normalized, app);
    } catch (e) {
      if (e.code === 'MAC_CONFLICT') {
        return res.status(409).json({ code: 409, message: e.message });
      }
      throw e;
    }
    res.json({ code: 0, data: { app, mac_addr: normalized } });
  } catch (err) {
    next(err);
  }
}

async function unbindMac(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ code: 400, message: 'Invalid user id' });
    }
    const user = await userService.findById(targetId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    await userService.clearMacAddr(targetId, app);
    res.json({ code: 0, data: { id: targetId, app, mac_addr: null } });
  } catch (err) {
    next(err);
  }
}

async function verifyMac(req, res, next) {
  try {
    let app;
    try {
      app = parseApp(req.body.app || req.query.app, { required: true });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ code: e.statusCode || 400, message: e.message });
    }
    const { mac_addr: rawMac } = req.body;
    let normalized;
    try {
      normalized = normalizeMac(rawMac);
    } catch (e) {
      return res.status(400).json({ code: 400, message: e.message || 'Invalid MAC address' });
    }
    const user = await userService.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    const bound = userService.clientSliceFromRow(user, app).mac_addr;
    if (bound == null || bound === '') {
      return res.json({ code: 0, data: { app, matched: false } });
    }
    const matched = macEqualsNormalized(bound, normalized);
    res.json({ code: 0, data: { app, matched } });
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

async function enableUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ code: 400, message: 'Invalid user id' });
    }
    const user = await userService.findById(targetId);
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }
    await userService.setDisabled(targetId, false);
    res.json({ code: 0, message: 'User enabled' });
  } catch (err) {
    next(err);
  }
}

function applyClientBlockToPayload(payload, app, block, isSuperAdmin) {
  if (!block || typeof block !== 'object') return { addDays: null, reduceDays: null };
  let addDays = null;
  let reduceDays = null;
  if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, 'member_type')) {
    const memberType = parseInt(block.member_type, 10);
    if (!(memberType === 0 || memberType === 1)) {
      const err = new Error('member_type must be 0 or 1');
      err.statusCode = 400;
      throw err;
    }
    payload[`member_type_${app}`] = memberType;
  }
  if (Object.prototype.hasOwnProperty.call(block, 'member_expire_at')) {
    payload[`member_expire_at_${app}`] = block.member_expire_at;
  }
  if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, 'member_expire_days')) {
    const d = parseInt(block.member_expire_days, 10);
    if (!Number.isInteger(d) || d <= 0) {
      const err = new Error('member_expire_days must be positive integer');
      err.statusCode = 400;
      throw err;
    }
    addDays = d;
  }
  if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, 'member_reduce_days')) {
    const d = parseInt(block.member_reduce_days, 10);
    if (!Number.isInteger(d) || d <= 0) {
      const err = new Error('member_reduce_days must be positive integer');
      err.statusCode = 400;
      throw err;
    }
    reduceDays = d;
  }
  if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, 'score')) {
    const v = parseInt(block.score, 10);
    if (!Number.isInteger(v) || v < 0) {
      const err = new Error('score must be non-negative integer');
      err.statusCode = 400;
      throw err;
    }
    payload[`score_${app}`] = v;
  }
  for (const key of ['30d_score', '90d_score', '180d_score', '365d_score']) {
    if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, key)) {
      const v = parseInt(block[key], 10);
      if (!Number.isInteger(v) || v < 0) {
        const err = new Error(`${key} must be non-negative integer`);
        err.statusCode = 400;
        throw err;
      }
      payload[`${key}_${app}`] = v;
    }
  }
  if (isSuperAdmin && Object.prototype.hasOwnProperty.call(block, 'mac_addr')) {
    if (block.mac_addr == null || String(block.mac_addr).trim() === '') {
      payload[`mac_addr_${app}`] = null;
    } else {
      try {
        payload[`mac_addr_${app}`] = normalizeMac(block.mac_addr);
      } catch (e) {
        const err = new Error(e.message || 'Invalid MAC address');
        err.statusCode = 400;
        throw err;
      }
    }
  }
  return { addDays, reduceDays };
}

async function updateUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ code: 400, message: 'Invalid user id' });
    }
    const existing = await userService.findById(targetId);
    if (!existing) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }

    const body = req.body || {};
    const isSuperAdmin = Number(req.auth?.adminType) === 0;
    const payload = {};

    if (isSuperAdmin && Object.prototype.hasOwnProperty.call(body, 'username')) payload.username = body.username;
    if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
      const phone = String(body.phone || '').trim();
      if (!phone) return res.status(400).json({ code: 400, message: 'phone cannot be empty' });
      payload.phone = phone;
    }
    if (isSuperAdmin && Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = parseInt(body.status, 10);
      if (!(status === 0 || status === 1)) return res.status(400).json({ code: 400, message: 'status must be 0 or 1' });
      payload.status = status;
    }

    const clientOps = [];
    const clients = body.clients || {};
    for (const app of ['zhiling', 'yifei']) {
      try {
        const { addDays, reduceDays } = applyClientBlockToPayload(payload, app, clients[app], isSuperAdmin);
        if (addDays != null) clientOps.push({ app, addDays });
        if (reduceDays != null) clientOps.push({ app, reduceDays, sub: true });
      } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ code: e.statusCode, message: e.message });
        throw e;
      }
    }

    const hasPayload = Object.keys(payload).length > 0;
    if (!hasPayload && clientOps.length === 0) {
      return res.status(400).json({ code: 400, message: 'No fields to update' });
    }

    try {
      if (hasPayload) {
        await userService.updateUserById(targetId, payload);
      }
      for (const op of clientOps) {
        if (op.sub) {
          await userService.subtractMemberExpireDays(targetId, op.reduceDays, op.app);
        } else {
          await userService.addMemberExpireDays(targetId, op.addDays, op.app);
        }
      }
    } catch (e) {
      if (e.code === 'USER_UNIQUE_CONFLICT') {
        return res.status(409).json({ code: 409, message: e.message });
      }
      throw e;
    }
    const user = await userService.findById(targetId);
    return res.json({ code: 0, data: userService.attachClients(user) });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  login,
  me,
  changePassword,
  getMac,
  putMac,
  unbindMac,
  verifyMac,
  updateUser,
  disableUser,
  enableUser,
};
