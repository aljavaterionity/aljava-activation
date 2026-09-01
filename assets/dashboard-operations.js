/* ALJAVA TERIONITY — Dashboard operational finance summary disabled.
   Payment / receivable summaries are intentionally removed from Dashboard Utama.
   Transaction and payment data remain untouched for other features. */
(() => {
  'use strict';

  const removeLegacySummary = () => {
    document.getElementById('dashboardOperationsSummary')?.remove();
  };

  window.dashboardOperations = {
    install: removeLegacySummary,
    load: removeLegacySummary
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLegacySummary, { once: true });
  } else {
    removeLegacySummary();
  }
})();
