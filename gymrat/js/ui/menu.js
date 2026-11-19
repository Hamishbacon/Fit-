/* Main menu (3D stage backdrop), save slots, starter select, character creator, naming, tutorial, boot. */
'use strict';
GR.Menu = (() => {
  const U = GR.U, D = GR.Data, esc = U.esc;
  let ms = null; // menu scene
  const root = () => document.getElementById('menu');
  function buildStage() {
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#140d24'); sc.fog = new THREE.Fog('#140d24', 12, 30);
    sc.add(new THREE.HemisphereLight(0xc9b8ff, 0x2b1d3b, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3, 6, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; sc.add(key);
    const rim = new THREE.DirectionalLight(0xff4fa3, 0.8); rim.position.set(-4, 3, -5); sc.add(rim);
    const rim2 = new THREE.DirectionalLight(0x28e0ff, 0.6); rim2.position.set(5, 2, -4); sc.add(rim2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1c1430, roughness: 0.35, metalness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.08, 64), new THREE.MeshBasicMaterial({ color: 0x7b61ff })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; sc.add(ring);
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#ff4fa3', '#28e0ff', '#ffd23f', '#7b61ff', '#a3e635'][i]), transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); c.position.set(-6 + i * 3, 4, -3); sc.add(c); }
    const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 60);
    const chars = D.STARTERS.map((st, i) => { const c = new GR.Char.Character(st.app, st.outfit, { lod: 1 }); c.root.position.set((i - 2.5) * 1.15, 0, -1.2 - Math.abs(i - 2.5) * 0.25); c.root.rotation.y = -(i - 2.5) * 0.12; sc.add(c.root); c.anim.play(['cross', 'peace', 'flex', 'cross', 'wave', 'mewing'][i]); return c; });
    ms = { sc, cam, chars, key, ring, mode: 'title', t: 0, focus: null, editor: null };
    return ms;
  }
  function frame(dt, scene, camera, renderer) {
    if (!ms) return; ms.t += dt;
    const c = ms.cam; c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix();
    let tp, tl;
    if (ms.mode === 'title') { tp = new THREE.Vector3(Math.sin(ms.t * 0.12) * 1.2, 1.5, 6.4); tl = new THREE.Vector3(0, 1.1, -1.3); }
    else if (ms.mode === 'select' && ms.focus != null) { const ch = ms.chars[ms.focus]; tp = ch.root.position.clone().add(new THREE.Vector3(0.9, 1.35, 3.0)); tl = ch.root.position.clone().add(new THREE.Vector3(0.45, 1.05, 0)); }
    else if (ms.mode === 'create' && ms.editor) { const z = ms.zoom || 'body'; const tgt = ms.editor.root.position; const ang = ms.spin || 0; const d = z === 'face' ? 1.45 : 3.1, h = z === 'face' ? 1.66 : 1.15, hs = (ms.editor.app.height || 1); tp = new THREE.Vector3(tgt.x + Math.sin(ang) * d + (z === 'face' ? 0.32 : 0.35), h * hs, tgt.z + Math.cos(ang) * d); tl = new THREE.Vector3(tgt.x + (z === 'face' ? 0.32 : 0.35), (z === 'face' ? 1.6 : 1.0) * hs, tgt.z); }
    else { tp = new THREE.Vector3(0, 1.5, 6.4); tl = new THREE.Vector3(0, 1.1, -1.3); }
    c.position.lerp(tp, 1 - Math.exp(-dt * 4)); ms.look = (ms.look || tl.clone()).lerp(tl, 1 - Math.exp(-dt * 4)); c.lookAt(ms.look);
    ms.chars.forEach(ch => ch.update(dt, { near: true })); if (ms.editor) ms.editor.update(dt, { near: true });
    ms.ring.position.x = ms.focus != null && ms.mode === 'select' ? ms.chars[ms.focus].root.position.x : ms.editor && ms.mode === 'create' ? ms.editor.root.position.x : 0;
    ms.ring.position.z = ms.focus != null && ms.mode === 'select' ? ms.chars[ms.focus].root.position.z : ms.editor && ms.mode === 'create' ? ms.editor.root.position.z : -1.2;
    renderer.shadowMap.needsUpdate = true; renderer.render(ms.sc, c);
  }
  function show(html) { const m = root(); m.hidden = false; m.innerHTML = html; return m; }
  function title() {
    ms.mode = 'title'; ms.focus = null; ms.chars.forEach(c => c.root.visible = true); if (ms.editor) ms.editor.root.visible = false;
    const last = GR.Save.meta().last, info = last != null ? GR.Save.slotInfo(last) : null;
    const m = show(`<div class="logo"><div class="l1">GYM RAT 2000</div><div class="l2">THE MOGGING ERA</div></div>
      <div class="mbtns">${info && !info.corrupt ? `<button class="btn big go" data-a="cont">▶ Continue <small>${esc(info.name)} • Lv ${info.level} • Day ${info.day}</small></button>` : ''}
      <button class="btn big" data-a="new">✨ New Game</button><button class="btn big" data-a="load">💾 Load Game</button><button class="btn big" data-a="set">⚙️ Settings</button><button class="btn big" data-a="cred">🎬 Credits</button></div>
      <div class="foot">Click anywhere to enable sound • A lifestyle sim where the gym is only one part of a much bigger world.</div>`);
    m.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { GR.Audio.resume(); GR.Audio.music('menu'); GR.Audio.sfx('click'); const a = b.dataset.a; if (a === 'cont') loadSlot(last); if (a === 'new') slots('new'); if (a === 'load') slots('load'); if (a === 'set') menuSettings(); if (a === 'cred') credits(); });
  }
  function slots(kind) {
    const m = show(`<div class="mpanel"><h2>${kind === 'new' ? '✨ CHOOSE A SAVE SLOT' : '💾 LOAD GAME'}</h2><div class="slots">${[0, 1, 2].map(i => { const s = GR.Save.slotInfo(i); return `<button class="slot" data-i="${i}" ${kind === 'load' && !s ? 'disabled' : ''}><b>Slot ${i + 1}</b>${s ? (s.corrupt ? '<small>⚠️ corrupted save</small>' : `<span>${esc(s.name)} • Lv ${s.level} • ${U.money(s.money)} • ${U.kfmt(s.followers)} followers</span><small>Day ${s.day} • ${Math.floor((s.played || 0) / 60)} min played • ${s.saved ? new Date(s.saved).toLocaleString() : ''}</small>`) : '<small>Empty</small>'}</button>${s && kind === 'load' ? `<button class="btn sm danger" data-del="${i}">Delete</button>` : ''}`; }).join('')}</div><button class="btn" data-back>← Back</button></div>`);
    m.querySelector('[data-back]').onclick = title;
    m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('Delete slot ' + (+b.dataset.del + 1) + '? This cannot be undone.')) { GR.Save.del(+b.dataset.del); slots(kind); } });
    m.querySelectorAll('.slot').forEach(b => b.onclick = () => { const i = +b.dataset.i, s = GR.Save.slotInfo(i); if (kind === 'load') return loadSlot(i); if (s && !confirm('Overwrite slot ' + (i + 1) + ' (' + (s.name || '') + ')?')) return; select(i); });
  }
  function loadSlot(i) { const s = GR.Save.load(i); if (!s) { alert('That save could not be loaded (it may be corrupted). A backup was tried.'); return; } begin(s); }
  function select(slot) {
    ms.mode = 'select'; ms.focus = 0; ms.chars.forEach(c => c.root.visible = true); if (ms.editor) ms.editor.root.visible = false;
    const render = () => {
      const st = D.STARTERS[ms.focus];
      const m = show(`<div class="mpanel side"><h2>CHOOSE YOUR STARTER</h2><div class="starters">${D.STARTERS.map((s, i) => `<button class="${i === ms.focus ? 'on' : ''}" data-i="${i}"><b>${esc(s.name)}</b><small>${esc(s.title)}</small></button>`).join('')}</div>
        <div class="sdesc"><h3>${esc(st.name)} — ${esc(st.title)}</h3><p>${esc(st.desc)}</p><p class="muted">Start: ${U.money(st.stats.money)} • ${st.stats.followers} followers • ${st.stats.rep} rep</p></div>
        <div class="row"><button class="btn go" data-a="pick">Play as ${esc(st.name.split(' ')[0])}</button><button class="btn" data-a="custom">✏️ Customise</button><button class="btn" data-a="scratch">🎲 Create from scratch</button></div><button class="btn" data-back>← Back</button></div>`);
      m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { ms.focus = +b.dataset.i; const ch = ms.chars[ms.focus]; const intro = { hype: 'd_hype', pose: 'peace', flex: 'flex', victory: 'victory', wave: 'wave', think: 'mewing' }[D.STARTERS[ms.focus].intro]; ch.anim.play(intro, { restart: true }); GR.Audio.sfx('pop'); render(); });
      m.querySelector('[data-back]').onclick = () => slots('new');
      m.querySelector('[data-a="pick"]').onclick = () => naming(slot, st, JSON.parse(JSON.stringify(st.app)));
      m.querySelector('[data-a="custom"]').onclick = () => creator(slot, st, JSON.parse(JSON.stringify(st.app)));
      m.querySelector('[data-a="scratch"]').onclick = () => creator(slot, st, GR.NPC.randomApp(Math.random));
    };
    render();
  }
  /* ---------------- CHARACTER CREATOR ---------------- */
  function creator(slot, starter, app) {
    ms.mode = 'create'; ms.chars.forEach(c => c.root.visible = false); ms.spin = 0; ms.zoom = 'body';
    if (ms.editor) { ms.sc.remove(ms.editor.root); ms.editor.disposeAll(); }
    ms.editor = new GR.Char.Character(app, starter.outfit, { lod: 1 }); ms.editor.root.position.set(0, 0, -1.2); ms.sc.add(ms.editor.root); ms.editor.anim.play('cross');
    let tab = 'body';
    const upd = () => { ms.editor.setAppearance(app); ms.editor.setOutfit(starter.outfit); ms.editor.anim.play(tab === 'body' ? 'flex' : 'cross', { restart: tab === 'body' }); };
    const sl = (k, lab, min = 0, max = 1, step = 0.02) => `<label>${lab}<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${app[k] ?? ((min + max) / 2)}"></label>`;
    const opt = (k, list, lab) => `<h4>${lab}</h4><div class="opts">${list.map(o => `<button class="${app[k] === o.id ? 'on' : ''}" data-o="${k}" data-v="${o.id}">${esc(o.n)}</button>`).join('')}</div>`;
    const cols = (k, list, lab, allowNone) => `<h4>${lab}</h4><div class="colors">${allowNone ? `<button class="cdot ${!app[k] ? 'on' : ''}" data-c="${k}" data-v="">✕</button>` : ''}${list.map(c => `<button class="cdot ${app[k] === (c.c || c) ? 'on' : ''}" data-c="${k}" data-v="${c.c || c}" style="background:${c.c || c}" title="${c.n || ''}"></button>`).join('')}<input type="color" data-cc="${k}" value="${app[k] || '#888888'}"></div>`;
    const render = () => {
      ms.zoom = ['body', 'hair'].includes(tab) ? 'body' : 'face';
      let h = '';
      if (tab === 'body') h = sl('height', 'Height', 0.9, 1.1, 0.01) + sl('build', 'Build') + sl('shoulders', 'Shoulders') + sl('muscle', 'Muscle definition (grows as you train)') + sl('legs', 'Leg length') + '<p class="muted">Every body type can win. Progression rewards participation, not a particular shape.</p>';
      if (tab === 'skin') h = cols('skin', D.SKIN, 'Skin tone') + sl('freckles', 'Freckles') + `<label><input type="checkbox" data-b="beautyMark" ${app.beautyMark ? 'checked' : ''}> Beauty mark</label>`;
      if (tab === 'face') h = opt('face', D.FACE_SHAPES, 'Face shape') + sl('jaw', 'Jaw width', 0.6, 1.05) + sl('chin', 'Chin', 0.1, 0.9) + sl('cheek', 'Cheekbones', 0.2, 1);
      if (tab === 'eyes') h = opt('eyeShape', D.EYE_SHAPES, 'Eye shape') + cols('eyeColor', D.EYE_COLORS, 'Eye colour') + sl('eyeSize', 'Eye size', 0.8, 1.25) + sl('eyeSpacing', 'Eye spacing', 0.88, 1.12);
      if (tab === 'brows') h = opt('brow', D.BROWS, 'Brow shape') + sl('browThick', 'Thickness', 0.5, 1.6) + cols('browColor', D.HAIR_COLORS, 'Brow colour', true);
      if (tab === 'nose') h = opt('nose', D.NOSES, 'Nose shape') + sl('noseSize', 'Nose size', 0.7, 1.3) + opt('mouth', D.MOUTHS, 'Mouth & lips') + opt('ears', D.EARS, 'Ears');
      if (tab === 'hair') h = opt('hair', D.HAIR, 'Hairstyle') + cols('hairColor', D.HAIR_COLORS, 'Hair colour') + cols('hairHi', D.HAIR_COLORS, 'Highlights', true);
      if (tab === 'beard') h = opt('facialHair', D.FACIAL_HAIR, 'Facial hair') + cols('facialColor', D.HAIR_COLORS, 'Facial hair colour', true);
      const m = show(`<div class="mpanel side creator"><h2>CHARACTER CREATOR</h2><div class="tabs">${[['body', '🧍 Body'], ['skin', '🎨 Skin'], ['face', '🙂 Face'], ['eyes', '👁️ Eyes'], ['brows', '〰️ Brows'], ['nose', '👃 Nose/Mouth/Ears'], ['hair', '💇 Hair'], ['beard', '🧔 Facial hair']].map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div class="cbody">${h}</div>
        <div class="row"><button class="btn sm" data-r="-1">⟲ Rotate</button><button class="btn sm" data-r="1">Rotate ⟳</button><button class="btn sm" data-z>🔍 ${ms.zoom === 'face' ? 'Body' : 'Face'}</button><button class="btn sm" data-rand>🎲 Randomise</button><button class="btn sm" data-reset>↺ Reset</button></div>
        <div class="row"><button class="btn go" data-done>Next: Name →</button><button class="btn" data-back>← Back</button></div></div>`);
      m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
      m.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { app[i.dataset.k] = +i.value; if (i.dataset.k === 'muscle') app.mus = null; upd(); });
      m.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { app[b.dataset.o] = b.dataset.v; upd(); render(); });
      m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { app[b.dataset.c] = b.dataset.v || null; upd(); render(); });
      m.querySelectorAll('[data-cc]').forEach(i => i.onchange = () => { app[i.dataset.cc] = i.value; upd(); render(); });
      m.querySelectorAll('[data-b]').forEach(i => i.onchange = () => { app[i.dataset.b] = i.checked; upd(); });
      m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { ms.spin += +b.dataset.r * 0.8; });
      m.querySelector('[data-z]').onclick = () => { tab = ms.zoom === 'face' ? 'body' : 'face'; render(); };
      m.querySelector('[data-rand]').onclick = () => { const r = GR.NPC.randomApp(Math.random); Object.assign(app, r); upd(); render(); };
      m.querySelector('[data-reset]').onclick = () => { Object.assign(app, JSON.parse(JSON.stringify(starter.app))); upd(); render(); };
      m.querySelector('[data-done]').onclick = () => naming(slot, starter, app);
      m.querySelector('[data-back]').onclick = () => select(slot);
    };
    render();
  }
  function naming(slot, starter, app) {
    const m = show(`<div class="mpanel"><h2>WHAT'S YOUR NAME?</h2><input id="pname" maxlength="18" value="${esc(starter.name.split(' ')[0])}" autofocus><p class="muted">This is how Mog City (and your followers) will know you.</p><div class="row"><button class="btn go big" id="startg">🏙️ Enter Mog City</button><button class="btn" data-back>← Back</button></div></div>`);
    const inp = m.querySelector('#pname'); inp.focus(); inp.select();
    const go = () => { const name = (inp.value || '').trim().replace(/[<>]/g, '').slice(0, 18) || 'Rat'; const s = GR.Save.fresh(starter, name, app, starter.outfit); s.slot = slot; GR.Save.save(s, true); begin(s); };
    m.querySelector('#startg').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    m.querySelector('[data-back]').onclick = () => creator(slot, starter, app);
  }
  function menuSettings() {
    // reuse the in-game settings panel without a running game
    GR.Game.mode = 'menu'; GR.UI.settingsPanel();
  }
  function credits() { const m = show(`<div class="mpanel"><h2>🎬 CREDITS</h2><p><b>GYM RAT 2000: THE MOGGING ERA</b></p><p>Design, code, procedural art, animation, music & sound: built in-browser with three.js (MIT). All brands, people, songs and places are fictional.</p><p>Every model, texture, hairstyle, outfit, track and sound effect is generated procedurally at runtime — no external assets.</p><button class="btn" data-back>← Back</button></div>`); m.querySelector('[data-back]').onclick = title; }
  function begin(state) {
    root().hidden = true; root().innerHTML = '';
    document.getElementById('loading').hidden = false; document.getElementById('loadtxt').textContent = 'Loading Mog City…';
    setTimeout(() => { try { GR.Game.startGame(state); } catch (e) { console.error(e); alert('Error starting game: ' + e.message); } document.getElementById('loading').hidden = true; if (ms) { ms.chars.forEach(c => c.root.visible = false); } }, 60);
  }
  function boot() {
    const lt = document.getElementById('loadtxt');
    const steps = [['Sculpting faces…', () => { }], ['Building Mog City…', () => GR.Game.init()], ['Casting characters…', () => buildStage()]];
    let i = 0; const next = () => { if (i >= steps.length) { document.getElementById('loading').hidden = true; GR.UI.menuFrame = frame; title(); return; } lt.textContent = steps[i][0]; setTimeout(() => { try { steps[i][1](); } catch (e) { console.error(e); lt.textContent = 'Error: ' + e.message; return; } i++; next(); }, 30); };
    next();
    const st = GR.Save.settings(); GR.Audio.setVolumes({ music: st.music, sfx: st.sfx, dialogue: st.dialogue, mute: st.mute });
    window.addEventListener('pointerdown', () => GR.Audio.resume(), { once: true });
  }
  return { boot, title, frame };
})();

