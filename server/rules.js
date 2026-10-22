// Who can see and change what. Every API read and write goes through these rules.
import { db } from './db.js';
import { normMobile } from './auth.js';

// The material bills and complaints sections are switched off unless MATERIALS=on / COMPLAINTS=on is set on the server
export const MATERIALS = process.env.MATERIALS === 'on';
export const COMPLAINTS = process.env.COMPLAINTS === 'on';

// What a partner can tick for each staff member, supervisor or contractor
export const PERMS = ['daily', 'dailyView', 'complaints', 'flats', 'approvals', 'visitors', 'materials'];

// The building wings a supervisor or contractor can be assigned to
export const WINGS = ['A', 'B'];

const isPartner = u => u.role === 'partner';

// Plan changes are approved only by the people ticked as approvers (partners or staff).
// Until anyone is ticked, partners can approve so requests never get stuck.
const isApprover = x => x.active !== 'no' && x.role !== 'contractor' && (x.approver === 'yes' || (x.perms || []).includes('approvals'));
export function canApprove(u) {
  const approvers = db.users.filter(isApprover);
  return approvers.length ? approvers.some(x => x.id === u.id) : isPartner(u);
}

// Supervisors (staff with a wing) and contractors see the site list of flats to change in their wings
export const onSite = u => u.role === 'contractor' || (u.role === 'staff' && (u.wings || []).length > 0);

export function can(u, perm) {
  if (perm === 'approvals') return u.role !== 'customer' && canApprove(u);
  if (perm === 'materials' && !MATERIALS) return false;
  if (perm === 'complaints' && !COMPLAINTS) return false;
  // Contractors always see and answer complaints for their wing
  if (u.role === 'contractor' && perm === 'complaints') return true;
  // Contractors never handle flat owners or approve plan changes
  if (u.role === 'contractor' && (perm === 'flats' || perm === 'approvals')) return false;
  return isPartner(u) || (['staff', 'contractor'].includes(u.role) && u.perms.includes(perm));
}

// Fields a client may set on each collection (anything else is ignored)
export const FIELDS = {
  projects: ['name', 'location', 'startDate', 'status', 'price3', 'price4', 'notes'],
  units: ['projectId', 'wing', 'number', 'type', 'bhk', 'floor', 'area', 'parking', 'price'],
  bookings: ['unitId', 'customerName', 'phone', 'address', 'bookingDate', 'notes', 'planChoice'],
  bills: ['projectId', 'date', 'billNo', 'supplier', 'itemsText', 'gst', 'amount', 'photo', 'status', 'paidDate', 'paidMode', 'paidRef', 'notes'],
  expenses: ['projectId', 'date', 'category', 'amount', 'notes'],
  visitors: ['date', 'name', 'phone', 'interest', 'source', 'budget', 'attendedBy', 'status', 'followUp', 'notes'],
  users: ['name', 'mobile', 'role', 'perms', 'wings', 'approver', 'active']
};

// Who may create / edit / delete in each collection
const WRITE = {
  projects: u => isPartner(u),
  units: u => isPartner(u),
  bookings: u => can(u, 'flats'),
  bills: u => can(u, 'materials'),
  expenses: u => can(u, 'materials'),
  visitors: u => can(u, 'visitors'),
  users: u => isPartner(u)
};
export const canWrite = (u, coll) => !!(WRITE[coll] && u.role !== 'customer' && WRITE[coll](u));

// Linked records that block a delete
export const REFS = {
  projects: [['units', 'projectId'], ['bills', 'projectId'], ['expenses', 'projectId']],
  units: [['bookings', 'unitId'], ['changeRequests', 'unitId']],
  bookings: [['changeRequests', 'bookingId']]
};

// Partners see every wing; everyone else only the wings ticked for them.
// A record for both wings ('both') is seen by everyone on either wing.
export const seesWing = (u, wing) => isPartner(u) || wing === 'both' || (u.wings || []).includes(wing);
const unitWing = unitId => (db.units.find(x => x.id === unitId) || {}).wing;
export const canSeeComplaint = (u, c) => can(u, 'complaints') && seesWing(u, c.wing);

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
  if (u.role !== 'contractor' && (can(u, 'flats') || can(u, 'approvals'))) {
    out.bookings = db.bookings.map(publicBooking);
    out.changeRequests = db.changeRequests;
  } else if (onSite(u)) {
    // Contractors and supervisors see approved changes in their wings only, without customer names or phone numbers
    out.changeRequests = db.changeRequests
      .filter(c => (c.status === 'approved' || c.status === 'done') && seesWing(u, unitWing(c.unitId)))
      .map(({ customerName, phone, ...c }) => c);
  }
  if (can(u, 'daily') || can(u, 'dailyView')) {
    out.dailyReports = db.dailyReports.filter(r => r.userId === u.id || seesWing(u, r.wing || 'both'));
  }
  if (can(u, 'complaints')) out.complaints = db.complaints.filter(c => canSeeComplaint(u, c));
  if (can(u, 'materials')) { out.bills = db.bills; out.expenses = db.expenses; }
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
    (c.files || []).includes(fileId) || (c.finalFiles || []).includes(fileId) || c.pdfFile === fileId || c.cadFile === fileId);
  const inBills = (data.bills || []).some(b => b.photo === fileId);
  const inReports = (data.dailyReports || []).some(r => (r.photos || []).includes(fileId));
  const inComplaints = (data.complaints || []).some(c =>
    (c.photos || []).includes(fileId) || (c.replies || []).some(r => (r.photos || []).includes(fileId)));
  return inChanges || inBills || inReports || inComplaints;
}
