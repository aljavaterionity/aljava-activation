/* ALJAVA TERIONITY — admin controls */
(() => {
  'use strict';
  window.adminControls = Object.freeze({
    showPayments() { console.warn('[ALJAVA] Manual payment UI is disabled.'); },
    loadPayments() { return Promise.resolve([]); }
  });
  function addBusinessHubEntry() {
    const panel = document.getElementById('menuPanel');
    const mainItems = panel?.querySelector('.menu-section > .menu-items');
    if (!mainItems || document.getElementById('businessHubMenu')) return;
    const button = document.createElement('button');
    button.id='businessHubMenu'; button.type='button'; button.className='menu-item';
    button.innerHTML='<span class="menu-icon">⌂</span><span><b>Business Hub</b><small>Induk ALJAVA & unit usaha</small></span>';
    button.addEventListener('click', () => { window.location.href='/business-hub.html'; });
    mainItems.appendChild(button);
  }
  function bindLoginFallback() {
    const button=document.getElementById('loginBtn');
    if(!button || window.ALJAVA_GLOBAL_DASHBOARD || button.dataset.aljavaFallback==='1') return;
    button.dataset.aljavaFallback='1';
    button.addEventListener('click', () => {
      if(typeof window.ALJAVA_ADMIN_LOGIN==='function') window.ALJAVA_ADMIN_LOGIN();
    });
  }
  function schedule(){
    addBusinessHubEntry();
    setTimeout(addBusinessHubEntry,300);
    setTimeout(addBusinessHubEntry,1000);
    setTimeout(bindLoginFallback,1200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
})();
