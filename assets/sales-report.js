/* ALJAVA TERIONITY — Sales operations report */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  let installed = false;

  async function loadData() {
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) throw new Error('Konfigurasi aplikasi tidak tersedia.');
    const sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    const [txResult, productsResult, customersResult] = await Promise.all([
      sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date').order('transaction_date', { ascending: false }),
      sb.from('Product').select('id,name,product_code'),
      sb.from('Customers').select('id,business_name,owner_name')
    ]);
    if (txResult.error) throw txResult.error;
    if (productsResult.error) throw productsResult.error;
    if (customersResult.error) throw customersResult.error;
    return {
      transactions: txResult.data || [],
      products: Object.fromEntries((productsResult.data || []).map((row) => [row.id, row])),
      customers: Object.fromEntries((customersResult.data || []).map((row) => [row.id, row]))
    };
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return { start: start ? new Date(`${start}T00:00:00`) : null, end: end ? new Date(`${end}T23:59:59.999`) : null };
  }

  function render(data) {
    if (!$('salesView') || installed) return;
    const { start, end } = getPeriod();
    const tx = data.transactions.filter((row) => {
      const date = new Date(row.transaction_date);
      return (!start || date >= start) && (!end || date <= end);
    });

    const byCustomer = {};
    const byStatus = {};
    tx.forEach((row) => {
      const qty = Number(row.quantity || 1);
      const revenue = Number(row.selling_price || 0) * qty;
      const hpp = Number(row.hpp || 0) * qty;
      const commission = Number(row.commission || 0);
      const customer = data.customers[row.customer_id] || {};
      const customerKey = row.customer_id || 'unknown';
      const item = byCustomer[customerKey] ||= { name: customer.business_name || customer.owner_name || '-', qty: 0, revenue: 0, hpp: 0, commission: 0, transactions: 0 };
      item.qty += qty; item.revenue += revenue; item.hpp += hpp; item.commission += commission; item.transactions += 1;
      const status = String(row.payment_status || 'Tidak diketahui').trim() || 'Tidak diketahui';
      const statusItem = byStatus[status] ||= { status, transactions: 0, revenue: 0 };
      statusItem.transactions += 1; statusItem.revenue += revenue;
    });

    const customerRows = Object.values(byCustomer).sort((a, b) => b.revenue - a.revenue);
    const statusRows = Object.values(byStatus).sort((a, b) => b.revenue - a.revenue);
    const anchor = $('salesTransactionTable')?.closest('.panel');
    if (!anchor) return;

    const section = document.createElement('section');
    section.id = 'salesOperationsReport';
    section.className = 'glass panel';
    section.innerHTML = `
      <div class="head"><div class="row"><div><h2 style="margin:0">Laporan Operasional</h2><p class="muted">Ringkasan customer, status pembayaran, dan piutang berdasarkan periode.</p></div><div class="actions"><button id="salesRefreshReport" class="btn" type="button">Refresh Laporan</button></div></div></div>
      <div class="body">
        <section class="stats sales-report-stats">
          <div class="glass stat"><div class="muted">Omzet Periode</div><div id="reportRevenue" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Sudah Dibayar</div><div id="reportPaid" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Belum Dibayar</div><div id="reportUnpaid" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Transaksi Belum Lunas</div><div id="reportUnpaidTx" class="num">0</div></div>
        </section>
        <div class="grid">
          <div><h3 style="margin:0 0 10px">Per Customer</h3><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Transaksi</th><th>Qty</th><th>Omzet</th><th>HPP</th><th>Komisi</th><th>Laba Kotor</th></tr></thead><tbody id="salesCustomerRows"></tbody></table></div></div>
          <div><h3 style="margin:0 0 10px">Status Pembayaran</h3><div class="table-wrap"><table><thead><tr><th>Status</th><th>Transaksi</th><th>Omzet</th></tr></thead><tbody id="salesPaymentRows"></tbody></table></div></div>
        </div>
      </div>`;
    anchor.parentElement.insertBefore(section, anchor);
    installed = true;

    const totalRevenue = tx.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
    const paidStatuses = new Set(['paid', 'lunas']);
    const unpaidTx = tx.filter((row) => !paidStatuses.has(String(row.payment_status || '').trim().toLowerCase()));
    const paidRevenue = tx.filter((row) => paidStatuses.has(String(row.payment_status || '').trim().toLowerCase())).reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
    const unpaidRevenue = Math.max(0, totalRevenue - paidRevenue);

    $('reportRevenue').textContent = money(totalRevenue);
    $('reportPaid').textContent = money(paidRevenue);
    $('reportUnpaid').textContent = money(unpaidRevenue);
    $('reportUnpaidTx').textContent = String(unpaidTx.length);
    $('salesCustomerRows').innerHTML = customerRows.length ? customerRows.map((row) => `<tr><td>${esc(row.name)}</td><td>${row.transactions}</td><td>${row.qty}</td><td>${money(row.revenue)}</td><td>${money(row.hpp)}</td><td>${money(row.commission)}</td><td>${money(row.revenue - row.hpp - row.commission)}</td></tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada data customer.</td></tr>';
    $('salesPaymentRows').innerHTML = statusRows.length ? statusRows.map((row) => `<tr><td>${esc(row.status)}</td><td>${row.transactions}</td><td>${money(row.revenue)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Belum ada status pembayaran.</td></tr>';
    $('salesRefreshReport')?.addEventListener('click', async () => { section.remove(); installed = false; try { render(await loadData()); } catch (error) { console.error('[ALJAVA] sales report:', error); } });
  }

  async function install() {
    if (installed || !$('salesView')) return;
    try { render(await loadData()); } catch (error) { console.error('[ALJAVA] sales report:', error); }
  }

  window.salesOperationsReport = { install };
  document.addEventListener('aljava:sales-ui-ready', install);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
