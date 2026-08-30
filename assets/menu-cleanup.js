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

  function clean() {
    const root = panel();
    if (!root) return;

    const mainItems = root.querySelector('.menu-items');
    const settingsItems = root.querySelector('.menu-settings .menu-items');
    if (!mainItems || !settingsItems) return;

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
