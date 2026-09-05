/* ALJAVA TERIONITY — Admin controls compatibility layer
   Payment / receivable UI was intentionally removed from the dashboard.
   Payment data and RPCs remain available to the automatic transaction flow. */
(() => {
  'use strict';
  window.adminControls = Object.freeze({
    showPayments() {
      console.warn('[ALJAVA] Manual payment UI is disabled; payment data remains untouched.');
    },
    loadPayments() {
      return Promise.resolve([]);
    }
  });
})();
