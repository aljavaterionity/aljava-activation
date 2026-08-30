/* ALJAVA TERIONITY — Full Reset Controller
   Main Menu > Reset Dashboard

   Deletes application/business data through a server-side admin RPC.
   Supabase Auth and admin_profiles are intentionally preserved.
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
      'RESET TOTAL DATA\n\nKetik RESET untuk menghapus semua data kartu, customer, transaksi, produk, penjualan, subscription, scan/tap, kartu legacy, dan log operasional.\n\nAkun login/admin TIDAK dihapus.'
    );
    if (confirmation !== 'RESET') return;

    const button = $('resetMenu');
    const originalText = button?.textContent || '↻ Reset Dashboard';
    if (button) {
      button.disabled = true;
      button.textContent = 'Mereset...';
    }

    const message = $('cardActionMsg');
    try {
      const client = window.supabase?.createClient;
      if (!client) throw new Error('Library Supabase tidak tersedia.');

      if (message) {
        message.className = 'notice info';
        message.textContent = 'Mereset semua data aplikasi...';
      }

      // One server-side transaction: avoids browser RLS/FK ordering issues.
      const { data, error } = await client.rpc('reset_admin_data');
      if (error) throw new Error(error.message || 'RPC reset_admin_data gagal.');

      console.info('[ALJAVA] reset_admin_data result:', data);

      // Clear only dashboard UI state. Supabase auth/session remains intact.
      sessionStorage.clear();
      localStorage.removeItem('admin_dashboard_state');

      if (message) {
        message.className = 'notice ok';
        message.textContent = '✓ Semua data aplikasi berhasil direset. Akun admin tetap aktif.';
      }

      // Reload so every view, cache, table and in-memory state starts clean.
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
