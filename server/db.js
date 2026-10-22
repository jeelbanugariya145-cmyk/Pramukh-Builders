// Data storage. Two modes:
// - DATABASE_URL set (e.g. Render's free Postgres): data and photos live in Postgres,
//   so they survive the free server's restarts.
// - Otherwise: a JSON file plus an uploads folder under DATA_DIR (a server with its own disk).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export const COLLECTIONS = [
  'users', 'projects', 'units', 'bookings', 'changeRequests', 'dailyReports', 'complaints',
  'bills', 'expenses', 'visitors', 'files'
];

function empty() {
  const d = { sessions: [] };
  COLLECTIONS.forEach(c => { d[c] = []; });
  return d;
}

const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'application/pdf': '.pdf', 'text/csv': '.csv', 'text/plain': '.txt',
  'application/acad': '.dwg', 'image/vnd.dxf': '.dxf'
};
export const FILE_TYPES = EXT;

let pool = null;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  // Same-network addresses (localhost, or Render's internal host name without dots) need no SSL
  const host = new URL(process.env.DATABASE_URL).hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || !host.includes('.');
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local || process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false }
  });
  await pool.query('CREATE TABLE IF NOT EXISTS app_state (k TEXT PRIMARY KEY, v JSONB NOT NULL)');
  await pool.query('CREATE TABLE IF NOT EXISTS app_files (id TEXT PRIMARY KEY, data BYTEA NOT NULL)');
}

async function loadInitial() {
  if (pool) {
    const r = await pool.query("SELECT v FROM app_state WHERE k = 'db'");
    return r.rows[0] ? r.rows[0].v : {};
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
}

export const db = Object.assign(empty(), await loadInitial());

// Saving: the file is written at once (temp file + rename, so a crash never leaves it half-written);
// Postgres writes are queued so they never overlap and the latest state always lands last.
let writing = null;
let again = false;
async function writePg() {
  if (writing) { again = true; return writing; }
  writing = (async () => {
    do {
      again = false;
      await pool.query(
        "INSERT INTO app_state (k, v) VALUES ('db', $1) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v",
        [JSON.stringify(db)]
      );
    } while (again);
  })().catch(err => console.error('Could not save to the database:', err.message)).finally(() => { writing = null; });
  return writing;
}

export function save() {
  if (pool) { writePg(); return; }
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

// Waits for any queued database write (used before the server stops)
export async function flush() {
  if (pool && writing) await writing;
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

// ---------- Uploaded files (photos, PDFs) ----------
export async function writeFile(file, buf) {
  if (pool) {
    await pool.query('INSERT INTO app_files (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', [file.id, buf]);
    return;
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, file.id + EXT[file.mime]), buf);
}

// Resolves the file's bytes, or null if it is missing
export async function readFile(file) {
  if (pool) {
    const r = await pool.query('SELECT data FROM app_files WHERE id = $1', [file.id]);
    return r.rows[0] ? r.rows[0].data : null;
  }
  const p = path.join(UPLOAD_DIR, file.id + EXT[file.mime]);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export const storageMode = () => (pool ? 'postgres' : 'files');
