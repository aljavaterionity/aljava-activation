/* ALJAVA TERIONITY — Scan Analytics & Reporting */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const client = CORE?.supabase || null;
  if (!client) return;

  let installed = false;
  let loading = false;

  function install() {
    if (installed) return;
    const app = $('app'); if (!app) return;
    if (!$('scanAnalyticsUI')) { const link = document.createElement('link'); link.id = 'scanAnalyticsUI'; link.rel = 'stylesheet'; link.href = '/assets/scan-analytics-ui.css'; document.head.appendChild(link); }
    const section = document.createElement('section');
    section.id = 'analyticsView'; section.className = 'view';
    section.innerHTML = `<div style="margin-top:18px"><h1 style="margin:0">Scan Analytics & Reporting</h1><p class="muted">Pantau penggunaan kartu dan aktivitas pelanggan.</p></div><section class="stats"><div class="glass stat"><div class="muted">Total Scan / Tap</div><div id="anTotal" class="num">0</div></div><div class="glass stat"><div class="muted">30 Hari</div><div id="an30" class="num">0</div></div><div class="glass stat"><div class="muted">Hari Aktif</div><div id="anDays" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Terscan</div><div id="anCards" class="num">0</div></div></section><section class="glass panel"><div class="head"><div class="row"><div><h2 style="margin:0">Aktivitas Scan Terbaru</h2><p class="muted">Data aktual dari CardScans.</p></div><button id="anRefresh" class="btn" type="button">⟳ Refresh</button></div></div><div class="body"><div id="anTable" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Ringkasan Harian</h2></div><div class="body"><div id="anDaily" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(section);
    installed = true;

    const menu = $('menuPanel')?.querySelector(':scope > .menu-section .menu-items');
    if (menu && !$('analyticsMenu')) {
      const button = document.createElement('button');
      button.id = 'analyticsMenu'; button.type = 'button'; button.className = 'menu-item';
      button.innerHTML = '<span class="menu-icon">◈</span><span><b>Scan Analytics</b><small>Analisis aktivitas kartu</small></span>';
      button.addEventListener('click', show);
      const operationsMenu = $('operationsMenu');
      if (operationsMenu?.parentElement === menu) operationsMenu.insertAdjacentElement('afterend', button); else menu.appendChild(button);
    }
    $('anRefresh')?.addEventListener('click', () => void load());
  }

  function show() {
    install();
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'analyticsView'));
    $('menuPanel')?.classList.remove('open'); $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#analytics'); window.scrollTo({ top: 0, behavior: 'smooth' }); void load();
  }
  async function load() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await client.from('CardScans').select('card_id,card_code,event_type,scanned_at').order('scanned_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const cutoff = Date.now() - 30 * 86400000;
      $('anTotal').textContent = String(rows.length);
      $('an30').textContent = String(rows.filter((row) => new Date(row.scanned_at).getTime() >= cutoff).length);
      $('anCards').textContent = String(new Set(rows.map((row) => row.card_id || row.card_code).filter(Boolean)).size);
      $('anDays').textContent = String(new Set(rows.map((row) => String(row.scanned_at || '').slice(0, 10)).filter(Boolean)).size);
      $('anTable').innerHTML = rows.length ? `<table><thead><tr><th>Kartu</th><th>Tipe</th><th>Waktu</th></tr></thead><tbody>${rows.slice(0, 100).map((row) => `<tr><td>${esc(row.card_code || row.card_id || '-')}</td><td>${esc(row.event_type || 'scan')}</td><td>${esc(new Date(row.scanned_at).toLocaleString('id-ID'))}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Belum ada aktivitas scan.</div>';
      const days = {};
      rows.forEach((row) => { const day = String(row.scanned_at || '').slice(0, 10); if (day) days[day] = (days[day] || 0) + 1; });
      const daily = Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
      $('anDaily').innerHTML = daily.length ? `<table><thead><tr><th>Tanggal</th><th>Scan / Tap</th></tr></thead><tbody>${daily.map(([day, count]) => `<tr><td>${esc(new Date(`${day}T00:00:00`).toLocaleDateString('id-ID'))}</td><td>${count}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Belum ada data harian.</div>';
    } catch (error) {
      const message = esc(error?.message || error);
      $('anTable').innerHTML = `<div class="notice err">❌ Gagal memuat analytics: ${message}</div>`;
      $('anDaily').innerHTML = '';
    } finally { loading = false; }
  }

  window.scanAnalytics = Object.freeze({ show, load });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
