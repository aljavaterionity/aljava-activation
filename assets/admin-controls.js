/* ALJAVA TERIONITY — admin controls + login safety fallback */
(()=>{
  'use strict';
  window.adminControls = Object.freeze({
    showPayments() { console.warn('[ALJAVA] Manual payment UI is disabled.'); },
    loadPayments() { return Promise.resolve([]); }
  });
  function addBusinessHubEntry() {
    const panel=document.getElementById('menuPanel'); const mainItems=panel?.querySelector('.menu-section > .menu-items');
    if(!mainItems||document.getElementById('businessHubMenu')) return;
    const button=document.createElement('button'); button.id='businessHubMenu'; button.type='button'; button.className='menu-item';
    button.innerHTML='<span class="menu-icon">⌂</span><span><b>Business Hub</b><small>Induk ALJAVA & unit usaha</small></span>';
    button.addEventListener('click',()=>{window.location.href='/business-hub.html';}); mainItems.appendChild(button);
  }
  function bindLoginFallback(){
    const original=document.getElementById('loginButton')||document.getElementById('loginBtn');
    if(!original||original.dataset.aljavaFallback==='1') return;
    const button=original.cloneNode(true); button.dataset.aljavaFallback='1'; original.replaceWith(button);
    const login=async()=>{
      const email=document.getElementById('email')?.value.trim()||''; const password=document.getElementById('password')?.value||'';
      const msg=document.getElementById('loginMsg'); const errorBox=document.getElementById('errorBox'); const successBox=document.getElementById('successBox');
      const showError=(text)=>{if(msg){msg.innerHTML=`<div class="notice err">❌ ${text}</div>`;return;}if(errorBox){errorBox.textContent='❌ '+text;errorBox.style.display='block';}if(successBox)successBox.style.display='none';};
      const showSuccess=(text)=>{if(msg){msg.innerHTML=`<div class="muted">${text}</div>`;return;}if(errorBox)errorBox.style.display='none';if(successBox){successBox.textContent=text;successBox.style.display='block';}};
      if(!email||!password){showError('Email dan password wajib diisi.');return;}
      button.disabled=true; showSuccess('Memeriksa login...');
      try{
        const c=window.ALJAVA_CONFIG; if(!c||!window.supabase?.createClient)throw new Error('Library login belum siap. Refresh halaman.');
        const client=window.supabase.createClient(c.supabaseUrl,c.supabaseKey);
        const {data,error}=await client.auth.signInWithPassword({email,password}); if(error)throw error;
        if(!data?.session)throw new Error('Login tidak menghasilkan sesi.');
        const {data:isAdmin,error:adminError}=await client.rpc('is_admin_user'); if(adminError)throw adminError;
        if(isAdmin!==true)throw new Error('Login berhasil, tetapi akun ini tidak memiliki akses admin.');
        showSuccess('Login berhasil. Mengalihkan...');
        window.location.href='/admin';
      }catch(error){
        const safe=String(error?.message||'Login gagal.').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
        showError(safe); console.error('[ALJAVA LOGIN]',error);
      }finally{button.disabled=false;}
    };
    button.addEventListener('click',login);
    document.getElementById('password')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login();}});
  }
  function schedule(){addBusinessHubEntry();setTimeout(addBusinessHubEntry,300);setTimeout(addBusinessHubEntry,1000);bindLoginFallback();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
