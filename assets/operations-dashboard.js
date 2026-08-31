/* ALJAVA TERIONITY — Operations Dashboard */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  const cfg = window.ALJAVA_CONFIG || {};
  let client = null, installed = false, loading = false;
  function getClient(){ if(!client && window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey); return client; }
  function install(){
    if(installed) return;
    const app=$('app'); if(!app) return;
    const section=document.createElement('section'); section.id='operationsView'; section.className='view';
    section.innerHTML=`<div style="margin-top:18px"><h1 style="margin:0">Operations Dashboard</h1><p class="muted">Ringkasan operasional ALJAVA dari data database.</p></div><section class="stats"><div class="glass stat"><div class="muted">Omzet</div><div id="opsRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Profit</div><div id="opsProfit" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Piutang</div><div id="opsReceivable" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi</div><div id="opsTransactions" class="num">0</div></div></section><section class="stats"><div class="glass stat"><div class="muted">Customer</div><div id="opsCustomers" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Aktif</div><div id="opsActiveCards" class="num">0</div></div><div class="glass stat"><div class="muted">Produk</div><div id="opsProducts" class="num">0</div></div><div class="glass stat"><div class="muted">Scan</div><div id="opsScans" class="num">0</div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Transaksi Terbaru</h2></div><div class="body"><div id="opsRecent" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Produk Terlaris</h2></div><div class="body"><div id="opsTopProducts" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(section); installed=true;
    const menu=$('menuPanel')?.querySelector(':scope > .menu-settings .menu-items');
    if(menu && !$('operationsMenu')){ const b=document.createElement('button');b.id='operationsMenu';b.type='button';b.className='btn';b.textContent='Operations Dashboard';b.onclick=()=>show();menu.insertBefore(b,menu.firstChild); }
  }
  function show(){ install(); document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id==='operationsView')); $('menuPanel')?.classList.remove('open'); history.replaceState?.(null,'','#operations'); window.scrollTo({top:0,behavior:'smooth'}); void load(); }
  async function load(){
    if(loading) return; const sb=getClient(); if(!sb) return; loading=true;
    try{
      const [tx,customers,cards,products,scans]=await Promise.all([
        sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,amount_paid,payment_status,transaction_date,due_date').order('transaction_date',{ascending:false}),
        sb.from('Customers').select('id'), sb.from('Cards').select('id,status'), sb.from('Product').select('id,name,product_code'), sb.from('CardScans').select('id')
      ]);
      for(const r of [tx,customers,cards,products,scans]) if(r.error) throw r.error;
      const rows=tx.data||[], pmap=Object.fromEntries((products.data||[]).map(p=>[p.id,p]));
      const revenue=rows.reduce((s,r)=>s+Number(r.selling_price||0)*Number(r.quantity||1),0);
      const hpp=rows.reduce((s,r)=>s+Number(r.hpp||0)*Number(r.quantity||1),0);
      const commission=rows.reduce((s,r)=>s+Number(r.commission||0),0);
      const paid=rows.reduce((s,r)=>s+Number(r.amount_paid||0),0);
      $('opsRevenue').textContent=money(revenue); $('opsProfit').textContent=money(revenue-hpp-commission); $('opsReceivable').textContent=money(Math.max(0,revenue-paid)); $('opsTransactions').textContent=rows.length; $('opsCustomers').textContent=(customers.data||[]).length; $('opsActiveCards').textContent=(cards.data||[]).filter(c=>c.status==='active').length; $('opsProducts').textContent=(products.data||[]).length; $('opsScans').textContent=(scans.data||[]).length;
      $('opsRecent').innerHTML=rows.slice(0,10).map(r=>`<div style="padding:10px 0;border-bottom:1px solid var(--border)"><strong>${esc(pmap[r.product_id]?.name||'Produk')}</strong> · ${esc(r.id)}<br><span class="muted">${esc(new Date(r.transaction_date).toLocaleString('id-ID'))} · ${money(Number(r.selling_price||0)*Number(r.quantity||1))} · ${esc(r.payment_status||'unpaid')}</span></div>`).join('') || '<div class="muted">Belum ada transaksi.</div>';
      const counts={}; rows.forEach(r=>{counts[r.product_id]=(counts[r.product_id]||0)+Number(r.quantity||1)}); const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
      $('opsTopProducts').innerHTML=top.length?`<table><thead><tr><th>Produk</th><th>Qty</th></tr></thead><tbody>${top.map(([id,q])=>`<tr><td>${esc(pmap[id]?.name||id)}</td><td>${q}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada penjualan.</div>';
    }catch(e){ $('opsRecent').innerHTML=`<div class="notice err">❌ Gagal memuat dashboard: ${esc(e?.message||e)}</div>`; }
    finally{loading=false;}
  }
  window.operationsDashboard={show,load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  document.addEventListener('aljava:data-loaded',()=>{if($('operationsView')?.classList.contains('active-view')) void load();});
})();