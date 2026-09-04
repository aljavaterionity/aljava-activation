/* ALJAVA TERIONITY — Card manager module */
(() => {
  'use strict';
  const CONFIG = Object.freeze({ ...(window.ALJAVA_CONFIG || {}), activationBaseUrl: window.ALJAVA_CONFIG?.activationBaseUrl || 'https://aljava-activation.vercel.app/' });
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  const sequenceCodes = (base, quantity) => { const clean=String(base||'').trim(), count=Math.max(1,Math.min(500,Number(quantity)||1)), m=clean.match(/^(.*?)(\d+)$/); if(!m)return Array.from({length:count},(_,i)=>`${clean}-${String(i+1).padStart(3,'0')}`); const prefix=m[1],width=m[2].length,start=Number(m[2]); return Array.from({length:count},(_,i)=>prefix+String(start+i).padStart(width,'0')); };
  const activationUrl = (code) => { const u=new URL(CONFIG.activationBaseUrl); u.searchParams.set('code',code); return u.href; };
  const qrUrl = (url) => `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&format=png`;
  const message = (el,type,text) => { if(el){el.className=`notice ${type}`;el.textContent=text;} };

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) { const a=new Uint8Array(2); new DataView(a.buffer).setUint16(0,value,true); return a; }
  function u32(value) { const a=new Uint8Array(4); new DataView(a.buffer).setUint32(0,value>>>0,true); return a; }
  function concatBytes(parts) { const total=parts.reduce((n,p)=>n+p.length,0), out=new Uint8Array(total); let offset=0; parts.forEach(p=>{out.set(p,offset);offset+=p.length;}); return out; }

  function makeZip(files) {
    const encoder = new TextEncoder();
    const localParts = [], centralParts = [];
    let offset = 0;
    files.forEach(file => {
      const name = encoder.encode(file.name), data = file.data, crc = crc32(data);
      const local = concatBytes([
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name
      ]);
      localParts.push(local, data);
      const central = concatBytes([
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name
      ]);
      centralParts.push(central);
      offset += local.length + data.length;
    });
    const central = concatBytes(centralParts);
    const locals = concatBytes(localParts);
    const end = concatBytes([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(locals.length),u16(0)]);
    return new Blob([locals,central,end],{type:'application/zip'});
  }

  async function fetchQrBytes(url) {
    const response = await fetch(url, { mode:'cors', cache:'no-store' });
    if (!response.ok) throw new Error(`QR gagal diunduh (${response.status})`);
    const source = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(source, 0, 0);
    source.close();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const r=image.data[i], g=image.data[i+1], b=image.data[i+2];
      if (r >= 245 && g >= 245 && b >= 245) image.data[i+3] = 0;
    }
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Gagal membuat PNG QR transparan.');
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function autoDownloadQrZip(rows, msg) {
    if (!Array.isArray(rows) || !rows.length) return;
    const files = [];
    const failed = [];
    for (let start = 0; start < rows.length; start += 10) {
      const batch = rows.slice(start, start + 10);
      const results = await Promise.all(batch.map(async row => {
        const code = String(row.card_code || '').trim();
        const url = String(row.qr_code_url || '').trim();
        if (!code || !url) return { code, error:'data QR tidak lengkap' };
        try { return { code, data: await fetchQrBytes(url) }; }
        catch (error) { return { code, error: error.message || 'gagal mengunduh QR' }; }
      }));
      results.forEach(result => result.data ? files.push({name:`${result.code}.png`,data:result.data}) : failed.push(result));
      if (msg) message(msg,'info',`Membuat ZIP QR transparan... ${Math.min(start+batch.length,rows.length)}/${rows.length}`);
    }
    if (!files.length) throw new Error('Tidak ada QR yang berhasil diunduh untuk dibuat ZIP.');
    const zip = makeZip(files);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip);
    a.download = `QR-KARTU-${stamp}.zip`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 30000);
    if (msg) message(msg, failed.length ? 'info' : 'ok', `✓ ${files.length} QR transparan berhasil dikumpulkan ke QR-KARTU-${stamp}.zip${failed.length ? ` • ${failed.length} QR gagal diunduh` : ''}`);
  }

  async function loadProducts(){ const s=$('singleProduct'); if(!s)return[]; const {data,error}=await client.from('Product').select('id,name,category,product_code').order('name',{ascending:true}); if(error)throw error; s.innerHTML='<option value="">Pilih Produk</option>'+(data||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.product_code||p.id)}${p.product_code?` — ${esc(p.product_code)}`:''}</option>`).join(''); return data||[]; }
  function preview(products){ const code=$('singleCode')?.value.trim()||'', qty=Math.max(1,Math.min(500,Number($('singleQty')?.value)||1)), p=products.find(x=>String(x.id)===String($('singleProduct')?.value)), el=$('singlePreview'); if(!el)return; if(!code){el.className='notice info full';el.textContent='Masukkan kode awal untuk melihat jumlah dan rentang kode.';return;} const codes=sequenceCodes(code,qty); el.className='notice info full';el.innerHTML=`${codes.length} kartu • Produk: <strong>${esc(p?.product_code||p?.name||'-')}</strong> • Kode: <strong>${esc(codes[0])}</strong>${codes.length>1?` → <strong>${esc(codes.at(-1))}</strong>`:''}`; }
  function renderResults(rows,p){ const host=$('cardCreationResults'); if(!host)return; if(!rows.length){host.innerHTML='';return;} host.innerHTML=`<div class="glass" style="margin-top:14px"><div class="head"><div class="row"><div><h3 style="margin:0">Hasil Kartu</h3><p class="muted">Produk: ${esc(p?.name||'-')} • Kode produk: ${esc(p?.product_code||'-')}</p></div><span class="muted">${rows.length} kartu</span></div></div><div class="body"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Jenis</th><th>Aktivasi</th><th>QR</th><th>NFC</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.card_code)}</strong></td><td>${esc(r.product_type)}</td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.activation_url)}">Buka Link</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.qr_code_url)}">Lihat QR</a></td><td><a class="btn" target="_blank" rel="noopener" href="${esc(r.nfc_url)}">Link NFC</a></td></tr>`).join('')}</tbody></table></div></div></div>`; }
  async function createCards(){ const form=$('singleForm'), msg=$('singleMsg'); if(!form||!msg)return; const code=$('singleCode')?.value.trim(), qty=Math.max(1,Math.min(500,Number($('singleQty')?.value)||1)), productId=$('singleProduct')?.value||null, customerId=$('singleCustomer')?.value||null, review=$('singleReview')?.value.trim()||null; if(!code)return message(msg,'err','❌ Kode awal kartu wajib diisi.'); if(!productId){message(msg,'err','❌ Produk wajib dipilih.');$('singleProduct')?.focus();return;} if(review){try{new URL(review)}catch{return message(msg,'err','❌ Google Review URL tidak valid.');}} const products=await loadProducts(), p=products.find(x=>String(x.id)===String(productId)); if(!p)return message(msg,'err','❌ Produk tidak ditemukan.'); const rows=sequenceCodes(code,qty).map(card_code=>{const a=activationUrl(card_code);return{card_code,product_type:p.product_code||p.name||p.category||'Tanpa Jenis',status:'pending',product_id:productId,customer_id:customerId,google_review_url:review,activation_url:a,qr_code_url:qrUrl(a),nfc_url:a};}); message(msg,'info',`Memproses ${rows.length} kartu...`); const {data,error}=await client.from('Cards').insert(rows).select('id,card_code,product_type,activation_url,qr_code_url,nfc_url'); if(error){if(error.code==='23505')throw new Error('Kode kartu sudah digunakan. Gunakan kode awal lain.');throw error;} const createdRows=data||rows; renderResults(createdRows,p); message(msg,'info',`✓ ${createdRows.length} kartu berhasil dibuat. QR transparan sedang dikumpulkan ke ZIP...`); try { await autoDownloadQrZip(createdRows,msg); } catch(error) { message(msg,'err',`❌ Kartu berhasil dibuat, tetapi ZIP QR gagal dibuat: ${error.message||error}`); } form.reset();$('singleQty').value='1';preview(products); document.dispatchEvent(new CustomEvent('aljava:cards-created',{detail:{count:createdRows.length}})); }
  function init(){ const form=$('singleForm'); if(!form||form.dataset.cardManagerBound==='1')return; form.dataset.cardManagerBound='1'; let products=[]; const refresh=async()=>{try{products=await loadProducts();preview(products);}catch(e){message($('singleMsg'),'err',`❌ Gagal memuat produk: ${e.message}`);}}; ['singleCode','singleQty','singleProduct'].forEach(id=>$(id)?.addEventListener('input',()=>preview(products))); $('singleProduct')?.addEventListener('change',()=>preview(products)); form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const b=form.querySelector('button[type="submit"]');if(b)b.disabled=true;try{await createCards();products=await loadProducts();}catch(err){message($('singleMsg'),'err',`❌ Gagal membuat kartu: ${err.message||err}`);}finally{if(b)b.disabled=false;}},true); void refresh(); document.addEventListener('aljava:products-changed',refresh); }
  window.cardManager={loadProducts,createCards};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
(() => { const load = () => { if (document.querySelector('script[data-aljava-card-assignment]')) return; const s=document.createElement('script'); s.src='/assets/card-assignment.js'; s.async=false; s.dataset.aljavaCardAssignment='1'; document.body.appendChild(s); }; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true}); else load(); })();
