/* ALJAVA TERIONITY — Automatic payment UI cleanup. */
(() => {
  'use strict';

  if (window.salesEntry) return;

  const normalize = (value) => String(value || '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();

  const removePaymentMenuItems = () => {
    document.querySelectorAll('#menuPanel .menu-item, #menuPanel button').forEach((item) => {
      const label = normalize(item.textContent);
      if (label.includes('pembayaran') || label.includes('piutang')) {
        item.remove();
      }
    });
  };

  const hideTableColumns = (tableHost, hiddenHeaders) => {
    const host = document.getElementById(tableHost);
    if (!host) return;
    const table = host.querySelector('table');
    if (!table) return;

    const headers = [...table.querySelectorAll('thead th')];
    const indexes = headers
      .map((header, index) => ({ index, label: normalize(header.textContent) }))
      .filter(({ label }) => hiddenHeaders.has(label))
      .map(({ index }) => index);

    if (!indexes.length) return;

    table.querySelectorAll('tr').forEach((row) => {
      [...row.children].forEach((cell, index) => {
        if (indexes.includes(index)) cell.remove();
      });
    });
  };

  const cleanDashboardPaymentUi = () => {
    removePaymentMenuItems();
    // Dashboard Utama: the Status column is the payment status and is no longer shown.
    hideTableColumns('txTable', new Set(['status', 'status pembayaran', 'pembayaran']));
    // Dashboard Penjualan: payment/receivable details are automatic and not shown in the UI.
    hideTableColumns('salesTransactionTable', new Set([
      'dibayar',
      'piutang',
      'status',
      'status pembayaran',
      'pembayaran'
    ]));
  };

  const observer = new MutationObserver(() => cleanDashboardPaymentUi());
  const start = () => {
    cleanDashboardPaymentUi();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.salesEntry = { cleanPaymentUi: cleanDashboardPaymentUi };
})();
