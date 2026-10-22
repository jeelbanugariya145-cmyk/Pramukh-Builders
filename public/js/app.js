// Main application: login, role-based menu, generic lists and forms
const $ = (sel, el = document) => el.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function prefGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function prefSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// ---------- Roles ----------
const isPartner = () => Store.me && Store.me.role === 'partner';
const isContractor = () => Store.me && Store.me.role === 'contractor';
const isCustomer = () => Store.me && Store.me.role === 'customer';
function can(perm) {
  if (perm === 'materials' && !Store.materials) return false;
  if (isContractor() && (perm === 'flats' || perm === 'approvals')) return false;
  return isPartner() || (Store.me && ['staff', 'contractor'].includes(Store.me.role) && Store.me.perms.includes(perm));
}
const seesDaily = () => can('daily') || can('dailyView');

// Menu pages and the tabs inside them, filtered by what this person may use
function pagesFor() {
  if (isCustomer()) return [{ id: 'myflat', icon: '🏠' }];
  if (isContractor()) {
    return [
      { id: 'changes', icon: '📐' },
      seesDaily() && { id: 'daily', icon: '📋' },
      { id: 'flats', icon: '🏢', tabs: ['chart'] },
      can('labour') && { id: 'labour', icon: '👷', tabs: ['workers', 'attendance', 'labourPayments'] },
      { id: 'info', icon: '🏙️' },
      { id: 'settings', icon: '⚙️' }
    ].filter(Boolean);
  }
  const pages = [
    { id: 'dashboard', icon: '📊' },
    seesDaily() && { id: 'daily', icon: '📋' },
    { id: 'info', icon: '🏙️' },
    { id: 'flats', icon: '🏢', tabs: ['chart', 'units', isPartner() && 'projects', Store.has('bookings') && 'bookings'] },
    (can('approvals') || can('flats')) && { id: 'changes', icon: '📐' },
    can('materials') && { id: 'materials', icon: '🧱', tabs: ['bills', 'monthly', 'bank', 'expenses'] },
    can('labour') && { id: 'labour', icon: '👷', tabs: ['workers', 'attendance', 'labourPayments'] },
    can('visitors') && { id: 'visitors', icon: '🚶', tabs: ['visitors'] },
    isPartner() && { id: 'users', icon: '👥', tabs: ['users'] },
    { id: 'settings', icon: '⚙️' }
  ].filter(Boolean);
  pages.forEach(p => { if (p.tabs) p.tabs = p.tabs.filter(Boolean); });
  return pages;
}

const state = { page: null, tab: {}, search: {}, filter: {} };

// Shows a short message at the bottom of the screen
function toast(msg, kind = 'ok') {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function errText(err) {
  const key = 'err_' + (err && err.message);
  return I18N[LANG][key] || I18N.en[key] || t('err_server_error');
}

// ---------- Start, login ----------
async function boot() {
  const saved = prefGet('pramukh-lang');
  if (saved === 'gu' || saved === 'en') LANG = saved;
  document.documentElement.lang = LANG;
  let status;
  try {
    status = await api('GET', '/status');
  } catch (e) {
    return renderLogin({ offline: true });
  }
  Store.ai = status.ai;
  Store.materials = status.materials;
  if (status.needsSetup) return renderLogin({ setup: true });
  if (!status.user) return renderLogin({});
  Store.me = status.user;
  await Store.load();
  state.page = pagesFor()[0].id;
  render();
}

function renderLogin({ setup, offline }) {
  document.body.classList.add('login-mode');
  const box = $('#login');
  box.hidden = false;
  $('.app').hidden = true;
  box.innerHTML = `
    <form class="login-card" novalidate>
      <img class="login-logo" src="assets/logo-pramukh-view.jpg" alt="Pramukh View">
      <div class="group-logos">
        <img src="assets/logo-pramukh-builders.jpg" alt="Pramukh Builders">
        <span class="divider"></span>
        <img src="assets/logo-shreeji-builders.jpg" alt="Shreeji Builders">
      </div>
      <h1>${setup ? t('setupTitle') : t('loginTitle')}</h1>
      <p class="hint">${offline ? t('err_offline') : setup ? t('setupHelp') : t('loginHelp')}</p>
      ${setup ? `<label class="field"><span>${t('name')}</span><input name="name" required autocomplete="name"></label>` : ''}
      <label class="field"><span>${t('loginMobile')}</span><input name="mobile" type="tel" inputmode="numeric" autocomplete="tel" required></label>
      <label class="field"><span>${t('loginPin')}</span><input name="pin" type="password" inputmode="numeric" autocomplete="${setup ? 'new-password' : 'current-password'}" required></label>
      <p class="error" id="login-error" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">${setup ? t('setupBtn') : t('loginBtn')}</button>
      <button class="btn btn-small lang-toggle" type="button" data-lang-toggle>${LANG === 'gu' ? 'English' : 'ગુજરાતી'}</button>
    </form>`;
  const form = $('form', box);
  $('[data-lang-toggle]', form).addEventListener('click', () => {
    LANG = LANG === 'gu' ? 'en' : 'gu';
    prefSet('pramukh-lang', LANG);
    renderLogin({ setup, offline });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form).entries());
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      if (setup) await api('POST', '/setup', v);
      await api('POST', '/login', { mobile: v.mobile, pin: v.pin });
      box.hidden = true;
      box.innerHTML = '';
      $('.app').hidden = false;
      document.body.classList.remove('login-mode');
      await boot();
    } catch (err) {
      $('#login-error').textContent = errText(err);
      btn.disabled = false;
    }
  });
  const first = $('input', form);
  if (first) first.focus();
}

