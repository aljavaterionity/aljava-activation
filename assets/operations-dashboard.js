/* ALJAVA TERIONITY — Operations Dashboard */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const money = CORE?.money || ((value) => Number(value) || 0);
  const client = CORE?.supabase || null;
  if (!client) return;

  let installed = false;
  let loading = false;

  function install() {
    if (installed) return;
    const app = $('app'); if (!app) return;
    const section = document.createElement('section');
    section.id = 'operationsView'; section.className = 'view';
    section.innerHTML = `<div style="margin-top:18px"><h1 style="margin:0">Operations Dashboard</h1><p class="muted">Ringkasan operasional ALJAVA dari data transaksi otomatis.</p></div><section class="stats"><div class="glass stat"><div class="muted">Omzet</div><div id="opsRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Profit</div><div id="opsProfit" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi</div><div id="opsTransactions" class="num">0</div></div><div class="glass stat"><div class="muted">Customer</div><div id="opsCustomers" class="num">0</div></div><div class="glass stat"><div class="muted">Kartu Aktif</div><div id="opsActiveCards" class="num">0</div></div><div class="glass stat"><div class="muted">Scan</div><div id="opsScans" class="num">0</div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Status Operasional</h2></div><div class="body"><div id="opsActions" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">System Health</h2><p class="muted" style="margin:5px 0 0">Status koneksi database dan aktivitas data terakhir.</p></div><div class="body"><div id="opsHealth" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Transaksi Terbaru</h2></div><div class="body"><div id="opsRecent" class="table-wrap"><div class="muted">Memuat...</div></div></div></section><section class="glass panel"><div class="head"><h2 style="margin:0">Produk Terlaris</h2></div><div class="body"><div id="opsTopProducts" class="table-wrap"><div class="muted">Memuat...</div></div></div></section>`;
    app.appendChild(section);
    installed = true;
    const menu = $('menuPanel')?.querySelector(':scope > .menu-section .menu-items');
    if (menu && !$('operationsMenu')) {
      const button = document.createElement('button');
      button.id = 'operationsMenu'; button.type = 'button'; button.className = 'menu-item';
      button.innerHTML = '<span class="menu-icon">◈</span><span><b>Operations Dashboard</b><small>Monitor operasional otomatis</small></span>';
      button.addEventListener('click', show);
      menu.appendChild(button);
    }
  }

  function show() {
    install();
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'operationsView'));
    $('menuPanel')?.classList.remove('open'); $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#operations'); window.scrollTo({ top: 0, behavior: 'smooth' }); void load();
  }
  function paymentLabel(status) {
    const value = String(status || 'unpaid').toLowerCase();
    if (value === 'paid') return '<b class="ops-paid-badge">PAID</b>';
    if (value === 'partial') return '<b class="ops-paid-badge ops-partial-badge">PARTIAL</b>';
    return '<b class="ops-paid-badge ops-unpaid-badge">UNPAID</b>';
  }
  async function load() {
    if (loading) return;
    loading = true;
    try {
      const [tx, customers, cards, products, scanCount, lastScan] = await Promise.all([
        client.from('Transactions').select('id,product_id,quantity,selling_price,hpp,commission,amount_paid,payment_status,transaction_date').order('transaction_date', { ascending: false }),
        client.from('Customers').select('id'),
        client.from('Cards').select('id,status,activated_at,expires_at'),
        client.from('Product').select('id,name,product_code'),
        client.from('CardScans').select('id', { count: 'exact', head: true }),
        client.from('CardScans').select('id,scanned_at').order('scanned_at', { ascending: false }).limit(1)
      ]);
      const failed = [tx, customers, cards, products, scanCount, lastScan].find((result) => result.error);
      if (failed) throw failed.error;
      const rows = tx.data || [];
      const productMap = Object.fromEntries((products.data || []).map((product) => [product.id, product]));
      const revenue = rows.reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
      const hpp = rows.reduce((sum, row) => sum + Number(row.hpp || 0) * Number(row.quantity || 1), 0);
      const commission = rows.reduce((sum, row) => sum + Number(row.commission || 0), 0);
      const now = Date.now();
      const activeCards = (cards.data || []).filter((card) => String(card.status || '').toLowerCase() === 'active' && (!card.expires_at || new Date(card.expires_at).getTime() >= now)).length;
      const pendingCards = (cards.data || []).filter((card) => String(card.status || '').toLowerCase() === 'pending').length;
      const scanTotal = Number(scanCount.count || 0);
      $('opsRevenue').textContent = money(revenue); $('opsProfit').textContent = money(revenue - hpp - commission); $('opsTransactions').textContent = String(rows.length); $('opsCustomers').textContent = String((customers.data || []).length); $('opsActiveCards').textContent = String(activeCards); $('opsScans').textContent = String(scanTotal);
      const unpaid = rows.filter((row) => String(row.payment_status || 'unpaid').toLowerCase() !== 'paid').length;
      $('opsActions').innerHTML = `<table><thead><tr><th>Komponen</th><th>Status</th><th>Jumlah</th></tr></thead><tbody><tr><td>Kartu</td><td>${pendingCards ? '🟡 Perlu aktivasi' : '🟢 Normal'}</td><td>${pendingCards} pending</td></tr><tr><td>Transaksi</td><td>🟢 Otomatis</td><td>${rows.length} transaksi</td></tr><tr><td>Pembayaran</td><td>${unpaid ? '🟡 Ada transaksi belum lunas' : '🟢 Lunas'}</td><td>${unpaid} belum lunas</td></tr><tr><td>Revenue</td><td>🟢 Otomatis</td><td>${money(revenue)}</td></tr></tbody></table>`;
      const lastTx = rows[0]?.transaction_date ? new Date(rows[0].transaction_date).toLocaleString('id-ID') : 'Belum ada';
      const lastScanAt = lastScan.data?.[0]?.scanned_at ? new Date(lastScan.data[0].scanned_at).toLocaleString('id-ID') : 'Belum ada';
      $('opsHealth').innerHTML = `<table><thead><tr><th>Komponen</th><th>Status</th><th>Info</th></tr></thead><tbody><tr><td>Database API</td><td>🟢 Healthy</td><td>Query operasional berhasil</td></tr><tr><td>Transactions</td><td>🟢 Connected</td><td>Aktivitas terakhir: ${esc(lastTx)}</td></tr><tr><td>CardScans</td><td>🟢 Connected</td><td>Scan terakhir: ${esc(lastScanAt)}</td></tr><tr><td>Dashboard</td><td>🟢 Online</td><td>Refresh: ${esc(new Date().toLocaleString('id-ID'))}</td></tr></tbody></table>`;
      $('opsRecent').innerHTML = rows.slice(0, 10).map((row) => `<div style="padding:10px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(productMap[row.product_id]?.name || 'Produk')}</strong> · ${esc(row.id)}<br><span class="muted">${esc(new Date(row.transaction_date).toLocaleString('id-ID'))} · ${money(Number(row.selling_price || 0) * Number(row.quantity || 1))} ${paymentLabel(row.payment_status)}</span></div>`).join('') || '<div class="muted">Belum ada transaksi.</div>';
      const counts = {};
      rows.forEach((row) => { const key = row.product_id || 'unknown'; counts[key] = (counts[key] || 0) + Number(row.quantity || 1); });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      $('opsTopProducts').innerHTML = top.length ? `<table><thead><tr><th>Produk</th><th>Qty</th></tr></thead><tbody>${top.map(([id, qty]) => `<tr><td>${esc(productMap[id]?.name || id)}</td><td>${qty}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Belum ada penjualan.</div>';
    } catch (error) {
      $('opsHealth').innerHTML = `<div class="notice err">🔴 Database/API gagal: ${esc(error?.message || error)}</div>`;
      $('opsRecent').innerHTML = `<div class="notice err">❌ Gagal memuat dashboard: ${esc(error?.message || error)}</div>`;
    } finally { loading = false; }
  }

  window.operationsDashboard = Object.freeze({ show, load });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
