/* ALJAVA TERIONITY — Full Dashboard Reset
   Reset button restores the admin UI to its clean initial dashboard state.
   It never deletes database records or logs the admin out.
*/
(() => {
  'use strict';

  const RESET_URL = '/admin.html#dashboard';

  function fullDashboardReset(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    // Full navigation intentionally clears all in-memory dashboard state:
    // filters, search, selections, chart state, and active view.
    // Supabase authentication is preserved by the existing session.
    window.location.assign(RESET_URL);
  }

  window.__resetDashboard = fullDashboardReset;

  function bind() {
    const button = document.getElementById('resetMenu');
    if (!button || button.dataset.fullResetBound === '1') return;

    button.dataset.fullResetBound = '1';
    button.onclick = fullDashboardReset;
    button.addEventListener('click', fullDashboardReset, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
