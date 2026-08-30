/* ALJAVA TERIONITY — Main card summary enhancer
   Keeps the dashboard summary independent from admin.js data internals.
*/
(() => {
  'use strict';

  const CONFIG = {
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw'
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

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

  async function fetchSummary() {
    const host = $('cardTable');
    if (!host || !document.querySelector('#dashboardView.active-view')) return;

    const [{ data: cards, error: cardsError }, { data: products, error: productsError }, { data: customers, error: customersError }] = await Promise.all([
      client.from('Cards').select('id,card_code,product_type,status,customer_id,product_id,created_at,activated_at,expires_at,activation_url,qr_code_url,nfc_url').order('created_at', { ascending: false }),
      client.from('Product').select('id,name,category,product_code'),
      client.from('Customers').select('id,business_name,owner_name')
    ]);

    if (cardsError || productsError || customersError) return;

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
    const summary = $('cardSummary');
    if (summary) summary.innerHTML = `<div class="notice info">Total ${filtered.length} kartu • <strong>${active}</strong> aktif • <strong>${filtered.length - active}</strong> lainnya</div>`;

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
      const activation = card.activation_url || `https://aljava-activation.vercel.app/?code=${encodeURIComponent(card.card_code || '')}`;
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
        <td>${activation ? `<a class="btn summary-link" target="_blank" rel="noopener" href="${esc(activation)}">Link</a>` : '-'}</td>
        <td>${qr ? `<a class="btn summary-link" target="_blank" rel="noopener" href="${esc(qr)}">QR</a>` : '-'}</td>
        <td>${nfc ? `<a class="btn summary-link" href="${esc(nfc)}">NFC</a>` : '-'}</td>
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
    const { error } = await client.from('Cards').delete().eq('id', id);
    const msg = $('cardActionMsg');
    if (error) {
      if (msg) { msg.className = 'notice err'; msg.textContent = `❌ Gagal menghapus kartu: ${error.message}`; }
      return;
    }
    if (msg) { msg.className = 'notice ok'; msg.textContent = `✓ Kartu ${code || id} berhasil dihapus.`; }
    await fetchSummary();
  }

  function scheduleInitial() {
    setTimeout(fetchSummary, 1000);
    document.addEventListener('aljava:cards-created', () => setTimeout(fetchSummary, 300));
    $('cardSearch')?.addEventListener('input', () => setTimeout(fetchSummary, 50));
    $('cardStatus')?.addEventListener('change', () => setTimeout(fetchSummary, 50));
    $('refresh')?.addEventListener('click', () => setTimeout(fetchSummary, 300));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleInitial, { once: true });
  else scheduleInitial();
})();
