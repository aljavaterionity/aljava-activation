/* ALJAVA TERIONITY — Sales dashboard */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const money = CORE?.money || ((value) => Number(value) || 0);
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const client = CORE?.supabase || null;
  if (!client) return;

  let initialized = false;
  let loading = false;

  function installSalesStyles() {
    if (document.getElementById('aljava-sales-dashboard-ui')) return;
    const style = document.createElement('style');
    style.id = 'aljava-sales-dashboard-ui';
    style.textContent = '#salesMenu{display:flex;align-items:center;gap:12px;text-align:left}.sales-menu-icon{width:48px;height:48px;min-width:48px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#10b981,#059669);box-shadow:0 10px 22px rgba(5,150,105,.18)}.sales-menu-icon svg{width:25px;height:25px;display:block}.sales-menu-label{font-weight:800}';
    document.head.appendChild(style);
    const link = document.createElement('link');
    link.id = 'aljava-sales-dashboard-ui-css';
    link.rel = 'stylesheet';
    link.href = '/assets/sales-dashboard-ui.css';
    document.head.appendChild(link);
  }

  function normalizeWhatsapp(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    return digits;
  }
  function whatsappUrl(number, message) {
    const normalized = normalizeWhatsapp(number);
    return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : '';
  }
  function salesWhatsappMessage(row, customer, product) {
    const qty = Number(row.quantity || 1);
    const revenue = Number(row.selling_price || 0) * qty;
    return ['Halo, terima kasih telah melakukan transaksi di ALJAVA TERIONITY.', '', `No. Transaksi: ${row.transaction_code || '-'}`, `Produk: ${product?.name || '-'}`, `Qty: ${qty}`, `Total: ${money(revenue)}`, `Status pembayaran: ${row.payment_status || '-'}`, `Tanggal: ${new Date(row.transaction_date).toLocaleString('id-ID')}`, '', `Customer: ${customer?.business_name || customer?.owner_name || '-'}`, 'Terima kasih.'].join('\n');
  }

  function showView() {
    installSalesStyles();
    installUi();
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'salesView'));
    $('menuPanel')?.classList.remove('open');
    $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#sales');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void loadSales();
  }

  function installUi() {
    installSalesStyles();
    if (initialized) return;
    const menuItems = document.querySelector('.menu-section > .menu-items');
    const app = $('app');
    if (!menuItems || !app) return;

    let button = $('salesMenu');
    if (!button) {
      button = document.createElement('button');
      button.id = 'salesMenu';
      button.type = 'button';
      button.className = 'menu-item';
      button.innerHTML = '<span class="menu-icon sales-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/><path d="M15 6h4v4"/></svg></span><span class="sales-menu-label"><b>Dashboard Penjualan</b><small>Omzet, transaksi & performa</small></span>';
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showView(); });
      menuItems.insertBefore(button, menuItems.children[1] || null);
    }

    let section = $('salesView');
    if (!section) {
      section = document.createElement('section');
      section.id = 'salesView';
      section.className = 'view';
      section.innerHTML = '<div class="row" style="margin-top:18px"><div><h1 style="margin:0">Dashboard Penjualan</h1><p class="muted">Omzet, HPP, komisi, laba kotor, transaksi, dan performa produk.</p></div><div class="actions"><button id="salesRefresh" class="btn" type="button">Refresh</button></div></div><section class="stats sales-stats"><div class="glass stat"><div class="muted">Omzet Total</div><div id="salesRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">HPP Total</div><div id="salesHpp" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Komisi Total</div><div id="salesCommission" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Laba Kotor</div><div id="salesGrossProfit" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi</div><div id="salesTransactions" class="num">0</div></div></section><section class="glass panel"><div class="head"><div class="row"><div><h2 style="margin:0">Ringkasan Penjualan</h2><p class="muted">Filter periode tanpa mengubah data transaksi.</p></div><div class="filter"><input id="salesStart" class="field" type="date"><input id="salesEnd" class="field" type="date"></div></div></div><div class="body"><div id="salesProductSummary"></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Transaksi Penjualan</h2></div><div class="body"><div id="salesTransactionTable" class="table-wrap"></div></div></section>';
      app.appendChild(section);
    }

    $('salesRefresh')?.addEventListener('click', () => void loadSales());
    $('salesStart')?.addEventListener('change', () => void loadSales());
    $('salesEnd')?.addEventListener('change', () => void loadSales());
    initialized = true;
    document.dispatchEvent(new CustomEvent('aljava:sales-ui-ready'));
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return { start: start ? new Date(`${start}T00:00:00`) : null, end: end ? new Date(`${end}T23:59:59.999`) : null };
  }

  async function loadSales() {
    installUi();
    if (!initialized || loading) return;
    loading = true;
    const refreshButton = $('salesRefresh');
    if (refreshButton) { refreshButton.disabled = true; refreshButton.textContent = 'Memuat…'; }
    const hosts = ['salesRevenue', 'salesHpp', 'salesCommission', 'salesGrossProfit', 'salesTransactions'];
    hosts.forEach((id) => { if ($(id)) $(id).textContent = id === 'salesTransactions' ? '…' : 'Memuat…'; });
    try {
      const [txResult, productsResult, customersResult] = await Promise.all([
        client.from('Transactions').select('id,transaction_code,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date,amount_paid,due_date').order('transaction_date', { ascending: false }),
        client.from('Product').select('id,name,product_code,commission'),
        client.from('Customers').select('id,business_name,owner_name,whatsapp')
      ]);
      if (txResult.error) throw txResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;
      const { start, end } = getPeriod();
      const products = Object.fromEntries((productsResult.data || []).map((product) => [product.id, product]));
      const customers = Object.fromEntries((customersResult.data || []).map((customer) => [customer.id, customer]));
      const tx = (txResult.data || []).filter((row) => { const date = new Date(row.transaction_date); return (!start || date >= start) && (!end || date <= end); });
      const revenue = tx.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
      const hpp = tx.reduce((sum, row) => sum + Number(row.hpp || 0) * Number(row.quantity || 1), 0);
      const commission = tx.reduce((sum, row) => sum + Number(row.commission || 0), 0);
      $('salesRevenue').textContent = money(revenue);
      $('salesHpp').textContent = money(hpp);
      $('salesCommission').textContent = money(commission);
      $('salesGrossProfit').textContent = money(revenue - hpp - commission);
      $('salesTransactions').textContent = String(tx.length);

      const grouped = {};
      tx.forEach((row) => {
        const key = row.product_id || 'unknown';
        const item = grouped[key] ||= { qty: 0, revenue: 0, hpp: 0, commission: 0, name: products[key]?.name || '-', code: products[key]?.product_code || '-' };
        const qty = Number(row.quantity || 1);
        item.qty += qty; item.revenue += Number(row.selling_price || 0) * qty; item.hpp += Number(row.hpp || 0) * qty; item.commission += Number(row.commission || 0);
      });
      const productRows = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
      $('salesProductSummary').innerHTML = productRows.length ? `<div class="table-wrap"><table><thead><tr><th>Produk</th><th>Kode</th><th>Qty</th><th>Omzet</th><th>HPP</th><th>Komisi</th><th>Laba Kotor</th></tr></thead><tbody>${productRows.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.code)}</td><td>${row.qty}</td><td>${money(row.revenue)}</td><td>${money(row.hpp)}</td><td>${money(row.commission)}</td><td>${money(row.revenue - row.hpp - row.commission)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">Belum ada penjualan pada periode ini.</div>';
      $('salesTransactionTable').innerHTML = tx.length ? `<table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Omzet</th><th>Dibayar</th><th>Piutang</th><th>Komisi</th><th>Laba Kotor</th><th>Status</th><th>WhatsApp</th></tr></thead><tbody>${tx.slice(0, 100).map((row) => { const qty = Number(row.quantity || 1); const rev = Number(row.selling_price || 0) * qty; const cost = Number(row.hpp || 0) * qty; const fee = Number(row.commission || 0); const paid = Math.min(Math.max(Number(row.amount_paid || 0), 0), rev); const receivable = Math.max(0, rev - paid); const customer = customers[row.customer_id] || {}; const product = products[row.product_id] || {}; const wa = whatsappUrl(customer.whatsapp, salesWhatsappMessage(row, customer, product)); return `<tr><td><strong>${esc(row.transaction_code || '-')}</strong></td><td>${esc(new Date(row.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(customer.business_name || customer.owner_name || '-')}</td><td>${esc(product.name || '-')}</td><td>${qty}</td><td>${money(rev)}</td><td>${money(paid)}</td><td>${money(receivable)}</td><td>${money(fee)}</td><td>${money(rev - cost - fee)}</td><td>${esc(row.payment_status || '-')}</td><td>${wa ? `<a class="btn" target="_blank" rel="noopener noreferrer" href="${esc(wa)}">WhatsApp</a>` : '<span class="muted">Tidak ada nomor</span>'}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted">Belum ada transaksi.</div>';
      document.dispatchEvent(new CustomEvent('aljava:sales-data-rendered'));
    } catch (error) {
      const message = esc(error?.message || error);
      if ($('salesProductSummary')) $('salesProductSummary').innerHTML = `<div class="notice err">❌ Gagal memuat dashboard penjualan: ${message}</div>`;
      if ($('salesTransactionTable')) $('salesTransactionTable').innerHTML = '';
      hosts.forEach((id) => { if ($(id)) $(id).textContent = id === 'salesTransactions' ? '0' : money(0); });
    } finally {
      loading = false;
      if (refreshButton) { refreshButton.disabled = false; refreshButton.textContent = 'Refresh'; }
    }
  }

  window.salesDashboard = Object.freeze({ show: showView, load: loadSales });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUi, { once: true }); else installUi();
})();
