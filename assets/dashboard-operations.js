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

  /* Visual-only theme for the six Dashboard Utama statistic cards. */
  const statsStyle = document.createElement('style');
  statsStyle.id = 'aljava-dashboard-stat-color-theme';
  statsStyle.textContent = `
    #dashboardView .stats .stat{transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
    #dashboardView .stats .stat:hover{transform:translateY(-2px)}
    #dashboardView .stats .stat:nth-child(1){background:linear-gradient(145deg,#f7fbff,#edf5ff);border-color:#bfdbfe;box-shadow:0 12px 35px rgba(37,99,235,.08)}
    #dashboardView .stats .stat:nth-child(1):before{background:linear-gradient(180deg,#3b82f6,#2563eb);opacity:1}
    #dashboardView .stats .stat:nth-child(1) .muted,#dashboardView .stats .stat:nth-child(1) .num{color:#2563eb}
    #dashboardView .stats .stat:nth-child(1):hover{border-color:#93c5fd;box-shadow:0 16px 38px rgba(37,99,235,.13)}
    #dashboardView .stats .stat:nth-child(2){background:linear-gradient(145deg,#fff9f9,#fff1f2);border-color:#fecdd3;box-shadow:0 12px 35px rgba(220,38,38,.07)}
    #dashboardView .stats .stat:nth-child(2):before{background:linear-gradient(180deg,#ef4444,#dc2626);opacity:1}
    #dashboardView .stats .stat:nth-child(2) .muted,#dashboardView .stats .stat:nth-child(2) .num{color:#dc2626}
    #dashboardView .stats .stat:nth-child(2):hover{border-color:#fda4af;box-shadow:0 16px 38px rgba(220,38,38,.12)}
    #dashboardView .stats .stat:nth-child(3){background:linear-gradient(145deg,#fffdf7,#fffbeb);border-color:#fde68a;box-shadow:0 12px 35px rgba(217,119,6,.07)}
    #dashboardView .stats .stat:nth-child(3):before{background:linear-gradient(180deg,#f59e0b,#d97706);opacity:1}
    #dashboardView .stats .stat:nth-child(3) .muted,#dashboardView .stats .stat:nth-child(3) .num{color:#d97706}
    #dashboardView .stats .stat:nth-child(3):hover{border-color:#fcd34d;box-shadow:0 16px 38px rgba(217,119,6,.12)}
    #dashboardView .stats .stat:nth-child(4){background:linear-gradient(145deg,#fbfaff,#f5f3ff);border-color:#ddd6fe;box-shadow:0 12px 35px rgba(124,58,237,.07)}
    #dashboardView .stats .stat:nth-child(4):before{background:linear-gradient(180deg,#8b5cf6,#7c3aed);opacity:1}
    #dashboardView .stats .stat:nth-child(4) .muted,#dashboardView .stats .stat:nth-child(4) .num{color:#7c3aed}
    #dashboardView .stats .stat:nth-child(4):hover{border-color:#c4b5fd;box-shadow:0 16px 38px rgba(124,58,237,.12)}
    #dashboardView .stats .stat:nth-child(5){background:linear-gradient(145deg,#f7fffb,#ecfdf5);border-color:#a7f3d0;box-shadow:0 12px 35px rgba(5,150,105,.07)}
    #dashboardView .stats .stat:nth-child(5):before{background:linear-gradient(180deg,#10b981,#059669);opacity:1}
    #dashboardView .stats .stat:nth-child(5) .muted,#dashboardView .stats .stat:nth-child(5) .num{color:#059669}
    #dashboardView .stats .stat:nth-child(5):hover{border-color:#6ee7b7;box-shadow:0 16px 38px rgba(5,150,105,.12)}
    #dashboardView .stats .stat:nth-child(6){background:linear-gradient(145deg,#fffaf5,#fff7ed);border-color:#fed7aa;box-shadow:0 12px 35px rgba(234,88,12,.07)}
    #dashboardView .stats .stat:nth-child(6):before{background:linear-gradient(180deg,#f59e0b,#f97316);opacity:1}
    #dashboardView .stats .stat:nth-child(6) .muted,#dashboardView .stats .stat:nth-child(6) .num{color:#ea580c}
    #dashboardView .stats .stat:nth-child(6):hover{border-color:#fdba74;box-shadow:0 16px 38px rgba(234,88,12,.12)}
  `;
  document.head.appendChild(statsStyle);
})();
