// Pramukh View server: serves the app and its API.
// Start with:  npm start   (then open http://localhost:3000)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { db, save, flush, newId, find, replaceAll, writeFile, readFile, storageMode, FILE_TYPES, COLLECTIONS } from './db.js';
import { login, logout, currentUser, parseCookies, hashPin, validPin, normMobile } from './auth.js';
import { PERMS, WINGS, MATERIALS, FIELDS, REFS, can, canWrite, readableData, canReadFile, customerBookings, seesWing, canSeeComplaint } from './rules.js';
import { aiEnabled, readBill, readStatement, aiErrorCode } from './ai.js';
import { setupPramukhView, loadDemo } from './demo.js';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.resolve('public');
const MAX_BODY = 25 * 1024 * 1024;
const MAX_FILE = 15 * 1024 * 1024;
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json'
};

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
const fail = (status, code) => { throw new HttpError(status, code); };

// Today's date at the site (India), as YYYY-MM-DD
const localToday = () => new Date().toLocaleDateString('en-CA', { timeZone: process.env.SITE_TZ || 'Asia/Kolkata' });

function send(res, status, body, headers = {}) {
  const json = typeof body !== 'string';
  res.writeHead(status, { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain', ...headers });
  res.end(json ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'bad_json')); }
    });
    req.on('error', reject);
  });
}

// Keeps only allowed fields and turns number-like inputs into numbers
const NUMERIC = new Set(['price3', 'price4', 'area', 'parking', 'price', 'gst', 'amount', 'budget']);
function clean(coll, input) {
  const out = {};
  for (const f of FIELDS[coll]) {
    if (!(f in input)) continue;
    let v = input[f];
    if (f === 'perms') v = Array.isArray(v) ? v.filter(p => PERMS.includes(p)) : [];
    else if (f === 'wings') v = Array.isArray(v) ? v.filter(w => WINGS.includes(w)) : [];
    else if (NUMERIC.has(f)) v = v === '' || v === null ? '' : Number(v) || 0;
    else v = String(v ?? '').slice(0, 5000);
    out[f] = v;
  }
  return out;
}

function checkUniqueMobile(mobile, exceptId) {
  if (!mobile || mobile.length !== 10) fail(400, 'bad_mobile');
  if (db.users.some(u => u.mobile === mobile && u.id !== exceptId)) fail(400, 'mobile_taken');
}

// Collection-specific checks and PIN handling before saving
function prepare(coll, data, body, existing) {
  if (coll === 'users') {
    data.mobile = normMobile(data.mobile ?? existing?.mobile);
    checkUniqueMobile(data.mobile, existing?.id);
    if (!['partner', 'staff', 'contractor'].includes(data.role ?? existing?.role)) fail(400, 'bad_role');
    if (body.pin) {
      if (!validPin(body.pin)) fail(400, 'bad_pin');
      data.pinHash = hashPin(body.pin);
    } else if (!existing) fail(400, 'bad_pin');
  }
  if (coll === 'bookings') {
    const unitId = data.unitId ?? existing?.unitId;
    if (!find('units', unitId)) fail(400, 'bad_unit');
    if (db.bookings.some(b => b.unitId === unitId && b.id !== existing?.id)) fail(400, 'unit_booked');
    if (body.pin) {
      if (!validPin(body.pin)) fail(400, 'bad_pin');
      if (db.users.some(u => u.mobile === normMobile(data.phone ?? existing?.phone))) fail(400, 'mobile_is_staff');
      data.pinHash = hashPin(body.pin);
    }
  }
  return data;
}

const publicRecord = (coll, r) => {
  if (coll === 'bookings') { const { pinHash, ...x } = r; return { ...x, hasLogin: !!pinHash }; }
  if (coll === 'users') { const { pinHash, ...x } = r; return x; }
  return r;
};

async function saveUpload(user, body) {
  const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(body.dataUrl || '');
  if (!m || !FILE_TYPES[m[1]]) fail(400, 'bad_file');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_FILE) fail(413, 'too_large');
  const file = { id: newId(), name: String(body.name || 'file').slice(0, 200), mime: m[1], size: buf.length, by: user.id, at: new Date().toISOString() };
  await writeFile(file, buf);
  db.files.push(file);
  save();
  return file;
}

