/* ALJAVA TERIONITY — Main Menu controller */
(() => {
  'use strict';

  const panel = () => document.getElementById('menuPanel');
  const normalize = (value) => String(value || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    sales: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
    cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
    product: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5"/></svg>',
    customer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H7.2A4.2 4.2 0 0 0 3 19.2V21"/><circle cx="9.5" cy="7.5" r="4"/><path d="M21 21v-1.8a4.2 4.2 0 0 0-3-4M16 3.7a4 4 0 0 1 0 7.6"/></svg>',
    operations: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h17"/><rect x="7" y="13" width="2.8" height="4" rx=".7"/><rect x="11.2" y="10" width="2.8" height="7" rx=".7"/><rect x="15.4" y="7" width="2.8" height="10" rx=".7"/><path d="m7 10 4-3 3 2 5-5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.7-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14M21 19v-5h-5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M3 21v-1.5A4.5 4.5 0 0 1 7.5 15h3A4.5 4.5 0 0 1 15 19.5V21"/><path d="M18 8v6M15 11h6"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m15 16 4-4-4-4M19 12H9"/></svg>'
  };
  const iconFor = (id) => ({ dashboardMenu: 'dashboard', salesMenu: 'sales', cardsMenu: 'cards', productMenu: 'product', customerMenu: 'customer', operationsMenu: 'operations', analyticsMenu: 'analytics', refreshMenu: 'refresh', resetMenu: 'reset', addAccountMenu: 'add', logoutMenu: 'logout' }[id] || 'dashboard');
  const descriptions = {
    dashboardmenu: 'Ringkasan bisnis & performa', salesmenu: 'Omzet, transaksi & performa', cardsmenu: 'Buat dan kelola kartu',
    productmenu: 'Master produk & harga', customermenu: 'Data pelanggan & kartu', operationsmenu: 'Monitor operasional otomatis',
    analyticsmenu: 'Analisis aktivitas kartu', refreshmenu: 'Muat data terbaru', resetmenu: 'Reset data operasional', addaccountmenu: 'Kelola akses admin', logoutmenu: 'Akhiri sesi admin'
  };

  function enhanceButton(button) {
    if (!button?.id || button.dataset.menuEnhanced === '1') return;
    const icon = iconFor(button.id);
    const title = button.querySelector('b')?.textContent?.trim() || button.textContent.trim();
    const description = descriptions[button.id.toLowerCase()] || button.querySelector('small')?.textContent?.trim() || '';
    button.classList.add('menu-item');
    button.innerHTML = `<span class="menu-icon">${ICONS[icon]}</span><span><b>${title}</b>${description ? `<small>${description}</small>` : ''}</span>`;
    if (button.id === 'resetMenu' || button.id === 'logoutMenu') button.classList.add('danger');
    button.dataset.menuEnhanced = '1';
  }

  function setActive(root) {
    if (!root) return;
    const map = { '#dashboard': 'dashboardMenu', '#sales': 'salesMenu', '#cards': 'cardsMenu', '#products': 'productMenu', '#product': 'productMenu', '#customers': 'customerMenu', '#operations': 'operationsMenu', '#analytics': 'analyticsMenu' };
    const activeId = map[String(location.hash || '').toLowerCase()] || 'dashboardMenu';
    root.querySelectorAll('.menu-item').forEach((item) => item.classList.toggle('active', item.id === activeId));
  }

  function orderItems(container, ids) {
    if (!container) return;
    ids.forEach((id) => { const item = container.querySelector(`#${id}`); if (item) container.appendChild(item); });
  }

  function brightenCardCodes() {
    document.querySelectorAll('#dashboardView #cardTable tbody td:nth-child(2) strong').forEach((code) => {
      code.style.fontWeight = '800';
      code.style.background = 'linear-gradient(90deg,#0050E7,#0075F2,#0091FA)';
      code.style.backgroundClip = 'text';
      code.style.webkitBackgroundClip = 'text';
      code.style.color = 'transparent';
      code.style.webkitTextFillColor = 'transparent';
      code.style.filter = 'drop-shadow(0 0 7px rgba(0,117,242,.14))';
    });
  }

  function ensureCardTableTheme() {
    if (document.getElementById('aljavaCardTableTheme')) return;
    const link = document.createElement('link');
    link.id = 'aljavaCardTableTheme';
    link.rel = 'stylesheet';
    link.href = '/assets/card-table-theme.css?v=status-outline-20260905-2210';
    document.head.appendChild(link);
  }

  function ensureDashboardMainTheme() {
    if (document.getElementById('aljavaDashboardMainTheme')) return;
    const link = document.createElement('link');
    link.id = 'aljavaDashboardMainTheme';
    link.rel = 'stylesheet';
    link.href = '/assets/dashboard-main-theme.css?v=dashboard-unified-20260905-2318';
    document.head.appendChild(link);
  }

  function clean() {
    const root = panel();
    if (!root) return;
    const mainItems = root.querySelector('.menu-section > .menu-items');
    const settingsItems = root.querySelector('.menu-settings .menu-items');
    if (!mainItems || !settingsItems) return;

    root.querySelectorAll('button').forEach((button) => {
      if (normalize(button.textContent) === 'hpp') button.remove();
    });
    const salesButtons = [...root.querySelectorAll('button')].filter((button) => normalize(button.textContent) === 'dashboard penjualan');
    const sales = root.querySelector('#salesMenu') || salesButtons[0];
    salesButtons.forEach((button) => { if (button !== sales) button.remove(); });
    if (sales && sales.parentElement !== mainItems) mainItems.appendChild(sales);

    orderItems(mainItems, ['dashboardMenu', 'salesMenu', 'cardsMenu', 'productMenu', 'customerMenu', 'operationsMenu', 'analyticsMenu']);
    orderItems(settingsItems, ['refreshMenu', 'addAccountMenu', 'resetMenu', 'logoutMenu']);
    root.querySelectorAll('.menu-item').forEach(enhanceButton);
    setActive(root);
    brightenCardCodes();
    document.getElementById('logoutTop')?.remove();
    document.querySelectorAll('#salesView').forEach((view, index) => { if (index > 0) view.remove(); });
  }

  window.menuController = Object.freeze({ refresh: clean });
  const schedule = () => window.setTimeout(clean, 0);
  ensureCardTableTheme();
  ensureDashboardMainTheme();
  window.addEventListener('hashchange', schedule);
  document.addEventListener('aljava:sales-ui-ready', schedule);
  document.addEventListener('aljava:data-loaded', schedule);
  document.addEventListener('aljava:cards-created', () => window.setTimeout(clean, 220));
  document.addEventListener('aljava:data-refresh-requested', () => window.setTimeout(clean, 220));
  document.addEventListener('aljava:cards-deleted', () => window.setTimeout(clean, 220));
  document.getElementById('cardSearch')?.addEventListener('input', () => window.setTimeout(brightenCardCodes, 240));
  document.getElementById('cardStatus')?.addEventListener('change', () => window.setTimeout(brightenCardCodes, 240));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clean, { once: true }); else clean();
})();
