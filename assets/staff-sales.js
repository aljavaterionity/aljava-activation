/* ALJAVA TERIONITY — Staff Sales Workspace */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const sb = CORE?.supabase;
  const money = CORE?.money || ((v) => Number(v) || 0);
  const esc = CORE?.esc || ((v) => String(v ?? ''));
  const $ = (id) => document.getElementById(id);
  if (!sb) return;

  const state = { products: {}, customers: {}, transactions: [] };
  let loading = false;

  const setLoggedIn = (user) => {
    $('loginView')?.classList.add('hidden'); $('workspace')?.classList.remove('hidden');
    if ($('staffEmail')) $('staffEmail').textContent = user?.email || 'Staff Sales';
  };
  const setLoggedOut = (message = '') => {
    $('workspace')?.classList.add('hidden'); $('loginView')?.classList.remove('hidden');
    if ($('loginMsg')) $('loginMsg').innerHTML = message ? `<div class="notice err">❌ ${esc(message)}</div>` : '';
  };

  async function hasSalesAccess(userId) {
    const { data, error } = await sb.from('business_memberships').select('role,status').eq('user_id', userId).eq('status', 'active');
    if (error) throw error;
    return (data || []).some((row) => ['sales', 'admin', 'owner', 'manager'].includes(String(row.role || '').toLowerCase()));
  }

  async function login() {
    const email = $('staffEmailInput')?.value.trim(); const password = $('staffPassword')?.value || '';
    if (!email || !password) { $('loginMsg').innerHTML = '<div class="notice err">Email dan password wajib diisi.</div>'; return; }
    $('staffLoginBtn').disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!(await hasSalesAccess(data.user.id))) { await sb.auth.signOut({ scope: 'local' }); throw new Error('Akun tidak memiliki akses Staff Sales.'); }
      setLoggedIn(data.user); await loadSales();
    } catch (error) { setLoggedOut(error?.message || 'Login gagal.'); }
    finally { $('staffLoginBtn').disabled = false; }
  }

  async function logout() { await sb.auth.signOut({ scope: 'local' }); setLoggedOut(); }

  function getPeriod() {
    const start = $('salesStart')?.value || ''; const end = $('salesEnd')?.value || '';
    return { start: start ? new Date(`${start}T00:00:00`) : null, end: end ? new Date(`${end}T23:59:59.999`) : null };
  }

  async function loadSales() {
    if (loading) return; loading = true;
    const refresh = $('salesRefresh');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Memuat…'; }
    try {
      const [txResult, productsResult, customersResult] = await Promise.all([
        sb.from('Transactions').select('id,transaction_code,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date,amount_paid').order('transaction_date', { ascending: false }),
        sb.from('Product').select('id,name,product_code'), sb.from('Customers').select('id,business_name,owner_name')
      ]);
      if (txResult.error) throw txResult.error; if (productsResult.error) throw productsResult.error; if (customersResult.error) throw customersResult.error;
      state.products = Object.fromEntries((productsResult.data || []).map((x) => [x.id, x]));
      state.customers = Object.fromEntries((customersResult.data || []).map((x) => [x.id, x]));
      const { start, end } = getPeriod();
      state.transactions = (txResult.data || []).filter((row) => { const d = new Date(row.transaction_date); return (!start || d >= start) && (!end || d <= end); });
      render();
    } catch (error) { $('salesTable').innerHTML = `<div class="notice err">❌ Gagal memuat data: ${esc(error?.message || error)}</div>`; }
    finally { loading = false; if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh'; } }
  }

  function render() {
    const tx = state.transactions;
    const revenue = tx.reduce((s, r) => s + Number(r.selling_price || 0) * Number(r.quantity || 1), 0);
    const hpp = tx.reduce((s, r) => s + Number(r.hpp || 0) * Number(r.quantity || 1), 0);
    const commission = tx.reduce((s, r) => s + Number(r.commission || 0), 0);
    const paid = tx.reduce((s, r) => s + Math.min(Math.max(Number(r.amount_paid || 0), 0), Number(r.selling_price || 0) * Number(r.quantity || 1)), 0);
    $('salesRevenue').textContent = money(revenue); $('salesHpp').textContent = money(hpp); $('salesCommission').textContent = money(commission);
    $('salesGrossProfit').textContent = money(revenue - hpp - commission); $('salesPaid').textContent = money(paid); $('salesTransactions').textContent = String(tx.length);
    $('salesTable').innerHTML = tx.length ? `<div class="table-wrap"><table><thead><tr><th>Transaksi</th><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Omzet</th><th>Dibayar</th><th>Status</th></tr></thead><tbody>${tx.slice(0,150).map((r) => { const p = state.products[r.product_id] || {}; const c = state.customers[r.customer_id] || {}; const rev = Number(r.selling_price || 0) * Number(r.quantity || 1); const pay = Math.min(Math.max(Number(r.amount_paid || 0), 0), rev); return `<tr><td><strong class="code">${esc(r.transaction_code || '-')}</strong></td><td>${esc(new Date(r.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(c.business_name || c.owner_name || '-')}</td><td>${esc(p.name || '-')}</td><td>${Number(r.quantity || 1)}</td><td class="revenue">${money(rev)}</td><td>${money(pay)}</td><td class="status">${esc(r.payment_status || '-')}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Belum ada transaksi pada periode ini.</div>';
  }

  async function startSession(session) {
    if (!session?.user) return setLoggedOut();
    try {
      if (!(await hasSalesAccess(session.user.id))) { await sb.auth.signOut({ scope: 'local' }); setLoggedOut('Akun tidak memiliki akses Staff Sales.'); return; }
      setLoggedIn(session.user); await loadSales();
    } catch (error) { setLoggedOut(error?.message || 'Gagal memeriksa akses Staff Sales.'); }
  }

  async function boot() {
    $('staffLoginBtn')?.addEventListener('click', login); $('staffPassword')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void login(); });
    $('staffLogout')?.addEventListener('click', () => void logout()); $('salesRefresh')?.addEventListener('click', () => void loadSales());
    $('salesStart')?.addEventListener('change', () => void loadSales()); $('salesEnd')?.addEventListener('change', () => void loadSales());
    sb.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT') setLoggedOut(); else if (event === 'SIGNED_IN') void startSession(session); });
    const { data: { session } = {} } = await sb.auth.getSession(); if (session?.user) await startSession(session); else setLoggedOut();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else void boot();
})();
