/* Save system (3 slots + autosave, migration, quota handling) and progression (money, XP, levels, followers, reputation,
   achievements, daily/weekly challenges, buffs, notifications). Everything else emits events through GR.Prog.event(). */
'use strict';
GR.Save = (() => {
  const U = GR.U, KEY = 'gr2000_slot_', META = 'gr2000_meta', SET = 'gr2000_settings';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return e; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  const mem = {}; // fallback when storage blocked
  function fresh(starter, name, app, outfit) {
    const D = GR.Data, st = starter || D.STARTERS[0];
    const owned = new Set();
    const o = JSON.parse(JSON.stringify(outfit || st.outfit));
    [o.top, o.bottom, o.shoes, ...Object.values(o.acc || {})].forEach(x => x && owned.add(x.id + '|' + x.c));
    // a few free basics so the wardrobe isn't empty
    ['t_tee_basicbro|0', 't_tee_basicbro|1', 'b_gymshorts_basicbro|1', 'b_jeans_basicbro|0', 's_sneaker_basicbro|0', 't_tank_basicbro|1'].forEach(k => owned.add(k));
    const a = JSON.parse(JSON.stringify(app || st.app));
    return {
      v: 3, created: Date.now(), played: 0, name: name || st.name.split(' ')[0], starter: st.id, app: a, outfit: o, outfits: [{ name: 'Starter Fit', outfit: JSON.parse(JSON.stringify(o)) }],
      money: st.stats.money, lifetimeMoney: st.stats.money, xp: 0, level: 1, energy: 100, followers: st.stats.followers, rep: st.stats.rep, tokens: 3, baseMuscle: a.muscle,
      time: 8.0, weather: 'sunny', weatherT: 6, zone: 'apartment', pos: null,
      owned: { clothes: Array.from(owned), hair: [a.hair], facial: [a.facialHair || 'none'], emotes: D.EMOTES.filter(e => e.unlock === 'start').map(e => e.id), cosmetics: [], presets: [], furniture: [], collectibles: {}, consumables: { v_bar: 2, v_water: 2 }, trophies: [] },
      apt: { items: [
        { uid: U.uid(), id: 'bed_double', c: 1, x: -6.0, z: -3.6, ry: Math.PI / 2 }, { uid: U.uid(), id: 'nightstand', c: 0, x: -7.9, z: -6.2, ry: 0 },
        { uid: U.uid(), id: 'sofa_modern', c: 0, x: -5.5, z: 1.8, ry: 0 }, { uid: U.uid(), id: 'tvstand', c: 0, x: -5.5, z: 5.9, ry: Math.PI },
        { uid: U.uid(), id: 'desk_gaming', c: 0, x: 1.5, z: -6.2, ry: 0 }, { uid: U.uid(), id: 'gamechair', c: 0, x: 1.5, z: -5.2, ry: Math.PI },
        { uid: U.uid(), id: 'rug_rect', c: 1, x: -5.5, z: 3.8, ry: 0 }, { uid: U.uid(), id: 'plant_monstera', c: 0, x: -8.3, z: 6.3, ry: 0 }, { uid: U.uid(), id: 'poster_city', c: 0, x: -3.0, z: -6.93, ry: 0, wall: true }
      ] },
      stats: { workouts: 0, machines: {}, sRanks: 0, clothesBought: 0, haircuts: 0, skincare: 0, posts: 0, videos: 0, sponsorsDone: 0, comps: 0, wins: 0, compTypes: [], legendWins: 0, talks: 0, groupEmotes: 0, furnPlaced: 0, vending: 0, mystery: 0, distance: 0, buckets: 0, meals: 0, dailiesDone: 0, weekliesDone: 0, sleeps: 0, mirrorSelfies: 0, visitedList: ['apartment'], outfitsSaved: 0, bestPlace: {}, totalLikes: 0, streams: 0 },
      ach: {}, challenges: { day: -1, daily: [], week: -1, weekly: [], weekMachines: [], weekVisits: [] },
      social: { posts: [], notif: [], feedSeed: 1, trending: [] },
      msgs: { threads: {}, unread: {} },
      sponsors: { active: [], done: [], offered: [], declined: [] },
      friends: {}, comp: { season: 1, points: 0, history: [], seasonDay: 0, unlockedTier: 0, rivals: {} },
      buffs: [], tut: { step: 0, done: false }, flags: {}
    };
  }
  function deepFill(dst, src) { for (const k in src) { if (dst[k] === undefined) dst[k] = JSON.parse(JSON.stringify(src[k])); else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && typeof dst[k] === 'object') deepFill(dst[k], src[k]); } return dst; }
  function meta() { try { return JSON.parse(store.get(META) || '{}'); } catch (e) { return {}; } }
  function setMeta(m) { store.set(META, JSON.stringify(m)); }
  function slotInfo(i) { const raw = store.get(KEY + i) || mem[KEY + i]; if (!raw) return null; try { const s = JSON.parse(raw); return { name: s.name, level: s.level, money: s.money, followers: s.followers, played: s.played, saved: s.saved, zone: s.zone, day: Math.floor(s.time / 24) + 1, starter: s.starter }; } catch (e) { return { corrupt: true }; } }
  function load(i) {
    const raw = store.get(KEY + i) || mem[KEY + i]; if (!raw) return null;
    try { const s = JSON.parse(raw); deepFill(s, fresh()); s.slot = i; return s; }
    catch (e) { const bak = store.get(KEY + i + '_bak'); if (bak) { try { const s = JSON.parse(bak); deepFill(s, fresh()); s.slot = i; return s; } catch (e2) { } } return null; }
  }
  let lastSave = 0, pending = null;
  function save(s, force) {
    if (!s) return false; s.saved = Date.now();
    try { if (GR.Game && GR.Game.P && GR.state === s && GR.Game.mode === 'play' && !GR.Mini.active && !(GR.Comp && GR.Comp.active)) { const P = GR.Game.P; s.pos = { zone: GR.World.current, x: P.pos.x, y: P.pos.y, z: P.pos.z, ry: P.facing }; } } catch (e) { }
    let json = JSON.stringify(s);
    const prev = store.get(KEY + s.slot); if (prev) store.set(KEY + s.slot + '_bak', prev);
    let r = store.set(KEY + s.slot, json);
    if (r !== true) {
      // quota: drop images from oldest posts and retry
      const posts = s.social.posts; for (let i = posts.length - 1; i >= 0 && r !== true; i--) { if (posts[i].img) { posts[i].img = null; json = JSON.stringify(s); store.del(KEY + s.slot + '_bak'); r = store.set(KEY + s.slot, json); } }
      if (r !== true) { mem[KEY + s.slot] = json; GR.UI && GR.UI.toast('⚠️ Browser storage is full or blocked — progress kept for this session only.', 'warn'); return false; }
    }
    const m = meta(); m.last = s.slot; setMeta(m); lastSave = performance.now();
    return true;
  }
  function autosave(s) { if (performance.now() - lastSave > 4000) save(s); else { clearTimeout(pending); pending = setTimeout(() => save(s), 4000); } }
  function del(i) { store.del(KEY + i); store.del(KEY + i + '_bak'); delete mem[KEY + i]; }
  const DEFAULT_SET = { quality: 'auto', resScale: 1, music: 0.55, sfx: 0.8, dialogue: 0.8, mute: false, sens: 1, invertY: false, fov: 60, fps: false, fullscreen: false, keys: { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', jump: 'Space', interact: 'KeyE', phone: 'KeyF', inventory: 'KeyI', emote: 'KeyB', map: 'KeyM', pause: 'Escape', camera: 'KeyC' }, shadows: true, bloom: true, mirrors: true, npcDensity: 1, hints: true, assist: 'relaxed' };
  function settings() { let s = {}; try { s = JSON.parse(store.get(SET) || '{}'); } catch (e) { } return deepFill(s, DEFAULT_SET); }
  function saveSettings(s) { store.set(SET, JSON.stringify(s)); }
  return { fresh, load, save, autosave, del, slotInfo, meta, settings, saveSettings, DEFAULT_SET };
})();

GR.Prog = (() => {
  const U = GR.U, D = GR.Data;
  const S = () => GR.state;
  function notify(txt, icon = '🔔', kind = 'info', toast = true) {
    const s = S(); if (!s) return;
    s.social.notif.unshift({ t: s.time, txt, icon, kind, read: false }); if (s.social.notif.length > 80) s.social.notif.length = 80;
    if (toast && GR.UI) GR.UI.toast(icon + ' ' + txt, kind);
    GR.Bus.emit('notif', { txt, icon, kind });
  }
  function addMoney(n, why) { const s = S(); n = Math.round(n); s.money += n; if (n > 0) s.lifetimeMoney += n; GR.Bus.emit('money', { n, why }); if (n > 0 && GR.UI) GR.UI.floatText('+' + U.money(n), '#7cff6b'); check(); return n; }
  function spend(n) { const s = S(); if (s.money < n) { GR.UI && GR.UI.toast('💸 Not enough money (need ' + U.money(n) + ')', 'warn'); GR.Audio && GR.Audio.sfx('error'); return false; } s.money -= n; GR.Bus.emit('money', { n: -n }); GR.Audio && GR.Audio.sfx('cash'); return true; }
  function xpMult() { return hasBuff('xp') ? 1.25 : 1; }
  function addXP(n) {
    const s = S(); n = Math.round(n * xpMult()); s.xp += n; if (GR.UI) GR.UI.floatText('+' + n + ' XP', '#5ff0ff');
    while (s.xp >= D.xpForLevel(s.level)) { s.xp -= D.xpForLevel(s.level); s.level++; levelUp(s.level); }
    GR.Bus.emit('xp', { n }); check();
  }
  function levelUp(l) {
    const s = S(); GR.Audio && GR.Audio.sfx('levelup');
    const unlocked = D.EMOTES.filter(e => e.unlock === 'level' && e.lvl <= l && !s.owned.emotes.includes(e.id));
    unlocked.forEach(e => s.owned.emotes.push(e.id));
    const bonus = 50 + l * 25; s.money += bonus; s.lifetimeMoney += bonus;
    notify(`LEVEL UP! You're now level ${l}. +${U.money(bonus)}${unlocked.length ? ' • Unlocked: ' + unlocked.map(e => e.n).join(', ') : ''}`, '⬆️', 'big');
    if (GR.UI) GR.UI.banner('LEVEL ' + l, 'Main character development unlocked');
    GR.Bus.emit('levelup', { l });
    if (GR.Sponsors) GR.Sponsors.checkOffers();
  }
  function addFollowers(n, why) { const s = S(); n = Math.round(n * (n > 0 && hasBuff('hype') ? 1.5 : 1)); s.followers = Math.max(0, s.followers + n); if (n > 0 && GR.UI && Math.abs(n) >= 5) GR.UI.floatText('+' + U.kfmt(n) + ' followers', '#ff9ec7'); GR.Bus.emit('followers', { n, why }); if (GR.Sponsors) GR.Sponsors.checkOffers(); check(); }
  function addRep(n) { const s = S(); s.rep = Math.max(0, s.rep + Math.round(n)); if (n > 0 && GR.UI) GR.UI.floatText('+' + Math.round(n) + ' rep', '#ffd23f'); GR.Bus.emit('rep', { n }); if (GR.Sponsors) GR.Sponsors.checkOffers(); check(); }
  function stat(k, inc = 1) { const s = S(); s.stats[k] = (s.stats[k] || 0) + inc; check(); }
  // ------------- buffs -------------
  function addBuff(type, hours = 1) { if (!type) return; const s = S(); const b = s.buffs.find(b => b.type === type); if (b) b.until = Math.max(b.until, s.time + hours); else s.buffs.push({ type, until: s.time + hours }); const nm = { xp: '+25% XP', focus: 'Wider timing windows', drip: '+Drip', hype: '+50% followers', pump: '+20% workout score' }[type]; notify('Buff active: ' + nm + ' (1 hr)', '✨', 'info'); }
  function hasBuff(type) { const s = S(); return !!(s && s.buffs.some(b => b.type === type && b.until > s.time)); }
  function tickBuffs() { const s = S(); s.buffs = s.buffs.filter(b => b.until > s.time); }
  // ------------- derived stats for achievements -------------
  function statVal(k) {
    const s = S(), st = s.stats;
    switch (k) {
      case 'machinesUsed': return Object.keys(st.machines).length;
      case 'wardrobeSize': return s.owned.clothes.length;
      case 'followers': return s.followers; case 'level': return s.level; case 'lifetimeMoney': return s.lifetimeMoney;
      case 'compTypes': return st.compTypes.length; case 'visited': return st.visitedList.length;
      case 'emotesUnlocked': return s.owned.emotes.length; case 'dancesUnlocked': return s.owned.emotes.filter(e => (D.emote(e) || {}).dance).length;
      case 'trophies': return s.owned.trophies.length; case 'collectibles': return Object.keys(s.owned.collectibles).length;
      case 'maxFriend': return Math.max(0, ...Object.values(s.friends).map(f => f.lvl || 0));
      default: return st[k] || 0;
    }
  }
  let checking = false;
  function check() {
    const s = S(); if (!s || checking) return; checking = true;
    for (const a of D.ACHIEVEMENTS) if (!s.ach[a.id] && statVal(a.stat) >= a.gte) { s.ach[a.id] = Date.now(); s.money += a.reward; s.lifetimeMoney += a.reward; notify(`Achievement: ${a.n} — ${a.d} (+${U.money(a.reward)})`, a.icon, 'ach'); GR.Audio && GR.Audio.sfx('achievement'); GR.Bus.emit('achievement', a); }
    checking = false;
  }
  // ------------- challenges -------------
  function rollChallenges(force) {
    const s = S(), day = Math.floor(s.time / 24), week = Math.floor(day / 7), C = s.challenges;
    const mk = (t, salt) => { const r = U.rng(t.id + salt); const n = Math.round(U.lerp(t.n[0], t.n[1], r())); return { id: t.id, t: t.t.replace('{n}', n), evt: t.evt, filter: t.filter || null, n, prog: 0, r: t.r + Math.round(n / t.n[1] * t.r * 0.3), done: false }; };
    if (C.day !== day || force) { C.day = day; C.daily = U.shuffle(D.CHALLENGES.daily).slice(0, 3).map(t => mk(t, day + (s.created % 997))); if (!force) notify('New daily challenges are live! Check the Challenges app.', '📅', 'info'); }
    if (C.week !== week || force) { C.week = week; C.weekly = U.shuffle(D.CHALLENGES.weekly).slice(0, 3).map(t => mk(t, 'w' + week)); C.weekMachines = []; C.weekVisits = []; if (!force && day > 0) notify('New weekly challenges! Bigger rewards inside.', '🗓️', 'info'); }
  }
  function matchFilter(f, data) {
    if (!f) return true;
    if (f === 'cardio') return ['treadmill', 'bike', 'rower'].includes(data.machine);
    if (f === 'gym') return data.zone === 'gym';
    if (['S', 'A', 'B'].includes(f)) return 'SAB'.slice(0, 'SAB'.indexOf(f) + 1).includes(data.grade);
    if (f === 'drink') return data.type === 'drink';
    if (f === 'dance') return !!data.dance;
    return data.type === f || data.kind === f;
  }
  function event(evt, data = {}) {
    const s = S(); if (!s) return;
    data.zone = data.zone || GR.World.current;
    const C = s.challenges;
    // derived events
    const extra = [];
    if (evt === 'workout') { if (!C.weekMachines.includes(data.machine)) { C.weekMachines.push(data.machine); extra.push(['machine_new_week', 1]); } }
    if (evt === 'visit') { if (!C.weekVisits.includes(data.id)) { C.weekVisits.push(data.id); extra.push(['visit_new_week', 1]); } }
    const amount = data.amount || 1;
    [...C.daily, ...C.weekly].forEach(ch => {
      if (ch.done) return; let inc = 0;
      if (ch.evt === evt && matchFilter(ch.filter, data)) inc = amount;
      extra.forEach(([e, n]) => { if (ch.evt === e) inc += n; });
      if (!inc) return; ch.prog = Math.min(ch.n, ch.prog + inc);
      if (ch.prog >= ch.n) { ch.done = true; const weekly = C.weekly.includes(ch); addMoney(ch.r); addXP(weekly ? 150 : 50); stat(weekly ? 'weekliesDone' : 'dailiesDone'); notify(`Challenge complete: ${ch.t} (+${U.money(ch.r)})`, weekly ? '🗓️' : '✅', 'ach'); GR.Audio && GR.Audio.sfx('achievement'); }
    });
    if (GR.Sponsors) GR.Sponsors.onEvent(evt, data);
    GR.Bus.emit('evt:' + evt, data);
    if (GR.Save && !data.noSave) GR.Save.autosave(s);
  }
  return { notify, addMoney, spend, addXP, addFollowers, addRep, stat, addBuff, hasBuff, tickBuffs, check, statVal, rollChallenges, event };
})();
