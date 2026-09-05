/* ALJAVA TERIONITY — Admin application controller */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const CONFIG = CORE?.CONFIG;
  const sb = CORE?.supabase;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const money = CORE?.money || ((value) => Number(value) || 0);
  if (!CONFIG || !sb) throw new Error('ALJAVA core/Supabase client tidak tersedia.');

  const state = { cards: [], products: [], customers: [], transactions: [], scans: [] };
  let loading = false;

  function closeMenu() { $('menuPanel')?.classList.remove('open'); $('menuButton')?.setAttribute('aria-expanded', 'false'); }
  function openMenu() { const panel = $('menuPanel'); const button = $('menuButton'); if (!panel || !button) return; panel.classList.add('open'); button.setAttribute('aria-expanded', 'true'); }
  function toggleMenu() { $('menuPanel')?.classList.contains('open') ? closeMenu() : openMenu(); }
  function showView(viewId) {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === viewId));
    document.querySelectorAll('#menuPanel .menu-item').forEach((item) => item.classList.remove('active'));
    const menuId = { dashboardView:'dashboardMenu', cardsView:'cardsMenu', productView:'productMenu', customersView:'customerMenu', salesView:'salesMenu', operationsView:'operationsMenu', analyticsView:'analyticsMenu' }[viewId];
    if (menuId) $(menuId)?.classList.add('active');
    closeMenu(); window.scrollTo({ top: 0, behavior: 'smooth' });
    const hash = viewId.replace(/View$/, '').replace(/^product$/, 'products'); history.replaceState?.(null, '', `#${hash}`);
  }
  function goDashboard() { showView('dashboardView'); }
  function initRoute() {
    const hash = location.hash.replace(/^#/, '').toLowerCase();
    if (hash === 'cards' || hash === 'cardsview') showView('cardsView');
    else if (hash === 'product' || hash === 'productview' || hash === 'products') { showView('productView'); void window.productManager?.loadProducts?.(); }
    else if (hash === 'customers' || hash === 'customersview') { showView('customersView'); void window.customerManager?.loadCustomers?.(); }
    else if (hash === 'sales' || hash === 'salesview') window.salesDashboard?.show?.();
    else if (hash === 'operations' || hash === 'operationsview') window.operationsDashboard?.show?.();
    else if (hash === 'analytics' || hash === 'analyticsview') window.scanAnalytics?.show?.();
    else goDashboard();
  }
  function bindNavigation() {
    const on = (id, event, handler) => $(id)?.addEventListener(event, handler);
    on('menuButton', 'click', (event) => { event.preventDefault(); event.stopPropagation(); toggleMenu(); });
    on('closeMenu', 'click', (event) => { event.preventDefault(); closeMenu(); });
    on('dashboardMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); goDashboard(); });
    on('cardsMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); showView('cardsView'); });
    on('productMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); showView('productView'); void window.productManager?.loadProducts?.(); });
    on('customerMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); showView('customersView'); void window.customerManager?.loadCustomers?.(); });
    on('addAccountMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); openAddAccount(); });
    on('logoutMenu', 'click', (event) => { event.preventDefault(); event.stopPropagation(); void logout(); });
    document.addEventListener('click', (event) => { const panel = $('menuPanel'); const button = $('menuButton'); if (panel?.classList.contains('open') && !panel.contains(event.target) && event.target !== button) closeMenu(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeMenu(); $('modal')?.classList.remove('open'); } });
  }
  function setLoggedOut(message = '') { if ($('app')) $('app').style.display = 'none'; $('login')?.classList.remove('hidden'); $('menuButton')?.classList.remove('visible'); closeMenu(); if ($('loginMsg')) $('loginMsg').innerHTML = message ? `<div class="notice err">❌ ${esc(message)}</div>` : ''; }
  async function ensureAdmin() {
    try {
      const { data: { session } = {} } = await sb.auth.getSession(); if (!session) { setLoggedOut(); return false; }
      const { data: { user } = {}, error: userError } = await sb.auth.getUser();
      if (userError || !user) { await sb.auth.signOut({ scope: 'local' }); setLoggedOut('Sesi login tidak valid.'); return false; }
      const { data: isAdmin, error: adminError } = await sb.rpc('is_admin_user');
      if (adminError || isAdmin !== true) { await sb.auth.signOut({ scope: 'local' }); setLoggedOut(adminError ? 'Gagal memeriksa hak admin.' : 'Akun bukan admin.'); return false; }
      $('login')?.classList.add('hidden'); if ($('app')) $('app').style.display = 'block'; $('menuButton')?.classList.add('visible'); if ($('userEmail')) $('userEmail').textContent = user.email || ''; return true;
    } catch (error) { setLoggedOut(error.message || 'Gagal memeriksa sesi admin.'); return false; }
  }
  async function login() {
    const email = $('email')?.value.trim(); const password = $('password')?.value;
    if (!email || !password) { if ($('loginMsg')) $('loginMsg').innerHTML = '<div class="notice err">Email dan password wajib diisi.</div>'; return; }
    const button = $('loginBtn'); if (button) button.disabled = true;
    try { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; if (await ensureAdmin()) { await load(); goDashboard(); } }
    catch (error) { if ($('loginMsg')) $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`; }
    finally { if (button) button.disabled = false; }
  }
  async function logout() { await sb.auth.signOut({ scope: 'local' }); setLoggedOut(); }
  async function queryTable(table, select, orderBy, timeoutMs = 10000) {
    const request = (async () => { let query = sb.from(table).select(select); if (orderBy) query = query.order(orderBy, { ascending: false }); const { data, error } = await query; if (error) throw error; return data || []; })();
    const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error(`${table}: permintaan data timeout`)), timeoutMs));
    return Promise.race([request, timeout]);
  }
  async function load() {
    if (loading) return; loading = true;
    try {
      const jobs = {
        cards: queryTable('Cards', 'id,card_code,product_type,status,customer_id,product_id,google_review_url,created_at,activated_at,expires_at,activation_url,qr_code_url,nfc_url', 'created_at'),
        products: queryTable('Product', 'id,name,category,product_code', 'name'),
        customers: queryTable('Customers', 'id,business_name,owner_name,google_review_url,created_at,whatsapp,email,product_type,total_reviews', 'created_at'),
        transactions: queryTable('Transactions', 'id,customer_id,card_id,product_id,quantity,selling_price,payment_status,transaction_date', 'transaction_date'),
        scans: queryTable('CardScans', 'id,card_id,card_code,event_type,scanned_at', 'scanned_at')
      };
      const results = await Promise.all(Object.entries(jobs).map(async ([key, promise]) => { try { return [key, await promise, null]; } catch (error) { return [key, [], error]; } }));
      results.forEach(([key, data, error]) => {
        state[key] = data; if (key === 'cards') window.__ALJAVA_CARDS = data; if (key === 'customers') window.__ALJAVA_CUSTOMERS = data;
        const host = { customers:'customerRows', transactions:'txTable', scans:'scanSummary' }[key];
        if (error && $(host)) $(host).innerHTML = key === 'customers' ? `<tr><td colspan="6"><div class="notice err">❌ ${esc(error.message)}</div></td></tr>` : `<div class="notice err">❌ ${esc(error.message)}</div>`;
      });
      renderAll(); document.dispatchEvent(new CustomEvent('aljava:data-loaded'));
    } finally { loading = false; }
  }
  function cardStatus(card) { const status = String(card.status || '').toLowerCase(); if (card.expires_at && new Date(card.expires_at) < new Date()) return 'Expired'; if (status === 'active' || card.activated_at) return 'Aktif'; return 'Belum Aktif'; }
  function renderStats() {
    const now = new Date();
    const revenue = state.transactions.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
    const monthRevenue = state.transactions.filter((row) => { const date = new Date(row.transaction_date); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); }).reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
    const monthScan = state.scans.filter((row) => { const date = new Date(row.scanned_at); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); }).length;
    $('totalRev').textContent = money(revenue); $('monthRev').textContent = money(monthRevenue); $('totalScan').textContent = String(state.scans.length); $('monthScan').textContent = String(monthScan); $('activeCards').textContent = String(state.cards.filter((card) => cardStatus(card) === 'Aktif').length); $('pendingCards').textContent = String(state.cards.filter((card) => cardStatus(card) === 'Belum Aktif').length);
  }
  function renderChart() {
    const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; const year = Number($('year')?.value) || new Date().getFullYear(); const selectedMonth = $('month')?.value ?? ''; const totals = Array(12).fill(0);
    state.transactions.forEach((row) => { const date = new Date(row.transaction_date); if (date.getFullYear() === year) totals[date.getMonth()] += Number(row.selling_price || 0) * Number(row.quantity || 1); });
    const rows = selectedMonth === '' ? totals.map((value, index) => ({ value, index })) : [{ value: totals[Number(selectedMonth)] || 0, index: Number(selectedMonth) }]; const max = Math.max(1, ...rows.map((row) => row.value));
    if ($('chart')) $('chart').innerHTML = rows.map((row) => `<div class="bar" title="${names[row.index]}: ${money(row.value)}"><i style="height:${Math.max(5, row.value / max * 220)}px"></i><span>${names[row.index]}</span></div>`).join('');
    if ($('chartTotal')) $('chartTotal').textContent = `Total periode: ${money(rows.reduce((sum, row) => sum + row.value, 0))} • ${state.transactions.length} transaksi terbaca`;
  }
  function renderTransactions() {
    const customers = Object.fromEntries(state.customers.map((row) => [row.id, row])); const products = Object.fromEntries(state.products.map((row) => [row.id, row])); const rows = state.transactions.slice(0, 12);
    $('txTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(new Date(row.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(customers[row.customer_id]?.business_name || customers[row.customer_id]?.owner_name || '-')}</td><td>${esc(products[row.product_id]?.name || '-')}</td><td>${Number(row.quantity || 1)}</td><td>${money(Number(row.selling_price || 0) * Number(row.quantity || 1))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">Belum ada transaksi.</div>';
  }
  function renderScans() { const counts = {}; state.scans.forEach((scan) => { const key = scan.card_code || scan.card_id || '-'; counts[key] = (counts[key] || 0) + 1; }); const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10); $('scanSummary').innerHTML = rows.length ? rows.map(([code, count]) => `<div class="row" style="padding:9px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(code)}</strong><span class="muted">${count} scan/tap</span></div>`).join('') : '<div class="muted">Belum ada scan/tap.</div>'; }
  function renderAll() { renderStats(); renderChart(); renderTransactions(); renderScans(); }
  function openAddAccount() { $('modalTitle').textContent = 'Tambah Akun'; $('modalBody').innerHTML = '<div class="notice info">Pembuatan akun admin harus melalui proses server-side/privileged auth.</div>'; $('modal').classList.add('open'); }
  function bindUi() {
    $('loginBtn')?.addEventListener('click', login); $('password')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') void login(); });
    $('refreshMenu')?.addEventListener('click', async (event) => { event.preventDefault(); event.stopPropagation(); const button = $('refreshMenu'); if (!button) return; button.disabled = true; try { await load(); } finally { button.disabled = false; } });
    $('modalClose')?.addEventListener('click', () => $('modal')?.classList.remove('open')); $('modal')?.addEventListener('click', (event) => { if (event.target === $('modal')) $('modal').classList.remove('open'); });
    $('year')?.addEventListener('change', renderChart); $('month')?.addEventListener('change', renderChart); window.addEventListener('hashchange', initRoute); sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') setLoggedOut(); });
  }
  const currentYear = new Date().getFullYear(); for (let year = currentYear - 3; year <= currentYear + 1; year += 1) $('year')?.insertAdjacentHTML('beforeend', `<option value="${year}">${year}</option>`); if ($('year')) $('year').value = currentYear;
  window.adminApi = Object.freeze({ load, goDashboard, showView, getState: () => state }); bindNavigation(); bindUi();
  (async () => { if (await ensureAdmin()) { await load(); initRoute(); } })().catch((error) => setLoggedOut(error.message || 'Gagal memulai dashboard admin.'));
})();
