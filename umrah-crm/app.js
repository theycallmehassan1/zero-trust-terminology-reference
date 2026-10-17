/* Umrah Agency CRM — single-page app, all data stored in the browser (localStorage). */
'use strict';

const KEY = 'umrahcrm.v1';
const STAGES = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'];
const SOURCES = ['Facebook', 'WhatsApp', 'Walk-in', 'Referral', 'Instagram', 'Website', 'Google', 'Other'];
const VISA = ['Docs Pending', 'Docs Received', 'Submitted', 'Approved', 'Rejected'];
const BSTATUS = ['Tentative', 'Confirmed', 'Travelled', 'Completed', 'Cancelled'];
const ROOMS = ['Quad', 'Triple', 'Double'];
const DOCS = ['Passport', 'CNIC', 'Photos', 'Vaccination', 'Mahram Proof', 'Ticket'];
const CATEGORIES = ['Economy', 'Standard', 'Premium', 'VIP', 'Ramadan', 'Family'];
const EXPENSE_CATS = ['Visa Fee', 'Air Ticket', 'Hotel', 'Transport', 'Marketing', 'Salary', 'Office Rent', 'Utilities', 'Other'];
const METHODS = ['Cash', 'Bank Transfer', 'JazzCash', 'Easypaisa', 'Cheque', 'Card'];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d || today()); x.setDate(x.getDate() + Number(n || 0)); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = n => {
  const cur = (db && db.settings.currency) || 'PKR';
  return cur + ' ' + Math.round(Number(n) || 0).toLocaleString('en-US');
};
const sum = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
const digits = p => String(p || '').replace(/\D/g, '').replace(/^0/, '92');
const waLink = (phone, text) => `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text || '')}`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------- storage ---------- */
let db;
function emptyDb() {
  return {
    settings: { agencyName: 'Al-Noor Travels', phone: '0300-0000000', email: '', address: 'Lahore, Pakistan', license: '', currency: 'PKR', invoiceNote: 'Thank you for choosing us. May Allah accept your Umrah.' },
    leads: [], customers: [], packages: [], bookings: [], agents: [], expenses: [], activity: [], seq: 0,
  };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.settings) return Object.assign(emptyDb(), d);
  } catch (e) { /* fall through to seed */ }
  return seed();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save — storage unavailable'); }
}
function log(text) {
  db.activity.unshift({ id: uid(), at: new Date().toISOString(), text });
  db.activity = db.activity.slice(0, 200);
}

/* ---------- lookups & computed ---------- */
const byId = (col, id) => db[col].find(x => x.id === id);
const pkgName = id => (byId('packages', id) || {}).name || '—';
const custName = id => (byId('customers', id) || {}).name || '—';
const agentName = id => (byId('agents', id) || {}).name || 'Direct';
const paidOf = b => sum(b.payments || [], p => p.amount);
const totalOf = b => (Number(b.pricePerPax) || 0) * (Number(b.pax) || 0) - (Number(b.discount) || 0);
const balanceOf = b => totalOf(b) - paidOf(b);
const costOf = b => ((byId('packages', b.packageId) || {}).costPerPax || 0) * (Number(b.pax) || 0);
const activeBookings = () => db.bookings.filter(b => b.status !== 'Cancelled');
const seatsBooked = pkgId => sum(activeBookings().filter(b => b.packageId === pkgId), b => b.pax);
const priceFor = (pkg, room) => pkg ? Number(pkg['price' + room]) || Number(pkg.priceQuad) || 0 : 0;

function badge(text, kind) {
  const map = {
    New: 'info', Contacted: 'primary', Quoted: 'warn', Negotiation: 'warn', Won: 'ok', Lost: 'danger',
    'Docs Pending': 'danger', 'Docs Received': 'warn', Submitted: 'info', Approved: 'ok', Rejected: 'danger',
    Tentative: 'warn', Confirmed: 'primary', Travelled: 'info', Completed: 'ok', Cancelled: 'danger',
    Issued: 'ok', 'Not Issued': 'warn', Paid: 'ok', Partial: 'warn', Unpaid: 'danger', Yes: 'ok', No: '',
  };
  return `<span class="badge ${kind || map[text] || ''}">${esc(text)}</span>`;
}
function payBadge(b) {
  const paid = paidOf(b), total = totalOf(b);
  if (paid <= 0) return badge('Unpaid');
  if (paid >= total) return badge('Paid');
  return badge('Partial');
}

/* Problems with a pilgrim for a specific travel date (passport validity, documents). */
function pilgrimIssues(c, departDate) {
  const issues = [];
  if (!c) return issues;
  if (!c.passportNo) issues.push('No passport number');
  if (c.passportExpiry && departDate && daysBetween(departDate, c.passportExpiry) < 180)
    issues.push('Passport expires within 6 months of travel (' + fmtDate(c.passportExpiry) + ')');
  const missing = DOCS.filter(d => d !== 'Mahram Proof' && d !== 'Ticket' && !(c.docs || []).includes(d));
  if (c.gender === 'Female' && !c.mahram) issues.push('Female pilgrim — mahram not recorded');
  if (missing.length) issues.push('Missing docs: ' + missing.join(', '));
  return issues;
}

/* ---------- modal & forms ---------- */
function openModal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }

