/* ALJAVA TERIONITY — Card manager module */
(() => {
  'use strict';
  const CONFIG = Object.freeze({ ...(window.ALJAVA_CONFIG || {}), activationBaseUrl: window.ALJAVA_CONFIG?.activationBaseUrl || 'https://aljava-activation.vercel.app/' });
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = (v) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  const client = window.__ALJAVA_SUPABASE_CLIENT || window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  const businessContext = window.ALJAVA_BUSINESS_CONTEXT;
  const sequenceCodes = (base, quantity) => { const clean=String(base||'').trim(), count=Math.max(1,Math.min(500,Number(quantity)||1)), m=clean.match(/^(.*?)(\d+)$/); if(!m)return Array.from({length:count},(_,i)=>`${clean}-${String(i+1).padStart(3,'0')}`); const prefix=m[1],width=m[2].length,start=Number(m[2]); return Array.from({length:count},(_,i)=>prefix+String(start+i).padStart(width,'0')); };
  const activationUrl = (code) => { const u=new URL(CONFIG.activationBaseUrl); u.searchParams.set('code',code); return u.href; };
  const qrUrl = (url) => `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300`;
  const message = (el,type,text) => { if(el){el.className=`notice ${type}`;el.textContent=text;} };
  let products=[];
  let cardLoading=false;

  async function getBusinessUnitId(){
    if(!businessContext)throw new Error('Konteks unit bisnis belum tersedia.');
    if(!businessContext.active?.id)await businessContext.load();
    if(!businessContext.active?.id)throw new Error('Unit bisnis aktif belum tersedia.');
    return businessContext.active.id;
  }

  async function loadProducts(){
    const s=$('singleProduct'); if(!s)return[];
    const businessUnitId=await getBusinessUnitId();
    const {data,error}=await client.from('Product').select('id,name,category,product_code,selling_price').eq('business_unit_id',businessUnitId).order('name',{ascending:true});
    if(error)throw error;
    products=data||[];
    s.innerHTML='<option value="">Pilih Produk</option>'+(products).map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.product_code||p.id)}${p.product_code?` — ${esc(p.product_code)}`:''}</option>`).join('');
    return products;
  }

  async function loadCards(){
    if(cardLoading)return;
    cardLoading=true;
    const table=$('cardsTable'), summary=$('cardsSummary');
    try{
      const businessUnitId=await getBusinessUnitId();
      if(summary)message(summary,'info','Memuat data kartu...');
      if(table)table.innerHTML='<tr><td colspan="8" class="muted">Memuat data kartu...</td></tr>';
      const {data,error}=await client.from('Cards').select('id,card_code,status,customer_id,product_id,product_type,google_review_url,activated_at,created_at,expires_at,activation_url,qr_code_url,nfc_url').eq('business_unit_id',businessUnitId).order('created_at',{ascending:false});
      if(error)throw error;
      const rows=data||[];
      const productMap=new Map(products.map(p=>[String(p.id),p]));
      const active=rows.filter(c=>String(c.status||'').toLowerCase()==='active'||c.activated_at).length;
      if(summary)message(summary,'ok',`Total ${rows.length} kartu • ${active} aktif • ${rows.length-active} belum aktif/expired`);
      if(!rows.length){if(table)table.innerHTML='<tr><td colspan="8" class="muted">Belum ada kartu untuk bisnis ini.</td></tr>';return;}
      const status=(c)=>{if(c.expires_at&&new Date(c.expires_at)<new Date())return['Expired','status-expired'];if(String(c.status||'').toLowerCase()==='active'||c.activated_at)return['Aktif','status-active'];return['Pending','status-pending'];};
      table.innerHTML=rows.map(c=>{
        const [label,cls]=status(c),p=productMap.get(String(c.product_id));
        const a=c.activation_url||activationUrl(c.card_code); const q=c.qr_code_url||qrUrl(a); const n=c.nfc_url||a;
        return `<tr><td><strong class="code">${esc(c.card_code)}</strong></td><td>${esc(p?.product_code||c.product_type||p?.name||'-')}<div class="hint">${esc(p?.name||'')}</div></td><td><span class="status-badge ${cls}">${label}</span></td><td>${esc(c.customer_id||'Belum ditugaskan')}</td><td>${c.created_at?esc(new Date(c.created_at).toLocaleDateString('id-ID')):'-'}</td><td><a class="btn" target="_blank" rel="noopener" href="${esc(a)}">Link</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(q)}">QR</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(n)}">NFC</a></td></tr>`;
      }).join('');
    }catch(error){
      console.error('CARD MANAGER:',error);
      if(summary)message(summary,'err',`❌ Gagal memuat data kartu: ${error.message||error}`);
      if(table)table.innerHTML='<tr><td colspan="8" class="muted">Data kartu gagal dimuat. Gunakan Refresh setelah memperbaiki error.</td></tr>';
    }finally{cardLoading=false;}
  }

  function preview(){
    const code=$('singleCode')?.value.trim()||'', qty=Math.max(1,Math.min(500,Number($('singleQty')?.value)||1)), p=products.find(x=>String(x.id)===String($('singleProduct')?.value)), el=$('singlePreview');
    if(!el)return;
    if(!code){el.className='notice info full';el.textContent='Masukkan kode awal untuk melihat jumlah dan rentang kode.';return;}
    const codes=sequenceCodes(code,qty);el.className='notice info full';el.innerHTML=`${codes.length} kartu • Produk: <strong>${esc(p?.product_code||p?.name||'-')}</strong> • Kode: <strong>${esc(codes[0])}</strong>${codes.length>1?` → <strong>${esc(codes.at(-1))}</strong>`:''}`;
  }

  function renderResults(rows,p){
    const host=$('cardCreationResults');if(!host)return;if(!rows.length){host.innerHTML='';return;}
    host.innerHTML=`<div class="glass" style="margin-top:14px"><div class="head"><div class="row"><div><h3 style="margin:0">Hasil Kartu</h3><p class="muted">Produk: ${esc(p?.name||'-')} • Kode produk: ${esc(p?.product_code||'-')}</p></div><span class="muted">${rows.length} kartu</span></div></div><div class="body"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Jenis</th><th>Aktivasi</th><th>QR</th><th>NFC</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.card_code)}</strong></td><td>${esc(r.product_type)}</td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.activation_url)}">Buka Link</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.qr_code_url)}">Lihat QR</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.nfc_url)}">Link NFC</a></td></tr>`).join('')}</tbody></table></div></div></div>`;
  }

  async function createCards(){
    const form=$('singleForm'),msg=$('singleMsg');if(!form||!msg)return;
    const code=$('singleCode')?.value.trim(),qty=Math.max(1,Math.min(500,Number($('singleQty')?.value)||1)),productId=$('singleProduct')?.value||null,customerId=$('singleCustomer')?.value.trim()||null,review=$('singleReview')?.value.trim()||null;
    if(!code)return message(msg,'err','❌ Kode awal kartu wajib diisi.');if(!productId){message(msg,'err','❌ Produk wajib dipilih.');$('singleProduct')?.focus();return;}
    if(review){try{new URL(review)}catch{return message(msg,'err','❌ Google Review URL tidak valid.');}}
    const currentProducts=products.length?products:await loadProducts(),p=currentProducts.find(x=>String(x.id)===String(productId));if(!p)return message(msg,'err','❌ Produk tidak ditemukan.');
    let businessUnitId;try{businessUnitId=await getBusinessUnitId();}catch(error){return message(msg,'err',`❌ Unit bisnis aktif tidak tersedia: ${error.message}`);}
    const rows=sequenceCodes(code,qty).map(card_code=>{const a=activationUrl(card_code);return{card_code,product_type:p.product_code||p.name||p.category||'Tanpa Jenis',status:'pending',product_id:productId,customer_id:customerId,google_review_url:review,activation_url:a,qr_code_url:qrUrl(a),nfc_url:a,business_unit_id:businessUnitId};});
    message(msg,'info',`Memproses ${rows.length} kartu...`);
    const {data,error}=await client.from('Cards').insert(rows).select('id,card_code,product_type,activation_url,qr_code_url,nfc_url');
    if(error){if(error.code==='23505')throw new Error('Kode kartu sudah digunakan. Gunakan kode awal lain.');throw error;}
    message(msg,'ok',`✓ ${data?.length||rows.length} kartu berhasil dibuat.`);renderResults(data||rows,p);form.reset();$('singleQty').value='1';preview();await loadCards();document.dispatchEvent(new CustomEvent('aljava:cards-created',{detail:{count:data?.length||rows.length}}));
  }

  function init(){
    const form=$('singleForm');if(!form||form.dataset.cardManagerBound==='1')return;form.dataset.cardManagerBound='1';
    const refresh=async()=>{try{await loadProducts();preview();await loadCards();}catch(e){console.error('CARD MANAGER INIT:',e);message($('singleMsg'),'err',`❌ Gagal memuat data kartu/produk: ${e.message||e}`);const s=$('cardsSummary');if(s)message(s,'err',`❌ Gagal memuat data kartu: ${e.message||e}`);}};
    ['singleCode','singleQty','singleProduct'].forEach(id=>$(id)?.addEventListener('input',preview));$('singleProduct')?.addEventListener('change',preview);
    form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const b=form.querySelector('button[type="submit"]);if(b)b.disabled=true;try{await createCards();}catch(err){message($('singleMsg'),'err',`❌ Gagal membuat kartu: ${err.message||err}`);}finally{if(b)b.disabled=false;}},true);
    $('cardsRefresh')?.addEventListener('click',refresh);
    window.addEventListener('aljava:business-changed',refresh);
    document.addEventListener('aljava:cards-created',()=>loadCards());
    void refresh();
  }
  window.cardManager={loadProducts,loadCards,createCards};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();