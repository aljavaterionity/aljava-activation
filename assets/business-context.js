/* ALJAVA TERIONITY — Business context compatibility helper */
(() => {
  'use strict';

  const client = window.__ALJAVA_SUPABASE_CLIENT;
  if (!client) return;

  const STORAGE_KEY = 'aljava.active_business_unit';

  function requestedUnitId() {
    try {
      return new URLSearchParams(window.location.search).get('business_unit_id') || null;
    } catch (_) {
      return null;
    }
  }

  const existing = window.ALJAVA_BUSINESS_CONTEXT;

  // app-config.js is the canonical business-context implementation.
  // Preserve its scoped client, unit list, listeners and helper methods.
  if (existing && typeof existing.load === 'function' && typeof existing.set === 'function') {
    const originalLoad = existing.load.bind(existing);
    const originalSet = existing.set.bind(existing);

    existing.load = async () => {
      const ctx = await originalLoad();
      const requested = requestedUnitId();
      if (requested && Array.isArray(ctx?.units)) {
        const target = ctx.units.find((u) => String(u.id) === String(requested));
        if (target && String(ctx.active?.id) !== String(target.id)) {
          originalSet(target.id);
          return { active: existing.active, units: existing.units };
        }
      }
      return ctx;
    };

    existing.set = (unitOrId) => {
      const unitId = typeof unitOrId === 'object' ? unitOrId?.id : unitOrId;
      if (!unitId) return existing.active;
      return originalSet(unitId);
    };
    return;
  }

  // Legacy fallback for pages that load this helper without app-config.js.
  let active = null;
  let units = [];
  let loading = null;
  const listeners = new Set();

  async function load() {
    if (loading) return loading;
    loading = (async () => {
      const { data, error } = await client.rpc('get_my_business_units');
      if (error) throw error;
      units = Array.isArray(data) ? data.filter((u) => u.status === 'active' && u.unit_type === 'business') : [];
      const requested = requestedUnitId();
      const saved = localStorage.getItem(STORAGE_KEY);
      active = units.find((u) => String(u.id) === String(requested))
        || units.find((u) => String(u.id) === String(saved))
        || units[0]
        || null;
      if (active) localStorage.setItem(STORAGE_KEY, active.id);
      listeners.forEach((fn) => fn(active, units.slice()));
      return { active, units: units.slice() };
    })().finally(() => { loading = null; });
    return loading;
  }

  function set(unitOrId) {
    const unitId = typeof unitOrId === 'object' ? unitOrId?.id : unitOrId;
    const next = units.find((u) => String(u.id) === String(unitId));
    if (!next) throw new Error('Unit bisnis tidak tersedia untuk akun ini.');
    active = next;
    localStorage.setItem(STORAGE_KEY, next.id);
    listeners.forEach((fn) => fn(active, units.slice()));
    window.dispatchEvent(new CustomEvent('aljava:business-changed', { detail: { businessUnit: active } }));
    return active;
  }

  window.ALJAVA_BUSINESS_CONTEXT = {
    defaultSlug: window.ALJAVA_CONFIG?.defaultBusinessUnitSlug || 'kartu-google-review',
    get active() { return active; },
    get units() { return units.slice(); },
    load,
    set,
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async getSelectedUnitId() {
      if (!active) await load();
      return active?.id || null;
    },
    async getDefaultUnitId() {
      if (!active) await load();
      return active?.id || null;
    }
  };
})();
