/* ALJAVA TERIONITY — Sales dashboard (stage 1) */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  let sb = null;
  let initialized = false;

  function getClient() {
    if (sb) return sb;
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) return null;
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return sb;
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'salesView'));
    $('menuPanel')?.classList.remove('open');
    $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#sales');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void loadSales();
  }

  function installUi() {
    if (initialized) return;
    const menuItems = document.querySelector('.menu-items');
    const app = $('app');
    if (!menuItems || !app) return;

    const button = document.createElement('button');
    button.id = 'salesMenu';
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Dashboard Penjualan';
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showView(); });
    menuItems.insertBefore(button, menuItems.children[2] || null);

    const section = document.createElement('section');
    section.id = 'salesView';
    section.className = 'view';
    section.innerHTML = `
      <div class="row" style="margin-top:18px"><div><h1 style="margin:0">Dashboard Penjualan</h1><p class="muted">Omzet, HPP, laba kotor, transaksi, dan performa produk.</p></div><button id="salesRefresh" class="btn" type="button">Refresh</button></div>
      <section class="stats sales-stats">
        <div class="glass stat"><div class="muted">Omzet Total</div><div id="salesRevenue" class="num">Rp 0</div></div>
        <div class="glass stat"><div class="muted">HPP Total</div><div id="salesHpp" class="num">Rp 0</div></div>
        <div class="glass stat"><div class="muted">Laba Kotor</div><div id="salesGrossProfit" class="num">Rp 0</div></div>
        <div class="glass stat"><div class="muted">Transaksi</div><div id="salesTransactions" class="num">0</div></div>
      </section>
      <section class="glass panel">
        <div class="head"><div class="row"><div><h2 style="margin:0">Ringkasan Penjualan</h2><p class="muted">Filter periode tanpa mengubah data transaksi.</p></div><div class="filter"><input id="salesStart" class="field" type="date"><input id="salesEnd" class="field" type="date"></div></div></div>
        <div class="body"><div id="salesProductSummary"></div></div>
      </section>
      <section class="glass panel">
        <div class="head"><h2 style="margin:0">Transaksi Penjualan</h2></div>
        <div class="body"><div id="salesTransactionTable" class="table-wrap"></div></div>
      </section>`;
    app.appendChild(section);

    $('salesRefresh')?.addEventListener('click', () => void loadSales());
    $('salesStart')?.addEventListener('change', () => void loadSales());
    $('salesEnd')?.addEventListener('change', () => void loadSales());
    initialized = true;
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return { start: start ? new Date(`${start}T00:00:00`) : null, end: end ? new Date(`${end}T23:59:59.999`) : null };
  }

  async function loadSales() {
    installUi();
    const client = getClient();
    if (!client || !initialized) return;
    const hosts = ['salesRevenue', 'salesHpp', 'salesGrossProfit', 'salesTransactions'];
    hosts.forEach((id) => { if ($(id)) $(id).textContent = id === 'salesTransactions' ? '…' : 'Memuat…'; });
    try {
      const [txResult, productsResult, customersResult] = await Promise.all([
        client.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date').order('transaction_date', { ascending: false }),
        client.from('Product').select('id,name,product_code'),
        client.from('Customers').select('id,business_name,owner_name')
      ]);
      if (txResult.error) throw txResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;
      const { start, end } = getPeriod();
      const products = Object.fromEntries((productsResult.data || []).map((p) => [p.id, p]));
      const customers = Object.fromEntries((customersResult.data || []).map((c) => [c.id, c]));
      const tx = (txResult.data || []).filter((row) => { const d = new Date(row.transaction_date); return (!start || d >= start) && (!end || d <= end); });

      const revenue = tx.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
      const hpp = tx.reduce((sum, row) => sum + Number(row.hpp || 0) * Number(row.quantity || 1), 0);
      $('salesRevenue').textContent = money(revenue);
      $('salesHpp').textContent = money(hpp);
      $('salesGrossProfit').textContent = money(revenue - hpp);
      $('salesTransactions').textContent = String(tx.length);

      const grouped = {};
      tx.forEach((row) => {
        const key = row.product_id || 'unknown';
        const item = grouped[key] ||= { qty: 0, revenue: 0, hpp: 0, name: products[key]?.name || '-', code: products[key]?.product_code || '-' };
        const qty = Number(row.quantity || 1);
        item.qty += qty;
        item.revenue += Number(row.selling_price || 0) * qty;
        item.hpp += Number(row.hpp || 0) * qty;
      });
      const productRows = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
      $('salesProductSummary').innerHTML = productRows.length ? `<table><thead><tr><th>Produk</th><th>Kode</th><th>Qty</th><th>Omzet</th><th>HPP</th><th>Laba Kotor</th></tr></thead><tbody>${productRows.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.code)}</td><td>${row.qty}</td><td>${money(row.revenue)}</td><td>${money(row.hpp)}</td><td>${money(row.revenue - row.hpp)}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Belum ada penjualan pada periode ini.</div>';
      $('salesTransactionTable').innerHTML = tx.length ? `<table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Omzet</th><th>HPP</th><th>Laba Kotor</th><th>Status</th></tr></thead><tbody>${tx.slice(0, 100).map((row) => { const qty = Number(row.quantity || 1); const rev = Number(row.selling_price || 0) * qty; const cost = Number(row.hpp || 0) * qty; return `<tr><td>${esc(new Date(row.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(customers[row.customer_id]?.business_name || customers[row.customer_id]?.owner_name || '-')}</td><td>${esc(products[row.product_id]?.name || '-')}</td><td>${qty}</td><td>${money(rev)}</td><td>${money(cost)}</td><td>${money(rev - cost)}</td><td>${esc(row.payment_status || '-')}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted">Belum ada transaksi.</div>';
    } catch (error) {
      const message = esc(error?.message || error);
      if ($('salesProductSummary')) $('salesProductSummary').innerHTML = `<div class="notice err">❌ Gagal memuat dashboard penjualan: ${message}</div>`;
      if ($('salesTransactionTable')) $('salesTransactionTable').innerHTML = '';
      hosts.forEach((id) => { if ($(id)) $(id).textContent = id === 'salesTransactions' ? '0' : money(0); });
    }
  }

  window.salesDashboard = { show: showView, load: loadSales };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUi, { once: true }); else installUi();
  document.addEventListener('aljava:data-loaded', installUi);
})();
