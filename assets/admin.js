/* ALJAVA TERIONITY — Global Admin Dashboard (/admin) */
(()=>{
'use strict';

const CONFIG=window.ALJAVA_CONFIG;
const sb=(CONFIG&&window.supabase?.createClient)
  ? window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey)
  : null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'
}[c]));
const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const state={businesses:[],transactions:[],scans:[],cards:[],customers:[]};

if(!CONFIG||!sb){
  $('loginMsg')?.insertAdjacentHTML('beforeend','<div class="notice err">Library Supabase gagal dimuat. Muat ulang halaman.</div>');
  return;
}

function closeMenu(){
  $('menuPanel')?.classList.remove('open');
  $('menuButton')?.setAttribute('aria-expanded','false');
}

function toggleMenu(){
  const panel=$('menuPanel'),button=$('menuButton');
  if(!panel||!button)return;
  const open=panel.classList.toggle('open');
  button.setAttribute('aria-expanded',String(open));
}

function setLoggedOut(message=''){
  $('app').style.display='none';
  $('login').classList.remove('hidden');
  $('menuButton').classList.remove('visible');
  closeMenu();
  if($('loginMsg'))$('loginMsg').innerHTML=message?`<div class="notice err">❌ ${esc(message)}</div>`:'';
}

async function ensureAdmin(){
  try{
    const {data:{session}={}}=await sb.auth.getSession();
    if(!session){setLoggedOut();return false;}
    const {data:{user}={},error:userError}=await sb.auth.getUser();
    if(userError||!user){setLoggedOut('Sesi login tidak valid.');return false;}
    const {data:isAdmin,error:adminError}=await sb.rpc('is_admin_user');
    if(adminError){setLoggedOut(`Pemeriksaan admin gagal: ${adminError.message}`);return false;}
    if(isAdmin!==true){setLoggedOut('Akun ini bukan admin.');return false;}
    $('login').classList.add('hidden');
    $('app').style.display='block';
    $('menuButton').classList.add('visible');
    $('userEmail').textContent=user.email||'';
    return true;
  }catch(e){
    setLoggedOut(e.message||'Gagal memeriksa sesi admin.');
    return false;
  }
}

async function login(){
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||!password){
    $('loginMsg').innerHTML='<div class="notice err">Email dan password wajib diisi.</div>';
    return;
  }
  const button=$('loginBtn');
  button.disabled=true;
  $('loginMsg').innerHTML='<div class="muted">Memeriksa login...</div>';
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){
      $('loginMsg').innerHTML=`<div class="notice err">❌ ${esc(error.message)}</div>`;
      return;
    }
    if(!data?.session){
      $('loginMsg').innerHTML='<div class="notice err">❌ Login tidak menghasilkan sesi.</div>';
      return;
    }
    if(await ensureAdmin())await loadGlobalDashboard();
  }catch(e){
    $('loginMsg').innerHTML=`<div class="notice err">❌ ${esc(e.message||'Login gagal.')}</div>`;
  }finally{
    button.disabled=false;
  }
}

async function logout(){
  await sb.auth.signOut({scope:'local'});
  location.reload();
}

async function query(table,select,orderBy){
  let q=sb.from(table).select(select);
  if(orderBy)q=q.order(orderBy,{ascending:false});
  const {data,error}=await q;
  if(error)throw error;
  return data||[];
}

async function queryAdminBusinesses(){
  // Gunakan query tabel langsung dengan RLS admin sebagai sumber daftar bisnis.
  // Tidak bergantung pada RPC tambahan agar menu tetap tampil walau RPC gagal/cache schema belum refresh.
  const {data,error}=await sb
    .from('business_units')
    .select('id,name,slug,status,unit_type')
    .eq('unit_type','business')
    .eq('status','active')
    .order('name',{ascending:true});
  if(error)throw error;
  return Array.isArray(data)?data:[];
}

