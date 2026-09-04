/* ALJAVA TERIONITY — Scan Analytics & Reporting */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const cfg = window.ALJAVA_CONFIG || {};
  let sb, installed=false, loading=false;

  function install(){
    if(installed)return;
    const app=$('app');if(!app)return;
    if(!$('scanAnalyticsUI')){const link=document.createElement('link');link.id='scanAnalyticsUI';link.rel='stylesheet';link.href='/assets/scan-analytics-ui.css';document.head.appendChild(link);}
    if(!$('scanAnalyticsMenuUI')){
      const style=document.createElement('style');
      style.id='scanAnalyticsMenuUI';
      style.textContent=`#analyticsMenu{display:flex;align-items:center;gap:12px;text-align:left}#analyticsMenu .scan-analytics-menu-icon{display:grid;place-items:center;width:48px;height:48px;min-width:48px;border-radius:16px;background:linear-gradient(145deg,#06b6d4,#0891b2);box-shadow:0 10px 22px rgba(8,145,178,.18);color:#fff}#analyticsMenu .scan-analytics-menu-icon svg{width:24px;height:24px;display:block}#analyticsMenu .scan-analytics-menu-label{font-weight:800}`;
      document.head.appendChild(style);
    }

    const s=document.createElement('section');s.id='analyticsView';s.className='view';
    s.innerHTML=`<div style="margin-top:18px"><h1 style="margin:0">Scan Analytics & Reporting</h1><p class="muted">Pantau penggunaan kartu dan aktivitas pelanggan.</p></div><section class="stats"><div class="glass stat"><div class="muted">Total Scan / Tap</div><div id="anTotal" class="num">0</div></div><div class="glass stat"><div class="muted">30 Hari</div><div id="an30" class="num">0</div></div><div class="glass stat"><div class="muted">Hari Aktif</div><div id="anDays" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Terscan</div><div id="anCards" class="num">0</div></div></section><section class="glass panel"><div class="head"><div class="row"><div><h2 style="margin:0">Aktivitas Scan Terbaru</h2><p class="muted">Data aktual dari CardScans.</p></div><button id="anRefresh" class="btn" type="button">⟳ Refresh</button></div></div><div class="body"><div id="anTable" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Ringkasan Harian</h2></div><div class="body"><div id="anDaily" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(s);installed=true;

    const menu=$('menuPanel')?.querySelector(':scope > .menu-section .menu-items');
    if(menu&&!$('analyticsMenu')){
      const b=document.createElement('button');
      b.id='analyticsMenu';
      b.type='button';
      b.className='menu-item';
      b.innerHTML=`<span class="menu-icon scan-analytics-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V10"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3 19h18"/></svg></span><span><b>Scan Analytics</b><small>Analisis aktivitas kartu</small></span>`;
      b.onclick=show;
      const operationsMenu=$('operationsMenu');
      if(operationsMenu?.parentElement===menu) operationsMenu.insertAdjacentElement('afterend',b);
      else menu.appendChild(b);
    }
    $('anRefresh')?.addEventListener('click',()=>void load());
  }

  function client(){if(!sb&&window.supabase?.createClient&&cfg.supabaseUrl&&cfg.supabaseKey)sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);return sb;}
  function show(){install();document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id==='analyticsView'));$('menuPanel')?.classList.remove('open');$('menuButton')?.setAttribute('aria-expanded','false');history.replaceState?.(null,'','#analytics');window.scrollTo({top:0,behavior:'smooth'});void load();}
  async function load(){
    if(loading)return;const db=client();if(!db)return;loading=true;
    try{
      const {data,error}=await db.from('CardScans').select('card_id,card_code,event_type,scanned_at').order('scanned_at',{ascending:false});
      if(error)throw error;
      const rows=data||[],cutoff=Date.now()-30*86400000;
      $('anTotal').textContent=rows.length;$('an30').textContent=rows.filter(r=>new Date(r.scanned_at).getTime()>=cutoff).length;$('anCards').textContent=new Set(rows.map(r=>r.card_id||r.card_code).filter(Boolean)).size;$('anDays').textContent=new Set(rows.map(r=>String(r.scanned_at||'').slice(0,10)).filter(Boolean)).size;
      $('anTable').innerHTML=rows.length?`<table><thead><tr><th>Kartu</th><th>Tipe</th><th>Waktu</th></tr></thead><tbody>${rows.slice(0,100).map(r=>`<tr><td>${esc(r.card_code||r.card_id||'-')}</td><td>${esc(r.event_type||'scan')}</td><td>${esc(new Date(r.scanned_at).toLocaleString('id-ID'))}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada aktivitas scan.</div>';
      const days={};rows.forEach(r=>{const d=String(r.scanned_at||'').slice(0,10);if(d)days[d]=(days[d]||0)+1});const daily=Object.entries(days).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30);
      $('anDaily').innerHTML=daily.length?`<table><thead><tr><th>Tanggal</th><th>Scan / Tap</th></tr></thead><tbody>${daily.map(([d,n])=>`<tr><td>${esc(new Date(`${d}T00:00:00`).toLocaleDateString('id-ID'))}</td><td>${n}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Belum ada data harian.</div>';
    }catch(e){const message=esc(e?.message||e);$('anTable').innerHTML=`<div class="notice err">❌ Gagal memuat analytics: ${message}</div>`;$('anDaily').innerHTML='';}finally{loading=false;}
  }
  window.scanAnalytics={show,load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
