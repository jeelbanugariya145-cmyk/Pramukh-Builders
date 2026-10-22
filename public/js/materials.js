// Material bills: read from photo, monthly totals by supplier, match payments from a bank statement

function busy(on, msg) {
  let el = $('#busy');
  if (!on) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'busy';
    el.className = 'busy';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="busy-box"><span class="spinner"></span><span>${esc(msg)}</span></div>`;
}

// Photo -> upload -> Claude reads it -> bill form opens already filled in, to check and save
async function billFromPhoto(file) {
  if (!file) return;
  busy(true, t('uploading'));
  let uploaded;
  try {
    uploaded = await uploadFile(file);
  } catch (err) {
    busy(false);
    toast(errText(err), 'err');
    return;
  }
  const defaults = { photo: uploaded.id };
  if (Store.ai) {
    busy(true, t('readingBill'));
    try {
      const r = await api('POST', '/ai/bill', { fileId: uploaded.id });
      if (r.readable === false) {
        toast(t('billUnreadable'), 'err');
      } else {
        Object.assign(defaults, {
          supplier: r.supplier,
          billNo: r.billNo,
          date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : today(),
          gst: r.gst || '',
          amount: r.total || sum(r.items, i => i.amount),
          itemsText: r.items.map(i => `${i.name} — ${i.qty} ${i.unit} × ${i.rate} = ${i.amount}`).join('\n')
        });
        // A bill that matches one already saved is probably a second photo of the same bill
        const dup = Store.list('bills').find(b => b.billNo && b.billNo === defaults.billNo &&
          (b.supplier || '').trim().toLowerCase() === (defaults.supplier || '').trim().toLowerCase());
        toast(dup ? t('billDuplicate') : t('billRead'), dup ? 'err' : 'ok');
      }
    } catch (err) {
      toast(errText(err), 'err');
    }
  }
  busy(false);
  openForm('bills', null, defaults);
}

// ---------- Monthly summary ----------
function renderMonthly(container) {
  const months = [...new Set([thisMonth(), ...Store.list('bills').map(b => (b.date || '').slice(0, 7)).filter(Boolean)])].sort().reverse();
  const ym = months.includes(state.month) ? state.month : months[0];
  const bills = Calc.monthBills(ym);
  const total = sum(bills, b => b.amount);
  const paid = sum(bills.filter(Calc.billPaid), b => b.amount);

  const bySupplier = {};
  bills.forEach(b => {
    const k = (b.supplier || '—').trim();
    bySupplier[k] = bySupplier[k] || { supplier: k, bills: [], total: 0, paid: 0 };
    bySupplier[k].bills.push(b);
    bySupplier[k].total += Number(b.amount) || 0;
    if (Calc.billPaid(b)) bySupplier[k].paid += Number(b.amount) || 0;
  });
  const rows = Object.values(bySupplier).sort((a, b) => (b.total - b.paid) - (a.total - a.paid) || b.total - a.total);
  const editable = can('materials');

  container.innerHTML = `
    <div class="toolbar">
      <label class="inline">${t('month')}
        <select id="month">${months.map(m => `<option value="${m}" ${m === ym ? 'selected' : ''}>${fmtMonth(m)}</option>`).join('')}</select>
      </label>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-label">${t('m_total')}</span><span class="stat-value">${money(total)}</span></div>
      <div class="stat good"><span class="stat-label">${t('m_paid')}</span><span class="stat-value">${money(paid)}</span></div>
      <div class="stat ${total - paid ? 'warn' : 'good'}"><span class="stat-label">${t('m_pending')}</span><span class="stat-value">${money(total - paid)}</span></div>
      <div class="stat"><span class="stat-label">${t('bills')}</span><span class="stat-value">${bills.length}</span></div>
    </div>
    ${rows.length ? rows.map(r => {
      const due = r.total - r.paid;
      return `
      <section class="card supplier-card">
        <div class="supplier-head">
          <div>
            <h3>${esc(r.supplier)}</h3>
            <span class="hint">${r.bills.length} ${t('bills')} · ${t('m_total')} ${money(r.total)}</span>
          </div>
          <div class="supplier-due">
            ${due > 0 ? `<span class="badge badge-ch-pending">${t('m_pending')}: ${money(due)}</span>` : `<span class="badge badge-available">✓ ${t('m_allPaid')}</span>`}
            ${editable && due > 0 ? `<button class="btn btn-small btn-accent" data-pay-all="${esc(r.supplier)}">✓ ${t('m_markAllPaid')}</button>` : ''}
          </div>
        </div>
        <ul class="bill-lines">
          ${r.bills.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(b => `
            <li>
              <label class="check">
                <input type="checkbox" data-pay="${b.id}" ${Calc.billPaid(b) ? 'checked' : ''} ${editable ? '' : 'disabled'}>
                <span>${fmtDate(b.date)}${b.billNo ? ' · #' + esc(b.billNo) : ''}</span>
              </label>
              <span class="num">${money(b.amount)}</span>
              ${b.photo ? `<a href="${fileUrl(b.photo)}" target="_blank" rel="noopener">📎</a>` : '<span></span>'}
            </li>`).join('')}
        </ul>
      </section>`;
    }).join('') : `<div class="card"><p class="hint">${t('noData')}</p></div>`}`;

  $('#month', container).addEventListener('change', e => { state.month = e.target.value; render(); });
  container.querySelectorAll('[data-pay]').forEach(cb => cb.addEventListener('change', async () => {
    await payBills([{ id: cb.dataset.pay, paid: cb.checked, paidDate: today(), paidMode: 'bank' }]);
    render();
  }));
  container.querySelectorAll('[data-pay-all]').forEach(btn => btn.addEventListener('click', async () => {
    const r = bySupplier[btn.dataset.payAll];
    await payBills(r.bills.filter(b => !Calc.billPaid(b)).map(b => ({ id: b.id, paid: true, paidDate: today(), paidMode: 'bank' })));
    render();
  }));
}

// ---------- Bank statement matching ----------

// Reads a CSV statement exported from net banking (columns found by their header names)
function parseStatementCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const split = line => {
    const out = [];
    let cur = '', quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const headerIdx = lines.findIndex(l => /date/i.test(l) && /(debit|withdraw|dr)/i.test(l));
  if (headerIdx < 0) return null;
  const head = split(lines[headerIdx]).map(h => h.toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const iDate = col(/date/);
  const iDesc = col(/narration|description|particular|remark|details/);
  const iDebit = col(/debit|withdraw|^dr/);
  const iCredit = col(/credit|deposit|^cr/);
  const num = s => Number(String(s || '').replace(/[^\d.]/g, '')) || 0;
  return lines.slice(headerIdx + 1).map(split).map(c => ({
    date: toIsoDate(c[iDate]),
    description: iDesc >= 0 ? c[iDesc] : '',
    debit: num(c[iDebit]),
    credit: iCredit >= 0 ? num(c[iCredit]) : 0
  })).filter(x => x.date && (x.debit || x.credit));
}

// Accepts 31/01/2026, 31-01-26, 2026-01-31, 31 Jan 2026
function toIsoDate(s) {
  s = String(s || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

// Pairs each payment out of the bank with an unpaid bill of the same amount,
// preferring bills whose supplier name appears in the bank narration
function matchPayments(txns) {
  const words = s => String(s || '').toLowerCase().split(/[^a-z0-9઀-૿]+/).filter(w => w.length > 2);
  const open = Store.list('bills').filter(b => !Calc.billPaid(b));
  const used = new Set();
  const matches = [];
  const unmatched = [];
  txns.filter(x => x.debit > 0).forEach(x => {
    const narration = String(x.description || '').toLowerCase();
    const candidates = open
      .filter(b => !used.has(b.id) && Math.abs((Number(b.amount) || 0) - x.debit) <= 1 && (!b.date || !x.date || b.date <= x.date))
      .map(b => ({ b, score: words(b.supplier).filter(w => narration.includes(w)).length }))
      .sort((a, z) => z.score - a.score || (a.b.date || '').localeCompare(z.b.date || ''));
    if (candidates.length) {
      used.add(candidates[0].b.id);
      matches.push({ txn: x, bill: candidates[0].b, sure: candidates[0].score > 0 || candidates.length === 1 });
    } else {
      unmatched.push(x);
    }
  });
  return { matches, unmatched };
}

function renderBankMatch(container) {
  const result = state.bankResult;
  container.innerHTML = `
    <section class="card">
      <h2>${t('bank_title')}</h2>
      <p class="hint">${t('bank_help')}${Store.ai ? ' ' + t('bank_helpAi') : ''}</p>
      <label class="btn btn-primary file-btn">📄 ${t('bank_upload')}
        <input type="file" id="statement" accept=".csv,text/csv${Store.ai ? ',application/pdf,image/*' : ''}" hidden></label>
    </section>
    ${result ? `
    <section class="card">
      <h2 class="section-title"><span>${t('bank_found')} (${result.matches.length})</span></h2>
      ${result.matches.length ? `
      <div class="table-wrap"><table class="table">
        <thead><tr><th></th><th>${t('bank_txn')}</th><th>${t('supplier')}</th><th class="num">${t('amount')}</th></tr></thead>
        <tbody>${result.matches.map((m, i) => `<tr class="${m.sure ? '' : 'row-unsure'}">
          <td><input type="checkbox" data-match="${i}" ${m.sure ? 'checked' : ''} aria-label="${esc(t('markPaid'))}"></td>
          <td data-label="${esc(t('bank_txn'))}">${fmtDate(m.txn.date)}<div class="hint clamp">${esc(m.txn.description)}</div></td>
          <td data-label="${esc(t('supplier'))}"><strong>${esc(m.bill.supplier)}</strong><div class="hint">${fmtDate(m.bill.date)}${m.bill.billNo ? ' · #' + esc(m.bill.billNo) : ''}${m.sure ? '' : ' · ' + t('bank_check')}</div></td>
          <td class="num" data-label="${esc(t('amount'))}">${money(m.bill.amount)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="toolbar"><button class="btn btn-primary" id="confirm-matches">✓ ${t('bank_confirm')}</button></div>` : `<p class="hint">${t('bank_none')}</p>`}
    </section>
    ${result.unmatched.length ? `
    <section class="card">
      <h2 class="section-title"><span>${t('bank_unmatched')} (${result.unmatched.length})</span></h2>
      <p class="hint">${t('bank_unmatchedHelp')}</p>
      <ul class="bill-lines">${result.unmatched.map(x => `<li><span>${fmtDate(x.date)} · ${esc(x.description)}</span><span class="num">${money(x.debit)}</span><span></span></li>`).join('')}</ul>
    </section>` : ''}` : ''}`;

  $('#statement', container).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    let txns = null;
    try {
      if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
        txns = parseStatementCsv(await file.text());
        if (!txns) throw new Error('bad_statement');
      } else {
        busy(true, t('uploading'));
        const up = await uploadFile(file);
        busy(true, t('readingStatement'));
        txns = (await api('POST', '/ai/statement', { fileId: up.id })).transactions;
      }
      state.bankResult = matchPayments(txns);
      toast(t('bank_read').replace('{n}', txns.length));
    } catch (err) {
      toast(errText(err), 'err');
    }
    busy(false);
    render();
  });

  const confirmBtn = $('#confirm-matches', container);
  if (confirmBtn) confirmBtn.addEventListener('click', async () => {
    const items = [...container.querySelectorAll('[data-match]:checked')].map(cb => {
      const m = result.matches[cb.dataset.match];
      return { id: m.bill.id, paid: true, paidDate: m.txn.date, paidMode: 'bank', paidRef: m.txn.description };
    });
    if (!items.length) return;
    await payBills(items);
    state.bankResult = null;
    state.tab.materials = 'monthly';
    render();
  });
}
