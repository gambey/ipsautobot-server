const jwt = require('jsonwebtoken');
const config = require('../config');

function sign(payload, options = {}) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    ...options,
  });
}

function verify(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Unauthorized' });
  }
  const payload = verify(token);
  if (!payload) {
    return res.status(401).json({ code: 401, message: 'Invalid or expired token' });
  }
  req.auth = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth && req.auth.role === 'admin') return next();
  return res.status(403).json({ code: 403, message: 'Admin required' });
}

function requireUserOrAdmin(req, res, next) {
  if (req.auth && (req.auth.role === 'admin' || req.auth.role === 'user')) return next();
  return res.status(403).json({ code: 403, message: 'Authentication required' });
}

function requireUser(req, res, next) {
  if (req.auth && req.auth.role === 'user') return next();
  return res.status(403).json({ code: 403, message: 'User role required' });
}

function requireSuperAdmin(req, res, next) {
  if (req.auth && req.auth.role === 'admin' && Number(req.auth.adminType) === 0) return next();
  return res.status(403).json({ code: 403, message: 'Super admin required' });
}

module.exports = {
  sign,
  verify,
  authMiddleware,
  requireAdmin,
  requireUserOrAdmin,
  requireUser,
  requireSuperAdmin,
};
