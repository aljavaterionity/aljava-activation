/* ALJAVA TERIONITY — centralized admin controls */
(() => {
  'use strict';
  function bind() {
    const refresh = document.getElementById('refreshMenu');
    if (refresh && refresh.dataset.bound !== '1') {
      refresh.dataset.bound = '1';
      refresh.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        refresh.disabled = true;
        refresh.textContent = 'Memuat…';
        window.setTimeout(() => window.location.reload(), 50);
      });
    }
    ['refresh', 'logoutTop'].forEach((id) => document.getElementById(id)?.remove());
    const salesButtons = [...document.querySelectorAll('.menu-items button')].filter((button) => /Dashboard Penjualan/i.test(button.textContent.trim()));
    salesButtons.slice(1).forEach((button) => button.remove());
    document.querySelectorAll('.menu-items button').forEach((button) => {
      if (/\bHPP\b/i.test(button.textContent)) button.remove();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  document.addEventListener('aljava:data-loaded', bind);
  document.addEventListener('aljava:sales-ui-ready', bind);
})();
