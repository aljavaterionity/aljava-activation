/* ALJAVA TERIONITY — Product manager */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;' }[char]));
  const money = (value) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value) || 0);
  const CONFIG = window.ALJAVA_CONFIG;
  const businessContext = window.ALJAVA_BUSINESS_CONTEXT;
  const sb = CONFIG && window.supabase?.createClient ? (window.__ALJAVA_SUPABASE_CLIENT || window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)) : null;
  if (!sb) return;

  let products = [];
  let editingId = null;
  let reloadAfterBusinessChange = false;
  let loading = false;

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
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
    field.id = 'productCommission'; field.className = 'field'; field.type = 'number'; field.min = '0'; field.step = '1'; field.placeholder = 'Komisi per unit';
    if (subscription) subscription.insertAdjacentElement('afterend', field); else form.appendChild(field);
  }

  function fillForm(product) {
    ensureCommissionField();
    $('productName').value = product?.name || '';
    $('productCode').value = product?.product_code || '';
    $('productCategory').value = product?.category || '';
    $('productHpp').value = product?.hpp ?? '';
    $('productSelling').value = product?.selling_price ?? '';
    $('productSubscription').value = product?.subscription_price ?? '';
    $('productCommission').value = product?.commission ?? '0';
    editingId = product?.id || null;
    const button = $('productSubmitBtn');
    if (button) button.textContent = editingId ? 'Simpan Perubahan' : 'Tambah Produk';
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    $('productForm')?.reset();
    if ($('productCommission')) $('productCommission').value = '0';
    editingId = null;
    const button = $('productSubmitBtn'); if (button) button.textContent = 'Tambah Produk';
    updatePreview();
  }

  async function loadProducts() {
    if (loading) { reloadAfterBusinessChange = true; return products; }
    const table = $('productRows'); if (!table) return [];
    loading = true;
    table.innerHTML = '<tr><td colspan="8" class="muted">Memuat produk...</td></tr>';
    try {
      const activeId = await businessContext?.getDefaultUnitId?.();
      if (!activeId) throw new Error('Unit bisnis aktif belum tersedia.');
      const { data, error } = await sb.from('Product').select('id,name,product_code,category,hpp,selling_price,subscription_price,commission,created_at').eq('business_unit_id', activeId).order('created_at', { ascending:false });
      if (error) throw error;
      products = data || [];
      if (editingId && !products.some((item) => String(item.id) === String(editingId))) resetForm();
      table.innerHTML = products.length ? products.map((p) => `<tr><td>${esc(p.name)}</td><td><strong>${esc(p.product_code || '-')}</strong></td><td>${esc(p.category || '-')}</td><td>${money(p.hpp)}</td><td>${money(p.selling_price)}</td><td>${money(p.subscription_price)}</td><td>${money(p.commission)}</td><td><button class="btn product-edit" type="button" data-id="${esc(p.id)}">Edit</button> <button class="btn danger product-delete" type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Hapus</button></td></tr>`).join('') : '<tr><td colspan="8" class="muted">Belum ada produk. Tambahkan produk pertama.</td></tr>';
      table.querySelectorAll('.product-edit').forEach((button) => button.addEventListener('click', () => { const product = products.find((item) => String(item.id) === String(button.dataset.id)); if (product) fillForm(product); }));
      table.querySelectorAll('.product-delete').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.id, button.dataset.name)));
      return products;
    } catch (error) {
      table.innerHTML = `<tr><td colspan="8"><div class="notice err">❌ Gagal memuat produk: ${esc(error?.message || error)}</div></td></tr>`;
      return [];
    } finally {
      loading = false;
      if (reloadAfterBusinessChange) { reloadAfterBusinessChange = false; void loadProducts(); }
    }
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Hapus produk "${name}"?\n\nJika produk sudah dipakai kartu/transaksi, database dapat menolak penghapusan.`)) return;
    const { error } = await sb.from('Product').delete().eq('id', id);
    if (error) { showMessage(`❌ Gagal menghapus produk: ${error.message}`, 'err'); return; }
    if (editingId === id) resetForm();
    showMessage('✓ Produk berhasil dihapus.', 'ok');
    await loadProducts();
    document.dispatchEvent(new CustomEvent('aljava:products-changed'));
  }

  async function saveProduct(event, explicitForm = null) {
    if (event) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }
    const form = explicitForm || $('productForm');
    if (!form) { showMessage('Form produk tidak ditemukan.', 'err'); return false; }
    ensureCommissionField();
    const name = $('productName')?.value.trim();
    const code = normalizeCode($('productCode')?.value.trim() || name);
    const category = $('productCategory')?.value.trim() || null;
    const hpp = Number($('productHpp')?.value || 0);
    const selling = Number($('productSelling')?.value || 0);
    const subscriptionRaw = $('productSubscription')?.value;
    const subscription = subscriptionRaw === '' ? null : Number(subscriptionRaw);
    const commission = Number($('productCommission')?.value || 0);
    if (!name) { showMessage('Nama produk wajib diisi.', 'err'); $('productName')?.focus(); return false; }
    if (!code) { showMessage('Kode produk tidak valid.', 'err'); $('productCode')?.focus(); return false; }
    if ([hpp, selling, commission].some((v) => !Number.isFinite(v) || v < 0) || (subscription !== null && (!Number.isFinite(subscription) || subscription < 0))) { showMessage('HPP, harga, subscription, dan komisi tidak boleh negatif atau tidak valid.', 'err'); return false; }
    const submit = $('productSubmitBtn') || form.querySelector('button');
    if (submit) { submit.disabled = true; submit.textContent = editingId ? 'Menyimpan...' : 'Menambah...'; }
    try {
      const payload = { name, product_code: code, category, hpp, selling_price: selling, subscription_price: subscription, commission };
      if (!editingId) {
        try {
          payload.business_unit_id = await businessContext?.getDefaultUnitId?.();
        } catch (error) {
          throw new Error(`Unit bisnis default tidak tersedia: ${error.message}`);
        }
        if (!payload.business_unit_id) throw new Error('Konteks unit bisnis belum tersedia.');
      }
      const result = editingId ? await sb.from('Product').update(payload).eq('id', editingId) : await sb.from('Product').insert(payload);
      if (result.error) throw result.error;
      const message = editingId ? `✓ Produk ${name} berhasil diperbarui.` : `✓ Produk ${name} (${code}) berhasil dibuat.`;
      resetForm(); showMessage(message, 'ok'); await loadProducts(); document.dispatchEvent(new CustomEvent('aljava:products-changed')); document.dispatchEvent(new CustomEvent('aljava:data-loaded'));
      return true;
    } catch (error) {
      const duplicate = String(error?.message || '').toLowerCase().includes('product_product_code_uq') || String(error?.message || '').toLowerCase().includes('duplicate key');
      showMessage(duplicate ? `❌ Kode produk ${code} sudah digunakan.` : `❌ Gagal menyimpan produk: ${error?.message || error}`, 'err');
      return false;
    } finally { if (submit) { submit.disabled = false; submit.textContent = editingId ? 'Simpan Perubahan' : 'Tambah Produk'; } }
  }

  function updatePreview() {
    const source = $('productCode')?.value.trim() || $('productName')?.value || '';
    const code = normalizeCode(source); ensureCommissionField();
    if ($('productPreview')) $('productPreview').textContent = code ? `Kode produk: ${code} • Komisi: ${money(Number($('productCommission')?.value || 0))} / unit` : 'Kode produk dibuat otomatis dari nama produk.';
  }

  function bind() {
    const form = $('productForm'); const submit = $('productSubmitBtn') || form?.querySelector('button');
    if (form && submit && form.dataset.productManagerBound !== '1') {
      form.dataset.productManagerBound = '1'; submit.type = 'button'; submit.onclick = () => { void saveProduct(null, form); };
      form.addEventListener('submit', (event) => { void saveProduct(event, form); }, true);
      ['productCode','productName','productCommission'].forEach((id) => $(id)?.addEventListener('input', updatePreview));
      ensureCommissionField(); updatePreview(); void loadProducts();
    }
  }

  window.__createProduct = () => saveProduct(null, $('productForm'));
  window.productManager = { loadProducts, createProduct: saveProduct, editProduct: (id) => { const product = products.find((item) => String(item.id) === String(id)); if (product) fillForm(product); } };
  document.addEventListener('aljava:business-changed', () => void loadProducts());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
})();