// Complaints: partners (and ticked supervisors) raise a complaint for a wing; that wing's contractor
// and supervisors answer with what they did (text + photos); whoever raised it closes or reopens it.

const CSTATUS = { open: 'p-open', working: 'p-working', fixed: 'p-fixed', closed: 'p-closed' };
const myWings = () => (isPartner() ? ['A', 'B'] : (Store.me.wings || []));
const seesWing = w => isPartner() || w === 'both' || myWings().includes(w);
const wingLabel = w => (w === 'both' ? t('wingBoth') : `${t('wing')} ${w}`);
const canRaise = () => can('complaints') && !isContractor();
const canClose = c => isPartner() || c.createdBy === Store.me.id;
const whenText = iso => {
  const d = new Date(iso);
  return `${fmtDate(iso.slice(0, 10))} ${d.toLocaleTimeString(LANG === 'gu' ? 'gu-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};
const statusPill = s => `<span class="cpill ${CSTATUS[s]}">${t('cst_' + s)}</span>`;

function replaceComplaint(rec) {
  const list = Store.data.complaints;
  const i = list.findIndex(c => c.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
}

function renderComplaints(main) {
  const all = Store.list('complaints');
  const groups = { active: ['open', 'working'], fixed: ['fixed'], closed: ['closed'], all: ['open', 'working', 'fixed', 'closed'] };
  const filter = groups[state.filter.complaints] ? state.filter.complaints : 'active';
  const wingFilter = state.cWing || 'all';
  const shown = all
    .filter(c => groups[filter].includes(c.status))
    .filter(c => wingFilter === 'all' || c.wing === wingFilter || c.wing === 'both')
    .sort((a, b) => (b.urgent - a.urgent) || b.updatedAt.localeCompare(a.updatedAt));
  const count = k => all.filter(c => groups[k].includes(c.status)).length;

  main.insertAdjacentHTML('beforeend', `
    <p class="hint">${isContractor() ? t('cmpHelpContractor') : t('cmpHelp')}</p>
    ${canRaise() ? `<div class="toolbar"><button class="btn btn-primary" data-new-complaint>+ ${t('cmpNew')}</button></div>` : ''}
    <div class="tabs">${Object.keys(groups).map(k => `<button class="tab ${k === filter ? 'active' : ''}" data-cfilter="${k}">${t('cf_' + k)} <span class="count">${count(k)}</span></button>`).join('')}</div>
    ${myWings().length > 1 ? `<div class="chips-row">${['all', 'A', 'B'].map(w => `<button class="chip-btn ${w === wingFilter ? 'on' : ''}" data-cwing="${w}">${w === 'all' ? t('all') : t('wing') + ' ' + w}</button>`).join('')}</div>` : ''}
    <div class="complaint-list">
      ${shown.length ? shown.map(c => {
        const last = c.replies[c.replies.length - 1];
        return `
        <button class="complaint ${c.urgent ? 'urgent' : ''}" data-open-complaint="${c.id}">
          <span class="between">
            <span class="c-title">${c.urgent ? `<span class="cpill p-urgent">${t('urgent')}</span> ` : ''}${esc(c.title)}</span>
            ${statusPill(c.status)}
          </span>
          <span class="hint">${esc(wingLabel(c.wing))}${c.location ? ' · ' + esc(c.location) : ''}</span>
          ${last ? `<span class="c-last"><strong>${esc(last.name)}:</strong> ${esc(last.text || (last.photos.length ? '📷' : t('cst_' + last.status)))}</span>`
                 : `<span class="c-last muted">${t('cmpNoReply')}</span>`}
          <span class="hint">${esc(c.createdByName)} · ${whenText(c.createdAt)} · 💬 ${c.replies.length}</span>
        </button>`;
      }).join('') : `<div class="card"><p class="hint">${t('cmpNone')}</p></div>`}
    </div>`);

  main.querySelectorAll('[data-cfilter]').forEach(b => b.addEventListener('click', () => { state.filter.complaints = b.dataset.cfilter; render(); }));
  main.querySelectorAll('[data-cwing]').forEach(b => b.addEventListener('click', () => { state.cWing = b.dataset.cwing; render(); }));
  main.querySelectorAll('[data-open-complaint]').forEach(b => b.addEventListener('click', () => openComplaint(b.dataset.openComplaint)));
  const nb = $('[data-new-complaint]', main);
  if (nb) nb.addEventListener('click', openNewComplaint);
}

async function uploadMany(input) {
  const ids = [];
  const files = [...(input ? input.files : [])];
  let i = 0;
  for (const f of files) {
    busy(true, `${t('uploading')} ${++i}/${files.length}`);
    try { ids.push((await uploadFile(f)).id); } catch (err) { toast(errText(err), 'err'); }
  }
  busy(false);
  return ids;
}

function openNewComplaint() {
  const dlg = $('#modal');
  const wings = [...myWings(), ...(myWings().length > 1 ? ['both'] : [])];
  dlg.innerHTML = `
    <form class="modal-card" method="dialog" novalidate>
      <h2>${t('cmpNew')}</h2>
      <label class="field"><span>${t('wing')} *</span>
        <div class="seg seg-switch" role="radiogroup">${wings.map((w, i) => `
          <label class="seg-pick"><input type="radio" name="wing" value="${w}" ${i === 0 ? 'checked' : ''}><span>${esc(wingLabel(w))}</span></label>`).join('')}</div></label>
      <label class="field"><span>${t('cmpTitle')} *</span><input name="title" id="cmp-title" required placeholder="${esc(t('cmpTitlePh'))}"></label>
      <label class="field"><span>${t('cmpWhere')}</span><input name="location" id="cmp-where" placeholder="${esc(t('cmpWherePh'))}"></label>
      <label class="field"><span>${t('cmpDetail')}</span><textarea name="description" id="cmp-desc" rows="3"></textarea></label>
      <label class="field"><span>${t('photos')}</span><input type="file" name="photos" id="cmp-photos" accept="image/*" multiple></label>
      <label class="check"><input type="checkbox" name="urgent" id="cmp-urgent"> ${t('cmpUrgent')}</label>
      <p class="error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('cmpSend')}</button>
      </div>
    </form>`;
  const form = $('form', dlg);
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) { $('.error', form).textContent = t('err_empty_complaint'); return; }
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const photos = await uploadMany(form.elements.photos);
      const rec = await api('POST', '/complaints', {
        wing: form.querySelector('input[name=wing]:checked').value, title,
        location: form.elements.location.value.trim(), description: form.elements.description.value.trim(),
        urgent: form.elements.urgent.checked, photos
      });
      replaceComplaint(rec);
      dlg.close();
      toast(t('cmpSent'));
      state.filter.complaints = 'active';
      render();
    } catch (err) {
      $('.error', form).textContent = errText(err);
      btn.disabled = false;
    }
  });
  dlg.showModal();
}

function openComplaint(id) {
  const c = Store.get('complaints', id);
  if (!c) return;
  const dlg = $('#modal');
  const closer = canClose(c);
  // Status choices that come with a reply
  const choices = closer
    ? [['', t('cs_keep')], ...(c.status === 'closed' ? [['open', '↺ ' + t('cs_reopen')]] : [['closed', '✔ ' + t('cs_close')]])]
    : [['', t('cs_keep')], ['working', '🔧 ' + t('cst_working')], ['fixed', '✅ ' + t('cst_fixed')]];

  dlg.innerHTML = `
    <div class="modal-card complaint-detail">
      <div class="between"><h2>${c.urgent ? `<span class="cpill p-urgent">${t('urgent')}</span> ` : ''}${esc(c.title)}</h2>${statusPill(c.status)}</div>
      <p class="hint">${esc(wingLabel(c.wing))}${c.location ? ' · ' + esc(c.location) : ''}</p>
      ${c.description ? `<p class="c-desc">${esc(c.description)}</p>` : ''}
      ${c.photos.length ? `<div class="thumbs">${c.photos.map(p => `<a class="thumb" href="${fileUrl(p)}" target="_blank" rel="noopener"><img src="${fileUrl(p)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
      <p class="hint">${t('cmpBy')}: ${esc(c.createdByName)} · ${whenText(c.createdAt)}</p>

      <h3>${t('cmpReplies')} (${c.replies.length})</h3>
      <div class="thread">
        ${c.replies.length ? c.replies.map(r => `
          <div class="reply reply-${r.role}">
            <div class="between"><strong>${esc(r.name)} <span class="hint">· ${t('role_' + r.role)}</span></strong><span class="hint">${whenText(r.at)}</span></div>
            ${r.status ? `<div>${statusPill(r.status)}</div>` : ''}
            ${r.text ? `<p>${esc(r.text)}</p>` : ''}
            ${r.photos.length ? `<div class="thumbs">${r.photos.map(p => `<a class="thumb" href="${fileUrl(p)}" target="_blank" rel="noopener"><img src="${fileUrl(p)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
          </div>`).join('') : `<p class="hint">${t('cmpNoReply')}</p>`}
      </div>

      <form class="reply-form" novalidate>
        <label class="field"><span>${closer ? t('cmpYourNote') : t('cmpYourReply')}</span>
          <textarea name="text" id="rp-text" rows="3" placeholder="${esc(closer ? t('cmpNotePh') : t('cmpReplyPh'))}"></textarea></label>
        <label class="field"><span>${t('photos')}</span><input type="file" name="photos" id="rp-photos" accept="image/*" multiple></label>
        <div class="seg seg-switch status-pick" role="radiogroup">${choices.map(([v, l], i) => `
          <label class="seg-pick"><input type="radio" name="status" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <p class="error" role="alert"></p>
        <div class="modal-actions">
          ${isPartner() ? `<button type="button" class="btn btn-danger" data-del-complaint>${t('delete')}</button>` : ''}
          <button type="button" class="btn" data-cancel>${t('close')}</button>
          <button type="submit" class="btn btn-primary">${t('cmpSendReply')}</button>
        </div>
      </form>
    </div>`;

  const form = $('form', dlg);
  $('[data-cancel]', form).addEventListener('click', () => dlg.close());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = form.elements.text.value.trim();
    const status = form.querySelector('input[name=status]:checked').value;
    if (!text && !form.elements.photos.files.length && !status) { $('.error', form).textContent = t('err_empty_reply'); return; }
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const photos = await uploadMany(form.elements.photos);
      replaceComplaint(await api('POST', `/complaints/${c.id}/reply`, { text, photos, status }));
      toast(t('saved'));
      render();
      openComplaint(c.id);
    } catch (err) {
      $('.error', form).textContent = errText(err);
      btn.disabled = false;
    }
  });
  const del = $('[data-del-complaint]', form);
  if (del) del.addEventListener('click', async () => {
    if (!confirm(t('confirmDelete'))) return;
    await api('DELETE', `/complaints/${c.id}`);
    Store.data.complaints = Store.list('complaints').filter(x => x.id !== c.id);
    dlg.close();
    render();
  });
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
