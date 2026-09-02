/* ALJAVA TERIONITY — Card assignment */
(() => {
  'use strict';
  const C = window.ALJAVA_CONFIG || {};
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  if (!window.supabase?.createClient || !C.supabaseUrl || !C.supabaseKey) return;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
  let cards = [], customers = [], businessUnitId = null;
  const msg = (type, text) => { const el = $('assignMsg'); if (el) { el.className = `notice ${type}`; el.textContent = text; } };

  async function ensureBusinessContext() {
    const ctx = window.ALJAVA_BUSINESS_CONTEXT;
    if (!ctx?.load) throw new Error('Business context belum tersedia.');
    if (!ctx.active?.id) await ctx.load();
    businessUnitId = ctx.active?.id || ctx.getSelectedUnitId?.() || null;
    if (!businessUnitId) throw new Error('Tidak ada Unit Bisnis aktif untuk assignment kartu.');
    return businessUnitId;
  }

  async function loadData() {
    const unitId = await ensureBusinessContext();
    const [{data: cs, error: ce}, {data: us, error: ue}] = await Promise.all([
      sb.from('Cards').select('id,card_code,status,customer_id,product_type,google_review_url,activated_at,expires_at').eq('business_unit_id', unitId).order('created_at',{ascending:false}),
      sb.from('Customers').select('id,business_name,owner_name,whatsapp,google_review_url').order('business_name',{ascending:true})
    ]);
    if (ce) throw ce; if (ue) throw ue;
    cards = cs || []; customers = us || [];
    render();
  }

  function render() {
    const card = $('assignCard'), customer = $('assignCustomer'); if (!card || !customer) return;
    const unassigned = cards.filter(c => !c.customer_id);
    card.innerHTML = '<option value="">Pilih kartu yang belum di-assign</option>' + unassigned.map(c => `<option value="${esc(c.id)}">${esc(c.card_code)} — ${esc(c.product_type || '-')} — ${esc(c.status || '-')}</option>`).join('');
    customer.innerHTML = '<option value="">Pilih customer</option>' + customers.map(c => `<option value="${esc(c.id)}">${esc(c.business_name || c.owner_name || c.id)}${c.whatsapp ? ` — ${esc(c.whatsapp)}` : ''}</option>`).join('');
    const count = $('assignCount'); if (count) count.textContent = `${unassigned.length} kartu tersedia • ${customers.length} customer`;
  }

  async function assign() {
    const cardId = $('assignCard')?.value, customerId = $('assignCustomer')?.value;
    if (!cardId || !customerId) return msg('err','❌ Pilih kartu dan customer terlebih dahulu.');
    const unitId = await ensureBusinessContext();
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer) return msg('err','❌ Customer tidak ditemukan. Muat ulang data.');
    msg('info','Menghubungkan kartu ke customer...');
    const {data,error} = await sb.from('Cards').update({customer_id:customerId, google_review_url:customer.google_review_url || null}).eq('id',cardId).eq('business_unit_id',unitId).is('customer_id',null).select('id,card_code,customer_id');
    if (error) return msg('err',`❌ Gagal assign kartu: ${error.message}`);
    if (!data?.length) return msg('err','❌ Kartu sudah di-assign, bukan milik Unit Bisnis aktif, atau tidak ditemukan.');
    msg('ok',`✓ Kartu ${data[0].card_code} berhasil di-assign.`);
    $('assignCard').value=''; $('assignCustomer').value='';
    await loadData();
    document.dispatchEvent(new CustomEvent('aljava:data-refresh-requested'));
  }

  function inject() {
    const cardsView = $('cardsView'), form = $('singleForm');
    if (!cardsView || !form || $('cardAssignmentPanel')) return;
    const section = document.createElement('section'); section.id='cardAssignmentPanel'; section.className='glass panel'; section.style.marginTop='16px';
    section.innerHTML = `<div class="head"><h2 style="margin:0">Assign Kartu ke Customer</h2><p class="muted" style="margin:5px 0 0">Hubungkan kartu yang belum memiliki customer tanpa menyentuh database manual.</p></div><div class="body"><div class="form"><select id="assignCard" class="field full"><option value="">Memuat kartu...</option></select><select id="assignCustomer" class="field full"><option value="">Memuat customer...</option></select><div id="assignCount" class="notice info full">Memuat...</div><button id="assignBtn" class="btn full" type="button">Assign Kartu</button></div><div id="assignMsg" aria-live="polite"></div></div>`;
    form.closest('.panel')?.after(section);
    $('assignBtn').addEventListener('click', async () => { const b=$('assignBtn'); b.disabled=true; try { await assign(); } catch(e) { msg('err',`❌ ${e.message}`); } finally { b.disabled=false; } });
    loadData().catch(e => msg('err',`❌ Gagal memuat assignment: ${e.message}`));
  }

  function init(){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject,{once:true}); else inject();
    document.addEventListener('aljava:cards-created',()=>loadData().catch(()=>{}));
    document.addEventListener('aljava:customers-changed',()=>loadData().catch(()=>{}));
    document.addEventListener('aljava:business-changed',()=>loadData().catch(e=>msg('err',`❌ ${e.message}`)));
  }
  window.cardAssignment={loadData,assign}; init();
})();