async function logoutNow() {
  try { await api('POST', '/logout'); } catch (e) { /* ignore */ }
  location.reload();
}

// ---------- Layout ----------
function render() {
  document.documentElement.lang = LANG;
  document.title = t('appName');
  $('#developers-label').textContent = t('developers');
  $('#lang-toggle').textContent = LANG === 'gu' ? 'English' : 'ગુજરાતી';
  $('#who').innerHTML = `<strong>${esc(Store.me.name)}</strong><span>${t('role_' + Store.me.role)}</span>`;
  $('#logout').textContent = t('logout');

  const pages = pagesFor();
  if (!pages.some(p => p.id === state.page)) state.page = pages[0].id;
  $('#nav').innerHTML = pages.length > 1 ? pages.map(p => `
    <button class="nav-item ${p.id === state.page ? 'active' : ''}" data-page="${p.id}">
      <span class="nav-icon">${p.icon}</span><span>${t('nav_' + p.id)}</span>
    </button>`).join('') : '';

  const page = pages.find(p => p.id === state.page);
  const main = $('#main');
  main.innerHTML = `<h1 class="page-title">${page.icon} ${t('nav_' + page.id)}</h1>`;

  if (page.id === 'myflat') return renderMyFlat(main);
  if (page.id === 'dashboard') return renderDashboard(main);
  if (page.id === 'info') return renderInfo(main);
  if (page.id === 'changes') return renderChanges(main);
  if (page.id === 'daily') return renderDaily(main);
  if (page.id === 'settings') return renderSettings(main);

  const tab = page.tabs.includes(state.tab[page.id]) ? state.tab[page.id] : page.tabs[0];
  if (page.tabs.length > 1) {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    tabs.innerHTML = page.tabs.map(k =>
      `<button class="tab ${k === tab ? 'active' : ''}" data-tab="${k}">${t('ent_' + k)}</button>`).join('');
    main.appendChild(tabs);
  }

  const body = document.createElement('div');
  main.appendChild(body);
  if (tab === 'attendance') renderAttendance(body);
  else if (tab === 'chart') renderChart(body);
  else if (tab === 'monthly') renderMonthly(body);
  else if (tab === 'bank') renderBankMatch(body);
  else renderList(body, tab);
}

