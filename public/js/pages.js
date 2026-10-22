// Pages: dashboard, flat chart, project info, settings, printed quotation

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

  if (!projects.length) {
    main.insertAdjacentHTML('beforeend', isPartner() ? `
      <div class="card empty-state">
        <h2>${t('setupPV')}</h2>
        <p>${t('setupDesc')}</p>
        <div class="row-gap">
          <button class="btn btn-primary" data-setup>${t('setupPV')}</button>
          <button class="btn" data-demo>${t('loadSample')}</button>
        </div>
      </div>` : `<div class="card"><p>${t('noData')}</p></div>`);
    const setup = $('[data-setup]', main);
    if (setup) setup.addEventListener('click', () => adminAction('/admin/setup-pv', t('setupDone')));
    const demo = $('[data-demo]', main);
    if (demo) demo.addEventListener('click', () => adminAction('/admin/demo', t('demoLoaded')));
    return;
  }

  const s = Calc.projectSummary(null);
  const stat = (label, value, cls = '', go = '') =>
    `<button class="stat ${cls}" ${go ? `data-go="${go}"` : 'disabled'}><span class="stat-label">${t(label)}</span><span class="stat-value">${value}</span></button>`;

  const month = Calc.monthBills(thisMonth());
  const pendingChanges = Store.list('changeRequests').filter(c => c.status === 'pending').length;
  const todayVisitors = Store.list('visitors').filter(v => v.date === today()).length;
  const followUps = Store.list('visitors').filter(v => v.followUp && v.followUp <= today() && !['booked', 'notInterested'].includes(v.status));

  const cards = [
    can('complaints') && stat('d_openComplaints', Store.list('complaints').filter(c => c.status === 'open' || c.status === 'working').length, '', 'complaints'),
    can('complaints') && !isContractor() && stat('d_toCheck', Store.list('complaints').filter(c => c.status === 'fixed').length, Store.list('complaints').some(c => c.status === 'fixed') ? 'warn' : '', 'complaints:fixed'),
    seesDaily() && stat('d_todayReports', Store.list('dailyReports').filter(r => r.date === today()).length, '', 'daily'),
    Store.has('changeRequests') && stat('d_pendingChanges', pendingChanges, pendingChanges ? 'warn' : '', 'changes'),
    can('visitors') && stat('d_todayVisitors', todayVisitors, '', 'visitors:visitors'),
    can('materials') && stat('d_monthBills', money(sum(month, b => b.amount)), '', 'materials:monthly'),
    can('materials') && stat('d_supplierDue', money(s.supplierDue), s.supplierDue ? 'warn' : 'good', 'materials:monthly'),
    can('materials') && stat('d_expense', money(s.expense))
  ].filter(Boolean).join('');

  // Suppliers still to be paid (all months)
  const dues = {};
  Store.list('bills').filter(b => b.status !== 'paid').forEach(b => {
    const k = b.supplier || '—';
    dues[k] = dues[k] || { supplier: k, count: 0, amount: 0 };
    dues[k].count++;
    dues[k].amount += Number(b.amount) || 0;
  });
  const dueRows = Object.values(dues).sort((a, b) => b.amount - a.amount);

  main.insertAdjacentHTML('beforeend', `
    <div class="stats">${cards}</div>

    ${can('materials') && dueRows.length ? `
    <section class="card">
      <h2 class="section-title"><span>${t('d_supplierDues')}</span></h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>${t('supplier')}</th><th class="num">${t('bills')}</th><th class="num">${t('due')}</th></tr></thead>
        <tbody>${dueRows.map(r => `<tr>
          <td data-label="${esc(t('supplier'))}"><strong>${esc(r.supplier)}</strong></td>
          <td class="num" data-label="${esc(t('bills'))}">${r.count}</td>
          <td class="num neg" data-label="${esc(t('due'))}">${money(r.amount)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>` : ''}

    ${can('visitors') && followUps.length ? `
    <section class="card">
      <h2 class="section-title"><span>${t('d_followUps')}</span></h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>${t('name')}</th><th>${t('phone')}</th><th>${t('interest')}</th><th>${t('followUp')}</th></tr></thead>
        <tbody>${followUps.map(v => `<tr>
          <td data-label="${esc(t('name'))}"><strong>${esc(v.name)}</strong></td>
          <td data-label="${esc(t('phone'))}">${v.phone ? `<a href="tel:${esc(v.phone)}">${esc(v.phone)}</a>` : ''}</td>
          <td data-label="${esc(t('interest'))}">${v.interest === 'both' ? t('vi_both') : v.interest ? v.interest + ' BHK' : ''}</td>
          <td data-label="${esc(t('followUp'))}" class="neg">${fmtDate(v.followUp)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>` : ''}

    ${can('materials') ? `
    <section class="card">
      <h2 class="section-title"><span>${t('d_projectWise')}</span></h2>
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th>${t('project')}</th>
          <th class="num">${t('ent_bills')}</th><th class="num">${t('ent_expenses')}</th><th class="num">${t('d_expense')}</th>
        </tr></thead>
        <tbody>${projects.map(p => {
          const ps = Calc.projectSummary(p.id);
          const cell = (label, v) => `<td class="num" data-label="${esc(t(label))}">${v}</td>`;
          return `<tr>
            <td data-label="${esc(t('project'))}"><strong>${esc(p.name)}</strong></td>
            ${cell('ent_bills', money(ps.material))}${cell('ent_expenses', money(ps.other))}
            ${cell('d_expense', money(ps.expense))}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>` : ''}`);

  main.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const [page, tab] = b.dataset.go.split(':');
    state.page = page;
    if (tab && page === 'complaints') state.filter.complaints = tab;
    else if (tab) state.tab[page] = tab;
    render();
  }));
}

// ---------- Flat holders: every flat, coloured by its plan status ----------
function renderHolders(container) {
  const projects = Store.list('projects').filter(p => Store.list('units').some(u => u.projectId === p.id));
  if (!projects.length) {
    container.innerHTML = `<div class="card"><p>${t('ch_noUnits')}</p></div>`;
    return;
  }
  const pid = projects.some(p => p.id === state.chartProject) ? state.chartProject : projects[0].id;
  const units = Store.list('units').filter(u => u.projectId === pid);
  const wings = [...new Set(units.map(u => u.wing || ''))].sort();
  const floorNum = u => Number(u.floor) || 0;
  const statusOf = u => { const c = Calc.unitChange(u); return c && c.status !== 'rejected' ? c.status : 'none'; };
  const counts = {};
  units.forEach(u => { const k = statusOf(u); counts[k] = (counts[k] || 0) + 1; });

  const wingHtml = wing => {
    const wu = units.filter(u => (u.wing || '') === wing);
    const floors = [...new Set(wu.map(floorNum))].sort((a, b) => b - a);
    const bhks = [...new Set(wu.map(u => u.bhk).filter(Boolean))];
    return `
      <div class="wing">
        <div class="wing-head">
          <h3>${wing ? `${t('wing')} ${esc(wing)}` : t('units')}</h3>
          <span class="hint">${bhks.map(b => b + ' BHK').join(', ')}</span>
        </div>
        <div class="floors">
          ${floors.map(f => `
            <div class="floor-row">
              <div class="floor-label">${f}</div>
              ${wu.filter(u => floorNum(u) === f)
                .sort((a, b) => String(a.number).localeCompare(String(b.number), 'en', { numeric: true }))
                .map(u => {
                  const owner = Calc.unitBooking(u);
                  return `<button class="flat flat-ch-${statusOf(u)}" data-unit="${u.id}" title="${esc(Calc.unitLabel(u.id))}">
                    <span class="flat-no">${esc(u.number)}</span>
                    <span class="flat-who">${owner ? esc(owner.customerName) : '—'}</span>
                  </button>`;
                }).join('')}
            </div>`).join('')}
        </div>
      </div>`;
  };

  container.innerHTML = `
    ${projects.length > 1 ? `<div class="toolbar"><label class="inline">${t('project')}
      <select id="chart-project">${projects.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>` : ''}
    <p class="hint">${t('holdersHelp')}</p>
    <div class="toolbar legends">${['none', 'pending', 'approved', 'done'].map(k =>
      `<span class="legend"><i class="dot dot-ch-${k}"></i>${k === 'none' ? t('plan_regularShort') : t('cs_' + k)} ${counts[k] || 0}</span>`).join('')}</div>
    <div class="wings">${wings.map(wingHtml).join('')}</div>`;

  const sel = $('#chart-project', container);
  if (sel) sel.addEventListener('change', e => { state.chartProject = e.target.value; render(); });
  container.querySelectorAll('[data-unit]').forEach(btn => btn.addEventListener('click', () => openFlatSheet(btn.dataset.unit)));
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

// ---------- Settings ----------
async function adminAction(url, doneMsg, confirmMsg) {
  if (confirmMsg && !confirm(confirmMsg)) return;
  try {
    const res = await api('POST', url);
    await Store.load();
    if (res.created === false) toast(t('setupExists'));
    else toast(doneMsg);
    render();
  } catch (err) {
    toast(errText(err), 'err');
  }
}

function renderSettings(main) {
  main.insertAdjacentHTML('beforeend', `
    <section class="card">
      <h2>${t('s_language')}</h2>
      <div class="row-gap">
        <button class="btn ${LANG === 'gu' ? 'btn-primary' : ''}" data-lang="gu">ગુજરાતી</button>
        <button class="btn ${LANG === 'en' ? 'btn-primary' : ''}" data-lang="en">English</button>
      </div>
    </section>
    ${isPartner() ? `
    <section class="card">
      <h2>${t('s_backup')}</h2>
      <p class="hint">${t('s_backupDesc')}</p>
      <a class="btn btn-primary" href="/api/admin/backup" download>${t('s_download')}</a>
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
    </section>` : ''}
    <section class="card">
      <button class="btn" data-logout>${t('logout')}</button>
    </section>`);

  main.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('[data-logout]', main).addEventListener('click', logoutNow);
  if (!isPartner()) return;

  $('#restore', main).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file || !confirm(t('s_confirmRestore'))) return;
    file.text().then(text => api('POST', '/admin/restore', JSON.parse(text)))
      .then(() => { alert(t('s_restored')); location.reload(); })
      .catch(() => alert(t('s_badFile')));
  });
  $('#setup', main).addEventListener('click', () => adminAction('/admin/setup-pv', t('setupDone')));
  $('#sample', main).addEventListener('click', () => adminAction('/admin/demo', t('demoLoaded'), t('s_confirmSample')));
  $('#clear', main).addEventListener('click', () => adminAction('/admin/clear', t('cleared'), t('s_confirmClear')));
}

// ---------- Printed quotation ----------
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

function printQuotation(u) {
  const price = Calc.unitPrice(u);
  const rooms = BRAND.rooms[u.bhk];
  const half = rooms ? Math.ceil(rooms.length / 2) : 0;
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
      <div class="doc-rooms">${[rooms.slice(0, half), rooms.slice(half)]
        .map(part => `<table class="doc-table">${part.map(r => `<tr><th>${pick(r[0], r[1])}</th><td>${r[2]}</td></tr>`).join('')}</table>`).join('')}</div>` : ''}
    <h3>${t('i_amenities')}</h3>
    <ul class="doc-list">${BRAND.amenities.map(a => `<li>${pick(a[1], a[2])}</li>`).join('')}</ul>
    <h3>${t('i_specs')}</h3>
    <ul class="doc-list doc-list-wide">${BRAND.specs.map(sp => `<li><strong>${pick(sp[0], sp[1])}:</strong> ${pick(sp[2], sp[3])}</li>`).join('')}</ul>
    <p class="doc-note">${t('q_note')}</p>
    ${docFooter()}`);
}
