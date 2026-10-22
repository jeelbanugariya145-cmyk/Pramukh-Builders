// Main application: navigation, lists, forms, dashboard, attendance, settings
const $ = (sel, el = document) => el.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const PAGES = [
  { id: 'dashboard', icon: '📊', tabs: null },
  { id: 'info', icon: '🏙️', tabs: null },
  { id: 'projects', icon: '🏢', tabs: ['chart', 'units', 'projects'] },
  { id: 'sales', icon: '🤝', tabs: ['bookings', 'payments'] },
  { id: 'materials', icon: '🧱', tabs: ['materials', 'expenses'] },
  { id: 'labour', icon: '👷', tabs: ['workers', 'attendance', 'labourPayments'] },
  { id: 'settings', icon: '⚙️', tabs: null }
];

const state = { page: 'dashboard', tab: {}, search: {} };

function prefGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function prefSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// ---------- Layout ----------
function render() {
  document.documentElement.lang = LANG;
  document.title = t('appName');
  $('#developers-label').textContent = t('developers');
  $('#lang-toggle').textContent = LANG === 'gu' ? 'English' : 'ગુજરાતી';
  $('#demo-note').textContent = t('demoNote');

  $('#nav').innerHTML = PAGES.map(p => `
    <button class="nav-item ${p.id === state.page ? 'active' : ''}" data-page="${p.id}">
      <span class="nav-icon">${p.icon}</span><span>${t('nav_' + p.id)}</span>
    </button>`).join('');

  const page = PAGES.find(p => p.id === state.page);
  const main = $('#main');
  main.innerHTML = `<h1 class="page-title">${page.icon} ${t('nav_' + page.id)}</h1>`;

  if (page.id === 'dashboard') return renderDashboard(main);
  if (page.id === 'info') return renderInfo(main);
  if (page.id === 'settings') return renderSettings(main);

  const tab = state.tab[page.id] || page.tabs[0];
  const tabs = document.createElement('div');
  tabs.className = 'tabs';
  tabs.innerHTML = page.tabs.map(k =>
    `<button class="tab ${k === tab ? 'active' : ''}" data-tab="${k}">${t('ent_' + k)}</button>`).join('');
  main.appendChild(tabs);

  const body = document.createElement('div');
  main.appendChild(body);
  if (tab === 'attendance') renderAttendance(body);
  else if (tab === 'chart') renderChart(body);
  else renderList(body, tab);
}

// ---------- Generic list ----------
function renderList(container, key) {
  const ent = ENTITIES[key];
  container.innerHTML = `
    <div class="toolbar">
      <input type="search" class="search" placeholder="${t('search')}" value="${esc(state.search[key] || '')}">
      <button class="btn btn-primary" data-add>${t('add')}</button>
    </div>
    <div class="table-wrap"><table class="table"></table></div>`;

  const table = $('table', container);
  const draw = () => {
    const q = (state.search[key] || '').toLowerCase();
    let rows = Store.list(key).slice();
    if (ent.sort) rows.sort(ent.sort);
    const cells = rows.map(r => ({ r, html: ent.columns.map(c => c.value(r)) }));
    const visible = q
      ? cells.filter(c => c.html.join(' ').replace(/<[^>]+>/g, '').toLowerCase().includes(q))
      : cells;

    if (!visible.length) {
      table.innerHTML = `<tbody><tr><td class="empty">${t('noData')}</td></tr></tbody>`;
      return;
    }
    table.innerHTML = `
      <thead><tr>${ent.columns.map(c => `<th class="${c.num ? 'num' : ''}">${t(c.label)}</th>`).join('')}<th>${t('actions')}</th></tr></thead>
      <tbody>${visible.map(({ r, html }) => `
        <tr>
          ${html.map((h, i) => `<td class="${ent.columns[i].num ? 'num' : ''}" data-label="${esc(t(ent.columns[i].label))}">${h}</td>`).join('')}
          <td class="row-actions">
            ${(ent.extraActions || []).map((a, i) => !a.show || a.show(r)
              ? `<button class="btn btn-small btn-accent" data-extra="${i}" data-id="${r.id}">${t(a.label)}</button>` : '').join('')}
            <button class="btn btn-small" data-edit="${r.id}">${t('edit')}</button>
            <button class="btn btn-small btn-danger" data-del="${r.id}">${t('delete')}</button>
          </td>
        </tr>`).join('')}
      </tbody>`;
  };
  draw();

  $('.search', container).addEventListener('input', e => { state.search[key] = e.target.value; draw(); });
  $('[data-add]', container).addEventListener('click', () => openForm(key));
  table.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) openForm(key, Store.get(key, b.dataset.edit));
    if (b.dataset.del) deleteRecord(key, b.dataset.del);
    if (b.dataset.extra) ent.extraActions[b.dataset.extra].run(Store.get(key, b.dataset.id));
  });
}

