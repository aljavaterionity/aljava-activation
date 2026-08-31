/* ALJAVA TERIONITY — Payment Collection */
(() => {
  'use strict';

  let sb = null;
  let busy = false;

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  function getClient() {
    if (sb) return sb;
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) return null;
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return sb;
  }

  function ensureModal() {
    if ($('paymentModal')) return;
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="glass modal-card"><h3 style="margin-top:0">Catat Pembayaran</h3><div id="paymentSummary" class="notice info" style="margin-bottom:12px"></div><form id="paymentForm" class="form"><input id="paymentAmount" class="field full" type="number" min="1" step="1" required placeholder="Nominal pembayaran"><input id="paymentDueDate" class="field full" type="date"><div id="paymentMsg" class="full" aria-live="polite"></div><div class="actions" style="margin-top:14px;justify-content:flex-end"><button id="paymentCancel" class="btn" type="button">Batal</button><button id="paymentSubmit" class="btn" type="submit">Simpan Pembayaran</button></div></form></div>`;
    document.body.appendChild(modal);
    $('paymentCancel').addEventListener('click', closeModal);
    $('paymentForm').addEventListener('submit', submitPayment);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  }

  function closeModal() {
    $('paymentModal')?.classList.remove('open');
    $('paymentForm')?.reset();
    if ($('paymentMsg')) $('paymentMsg').textContent = '';
    busy = false;
  }

  function openModal(tx) {
    ensureModal();
    const total = Number(tx.selling_price || 0) * Number(tx.quantity || 1);
    const paid = Math.min(Math.max(Number(tx.amount_paid || 0), 0), total);
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0) return;
    $('paymentModal').dataset.transactionId = tx.id;
    $('paymentSummary').innerHTML = `<strong>${esc(tx.transaction_code || '-')}</strong><br>Total: ${money(total)}<br>Terbayar: ${money(paid)}<br><strong>Sisa: ${money(remaining)}</strong>`;
    $('paymentAmount').value = remaining;
    $('paymentAmount').max = String(remaining);
    $('paymentDueDate').value = tx.due_date || '';
    $('paymentModal').classList.add('open');
    setTimeout(() => $('paymentAmount')?.focus(), 0);
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (busy) return;
    const client = getClient();
    const modal = $('paymentModal');
    const transactionId = modal?.dataset.transactionId;
    const amount = Number($('paymentAmount')?.value || 0);
    const dueDate = $('paymentDueDate')?.value || null;
    if (!client || !transactionId || !Number.isFinite(amount) || amount <= 0) return;

    busy = true;
    $('paymentSubmit').disabled = true;
    $('paymentMsg').textContent = 'Menyimpan pembayaran…';
    try {
      const { data, error } = await client.rpc('record_transaction_payment', {
        p_transaction_id: transactionId,
        p_payment_amount: amount,
        p_due_date: dueDate
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'Pembayaran gagal disimpan.');
      $('paymentMsg').innerHTML = `<div class="notice ok">✓ ${esc(result.message)}<br>Sisa: ${money(result.remaining_amount)}</div>`;
      window.salesDashboard?.load?.();
      window.operationsDashboard?.load?.();
      setTimeout(closeModal, 700);
    } catch (error) {
      $('paymentMsg').innerHTML = `<div class="notice err">❌ ${esc(error?.message || error)}</div>`;
      busy = false;
      $('paymentSubmit').disabled = false;
    }
  }

  async function handlePayment(code) {
    const client = getClient();
    if (!client || !code) return;
    const { data, error } = await client.from('Transactions').select('id,transaction_code,quantity,selling_price,amount_paid,payment_status,due_date').eq('transaction_code', code).maybeSingle();
    if (error) return alert(`Gagal memuat transaksi: ${error.message}`);
    if (!data) return alert('Transaksi tidak ditemukan.');
    openModal(data);
  }

  function decorate() {
    const table = $('salesTransactionTable');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      if (row.dataset.paymentDecorated === '1' || !row.querySelector('td')) return;
      const codeCell = row.querySelector('td:first-child');
      const statusCell = row.querySelector('td:nth-last-child(2)');
      if (!codeCell || !statusCell) return;
      const code = codeCell.textContent.trim();
      if (!code || code === '-') return;
      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = 'Catat Pembayaran';
      button.addEventListener('click', () => void handlePayment(code));
      const status = statusCell.textContent.trim().toLowerCase();
      if (status === 'paid') button.disabled = true;
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      row.dataset.paymentDecorated = '1';
    });
    const head = table.querySelector('thead tr');
    if (head && !head.dataset.paymentHeader) {
      const th = document.createElement('th');
      th.textContent = 'Pembayaran';
      head.appendChild(th);
      head.dataset.paymentHeader = '1';
    }
  }

  function install() {
    ensureModal();
    const target = $('salesTransactionTable');
    if (!target) return;
    decorate();
  }

  window.paymentCollection = { install, open: openModal };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
  document.addEventListener('aljava:sales-ui-ready', install);
  document.addEventListener('aljava:sales-data-rendered', decorate);
})();
