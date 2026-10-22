// Helpers and business calculations
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

const money = n => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const fmtDate = d => (d ? d.split('-').reverse().join('-') : '');

function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ATT_VALUE = { present: 1, half: 0.5, absent: 0 };

const Calc = {
  projectName(id) {
    const p = Store.get('projects', id);
    return p ? p.name : '';
  },

  unitLabel(id) {
    const u = Store.get('units', id);
    if (!u) return '';
    return `${this.projectName(u.projectId)} - ${u.number}`;
  },

  bookingLabel(id) {
    const b = Store.get('bookings', id);
    if (!b) return '';
    return `${b.customerName} (${this.unitLabel(b.unitId)})`;
  },

  // Customer bookings
  bookingPaid(b) {
    return sum(Store.list('payments').filter(p => p.bookingId === b.id), p => p.amount);
  },
  bookingDue(b) {
    return (Number(b.totalAmount) || 0) - this.bookingPaid(b);
  },
  unitBooking(u) {
    return Store.list('bookings').find(b => b.unitId === u.id);
  },
  unitStatus(u) {
    const b = this.unitBooking(u);
    if (!b) return 'available';
    return this.bookingDue(b) <= 0 ? 'sold' : 'booked';
  },

  // Materials
  materialCost(m) {
    return (Number(m.qty) || 0) * (Number(m.rate) || 0);
  },
  materialDue(m) {
    return this.materialCost(m) - (Number(m.paid) || 0);
  },

  // Labour
  workerDays(w) {
    return sum(Store.list('attendance').filter(a => a.workerId === w.id), a => ATT_VALUE[a.status]);
  },
  workerEarned(w) {
    if (w.kind === 'contractor') return Number(w.contractAmount) || 0;
    return this.workerDays(w) * (Number(w.wage) || 0);
  },
  workerPaid(w) {
    return sum(Store.list('labourPayments').filter(p => p.workerId === w.id), p => p.amount);
  },
  workerDue(w) {
    return this.workerEarned(w) - this.workerPaid(w);
  },

  projectSummary(pid) {
    const inProject = x => !pid || x.projectId === pid;
    const units = Store.list('units').filter(inProject);
    const unitIds = new Set(units.map(u => u.id));
    const bookings = Store.list('bookings').filter(b => unitIds.has(b.unitId));
    const materials = Store.list('materials').filter(inProject);
    const expenses = Store.list('expenses').filter(inProject);
    const workers = Store.list('workers').filter(inProject);

    const sales = sum(bookings, b => b.totalAmount);
    const received = sum(bookings, b => this.bookingPaid(b));
    const material = sum(materials, m => this.materialCost(m));
    const labour = sum(workers, w => this.workerEarned(w));
    const other = sum(expenses, e => e.amount);
    const expense = material + labour + other;

    return {
      units: units.length,
      booked: bookings.length,
      available: units.length - bookings.length,
      sales,
      received,
      custDue: sales - received,
      material,
      labour,
      other,
      expense,
      supplierDue: sum(materials, m => this.materialDue(m)),
      labourDue: sum(workers, w => this.workerDue(w)),
      profit: received - expense
    };
  }
};
