// Definition of every record type: form fields, table columns, who may edit
const opts = (prefix, keys) => () => keys.map(k => ({ value: k, label: t(prefix + k) }));

const projectOptions = () =>
  Store.list('projects').map(p => ({ value: p.id, label: p.name }));

const badge = (cls, text) => `<span class="badge badge-${cls}">${esc(text)}</span>`;

const dueCell = d => `<span class="${d > 0 ? 'neg' : 'pos'}">${money(d)}</span>`;

const ENTITIES = {
  projects: {
    canEdit: () => isPartner(),
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
      { label: 'units', value: r => Calc.projectSummary(r.id).units, num: true }
    ]
  },

  units: {
    canEdit: () => isPartner(),
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
      { label: 'price', value: r => { const p = Calc.unitPrice(r); return p ? money(p) : '—'; }, num: true },
      { label: 'ent_changes', value: r => { const c = Calc.unitChange(r); return c ? badge('ch-' + c.status, t('cs_' + c.status)) : ''; } }
    ],
    // Flats with an approved plan change stand out in the list
    rowClass: r => { const c = Calc.unitChange(r); return c && (c.status === 'approved' || c.status === 'done') ? 'row-changed' : ''; },
    extraActions: [{ label: 'quotation', run: r => printQuotation(r) }],
    sort: (a, b) => Calc.unitCode(a).localeCompare(Calc.unitCode(b), 'en', { numeric: true })
  },

  bookings: {
    canEdit: () => can('flats'),
    fields: [
      {
        name: 'unitId', label: 'unit', type: 'select', required: true,
        // Only flats that are not booked yet (plus the one being edited)
        options: current => Store.list('units')
          .filter(u => !Calc.unitBooking(u) || u.id === current.unitId)
          .sort(ENTITIES.units.sort)
          .map(u => ({ value: u.id, label: Calc.unitLabel(u.id) + (u.bhk ? ` (${u.bhk} BHK)` : '') }))
      },
      { name: 'customerName', label: 'customerName', required: true },
      { name: 'phone', label: 'loginMobile', type: 'tel', required: true },
      { name: 'pin', label: 'loginPin', type: 'pin', help: 'pinHelp' },
      { name: 'address', label: 'address', type: 'textarea' },
      { name: 'bookingDate', label: 'bookingDate', type: 'date', required: true, default: today },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'customer', value: r => `<strong>${esc(r.customerName)}</strong>` },
      { label: 'phone', value: r => r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '' },
      { label: 'unit', value: r => esc(Calc.unitLabel(r.unitId)) },
      { label: 'bookingDate', value: r => fmtDate(r.bookingDate) },
      { label: 'login', value: r => r.hasLogin ? badge('available', '✓ ' + t('loginOn')) : badge('sold', t('loginOff')) }
    ],
    extraActions: [{ label: 'sendLogin', run: r => shareLogin(r), show: r => r.phone }]
  },

  bills: {
    canEdit: () => can('materials'),
    fields: [
      { name: 'photo', label: 'billPhoto', type: 'photo' },
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true, default: () => (Store.list('projects')[0] || {}).id },
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'billNo', label: 'billNo' },
      { name: 'supplier', label: 'supplier', required: true, list: () => Calc.suppliers() },
      { name: 'itemsText', label: 'billItems', type: 'textarea' },
      { name: 'gst', label: 'gst', type: 'number' },
      { name: 'amount', label: 'billTotal', type: 'number', required: true },
      { name: 'status', label: 'paymentStatus', type: 'select', options: opts('bs_', ['pending', 'paid']), default: 'pending' },
      { name: 'paidDate', label: 'paidDate', type: 'date', showIf: v => v.status === 'paid' },
      { name: 'paidMode', label: 'mode', type: 'select', options: opts('pm_', ['bank', 'cheque', 'upi', 'cash']), showIf: v => v.status === 'paid' },
      { name: 'paidRef', label: 'reference', showIf: v => v.status === 'paid' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'paid', value: r => `<input type="checkbox" class="pay-tick" data-pay="${r.id}" ${r.status === 'paid' ? 'checked' : ''} aria-label="${esc(t('markPaid'))}">` },
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'supplier', value: r => `<strong>${esc(r.supplier)}</strong>${r.itemsText ? `<div class="hint clamp">${esc(r.itemsText)}</div>` : ''}` },
      { label: 'billNo', value: r => esc(r.billNo) },
      { label: 'billTotal', value: r => money(r.amount), num: true },
      { label: 'status', value: r => r.status === 'paid'
        ? badge('available', t('bs_paid') + (r.paidDate ? ' · ' + fmtDate(r.paidDate) : ''))
        : badge('ch-pending', t('bs_pending')) },
      { label: 'billPhoto', value: r => r.photo ? `<a href="${fileUrl(r.photo)}" target="_blank" rel="noopener">📎 ${t('view')}</a>` : '' }
    ],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  },

  expenses: {
    canEdit: () => can('materials'),
    fields: [
      { name: 'projectId', label: 'project', type: 'select', options: projectOptions, required: true, default: () => (Store.list('projects')[0] || {}).id },
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

  visitors: {
    canEdit: () => can('visitors'),
    fields: [
      { name: 'date', label: 'date', type: 'date', required: true, default: today },
      { name: 'name', label: 'name', required: true },
      { name: 'phone', label: 'phone', type: 'tel' },
      { name: 'interest', label: 'interest', type: 'select', options: () => [['3', '3 BHK'], ['4', '4 BHK'], ['both', t('vi_both')]].map(([value, label]) => ({ value, label })) },
      { name: 'source', label: 'source', type: 'select', options: opts('vs_', ['reference', 'hoarding', 'newspaper', 'social', 'website', 'walkin', 'other']) },
      { name: 'budget', label: 'budget', type: 'number' },
      { name: 'attendedBy', label: 'attendedBy', default: () => Store.me.name },
      { name: 'status', label: 'status', type: 'select', options: opts('vt_', ['new', 'interested', 'followup', 'booked', 'notInterested']), default: 'new' },
      { name: 'followUp', label: 'followUp', type: 'date' },
      { name: 'notes', label: 'notes', type: 'textarea' }
    ],
    columns: [
      { label: 'date', value: r => fmtDate(r.date) },
      { label: 'name', value: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'phone', value: r => r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '' },
      { label: 'interest', value: r => r.interest === 'both' ? t('vi_both') : r.interest ? r.interest + ' BHK' : '' },
      { label: 'source', value: r => r.source ? t('vs_' + r.source) : '' },
      { label: 'status', value: r => r.status ? badge('vt-' + r.status, t('vt_' + r.status)) : '' },
      { label: 'followUp', value: r => r.followUp ? `<span class="${r.followUp <= today() && !['booked', 'notInterested'].includes(r.status) ? 'neg' : ''}">${fmtDate(r.followUp)}</span>` : '' },
      { label: 'attendedBy', value: r => esc(r.attendedBy) }
    ],
    sort: (a, b) => (b.date || '').localeCompare(a.date || '')
  },

  users: {
    canEdit: () => isPartner(),
    fields: [
      { name: 'name', label: 'name', required: true },
      { name: 'mobile', label: 'loginMobile', type: 'tel', required: true },
      { name: 'role', label: 'role', type: 'select', options: opts('role_', ['partner', 'staff', 'contractor']), default: 'staff', required: true },
      {
        name: 'perms', label: 'permissions', type: 'checks', help: 'permsHelp',
        // Contractors cannot handle flat owners or approve plan changes
        options: () => ['daily', 'dailyView', 'complaints', 'flats', 'visitors', Store.materials && 'materials']
          .filter(Boolean).map(k => ({ value: k, label: t('perm_' + k) })),
        showIf: v => v.role === 'staff' || v.role === 'contractor'
      },
      {
        name: 'wings', label: 'wings', type: 'checks', help: 'wingsHelp',
        options: () => [{ value: 'A', label: t('wing') + ' A (4 BHK)' }, { value: 'B', label: t('wing') + ' B (3 BHK)' }],
        showIf: v => v.role === 'staff' || v.role === 'contractor'
      },
      {
        name: 'approver', label: 'approver', type: 'select', help: 'approverHelp', default: 'no',
        options: () => [{ value: 'no', label: t('no') }, { value: 'yes', label: t('yes') }],
        showIf: v => v.role === 'partner' || v.role === 'staff'
      },
      { name: 'pin', label: 'loginPin', type: 'pin', help: 'pinHelpUser', requiredOnCreate: true },
      { name: 'active', label: 'active', type: 'select', options: () => [{ value: 'yes', label: t('yes') }, { value: 'no', label: t('no') }], default: 'yes' }
    ],
    columns: [
      { label: 'name', value: r => `<strong>${esc(r.name)}</strong>` },
      { label: 'loginMobile', value: r => esc(r.mobile) },
      { label: 'role', value: r => badge('role-' + r.role, t('role_' + r.role)) },
      { label: 'wings', value: r => r.role === 'partner' ? t('wingsAll') : (r.wings || []).map(w => t('wing') + ' ' + w).join(', ') },
      { label: 'approver', value: r => r.approver === 'yes' || (r.perms || []).includes('approvals') ? badge('available', '✓ ' + t('approverShort')) : '' },
      { label: 'permissions', value: r => r.role === 'partner' ? t('perm_all')
        : [r.role === 'contractor' && t('perm_approvedChanges'), ...(r.perms || []).filter(p => p !== 'approvals' && !(r.role === 'contractor' && p === 'flats')).map(p => t('perm_' + p))].filter(Boolean).join(', ') },
      { label: 'active', value: r => r.active === 'no' ? badge('sold', t('no')) : badge('available', t('yes')) }
    ]
  }
};