/* Field spec: {k, label, type, options, full, req, help} */
function fieldHtml(f, v) {
  const opts = typeof f.options === 'function' ? f.options() : (f.options || []);
  const norm = opts.map(o => typeof o === 'object' ? o : { v: o, l: o });
  const id = 'f_' + f.k;
  let input;
  switch (f.type) {
    case 'select':
      input = `<select id="${id}" name="${f.k}">${f.blank ? `<option value="">${esc(f.blank)}</option>` : ''}${norm.map(o => `<option value="${esc(o.v)}" ${String(v ?? '') === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
      break;
    case 'multi':
      input = `<select id="${id}" name="${f.k}" multiple>${norm.map(o => `<option value="${esc(o.v)}" ${(v || []).includes(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
      break;
    case 'checks':
      input = `<div class="checks">${norm.map(o => `<label><input type="checkbox" name="${f.k}" value="${esc(o.v)}" ${(v || []).includes(o.v) ? 'checked' : ''}> ${esc(o.l)}</label>`).join('')}</div>`;
      break;
    case 'textarea':
      input = `<textarea id="${id}" name="${f.k}">${esc(v)}</textarea>`;
      break;
    default:
      input = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="any"' : ''}>`;
  }
  return `<div class="field ${f.full || f.type === 'textarea' || f.type === 'checks' ? 'full' : ''}"><label for="${id}">${esc(f.label)}${f.req ? ' *' : ''}</label>${input}${f.help ? `<small class="muted">${esc(f.help)}</small>` : ''}</div>`;
}

function openForm({ title, fields, value = {}, onSave, extra = '' }) {
  openModal(title, `<form id="crudForm"><div class="form-grid">${fields.map(f => fieldHtml(f, value[f.k])).join('')}</div>${extra}
    <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`);
  const form = $('#crudForm');
  form.querySelector('[data-close]').onclick = closeModal;
  form.onsubmit = e => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      if (f.type === 'checks') out[f.k] = $$(`input[name="${f.k}"]:checked`, form).map(i => i.value);
      else if (f.type === 'multi') out[f.k] = [...form.elements[f.k].selectedOptions].map(o => o.value);
      else if (f.type === 'number') out[f.k] = form.elements[f.k].value === '' ? '' : Number(form.elements[f.k].value);
      else out[f.k] = form.elements[f.k].value.trim();
      if (f.req && (out[f.k] === '' || (Array.isArray(out[f.k]) && !out[f.k].length))) { toast(f.label + ' is required'); return; }
    }
    if (onSave(out) !== false) { save(); closeModal(); render(); }
  };
  return form;
}

function upsert(col, value, existing, label) {
  if (existing) { Object.assign(existing, value); log(`Updated ${label}: ${value.name || existing.name || existing.ref || ''}`); return existing; }
  const rec = Object.assign({ id: uid(), createdAt: today() }, value);
  db[col].push(rec);
  log(`Added ${label}: ${rec.name || rec.ref || ''}`);
  return rec;
}
function remove(col, id, label) {
  if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
  db[col] = db[col].filter(x => x.id !== id);
  log(`Deleted ${label}`);
  save(); closeModal(); render();
}

/* ---------- field schemas ---------- */
const F = {
  lead: () => [
    { k: 'name', label: 'Name', req: true },
    { k: 'phone', label: 'Phone / WhatsApp', type: 'tel', req: true },
    { k: 'city', label: 'City' },
    { k: 'source', label: 'Source', type: 'select', options: SOURCES },
    { k: 'status', label: 'Stage', type: 'select', options: STAGES },
    { k: 'packageId', label: 'Interested Package', type: 'select', blank: '— not decided —', options: () => db.packages.map(p => ({ v: p.id, l: p.name })) },
    { k: 'pax', label: 'No. of Pilgrims', type: 'number' },
    { k: 'budget', label: 'Budget per person', type: 'number' },
    { k: 'travelMonth', label: 'Preferred Travel Date', type: 'date' },
    { k: 'followUp', label: 'Next Follow-up', type: 'date' },
    { k: 'agentId', label: 'Assigned / Sub-Agent', type: 'select', blank: 'Direct', options: () => db.agents.map(a => ({ v: a.id, l: a.name })) },
    { k: 'notes', label: 'Notes / Conversation', type: 'textarea' },
  ],
  customer: () => [
    { k: 'name', label: 'Full Name (as on passport)', req: true },
    { k: 'fatherName', label: 'Father / Husband Name' },
    { k: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
    { k: 'dob', label: 'Date of Birth', type: 'date' },
    { k: 'phone', label: 'Phone / WhatsApp', type: 'tel', req: true },
    { k: 'cnic', label: 'CNIC', help: '35202-1234567-1' },
    { k: 'city', label: 'City' },
    { k: 'passportNo', label: 'Passport No.' },
    { k: 'passportExpiry', label: 'Passport Expiry', type: 'date' },
    { k: 'mahram', label: 'Mahram (name & relation)' },
    { k: 'emergency', label: 'Emergency Contact' },
    { k: 'docs', label: 'Documents Received', type: 'checks', options: DOCS },
    { k: 'notes', label: 'Notes (medical, special needs…)', type: 'textarea' },
  ],
  pkg: () => [
    { k: 'name', label: 'Package Name', req: true, full: true },
    { k: 'category', label: 'Category', type: 'select', options: CATEGORIES },
    { k: 'days', label: 'Total Days', type: 'number', req: true },
    { k: 'departure', label: 'Departure Date', type: 'date' },
    { k: 'airline', label: 'Airline / Route', help: 'e.g. PIA LHE-JED' },
    { k: 'makkahHotel', label: 'Makkah Hotel' },
    { k: 'makkahNights', label: 'Makkah Nights', type: 'number' },
    { k: 'makkahDistance', label: 'Distance from Haram' },
    { k: 'madinahHotel', label: 'Madinah Hotel' },
    { k: 'madinahNights', label: 'Madinah Nights', type: 'number' },
    { k: 'transport', label: 'Transport', help: 'e.g. Private bus / GMC' },
    { k: 'seats', label: 'Total Seats', type: 'number' },
    { k: 'costPerPax', label: 'Our Cost per Pilgrim', type: 'number', help: 'Used for profit report' },
    { k: 'priceQuad', label: 'Sale Price — Quad', type: 'number', req: true },
    { k: 'priceTriple', label: 'Sale Price — Triple', type: 'number' },
    { k: 'priceDouble', label: 'Sale Price — Double', type: 'number' },
    { k: 'includes', label: 'Includes', type: 'checks', options: ['Visa', 'Air Ticket', 'Hotels', 'Transport', 'Ziyarat', 'Meals', 'Insurance', 'Guide'] },
    { k: 'active', label: 'Status', type: 'select', options: ['Active', 'Closed'] },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],
  booking: () => [
    { k: 'customerIds', label: 'Pilgrims (Ctrl/Cmd-click for several)', type: 'multi', req: true, full: true, options: () => db.customers.map(c => ({ v: c.id, l: `${c.name} — ${c.phone || ''} ${c.passportNo ? '· ' + c.passportNo : ''}` })) },
    { k: 'packageId', label: 'Package', type: 'select', req: true, options: () => db.packages.map(p => ({ v: p.id, l: `${p.name} (${p.days}d)` })) },
    { k: 'roomType', label: 'Room Sharing', type: 'select', options: ROOMS },
    { k: 'pax', label: 'No. of Pax', type: 'number', help: 'Blank = number of pilgrims selected' },
    { k: 'pricePerPax', label: 'Price per Pax', type: 'number', help: 'Blank = package price for room type' },
    { k: 'discount', label: 'Discount (total)', type: 'number' },
    { k: 'departDate', label: 'Departure', type: 'date', help: 'Blank = package departure' },
    { k: 'returnDate', label: 'Return', type: 'date', help: 'Blank = departure + package days' },
    { k: 'status', label: 'Booking Status', type: 'select', options: BSTATUS },
    { k: 'visaStatus', label: 'Visa Status', type: 'select', options: VISA },
    { k: 'ticketStatus', label: 'Ticket', type: 'select', options: ['Not Issued', 'Issued'] },
    { k: 'pnr', label: 'PNR / Group Ref' },
    { k: 'agentId', label: 'Sub-Agent', type: 'select', blank: 'Direct', options: () => db.agents.map(a => ({ v: a.id, l: a.name })) },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],
  agent: () => [
    { k: 'name', label: 'Agent / Company', req: true },
    { k: 'phone', label: 'Phone', type: 'tel' },
    { k: 'city', label: 'City' },
    { k: 'commission', label: 'Commission %', type: 'number' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],
  expense: () => [
    { k: 'date', label: 'Date', type: 'date', req: true },
    { k: 'category', label: 'Category', type: 'select', options: EXPENSE_CATS },
    { k: 'amount', label: 'Amount', type: 'number', req: true },
    { k: 'bookingId', label: 'Linked Booking', type: 'select', blank: '— general —', options: () => db.bookings.map(b => ({ v: b.id, l: `${b.ref} — ${custName(b.customerIds[0])}` })) },
    { k: 'note', label: 'Description', type: 'textarea' },
  ],
  payment: () => [
    { k: 'date', label: 'Date', type: 'date', req: true },
    { k: 'amount', label: 'Amount', type: 'number', req: true },
    { k: 'method', label: 'Method', type: 'select', options: METHODS },
    { k: 'note', label: 'Reference / Note' },
  ],
};

/* ---------- entity actions ---------- */
function editLead(l) {
  openForm({
    title: l ? 'Edit Lead' : 'New Lead', fields: F.lead(),
    value: l || { status: 'New', source: 'WhatsApp', followUp: addDays(today(), 1), pax: 1 },
    onSave: v => { upsert('leads', v, l, 'lead'); },
  });
}
function editCustomer(c, after) {
  openForm({
    title: c ? 'Edit Pilgrim' : 'New Pilgrim', fields: F.customer(), value: c || { gender: 'Male', docs: [] },
    onSave: v => { const rec = upsert('customers', v, c, 'pilgrim'); if (after) setTimeout(() => after(rec)); },
  });
}
function editPackage(p) {
  openForm({
    title: p ? 'Edit Package' : 'New Package', fields: F.pkg(),
    value: p || { category: 'Standard', days: 15, active: 'Active', includes: ['Visa', 'Air Ticket', 'Hotels', 'Transport'] },
    onSave: v => { upsert('packages', v, p, 'package'); },
  });
}
function editAgent(a) {
  openForm({ title: a ? 'Edit Sub-Agent' : 'New Sub-Agent', fields: F.agent(), value: a || { commission: 5 }, onSave: v => { upsert('agents', v, a, 'agent'); } });
}
function editExpense(x) {
  openForm({ title: x ? 'Edit Expense' : 'New Expense', fields: F.expense(), value: x || { date: today(), category: 'Visa Fee' }, onSave: v => { upsert('expenses', v, x, 'expense'); } });
}
function nextRef() {
  db.seq = (db.seq || 0) + 1;
  return `UMR-${new Date().getFullYear()}-${String(db.seq).padStart(4, '0')}`;
}
function editBooking(b, preset) {
  if (!db.customers.length) { toast('Add a pilgrim first'); return editCustomer(null); }
  if (!db.packages.length) { toast('Add a package first'); return editPackage(null); }
  openForm({
    title: b ? `Edit Booking ${b.ref}` : 'New Booking', fields: F.booking(),
    value: b || Object.assign({ roomType: 'Quad', status: 'Confirmed', visaStatus: 'Docs Pending', ticketStatus: 'Not Issued', customerIds: [] }, preset),
    onSave: v => {
      const pkg = byId('packages', v.packageId);
      if (v.pax === '' || !v.pax) v.pax = v.customerIds.length || 1;
      if (v.pricePerPax === '' || !v.pricePerPax) v.pricePerPax = priceFor(pkg, v.roomType);
      if (!v.departDate) v.departDate = pkg.departure || '';
      if (!v.returnDate && v.departDate) v.returnDate = addDays(v.departDate, pkg.days);
      v.discount = Number(v.discount) || 0;
      if (pkg.seats && !b) {
        const left = pkg.seats - seatsBooked(pkg.id);
        if (v.pax > left && !confirm(`Only ${left} seats left in this package. Overbook anyway?`)) return false;
      }
      if (b) { upsert('bookings', v, b, 'booking'); }
      else {
        const rec = upsert('bookings', Object.assign({ ref: nextRef(), date: today(), payments: [] }, v), null, 'booking');
        if (preset && preset._leadId) { const l = byId('leads', preset._leadId); if (l) { l.status = 'Won'; l.bookingId = rec.id; } }
        setTimeout(() => showBooking(rec.id));
      }
    },
  });
}
function addPayment(b, p) {
  openForm({
    title: `${p ? 'Edit' : 'Receive'} Payment — ${b.ref}`, fields: F.payment(),
    value: p || { date: today(), amount: Math.max(0, balanceOf(b)), method: 'Cash' },
    onSave: v => {
      if (p) Object.assign(p, v); else b.payments.push(Object.assign({ id: uid(), receipt: 'RCP-' + Date.now().toString().slice(-6) }, v));
      log(`Payment ${money(v.amount)} for ${b.ref}`);
      setTimeout(() => showBooking(b.id));
    },
  });
}
function convertLead(l) {
  const exists = db.customers.find(c => digits(c.phone) === digits(l.phone));
  const go = c => editBooking(null, { customerIds: [c.id], packageId: l.packageId || '', pax: l.pax || 1, agentId: l.agentId || '', _leadId: l.id });
  if (exists) return go(exists);
  const c = upsert('customers', { name: l.name, phone: l.phone, city: l.city, gender: 'Male', docs: [] }, null, 'pilgrim');
  save();
  toast('Pilgrim created from lead — complete passport details later');
  go(c);
}

/* ---------- detail views ---------- */
function showBooking(id) {
  const b = byId('bookings', id); if (!b) return;
  const pkg = byId('packages', b.packageId) || {};
  const pilgrims = b.customerIds.map(cid => byId('customers', cid)).filter(Boolean);
  const first = pilgrims[0] || {};
  openModal(`Booking ${b.ref}`, `
    <div class="toolbar">
      ${badge(b.status)} ${badge(b.visaStatus)} ${payBadge(b)} ${badge(b.ticketStatus)}
      <span class="grow"></span>
      <button class="btn sm" id="bEdit">✏️ Edit</button>
      <button class="btn sm primary" id="bPay">💵 Receive Payment</button>
      <button class="btn sm" id="bInv">🖨️ Invoice</button>
      <button class="btn sm" id="bVou">🏨 Voucher</button>
      ${first.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(first.phone, `Assalam o Alaikum ${first.name}, your Umrah booking ${b.ref} (${pkg.name || ''}) departs ${fmtDate(b.departDate)}. Total ${money(totalOf(b))}, paid ${money(paidOf(b))}, balance ${money(balanceOf(b))}. — ${db.settings.agencyName}`)}">💬 WhatsApp</a>` : ''}
      <button class="btn sm danger" id="bDel">🗑️</button>
    </div>
    <div class="detail-grid">
      <div><small>Package</small>${esc(pkg.name || '—')}</div>
      <div><small>Room</small>${esc(b.roomType)} × ${esc(b.pax)} pax</div>
      <div><small>Departure → Return</small>${fmtDate(b.departDate)} → ${fmtDate(b.returnDate)}</div>
      <div><small>Sub-Agent</small>${esc(agentName(b.agentId))}</div>
      <div><small>Total</small><b>${money(totalOf(b))}</b></div>
      <div><small>Paid</small>${money(paidOf(b))}</div>
      <div><small>Balance</small><b style="color:var(${balanceOf(b) > 0 ? '--danger' : '--ok'})">${money(balanceOf(b))}</b></div>
      <div><small>Est. Profit</small>${money(totalOf(b) - costOf(b))}</div>
      <div><small>PNR</small>${esc(b.pnr || '—')}</div>
    </div>
    ${b.notes ? `<p class="muted">${esc(b.notes)}</p>` : ''}
    <h4 class="section-title">Pilgrims</h4>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Passport</th><th>Expiry</th><th>Readiness</th></tr></thead><tbody>
      ${pilgrims.map(c => { const iss = pilgrimIssues(c, b.departDate); return `<tr class="clickable" data-cust="${c.id}"><td>${esc(c.name)}<br><small class="muted">${esc(c.phone)}</small></td><td>${esc(c.passportNo || '—')}</td><td>${fmtDate(c.passportExpiry)}</td><td>${iss.length ? iss.map(i => `<div class="badge warn" style="margin:1px 0">${esc(i)}</div>`).join('') : badge('Ready', 'ok')}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">No pilgrims</td></tr>'}
    </tbody></table></div>
    <h4 class="section-title">Payments</h4>
    <div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Note</th><th class="num">Amount</th><th></th></tr></thead><tbody>
      ${(b.payments || []).map(p => `<tr><td>${esc(p.receipt || '')}</td><td>${fmtDate(p.date)}</td><td>${esc(p.method)}</td><td>${esc(p.note)}</td><td class="num">${money(p.amount)}</td>
        <td class="actions"><button class="btn sm" data-rcp="${p.id}">🖨️</button> <button class="btn sm" data-pedit="${p.id}">✏️</button> <button class="btn sm danger" data-pdel="${p.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No payments yet</td></tr>'}
    </tbody></table></div>`);
  $('#bEdit').onclick = () => editBooking(b);
  $('#bPay').onclick = () => addPayment(b);
  $('#bInv').onclick = () => printInvoice(b);
  $('#bVou').onclick = () => printVoucher(b);
  $('#bDel').onclick = () => remove('bookings', b.id, 'booking');
  $$('[data-cust]').forEach(r => r.onclick = () => editCustomer(byId('customers', r.dataset.cust)));
  $$('[data-rcp]').forEach(x => x.onclick = () => printReceipt(b, b.payments.find(p => p.id === x.dataset.rcp)));
  $$('[data-pedit]').forEach(x => x.onclick = () => addPayment(b, b.payments.find(p => p.id === x.dataset.pedit)));
  $$('[data-pdel]').forEach(x => x.onclick = () => {
    if (!confirm('Delete this payment?')) return;
    b.payments = b.payments.filter(p => p.id !== x.dataset.pdel); log(`Deleted payment on ${b.ref}`); save(); render(); showBooking(b.id);
  });
}

function showCustomer(c) {
  const bookings = db.bookings.filter(b => b.customerIds.includes(c.id));
  openModal(c.name, `
    <div class="toolbar">${badge(c.gender || '—')} ${c.city ? badge(c.city) : ''}<span class="grow"></span>
      <button class="btn sm" id="cEdit">✏️ Edit</button>
      <button class="btn sm primary" id="cBook">➕ New Booking</button>
      ${c.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(c.phone, `Assalam o Alaikum ${c.name}, `)}">💬 WhatsApp</a>` : ''}
      <button class="btn sm danger" id="cDel">🗑️</button></div>
    <div class="detail-grid">
      <div><small>Father/Husband</small>${esc(c.fatherName || '—')}</div>
      <div><small>Phone</small>${esc(c.phone || '—')}</div>
      <div><small>CNIC</small>${esc(c.cnic || '—')}</div>
      <div><small>Date of Birth</small>${fmtDate(c.dob)}</div>
      <div><small>Passport</small>${esc(c.passportNo || '—')}</div>
      <div><small>Passport Expiry</small>${fmtDate(c.passportExpiry)}</div>
      <div><small>Mahram</small>${esc(c.mahram || '—')}</div>
      <div><small>Emergency</small>${esc(c.emergency || '—')}</div>
    </div>
    <div><small class="muted">Documents</small><br>${DOCS.map(d => badge(d, (c.docs || []).includes(d) ? 'ok' : '')).join(' ')}</div>
    ${c.notes ? `<p class="muted">${esc(c.notes)}</p>` : ''}
    <h4 class="section-title">Booking History (${bookings.length})</h4>
    <div class="table-wrap"><table><thead><tr><th>Ref</th><th>Package</th><th>Departure</th><th>Status</th><th class="num">Balance</th></tr></thead><tbody>
    ${bookings.map(b => `<tr class="clickable" data-b="${b.id}"><td>${esc(b.ref)}</td><td>${esc(pkgName(b.packageId))}</td><td>${fmtDate(b.departDate)}</td><td>${badge(b.status)}</td><td class="num">${money(balanceOf(b))}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No bookings</td></tr>'}
    </tbody></table></div>`);
  $('#cEdit').onclick = () => editCustomer(c);
  $('#cBook').onclick = () => editBooking(null, { customerIds: [c.id] });
  $('#cDel').onclick = () => {
    if (bookings.length) return toast('Pilgrim has bookings — remove them from bookings first');
    remove('customers', c.id, 'pilgrim');
  };
  $$('[data-b]').forEach(r => r.onclick = () => showBooking(r.dataset.b));
}

/* ---------- printing ---------- */
function printDoc(title, body) {
  const s = db.settings;
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font:13px/1.5 system-ui,sans-serif;color:#111;margin:30px;}
    .head{display:flex;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:12px;margin-bottom:18px}
    .head h1{margin:0;color:#0f766e;font-size:22px} table{width:100%;border-collapse:collapse;margin:10px 0}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left} th{background:#eef6f5} .r{text-align:right}
    .tot td{font-weight:700} .foot{margin-top:30px;color:#555;border-top:1px solid #ccc;padding-top:10px}
    .sign{display:flex;justify-content:space-between;margin-top:60px} .sign div{border-top:1px solid #333;width:200px;text-align:center;padding-top:4px}
  </style></head><body>
  <div class="head"><div><h1>${esc(s.agencyName)}</h1><div>${esc(s.address)}</div><div>${esc(s.phone)} ${s.email ? '· ' + esc(s.email) : ''}</div>${s.license ? `<div>License: ${esc(s.license)}</div>` : ''}</div>
  <div style="text-align:right"><h2 style="margin:0">${esc(title)}</h2><div>Date: ${fmtDate(today())}</div></div></div>
  ${body}
  <div class="sign"><div>Customer Signature</div><div>Authorised Signature</div></div>
  <div class="foot">${esc(s.invoiceNote)}</div>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function printInvoice(b) {
  const pkg = byId('packages', b.packageId) || {};
  const pilgrims = b.customerIds.map(id => byId('customers', id)).filter(Boolean);
  printDoc(`Invoice ${b.ref}`, `
    <p><b>Bill to:</b> ${esc(pilgrims[0] ? pilgrims[0].name : '')} ${pilgrims[0] ? '· ' + esc(pilgrims[0].phone) : ''}</p>
    <table><tr><th>Package</th><th>Days</th><th>Room</th><th>Departure</th><th>Return</th></tr>
    <tr><td>${esc(pkg.name)}</td><td>${esc(pkg.days)}</td><td>${esc(b.roomType)}</td><td>${fmtDate(b.departDate)}</td><td>${fmtDate(b.returnDate)}</td></tr></table>
    <table><tr><th>#</th><th>Pilgrim</th><th>Passport</th><th>CNIC</th></tr>
    ${pilgrims.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${esc(c.passportNo)}</td><td>${esc(c.cnic)}</td></tr>`).join('')}</table>
    <table><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
    <tr><td>${esc(pkg.name)} — ${esc(b.roomType)} sharing</td><td class="r">${esc(b.pax)}</td><td class="r">${money(b.pricePerPax)}</td><td class="r">${money(b.pricePerPax * b.pax)}</td></tr>
    ${b.discount ? `<tr><td colspan="3">Discount</td><td class="r">- ${money(b.discount)}</td></tr>` : ''}
    <tr class="tot"><td colspan="3">Total</td><td class="r">${money(totalOf(b))}</td></tr>
    <tr><td colspan="3">Received</td><td class="r">${money(paidOf(b))}</td></tr>
    <tr class="tot"><td colspan="3">Balance Due</td><td class="r">${money(balanceOf(b))}</td></tr></table>
    ${(b.payments || []).length ? `<h3>Payment History</h3><table><tr><th>Receipt</th><th>Date</th><th>Method</th><th class="r">Amount</th></tr>
    ${b.payments.map(p => `<tr><td>${esc(p.receipt)}</td><td>${fmtDate(p.date)}</td><td>${esc(p.method)}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</table>` : ''}
    <p><b>Includes:</b> ${esc((pkg.includes || []).join(', '))}</p>`);
}
function printReceipt(b, p) {
  printDoc(`Receipt ${p.receipt || ''}`, `
    <table><tr><th>Booking</th><td>${esc(b.ref)}</td></tr><tr><th>Received from</th><td>${esc(custName(b.customerIds[0]))}</td></tr>
    <tr><th>Amount</th><td><b>${money(p.amount)}</b></td></tr><tr><th>Method</th><td>${esc(p.method)} ${esc(p.note)}</td></tr>
    <tr><th>Payment date</th><td>${fmtDate(p.date)}</td></tr><tr><th>Remaining balance</th><td>${money(balanceOf(b))}</td></tr></table>`);
}
function printVoucher(b) {
  const pkg = byId('packages', b.packageId) || {};
  const pilgrims = b.customerIds.map(id => byId('customers', id)).filter(Boolean);
  const mkIn = b.departDate, mkOut = addDays(mkIn, pkg.makkahNights || 0), mdOut = addDays(mkOut, pkg.madinahNights || 0);
  printDoc(`Travel Voucher ${b.ref}`, `
    <table><tr><th>Airline / Route</th><td>${esc(pkg.airline || '—')}</td><th>PNR</th><td>${esc(b.pnr || '—')}</td></tr>
    <tr><th>Departure</th><td>${fmtDate(b.departDate)}</td><th>Return</th><td>${fmtDate(b.returnDate)}</td></tr></table>
    <h3>Hotels</h3><table><tr><th>City</th><th>Hotel</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Room</th></tr>
    <tr><td>Makkah</td><td>${esc(pkg.makkahHotel)} ${pkg.makkahDistance ? '(' + esc(pkg.makkahDistance) + ')' : ''}</td><td>${fmtDate(mkIn)}</td><td>${fmtDate(mkOut)}</td><td>${esc(pkg.makkahNights)}</td><td>${esc(b.roomType)}</td></tr>
    <tr><td>Madinah</td><td>${esc(pkg.madinahHotel)}</td><td>${fmtDate(mkOut)}</td><td>${fmtDate(mdOut)}</td><td>${esc(pkg.madinahNights)}</td><td>${esc(b.roomType)}</td></tr></table>
    <p><b>Transport:</b> ${esc(pkg.transport || '—')}</p>
    <h3>Pilgrims</h3><table><tr><th>#</th><th>Name</th><th>Passport</th><th>Visa</th></tr>
    ${pilgrims.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${esc(c.passportNo)}</td><td>${esc(b.visaStatus)}</td></tr>`).join('')}</table>
    <p>Emergency contact in KSA: ${esc(db.settings.phone)}</p>`);
}

/* ---------- generic list view ---------- */
const listState = {};
function listView({ key, addLabel, onAdd, cols, rows, onRow, filters = [], extraTools = '' }) {
  const st = listState[key] = listState[key] || { q: '', f: {} };
  const view = $('#view');
  view.innerHTML = `<div class="toolbar">
      <input type="search" id="lq" placeholder="Search…" value="${esc(st.q)}">
      ${filters.map(f => `<select data-filter="${f.k}"><option value="">${esc(f.label)}: All</option>${f.options.map(o => `<option ${st.f[f.k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`).join('')}
      <span class="grow"></span>${extraTools}
      <button class="btn" id="lcsv">⬇️ CSV</button>
      ${onAdd ? `<button class="btn primary" id="ladd">➕ ${esc(addLabel)}</button>` : ''}
    </div><div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.h)}</th>`).join('')}</tr></thead><tbody id="lbody"></tbody></table></div>
    <div class="muted" id="lcount" style="margin-top:8px"></div>`;
  const filtered = () => {
    const q = st.q.toLowerCase();
    return rows().filter(r => (!q || cols.some(c => String(c.text ? c.text(r) : '').toLowerCase().includes(q)))
      && filters.every(f => !st.f[f.k] || f.get(r) === st.f[f.k]));
  };
  const draw = () => {
    const data = filtered();
    $('#lbody').innerHTML = data.map((r, i) => `<tr class="clickable" data-i="${i}">${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.text(r))}</td>`).join('')}</tr>`).join('')
      || `<tr><td colspan="${cols.length}" class="empty">Nothing here yet</td></tr>`;
    $('#lcount').textContent = `${data.length} record(s)`;
    $$('#lbody tr[data-i]').forEach(tr => tr.onclick = e => { if (e.target.closest('a,button')) return; onRow(data[tr.dataset.i]); });
  };
  $('#lq').oninput = e => { st.q = e.target.value; draw(); };
  $$('[data-filter]').forEach(s => s.onchange = () => { st.f[s.dataset.filter] = s.value; draw(); });
  if (onAdd) $('#ladd').onclick = onAdd;
  $('#lcsv').onclick = () => downloadCsv(key, cols, filtered());
  draw();
}
function downloadCsv(name, cols, data) {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => cell(c.h)).join(','), ...data.map(r => cols.map(c => cell(c.csv ? c.csv(r) : c.text ? c.text(r) : '')).join(','))].join('\n');
  download(`${name}-${today()}.csv`, '﻿' + csv, 'text/csv');
}
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- views ---------- */
const views = {};

views.dashboard = () => {
  const t = today();
  const act = activeBookings();
  const totalSales = sum(act, totalOf);
  const received = sum(act, paidOf);
  const pending = totalSales - received;
  const month = t.slice(0, 7);
  const monthLeads = db.leads.filter(l => (l.createdAt || '').startsWith(month));
  const won = db.leads.filter(l => l.status === 'Won').length;
  const closed = db.leads.filter(l => l.status === 'Won' || l.status === 'Lost').length;
  const conv = closed ? Math.round(won / closed * 100) : 0;
  const upcoming = act.filter(b => b.departDate >= t && ['Tentative', 'Confirmed'].includes(b.status)).sort((a, b) => a.departDate.localeCompare(b.departDate));
  const pilgrimsUpcoming = sum(upcoming, b => b.pax);
  const expenses = sum(db.expenses, e => e.amount);
  const profit = sum(act, b => totalOf(b) - costOf(b));

  const followups = db.leads.filter(l => l.followUp && l.followUp <= t && !['Won', 'Lost'].includes(l.status)).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const alerts = [];
  upcoming.forEach(b => {
    const d = daysBetween(t, b.departDate);
    if (d <= 21 && !['Approved'].includes(b.visaStatus)) alerts.push({ k: 'danger', b, msg: `Visa "${b.visaStatus}" — departs in ${d} day(s)` });
    if (d <= 14 && balanceOf(b) > 0) alerts.push({ k: 'warn', b, msg: `Balance ${money(balanceOf(b))} due — departs in ${d} day(s)` });
    if (d <= 10 && b.ticketStatus !== 'Issued') alerts.push({ k: 'warn', b, msg: `Ticket not issued — departs in ${d} day(s)` });
    b.customerIds.forEach(cid => {
      const c = byId('customers', cid);
      const pass = pilgrimIssues(c, b.departDate).filter(i => i.startsWith('Passport') || i.startsWith('No passport'));
      pass.forEach(i => alerts.push({ k: 'danger', b, msg: `${c.name}: ${i}` }));
    });
  });

  $('#view').innerHTML = `
    <div class="grid kpis">
      ${kpi('Total Sales', money(totalSales), `${act.length} active bookings`)}
      ${kpi('Received', money(received), totalSales ? Math.round(received / totalSales * 100) + '% collected' : '')}
      ${kpi('Receivable', money(pending), 'outstanding balance')}
      ${kpi('Gross Profit', money(profit), `Expenses ${money(expenses)}`)}
      ${kpi('Upcoming Pilgrims', pilgrimsUpcoming, `${upcoming.length} departures`)}
      ${kpi('Leads This Month', monthLeads.length, `Conversion ${conv}%`)}
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>⚠️ Action Required (${alerts.length})</h3><ul class="alerts">
        ${alerts.slice(0, 12).map(a => `<li class="clickable" data-b="${a.b.id}">${badge(a.b.ref, a.k)} <span>${esc(a.msg)}</span></li>`).join('') || '<li class="muted">All clear — nothing urgent 🎉</li>'}
      </ul></div>
      <div class="card"><h3>📞 Follow-ups Due (${followups.length})</h3><ul class="alerts">
        ${followups.slice(0, 10).map(l => `<li><span style="flex:1" class="clickable" data-l="${l.id}"><b>${esc(l.name)}</b> <small class="muted">${esc(l.phone)} · ${fmtDate(l.followUp)}</small><br><small>${badge(l.status)} ${esc(pkgName(l.packageId))}</small></span>
          <a class="btn sm" target="_blank" rel="noopener" href="${waLink(l.phone, `Assalam o Alaikum ${l.name}, ${db.settings.agencyName} se baat kar rahe hain regarding your Umrah inquiry.`)}">💬</a></li>`).join('') || '<li class="muted">No follow-ups due</li>'}
      </ul></div>
      <div class="card chart"><h3>💰 Collections — last 6 months</h3>${collectionsChart()}</div>
      <div class="card"><h3>🛫 Upcoming Departures</h3><ul class="alerts">
        ${upcoming.slice(0, 8).map(b => `<li class="clickable" data-b="${b.id}"><span style="flex:1"><b>${fmtDate(b.departDate)}</b> · ${esc(custName(b.customerIds[0]))}${b.customerIds.length > 1 ? ` +${b.customerIds.length - 1}` : ''}<br><small class="muted">${esc(b.ref)} · ${esc(pkgName(b.packageId))}</small></span>${badge(b.visaStatus)}</li>`).join('') || '<li class="muted">No upcoming departures</li>'}
      </ul></div>
      <div class="card"><h3>📦 Package Seat Occupancy</h3>
        ${db.packages.filter(p => p.active !== 'Closed').map(p => { const used = seatsBooked(p.id), total = Number(p.seats) || 0, pct = total ? Math.min(100, used / total * 100) : 0;
          return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${esc(p.name)}</span><small class="muted">${used}/${total || '∞'} seats</small></div><div class="bar ${pct >= 100 ? 'full' : ''}"><span style="width:${pct}%"></span></div></div>`; }).join('') || '<p class="muted">No packages</p>'}
      </div>
      <div class="card"><h3>🕒 Recent Activity</h3><ul class="alerts">
        ${db.activity.slice(0, 8).map(a => `<li><small class="muted" style="min-width:110px">${new Date(a.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><span>${esc(a.text)}</span></li>`).join('') || '<li class="muted">No activity yet</li>'}
      </ul></div>
    </div>`;
  $$('[data-b]').forEach(x => x.onclick = () => showBooking(x.dataset.b));
  $$('[data-l]').forEach(x => x.onclick = () => editLead(byId('leads', x.dataset.l)));
};
function kpi(label, value, sub) {
  return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
}
function collectionsChart() {
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const pay = months.map(m => sum(db.bookings.flatMap(b => b.payments || []).filter(p => (p.date || '').startsWith(m)), p => p.amount));
  const exp = months.map(m => sum(db.expenses.filter(e => (e.date || '').startsWith(m)), e => e.amount));
  return barChart(months.map(m => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short' })), [{ name: 'Collected', color: 'var(--primary)', values: pay }, { name: 'Expenses', color: 'var(--gold)', values: exp }]);
}
function barChart(labels, series, axis = v => Math.round(v / 1000) + 'k') {
  const W = 520, H = 200, pad = 28, max = Math.max(1, ...series.flatMap(s => s.values));
  const gw = (W - pad) / labels.length, bw = Math.min(26, (gw - 10) / series.length);
  let bars = '';
  labels.forEach((l, i) => {
    series.forEach((s, j) => {
      const h = (s.values[i] / max) * (H - 40);
      const x = pad + i * gw + (gw - bw * series.length) / 2 + j * bw;
      bars += `<rect x="${x}" y="${H - 20 - h}" width="${bw - 3}" height="${h}" rx="3" fill="${s.color}"><title>${esc(s.name)}: ${s.money === false ? s.values[i] : money(s.values[i])}</title></rect>`;
    });
    bars += `<text x="${pad + i * gw + gw / 2}" y="${H - 5}" text-anchor="middle">${esc(l)}</text>`;
  });
  const grid = [0, .5, 1].map(f => `<line x1="${pad}" x2="${W}" y1="${H - 20 - f * (H - 40)}" y2="${H - 20 - f * (H - 40)}" stroke="var(--border)"/><text x="0" y="${H - 16 - f * (H - 40)}">${f ? esc(axis(max * f)) : '0'}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}${bars}</svg><div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

let leadMode = 'board';
views.leads = () => {
  const tools = `<button class="btn" id="lmode">${leadMode === 'board' ? '📋 List view' : '🗂️ Board view'}</button>`;
  if (leadMode === 'list') {
    listView({
      key: 'leads', addLabel: 'New Lead', onAdd: () => editLead(null), extraTools: tools,
      filters: [{ k: 'status', label: 'Stage', options: STAGES, get: r => r.status }, { k: 'source', label: 'Source', options: SOURCES, get: r => r.source }],
      rows: () => db.leads.slice().reverse(),
      cols: [
        { h: 'Name', text: r => r.name, html: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.city)}</small>` },
        { h: 'Phone', text: r => r.phone, html: r => `${esc(r.phone)} <a href="${waLink(r.phone)}" target="_blank" rel="noopener">💬</a>` },
        { h: 'Source', text: r => r.source },
        { h: 'Package', text: r => pkgName(r.packageId) },
        { h: 'Pax', text: r => r.pax, num: true },
        { h: 'Stage', text: r => r.status, html: r => badge(r.status) },
        { h: 'Follow-up', text: r => r.followUp, html: r => r.followUp ? (r.followUp < today() && !['Won', 'Lost'].includes(r.status) ? badge(fmtDate(r.followUp), 'danger') : fmtDate(r.followUp)) : '—' },
        { h: 'Created', text: r => r.createdAt, html: r => fmtDate(r.createdAt) },
      ],
      onRow: r => editLead(r),
    });
  } else {
    $('#view').innerHTML = `<div class="toolbar"><span class="muted">Drag cards between stages. Click to edit.</span><span class="grow"></span>${tools}<button class="btn primary" id="ladd">➕ New Lead</button></div>
      <div class="kanban">${STAGES.map(s => { const ls = db.leads.filter(l => l.status === s);
        return `<div class="kcol" data-stage="${s}"><h4><span>${badge(s)}</span><span class="muted">${ls.length}</span></h4>
          ${ls.map(l => `<div class="kcard" draggable="true" data-id="${l.id}"><div class="name">${esc(l.name)}</div>
            <div class="meta">${esc(l.phone)} · ${esc(l.source || '')}</div>
            <div class="meta">${esc(pkgName(l.packageId))} · ${esc(l.pax || 1)} pax</div>
            <div class="row">${l.followUp ? badge('📅 ' + fmtDate(l.followUp), l.followUp < today() && !['Won', 'Lost'].includes(s) ? 'danger' : '') : ''}
            <a class="btn sm" href="${waLink(l.phone)}" target="_blank" rel="noopener">💬</a>
            ${s !== 'Won' && s !== 'Lost' ? `<button class="btn sm" data-convert="${l.id}">➜ Book</button>` : ''}</div></div>`).join('')}
        </div>`; }).join('')}</div>`;
    $('#ladd').onclick = () => editLead(null);
    $$('.kcard').forEach(c => {
      c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.id);
      c.onclick = e => { if (e.target.closest('a,button')) return; editLead(byId('leads', c.dataset.id)); };
    });
    $$('[data-convert]').forEach(b => b.onclick = () => convertLead(byId('leads', b.dataset.convert)));
    $$('.kcol').forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = e => {
        e.preventDefault(); col.classList.remove('over');
        const l = byId('leads', e.dataTransfer.getData('text/plain'));
        if (l && l.status !== col.dataset.stage) { l.status = col.dataset.stage; log(`Lead ${l.name} → ${l.status}`); save(); render(); }
      };
    });
  }
  $('#lmode').onclick = () => { leadMode = leadMode === 'board' ? 'list' : 'board'; render(); };
};

views.customers = () => listView({
  key: 'pilgrims', addLabel: 'New Pilgrim', onAdd: () => editCustomer(null),
  filters: [{ k: 'gender', label: 'Gender', options: ['Male', 'Female'], get: r => r.gender }],
  rows: () => db.customers.slice().sort((a, b) => a.name.localeCompare(b.name)),
  cols: [
    { h: 'Name', text: r => r.name + ' ' + (r.fatherName || ''), html: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.fatherName)}</small>`, csv: r => r.name },
    { h: 'Phone', text: r => r.phone, html: r => `${esc(r.phone)} ${r.phone ? `<a href="${waLink(r.phone)}" target="_blank" rel="noopener">💬</a>` : ''}` },
    { h: 'CNIC', text: r => r.cnic },
    { h: 'Passport', text: r => r.passportNo },
    { h: 'Expiry', text: r => r.passportExpiry, html: r => r.passportExpiry && daysBetween(today(), r.passportExpiry) < 180 ? badge(fmtDate(r.passportExpiry), 'danger') : fmtDate(r.passportExpiry) },
    { h: 'City', text: r => r.city },
    { h: 'Docs', text: r => (r.docs || []).join('; '), html: r => `${(r.docs || []).length}/${DOCS.length}` },
    { h: 'Trips', text: r => db.bookings.filter(b => b.customerIds.includes(r.id)).length, num: true },
  ],
  onRow: r => showCustomer(r),
});

views.packages = () => {
  const view = $('#view');
  view.innerHTML = `<div class="toolbar"><span class="muted">${db.packages.length} packages</span><span class="grow"></span><button class="btn primary" id="padd">➕ New Package</button></div>
    <div class="grid cols-3">${db.packages.map(p => {
      const used = seatsBooked(p.id), total = Number(p.seats) || 0, pct = total ? Math.min(100, used / total * 100) : 0;
      return `<div class="card clickable" data-p="${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px"><h3>${esc(p.name)}</h3>${badge(p.active || 'Active', p.active === 'Closed' ? 'danger' : 'ok')}</div>
        <div class="muted">${badge(p.category, 'primary')} ${esc(p.days)} days · ${fmtDate(p.departure)}</div>
        <p style="margin:10px 0 6px">🕋 ${esc(p.makkahHotel || '—')} <small class="muted">${esc(p.makkahNights || 0)}N ${p.makkahDistance ? '· ' + esc(p.makkahDistance) : ''}</small><br>
        🕌 ${esc(p.madinahHotel || '—')} <small class="muted">${esc(p.madinahNights || 0)}N</small><br>✈️ ${esc(p.airline || '—')}</p>
        <table style="margin:8px 0"><tr><th>Quad</th><th>Triple</th><th>Double</th></tr><tr><td>${money(p.priceQuad)}</td><td>${p.priceTriple ? money(p.priceTriple) : '—'}</td><td>${p.priceDouble ? money(p.priceDouble) : '—'}</td></tr></table>
        <div style="display:flex;justify-content:space-between"><small>Seats</small><small class="muted">${used}/${total || '∞'}</small></div>
        <div class="bar ${pct >= 100 ? 'full' : ''}"><span style="width:${pct}%"></span></div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn sm" data-share="${p.id}">💬 Share</button><button class="btn sm" data-dup="${p.id}">⧉ Duplicate</button><button class="btn sm danger" data-pdel="${p.id}">🗑️</button></div>
      </div>`; }).join('') || '<div class="card empty">No packages yet — add your first Umrah package.</div>'}</div>`;
  $('#padd').onclick = () => editPackage(null);
  $$('[data-p]').forEach(c => c.onclick = e => { if (e.target.closest('button')) return; editPackage(byId('packages', c.dataset.p)); });
  $$('[data-dup]').forEach(b => b.onclick = () => {
    const p = byId('packages', b.dataset.dup);
    const copy = Object.assign({}, p, { name: p.name + ' (copy)' });
    delete copy.id;
    upsert('packages', copy, null, 'package'); save(); render();
  });
  $$('[data-pdel]').forEach(b => b.onclick = () => {
    if (db.bookings.some(x => x.packageId === b.dataset.pdel)) return toast('Package has bookings — mark it Closed instead');
    remove('packages', b.dataset.pdel, 'package');
  });
  $$('[data-share]').forEach(b => b.onclick = () => {
    const p = byId('packages', b.dataset.share);
    const text = `🕋 *${p.name}* (${p.days} Days)\n📅 Departure: ${fmtDate(p.departure)}\n✈️ ${p.airline || ''}\n🏨 Makkah: ${p.makkahHotel || ''} (${p.makkahNights || 0} nights${p.makkahDistance ? ', ' + p.makkahDistance : ''})\n🏨 Madinah: ${p.madinahHotel || ''} (${p.madinahNights || 0} nights)\n✅ Includes: ${(p.includes || []).join(', ')}\n\n💰 Quad: ${money(p.priceQuad)}${p.priceTriple ? `\n💰 Triple: ${money(p.priceTriple)}` : ''}${p.priceDouble ? `\n💰 Double: ${money(p.priceDouble)}` : ''}\n\n📞 ${db.settings.agencyName} — ${db.settings.phone}`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Package details copied — paste in WhatsApp / Facebook'), () => window.open(waLink('', text)));
    else window.open('https://wa.me/?text=' + encodeURIComponent(text));
  });
};

views.bookings = () => listView({
  key: 'bookings', addLabel: 'New Booking', onAdd: () => editBooking(null),
  filters: [
    { k: 'status', label: 'Status', options: BSTATUS, get: r => r.status },
    { k: 'visa', label: 'Visa', options: VISA, get: r => r.visaStatus },
    { k: 'pay', label: 'Payment', options: ['Paid', 'Partial', 'Unpaid'], get: r => paidOf(r) <= 0 ? 'Unpaid' : paidOf(r) >= totalOf(r) ? 'Paid' : 'Partial' },
    { k: 'pkg', label: 'Package', options: db.packages.map(p => p.name), get: r => pkgName(r.packageId) },
  ],
  rows: () => db.bookings.slice().sort((a, b) => (b.departDate || '').localeCompare(a.departDate || '')),
  cols: [
    { h: 'Ref', text: r => r.ref, html: r => `<b>${esc(r.ref)}</b><br><small class="muted">${fmtDate(r.date)}</small>` },
    { h: 'Lead Pilgrim', text: r => r.customerIds.map(custName).join(', '), html: r => `${esc(custName(r.customerIds[0]))}${r.customerIds.length > 1 ? ` <small class="muted">+${r.customerIds.length - 1}</small>` : ''}` },
    { h: 'Package', text: r => pkgName(r.packageId) },
    { h: 'Pax', text: r => r.pax, num: true },
    { h: 'Departure', text: r => r.departDate, html: r => fmtDate(r.departDate) },
    { h: 'Status', text: r => r.status, html: r => badge(r.status) },
    { h: 'Visa', text: r => r.visaStatus, html: r => badge(r.visaStatus) },
    { h: 'Total', text: r => totalOf(r), html: r => money(totalOf(r)), num: true },
    { h: 'Balance', text: r => balanceOf(r), html: r => `${money(balanceOf(r))}<br>${payBadge(r)}`, num: true },
  ],
  onRow: r => showBooking(r.id),
});

views.payments = () => {
  const all = () => db.bookings.flatMap(b => (b.payments || []).map(p => Object.assign({ _b: b }, p))).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const receivable = activeBookings().filter(b => balanceOf(b) > 0).sort((a, b) => (a.departDate || '').localeCompare(b.departDate || ''));
  listView({
    key: 'payments', filters: [{ k: 'method', label: 'Method', options: METHODS, get: r => r.method }],
    rows: all,
    cols: [
      { h: 'Receipt', text: r => r.receipt },
      { h: 'Date', text: r => r.date, html: r => fmtDate(r.date) },
      { h: 'Booking', text: r => r._b.ref },
      { h: 'Pilgrim', text: r => custName(r._b.customerIds[0]) },
      { h: 'Method', text: r => r.method },
      { h: 'Note', text: r => r.note },
      { h: 'Amount', text: r => r.amount, html: r => money(r.amount), num: true },
    ],
    onRow: r => showBooking(r._b.id),
  });
  $('#view').insertAdjacentHTML('afterbegin', `<div class="grid kpis">
      ${kpi('Collected (all time)', money(sum(all(), p => p.amount)), all().length + ' payments')}
      ${kpi('Collected this month', money(sum(all().filter(p => (p.date || '').startsWith(today().slice(0, 7))), p => p.amount)), '')}
      ${kpi('Outstanding', money(sum(receivable, balanceOf)), receivable.length + ' bookings with balance')}
    </div>
    <div class="card" style="margin-bottom:14px"><h3>📌 Receivables (by departure)</h3><ul class="alerts">
      ${receivable.slice(0, 8).map(b => { const c = byId('customers', b.customerIds[0]) || {};
        return `<li><span style="flex:1" class="clickable" data-b="${b.id}"><b>${esc(b.ref)}</b> · ${esc(c.name)} <small class="muted">departs ${fmtDate(b.departDate)}</small></span><b>${money(balanceOf(b))}</b>
        ${c.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(c.phone, `Assalam o Alaikum ${c.name}, gentle reminder: balance of ${money(balanceOf(b))} is due for your Umrah booking ${b.ref} (departure ${fmtDate(b.departDate)}). JazakAllah — ${db.settings.agencyName}`)}">💬 Remind</a>` : ''}</li>`; }).join('') || '<li class="muted">No outstanding balances</li>'}
    </ul></div>`);
  $$('[data-b]').forEach(x => x.onclick = () => showBooking(x.dataset.b));
};

views.visas = () => {
  const list = activeBookings().filter(b => b.status !== 'Completed');
  $('#view').innerHTML = `<div class="toolbar"><span class="muted">Drag bookings to update visa status. Bookings with document problems are flagged.</span></div>
    <div class="kanban" style="grid-template-columns:repeat(5,minmax(220px,1fr))">${VISA.map(s => { const bs = list.filter(b => b.visaStatus === s);
      return `<div class="kcol" data-stage="${s}"><h4><span>${badge(s)}</span><span class="muted">${sum(bs, b => b.pax)} pax</span></h4>
      ${bs.map(b => { const issues = b.customerIds.flatMap(id => pilgrimIssues(byId('customers', id), b.departDate));
        const d = b.departDate ? daysBetween(today(), b.departDate) : null;
        return `<div class="kcard" draggable="true" data-id="${b.id}"><div class="name">${esc(custName(b.customerIds[0]))}${b.customerIds.length > 1 ? ` +${b.customerIds.length - 1}` : ''}</div>
        <div class="meta">${esc(b.ref)} · ${esc(pkgName(b.packageId))}</div>
        <div class="row">${d !== null ? badge(d >= 0 ? `✈️ in ${d}d` : 'departed', d >= 0 && d <= 21 && s !== 'Approved' ? 'danger' : '') : ''}${issues.length ? badge(`⚠️ ${issues.length} issue(s)`, 'warn') : badge('Docs OK', 'ok')}</div></div>`; }).join('')}
      </div>`; }).join('')}</div>`;
  $$('.kcard').forEach(c => { c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.id); c.onclick = () => showBooking(c.dataset.id); });
  $$('.kcol').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => {
      e.preventDefault(); col.classList.remove('over');
      const b = byId('bookings', e.dataTransfer.getData('text/plain'));
      if (b && b.visaStatus !== col.dataset.stage) { b.visaStatus = col.dataset.stage; log(`Visa ${b.ref} → ${b.visaStatus}`); save(); render(); }
    };
  });
};

views.agents = () => listView({
  key: 'agents', addLabel: 'New Sub-Agent', onAdd: () => editAgent(null),
  rows: () => db.agents,
  cols: [
    { h: 'Name', text: r => r.name, html: r => `<b>${esc(r.name)}</b>` },
    { h: 'Phone', text: r => r.phone },
    { h: 'City', text: r => r.city },
    { h: 'Commission', text: r => (r.commission || 0) + '%', num: true },
    { h: 'Bookings', text: r => activeBookings().filter(b => b.agentId === r.id).length, num: true },
    { h: 'Pax', text: r => sum(activeBookings().filter(b => b.agentId === r.id), b => b.pax), num: true },
    { h: 'Sales', text: r => sum(activeBookings().filter(b => b.agentId === r.id), totalOf), html: r => money(sum(activeBookings().filter(b => b.agentId === r.id), totalOf)), num: true },
    { h: 'Commission Due', text: r => commissionOf(r), html: r => money(commissionOf(r)), num: true },
  ],
  onRow: r => editAgent(r),
});
const commissionOf = a => sum(activeBookings().filter(b => b.agentId === a.id), b => totalOf(b) * (Number(a.commission) || 0) / 100);

views.expenses = () => listView({
  key: 'expenses', addLabel: 'New Expense', onAdd: () => editExpense(null),
  filters: [{ k: 'cat', label: 'Category', options: EXPENSE_CATS, get: r => r.category }],
  rows: () => db.expenses.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  cols: [
    { h: 'Date', text: r => r.date, html: r => fmtDate(r.date) },
    { h: 'Category', text: r => r.category, html: r => badge(r.category) },
    { h: 'Booking', text: r => (byId('bookings', r.bookingId) || {}).ref || '—' },
    { h: 'Description', text: r => r.note },
    { h: 'Amount', text: r => r.amount, html: r => money(r.amount), num: true },
  ],
  onRow: r => editExpense(r),
});

views.reports = () => {
  const act = activeBookings();
  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const salesByMonth = months.map(m => sum(act.filter(b => (b.date || '').startsWith(m)), totalOf));
  const paxByMonth = months.map(m => sum(act.filter(b => (b.departDate || '').startsWith(m)), b => b.pax));
  const totalSales = sum(act, totalOf), totalCost = sum(act, costOf), opEx = sum(db.expenses.filter(e => !e.bookingId), e => e.amount);
  const commissions = sum(db.agents, commissionOf);
  const bySource = SOURCES.map(s => ({ s, n: db.leads.filter(l => l.source === s).length, w: db.leads.filter(l => l.source === s && l.status === 'Won').length })).filter(x => x.n);
  const byPkg = db.packages.map(p => { const bs = act.filter(b => b.packageId === p.id); return { p, pax: sum(bs, b => b.pax), sales: sum(bs, totalOf), profit: sum(bs, b => totalOf(b) - costOf(b)) }; }).sort((a, b) => b.sales - a.sales);
  const byCity = {};
  act.forEach(b => b.customerIds.forEach(id => { const c = byId('customers', id); const k = (c && c.city) || 'Unknown'; byCity[k] = (byCity[k] || 0) + 1; }));
  const lbl = months.map(m => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short' }));
  $('#view').innerHTML = `
    <div class="grid kpis">
      ${kpi('Sales', money(totalSales), act.length + ' bookings')}
      ${kpi('Package Cost', money(totalCost), 'cost per pax × pax')}
      ${kpi('Gross Profit', money(totalSales - totalCost), totalSales ? Math.round((totalSales - totalCost) / totalSales * 100) + '% margin' : '')}
      ${kpi('Overheads', money(opEx), 'general expenses')}
      ${kpi('Agent Commission', money(commissions), '')}
      ${kpi('Net Profit', money(totalSales - totalCost - opEx - commissions), 'after overheads & commission')}
    </div>
    <div class="grid cols-2">
      <div class="card chart"><h3>Sales by booking month (${year})</h3>${barChart(lbl, [{ name: 'Sales', color: 'var(--primary)', values: salesByMonth }])}</div>
      <div class="card chart"><h3>Pilgrims by departure month (${year})</h3>${barChart(lbl, [{ name: 'Pax', color: 'var(--gold)', values: paxByMonth, money: false }], v => Math.round(v))}</div>
      <div class="card"><h3>Package Performance</h3><div class="table-wrap"><table><thead><tr><th>Package</th><th class="num">Pax</th><th class="num">Sales</th><th class="num">Profit</th></tr></thead><tbody>
        ${byPkg.map(x => `<tr><td>${esc(x.p.name)}</td><td class="num">${x.pax}</td><td class="num">${money(x.sales)}</td><td class="num">${money(x.profit)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No data</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Lead Sources & Conversion</h3><div class="table-wrap"><table><thead><tr><th>Source</th><th class="num">Leads</th><th class="num">Won</th><th class="num">Rate</th></tr></thead><tbody>
        ${bySource.map(x => `<tr><td>${esc(x.s)}</td><td class="num">${x.n}</td><td class="num">${x.w}</td><td class="num">${Math.round(x.w / x.n * 100)}%</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No leads</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Pilgrims by City</h3><div class="table-wrap"><table><tbody>
        ${Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join('') || '<tr><td class="empty">No data</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Expenses by Category</h3><div class="table-wrap"><table><tbody>
        ${EXPENSE_CATS.map(c => [c, sum(db.expenses.filter(e => e.category === c), e => e.amount)]).filter(x => x[1]).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="num">${money(v)}</td></tr>`).join('') || '<tr><td class="empty">No expenses</td></tr>'}</tbody></table></div></div>
    </div>`;
};

views.settings = () => {
  const s = db.settings;
  $('#view').innerHTML = `<div class="grid cols-2">
    <div class="card"><h3>Agency Profile</h3><form id="setForm"><div class="form-grid">
      ${[{ k: 'agencyName', label: 'Agency Name' }, { k: 'phone', label: 'Phone' }, { k: 'email', label: 'Email' }, { k: 'license', label: 'License / Registration No.' }, { k: 'currency', label: 'Currency', type: 'select', options: ['PKR', 'SAR', 'USD', 'GBP', 'INR', 'BDT', 'AED'] }, { k: 'address', label: 'Address', full: true }, { k: 'invoiceNote', label: 'Invoice footer note', type: 'textarea' }].map(f => fieldHtml(f, s[f.k])).join('')}
      </div><div class="form-actions"><button class="btn primary">Save Settings</button></div></form></div>
    <div class="card"><h3>Backup & Data</h3>
      <p class="muted">All data is stored in this browser. Take a backup regularly and keep it safe — it contains passport and CNIC details.</p>
      <div class="toolbar"><button class="btn primary" id="bk">⬇️ Download Backup (JSON)</button>
      <label class="btn">⬆️ Restore Backup<input type="file" id="rs" accept="application/json" hidden></label></div>
      <div class="toolbar"><button class="btn" id="demo">🧪 Load Demo Data</button><button class="btn danger" id="wipe">🗑️ Erase All Data</button></div>
      <p class="muted">Records: ${db.leads.length} leads · ${db.customers.length} pilgrims · ${db.packages.length} packages · ${db.bookings.length} bookings · ${db.expenses.length} expenses</p>
    </div></div>`;
  $('#setForm').onsubmit = e => {
    e.preventDefault();
    for (const k of Object.keys(s)) if (e.target.elements[k]) s[k] = e.target.elements[k].value.trim();
    save(); applyBrand(); toast('Settings saved'); render();
  };
  $('#bk').onclick = () => download(`umrah-crm-backup-${today()}.json`, JSON.stringify(db, null, 2), 'application/json');
  $('#rs').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!d.settings || !Array.isArray(d.bookings)) throw new Error('bad file');
      if (!confirm('Replace all current data with this backup?')) return;
      db = Object.assign(emptyDb(), d); save(); applyBrand(); toast('Backup restored'); render();
    }).catch(() => toast('Invalid backup file'));
  };
  $('#demo').onclick = () => { if (confirm('Replace current data with demo data?')) { db = seed(); save(); applyBrand(); render(); } };
  $('#wipe').onclick = () => { if (confirm('Erase ALL data? Download a backup first!') && confirm('Are you absolutely sure?')) { db = emptyDb(); save(); render(); } };
};

/* ---------- global search ---------- */
function globalSearch(q) {
  const box = $('#searchResults');
  q = q.trim().toLowerCase();
  if (q.length < 2) { box.classList.remove('open'); return; }
  const hit = (...v) => v.some(x => String(x || '').toLowerCase().includes(q));
  const res = [
    ...db.customers.filter(c => hit(c.name, c.phone, c.passportNo, c.cnic)).map(c => ({ t: c.name, s: `Pilgrim · ${c.phone || ''} ${c.passportNo || ''}`, go: () => showCustomer(c) })),
    ...db.leads.filter(l => hit(l.name, l.phone)).map(l => ({ t: l.name, s: `Lead · ${l.status} · ${l.phone}`, go: () => editLead(l) })),
    ...db.bookings.filter(b => hit(b.ref, b.pnr, ...b.customerIds.map(custName))).map(b => ({ t: b.ref, s: `Booking · ${custName(b.customerIds[0])} · ${pkgName(b.packageId)}`, go: () => showBooking(b.id) })),
    ...db.packages.filter(p => hit(p.name, p.makkahHotel, p.madinahHotel)).map(p => ({ t: p.name, s: 'Package', go: () => editPackage(p) })),
  ].slice(0, 12);
  box.innerHTML = res.map((r, i) => `<div data-i="${i}"><b>${esc(r.t)}</b><br><small>${esc(r.s)}</small></div>`).join('') || '<div class="muted">No matches</div>';
  box.classList.add('open');
  $$('div[data-i]', box).forEach(d => d.onmousedown = () => { res[d.dataset.i].go(); box.classList.remove('open'); $('#globalSearch').value = ''; });
}

/* ---------- router ---------- */
const TITLES = { dashboard: 'Dashboard', leads: 'Leads / Inquiries', customers: 'Pilgrims', packages: 'Umrah Packages', bookings: 'Bookings', payments: 'Payments & Receivables', visas: 'Visa Tracker', agents: 'Sub-Agents', expenses: 'Expenses', reports: 'Reports', settings: 'Settings' };
function current() { const v = location.hash.replace('#/', ''); return views[v] ? v : 'dashboard'; }
function render() {
  const v = current();
  $('#viewTitle').textContent = TITLES[v];
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  views[v]();
}
function applyBrand() { $('#brandName').textContent = db.settings.agencyName || 'Umrah CRM'; document.title = (db.settings.agencyName || 'Umrah') + ' — CRM'; }
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}

/* ---------- demo data ---------- */
function seed() {
  const d = emptyDb();
  const T = today();
  const P = (o) => Object.assign({ id: uid(), createdAt: T, active: 'Active', includes: ['Visa', 'Air Ticket', 'Hotels', 'Transport', 'Ziyarat'] }, o);
  d.packages = [
    P({ name: '15 Days Economy Umrah', category: 'Economy', days: 15, departure: addDays(T, 12), airline: 'PIA LHE-JED-LHE', makkahHotel: 'Al Kiswah Towers', makkahNights: 9, makkahDistance: '1.2 km, shuttle', madinahHotel: 'Dar Al Eiman Al Haram', madinahNights: 5, transport: 'Shared bus', seats: 40, costPerPax: 235000, priceQuad: 265000, priceTriple: 285000, priceDouble: 315000 }),
    P({ name: '21 Days Standard Umrah', category: 'Standard', days: 21, departure: addDays(T, 30), airline: 'Saudia ISB-JED / MED-ISB', makkahHotel: 'Hilton Suites Makkah', makkahNights: 12, makkahDistance: '300 m', madinahHotel: 'Pullman Zamzam Madinah', madinahNights: 8, transport: 'Private bus', seats: 30, costPerPax: 330000, priceQuad: 375000, priceTriple: 399000, priceDouble: 449000 }),
    P({ name: '10 Days VIP Umrah', category: 'VIP', days: 10, departure: addDays(T, 45), airline: 'Emirates KHI-DXB-JED', makkahHotel: 'Fairmont Clock Tower', makkahNights: 5, makkahDistance: 'Haram view', madinahHotel: 'The Oberoi Madinah', madinahNights: 4, transport: 'Private GMC', seats: 12, costPerPax: 610000, priceQuad: 690000, priceTriple: 740000, priceDouble: 820000, includes: ['Visa', 'Air Ticket', 'Hotels', 'Transport', 'Ziyarat', 'Meals', 'Guide'] }),
    P({ name: 'Ramadan Last Ashra', category: 'Ramadan', days: 12, departure: addDays(T, 140), airline: 'Airblue LHE-JED', makkahHotel: 'Swissotel Al Maqam', makkahNights: 8, makkahDistance: '100 m', madinahHotel: 'Anwar Al Madinah Mövenpick', madinahNights: 3, transport: 'Private bus', seats: 25, costPerPax: 520000, priceQuad: 585000, priceTriple: 620000, priceDouble: 690000 }),
  ];
  d.agents = [
    { id: uid(), name: 'Madina Travels Faisalabad', phone: '0321-1112233', city: 'Faisalabad', commission: 4 },
    { id: uid(), name: 'Hafiz Imran (Freelance)', phone: '0333-4455667', city: 'Gujranwala', commission: 3 },
  ];
  const C = (o) => Object.assign({ id: uid(), createdAt: T, docs: ['Passport', 'CNIC', 'Photos'] }, o);
  d.customers = [
    C({ name: 'Muhammad Aslam', fatherName: 'Ghulam Rasool', gender: 'Male', dob: '1968-03-12', phone: '0300-1234567', cnic: '35202-1234567-1', city: 'Lahore', passportNo: 'AB1234561', passportExpiry: addDays(T, 900), docs: ['Passport', 'CNIC', 'Photos', 'Vaccination'] }),
    C({ name: 'Naseem Akhtar', fatherName: 'Muhammad Aslam', gender: 'Female', dob: '1972-07-01', phone: '0300-1234567', cnic: '35202-7654321-2', city: 'Lahore', passportNo: 'AB1234562', passportExpiry: addDays(T, 120), mahram: 'Muhammad Aslam (Husband)', docs: ['Passport', 'CNIC', 'Photos', 'Vaccination', 'Mahram Proof'] }),
    C({ name: 'Ayesha Siddiqui', fatherName: 'Tariq Siddiqui', gender: 'Female', dob: '1990-11-20', phone: '0345-9876543', cnic: '42101-1112223-4', city: 'Karachi', passportNo: 'CD9876543', passportExpiry: addDays(T, 1500), mahram: 'Tariq Siddiqui (Father)', docs: ['Passport', 'CNIC'] }),
    C({ name: 'Tariq Siddiqui', fatherName: 'Abdul Majeed', gender: 'Male', dob: '1960-02-14', phone: '0345-9876500', cnic: '42101-3334445-5', city: 'Karachi', passportNo: 'CD9876500', passportExpiry: addDays(T, 1400) }),
    C({ name: 'Bilal Hussain', fatherName: 'Zahid Hussain', gender: 'Male', dob: '1985-05-05', phone: '0312-5554443', cnic: '61101-9998887-7', city: 'Islamabad', passportNo: 'EF5554443', passportExpiry: addDays(T, 2000), docs: ['Passport', 'CNIC', 'Photos', 'Vaccination'] }),
    C({ name: 'Rashid Mehmood', fatherName: 'Sardar Ali', gender: 'Male', dob: '1975-09-09', phone: '0301-7778889', cnic: '33100-1212121-3', city: 'Faisalabad', passportNo: '', passportExpiry: '', docs: ['CNIC'] }),
  ];
  const c = d.customers, p = d.packages;
  let seq = 0;
  const B = (o) => { seq++; return Object.assign({ id: uid(), ref: `UMR-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`, date: addDays(T, -20 + seq * 2), status: 'Confirmed', ticketStatus: 'Not Issued', discount: 0, payments: [], agentId: '' }, o); };
  const pay = (amount, daysAgo, method) => ({ id: uid(), receipt: 'RCP-' + String(100000 + Math.floor(Math.random() * 899999)), date: addDays(T, -daysAgo), amount, method: method || 'Cash', note: '' });
  d.bookings = [
    B({ customerIds: [c[0].id, c[1].id], packageId: p[0].id, roomType: 'Double', pax: 2, pricePerPax: 315000, departDate: p[0].departure, returnDate: addDays(p[0].departure, 15), visaStatus: 'Submitted', payments: [pay(300000, 60, 'Bank Transfer'), pay(200000, 25)] }),
    B({ customerIds: [c[2].id, c[3].id], packageId: p[1].id, roomType: 'Triple', pax: 2, pricePerPax: 399000, discount: 10000, departDate: p[1].departure, returnDate: addDays(p[1].departure, 21), visaStatus: 'Docs Received', payments: [pay(400000, 40, 'JazzCash')], agentId: d.agents[0].id }),
    B({ customerIds: [c[4].id], packageId: p[2].id, roomType: 'Double', pax: 1, pricePerPax: 820000, departDate: p[2].departure, returnDate: addDays(p[2].departure, 10), visaStatus: 'Approved', ticketStatus: 'Issued', payments: [pay(820000, 10, 'Bank Transfer')] }),
    B({ customerIds: [c[5].id], packageId: p[0].id, roomType: 'Quad', pax: 1, pricePerPax: 265000, departDate: p[0].departure, returnDate: addDays(p[0].departure, 15), visaStatus: 'Docs Pending', status: 'Tentative', payments: [pay(50000, 5, 'Easypaisa')], agentId: d.agents[1].id }),
    B({ customerIds: [c[0].id], packageId: p[1].id, roomType: 'Quad', pax: 1, pricePerPax: 360000, departDate: addDays(T, -150), returnDate: addDays(T, -129), visaStatus: 'Approved', ticketStatus: 'Issued', status: 'Completed', date: addDays(T, -170), payments: [pay(360000, 155)] }),
  ];
  d.seq = seq;
  const L = (o) => Object.assign({ id: uid(), createdAt: addDays(T, -Math.floor(Math.random() * 20)), pax: 1 }, o);
  d.leads = [
    L({ name: 'Usman Ghani', phone: '0302-1110001', city: 'Multan', source: 'Facebook', status: 'New', packageId: p[0].id, pax: 4, followUp: T, notes: 'Family of 4, wants quad sharing' }),
    L({ name: 'Sadia Parveen', phone: '0303-2220002', city: 'Lahore', source: 'WhatsApp', status: 'Contacted', packageId: p[1].id, pax: 2, followUp: addDays(T, -1), notes: 'Asked about mahram rules' }),
    L({ name: 'Kamran Akmal', phone: '0304-3330003', city: 'Sialkot', source: 'Referral', status: 'Quoted', packageId: p[2].id, pax: 2, budget: 750000, followUp: addDays(T, 2) }),
    L({ name: 'Farah Naz', phone: '0305-4440004', city: 'Rawalpindi', source: 'Instagram', status: 'Negotiation', packageId: p[3].id, pax: 3, followUp: T, notes: 'Wants discount for 3 pax' }),
    L({ name: 'Zubair Khan', phone: '0306-5550005', city: 'Peshawar', source: 'Walk-in', status: 'Won', packageId: p[0].id, pax: 1 }),
    L({ name: 'Imtiaz Ali', phone: '0307-6660006', city: 'Quetta', source: 'Google', status: 'Lost', notes: 'Went with cheaper agent' }),
    L({ name: 'Hina Rabbani', phone: '0308-7770007', city: 'Lahore', source: 'Facebook', status: 'New', packageId: p[3].id, pax: 2, followUp: addDays(T, 1) }),
  ];
  d.expenses = [
    { id: uid(), date: addDays(T, -30), category: 'Marketing', amount: 45000, note: 'Facebook ads — Ramadan campaign' },
    { id: uid(), date: addDays(T, -15), category: 'Office Rent', amount: 80000, note: 'Monthly office rent' },
    { id: uid(), date: addDays(T, -15), category: 'Salary', amount: 150000, note: 'Staff salaries' },
    { id: uid(), date: addDays(T, -5), category: 'Utilities', amount: 18000, note: 'Electricity & internet' },
  ];
  d.activity = [{ id: uid(), at: new Date().toISOString(), text: 'Demo data loaded' }];
  return d;
}

/* ---------- boot ---------- */
db = load();
save();
try { applyTheme(localStorage.getItem(KEY + '.theme')); } catch (e) { /* ignore */ }
applyBrand();
window.addEventListener('hashchange', () => { $('#sidebar').classList.remove('open'); render(); });
$('#modalClose').onclick = closeModal;
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#themeBtn').onclick = () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const t = dark ? 'light' : 'dark';
  applyTheme(t);
  try { localStorage.setItem(KEY + '.theme', t); } catch (e) { /* ignore */ }
};
if (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
$('#globalSearch').oninput = e => globalSearch(e.target.value);
$('#globalSearch').onblur = () => setTimeout(() => $('#searchResults').classList.remove('open'), 150);
render();
