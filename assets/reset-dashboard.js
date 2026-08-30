/* ALJAVA TERIONITY — Reset dashboard controller
   Single owner for Main Menu > Reset Dashboard.
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

    const currentYear = String(new Date().getFullYear());
    const fields = {
      year: currentYear,
      month: '',
      cardSearch: '',
      cardStatus: '',
      customerSearch: ''
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = $(id);
      if (element) element.value = value;
    });

    document.querySelectorAll('.card-select').forEach((input) => {
      input.checked = false;
    });

    const selectAll = $('selectAllCards');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }

    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active-view', view.id === 'dashboardView');
    });

    $('menuPanel')?.classList.remove('open');
    $('menuButton')?.setAttribute('aria-expanded', 'false');

    if (history.replaceState) history.replaceState(null, '', '#dashboard');
    window.scrollTo(0, 0);

    // Re-render immediately so reset is visible even when a data refresh fails.
    if (typeof window.adminApi?.load === 'function') {
      Promise.resolve(window.adminApi.load()).catch(() => {});
    }
    if (typeof window.syncCardSummarySelection === 'function') {
      window.syncCardSummarySelection();
    }
  }

  // Expose one stable entry point for the button.
  window.__resetDashboard = resetDashboardView;

  function bind() {
    const button = $('resetMenu');
    if (!button || button.dataset.resetDirectBound === '1') return;
    button.dataset.resetDirectBound = '1';
    button.setAttribute('onclick', 'window.__resetDashboard(event)');
    button.addEventListener('click', resetDashboardView, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
