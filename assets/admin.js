/* ALJAVA TERIONITY — Global Admin Dashboard
   /admin is the single main dashboard and always aggregates every business.
   Business-specific operations stay inside each business context. */
(() => {
  'use strict';

  const CONFIG = window.ALJAVA_CONFIG;
  const sb = window.__ALJAVA_SUPABASE_RAW_CLIENT || window.__ALJAVA_SUPABASE_CLIENT || window.supabase?.createClient?.(CONFIG?.supabaseUrl, CONFIG?.supabaseKey);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const money = (value) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value) || 0);
  const state = { businesses:[], transactions:[], scans:[], cards:[], customers:[] };

  if (!CONFIG || !sb) {
    if ($('loginMsg')) $('loginMsg').innerHTML = '<div class="notice err">Library Supabase gagal dimuat. Muat ulang halaman.</div>';
    return;
  }

  function closeMenu() { $('menuPanel')?.classList.remove('open'); $('menuButton')?.setAttribute('aria-expanded', 'false'); }
  function toggleMenu() {
    const panel = $('menuPanel'); const button = $('menuButton'); if (!panel || !button) return;
    const open = panel.classList.toggle('open'); button.setAttribute('aria-expanded', String(open));
  }
  function setLoggedOut(message = '') {
    $('app').style.display = 'none'; $('login').classList.remove('hidden'); $('menuButton').classList.remove('visible'); closeMenu();
    $('loginMsg').innerHTML = message ? `<div class="notice err">❌ ${esc(message)}</div>` : '';
  }
  async function ensureAdmin() {
    try {
      const { data: { session } = {} } = await sb.auth.getSession(); if (!session) { setLoggedOut(); return false; }
      const { data: { user } = {}, error: userError } = await sb.auth.getUser();
      if (userError || !user) { await sb.auth.signOut({ scope:'local' }); setLoggedOut('Sesi login tidak valid.'); return false; }
      const { data: isAdmin, error: adminError } = await sb.rpc('is_admin_user');
      if (adminError || isAdmin !== true) { await sb.auth.signOut({ scope:'local' }); setLoggedOut(adminError ? 'Gagal memeriksa hak admin.' : 'Akun bukan admin.'); return false; }
      $('login').classList.add('hidden'); $('app').style.display = 'block'; $('menuButton').classList.add('visible'); $('userEmail').textContent = user.email || '';
      return true;
    } catch (error) { setLoggedOut(error.message || 'Gagal memeriksa sesi admin.'); return false; }
  }
  async function login() {
    const email = $('email').value.trim(); const password = $('password').value;
    if (!email || !password) { $('loginMsg').innerHTML = '<div class="notice err">Email dan password wajib diisi.</div>'; return; }
    $('loginBtn').disabled = true;
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`; return; }
      if (await ensureAdmin()) await loadGlobalDashboard();
    } catch (error) { $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`; }
    finally { $('loginBtn').disabled = false; }
  }
  async function logout() { await sb.auth.signOut({ scope:'local' }); location.reload(); }
  async function query(table, select, orderBy) {
    let builder = sb.from(table).select(select); if (orderBy) builder = builder.order(orderBy, { ascending:false });
    const { data, error } = await builder; if (error) throw error; return data || [];
  }
  async function loadGlobalDashboard() {
    const jobs = [
      ['businesses', query('business_units', 'id,name,slug,status,unit_type', 'name')],
      ['transactions', query('Transactions', 'id,quantity,selling_price,payment_status,transaction_date,business_unit_id', 'transaction_date')],
      ['scans', query('CardScans', 'id,event_type,scanned_at,business_unit_id', 'scanned_at')],
      ['cards', query('Cards', 'id,status,activated_at,business_unit_id', 'created_at')],
      ['customers', query('Customers', 'id,business_unit_id', 'created_at')]
    ];
    const results = await Promise.all(jobs.map(async ([key, promise]) => { try { return [key, await promise, null]; } catch (error) { return [key, [], error]; } }));
    const errors = []; results.forEach(([key, data, error]) => { state[key] = data; if (error) errors.push(`${key}: ${error.message}`); });
    renderGlobal(); if (errors.length) $('platformHealth').innerHTML = `<div class="notice err">Sebagian data belum dapat dimuat: ${esc(errors.join(' • '))}</div>`;
  }
  function revenueOf(row) { return Number(row.selling_price || 0) * Number(row.quantity || 1); }
  function renderGlobal() {
    const businesses = state.businesses.filter((b) => b.unit_type === 'business');
    const activeBusinesses = businesses.filter((b) => String(b.status || '').toLowerCase() === 'active');
    const totalRevenue = state.transactions.reduce((sum,row) => sum + revenueOf(row), 0); const now = new Date();
    const monthRevenue = state.transactions.filter((row) => { const d=new Date(row.transaction_date); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }).reduce((sum,row) => sum + revenueOf(row),0);
    const activeCards = state.cards.filter((card) => String(card.status || '').toLowerCase()==='active' || card.activated_at).length;
    $('totalRev').textContent=money(totalRevenue); $('monthRev').textContent=money(monthRevenue); $('totalBusinesses').textContent=String(businesses.length); $('activeBusinesses').textContent=String(activeBusinesses.length); $('totalTransactions').textContent=String(state.transactions.length); $('totalCustomers').textContent=String(state.customers.length); $('activeCards').textContent=String(activeCards); $('totalScan').textContent=String(state.scans.length);
    fillYearOptions(); renderChart(); renderBusinessOverview(businesses); renderActivity(monthRevenue); renderHealth(businesses,activeBusinesses);
  }
  function fillYearOptions() {
    const select=$('year'); if (!select || select.options.length) return; const years=new Set([new Date().getFullYear()]);
    state.transactions.forEach((row) => { const year=new Date(row.transaction_date).getFullYear(); if(Number.isFinite(year)) years.add(year); });
    [...years].sort((a,b)=>b-a).forEach((year)=>{const option=document.createElement('option');option.value=String(year);option.textContent=String(year);select.appendChild(option)}); select.value=String(new Date().getFullYear());
  }
  function renderChart() {
    const names=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; const year=Number($('year').value)||new Date().getFullYear(); const selectedMonth=$('month').value; const totals=Array(12).fill(0);
    state.transactions.forEach((row)=>{const date=new Date(row.transaction_date);if(date.getFullYear()===year)totals[date.getMonth()]+=revenueOf(row)});
    const rows=selectedMonth===''?totals.map((value,index)=>({value,index})):[{value:totals[Number(selectedMonth)]||0,index:Number(selectedMonth)}]; const max=Math.max(1,...rows.map((row)=>row.value));
    $('chart').innerHTML=rows.map((row)=>`<div class="bar" title="${names[row.index]}: ${money(row.value)}"><i style="height:${Math.max(5,row.value/max*220)}px"></i><span>${names[row.index]}</span></div>`).join('');
    $('chartTotal').textContent=`Total periode: ${money(rows.reduce((sum,row)=>sum+row.value,0))} • ${state.transactions.length} transaksi seluruh bisnis`;
  }
  function renderBusinessOverview(businesses) {
    const totals=Object.fromEntries(businesses.map((b)=>[b.id,{revenue:0,transactions:0,scans:0}]));
    state.transactions.forEach((row)=>{if(totals[row.business_unit_id]){totals[row.business_unit_id].revenue+=revenueOf(row);totals[row.business_unit_id].transactions+=1}}); state.scans.forEach((row)=>{if(totals[row.business_unit_id])totals[row.business_unit_id].scans+=1});
    const rows=businesses.map((business)=>({business,...totals[business.id]})).sort((a,b)=>b.revenue-a.revenue);
    $('businessOverview').innerHTML=rows.length?rows.map(({business,revenue,transactions,scans})=>`<div class="row global-business-row"><div><strong>${esc(business.name||business.slug||'Unit Bisnis')}</strong><div class="muted">${esc(String(business.status||'unknown'))}</div></div><div class="global-business-metrics"><strong>${money(revenue)}</strong><span class="muted">${transactions} transaksi • ${scans} scan</span></div></div>`).join(''):'<div class="muted">Belum ada unit bisnis.</div>';
  }
  function renderActivity(monthRevenue) {
    const now=new Date(); const monthTransactions=state.transactions.filter((row)=>{const d=new Date(row.transaction_date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length; const monthScans=state.scans.filter((row)=>{const d=new Date(row.scanned_at);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length;
    $('activitySummary').innerHTML=`<div class="global-summary-line"><span>Revenue bulan ini</span><strong>${money(monthRevenue)}</strong></div><div class="global-summary-line"><span>Transaksi bulan ini</span><strong>${monthTransactions}</strong></div><div class="global-summary-line"><span>Scan / tap bulan ini</span><strong>${monthScans}</strong></div><div class="global-summary-line"><span>Total scan / tap</span><strong>${state.scans.length}</strong></div>`;
  }
  function renderHealth(businesses,activeBusinesses){const activeRatio=businesses.length?Math.round(activeBusinesses.length/businesses.length*100):0;$('platformHealth').innerHTML=`<div class="global-health-grid"><div><span class="muted">Status data</span><strong class="health-ok">Terhubung</strong></div><div><span class="muted">Bisnis aktif</span><strong>${activeRatio}%</strong></div><div><span class="muted">Transaksi terbaca</span><strong>${state.transactions.length}</strong></div><div><span class="muted">Scan / tap terbaca</span><strong>${state.scans.length}</strong></div></div>`;}
  function bind(){
    $('menuButton')?.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();toggleMenu()}); $('closeMenu')?.addEventListener('click',closeMenu); $('dashboardMenu')?.addEventListener('click',closeMenu); $('refreshMenu')?.addEventListener('click',async()=>{closeMenu();await loadGlobalDashboard()}); $('logoutMenu')?.addEventListener('click',logout); $('loginBtn')?.addEventListener('click',login); $('password')?.addEventListener('keydown',(event)=>{if(event.key==='Enter')login()}); $('year')?.addEventListener('change',renderChart); $('month')?.addEventListener('change',renderChart); $('modalClose')?.addEventListener('click',()=>$('modal')?.classList.remove('open'));
    document.addEventListener('click',(event)=>{const panel=$('menuPanel');const button=$('menuButton');if(panel?.classList.contains('open')&&!panel.contains(event.target)&&event.target!==button)closeMenu()}); document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeMenu();$('modal')?.classList.remove('open')}});
  }
  window.ALJAVA_GLOBAL_DASHBOARD=Object.freeze({refresh:loadGlobalDashboard});
  (async function init(){bind();if(await ensureAdmin())await loadGlobalDashboard()})();
})();
