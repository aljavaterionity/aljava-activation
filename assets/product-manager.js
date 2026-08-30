/* ALJAVA TERIONITY — Product manager */
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
  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value) || 0);

  const sb = window.supabase?.createClient?.(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  if (!sb) return;

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function showMessage(text, type = 'info') {
    const el = $('productMsg');
    if (!el) return;
    el.className = `notice ${type}`;
    el.textContent = text;
  }

  async function loadProducts() {
    const table = $('productRows');
    if (!table) return;
    table.innerHTML = '<tr><td colspan="7" class="muted">Memuat produk...</td></tr>';
    const { data, error } = await sb.from('Product').select('id,name,product_code,category,hpp,selling_price,subscription_price,created_at').order('created_at', { ascending: false });
    if (error) {
      table.innerHTML = `<tr><td colspan="7"><div class="notice err">❌ ${esc(error.message)}</div></td></tr>`;
      return;
    }
    table.innerHTML = data?.length ? data.map((p) => `<tr>
      <td>${esc(p.name)}</td><td><strong>${esc(p.product_code || '-')}</strong></td><td>${esc(p.category || '-')}</td>
      <td>${money(p.hpp)}</td><td>${money(p.selling_price)}</td><td>${money(p.subscription_price)}</td>
      <td><button class="btn danger product-delete" type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Hapus</button></td>
    </tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada produk. Tambahkan produk pertama.</td></tr>';

    table.querySelectorAll('.product-delete').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.id, button.dataset.name)));
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Hapus produk "${name}"?\n\nProduk yang masih dipakai kartu/transaksi mungkin ditolak database.`)) return;
    const { error } = await sb.from('Product').delete().eq('id', id);
    if (error) {
      showMessage(`❌ Gagal menghapus produk: ${error.message}`, 'err');
      return;
    }
    showMessage('✓ Produk berhasil dihapus.', 'ok');
    loadProducts();
  }

  async function createProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = $('productName')?.value.trim();
    const rawCode = $('productCode')?.value.trim();
    const code = normalizeCode(rawCode || name);
    const category = $('productCategory')?.value.trim() || null;
    const hpp = Number($('productHpp')?.value || 0);
    const selling = Number($('productSelling')?.value || 0);
    const subscription = Number($('productSubscription')?.value || 0);

    if (!name) return showMessage('Nama produk wajib diisi.', 'err');
    if (!code) return showMessage('Kode produk tidak valid.', 'err');

    const submit = form.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Menyimpan...'; }

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
      $('productPreview').textContent = `Kode produk: ${code}`;
      showMessage(`✓ Produk ${name} (${code}) berhasil dibuat.`, 'ok');
      loadProducts();
      if (typeof window.adminApi?.load === 'function') window.adminApi.load().catch(() => {});
    } catch (error) {
      showMessage(`❌ Gagal membuat produk: ${error.message || error}`, 'err');
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Tambah Produk'; }
    }
  }

  function bind() {
    $('productForm')?.addEventListener('submit', createProduct);
    $('productCode')?.addEventListener('input', () => {
      const code = normalizeCode($('productCode').value || $('productName')?.value);
      if ($('productPreview')) $('productPreview').textContent = code ? `Kode produk: ${code}` : 'Kode produk dibuat otomatis dari nama produk.';
    });
    $('productName')?.addEventListener('input', () => {
      if (!$('productCode').value.trim()) {
        const code = normalizeCode($('productName').value);
        if ($('productPreview')) $('productPreview').textContent = code ? `Kode produk: ${code}` : 'Kode produk dibuat otomatis dari nama produk.';
      }
    });
    loadProducts();
  }

  window.productManager = { loadProducts, createProduct };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
