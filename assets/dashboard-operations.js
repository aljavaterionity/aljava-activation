/* ALJAVA TERIONITY — Dashboard operational finance summary */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value)||0);
  let installed = false;
  let loading = false;

  function client() {
    const c = window.ALJAVA_CONFIG;
    if (!c || !window.supabase?.createClient) return null;
    return window.supabase.createClient(c.supabaseUrl, c.supabaseKey);
  }

  function period() {
    const year = Number($('year')?.value || new Date().getFullYear());
    const month = $('month')?.value;
    return { year, month: month === '' ? null : Number(month) };
  }

  async function load() {
    if (loading || !$('dashboardView')) return;
    const sb = client();
    if (!sb) return;
    loading = true;
    try {
      const { year, month } = period();
      const from = new Date(year, month === null ? 0 : month, 1);
      const to = month === null ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
      const { data, error } = await sb.from('Transactions')
        .select('selling_price,quantity,amount_paid,payment_status,transaction_date')
        .gte('transaction_date', from.toISOString())
        .lt('transaction_date', to.toISOString());
      if (error) throw error;
      let revenue = 0, paid = 0, receivable = 0, unpaidTx = 0;
      (data || []).forEach((row) => {
        const total = Number(row.selling_price || 0) * Number(row.quantity || 1);
        const amountPaid = Math.min(Math.max(Number(row.amount_paid || 0), 0), total);
        revenue += total;
        paid += amountPaid;
        receivable += Math.max(0, total - amountPaid);
        if (amountPaid < total) unpaidTx += 1;
      });
      const coverage = revenue ? Math.round((paid / revenue) * 100) : 0;
      const host = $('dashboardOperationsSummary');
      if (!host) return;
      host.innerHTML = `
        <section class="stats">
          <div class="glass stat"><div class="muted">Omzet Periode</div><div class="num">${money(revenue)}</div></div>
          <div class="glass stat"><div class="muted">Sudah Dibayar</div><div class="num">${money(paid)}</div></div>
          <div class="glass stat"><div class="muted">Piutang</div><div class="num">${money(receivable)}</div></div>
          <div class="glass stat"><div class="muted">Belum Lunas</div><div class="num">${unpaidTx}</div><div class="muted">Coverage ${coverage}%</div></div>
        </section>`;
    } catch (error) {
      const host = $('dashboardOperationsSummary');
      if (host) host.innerHTML = `<div class="notice err">❌ Gagal memuat ringkasan keuangan.</div>`;
      console.error('[ALJAVA] dashboard operations:', error);
    } finally {
      loading = false;
    }
  }

  function install() {
    if (installed || !$('dashboardView')) return;
    const stats = $('dashboardView').querySelector('.stats');
    if (!stats) return;
    const host = document.createElement('section');
    host.id = 'dashboardOperationsSummary';
    host.className = 'panel';
    stats.insertAdjacentElement('afterend', host);
    $('year')?.addEventListener('change', load);
    $('month')?.addEventListener('change', load);
    document.addEventListener('aljava:data-loaded', load);
    installed = true;
    void load();
  }

  window.dashboardOperations = { install, load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
