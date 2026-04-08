const adminService = require('../services/adminService');
const jwtAuth = require('../middleware/auth');
const { adminLoginLogger } = require('../utils/logger');
const pool = require('../config/db');

async function writeAdminLoginLog(adminId, username, ip, success) {
  adminLoginLogger.info({ adminId, username, ip, success });
  await pool.query(
    'INSERT INTO admin_login_logs (admin_id, username, ip, success) VALUES (?, ?, ?, ?)',
    [adminId || null, username, ip || null, success ? 1 : 0]
  ).catch(() => {});
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress;
    if (!username || !password) {
      await writeAdminLoginLog(null, username || '', ip, false);
      return res.status(400).json({ code: 400, message: 'Username and password required' });
    }
    const admin = await adminService.findByUsername(username);
    if (!admin) {
      await writeAdminLoginLog(null, username, ip, false);
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }
    const ok = await adminService.verifyPassword(password, admin.password_hash);
    if (!ok) {
      await writeAdminLoginLog(admin.id, username, ip, false);
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }
    await adminService.updateLastLoginAt(admin.id);
    await writeAdminLoginLog(admin.id, username, ip, true);
    const token = jwtAuth.sign({ id: admin.id, role: 'admin', username: admin.username, adminType: admin.admin_type });
    res.json({
      code: 0,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          admin_type: admin.admin_type,
          phone: admin.phone,
          last_login_at: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listAdmins(req, res, next) {
  try {
    if (Number(req.auth.adminType) !== 0) {
      return res.status(403).json({ code: 403, message: 'Super admin required' });
    }
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const username = req.query.username || undefined;

    const result = await adminService.list({ page, limit, username });
    res.json({ code: 0, data: result });
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { username, password, phone, admin_type: adminTypeRaw } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: 'Username and password required' });
    }
    const adminType = adminTypeRaw === undefined ? 1 : parseInt(adminTypeRaw, 10);
    if (!(adminType === 0 || adminType === 1)) {
      return res.status(400).json({ code: 400, message: 'admin_type must be 0 or 1' });
    }
    if (adminType === 0 && Number(req.auth.adminType) !== 0) {
      return res.status(403).json({ code: 403, message: 'Only super admin can create super admin' });
    }
    const existing = await adminService.findByUsername(username);
    if (existing) {
      return res.status(409).json({ code: 409, message: 'Username already exists' });
    }
    const id = await adminService.create({ username, password, phone, adminType });
    res.status(201).json({ code: 0, data: { id, username, phone, admin_type: adminType } });
  } catch (err) {
    next(err);
  }
}

async function deleteAdmin(req, res, next) {
  try {
    if (Number(req.auth.adminType) !== 0) {
      return res.status(403).json({ code: 403, message: 'Super admin required' });
    }
    const targetId = parseInt(req.params.id, 10);
    const currentId = req.auth.id;

    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ code: 400, message: 'Invalid admin id' });
    }

    if (targetId === currentId) {
      return res.status(400).json({ code: 400, message: 'Cannot delete yourself' });
    }

    const target = await adminService.findById(targetId);
    if (!target) {
      return res.status(404).json({ code: 404, message: 'Admin not found' });
    }

    await adminService.remove(targetId);
    res.json({ code: 0, message: 'deleted' });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword, adminId: adminIdRaw } = req.body;
    const targetAdminId = adminIdRaw !== undefined && adminIdRaw !== null && adminIdRaw !== ''
      ? parseInt(adminIdRaw, 10)
      : req.auth.id;
    if (!newPassword) {
      return res.status(400).json({ code: 400, message: 'New password required' });
    }
    if (!Number.isInteger(targetAdminId)) {
      return res.status(400).json({ code: 400, message: 'Invalid adminId' });
    }
    const targetAdmin = await adminService.findById(targetAdminId);
    if (!targetAdmin) {
      return res.status(404).json({ code: 404, message: 'Admin not found' });
    }
    if (oldPassword) {
      const admin = await adminService.findByUsername(req.auth.username);
      if (!admin) {
        return res.status(401).json({ code: 401, message: 'Admin not found' });
      }
      const ok = await adminService.verifyPassword(oldPassword, admin.password_hash);
      if (!ok) {
        return res.status(401).json({ code: 401, message: 'Invalid old password' });
      }
    }
    await adminService.changePassword(targetAdminId, newPassword);
    res.json({ code: 0, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  listAdmins,
  createAdmin,
  deleteAdmin,
  changePassword,
};
