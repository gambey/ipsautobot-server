/** Supported client apps (multi-software). */
const CLIENT_APPS = Object.freeze(['zhiling', 'yifei']);

function isValidApp(app) {
  return app === 'zhiling' || app === 'yifei';
}

/**
 * Resolve app from query/body; throws { statusCode, message } if missing/invalid.
 * @param {string|undefined} raw
 * @param {{ required?: boolean }} [opts]
 * @returns {'zhiling'|'yifei'|undefined}
 */
function parseApp(raw, opts = {}) {
  const required = opts.required !== false;
  if (raw == null || String(raw).trim() === '') {
    if (required) {
      const err = new Error('app is required (zhiling or yifei)');
      err.statusCode = 400;
      throw err;
    }
    return undefined;
  }
  const v = String(raw).trim().toLowerCase();
  if (!isValidApp(v)) {
    const err = new Error('app must be zhiling or yifei');
    err.statusCode = 400;
    throw err;
  }
  return v;
}

/** SQL column names per app (whitelist only). @param {'zhiling'|'yifei'} app */
function appColumnMap(app) {
  const suffix = app === 'zhiling' ? 'zhiling' : 'yifei';
  return {
    mac: `mac_addr_${suffix}`,
    memberExpire: `member_expire_at_${suffix}`,
    memberType: `member_type_${suffix}`,
    score: `score_${suffix}`,
    tier30: `\`30d_score_${suffix}\``,
    tier90: `\`90d_score_${suffix}\``,
    tier180: `\`180d_score_${suffix}\``,
    tier365: `\`365d_score_${suffix}\``,
    tier30bare: `30d_score_${suffix}`,
    tier90bare: `90d_score_${suffix}`,
    tier180bare: `180d_score_${suffix}`,
    tier365bare: `365d_score_${suffix}`,
  };
}

module.exports = {
  CLIENT_APPS,
  isValidApp,
  parseApp,
  appColumnMap,
};
