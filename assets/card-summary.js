/* ALJAVA TERIONITY — Main card summary enhancer
   Single owner for the Dashboard Main Card Summary table.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const CONFIG = window.ALJAVA_CONFIG || {};
  const client = window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseKey
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
    : null;
  if (!client) return;

  const statusLabel = (card) => {
    if (card.expires_at && new Date(card.expires_at) < new Date()) return 'Expired';
    if (String(card.status || '').toLowerCase() === 'active' || card.activated_at) return 'Aktif';
    return 'Belum Aktif';
  };
  const statusClass = (label) => label === 'Aktif' ? 'active' : label === 'Expired' ? 'expired' : 'pending';
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID');
  };

  let refreshTimer = null;
  let loading = false;

  function scheduleRefresh(delay = 0) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => { void fetchSummary(); }, delay);
  }

  async function fetchSummary() {
    const host = $('cardTable');
    if (!host || !document.querySelector('#dashboardView.active-view') || loading) return;
    loading = true;
    try {
      const [{ data: cards, error: cardsError }, { data: products, error: productsError }, { data: customers, error: customersError }] = await Promise.all([
        client.from('Cards').select('id,card_code,product_type,status,customer_id,product_id,created_at,activated_at,expires_at,activation_url,qr_code_url,nfc_url').order('created_at', { ascending: false }),
        client.from('Product').select('id,name,category,product_code'),
        client.from('Customers').select('id,business_name,owner_name')
      ]);

      if (cardsError || productsError || customersError) {
        host.innerHTML = '<div class="notice err">❌ Gagal memuat ringkasan kartu.</div>';
        return;
      }

      const productMap = Object.fromEntries((products || []).map((product) => [String(product.id), product]));
      const customerMap = Object.fromEntries((customers || []).map((customer) => [String(customer.id), customer]));
      const rows = cards || [];
      const currentChecked = new Set([...host.querySelectorAll('.card-select:checked')].map((input) => String(input.value)));
      const currentSearch = ($('cardSearch')?.value || '').toLowerCase().trim();
      const currentStatus = $('cardStatus')?.value || '';

      const filtered = rows.filter((card) => {
        const label = statusLabel(card);
        const filter = label === 'Aktif' ? 'active' : label === 'Belum Aktif' ? 'pending' : 'expired';
        const customer = customerMap[String(card.customer_id)];
        const product = productMap[String(card.product_id)];
        const text = `${card.card_code || ''} ${card.product_type || ''} ${product?.product_code || ''} ${product?.name || ''} ${customer?.business_name || customer?.owner_name || ''}`.toLowerCase();
        return (!currentStatus || currentStatus === filter) && (!currentSearch || text.includes(currentSearch));
      });

      const active = filtered.filter((card) => statusLabel(card) === 'Aktif').length;
      $('cardSummary').innerHTML = `<div class="notice info">Total ${filtered.length} kartu • <strong>${active}</strong> aktif • <strong>${filtered.length - active}</strong> lainnya</div>`;

      if (!filtered.length) {
        host.innerHTML = '<div class="muted">Tidak ada kartu.</div>';
        syncSelection();
        return;
      }

      host.innerHTML = `<table><thead><tr>
        <th><input id="selectAllCardsTable" type="checkbox" aria-label="Pilih semua kartu"></th>
        <th>Kode Kartu</th><th>Kode Produk</th><th>Jenis</th><th>Customer</th><th>Status</th><th>Dibuat</th><th>Aktivasi</th><th>QR</th><th>NFC</th><th>Aksi</th>
      </tr></thead><tbody>${filtered.map((card) => {
        const label = statusLabel(card);
        const product = productMap[String(card.product_id)];
        const customer = customerMap[String(card.customer_id)];
        const activation = card.activation_url || `${CONFIG.activationBaseUrl || 'https://aljava-activation.vercel.app/'}?code=${encodeURIComponent(card.card_code || '')}`;
        const qr = card.qr_code_url || `https://quickchart.io/qr?text=${encodeURIComponent(activation)}&size=300`;
        const nfc = card.nfc_url || activation;
        return `<tr>
          <td><input class="card-select" type="checkbox" value="${esc(card.id)}" ${currentChecked.has(String(card.id)) ? 'checked' : ''} aria-label="Pilih kartu ${esc(card.card_code)}"></td>
          <td><strong>${esc(card.card_code)}</strong></td>
          <td>${esc(product?.product_code || '-')}</td>
          <td>${esc(card.product_type || product?.name || '-')}</td>
          <td>${esc(customer?.business_name || customer?.owner_name || '-')}</td>
          <td class="${statusClass(label)}">${esc(label)}</td>
          <td>${formatDate(card.created_at)}</td>
          <td><a class="btn summary-link" target="_blank" rel="noopener" href="${esc(activation)}">Link</a></td>
          <td><a class="btn summary-link" target="_blank" rel="noopener" href="${esc(qr)}">QR</a></td>
          <td><a class="btn summary-link" href="${esc(nfc)}">NFC</a></td>
          <td><button class="btn danger summary-delete-card" type="button" data-card-id="${esc(card.id)}" data-card-code="${esc(card.card_code)}">Hapus</button></td>
        </tr>`;
      }).join('')}</tbody></table>`;

      host.querySelectorAll('.card-select').forEach((input) => input.addEventListener('change', syncSelection));
      $('selectAllCardsTable')?.addEventListener('change', (event) => {
        host.querySelectorAll('.card-select').forEach((input) => { input.checked = event.target.checked; });
        syncSelection();
      });
      host.querySelectorAll('.summary-delete-card').forEach((button) => button.addEventListener('click', () => deleteCard(button.dataset.cardId, button.dataset.cardCode)));
      syncSelection();
    } finally {
      loading = false;
    }
  }

  function syncSelection() {
    const host = $('cardTable');
    if (!host) return;
    const selected = host.querySelectorAll('.card-select:checked').length;
    const all = host.querySelectorAll('.card-select').length;
    const bulk = $('deleteSelectedCards');
    if (bulk) {
      bulk.disabled = selected === 0;
      bulk.textContent = selected ? `Hapus Pilihan (${selected})` : 'Hapus Pilihan';
    }
    const allBox = $('selectAllCards');
    const tableBox = $('selectAllCardsTable');
    if (tableBox) {
      tableBox.checked = all > 0 && selected === all;
      tableBox.indeterminate = selected > 0 && selected < all;
    }
    if (allBox) {
      allBox.checked = all > 0 && selected === all;
      allBox.indeterminate = selected > 0 && selected < all;
    }
  }

  async function deleteCard(id, code) {
    if (!id || !window.confirm(`Hapus kartu "${code || id}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const msg = $('cardActionMsg');
    if (msg) { msg.className = 'notice info'; msg.textContent = `Menghapus kartu ${code || id}...`; }
    try {
      const { error } = await client.from('Cards').delete().eq('id', id);
      if (error) throw error;
      if (msg) { msg.className = 'notice ok'; msg.textContent = `✓ Kartu ${code || id} berhasil dihapus.`; }
      document.dispatchEvent(new CustomEvent('aljava:cards-deleted'));
      scheduleRefresh(50);
      document.dispatchEvent(new CustomEvent('aljava:data-refresh-requested'));
    } catch (error) {
      if (msg) { msg.className = 'notice err'; msg.textContent = `❌ Gagal menghapus kartu: ${error?.message || error}`; }
    }
  }

  function bind() {
    document.addEventListener('aljava:cards-created', () => scheduleRefresh(100));
    document.addEventListener('aljava:cards-deleted', () => scheduleRefresh(100));
    document.addEventListener('aljava:data-loaded', () => scheduleRefresh(50));
    document.addEventListener('aljava:data-refresh-requested', () => scheduleRefresh(50));
    window.addEventListener('hashchange', () => scheduleRefresh(50));
    document.addEventListener('click', (event) => {
      if (event.target?.closest?.('#dashboardMenu')) scheduleRefresh(100);
    });
    $('cardSearch')?.addEventListener('input', () => scheduleRefresh(180));
    $('cardStatus')?.addEventListener('change', () => scheduleRefresh(0));
    scheduleRefresh(200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
