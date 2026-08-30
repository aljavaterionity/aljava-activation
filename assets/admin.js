/* ALJAVA TERIONITY Admin — single navigation and dashboard logic */

const CONFIG={supabaseUrl:'https://lbzwmcxwxummitldxucj.supabase.co',supabaseKey:'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw'};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);

if(!window.supabase?.createClient){$('loginMsg')&&( $('loginMsg').innerHTML='<div class="notice err">Library Supabase gagal dimuat. Muat ulang halaman.</div>');throw new Error('Supabase client tidak tersedia');}
const sb=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);
const state={cards:[],products:[],customers:[],transactions:[],scans:[],customerRows:[]};

/* ---------- Navigation ---------- */
function closeMenu(){const p=$('menuPanel'),b=$('menuButton');p?.classList.remove('open');b?.setAttribute('aria-expanded','false');}
function openMenu(){const p=$('menuPanel'),b=$('menuButton');if(!p||!b)return;p.classList.add('open');b.setAttribute('aria-expanded','true');}
function toggleMenu(){if($('menuPanel')?.classList.contains('open'))closeMenu();else openMenu();}
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));
  closeMenu();
  window.scrollTo({top:0,behavior:'smooth'});
  if(history.replaceState)history.replaceState(null,'','#'+id.replace(/View$/,''));
}
function goDashboard(){showView('dashboardView');}
function bindNavigation(){
  $('menuButton')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleMenu();});
  $('closeMenu')?.addEventListener('click',e=>{e.preventDefault();closeMenu();});
  $('dashboardMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goDashboard();});
  $('cardsMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showView('cardsView');});
  $('customerMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showView('customersView');});
  $('resetMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();resetDashboard();});
  $('addAccountMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAddAccount();});
  $('logoutMenu')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();logout();});
  document.addEventListener('click',e=>{const p=$('menuPanel'),b=$('menuButton');if(p?.classList.contains('open')&&!p.contains(e.target)&&e.target!==b)closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();$('modal')?.classList.remove('open');}});
}
function initRoute(){const hash=location.hash.replace('#','');if(hash==='cards'||hash==='cardsView')showView('cardsView');else if(hash==='customers'||hash==='customersView')showView('customersView');else goDashboard();}
window.addEventListener('hashchange',()=>{const h=location.hash.replace('#','');if(h==='cards')showView('cardsView');else if(h==='customers')showView('customersView');else if(h==='dashboard'||!h)goDashboard();});

/* ---------- Authentication ---------- */
function setLoggedOut(message=''){
  $('app').style.display='none';
  $('login').classList.remove('hidden');
  $('menuButton').classList.remove('visible');
  closeMenu();
  $('loginMsg').innerHTML=message?`<div class="notice err">❌ ${esc(message)}</div>`:'';
}
async function ensureAdmin(){
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){setLoggedOut();return false;}
    const {data:{user},error:userError}=await sb.auth.getUser();
    if(userError||!user){await sb.auth.signOut({scope:'local'});setLoggedOut('Sesi login tidak valid.');return false;}
    const {data:isAdmin,error}=await sb.rpc('is_admin_user');
    if(adminError||isAdmin!==true){await sb.auth.signOut({scope:'local'});setLoggedOut('Akun bukan admin.');return false;}
    $('login').classList.add('hidden');$('app').style.display='block';$('menuButton').classList.add('visible');$('userEmail').textContent=user.email||'';
    return true;
  }catch(e){setLoggedOut(e.message||'Gagal memeriksa sesi admin.');return false;}
}
async function login(){
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||!password){$('loginMsg').innerHTML='<div class="notice err">Email dan password wajib diisi.</div>';return;}
  $('loginBtn').disabled=true;
  try{const {error}=await sb.auth.signInWithPassword({email,password});if(error){$('loginMsg').innerHTML=`<div class="notice err">❌ ${esc(error.message)}</div>`;return;}if(await ensureAdmin()){await load();goDashboard();}}
  catch(e){$('loginMsg').innerHTML=`<div class="notice err">❌ ${esc(e.message)}</div>`}
  finally{$('loginBtn').disabled=false;}
}
async function logout(){await sb.auth.signOut({scope:'local'});location.reload();}

/* ---------- Data ---------- */
async function queryTable(table,select,orderBy){let q=sb.from(table).select(select);if(orderBy)q=q.order(orderBy,{ascending:false});const {data,error}=await q;if(error)throw error;return data||[];}
async function load(){
  try{
    const [cards,products,customers,transactions,scans]=await Promise.all([
      queryTable('Cards','id,card_code,product_type,status,customer_id,product_id,google_review_url,created_at,activated_at,expires_at','created_at'),
      queryTable('Product','id,name,category','name'),
      queryTable('Customers','id,business_name,owner_name,google_review_url,created_at','created_at'),
      queryTable('Transactions','id,customer_id,card_id,product_id,quantity,selling_price,payment_status,transaction_date','transaction_date'),
      queryTable('CardScans','id,card_id,card_code,event_type,scanned_at','scanned_at')
    ]);
    Object.assign(state,{cards,products,customers,transactions,scans});renderAll();
  }catch(e){const m=esc(e.message||'Gagal memuat data.');$('txTable').innerHTML=`<div class="notice err">❌ ${m}</div>`;$('cardTable').innerHTML=`<div class="notice err">❌ ${m}</div>`;$('customerRows').innerHTML=`<tr><td colspan="6"><div class="notice err">❌ ${m}</div></td></tr>`;}
}
function renderAll(){renderStats();renderChart();renderTransactions();renderScans();renderCards();fillProductOptions();fillCustomerOptions();renderCustomers();}

