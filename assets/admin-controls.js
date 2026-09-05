/* ALJAVA TERIONITY — Admin controls compatibility layer */
(() => {
  'use strict';
  window.adminControls = Object.freeze({
    showPayments() { console.warn('[ALJAVA] Manual payment UI is disabled; payment data remains untouched.'); },
    loadPayments() { return Promise.resolve([]); }
  });

  /* VISUAL-ONLY MAIN MENU ICON GUARD. No business logic is changed. */
  const iconMap = {
    dashboardMenu:'<svg data-aljava-main-menu-icon="dashboardMenu" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    salesMenu:'<svg data-aljava-main-menu-icon="salesMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
    cardsMenu:'<svg data-aljava-main-menu-icon="cardsMenu" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
    productMenu:'<svg data-aljava-main-menu-icon="productMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5"/></svg>',
    customerMenu:'<svg data-aljava-main-menu-icon="customerMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H7.2A4.2 4.2 0 0 0 3 19.2V21"/><circle cx="9.5" cy="7.5" r="4"/><path d="M21 21v-1.8a4.2 4.2 0 0 0-3-4M16 3.7a4 4 0 0 1 0 7.6"/></svg>',
    operationsMenu:'<svg data-aljava-main-menu-icon="operationsMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>',
    analyticsMenu:'<svg data-aljava-main-menu-icon="analyticsMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h17"/><rect x="7" y="13" width="2.8" height="4" rx=".7"/><rect x="11.2" y="10" width="2.8" height="7" rx=".7"/><rect x="15.4" y="7" width="2.8" height="10" rx=".7"/><path d="m7 10 4-3 3 2 5-5"/></svg>',
    refreshMenu:'<svg data-aljava-main-menu-icon="refreshMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.7-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14M21 19v-5h-5"/></svg>',
    resetMenu:'<svg data-aljava-main-menu-icon="resetMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>',
    addAccountMenu:'<svg data-aljava-main-menu-icon="addAccountMenu" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M3 21v-1.5A4.5 4.5 0 0 1 7.5 15h3A4.5 4.5 0 0 1 15 19.5V21"/><path d="M18 8v6M15 11h6"/></svg>',
    logoutMenu:'<svg data-aljava-main-menu-icon="logoutMenu" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m15 16 4-4-4-4M19 12H9"/></svg>'
  };

  function forceMainMenuIcons() {
    const panel = document.getElementById('menuPanel');
    if (!panel) return;
    Object.entries(iconMap).forEach(([id, svg]) => {
      const item = panel.querySelector('#' + id);
      if (!item) return;
      const icon = item.querySelector('.menu-icon');
      if (!icon) return;
      const current = icon.querySelector('svg[data-aljava-main-menu-icon="' + id + '"]');
      if (!current) icon.innerHTML = svg;
      icon.setAttribute('aria-hidden', 'true');
    });
  }

  function installFinalStyle() {
    if (document.getElementById('aljava-main-menu-final-icon-guard')) return;
    const style = document.createElement('style');
    style.id = 'aljava-main-menu-final-icon-guard';
    style.textContent = `
      #menuPanel .menu-icon{flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;font-size:0!important;line-height:0!important;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease,filter .2s ease!important}
      #menuPanel .menu-icon svg{width:22px!important;height:22px!important;display:block!important;fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      #menuPanel #dashboardMenu .menu-icon{color:#0075F2!important}#menuPanel #salesMenu .menu-icon{color:#00B8FF!important}#menuPanel #cardsMenu .menu-icon{color:#10B981!important}#menuPanel #productMenu .menu-icon{color:#F59E0B!important}#menuPanel #customerMenu .menu-icon{color:#8B5CF6!important}#menuPanel #operationsMenu .menu-icon{color:#38BDF8!important}#menuPanel #analyticsMenu .menu-icon{color:#6366F1!important}#menuPanel #refreshMenu .menu-icon{color:#3B82F6!important}#menuPanel #resetMenu .menu-icon{color:#9CA3AF!important}#menuPanel #addAccountMenu .menu-icon{color:#10B981!important}#menuPanel #logoutMenu .menu-icon{color:#EF4444!important}
      #menuPanel .menu-item:hover .menu-icon{transform:translateY(-1px)!important;background:rgba(255,255,255,.045)!important;border-color:rgba(255,255,255,.10)!important;box-shadow:0 0 12px rgba(255,255,255,.035)!important;filter:brightness(1.16)!important}
      #menuPanel .menu-item.active .menu-icon{color:#fff!important;transform:translateY(-1px)!important}
      #menuPanel #dashboardMenu.active .menu-icon{background:rgba(0,117,242,.14)!important;border-color:rgba(0,117,242,.30)!important;box-shadow:0 0 20px rgba(0,117,242,.30)!important}
      #menuPanel #salesMenu.active .menu-icon{background:rgba(0,184,255,.14)!important;border-color:rgba(0,184,255,.30)!important;box-shadow:0 0 20px rgba(0,184,255,.30)!important}
      #menuPanel #cardsMenu.active .menu-icon{background:rgba(16,185,129,.14)!important;border-color:rgba(16,185,129,.30)!important;box-shadow:0 0 20px rgba(16,185,129,.30)!important}
      #menuPanel #productMenu.active .menu-icon{background:rgba(245,158,11,.14)!important;border-color:rgba(245,158,11,.30)!important;box-shadow:0 0 20px rgba(245,158,11,.30)!important}
      #menuPanel #customerMenu.active .menu-icon{background:rgba(139,92,246,.14)!important;border-color:rgba(139,92,246,.30)!important;box-shadow:0 0 20px rgba(139,92,246,.30)!important}
      #menuPanel #operationsMenu.active .menu-icon{background:rgba(56,189,248,.14)!important;border-color:rgba(56,189,248,.30)!important;box-shadow:0 0 20px rgba(56,189,248,.30)!important}
      #menuPanel #analyticsMenu.active .menu-icon{background:rgba(99,102,241,.14)!important;border-color:rgba(99,102,241,.30)!important;box-shadow:0 0 20px rgba(99,102,241,.30)!important}
      #menuPanel #refreshMenu.active .menu-icon{background:rgba(59,130,246,.14)!important;border-color:rgba(59,130,246,.30)!important;box-shadow:0 0 20px rgba(59,130,246,.30)!important}
      #menuPanel #resetMenu.active .menu-icon{background:rgba(156,163,175,.14)!important;border-color:rgba(156,163,175,.30)!important;box-shadow:0 0 20px rgba(156,163,175,.22)!important}
      #menuPanel #addAccountMenu.active .menu-icon{background:rgba(16,185,129,.14)!important;border-color:rgba(16,185,129,.30)!important;box-shadow:0 0 20px rgba(16,185,129,.30)!important}
      #menuPanel #logoutMenu.active .menu-icon{background:rgba(239,68,68,.14)!important;border-color:rgba(239,68,68,.30)!important;box-shadow:0 0 20px rgba(239,68,68,.30)!important}
    `;
    document.head.appendChild(style);
  }

  function finalize() { installFinalStyle(); forceMainMenuIcons(); }

  function installObserver() {
    const panel = document.getElementById('menuPanel');
    if (!panel || panel.dataset.aljavaIconGuardInstalled === '1') return;
    panel.dataset.aljavaIconGuardInstalled = '1';
    const observer = new MutationObserver(() => {
      forceMainMenuIcons();
    });
    observer.observe(panel, {childList:true, subtree:true});
    panel._aljavaIconGuardObserver = observer;
  }

  function boot() {
    finalize();
    installObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  setTimeout(boot, 50);
  setTimeout(boot, 250);
  setTimeout(boot, 750);
})();