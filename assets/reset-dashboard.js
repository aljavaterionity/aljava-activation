/* ALJAVA TERIONITY — Full Reset Controller */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CONFIG = window.ALJAVA_CONFIG || {};

  function createClient() {
    const shared = window.__ALJAVA_SUPABASE_CLIENT;
    if (shared) return shared;
    const factory = window.supabase?.createClient;
    if (!factory || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) throw new Error('Konfigurasi Supabase tidak tersedia.');
    return factory(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }

  async function resetAllData(event) {
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation();

    const confirmation = window.prompt('RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus transaksi, scan/tap, kartu, customer, subscription, sales, dan log operasional.\n\nProduk tidak dihapus.');
    if (confirmation !== 'RESET') return false;

    const button = $('resetMenu');
    const originalText = button?.textContent || 'Reset Dashboard';
    const message = $('cardActionMsg');
    if (button) { button.disabled = true; button.textContent = 'Mereset...'; }

    try {
      const client = createClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw new Error(`Session admin gagal: ${sessionError.message}`);
      if (!sessionData?.session?.user) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');

      if (message) {
        message.className = 'notice info';
        message.textContent = 'Mereset dashboard... Produk tetap aman.';
      }

      // reset_admin_data is SECURITY DEFINER and delegates to the admin reset RPC.
      // Calling admin_reset_dashboard directly runs as the browser role and can be
      // blocked by RLS even though the current user is an admin.
      const { data, error } = await client.rpc('reset_admin_data');
      if (error) throw new Error(error.message || 'RPC reset_admin_data gagal.');

      console.info('[ALJAVA] reset result:', data);
      try { sessionStorage.clear(); } catch (_) {}
      try { localStorage.removeItem('admin_dashboard_state'); } catch (_) {}

      if (message) {
        message.className = 'notice ok';
        message.textContent = '✓ Dashboard berhasil direset. Produk tetap aman dan sesi admin tetap aktif.';
      }

      // Reload every dashboard module so in-memory state and cached UI are rebuilt.
      window.location.replace(`/admin.html#dashboard-reset-${Date.now()}`);
      return true;
    } catch (error) {
      console.error('[ALJAVA] reset failed:', error);
      if (message) {
        message.className = 'notice err';
        message.textContent = `❌ Reset gagal: ${error?.message || error}`;
      } else {
        window.alert(`Reset gagal: ${error?.message || error}`);
      }
      return false;
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  }

  function bind() {
    const button = $('resetMenu');
    if (button && button.dataset.fullResetBound !== '1') {
      button.dataset.fullResetBound = '1';
      button.addEventListener('click', resetAllData);
    }
  }

  window.__resetDashboard = resetAllData;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