function deleteRecord(key, id) {
  const linked = (ENTITIES[key].refs || [])
    .filter(ref => Store.list(ref.coll).some(x => x[ref.field] === id))
    .map(ref => t('ent_' + ref.coll));
  if (linked.length) {
    alert(t('cantDelete') + '\n• ' + linked.join('\n• '));
    return;
  }
  if (confirm(t('confirmDelete'))) {
    Store.remove(key, id);
    render();
  }
}

// ---------- Form (modal) ----------
function openForm(key, record, defaults) {
  const ent = ENTITIES[key];
  const current = record || defaults || {};
  const dlg = $('#modal');

  const fieldHtml = f => {
    const v = current[f.name] ?? (typeof f.default === 'function' ? f.default() : f.default) ?? '';
    const req = f.required ? 'required' : '';
    let input;
    if (f.type === 'select') {
      const options = f.options(current);
      input = `<select name="${f.name}" ${req}>
        <option value="">${t('select')}</option>
        ${options.map(o => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea name="${f.name}" rows="2">${esc(v)}</textarea>`;
    } else {
      const extra = f.type === 'number' ? 'step="any" min="0" inputmode="decimal"' : '';
      const list = f.list ? `list="dl-${f.name}"` : '';
      input = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${req} ${extra} ${list}>`;
      if (f.list) input += `<datalist id="dl-${f.name}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    }
    return `<label class="field" data-field="${f.name}">
      <span>${t(f.label)}${f.required ? ' <b class="req">*</b>' : ''}</span>${input}</label>`;
  };

  dlg.innerHTML = `
    <form class="modal-card" method="dialog" novalidate>
      <h2>${record ? t('edit') : t('add').replace('+ ', '')}: ${t('ent_' + key)}</h2>
      <div class="form-grid">${ent.fields.map(fieldHtml).join('')}</div>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('save')}</button>
      </div>
    </form>`;

  const form = $('form', dlg);
  const values = () => Object.fromEntries(new FormData(form).entries());
  const applyVisibility = () => {
    const v = values();
    ent.fields.filter(f => f.showIf).forEach(f => {
      $(`[data-field="${f.name}"]`, form).hidden = !f.showIf(v);
    });
  };
  applyVisibility();
  if (!record && defaults) {
    ent.fields.filter(f => f.onChange && defaults[f.name]).forEach(f => f.onChange(form, defaults[f.name]));
  }

  form.addEventListener('change', e => {
    const f = ent.fields.find(x => x.name === e.target.name);
    if (f && f.onChange) f.onChange(form, e.target.value);
    applyVisibility();
  });
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('.error').forEach(x => x.remove());
    ent.fields.forEach(f => {
      const el = form.elements[f.name];
      const hidden = $(`[data-field="${f.name}"]`, form).hidden;
      if (f.required && !hidden && !el.value.trim()) {
        ok = false;
        el.insertAdjacentHTML('afterend', `<small class="error">${t('required')}</small>`);
      }
    });
    if (!ok) return;

    const data = {};
    ent.fields.forEach(f => {
      const raw = form.elements[f.name].value.trim();
      data[f.name] = f.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
    });
    if (record) Store.update(key, record.id, data);
    else Store.add(key, data);
    dlg.close();
    render();
  });

  dlg.showModal();
  const first = form.querySelector('input, select, textarea');
  if (first) first.focus();
}

