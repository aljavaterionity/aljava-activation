/* ALJAVA TERIONITY — Shared client configuration */
(() => {
  'use strict';
  const CONFIG = Object.freeze({ supabaseUrl:'https://lbzwmcxwxummitldxucj.supabase.co', supabaseKey:'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw', activationBaseUrl:'https://aljava-activation.vercel.app/', defaultBusinessUnitSlug:'kartu-google-review' });
  window.ALJAVA_CONFIG = CONFIG;
  if (window.supabase?.createClient && !window.__ALJAVA_SUPABASE_CLIENT) {
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    const sharedClient = originalCreateClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    window.__ALJAVA_SUPABASE_CLIENT = sharedClient;
    window.supabase.createClient = (url,key,options) => url===CONFIG.supabaseUrl && key===CONFIG.supabaseKey ? sharedClient : originalCreateClient(url,key,options);
  }
  const client=window.__ALJAVA_SUPABASE_CLIENT;
  const STORAGE_KEY='aljava.active_business_unit';
  const SCOPED_TABLES=new Set(['Product','Cards','Transactions','Subscriptions','Sales','admin_card_actions','CardScans']);
  let units=[],active=null,loading=null; const listeners=new Set();
  const normalizeBusinessUnit=(unit)=>({...unit,id:unit?.id||unit?.business_unit_id||null,name:unit?.name||unit?.business_name||unit?.business_slug||'Unit Bisnis',slug:unit?.slug||unit?.business_slug||null,status:unit?.status||unit?.business_status||null,unit_type:unit?.unit_type||'business',role:unit?.role||unit?.role_code||null,membership_status:unit?.membership_status||null});
  const context={
    defaultSlug:CONFIG.defaultBusinessUnitSlug,
    get active(){return active;}, get units(){return units.slice();},
    async load(){
      if(!client)throw new Error('Supabase client belum siap.'); if(loading)return loading;
      loading=(async()=>{const {data,error}=await client.rpc('get_my_business_units');if(error)throw error;units=Array.isArray(data)?data.map(normalizeBusinessUnit).filter(u=>u.status==='active'&&u.unit_type==='business'&&u.id):[];const saved=localStorage.getItem(STORAGE_KEY);active=units.find(u=>String(u.id)===String(saved))||units[0]||null;if(active)localStorage.setItem(STORAGE_KEY,active.id);listeners.forEach(fn=>fn(active,units.slice()));return{active,units:units.slice()};})().finally(()=>{loading=null;});return loading;
    },
    set(unitId){const next=units.find(u=>String(u.id)===String(unitId));if(!next)throw new Error('Unit bisnis tidak tersedia untuk akun ini.');active=next;localStorage.setItem(STORAGE_KEY,next.id);listeners.forEach(fn=>fn(active,units.slice()));window.dispatchEvent(new CustomEvent('aljava:business-changed',{detail:{businessUnit:active}}));return active;},
    subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
    async getSelectedUnitId(){if(!active)await context.load();return active?.id||null;},
    async getDefaultUnitId(){if(!active)await context.load();if(active)return active.id;const {data,error}=await client.from('business_units').select('id,slug,status,unit_type').eq('slug',CONFIG.defaultBusinessUnitSlug).eq('status','active').eq('unit_type','business').single();if(error)throw error;return data.id;}
  };
  window.ALJAVA_BUSINESS_CONTEXT=context;
  if(client&&!client.__ALJAVA_BUSINESS_SCOPE_PATCHED){
    const originalFrom=client.from.bind(client);
    const wrapBuilder=(builder,table,mode='select')=>new Proxy(builder,{get(target,prop,receiver){
      if(prop==='then')return(resolve,reject)=>{Promise.resolve(context.getSelectedUnitId()).then(id=>{const bypass=window.__ALJAVA_GLOBAL_SCOPE_BYPASS===true;if(id&&!bypass&&SCOPED_TABLES.has(table)&&mode!=='insert'&&mode!=='upsert'&&typeof target.eq==='function')return target.eq('business_unit_id',id);return target;}).then(query=>query.then(resolve,reject),reject)};
      const value=Reflect.get(target,prop,receiver);if(typeof value!=='function')return value;return(...args)=>{const nextMode=prop==='insert'?'insert':prop==='upsert'?'upsert':prop==='update'?'update':prop==='delete'?'delete':mode;const result=value.apply(target,args);if(result&&typeof result==='object'&&SCOPED_TABLES.has(table))return wrapBuilder(result,table,nextMode);return result;};
    }});
    client.from=(table)=>{const builder=originalFrom(table);return SCOPED_TABLES.has(table)?wrapBuilder(builder,table):builder;};client.__ALJAVA_BUSINESS_SCOPE_PATCHED=true;
  }
  function injectSwitcher(){if(document.body?.dataset.aljavaGlobalDashboard==='true')return;if(!client||document.getElementById('aljavaBusinessContext'))return;const host=document.querySelector('.top');if(!host)return;const box=document.createElement('div');box.id='aljavaBusinessContext';box.className='aljava-business-context';box.innerHTML='<label for="aljavaBusinessSelect">Unit Bisnis</label><select id="aljavaBusinessSelect" class="field"><option value="">Memuat...</option></select>';host.appendChild(box);const select=document.getElementById('aljavaBusinessSelect');const render=(current,available)=>{const list=Array.isArray(available)?available:units;select.innerHTML=list.length?list.map(u=>`<option value="${String(u.id).replace(/"/g,'&quot;')}">${String(u.name||u.slug||'Unit Bisnis').replace(/[&<>]/g,'')}</option>`).join(''):'<option value="">Tidak ada unit bisnis</option>';if(current)select.value=current.id;select.disabled=list.length<=1;};context.subscribe(render);select.addEventListener('change',()=>{try{context.set(select.value);location.reload();}catch(error){window.alert(error.message);}});context.load().catch(error=>{select.innerHTML='<option value="">Gagal memuat unit</option>';select.disabled=true;console.error('Business context:',error);});}
  function loadErpCore(){if(document.body?.dataset.aljavaGlobalDashboard==='true')return;if(document.querySelector('script[data-aljava-erp-core]'))return;const script=document.createElement('script');script.src='/assets/erp-core.js';script.async=true;script.dataset.aljavaErpCore='1';document.body.appendChild(script);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{injectSwitcher();loadErpCore();},{once:true});else{injectSwitcher();loadErpCore();}
})();
