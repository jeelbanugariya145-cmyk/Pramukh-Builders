// Definition of every record type: form fields, table columns and links
const opts = (prefix, keys) => () => keys.map(k => ({ value: k, label: t(prefix + k) }));

const projectOptions = () =>
  Store.list('projects').map(p => ({ value: p.id, label: p.name }));

const badge = (cls, text) => `<span class="badge badge-${cls}">${esc(text)}</span>`;

const ENTITIES = {
  projects: {
    fields: [
      { name: 'name', label: 'name', required: true },
      { name: 'location', label: 'location' },
      { name: 'startDate', label: 'startDate', type: 'date' },
      { name: 'status', label: 'status', type: 'select', options: opts('st_', ['planning', 'ongoing', 'completed']), default: 'ongoing' },
      { name: 'price3', label: 'price3', type: 'number' },
      { name: 'price4', label: 'price4', type: 'number' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'name', value: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'location', value: r => esc(r.location) },
      { label: 'startDate', value: r => fmtDate(r.startDate) },
      { label: 'status', value: r => badge(r.status, t('st_' + r.status)) },
      { label: 'units', value: r => { const s = Calc.projectSummary(r.id); return `${s.booked} / ${s.units}`; }, num: true },
      { label: 'sales', value: r => money(Calc.projectSummary(r.id).sales), num: true }
    ],
    refs: [
      { coll: 'units', field: 'projectId' },
      { coll: 'materials', field: 'projectId' },
      { coll: 'expenses', field: 'projectId' },
      { coll: 'workers', field: 'projectId' }
    ]
  },

  units: {
    fields: [
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true },
      { name: 'wing', label: 'wing' },
      { name: 'number', label: 'unitNo', required: true },
      { name: 'type', label: 'type', type: 'select', options: opts('ut_', ['flat', 'shop', 'bungalow', 'plot', 'office']), default: 'flat' },
      { name: 'bhk', label: 'bhk', type: 'select', options: () => ['1', '2', '3', '4', '5'].map(v => ({ value: v, label: v + ' BHK' })) },
      { name: 'floor', label: 'floor' },
      { name: 'area', label: 'area', type: 'number' },
      { name: 'parking', label: 'parking', type: 'number' },
      { name: 'price', label: 'priceOptional', type: 'number' }
    ],
    columns: [
      { label: 'project', value: r => esc(Calc.projectName(r.projectId)) },
      { label: 'unitNo', value: r => `<strong>${esc(Calc.unitCode(r))}</strong>` },
      { label: 'type', value: r => r.bhk ? `${esc(r.bhk)} BHK` : t('ut_' + r.type) },
      { label: 'floor', value: r => esc(r.floor) },
      { label: 'area', value: r => esc(r.area), num: true },
      { label: 'parking', value: r => esc(r.parking), num: true },
      { label: 'price', value: r => { const p = Calc.unitPrice(r); return p ? money(p) : '—'; }, num: true },
      { label: 'status', value: r => { const s = Calc.unitStatus(r); return badge(s, t('us_' + s)); } }
    ],
    extraActions: [{ label: 'quotation', run: r => printQuotation(r) }],
    sort: (a, b) => Calc.unitCode(a).localeCompare(Calc.unitCode(b), 'en', { numeric: true }),
    refs: [{ coll: 'bookings', field: 'unitId' }]
  },

  bookings: {
    fields: [
      {
        name: 'unitId', label: 'unit', type: 'select', required: true,
        // Only units that are not booked yet (plus the one being edited)
        options: current => Store.list('units')
          .filter(u => !Calc.unitBooking(u) || u.id === current.unitId)
          .sort(ENTITIES.units.sort)
          .map(u => {
            const price = Calc.unitPrice(u);
            return { value: u.id, label: Calc.unitLabel(u.id) + (u.bhk ? ` (${u.bhk} BHK)` : '') + (price ? ` — ${money(price)}` : '') };
          }),
        onChange: (form, value) => {
          const u = Store.get('units', value);
          const total = form.elements.totalAmount;
          if (u && !total.value && Calc.unitPrice(u)) total.value = Calc.unitPrice(u);
        }
      },
      { name: 'customerName', label: 'customerName', required: true },
      { name: 'phone', label: 'phone', type: 'tel' },
      { name: 'address', label: 'address', type: 'textarea' },
      { name: 'bookingDate', label: 'bookingDate', type: 'date', required: true, default: today },
      { name: 'totalAmount', label: 'totalAmount', type: 'number', required: true },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'customer', value: r => `<strong>${esc(r.customerName)}</strong>` },
      { label: 'phone', value: r => r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '' },
      { label: 'unit', value: r => esc(Calc.unitLabel(r.unitId)) },
      { label: 'bookingDate', value: r => fmtDate(r.bookingDate) },
      { label: 'totalAmount', value: r => money(r.totalAmount), num: true },
      { label: 'paid', value: r => money(Calc.bookingPaid(r)), num: true },
      { label: 'due', value: r => { const d = Calc.bookingDue(r); return `<span class="${d > 0 ? 'neg' : 'pos'}">${money(d)}</span>`; }, num: true }
    ],
    extraActions: [{ label: 'whatsapp', run: r => sendReminder(r), show: r => r.phone && Calc.bookingDue(r) > 0 }],
    refs: [{ coll: 'payments', field: 'bookingId' }]
  },

  payments: {
    fields: [
      {
        name: 'bookingId', label: 'booking', type: 'select', required: true,
        options: () => Store.list('bookings').map(b => ({
          value: b.id, label: `${Calc.bookingLabel(b.id)} — ${t('due')}: ${money(Calc.bookingDue(b))}`
        }))
      },
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'amount', label: 'amount', type: 'number', required: true },
      { name: 'mode', label: 'mode', type: 'select', options: opts('pm_', ['cash', 'cheque', 'bank', 'upi']), default: 'cash' },
      { name: 'reference', label: 'reference' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'customer', value: r => { const b = Store.get('bookings', r.bookingId); return b ? `<strong>${esc(b.customerName)}</strong>` : ''; } },
      { label: 'unit', value: r => { const b = Store.get('bookings', r.bookingId); return b ? esc(Calc.unitLabel(b.unitId)) : ''; } },
      { label: 'amount', value: r => money(r.amount), num: true },
      { label: 'mode', value: r => t('pm_' + r.mode) },
      { label: 'reference', value: r => esc(r.reference) }
    ],
    extraActions: [{ label: 'receipt', run: r => printReceipt(r) }],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  },

  materials: {
    fields: [
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true },
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'item', label: 'item', required: true, list: ['સિમેન્ટ / Cement', 'સળિયા / Steel', 'રેતી / Sand', 'કપચી / Aggregate', 'ઈંટ / Bricks', 'બ્લોક / Blocks', 'ટાઇલ્સ / Tiles', 'કલર / Paint', 'પાઇપ / Pipes', 'વાયર / Wire'] },
      { name: 'qty', label: 'qty', type: 'number', required: true },
      { name: 'uom', label: 'uom', type: 'select', options: opts('uom_', ['bag', 'kg', 'ton', 'brass', 'cft', 'nos', 'litre', 'truck']), default: 'bag' },
      { name: 'rate', label: 'rate', type: 'number', required: true },
      { name: 'supplier', label: 'supplier' },
      { name: 'paid', label: 'paidToSupplier', type: 'number' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'project', value: r => esc(Calc.projectName(r.projectId)) },
      { label: 'item', value: r => `<strong>${esc(r.item)}</strong>` },
      { label: 'qty', value: r => `${esc(r.qty)} ${t('uom_' + r.uom)}`, num: true },
      { label: 'rate', value: r => money(r.rate), num: true },
      { label: 'total', value: r => money(Calc.materialCost(r)), num: true },
      { label: 'supplier', value: r => esc(r.supplier) },
      { label: 'due', value: r => { const d = Calc.materialDue(r); return `<span class="${d > 0 ? 'neg' : 'pos'}">${money(d)}</span>`; }, num: true }
    ],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  },

  expenses: {
    fields: [
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true },
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'category', label: 'category', type: 'select', options: opts('ec_', ['transport', 'electricity', 'govt', 'office', 'machinery', 'other']), default: 'other' },
      { name: 'amount', label: 'amount', type: 'number', required: true },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'project', value: r => esc(Calc.projectName(r.projectId)) },
      { label: 'category', value: r => t('ec_' + r.category) },
      { label: 'amount', value: r => money(r.amount), num: true },
      { label: 'notes', value: r => esc(r.notes) }
    ],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  },

  workers: {
    fields: [
      { name: 'name', label: 'name', required: true },
      { name: 'phone', label: 'phone', type: 'tel' },
      { name: 'kind', label: 'kind', type: 'select', options: opts('wk_', ['daily', 'contractor']), default: 'daily' },
      { name: 'workType', label: 'workType' },
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true },
      { name: 'wage', label: 'wage', type: 'number', showIf: v => v.kind === 'daily' },
      { name: 'contractAmount', label: 'contractAmount', type: 'number', showIf: v => v.kind === 'contractor' }
    ],
    columns: [
      { label: 'name', value: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'kind', value: r => badge(r.kind, t('wk_' + r.kind)) },
      { label: 'workType', value: r => esc(r.workType) },
      { label: 'project', value: r => esc(Calc.projectName(r.projectId)) },
      { label: 'rateOrContract', value: r => r.kind === 'contractor' ? money(r.contractAmount) : money(r.wage) + ' / ' + t('days'), num: true },
      { label: 'days', value: r => r.kind === 'contractor' ? '—' : Calc.workerDays(r), num: true },
      { label: 'earned', value: r => money(Calc.workerEarned(r)), num: true },
      { label: 'paid', value: r => money(Calc.workerPaid(r)), num: true },
      { label: 'due', value: r => { const d = Calc.workerDue(r); return `<span class="${d > 0 ? 'neg' : 'pos'}">${money(d)}</span>`; }, num: true }
    ],
    refs: [
      { coll: 'attendance', field: 'workerId' },
      { coll: 'labourPayments', field: 'workerId' }
    ]
  },

  labourPayments: {
    fields: [
      {
        name: 'workerId', label: 'worker', type: 'select', required: true,
        options: () => Store.list('workers').map(w => ({
          value: w.id, label: `${w.name} (${Calc.projectName(w.projectId)}) — ${t('due')}: ${money(Calc.workerDue(w))}`
        }))
      },
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'amount', label: 'amount', type: 'number', required: true },
      { name: 'mode', label: 'mode', type: 'select', options: opts('pm_', ['cash', 'cheque', 'bank', 'upi']), default: 'cash' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'worker', value: r => { const w = Store.get('workers', r.workerId); return w ? `<strong>${esc(w.name)}</strong>` : ''; } },
      { label: 'project', value: r => { const w = Store.get('workers', r.workerId); return w ? esc(Calc.projectName(w.projectId)) : ''; } },
      { label: 'amount', value: r => money(r.amount), num: true },
      { label: 'mode', value: r => t('pm_' + r.mode) },
      { label: 'notes', value: r => esc(r.notes) }
    ],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  }
};
