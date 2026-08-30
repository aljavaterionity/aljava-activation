/* ALJAVA TERIONITY — Sales entry */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

  let installed = false;
  let data = { products: [], customers: [], cards: [] };

  function client() {
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  }

  async function loadOptions() {
    const sb = client();
    if (!sb) throw new Error('Konfigurasi aplikasi tidak tersedia.');
    const [products, customers, cards] = await Promise.all([
      sb.from('Product').select('id,name,product_code,hpp,selling_price,commission').order('name', { ascending: true }),
      sb.from('Customers').select('id,business_name,owner_name').order('business_name', { ascending: true }),
      sb.from('Cards').select('id,card_code,product_id,product_type,customer_id,status').order('created_at', { ascending: false })
    ]);
    if (products.error) throw products.error;
    if (customers.error) throw customers.error;
    if (cards.error) throw cards.error;
    data = { products: products.data || [], customers: customers.data || [], cards: cards.data || [] };
    syncCardSelection();
  }

  function renderOptions() {
    const productSelect = $('saleProduct');
    const customerSelect = $('saleCustomer');
    const cardSelect = $('saleCard');
    if (!productSelect || !customerSelect || !cardSelect) return;

    const previous = {
      product: productSelect.value,
      customer: customerSelect.value,
      card: cardSelect.value
    };

    productSelect.innerHTML = '<option value="">Pilih produk</option>' + data.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.product_code ? ` — ${esc(p.product_code)}` : ''}</option>`).join('');
    customerSelect.innerHTML = '<option value="">Pilih customer</option>' + data.customers.map((c) => `<option value="${esc(c.id)}">${esc(c.business_name || c.owner_name || '-')}</option>`).join('');
    cardSelect.innerHTML = '<option value="">Pilih customer & produk terlebih dahulu</option>';

    if (data.products.some((p) => String(p.id) === String(previous.product))) productSelect.value = previous.product;
    if (data.customers.some((c) => String(c.id) === String(previous.customer))) customerSelect.value = previous.customer;
    renderCardOptions(previous.card);
  }

  function renderCardOptions(previousCardId = '') {
    const cardSelect = $('saleCard');
    if (!cardSelect) return;
    const customerId = $('saleCustomer')?.value || '';
    const productId = $('saleProduct')?.value || '';
    const filtered = data.cards.filter((card) => {
      const matchesCustomer = !customerId || String(card.customer_id) === String(customerId);
      const matchesProduct = !productId || String(card.product_id) === String(productId);
      const usableStatus = String(card.status || '').toLowerCase() !== 'expired';
      return matchesCustomer && matchesProduct && usableStatus;
    });

    if (!customerId || !productId) {
      cardSelect.innerHTML = '<option value="">Pilih customer & produk terlebih dahulu</option>';
      cardSelect.disabled = true;
      return;
    }
    cardSelect.disabled = false;
    cardSelect.innerHTML = '<option value="">Pilih kartu</option>' + filtered.map((c) => `<option value="${esc(c.id)}">${esc(c.card_code)} — ${esc(c.product_type || '-')} — ${esc(c.status || '-')}</option>`).join('');
    if (filtered.some((c) => String(c.id) === String(previousCardId))) cardSelect.value = previousCardId;
    if (!filtered.length) cardSelect.innerHTML = '<option value="">Tidak ada kartu customer/produk yang cocok</option>';
  }

  function selectedProduct() {
    return data.products.find((p) => String(p.id) === String($('saleProduct')?.value)) || null;
  }

  function selectedCard() {
    return data.cards.find((c) => String(c.id) === String($('saleCard')?.value)) || null;
  }

  function updatePreview() {
    const product = selectedProduct();
    const qty = Math.max(1, Number($('saleQuantity')?.value || 1));
    if (!product) {
      $('salePreview').innerHTML = '<div class="notice info">Pilih produk untuk menghitung harga, HPP, dan komisi otomatis.</div>';
      return;
    }
    const price = Number(product.selling_price || 0);
    const hpp = Number(product.hpp || 0);
    const commission = Number(product.commission || 0);
    $('salePreview').innerHTML = `<div class="notice info">Harga/unit: <strong>${money(price)}</strong> • HPP/unit: <strong>${money(hpp)}</strong> • Komisi/unit: <strong>${money(commission)}</strong><br>Total: <strong>${money(price * qty)}</strong> • Komisi: <strong>${money(commission * qty)}</strong> • Laba kotor: <strong>${money((price - hpp - commission) * qty)}</strong></div>`;
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'salesEntryView'));
    $('menuPanel')?.classList.remove('open');
    $('menuButton')?.setAttribute('aria-expanded', 'false');
    history.replaceState?.(null, '', '#sales-entry');
    void refresh();
  }

  function installUi() {
    if (installed) return;
    const menuItems = $('menuPanel')?.querySelector('.menu-items');
    const app = $('app');
    if (!menuItems || !app) return;

    const dashboard = $('salesMenu');
    const button = document.createElement('button');
    button.id = 'salesEntryMenu';
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Tambah Penjualan';
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showView(); });
    if (dashboard?.parentElement === menuItems) dashboard.insertAdjacentElement('afterend', button);
    else menuItems.appendChild(button);

    const section = document.createElement('section');
    section.id = 'salesEntryView';
    section.className = 'view';
    section.innerHTML = `
      <div class="row" style="margin-top:18px"><div><h1 style="margin:0">Tambah Penjualan</h1><p class="muted">Harga, HPP, dan komisi mengikuti produk yang dipilih.</p></div></div>
      <section class="glass panel">
        <div class="head"><h2 style="margin:0">Input Transaksi</h2></div>
        <div class="body">
          <form id="salesEntryForm" class="form" novalidate>
            <select id="saleCustomer" class="field" required><option value="">Pilih customer</option></select>
            <select id="saleProduct" class="field" required><option value="">Pilih produk</option></select>
            <select id="saleCard" class="field" required disabled><option value="">Pilih customer & produk terlebih dahulu</option></select>
            <input id="saleQuantity" class="field" type="number" min="1" step="1" value="1" required placeholder="Qty">
            <select id="salePaymentStatus" class="field" required><option value="unpaid">Belum Dibayar</option><option value="paid">Lunas</option></select>
            <input id="saleDate" class="field" type="datetime-local">
            <div id="salePreview" class="full"><div class="notice info">Pilih produk untuk menghitung harga, HPP, dan komisi otomatis.</div></div>
            <button id="saleSubmit" class="btn full" type="submit">Simpan Penjualan</button>
          </form>
          <div id="saleMsg" aria-live="polite"></div>
        </div>
      </section>`;
    app.appendChild(section);

    $('saleCustomer')?.addEventListener('change', () => { renderCardOptions(); updatePreview(); });
    $('saleProduct')?.addEventListener('change', () => { renderCardOptions(); updatePreview(); });
    $('saleQuantity')?.addEventListener('input', updatePreview);
    $('salesEntryForm')?.addEventListener('submit', submit);
    installed = true;
  }

  async function refresh() {
    installUi();
    if (!installed) return;
    try {
      await loadOptions();
      renderOptions();
      updatePreview();
      const date = $('saleDate');
      if (date && !date.value) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        date.value = now.toISOString().slice(0, 16);
      }
    } catch (error) {
      if ($('saleMsg')) $('saleMsg').innerHTML = `<div class="notice err">❌ ${esc(error?.message || error)}</div>`;
    }
  }

  function syncCardSelection() {
    const card = selectedCard();
    const customerId = $('saleCustomer')?.value || '';
    const productId = $('saleProduct')?.value || '';
    if (!card) return;
    if (customerId && String(card.customer_id) !== String(customerId)) $('saleCard').value = '';
    if (productId && card.product_id && String(card.product_id) !== String(productId)) $('saleCard').value = '';
  }

  async function submit(event) {
    event.preventDefault();
    const sb = client();
    const product = selectedProduct();
    const customerId = $('saleCustomer')?.value || '';
    const cardId = $('saleCard')?.value || '';
    const card = selectedCard();
    const quantity = Math.max(1, Math.floor(Number($('saleQuantity')?.value || 1)));
    const paymentStatus = $('salePaymentStatus')?.value || 'unpaid';
    const transactionDate = $('saleDate')?.value ? new Date($('saleDate').value).toISOString() : new Date().toISOString();

    if (!sb || !product || !customerId || !cardId || !card) {
      $('saleMsg').innerHTML = '<div class="notice err">Customer, produk, dan kartu yang sesuai wajib dipilih.</div>';
      return;
    }
    if (card.customer_id && String(card.customer_id) !== String(customerId)) {
      $('saleMsg').innerHTML = '<div class="notice err">Kartu tidak terhubung ke customer yang dipilih.</div>';
      return;
    }
    if (card.product_id && String(card.product_id) !== String(product.id)) {
      $('saleMsg').innerHTML = '<div class="notice err">Kartu tidak terhubung ke produk yang dipilih.</div>';
      return;
    }

    const button = $('saleSubmit');
    button.disabled = true;
    button.textContent = 'Menyimpan…';
    $('saleMsg').innerHTML = '';

    try {
      const { error } = await sb.from('Transactions').insert({
        customer_id: customerId,
        card_id: cardId,
        product_id: product.id,
        quantity,
        selling_price: Number(product.selling_price || 0),
        hpp: Number(product.hpp || 0),
        commission: Number(product.commission || 0) * quantity,
        payment_status: paymentStatus,
        transaction_date: transactionDate
      });
      if (error) throw error;

      $('saleMsg').innerHTML = '<div class="notice ok">✅ Penjualan berhasil disimpan.</div>';
      $('salesEntryForm').reset();
      $('saleQuantity').value = '1';
      $('salePaymentStatus').value = 'unpaid';
      $('saleDate').value = '';
      renderOptions();
      updatePreview();
      window.salesDashboard?.load?.();
      document.dispatchEvent(new CustomEvent('aljava:data-loaded'));
    } catch (error) {
      $('saleMsg').innerHTML = `<div class="notice err">❌ Gagal menyimpan penjualan: ${esc(error?.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'Simpan Penjualan';
    }
  }

  window.salesEntry = { show: showView, refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUi, { once: true }); else installUi();
})();
