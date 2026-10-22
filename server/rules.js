// Who can see and change what. Every API read and write goes through these rules.
import { db } from './db.js';
import { normMobile } from './auth.js';

// Staff permissions a partner can tick for each staff member
export const PERMS = ['flats', 'approvals', 'materials', 'labour', 'visitors'];

const isPartner = u => u.role === 'partner';
export const can = (u, perm) => isPartner(u) || (u.role === 'staff' && u.perms.includes(perm));

// Fields a client may set on each collection (anything else is ignored)
export const FIELDS = {
  projects: ['name', 'location', 'startDate', 'status', 'price3', 'price4', 'notes'],
  units: ['projectId', 'wing', 'number', 'type', 'bhk', 'floor', 'area', 'parking', 'price'],
  bookings: ['unitId', 'customerName', 'phone', 'address', 'bookingDate', 'notes'],
  bills: ['projectId', 'date', 'billNo', 'supplier', 'itemsText', 'gst', 'amount', 'photo', 'status', 'paidDate', 'paidMode', 'paidRef', 'notes'],
  expenses: ['projectId', 'date', 'category', 'amount', 'notes'],
  workers: ['name', 'phone', 'kind', 'workType', 'projectId', 'wage', 'contractAmount'],
  attendance: ['workerId', 'date', 'status'],
  labourPayments: ['workerId', 'date', 'amount', 'mode', 'notes'],
  visitors: ['date', 'name', 'phone', 'interest', 'source', 'budget', 'attendedBy', 'status', 'followUp', 'notes'],
  users: ['name', 'mobile', 'role', 'perms', 'active']
};

// Who may create / edit / delete in each collection
const WRITE = {
  projects: u => isPartner(u),
  units: u => isPartner(u),
  bookings: u => can(u, 'flats'),
  bills: u => can(u, 'materials'),
  expenses: u => can(u, 'materials'),
  workers: u => can(u, 'labour'),
  attendance: u => can(u, 'labour'),
  labourPayments: u => can(u, 'labour'),
  visitors: u => can(u, 'visitors'),
  users: u => isPartner(u)
};
export const canWrite = (u, coll) => !!(WRITE[coll] && u.role !== 'customer' && WRITE[coll](u));

// Linked records that block a delete
export const REFS = {
  projects: [['units', 'projectId'], ['bills', 'projectId'], ['expenses', 'projectId'], ['workers', 'projectId']],
  units: [['bookings', 'unitId'], ['changeRequests', 'unitId']],
  bookings: [['changeRequests', 'bookingId']],
  workers: [['attendance', 'workerId'], ['labourPayments', 'workerId']]
};

export const customerBookings = u => db.bookings.filter(b => normMobile(b.phone) === u.mobile && b.pinHash);

// Never send password hashes; tell the office whether a login is set instead
const publicBooking = b => {
  const { pinHash, ...rest } = b;
  return { ...rest, hasLogin: !!pinHash };
};
const publicUser = x => {
  const { pinHash, ...rest } = x;
  return rest;
};

// Everything this person is allowed to see
export function readableData(u) {
  const out = {};
  if (u.role === 'customer') {
    const own = customerBookings(u);
    const unitIds = new Set(own.map(b => b.unitId));
    out.units = db.units.filter(x => unitIds.has(x.id));
    const projectIds = new Set(out.units.map(x => x.projectId));
    out.projects = db.projects.filter(p => projectIds.has(p.id)).map(({ price3, price4, notes, ...p }) => p);
    out.bookings = own.map(publicBooking);
    const bookingIds = new Set(own.map(b => b.id));
    out.changeRequests = db.changeRequests.filter(c => bookingIds.has(c.bookingId));
    return out;
  }

  out.projects = db.projects;
  out.units = db.units;
  if (u.role === 'contractor') {
    // Contractors see approved changes only, without customer names or phone numbers
    out.changeRequests = db.changeRequests
      .filter(c => c.status === 'approved' || c.status === 'done')
      .map(({ customerName, phone, ...c }) => c);
    return out;
  }

  if (can(u, 'flats') || can(u, 'approvals')) out.bookings = db.bookings.map(publicBooking);
  if (can(u, 'flats') || can(u, 'approvals')) out.changeRequests = db.changeRequests;
  if (can(u, 'materials')) { out.bills = db.bills; out.expenses = db.expenses; }
  if (can(u, 'labour')) { out.workers = db.workers; out.attendance = db.attendance; out.labourPayments = db.labourPayments; }
  if (can(u, 'visitors')) out.visitors = db.visitors;
  if (isPartner(u)) out.users = db.users.map(publicUser);
  return out;
}

// Can this person open an uploaded file?
export function canReadFile(u, fileId) {
  const file = db.files.find(f => f.id === fileId);
  if (!file) return false;
  if (file.by === u.id) return true;
  const data = readableData(u);
  const inChanges = (data.changeRequests || []).some(c =>
    (c.files || []).includes(fileId) || (c.finalFiles || []).includes(fileId));
  const inBills = (data.bills || []).some(b => b.photo === fileId);
  return inChanges || inBills;
}
