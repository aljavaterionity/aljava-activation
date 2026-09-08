/* ALJAVA TERIONITY — Dashboard card sales attribution (stable renderer) */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const client = CORE?.supabase || null;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  if (!client) return;

  let loading = false;
  let rendering = false;
  let observer = null;
  let timer = null;

  const style = () => {
    if (document.getElementById('aljava-card-sales-attribution-style')) return;
    const s = document.createElement('style');
    s.id = 'aljava-card-sales-attribution-style';
    s.textContent = `
      #dashboardView #cardTable .card-sales-attribution{min-width:150px;white-space:nowrap;background:#0f1216!important;color:#d3d7de!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.055)!important;box-shadow:none!important;padding:11px 14px!important}
      #dashboardView #cardTable tbody tr:nth-child(even) .card-sales-attribution{background:#0d1014!important}
      #dashboardView #cardTable tbody tr:hover .card-sales-attribution{background:#15191f!important}
      #dashboardView #cardTable .card-sales-attribution .muted{display:inline-flex!important;align-items:center!important;width:max-content!important;max-width:100%!important;padding:4px 7px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:7px!important;background:rgba(255,255,255,.035)!important;color:#8d95a3!important;line-height:1.1!important}
      #dashboardView #cardTable .card-sales-attribution .sales-attribution-name{font-weight:700;color:#f4f4f5}
      #dashboardView #cardTable .card-sales-attribution .sales-attribution-meta{display:block;margin-top:2px;color:#8f949d;font-size:10px;line-height:1.25}
      #dashboardView #cardTable .card-sales-attribution.holder .sales-attribution-meta{color:#8bd3ff}
      #dashboardView #cardTable .card-sales-attribution.activated .sales-attribution-meta{color:#6ee7b7}
      @media(max-width:650px){#dashboardView #cardTable .card-sales-attribution{min-width:130px;padding:9px 10px!important}}
    `;
    document.head.appendChild(s);
  };

  async function fetchAttribution() {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 10000);
    try {
      const request = client.rpc('admin_dashboard_card_sales_attribution');
      const { data, error } = await Promise.race([
        request,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Atribusi sales: permintaan data timeout')), 10000))
      ]);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } finally { clearTimeout(timerId); }
  }

  function buildMap(rows) { return new Map(rows.map((row) => [String(row.card_id), row])); }

  function render() {
    if (rendering) return false;
    const host = $('cardTable');
    if (!host || !host.closest('#dashboardView') || !host.querySelector('table')) return false;
    const previousObserver = observer;
    rendering = true;
    previousObserver?.disconnect();
    try {
      const map = buildMap(window.__ALJAVA_CARD_SALES_ATTRIBUTION || []);
      host.querySelectorAll('table thead tr').forEach((tr) => {
        if (!tr.querySelector('[data-card-sales-attr-header="1"]')) {
          const th = document.createElement('th');
          th.textContent = 'Kelola';
          th.dataset.cardSalesAttrHeader = '1';
          tr.appendChild(th);
        }
      });
      host.querySelectorAll('table tbody tr').forEach((tr) => {
        if (tr.children.length === 1 && tr.querySelector('.notice, .muted')) return;
        const selector = tr.querySelector('.card-select');
        const cardId = selector?.value || '';
        if (!cardId) return;
        let cell = tr.querySelector('td.card-sales-attribution');
        if (!cell) { cell = document.createElement('td'); cell.className = 'card-sales-attribution'; tr.appendChild(cell); }
        const a = map.get(String(cardId));
        let cls = '', html = '<span class="muted">Belum dipegang</span>';
        if (a?.activated_by_sales_name) { cls='activated'; html=`<span class="sales-attribution-name">${esc(a.activated_by_sales_name)}</span><span class="sales-attribution-meta">Diaktivasi oleh Sales</span>`; }
        else if (a?.held_by_sales_name) { cls='holder'; html=`<span class="sales-attribution-name">${esc(a.held_by_sales_name)}</span><span class="sales-attribution-meta">Dipegang Sales</span>`; }
        const className = `card-sales-attribution${cls ? ` ${cls}` : ''}`;
        if (cell.className !== className || cell.innerHTML !== html) { cell.className = className; cell.innerHTML = html; }
      });
      return true;
    } finally {
      rendering = false;
      if (previousObserver) previousObserver.observe(host, { childList: true, subtree: true });
    }
  }

  async function refresh() {
    if (loading || !document.querySelector('#dashboardView.active-view')) return;
    loading = true;
    try { window.__ALJAVA_CARD_SALES_ATTRIBUTION = await fetchAttribution(); style(); render(); }
    catch (error) { console.warn('[ALJAVA] card sales attribution:', error?.message || error); }
    finally { loading = false; }
  }

  function schedule(delay = 80) { clearTimeout(timer); timer = setTimeout(() => { void refresh(); render(); }, delay); }

  function bind() {
    style();
    const host = $('cardTable');
    if (host && !observer) { observer = new MutationObserver(() => { if (!rendering) render(); }); observer.observe(host, { childList: true, subtree: true }); }
    document.addEventListener('aljava:data-loaded', () => schedule(80));
    document.addEventListener('aljava:cards-created', () => schedule(120));
    document.addEventListener('aljava:cards-deleted', () => schedule(120));
    document.addEventListener('aljava:data-refresh-requested', () => schedule(100));
    window.addEventListener('hashchange', () => schedule(80));
    schedule(120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();
