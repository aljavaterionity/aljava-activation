/* ALJAVA TERIONITY — Full Reset Controller */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CONFIG = window.ALJAVA_CONFIG || {};
  let resetBusy = false;

  function show(message, type = 'info') {
    const el = $('cardActionMsg');
    if (el) { el.className = `notice ${type}`; el.textContent = message; }
    else if (type === 'err') window.alert(message);
  }

  function createClient() {
    const shared = window.__ALJAVA_SUPABASE_CLIENT || window.ALJAVA_SUPABASE_CLIENT;
    if (shared) return shared;
    const factory = window.supabase?.createClient;
    if (!factory || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) throw new Error('Konfigurasi Supabase tidak tersedia.');
    return factory(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }

  function requestResetConfirmation() {
    return new Promise(resolve => {
      const old = $('aljavaResetDialog');
      if (old) old.remove();
      const dialog = document.createElement('div');
      dialog.id = 'aljavaResetDialog';
      dialog.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
      dialog.innerHTML = `<div style="width:min(430px,100%);background:#111;border:1px solid #444;border-radius:18px;padding:22px;box-shadow:0 20px 70px rgba(0,0,0,.6);color:#fff;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box"><div style="font-size:21px;font-weight:800;margin-bottom:8px">Reset Dashboard</div><div style="font-size:14px;line-height:1.55;color:#bbb;margin-bottom:16px">Semua data operasional akan dihapus. <b style="color:#fff">Produk tidak dihapus.</b><br><br>Ketik <b style="color:#fff">RESET</b> untuk melanjutkan.</div><input id="aljavaResetConfirmInput" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ketik RESET" style="width:100%;height:46px;border:1px solid #555;border-radius:10px;background:#080808;color:#fff;padding:0 13px;font-size:16px;box-sizing:border-box;outline:none"><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button id="aljavaResetCancel" type="button" style="height:44px;padding:0 18px;border:1px solid #555;border-radius:10px;background:#222;color:#fff;font-weight:700">Batal</button><button id="aljavaResetConfirm" type="button" style="height:44px;padding:0 18px;border:0;border-radius:10px;background:#c62828;color:#fff;font-weight:800">Reset Sekarang</button></div><div id="aljavaResetHint" style="min-height:20px;margin-top:10px;font-size:13px;color:#aaa"></div></div>`;
      document.body.appendChild(dialog);
      const input = $('aljavaResetConfirmInput');
      const cancel = $('aljavaResetCancel');
      const confirm = $('aljavaResetConfirm');
      const finish = value => { dialog.remove(); resolve(value); };
      cancel.addEventListener('click', () => finish(false));
      confirm.addEventListener('click', () => {
        if (String(input?.value || '').trim().toUpperCase() !== 'RESET') {
          const hint = $('aljavaResetHint');
          if (hint) hint.textContent = 'Ketik RESET persis untuk melanjutkan.';
          input?.focus();
          return;
        }
        finish(true);
      });
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') confirm.click(); if (e.key === 'Escape') finish(false); });
      setTimeout(() => input?.focus(), 50);
    });
  }

  async function resetAllData(event) {
    if (resetBusy) return false;
    resetBusy = true;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    console.info('[ALJAVA] Reset Dashboard activated');

    try {
      const confirmed = await requestResetConfirmation();
      if (!confirmed) { show('Reset dibatalkan. Tidak ada data yang dihapus.', 'info'); return false; }
      const button = $('resetMenu');
      if (button) { button.disabled = true; button.textContent = 'Mereset...'; }
      show('Mereset dashboard... Produk tetap aman.', 'info');
      const client = createClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw new Error(`Session admin gagal: ${sessionError.message}`);
      if (!sessionData?.session?.user) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');
      const { data, error } = await client.rpc('reset_admin_data');
      console.info('[ALJAVA] reset_admin_data response:', { data, error });
      if (error) throw new Error([error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ') || 'RPC reset_admin_data gagal.');
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
      const button = $('resetMenu');
      if (button) { button.disabled = false; if (button.textContent === 'Mereset...') button.textContent = 'Reset Dashboard'; }
      resetBusy = false;
    }
  }

  function handleResetClick(event) {
    const target = event?.target?.closest?.('#resetMenu');
    if (!target) return;
    resetAllData(event);
  }

  window.__resetDashboard = resetAllData;
  document.addEventListener('click', handleResetClick, true);
})();
