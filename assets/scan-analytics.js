/* ALJAVA TERIONITY — Scan Analytics & Reporting */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const cfg = window.ALJAVA_CONFIG || {};
  let sb, installed=false, loading=false, reloadAfterBusinessChange=false;
  function client(){ if(!sb && window.__ALJAVA_SUPABASE_CLIENT) sb=window.__ALJAVA_SUPABASE_CLIENT; if(!sb && window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey); return sb; }
  async function getBusinessUnitId(){ const ctx=window.ALJAVA_BUSINESS_CONTEXT; if(!ctx) throw new Error('Konteks unit bisnis belum tersedia.'); if(!ctx.active) await ctx.load(); if(!ctx.active?.id) throw new Error('Unit bisnis aktif belum tersedia.'); return ctx.active.id; }
  function install(){
    if(installed)return; const app=$('app'); if(!app)return;
    if(!$('scanAnalyticsUI')){const link=document.createElement('link');link.id='scanAnalyticsUI';link.rel='stylesheet';link.href='/assets/scan-analytics-ui.css';document.head.appendChild(link);}
    const s=document.createElement('section'); s.id='analyticsView'; s.className='view';
    s.innerHTML=`<div style="margin-top:18px"><h1 style="margin:0">Scan Analytics & Reporting</h1><p class="muted">Pantau penggunaan kartu dan aktivitas pelanggan pada unit bisnis aktif.</p></div><section class="stats"><div class="glass stat"><div class="muted">Total Scan / Tap</div><div id="anTotal" class="num">0</div></div><div class="glass stat"><div class="muted">30 Hari</div><div id="an30" class="num">0</div></div><div class="glass stat"><div class="muted">Hari Aktif</div><div id="anDays" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Terscan</div><div id="anCards" class="num">0</div></div></section><section class="glass panel"><div class="head"><div class="row"><div><h2 style="margin:0">Aktivitas Scan Terbaru</h2><p class="muted">Data aktual dari CardScans unit bisnis aktif.</p></div><button id="anRefresh" class="btn" type="button">⟳ Refresh</button></div></div><div class="body"><div id="anTable" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Ringkasan Harian</h2></div><div class="body"><div id="anDaily" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(s); installed=true;
    const menu=$('menuPanel')?.querySelector(':scope > .menu-settings .menu-items');
    if(menu&&!$('analyticsMenu')){const b=document.createElement('button');b.id='analyticsMenu';b.type='button';b.className='btn';b.textContent='Scan Analytics';b.onclick=show;menu.insertBefore(b,$('refreshMenu')||null)}
    $('anRefresh')?.addEventListener('click',()=>void load());
  }
  function show(){install();document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id==='analyticsView'));$('menuPanel')?.classList.remove('open');$('menuButton')?.setAttribute('aria-expanded','false');history.replaceState?.(null,'','#analytics');window.scrollTo({top:0,behavior:'smooth'});void load();}
  async function load(){
    if(loading){reloadAfterBusinessChange=true;return;}
    const db=client();if(!db)return;
    loading=true;
    try{
      const businessUnitId=await getBusinessUnitId();
      const {data,error}=await db.from('CardScans').select('card_id,card_code,event_type,scanned_at').eq('business_unit_id',businessUnitId).order('scanned_at',{ascending:false});
      if(error)throw error;
      const rows=data||[], cutoff=Date.now()-30*86400000;
      $('anTotal').textContent=rows.length;
      $('an30').textContent=rows.filter(r=>new Date(r.scanned_at).getTime()>=cutoff).length;
      $('anCards').textContent=new Set(rows.map(r=>r.card_id||r.card_code).filter(Boolean)).size;
      $('anDays').textContent=new Set(rows.map(r=>String(r.scanned_at||'').slice(0,10)).filter(Boolean)).size;
      $('anTable').innerHTML=rows.length?`<table><thead><tr><th>Kartu</th><th>Tipe</th><th>Waktu</th></tr></thead><tbody>${rows.slice(0,100).map(r=>`<tr><td>${esc(r.card_code||r.card_id||'-')}</td><td>${esc(r.event_type||'scan')}</td><td>${esc(new Date(r.scanned_at).toLocaleString('id-ID'))}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada aktivitas scan.</div>';
      const days={}; rows.forEach(r=>{const d=String(r.scanned_at||'').slice(0,10);if(d)days[d]=(days[d]||0)+1});
      const daily=Object.entries(days).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30);
      $('anDaily').innerHTML=daily.length?`<table><thead><tr><th>Tanggal</th><th>Scan / Tap</th></tr></thead><tbody>${daily.map(([d,n])=>`<tr><td>${esc(new Date(`${d}T00:00:00`).toLocaleDateString('id-ID'))}</td><td>${n}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada data harian.</div>';
    }catch(e){
      const message=esc(e?.message||e);
      $('anTable').innerHTML=`<div class="notice err">❌ Gagal memuat analytics: ${message}</div>`;
      $('anDaily').innerHTML='';
    }finally{loading=false;if(reloadAfterBusinessChange){reloadAfterBusinessChange=false;void load();}}
  }
  window.scanAnalytics={show,load};
  document.addEventListener('aljava:business-changed',()=>{if($('analyticsView')?.classList.contains('active-view'))void load();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();