// ---------- API ----------
async function api(req, res, url) {
  const cookies = parseCookies(req.headers.cookie);
  const user = currentUser(cookies.pv_session);
  const method = req.method;
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  const route = `${method} /${parts.join('/')}`;

  if (route === 'GET /status') {
    return send(res, 200, { needsSetup: db.users.length === 0, user, ai: aiEnabled(), materials: MATERIALS });
  }

  if (route === 'POST /setup') {
    if (db.users.length) fail(403, 'forbidden');
    const body = await readBody(req);
    const mobile = normMobile(body.mobile);
    if (!body.name || mobile.length !== 10) fail(400, 'bad_mobile');
    if (!validPin(body.pin)) fail(400, 'bad_pin');
    db.users.push({ id: newId(), name: String(body.name).slice(0, 100), mobile, role: 'partner', perms: [], active: 'yes', pinHash: hashPin(body.pin) });
    save();
    return send(res, 200, { ok: true });
  }

  if (route === 'POST /login') {
    const body = await readBody(req);
    const r = login(body.mobile, body.pin);
    if (r.error) fail(r.error === 'locked' ? 429 : 401, r.error === 'locked' ? 'locked' : 'wrong_login');
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return send(res, 200, { ok: true }, {
      'Set-Cookie': `pv_session=${r.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}`
    });
  }

  if (!user) fail(401, 'login_required');

  if (route === 'POST /logout') {
    logout(cookies.pv_session);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'pv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }

  if (route === 'GET /data') return send(res, 200, readableData(user));

  // Generic create / update / delete
  if (parts[0] === 'c' && FIELDS[parts[1]]) {
    const coll = parts[1];
    if (!canWrite(user, coll)) fail(403, 'forbidden');
    const existing = parts[2] ? find(coll, parts[2]) : null;
    if (parts[2] && !existing) fail(404, 'not_found');

    if (method === 'POST' && !parts[2]) {
      const body = await readBody(req);
      const rec = { id: newId(), ...prepare(coll, clean(coll, body), body, null) };
      db[coll].push(rec);
      save();
      return send(res, 200, publicRecord(coll, rec));
    }
    if (method === 'PUT' && existing) {
      const body = await readBody(req);
      Object.assign(existing, prepare(coll, clean(coll, body), body, existing));
      save();
      return send(res, 200, publicRecord(coll, existing));
    }
    if (method === 'DELETE' && existing) {
      if (coll === 'users' && existing.id === user.id) fail(400, 'cannot_delete_self');
      const linked = (REFS[coll] || []).filter(([c, f]) => db[c].some(x => x[f] === existing.id)).map(([c]) => c);
      if (linked.length) return send(res, 409, { error: 'linked', linked });
      db[coll] = db[coll].filter(x => x.id !== existing.id);
      save();
      return send(res, 200, { ok: true });
    }
  }

  // Mark many bills paid at once (tick marks, bank statement matches)
  if (route === 'POST /bills/pay') {
    if (!can(user, 'materials')) fail(403, 'forbidden');
    const body = await readBody(req);
    const updated = [];
    (body.items || []).forEach(it => {
      const bill = find('bills', it.id);
      if (!bill) return;
      bill.status = it.paid === false ? 'pending' : 'paid';
      bill.paidDate = bill.status === 'paid' ? String(it.paidDate || '') : '';
      bill.paidMode = bill.status === 'paid' ? String(it.paidMode || '') : '';
      bill.paidRef = bill.status === 'paid' ? String(it.paidRef || '').slice(0, 300) : '';
      updated.push(bill);
    });
    save();
    return send(res, 200, { bills: updated });
  }

  // ---------- Daily site reports (one per supervisor per day) ----------
  if (route === 'POST /daily/save') {
    if (!can(user, 'daily')) fail(403, 'forbidden');
    const body = await readBody(req);
    const date = String(body.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > localToday()) fail(400, 'bad_date');
    const id = `${date}_${user.id}`;
    const old = find('dailyReports', id);
    const photos = (body.photos || []).filter(fid => db.files.some(f => f.id === fid && (f.by === user.id || (old && (old.photos || []).includes(fid)))));
    const plan = (body.plan || []).slice(0, 100).map(p => ({
      id: String(p.id || newId()).slice(0, 40), text: String(p.text || '').slice(0, 500),
      status: ['done', 'notdone'].includes(p.status) ? p.status : '', checkedOn: String(p.checkedOn || '').slice(0, 10)
    })).filter(p => p.text.trim());
    // A report covers one wing, or both; people only report on wings they are assigned to
    const myWings = user.role === 'partner' ? WINGS : user.wings;
    let wing = String(body.wing || '');
    if (!(WINGS.includes(wing) && myWings.includes(wing)) && !(wing === 'both' && myWings.length > 1)) {
      wing = myWings.length === 1 ? myWings[0] : 'both';
    }
    const rec = {
      id, date, wing, userId: user.id, userName: user.name,
      workDone: String(body.workDone || '').slice(0, 5000),
      workers: body.workers === '' || body.workers == null ? '' : Number(body.workers) || 0,
      photos, plan, updatedAt: new Date().toISOString()
    };
    if (old) Object.assign(old, rec); else db.dailyReports.push(rec);
    save();
    return send(res, 200, old || rec);
  }

  if (route === 'POST /daily/check') {
    const body = await readBody(req);
    const rep = find('dailyReports', String(body.reportId || ''));
    if (!rep) fail(404, 'not_found');
    if (!(user.role === 'partner' || (can(user, 'daily') && rep.userId === user.id))) fail(403, 'forbidden');
    const item = rep.plan.find(p => p.id === body.itemId);
    if (!item) fail(404, 'not_found');
    item.status = ['done', 'notdone'].includes(body.status) ? body.status : '';
    item.checkedOn = item.status ? localToday() : '';
    save();
    return send(res, 200, rep);
  }

  // ---------- Complaints to contractors and supervisors ----------
  const ownPhotos = ids => (Array.isArray(ids) ? ids : []).filter(fid => db.files.some(f => f.id === fid && f.by === user.id)).slice(0, 20);
  const stamp = () => new Date().toISOString();

  if (route === 'POST /complaints') {
    // Partners and ticked staff raise complaints; contractors only answer them
    if (!can(user, 'complaints') || user.role === 'contractor') fail(403, 'forbidden');
    const body = await readBody(req);
    const wing = ['A', 'B', 'both'].includes(body.wing) ? body.wing : '';
    if (!wing || !seesWing(user, wing)) fail(400, 'bad_wing');
    const title = String(body.title || '').trim().slice(0, 200);
    if (!title) fail(400, 'empty_complaint');
    const rec = {
      id: newId(), wing, title, location: String(body.location || '').slice(0, 200),
      description: String(body.description || '').slice(0, 5000), urgent: !!body.urgent,
      photos: ownPhotos(body.photos), status: 'open',
      createdBy: user.id, createdByName: user.name, createdByRole: user.role,
      createdAt: stamp(), updatedAt: stamp(), replies: []
    };
    db.complaints.push(rec);
    save();
    return send(res, 200, rec);
  }

  if (method === 'POST' && parts[0] === 'complaints' && parts[2] === 'reply') {
    const c = find('complaints', parts[1]);
    if (!c || !canSeeComplaint(user, c)) fail(404, 'not_found');
    const body = await readBody(req);
    const text = String(body.text || '').trim().slice(0, 5000);
    const photos = ownPhotos(body.photos);
    // Contractors and supervisors report progress; partners and whoever raised it close or reopen
    const canClose = user.role === 'partner' || c.createdBy === user.id;
    const allowed = canClose ? ['open', 'working', 'fixed', 'closed'] : ['working', 'fixed'];
    const status = allowed.includes(body.status) ? body.status : '';
    if (!text && !photos.length && !status) fail(400, 'empty_reply');
    c.replies.push({ id: newId(), userId: user.id, name: user.name, role: user.role, text, photos, status, at: stamp() });
    if (status) c.status = status;
    c.updatedAt = stamp();
    save();
    return send(res, 200, c);
  }

  if (method === 'DELETE' && parts[0] === 'complaints' && parts[1]) {
    if (user.role !== 'partner') fail(403, 'forbidden');
    db.complaints = db.complaints.filter(c => c.id !== parts[1]);
    save();
    return send(res, 200, { ok: true });
  }

  // ---------- Plan change requests ----------
  if (route === 'POST /changes') {
    const body = await readBody(req);
    const booking = find('bookings', body.bookingId);
    if (!booking) fail(400, 'bad_booking');
    const own = user.role === 'customer' && customerBookings(user).some(b => b.id === booking.id);
    if (!own && !can(user, 'flats')) fail(403, 'forbidden');
    const files = (body.files || []).filter(id => db.files.some(f => f.id === id && f.by === user.id));
    if (!String(body.description || '').trim() && !files.length) fail(400, 'empty_request');
    const rec = {
      id: newId(), bookingId: booking.id, unitId: booking.unitId, customerName: booking.customerName, phone: booking.phone,
      description: String(body.description || '').slice(0, 3000), files, finalFiles: [],
      status: 'pending', remark: '', createdAt: localToday(), reviewedAt: '', reviewedBy: '', doneAt: ''
    };
    db.changeRequests.push(rec);
    save();
    return send(res, 200, rec);
  }

  if (method === 'POST' && parts[0] === 'changes' && parts[2]) {
    const rec = find('changeRequests', parts[1]);
    if (!rec) fail(404, 'not_found');
    const body = await readBody(req);
    if (parts[2] === 'review') {
      if (!can(user, 'approvals')) fail(403, 'forbidden');
      if (!['approved', 'rejected', 'pending'].includes(body.status)) fail(400, 'bad_status');
      rec.status = body.status;
      rec.remark = String(body.remark || '').slice(0, 2000);
      rec.finalFiles = (body.finalFiles || []).filter(id => db.files.some(f => f.id === id));
      rec.reviewedAt = body.status === 'pending' ? '' : localToday();
      rec.reviewedBy = body.status === 'pending' ? '' : user.name;
      rec.doneAt = '';
    } else if (parts[2] === 'done') {
      if (!(user.role === 'contractor' || can(user, 'approvals'))) fail(403, 'forbidden');
      if (!['approved', 'done'].includes(rec.status)) fail(400, 'bad_status');
      rec.status = body.done === false ? 'approved' : 'done';
      rec.doneAt = rec.status === 'done' ? localToday() : '';
    } else fail(404, 'not_found');
    save();
    const out = user.role === 'contractor' ? (({ customerName, phone, ...c }) => c)(rec) : rec;
    return send(res, 200, out);
  }

  if (method === 'DELETE' && parts[0] === 'changes' && parts[1]) {
    if (user.role !== 'partner') fail(403, 'forbidden');
    db.changeRequests = db.changeRequests.filter(c => c.id !== parts[1]);
    save();
    return send(res, 200, { ok: true });
  }

  // ---------- Files ----------
  if (route === 'POST /upload') {
    const body = await readBody(req);
    return send(res, 200, await saveUpload(user, body));
  }

  if (method === 'GET' && parts[0] === 'files' && parts[1]) {
    const f = db.files.find(x => x.id === parts[1]);
    const bytes = f && canReadFile(user, f.id) ? await readFile(f) : null;
    if (!bytes) fail(404, 'not_found');
    res.writeHead(200, {
      'Content-Type': f.mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(f.name)}"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(bytes);
  }

  // ---------- Reading bills and statements with AI ----------
  if (route === 'POST /ai/bill' || route === 'POST /ai/statement') {
    if (!can(user, 'materials')) fail(403, 'forbidden');
    if (!aiEnabled()) fail(503, 'ai_off');
    const body = await readBody(req);
    const f = db.files.find(x => x.id === body.fileId && x.by === user.id);
    if (!f || !/^image\/|application\/pdf/.test(f.mime)) fail(400, 'bad_file');
    try {
      const result = route === 'POST /ai/bill' ? await readBill(f, await readFile(f)) : await readStatement(f, await readFile(f));
      return send(res, 200, result);
    } catch (err) {
      console.error('AI error:', err.message);
      fail(502, aiErrorCode(err));
    }
  }

  // ---------- Partner tools ----------
  if (parts[0] === 'admin') {
    if (user.role !== 'partner') fail(403, 'forbidden');
    if (route === 'GET /admin/backup') {
      const { sessions, ...data } = db;
      return send(res, 200, data, { 'Content-Disposition': `attachment; filename="pramukh-view-backup-${localToday()}.json"` });
    }
    if (route === 'POST /admin/restore') {
      const body = await readBody(req);
      if (!body || !Array.isArray(body.projects) || !Array.isArray(body.users) || !body.users.some(u => u.role === 'partner')) fail(400, 'bad_backup');
      const data = {};
      COLLECTIONS.forEach(c => { data[c] = Array.isArray(body[c]) ? body[c] : []; });
      replaceAll(data, { keepUsers: false });
      return send(res, 200, { ok: true });
    }
    if (route === 'POST /admin/setup-pv') return send(res, 200, { created: setupPramukhView() });
    if (route === 'POST /admin/demo') { loadDemo(); return send(res, 200, { ok: true }); }
    if (route === 'POST /admin/clear') {
      replaceAll({});
      return send(res, 200, { ok: true });
    }
  }

  fail(404, 'not_found');
}

// ---------- Static files ----------
function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const full = path.resolve(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return send(res, 404, 'Not found');
  }
  res.writeHead(200, {
    'Content-Type': STATIC_TYPES[path.extname(full)] || 'application/octet-stream',
    'Cache-Control': full.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=604800' : 'no-cache'
  });
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      // Basic protection against other websites posting to the API
      if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'pramukh-view') fail(403, 'forbidden');
      await api(req, res, url);
    } else {
      serveStatic(res, url.pathname);
    }
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'server_error' });
  }
});

server.listen(PORT, () => {
  console.log(`Pramukh View is running: http://localhost:${PORT}`);
  console.log(`Data is kept in: ${storageMode() === 'postgres' ? 'Postgres database' : 'files on disk'}`);
  console.log(aiEnabled() ? 'Bill reading (AI): on' : 'Bill reading (AI): off - set ANTHROPIC_API_KEY to turn it on');
});

// Finish any pending database write before the host stops the server
process.on('SIGTERM', async () => {
  await flush();
  process.exit(0);
});