// ---------- Dashboard ----------
function heroBanner() {
  return `
    <section class="hero">
      <img class="hero-img" src="assets/banner.jpg" alt="">
      <div class="hero-text">
        <div class="hero-tagline">${BRAND.taglineGu}</div>
        <div class="hero-title">Pramukh <span>VIEW</span></div>
        <div class="hero-sub">${t('i_hero')}</div>
        <div class="hero-groups">${BRAND.groups}</div>
      </div>
    </section>`;
}

function renderDashboard(main) {
  main.innerHTML = heroBanner();
  const projects = Store.list('projects');
  const s = Calc.projectSummary(null);

  if (!projects.length) {
    main.insertAdjacentHTML('beforeend', `
      <div class="card empty-state">
        <h2>${t('setupPV')}</h2>
        <p>${t('setupDesc')}</p>
        <div class="row-gap">
          <button class="btn btn-primary" data-setup>${t('setupPV')}</button>
          <button class="btn" data-sample>${t('loadSample')}</button>
        </div>
      </div>`);
    $('[data-setup]', main).addEventListener('click', () => { setupPramukhView(); alert(t('setupDone')); render(); });
    $('[data-sample]', main).addEventListener('click', () => { loadSampleData(); render(); });
    return;
  }

  const stat = (label, value, cls = '') =>
    `<div class="stat ${cls}"><div class="stat-label">${t(label)}</div><div class="stat-value">${value}</div></div>`;

  const dues = Store.list('bookings')
    .map(b => ({ b, due: Calc.bookingDue(b) }))
    .filter(x => x.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 8);

  main.insertAdjacentHTML('beforeend', `
    <div class="stats">
      ${stat('d_units', `${s.booked} / ${s.units}`)}
      ${stat('d_sales', money(s.sales))}
      ${stat('d_received', money(s.received), 'good')}
      ${stat('d_custDue', money(s.custDue), 'warn')}
      ${stat('d_expense', money(s.expense))}
      ${stat('d_supplierDue', money(s.supplierDue), 'warn')}
      ${stat('d_labourDue', money(s.labourDue), 'warn')}
      ${stat('profit', money(s.profit), s.profit >= 0 ? 'good' : 'warn')}
    </div>

    <section class="card">
      <h2>${t('d_projectWise')}</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th>${t('project')}</th><th class="num">${t('booked')}</th><th class="num">${t('available')}</th>
          <th class="num">${t('sales')}</th><th class="num">${t('received')}</th><th class="num">${t('due')}</th>
          <th class="num">${t('ent_materials')}</th><th class="num">${t('ent_workers')}</th><th class="num">${t('ent_expenses')}</th>
          <th class="num">${t('profit')}</th>
        </tr></thead>
        <tbody>${projects.map(p => {
          const ps = Calc.projectSummary(p.id);
          const cell = (label, v, cls = '') => `<td class="num ${cls}" data-label="${esc(t(label))}">${v}</td>`;
          return `<tr>
            <td data-label="${esc(t('project'))}"><strong>${esc(p.name)}</strong></td>
            ${cell('booked', ps.booked)}${cell('available', ps.available)}
            ${cell('sales', money(ps.sales))}${cell('received', money(ps.received))}${cell('due', money(ps.custDue))}
            ${cell('ent_materials', money(ps.material))}${cell('ent_workers', money(ps.labour))}${cell('ent_expenses', money(ps.other))}
            ${cell('profit', money(ps.profit), ps.profit >= 0 ? 'pos' : 'neg')}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="hint">${t('d_profitNote')}</p>
    </section>

    <section class="card">
      <h2>${t('d_topDues')}</h2>
      ${dues.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>${t('customer')}</th><th>${t('phone')}</th><th>${t('unit')}</th><th class="num">${t('due')}</th><th></th></tr></thead>
        <tbody>${dues.map(({ b, due }) => `<tr>
          <td data-label="${esc(t('customer'))}"><strong>${esc(b.customerName)}</strong></td>
          <td data-label="${esc(t('phone'))}">${b.phone ? `<a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>` : ''}</td>
          <td data-label="${esc(t('unit'))}">${esc(Calc.unitLabel(b.unitId))}</td>
          <td class="num neg" data-label="${esc(t('due'))}">${money(due)}</td>
          <td class="row-actions">${b.phone ? `<button class="btn btn-small btn-accent" data-remind="${b.id}">${t('whatsapp')}</button>` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : `<p class="hint">${t('noData')}</p>`}
    </section>`);

  main.querySelectorAll('[data-remind]').forEach(btn =>
    btn.addEventListener('click', () => sendReminder(Store.get('bookings', btn.dataset.remind))));
}

// ---------- Flat chart ----------
function renderChart(container) {
  const projects = Store.list('projects').filter(p => Store.list('units').some(u => u.projectId === p.id));
  if (!projects.length) {
    container.innerHTML = `<div class="card"><p>${t('ch_noUnits')}</p></div>`;
    return;
  }
  const pid = projects.some(p => p.id === state.chartProject) ? state.chartProject : projects[0].id;
  const units = Store.list('units').filter(u => u.projectId === pid);
  const s = Calc.projectSummary(pid);

  const wings = [...new Set(units.map(u => u.wing || ''))].sort();
  const floorNum = u => Number(u.floor) || 0;

  const wingHtml = wing => {
    const wu = units.filter(u => (u.wing || '') === wing);
    const floors = [...new Set(wu.map(floorNum))].sort((a, b) => b - a);
    const bhks = [...new Set(wu.map(u => u.bhk).filter(Boolean))];
    return `
      <div class="wing">
        <div class="wing-head">
          <h3>${wing ? `${t('wing')} ${esc(wing)}` : t('units')}</h3>
          <span class="hint">${bhks.map(b => b + ' BHK').join(', ')} · ${wu.length} ${t('units')}</span>
        </div>
        <div class="floors">
          ${floors.map(f => `
            <div class="floor-row">
              <div class="floor-label">${f}</div>
              ${wu.filter(u => floorNum(u) === f)
                .sort((a, b) => String(a.number).localeCompare(String(b.number), 'en', { numeric: true }))
                .map(u => {
                  const st = Calc.unitStatus(u);
                  const b = Calc.unitBooking(u);
                  return `<button class="flat flat-${st}" data-unit="${u.id}" title="${esc(Calc.unitLabel(u.id))} · ${t('us_' + st)}${b ? ' · ' + esc(b.customerName) : ''}">
                    <span class="flat-no">${esc(u.number)}</span>
                    <span class="flat-who">${b ? esc(b.customerName) : (u.bhk ? u.bhk + ' BHK' : '')}</span>
                  </button>`;
                }).join('')}
            </div>`).join('')}
        </div>
      </div>`;
  };

  container.innerHTML = `
    <div class="toolbar">
      <label class="inline">${t('project')}
        <select id="chart-project">
          ${projects.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
      <span class="legend"><i class="dot dot-available"></i>${t('available')} ${s.available}</span>
      <span class="legend"><i class="dot dot-booked"></i>${t('booked')} ${s.booked}</span>
    </div>
    <p class="hint">${t('ch_help')}</p>
    <div class="wings">${wings.map(wingHtml).join('')}</div>`;

  $('#chart-project', container).addEventListener('change', e => { state.chartProject = e.target.value; render(); });
  container.querySelectorAll('[data-unit]').forEach(btn => btn.addEventListener('click', () => {
    const u = Store.get('units', btn.dataset.unit);
    const b = Calc.unitBooking(u);
    if (!b) return openForm('bookings', null, { unitId: u.id });
    state.page = 'sales';
    state.tab.sales = 'bookings';
    state.search.bookings = b.customerName;
    render();
  }));
}

// ---------- Project info (from brochure) ----------
function renderInfo(main) {
  const total = BRAND.wings.reduce((n, w) => n + w.floors * w.perFloor, 0);
  const rooms = bhk => `
    <table class="table rooms">
      <tbody>${BRAND.rooms[bhk].map(r => `<tr><td>${pick(r[0], r[1])}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
    </table>`;

  main.innerHTML = `
    ${heroBanner()}
    <div class="stats">
      <div class="stat"><div class="stat-label">${t('i_flats')}</div><div class="stat-value">${total}</div></div>
      <div class="stat"><div class="stat-label">${t('i_years')}</div><div class="stat-value">${BRAND.years}</div></div>
      <div class="stat"><div class="stat-label">${t('i_customers')}</div><div class="stat-value">${BRAND.customers}</div></div>
      <div class="stat"><div class="stat-label">${t('floor')}</div><div class="stat-value">G + 14</div></div>
    </div>

    <section class="card contact-card">
      <div>
        <div class="hint">${t('i_site')}</div>
        <p class="address">${pick(BRAND.address, BRAND.addressGu)}</p>
      </div>
      <div class="row-gap">
        <a class="btn btn-primary" href="tel:+91${BRAND.phone}">📞 ${t('i_call')} ${BRAND.phoneDisplay}</a>
        <a class="btn btn-accent" href="https://wa.me/91${BRAND.phone}" target="_blank" rel="noopener">💬 WhatsApp</a>
        <a class="btn" href="${BRAND.mapUrl}" target="_blank" rel="noopener">📍 ${t('i_map')}</a>
      </div>
    </section>

    <section class="card">
      <h2 class="section-title"><span>${t('i_plans')}</span></h2>
      <div class="plans">
        <figure><img src="assets/plan-4bhk.jpg" alt="4 BHK plan" loading="lazy"><figcaption>${t('i_wingA')}</figcaption>${rooms(4)}</figure>
        <figure><img src="assets/plan-3bhk.jpg" alt="3 BHK plan" loading="lazy"><figcaption>${t('i_wingB')}</figcaption>${rooms(3)}</figure>
      </div>
    </section>

    <section class="card">
      <h2 class="section-title"><span>${t('i_amenities')}</span></h2>
      <div class="amenities">
        ${BRAND.amenities.map(a => `<div class="amenity"><span class="amenity-icon">${a[0]}</span><span>${pick(a[1], a[2])}</span></div>`).join('')}
      </div>
      <div class="gallery">
        <img src="assets/club.jpg" alt="" loading="lazy">
        <img src="assets/day-view.jpg" alt="" loading="lazy">
        <img src="assets/aerial.jpg" alt="" loading="lazy">
      </div>
    </section>

    <section class="card">
      <h2 class="section-title"><span>${t('i_specs')}</span></h2>
      <div class="specs">
        ${BRAND.specs.map(sp => `<div class="spec"><strong>${pick(sp[0], sp[1])}</strong><span>${pick(sp[2], sp[3])}</span></div>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="section-title"><span>${t('i_location')}</span></h2>
      <div class="location">
        <img src="assets/location-map.jpg" alt="Location map">
        <div>
          <h3>${t('i_nearby')}</h3>
          <ul class="chips">${BRAND.landmarks.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
          <a class="btn" href="${BRAND.mapUrl}" target="_blank" rel="noopener">📍 ${t('i_map')}</a>
        </div>
      </div>
    </section>

    <section class="card about">
      <h2 class="section-title"><span>${t('i_about')}</span></h2>
      <div class="group-logos">
        <img src="assets/logo-pramukh-builders.jpg" alt="Pramukh Builders">
        <span class="divider"></span>
        <img src="assets/logo-shreeji-builders.jpg" alt="Shreeji Builders">
      </div>
      <p>${t('i_aboutText')}</p>
      <h3>${t('i_past')}</h3>
      <ul class="chips">${BRAND.pastProjects.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    </section>`;
}

// ---------- Attendance ----------
function renderAttendance(container) {
  const projects = Store.list('projects');
  const date = state.attDate || today();
  const pid = state.attProject || '';
  const workers = Store.list('workers').filter(w => w.kind === 'daily' && (!pid || w.projectId === pid));
  const statusOf = w => {
    const a = Store.list('attendance').find(x => x.workerId === w.id && x.date === date);
    return a ? a.status : 'present';
  };

  container.innerHTML = `
    <p class="hint">${t('att_help')}</p>
    <div class="toolbar">
      <label class="inline">${t('att_date')} <input type="date" id="att-date" value="${date}"></label>
      <label class="inline">${t('att_project')}
        <select id="att-project">
          <option value="">${t('att_all')}</option>
          ${projects.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
    </div>
    ${workers.length ? `
      <div class="att-list">
        ${workers.map(w => `
          <div class="att-row">
            <div><strong>${esc(w.name)}</strong><div class="hint">${esc(w.workType)} · ${esc(Calc.projectName(w.projectId))}</div></div>
            <div class="seg" role="radiogroup">
              ${['present', 'half', 'absent'].map(s => `
                <label class="seg-opt seg-${s}">
                  <input type="radio" name="att-${w.id}" value="${s}" ${statusOf(w) === s ? 'checked' : ''}>
                  <span>${t('att_' + s)}</span>
                </label>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="toolbar"><button class="btn btn-primary" id="att-save">${t('att_save')}</button><span id="att-msg" class="pos"></span></div>
    ` : `<div class="card"><p>${t('att_noWorkers')}</p></div>`}`;

  $('#att-date', container).addEventListener('change', e => { state.attDate = e.target.value; render(); });
  $('#att-project', container).addEventListener('change', e => { state.attProject = e.target.value; render(); });
  const saveBtn = $('#att-save', container);
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const ids = new Set(workers.map(w => w.id));
    Store.data.attendance = Store.list('attendance').filter(a => !(a.date === date && ids.has(a.workerId)));
    workers.forEach(w => {
      const checked = container.querySelector(`input[name="att-${w.id}"]:checked`);
      Store.data.attendance.push({ id: Store.newId(), workerId: w.id, date, status: checked ? checked.value : 'present' });
    });
    Store.save();
    $('#att-msg', container).textContent = t('att_saved');
  });
}

// ---------- Settings ----------
function renderSettings(main) {
  main.insertAdjacentHTML('beforeend', `
    <section class="card">
      <h2>${t('s_language')}</h2>
      <div class="row-gap">
        <button class="btn ${LANG === 'gu' ? 'btn-primary' : ''}" data-lang="gu">ગુજરાતી</button>
        <button class="btn ${LANG === 'en' ? 'btn-primary' : ''}" data-lang="en">English</button>
      </div>
    </section>
    <section class="card">
      <h2>${t('s_backup')}</h2>
      <p class="hint">${t('s_backupDesc')}</p>
      <button class="btn btn-primary" id="backup">${t('s_download')}</button>
    </section>
    <section class="card">
      <h2>${t('s_restore')}</h2>
      <p class="hint">${t('s_restoreDesc')}</p>
      <input type="file" id="restore" accept="application/json,.json">
    </section>
    <section class="card">
      <h2>${t('setupPV')}</h2>
      <p class="hint">${t('setupDesc')}</p>
      <button class="btn btn-primary" id="setup">${t('setupPV')}</button>
    </section>
    <section class="card">
      <h2>${t('s_sample')}</h2>
      <p class="hint">${t('s_sampleDesc')}</p>
      <button class="btn" id="sample">${t('loadSample')}</button>
    </section>
    <section class="card">
      <h2>${t('s_clear')}</h2>
      <p class="hint">${t('s_clearDesc')}</p>
      <button class="btn btn-danger" id="clear">${t('s_clear')}</button>
    </section>`);

  main.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  $('#backup', main).addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pramukh-builders-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#restore', main).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(text => {
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.projects)) throw new Error('bad');
      Store.replaceAll(data);
      alert(t('s_restored'));
      render();
    }).catch(() => alert(t('s_badFile')));
  });

  $('#setup', main).addEventListener('click', () => {
    alert(setupPramukhView() ? t('setupDone') : t('setupExists'));
    render();
  });

  $('#sample', main).addEventListener('click', () => {
    if (confirm(t('s_confirmSample'))) { loadSampleData(); state.page = 'dashboard'; render(); }
  });

  $('#clear', main).addEventListener('click', () => {
    if (confirm(t('s_confirmClear'))) { Store.replaceAll({}); render(); }
  });
}

