/* ALJAVA TERIONITY — Full Reset Controller
   Main Menu > Reset Dashboard

   Resets application/business data while preserving Product master
   catalog and authentication/admin access.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PROJECT_URL = 'https://lbzwmcxwxummitldxucj.supabase.co';
  const PROJECT_KEY = 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw';

  function createClient() {
    const factory = window.supabase?.createClient;
    if (!factory) throw new Error('Library Supabase tidak tersedia.');
    return factory(PROJECT_URL, PROJECT_KEY);
  }

  async function verifyReset(client) {
    const checks = [
      ['Transactions', 'id'],
      ['CardScans', 'id'],
      ['Subscriptions', 'id'],
      ['Cards', 'id'],
      ['cards', 'id'],
      ['Customers', 'id'],
      ['Sales', 'id'],
      ['admin_card_actions', 'id']
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
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const confirmation = window.prompt(
      'RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus seluruh transaksi, scan/tap, kartu, customer, subscription, sales, dan log operasional.\n\nData PRODUK tidak akan dihapus.\nAkun login/admin juga tidak dihapus.'
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
      if (message) {
        message.className = 'notice info';
        message.textContent = 'Menghapus data dashboard dan memverifikasi hasil... Produk tetap aman.';
      }

      const { data, error } = await client.rpc('admin_reset_dashboard');
      if (error) throw new Error(error.message || 'RPC admin_reset_dashboard gagal.');

      const counts = await verifyReset(client);
      const failed = Object.entries(counts).filter(([, count]) => count !== 0);
      if (failed.length) {
        throw new Error(`Reset belum bersih: ${failed.map(([table, count]) => `${table}=${count}`).join(', ')}`);
      }

      console.info('[ALJAVA] admin_reset_dashboard result:', data);
      console.info('[ALJAVA] reset verification:', counts);

      // Clear only app UI state; Supabase Auth session stays intact.
      try { sessionStorage.clear(); } catch (_) {}
      try { localStorage.removeItem('admin_dashboard_state'); } catch (_) {}

      // Force a fresh document so computed revenue, scan totals and chart are rebuilt from zero.
      const target = `/admin.html#dashboard-reset-${Date.now()}`;
      window.location.replace(target);
      return true;
    } catch (error) {
      console.error('[ALJAVA] full reset failed:', error);
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

  window.__resetDashboard = resetAllData;

  function bind() {
    const button = $('resetMenu');
    if (!button || button.dataset.fullResetBound === '1') return;

    button.dataset.fullResetBound = '1';
    button.onclick = resetAllData;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