function cardStatus(card){const s=String(card.status||'').toLowerCase();if(card.expires_at&&new Date(card.expires_at)<new Date())return'Expired';if(s==='active'||card.activated_at)return'Aktif';return'Belum Aktif';}
function renderStats(){const now=new Date(),y=now.getFullYear(),m=now.getMonth();const rev=state.transactions.reduce((s,t)=>s+Number(t.selling_price||0)*Number(t.quantity||1),0);const monthRev=state.transactions.filter(t=>{const d=new Date(t.transaction_date);return d.getFullYear()===y&&d.getMonth()===m}).reduce((s,t)=>s+Number(t.selling_price||0)*Number(t.quantity||1),0);const monthScan=state.scans.filter(s=>{const d=new Date(s.scanned_at);return d.getFullYear()===y&&d.getMonth()===m}).length;const active=state.cards.filter(c=>cardStatus(c)==='Aktif').length;$('totalRev').textContent=money(rev);$('monthRev').textContent=money(monthRev);$('totalScan').textContent=state.scans.length;$('monthScan').textContent=monthScan;$('activeCards').textContent=active;$('pendingCards').textContent=state.cards.filter(c=>cardStatus(c)==='Belum Aktif').length;}
function renderChart(){const names=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];const y=Number($('year').value)||new Date().getFullYear(),m=$('month').value,a=Array(12).fill(0);state.transactions.forEach(t=>{const d=new Date(t.transaction_date);if(d.getFullYear()===y)a[d.getMonth()]+=Number(t.selling_price||0)*Number(t.quantity||1);});const rows=m===''?a.map((v,i)=>({v,i})):[{v:a[Number(m)]||0,i:Number(m)}];const max=Math.max(1,...rows.map(r=>r.v));$('chart').innerHTML=rows.map(r=>`<div class="bar" title="${names[r.i]}: ${money(r.v)}"><i style="height:${Math.max(5,r.v/max*220)}px"></i><span>${names[r.i]}</span></div>`).join('');$('chartTotal').textContent=`Total periode: ${money(rows.reduce((s,r)=>s+r.v,0))} • ${state.transactions.length} transaksi terbaca`;}
function renderTransactions(){const cm=Object.fromEntries(state.customers.map(c=>[c.id,c])),pm=Object.fromEntries(state.products.map(p=>[p.id,p])),rows=state.transactions.slice(0,12);$('txTable').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>Status</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(new Date(t.transaction_date).toLocaleString('id-ID'))}</td><td>${esc(cm[t.customer_id]?.business_name||cm[t.customer_id]?.owner_name||'-')}</td><td>${esc(pm[t.product_id]?.name||'-')}</td><td>${Number(t.quantity||1)}</td><td>${money(Number(t.selling_price||0)*Number(t.quantity||1))}</td><td>${esc(t.payment_status||'-')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">Belum ada transaksi.</div>';}
function renderScans(){const map={};state.scans.forEach(s=>{const k=s.card_code||s.card_id||'-';map[k]=(map[k]||0)+1;});const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);$('scanSummary').innerHTML=rows.length?rows.map(([k,n])=>`<div class="row" style="padding:9px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(k)}</strong><span class="muted">${n} scan/tap</span></div>`).join(''):'<div class="muted">Belum ada scan/tap.</div>';}
function renderCards(){const q=($('cardSearch').value||'').toLowerCase().trim(),f=$('cardStatus').value,cm=Object.fromEntries(state.customers.map(c=>[c.id,c]));const rows=state.cards.filter(c=>{const s=cardStatus(c).toLowerCase().replace('aktif','active').replace('belum active','pending').replace('expired','expired');const text=`${c.card_code||''} ${cm[c.customer_id]?.business_name||''} ${c.product_type||''}`.toLowerCase();return(!f||s===f)&&(!q||text.includes(q));});const active=rows.filter(c=>cardStatus(c)==='Aktif').length;$('cardSummary').innerHTML=`<div class="notice info">Total ${rows.length} kartu • <strong>${active}</strong> aktif • <strong>${rows.filter(c=>cardStatus(c)!=='Aktif').length}</strong> lainnya</div>`;$('cardTable').innerHTML=rows.length?`<table><thead><tr><th>Kode</th><th>Jenis</th><th>Customer</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>${rows.map(c=>`<tr><td><strong>${esc(c.card_code)}</strong></td><td>${esc(c.product_type||'-')}</td><td>${esc(cm[c.customer_id]?.business_name||cm[c.customer_id]?.owner_name||'-')}</td><td>${esc(cardStatus(c))}</td><td>${esc(new Date(c.created_at).toLocaleDateString('id-ID'))}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Tidak ada kartu.</div>';}
function fillProductOptions(){const h='<option value="">Produk (opsional)</option>'+state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.category||p.id)}</option>`).join('');$('singleProduct').innerHTML=h;$('bulkProduct').innerHTML=h;}
function fillCustomerOptions(){const h='<option value="">Customer (opsional)</option>'+state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.business_name||c.owner_name||c.id)}</option>`).join('');$('singleCustomer').innerHTML=h;$('bulkCustomer').innerHTML=h;}
function prepareCustomerRows(){const byCard={};state.scans.forEach(s=>{byCard[s.card_id]=(byCard[s.card_id]||0)+1});const byCust={};state.cards.forEach(c=>{if(c.customer_id)(byCust[c.customer_id]??=[]).push(c);});state.customerRows=state.customers.map(c=>{const cards=byCust[c.id]||[],scans=cards.reduce((n,x)=>n+(byCard[x.id]||0),0),types=[...new Set(cards.map(x=>x.product_type).filter(Boolean))].join(', ')||'-',url=c.google_review_url||cards.find(x=>x.google_review_url)?.google_review_url||'';return{id:c.id,business_name:c.business_name||c.owner_name||'-',product_type:types,status:customerStatus(cards),scans,url};});}
function customerStatus(cards){if(cards.some(c=>cardStatus(c)==='Aktif'))return'Aktif';if(cards.some(c=>cardStatus(c)==='Belum Aktif'))return'Pending';if(cards.some(c=>cardStatus(c)==='Expired'))return'Expired';return'Pending';}
function renderCustomers(){prepareCustomerRows();const q=($('customerSearch').value||'').toLowerCase().trim(),rows=state.customerRows.filter(c=>!q||c.business_name.toLowerCase().includes(q)||String(c.id).toLowerCase().includes(q));$('customerRows').innerHTML=rows.length?rows.map(c=>`<tr><td>${esc(c.id)}</td><td><b>${esc(c.business_name)}</b></td><td>${esc(c.product_type)}</td><td>${esc(c.status)}</td><td>${c.scans}</td><td>${c.url?`<a class="btn" style="text-decoration:none;display:inline-block" href="${esc(c.url)}" target="_blank" rel="noopener">🔗 Buka Review</a>`:'<span class="muted">Belum ada link</span>'}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>';}

/* ---------- Card creation ---------- */
async function createCards(rows,msgEl){msgEl.className='notice info';msgEl.textContent='Memproses...';const {data,error}=await sb.from('Cards').insert(rows).select('id,card_code');if(error)throw error;msgEl.className='notice ok';msgEl.textContent=`✓ ${data?.length||rows.length} kartu berhasil dibuat.`;await load();}
$('singleForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const pid=$('singleProduct').value||null,cid=$('singleCustomer').value||null,p=state.products.find(x=>x.id===pid);await createCards([{card_code:$('singleCode').value.trim(),product_type:p?.category||p?.name||'Tanpa Jenis',status:'pending',product_id:pid,customer_id:cid,google_review_url:$('singleReview').value.trim()||null}],$('singleMsg'));e.target.reset();}catch(x){$('singleMsg').className='notice err';$('singleMsg').textContent='❌ '+esc(x.message);}});
$('bulkForm')?.addEventListener('submit',async e=>{e.preventDefault();const codes=[...new Set($('bulkCodes').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];if(!codes.length)return;try{const pid=$('bulkProduct').value||null,cid=$('bulkCustomer').value||null,p=state.products.find(x=>x.id===pid);await createCards(codes.map(card_code=>({card_code,product_type:p?.category||p?.name||'Tanpa Jenis',status:'pending',product_id:pid,customer_id:cid})),$('bulkMsg'));e.target.reset();}catch(x){$('bulkMsg').className='notice err';$('bulkMsg').textContent='❌ '+esc(x.message);}});

$('loginBtn')?.addEventListener('click',login);$('refresh')?.addEventListener('click',load);$('logoutTop')?.addEventListener('click',logout);$('customerSearch')?.addEventListener('input',renderCustomers);$('cardSearch')?.addEventListener('input',renderCards);$('cardStatus')?.addEventListener('change',renderCards);$('year')?.addEventListener('change',renderChart);$('month')?.addEventListener('change',renderChart);$('modalClose')?.addEventListener('click',()=>$('modal').classList.remove('open'));$('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.remove('open')});
function openAddAccount(){$('modalTitle').textContent='Tambah Akun';$('modalBody').innerHTML='<div class="notice info">Pembuatan akun admin harus melalui proses server-side/privileged auth.</div>';$('modal').classList.add('open');}
function resetDashboard(){$('year').value=new Date().getFullYear();$('month').value='';load();goDashboard();}
const yearNow=new Date().getFullYear();for(let y=yearNow-3;y<=yearNow+1;y++)$('year')?.insertAdjacentHTML('beforeend',`<option value="${y}">${y}</option>`);if($('year'))$('year').value=yearNow;
bindNavigation();
(async()=>{if(await ensureAdmin()){await load();initRoute();}})();