/* SaveSystem + progression.
 *
 * Profile is per browser (localStorage). Every reward is earned in play —
 * there are no purchases with real money and nothing that can be bought
 * changes how dangerous an entity is.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const KEY = 'nightwatch-profile-v1';

  const RANK_XP = (r) => Math.round(250 * Math.pow(r - 1, 1.35));
  const RANK_TITLES = ['Trainee', 'Field Assistant', 'Investigator', 'Senior Investigator', 'Specialist', 'Lead Investigator', 'Archivist', 'Night Warden', 'Protocol Officer', 'Director'];

  function defaults() {
    const stock = {}, tiers = {};
    NW.EQUIPMENT.forEach((e) => { stock[e.id] = e.starter || 0; tiers[e.id] = 0; });
    return {
      v: 1, name: 'Investigator ' + Math.floor(100 + Math.random() * 900),
      credits: 150, xp: 0, missions: 0, solved: 0, deaths: 0,
      stock, tiers, unlocked: { cosmetics: ['suit:slate', 'torch:warm', 'badge:none'] },
      cosmetics: { suit: 'slate', torch: 'warm', badge: 'none', suitColor: '#4a5866', torchColor: '#ffe6bf' },
      settings: { sens: 1, vol: 0.8, music: 0.6, fov: 72, quality: 'high', invert: false, mic: false, unlockAll: false, showFps: false, serverUrl: '' },
      history: [], lastLocation: 'observatory', lastDifficulty: 'training', lastLoadout: null, seenTutorial: false
    };
  }

  const Save = {
    data: null,
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      const def = defaults();
      this.data = d ? Object.assign(def, d, { settings: Object.assign(def.settings, d.settings || {}), cosmetics: Object.assign(def.cosmetics, d.cosmetics || {}), stock: Object.assign(def.stock, d.stock || {}), tiers: Object.assign(def.tiers, d.tiers || {}) }) : def;
      return this.data;
    },
    persist() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage blocked: progress lives for this session only */ } },
    reset() { this.data = defaults(); this.persist(); },

    rank() { let r = 1; while (r < 50 && this.data.xp >= RANK_XP(r + 1)) r++; return r; },
    rankTitle(r) { return RANK_TITLES[Math.min(RANK_TITLES.length - 1, r - 1)]; },
    rankProgress() { const r = this.rank(); const a = RANK_XP(r), b = RANK_XP(r + 1); return { rank: r, cur: this.data.xp - a, need: b - a }; },
    canUse(rankReq) { return this.data.settings.unlockAll || this.rank() >= (rankReq || 1); },

    buy(type) {
      const e = NW.EQUIPMENT_BY_ID[type];
      if (!e || this.data.credits < e.price || !this.canUse(e.rank)) return false;
      this.data.credits -= e.price; this.data.stock[type] = (this.data.stock[type] || 0) + 1; this.persist(); return true;
    },
    sell(type) {
      const e = NW.EQUIPMENT_BY_ID[type];
      if (!e || (this.data.stock[type] || 0) <= 0) return false;
      this.data.stock[type]--; this.data.credits += Math.floor(e.price / 2); this.persist(); return true;
    },
    upgrade(type) {
      const e = NW.EQUIPMENT_BY_ID[type];
      const cur = this.data.tiers[type] || 0;
      const next = e && e.tiers && e.tiers[cur + 1];
      if (!next || this.data.credits < next.cost || !this.canUse(next.rank)) return false;
      this.data.credits -= next.cost; this.data.tiers[type] = cur + 1; this.persist(); return true;
    },
    buyCosmetic(cat, id) {
      const c = NW.COSMETICS[cat].find((x) => x.id === id);
      const key = cat + ':' + id;
      if (!c) return false;
      if (this.data.unlocked.cosmetics.indexOf(key) < 0) {
        if (this.data.credits < c.price || !this.canUse(c.rank)) return false;
        this.data.credits -= c.price; this.data.unlocked.cosmetics.push(key);
      }
      this.data.cosmetics[cat] = id;
      if (cat === 'suit') this.data.cosmetics.suitColor = c.color;
      if (cat === 'torch') this.data.cosmetics.torchColor = c.color;
      this.persist(); return true;
    },
    ownsCosmetic(cat, id) { return this.data.unlocked.cosmetics.indexOf(cat + ':' + id) >= 0; },

    /** Loadout = what goes into the field unit; limited by stock. Personal radios are free. */
    defaultLoadout() {
      const l = {};
      NW.EQUIPMENT.forEach((e) => { if (e.id !== 'radio') l[e.id] = Math.min(this.data.stock[e.id] || 0, e.id === 'motion' ? 3 : e.id === 'tablets' ? 4 : 2); });
      return l;
    },

    /** Apply a mission result for this player. Returns a summary for the results screen. */
    applyResult(result, myId) {
      const me = result.perPlayer[myId] || { credits: 0, xp: 0, alive: false, lostTypes: [] };
      const before = this.rank();
      this.data.credits += me.credits; this.data.xp += me.xp; this.data.missions++;
      if (result.correct) this.data.solved++;
      if (!me.alive) this.data.deaths++;
      const lost = {};
      // only the host's loadout leaves the profile stock in solo; in co-op everyone brings their own stock nominally
      for (const t of (me.lostTypes || []).concat(result.reason === 'all_down' ? result.lostItems || [] : [])) {
        if ((this.data.stock[t] || 0) > 0) { this.data.stock[t]--; lost[t] = (lost[t] || 0) + 1; }
      }
      this.data.history.unshift({ at: Date.now(), loc: result.location, diff: result.difficulty, entity: result.entity, correct: result.correct, alive: me.alive, credits: me.credits });
      this.data.history = this.data.history.slice(0, 20);
      this.persist();
      return { credits: me.credits, xp: me.xp, alive: me.alive, rankUp: this.rank() > before, rank: this.rank(), lost };
    }
  };
  NW.Save = Save;
})();
