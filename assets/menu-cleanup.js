/* ALJAVA TERIONITY — main menu cleanup */
(() => {
  'use strict';

  const panel = () => document.getElementById('menuPanel');
  const normalize = (value) => String(value || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

  function clean() {
    const root = panel();
    if (!root) return;

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
  }

  function scheduleClean() {
    clean();
    window.setTimeout(clean, 300);
    window.setTimeout(clean, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleClean, { once: true });
  } else {
    scheduleClean();
  }
})();
