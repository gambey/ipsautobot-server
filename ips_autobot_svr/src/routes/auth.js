const express = require('express');
const rsa = require('../utils/rsa');
const router = express.Router();

/**
 * @openapi
 * /api/public-key:
 *   get:
 *     summary: Get RSA public key for password encryption
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: PEM public key
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: PEM format public key
 */
router.get('/public-key', (req, res) => {
  const pem = rsa.getPublicKeyPem();
  res.type('text/plain').send(pem);
});

module.exports = router;
