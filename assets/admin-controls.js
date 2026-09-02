/* ALJAVA TERIONITY — admin controls + business hub entry
   Payment / receivable UI remains intentionally disabled.
   Business Foundation is exposed without changing existing operational flows. */
(() => {
  'use strict';

  window.adminControls = Object.freeze({
    showPayments() {
      console.warn('[ALJAVA] Manual payment UI is disabled; payment data remains untouched.');
    },
    loadPayments() {
      return Promise.resolve([]);
    }
  });

  function addBusinessHubEntry() {
    const panel = document.getElementById('menuPanel');
    const mainItems = panel?.querySelector('.menu-section > .menu-items');
    if (!mainItems || document.getElementById('businessHubMenu')) return;

    const button = document.createElement('button');
    button.id = 'businessHubMenu';
    button.type = 'button';
    button.className = 'menu-item';
    button.innerHTML = `
      <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M8 20v-6h8v6M3 20h18"/><path d="M12 4v16"/></svg></span>
      <span><b>Business Hub</b><small>Induk ALJAVA & unit usaha</small></span>
    `;
    button.addEventListener('click', () => {
      window.location.href = '/business-hub.html';
    });
    mainItems.appendChild(button);

    if (!document.getElementById('aljava-business-hub-menu-style')) {
      const style = document.createElement('style');
      style.id = 'aljava-business-hub-menu-style';
      style.textContent = `
        #menuPanel #businessHubMenu .menu-icon{background:linear-gradient(135deg,#0f766e,#14b8a6);box-shadow:0 8px 20px rgba(20,184,166,.20)}
        #menuPanel #businessHubMenu .menu-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      `;
      document.head.appendChild(style);
    }
  }

  function schedule() {
    addBusinessHubEntry();
    window.setTimeout(addBusinessHubEntry, 300);
    window.setTimeout(addBusinessHubEntry, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
