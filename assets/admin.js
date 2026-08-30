const SUPABASE_URL='https://lbzwmcxwxummitldxucj.supabase.co';
const SUPABASE_KEY='sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);

const state={cards:[],products:[],customers:[],transactions:[],scans:[],customerRows:[]};

function showView(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active-view'));
  $(view)?.classList.add('active-view');
  closeMenu();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openMenu(){$('menuButton')?.setAttribute('aria-expanded','true');$('menuPanel')?.classList.add('open');}
function closeMenu(){$('menuButton')?.setAttribute('aria-expanded','false');$('menuPanel')?.classList.remove('open');}
function toggleMenu(){ $('menuPanel')?.classList.contains('open') ? closeMenu() : openMenu(); }

async function ensureAdmin(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){setLoggedOut();return false}
  const {data:{user},error:userError}=await sb.auth.getUser();
  if(userError||!user){await sb.auth.signOut({scope:'local'});setLoggedOut();return false}
  const {data:isAdmin,error}=await sb.rpc('is_admin_user');
  if(error||isAdmin!==true){await sb.auth.signOut({scope:'local'});setLoggedOut('Akun bukan admin.');return false}
  $('login').classList.add('hidden');
  $('app').style.display='block';
  $('menuButton').classList.add('visible');
  $('userEmail').textContent=user.email||'';
  return true;
}
function setLoggedOut(message=''){
  $('app').style.display='none'; $('login').classList.remove('hidden'); $('menuButton').classList.remove('visible'); closeMenu();
  $('loginMsg').innerHTML=message?`<div class="notice err">❌ ${esc(message)}</div>`:'';
}

