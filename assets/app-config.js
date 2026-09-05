/* ALJAVA TERIONITY — shared application core/configuration */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
    supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw',
    activationBaseUrl: 'https://aljava-activation.alpin011204.workers.dev/'
  });

  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
    : null;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
  }[char]));
  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value) || 0);

  window.ALJAVA_CONFIG = CONFIG;
  window.ALJAVA_CORE = Object.freeze({ CONFIG, supabase: supabaseClient, $, esc, money });
  window.__ALJAVA_SUPABASE_CLIENT = supabaseClient;
})();
