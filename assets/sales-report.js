/* ALJAVA TERIONITY — Sales operations report */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const money = CORE?.money || ((value) => Number(value) || 0);
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const sb = CORE?.supabase || null;
  if (!sb) return;

  let installed = false;
  let loading = false;

  async function loadData() {
    const [txResult, productsResult, customersResult] = await Promise.all([
      sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,amount_paid,due_date,transaction_date').order('transaction_date', { ascending: false }),
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

  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      $('salesOperationsReport')?.remove();
      installed = false;
      await render(await loadData());
    } catch (error) { console.error('[ALJAVA] sales report:', error); }
    finally { loading = false; }
  }

  async function render(data) {
    if (!$('salesView') || installed) return;
    const { start, end } = getPeriod();
    const tx = data.transactions.filter((row) => { const date = new Date(row.transaction_date); return (!start || date >= start) && (!end || date <= end); });
    const byCustomer = {}, byStatus = {};
    tx.forEach((row) => {
      const qty = Number(row.quantity || 1);
      const revenue = Number(row.selling_price || 0) * qty;
      const hpp = Number(row.hpp || 0) * qty;
      const commission = Number(row.commission || 0);
      const paid = Math.min(Math.max(Number(row.amount_paid || 0), 0), revenue);
      const customer = data.customers[row.customer_id] || {};
      const customerKey = row.customer_id || 'unknown';
      const customerItem = byCustomer[customerKey] ||= { name: customer.business_name || customer.owner_name || '-', qty: 0, revenue: 0, hpp: 0, commission: 0, transactions: 0, paid: 0, receivable: 0 };
      customerItem.qty += qty; customerItem.revenue += revenue; customerItem.hpp += hpp; customerItem.commission += commission; customerItem.transactions += 1; customerItem.paid += paid; customerItem.receivable += Math.max(0, revenue - paid);
      const status = String(row.payment_status || 'Tidak diketahui').trim() || 'Tidak diketahui';
      const statusItem = byStatus[status] ||= { status, transactions: 0, revenue: 0, paid: 0, receivable: 0 };
      statusItem.transactions += 1; statusItem.revenue += revenue; statusItem.paid += paid; statusItem.receivable += Math.max(0, revenue - paid);
    });

    const customerRows = Object.values(byCustomer).sort((a, b) => b.revenue - a.revenue);
    const statusRows = Object.values(byStatus).sort((a, b) => b.revenue - a.revenue);
    const anchor = $('salesTransactionTable')?.closest('.panel');
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = 'salesOperationsReport';
    section.className = 'glass panel';
    section.innerHTML = `<div class="head"><div class="row"><div><h2 style="margin:0">Laporan Operasional</h2><p class="muted">Omzet, pembayaran, piutang, customer, dan status transaksi.</p></div><div class="actions"><button id="salesRefreshReport" class="btn" type="button">Refresh Laporan</button></div></div></div><div class="body"><section class="stats sales-report-stats"><div class="glass stat"><div class="muted">Omzet Periode</div><div id="reportRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Sudah Dibayar</div><div id="reportPaid" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Piutang</div><div id="reportUnpaid" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi Belum Lunas</div><div id="reportUnpaidTx" class="num">0</div></div></section><div class="grid"><div><h3 style="margin:0 0 10px">Per Customer</h3><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Transaksi</th><th>Qty</th><th>Omzet</th><th>Dibayar</th><th>Piutang</th><th>Komisi</th><th>Laba Kotor</th></tr></thead><tbody id="salesCustomerRows"></tbody></table></div></div><div><h3 style="margin:0 0 10px">Status Pembayaran</h3><div class="table-wrap"><table><thead><tr><th>Status</th><th>Transaksi</th><th>Omzet</th><th>Dibayar</th><th>Piutang</th></tr></thead><tbody id="salesPaymentRows"></tbody></table></div></div></div></div>`;
    anchor.parentElement.insertBefore(section, anchor);
    installed = true;

    const totalRevenue = tx.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
    const paidRevenue = tx.reduce((sum, row) => { const revenue = Number(row.selling_price || 0) * Number(row.quantity || 1); return sum + Math.min(Math.max(Number(row.amount_paid || 0), 0), revenue); }, 0);
    const receivable = Math.max(0, totalRevenue - paidRevenue);
    const unpaidTx = tx.filter((row) => { const revenue = Number(row.selling_price || 0) * Number(row.quantity || 1); const paid = Math.min(Math.max(Number(row.amount_paid || 0), 0), revenue); return paid < revenue; }).length;
    $('reportRevenue').textContent = money(totalRevenue); $('reportPaid').textContent = money(paidRevenue); $('reportUnpaid').textContent = money(receivable); $('reportUnpaidTx').textContent = String(unpaidTx);
    $('salesCustomerRows').innerHTML = customerRows.length ? customerRows.map((row) => `<tr><td>${esc(row.name)}</td><td>${row.transactions}</td><td>${row.qty}</td><td>${money(row.revenue)}</td><td>${money(row.paid)}</td><td>${money(row.receivable)}</td><td>${money(row.commission)}</td><td>${money(row.revenue - row.hpp - row.commission)}</td></tr>`).join('') : '<tr><td colspan="8" class="muted">Belum ada data customer.</td></tr>';
    $('salesPaymentRows').innerHTML = statusRows.length ? statusRows.map((row) => `<tr><td>${esc(row.status)}</td><td>${row.transactions}</td><td>${money(row.revenue)}</td><td>${money(row.paid)}</td><td>${money(row.receivable)}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Belum ada status pembayaran.</td></tr>';
    $('salesRefreshReport')?.addEventListener('click', () => void refresh());
  }

  async function install() { if (installed || !$('salesView')) return; try { await render(await loadData()); } catch (error) { console.error('[ALJAVA] sales report:', error); } }
  window.salesOperationsReport = Object.freeze({ install, load: refresh });
  document.addEventListener('aljava:sales-ui-ready', install);
  document.addEventListener('aljava:data-loaded', () => void refresh());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
