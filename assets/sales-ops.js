/* ALJAVA TERIONITY — Sales operations enhancement */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  let installed = false;

  function client() {
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return {
      start: start ? new Date(`${start}T00:00:00`) : null,
      end: end ? new Date(`${end}T23:59:59.999`) : null
    };
  }

  async function load() {
    const sb = client();
    if (!sb || !$('salesView')) return;
    const host = $('salesOpsSummary');
    if (host) host.innerHTML = '<div class="muted">Memuat ringkasan operasional…</div>';

    try {
      const [txResult, customersResult, productsResult] = await Promise.all([
        sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date').order('transaction_date', { ascending: false }),
        sb.from('Customers').select('id,business_name,owner_name'),
        sb.from('Product').select('id,name,product_code')
      ]);
      if (txResult.error) throw txResult.error;
      if (customersResult.error) throw customersResult.error;
      if (productsResult.error) throw productsResult.error;

      const { start, end } = getPeriod();
      const customers = Object.fromEntries((customersResult.data || []).map((row) => [row.id, row]));
      const products = Object.fromEntries((productsResult.data || []).map((row) => [row.id, row]));
      const tx = (txResult.data || []).filter((row) => {
        const date = new Date(row.transaction_date);
        return (!start || date >= start) && (!end || date <= end);
      });

      const payments = {};
      tx.forEach((row) => {
        const status = String(row.payment_status || 'unpaid').trim().toLowerCase() || 'unpaid';
        const qty = Number(row.quantity || 1);
        const total = Number(row.selling_price || 0) * qty;
        payments[status] = (payments[status] || 0) + total;
      });

      const customerGroups = {};
      tx.forEach((row) => {
        const key = row.customer_id || 'unknown';
        const item = customerGroups[key] ||= { name: customers[key]?.business_name || customers[key]?.owner_name || '-', qty: 0, revenue: 0, commission: 0 };
        const qty = Number(row.quantity || 1);
        item.qty += qty;
        item.revenue += Number(row.selling_price || 0) * qty;
        item.commission += Number(row.commission || 0);
      });

      const totalRevenue = tx.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
      const paid = Object.entries(payments).filter(([status]) => ['paid', 'lunas'].includes(status)).reduce((sum, [, amount]) => sum + amount, 0);
      const receivable = Object.entries(payments).filter(([status]) => !['paid', 'lunas'].includes(status)).reduce((sum, [, amount]) => sum + amount, 0);
      const topCustomers = Object.values(customerGroups).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      const paidPct = totalRevenue ? Math.round((paid / totalRevenue) * 100) : 0;

      host.innerHTML = `
        <div class="stats" style="margin-bottom:14px">
          <div class="glass stat"><div class="muted">Sudah Dibayar</div><div class="num">${money(paid)}</div></div>
          <div class="glass stat"><div class="muted">Piutang / Belum Dibayar</div><div class="num">${money(receivable)}</div></div>
          <div class="glass stat"><div class="muted">Coverage Pembayaran</div><div class="num">${paidPct}%</div></div>
          <div class="glass stat"><div class="muted">Customer Bertransaksi</div><div class="num">${Object.keys(customerGroups).length}</div></div>
        </div>
        <div class="grid">
          <section class="glass panel"><div class="head"><h2 style="margin:0">Status Pembayaran</h2><p class="muted" style="margin:5px 0 0">Nominal berdasarkan status pada transaksi.</p></div><div class="body"><div class="table-wrap"><table><thead><tr><th>Status</th><th>Nominal</th></tr></thead><tbody>${Object.entries(payments).sort((a,b)=>b[1]-a[1]).map(([status, amount]) => `<tr><td>${esc(status)}</td><td>${money(amount)}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Belum ada transaksi.</td></tr>'}</tbody></table></div></div></section>
          <section class="glass panel"><div class="head"><h2 style="margin:0">Top Customer</h2><p class="muted" style="margin:5px 0 0">10 customer dengan omzet terbesar pada periode.</p></div><div class="body"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Qty</th><th>Omzet</th><th>Komisi</th></tr></thead><tbody>${topCustomers.map((row) => `<tr><td>${esc(row.name)}</td><td>${row.qty}</td><td>${money(row.revenue)}</td><td>${money(row.commission)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada transaksi.</td></tr>'}</tbody></table></div></div></section>
        </div>`;
    } catch (error) {
      host.innerHTML = `<div class="notice err">❌ Gagal memuat ringkasan operasional: ${esc(error?.message || error)}</div>`;
    }
  }

  function install() {
    if (installed || !$('salesView')) return;
    const anchor = $('salesTransactionTable')?.parentElement;
    if (!anchor) return;
    const section = document.createElement('section');
    section.className = 'glass panel';
    section.innerHTML = '<div class="head"><div class="row"><div><h2 style="margin:0">Kontrol Operasional</h2><p class="muted">Pembayaran, piutang, dan customer mengikuti periode laporan.</p></div></div></div><div class="body" id="salesOpsSummary"></div>';
    anchor.parentElement?.insertBefore(section, anchor);
    $('salesStart')?.addEventListener('change', load);
    $('salesEnd')?.addEventListener('change', load);
    $('salesRefresh')?.addEventListener('click', load);
    installed = true;
    void load();
  }

  window.salesOperations = { install, load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
