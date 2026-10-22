// Simple JSON-file database. Fine for one builder's data (hundreds of flats, thousands of bills).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export const COLLECTIONS = [
  'users', 'projects', 'units', 'bookings', 'changeRequests',
  'bills', 'expenses', 'workers', 'attendance', 'labourPayments', 'visitors', 'files'
];

function empty() {
  const d = { sessions: [] };
  COLLECTIONS.forEach(c => { d[c] = []; });
  return d;
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = Object.assign(empty(), fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {});

// Write to a temp file then rename, so a crash never leaves a half-written database
export function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

export function replaceAll(data, { keepUsers = true } = {}) {
  const users = db.users;
  const sessions = db.sessions;
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, empty(), data);
  if (keepUsers) db.users = users;
  db.sessions = sessions;
  save();
}

export const newId = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

export const find = (coll, id) => db[coll].find(x => x.id === id);
