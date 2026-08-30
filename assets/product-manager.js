/* ALJAVA TERIONITY — Product manager */
(() => {
  'use strict';

  const CONFIG = {
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw'
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value) || 0);

  const sb = window.supabase?.createClient?.(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  if (!sb) return;

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function showMessage(text, type = 'info') {
    const el = $('productMsg');
    if (!el) return;
    el.className = `notice ${type}`;
    el.textContent = text;
  }

  async function loadProducts() {
    const table = $('productRows');
    if (!table) return [];
    table.innerHTML = '<tr><td colspan="7" class="muted">Memuat produk...</td></tr>';
    try {
      const { data, error } = await sb.from('Product')
        .select('id,name,product_code,category,hpp,selling_price,subscription_price,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      table.innerHTML = data?.length ? data.map((p) => `<tr>
        <td>${esc(p.name)}</td><td><strong>${esc(p.product_code || '-')}</strong></td><td>${esc(p.category || '-')}</td>
        <td>${money(p.hpp)}</td><td>${money(p.selling_price)}</td><td>${money(p.subscription_price)}</td>
        <td><button class="btn danger product-delete" type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Hapus</button></td>
      </tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada produk. Tambahkan produk pertama.</td></tr>';

      table.querySelectorAll('.product-delete').forEach((button) => {
        button.addEventListener('click', () => deleteProduct(button.dataset.id, button.dataset.name));
      });
      return data || [];
    } catch (error) {
      table.innerHTML = `<tr><td colspan="7"><div class="notice err">❌ Gagal memuat produk: ${esc(error?.message || error)}</div></td></tr>`;
      return [];
    }
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Hapus produk "${name}"?\n\nProduk yang masih dipakai kartu/transaksi mungkin ditolak database.`)) return;
    const { error } = await sb.from('Product').delete().eq('id', id);
    if (error) {
      showMessage(`❌ Gagal menghapus produk: ${error.message}`, 'err');
      return;
    }
    showMessage('✓ Produk berhasil dihapus.', 'ok');
    await loadProducts();
    document.dispatchEvent(new CustomEvent('aljava:products-changed'));
  }

  async function createProduct(event, explicitForm = null) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const form = explicitForm || $('productForm');
    if (!form) {
      showMessage('Form produk tidak ditemukan.', 'err');
      return false;
    }

    const name = $('productName')?.value.trim();
    const rawCode = $('productCode')?.value.trim();
    const code = normalizeCode(rawCode || name);
    const category = $('productCategory')?.value.trim() || null;
    const hpp = Number($('productHpp')?.value || 0);
    const selling = Number($('productSelling')?.value || 0);
    const subscription = Number($('productSubscription')?.value || 0);

    if (!name) {
      showMessage('Nama produk wajib diisi.', 'err');
      $('productName')?.focus();
      return false;
    }
    if (!code) {
      showMessage('Kode produk tidak valid.', 'err');
      $('productCode')?.focus();
      return false;
    }

    const submit = $('productSubmitBtn') || form.querySelector('button');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Menyimpan...';
    }

    try {
      const { error } = await sb.from('Product').insert({
        name,
        product_code: code,
        category,
        hpp,
        selling_price: selling,
        subscription_price: subscription
      });
      if (error) throw error;

      form.reset();
      updatePreview();
      showMessage(`✓ Produk ${name} (${code}) berhasil dibuat.`, 'ok');
      await loadProducts();
      document.dispatchEvent(new CustomEvent('aljava:products-changed'));
      if (typeof window.adminApi?.load === 'function') await window.adminApi.load().catch(() => {});
      return true;
    } catch (error) {
      showMessage(`❌ Gagal membuat produk: ${error.message || error}`, 'err');
      return false;
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Tambah Produk';
      }
    }
  }

  function updatePreview() {
    const explicit = $('productCode')?.value || '';
    const source = explicit.trim() || $('productName')?.value || '';
    const code = normalizeCode(source);
    if ($('productPreview')) $('productPreview').textContent = code ? `Kode produk: ${code}` : 'Kode produk dibuat otomatis dari nama produk.';
  }

  function ensureActionButtons() {
    const productView = $('productView');
    const cardsView = $('cardsView');

    // Restore the old HPP entry in Main Menu without removing Kelola Produk.
    const menuItems = document.querySelector('.menu-items');
    const productMenu = $('productMenu');
    if (menuItems && productMenu && !$('hppMenu')) {
      const hppButton = document.createElement('button');
      hppButton.id = 'hppMenu';
      hppButton.type = 'button';
      hppButton.className = 'btn';
      hppButton.textContent = '💰 HPP';
      hppButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'productView'));
        $('menuPanel')?.classList.remove('open');
        $('menuButton')?.setAttribute('aria-expanded', 'false');
        history.replaceState?.(null, '', '#product');
        setTimeout(() => $('productName')?.focus(), 50);
        void loadProducts();
      });
      productMenu.insertAdjacentElement('afterend', hppButton);
    }

    // Make a second unmistakable Add Product action at the top of Kelola Produk.
    if (productView && !productView.querySelector('[data-product-action="top"]')) {
      const headingRow = productView.querySelector('.row');
      if (headingRow) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'btn product-submit';
        action.dataset.productAction = 'top';
        action.textContent = '＋ Tambah Produk';
        action.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          $('productName')?.focus();
        });
        headingRow.appendChild(action);
      }
    }

    // Also expose the action directly from Kelola Kartu.
    if (cardsView && !cardsView.querySelector('[data-product-action="cards"]')) {
      const form = $('singleForm');
      const productSelect = $('singleProduct');
      if (form && productSelect) {
        const holder = document.createElement('div');
        holder.className = 'product-inline-action';
        holder.style.gridColumn = '1 / -1';
        holder.style.display = 'flex';
        holder.style.gap = '8px';
        holder.style.alignItems = 'center';
        holder.style.flexWrap = 'wrap';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.dataset.productAction = 'cards';
        button.textContent = '＋ Tambah Produk';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view.id === 'productView'));
          $('menuPanel')?.classList.remove('open');
          $('menuButton')?.setAttribute('aria-expanded', 'false');
          history.replaceState?.(null, '', '#product');
          setTimeout(() => $('productName')?.focus(), 50);
          void loadProducts();
        });

        holder.appendChild(button);
        productSelect.insertAdjacentElement('afterend', holder);
      }
    }
  }

  function bind() {
    const form = $('productForm');
    const submit = $('productSubmitBtn') || form?.querySelector('button');
    if (form && submit && form.dataset.productManagerBound !== '1') {
      form.dataset.productManagerBound = '1';
      submit.type = 'button';
      submit.onclick = () => { void createProduct(null, form); };
      submit.addEventListener('click', (event) => { void createProduct(event, form); }, true);
      form.addEventListener('submit', (event) => { void createProduct(event, form); }, true);
      $('productCode')?.addEventListener('input', updatePreview);
      $('productName')?.addEventListener('input', updatePreview);
      updatePreview();
      void loadProducts();
    }
    ensureActionButtons();
  }

  window.__createProduct = () => createProduct(null, $('productForm'));
  window.productManager = { loadProducts, createProduct };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  const observer = new MutationObserver(() => bind());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
