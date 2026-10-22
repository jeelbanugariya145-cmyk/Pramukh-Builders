// Plan change requests: flat owner asks -> civil department approves or rejects -> contractor builds it

const PLAN_IMAGE = { 3: 'assets/plan-3bhk.jpg', 4: 'assets/plan-4bhk.jpg' };

const changeBadge = c => `<span class="badge badge-ch-${c.status}">${t('cs_' + c.status)}</span>`;

function thumbs(ids, label) {
  if (!ids || !ids.length) return '';
  return `<div class="thumbs">${label ? `<div class="hint">${label}</div>` : ''}${ids.map(id =>
    `<a href="${fileUrl(id)}" target="_blank" rel="noopener" class="thumb"><img src="${fileUrl(id)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'📄 PDF'}))"></a>`).join('')}</div>`;
}

function changeCard(c, { actions = '', showCustomer = true } = {}) {
  const u = Store.get('units', c.unitId);
  return `
    <article class="change-card change-${c.status}">
      <header>
        <div>
          <strong class="change-flat">${esc(u ? Calc.unitCode(u) : '')}</strong>
          ${u && u.bhk ? `<span class="hint">${esc(u.bhk)} BHK</span>` : ''}
          ${showCustomer && c.customerName ? `<span class="hint">· ${esc(c.customerName)}</span>` : ''}
        </div>
        ${changeBadge(c)}
      </header>
      <p class="change-desc">${esc(c.description)}</p>
      ${(c.status === 'approved' || c.status === 'done') && c.finalFiles && c.finalFiles.length ? thumbs(c.finalFiles, t('finalPlan')) : ''}
      ${thumbs(c.files, t('customerPlan'))}
      <div class="change-meta hint">
        ${t('requestedOn')}: ${fmtDate(c.createdAt)}
        ${c.reviewedAt ? ` · ${t('reviewedOn')}: ${fmtDate(c.reviewedAt)}${c.reviewedBy ? ' (' + esc(c.reviewedBy) + ')' : ''}` : ''}
        ${c.doneAt ? ` · ${t('doneOn')}: ${fmtDate(c.doneAt)}` : ''}
      </div>
      ${c.remark ? `<p class="change-remark"><strong>${t('remark')}:</strong> ${esc(c.remark)}</p>` : ''}
      ${actions ? `<div class="row-gap">${actions}</div>` : ''}
    </article>`;
}

// ---------- Flat owner: only their own flat ----------
function renderMyFlat(main) {
  const bookings = Store.list('bookings');
  main.innerHTML = `
    <section class="welcome">
      <h1>${t('hello')}, ${esc(Store.me.name)} 🙏</h1>
      <p class="hint">${t('myFlatHelp')}</p>
    </section>`;

  bookings.forEach(b => {
    const u = Store.get('units', b.unitId);
    if (!u) return;
    const requests = Store.list('changeRequests').filter(c => c.bookingId === b.id)
      .sort((a, z) => (z.createdAt || '').localeCompare(a.createdAt || ''));
    const plan = PLAN_IMAGE[u.bhk];
    main.insertAdjacentHTML('beforeend', `
      <section class="card my-flat">
        <div class="my-flat-head">
          <div>
            <div class="hint">${esc(Calc.projectName(u.projectId))}</div>
            <h2 class="my-flat-no">${t('flat')} ${esc(Calc.unitCode(u))}</h2>
          </div>
          <div class="my-flat-facts">
            ${u.bhk ? `<span><strong>${esc(u.bhk)} BHK</strong></span>` : ''}
            <span>${t('floor')}: <strong>${esc(u.floor)}</strong></span>
            ${u.area ? `<span>${t('q_carpet')}: <strong>${esc(u.area)} sq ft</strong></span>` : ''}
            ${u.parking ? `<span>${t('parking')}: <strong>${esc(u.parking)}</strong></span>` : ''}
          </div>
        </div>

        ${plan ? `
        <h3 class="section-title"><span>${t('typicalPlan')}</span></h3>
        <a href="${plan}" target="_blank" rel="noopener"><img class="my-plan" src="${plan}" alt="${esc(u.bhk)} BHK plan"></a>
        <p class="hint">${t('typicalPlanHelp')}</p>` : ''}

        <h3 class="section-title"><span>${t('requestChange')}</span></h3>
        <form class="change-form" data-booking="${b.id}" novalidate>
          <label class="field"><span>${t('changeWhat')}</span>
            <textarea name="description" rows="3" placeholder="${esc(t('changePlaceholder'))}"></textarea></label>
          <label class="field"><span>${t('changePhoto')}</span>
            <input type="file" name="photos" accept="image/*,application/pdf" multiple></label>
          <p class="error" role="alert"></p>
          <button class="btn btn-primary" type="submit">${t('sendRequest')}</button>
        </form>

        <h3 class="section-title"><span>${t('myRequests')}</span></h3>
        ${requests.length ? requests.map(c => changeCard(c, { showCustomer: false })).join('') : `<p class="hint">${t('noRequests')}</p>`}
      </section>`);
  });

  main.insertAdjacentHTML('beforeend', `
    <section class="card contact-card">
      <div><div class="hint">${t('needHelp')}</div><p class="address">${BRAND.groups}</p></div>
      <div class="row-gap">
        <a class="btn btn-primary" href="tel:+91${BRAND.phone}">📞 ${BRAND.phoneDisplay}</a>
        <a class="btn btn-accent" href="https://wa.me/91${BRAND.phone}" target="_blank" rel="noopener">💬 WhatsApp</a>
      </div>
    </section>`);

  main.querySelectorAll('.change-form').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('.error', form);
    const description = form.elements.description.value.trim();
    const files = [...form.elements.photos.files];
    if (!description && !files.length) { err.textContent = t('err_empty_request'); return; }
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    btn.textContent = t('sending');
    try {
      const uploaded = [];
      for (const f of files) uploaded.push((await uploadFile(f)).id);
      const rec = await api('POST', '/changes', { bookingId: form.dataset.booking, description, files: uploaded });
      Store.data.changeRequests.push(rec);
      toast(t('requestSent'));
      render();
    } catch (ex) {
      err.textContent = errText(ex);
      btn.disabled = false;
      btn.textContent = t('sendRequest');
    }
  }));
}