function renderBusinessCategories(){
  const host=$('businessCategories');
  if(!host)return;
  const businesses=state.businesses.filter(b=>b.unit_type==='business'&&String(b.status||'').toLowerCase()==='active');
  if(!businesses.length){
    host.innerHTML='<div class="business-menu-empty">Belum ada bisnis aktif.</div>';
    return;
  }
  host.innerHTML=businesses.map(b=>{
    const name=esc(b.name||b.slug||'Bisnis');
    const initial=esc((b.name||b.slug||'B').trim().slice(0,1).toUpperCase());
    return `<button class="business-menu-item" type="button" data-business-id="${esc(b.id)}"><span class="business-icon">${initial}</span><span class="business-copy"><b>${name}</b><small>Buka dashboard bisnis</small></span><span aria-hidden="true">›</span></button>`;
  }).join('');
  host.querySelectorAll('[data-business-id]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.businessId;
    if(id){closeMenu();location.href=`/business-dashboard.html?business_unit_id=${encodeURIComponent(id)}`;}
  }));
}

async function loadGlobalDashboard(){
  const jobs=[
    ['businesses',queryAdminBusinesses()],
    ['transactions',query('Transactions','id,quantity,selling_price,payment_status,transaction_date,business_unit_id','transaction_date')],
    ['scans',query('CardScans','id,event_type,scanned_at,business_unit_id','scanned_at')],
    ['cards',query('Cards','id,status,activated_at,business_unit_id','created_at')],
    ['customers',query('Customers','id,business_unit_id','created_at')]
  ];
  const results=await Promise.all(jobs.map(async([key,promise])=>{
    try{return [key,await promise,null];}
    catch(error){return [key,[],error];}
  }));
  const errors=[];
  results.forEach(([key,data,error])=>{
    state[key]=data;
    if(error)errors.push(`${key}: ${error.message}`);
  });
  renderBusinessCategories();
  renderGlobal();
  if(errors.length){
    $('platformHealth').insertAdjacentHTML('afterbegin',`<div class="notice err" style="margin-bottom:12px">Sebagian data belum dapat dimuat: ${esc(errors.join(' • '))}</div>`);
  }
}

function isPaid(row){return String(row.payment_status||'').toLowerCase()==='paid';}
function revenueOf(row){return isPaid(row)?Number(row.selling_price||0)*Number(row.quantity||1):0;}

function renderGlobal(){
  const businesses=state.businesses.filter(b=>b.unit_type==='business');
  const active=businesses.filter(b=>String(b.status||'').toLowerCase()==='active');
  const now=new Date();
  const total=state.transactions.reduce((sum,row)=>sum+revenueOf(row),0);
  const month=state.transactions.filter(row=>{
    const date=new Date(row.transaction_date);
    return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  }).reduce((sum,row)=>sum+revenueOf(row),0);
  const activeCards=state.cards.filter(card=>String(card.status||'').toLowerCase()==='active'||card.activated_at).length;
  $('totalRev').textContent=money(total);
  $('monthRev').textContent=money(month);
  $('totalBusinesses').textContent=businesses.length;
  $('activeBusinesses').textContent=active.length;
  $('totalTransactions').textContent=state.transactions.length;
  $('totalCustomers').textContent=state.customers.length;
  $('activeCards').textContent=activeCards;
  $('totalScan').textContent=state.scans.length;
  fillYearOptions();
  renderChart();
  renderBusinessOverview(businesses);
  renderActivity(month);
  renderHealth(businesses,active);
}

function fillYearOptions(){
  const select=$('year');
  if(!select||select.options.length)return;
  const years=new Set([new Date().getFullYear()]);
  state.transactions.forEach(row=>{
    const year=new Date(row.transaction_date).getFullYear();
    if(Number.isFinite(year))years.add(year);
  });
  [...years].sort((a,b)=>b-a).forEach(year=>{
    const option=document.createElement('option');
    option.value=year;
    option.textContent=year;
    select.appendChild(option);
  });
  select.value=new Date().getFullYear();
}

function renderChart(){
  const names=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const year=Number($('year').value)||new Date().getFullYear();
  const month=$('month').value;
  const totals=Array(12).fill(0);
  state.transactions.forEach(row=>{
    const date=new Date(row.transaction_date);
    if(date.getFullYear()===year)totals[date.getMonth()]+=revenueOf(row);
  });
  const rows=month===''?totals.map((value,index)=>({value,index})):[{value:totals[Number(month)]||0,index:Number(month)}];
  const max=Math.max(1,...rows.map(row=>row.value));
  $('chart').innerHTML=rows.map(row=>`<div class="bar" title="${names[row.index]}: ${money(row.value)}"><i style="height:${Math.max(5,row.value/max*220)}px"></i><span>${names[row.index]}</span></div>`).join('');
  $('chartTotal').textContent=`Total periode: ${money(rows.reduce((sum,row)=>sum+row.value,0))} • ${state.transactions.length} transaksi seluruh bisnis`;
}

