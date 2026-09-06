/* ALJAVA TERIONITY — Dashboard card sales attribution */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const client = CORE?.supabase || null;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  if (!client) return;

  let loading = false;
  let observer = null;
  let timer = null;

  const style = () => {
    if (document.getElementById('aljava-card-sales-attribution-style')) return;
    const s = document.createElement('style');
    s.id = 'aljava-card-sales-attribution-style';
    s.textContent = `
      #dashboardView #cardTable .card-sales-attribution{min-width:150px;white-space:nowrap}
      #dashboardView #cardTable .card-sales-attribution .sales-attribution-name{font-weight:700;color:#f4f4f5}
      #dashboardView #cardTable .card-sales-attribution .sales-attribution-meta{display:block;margin-top:2px;color:#8f949d;font-size:10px;line-height:1.25}
      #dashboardView #cardTable .card-sales-attribution.holder .sales-attribution-meta{color:#8bd3ff}
      #dashboardView #cardTable .card-sales-attribution.activated .sales-attribution-meta{color:#6ee7b7}
      @media(max-width:650px){#dashboardView #cardTable .card-sales-attribution{min-width:130px}}
    `;
    document.head.appendChild(s);
  };

  async function fetchAttribution() {
    const { data, error } = await client.rpc('admin_dashboard_card_sales_attribution');
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  function buildMap(rows) {
    return new Map(rows.map((row) => [String(row.card_id), row]));
  }

  function render() {
    const host = $('cardTable');
    if (!host || !host.closest('#dashboardView') || !host.querySelector('table')) return false;
    const map = buildMap(window.__ALJAVA_CARD_SALES_ATTRIBUTION || []);
    const headers = host.querySelectorAll('table thead tr');
    headers.forEach((tr) => {
      if (![...tr.children].some((cell) => cell.dataset.cardSalesAttrHeader === '1')) {
        const th = document.createElement('th');
        th.textContent = 'Kelola';
        th.dataset.cardSalesAttrHeader = '1';
        tr.appendChild(th);
      }
    });

    host.querySelectorAll('table tbody tr').forEach((tr) => {
      if (tr.children.length === 1 && tr.querySelector('.notice')) return;
      const selector = tr.querySelector('.card-select');
      const cardId = selector?.value || '';
      if (!cardId) return;
      let cell = tr.querySelector('td.card-sales-attribution');
      if (!cell) {
        cell = document.createElement('td');
        cell.className = 'card-sales-attribution';
        tr.appendChild(cell);
      }
      const a = map.get(String(cardId));
      const isActivated = Boolean(a?.activated_by_sales_name);
      const holder = a?.held_by_sales_name || '';
      if (isActivated) {
        cell.classList.add('activated');
        cell.classList.remove('holder');
        cell.innerHTML = `<span class="sales-attribution-name">${esc(a.activated_by_sales_name)}</span><span class="sales-attribution-meta">Diaktivasi oleh Sales</span>`;
      } else if (holder) {
        cell.classList.add('holder');
        cell.classList.remove('activated');
        cell.innerHTML = `<span class="sales-attribution-name">${esc(holder)}</span><span class="sales-attribution-meta">Dipegang Sales</span>`;
      } else {
        cell.classList.remove('holder', 'activated');
        cell.innerHTML = '<span class="muted">Belum dipegang</span>';
      }
    });
    return true;
  }

  async function refresh() {
    if (loading || !document.querySelector('#dashboardView.active-view')) return;
    loading = true;
    try {
      window.__ALJAVA_CARD_SALES_ATTRIBUTION = await fetchAttribution();
      style();
      render();
    } catch (error) {
      console.warn('[ALJAVA] card sales attribution:', error?.message || error);
    } finally {
      loading = false;
    }
  }

  function schedule(delay = 80) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
      render();
    }, delay);
  }

  function bind() {
    style();
    const host = $('cardTable');
    if (host && !observer) {
      observer = new MutationObserver(() => render());
      observer.observe(host, { childList: true, subtree: true });
    }
    document.addEventListener('aljava:data-loaded', () => schedule(80));
    document.addEventListener('aljava:cards-created', () => schedule(120));
    document.addEventListener('aljava:cards-deleted', () => schedule(120));
    document.addEventListener('aljava:data-refresh-requested', () => schedule(100));
    window.addEventListener('hashchange', () => schedule(80));
    schedule(120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