// ---------- Office and contractor list ----------
function renderChanges(main) {
  const contractor = isContractor();
  const reviewer = can('approvals');
  const filters = contractor ? ['approved', 'done'] : ['pending', 'approved', 'done', 'rejected', 'all'];
  const filter = filters.includes(state.filter.changes) ? state.filter.changes : filters[0];
  const all = Store.list('changeRequests');
  const shown = all.filter(c => filter === 'all' || c.status === filter)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  main.insertAdjacentHTML('beforeend', `
    <p class="hint">${contractor ? t('chContractorHelp') : t('chOfficeHelp')}</p>
    ${!contractor && !reviewer ? `<p class="hint"><strong>${t('chNotApprover')}</strong></p>` : ''}
    <div class="tabs">${filters.map(f => `<button class="tab ${f === filter ? 'active' : ''}" data-filter="${f}">
      ${f === 'all' ? t('all') : t('cs_' + f)} <span class="count">${f === 'all' ? all.length : all.filter(c => c.status === f).length}</span></button>`).join('')}
    </div>
    ${!contractor && can('flats') ? `<div class="toolbar"><button class="btn btn-accent" data-new-change>${t('newChangeForCustomer')}</button></div>` : ''}
    <div class="change-list">
      ${shown.length ? shown.map(c => changeCard(c, {
        showCustomer: !contractor,
        actions: [
          reviewer && `<button class="btn btn-small btn-primary" data-review="${c.id}">${c.status === 'pending' ? t('review') : t('changeDecision')}</button>`,
          (contractor || reviewer) && c.status === 'approved' && `<button class="btn btn-small btn-accent" data-done="${c.id}">✓ ${t('markDone')}</button>`,
          (contractor || reviewer) && c.status === 'done' && `<button class="btn btn-small" data-undone="${c.id}">${t('markNotDone')}</button>`,
          isPartner() && `<button class="btn btn-small btn-danger" data-del-change="${c.id}">${t('delete')}</button>`
        ].filter(Boolean).join('')
      })).join('') : `<div class="card"><p class="hint">${t('noData')}</p></div>`}
    </div>`);

  main.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { state.filter.changes = b.dataset.filter; render(); }));
  main.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => openReview(Store.get('changeRequests', b.dataset.review))));
  main.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', () => markDone(b.dataset.done, true)));
  main.querySelectorAll('[data-undone]').forEach(b => b.addEventListener('click', () => markDone(b.dataset.undone, false)));
  main.querySelectorAll('[data-del-change]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(t('confirmDelete'))) return;
    await api('DELETE', `/changes/${b.dataset.delChange}`);
    Store.data.changeRequests = Store.list('changeRequests').filter(c => c.id !== b.dataset.delChange);
    render();
  }));
  const newBtn = $('[data-new-change]', main);
  if (newBtn) newBtn.addEventListener('click', openOfficeRequest);
}

