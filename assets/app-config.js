/* ALJAVA TERIONITY — Shared client configuration */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw',
    activationBaseUrl: 'https://aljava-activation.vercel.app/'
  });

  window.ALJAVA_CONFIG = CONFIG;

  // Stage 1 sales dashboard: load as an isolated optional module.
  // It runs independently and does not replace existing admin flows.
  const loadSalesDashboard = () => {
    if (window.__aljavaSalesDashboardLoading || document.querySelector('script[data-aljava-sales-dashboard]')) return;
    window.__aljavaSalesDashboardLoading = true;
    const script = document.createElement('script');
    script.src = '/assets/sales-dashboard.js';
    script.async = true;
    script.dataset.aljavaSalesDashboard = '1';
    script.addEventListener('error', () => { window.__aljavaSalesDashboardLoading = false; });
    document.head.appendChild(script);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSalesDashboard, { once: true });
  else loadSalesDashboard();
})();
