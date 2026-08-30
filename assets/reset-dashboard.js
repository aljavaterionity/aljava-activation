/* ALJAVA TERIONITY — Reset dashboard controller
   Owns only the Main Menu "Reset Dashboard" action.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function resetDashboardView(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    // Reset dashboard/chart filters.
    const currentYear = String(new Date().getFullYear());
    const year = $('year');
    const month = $('month');
    const search = $('cardSearch');
    const status = $('cardStatus');
    const customerSearch = $('customerSearch');
    const selectAll = $('selectAllCards');

    if (year) year.value = currentYear;
    if (month) month.value = '';
    if (search) search.value = '';
    if (status) status.value = '';
    if (customerSearch) customerSearch.value = '';
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }

    document.querySelectorAll('.card-select').forEach((input) => {
      input.checked = false;
    });

    // Return to the dashboard without reloading the page.
    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active-view', view.id === 'dashboardView');
    });

    const panel = $('menuPanel');
    const menuButton = $('menuButton');
    panel?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');

    if (history.replaceState) {
      history.replaceState(null, '', '#dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window.adminApi?.load === 'function') {
      window.adminApi.load();
    } else if (typeof window.load === 'function') {
      window.load();
    }
  }

  function bind() {
    const button = $('resetMenu');
    if (!button || button.dataset.resetBound === '1') return;
    button.dataset.resetBound = '1';
    // Capture phase prevents the older handler in admin.js from running too.
    button.addEventListener('click', resetDashboardView, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
