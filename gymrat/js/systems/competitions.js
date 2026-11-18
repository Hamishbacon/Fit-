/* Mog-Off competitions at Aura Arena: Gym Showdown, Runway Riot (fashion), Dance Battle, Aura Check, Clout Clash (social),
   Squad Relay (group). Tiers, intros, judges + commentary, crowd reactions, scoreboard, rewards, trophies, seasons. */
'use strict';
GR.Comp = (() => {
  const U = GR.U, D = GR.Data;
  const S = () => GR.state;
  let C = null; // active competition
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- DRIP SCORE (fashion judging; also used by wardrobe + social) ---------------- */
  function pieces(outfit) { const out = []; ['top', 'bottom', 'shoes'].forEach(k => { const x = outfit[k]; if (x) { const it = D.item(x.id); if (it) out.push({ it, col: GR.Char.itemColor(it, x.c), main: true }); } }); Object.values(outfit.acc || {}).forEach(x => { const it = D.item(x.id); if (it) out.push({ it, col: GR.Char.itemColor(it, x.c), main: false }); }); return out; }
  function dripScore(outfit, theme) {
    const ps = pieces(outfit), main = ps.filter(p => p.main), acc = ps.filter(p => !p.main);
    const hsl = main.map(p => U.hsl(p.col));
    // coordination: neutrals + 1-2 hues harmonise; analogous or complementary hues score well
    const chroma = hsl.filter(h => h[1] > 0.25 && h[2] > 0.12 && h[2] < 0.9);
    let coord = 70; if (chroma.length >= 2) { const ds = []; for (let i = 0; i < chroma.length; i++) for (let j = i + 1; j < chroma.length; j++) { let d = Math.abs(chroma[i][0] - chroma[j][0]); d = Math.min(d, 360 - d); ds.push(d); } const good = ds.filter(d => d < 35 || (d > 150 && d < 210)).length; coord = 55 + good / ds.length * 40 - (chroma.length > 2 ? 8 : 0); } else coord = chroma.length === 1 ? 82 : 74;
    const vibes = new Set(main.map(p => p.it.tags[0])); if (vibes.size === 1) coord += 8; if (vibes.size >= 3) coord -= 6;
    // colour play
    const hues = new Set(chroma.map(h => Math.round(h[0] / 40))); let colour = hues.size === 2 ? 88 : hues.size === 1 ? 72 : hues.size === 3 ? 76 : 60; colour += Math.min(10, chroma.reduce((a, h) => a + h[1], 0) * 4);
    // accessories: 1-3 ideal, metals matching bonus
    let accS = acc.length === 0 ? 35 : acc.length <= 3 ? 70 + acc.length * 8 : 85 - (acc.length - 3) * 8; const metals = acc.filter(a => ['#e8c45a', '#d9d9de', '#c48b6a'].includes(a.col)); if (metals.length >= 2 && new Set(metals.map(m => m.col)).size === 1) accS += 6;
    // theme
    let th = 60;
    if (theme) {
      const tags = ps.flatMap(p => p.it.tags); const hit = theme.tags.length ? ps.filter(p => p.it.tags.some(t => theme.tags.includes(t))).length / ps.length : 0;
      th = theme.tags.length ? 40 + hit * 60 : 60;
      if (theme.mono) { const hs = main.map(p => U.hsl(p.col)); const spread = Math.max(...hs.map(h => h[0])) - Math.min(...hs.map(h => h[0])); const neutral = hs.every(h => h[1] < 0.2); th = neutral ? 92 : spread < 30 ? 95 : spread < 60 ? 70 : 40; }
      if (theme.clash) th = Math.min(100, 50 + hues.size * 15);
      if (ps.some(p => p.it.exclusive)) th += 6;
    }
    if (GR.Prog.hasBuff('drip')) { coord += 5; colour += 5; }
    const cl = v => Math.round(U.clamp(v, 0, 100));
    const r = { coord: cl(coord), colour: cl(colour), acc: cl(accS), theme: cl(th) };
    r.total = cl(r.coord * 0.3 + r.colour * 0.2 + r.acc * 0.2 + r.theme * 0.3);
    return r;
  }

  /* ---------------- REGISTRATION ---------------- */
  function unlockedTier() { const s = S(); let t = 0; D.TIERS.forEach((T, i) => { if (s.rep >= T.rep) t = i; }); s.comp.unlockedTier = t; return t; }
  function open() {
    if (GR.World.current !== 'arena') { GR.UI.toast('🎤 Head to Aura Arena (Entertainment District) to enter the Mog-Off.'); return; }
    const s = S(), ut = unlockedTier();
    const p = GR.UI.open('compreg', { title: '🎤 MOG-OFF REGISTRATION', cls: 'wide', html: '' });
    let tier = ut;
    const render = () => {
      const T = D.TIERS[tier];
      p.querySelector('.pb').innerHTML = `<p>Season ${s.comp.season} • Your reputation: <b>${s.rep}</b> • Season points: <b>${s.comp.points}</b></p>
        <div class="tabs">${D.TIERS.map((t, i) => `<button class="${i === tier ? 'on' : ''}" data-t="${i}" ${i > ut ? 'disabled' : ''}>${t.n}${i > ut ? ' 🔒 ' + t.rep + ' rep' : ''}</button>`).join('')}</div>
        <p>Entry ${T.fee ? U.money(T.fee) : 'FREE'} • Prizes: 🥇 ${U.money(T.prize[0])} 🥈 ${U.money(T.prize[1])} 🥉 ${U.money(T.prize[2])} • 1st place exclusive: <b>${U.esc(T.item)}</b>${T.item2 ? ' + ' + U.esc(T.item2) : ''}</p>
        <div class="grid">${Object.entries(D.COMP_TYPES).map(([k, c]) => { const today = s.comp.history.filter(h => h.type === k && h.day === Math.floor(s.time / 24) + 1).length; return `<button class="card" data-c="${k}"><div class="ico">${c.icon}</div><b>${c.n}</b><small>${U.esc(c.desc)}</small><small class="muted">Judged on: ${c.judges.join(', ')}${today ? ' • entered today ×' + today + ' (reduced prize)' : ''}</small></button>`; }).join('')}</div>`;
      p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tier = +b.dataset.t; render(); });
      p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (T.fee && !GR.Prog.spend(T.fee)) return; GR.UI.close(); run(b.dataset.c, tier); });
    };
    render();
  }

  /* ---------------- RUN ---------------- */
  async function run(type, tier) {
    const s = S(), G = GR.Game, z = GR.World.Z, T = D.TIERS[tier];
    C = { type, tier, T, scores: [], step: 'intro', diff: T.diff };
    G.lockPlayer(true); G.pushUI(); GR.UI.showHUD(false); GR.Audio.music('arena');
    GR.NPC.fillCrowd(Math.round(26 * Math.min(1.2, GR.Game.quality === 'low' ? 0.5 : 1)), false);
    // contestants
    const rivals = []; const castRivals = D.CAST.filter(c => (c.rival || s.comp.rivals[c.id]) && Math.random() < 0.7).slice(0, 2);
    castRivals.forEach(c => rivals.push({ name: c.name, title: c.title, app: c.app, outfit: c.outfit, skill: U.clamp(T.diff + 0.06 + U.rand(-0.05, 0.05), 0.3, 0.98), cast: c.id }));
    const r = U.rng('rv' + s.time);
    while (rivals.length < 3) { const n = U.rpick(r, D.RIVAL_NAMES); if (rivals.some(x => x.name === n)) continue; rivals.push({ name: n, title: U.rpick(r, ['Rising Star', 'Gym Prodigy', 'Fashion Menace', 'Viral Dancer', 'Aura Merchant', 'Local Legend']), app: GR.NPC.randomApp(r), outfit: GR.NPC.randomOutfit(r, U.pick(['street', 'sport', 'retro', 'luxury'])), skill: U.clamp(T.diff + U.rand(-0.12, 0.05), 0.25, 0.97) }); }
    C.rivals = rivals;
    rivals.forEach((rv, i) => { const ch = GR.NPC.makeChar(rv.app, rv.outfit, 1); G.scene.add(ch.root); const m = z.stageMarks[i + 1]; ch.root.position.set(m.x, m.y, m.z); ch.root.rotation.y = 0; rv.char = ch; ch.anim.play('cross'); });
    C.updateChars = dt => rivals.forEach(rv => rv.char && rv.char.update(dt, { near: true }));
    // player on stage
    const pm = z.stageMarks[0]; G.P.pos.set(pm.x, pm.y, pm.z); G.player.root.position.copy(G.P.pos); G.P.facing = 0; G.player.root.rotation.y = 0;
    const host = GR.NPC.castById('olu');
    try {
      await intro(type, T, rivals, host);
      let res;
      if (type === 'gym') res = await roundGym();
      else if (type === 'fashion') res = await roundFashion();
      else if (type === 'dance') res = await roundDance();
      else if (type === 'aura') res = await roundAura();
      else if (type === 'social') res = await roundSocial();
      else res = await roundGroup();
      await judging(res);
    } catch (e) { console.error(e); }
    cleanup();
  }
  function shot(pos, look, dur = 0.8, fov = 50) { GR.Game.camTo({ pos, look, dur, fov }); }
  function stageCam(dist = 9, h = 3) { const z = GR.World.Z; shot(new THREE.Vector3(z.ox, h, -12 + dist), new THREE.Vector3(z.ox, 1.9, -12), 1.0, 50); }
  function card(html, ms = 2600) { const c = document.getElementById('compcard'); c.innerHTML = html; c.hidden = false; c.classList.add('in'); return wait(ms).then(() => { c.classList.remove('in'); }); }
  function cardHide() { const c = document.getElementById('compcard'); c.hidden = true; c.classList.remove('in'); }
  async function intro(type, T, rivals, host) {
    const z = GR.World.Z, CT = D.COMP_TYPES[type];
    shot(new THREE.Vector3(z.ox + 14, 7, 10), new THREE.Vector3(z.ox, 2, -10), 1.4, 55);
    if (host) { host.char.root.position.set(z.ox + 9, 1.22, -10); host.char.root.rotation.y = -0.9; host.char.anim.play('talk'); host.char.prop('mic', true); GR.NPC.bark(host, `Welcome to ${T.n}! Tonight: ${CT.n}!`, 3); }
    GR.Audio.sfx('cheer'); GR.NPC.crowdReact('cheer'); screen([T.n.toUpperCase(), CT.icon + ' ' + CT.n.toUpperCase(), 'SEASON ' + S().comp.season]);
    await card(`<div class="cc-t">${CT.icon} ${CT.n}</div><div class="cc-s">${T.n}</div><div class="cc-j">Judged on: ${CT.judges.join(' • ')}</div>`, 3000);
    // contestant intros
    const all = [{ name: S().name, title: 'Main Character', char: GR.Game.player, me: true }, ...rivals];
    for (let i = 0; i < all.length; i++) { const c = all[i], m = z.stageMarks[i]; shot(new THREE.Vector3(m.x, 2.4, m.z + 3.2), new THREE.Vector3(m.x, 2.4, m.z), 0.5, 45); c.char.anim.play(c.me ? U.pick(['flex', 'peace', 'mewing']) : U.pick(['flex', 'stare', 'cross', 'yawn', 'point', 'heart']), { restart: true }); if (c.me) GR.Audio.sfx('cheer'); await card(`<div class="cc-t">${U.esc(c.name)}</div><div class="cc-s">${U.esc(c.title)}${c.me ? ` • Lv ${S().level} • ${U.kfmt(S().followers)} followers` : ''}</div>`, 1500); }
    if (host) GR.NPC.bark(host, U.pick(['Let\'s get it!', 'Contestants, LOCK IN!', 'Aura check… begin!']), 2);
    cardHide();
  }
  // NPC criteria scores around their skill
  const npcCrit = (sk, n = 4) => Array.from({ length: n }, () => Math.round(U.clamp((sk + U.rand(-0.12, 0.1)) * 100, 15, 99)));

  /* ---- Gym Showdown ---- */
  async function roundGym() {
    const z = GR.World.Z, G = GR.Game, types = ['dumbbell', 'punch', 'pushup', 'squat'];
    const t = U.pick(types); const m = GR.Props.machine(t); const pm = z.stageMarks[0];
    m.g.position.set(pm.x, 1.22, pm.z - 0.6); z.group.add(m.g); m.world = { zone: 'arena', x: pm.x, z: pm.z - 0.6, ry: 0, y: 1.22 };
    await card(`<div class="cc-t">🏋️ ${D.MACHINES[t].n}</div><div class="cc-s">Highest performance wins</div>`, 1800); cardHide();
    const targetSkill = Math.max(...C.rivals.map(r => r.skill));
    const res = await new Promise(resolve => { GR.Game.popUI(); GR.Mini.startWorkout(t, m, { comp: { diff: C.diff, target: Math.round(targetSkill * 100) + '% accuracy', done: r => { GR.Game.pushUI(); resolve(r); } } }); });
    z.group.remove(m.g);
    const acc = res ? res.acc : 0; const comb = res ? Math.min(1, res.combo / 12) : 0; const perf = res ? res.perfect / Math.max(1, res.reps + 2) : 0;
    const crit = [Math.round(U.clamp(res ? res.reps / (D.MACHINES[t].reps || 10) : 0, 0, 1) * 100), Math.round(acc * 100), Math.round(U.clamp(perf * 1.6, 0, 1) * 100), Math.round(U.clamp(acc * 0.7 + comb * 0.3, 0, 1) * 100)];
    G.P.pos.set(pm.x, pm.y, pm.z); G.player.root.position.copy(G.P.pos); G.P.facing = 0; G.player.root.rotation.y = 0;
    C.rivals.forEach(rv => { rv.char.anim.play(D.MACHINES[t].anim, { p: 0 }); });
    return { crit };
  }
  /* ---- Runway Riot ---- */
  async function roundFashion() {
    const s = S(), theme = U.pick(D.FASHION_THEMES), G = GR.Game, z = GR.World.Z; C.theme = theme;
    screen(['THEME:', theme.n.toUpperCase()]);
    await card(`<div class="cc-t">👟 THEME: ${U.esc(theme.n)}</div><div class="cc-s">${U.esc(theme.d)}</div><div class="cc-j">60 seconds to style your fit from your wardrobe.</div>`, 2800); cardHide();
    shot(new THREE.Vector3(z.stageMarks[0].x, 2.6, z.stageMarks[0].z + 3), new THREE.Vector3(z.stageMarks[0].x, 2.2, z.stageMarks[0].z), 0.6, 50);
    await new Promise(resolve => {
      GR.Game.popUI(); let left = 60;
      GR.Shops.wardrobe({ onClose: () => { clearInterval(iv); GR.Game.pushUI(); resolve(); } });
      const iv = setInterval(() => { left--; const h = document.querySelector('[data-id="wardrobe"] h2'); if (h) h.textContent = `👔 STYLE FOR "${theme.n}" — ${left}s`; if (left <= 0) { clearInterval(iv); GR.UI.closeId('wardrobe'); } }, 1000);
    });
    // runway walk
    const R = z.runway; G.P.pos.set(R.x, R.y, R.z1); G.player.root.position.copy(G.P.pos); G.P.facing = 0; G.player.root.rotation.y = 0;
    shot(new THREE.Vector3(R.x + 3, 2.4, R.z2 + 5), new THREE.Vector3(R.x, 2.0, R.z1), 0.8, 45);
    G.P.walkStyle = 'mog'; const t0 = performance.now(); GR.Audio.sfx('cheer');
    await new Promise(res => { const step = () => { const k = Math.min(1, (performance.now() - t0) / 5000); G.P.pos.z = U.lerp(R.z1, R.z2 - 0.5, k); G.player.root.position.copy(G.P.pos); G.player.update(1 / 60, { speed: 1.3 }); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    G.P.walkStyle = 'normal';
    // pose pick
    const pose = await pickEmote('Strike your final pose!', e => ['pose', 'gym', 'dance', 'taunt', 'celebrate'].includes(e.cat));
    G.player.anim.play(pose, { restart: true }); GR.Audio.sfx('shutter'); GR.NPC.crowdReact('cheer');
    shot(new THREE.Vector3(R.x, 2.2, R.z2 + 2.5), new THREE.Vector3(R.x, 2.0, R.z2 - 0.5), 0.4, 40);
    await wait(2000);
    const d = dripScore(s.outfit, theme), aura = (D.emote(pose) || {}).aura || 1;
    C.rivals.forEach(rv => { const o = GR.NPC.randomOutfit(U.rng(rv.name + s.time), U.pick(theme.tags.length ? theme.tags : ['street'])); rv.outfit = o; rv.char.setOutfit(o); const dd = dripScore(o, theme); rv.crit = [dd.coord, dd.theme, dd.acc, dd.colour].map(v => Math.round(U.clamp(v * (0.75 + rv.skill * 0.35) + U.rand(-6, 6), 10, 99))); });
    return { crit: [d.coord, Math.min(100, d.theme + aura * 2), d.acc, d.colour] };
  }
  /* ---- Dance Battle (4-lane rhythm) ---- */
  async function roundDance() {
    const dance = await pickEmote('Choose your dance', e => e.dance);
    const e = D.emote(dance), G = GR.Game;
    G.player.anim.play(dance, { restart: true });
    stageCam(7, 2.6);
    GR.Audio.music('dance', { restart: true, bpm: e.bpm || 120 });
    const res = await rhythm({ bpm: e.bpm || 120, dur: 22, lanes: 4, title: '🕺 ' + e.n });
    G.player.anim.stop();
    const variety = Math.min(1, S().owned.emotes.filter(x => (D.emote(x) || {}).dance).length / 8);
    return { crit: [Math.round(res.acc * 100), Math.round(U.clamp(res.maxCombo / 25, 0, 1) * 100), Math.round(U.clamp(0.55 + (e.aura || 0) * 0.08 + variety * 0.2, 0, 1) * 100), Math.round(U.clamp(res.holds, 0, 1) * 100)] };
  }
  /* ---- Aura Check ---- */
  async function roundAura() {
    const owned = D.EMOTES.filter(e => S().owned.emotes.includes(e.id) && !e.walk && !e.group);
    const combo = [];
    for (let i = 0; i < 5; i++) { const id = await pickEmote(`Build your aura combo: move ${i + 1}/5 (variety = creativity)`, e => !e.walk && !e.group, combo); combo.push(id); }
    stageCam(6, 2.4);
    let timing = 0;
    for (let i = 0; i < combo.length; i++) { GR.Game.player.anim.play(combo[i], { restart: true, dur: 2.2 }); const q = await ringPrompt(`${i + 1}/5 — ${D.emote(combo[i]).n}`); timing += q; if (q > 0.7) { GR.NPC.crowdReact('cheer'); GR.Audio.sfx('cheer'); } await wait(500); }
    const unique = new Set(combo).size, auraSum = combo.reduce((a, id) => a + ((D.emote(id) || {}).aura || 1), 0);
    const tim = timing / combo.length;
    return { crit: [Math.round(U.clamp(unique / 5 * 0.7 + auraSum / 25 * 0.3, 0, 1) * 100), Math.round(tim * 100), 100, Math.round(U.clamp(tim * 0.6 + auraSum / 20 * 0.4, 0, 1) * 100)] };
  }
  /* ---- Clout Clash ---- */
  async function roundSocial() {
    const theme = U.pick(D.SOCIAL_THEMES), s = S(), z = GR.World.Z;
    await card(`<div class="cc-t">📱 THEME: ${U.esc(theme.n)}</div><div class="cc-s">Stage a post: pose, lighting, filter and hashtags.</div>`, 2400); cardHide();
    const pose = await pickEmote('Pick your pose', e => ['pose', 'gym', 'celebrate', 'taunt', 'dance'].includes(e.cat));
    GR.Game.player.anim.play(pose, { restart: true });
    const pm = z.stageMarks[0]; shot(new THREE.Vector3(pm.x, 2.3, pm.z + 2.6), new THREE.Vector3(pm.x, 2.2, pm.z), 0.5, 45);
    const tags = await new Promise(resolve => { let picked = []; const p = GR.UI.open('ctags', { title: '#️⃣ PICK UP TO 4 HASHTAGS', cls: 'small', noPush: true, html: `<div class="chips">${U.shuffle(D.HASHTAGS).map(t => `<button class="chip" data-t="${t}">${t}</button>`).join('')}</div><button class="btn go" id="ctgo">Post it</button>` }); p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t; if (picked.includes(t)) picked = picked.filter(x => x !== t); else if (picked.length < 4) picked.push(t); b.classList.toggle('on', picked.includes(t)); }); p.querySelector('#ctgo').onclick = () => { GR.UI.closeId('ctags'); resolve(picked); }; });
    GR.Audio.sfx('shutter'); const fl = document.getElementById('flash'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 120);
    await wait(400);
    const img = GR.Game.capture(GR.Game.camera, 240, 240).toDataURL('image/jpeg', 0.7);
    await card(`<img class="shot" src="${img}"><div class="cc-s">${tags.join(' ')}</div><div class="cc-j">Live audience voting…</div>`, 2600);
    const match = tags.filter(t => theme.tags.includes(t)).length, trend = tags.filter(t => GR.Social.trending().some(x => x.toLowerCase().includes(t.slice(1)))).length;
    const d = dripScore(s.outfit), aura = (D.emote(pose) || {}).aura || 1;
    C.socialImg = img;
    return { crit: [Math.round(U.clamp(0.35 + match * 0.22, 0, 1) * 100), d.total, Math.round(U.clamp(0.5 + aura * 0.1, 0, 1) * 100), Math.round(U.clamp(0.3 + (match + trend) * 0.15 + Math.min(tags.length, 4) * 0.05, 0, 1) * 100)] };
  }
  /* ---- Squad Relay ---- */
  async function roundGroup() {
    const s = S(), z = GR.World.Z;
    const friends = Object.entries(s.friends).sort((a, b) => b[1].pts - a[1].pts).slice(0, 2).map(([id]) => D.CAST.find(c => c.id === id)).filter(Boolean);
    while (friends.length < 2) friends.push({ name: U.pick(D.RIVAL_NAMES), app: GR.NPC.randomApp(Math.random), outfit: GR.NPC.randomOutfit(Math.random, 'sport'), id: null });
    C.team = friends.map(f => ({ name: f.name, skill: U.clamp(C.diff + (f.id && s.friends[f.id] ? s.friends[f.id].lvl * 0.03 : -0.05) + U.rand(-0.05, 0.05), 0.2, 0.98) }));
    await card(`<div class="cc-t">👥 YOUR SQUAD</div><div class="cc-s">${U.esc(friends.map(f => f.name).join(' & '))} + you</div><div class="cc-j">Your rhythm leg anchors the team.</div>`, 2600); cardHide();
    stageCam(7, 2.6); GR.Game.player.anim.play('d_hype');
    GR.Audio.music('dance', { restart: true, bpm: 128 });
    const res = await rhythm({ bpm: 128, dur: 18, lanes: 2, title: '👥 ANCHOR LEG' });
    GR.Game.player.anim.stop();
    const teamAvg = C.team.reduce((a, t) => a + t.skill, 0) / C.team.length;
    return { crit: [Math.round(U.clamp((res.acc + teamAvg) / 2, 0, 1) * 100), Math.round(res.acc * 100), Math.round(teamAvg * 100), Math.round(U.clamp(res.maxCombo / 20, 0, 1) * 100)], team: true };
  }

  /* ---------------- sub-games ---------------- */
  function pickEmote(title, filt, used = []) {
    return new Promise(resolve => {
      const s = S(); const list = D.EMOTES.filter(e => s.owned.emotes.includes(e.id) && filt(e));
      if (!list.length) { resolve('flex'); return; }
      const p = GR.UI.open('pickem', { title: '😎 ' + title, cls: 'small', noPush: true, html: `<div class="grid">${list.map(e => `<button class="card ${used.includes(e.id) ? 'lock' : ''}" data-e="${e.id}"><b>${U.esc(e.n)}</b><small>${e.cat}${e.aura ? ' • aura ' + e.aura : ''}${used.includes(e.id) ? ' • used' : ''}</small></button>`).join('')}</div>` });
      p.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { GR.UI.closeId('pickem'); resolve(b.dataset.e); });
    });
  }
  function ringPrompt(label) {
    return new Promise(resolve => {
      const cv = document.getElementById('mini'); const cx = cv.getContext('2d'); cv.hidden = false; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const t0 = performance.now(), dur = 1600 / (0.8 + C.diff * 0.4); let done = false;
      const fin = q => { if (done) return; done = true; off(); cx.clearRect(0, 0, innerWidth, innerHeight); cv.hidden = true; GR.Audio.sfx(q > 0.8 ? 'perfect' : q > 0.4 ? 'good' : 'miss'); resolve(q); };
      const off = GR.Input.onKey(code => { if (code !== 'Space') return false; const k = (performance.now() - t0) / dur; const q = Math.max(0, 1 - Math.abs(k - 0.75) / 0.25); fin(q); return true; });
      const draw = () => { if (done) return; const k = (performance.now() - t0) / dur; if (k > 1.1) { fin(0); return; } const w = innerWidth, h = innerHeight; cx.clearRect(0, 0, w, h); cx.fillStyle = 'rgba(12,10,24,0.7)'; cx.beginPath(); cx.arc(w / 2, h * 0.7, 90, 0, 7); cx.fill(); cx.strokeStyle = '#2ecc71'; cx.lineWidth = 8; cx.beginPath(); cx.arc(w / 2, h * 0.7, 40, 0, 7); cx.stroke(); cx.strokeStyle = '#ffd23f'; cx.lineWidth = 6; cx.beginPath(); cx.arc(w / 2, h * 0.7, Math.max(4, 40 + (0.75 - k) * 160), 0, 7); cx.stroke(); cx.fillStyle = '#fff'; cx.font = '700 16px Rubik'; cx.textAlign = 'center'; cx.fillText(label, w / 2, h * 0.7 - 110); cx.fillText('SPACE when the rings meet', w / 2, h * 0.7 + 118); requestAnimationFrame(draw); };
      draw();
    });
  }
  function rhythm({ bpm, dur, lanes, title }) {
    return new Promise(resolve => {
      const cv = document.getElementById('mini'); const cx = cv.getContext('2d'); cv.hidden = false; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const keys = lanes === 4 ? ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'] : ['KeyA', 'KeyD'], glyph = lanes === 4 ? ['◀', '▼', '▲', '▶'] : ['A', 'D'];
      const beat = 60 / bpm, notes = []; let t = -2, spawn = 0, hits = 0, judged = 0, acc = 0, combo = 0, maxCombo = 0, holdsOk = 0, holdsN = 0, fx = [], last = performance.now(), done = false;
      for (let b = 0; b < dur / beat; b++) { const tt = b * beat; if (Math.random() < 0.75 || b % 2 === 0) { const hold = lanes === 4 && Math.random() < 0.08; notes.push({ t: tt, lane: Math.floor(Math.random() * lanes), hold, done: false }); if (hold) holdsN++; } }
      const judge = (q) => { judged++; if (q > 0) { hits++; combo++; maxCombo = Math.max(maxCombo, combo); acc += q; } else combo = 0; fx.push({ t: 0, txt: q >= 1 ? 'PERFECT' : q > 0.6 ? 'GREAT' : q > 0 ? 'OK' : 'MISS', c: q >= 1 ? '#5ff0ff' : q > 0.6 ? '#7cff6b' : q > 0 ? '#ffd23f' : '#ff5a5a' }); GR.Audio.sfx(q >= 1 ? 'perfect' : q > 0 ? 'good' : 'miss'); if (q >= 1 && combo % 8 === 0) GR.NPC.crowdReact('cheer'); };
      const off = GR.Input.onKey((code, e) => { const li = keys.indexOf(code); if (li < 0) return false; if (e.repeat) return true; let best = null, bd = 0.2; notes.forEach(n => { if (n.done || n.lane !== li) return; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }); if (best) { best.done = true; const q = bd < 0.05 ? 1 : bd < 0.1 ? 0.75 : 0.45; judge(q); if (best.hold) holdsOk++; } else judge(0); return true; });
      const draw = () => {
        if (done) return; const now = performance.now(), dt = (now - last) / 1000; last = now; t += dt;
        notes.forEach(n => { if (!n.done && t - n.t > 0.2) { n.done = true; judge(0); } });
        const w = innerWidth, h = innerHeight, lw = 80, lx = w / 2 - lanes * lw / 2, top = h * 0.15, hit = h * 0.8, speed = (hit - top) / 1.6;
        cx.clearRect(0, 0, w, h); cx.fillStyle = 'rgba(12,10,24,0.65)'; cx.fillRect(lx - 10, top - 30, lanes * lw + 20, hit - top + 90);
        for (let i = 0; i < lanes; i++) { cx.fillStyle = ['#ff4fa333', '#28e0ff33', '#7cff6b33', '#ffd23f33'][i]; cx.fillRect(lx + i * lw + 4, top, lw - 8, hit - top + 30); cx.fillStyle = '#fff'; cx.font = '900 26px Rubik'; cx.textAlign = 'center'; cx.fillText(glyph[i], lx + i * lw + lw / 2, hit + 62); }
        cx.fillStyle = '#fff'; cx.fillRect(lx, hit - 2, lanes * lw, 4);
        notes.forEach(n => { if (n.done) return; const y = hit - (n.t - t) * speed; if (y < top - 20 || y > hit + 40) return; cx.fillStyle = ['#ff4fa3', '#28e0ff', '#7cff6b', '#ffd23f'][n.lane]; cx.beginPath(); cx.arc(lx + n.lane * lw + lw / 2, y, n.hold ? 24 : 18, 0, 7); cx.fill(); cx.fillStyle = '#111'; cx.font = '900 18px Rubik'; cx.fillText(glyph[n.lane], lx + n.lane * lw + lw / 2, y + 7); });
        cx.fillStyle = '#fff'; cx.font = '800 18px "Bungee", Rubik'; cx.fillText(title + `  •  ${Math.max(0, Math.ceil(dur - t))}s  •  x${combo}`, w / 2, top - 40);
        fx.forEach(f => { f.t += dt; cx.globalAlpha = Math.max(0, 1 - f.t); cx.fillStyle = f.c; cx.font = '900 30px Bungee, Rubik'; cx.fillText(f.txt, w / 2, h * 0.45 - f.t * 40); cx.globalAlpha = 1; }); fx = fx.filter(f => f.t < 1);
        if (t >= dur + 0.4) { done = true; off(); cx.clearRect(0, 0, w, h); cv.hidden = true; resolve({ acc: judged ? acc / Math.max(judged, notes.length) : 0, maxCombo, holds: holdsN ? holdsOk / holdsN : 0.7 }); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
  }

  /* ---------------- JUDGING & RESULTS ---------------- */
  async function judging(res) {
    const s = S(), z = GR.World.Z, CT = D.COMP_TYPES[C.type], judges = GR.NPC.list.filter(n => n.judge);
    // NPC rival scores
    C.rivals.forEach(rv => { rv.crit = rv.crit || npcCrit(rv.skill); rv.total = Math.round(rv.crit.reduce((a, b) => a + b, 0) / 4); });
    const mine = Math.round(res.crit.reduce((a, b) => a + b, 0) / 4);
    shot(new THREE.Vector3(z.ox, 2.4, 9.5), new THREE.Vector3(z.ox, 1.6, 6.5), 0.8, 45);
    let lineSet = mine >= 85 ? 'great' : mine >= 68 ? 'good' : mine >= 50 ? 'meh' : 'bad';
    for (let i = 0; i < judges.length; i++) { const j = judges[i]; const sc = Math.round(U.clamp(res.crit[i % 4] / 10 + U.rand(-0.6, 0.6), 1, 10)); j.char.anim.play(sc >= 8 ? 'clap' : sc >= 6 ? 'thumbs' : 'facepalm', { dur: 2 }); GR.NPC.bark(j, `${sc}/10 — ${U.pick(D.JUDGE_LINES[lineSet])}`, 3); await wait(1300); }
    // scoreboard
    const board = [{ name: s.name, total: mine, crit: res.crit, me: true }, ...C.rivals.map(r => ({ name: r.name, total: r.total, crit: r.crit }))].sort((a, b) => b.total - a.total);
    const place = board.findIndex(b => b.me) + 1;
    screen(['RESULTS', ...board.map((b, i) => `${i + 1}. ${b.name.slice(0, 14)}  ${b.total}`)]);
    stageCam(8, 3);
    GR.Audio.sfx(place === 1 ? 'cheer' : place <= 3 ? 'cheer' : 'boo'); GR.NPC.crowdReact(place <= 2 ? 'cheer' : 'boo');
    const T = C.T; const todayN = s.comp.history.filter(h => h.type === C.type && h.day === Math.floor(s.time / 24) + 1).length; const rep = todayN ? 0.5 : 1;
    const money = place <= 3 ? Math.round(T.prize[place - 1] * rep) : Math.round(T.prize[2] * 0.25 * rep), xp = Math.round(T.xp * (place === 1 ? 1 : place === 2 ? 0.7 : place === 3 ? 0.5 : 0.3)), repGain = place <= 3 ? T.rep_gain[place - 1] : 4, fol = place <= 3 ? T.followers[place - 1] : 5;
    const bd = `<div class="board">${board.map((b, i) => `<div class="br ${b.me ? 'me' : ''}"><span class="pl">${['🥇', '🥈', '🥉', '4️⃣'][i]}</span><b>${U.esc(b.name)}</b><span class="crit">${CT.judges.map((j, k) => `<i title="${j}">${b.crit[k]}</i>`).join('')}</span><span class="tot">${b.total}</span></div>`).join('')}</div>`;
    const rewards = `<p class="hl">#${place} • +${U.money(money)} • +${xp} XP • +${repGain} rep • +${fol} followers${place <= 3 ? ' • 🏆 Trophy' : ''}</p>`;
    // payouts
    GR.Prog.addMoney(money); GR.Prog.addXP(xp); GR.Prog.addRep(repGain); GR.Prog.addFollowers(fol);
    s.stats.comps++; if (!s.stats.compTypes.includes(C.type)) s.stats.compTypes.push(C.type); if (!s.stats.bestPlace[C.type] || place < s.stats.bestPlace[C.type]) s.stats.bestPlace[C.type] = place;
    s.comp.points += [12, 8, 5, 2][place - 1] * (C.tier + 1);
    s.comp.history.unshift({ type: C.type, tier: C.tier, place, score: mine, day: Math.floor(s.time / 24) + 1 }); s.comp.history.length = Math.min(60, s.comp.history.length);
    const unlocks = [];
    if (place <= 3) { s.owned.trophies.push({ n: `${T.n} — ${CT.n} (#${place})`, tier: T.n, tierIdx: place === 1 ? Math.min(3, C.tier + 1) : place === 2 ? 1 : 0, type: C.type, place, day: Math.floor(s.time / 24) + 1 }); }
    if (place === 1) {
      s.stats.wins++; if (C.tier === 3) s.stats.legendWins++;
      [T.item, T.item2].filter(Boolean).forEach(nm => { const it = D.ITEMS.find(i => i.name === nm); if (it && !GR.Shops.owns(it.id, 0)) { GR.Shops.grant(it, 0, true); unlocks.push(it.name); } });
      if (C.type === 'aura') { const it = D.ITEMS.find(i => i.name === 'Aura Farmer Hoodie'); if (it && !GR.Shops.owns(it.id, 0)) { GR.Shops.grant(it, 0, true); unlocks.push(it.name); } }
      const compEm = D.EMOTES.filter(e => e.unlock === 'comp' && !s.owned.emotes.includes(e.id)); if (compEm.length) { s.owned.emotes.push(compEm[0].id); unlocks.push('Emote: ' + compEm[0].n); }
      GR.Prog.event('comp_win', { type: C.type });
    }
    if (place <= 3) GR.Prog.event('comp_place', { type: C.type, place });
    GR.Prog.event('comp', { type: C.type, place });
    const nt = unlockedTier(); if (nt > C.tier && !s.flags['tierNote' + nt]) { s.flags['tierNote' + nt] = 1; unlocks.push('New tier unlocked: ' + D.TIERS[nt].n); }
    GR.Prog.check();
    if (place === 1) { GR.Game.player.anim.play('trophy', { restart: true }); GR.UI.banner('🏆 WINNER: ' + s.name, T.n + ' • ' + CT.n); } else GR.Game.player.anim.play(place <= 3 ? 'bow' : 'shrug', { restart: true });
    C.rivals.forEach((rv, i) => rv.char.anim.play(board.findIndex(b => b.name === rv.name) === 0 ? 'victory' : U.pick(['clap', 'cry', 'shrug', 'facepalm']), { restart: true }));
    await new Promise(resolve => { const p = GR.UI.open('compres', { title: '🎤 RESULTS — ' + CT.n.toUpperCase(), cls: 'small', noPush: true, html: bd + rewards + (unlocks.length ? `<p>🔓 ${unlocks.map(U.esc).join('<br>🔓 ')}</p>` : '') + `<p class="muted">Judges: ${CT.judges.join(' • ')}</p><div class="row"><button class="btn go" id="cr_ok">Continue</button><button class="btn" id="cr_post">📸 Post highlight</button></div>` }); p.querySelector('#cr_ok').onclick = () => { GR.UI.closeId('compres'); resolve(); }; p.querySelector('#cr_post').onclick = () => { const img = C.socialImg || GR.Game.capture(GR.Game.camera, 300, 300).toDataURL('image/jpeg', 0.72); GR.Social.publish({ type: 'photo', img, caption: `#${place} at ${T.n} (${CT.n}) 🎤`, tags: ['#mogging', '#aura'], kind: 'comp', loc: 'arena' }); if (place === 1) GR.Prog.addFollowers(40); p.querySelector('#cr_post').disabled = true; }; });
    GR.Save.save(s);
  }
  function cleanup() {
    const G = GR.Game; cardHide(); if (C && C.rivals) C.rivals.forEach(rv => rv.char && rv.char.dispose());
    const z = GR.World.Z; G.P.pos.set(z.ox - 4, 0, 9); G.player.root.position.copy(G.P.pos); G.P.facing = Math.PI; G.player.anim.stop();
    const host = GR.NPC.castById('olu'); if (host) { host.char.root.position.set(z.ox - 9, 0, 17.1); host.char.root.rotation.y = Math.PI; host.char.prop('mic', false); host.char.anim.play('counter'); }
    GR.NPC.fillCrowd(8, false);
    G.camRelease(); G.lockPlayer(false); G.popUI(); GR.UI.showHUD(true); C = null; G.music(); screen(['MOG-OFF', 'AURA ARENA', 'REGISTER AT THE DESK']);
  }
  function screen(lines) { const z = GR.World.zones.arena; if (!z || !z.screen) return; const c = z.screen.canvas, x = c.getContext('2d'); x.fillStyle = '#120a22'; x.fillRect(0, 0, c.width, c.height); const g = x.createLinearGradient(0, 0, c.width, 0); g.addColorStop(0, '#7b61ff'); g.addColorStop(1, '#ff4fa3'); x.fillStyle = g; x.fillRect(0, 0, c.width, 8); x.fillRect(0, c.height - 8, c.width, 8); x.fillStyle = '#ffd23f'; x.textAlign = 'center'; lines.forEach((l, i) => { x.font = i === 0 ? 'bold 90px Impact, sans-serif' : 'bold 52px Impact, sans-serif'; x.fillStyle = i === 0 ? '#ffd23f' : '#fff'; x.fillText(l, c.width / 2, 110 + i * 70); }); z.screen.tex.needsUpdate = true; }
  function update(dt) { if (C && C.updateChars) C.updateChars(dt); }

  /* ---------------- SEASONS & LEADERBOARD ---------------- */
  function standings() {
    const s = S(); const day = Math.floor(s.time / 24) - (s.comp.seasonDay || 0);
    const rivals = D.CAST.filter(c => c.rival || c.pers === 'influencer' || c.id === 'marcus').map(c => ({ name: c.name, pts: Math.round((U.hash(c.id + s.comp.season) % 12 + 4) * (day + 1) * 0.9) }));
    D.RIVAL_NAMES.slice(0, 6).forEach(n => rivals.push({ name: n, pts: Math.round((U.hash(n + s.comp.season) % 10 + 2) * (day + 1) * 0.8) }));
    return [{ name: s.name + ' (you)', pts: s.comp.points, me: true }, ...rivals].sort((a, b) => b.pts - a.pts);
  }
  function newDay() {
    const s = S(); const day = Math.floor(s.time / 24); if (day - (s.comp.seasonDay || 0) >= 7) {
      const st = standings(); const rank = st.findIndex(x => x.me) + 1; const prize = rank === 1 ? 1500 : rank <= 3 ? 700 : rank <= 8 ? 250 : 80;
      GR.Prog.addMoney(prize); GR.Prog.addFollowers(Math.round(prize / 3)); GR.Prog.notify(`Season ${s.comp.season} ended! You finished #${rank}. +${U.money(prize)}`, '🏁', 'big');
      s.comp.season++; s.comp.points = 0; s.comp.seasonDay = day;
    }
    const z = GR.World.zones.arena; if (z && z.lbScreen) { const st = standings().slice(0, 4); const c = z.lbScreen.ctx; c.fillStyle = '#111'; c.fillRect(0, 0, 256, 160); c.fillStyle = '#28e0ff'; c.font = 'bold 18px monospace'; c.fillText('SEASON ' + s.comp.season, 10, 24); st.forEach((r, i) => { c.fillStyle = r.me ? '#ffd23f' : '#fff'; c.fillText(`${i + 1}.${r.name.slice(0, 12)} ${r.pts}`, 10, 54 + i * 26); }); z.lbScreen.tex.needsUpdate = true; }
  }
  function leaderboardPanel() { const s = S(); const st = standings(); GR.UI.open('lb', { title: '🏁 SEASON ' + s.comp.season + ' STANDINGS', cls: 'small', html: `<p class="muted">Season ends on day ${(s.comp.seasonDay || 0) + 8}. Points from every Mog-Off (higher tiers = more points).</p><table class="tbl">${st.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>#${i + 1}</td><td>${U.esc(r.name)}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>` }); }
  function phoneApp() { const s = S(), ut = unlockedTier(); return `<p>Season ${s.comp.season} • ${s.comp.points} pts • Rep ${s.rep}</p><h4>Tiers</h4>${D.TIERS.map((t, i) => `<div class="li">${i <= ut ? '🔓' : '🔒'} <b>${t.n}</b> <small>${t.rep} rep • entry ${t.fee ? U.money(t.fee) : 'free'} • 1st ${U.money(t.prize[0])}</small></div>`).join('')}<h4>Events (any time at Aura Arena)</h4>${Object.values(D.COMP_TYPES).map(c => `<div class="li">${c.icon} <b>${c.n}</b><small>${U.esc(c.desc)}</small></div>`).join('')}<h4>Standings</h4>${standings().slice(0, 6).map((r, i) => `<div class="li ${r.me ? 'new' : ''}">#${i + 1} ${U.esc(r.name)} <em>${r.pts}</em></div>`).join('')}<button class="btn sm go" data-goarena="1">📍 Set waypoint to Aura Arena</button>`; }
  function wirePhone(q, render) { q('[data-goarena]').forEach(b => b.onclick = () => { const m = GR.World.markers.find(m => m.id === 'arena'); GR.UI.waypoint = { x: m.x, z: m.z, name: m.name }; GR.UI.toast('📍 Waypoint set: Aura Arena'); }); }
  return { open, run, update, dripScore, newDay, leaderboardPanel, phoneApp, wirePhone, standings, get active() { return !!C; } };
})();
