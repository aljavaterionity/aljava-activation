/* ALJAVA TERIONITY — Product manager */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((value) => String(value ?? ''));
  const money = CORE?.money || ((value) => Number(value) || 0);
  const sb = CORE?.supabase || null;
  if (!sb) return;
  let products = [];
  let editingId = null;

  function normalizeCode(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function showMessage(text, type = 'info') { const el = $('productMsg'); if (el) { el.className = `notice ${type}`; el.textContent = text; } }
  function ensureCommissionField() {
    const form = $('productForm'); if (!form || $('productCommission')) return;
    const subscription = $('productSubscription'); const field = document.createElement('input');
    field.id = 'productCommission'; field.className = 'field'; field.type = 'number'; field.min = '0'; field.step = '1'; field.placeholder = 'Komisi per unit';
    if (subscription) subscription.insertAdjacentElement('afterend', field); else form.appendChild(field);
  }
  function fillForm(product) {
    ensureCommissionField(); $('productName').value = product?.name || ''; $('productCode').value = product?.product_code || ''; $('productCategory').value = product?.category || ''; $('productHpp').value = product?.hpp ?? ''; $('productSelling').value = product?.selling_price ?? ''; $('productSubscription').value = product?.subscription_price ?? ''; $('productCommission').value = product?.commission ?? '0';
    editingId = product?.id || null; const button = $('productSubmitBtn'); if (button) button.textContent = editingId ? 'Simpan Perubahan' : 'Tambah Produk'; updatePreview(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function resetForm() { $('productForm')?.reset(); if ($('productCommission')) $('productCommission').value = '0'; editingId = null; const button = $('productSubmitBtn'); if (button) button.textContent = 'Tambah Produk'; updatePreview(); }
  async function loadProducts() {
    const table = $('productRows'); if (!table) return [];
    table.innerHTML = '<tr><td colspan="8" class="muted">Memuat produk...</td></tr>';
    try {
      const { data, error } = await sb.from('Product').select('id,name,product_code,category,hpp,selling_price,subscription_price,commission,created_at').order('created_at', { ascending: false });
      if (error) throw error; products = data || [];
      table.innerHTML = products.length ? products.map((product) => `<tr><td>${esc(product.name)}</td><td><strong>${esc(product.product_code || '-')}</strong></td><td>${esc(product.category || '-')}</td><td>${money(product.hpp)}</td><td>${money(product.selling_price)}</td><td>${money(product.subscription_price)}</td><td>${money(product.commission)}</td><td><button class="btn product-edit" type="button" data-id="${esc(product.id)}">Edit</button> <button class="btn danger product-delete" type="button" data-id="${esc(product.id)}" data-name="${esc(product.name)}">Hapus</button></td></tr>`).join('') : '<tr><td colspan="8" class="muted">Belum ada produk. Tambahkan produk pertama.</td></tr>';
      table.querySelectorAll('.product-edit').forEach((button) => button.addEventListener('click', () => { const product = products.find((item) => String(item.id) === String(button.dataset.id)); if (product) fillForm(product); }));
      table.querySelectorAll('.product-delete').forEach((button) => button.addEventListener('click', () => void deleteProduct(button.dataset.id, button.dataset.name)));
      return products;
    } catch (error) { table.innerHTML = `<tr><td colspan="8"><div class="notice err">❌ Gagal memuat produk: ${esc(error?.message || error)}</div></td></tr>`; return []; }
  }
  async function deleteProduct(id, name) {
    if (!window.confirm(`Hapus produk "${name}"?\n\nJika produk sudah dipakai kartu/transaksi, database dapat menolak penghapusan.`)) return;
    const { error } = await sb.from('Product').delete().eq('id', id);
    if (error) { showMessage(`❌ Gagal menghapus produk: ${error.message}`, 'err'); return; }
    if (editingId === id) resetForm(); showMessage('✓ Produk berhasil dihapus.', 'ok'); await loadProducts(); document.dispatchEvent(new CustomEvent('aljava:products-changed'));
  }
  async function saveProduct(event) {
    event?.preventDefault(); event?.stopPropagation();
    const form = $('productForm'); if (!form) { showMessage('Form produk tidak ditemukan.', 'err'); return false; }
    ensureCommissionField();
    const name = $('productName')?.value.trim(); const code = normalizeCode($('productCode')?.value.trim() || name); const category = $('productCategory')?.value.trim() || null;
    const hpp = Number($('productHpp')?.value || 0); const selling = Number($('productSelling')?.value || 0); const subscriptionRaw = $('productSubscription')?.value; const subscription = subscriptionRaw === '' ? null : Number(subscriptionRaw); const commission = Number($('productCommission')?.value || 0);
    if (!name) { showMessage('Nama produk wajib diisi.', 'err'); $('productName')?.focus(); return false; }
    if (!code) { showMessage('Kode produk tidak valid.', 'err'); $('productCode')?.focus(); return false; }
    if ([hpp, selling, commission].some((value) => !Number.isFinite(value) || value < 0) || (subscription !== null && (!Number.isFinite(subscription) || subscription < 0))) { showMessage('HPP, harga, subscription, dan komisi tidak boleh negatif atau tidak valid.', 'err'); return false; }
    const submit = $('productSubmitBtn') || form.querySelector('button'); const editing = editingId;
    if (submit) { submit.disabled = true; submit.textContent = editing ? 'Menyimpan...' : 'Menambah...'; }
    try {
      const payload = { name, product_code: code, category, hpp, selling_price: selling, subscription_price: subscription, commission };
      const result = editing ? await sb.from('Product').update(payload).eq('id', editing) : await sb.from('Product').insert(payload);
      if (result.error) throw result.error;
      resetForm(); showMessage(editing ? `✓ Produk ${name} berhasil diperbarui.` : `✓ Produk ${name} (${code}) berhasil dibuat.`, 'ok'); await loadProducts(); document.dispatchEvent(new CustomEvent('aljava:products-changed')); document.dispatchEvent(new CustomEvent('aljava:data-loaded')); return true;
    } catch (error) {
      const duplicate = String(error?.message || '').toLowerCase().includes('product_product_code_uq') || String(error?.message || '').toLowerCase().includes('duplicate key');
      showMessage(duplicate ? `❌ Kode produk ${code} sudah digunakan.` : `❌ Gagal menyimpan produk: ${error?.message || error}`, 'err'); return false;
    } finally { if (submit) { submit.disabled = false; submit.textContent = editing ? 'Simpan Perubahan' : 'Tambah Produk'; } }
  }
  function updatePreview() { const source = $('productCode')?.value.trim() || $('productName')?.value || ''; const code = normalizeCode(source); ensureCommissionField(); if ($('productPreview')) $('productPreview').textContent = code ? `Kode produk: ${code} • Komisi: ${money(Number($('productCommission')?.value || 0))} / unit` : 'Kode produk dibuat otomatis dari nama produk.'; }
  function bind() {
    const form = $('productForm'); if (!form || form.dataset.productManagerBound === '1') return;
    form.dataset.productManagerBound = '1'; ensureCommissionField(); form.addEventListener('submit', (event) => { void saveProduct(event); });
    ['productCode', 'productName', 'productCommission'].forEach((id) => $(id)?.addEventListener('input', updatePreview)); updatePreview(); void loadProducts();
  }
  window.productManager = Object.freeze({ loadProducts, createProduct: saveProduct, editProduct: (id) => { const product = products.find((item) => String(item.id) === String(id)); if (product) fillForm(product); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();
