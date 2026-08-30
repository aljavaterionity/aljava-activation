/* ALJAVA TERIONITY — Reset dashboard
   Intentionally self-contained: one click = one deterministic reset.
*/
(() => {
  'use strict';

  const RESET_URL = '/admin.html#dashboard';

  function hardReset(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    // Use a normal navigation so every in-memory filter/view/selection state
    // is discarded. Login/session remains stored by Supabase.
    window.location.assign(RESET_URL);
  }

  function bind() {
    const button = document.getElementById('resetMenu');
    if (!button || button.dataset.hardResetBound === '1') return;

    button.dataset.hardResetBound = '1';
    button.onclick = hardReset;
    button.addEventListener('click', hardReset, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
