/* ALJAVA TERIONITY — Customer manager */
(() => {
  'use strict';
  const CORE = window.ALJAVA_CORE;
  const CONFIG = CORE?.CONFIG || {};
  const $ = CORE?.$ || ((id) => document.getElementById(id));
  const esc = CORE?.esc || ((v) => String(v ?? ''));
  const sb = CORE?.supabase || null;
  if (!sb || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;

  let editingId = null;
  let loading = false;

  function msg(type, text) {
    const el = $('customerMsg');
    if (el) { el.className = `notice ${type}`; el.textContent = text; }
  }
  function clearForm() {
    editingId = null;
    $('customerForm')?.reset();
    if ($('customerSubmit')) $('customerSubmit').textContent = 'Tambah Customer';
    if ($('customerCancel')) $('customerCancel').hidden = true;
  }
  async function loadCustomers() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await sb.from('Customers').select('id,business_name,owner_name,whatsapp,email,google_review_url,address,product_type,created_at,total_reviews').order('created_at', { ascending: false });
      if (error) throw error;
      const cards = window.__ALJAVA_CARDS || [];
      const search = ($('customerSearch')?.value || '').toLowerCase().trim();
      const rows = (data || []).filter((customer) => `${customer.business_name} ${customer.owner_name} ${customer.whatsapp} ${customer.email || ''}`.toLowerCase().includes(search));
      $('customerRows').innerHTML = rows.map((customer) => {
        const count = cards.filter((card) => String(card.customer_id) === String(customer.id)).length;
        return `<tr><td><strong>${esc(customer.business_name)}</strong><div class="muted">${esc(customer.owner_name)}</div></td><td>${esc(customer.whatsapp)}</td><td>${esc(customer.product_type)}</td><td>${count}</td><td>${Number(customer.total_reviews || 0)}</td><td><button class="btn customer-edit" data-id="${esc(customer.id)}" type="button">Edit</button></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>';
      $('customerRows')?.querySelectorAll('.customer-edit').forEach((button) => button.addEventListener('click', () => editCustomer(button.dataset.id)));
    } catch (error) {
      if ($('customerRows')) $('customerRows').innerHTML = `<tr><td colspan="6"><div class="notice err">❌ Gagal memuat customer: ${esc(error?.message || error)}</div></td></tr>`;
    } finally { loading = false; }
  }
  async function editCustomer(id) {
    try {
      const { data, error } = await sb.from('Customers').select('*').eq('id', id).single();
      if (error) throw error;
      editingId = id;
      $('customerBusiness').value = data.business_name || '';
      $('customerOwner').value = data.owner_name || '';
      $('customerWhatsapp').value = data.whatsapp || '';
      $('customerEmail').value = data.email || '';
      $('customerReview').value = data.google_review_url || '';
      $('customerAddress').value = data.address || '';
      $('customerProductType').value = data.product_type || '';
      $('customerSubmit').textContent = 'Simpan Perubahan';
      $('customerCancel').hidden = false;
      $('customerBusiness').focus();
    } catch (error) { msg('err', `❌ ${error?.message || error}`); }
  }
  async function saveCustomer() {
    const submit = $('customerSubmit');
    const payload = {
      business_name: $('customerBusiness').value.trim(),
      owner_name: $('customerOwner').value.trim(),
      whatsapp: $('customerWhatsapp').value.trim(),
      email: $('customerEmail').value.trim() || null,
      google_review_url: $('customerReview').value.trim(),
      address: $('customerAddress').value.trim() || null,
      product_type: $('customerProductType').value.trim()
    };
    if (!payload.business_name || !payload.owner_name || !payload.whatsapp || !payload.google_review_url || !payload.product_type) {
      msg('err', '❌ Nama usaha, pemilik, WhatsApp, Google Review URL, dan jenis produk wajib diisi.');
      return false;
    }
    try { new URL(payload.google_review_url); } catch { msg('err', '❌ Google Review URL tidak valid.'); return false; }
    if (submit) submit.disabled = true;
    msg('info', editingId ? 'Menyimpan perubahan...' : 'Membuat customer...');
    try {
      const result = editingId
        ? await sb.from('Customers').update(payload).eq('id', editingId).select().single()
        : await sb.from('Customers').insert(payload).select().single();
      if (result.error) throw result.error;
      const wasEditing = Boolean(editingId);
      clearForm();
      msg('ok', wasEditing ? '✓ Customer diperbarui.' : '✓ Customer berhasil dibuat.');
      await loadCustomers();
      document.dispatchEvent(new CustomEvent('aljava:customers-changed'));
      document.dispatchEvent(new CustomEvent('aljava:data-refresh-requested'));
      return true;
    } catch (error) {
      msg('err', `❌ Gagal menyimpan customer: ${error?.message || error}`);
      return false;
    } finally { if (submit) submit.disabled = false; }
  }
  function bind() {
    const form = $('customerForm');
    if (!form || form.dataset.customerManagerBound === '1') return;
    form.dataset.customerManagerBound = '1';
    form.addEventListener('submit', (event) => { event.preventDefault(); void saveCustomer(); });
    $('customerCancel')?.addEventListener('click', clearForm);
    $('customerSearch')?.addEventListener('input', () => void loadCustomers());
    document.addEventListener('aljava:data-loaded', () => void loadCustomers());
    document.addEventListener('aljava:data-refresh-requested', () => void loadCustomers());
    void loadCustomers();
  }
  window.customerManager = Object.freeze({ loadCustomers, saveCustomer });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();
