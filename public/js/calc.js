// Helpers and business calculations
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

const money = n => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const fmtDate = d => (d ? d.split('-').reverse().join('-') : '');

function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const thisMonth = () => today().slice(0, 7);

function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(LANG === 'gu' ? 'gu-IN' : 'en-IN', { month: 'long', year: 'numeric' });
}

const Calc = {
  projectName(id) {
    const p = Store.get('projects', id);
    return p ? p.name : '';
  },

  unitCode(u) {
    return u.wing ? `${u.wing}-${u.number}` : String(u.number);
  },

  unitLabel(id) {
    const u = Store.get('units', id);
    if (!u) return '';
    return `${this.projectName(u.projectId)} - ${this.unitCode(u)}`;
  },

  // Unit's own price, or the project's price for that BHK
  unitPrice(u) {
    if (Number(u.price)) return Number(u.price);
    const p = Store.get('projects', u.projectId);
    return (p && u.bhk && Number(p['price' + u.bhk])) || 0;
  },

  unitBooking(u) {
    return Store.list('bookings').find(b => b.unitId === u.id);
  },
  unitStatus(u) {
    return this.unitBooking(u) ? 'booked' : 'available';
  },

  // Latest plan change request for a flat (approved/done ones count first)
  unitChange(u) {
    const all = Store.list('changeRequests').filter(c => c.unitId === u.id);
    const rank = { approved: 4, done: 3, pending: 2, rejected: 1 };
    return all.sort((a, b) => (rank[b.status] - rank[a.status]) || (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  },

  // Material bills
  billPaid: b => b.status === 'paid',
  monthBills(ym) {
    return Store.list('bills').filter(b => (b.date || '').startsWith(ym));
  },
  suppliers() {
    return [...new Set(Store.list('bills').map(b => (b.supplier || '').trim()).filter(Boolean))].sort();
  },

  projectSummary(pid) {
    const inProject = x => !pid || x.projectId === pid;
    const units = Store.list('units').filter(inProject);
    const unitIds = new Set(units.map(u => u.id));
    const bookings = Store.list('bookings').filter(b => unitIds.has(b.unitId));
    const bills = Store.list('bills').filter(inProject);
    const expenses = Store.list('expenses').filter(inProject);

    const material = sum(bills, b => b.amount);
    const other = sum(expenses, e => e.amount);
    return {
      units: units.length,
      booked: bookings.length,
      available: units.length - bookings.length,
      material,
      other,
      expense: material + other,
      supplierDue: sum(bills.filter(b => !this.billPaid(b)), b => b.amount)
    };
  }
};
