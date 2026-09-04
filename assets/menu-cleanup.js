/* ALJAVA TERIONITY — premium SaaS main menu */
(() => {
  'use strict';

  const panel = () => document.getElementById('menuPanel');
  const normalize = (value) => String(value || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  const ICONS = {
    dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    sales:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
    cards:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    product:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5"/></svg>',
    customer:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H7.2A4.2 4.2 0 0 0 3 19.2V21"/><circle cx="9.5" cy="7.5" r="4"/><path d="M21 21v-1.8a4.2 4.2 0 0 0-3-4M16 3.7a4 4 0 0 1 0 7.6"/></svg>',
    operations:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>',
    analytics:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h17"/><rect x="7" y="13" width="2.8" height="4" rx=".7"/><rect x="11.2" y="10" width="2.8" height="7" rx=".7"/><rect x="15.4" y="7" width="2.8" height="10" rx=".7"/><path d="m7 10 4-3 3 2 5-5"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.7-4L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4L21 14"/><path d="M21 19v-5h-5"/></svg>',
    reset:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>',
    add:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M3 21v-1.5A4.5 4.5 0 0 1 7.5 15h3A4.5 4.5 0 0 1 15 19.5V21"/><path d="M18 8v6M15 11h6"/></svg>',
    logout:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m15 16 4-4-4-4M19 12H9"/></svg>'
  };
  const iconFor = (id) => ({dashboardMenu:'dashboard',salesMenu:'sales',cardsMenu:'cards',productMenu:'product',customerMenu:'customer',operationsMenu:'operations',analyticsMenu:'analytics',refreshMenu:'refresh',resetMenu:'reset',addAccountMenu:'add',logoutMenu:'logout'}[id] || 'dashboard');

  function loadSalesEntry() {
    if (window.salesEntry || document.querySelector('script[data-aljava-sales-entry]')) return;
    const script = document.createElement('script');
    script.src = '/assets/sales-entry.js';
    script.async = true;
    script.dataset.aljavaSalesEntry = '1';
    document.body.appendChild(script);
  }

  function styleMenu() {
    if (document.getElementById('aljava-main-menu-premium-style')) return;
    const style = document.createElement('style');
    style.id = 'aljava-main-menu-premium-style';
    style.textContent = `
      #menuPanel .menu-section-title{font-size:10px;font-weight:800;letter-spacing:1.6px;color:#64748b;text-transform:uppercase;margin:2px 4px 9px}
      #menuPanel .menu-items{display:grid;gap:8px}
      #menuPanel .menu-item{min-height:64px;padding:10px 12px;border:1px solid #e8edf4;border-radius:16px;background:#fff;color:#17324d;display:flex;align-items:center;gap:13px;cursor:pointer;box-shadow:0 4px 14px rgba(15,23,42,.035);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
      #menuPanel .menu-item:hover{transform:translateY(-1px);border-color:#dbe4ef;box-shadow:0 10px 24px rgba(15,23,42,.08);background:#fff}
      #menuPanel .menu-item.active{border-color:#dbeafe;background:#f8fbff;color:#17324d;box-shadow:0 8px 24px rgba(37,99,235,.08)}
      #menuPanel .menu-icon{flex:0 0 46px;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:#fff;font-size:0;border:0;box-shadow:0 7px 18px rgba(15,23,42,.10);transition:transform .16s ease,box-shadow .16s ease}
      #menuPanel .menu-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      #menuPanel .menu-item:hover .menu-icon{transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.14)}
      #menuPanel #dashboardMenu .menu-icon{background:linear-gradient(135deg,#3B82F6,#2563EB);box-shadow:0 8px 20px rgba(37,99,235,.22)}
      #menuPanel #salesMenu .menu-icon{background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 8px 20px rgba(5,150,105,.20)}
      #menuPanel #cardsMenu .menu-icon{background:linear-gradient(135deg,#8B5CF6,#7C3AED);box-shadow:0 8px 20px rgba(124,58,237,.20)}
      #menuPanel #productMenu .menu-icon{background:linear-gradient(135deg,#F59E0B,#F97316);box-shadow:0 8px 20px rgba(249,115,22,.20)}
      #menuPanel #customerMenu .menu-icon{background:linear-gradient(135deg,#06B6D4,#0891B2);box-shadow:0 8px 20px rgba(8,145,178,.20)}
      #menuPanel #operationsMenu .menu-icon{background:linear-gradient(135deg,#F59E0B,#D97706);box-shadow:0 8px 20px rgba(217,119,6,.20)}
      #menuPanel #analyticsMenu .menu-icon{background:linear-gradient(135deg,#14B8A6,#0F766E);box-shadow:0 8px 20px rgba(15,118,110,.20)}
      #menuPanel .menu-item b{display:block;font-size:13px;line-height:1.25;font-weight:800;color:inherit}
      #menuPanel .menu-item small{display:block;margin-top:3px;color:#64748b;font-size:10px;font-weight:500;line-height:1.35}
      #menuPanel .menu-settings{margin-top:18px;padding-top:16px;border-top:1px solid #e9eef5}
      #menuPanel .menu-settings .menu-item{min-height:54px;border-radius:14px;background:#f8fafc;box-shadow:none}
      #menuPanel .menu-settings .menu-icon{flex-basis:40px;width:40px;height:40px;border-radius:13px;box-shadow:none}
      #menuPanel #refreshMenu .menu-icon{background:#0EA5E9}
      #menuPanel #resetMenu .menu-icon{background:#EF4444}
      #menuPanel #addAccountMenu .menu-icon{background:#22C55E}
      #menuPanel #logoutMenu .menu-icon{background:#EF4444}
      #menuPanel .menu-settings .menu-item.danger{background:#fff7f8;border-color:#fee2e2;color:#b4233d}
      #menuPanel .menu-settings .menu-item:hover{background:#fff;box-shadow:0 8px 18px rgba(15,23,42,.06)}
      #menuPanel .menu-settings .menu-item b{font-size:12px}
      #menuPanel .menu-settings .menu-item small{font-size:9px}
      #menuPanel .menu-header{padding-bottom:17px;border-bottom:1px solid #e9eef5}
      #menuPanel .menu-header h2{font-size:21px;color:#0f2740;letter-spacing:-.3px}
      #menuPanel .menu-kicker{color:#2563EB}
      #menuPanel .menu-close{border-color:#e5eaf1;background:#fff;color:#475569}
      @media(max-width:650px){#menuPanel .menu-item{min-height:60px;padding:9px 10px;border-radius:15px}#menuPanel .menu-icon{flex-basis:44px;width:44px;height:44px;border-radius:14px}#menuPanel .menu-settings .menu-icon{flex-basis:38px;width:38px;height:38px;border-radius:12px}}
    `;
    document.head.appendChild(style);
  }

  function enhanceButton(button) {
    if (!button || !button.id) return;
    button.classList.add('menu-item');
    const originalTitle = button.querySelector('b')?.textContent?.trim() || button.textContent.trim();
    const descriptions = {
      dashboardmenu:'Ringkasan bisnis & performa', salesmenu:'Omzet, transaksi & performa', cardsmenu:'Buat dan kelola kartu',
      productmenu:'Master produk & harga', customermenu:'Data pelanggan & kartu', operationsmenu:'Monitor operasional otomatis',
      analyticsmenu:'Analisis aktivitas kartu', refreshmenu:'Muat data terbaru', resetmenu:'Reset data operasional', addaccountmenu:'Kelola akses admin', logoutmenu:'Akhiri sesi admin'
    };
    const desc = descriptions[button.id.toLowerCase()] || button.querySelector('small')?.textContent || '';
    button.innerHTML = `<span class="menu-icon">${ICONS[iconFor(button.id)]}</span><span><b>${originalTitle}</b>${desc ? `<small>${desc}</small>` : ''}</span>`;
    if (button.id === 'resetMenu' || button.id === 'logoutMenu') button.classList.add('danger');
  }

  function setActive(root) {
    if (!root) return;
    const map = {'#dashboard':'dashboardMenu','#sales':'salesMenu','#cards':'cardsMenu','#products':'productMenu','#product':'productMenu','#customers':'customerMenu','#operations':'operationsMenu','#analytics':'analyticsMenu'};
    const activeId = map[String(location.hash || '').toLowerCase()] || 'dashboardMenu';
    root.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
    root.querySelector(`#${activeId}`)?.classList.add('active');
  }

  function clean() {
    const root = panel();
    if (!root) return;
    const mainItems = root.querySelector('.menu-section > .menu-items');
    const settingsItems = root.querySelector('.menu-settings .menu-items');
    if (!mainItems || !settingsItems) return;
    styleMenu();

    const salesButtons = [];
    root.querySelectorAll('button').forEach((button) => {
      const label = normalize(button.textContent);
      if (label === 'hpp') button.remove();
      else if (label === 'dashboard penjualan') salesButtons.push(button);
    });
    const sales = root.querySelector('#salesMenu') || salesButtons[0];
    salesButtons.forEach((button) => { if (button !== sales) button.remove(); });
    if (sales && sales.parentElement !== mainItems) mainItems.appendChild(sales);

    const operations = root.querySelector('#operationsMenu');
    if (operations && operations.parentElement !== mainItems) mainItems.appendChild(operations);
    const analytics = root.querySelector('#analyticsMenu');
    if (analytics && analytics.parentElement !== mainItems) mainItems.appendChild(analytics);
    ['dashboardMenu','salesMenu','cardsMenu','productMenu','customerMenu','operationsMenu','analyticsMenu'].forEach((id) => {
      const item = root.querySelector(`#${id}`);
      if (item && item.parentElement === mainItems) mainItems.appendChild(item);
    });
    ['refreshMenu','addAccountMenu','resetMenu','logoutMenu'].forEach((id) => {
      const item = root.querySelector(`#${id}`);
      if (item && item.parentElement !== settingsItems) settingsItems.appendChild(item);
    });

    root.querySelectorAll('.menu-item').forEach(enhanceButton);
    setActive(root);
    document.getElementById('logoutTop')?.remove();
    Array.from(document.querySelectorAll('#salesView')).slice(1).forEach((view) => view.remove());
    loadSalesEntry();
  }

  const scheduleClean = () => {
    clean();
    window.setTimeout(clean, 250);
  };

  window.addEventListener('hashchange', () => setActive(panel()));
  document.addEventListener('aljava:sales-ui-ready', clean);
  document.addEventListener('aljava:data-loaded', clean);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleClean, { once: true });
  else scheduleClean();
})();
