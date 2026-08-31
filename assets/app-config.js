/* ALJAVA TERIONITY — Shared client configuration */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw',
    activationBaseUrl: 'https://aljava-activation.vercel.app/'
  });

  window.ALJAVA_CONFIG = CONFIG;

  // Keep every admin module on the same Supabase client/session. Some modules
  // are loaded independently; re-creating a client before login can leave
  // that module with a stale auth state and cause Cards INSERT to hit RLS as
  // an unauthenticated request.
  if (window.supabase?.createClient && !window.__ALJAVA_SUPABASE_CLIENT) {
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    const sharedClient = originalCreateClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    window.__ALJAVA_SUPABASE_CLIENT = sharedClient;
    window.supabase.createClient = (url, key, options) => {
      if (url === CONFIG.supabaseUrl && key === CONFIG.supabaseKey) return sharedClient;
      return originalCreateClient(url, key, options);
    };
  }
})();