// ---------- Printed documents (receipt, quotation) ----------
function docHeader(title) {
  return `
    <div class="doc-head">
      <img class="doc-logo-view" src="assets/logo-pramukh-view.jpg" alt="Pramukh View">
      <div class="doc-groups">
        <img src="assets/logo-pramukh-builders.jpg" alt="Pramukh Builders">
        <span class="divider"></span>
        <img src="assets/logo-shreeji-builders.jpg" alt="Shreeji Builders">
      </div>
    </div>
    <h2 class="doc-title">${title}</h2>`;
}

function docFooter() {
  return `
    <div class="doc-foot">
      <div>${t('i_site')}: ${esc(pick(BRAND.address, BRAND.addressGu))}</div>
      <div>📞 ${BRAND.phoneDisplay}</div>
    </div>`;
}

function printDoc(html) {
  const area = $('#print-area');
  area.innerHTML = `<div class="doc">${html}</div>`;
  // Wait for the logos to load before opening the print dialog
  const imgs = [...area.querySelectorAll('img')];
  Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })))
    .then(() => window.print());
}

function printReceipt(p) {
  const b = Store.get('bookings', p.bookingId);
  if (!b) return;
  const no = Store.list('payments').slice()
    .sort((x, y) => (x.date || '').localeCompare(y.date || ''))
    .findIndex(x => x.id === p.id) + 1;

  printDoc(`
    ${docHeader(t('r_title'))}
    <div class="doc-meta">
      <span>${t('r_no')}: <strong>${no}</strong></span>
      <span>${t('date')}: <strong>${fmtDate(p.date)}</strong></span>
    </div>
    <table class="doc-table">
      <tr><th>${t('r_receivedFrom')}</th><td>${esc(b.customerName)}</td></tr>
      <tr><th>${t('phone')}</th><td>${esc(b.phone)}</td></tr>
      <tr><th>${t('r_towards')}</th><td>${esc(Calc.unitLabel(b.unitId))}</td></tr>
      <tr><th>${t('amount')}</th><td><strong>${money(p.amount)}</strong></td></tr>
      <tr><th>${t('mode')}</th><td>${t('pm_' + p.mode)} ${p.reference ? '(' + esc(p.reference) + ')' : ''}</td></tr>
      <tr><th>${t('totalAmount')}</th><td>${money(b.totalAmount)}</td></tr>
      <tr><th>${t('paid')}</th><td>${money(Calc.bookingPaid(b))}</td></tr>
      <tr><th>${t('r_balance')}</th><td>${money(Calc.bookingDue(b))}</td></tr>
    </table>
    <div class="doc-sign">${t('r_signature')}<br><small>${BRAND.groups}</small></div>
    ${docFooter()}`);
}

