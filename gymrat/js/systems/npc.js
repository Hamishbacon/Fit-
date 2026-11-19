/* NPCs: named cast with daily schedules, diverse generated pedestrians on a sidewalk graph, gym-goers using machines,
   shoppers, cafe customers, party dancers, arena crowds. Reactions to the player, speech-bubble barks, LOD + culling. */
'use strict';
GR.NPC = (() => {
  const U = GR.U, D = GR.Data, W = GR.World;
  let scene, list = [], density = 1, graph = null, bubbles = [], castPool = {}, genPool = [];
  const BARKS = {
    ped: ['Nice weather for a walk.', 'Have you tried the Mog Burger?', 'I\'m on a side quest.', 'Leg day was yesterday. I\'m still recovering.', 'That fit is clean!', 'Who even skips leg day?', 'I\'m late for my 3pm.', 'Is that the arena guy?', 'Hydrate or diedrate.', 'My step count is elite today.'],
    gym: ['One more rep!', 'Light weight, baby!', 'Spot me?', 'Mirror check.', 'Pump is insane today.', 'Bro is locked in.', 'Rest days are for the weak... I\'m kidding, rest is important.'],
    shop: ['These would go so hard with my cargos.', 'Is this in a medium?', 'I need this. I don\'t need this. I need this.', 'Fit check later?'],
    cafe: ['This oat latte slaps.', 'Working from cafe. Grindset.', 'Brunch is a lifestyle.'],
    react: ['W!', 'Okay we see you!', 'Main character behaviour!', 'Ayy!', 'The aura!', 'LET\'S GO!', 'Not chopped!', 'Iconic.', 'Do it again!'],
    bump: ['Watch it!', 'Bro, the sidewalk is huge.', 'Excuse YOU.', 'Rude!', 'NPC moment.'],
    drip: ['Fit check: passed.', 'Where\'s that from?', 'Drip detected.', 'Okay, the shoes!'],
    party: ['THIS SONG!', 'Plaza nights hit different.', 'Dance with us!', 'Aura farming rn.']
  };
  const FIRST = ['Ava', 'Noah', 'Zoe', 'Kai', 'Maya', 'Leo', 'Isla', 'Omar', 'Lena', 'Raj', 'Chloe', 'Malik', 'Yuki', 'Diego', 'Fatima', 'Tom', 'Grace', 'Arjun', 'Nia', 'Hugo', 'Sana', 'Ethan', 'Imani', 'Luca', 'Mia', 'Tariq', 'Ruby', 'Jin', 'Amira', 'Finn'];

  function setDensity(d) { density = d; }
  function randomApp(r) {
    const sk = U.rpick(r, D.SKIN), hairT = U.rpick(r, D.HAIR.filter(h => h.id !== 'bald' || r() < 0.3));
    const dark = U.luminance(sk.c) < 0.45;
    const hc = r() < 0.12 ? U.rpick(r, D.HAIR_COLORS).c : U.rpick(r, dark ? ['#141110', '#2a211d', '#3d2a1f'] : ['#141110', '#2a211d', '#3d2a1f', '#6b4129', '#c39a5a', '#7f3a20', '#7a6656']);
    return D.app({ skin: sk.c, face: U.rpick(r, D.FACE_SHAPES).id, eyeShape: U.rpick(r, D.EYE_SHAPES).id, eyeColor: U.rpick(r, D.EYE_COLORS), brow: U.rpick(r, D.BROWS.slice(0, 6)).id, nose: U.rpick(r, D.NOSES).id, mouth: U.rpick(r, D.MOUTHS).id, ears: U.rpick(r, D.EARS).id,
      hair: hairT.id, hairColor: hc, facialHair: r() < 0.3 ? U.rpick(r, D.FACIAL_HAIR).id : 'none', freckles: r() < 0.15 ? r() : 0, height: 0.92 + r() * 0.16, build: r(), shoulders: r(), muscle: r() * 0.6, legs: r() });
  }
  function randomOutfit(r, vibe) {
    const pick = (slot, tag) => { let c = D.ITEMS.filter(i => i.slot === slot && !i.exclusive && (!tag || i.tags.includes(tag))); if (!c.length) c = D.ITEMS.filter(i => i.slot === slot && !i.exclusive); const it = U.rpick(r, c); return { id: it.id, c: Math.floor(r() * it.colors.length) }; };
    const acc = {}; if (r() < 0.35) { const a = U.rpick(r, D.ITEMS.filter(i => !['top', 'bottom', 'shoes'].includes(i.slot) && !i.exclusive)); acc[a.slot] = { id: a.id, c: Math.floor(r() * a.colors.length) }; }
    return { top: pick('top', vibe), bottom: pick('bottom', vibe), shoes: pick('shoes', vibe === 'gym' ? 'gym' : null), acc };
  }
  function makeChar(app, outfit, lod) { const c = new GR.Char.Character(app, outfit, { lod }); c.root.traverse(o => { if (o.isMesh) o.castShadow = lod > 0 || Math.random() < 0.5; }); return c; }

  function init(sc) {
    scene = sc; clearAll(); castPool = {};
    buildGraph();
  }
  function buildGraph() {
    const r = GR.City.HALF - 1.4, nodes = [], idx = {};
    const key = (x, z) => Math.round(x) + ',' + Math.round(z);
    const add = (x, z) => { const k = key(x, z); if (idx[k] == null) { idx[k] = nodes.length; nodes.push({ x, z, n: [] }); } return idx[k]; };
    const link = (a, b) => { if (!nodes[a].n.includes(b)) nodes[a].n.push(b); if (!nodes[b].n.includes(a)) nodes[b].n.push(a); };
    for (const bx of GR.City.BLOCKS) for (const bz of GR.City.BLOCKS) {
      const ring = [[-r, -r], [0, -r], [r, -r], [r, 0], [r, r], [0, r], [-r, r], [-r, 0]].map(([dx, dz]) => add(bx + dx, bz + dz));
      for (let i = 0; i < 8; i++) link(ring[i], ring[(i + 1) % 8]);
    }
    for (const bx of GR.City.BLOCKS) for (const bz of GR.City.BLOCKS) for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = idx[key(bx + sx * r, bz + sz * r)];
      const bxn = idx[key(bx + sx * r + sx * (80 - 2 * r), bz + sz * r)]; if (bxn != null) link(a, bxn);
      const bzn = idx[key(bx + sx * r, bz + sz * r + sz * (80 - 2 * r))]; if (bzn != null) link(a, bzn);
    }
    // promenade nodes through Drip Street
    const p1 = add(-80, -30), p2 = add(-80, 0), p3 = add(-80, 30); link(p1, p2); link(p2, p3); link(p1, idx[key(-80, -r)]); link(p3, idx[key(-80, r)]);
    graph = nodes;
  }
  function clearAll() { list.forEach(n => n.char.dispose()); list = []; bubbles.forEach(b => b.el.remove()); bubbles = []; }
  function spawn(kind, app, outfit, opts = {}) {
    const c = makeChar(app, outfit, opts.lod ?? 0);
    scene.add(c.root);
    const n = Object.assign({ kind, char: c, name: opts.name || U.pick(FIRST), state: 'idle', t: U.rand(0, 5), speed: 0, barkT: U.rand(4, 20), talkable: opts.talkable !== false, pers: opts.pers || U.pick(['chill', 'hype', 'calm', 'npc', 'fashion', 'gentle']), id: opts.id || 'g_' + U.uid(), cast: opts.cast || null, react: 0, zone: W.current }, opts);
    c.root.position.set(opts.x || 0, opts.y || 0, opts.z || 0); c.root.rotation.y = opts.ry || 0;
    list.push(n); return n;
  }
  function castChar(def, lod = 1) { return spawn('cast', def.app, def.outfit, { name: def.name, id: def.id, cast: def, pers: def.pers, lod }); }
  const hourNow = () => GR.state.time % 24;
  function castWhere(def) { const h = hourNow(); const keys = Object.keys(def.sched).map(Number).sort((a, b) => a - b); let loc = def.sched[keys[0]]; keys.forEach(k => { if (h >= k) loc = def.sched[k]; }); if (h < 6 && !def.worker && !def.judge && !def.trainer) return 'home'; return loc; }

  function enterZone(id) {
    clearAll();
    const z = W.zones[id], r = U.rng(id + Math.floor(GR.state.time));
    const here = D.CAST.filter(d => castWhere(d) === id);
    const place = (n, x, z2, ry, y = 0) => { n.char.root.position.set(x, y, z2); n.char.root.rotation.y = ry; n.home = { x, z: z2, ry, y }; };
    if (id === 'city') { respawnCity(true); return; }
    // workers at their spots
    z.npcSpots.filter(s => s.kind === 'worker').forEach(s => {
      const def = D.CAST.find(c => c.worker === s.role || (s.role === 'gymdesk' && false));
      const n = def ? castChar(def) : spawn('worker', randomApp(r), randomOutfit(r, 'gym'), { name: 'Front Desk ' + U.pick(FIRST), pers: 'calm', lod: 1 });
      place(n, s.x, s.z, s.face || 0); n.state = 'work'; n.char.anim.play('counter');
    });
    if (id === 'gym') {
      const ms = (z.machines || []).slice(); U.shuffle(ms);
      const castGym = D.CAST.filter(d => castWhere(d) === 'gym');
      const nGen = Math.round(4 * density);
      [...castGym.map(d => ({ d })), ...Array.from({ length: nGen }, () => ({}))].forEach((o, i) => {
        const m = ms[i]; if (!m) return;
        const n = o.d ? castChar(o.d) : spawn('gym', randomApp(r), randomOutfit(r, 'gym'), { pers: U.pick(['hype', 'gentle', 'chill', 'rival']) });
        n.machine = m; n.state = 'workout'; placeOnMachine(n, m); n.repSpeed = U.rand(0.35, 0.6);
      });
      if (!castGym.find(d => d.trainer)) { const pr = D.CAST.find(d => d.trainer); const n = castChar(pr); place(n, z.ox - 2, -1, 0.3); n.state = 'idle'; n.char.anim.play('cross'); }
      for (let i = 0; i < Math.round(2 * density); i++) { const n = spawn('gym', randomApp(r), randomOutfit(r, 'gym')); place(n, z.ox + U.rand(-15, 0), U.rand(-2, 6), U.rand(0, 6)); n.state = 'idle'; n.char.anim.play(U.pick(['stretch', 'phone', 'talk', 'flex'])); }
    }
    if (['threadlord', 'dripdepot', 'solesurvivor', 'barber', 'glowlab', 'nest'].includes(id)) {
      const cnt = Math.round(3 * density);
      for (let i = 0; i < cnt; i++) { const n = spawn('shopper', randomApp(r), randomOutfit(r, U.pick(['street', 'casual', 'retro'])), { pers: U.pick(['fashion', 'chill', 'hype', 'calm']) }); place(n, z.ox + U.rand(-8, 6), U.rand(-4, 5), U.rand(0, 6)); n.state = 'browse'; n.char.anim.play(U.pick(['browse', 'browse', 'phone', 'cross'])); n.wander = 1; }
      here.filter(d => !d.worker).forEach(d => { const n = castChar(d); place(n, z.ox + U.rand(-6, 6), U.rand(-3, 3), U.rand(0, 6)); n.state = 'browse'; n.char.anim.play('browse'); n.wander = 1; });
      if (id === 'barber' && z.chairs) { const c = z.chairs[1]; const n = spawn('customer', randomApp(r), randomOutfit(r, 'casual')); place(n, c.x, c.z, 0, 0.05); n.char.anim.play('barberchair'); n.state = 'sit'; }
    }
    if (id === 'cafe' || id === 'protein') {
      const seats = U.shuffle(z.seats).slice(0, Math.round(5 * density));
      seats.forEach(s => { const n = spawn('customer', randomApp(r), randomOutfit(r, U.pick(['casual', 'street', 'gym']))); place(n, s.x, s.z, s.ry, s.h - 0.47); n.state = 'sit'; n.char.anim.play(U.pick(['sit', 'sitChill', 'sitTyping'])); });
      here.filter(d => !d.worker).forEach((d, i) => { const s = z.seats[(i * 5 + 3) % z.seats.length]; const n = castChar(d); place(n, s.x, s.z, s.ry, s.h - 0.47); n.state = 'sit'; n.char.anim.play('sit'); });
    }
    if (id === 'arena') {
      D.CAST.filter(d => d.judge).forEach((d, i) => { const s = z.judgeSeats[i]; const n = castChar(d); place(n, s.x, s.z, s.ry, 0); n.state = 'sit'; n.char.anim.play('judge'); n.judge = true; });
      here.filter(d => !d.worker && !d.judge).forEach(d => { const n = castChar(d); place(n, z.ox + U.rand(-6, 6), U.rand(10, 14), Math.PI); n.state = 'idle'; n.char.anim.play('cross'); });
      fillCrowd(Math.round(10 * density));
    }
  }
  function placeOnMachine(n, m) {
    const w = m.world, a = m.anchor; const c = Math.cos(w.ry), s = Math.sin(w.ry);
    n.char.root.position.set(w.x + a.x * c + a.z * s, (w.y || 0) + (a.y || 0), w.z - a.x * s + a.z * c); n.char.root.rotation.y = w.ry + (a.ry || 0);
    n.char.anim.play(GR.Data.MACHINES[m.type].anim, { p: 0, side: 0, speed: 3.2, phase: 0 });
  }
  function fillCrowd(nc, cheer) {
    const z = W.Z; if (!z.crowdSeats) return; const r = U.rng('crowd' + Math.floor(GR.state.time));
    list.filter(n => n.kind === 'crowd').forEach(n => { n.char.dispose(); }); list = list.filter(n => n.kind !== 'crowd');
    U.shuffle(z.crowdSeats).slice(0, nc).forEach(s => { const n = spawn('crowd', randomApp(r), randomOutfit(r, null), { talkable: false }); n.char.root.position.set(s.x, s.h - 0.47 + 0.02, s.z); n.char.root.rotation.y = s.ry; n.state = 'sit'; n.char.anim.play(cheer ? 'cheer' : 'sit'); n.seat = s; });
  }
  function crowdReact(kind) { list.filter(n => n.kind === 'crowd').forEach((n, i) => { setTimeout(() => { if (kind === 'cheer') { n.char.anim.play('cheer'); n.char.root.position.y = n.seat.h - 0.47 + 0.3; setTimeout(() => { if (n.char.anim) { n.char.anim.play('sit'); n.char.root.position.y = n.seat.h - 0.47 + 0.02; } }, 2200); } else if (kind === 'boo') { n.char.anim.play(Math.random() < 0.5 ? 'facepalm' : 'shrug'); } }, i * 40); }); }
  let citySig = '';
  function respawnCity(first) {
    if (W.current !== 'city') return;
    const hh = hourNow(), sig = D.CAST.map(castWhere).join(',') + (hh > 20 || hh < 6 ? 'N' : 'D');
    if (!first && sig === citySig) return; citySig = sig;
    if (!first) { // keep existing pedestrians, just refresh cast locations
      list.filter(n => n.kind === 'cast' || n.kind === 'group' || n.kind === 'dancer').forEach(n => n.char.dispose()); list = list.filter(n => !(n.kind === 'cast' || n.kind === 'group' || n.kind === 'dancer'));
    } else clearAll();
    const r = U.rng('city' + Math.floor(GR.state.time));
    const h = hourNow(), night = h > 20 || h < 6;
    if (first) { const nP = Math.round((night ? 8 : 18) * density); for (let i = 0; i < nP; i++) { const nd = Math.floor(r() * graph.length), g = graph[nd]; const n = spawn('ped', randomApp(r), randomOutfit(r, U.pick(['casual', 'street', 'sport', 'gym', 'retro', null]))); n.char.root.position.set(g.x, 0.12, g.z); n.node = nd; n.next = U.pick(g.n); n.state = 'walk'; n.speed = U.rand(1.1, 1.6); if (r() < 0.2) n.style = 'phone'; } }
    const spots = { park: { x: 66, z: 78 }, plaza: { x: 6, z: 18 }, court: { x: 98, z: 84 }, carpark: { x: -6, z: 94 }, shopping: { x: -80, z: 8 }, residential: { x: -70, z: 72 }, outdoorgym: { x: 70, z: 18 }, home: null };
    D.CAST.forEach(d => { const loc = castWhere(d); const s = spots[loc]; if (!s) return; const n = castChar(d); n.char.root.position.set(s.x + U.rand(-3, 3), 0.12, s.z + U.rand(-3, 3)); n.char.root.rotation.y = U.rand(0, 6); n.home = { x: n.char.root.position.x, z: n.char.root.position.z }; n.state = 'idle';
      n.char.anim.play(loc === 'court' ? 'shoot' : loc === 'outdoorgym' ? U.pick(['pushups', 'stretch', 'flex']) : d.pers === 'influencer' ? 'selfie' : d.pers === 'npc' ? 'idle' : U.pick(['talk', 'phone', 'cross', 'lean'])); if (loc === 'court') n.loopAct = 'shoot'; if (d.pers === 'npc') { n.state = 'patrol'; n.patrol = [[s.x - 8, s.z], [s.x + 8, s.z]]; n.pi = 0; } });
    // social groups chatting
    W.zones.city.npcSpots.filter(s => s.kind === 'social' || s.kind === 'chill').forEach((s, gi) => { const k = 2 + Math.floor(r() * 2); for (let i = 0; i < k; i++) { const a = i / k * U.TAU; const n = spawn('group', randomApp(r), randomOutfit(r, U.pick(['street', 'casual', 'retro']))); n.char.root.position.set(s.x + Math.sin(a) * 1.1, 0.12, s.z + Math.cos(a) * 1.1); n.char.root.rotation.y = a + Math.PI; n.state = 'idle'; n.char.anim.play(i % 2 ? 'talk' : U.pick(['listen', 'phone', 'laugh'])); n.chatGroup = gi; } });
    // night party at the plaza
    if (night) { const p = W.zones.city.npcSpots.find(s => s.kind === 'party'); const k = Math.round(7 * density); for (let i = 0; i < k; i++) { const n = spawn('dancer', randomApp(r), randomOutfit(r, U.pick(['street', 'retro', 'luxury']))); const a = i / k * U.TAU; n.char.root.position.set(p.x + Math.sin(a) * 3.2, 0.12, p.z + Math.cos(a) * 2.4); n.char.root.rotation.y = U.rand(0, 6); n.state = 'dance'; n.char.anim.play(U.pick(D.EMOTES.filter(e => e.dance).map(e => e.id))); } }
  }
  function hourly() { if (W.current !== 'city') { /* interiors refresh on next entry */ } }

  // ---------------- per-frame ----------------
  const tmp = new THREE.Vector3();
  function update(dt, ppos, cam) {
    const t = performance.now() / 1000;
    for (const n of list) {
      const root = n.char.root, d = Math.hypot(root.position.x - ppos.x, root.position.z - ppos.z);
      const far = d > 70; root.visible = !far; n.char.setDetail(d < 18); if (far && n.state !== 'walk') continue;
      n.t += dt;
      let speed = 0;
      if (n.state === 'walk' && graph) {
        const g = graph[n.next]; const dx = g.x - root.position.x, dz = g.z - root.position.z, dl = Math.hypot(dx, dz);
        if (dl < 0.6) { const prev = n.node; n.node = n.next; const opts = graph[n.node].n.filter(x => x !== prev); n.next = U.pick(opts.length ? opts : graph[n.node].n); }
        else {
          let sp = n.speed; // yield to player
          if (d < 1.4) sp *= 0.3;
          // cars at crossings
          if (GR.Traffic && GR.Traffic.carNear(root.position, 5)) sp *= root.position.y < 0.05 ? 0.1 : 1;
          const want = Math.atan2(dx, dz); root.rotation.y = U.dampAngle(root.rotation.y, want, 6, dt);
          root.position.x += Math.sin(root.rotation.y) * sp * dt; root.position.z += Math.cos(root.rotation.y) * sp * dt;
          // offset to the right side of the path so two-way traffic passes
          root.position.y = W.groundAt(W.zones.city, root.position.x, root.position.z, 1, 0.2);
          speed = sp;
        }
      } else if (n.state === 'patrol') { const tg = n.patrol[n.pi]; const dx = tg[0] - root.position.x, dz = tg[1] - root.position.z; if (Math.hypot(dx, dz) < 0.4) { n.pi = (n.pi + 1) % n.patrol.length; } else { root.rotation.y = Math.atan2(dx, dz); root.position.x += Math.sin(root.rotation.y) * 1.2 * dt; root.position.z += Math.cos(root.rotation.y) * 1.2 * dt; speed = 1.2; } }
      else if (n.state === 'workout' && n.machine) {
        const a = n.char.anim.act; if (a) { a.p = (n.t * n.repSpeed) % 1; a.phase = n.t * 7; a.speed = 3.2; if (Math.floor(n.t * n.repSpeed) !== n.rep) { n.rep = Math.floor(n.t * n.repSpeed); a.side = (a.side || 0) + 1; if (d < 12 && Math.random() < 0.4) GR.Audio.sfx('clank'); } }
        n.machine.anim(U.clamp(Math.sin((n.t * n.repSpeed % 1) * Math.PI), 0, 1), { p: (n.t * n.repSpeed) % 1, phase: n.t * 7, speed: 3.2, dt });
        if (n.t > 40 + Math.random() * 30) { n.t = 0; n.repSpeed = U.rand(0.35, 0.6); }
      } else if (n.wander && n.state === 'browse') { if (n.t > 8) { n.t = 0; n.wTarget = { x: W.Z.ox + U.rand(-9, 9), z: U.rand(-5, 5) }; n.char.anim.stop(); n.state = 'wander'; } }
      else if (n.state === 'wander') { const tg = n.wTarget, dx = tg.x - root.position.x, dz = tg.z - root.position.z; if (Math.hypot(dx, dz) < 0.5) { n.state = 'browse'; n.t = 0; n.char.anim.play(U.pick(['browse', 'phone', 'cross', 'browse'])); } else { root.rotation.y = U.dampAngle(root.rotation.y, Math.atan2(dx, dz), 5, dt); const nx = root.position.clone(); nx.x += Math.sin(root.rotation.y) * 1.2 * dt; nx.z += Math.cos(root.rotation.y) * 1.2 * dt; W.collide(W.Z, nx, 0.3, 0); root.position.copy(nx); speed = 1.2; } }
      else if (n.loopAct && !n.char.anim.busy && n.t > 2) { n.t = 0; n.char.anim.play(n.loopAct); }
      // react to player performing
      if (n.react > 0) { n.react -= dt; }
      // bump
      if (d < 0.7 && GR.Game.P.speed > 5 && n.state !== 'sit' && n.state !== 'workout' && (!n.bumpT || t - n.bumpT > 3)) { n.bumpT = t; bark(n, U.pick(BARKS.bump)); n.char.anim.play('shrug'); n.char.setExpr('surprise', 1); }
      // ambient barks
      n.barkT -= dt; if (n.barkT < 0) { n.barkT = U.rand(10, 28); if (d < 12 && n.state !== 'sit') bark(n, U.pick(n.kind === 'gym' || n.state === 'workout' ? BARKS.gym : n.kind === 'shopper' ? BARKS.shop : n.kind === 'customer' ? BARKS.cafe : n.kind === 'dancer' ? BARKS.party : (n.cast && D.DIALOGUE[n.cast.pers] ? D.DIALOGUE[n.cast.pers].chat : BARKS.ped))); }
      // look at the player when close
      if (d < 4 && n.char.lod) { n.char.faceT.lookX = U.clamp(U.angDiff(root.rotation.y, Math.atan2(ppos.x - root.position.x, ppos.z - root.position.z)), -0.4, 0.4); }
      const st = n.state === 'walk' || n.state === 'patrol' || n.state === 'wander';
      n.char.anim.loco.style = n.style || 'normal';
      n.char.update(dt, { speed: st ? speed : 0, near: d < 12 });
    }
    updateBubbles(cam);
  }
  function bark(n, text, dur = 2.6) {
    if (bubbles.length > 5) { const b = bubbles.shift(); b.el.remove(); }
    const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text; document.getElementById('bubbles').appendChild(el);
    bubbles.push({ n, el, t: dur }); n.char.talk(Math.min(2, dur * 0.7));
    if (n.char.lod || Math.random() < 0.5) GR.Audio.voice(text, 0.8 + (U.hash(n.name) % 10) / 15);
  }
  function updateBubbles(cam) {
    const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
    bubbles = bubbles.filter(b => { b.t -= 1 / 60; if (b.t <= 0 || !b.n.char.root.parent) { b.el.remove(); return false; } v.copy(b.n.char.root.position); v.y += 2.15 * (b.n.char.app.height || 1); v.project(cam); if (v.z > 1) { b.el.style.display = 'none'; return true; } b.el.style.display = 'block'; b.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`; b.el.style.opacity = Math.min(1, b.t * 2); return true; });
  }
  function nearestTalkable(p) { let best = null, bd = 2.3; for (const n of list) { if (!n.talkable || n.kind === 'crowd') continue; const d = Math.hypot(n.char.root.position.x - p.x, n.char.root.position.z - p.z); if (d < bd) { bd = d; best = n; } } return best ? { npc: best, d: bd } : null; }
  // player did something cool near NPCs (emote, dance, PR, competition win)
  function onPlayerAct(kind, pos, opts = {}) {
    let count = 0;
    list.forEach(n => { const d = n.char.root.position.distanceTo(pos); if (d > (opts.r || 9) || n.react > 0 || n.kind === 'crowd') return; n.react = 6; count++;
      const face = Math.atan2(pos.x - n.char.root.position.x, pos.z - n.char.root.position.z);
      if (n.state === 'walk' || n.state === 'idle' || n.state === 'browse' || n.state === 'patrol') { n.char.root.rotation.y = face; n.prevState = n.state; n.state = 'idle'; setTimeout(() => { if (n.prevState) { n.state = n.prevState; n.prevState = null; } }, 3500); }
      if (n.state !== 'workout' && n.state !== 'sit') n.char.anim.play(U.pick(kind === 'dance' ? ['clap', 'cheer', 'laugh', 'thumbs'] : kind === 'flex' ? ['clap', 'thumbs', 'shock', 'flex'] : ['clap', 'thumbs', 'laugh', 'shock']), { dur: 2.5 });
      n.char.setExpr(U.pick(['smile', 'laugh', 'surprise']), 2);
      if (Math.random() < 0.5) bark(n, U.pick(kind === 'drip' ? BARKS.drip : BARKS.react));
    });
    return count;
  }
  // group emote: nearby NPCs join a synchronised dance
  function groupEmote(emoteId, center) {
    const e = D.emote(emoteId); const base = e.base || emoteId;
    const near = list.filter(n => n.kind !== 'crowd' && n.state !== 'workout' && n.state !== 'sit' && n.char.root.position.distanceTo(center) < 10).slice(0, 6);
    near.forEach((n, i) => { n.prevState = n.state; n.state = 'group'; const a = (i + 1) / (near.length + 1) * Math.PI - Math.PI / 2; const f = GR.Game.P.facing; const off = new THREE.Vector3(Math.sin(f + Math.PI / 2) * (i % 2 ? 1 : -1) * (1.2 + Math.floor(i / 2) * 1.2), 0, Math.cos(f + Math.PI / 2) * (i % 2 ? 1 : -1) * (1.2 + Math.floor(i / 2) * 1.2)); n.char.root.position.set(center.x + off.x, n.char.root.position.y, center.z + off.z); n.char.root.rotation.y = f; n.char.anim.play(base, { restart: true }); n.char.anim.act.t = GR.Game.player.anim.act ? GR.Game.player.anim.act.t : 0; setTimeout(() => { n.char.anim.stop(); n.state = n.prevState || 'idle'; n.prevState = null; }, 8000); });
    return near.length;
  }
  // the player wants this machine: whoever is on it steps off and does something else nearby
  function vacate(m) { list.forEach(n => { if (n.machine !== m) return; n.machine = null; n.state = 'idle'; n.char.anim.stop(0.1); const w = m.world; n.char.root.position.set(w.x + Math.cos(w.ry) * 1.6, w.y || 0, w.z - Math.sin(w.ry) * 1.6); n.char.root.position.y = W.groundAt(W.Z, n.char.root.position.x, n.char.root.position.z, 2); n.char.anim.play(U.pick(['stretch', 'phone', 'cross', 'talk'])); bark(n, U.pick(['All yours, legend.', 'Go on, show me what you got.', 'Machine\'s free!', 'Spot you after?'])); }); }
  function castById(id) { return list.find(n => n.id === id); }
  return { vacate, init, setDensity, enterZone, respawnCity, update, nearestTalkable, onPlayerAct, groupEmote, bark, fillCrowd, crowdReact, randomApp, randomOutfit, hourly, castById, castWhere, get list() { return list; }, makeChar };
})();

/* ---------------- DIALOGUE & FRIENDSHIP ---------------- */
GR.Dialogue = (() => {
  const U = GR.U, D = GR.Data;
  const LV = [0, 20, 45, 75, 110, 150];
  function fr(id) { const s = GR.state; if (!s.friends[id]) s.friends[id] = { pts: 0, lvl: 0, talks: 0, day: -1, today: 0 }; return s.friends[id]; }
  function addFriend(n, pts) {
    if (!n.cast) return 0; const f = fr(n.id), s = GR.state, day = Math.floor(s.time / 24);
    if (f.day !== day) { f.day = day; f.today = 0; }
    const dim = Math.max(0.25, 1 - f.today * 0.2); const gain = Math.round(pts * dim); f.today++; f.pts += gain;
    let lv = 0; LV.forEach((v, i) => { if (f.pts >= v) lv = i; });
    if (lv > f.lvl) { f.lvl = lv; levelUp(n, lv); }
    GR.Prog.check(); return gain;
  }
  function levelUp(n, lv) {
    const s = GR.state, def = n.cast;
    GR.Prog.notify(`Friendship with ${def.name} reached level ${lv}!`, '💞', 'big'); GR.Prog.event('friend_up', { id: n.id, lvl: lv }); GR.Prog.addRep(5 + lv * 3);
    const msgs = { 1: 'yo save my number 📱 we should link up', 2: 'ok you\'re officially cool. group dances at the plaza? say less 🕺', 3: 'party at the Plaza tonight after 9 — you HAVE to come', 4: 'got you a lil something, check your wardrobe 🎁', 5: 'bestie status unlocked. you\'re stuck with me now 💯' };
    GR.Phone.message(n.id, def.name, msgs[lv] || 'ayy');
    if (lv === 2) { ['g_flex', 'g_hype'].forEach(e => { if (!s.owned.emotes.includes(e)) s.owned.emotes.push(e); }); GR.Prog.notify('Unlocked group emotes: Synchronised Flex & Hype Circle', '🕺'); }
    if (lv === 3) { const fe = D.EMOTES.filter(e => e.unlock === 'friend' && !s.owned.emotes.includes(e.id)); if (fe.length) { s.owned.emotes.push(fe[0].id); GR.Prog.notify('Unlocked dance: ' + fe[0].n, '💃'); } }
    if (lv === 4) { const it = D.ITEMS.find(i => i.name === 'Friendship Tank'); if (it) giveItem(it.id + '|0'); }
    if (lv === 5) { const it = D.ITEMS.find(i => i.name === 'Bestie Tee'); if (it) giveItem(it.id + '|0'); const fe = D.EMOTES.filter(e => e.unlock === 'friend' && !s.owned.emotes.includes(e.id)); if (fe.length) s.owned.emotes.push(fe[0].id); }
  }
  function giveItem(k) { const s = GR.state; if (!s.owned.clothes.includes(k)) { s.owned.clothes.push(k); GR.Prog.notify('New item in your wardrobe: ' + D.item(k.split('|')[0]).name, '🎁'); } }
  const fill = (t) => t.replace(/\{n\}/g, GR.state.name);
  let cur = null;
  function talk(n) {
    const pers = (n.cast && n.cast.pers) || n.pers || 'chill', pack = D.DIALOGUE[pers] || D.DIALOGUE.chill;
    cur = { n, pack };
    const G = GR.Game, c = n.char.root, p = G.player.root;
    // face each other + camera over shoulder
    c.rotation.y = Math.atan2(p.position.x - c.position.x, p.position.z - c.position.z);
    G.P.facing = Math.atan2(c.position.x - p.position.x, c.position.z - p.position.z); p.rotation.y = G.P.facing;
    const fw = new THREE.Vector3(Math.sin(G.P.facing), 0, Math.cos(G.P.facing)), side = new THREE.Vector3(Math.cos(G.P.facing), 0, -Math.sin(G.P.facing));
    const nh = 1.55 * (n.char.app.height || 1);
    G.camTo({ pos: () => p.position.clone().add(fw.clone().multiplyScalar(-1.05)).add(side.clone().multiplyScalar(-0.55)).add(new THREE.Vector3(0, 1.72, 0)), look: () => c.position.clone().add(new THREE.Vector3(0, nh, 0)), dur: 0.5, fov: 50 });
    if (n.state !== 'workout' && n.state !== 'sit') n.char.anim.play('talk'); G.player.anim.play('listen');
    GR.Prog.stat('talks'); GR.Prog.event('talk', { id: n.id });
    say(fill(U.pick(pack.greet)), 'smile');
  }
  function options() {
    const n = cur.n, opts = [];
    const f = n.cast ? fr(n.id) : null;
    opts.push({ t: '💬 Chat', fn: () => { say(fill(U.pick(cur.pack.chat))); gain(4, 'chat'); } });
    opts.push({ t: '👕 Compliment their fit', fn: () => { const likes = n.cast ? n.cast.likes.includes('compliment') || n.cast.likes.includes('fashion') : Math.random() < 0.6; say(likes ? fill(U.pick(cur.pack.like)) : 'Oh! Uh, thanks I guess.', likes ? 'smile' : 'neutral'); gain(likes ? 9 : 3, 'compliment'); } });
    opts.push({ t: '💪 Talk gains', fn: () => { const likes = n.cast ? n.cast.likes.includes('gym') : n.kind === 'gym'; say(likes ? fill(U.pick(cur.pack.like)) + ' ' + U.pick(['What are you training today?', 'Leg day or lie day?', 'Respect the grind.']) : 'Gym? I mostly lift my phone.', likes ? 'smile' : 'smug'); gain(likes ? 9 : 2, 'gym'); } });
    opts.push({ t: '🧠 Ask for advice', fn: () => { say(fill(U.pick(cur.pack.advice))); gain(5, 'advice'); } });
    opts.push({ t: '😏 Banter', fn: () => { const likes = n.cast ? n.cast.likes.includes('banter') : Math.random() < 0.5; say(likes ? fill(U.pick(cur.pack.like)) : fill(U.pick(cur.pack.dislike)), likes ? 'laugh' : 'smug'); gain(likes ? 10 : -3, 'banter'); } });
    if (f && f.lvl >= 2 || !n.cast) opts.push({ t: '🕺 Invite to a group dance', fn: () => { if (n.cast && f.lvl < 2) return say('Maybe once we know each other better!'); end(); setTimeout(() => GR.UI.emoteWheel({ group: true }), 300); } });
    if (n.cast && n.cast.trainer) opts.push({ t: '🏋️ Give me a training challenge', fn: () => { const c = GR.Mini.trainerChallenge(); say(c); gain(3); } });
    if (n.cast && n.cast.worker) opts.push({ t: '🛍️ Show me what you\'ve got', fn: () => { end(); const w = n.cast.worker; setTimeout(() => { if (w === 'barber') GR.Shops.barber(0); else if (w === 'glowlab') GR.Shops.glowlab('shop'); else if (w === 'nest') GR.Shops.furniture(); else if (w === 'cafe' || w === 'protein') GR.Shops.food(w); else if (w === 'arena') GR.Comp.open(); else GR.Shops.store(w, 'all'); }, 200); } });
    if (n.cast && n.cast.rival) opts.push({ t: '🔥 "See you in the arena."', fn: () => { say(U.pick(['Bring your A-game. I\'ll bring my S-game.', 'Hope you like second place.', 'It\'s a date. A date with defeat.']), 'smug'); gain(6); GR.state.comp.rivals[n.id] = true; } });
    if (n.cast && f && f.lvl >= 3) opts.push({ t: '🎉 Hang out', fn: () => { end(); hangout(n); } });
    opts.push({ t: '👋 Bye', fn: end });
    return opts;
  }
  function gain(p, why) { const n = cur.n; if (!n.cast) { if (p > 0) GR.Prog.addRep(1); return; } const g = addFriend(n, p); const f = fr(n.id); GR.UI.dialogue(cur.n, cur.text, options(), f); if (g > 0) GR.UI.floatText('+' + g + ' friendship', '#ff9ec7'); }
  function say(text, expr = 'neutral') { cur.text = text; const n = cur.n; n.char.talk(Math.min(3.5, text.length * 0.05)); n.char.setExpr(expr, 3); GR.Audio.voice(text, 0.8 + (U.hash(n.name) % 10) / 15); GR.UI.dialogue(n, text, options(), n.cast ? fr(n.id) : null); }
  function end() { if (!cur) return; const n = cur.n; GR.UI.dialogue(null); GR.Game.camRelease(); if (n.state !== 'workout' && n.state !== 'sit') { n.char.anim.stop(); if (n.state === 'work') n.char.anim.play('counter'); } GR.Game.player.anim.stop(); cur = null; }
  function hangout(n) {
    const acts = [{ t: 'Group dance right here', fn: () => { GR.Game.player.anim.play('d_hype'); GR.NPC.groupEmote('g_hype', GR.Game.player.root.position); GR.Prog.stat('groupEmotes'); GR.Prog.event('group_emote', {}); addFriend(n, 10); } },
      { t: 'Take a selfie together (+followers)', fn: () => { GR.Camera.photoMode({ friend: n }); addFriend(n, 8); } },
      { t: 'Grab food together (Protein Palace)', fn: () => { GR.Prog.addBuff('xp', 1); GR.Prog.addBuff('hype', 1); addFriend(n, 12); GR.UI.toast('🍔 You and ' + n.name + ' grabbed a bite. Buffs active!'); } }];
    GR.UI.choice('Hang out with ' + n.name, acts);
  }
  return { talk, end, addFriend, fr, LV, get active() { return !!cur; } };
})();
