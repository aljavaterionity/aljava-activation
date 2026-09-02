/* ALJAVA TERIONITY — Business context helper */
(() => {
  'use strict';
  const client = window.__ALJAVA_SUPABASE_CLIENT;
  if (!client) return;

  const STORAGE_KEY = 'aljava.active_business_unit';
  let active = null;
  const listeners = new Set();

  async function load() {
    const { data, error } = await client.rpc('get_my_business_units');
    if (error) throw error;
    const units = Array.isArray(data) ? data.filter((u) => u.status === 'active' && u.unit_type === 'business') : [];
    const saved = localStorage.getItem(STORAGE_KEY);
    active = units.find((u) => u.id === saved) || units[0] || null;
    if (active) localStorage.setItem(STORAGE_KEY, active.id);
    listeners.forEach((fn) => fn(active, units));
    return { active, units };
  }

  function set(unit) {
    if (!unit?.id) return;
    active = unit;
    localStorage.setItem(STORAGE_KEY, unit.id);
    listeners.forEach((fn) => fn(active, []));
    window.dispatchEvent(new CustomEvent('aljava:business-changed', { detail: { businessUnit: active } }));
  }

  window.ALJAVA_BUSINESS_CONTEXT = Object.assign(window.ALJAVA_BUSINESS_CONTEXT || {}, {
    get active() { return active; },
    load,
    set,
    subscribe(fn) { if (typeof fn === 'function') listeners.add(fn); return () => listeners.delete(fn); }
  });
})();
