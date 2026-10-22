// Pramukh View flats (from the brochure) and example data for trying the app
import { db, newId, save, replaceAll } from './db.js';
import { hashPin } from './auth.js';

const WINGS = [
  { wing: 'A', bhk: '4', area: 1775, parking: 2, floors: 14, perFloor: 2 },
  { wing: 'B', bhk: '3', area: 1350, parking: 1, floors: 14, perFloor: 3 }
];

function buildPramukhView(prices = {}) {
  const project = {
    id: newId(), name: 'Pramukh View', location: 'Parsana Chowk, Mota Mava, Rajkot',
    startDate: '', status: 'ongoing', price3: prices[3] || '', price4: prices[4] || '', notes: ''
  };
  const units = [];
  WINGS.forEach(w => {
    for (let floor = 1; floor <= w.floors; floor++) {
      for (let n = 1; n <= w.perFloor; n++) {
        units.push({
          id: newId(), projectId: project.id, wing: w.wing, number: String(floor * 100 + n),
          type: 'flat', bhk: w.bhk, floor: String(floor), area: w.area, parking: w.parking, price: ''
        });
      }
    }
  });
  return { project, units };
}

// Adds Pramukh View and its 70 flats unless it already exists
export function setupPramukhView() {
  if (db.projects.some(p => p.name === 'Pramukh View')) return false;
  const { project, units } = buildPramukhView();
  db.projects.push(project);
  db.units.push(...units);
  save();
  return true;
}

const daysAgo = n => {
  const x = new Date();
  x.setDate(x.getDate() - n);
  return x.toISOString().slice(0, 10);
};

