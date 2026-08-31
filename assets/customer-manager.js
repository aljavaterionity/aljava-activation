/* ALJAVA TERIONITY — Customer manager */
(() => {
  'use strict';
  const CONFIG = window.ALJAVA_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  let editingId = null;
  function msg(type,text){const el=$('customerMsg');if(el){el.className=`notice ${type}`;el.textContent=text;}}
  function clearForm(){editingId=null;$('customerForm')?.reset();$('customerSubmit').textContent='Tambah Customer';$('customerCancel').hidden=true;}
  async function loadCustomers(){
    const {data,error}=await sb.from('Customers').select('id,business_name,owner_name,whatsapp,email,google_review_url,address,product_type,created_at,total_reviews').order('created_at',{ascending:false});
    if(error){msg('err',`❌ Gagal memuat customer: ${error.message}`);return;}
    const cards=window.__ALJAVA_CARDS||[]; const search=($('customerSearch')?.value||'').toLowerCase().trim(); const rows=(data||[]).filter(c=>`${c.business_name} ${c.owner_name} ${c.whatsapp} ${c.email||''}`.toLowerCase().includes(search));
    $('customerRows').innerHTML=rows.map(c=>{const count=cards.filter(x=>String(x.customer_id)===String(c.id)).length;return `<tr><td><strong>${esc(c.business_name)}</strong><div class="muted">${esc(c.owner_name)}</div></td><td>${esc(c.whatsapp)}</td><td>${esc(c.product_type)}</td><td>${count}</td><td>${Number(c.total_reviews||0)}</td><td><button class="btn customer-edit" data-id="${esc(c.id)}" type="button">Edit</button></td></tr>`}).join('')||'<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>';
    document.querySelectorAll('.customer-edit').forEach(b=>b.addEventListener('click',()=>editCustomer(b.dataset.id)));
  }
  async function editCustomer(id){const {data,error}=await sb.from('Customers').select('*').eq('id',id).single();if(error)return msg('err',`❌ ${error.message}`);editingId=id;$('customerBusiness').value=data.business_name||'';$('customerOwner').value=data.owner_name||'';$('customerWhatsapp').value=data.whatsapp||'';$('customerEmail').value=data.email||'';$('customerReview').value=data.google_review_url||'';$('customerAddress').value=data.address||'';$('customerProductType').value=data.product_type||'';$('customerSubmit').textContent='Simpan Perubahan';$('customerCancel').hidden=false;$('customerBusiness').focus();}
  async function saveCustomer(){
    const payload={business_name:$('customerBusiness').value.trim(),owner_name:$('customerOwner').value.trim(),whatsapp:$('customerWhatsapp').value.trim(),email:$('customerEmail').value.trim()||null,google_review_url:$('customerReview').value.trim(),address:$('customerAddress').value.trim()||null,product_type:$('customerProductType').value.trim()};
    if(!payload.business_name||!payload.owner_name||!payload.whatsapp||!payload.google_review_url||!payload.product_type)return msg('err','❌ Nama usaha, pemilik, WhatsApp, Google Review URL, dan jenis produk wajib diisi.');
    try{new URL(payload.google_review_url)}catch{return msg('err','❌ Google Review URL tidak valid.');}
    $('customerSubmit').disabled=true;msg('info',editingId?'Menyimpan perubahan...':'Membuat customer...');
    const result=editingId?await sb.from('Customers').update(payload).eq('id',editingId).select().single():await sb.from('Customers').insert(payload).select().single();
    $('customerSubmit').disabled=false;if(result.error){msg('err',`❌ ${result.error.message}`);return;}msg('ok',editingId?'✓ Customer diperbarui.':'✓ Customer berhasil dibuat.');clearForm();await loadCustomers();document.dispatchEvent(new CustomEvent('aljava:customers-changed'));
  }
  function init(){const form=$('customerForm');if(!form||form.dataset.bound)return;form.dataset.bound='1';form.addEventListener('submit',e=>{e.preventDefault();saveCustomer()});$('customerCancel').addEventListener('click',clearForm);$('customerSearch').addEventListener('input',loadCustomers);document.addEventListener('aljava:data-loaded',()=>{window.__ALJAVA_CARDS=window.__ALJAVA_CARDS||[];loadCustomers()});loadCustomers();}
  window.customerManager={loadCustomers,saveCustomer};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
