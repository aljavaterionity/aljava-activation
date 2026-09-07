/* ALJAVA TERIONITY — Full Reset Controller */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CONFIG = window.ALJAVA_CONFIG || {};
  let resetBusy = false;

  function show(message, type = 'info') {
    const el = $('cardActionMsg');
    if (el) {
      el.className = `notice ${type}`;
      el.textContent = message;
    } else if (type === 'err') {
      window.alert(message);
    }
  }

  function createClient() {
    const shared = window.__ALJAVA_SUPABASE_CLIENT || window.ALJAVA_SUPABASE_CLIENT;
    if (shared) return shared;
    const factory = window.supabase?.createClient;
    if (!factory || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      throw new Error('Konfigurasi Supabase tidak tersedia.');
    }
    return factory(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }

  async function resetAllData(event) {
    if (resetBusy) return false;
    resetBusy = true;
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation();

    console.info('[ALJAVA] Reset Dashboard clicked');
    const confirmation = window.prompt('RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus data operasional.\nProduk tidak dihapus.\n\nKetik RESET untuk melanjutkan:');
    if (confirmation !== 'RESET') {
      show('Reset dibatalkan. Tidak ada data yang dihapus.', 'info');
      resetBusy = false;
      return false;
    }

    const button = $('resetMenu');
    const originalText = button?.textContent || 'Reset Dashboard';
    if (button) { button.disabled = true; button.textContent = 'Mereset...'; }

    try {
      show('Mereset dashboard... Produk tetap aman.', 'info');
      const client = createClient();

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw new Error(`Session admin gagal: ${sessionError.message}`);
      if (!sessionData?.session?.user) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');

      console.info('[ALJAVA] Reset session OK:', sessionData.session.user.id);
      show('Sesi admin terdeteksi. Menjalankan reset...', 'info');

      const { data, error } = await client.rpc('reset_admin_data');
      console.info('[ALJAVA] reset_admin_data response:', { data, error });
      if (error) {
        const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ');
        throw new Error(detail || 'RPC reset_admin_data gagal.');
      }

      console.info('[ALJAVA] reset result:', data);
      show('✓ Dashboard berhasil direset. Produk tetap aman.', 'ok');

      try { sessionStorage.clear(); } catch (_) {}
      try { localStorage.removeItem('admin_dashboard_state'); } catch (_) {}

      setTimeout(() => {
        window.location.replace(`/admin.html#dashboard-reset-${Date.now()}`);
      }, 500);
      return true;
    } catch (error) {
      console.error('[ALJAVA] reset failed:', error);
      show(`❌ Reset gagal: ${error?.message || error}`, 'err');
      return false;
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
      resetBusy = false;
    }
  }

  function delegatedResetClick(event) {
    const target = event.target?.closest?.('#resetMenu');
    if (!target) return;
    resetAllData(event);
  }

  function bind() {
    const button = $('resetMenu');
    if (button && button.dataset.fullResetBound !== '1') {
      button.dataset.fullResetBound = '1';
      button.addEventListener('click', resetAllData, true);
      console.info('[ALJAVA] Reset Dashboard direct handler bound');
    }
  }

  window.__resetDashboard = resetAllData;
  document.addEventListener('click', delegatedResetClick, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  window.setTimeout(bind, 500);
  window.setTimeout(bind, 1500);
})();
