// Example data so the demo can be explored right away
function loadSampleData() {
  const d = { projects: [], units: [], bookings: [], payments: [], materials: [], expenses: [], workers: [], attendance: [], labourPayments: [] };
  const id = () => Store.newId();
  const daysAgo = n => {
    const x = new Date();
    x.setDate(x.getDate() - n);
    const pad = v => String(v).padStart(2, '0');
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };

  const p1 = { id: id(), name: 'પ્રમુખ રેસિડેન્સી', location: 'વસ્ત્રાપુર, અમદાવાદ', startDate: daysAgo(240), status: 'ongoing', notes: '' };
  const p2 = { id: id(), name: 'પ્રમુખ પ્લાઝા', location: 'વરાછા, સુરત', startDate: daysAgo(90), status: 'ongoing', notes: '' };
  d.projects.push(p1, p2);

  // Units: 8 flats in Residency, 4 shops in Plaza
  ['A-101', 'A-102', 'A-201', 'A-202', 'A-301', 'A-302', 'A-401', 'A-402'].forEach((n, i) =>
    d.units.push({ id: id(), projectId: p1.id, number: n, type: 'flat', floor: String(Math.floor(i / 2) + 1), area: i % 2 ? 1250 : 1100, price: i % 2 ? 4500000 : 4000000 }));
  ['S-1', 'S-2', 'S-3', 'S-4'].forEach(n =>
    d.units.push({ id: id(), projectId: p2.id, number: n, type: 'shop', floor: '0', area: 350, price: 3500000 }));

  // Bookings and payments
  const customers = [
    ['રમેશભાઈ પટેલ', '9825012345', 0, [[180, 500000, 'cheque'], [90, 1000000, 'bank'], [20, 500000, 'bank']]],
    ['સુરેશભાઈ શાહ', '9898012345', 1, [[150, 4500000, 'bank']]],
    ['મહેશભાઈ દેસાઈ', '9426012345', 2, [[60, 300000, 'cash'], [10, 700000, 'upi']]],
    ['કિરણબેન જોષી', '9724012345', 4, [[30, 250000, 'cheque']]],
    ['અમિતભાઈ મહેતા', '9909012345', 8, [[45, 1000000, 'bank']]],
    ['જયેશભાઈ ઠક્કર', '9879012345', 9, [[15, 500000, 'cheque']]]
  ];
  customers.forEach(([name, phone, unitIndex, pays]) => {
    const u = d.units[unitIndex];
    const b = { id: id(), unitId: u.id, customerName: name, phone, address: '', bookingDate: daysAgo(pays[0][0]), totalAmount: u.price, notes: '' };
    d.bookings.push(b);
    pays.forEach(([ago, amount, mode]) =>
      d.payments.push({ id: id(), bookingId: b.id, date: daysAgo(ago), amount, mode, reference: mode === 'cheque' ? String(100000 + ago) : '', notes: '' }));
  });

  // Materials
  [
    [p1, 200, 'સિમેન્ટ / Cement', 1500, 'bag', 380, 'શ્રી અંબિકા ટ્રેડર્સ', 570000],
    [p1, 150, 'સળિયા / Steel', 25, 'ton', 62000, 'જય સ્ટીલ', 1200000],
    [p1, 120, 'રેતી / Sand', 40, 'brass', 4500, 'મહાદેવ સપ્લાયર્સ', 180000],
    [p1, 30, 'ઈંટ / Bricks', 50000, 'nos', 8, 'ગણેશ બ્રિક્સ', 250000],
    [p2, 60, 'સિમેન્ટ / Cement', 600, 'bag', 385, 'શ્રી અંબિકા ટ્રેડર્સ', 150000],
    [p2, 40, 'સળિયા / Steel', 8, 'ton', 63000, 'જય સ્ટીલ', 504000]
  ].forEach(([p, ago, item, qty, uom, rate, supplier, paid]) =>
    d.materials.push({ id: id(), projectId: p.id, date: daysAgo(ago), item, qty, uom, rate, supplier, paid, notes: '' }));

  // Other expenses
  [
    [p1, 230, 'govt', 350000, 'પ્લાન પાસ ફી'],
    [p1, 100, 'machinery', 85000, 'JCB ભાડું'],
    [p1, 15, 'electricity', 12000, 'લાઇટ બિલ'],
    [p2, 80, 'govt', 200000, 'NA મંજૂરી'],
    [p2, 20, 'transport', 18000, 'ટ્રક ભાડું']
  ].forEach(([p, ago, category, amount, notes]) =>
    d.expenses.push({ id: id(), projectId: p.id, date: daysAgo(ago), category, amount, notes }));

  // Workers
  const w = [
    { name: 'રાજુભાઈ', kind: 'daily', workType: 'કડિયા / Mason', projectId: p1.id, wage: 900 },
    { name: 'મનોજભાઈ', kind: 'daily', workType: 'મજૂર / Helper', projectId: p1.id, wage: 600 },
    { name: 'દિનેશભાઈ', kind: 'daily', workType: 'સુથાર / Carpenter', projectId: p2.id, wage: 1000 },
    { name: 'ભરતભાઈ કોન્ટ્રાક્ટર', kind: 'contractor', workType: 'પ્લમ્બિંગ / Plumbing', projectId: p1.id, contractAmount: 450000 },
    { name: 'વિજયભાઈ કોન્ટ્રાક્ટર', kind: 'contractor', workType: 'ઇલેક્ટ્રિક / Electrical', projectId: p2.id, contractAmount: 300000 }
  ].map(x => Object.assign({ id: id(), phone: '', wage: '', contractAmount: '' }, x));
  d.workers.push(...w);

  // Attendance for the last 14 days
  for (let ago = 1; ago <= 14; ago++) {
    w.filter(x => x.kind === 'daily').forEach((x, i) => {
      const status = (ago + i) % 7 === 0 ? 'absent' : (ago + i) % 5 === 0 ? 'half' : 'present';
      d.attendance.push({ id: id(), workerId: x.id, date: daysAgo(ago), status });
    });
  }

  // Labour payments
  [[0, 7, 5000], [1, 7, 3500], [2, 7, 6000], [3, 30, 200000], [4, 10, 100000]].forEach(([i, ago, amount]) =>
    d.labourPayments.push({ id: id(), workerId: w[i].id, date: daysAgo(ago), amount, mode: 'cash', notes: '' }));

  Store.replaceAll(d);
}
