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

  function ensureCommissionField() {
    const form = $('productForm');
    if (!form || $('productCommission')) return;
    const subscription = $('productSubscription');
    const field = document.createElement('input');
    field.id = 'productCommission';
    field.className = 'field';
    field.type = 'number';
    field.min = '0';
    field.step = '1';
    field.placeholder = 'Komisi per unit';
    if (subscription) subscription.insertAdjacentElement('afterend', field);
    else form.appendChild(field);
  }

  async function loadProducts() {
    const table = $('productRows');
    if (!table) return [];
    table.innerHTML = '<tr><td colspan="8" class="muted">Memuat produk...</td></tr>';
    try {
      const { data, error } = await sb.from('Product')
        .select('id,name,product_code,category,hpp,selling_price,subscription_price,commission,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      table.innerHTML = data?.length ? data.map((p) => `<tr>
        <td>${esc(p.name)}</td><td><strong>${esc(p.product_code || '-')}</strong></td><td>${esc(p.category || '-')}</td>
        <td>${money(p.hpp)}</td><td>${money(p.selling_price)}</td><td>${money(p.subscription_price)}</td><td>${money(p.commission)}</td>
        <td><button class="btn danger product-delete" type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Hapus</button></td>
      </tr>`).join('') : '<tr><td colspan="8" class="muted">Belum ada produk. Tambahkan produk pertama.</td></tr>';

      table.querySelectorAll('.product-delete').forEach((button) => {
        button.addEventListener('click', () => deleteProduct(button.dataset.id, button.dataset.name));
      });
      return data || [];
    } catch (error) {
      table.innerHTML = `<tr><td colspan="8"><div class="notice err">❌ Gagal memuat produk: ${esc(error?.message || error)}</div></td></tr>`;
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

    ensureCommissionField();

    const name = $('productName')?.value.trim();
    const rawCode = $('productCode')?.value.trim();
    const code = normalizeCode(rawCode || name);
    const category = $('productCategory')?.value.trim() || null;
    const hpp = Number($('productHpp')?.value || 0);
    const selling = Number($('productSelling')?.value || 0);
    const subscription = Number($('productSubscription')?.value || 0);
    const commission = Number($('productCommission')?.value || 0);

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
    if (commission < 0) {
      showMessage('Komisi tidak boleh negatif.', 'err');
      $('productCommission')?.focus();
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
        subscription_price: subscription,
        commission
      });
      if (error) throw error;

      form.reset();
      if ($('productCommission')) $('productCommission').value = '0';
      updatePreview();
      showMessage(`✓ Produk ${name} (${code}) berhasil dibuat. Komisi: ${money(commission)} / unit.`, 'ok');
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
    ensureCommissionField();
    if ($('productPreview')) {
      const commission = Number($('productCommission')?.value || 0);
      $('productPreview').textContent = code
        ? `Kode produk: ${code} • Komisi: ${money(commission)} / unit`
        : 'Kode produk dibuat otomatis dari nama produk.';
    }
  }

  function bind() {
    const form = $('productForm');
    const submit = $('productSubmitBtn') || form?.querySelector('button');
    if (form && submit && form.dataset.productManagerBound !== '1') {
      form.dataset.productManagerBound = '1';
      submit.type = 'button';
      submit.onclick = () => { void createProduct(null, form); };
      form.addEventListener('submit', (event) => { void createProduct(event, form); }, true);
      $('productCode')?.addEventListener('input', updatePreview);
      $('productName')?.addEventListener('input', updatePreview);
      ensureCommissionField();
      $('productCommission')?.addEventListener('input', updatePreview);
      updatePreview();
      void loadProducts();
    }
  }

  window.__createProduct = () => createProduct(null, $('productForm'));
  window.productManager = { loadProducts, createProduct };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
