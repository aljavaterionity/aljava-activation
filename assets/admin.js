/* ALJAVA TERIONITY — Admin application logic */

const CONFIG = {
  supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
  supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw'
};

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));
const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(Number(value) || 0);

if (!window.supabase?.createClient) {
  if ($('loginMsg')) $('loginMsg').innerHTML = '<div class="notice err">Library Supabase gagal dimuat. Muat ulang halaman.</div>';
  throw new Error('Supabase client tidak tersedia.');
}

const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
const state = { cards: [], products: [], customers: [], transactions: [], scans: [], customerRows: [] };

function closeMenu() {
  $('menuPanel')?.classList.remove('open');
  $('menuButton')?.setAttribute('aria-expanded', 'false');
}
function openMenu() {
  const panel = $('menuPanel');
  const button = $('menuButton');
  if (!panel || !button) return;
  panel.classList.add('open');
  button.setAttribute('aria-expanded', 'true');
}
function toggleMenu() {
  $('menuPanel')?.classList.contains('open') ? closeMenu() : openMenu();
}
function showView(viewId) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === viewId));
  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (history.replaceState) history.replaceState(null, '', `#${viewId.replace(/View$/, '')}`);
}
function goDashboard() { showView('dashboardView'); }
function bindNavigation() {
  $('menuButton')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); toggleMenu(); });
  $('closeMenu')?.addEventListener('click', (event) => { event.preventDefault(); closeMenu(); });
  $('dashboardMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); goDashboard(); });
  $('cardsMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showView('cardsView'); });
  $('customerMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showView('customersView'); });
  $('resetMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); resetDashboard(); });
  $('addAccountMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openAddAccount(); });
  $('logoutMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); logout(); });
  document.addEventListener('click', (event) => {
    const panel = $('menuPanel');
    const button = $('menuButton');
    if (panel?.classList.contains('open') && !panel.contains(event.target) && event.target !== button) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      $('modal')?.classList.remove('open');
    }
  });
}
function initRoute() {
  const hash = location.hash.replace('#', '');
  if (hash === 'cards' || hash === 'cardsView') showView('cardsView');
  else if (hash === 'customers' || hash === 'customersView') showView('customersView');
  else goDashboard();
}
window.addEventListener('hashchange', initRoute);

function setLoggedOut(message = '') {
  $('app').style.display = 'none';
  $('login').classList.remove('hidden');
  $('menuButton').classList.remove('visible');
  closeMenu();
  $('loginMsg').innerHTML = message ? `<div class="notice err">❌ ${esc(message)}</div>` : '';
}
async function ensureAdmin() {
  try {
    const { data: { session } = {} } = await sb.auth.getSession();
    if (!session) { setLoggedOut(); return false; }
    const { data: { user } = {}, error: userError } = await sb.auth.getUser();
    if (userError || !user) { await sb.auth.signOut({ scope: 'local' }); setLoggedOut('Sesi login tidak valid.'); return false; }
    const { data: isAdmin, error: adminError } = await sb.rpc('is_admin_user');
    if (adminError || isAdmin !== true) {
      await sb.auth.signOut({ scope: 'local' });
      setLoggedOut(adminError ? 'Gagal memeriksa hak admin.' : 'Akun bukan admin.');
      return false;
    }
    $('login').classList.add('hidden');
    $('app').style.display = 'block';
    $('menuButton').classList.add('visible');
    $('userEmail').textContent = user.email || '';
    return true;
  } catch (error) {
    setLoggedOut(error.message || 'Gagal memeriksa sesi admin.');
    return false;
  }
}
async function login() {
  const email = $('email').value.trim();
  const password = $('password').value;
  if (!email || !password) { $('loginMsg').innerHTML = '<div class="notice err">Email dan password wajib diisi.</div>'; return; }
  $('loginBtn').disabled = true;
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`; return; }
    if (await ensureAdmin()) { await load(); goDashboard(); }
  } catch (error) {
    $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`;
  } finally { $('loginBtn').disabled = false; }
}
async function logout() { await sb.auth.signOut({ scope: 'local' }); location.reload(); }

async function queryTable(table, select, orderBy) {
  let query = sb.from(table).select(select);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
async function load() {
  try {
    const [cards, products, customers, transactions, scans] = await Promise.all([
      queryTable('Cards', 'id,card_code,product_type,status,customer_id,product_id,google_review_url,created_at,activated_at,expires_at', 'created_at'),
      queryTable('Product', 'id,name,category', 'name'),
      queryTable('Customers', 'id,business_name,owner_name,google_review_url,created_at', 'created_at'),
      queryTable('Transactions', 'id,customer_id,card_id,product_id,quantity,selling_price,payment_status,transaction_date', 'transaction_date'),
      queryTable('CardScans', 'id,card_id,card_code,event_type,scanned_at', 'scanned_at')
    ]);
    Object.assign(state, { cards, products, customers, transactions, scans });
    renderAll();
  } catch (error) {
    const message = esc(error.message || 'Gagal memuat data.');
    if ($('txTable')) $('txTable').innerHTML = `<div class="notice err">❌ ${message}</div>`;
    if ($('cardTable')) $('cardTable').innerHTML = `<div class="notice err">❌ ${message}</div>`;
    if ($('customerRows')) $('customerRows').innerHTML = `<tr><td colspan="6"><div class="notice err">❌ ${message}</div></td></tr>`;
  }
}
function renderAll() {
  renderStats(); renderChart(); renderTransactions(); renderScans(); renderCards(); fillProductOptions(); fillCustomerOptions(); renderCustomers();
}
function cardStatus(card) {
  const status = String(card.status || '').toLowerCase();
  if (card.expires_at && new Date(card.expires_at) < new Date()) return 'Expired';
  if (status === 'active' || card.activated_at) return 'Aktif';
  return 'Belum Aktif';
}
function renderStats() {
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const revenue = state.transactions.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
  const monthRevenue = state.transactions.filter((row) => { const d = new Date(row.transaction_date); return d.getFullYear() === year && d.getMonth() === month; }).reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
  const monthScan = state.scans.filter((row) => { const d = new Date(row.scanned_at); return d.getFullYear() === year && d.getMonth() === month; }).length;
  const active = state.cards.filter((card) => cardStatus(card) === 'Aktif').length;
  $('totalRev').textContent = money(revenue); $('monthRev').textContent = money(monthRevenue); $('totalScan').textContent = String(state.scans.length); $('monthScan').textContent = String(monthScan); $('activeCards').textContent = String(active); $('pendingCards').textContent = String(state.cards.filter((card) => cardStatus(card) === 'Belum Aktif').length);
}
function renderChart() {
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const year = Number($('year').value) || new Date().getFullYear(); const selectedMonth = $('month').value; const totals = Array(12).fill(0);
  state.transactions.forEach((row) => { const date = new Date(row.transaction_date); if (date.getFullYear() === year) totals[date.getMonth()] += Number(row.selling_price || 0) * Number(row.quantity || 1); });
  const rows = selectedMonth === '' ? totals.map((value, index) => ({ value, index })) : [{ value: totals[Number(selectedMonth)] || 0, index: Number(selectedMonth) }];
  const max = Math.max(1, ...rows.map((row) => row.value));
  $('chart').innerHTML = rows.map((row) => `<div class="bar" title="${names[row.index]}: ${money(row.value)}"><i style="height:${Math.max(5, row.value / max * 220)}px"></i><span>${names[row.index]}</span></div>`).join('');
  $('chartTotal').textContent = `Total periode: ${money(rows.reduce((sum, row) => sum + row.value, 0))} • ${state.transactions.length} transaksi terbaca`;
}
function renderTransactions() {
  const customers = Object.fromEntries(state.customers.map((row) => [row.id, row])); const products = Object.fromEntries(state.products.map((row) => [row.id, row])); const rows = state.transactions.slice(0, 12);
  $('txTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>Status</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(new Date(row.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(customers[row.customer_id]?.business_name || customers[row.customer_id]?.owner_name || '-')}</td><td>${esc(products[row.product_id]?.name || '-')}</td><td>${Number(row.quantity || 1)}</td><td>${money(Number(row.selling_price || 0) * Number(row.quantity || 1))}</td><td>${esc(row.payment_status || '-')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">Belum ada transaksi.</div>';
}
function renderScans() {
  const counts = {}; state.scans.forEach((scan) => { const key = scan.card_code || scan.card_id || '-'; counts[key] = (counts[key] || 0) + 1; }); const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  $('scanSummary').innerHTML = rows.length ? rows.map(([code, count]) => `<div class="row" style="padding:9px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(code)}</strong><span class="muted">${count} scan/tap</span></div>`).join('') : '<div class="muted">Belum ada scan/tap.</div>';
}
function renderCards() {
  const search = ($('cardSearch').value || '').toLowerCase().trim(); const statusFilter = $('cardStatus').value; const customers = Object.fromEntries(state.customers.map((row) => [row.id, row]));
  const rows = state.cards.filter((card) => { const status = cardStatus(card); const filterStatus = status === 'Aktif' ? 'active' : status === 'Belum Aktif' ? 'pending' : 'expired'; const customerName = customers[card.customer_id]?.business_name || ''; const text = `${card.card_code || ''} ${customerName} ${card.product_type || ''}`.toLowerCase(); return (!statusFilter || filterStatus === statusFilter) && (!search || text.includes(search)); });
  const active = rows.filter((card) => cardStatus(card) === 'Aktif').length;
  $('cardSummary').innerHTML = `<div class="notice info">Total ${rows.length} kartu • <strong>${active}</strong> aktif • <strong>${rows.length - active}</strong> lainnya</div>`;
  const selected = new Set([...document.querySelectorAll('.card-select:checked')].map((input) => String(input.value)));
  $('cardTable').innerHTML = rows.length ? `<table><thead><tr><th><input id="selectAllCardsTable" type="checkbox" aria-label="Pilih semua kartu"></th><th>Kode</th><th>Jenis</th><th>Customer</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>${rows.map((card) => `<tr><td><input class="card-select" type="checkbox" value="${esc(card.id)}" ${selected.has(String(card.id)) ? 'checked' : ''} aria-label="Pilih kartu ${esc(card.card_code)}"></td><td><strong>${esc(card.card_code)}</strong></td><td>${esc(card.product_type || '-')}</td><td>${esc(customers[card.customer_id]?.business_name || customers[card.customer_id]?.owner_name || '-')}</td><td class="${cardStatus(card) === 'Aktif' ? 'active' : cardStatus(card) === 'Expired' ? 'expired' : 'pending'}">${esc(cardStatus(card))}</td><td>${esc(new Date(card.created_at).toLocaleDateString('id-ID'))}</td><td><button class="btn danger delete-card" type="button" data-card-id="${esc(card.id)}" data-card-code="${esc(card.card_code)}">Hapus</button></td></tr>`).join('')}</tbody></table>` : '<div class="muted">Tidak ada kartu.</div>';
  syncCardSelection();
  $('selectAllCardsTable')?.addEventListener('change', (event) => { document.querySelectorAll('.card-select').forEach((input) => { input.checked = event.target.checked; }); syncCardSelection(); });
  document.querySelectorAll('.card-select').forEach((input) => input.addEventListener('change', syncCardSelection));
  document.querySelectorAll('.delete-card').forEach((button) => button.addEventListener('click', () => deleteSingleCard(button.dataset.cardId, button.dataset.cardCode)));
}
function syncCardSelection() {
  const selected = document.querySelectorAll('.card-select:checked'); const all = document.querySelectorAll('.card-select');
  $('deleteSelectedCards').disabled = selected.length === 0; $('deleteSelectedCards').textContent = selected.length ? `Hapus Pilihan (${selected.length})` : 'Hapus Pilihan';
  const tableAll = $('selectAllCardsTable'); if (tableAll) { tableAll.checked = all.length > 0 && selected.length === all.length; tableAll.indeterminate = selected.length > 0 && selected.length < all.length; }
  const topAll = $('selectAllCards'); if (topAll) { topAll.checked = all.length > 0 && selected.length === all.length; topAll.indeterminate = selected.length > 0 && selected.length < all.length; }
}
async function deleteSingleCard(cardId, cardCode) {
  if (!cardId) return;
  if (!window.confirm(`Hapus kartu "${cardCode || cardId}"? Tindakan ini tidak dapat dibatalkan.`)) return;
  await deleteCards([cardId], `Kartu ${cardCode || cardId} berhasil dihapus.`);
}
async function deleteSelectedCards() {
  const ids = [...document.querySelectorAll('.card-select:checked')].map((input) => input.value).filter(Boolean);
  if (!ids.length) return;
  if (!window.confirm(`Hapus ${ids.length} kartu terpilih? Tindakan ini tidak dapat dibatalkan.`)) return;
  await deleteCards(ids, `${ids.length} kartu berhasil dihapus.`);
}
async function deleteCards(ids, successMessage) {
  const msg = $('cardActionMsg'); const button = $('deleteSelectedCards');
  if (msg) { msg.className = 'notice info'; msg.textContent = `Menghapus ${ids.length} kartu...`; }
  if (button) button.disabled = true;
  try {
    const { error } = await sb.from('Cards').delete().in('id', ids);
    if (error) throw error;
    if (msg) { msg.className = 'notice ok'; msg.textContent = `✓ ${successMessage}`; }
    await load();
    setTimeout(() => { if ($('cardActionMsg')) { $('cardActionMsg').className = 'muted'; $('cardActionMsg').textContent = ''; } }, 3500);
  } catch (error) {
    if (msg) { msg.className = 'notice err'; msg.textContent = `❌ Gagal menghapus kartu: ${esc(error.message)}`; }
    await load();
  }
}
function fillProductOptions() {
  const html = '<option value="">Produk (opsional)</option>' + state.products.map((product) => `<option value="${esc(product.id)}">${esc(product.name || product.category || product.id)}</option>`).join(''); $('singleProduct').innerHTML = html; $('bulkProduct').innerHTML = html;
}
function fillCustomerOptions() {
  const html = '<option value="">Customer (opsional)</option>' + state.customers.map((customer) => `<option value="${esc(customer.id)}">${esc(customer.business_name || customer.owner_name || customer.id)}</option>`).join(''); $('singleCustomer').innerHTML = html; $('bulkCustomer').innerHTML = html;
}
function prepareCustomerRows() {
  const scansByCard = {}; const cardsByCustomer = {};
  state.scans.forEach((scan) => { scansByCard[scan.card_id] = (scansByCard[scan.card_id] || 0) + 1; });
  state.cards.forEach((card) => { if (card.customer_id) (cardsByCustomer[card.customer_id] ||= []).push(card); });
  state.customerRows = state.customers.map((customer) => { const cards = cardsByCustomer[customer.id] || []; const scans = cards.reduce((sum, card) => sum + (scansByCard[card.id] || 0), 0); const types = [...new Set(cards.map((card) => card.product_type).filter(Boolean))].join(', ') || '-'; const url = customer.google_review_url || cards.find((card) => card.google_review_url)?.google_review_url || ''; return { id: customer.id, business_name: customer.business_name || customer.owner_name || '-', product_type: types, status: customerStatus(cards), scans, url }; });
}
function customerStatus(cards) { if (cards.some((card) => cardStatus(card) === 'Aktif')) return 'Aktif'; if (cards.some((card) => cardStatus(card) === 'Belum Aktif')) return 'Pending'; if (cards.some((card) => cardStatus(card) === 'Expired')) return 'Expired'; return 'Pending'; }
function renderCustomers() {
  prepareCustomerRows(); const search = ($('customerSearch').value || '').toLowerCase().trim(); const rows = state.customerRows.filter((customer) => !search || customer.business_name.toLowerCase().includes(search) || String(customer.id).toLowerCase().includes(search));
  $('customerRows').innerHTML = rows.length ? rows.map((customer) => `<tr><td>${esc(customer.id)}</td><td><b>${esc(customer.business_name)}</b></td><td>${esc(customer.product_type)}</td><td>${esc(customer.status)}</td><td>${customer.scans}</td><td>${customer.url ? `<a class="btn" style="text-decoration:none;display:inline-block" href="${esc(customer.url)}" target="_blank" rel="noopener">🔗 Buka Review</a>` : '<span class="muted">Belum ada link</span>'}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>';
}
async function createCards(rows, messageElement) {
  messageElement.className = 'notice info'; messageElement.textContent = 'Memproses...';
  const { data, error } = await sb.from('Cards').insert(rows).select('id,card_code'); if (error) throw error;
  messageElement.className = 'notice ok'; messageElement.textContent = `✓ ${data?.length || rows.length} kartu berhasil dibuat.`; await load();
}

$('singleForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const productId = $('singleProduct').value || null; const customerId = $('singleCustomer').value || null; const product = state.products.find((row) => row.id === productId);
    await createCards([{ card_code: $('singleCode').value.trim(), product_type: product?.category || product?.name || 'Tanpa Jenis', status: 'pending', product_id: productId, customer_id: customerId, google_review_url: $('singleReview').value.trim() || null }], $('singleMsg'));
    event.target.reset();
  } catch (error) { $('singleMsg').className = 'notice err'; $('singleMsg').textContent = `❌ ${esc(error.message)}`; }
});
$('bulkForm')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const codes = [...new Set($('bulkCodes').value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))]; if (!codes.length) return;
  try { const productId = $('bulkProduct').value || null; const customerId = $('bulkCustomer').value || null; const product = state.products.find((row) => row.id === productId); await createCards(codes.map((cardCode) => ({ card_code: cardCode, product_type: product?.category || product?.name || 'Tanpa Jenis', status: 'pending', product_id: productId, customer_id: customerId })), $('bulkMsg')); event.target.reset(); }
  catch (error) { $('bulkMsg').className = 'notice err'; $('bulkMsg').textContent = `❌ ${esc(error.message)}`; }
});
$('loginBtn')?.addEventListener('click', login);
$('password')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') login(); });
$('refresh')?.addEventListener('click', load);
$('logoutTop')?.addEventListener('click', logout);
$('customerSearch')?.addEventListener('input', renderCustomers);
$('cardSearch')?.addEventListener('input', renderCards);
$('cardStatus')?.addEventListener('change', renderCards);
$('year')?.addEventListener('change', renderChart);
$('month')?.addEventListener('change', renderChart);
$('selectAllCards')?.addEventListener('change', (event) => { document.querySelectorAll('.card-select').forEach((input) => { input.checked = event.target.checked; }); syncCardSelection(); });
$('deleteSelectedCards')?.addEventListener('click', deleteSelectedCards);
$('modalClose')?.addEventListener('click', () => $('modal').classList.remove('open'));
$('modal')?.addEventListener('click', (event) => { if (event.target === $('modal')) $('modal').classList.remove('open'); });
function openAddAccount() { $('modalTitle').textContent = 'Tambah Akun'; $('modalBody').innerHTML = '<div class="notice info">Pembuatan akun admin harus melalui proses server-side/privileged auth.</div>'; $('modal').classList.add('open'); }
async function resetDashboard() { if ($('year')) $('year').value = new Date().getFullYear(); if ($('month')) $('month').value = ''; await load(); goDashboard(); }
const currentYear = new Date().getFullYear(); for (let year = currentYear - 3; year <= currentYear + 1; year += 1) $('year')?.insertAdjacentHTML('beforeend', `<option value="${year}">${year}</option>`); if ($('year')) $('year').value = currentYear;
bindNavigation();
(async () => { if (await ensureAdmin()) { await load(); initRoute(); } })();