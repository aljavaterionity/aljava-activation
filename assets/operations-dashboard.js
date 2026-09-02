/* ALJAVA TERIONITY — Operations Dashboard */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  const cfg = window.ALJAVA_CONFIG || {};
  let client = null, installed = false, loading = false;

  function getClient(){
    if(!client && window.__ALJAVA_SUPABASE_CLIENT) client=window.__ALJAVA_SUPABASE_CLIENT;
    if(!client && window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    return client;
  }

  async function getContext(){
    const ctx=window.ALJAVA_BUSINESS_CONTEXT;
    if(!ctx) return null;
    if(!ctx.active) await ctx.load();
    return ctx.active||null;
  }

  function install(){
    if(installed) return;
    const app=$('app'); if(!app) return;
    const section=document.createElement('section'); section.id='operationsView'; section.className='view';
    section.innerHTML=`<div style="margin-top:18px"><h1 style="margin:0">Operations Dashboard</h1><p class="muted">Ringkasan operasional ALJAVA dari data transaksi otomatis.</p></div><section class="stats"><div class="glass stat"><div class="muted">Omzet</div><div id="opsRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Profit</div><div id="opsProfit" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi</div><div id="opsTransactions" class="num">0</div></div><div class="glass stat"><div class="muted">Customer</div><div id="opsCustomers" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Aktif</div><div id="opsActiveCards" class="num">0</div></div><div class="glass stat"><div class="muted">Scan</div><div id="opsScans" class="num">0</div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Status Operasional</h2></div><div class="body"><div id="opsActions" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">System Health</h2><p class="muted" style="margin:5px 0 0">Status koneksi database dan aktivitas data terakhir.</p></div><div class="body"><div id="opsHealth" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Transaksi Terbaru</h2></div><div class="body"><div id="opsRecent" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Produk Terlaris</h2></div><div class="body"><div id="opsTopProducts" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(section); installed=true;
    const menu=$('menuPanel')?.querySelector(':scope > .menu-section .menu-items');
    if(menu && !$('operationsMenu')){
      const b=document.createElement('button'); b.id='operationsMenu'; b.type='button'; b.className='menu-item';
      b.innerHTML='<span class="menu-icon">◈</span><span><b>Operations Dashboard</b><small>Monitor operasional otomatis</small></span>';
      b.onclick=show; menu.appendChild(b);
    }
  }

  function show(){
    install();
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id==='operationsView'));
    $('menuPanel')?.classList.remove('open'); $('menuButton')?.setAttribute('aria-expanded','false');
    history.replaceState?.(null,'','#operations'); window.scrollTo({top:0,behavior:'smooth'}); void load();
  }
  function paymentLabel(status){ const value=String(status||'unpaid').toLowerCase(); if(value==='paid') return '<b class="ops-paid-badge">PAID</b>'; if(value==='partial') return '<b class="ops-paid-badge ops-partial-badge">PARTIAL</b>'; return '<b class="ops-paid-badge ops-unpaid-badge">UNPAID</b>'; }

  async function load(){
    if(loading) return; const sb=getClient(); if(!sb) return; loading=true;
    try{
      const active=await getContext(); if(!active?.id) throw new Error('Unit bisnis aktif belum tersedia.');
      const [tx,customers,cards,products,scanCount,lastScan]=await Promise.all([
        sb.from('Transactions').select('id,product_id,quantity,selling_price,hpp,commission,amount_paid,payment_status,transaction_date').eq('business_unit_id',active.id).order('transaction_date',{ascending:false}),
        sb.from('Customers').select('id'),
        sb.from('Cards').select('id,status,activated_at,expires_at').eq('business_unit_id',active.id),
        sb.from('Product').select('id,name,product_code').eq('business_unit_id',active.id),
        sb.from('CardScans').select('id',{count:'exact',head:true}).eq('business_unit_id',active.id),
        sb.from('CardScans').select('id,scanned_at').eq('business_unit_id',active.id).order('scanned_at',{ascending:false}).limit(1)
      ]);
      const failed=[tx,customers,cards,products,scanCount,lastScan].find(r=>r.error); if(failed) throw failed.error;
      const rows=tx.data||[], pmap=Object.fromEntries((products.data||[]).map(p=>[p.id,p]));
      const revenue=rows.reduce((s,r)=>s+Number(r.selling_price||0)*Number(r.quantity||1),0), hpp=rows.reduce((s,r)=>s+Number(r.hpp||0)*Number(r.quantity||1),0), commission=rows.reduce((s,r)=>s+Number(r.commission||0),0);
      const now=Date.now(), activeCards=(cards.data||[]).filter(c=>c.status==='active' && (!c.expires_at || new Date(c.expires_at).getTime()>=now)).length, pendingCards=(cards.data||[]).filter(c=>c.status==='pending').length, scanTotal=Number(scanCount.count||0);
      $('opsRevenue').textContent=money(revenue); $('opsProfit').textContent=money(revenue-hpp-commission); $('opsTransactions').textContent=rows.length; $('opsCustomers').textContent=(customers.data||[]).length; $('opsActiveCards').textContent=activeCards; $('opsScans').textContent=scanTotal;
      const unpaid=rows.filter(r=>String(r.payment_status||'unpaid').toLowerCase()!=='paid').length;
      $('opsActions').innerHTML=`<table><thead><tr><th>Komponen</th><th>Status</th><th>Jumlah</th></tr></thead><tbody><tr><td>Kartu</td><td>${pendingCards?'🟡 Perlu aktivasi':'🟢 Normal'}</td><td>${pendingCards} pending</td></tr><tr><td>Transaksi</td><td>🟢 Otomatis</td><td>${rows.length} transaksi</td></tr><tr><td>Pembayaran</td><td>${unpaid?'🟡 Ada transaksi belum lunas':'🟢 Lunas'}</td><td>${unpaid} belum lunas</td></tr><tr><td>Revenue</td><td>🟢 Otomatis</td><td>${money(revenue)}</td></tr></tbody></table>`;
      const lastTx=rows[0]?.transaction_date ? new Date(rows[0].transaction_date).toLocaleString('id-ID') : 'Belum ada', lastScanAt=lastScan.data?.[0]?.scanned_at ? new Date(lastScan.data[0].scanned_at).toLocaleString('id-ID') : 'Belum ada';
      $('opsHealth').innerHTML=`<table><thead><tr><th>Komponen</th><th>Status</th><th>Info</th></tr></thead><tbody><tr><td>Unit Bisnis</td><td>🟢 Scoped</td><td>${esc(active.name||active.slug||active.id)}</td></tr><tr><td>Transactions</td><td>🟢 Connected</td><td>Aktivitas terakhir: ${esc(lastTx)}</td></tr><tr><td>CardScans</td><td>🟢 Connected</td><td>Scan terakhir: ${esc(lastScanAt)}</td></tr><tr><td>Dashboard</td><td>🟢 Online</td><td>Refresh: ${esc(new Date().toLocaleString('id-ID'))}</td></tr></tbody></table>`;
      $('opsRecent').innerHTML=rows.slice(0,10).map(r=>`<div style="padding:10px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(pmap[r.product_id]?.name||'Produk')}</strong> · ${esc(r.id)}<br><span class="muted">${esc(new Date(r.transaction_date).toLocaleString('id-ID'))} · ${money(Number(r.selling_price||0)*Number(r.quantity||1))} ${paymentLabel(r.payment_status)}</span></div>`).join('') || '<div class="muted">Belum ada transaksi.</div>';
      const counts={}; rows.forEach(r=>{const key=r.product_id||'unknown'; counts[key]=(counts[key]||0)+Number(r.quantity||1);}); const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
      $('opsTopProducts').innerHTML=top.length?`<table><thead><tr><th>Produk</th><th>Qty</th></tr></thead><tbody>${top.map(([id,q])=>`<tr><td>${esc(pmap[id]?.name||id)}</td><td>${q}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada penjualan.</div>';
    }catch(e){ $('opsHealth').innerHTML=`<div class="notice err">🔴 Database/API gagal: ${esc(e?.message||e)}</div>`; $('opsRecent').innerHTML=`<div class="notice err">❌ Gagal memuat dashboard: ${esc(e?.message||e)}</div>`; }
    finally{loading=false;}
  }

  window.operationsDashboard={show,load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  document.addEventListener('aljava:data-loaded',()=>{if($('operationsView')?.classList.contains('active-view')) void load();});
  document.addEventListener('aljava:business-changed',()=>{if($('operationsView')?.classList.contains('active-view')) void load();});
})();
