/* ALJAVA TERIONITY — Full Reset Controller */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PROJECT_URL = 'https://lbzwmcxwxummitldxuc.supabase.co';
  const PROJECT_KEY = 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw';

  function createClient() {
    // Reuse the shared client created by app-config/admin auth so the RPC
    // receives the current authenticated admin session.
    const shared = window.__ALJAVA_SUPABASE_CLIENT;
    if (shared) return shared;
    const factory = window.supabase?.createClient;
    if (!factory) throw new Error('Library Supabase tidak tersedia.');
    return factory(PROJECT_URL, PROJECT_KEY);
  }

  async function verifyReset(client) {
    const checks = [
      ['Transactions', 'id'], ['CardScans', 'id'], ['Subscriptions', 'id'],
      ['Cards', 'id'], ['cards', 'id'], ['Customers', 'id'],
      ['Sales', 'id'], ['admin_card_actions', 'id']
    ];
    const counts = {};
    for (const [table, column] of checks) {
      const { count, error } = await client.from(table).select(column, { count: 'exact', head: true });
      if (error) throw new Error(`Verifikasi ${table} gagal: ${error.message}`);
      counts[table] = Number(count || 0);
    }
    return counts;
  }

  async function resetAllData(event) {
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation();

    const confirmation = window.prompt(
      'RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus transaksi, scan/tap, kartu, customer, subscription, sales, dan log operasional.\n\nProduk tidak dihapus.'
    );
    if (confirmation !== 'RESET') return false;

    const button = $('resetMenu');
    const originalText = button?.textContent || '↻ Reset Dashboard';
    const message = $('cardActionMsg');
    if (button) {
      button.disabled = true;
      button.textContent = 'Mereset...';
    }

    try {
      const client = createClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw new Error(`Session admin gagal: ${sessionError.message}`);
      if (!sessionData?.session?.user) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');

      if (message) {
        message.className = 'notice info';
        message.textContent = 'Mereset dashboard... Produk tetap aman.';
      }
      const { data, error } = await client.rpc('admin_reset_dashboard');
      if (error) throw new Error(error.message || 'RPC reset gagal.');

      const counts = await verifyReset(client);
      const failed = Object.entries(counts).filter(([, count]) => count !== 0);
      if (failed.length) {
        throw new Error(`Reset belum bersih: ${failed.map(([table, count]) => `${table}=${count}`).join(', ')}`);
      }

      console.info('[ALJAVA] reset result:', data, counts);
      try { sessionStorage.clear(); } catch (_) {}
      try { localStorage.removeItem('admin_dashboard_state'); } catch (_) {}
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
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
