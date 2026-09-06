/* ALJAVA TERIONITY — compact Sales Workspace period filter */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let installed=false, outsideBound=false;
const PERIOD_LABELS={today:'Today','7':'7 Days','30':'30 Days',month:'This Month',all:'All Time'};
function loadCss(){if($('aljavaSalesPeriodPocketCss'))return;const l=document.createElement('link');l.id='aljavaSalesPeriodPocketCss';l.rel='stylesheet';l.href='/assets/sales-period-pocket.css?v=20260907-1';document.head.appendChild(l)}
function syncLabel(wrap){const active=wrap.querySelector('.period-btn.active');const toggle=wrap.querySelector('.sw-period-pocket-toggle');if(!toggle)return;const key=active?.dataset.period||'all';toggle.querySelector('.sw-period-pocket-label').textContent=PERIOD_LABELS[key]||'Periode';const custom=wrap.querySelector('#swStart')?.value||wrap.querySelector('#swEnd')?.value;toggle.dataset.custom=custom?'1':'0'}
function closePopover(wrap){wrap.classList.remove('open');wrap.querySelector('.sw-period-pocket-toggle')?.setAttribute('aria-expanded','false')}
function togglePopover(wrap){wrap.classList.toggle('open');wrap.querySelector('.sw-period-pocket-toggle')?.setAttribute('aria-expanded',wrap.classList.contains('open')?'true':'false')}
function wire(wrap){
 if(wrap.dataset.pocketReady==='1')return;
 wrap.dataset.pocketReady='1';
 const buttons=[...wrap.querySelectorAll('.period-btn')];
 const fields=[$('swStart'),$('swEnd')].filter(Boolean);
 const apply=$('swApplyPeriod');
 wrap.innerHTML='';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='sw-period-pocket-toggle';toggle.setAttribute('aria-haspopup','menu');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span class="sw-period-pocket-label">All Time</span><span class="sw-period-pocket-chevron" aria-hidden="true">⌄</span>';
 const pop=document.createElement('div');pop.className='sw-period-pocket-popover';pop.setAttribute('role','menu');
 const options=document.createElement('div');options.className='sw-period-pocket-options';buttons.forEach(b=>{b.classList.remove('active');b.classList.add('sw-period-pocket-option');b.setAttribute('role','menuitem');options.appendChild(b)});
 pop.appendChild(options);
 if(fields.length||apply){
   const custom=document.createElement('div');custom.className='sw-period-pocket-custom';
   const heading=document.createElement('div');heading.className='sw-period-pocket-custom-title';heading.textContent='Rentang khusus';custom.appendChild(heading);
   const row=document.createElement('div');row.className='sw-period-pocket-custom-row';fields.forEach(f=>row.appendChild(f));if(apply)row.appendChild(apply);custom.appendChild(row);pop.appendChild(custom);
 }
 wrap.append(toggle,pop);
 toggle.addEventListener('click',e=>{e.stopPropagation();togglePopover(wrap)});
 options.querySelectorAll('.period-btn').forEach(b=>b.addEventListener('click',()=>{setTimeout(()=>{syncLabel(wrap);closePopover(wrap)},0)}));
 fields.forEach(f=>f.addEventListener('input',()=>{toggle.dataset.custom='1'}));
 apply?.addEventListener('click',()=>setTimeout(()=>{syncLabel(wrap);closePopover(wrap)},0));
 syncLabel(wrap);installed=true;
 if(!outsideBound){outsideBound=true;document.addEventListener('click',e=>{document.querySelectorAll('#salesWorkspaceView .sales-period.sw-period-pocket.open').forEach(w=>{if(!w.contains(e.target))closePopover(w)})});document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('#salesWorkspaceView .sales-period.sw-period-pocket.open').forEach(closePopover)})}
}
function install(){const wrap=document.querySelector('#salesWorkspaceView .sales-period');if(!wrap)return false;if(wrap.dataset.pocketReady==='1')return true;wrap.classList.add('sw-period-pocket');loadCss();wire(wrap);return true}
const obs=new MutationObserver(()=>{if(!install())return});
function boot(){if(install())return;obs.observe(document.body,{childList:true,subtree:true});window.setTimeout(()=>{install();obs.disconnect()},5000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hashchange',()=>window.setTimeout(install,0));
document.addEventListener('aljava:sales-workspace-ready',()=>window.setTimeout(install,0));
})();
