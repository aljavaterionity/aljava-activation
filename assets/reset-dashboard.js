/* ALJAVA TERIONITY — Full Reset Controller
   Main Menu > Reset Dashboard

   WARNING: This removes application/business data from the public tables below.
   Authentication/admin access is intentionally preserved.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TABLES = [
    'CardScans',
    'Transactions',
    'Subscriptions',
    'Cards',
    'Sales',
    'Customers',
    'Product',
    'cards',
    'admin_card_actions'
  ];

  async function resetAllData(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const confirmation = window.prompt(
      'RESET TOTAL DATA\n\nKetik RESET untuk menghapus semua data kartu, customer, transaksi, produk, penjualan, subscription, scan/tap, dan data operasional terkait.\n\nAkun login/admin tidak dihapus.'
    );
    if (confirmation !== 'RESET') return;

    const button = $('resetMenu');
    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = 'Mereset...';
    }

    try {
      const client = window.supabase?.createClient;
      if (!client) throw new Error('Supabase client tidak tersedia.');

      // Deletes are ordered to respect the known foreign-key relationships.
      for (const table of TABLES) {
        const { error } = await client.from(table).delete().not('id', 'is', null);
        // A legacy/optional table may be absent or inaccessible; do not hide
        // errors for the core application tables.
        if (error && !['cards', 'admin_card_actions'].includes(table)) {
          throw new Error(`${table}: ${error.message}`);
        }
      }

      // Clear local dashboard state and return to a clean dashboard.
      sessionStorage.clear();
      localStorage.removeItem('admin_dashboard_state');

      const message = $('cardActionMsg');
      if (message) {
        message.className = 'notice ok';
        message.textContent = '✓ Semua data aplikasi berhasil direset. Akun admin tetap aktif.';
      }

      window.location.assign('/admin.html#dashboard');
    } catch (error) {
      const message = $('cardActionMsg');
      if (message) {
        message.className = 'notice err';
        message.textContent = `❌ Reset gagal: ${error?.message || error}`;
      } else {
        window.alert(`Reset gagal: ${error?.message || error}`);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || '↻ Reset Dashboard';
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
