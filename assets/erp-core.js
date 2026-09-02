/* ALJAVA TERIONITY — ERP Core UI (Projects + Finance) */
(() => {
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;' }[c]));
  const money = (value) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value) || 0);
  const client = window.__ALJAVA_SUPABASE_CLIENT || window.supabase?.createClient?.(window.ALJAVA_CONFIG?.supabaseUrl, window.ALJAVA_CONFIG?.supabaseKey);
  const ctx = window.ALJAVA_BUSINESS_CONTEXT;
  const state = { projects: [], finance: [], transactions: [], customers: [], canManageProject:false, canManageFinance:false, editingProject:null };

  async function unitId() {
    if (!ctx) throw new Error('Business context belum tersedia.');
    const id = await ctx.getSelectedUnitId();
    if (!id) throw new Error('Belum ada unit bisnis aktif.');
    return id;
  }

  async function permission(code) {
    try { const { data, error } = await client.rpc('has_business_permission', { p_business_unit_id: await unitId(), p_permission_code: code }); return !error && data === true; }
    catch (_) { return false; }
  }

  function injectStyles() {
    if (document.getElementById('aljava-erp-style')) return;
    const style = document.createElement('style'); style.id = 'aljava-erp-style';
    style.textContent = `
      #erpView{padding-bottom:30px}.erp-grid{display:grid;grid-template-columns:1.05fr 1.95fr;gap:18px}.erp-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.erp-form .full{grid-column:1/-1}.erp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.erp-summary .stat{padding:16px 18px}.erp-summary .label{font-size:11px;color:#71879a;font-weight:700}.erp-summary .value{font-size:22px;font-weight:850;color:#123f5e;margin-top:5px}.erp-table{overflow:auto}.erp-table table{min-width:760px;width:100%}.erp-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.erp-actions{display:flex;gap:7px;flex-wrap:wrap}.erp-actions .btn{padding:7px 10px;font-size:11px}.erp-muted{color:#71879a;font-size:12px}.erp-badge{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef6ff;color:#2563eb;font-size:10px;font-weight:800}.erp-negative{color:#dc2626!important}.erp-positive{color:#059669!important}@media(max-width:850px){.erp-grid{grid-template-columns:1fr}.erp-summary{grid-template-columns:1fr 1fr}}@media(max-width:600px){.erp-form{grid-template-columns:1fr}.erp-summary{grid-template-columns:1fr 1fr}.erp-summary .value{font-size:18px}}
    `;
    document.head.appendChild(style);
  }

  function injectView() {
    if (document.getElementById('erpView')) return;
    const app = document.getElementById('app'); if (!app) return;
    const view = document.createElement('section'); view.id = 'erpView'; view.className = 'view';
    view.innerHTML = `
      <div class="row" style="margin-top:18px"><div><h1 style="margin:0">ERP Core</h1><p class="muted">Project Management & Finance • terhubung dengan unit bisnis aktif.</p></div></div>
      <div class="erp-summary">
        <div class="glass stat"><div class="label">Pendapatan Finance</div><div id="erpIncome" class="value">Rp 0</div></div>
        <div class="glass stat"><div class="label">Pengeluaran Finance</div><div id="erpExpense" class="value">Rp 0</div></div>
        <div class="glass stat"><div class="label">Net Finance</div><div id="erpNet" class="value">Rp 0</div></div>
        <div class="glass stat"><div class="label">Revenue Transaksi</div><div id="erpTxRevenue" class="value">Rp 0</div></div>
      </div>
      <div class="erp-grid">
        <section class="glass panel"><div class="head"><h2 id="erpProjectFormTitle" style="margin:0">Tambah Project</h2><p class="muted" style="margin:5px 0 0">Project selalu berada di unit bisnis aktif.</p></div><div class="body">
          <form id="erpProjectForm" class="erp-form"><input id="erpProjectName" class="field full" required placeholder="Nama project"><input id="erpProjectCode" class="field" placeholder="Kode project (opsional)"><select id="erpProjectCustomer" class="field"><option value="">Customer (opsional)</option></select><select id="erpProjectStatus" class="field"><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input id="erpProjectStart" class="field" type="date"><input id="erpProjectEnd" class="field" type="date"><textarea id="erpProjectDescription" class="field full" rows="3" placeholder="Deskripsi project"></textarea><div class="erp-actions full"><button id="erpProjectSave" class="btn" type="submit">Simpan Project</button><button id="erpProjectCancel" class="btn" type="button" hidden>Batal Edit</button></div></form><div id="erpProjectMsg" aria-live="polite"></div>
        </div></section>
        <section class="glass panel"><div class="head"><div class="erp-toolbar"><div><h2 style="margin:0">Daftar Project</h2><p class="muted" style="margin:5px 0 0">Project unit bisnis aktif.</p></div><button id="erpProjectRefresh" class="btn" type="button">Refresh</button></div></div><div class="body"><div id="erpProjectsTable" class="erp-table"></div></div></section>
      </div>
      <section class="glass panel" style="margin-top:18px"><div class="head"><h2 style="margin:0">Finance Entry</h2><p class="muted" style="margin:5px 0 0">Catat income, expense, transfer, atau adjustment dan hubungkan ke project/transaksi bila diperlukan.</p></div><div class="body">
        <form id="erpFinanceForm" class="erp-form"><select id="erpFinanceType" class="field"><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option><option value="adjustment">Adjustment</option></select><input id="erpFinanceAmount" class="field" type="number" min="0" step="1" required placeholder="Nominal"><input id="erpFinanceDate" class="field" type="date"><select id="erpFinanceProject" class="field"><option value="">Project (opsional)</option></select><select id="erpFinanceTransaction" class="field full"><option value="">Transaksi terkait (opsional)</option></select><input id="erpFinanceDescription" class="field full" placeholder="Keterangan"><div class="erp-actions full"><button id="erpFinanceSave" class="btn" type="submit">Simpan Finance Entry</button></div></form><div id="erpFinanceMsg" aria-live="polite"></div>
      </div></section>
      <section class="glass panel" style="margin-top:18px"><div class="head"><div class="erp-toolbar"><div><h2 style="margin:0">Riwayat Finance</h2><p class="muted" style="margin:5px 0 0">Data keuangan unit bisnis aktif.</p></div><button id="erpFinanceRefresh" class="btn" type="button">Refresh</button></div></div><div class="body"><div id="erpFinanceTable" class="erp-table"></div></div></section>`;
    app.appendChild(view);
  }

  function injectMenu() {
    const root = document.getElementById('menuPanel'); const main = root?.querySelector('.menu-section > .menu-items');
    if (!root || !main || document.getElementById('erpMenu')) return;
    const button = document.createElement('button'); button.id='erpMenu'; button.className='menu-item'; button.type='button';
    button.innerHTML='<span class="menu-icon">▦</span><span><b>ERP Core</b><small>Project & Finance</small></span>';
    main.appendChild(button);
    button.addEventListener('click', () => { window.erpCore?.show?.(); });
  }

  function msg(id, text, ok=false) { const el=document.getElementById(id); if(!el)return; el.className=`notice ${ok?'ok':'err'}`; el.textContent=(ok?'✓ ':'❌ ')+text; }

  async function load() {
    const id = await unitId();
    const [projects, finance, tx, customers] = await Promise.all([
      client.from('projects').select('id,business_unit_id,name,code,customer_id,status,description,start_date,end_date,created_at').eq('business_unit_id',id).order('created_at',{ascending:false}),
      client.from('finance_entries').select('id,business_unit_id,entry_type,amount,description,transaction_id,project_id,entry_date,created_at').eq('business_unit_id',id).order('entry_date',{ascending:false}),
      client.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,payment_status,transaction_date').eq('business_unit_id',id).order('transaction_date',{ascending:false}).limit(100),
      client.from('Customers').select('id,business_name,owner_name').order('business_name')
    ]);
    if (projects.error) throw projects.error; if (finance.error) throw finance.error; if (tx.error) throw tx.error;
    state.projects=projects.data||[]; state.finance=finance.data||[]; state.transactions=tx.data||[]; state.customers=customers.error?[]:(customers.data||[]);
    render();
  }

  function render() {
    const customers=Object.fromEntries(state.customers.map(x=>[x.id,x])); const projects=Object.fromEntries(state.projects.map(x=>[x.id,x]));
    const income=state.finance.filter(x=>x.entry_type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expense=state.finance.filter(x=>x.entry_type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    const txRevenue=state.transactions.reduce((s,x)=>s+Number(x.selling_price||0)*Number(x.quantity||1),0);
    document.getElementById('erpIncome').textContent=money(income); document.getElementById('erpExpense').textContent=money(expense); document.getElementById('erpNet').textContent=money(income-expense); document.getElementById('erpNet').className=`value ${income-expense<0?'erp-negative':'erp-positive'}`; document.getElementById('erpTxRevenue').textContent=money(txRevenue);
    const customerOptions='<option value="">Customer (opsional)</option>'+state.customers.map(x=>`<option value="${esc(x.id)}">${esc(x.business_name||x.owner_name||'Customer')}</option>`).join('');
    document.getElementById('erpProjectCustomer').innerHTML=customerOptions;
    document.getElementById('erpFinanceProject').innerHTML='<option value="">Project (opsional)</option>'+state.projects.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.code?` • ${esc(x.code)}`:''}</option>`).join('');
    document.getElementById('erpFinanceTransaction').innerHTML='<option value="">Transaksi terkait (opsional)</option>'+state.transactions.map(x=>`<option value="${esc(x.id)}">${esc(new Date(x.transaction_date).toLocaleDateString('id-ID'))} • ${money(Number(x.selling_price||0)*Number(x.quantity||1))} • ${esc(x.payment_status||'')}</option>`).join('');
    document.getElementById('erpProjectsTable').innerHTML=state.projects.length?`<table><thead><tr><th>Project</th><th>Customer</th><th>Status</th><th>Periode</th><th>Aksi</th></tr></thead><tbody>${state.projects.map(p=>`<tr><td><strong>${esc(p.name)}</strong><div class="erp-muted">${esc(p.code||'Tanpa kode')}</div></td><td>${esc(customers[p.customer_id]?.business_name||customers[p.customer_id]?.owner_name||'-')}</td><td><span class="erp-badge">${esc(p.status)}</span></td><td>${esc(p.start_date||'-')} → ${esc(p.end_date||'-')}</td><td>${state.canManageProject?`<button class="btn erp-edit-project" data-id="${esc(p.id)}" type="button">Edit</button> <button class="btn danger erp-delete-project" data-id="${esc(p.id)}" type="button">Hapus</button>`:'<span class="erp-muted">View only</span>'}</td></tr>`).join('')}</tbody></table>`:'<div class="erp-muted">Belum ada project.</div>';
    document.getElementById('erpFinanceTable').innerHTML=state.finance.length?`<table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Project</th><th>Keterangan</th><th>Transaksi</th><th>Aksi</th></tr></thead><tbody>${state.finance.map(f=>`<tr><td>${esc(f.entry_date)}</td><td><span class="erp-badge">${esc(f.entry_type)}</span></td><td>${money(f.amount)}</td><td>${esc(projects[f.project_id]?.name||'-')}</td><td>${esc(f.description||'-')}</td><td>${f.transaction_id?esc(f.transaction_id.slice(0,8)):'-'}</td><td>${state.canManageFinance?`<button class="btn danger erp-delete-finance" data-id="${esc(f.id)}" type="button">Hapus</button>`:'<span class="erp-muted">View only</span>'}</td></tr>`).join('')}</tbody></table>`:'<div class="erp-muted">Belum ada finance entry.</div>';
    document.getElementById('erpProjectSave').disabled=!state.canManageProject; document.getElementById('erpFinanceSave').disabled=!state.canManageFinance;
  }

  function editProject(id) { const p=state.projects.find(x=>x.id===id); if(!p)return; state.editingProject=p; document.getElementById('erpProjectFormTitle').textContent='Edit Project'; document.getElementById('erpProjectName').value=p.name||''; document.getElementById('erpProjectCode').value=p.code||''; document.getElementById('erpProjectCustomer').value=p.customer_id||''; document.getElementById('erpProjectStatus').value=p.status||'active'; document.getElementById('erpProjectStart').value=p.start_date||''; document.getElementById('erpProjectEnd').value=p.end_date||''; document.getElementById('erpProjectDescription').value=p.description||''; document.getElementById('erpProjectCancel').hidden=false; }
  function resetProjectForm(){ state.editingProject=null; document.getElementById('erpProjectFormTitle').textContent='Tambah Project'; document.getElementById('erpProjectForm').reset(); document.getElementById('erpProjectCancel').hidden=true; }

  async function saveProject(event){ event.preventDefault(); if(!state.canManageProject)return; try{const id=await unitId(); const {data:{user}}=await client.auth.getUser(); const payload={business_unit_id:id,name:document.getElementById('erpProjectName').value.trim(),code:document.getElementById('erpProjectCode').value.trim()||null,customer_id:document.getElementById('erpProjectCustomer').value||null,status:document.getElementById('erpProjectStatus').value,description:document.getElementById('erpProjectDescription').value.trim()||null,start_date:document.getElementById('erpProjectStart').value||null,end_date:document.getElementById('erpProjectEnd').value||null}; if(!payload.name)throw new Error('Nama project wajib diisi.'); if(state.editingProject){const {error}=await client.from('projects').update(payload).eq('id',state.editingProject.id).eq('business_unit_id',id);if(error)throw error;}else{payload.created_by=user?.id||null;const {error}=await client.from('projects').insert(payload);if(error)throw error;} msg('erpProjectMsg','Project tersimpan.',true); resetProjectForm(); await load();}catch(e){msg('erpProjectMsg',e.message||'Gagal menyimpan project.');} }
  async function deleteProject(id){ if(!state.canManageProject||!confirm('Hapus project ini? Finance entry yang terhubung akan dilepas dari project.'))return; try{const {error}=await client.from('projects').delete().eq('id',id);if(error)throw error;await load();}catch(e){msg('erpProjectMsg',e.message||'Gagal menghapus project.');} }
  async function saveFinance(event){ event.preventDefault(); if(!state.canManageFinance)return; try{const id=await unitId();const {data:{user}}=await client.auth.getUser();const amount=Number(document.getElementById('erpFinanceAmount').value);if(!Number.isFinite(amount)||amount<0)throw new Error('Nominal tidak valid.');const payload={business_unit_id:id,entry_type:document.getElementById('erpFinanceType').value,amount,description:document.getElementById('erpFinanceDescription').value.trim()||null,transaction_id:document.getElementById('erpFinanceTransaction').value||null,project_id:document.getElementById('erpFinanceProject').value||null,entry_date:document.getElementById('erpFinanceDate').value||new Date().toISOString().slice(0,10),created_by:user?.id||null};const {error}=await client.from('finance_entries').insert(payload);if(error)throw error;msg('erpFinanceMsg','Finance entry tersimpan.',true);document.getElementById('erpFinanceForm').reset();document.getElementById('erpFinanceDate').value=new Date().toISOString().slice(0,10);await load();}catch(e){msg('erpFinanceMsg',e.message||'Gagal menyimpan finance entry.');} }
  async function deleteFinance(id){if(!state.canManageFinance||!confirm('Hapus finance entry ini?'))return;try{const {error}=await client.from('finance_entries').delete().eq('id',id);if(error)throw error;await load();}catch(e){msg('erpFinanceMsg',e.message||'Gagal menghapus finance entry.');}}

  async function show(){ const view=document.getElementById('erpView'); if(!view)return; document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v===view)); history.replaceState?.(null,'','#erp'); document.getElementById('menuPanel')?.classList.remove('open'); try{await ctx?.load?.();state.canManageProject=await permission('project.manage');state.canManageFinance=await permission('finance.manage');await load();}catch(e){ document.getElementById('erpProjectsTable').innerHTML=`<div class="notice err">❌ ${esc(e.message||'Gagal memuat ERP.')}</div>`; } }

  function bind(){ injectStyles(); injectView(); injectMenu(); document.getElementById('erpProjectForm')?.addEventListener('submit',saveProject); document.getElementById('erpProjectCancel')?.addEventListener('click',resetProjectForm); document.getElementById('erpFinanceForm')?.addEventListener('submit',saveFinance); document.getElementById('erpProjectRefresh')?.addEventListener('click',()=>load().catch(e=>msg('erpProjectMsg',e.message))); document.getElementById('erpFinanceRefresh')?.addEventListener('click',()=>load().catch(e=>msg('erpFinanceMsg',e.message))); document.getElementById('erpProjectsTable')?.addEventListener('click',(e)=>{const edit=e.target.closest('.erp-edit-project');const del=e.target.closest('.erp-delete-project');if(edit)editProject(edit.dataset.id);if(del)deleteProject(del.dataset.id);}); document.getElementById('erpFinanceTable')?.addEventListener('click',(e)=>{const del=e.target.closest('.erp-delete-finance');if(del)deleteFinance(del.dataset.id);}); window.addEventListener('aljava:business-changed',()=>{if(document.getElementById('erpView')?.classList.contains('active-view'))show();}); }
  window.erpCore={show};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