function printQuotation(u) {
  const price = Calc.unitPrice(u);
  const rooms = BRAND.rooms[u.bhk];
  printDoc(`
    ${docHeader(t('q_title'))}
    <div class="doc-meta">
      <span>${t('date')}: <strong>${fmtDate(today())}</strong></span>
    </div>
    <h3>${t('q_details')}</h3>
    <table class="doc-table">
      <tr><th>${t('project')}</th><td>${esc(Calc.projectName(u.projectId))}</td></tr>
      <tr><th>${t('unitNo')}</th><td><strong>${esc(Calc.unitCode(u))}</strong></td></tr>
      ${u.bhk ? `<tr><th>${t('type')}</th><td>${esc(u.bhk)} BHK</td></tr>` : ''}
      <tr><th>${t('floor')}</th><td>${esc(u.floor)}</td></tr>
      ${u.area ? `<tr><th>${t('q_carpet')}</th><td>${esc(u.area)} sq ft</td></tr>` : ''}
      ${u.parking ? `<tr><th>${t('parking')}</th><td>${esc(u.parking)}</td></tr>` : ''}
      <tr><th>${t('price')}</th><td><strong>${price ? money(price) : t('q_priceAsk')}</strong></td></tr>
    </table>
    ${rooms ? `<h3>${t('q_rooms')}</h3>
      <div class="doc-rooms">${[rooms.slice(0, Math.ceil(rooms.length / 2)), rooms.slice(Math.ceil(rooms.length / 2))]
        .map(half => `<table class="doc-table">${half.map(r => `<tr><th>${pick(r[0], r[1])}</th><td>${r[2]}</td></tr>`).join('')}</table>`).join('')}</div>` : ''}
    <h3>${t('i_amenities')}</h3>
    <ul class="doc-list">${BRAND.amenities.map(a => `<li>${pick(a[1], a[2])}</li>`).join('')}</ul>
    <h3>${t('i_specs')}</h3>
    <ul class="doc-list doc-list-wide">${BRAND.specs.map(sp => `<li><strong>${pick(sp[0], sp[1])}:</strong> ${pick(sp[2], sp[3])}</li>`).join('')}</ul>
    <p class="doc-note">${t('q_note')}</p>
    ${docFooter()}`);
}

