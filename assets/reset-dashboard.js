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
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    console.info('[ALJAVA] Reset Dashboard activated');
    let confirmation = null;
    try {
      confirmation = window.prompt(
        'RESET DATA DASHBOARD\n\nKetik RESET untuk menghapus data operasional.\nProduk tidak dihapus.\n\nKetik RESET untuk melanjutkan:'
      );
    } catch (promptError) {
      console.error('[ALJAVA] reset prompt failed:', promptError);
      show(`❌ Prompt reset tidak dapat dibuka: ${promptError?.message || promptError}`, 'err');
      resetBusy = false;
      return false;
    }

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
      setTimeout(() => window.location.replace(`/admin.html#dashboard-reset-${Date.now()}`), 500);
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

  function isResetTarget(event) {
    return !!event?.target?.closest?.('#resetMenu');
  }

  function delegatedActivate(event) {
    if (!isResetTarget(event)) return;
    resetAllData(event);
  }

  function installDirect(button) {
    if (!button || button.dataset.resetHardBound === '1') return;
    button.dataset.resetHardBound = '1';
    button.type = 'button';
    button.addEventListener('click', resetAllData, true);
    button.addEventListener('pointerup', resetAllData, true);
    button.onclick = resetAllData;
    console.info('[ALJAVA] Reset Dashboard hard binding installed');
  }

  function bind() {
    installDirect($('resetMenu'));
  }

  window.__resetDashboard = resetAllData;
  document.addEventListener('pointerup', delegatedActivate, true);
  document.addEventListener('touchend', delegatedActivate, true);
  document.addEventListener('click', delegatedActivate, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  const observer = new MutationObserver(() => bind());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(bind, 250);
  window.setTimeout(bind, 1000);
  window.setTimeout(bind, 2000);
})();
