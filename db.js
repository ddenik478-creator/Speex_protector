const fs = require('fs');
const crypto = require('crypto');
const FILE = process.env.DB_FILE || './data.json';

let data = { keys: [], whitelist: [], ipLog: {} };
try { data = { ...data, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}

const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

function genKey() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SM-${part()}-${part()}-${part()}-${part()}`;
}

function createKey({ type = 'free', hours = null, userId = null }) {
  const k = {
    key: genKey(), type, userId, hwid: null,
    createdAt: Date.now(),
    expiresAt: hours ? Date.now() + hours * 3600e3 : null,
    blacklisted: false,
  };
  data.keys.push(k); save(); return k;
}

const findKey = (key) => data.keys.find((k) => k.key === key);
const userKeys = (userId) => data.keys.filter((k) => k.userId === userId);
const isExpired = (k) => k.expiresAt && k.expiresAt < Date.now();

function verify(key, hwid) {
  const k = findKey(key);
  if (!k) return { valid: false, reason: 'not_found' };
  if (k.blacklisted) return { valid: false, reason: 'blacklisted' };
  if (isExpired(k)) return { valid: false, reason: 'expired' };
  if (hwid) {
    if (!k.hwid) { k.hwid = hwid; save(); }
    else if (k.hwid !== hwid) return { valid: false, reason: 'hwid_mismatch' };
  }
  return { valid: true, type: k.type, expiresAt: k.expiresAt };
}

function addWhitelist(userId) {
  if (!data.whitelist.includes(userId)) { data.whitelist.push(userId); save(); }
}
const isWhitelisted = (id) => data.whitelist.includes(id);

function canGetFreeKey(ip, hours) {
  const last = data.ipLog[ip];
  return !last || Date.now() - last > hours * 3600e3;
}
function markIp(ip) { data.ipLog[ip] = Date.now(); save(); }

function resetHwid(userId) {
  userKeys(userId).forEach((k) => (k.hwid = null)); save();
}

module.exports = { createKey, findKey, userKeys, verify, addWhitelist, isWhitelisted,
  canGetFreeKey, markIp, resetHwid, isExpired };
