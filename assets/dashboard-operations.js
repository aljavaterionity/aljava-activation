/* ALJAVA TERIONITY — Dashboard operational finance summary disabled.
   Payment / receivable summaries are intentionally removed from Dashboard Utama.
   Transaction and payment data remain untouched for other features. */
(() => {
  'use strict';

  const removeLegacySummary = () => {
    document.getElementById('dashboardOperationsSummary')?.remove();
  };

  window.dashboardOperations = Object.freeze({
    install: removeLegacySummary,
    load: removeLegacySummary
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeLegacySummary, { once: true });
  else removeLegacySummary();

  const STYLE_ID = 'aljava-dashboard-stat-color-theme';
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #dashboardView .stats .stat{transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
    #dashboardView .stats .stat:hover{transform:translateY(-2px)}
    #dashboardView .stats .stat:nth-child(1){background:#f7fbff;border-color:#bfdbfe;box-shadow:0 12px 35px rgba(37,99,235,.08)}
    #dashboardView .stats .stat:nth-child(1):before{background:#2563eb;opacity:1}
    #dashboardView .stats .stat:nth-child(1) .muted,#dashboardView .stats .stat:nth-child(1) .num{color:#2563eb}
    #dashboardView .stats .stat:nth-child(2){background:#fff7f8;border-color:#fecdd3;box-shadow:0 12px 35px rgba(220,38,38,.07)}
    #dashboardView .stats .stat:nth-child(2):before{background:#dc2626;opacity:1}
    #dashboardView .stats .stat:nth-child(2) .muted,#dashboardView .stats .stat:nth-child(2) .num{color:#dc2626}
    #dashboardView .stats .stat:nth-child(3){background:#fffdf5;border-color:#fde68a;box-shadow:0 12px 35px rgba(217,119,6,.07)}
    #dashboardView .stats .stat:nth-child(3):before{background:#d97706;opacity:1}
    #dashboardView .stats .stat:nth-child(3) .muted,#dashboardView .stats .stat:nth-child(3) .num{color:#d97706}
    #dashboardView .stats .stat:nth-child(4){background:#faf9ff;border-color:#ddd6fe;box-shadow:0 12px 35px rgba(124,58,237,.07)}
    #dashboardView .stats .stat:nth-child(4):before{background:#7c3aed;opacity:1}
    #dashboardView .stats .stat:nth-child(4) .muted,#dashboardView .stats .stat:nth-child(4) .num{color:#7c3aed}
    #dashboardView .stats .stat:nth-child(5){background:#f7fffb;border-color:#a7f3d0;box-shadow:0 12px 35px rgba(5,150,105,.07)}
    #dashboardView .stats .stat:nth-child(5):before{background:#059669;opacity:1}
    #dashboardView .stats .stat:nth-child(5) .muted,#dashboardView .stats .stat:nth-child(5) .num{color:#059669}
    #dashboardView .stats .stat:nth-child(6){background:#fffaf5;border-color:#fed7aa;box-shadow:0 12px 35px rgba(234,88,12,.07)}
    #dashboardView .stats .stat:nth-child(6):before{background:#f97316;opacity:1}
    #dashboardView .stats .stat:nth-child(6) .muted,#dashboardView .stats .stat:nth-child(6) .num{color:#ea580c}
  `;
  document.head.appendChild(style);
})();
