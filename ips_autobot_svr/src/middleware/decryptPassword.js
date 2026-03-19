const rsa = require('../utils/rsa');

/**
 * Expects req.body.passwordEncrypted (or oldPasswordEncrypted/newPasswordEncrypted).
 * Decrypts and sets req.body.password (or oldPassword, newPassword) for the handler.
 */
function decryptPasswordFields(req, res, next) {
  const fields = ['passwordEncrypted', 'oldPasswordEncrypted', 'newPasswordEncrypted'];
  const map = {
    passwordEncrypted: 'password',
    oldPasswordEncrypted: 'oldPassword',
    newPasswordEncrypted: 'newPassword',
  };
  try {
    for (const enc of fields) {
      if (req.body[enc]) {
        req.body[map[enc]] = rsa.decrypt(req.body[enc]);
      }
    }
    next();
  } catch (err) {
    return res.status(400).json({ code: 400, message: err.message || 'Decryption failed' });
  }
}

module.exports = { decryptPasswordFields };
