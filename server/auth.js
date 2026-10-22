// Login with mobile number + PIN, sessions in an HttpOnly cookie
import crypto from 'node:crypto';
import { db, save } from './db.js';

const SESSION_DAYS = 30;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const fails = new Map(); // mobile -> { count, until }

export const normMobile = m => String(m || '').replace(/\D/g, '').slice(-10);

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function checkPin(pin, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pin), salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

export const validPin = pin => /^\d{4,8}$/.test(String(pin || ''));

// Returns { token } or { error }
export function login(mobileRaw, pin) {
  const mobile = normMobile(mobileRaw);
  const f = fails.get(mobile);
  if (f && f.until > Date.now()) return { error: 'locked' };

  let session = null;
  const user = db.users.find(u => u.mobile === mobile && u.active !== 'no');
  if (user && checkPin(pin, user.pinHash)) {
    session = { kind: 'user', userId: user.id };
  } else if (!user) {
    // Flat owners log in with the mobile and PIN saved on their booking
    const owned = db.bookings.filter(b => normMobile(b.phone) === mobile && b.pinHash);
    if (owned.some(b => checkPin(pin, b.pinHash))) session = { kind: 'customer', mobile };
  }

  if (!session) {
    const lockExpired = f && f.until && f.until <= Date.now();
    const count = (f && !lockExpired ? f.count : 0) + 1;
    fails.set(mobile, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MINUTES * 60000 : 0 });
    return { error: 'wrong' };
  }
  fails.delete(mobile);
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter(s => s.expires > Date.now());
  db.sessions.push({ token, ...session, expires: Date.now() + SESSION_DAYS * 86400000 });
  save();
  return { token };
}

export function logout(token) {
  db.sessions = db.sessions.filter(s => s.token !== token);
  save();
}

// The signed-in person for a request, or null
export function currentUser(token) {
  const s = token && db.sessions.find(x => x.token === token && x.expires > Date.now());
  if (!s) return null;
  if (s.kind === 'user') {
    const u = db.users.find(x => x.id === s.userId && x.active !== 'no');
    return u ? { id: u.id, name: u.name, mobile: u.mobile, role: u.role, perms: u.perms || [], wings: u.wings || [] } : null;
  }
  const owned = db.bookings.filter(b => normMobile(b.phone) === s.mobile && b.pinHash);
  if (!owned.length) return null;
  return { id: 'customer:' + s.mobile, name: owned[0].customerName, mobile: s.mobile, role: 'customer', perms: [] };
}

export function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