function replaceChange(rec) {
  const list = Store.data.changeRequests;
  const i = list.findIndex(c => c.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
}

async function markDone(id, done) {
  try {
    replaceChange(await api('POST', `/changes/${id}/done`, { done }));
    toast(t('saved'));
    render();
  } catch (err) {
    toast(errText(err), 'err');
  }
}

// Civil department decision: approve / reject with a remark, optionally attach the final drawing
function openReview(c) {
  const dlg = $('#modal');
  const u = Store.get('units', c.unitId);
  dlg.innerHTML = `
    <form class="modal-card" method="dialog" novalidate>
      <h2>${t('review')}: ${esc(u ? Calc.unitCode(u) : '')}</h2>
      ${changeCard(c)}
      <label class="field"><span>${t('remark')}</span><textarea name="remark" rows="3">${esc(c.remark)}</textarea></label>
      <label class="field"><span>${t('finalPlanUpload')}</span>
        <input type="file" name="final" accept="image/*,application/pdf" multiple>
        <small class="hint">${t('finalPlanHelp')}</small></label>
      <p class="error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${t('cancel')}</button>
        <button type="button" class="btn btn-danger" data-decide="rejected">✕ ${t('reject')}</button>
        <button type="button" class="btn btn-primary" data-decide="approved">✓ ${t('approve')}</button>
      </div>
    </form>`;
  const form = $('form', dlg);
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());
  form.querySelectorAll('[data-decide]').forEach(btn => btn.addEventListener('click', async () => {
    const status = btn.dataset.decide;
    const remark = form.elements.remark.value.trim();
    if (status === 'rejected' && !remark) { $('.error', form).textContent = t('rejectNeedsRemark'); return; }
    form.querySelectorAll('button').forEach(x => { x.disabled = true; });
    try {
      const finalFiles = [...(c.finalFiles || [])];
      for (const f of form.elements.final.files) finalFiles.push((await uploadFile(f)).id);
      replaceChange(await api('POST', `/changes/${c.id}/review`, { status, remark, finalFiles }));
      dlg.close();
      toast(status === 'approved' ? t('approvedMsg') : t('rejectedMsg'));
      render();
    } catch (err) {
      $('.error', form).textContent = errText(err);
      form.querySelectorAll('button').forEach(x => { x.disabled = false; });
    }
  }));
  dlg.showModal();
}

// Office enters a request on behalf of a flat owner (e.g. brought on paper)
function openOfficeRequest() {
  const dlg = $('#modal');
  const bookings = Store.list('bookings').slice().sort((a, b) => Calc.unitLabel(a.unitId).localeCompare(Calc.unitLabel(b.unitId), 'en', { numeric: true }));
  dlg.innerHTML = `
    <form class="modal-card" method="dialog" novalidate>
      <h2>${t('newChangeForCustomer')}</h2>
      <label class="field"><span>${t('unit')}</span><select name="bookingId">
        ${bookings.map(b => `<option value="${b.id}">${esc(Calc.unitLabel(b.unitId))} — ${esc(b.customerName)}</option>`).join('')}
      </select></label>
      <label class="field"><span>${t('changeWhat')}</span><textarea name="description" rows="3"></textarea></label>
      <label class="field"><span>${t('changePhoto')}</span><input type="file" name="photos" accept="image/*,application/pdf" multiple></label>
      <p class="error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('save')}</button>
      </div>
    </form>`;
  const form = $('form', dlg);
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const description = form.elements.description.value.trim();
    const files = [...form.elements.photos.files];
    if (!description && !files.length) { $('.error', form).textContent = t('err_empty_request'); return; }
    try {
      const uploaded = [];
      for (const f of files) uploaded.push((await uploadFile(f)).id);
      replaceChange(await api('POST', '/changes', { bookingId: form.elements.bookingId.value, description, files: uploaded }));
      dlg.close();
      render();
    } catch (err) {
      $('.error', form).textContent = errText(err);
    }
  });
  dlg.showModal();
}

