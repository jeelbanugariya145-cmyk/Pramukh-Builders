// Daily site report: supervisors write what was done today (with photos) and what is planned
// for tomorrow; the next day that plan comes back as a done / not-done checklist.

const shiftDay = (s, n) => {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayName = s => new Date(s + 'T12:00:00').toLocaleDateString(LANG === 'gu' ? 'gu-IN' : 'en-IN', { weekday: 'long' });

const reportsOf = userId => Store.list('dailyReports').filter(r => r.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
// The writer's latest earlier report that had a plan for the next day
const prevReport = (userId, date) => reportsOf(userId).filter(r => r.date < date && (r.plan || []).length).pop();
const planDone = r => (r.plan || []).filter(p => p.status === 'done').length;

function renderDaily(main) {
  // Partners mostly read everyone's reports; supervisors mostly write their own
  const views = (isPartner() ? ['all', 'mine'] : [can('daily') && 'mine', can('dailyView') && 'all']).filter(Boolean);
  const v = views.includes(state.dailyView) ? state.dailyView : views[0];
  if (views.length > 1) {
    main.insertAdjacentHTML('beforeend', `<div class="tabs">${views.map(k =>
      `<button class="tab ${k === v ? 'active' : ''}" data-daily-view="${k}">${t('dr_' + k)}</button>`).join('')}</div>`);
    main.querySelectorAll('[data-daily-view]').forEach(b => b.addEventListener('click', () => { state.dailyView = b.dataset.dailyView; render(); }));
  }
  const body = document.createElement('div');
  body.className = 'daily';
  main.appendChild(body);
  if (v === 'mine') renderMyDaily(body); else renderAllDaily(body);
}

const dateBar = (date, id) => `
  <div class="datebar">
    <button class="btn" data-shift="-1" aria-label="${t('dr_prevDay')}">‹</button>
    <input type="date" id="${id}" value="${date}" max="${today()}" aria-label="${t('date')}">
    <button class="btn" data-shift="1" aria-label="${t('dr_nextDay')}" ${date >= today() ? 'disabled' : ''}>›</button>
  </div>
  <div class="today-tag">${date === today() ? t('dr_today') + ' · ' : ''}${dayName(date)}</div>`;

function bindDateBar(el, key) {
  el.querySelectorAll('[data-shift]').forEach(b => b.addEventListener('click', () => {
    state[key] = shiftDay(state[key] || today(), Number(b.dataset.shift));
    render();
  }));
  $('input[type=date]', el).addEventListener('change', e => {
    if (e.target.value) { state[key] = e.target.value > today() ? today() : e.target.value; render(); }
  });
}

const photoThumbs = ids => (ids || []).map(id =>
  `<a class="thumb" href="${fileUrl(id)}" target="_blank" rel="noopener"><img src="${fileUrl(id)}" alt="" loading="lazy"></a>`).join('');

// ---------- Supervisor: my report ----------
function renderMyDaily(el) {
  const date = state.myDay || today();
  const me = Store.me.id;
  const id = `${date}_${me}`;
  const saved = Store.get('dailyReports', id);
  if (!state.draft || state.draft.id !== id) {
    state.draft = {
      id, workDone: saved ? saved.workDone : '', workers: saved ? saved.workers : '',
      wing: saved ? saved.wing : (myWings().length === 1 ? myWings()[0] : 'both'),
      photos: saved ? [...saved.photos] : [], plan: saved ? saved.plan.map(p => ({ ...p })) : []
    };
  }
  const dr = state.draft;
  const prev = prevReport(me, date);
  const inDraft = text => dr.plan.some(p => p.text === text);
  const isToday = date === today();

  el.innerHTML = `
    ${dateBar(date, 'my-day')}
    <section class="card">
      <div class="between"><h2>${t('dr_yesterdayPlan')}</h2>${prev ? `<span class="num">${planDone(prev)}/${prev.plan.length} ${t('dr_doneShort')}</span>` : ''}</div>
      ${prev ? `
        <p class="hint">${t('dr_fromReport').replace('{d}', fmtDate(prev.date))}</p>
        <div class="progress"><i style="width:${Math.round(planDone(prev) / prev.plan.length * 100)}%"></i></div>
        <div>${prev.plan.map(p => `
          <div class="check-row ${p.status}">
            <span class="t">${esc(p.text)}</span>
            <div class="mark" role="group" aria-label="${esc(p.text)}">
              <button class="y ${p.status === 'done' ? 'on' : ''}" data-mark="${p.id}" data-v="done">✓ ${t('dr_done')}</button>
              <button class="n ${p.status === 'notdone' ? 'on' : ''}" data-mark="${p.id}" data-v="notdone">✕ ${t('dr_notDone')}</button>
            </div>
            ${p.status === 'notdone' && !inDraft(p.text) ? `<button class="btn btn-small carry" data-carry="${p.id}">↪ ${t('dr_carry')}</button>` : ''}
          </div>`).join('')}</div>`
      : `<p class="hint">${t('dr_noPrev')}</p>`}
    </section>

    <section class="card">
      <h2>${isToday ? t('dr_todayWork') : t('dr_dayWork').replace('{d}', fmtDate(date))}</h2>
      ${myWings().length > 1 ? `<div class="seg seg-switch" role="radiogroup" aria-label="${t('wing')}">${[...myWings(), 'both'].map(w => `
        <label class="seg-pick"><input type="radio" name="dr-wing" value="${w}" ${dr.wing === w ? 'checked' : ''}><span>${esc(wingLabel(w))}</span></label>`).join('')}</div>`
      : `<span class="hint">${esc(wingLabel(dr.wing))}</span>`}
      <textarea id="dr-work" rows="4" placeholder="${esc(t('dr_workPh'))}">${esc(dr.workDone)}</textarea>
      <div class="photos">
        ${dr.photos.map(pid => `<div class="photo"><a href="${fileUrl(pid)}" target="_blank" rel="noopener"><img src="${fileUrl(pid)}" alt="" loading="lazy"></a>
          <button class="x" data-rm-photo="${pid}" aria-label="${t('delete')}">×</button></div>`).join('')}
        <label class="add-photo">📷<br>${t('dr_addPhoto')}<input type="file" id="dr-photos" accept="image/*" multiple hidden></label>
      </div>
      <label class="field"><span>${t('dr_workers')}</span>
        <input type="number" id="dr-workers" min="0" inputmode="numeric" value="${esc(dr.workers)}"></label>
    </section>

    <section class="card">
      <h2>${isToday ? t('dr_tomorrow') : t('dr_nextDayPlan')}</h2>
      <div>${dr.plan.length ? dr.plan.map((p, i) => `
        <div class="plan-item"><span>${i + 1}.</span><span>${esc(p.text)}</span>
          <button class="rm" data-rm-plan="${i}" aria-label="${t('delete')}">×</button></div>`).join('')
        : `<p class="hint">${t('dr_planHelp')}</p>`}</div>
      <div class="add-row">
        <input id="dr-plan-text" placeholder="${esc(t('dr_planPh'))}" enterkeyhint="done">
        <button class="btn btn-primary" data-add-plan>${t('dr_add')}</button>
      </div>
      <div class="saved-note" id="dr-saved" aria-live="polite"></div>
    </section>

    <section class="card">
      <h2>${t('dr_history')}</h2>
      ${reportsOf(me).length ? `<div class="history">${reportsOf(me).slice().reverse().slice(0, 30).map(r => `
        <button class="hist" data-open-day="${r.date}">
          <span class="d">${fmtDate(r.date)} · ${dayName(r.date)}</span>
          <span class="hint">${r.photos.length ? '📷 ' + r.photos.length : ''}${r.plan.length ? ` · ${t('dr_planShort')} ${planDone(r)}/${r.plan.length}` : ''}</span>
          <span class="s">${esc(r.workDone || '—')}</span></button>`).join('')}</div>` : `<p class="hint">${t('noData')}</p>`}
    </section>`;

  bindDateBar(el, 'myDay');

  const saveDraft = async () => {
    try {
      const rec = await api('POST', '/daily/save', { date, wing: dr.wing, workDone: dr.workDone, workers: dr.workers, photos: dr.photos, plan: dr.plan });
      Store.merge('dailyReports', [rec]);
      const s = $('#dr-saved');
      if (s) s.textContent = `${t('saved')} ${new Date().toLocaleTimeString(LANG === 'gu' ? 'gu-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (err) {
      toast(errText(err), 'err');
    }
  };

  el.querySelectorAll('input[name=dr-wing]').forEach(r => r.addEventListener('change', () => { dr.wing = r.value; saveDraft(); }));

  // Text saves when you leave the box
  $('#dr-work', el).addEventListener('input', e => { dr.workDone = e.target.value; });
  $('#dr-work', el).addEventListener('change', saveDraft);
  $('#dr-workers', el).addEventListener('input', e => { dr.workers = e.target.value; });
  $('#dr-workers', el).addEventListener('change', saveDraft);

  $('#dr-photos', el).addEventListener('change', async e => {
    const files = [...e.target.files];
    let i = 0;
    for (const f of files) {
      busy(true, `${t('uploading')} ${++i}/${files.length}`);
      try { dr.photos.push((await uploadFile(f)).id); } catch (err) { toast(errText(err), 'err'); }
    }
    busy(false);
    await saveDraft();
    render();
  });
  el.querySelectorAll('[data-rm-photo]').forEach(b => b.addEventListener('click', async () => {
    dr.photos = dr.photos.filter(x => x !== b.dataset.rmPhoto);
    await saveDraft();
    render();
  }));

  const addPlan = async () => {
    const inp = $('#dr-plan-text', el);
    const text = inp.value.trim();
    if (!text) { inp.focus(); return; }
    dr.plan.push({ id: Date.now().toString(36), text, status: '' });
    await saveDraft();
    render();
    const again = $('#dr-plan-text');
    if (again) again.focus();
  };
  $('[data-add-plan]', el).addEventListener('click', addPlan);
  $('#dr-plan-text', el).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addPlan(); } });
  el.querySelectorAll('[data-rm-plan]').forEach(b => b.addEventListener('click', async () => {
    dr.plan.splice(Number(b.dataset.rmPlan), 1);
    await saveDraft();
    render();
  }));

  // Tick yesterday's plan: done / not done (tap again to clear)
  el.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', async () => {
    const item = prev.plan.find(p => p.id === b.dataset.mark);
    try {
      const rec = await api('POST', '/daily/check', { reportId: prev.id, itemId: item.id, status: item.status === b.dataset.v ? '' : b.dataset.v });
      Store.merge('dailyReports', [rec]);
      render();
    } catch (err) {
      toast(errText(err), 'err');
    }
  }));
  el.querySelectorAll('[data-carry]').forEach(b => b.addEventListener('click', async () => {
    const item = prev.plan.find(p => p.id === b.dataset.carry);
    dr.plan.push({ id: Date.now().toString(36), text: item.text, status: '' });
    await saveDraft();
    render();
  }));
  el.querySelectorAll('[data-open-day]').forEach(b => b.addEventListener('click', () => {
    state.myDay = b.dataset.openDay;
    render();
    window.scrollTo(0, 0);
  }));
}

// ---------- Partners and viewers: everyone's reports for a day ----------
function renderAllDaily(el) {
  const date = state.allDay || today();
  const wf = state.dWing || 'all';
  const reports = Store.list('dailyReports')
    .filter(r => r.date === date && (wf === 'all' || r.wing === wf || r.wing === 'both'))
    .sort((a, b) => (a.wing || '').localeCompare(b.wing || '') || a.userName.localeCompare(b.userName));
  const recentDays = [...new Set(Store.list('dailyReports').map(r => r.date))].sort().reverse().slice(0, 14);

  el.innerHTML = `
    ${dateBar(date, 'all-day')}
    ${myWings().length > 1 ? `<div class="chips-row">${['all', 'A', 'B'].map(w => `<button class="chip-btn ${w === wf ? 'on' : ''}" data-dwing="${w}">${w === 'all' ? t('all') : t('wing') + ' ' + w}</button>`).join('')}</div>` : ''}
    ${reports.length ? reports.map(r => {
      const prev = prevReport(r.userId, r.date);
      return `
      <section class="card report">
        <div class="between"><h2>👷 ${esc(r.userName)} <span class="cpill p-wing">${esc(wingLabel(r.wing || 'both'))}</span></h2>${r.workers !== '' ? `<span class="hint">${t('dr_workersShort')}: <strong>${r.workers}</strong></span>` : ''}</div>
        ${prev ? `
          <div class="report-check">
            <div class="between"><strong>${t('dr_yesterdayPlan')}</strong><span class="num">${planDone(prev)}/${prev.plan.length} ${t('dr_doneShort')}</span></div>
            <div class="progress"><i style="width:${Math.round(planDone(prev) / prev.plan.length * 100)}%"></i></div>
            <ul class="plan-list">${prev.plan.map(p => `<li class="${p.status || 'unchecked'}">${p.status === 'done' ? '✓' : p.status === 'notdone' ? '✕' : '○'} ${esc(p.text)}</li>`).join('')}</ul>
          </div>` : ''}
        <h3>${t('dr_workDoneShort')}</h3>
        <p class="report-text">${esc(r.workDone || '—')}</p>
        ${r.photos.length ? `<div class="thumbs">${photoThumbs(r.photos)}</div>` : ''}
        ${r.plan.length ? `<h3>${t('dr_tomorrow')}</h3><ul class="plan-list">${r.plan.map(p => `<li>${esc(p.text)}</li>`).join('')}</ul>` : ''}
      </section>`;
    }).join('') : `<div class="card"><p class="hint">${t('dr_noneForDay')}</p></div>`}
    ${recentDays.length ? `
    <section class="card">
      <h2>${t('dr_recent')}</h2>
      <div class="chips">${recentDays.map(d => `<button class="chip-btn ${d === date ? 'on' : ''}" data-open-day="${d}">${fmtDate(d)} <span>${Store.list('dailyReports').filter(r => r.date === d).length}</span></button>`).join('')}</div>
    </section>` : ''}`;

  bindDateBar(el, 'allDay');
  el.querySelectorAll('[data-dwing]').forEach(b => b.addEventListener('click', () => { state.dWing = b.dataset.dwing; render(); }));
  el.querySelectorAll('[data-open-day]').forEach(b => b.addEventListener('click', () => { state.allDay = b.dataset.openDay; render(); }));
}