// ---------- WhatsApp payment reminder ----------
function sendReminder(b) {
  if (!b || !b.phone) return;
  const digits = String(b.phone).replace(/\D/g, '');
  const phone = digits.length === 10 ? '91' + digits : digits;
  const text = LANG === 'gu'
    ? `નમસ્તે ${b.customerName},\n\n${Calc.unitLabel(b.unitId)} ફ્લેટ માટે\nકુલ રકમ: ${money(b.totalAmount)}\nચૂકવેલ: ${money(Calc.bookingPaid(b))}\nબાકી: ${money(Calc.bookingDue(b))}\n\nકૃપા કરીને બાકી હપ્તો જમા કરાવશો.\n\n${BRAND.groups}\n📞 ${BRAND.phoneDisplay}`
    : `Hello ${b.customerName},\n\nFor flat ${Calc.unitLabel(b.unitId)}\nTotal: ${money(b.totalAmount)}\nPaid: ${money(Calc.bookingPaid(b))}\nDue: ${money(Calc.bookingDue(b))}\n\nKindly pay the pending instalment.\n\n${BRAND.groups}\n📞 ${BRAND.phoneDisplay}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

// ---------- Language ----------
function setLang(lang) {
  LANG = lang;
  prefSet('pramukh-lang', lang);
  render();
}

// ---------- Start ----------
document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  const saved = prefGet('pramukh-lang');
  if (saved === 'gu' || saved === 'en') LANG = saved;

  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (!b) return;
    state.page = b.dataset.page;
    render();
    window.scrollTo(0, 0);
  });
  $('#main').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.tab[state.page] = b.dataset.tab;
    render();
  });
  $('#lang-toggle').addEventListener('click', () => setLang(LANG === 'gu' ? 'en' : 'gu'));
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });

  render();
});
