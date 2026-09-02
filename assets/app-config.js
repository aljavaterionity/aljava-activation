/* ALJAVA TERIONITY — Shared client configuration */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw',
    activationBaseUrl: 'https://aljava-activation.vercel.app/',
    defaultBusinessUnitSlug: 'kartu-google-review'
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

  // Phase 1 keeps the existing Google Review Card operation as the default
  // operational context. Business switching will be added only after the
  // scoped authorization layer is ready; modules must not invent a client
  // supplied business id.
  window.ALJAVA_BUSINESS_CONTEXT = Object.freeze({
    defaultSlug: CONFIG.defaultBusinessUnitSlug,
    async getDefaultUnitId() {
      const client = window.__ALJAVA_SUPABASE_CLIENT;
      if (!client) throw new Error('Supabase client belum siap.');
      const { data, error } = await client
        .from('business_units')
        .select('id,slug,status,unit_type')
        .eq('slug', CONFIG.defaultBusinessUnitSlug)
        .eq('status', 'active')
        .eq('unit_type', 'business')
        .single();
      if (error) throw error;
      return data.id;
    }
  });
})();
