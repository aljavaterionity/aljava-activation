/* ALJAVA TERIONITY — Load the authoritative dark sales theme after legacy sales UI CSS. */
(() => {
  'use strict';
  const id = 'aljava-sales-dashboard-dark-ui-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = '/assets/sales-dashboard-dark.css?v=20260905-2236';
  document.head.appendChild(link);
})();
