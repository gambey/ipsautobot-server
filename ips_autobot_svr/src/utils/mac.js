/**
 * MAC address normalization and validation (48-bit EUI-48).
 * Stored format: AA:BB:CC:DD:EE:FF (uppercase, colon-separated).
 */

const INVALID_MSG = 'Invalid MAC address format';

/**
 * Normalize input to AA:BB:CC:DD:EE:FF.
 * Accepts colons, hyphens, or 12 contiguous hex digits (case-insensitive).
 * @param {string} input
 * @returns {string}
 * @throws {Error} if missing or invalid
 */
function normalizeMac(input) {
  if (input === undefined || input === null) {
    throw new Error('MAC address required');
  }
  const raw = String(input).trim();
  if (!raw) {
    throw new Error('MAC address required');
  }
  const compact = raw.replace(/\s+/g, '').replace(/-/g, ':');
  let parts;
  if (compact.includes(':')) {
    parts = compact.split(':').filter((p) => p.length > 0);
  } else {
    const hex = compact.replace(/[^0-9A-Fa-f]/g, '');
    if (hex.length !== 12) {
      throw new Error(INVALID_MSG);
    }
    parts = hex.match(/.{2}/g);
  }
  if (!parts || parts.length !== 6) {
    throw new Error(INVALID_MSG);
  }
  const norm = [];
  for (const p of parts) {
    if (p.length > 2 || !/^[0-9A-Fa-f]+$/i.test(p)) {
      throw new Error(INVALID_MSG);
    }
    const n = parseInt(p, 16);
    if (Number.isNaN(n) || n < 0 || n > 255) {
      throw new Error(INVALID_MSG);
    }
    norm.push(n.toString(16).toUpperCase().padStart(2, '0'));
  }
  return norm.join(':');
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function macEqualsNormalized(a, b) {
  return String(a) === String(b);
}

module.exports = {
  normalizeMac,
  macEqualsNormalized,
  INVALID_MSG,
};
