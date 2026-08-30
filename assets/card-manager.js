/* ALJAVA TERIONITY — Card manager module
   Responsibilities: product-aware card creation, quantity/code sequencing,
   activation URL generation, QR/NFC links, result rendering, and enriching
   the main dashboard card summary without breaking existing handlers.
*/

(() => {
  'use strict';

  const CONFIG = {
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw',
    activationBaseUrl: 'https://aljava-activation.vercel.app/'
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

  const sequenceCodes = (base, quantity) => {
    const clean = String(base || '').trim();
    const count = Math.max(1, Math.min(500, Number(quantity) || 1));
    const match = clean.match(/^(.*?)(\d+)$/);
    if (!match) {
      return Array.from({ length: count }, (_, index) => `${clean}-${String(index + 1).padStart(3, '0')}`);
    }
    const prefix = match[1];
    const width = match[2].length;
    const start = Number(match[2]);
    return Array.from({ length: count }, (_, index) => prefix + String(start + index).padStart(width, '0'));
  };

  const activationUrl = (cardCode) => {
    const url = new URL(CONFIG.activationBaseUrl);
    url.searchParams.set('code', cardCode);
    return url.href;
  };

  const qrUrl = (activation) => `https://quickchart.io/qr?text=${encodeURIComponent(activation)}&size=300`;

  const setMessage = (element, type, text) => {
    if (!element) return;
    element.className = `notice ${type}`;
    element.textContent = text;
  };

  async function loadProducts() {
    const select = $('singleProduct');
    if (!select) return [];
    const { data, error } = await client
      .from('Product')
      .select('id,name,category,product_code')
      .order('name', { ascending: true });
    if (error) throw error;

    select.innerHTML = '<option value="">Pilih Produk</option>' + (data || []).map((product) => {
      const code = product.product_code || product.name || product.id;
      const label = product.name ? `${product.name} — ${code}` : code;
      return `<option value="${esc(product.id)}">${esc(label)}</option>`;
    }).join('');
    return data || [];
  }

  function renderPreview(products) {
    const code = $('singleCode')?.value.trim() || '';
    const quantity = Math.max(1, Math.min(500, Number($('singleQty')?.value) || 1));
    const product = products.find((row) => row.id === $('singleProduct')?.value);
    const codes = code ? sequenceCodes(code, quantity) : [];
    const preview = $('singlePreview');
    if (!preview) return;

    if (!code) {
      preview.className = 'notice info full';
      preview.textContent = 'Masukkan kode awal untuk melihat jumlah dan rentang kode.';
      return;
    }

    const first = codes[0];
    const last = codes[codes.length - 1];
    const productCode = product?.product_code || '-';
    preview.className = 'notice info full';
    preview.innerHTML = `${codes.length} kartu • Produk: <strong>${esc(productCode)}</strong> • Kode: <strong>${esc(first)}</strong>${codes.length > 1 ? ` → <strong>${esc(last)}</strong>` : ''}`;
  }

  function renderResults(rows, product) {
    const host = $('cardCreationResults');
    if (!host) return;
    if (!rows.length) {
      host.innerHTML = '';
      return;
    }

    host.innerHTML = `<div class="glass" style="margin-top:14px"><div class="head"><div class="row"><div><h3 style="margin:0">Hasil Kartu</h3><p class="muted">Produk: ${esc(product?.name || '-')} • Kode produk: ${esc(product?.product_code || '-')}</p></div><span class="muted">${rows.length} kartu</span></div></div><div class="body"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Jenis</th><th>Aktivasi</th><th>QR</th><th>NFC</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.card_code)}</strong></td><td>${esc(row.product_type)}</td><td><a class="btn" target="_blank" rel="noopener" href="${esc(row.activation_url)}">Buka Link</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(row.qr_code_url)}">Lihat QR</a></td><td><a class="btn" href="${esc(row.nfc_url)}">Link NFC</a></td></tr>`).join('')}</tbody></table></div></div></div>`;
  }

  async function createCards() {
    const form = $('singleForm');
    const msg = $('singleMsg');
    if (!form || !msg) return;

    const code = $('singleCode')?.value.trim();
    const quantity = Math.max(1, Math.min(500, Number($('singleQty')?.value) || 1));
    const productId = $('singleProduct')?.value || null;
    const customerId = $('singleCustomer')?.value || null;
    const reviewUrl = $('singleReview')?.value.trim() || null;

    if (!code) {
      setMessage(msg, 'err', '❌ Kode awal kartu wajib diisi.');
      return;
    }

    const products = await loadProducts();
    const product = products.find((row) => row.id === productId);
    const codes = sequenceCodes(code, quantity);
    const activationRows = codes.map((cardCode) => {
      const activation = activationUrl(cardCode);
      return {
        card_code: cardCode,
        product_type: product?.product_code || product?.name || product?.category || 'Tanpa Jenis',
        status: 'pending',
        product_id: productId,
        customer_id: customerId,
        google_review_url: reviewUrl,
        activation_url: activation,
        qr_code_url: qrUrl(activation),
        nfc_url: activation
      };
    });

    setMessage(msg, 'info', `Memproses ${activationRows.length} kartu...`);

    const { data, error } = await client
      .from('Cards')
      .insert(activationRows)
      .select('id,card_code,product_type,activation_url,qr_code_url,nfc_url');

    if (error) throw error;

    setMessage(msg, 'ok', `✓ ${data?.length || activationRows.length} kartu berhasil dibuat.`);
    renderResults(data || activationRows, product);
    form.reset();
    $('singleQty').value = '1';
    renderPreview(products);

    document.dispatchEvent(new CustomEvent('aljava:cards-created', { detail: { count: data?.length || activationRows.length } }));
  }

  async function enrichMainCardSummary() {
    const host = $('cardTable');
    if (!host) return;

    const table = host.querySelector('table');
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    const bodyRows = [...table.querySelectorAll('tbody tr')];
    if (!headerRow || !bodyRows.length) return;

    headerRow.querySelectorAll('.main-card-extra').forEach((node) => node.remove());
    bodyRows.forEach((row) => row.querySelectorAll('.main-card-extra').forEach((node) => node.remove()));

    try {
      const visibleIds = bodyRows
        .map((row) => row.querySelector('.delete-card')?.dataset.cardId)
        .filter(Boolean);
      if (!visibleIds.length) return;

      const [{ data: cards, error: cardsError }, { data: products, error: productsError }] = await Promise.all([
        client.from('Cards').select('id,card_code,product_type,activation_url,qr_code_url,nfc_url,product_id').in('id', visibleIds),
        client.from('Product').select('id,product_code,name').order('name', { ascending: true })
      ]);
      if (cardsError) throw cardsError;
      if (productsError) throw productsError;

      const cardMap = Object.fromEntries((cards || []).map((card) => [String(card.id), card]));
      const productMap = Object.fromEntries((products || []).map((product) => [String(product.id), product]));

      const actionHeader = [...headerRow.children].find((cell) => cell.textContent.trim() === 'Aksi');
      ['Kode Produk', 'Aktivasi', 'QR', 'NFC'].forEach((label) => {
        const th = document.createElement('th');
        th.className = 'main-card-extra';
        th.textContent = label;
        actionHeader ? headerRow.insertBefore(th, actionHeader) : headerRow.appendChild(th);
      });

      bodyRows.forEach((row) => {
        const cardId = row.querySelector('.delete-card')?.dataset.cardId;
        const card = cardMap[String(cardId)];
        const product = card ? productMap[String(card.product_id)] : null;
        const activation = card?.activation_url || activationUrl(card?.card_code || '');
        const qr = card?.qr_code_url || qrUrl(activation);
        const nfc = card?.nfc_url || activation;
        const code = product?.product_code || card?.product_type || '-';
        const actionCell = [...row.children].find((cell) => cell.querySelector('.delete-card'));
        const makeCell = (html) => {
          const td = document.createElement('td');
          td.className = 'main-card-extra';
          td.innerHTML = html;
          return td;
        };
        [
          makeCell(`<strong>${esc(code)}</strong>`),
          makeCell(`<a class="btn" target="_blank" rel="noopener" href="${esc(activation)}">Link</a>`),
          makeCell(`<a class="btn" target="_blank" rel="noopener" href="${esc(qr)}">QR</a>`),
          makeCell(`<a class="btn" target="_blank" rel="noopener" href="${esc(nfc)}">NFC</a>`)
        ].forEach((cell) => actionCell ? row.insertBefore(cell, actionCell) : row.appendChild(cell));
      });
    } catch (error) {
      console.warn('[ALJAVA] Gagal melengkapi ringkasan kartu utama:', error?.message || error);
    }
  }

  let enrichTimer = null;
  function scheduleMainSummaryEnrichment() {
    clearTimeout(enrichTimer);
    enrichTimer = setTimeout(enrichMainCardSummary, 60);
  }

  async function init() {
    const form = $('singleForm');
    if (!form) return;

    let products = [];
    try {
      products = await loadProducts();
    } catch (error) {
      setMessage($('singleMsg'), 'err', `❌ Gagal memuat produk: ${error.message}`);
    }

    const update = () => renderPreview(products);
    $('singleCode')?.addEventListener('input', update);
    $('singleQty')?.addEventListener('input', update);
    $('singleProduct')?.addEventListener('change', update);
    update();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await createCards();
        products = await loadProducts();
      } catch (error) {
        setMessage($('singleMsg'), 'err', `❌ Gagal membuat kartu: ${error.message}`);
      } finally {
        if (button) button.disabled = false;
      }
    }, true);

    document.addEventListener('aljava:cards-created', () => {
      if (typeof window.load === 'function') window.load();
      scheduleMainSummaryEnrichment();
    });
    document.addEventListener('aljava:data-loaded', scheduleMainSummaryEnrichment);
    scheduleMainSummaryEnrichment();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