// Shown when a flat is clicked in the "plan changes" chart
function openChangeDetail(c) {
  const dlg = $('#modal');
  const reviewer = can('approvals');
  dlg.innerHTML = `
    <div class="modal-card">
      ${changeCard(c, { showCustomer: !isContractor() })}
      <div class="modal-actions">
        ${reviewer ? `<button class="btn btn-primary" data-review>${t('changeDecision')}</button>` : ''}
        ${(isContractor() || reviewer) && c.status === 'approved' ? `<button class="btn btn-accent" data-done>✓ ${t('markDone')}</button>` : ''}
        <button class="btn" data-close>${t('close')}</button>
      </div>
    </div>`;
  $('[data-close]', dlg).addEventListener('click', () => dlg.close());
  const review = $('[data-review]', dlg);
  if (review) review.addEventListener('click', () => { dlg.close(); openReview(c); });
  const done = $('[data-done]', dlg);
  if (done) done.addEventListener('click', () => { dlg.close(); markDone(c.id, true); });
  dlg.showModal();
}

// ---------- Site list for contractors and supervisors ----------
// Every flat in their wings: which ones have an approved change to build, which are done, which have none
function renderSiteList(main) {
  const wings = myWings();
  const units = Store.list('units').filter(u => wings.includes(u.wing))
    .sort((a, b) => (a.wing || '').localeCompare(b.wing || '') || String(a.number).localeCompare(String(b.number), 'en', { numeric: true }));
  const changesOf = u => Store.list('changeRequests').filter(c => c.unitId === u.id && (c.status === 'approved' || c.status === 'done'))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const kindOf = u => {
    const cs = changesOf(u);
    if (cs.some(c => c.status === 'approved')) return 'todo';
    return cs.length ? 'done' : 'none';
  };
  const groups = ['todo', 'done', 'none', 'all'];
  const filter = groups.includes(state.filter.site) ? state.filter.site : 'todo';
  const count = k => (k === 'all' ? units.length : units.filter(u => kindOf(u) === k).length);
  const shown = units.filter(u => filter === 'all' || kindOf(u) === filter);
  const canMark = onSite() || can('approvals');

  main.insertAdjacentHTML('beforeend', `
    <p class="hint">${t('siteHelp')}</p>
    <div class="tabs">${groups.map(k => `<button class="tab ${k === filter ? 'active' : ''}" data-site="${k}">${t('site_' + k)} <span class="count">${count(k)}</span></button>`).join('')}</div>
    <div class="site-list">
      ${shown.length ? shown.map(u => {
        const kind = kindOf(u);
        const cs = changesOf(u);
        return `
        <article class="site-flat site-${kind}">
          <div class="between">
            <div><strong class="site-no">${esc(Calc.unitCode(u))}</strong> <span class="hint">${u.bhk ? esc(u.bhk) + ' BHK · ' : ''}${t('floor')} ${esc(u.floor)}</span></div>
            <span class="cpill ${kind === 'todo' ? 'p-fixed' : kind === 'done' ? 'p-working' : 'p-none'}">${t('siteKind_' + kind)}</span>
          </div>
          ${kind === 'none' ? `<p class="hint">${t('siteStandard')}</p>` : cs.map(c => `
            <div class="site-change ${c.status}">
              <p>${esc(c.description)}</p>
              ${c.remark ? `<p class="hint"><strong>${t('remark')}:</strong> ${esc(c.remark)}</p>` : ''}
              ${thumbs(c.finalFiles, (c.finalFiles || []).length ? t('finalPlan') : '')}
              ${thumbs(c.files, (c.files || []).length ? t('customerPlan') : '')}
              <div class="between">
                <span class="hint">${t('reviewedOn')}: ${fmtDate(c.reviewedAt)}${c.doneAt ? ` · ${t('doneOn')}: ${fmtDate(c.doneAt)}` : ''}</span>
                ${canMark ? (c.status === 'approved'
                  ? `<button class="btn btn-small btn-primary" data-site-done="${c.id}">✓ ${t('markDone')}</button>`
                  : `<button class="btn btn-small" data-site-undo="${c.id}">${t('markNotDone')}</button>`) : ''}
              </div>
            </div>`).join('')}
        </article>`;
      }).join('') : `<div class="card"><p class="hint">${t('noData')}</p></div>`}
    </div>`);

  main.querySelectorAll('[data-site]').forEach(b => b.addEventListener('click', () => { state.filter.site = b.dataset.site; render(); }));
  main.querySelectorAll('[data-site-done]').forEach(b => b.addEventListener('click', () => markDone(b.dataset.siteDone, true)));
  main.querySelectorAll('[data-site-undo]').forEach(b => b.addEventListener('click', () => markDone(b.dataset.siteUndo, false)));
}