function renderBusinessOverview(businesses){
  const totals=Object.fromEntries(businesses.map(b=>[b.id,{revenue:0,transactions:0,scans:0}]));
  state.transactions.forEach(row=>{
    if(totals[row.business_unit_id]){
      totals[row.business_unit_id].revenue+=revenueOf(row);
      totals[row.business_unit_id].transactions++;
    }
  });
  state.scans.forEach(row=>{if(totals[row.business_unit_id])totals[row.business_unit_id].scans++;});
  const rows=businesses.map(b=>({business:b,...totals[b.id]})).sort((a,b)=>b.revenue-a.revenue);
  $('businessOverview').innerHTML=rows.length?rows.map(row=>`<div class="row global-business-row"><div><strong>${esc(row.business.name||row.business.slug||'Unit Bisnis')}</strong><div class="muted">${esc(String(row.business.status||'unknown'))}</div></div><div class="global-business-metrics"><strong>${money(row.revenue)}</strong><span class="muted">${row.transactions} transaksi • ${row.scans} scan</span></div></div>`).join(''):'<div class="muted">Belum ada unit bisnis.</div>';
}

function renderActivity(monthRevenue){
  const now=new Date();
  const monthlyTransactions=state.transactions.filter(row=>{
    const date=new Date(row.transaction_date);
    return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  }).length;
  const monthlyScans=state.scans.filter(row=>{
    const date=new Date(row.scanned_at);
    return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  }).length;
  $('activitySummary').innerHTML=`<div class="global-summary-line"><span>Revenue bulan ini</span><strong>${money(monthRevenue)}</strong></div><div class="global-summary-line"><span>Transaksi bulan ini</span><strong>${monthlyTransactions}</strong></div><div class="global-summary-line"><span>Scan / tap bulan ini</span><strong>${monthlyScans}</strong></div><div class="global-summary-line"><span>Total scan / tap</span><strong>${state.scans.length}</strong></div>`;
}

function renderHealth(businesses,active){
  const ratio=businesses.length?Math.round(active.length/businesses.length*100):0;
  $('platformHealth').innerHTML=`<div class="global-health-grid"><div><span class="muted">Status data</span><strong class="health-ok">Terhubung</strong></div><div><span class="muted">Bisnis aktif</span><strong>${ratio}%</strong></div><div><span class="muted">Transaksi terbaca</span><strong>${state.transactions.length}</strong></div><div><span class="muted">Scan / tap terbaca</span><strong>${state.scans.length}</strong></div></div>`;
}

function bind(){
  $('menuButton')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleMenu();});
  $('closeMenu')?.addEventListener('click',closeMenu);
  $('dashboardMenu')?.addEventListener('click',closeMenu);
  $('refreshMenu')?.addEventListener('click',async()=>{closeMenu();await loadGlobalDashboard();});
  $('logoutMenu')?.addEventListener('click',logout);
  $('loginBtn')?.addEventListener('click',login);
  $('password')?.addEventListener('keydown',event=>{if(event.key==='Enter')login();});
  $('year')?.addEventListener('change',renderChart);
  $('month')?.addEventListener('change',renderChart);
  $('modalClose')?.addEventListener('click',()=>$('modal')?.classList.remove('open'));
  document.addEventListener('click',event=>{
    const panel=$('menuPanel'),button=$('menuButton');
    if(panel?.classList.contains('open')&&!panel.contains(event.target)&&event.target!==button)closeMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeMenu();$('modal')?.classList.remove('open');}
  });
}

window.ALJAVA_GLOBAL_DASHBOARD=Object.freeze({refresh:loadGlobalDashboard});
(async function init(){
  bind();
  if(await ensureAdmin())await loadGlobalDashboard();
})();
})();