// Replaces all data (except staff logins) with a demo. Demo flat owners log in with PIN 1234.
export function loadDemo() {
  const d = {};
  const { project: p, units } = buildPramukhView({ 3: 6500000, 4: 8500000 });
  p.startDate = daysAgo(300);
  d.projects = [p];
  d.units = units;
  const unit = (wing, number) => units.find(u => u.wing === wing && u.number === number);

  const demoPin = hashPin('1234');
  d.bookings = [
    ['ડેમો ગ્રાહક 1', '9800000001', 'A', '101', 200],
    ['ડેમો ગ્રાહક 2', '9800000002', 'A', '502', 180],
    ['ડેમો ગ્રાહક 3', '9800000003', 'A', '902', 90],
    ['ડેમો ગ્રાહક 4', '9800000004', 'B', '101', 160],
    ['ડેમો ગ્રાહક 5', '9800000005', 'B', '203', 150],
    ['ડેમો ગ્રાહક 6', '9800000006', 'B', '602', 75],
    ['ડેમો ગ્રાહક 7', '9800000007', 'B', '1001', 40],
    ['ડેમો ગ્રાહક 8', '9800000008', 'B', '1403', 10]
  ].map(([customerName, phone, wing, number, ago]) => ({
    id: newId(), unitId: unit(wing, number).id, customerName, phone, address: '',
    bookingDate: daysAgo(ago), notes: '', pinHash: demoPin
  }));
  const booking = i => d.bookings[i];

  d.changeRequests = [
    [0, 'કિચન અને ડાઇનિંગ વચ્ચેની દીવાલ કાઢીને ઓપન કિચન કરવું છે.', 'approved', 'મંજૂર. સ્ટ્રક્ચરને અસર નથી.', 20],
    [3, 'બેડરૂમ 3 માં બાથરૂમનો દરવાજો બીજી બાજુ ખસેડવો છે.', 'pending', '', 3],
    [5, 'પૂજા રૂમ મોટો કરવો છે, સ્ટોર રૂમ કાઢી નાખવો.', 'approved', 'મંજૂર. કામ પૂરું થયું.', 40],
    [6, 'બાલ્કનીમાં કોલમ ખસેડવો છે.', 'rejected', 'કોલમ સ્ટ્રક્ચરનો ભાગ છે, ખસેડી શકાય નહીં.', 12]
  ].map(([i, description, status, remark, ago]) => ({
    id: newId(), bookingId: booking(i).id, unitId: booking(i).unitId,
    customerName: booking(i).customerName, phone: booking(i).phone,
    description, files: [], finalFiles: [], status, remark,
    createdAt: daysAgo(ago), reviewedAt: status === 'pending' ? '' : daysAgo(ago - 2), reviewedBy: status === 'pending' ? '' : 'Civil',
    doneAt: i === 5 ? daysAgo(5) : ''
  }));
  d.changeRequests[2].status = 'done';

  const month = n => daysAgo(n);
  d.bills = [
    [month(70), 'B-1021', 'શ્રી અંબિકા ટ્રેડર્સ', 'સિમેન્ટ 1000 બેગ × 380', 380000, 'paid'],
    [month(55), '5543', 'જય સ્ટીલ', 'સળિયા 12mm 20 ટન × 62000', 1240000, 'paid'],
    [month(40), 'R-88', 'મહાદેવ સપ્લાયર્સ', 'રેતી 40 બ્રાસ × 4500', 180000, 'paid'],
    [month(25), 'B-1102', 'શ્રી અંબિકા ટ્રેડર્સ', 'સિમેન્ટ 800 બેગ × 385', 308000, 'pending'],
    [month(12), '5690', 'જય સ્ટીલ', 'સળિયા 10mm 8 ટન × 63000', 504000, 'pending'],
    [month(6), 'G-17', 'ગણેશ બ્લોક્સ', 'AAC બ્લોક 12000 નંગ × 45', 540000, 'paid'],
    [month(2), 'R-102', 'મહાદેવ સપ્લાયર્સ', 'કપચી 30 બ્રાસ × 3800', 114000, 'pending']
  ].map(([date, billNo, supplier, itemsText, amount, status]) => ({
    id: newId(), projectId: p.id, date, billNo, supplier, itemsText, gst: '', amount, photo: '',
    status, paidDate: status === 'paid' ? date : '', paidMode: status === 'paid' ? 'bank' : '', paidRef: '', notes: ''
  }));

  d.expenses = [
    [290, 'govt', 1200000, 'પ્લાન પાસ / RERA ફી'],
    [100, 'machinery', 180000, 'ટાવર ક્રેન ભાડું'],
    [30, 'electricity', 45000, 'લાઇટ બિલ']
  ].map(([ago, category, amount, notes]) => ({ id: newId(), projectId: p.id, date: daysAgo(ago), category, amount, notes }));

  d.workers = [
    { name: 'ડેમો કડિયા', kind: 'daily', workType: 'કડિયા / Mason', wage: 900 },
    { name: 'ડેમો મજૂર', kind: 'daily', workType: 'મજૂર / Helper', wage: 600 },
    { name: 'ડેમો પ્લમ્બિંગ કોન્ટ્રાક્ટર', kind: 'contractor', workType: 'પ્લમ્બિંગ / Plumbing', contractAmount: 1800000 }
  ].map(x => Object.assign({ id: newId(), phone: '', projectId: p.id, wage: '', contractAmount: '' }, x));
  d.attendance = [];
  for (let ago = 1; ago <= 14; ago++) {
    d.workers.filter(w => w.kind === 'daily').forEach((w, i) => {
      const status = (ago + i) % 7 === 0 ? 'absent' : (ago + i) % 5 === 0 ? 'half' : 'present';
      d.attendance.push({ id: newId(), workerId: w.id, date: daysAgo(ago), status });
    });
  }
  d.labourPayments = [[0, 7, 5000], [1, 7, 3500], [2, 30, 600000]].map(([i, ago, amount]) =>
    ({ id: newId(), workerId: d.workers[i].id, date: daysAgo(ago), amount, mode: 'cash', notes: '' }));

  d.visitors = [
    [0, 'ડેમો મુલાકાતી 1', '9811111111', '4', 'reference', 'interested', 2],
    [0, 'ડેમો મુલાકાતી 2', '9822222222', '3', 'hoarding', 'new', 0],
    [1, 'ડેમો મુલાકાતી 3', '9833333333', '3', 'social', 'followup', 1],
    [3, 'ડેમો મુલાકાતી 4', '9844444444', '4', 'walkin', 'notInterested', 0]
  ].map(([ago, name, phone, interest, source, status, follow]) => ({
    id: newId(), date: daysAgo(ago), name, phone, interest, source, budget: '', attendedBy: 'Office',
    status, followUp: follow ? daysAgo(-follow) : '', notes: ''
  }));

  const report = (ago, workDone, workers, plan) => ({
    id: `${daysAgo(ago)}_demo`, date: daysAgo(ago), userId: 'demo', userName: 'ડેમો સુપરવાઇઝર',
    workDone, workers, photos: [], updatedAt: daysAgo(ago) + 'T18:00:00.000Z',
    plan: plan.map(([text, status], i) => ({ id: `d${ago}-${i}`, text, status, checkedOn: status ? daysAgo(ago - 1) : '' }))
  });
  d.dailyReports = [
    report(2, 'વિંગ A 8મા માળનો સ્લેબ ભર્યો. વિંગ B 3જા માળે બ્લોક કામ.', 34,
      [['વિંગ A 9મા માળનું શટરિંગ', 'done'], ['વિંગ B 3જા માળે પ્લાસ્ટર', 'notdone']]),
    report(1, 'વિંગ A 9મા માળનું શટરિંગ પૂરું. વિંગ B માં લિફ્ટ ખાડાનું કામ.', 32,
      [['વિંગ A 9મા માળનું સ્ટીલ બાંધવું', ''], ['વિંગ B 3જા માળે પ્લાસ્ટર', ''], ['સાઇટ સફાઈ', '']])
  ];

  d.files = [];
  replaceAll(d);
}
