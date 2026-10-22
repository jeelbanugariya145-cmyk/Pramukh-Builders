// Pramukh View project setup and example data

// Builds the Pramukh View project and all its flats (from the brochure layout)
function buildPramukhView(id, prices = {}) {
  const project = {
    id: id(), name: BRAND.project, location: 'Parsana Chowk, Mota Mava, Rajkot',
    startDate: '', status: 'ongoing', price3: prices[3] || '', price4: prices[4] || '', notes: ''
  };
  const units = [];
  BRAND.wings.forEach(w => {
    for (let floor = 1; floor <= w.floors; floor++) {
      for (let n = 1; n <= w.perFloor; n++) {
        units.push({
          id: id(), projectId: project.id, wing: w.wing, number: String(floor * 100 + n),
          type: 'flat', bhk: w.bhk, floor: String(floor), area: w.area, parking: w.parking, price: ''
        });
      }
    }
  });
  return { project, units };
}

// Adds Pramukh View to the existing data (keeps everything else)
function setupPramukhView() {
  if (Store.list('projects').some(p => p.name === BRAND.project)) return false;
  const { project, units } = buildPramukhView(() => Store.newId());
  Store.data.projects.push(project);
  Store.data.units.push(...units);
  Store.save();
  return true;
}

// Replaces all data with a demo: Pramukh View with sample bookings, materials and labour
function loadSampleData() {
  const d = emptyData();
  const id = () => Store.newId();
  const daysAgo = n => {
    const x = new Date();
    x.setDate(x.getDate() - n);
    const pad = v => String(v).padStart(2, '0');
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };

  const { project: p1, units } = buildPramukhView(id, { 3: 6500000, 4: 8500000 });
  p1.startDate = daysAgo(300);
  d.projects.push(p1);
  d.units.push(...units);
  const unit = (wing, number) => units.find(u => u.wing === wing && u.number === number);

  // Bookings and payments (demo customers)
  const customers = [
    ['ડેમો ગ્રાહક 1', '9800000001', 'A', '101', [[200, 1500000, 'cheque'], [120, 2000000, 'bank'], [30, 1000000, 'bank']]],
    ['ડેમો ગ્રાહક 2', '9800000002', 'A', '502', [[180, 8500000, 'bank']]],
    ['ડેમો ગ્રાહક 3', '9800000003', 'A', '902', [[90, 1000000, 'cheque'], [20, 1500000, 'upi']]],
    ['ડેમો ગ્રાહક 4', '9800000004', 'B', '101', [[160, 1000000, 'cheque'], [60, 2000000, 'bank']]],
    ['ડેમો ગ્રાહક 5', '9800000005', 'B', '203', [[150, 6500000, 'bank']]],
    ['ડેમો ગ્રાહક 6', '9800000006', 'B', '602', [[75, 1500000, 'bank']]],
    ['ડેમો ગ્રાહક 7', '9800000007', 'B', '1001', [[40, 500000, 'cheque']]],
    ['ડેમો ગ્રાહક 8', '9800000008', 'B', '1403', [[10, 1000000, 'upi']]]
  ];
  customers.forEach(([name, phone, wing, number, pays]) => {
    const u = unit(wing, number);
    const b = { id: id(), unitId: u.id, customerName: name, phone, address: '', bookingDate: daysAgo(pays[0][0]), totalAmount: sampleUnitPrice(p1, u), notes: '' };
    d.bookings.push(b);
    pays.forEach(([ago, amount, mode]) =>
      d.payments.push({ id: id(), bookingId: b.id, date: daysAgo(ago), amount, mode, reference: mode === 'cheque' ? String(100000 + ago) : '', notes: '' }));
  });

  // Materials
  [
    [280, 'સિમેન્ટ / Cement', 4000, 'bag', 380, 'ડેમો સપ્લાયર 1', 1400000],
    [250, 'સળિયા / Steel', 120, 'ton', 62000, 'ડેમો સપ્લાયર 2', 6500000],
    [200, 'રેતી / Sand', 150, 'brass', 4500, 'ડેમો સપ્લાયર 3', 600000],
    [120, 'કપચી / Aggregate', 140, 'brass', 3800, 'ડેમો સપ્લાયર 3', 532000],
    [60, 'બ્લોક / Blocks', 80000, 'nos', 45, 'ડેમો સપ્લાયર 4', 2500000],
    [15, 'સિમેન્ટ / Cement', 1500, 'bag', 385, 'ડેમો સપ્લાયર 1', 300000]
  ].forEach(([ago, item, qty, uom, rate, supplier, paid]) =>
    d.materials.push({ id: id(), projectId: p1.id, date: daysAgo(ago), item, qty, uom, rate, supplier, paid, notes: '' }));

  // Other expenses
  [
    [290, 'govt', 1200000, 'પ્લાન પાસ / RERA ફી'],
    [260, 'machinery', 350000, 'JCB / ખોદકામ'],
    [100, 'machinery', 180000, 'ટાવર ક્રેન ભાડું'],
    [30, 'electricity', 45000, 'લાઇટ બિલ'],
    [12, 'transport', 28000, 'ટ્રક ભાડું']
  ].forEach(([ago, category, amount, notes]) =>
    d.expenses.push({ id: id(), projectId: p1.id, date: daysAgo(ago), category, amount, notes }));

  // Workers
  const w = [
    { name: 'ડેમો કડિયા', kind: 'daily', workType: 'કડિયા / Mason', wage: 900 },
    { name: 'ડેમો મજૂર', kind: 'daily', workType: 'મજૂર / Helper', wage: 600 },
    { name: 'ડેમો સુથાર', kind: 'daily', workType: 'સુથાર / Carpenter', wage: 1000 },
    { name: 'ડેમો પ્લમ્બિંગ કોન્ટ્રાક્ટર', kind: 'contractor', workType: 'પ્લમ્બિંગ / Plumbing', contractAmount: 1800000 },
    { name: 'ડેમો ઇલેક્ટ્રિક કોન્ટ્રાક્ટર', kind: 'contractor', workType: 'ઇલેક્ટ્રિક / Electrical', contractAmount: 1500000 }
  ].map(x => Object.assign({ id: id(), phone: '', projectId: p1.id, wage: '', contractAmount: '' }, x));
  d.workers.push(...w);

  // Attendance for the last 14 days
  for (let ago = 1; ago <= 14; ago++) {
    w.filter(x => x.kind === 'daily').forEach((x, i) => {
      const status = (ago + i) % 7 === 0 ? 'absent' : (ago + i) % 5 === 0 ? 'half' : 'present';
      d.attendance.push({ id: id(), workerId: x.id, date: daysAgo(ago), status });
    });
  }

  // Labour payments
  [[0, 7, 5000], [1, 7, 3500], [2, 7, 6000], [3, 30, 600000], [4, 10, 400000]].forEach(([i, ago, amount]) =>
    d.labourPayments.push({ id: id(), workerId: w[i].id, date: daysAgo(ago), amount, mode: 'cash', notes: '' }));

  Store.replaceAll(d);
}

function sampleUnitPrice(project, unit) {
  return Number(project['price' + unit.bhk]) || 0;
}