async function load(){
  const query=async(table,select,order)=>{let q=sb.from(table).select(select);if(order)q=q.order(order,{ascending:false});const {data,error}=await q;if(error)throw error;return data||[]};
  try{
    [state.cards,state.products,state.customers,state.transactions,state.scans]=await Promise.all([
      query('Cards','id,card_code,product_type,status,customer_id,product_id,google_review_url,created_at,activated_at,expires_at','created_at'),
      query('Product','id,name,category','name'),
      query('Customers','id,business_name,owner_name,google_review_url,total_reviews,created_at','created_at'),
      query('Transactions','id,customer_id,card_id,product_id,quantity,selling_price,payment_status,transaction_date','transaction_date'),
      query('CardScans','id,card_id,card_code,event_type,scanned_at','scanned_at')
    ]);
    renderStats();renderChart();renderTransactions();renderScans();renderCards();fillProductOptions();fillCustomerOptions();renderCustomers();
  }catch(e){
    $('txTable').innerHTML=`<div class="notice err">❌ ${esc(e.message)}</div>`;
    $('cardTable').innerHTML=`<div class="notice err">❌ ${esc(e.message)}</div>`;
    $('customerRows').innerHTML=`<tr><td colspan="6"><div class="notice err">❌ ${esc(e.message)}</div></td></tr>`;
  }
}
function renderStats(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const revenue=state.transactions.reduce((s,t)=>s+Number(t.selling_price||0)*Number(t.quantity||1),0);
  const monthRevenue=state.transactions.filter(t=>{const d=new Date(t.transaction_date);return d.getFullYear()===y&&d.getMonth()===m}).reduce((s,t)=>s+Number(t.selling_price||0)*Number(t.quantity||1),0);
  const monthScan=state.scans.filter(s=>{const d=new Date(s.scanned_at);return d.getFullYear()===y&&d.getMonth()===m}).length;
  const active=state.cards.filter(c=>String(c.status||'').toLowerCase()==='active'||c.activated_at).length;
  $('totalRev').textContent=money(revenue);$('monthRev').textContent=money(monthRevenue);$('totalScan').textContent=state.scans.length;$('monthScan').textContent=monthScan;$('activeCards').textContent=active;$('pendingCards').textContent=state.cards.length-active;
}
function chartRows(){const y=Number($('year').value)||new Date().getFullYear();const m=$('month').value;const a=Array(12).fill(0);state.transactions.forEach(t=>{const d=new Date(t.transaction_date);if(d.getFullYear()===y)a[d.getMonth()]+=Number(t.selling_price||0)*Number(t.quantity||1)});return m===''?a.map((v,i)=>({v,i})):[{v:a[Number(m)]||0,i:Number(m)}]}
function renderChart(){const names=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];const rows=chartRows();const max=Math.max(1,...rows.map(r=>r.v));$('chart').innerHTML=rows.map(r=>`<div class="bar" title="${names[r.i]}: ${money(r.v)}"><i style="height:${Math.max(5,r.v/max*220)}px"></i><span>${names[r.i]}</span></div>`).join('');$('chartTotal').textContent=`Total periode: ${money(rows.reduce((s,r)=>s+r.v,0))} • ${state.transactions.length} transaksi terbaca`;}
function renderTransactions(){const cm=Object.fromEntries(state.customers.map(c=>[c.id,c])),pm=Object.fromEntries(state.products.map(p=>[p.id,p]));const rows=state.transactions.slice(0,12);$('txTable').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>Status</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${new Date(t.transaction_date).toLocaleString('id-ID')}</td><td>${esc(cm[t.customer_id]?.business_name||cm[t.customer_id]?.owner_name||'-')}</td><td>${esc(pm[t.product_id]?.name||'-')}</td><td>${t.quantity||1}</td><td>${money(Number(t.selling_price||0)*Number(t.quantity||1))}</td><td>${esc(t.payment_status||'-')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">Belum ada transaksi.</div>'}
function renderScans(){const map={};state.scans.forEach(s=>{const key=s.card_code||s.card_id||'-';map[key]=(map[key]||0)+1});const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);$('scanSummary').innerHTML=rows.length?rows.map(([code,n])=>`<div class="row" style="padding:9px 0;border-bottom:1px solid rgba(30,120,160,.1)"><strong>${esc(code)}</strong><span class="muted">${n} scan/tap</span></div>`).join(''):'<div class="muted">Belum ada scan/tap.</div>'}
function cardStatus(c){if((c.status||'').toLowerCase()==='active'||c.activated_at)return 'active';if(c.expires_at&&new Date(c.expires_at)<new Date())return 'expired';return 'pending'}
function renderCards(){const q=($('cardSearch').value||'').toLowerCase();const st=$('cardStatus').value;const cm=Object.fromEntries(state.customers.map(c=>[c.id,c]));const list=state.cards.filter(c=>(!st||cardStatus(c)===st)&&(!q||`${c.card_code} ${cm[c.customer_id]?.business_name||''} ${c.product_type||''}`.toLowerCase().includes(q)));const active=list.filter(c=>cardStatus(c)==='active').length;$('cardSummary').innerHTML=`<div class="notice info">Total ${list.length} kartu • <strong>${active}</strong> aktif • <strong>${list.length-active}</strong> lainnya</div>`;$('cardTable').innerHTML=list.length?`<table><thead><tr><th>Kode</th><th>Jenis</th><th>Customer</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>${list.map(c=>{const s=cardStatus(c);const label=s==='active'?'Aktif':s==='expired'?'Expired':'Belum Aktif';return `<tr><td><strong>${esc(c.card_code)}</strong></td><td>${esc(c.product_type||'-')}</td><td>${esc(cm[c.customer_id]?.business_name||cm[c.customer_id]?.owner_name||'-')}</td><td class="${s}">${label}</td><td>${new Date(c.created_at).toLocaleDateString('id-ID')}</td></tr>`}).join('')}</tbody></table>`:'<div class="muted">Tidak ada kartu.</div>'}
function fillProductOptions(){const html='<option value="">Produk (opsional)</option>'+state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.category||p.id)}</option>`).join('');$('singleProduct').innerHTML=html;$('bulkProduct').innerHTML=html}
function fillCustomerOptions(){const html='<option value="">Customer (opsional)</option>'+state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.business_name||c.owner_name||c.id)}</option>`).join('');$('singleCustomer').innerHTML=html;$('bulkCustomer').innerHTML=html}

