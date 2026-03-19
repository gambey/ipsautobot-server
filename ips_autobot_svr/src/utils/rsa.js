const NodeRSA = require('node-rsa');
const config = require('../config');

let keyPair = null;

function getKeyPair() {
  if (keyPair) return keyPair;
  if (config.rsa.privateKeyPem && config.rsa.publicKeyPem) {
    keyPair = {
      privateKey: new NodeRSA(config.rsa.privateKeyPem),
      publicKey: new NodeRSA(config.rsa.publicKeyPem),
    };
    return keyPair;
  }
  const key = new NodeRSA({ b: 2048 });
  keyPair = {
    privateKey: key,
    publicKey: new NodeRSA(key.exportKey('public')),
  };
  return keyPair;
}

function getPublicKeyPem() {
  const { publicKey } = getKeyPair();
  return publicKey.exportKey('public');
}

function decrypt(encryptedBase64) {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new Error('Invalid encrypted password');
  }
  const { privateKey } = getKeyPair();
  try {
    const decrypted = privateKey.decrypt(encryptedBase64, 'utf8');
    return decrypted;
  } catch (err) {
    throw new Error('Decryption failed');
  }
}

module.exports = {
  getKeyPair,
  getPublicKeyPem,
  decrypt,
};
