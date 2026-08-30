/* ALJAVA TERIONITY — Full Reset Controller
   Main Menu > Reset Dashboard

   Deletes application/business records while preserving the Product master
   catalog and authentication/admin access.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  async function resetAllData(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const confirmation = window.prompt(
      'RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus seluruh data kartu, customer, transaksi, penjualan, subscription, scan/tap, kartu legacy, dan log operasional.\n\nData PRODUK tidak akan dihapus.\nAkun login/admin juga tidak dihapus.'
    );
    if (confirmation !== 'RESET') return;

    const button = $('resetMenu');
    const originalText = button?.textContent || '↻ Reset Dashboard';
    const message = $('cardActionMsg');

    if (button) {
      button.disabled = true;
      button.textContent = 'Mereset...';
    }

    try {
      const client = window.supabase?.createClient;
      if (!client) throw new Error('Library Supabase tidak tersedia.');

      if (message) {
        message.className = 'notice info';
        message.textContent = 'Mereset data dashboard... Produk tetap aman.';
      }

      const { data, error } = await client.rpc('reset_admin_data');
      if (error) throw new Error(error.message || 'RPC reset_admin_data gagal.');

      console.info('[ALJAVA] reset_admin_data result:', data);

      sessionStorage.clear();
      localStorage.removeItem('admin_dashboard_state');

      // Full reload clears in-memory dashboard state while preserving Auth.
      window.location.assign('/admin.html#dashboard');
    } catch (error) {
      console.error('[ALJAVA] full reset failed:', error);
      if (message) {
        message.className = 'notice err';
        message.textContent = `❌ Reset gagal: ${error?.message || error}`;
      } else {
        window.alert(`Reset gagal: ${error?.message || error}`);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  window.__resetDashboard = resetAllData;

  function bind() {
    const button = $('resetMenu');
    if (!button || button.dataset.fullResetBound === '1') return;

    button.dataset.fullResetBound = '1';
    button.onclick = resetAllData;
    button.addEventListener('click', resetAllData, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
