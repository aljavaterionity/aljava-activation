/* ALJAVA TERIONITY — main menu cleanup */
(() => {
  'use strict';

  const panel = () => document.getElementById('menuPanel');
  const normalize = (value) => String(value || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

  function loadSalesEntry() {
    if (window.salesEntry || document.querySelector('script[data-aljava-sales-entry]')) return;
    const script = document.createElement('script');
    script.src = '/assets/sales-entry.js';
    script.async = true;
    script.dataset.aljavaSalesEntry = '1';
    document.body.appendChild(script);
  }

  function styleMenuIcons(root) {
    if (document.getElementById('aljava-main-menu-icon-style')) return;
    const style = document.createElement('style');
    style.id = 'aljava-main-menu-icon-style';
    style.textContent = `
      #menuPanel .menu-icon{
        flex:0 0 38px;width:38px;height:38px;border-radius:11px;
        display:grid;place-items:center;color:#fff;font-size:0;font-weight:900;
        border:0;box-shadow:0 6px 14px rgba(23,50,77,.10);
        transition:transform .15s ease,box-shadow .15s ease;
      }
      #menuPanel .menu-item:hover .menu-icon{transform:translateY(-1px);box-shadow:0 8px 18px rgba(23,50,77,.14)}
      #menuPanel .menu-item:nth-child(1) .menu-icon{background:#2f80ed}
      #menuPanel .menu-item:nth-child(2) .menu-icon{background:#ef5350}
      #menuPanel .menu-item:nth-child(3) .menu-icon{background:#3f8ff0}
      #menuPanel .menu-item:nth-child(4) .menu-icon{background:#f3a62b}
      #menuPanel .menu-settings .menu-item:nth-child(1) .menu-icon{background:#22b98b}
      #menuPanel .menu-settings .menu-item:nth-child(2) .menu-icon{background:#8b5cf6}
      #menuPanel .menu-settings .menu-item:nth-child(3) .menu-icon{background:#f59e0b}
      #menuPanel .menu-settings .menu-item:nth-child(4) .menu-icon{background:#ef5350}
      #menuPanel #dashboardMenu .menu-icon::before{content:'▦';font-size:21px;line-height:1;color:#fff}
      #menuPanel #cardsMenu .menu-icon::before{content:'▤';font-size:21px;line-height:1;color:#fff}
      #menuPanel #productMenu .menu-icon::before{content:'◇';font-size:22px;line-height:1;color:#fff}
      #menuPanel #customerMenu .menu-icon::before{content:'♙';font-size:22px;line-height:1;color:#fff}
      #menuPanel #refreshMenu .menu-icon::before{content:'↻';font-size:23px;line-height:1;color:#fff}
      #menuPanel #resetMenu .menu-icon::before{content:'⟳';font-size:22px;line-height:1;color:#fff}
      #menuPanel #addAccountMenu .menu-icon::before{content:'+';font-size:24px;line-height:1;color:#fff}
      #menuPanel #logoutMenu .menu-icon::before{content:'⇥';font-size:23px;line-height:1;color:#fff}
      #menuPanel .menu-item.active{background:#f4f9ff;border-color:#d9ebff;color:#1769aa;box-shadow:none}
      #menuPanel .menu-item.active .menu-icon{box-shadow:0 7px 16px rgba(47,128,237,.22)}
      @media(max-width:650px){#menuPanel .menu-icon{flex-basis:38px;width:38px;height:38px;border-radius:11px}}
    `;
    document.head.appendChild(style);
  }

  function clean() {
    const root = panel();
    if (!root) return;

    const mainItems = root.querySelector('.menu-items');
    const settingsItems = root.querySelector('.menu-settings .menu-items');
    if (!mainItems || !settingsItems) return;

    styleMenuIcons(root);

    const salesButtons = [];
    root.querySelectorAll('.menu-items > button').forEach((button) => {
      const label = normalize(button.textContent);
      if (label === 'hpp') {
        button.remove();
        return;
      }
      if (label === 'dashboard penjualan') salesButtons.push(button);
    });

    const canonical = root.querySelector('#salesMenu');
    const keep = canonical || salesButtons[0] || null;
    salesButtons.forEach((button) => {
      if (button !== keep) button.remove();
    });

    if (keep) {
      const dashboard = root.querySelector('#dashboardMenu');
      if (keep.parentElement !== mainItems) mainItems.appendChild(keep);
      if (dashboard && dashboard.nextElementSibling !== keep) dashboard.insertAdjacentElement('afterend', keep);
    }

    const refresh = document.getElementById('refresh');
    if (refresh && !settingsItems.contains(refresh)) {
      refresh.classList.remove('danger');
      settingsItems.insertBefore(refresh, settingsItems.querySelector('#addAccountMenu') || null);
    }

    const topLogout = document.getElementById('logoutTop');
    if (topLogout) topLogout.remove();

    // Older builds can initialize the sales view more than once. Keep the first.
    const salesViews = Array.from(document.querySelectorAll('#salesView'));
    salesViews.slice(1).forEach((view) => view.remove());

    loadSalesEntry();
  }

  function scheduleClean() {
    clean();
    window.setTimeout(clean, 100);
    window.setTimeout(clean, 500);
    window.setTimeout(clean, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleClean, { once: true });
  } else {
    scheduleClean();
  }
})();