/* ---------------- TUTORIAL ---------------- */
GR.Tutorial = (() => {
  const U = GR.U;
  const STEPS = [
    { t: 'Walk with WASD, look with the mouse (click the game to lock the cursor).', check: () => GR.Game.P.distAcc > 6 || GR.state.stats.distance > 10 },
    { t: 'Press F to check your phone — it\'s your whole social life.', on: 'phone' },
    { t: 'Leave your apartment through the green front door.', on: 'zone', test: d => d.id === 'city' },
    { t: 'Follow the 📍 waypoint to Iron Temple and finish a workout.', on: 'evt:workout', way: 'gym' },
    { t: 'Hit up Drip Street (west) and buy any piece of clothing.', on: 'evt:buy', way: 'shopping' },
    { t: 'Press C for photo mode and post a pic to Clout.', on: 'evt:post' }
  ];
  let unsub = [];
  function s() { return GR.state.tut; }
  function text() { const st = STEPS[s().step]; return st ? `Tutorial ${s().step + 1}/${STEPS.length}: ${st.t}` : ''; }
  function start() { if (s().done) return; bind(); GR.UI.banner('WELCOME TO MOG CITY', 'Your apartment in Mog Towers. Time to start your main character arc.'); }
  function bind() {
    unsub.forEach(f => f()); unsub = [];
    const st = STEPS[s().step]; if (!st) { finish(); return; }
    if (st.way) { const m = GR.World.markers.find(m => m.id === st.way); if (m) GR.UI.waypoint = { x: m.x, z: m.z, name: m.name }; }
    if (st.on) unsub.push(GR.Bus.on(st.on, d => { if (!st.test || st.test(d)) adv(); }));
    if (st.check) { const iv = setInterval(() => { if (!GR.state || s().done) { clearInterval(iv); return; } if (STEPS[s().step] === st && st.check()) { clearInterval(iv); adv(); } }, 500); unsub.push(() => clearInterval(iv)); }
  }
  function adv() { s().step++; GR.Audio.sfx('achievement'); GR.Prog.addMoney(25); bind(); }
  function finish() { s().done = true; unsub.forEach(f => f()); GR.Prog.addMoney(100); GR.Prog.addXP(100); GR.Prog.notify('Tutorial complete! +$100. Mog City is yours. Try the arena, make friends, get sponsored.', '🎓', 'big'); GR.Save.save(GR.state); }
  return { start, text };
})();