function customerStatus(id){const cards=state.cards.filter(c=>c.customer_id===id);if(cards.some(c=>cardStatus(c)==='active'))return 'Aktif';if(cards.some(c=>cardStatus(c)==='pending'))return 'Pending';if(cards.some(c=>cardStatus(c)==='expired'))return 'Expired';return 'Pending'}
async function prepareCustomerRows(){
  const scanByCard={};state.scans.forEach(s=>{scanByCard[s.card_id]=(scanByCard[s.card_id]||0)+1});
  const cardsByCustomer={};state.cards.forEach(c=>{if(!c.customer_id)return;(cardsByCustomer[c.customer_id]??=[]).push(c)});
  state.customerRows=state.customers.map(c=>{const cc=cardsByCustomer[c.id]||[];const scanCount=cc.reduce((n,card)=>n+(scanByCard[card.id]||0),0);const type=[...new Set(cc.map(x=>x.product_type).filter(Boolean))].join(', ')||'-';return{id:c.id,business_name:c.business_name||c.owner_name||'-',product_type:type,status:customerStatus(c.id),scans:scanCount,url:c.google_review_url||cc.find(x=>x.google_review_url)?.google_review_url||'',reviews:Number(c.total_reviews)||0}})
}
function renderCustomers(){prepareCustomerRows();const q=($('customerSearch').value||'').toLowerCase().trim();const list=state.customerRows.filter(c=>!q||c.business_name.toLowerCase().includes(q)||String(c.id).toLowerCase().includes(q));$('customerRows').innerHTML=list.length?list.map(c=>`<tr><td>${esc(c.id)}</td><td><b>${esc(c.business_name)}</b></td><td>${esc(c.product_type)}</td><td class="${c.status.toLowerCase()}">${esc(c.status)}</td><td>${c.scans}</td><td>${c.url?`<a class="btn" style="text-decoration:none;display:inline-block" href="${esc(c.url)}" target="_blank" rel="noopener">🔗 Buka Review</a>`:'<span class="muted">Belum ada link</span>'}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>'}

async function createCards(rows,msgEl){msgEl.className='notice info';msgEl.textContent='Memproses...';const {data,error}=await sb.from('Cards').insert(rows).select('id,card_code');if(error)throw error;msgEl.className='notice ok';msgEl.textContent=`✓ ${data?.length||rows.length} kartu berhasil dibuat.`;await load()}
async function login(){const email=$('email').value.trim(),password=$('password').value;if(!email||!password){$('loginMsg').innerHTML='<div class="notice err">Email dan password wajib diisi.</div>';return} $('loginBtn').disabled=true;try{const r=await sb.auth.signInWithPassword({email,password});if(r.error){$('loginMsg').innerHTML=`<div class="notice err">❌ ${esc(r.error.message)}</div>`;return}if(await ensureAdmin()){await load();showView('dashboardView')}}finally{$('loginBtn').disabled=false}}
async function logout(){await sb.auth.signOut();location.reload()}
function openAddAccount(){ $('modalTitle').textContent='Tambah Akun';$('modalBody').innerHTML='<div class="notice info">Pembuatan akun admin harus melalui proses server-side/privileged auth. Tidak ada password admin yang dibuat otomatis dari browser.</div>';$('modal').classList.add('open') }
function resetDashboard(){ $('year').value=new Date().getFullYear();$('month').value='';load();showView('dashboardView') }

$('menuButton').addEventListener('click',toggleMenu);$('closeMenu').addEventListener('click',closeMenu);document.addEventListener('click',e=>{const p=$('menuPanel'),b=$('menuButton');if(p.classList.contains('open')&&!p.contains(e.target)&&e.target!==b)closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();$('modal').classList.remove('open')}});
$('loginBtn').addEventListener('click',login);$('logoutTop').addEventListener('click',logout);$('logoutMenu').addEventListener('click',logout);$('refresh').addEventListener('click',load);$('resetMenu').addEventListener('click',resetDashboard);$('addAccountMenu').addEventListener('click',openAddAccount);$('customerMenu').addEventListener('click',()=>showView('customersView'));$('cardsMenu').addEventListener('click',()=>showView('cardsView'));
$('singleForm').addEventListener('submit',async e=>{e.preventDefault();try{const pid=$('singleProduct').value||null,cid=$('singleCustomer').value||null,p=state.products.find(x=>x.id===pid);await createCards([{card_code:$('singleCode').value.trim(),product_type:p?.category||p?.name||'Tanpa Jenis',status:'pending',product_id:pid,customer_id:cid,google_review_url:$('singleReview').value.trim()||null}],$('singleMsg'));e.target.reset()}catch(x){$('singleMsg').className='notice err';$('singleMsg').textContent='❌ '+esc(x.message)}});
$('bulkForm').addEventListener('submit',async e=>{e.preventDefault();const codes=[...new Set($('bulkCodes').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];if(!codes.length)return;try{const pid=$('bulkProduct').value||null,cid=$('bulkCustomer').value||null,p=state.products.find(x=>x.id===pid);await createCards(codes.map(card_code=>({card_code,product_type:p?.category||p?.name||'Tanpa Jenis',status:'pending',product_id:pid,customer_id:cid})),$('bulkMsg'));e.target.reset()}catch(x){$('bulkMsg').className='notice err';$('bulkMsg').textContent='❌ '+esc(x.message)}});
$('cardSearch').addEventListener('input',renderCards);$('cardStatus').addEventListener('change',renderCards);$('customerSearch').addEventListener('input',renderCustomers);$('year').addEventListener('change',renderChart);$('month').addEventListener('change',renderChart);$('modalClose').addEventListener('click',()=>$('modal').classList.remove('open'));$('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.remove('open')});
for(let i=new Date().getFullYear()-3;i<=new Date().getFullYear()+1;i++)$('year').insertAdjacentHTML('beforeend',`<option value="${i}">${i}</option>`);$('year').value=new Date().getFullYear();
(async()=>{if(await ensureAdmin()){await load();showView('dashboardView')}})();