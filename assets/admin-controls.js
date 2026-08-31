/* ALJAVA TERIONITY — centralized admin controls */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;' }[char]));
  const money = (value) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value) || 0);
  let paymentInstalled = false;
  let paymentLoading = false;

  function client() {
    const c = window.ALJAVA_CONFIG;
    if (!c || !window.supabase?.createClient) return null;
    return window.supabase.createClient(c.supabaseUrl, c.supabaseKey);
  }

  function installPaymentUi() {
    if (paymentInstalled) return;
    const menu = $('menuPanel')?.querySelector(':scope > .menu-settings .menu-items');
    const app = $('app');
    if (!menu || !app) return;

    const button = $('paymentsMenu') || document.createElement('button');
    if (!button.id) {
      button.id = 'paymentsMenu';
      button.type = 'button';
      button.className = 'btn';
      button.textContent = 'Pembayaran & Piutang';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showPayments();
      });
      menu.insertBefore(button, $('resetMenu') || null);
    }

    let section = $('paymentsView');
    if (!section) {
      section = document.createElement('section');
      section.id = 'paymentsView';
      section.className = 'view';
      section.innerHTML = `
        <div class="row" style="margin-top:18px"><div><h1 style="margin:0">Pembayaran & Piutang</h1><p class="muted">Kelola pelunasan transaksi tanpa mengubah omzet, HPP, atau komisi.</p></div></div>
        <section class="stats">
          <div class="glass stat"><div class="muted">Total Tagihan</div><div id="payTotal" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Sudah Dibayar</div><div id="payPaid" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Piutang</div><div id="payReceivable" class="num">Rp 0</div></div>
          <div class="glass stat"><div class="muted">Overdue</div><div id="payOverdue" class="num">0</div></div>
        </section>
        <section class="glass panel">
          <div class="head"><div class="row"><div><h2 style="margin:0">Daftar Transaksi</h2><p class="muted">Cari customer dan filter status pembayaran.</p></div><div class="filter"><input id="paySearch" class="field" placeholder="Cari customer / ID"><select id="payStatus" class="field"><option value="">Semua</option><option value="unpaid">Belum Dibayar</option><option value="partial">Sebagian</option><option value="paid">Lunas</option></select></div></div></div>
          <div class="body"><div id="paymentTable" class="table-wrap"><div class="muted">Memuat...</div></div></div>
        </section>`;
      app.appendChild(section);
    }

    $('paySearch')?.addEventListener('input', () => void loadPayments());
    $('payStatus')?.addEventListener('change', () => void loadPayments());
    paymentInstalled = true;
  }

  function showPayments() {
    installPaymentUi();
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'paymentsView'));
    $('menuPanel')?.classList.remove('open');
    $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#payments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void loadPayments();
  }

  async function loadPayments() {
    if (!paymentInstalled || paymentLoading) return;
    const sb = client();
    if (!sb) return;
    paymentLoading = true;
    const host = $('paymentTable');
    try {
      const [txResult, customerResult, productResult] = await Promise.all([
        sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,amount_paid,payment_status,due_date,transaction_date').order('transaction_date', { ascending:false }),
        sb.from('Customers').select('id,business_name,owner_name'),
        sb.from('Product').select('id,name,product_code')
      ]);
      if (txResult.error) throw txResult.error;
      if (customerResult.error) throw customerResult.error;
      if (productResult.error) throw productResult.error;

      const customerMap = Object.fromEntries((customerResult.data || []).map((r) => [r.id, r]));
      const productMap = Object.fromEntries((productResult.data || []).map((r) => [r.id, r]));
      const search = String($('paySearch')?.value || '').toLowerCase().trim();
      const statusFilter = String($('payStatus')?.value || '').toLowerCase();
      const allRows = (txResult.data || []).map((row) => {
        const total = Math.max(0, Number(row.selling_price || 0) * Number(row.quantity || 1));
        const paid = Math.min(Math.max(Number(row.amount_paid || 0), 0), total);
        const due = row.due_date ? new Date(`${row.due_date}T23:59:59`) : null;
        const customer = customerMap[row.customer_id] || {};
        const product = productMap[row.product_id] || {};
        return { ...row, total, paid, receivable: Math.max(0, total-paid), status: String(row.payment_status || 'unpaid').toLowerCase(), overdue: total > paid && !!due && due < new Date(), customer, product };
      });
      const rows = allRows.filter((row) => {
        const haystack = `${row.customer.business_name || ''} ${row.customer.owner_name || ''} ${row.id}`.toLowerCase();
        return (!search || haystack.includes(search)) && (!statusFilter || row.status === statusFilter);
      });

      $('payTotal').textContent = money(allRows.reduce((sum, row) => sum + row.total, 0));
      $('payPaid').textContent = money(allRows.reduce((sum, row) => sum + row.paid, 0));
      $('payReceivable').textContent = money(allRows.reduce((sum, row) => sum + row.receivable, 0));
      $('payOverdue').textContent = String(allRows.filter((row) => row.overdue).length);

      host.innerHTML = rows.length ? `<table><thead><tr><th>Customer</th><th>Produk</th><th>Total</th><th>Dibayar</th><th>Piutang</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.customer.business_name || row.customer.owner_name || '-')}<br><span class="muted" style="font-size:.8em">${esc(row.id)}</span></td><td>${esc(row.product.name || '-')}</td><td>${money(row.total)}</td><td>${money(row.paid)}</td><td><strong>${money(row.receivable)}</strong></td><td>${row.due_date ? esc(new Date(`${row.due_date}T00:00:00`).toLocaleDateString('id-ID')) : '-'}</td><td>${esc(row.status)}${row.overdue ? ' • overdue' : ''}</td><td>${row.receivable > 0 ? `<button class="btn" type="button" data-pay-id="${esc(row.id)}" data-pay-total="${row.total}" data-pay-paid="${row.paid}">Catat Bayar</button>` : '<span class="muted">Selesai</span>'}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Tidak ada transaksi sesuai filter.</div>';
      host.querySelectorAll('[data-pay-id]').forEach((button) => button.addEventListener('click', () => void recordPayment(button.dataset.payId, Number(button.dataset.payTotal || 0), Number(button.dataset.payPaid || 0))));
    } catch (error) {
      host.innerHTML = `<div class="notice err">❌ Gagal memuat pembayaran: ${esc(error?.message || error)}</div>`;
    } finally {
      paymentLoading = false;
    }
  }

  async function recordPayment(id, total, paidBefore) {
    const input = window.prompt(`Nominal pembayaran untuk transaksi ${id}\nSisa saat ini: ${money(Math.max(0, total-paidBefore))}`);
    if (input === null) return;
    const amount = Number(String(input).replace(/[^0-9.-]/g, ''));
    const remaining = Math.max(0, total - paidBefore);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      window.alert(`Nominal harus lebih dari 0 dan maksimal ${money(remaining)}.`);
      return;
    }
    const sb = client();
    if (!sb) return;
    try {
      const nextPaid = Math.min(total, paidBefore + amount);
      const nextStatus = nextPaid >= total ? 'paid' : 'partial';
      const { error } = await sb.from('Transactions').update({ amount_paid: nextPaid, payment_status: nextStatus }).eq('id', id);
      if (error) throw error;
      await loadPayments();
      document.dispatchEvent(new CustomEvent('aljava:data-loaded'));
    } catch (error) {
      window.alert(`Gagal mencatat pembayaran: ${error?.message || error}`);
    }
  }

  function bind() {
    const refresh = $('refreshMenu');
    if (refresh && refresh.dataset.bound !== '1') {
      refresh.dataset.bound = '1';
      refresh.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        refresh.disabled = true;
        refresh.textContent = 'Memuat…';
        window.setTimeout(() => window.location.reload(), 50);
      });
    }
    ['refresh', 'logoutTop'].forEach((id) => $(id)?.remove());
    const salesButtons = [...document.querySelectorAll('.menu-items button')].filter((button) => /Dashboard Penjualan/i.test(button.textContent.trim()));
    salesButtons.slice(1).forEach((button) => button.remove());
    document.querySelectorAll('.menu-items button').forEach((button) => { if (/\bHPP\b/i.test(button.textContent)) button.remove(); });
    installPaymentUi();
  }

  window.adminControls = { showPayments, loadPayments };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  document.addEventListener('aljava:data-loaded', bind);
  document.addEventListener('aljava:sales-ui-ready', bind);
})();