// ---------- Generic list ----------
function renderList(container, key) {
  const ent = ENTITIES[key];
  const editable = ent.canEdit();
  container.innerHTML = `
    <div class="toolbar">
      <input type="search" class="search" placeholder="${t('search')}" value="${esc(state.search[key] || '')}">
      ${key === 'bills' && editable ? `<label class="btn btn-accent file-btn">📷 ${t('billUpload')}<input type="file" accept="image/*,application/pdf" data-bill-photo hidden></label>` : ''}
      ${editable ? `<button class="btn btn-primary" data-add>${t('add')}</button>` : ''}
    </div>
    ${key === 'bills' ? `<p class="hint">${Store.ai ? t('billHelpAi') : t('billHelpNoAi')}</p>` : ''}
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
    const actions = r => [
      ...(ent.extraActions || []).map((a, i) => !a.show || a.show(r)
        ? `<button class="btn btn-small btn-accent" data-extra="${i}" data-id="${r.id}">${t(a.label)}</button>` : ''),
      editable ? `<button class="btn btn-small" data-edit="${r.id}">${t('edit')}</button>` : '',
      editable ? `<button class="btn btn-small btn-danger" data-del="${r.id}">${t('delete')}</button>` : ''
    ].join('');
    table.innerHTML = `
      <thead><tr>${ent.columns.map(c => `<th class="${c.num ? 'num' : ''}">${t(c.label)}</th>`).join('')}<th>${t('actions')}</th></tr></thead>
      <tbody>${visible.map(({ r, html }) => `
        <tr class="${ent.rowClass ? ent.rowClass(r) : ''}">
          ${html.map((h, i) => `<td class="${ent.columns[i].num ? 'num' : ''}" data-label="${esc(t(ent.columns[i].label))}">${h}</td>`).join('')}
          <td class="row-actions">${actions(r)}</td>
        </tr>`).join('')}
      </tbody>`;
  };
  draw();

  $('.search', container).addEventListener('input', e => { state.search[key] = e.target.value; draw(); });
  const add = $('[data-add]', container);
  if (add) add.addEventListener('click', () => openForm(key));
  const billPhoto = $('[data-bill-photo]', container);
  if (billPhoto) billPhoto.addEventListener('change', e => billFromPhoto(e.target.files[0]));
  table.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) openForm(key, Store.get(key, b.dataset.edit));
    if (b.dataset.del) deleteRecord(key, b.dataset.del);
    if (b.dataset.extra) ent.extraActions[b.dataset.extra].run(Store.get(key, b.dataset.id));
  });
  // Tick a bill to mark it paid today (untick to mark pending again)
  table.addEventListener('change', async e => {
    const id = e.target.dataset.pay;
    if (!id) return;
    if (!editable) { e.target.checked = !e.target.checked; return; }
    await payBills([{ id, paid: e.target.checked, paidDate: today(), paidMode: 'bank' }]);
    draw();
  });
}

async function payBills(items) {
  try {
    const res = await api('POST', '/bills/pay', { items });
    Store.merge('bills', res.bills);
    toast(t('saved'));
  } catch (err) {
    toast(errText(err), 'err');
  }
}

async function deleteRecord(key, id) {
  if (!confirm(t('confirmDelete'))) return;
  try {
    await Store.remove(key, id);
    render();
  } catch (err) {
    if (err.status === 409) alert(t('cantDelete') + '\n• ' + err.data.linked.map(c => t('ent_' + c)).join('\n• '));
    else toast(errText(err), 'err');
  }
}

// ---------- Form (modal) ----------
function openForm(key, record, defaults, { onSaved } = {}) {
  const ent = ENTITIES[key];
  const current = record || defaults || {};
  const dlg = $('#modal');

  const fieldHtml = f => {
    const v = current[f.name] ?? (record ? '' : (typeof f.default === 'function' ? f.default() : f.default)) ?? '';
    const req = f.required ? 'required' : '';
    let input;
    if (f.type === 'select') {
      const options = f.options(current);
      input = `<select name="${f.name}" ${req}>
        <option value="">${t('select')}</option>
        ${options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>`;
    } else if (f.type === 'checks') {
      const chosen = Array.isArray(v) ? v : [];
      input = `<div class="checks">${f.options().map(o => `
        <label class="check"><input type="checkbox" name="${f.name}" value="${o.value}" ${chosen.includes(o.value) ? 'checked' : ''}> ${esc(o.label)}</label>`).join('')}</div>`;
    } else if (f.type === 'textarea') {
      input = `<textarea name="${f.name}" rows="3">${esc(v)}</textarea>`;
    } else if (f.type === 'pin') {
      const placeholder = record ? t('pinKeep') : '';
      input = `<input type="text" name="${f.name}" inputmode="numeric" autocomplete="off" pattern="\\d{4,8}" placeholder="${esc(placeholder)}">`;
    } else if (f.type === 'photo') {
      input = `<input type="hidden" name="${f.name}" value="${esc(v)}">
        <div class="photo-field">${v ? `<a href="${fileUrl(v)}" target="_blank" rel="noopener"><img src="${fileUrl(v)}" alt=""></a>` : `<span class="hint">${t('noPhoto')}</span>`}
        <label class="btn btn-small">📷 ${t('choosePhoto')}<input type="file" accept="image/*,application/pdf" data-photo-for="${f.name}" hidden></label></div>`;
    } else {
      const extra = f.type === 'number' ? 'step="any" min="0" inputmode="decimal"' : '';
      const list = f.list ? `list="dl-${f.name}"` : '';
      input = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${req} ${extra} ${list}>`;
      if (f.list) input += `<datalist id="dl-${f.name}">${f.list().map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    }
    const required = f.required || (f.requiredOnCreate && !record);
    return `<label class="field ${f.type === 'checks' || f.type === 'photo' ? 'field-wide' : ''}" data-field="${f.name}">
      <span>${t(f.label)}${required ? ' <b class="req">*</b>' : ''}</span>${input}
      ${f.help ? `<small class="hint">${t(f.help)}</small>` : ''}</label>`;
  };

  dlg.innerHTML = `
    <form class="modal-card" method="dialog" novalidate>
      <h2>${record ? t('edit') : t('add').replace('+ ', '')}: ${t('ent_' + key)}</h2>
      <div class="form-grid">${ent.fields.map(fieldHtml).join('')}</div>
      <p class="error" data-form-error role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('save')}</button>
      </div>
    </form>`;

  const form = $('form', dlg);
  const values = () => {
    const v = {};
    ent.fields.forEach(f => {
      if (f.type === 'checks') v[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map(x => x.value);
      else v[f.name] = form.elements[f.name].value.trim();
    });
    return v;
  };
  const applyVisibility = () => {
    const v = values();
    ent.fields.filter(f => f.showIf).forEach(f => {
      $(`[data-field="${f.name}"]`, form).hidden = !f.showIf(v);
    });
  };
  applyVisibility();

  form.addEventListener('change', async e => {
    const photoFor = e.target.dataset && e.target.dataset.photoFor;
    if (photoFor && e.target.files[0]) {
      try {
        const file = await uploadFile(e.target.files[0]);
        form.elements[photoFor].value = file.id;
        $('.photo-field', form).insertAdjacentHTML('afterbegin', `<span class="pos">✓ ${esc(file.name)}</span>`);
      } catch (err) {
        toast(errText(err), 'err');
      }
      return;
    }
    applyVisibility();
  });
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('.field .error').forEach(x => x.remove());
    const v = values();
    ent.fields.forEach(f => {
      const hidden = $(`[data-field="${f.name}"]`, form).hidden;
      const required = f.required || (f.requiredOnCreate && !record);
      if (required && !hidden && !(Array.isArray(v[f.name]) ? v[f.name].length : v[f.name])) {
        ok = false;
        $(`[data-field="${f.name}"] > span`, form).insertAdjacentHTML('afterend', `<small class="error">${t('required')}</small>`);
      }
      if (f.type === 'pin' && v[f.name] && !/^\d{4,8}$/.test(v[f.name])) {
        ok = false;
        $(`[data-field="${f.name}"] > span`, form).insertAdjacentHTML('afterend', `<small class="error">${t('err_bad_pin')}</small>`);
      }
    });
    if (!ok) return;

    const data = {};
    ent.fields.forEach(f => {
      if (f.type === 'pin' && !v[f.name]) return;
      data[f.name] = f.type === 'number' ? (v[f.name] === '' ? '' : Number(v[f.name])) : v[f.name];
    });
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const saved = record ? await Store.update(key, record.id, data) : await Store.add(key, data);
      dlg.close();
      render();
      if (onSaved) onSaved(saved);
      if (key === 'bookings' && data.pin) offerLoginShare(saved, data.pin);
    } catch (err) {
      $('[data-form-error]', form).textContent = errText(err);
      btn.disabled = false;
    }
  });

  dlg.showModal();
  const first = form.querySelector('input:not([type=hidden]), select, textarea');
  if (first) first.focus();
}

// ---------- Sending flat owners their login ----------
const appUrl = () => location.origin + '/';
const waNumber = phone => { const d = String(phone).replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };

function loginMessage(b, pin) {
  return t('loginMsg')
    .replace('{name}', b.customerName)
    .replace('{flat}', Calc.unitLabel(b.unitId))
    .replace('{url}', appUrl())
    .replace('{mobile}', b.phone)
    .replace('{pin}', pin || t('pinFromOffice'));
}

function offerLoginShare(b, pin) {
  if (confirm(t('askSendLogin'))) {
    window.open(`https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(loginMessage(b, pin))}`, '_blank', 'noopener');
  }
}

function shareLogin(b) {
  window.open(`https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(loginMessage(b, ''))}`, '_blank', 'noopener');
}

// ---------- Language ----------
function setLang(lang) {
  LANG = lang;
  prefSet('pramukh-lang', lang);
  render();
}

// ---------- Start ----------
document.addEventListener('DOMContentLoaded', () => {
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
  $('#logout').addEventListener('click', logoutNow);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });
  boot();
});
