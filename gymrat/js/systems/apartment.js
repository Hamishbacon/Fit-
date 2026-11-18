/* Apartment: furniture built from the save, decorate mode (top-down placement with rotate/move/remove + overlap checks),
   trophy wall + collectible shelves, interactive furniture (bed, sofa/TV, gaming PC streaming, arcade, home gym, mirror). */
'use strict';
GR.Apt = (() => {
  const U = GR.U, D = GR.Data, P = GR.Props;
  let zn = null, deco = null;
  const S = () => GR.state;
  const def = id => D.FURNITURE.find(f => f.id === id);

  function load() { zn = GR.World.zones.apartment; }
  function build() {
    load(); const g = zn.furnGroup; while (g.children.length) g.remove(g.children[0]);
    zn.furnBoxes.forEach(b => zn.removeBox(b)); zn.furnBoxes = [];
    zn.inter = zn.inter.filter(i => !i.furn);
    zn.seats = zn.seats.filter(s => !s.furn);
    zn.mirrors = zn.mirrors.filter(m => !m.furn);
    S().apt.items.forEach(it => place(it));
    trophies();
  }
  function footprint(d, ry) { const c = Math.abs(Math.cos(ry)) > 0.5; return { w: c ? d.w : d.d, d: c ? d.d : d.w }; }
  function place(it, ghost) {
    const d = def(it.id); if (!d) return null;
    const m = P.furniture(d, it.c); m.position.set(zn.ox + it.x, d.surf === 'wall' ? 0 : 0, it.z); m.rotation.y = it.ry; zn.furnGroup.add(m); m.userData.item = it;
    if (ghost) return m;
    if (!d.flat && d.surf !== 'wall') { const f = footprint(d, it.ry); const b = zn.boxC(zn.ox + it.x, it.z, f.w * 0.92, f.d * 0.92, d.seat || d.bed ? 0.5 : 1.2); zn.furnBoxes.push(b); }
    const fwd = new THREE.Vector3(Math.sin(it.ry), 0, Math.cos(it.ry));
    const front = (dist) => new THREE.Vector3(zn.ox + it.x + fwd.x * dist, 0, it.z + fwd.z * dist);
    const add = (o) => zn.interact(Object.assign({ furn: true }, o));
    if (d.bed) add({ id: 'f_bed_' + it.uid, pos: front(0).add(new THREE.Vector3(Math.cos(it.ry) * (d.w / 2 + 0.5), 0, -Math.sin(it.ry) * (d.w / 2 + 0.5))), r: 1.6, prompt: 'Sleep until morning (restore energy, save)', action: () => sleepIn(m, it), kind: 'misc' });
    if (d.seat) zn.seats.push({ furn: true, x: zn.ox + it.x + fwd.x * 0.1, z: it.z + fwd.z * 0.1, ry: it.ry, h: d.kind === 'beanbag' ? 0.4 : 0.5, anim: d.kind === 'gamechair' ? 'sitGame' : 'sitChill' });
    if (d.tv) add({ id: 'f_tv_' + it.uid, pos: front(1.4), r: 1.6, prompt: 'Watch MOG TV', action: () => tv(m), kind: 'misc' });
    if (d.kind === 'desk') add({ id: 'f_pc_' + it.uid, pos: front(0.9), r: 1.4, prompt: 'Gaming PC: stream on Clout.tv / play', action: () => stream(m, it), kind: 'misc' });
    if (d.kind === 'arcade') add({ id: 'f_arc_' + it.uid, pos: front(0.9), r: 1.3, prompt: 'Play MOG RUN (arcade)', action: () => arcade(), kind: 'misc' });
    if (d.gym) { const mach = m.userData.machine; mach.world = { zone: 'apartment', x: zn.ox + it.x, z: it.z, ry: it.ry, y: 0 }; add({ id: 'f_gym_' + it.uid, pos: front(d.gym === 'punch' ? -0.4 : 0.9), r: 1.4, prompt: 'Home workout: ' + D.MACHINES[d.gym].n, action: () => GR.Mini.startWorkout(d.gym, mach), kind: 'machine' }); }
    if (d.mirror && m.userData.mirror) { m.userData.mirror.furn = true; zn.mirrors.push(m.userData.mirror); add({ id: 'f_mir_' + it.uid, pos: front(1.0), r: 1.2, prompt: 'Mirror: outfit check (wardrobe)', action: () => GR.Shops.wardrobe({ home: true }), kind: 'wardrobe' }); }
    if (d.light && m.userData.lightAt) zn.light(zn.ox + it.x, 1.6, it.z, '#ffe2b0', 0.8, 7);
    if (d.display) { const slots = m.userData.slots || []; const col = Object.entries(S().owned.collectibles); const tro = S().owned.trophies; let k = 0; slots.forEach(sp => { let obj = null; if (d.kind === 'trophycase' && tro[k]) obj = P.trophy(tierCol(tro[k].tierIdx), 1.4); else if (col[k - (d.kind === 'trophycase' ? tro.length : 0)]) obj = figurine(col[k][0]); if (obj) { obj.position.copy(sp); m.add(obj); } k++; }); }
    return m;
  }
  const tierCol = i => ['#c48b6a', '#d9d9de', '#e8c45a', '#9ad1ff'][i || 0];
  function figurine(id) { const g = new THREE.Group(); const r = U.rng(id); const col = U.pick(['#e8c45a', '#ff4fa3', '#28e0ff', '#10b981', '#7b61ff', '#f97316']); P.cyl(0.06, 0.07, 0.03, P.std('#222', 0.4), 0, 0.015, 0, g); const body = P.mesh(new THREE.SphereGeometry(0.05, 10, 8), P.std(col, 0.25, 0.6), 0, 0.09, 0, 0, 0, 0, g); body.scale.y = 1.3; P.mesh(new THREE.SphereGeometry(0.035, 10, 8), P.std(col, 0.25, 0.6), 0, 0.17, 0, 0, 0, 0, g); return g; }
  function trophies() {
    const tw = zn.trophyWall; while (tw.g.children.length > 2) tw.g.remove(tw.g.children[tw.g.children.length - 1]);
    S().owned.trophies.slice(0, tw.slots.length).forEach((t, i) => { const tr = P.trophy(tierCol(t.tierIdx), 1.2); tr.position.copy(tw.slots[i]); tw.g.add(tr); });
  }

  /* ------------ furniture interactions ------------ */
  function sleepIn(m, it) { const g = GR.Game; g.lockPlayer(true); const fwd = it.ry; g.P.pos.set(zn.ox + it.x, 0, it.z); g.player.root.position.copy(g.P.pos); g.P.facing = fwd + Math.PI; g.player.root.rotation.y = g.P.facing; g.player.anim.play('sleep'); g.camTo({ pos: new THREE.Vector3(zn.ox + it.x + 2, 3, it.z + 2), look: new THREE.Vector3(zn.ox + it.x, 0.6, it.z), dur: 1 }); setTimeout(() => { g.sleep(); setTimeout(() => { g.player.anim.stop(); g.lockPlayer(false); g.camRelease(); g.P.pos.x += Math.cos(it.ry) * (def(it.id).w / 2 + 0.6); g.P.pos.z -= Math.sin(it.ry) * (def(it.id).w / 2 + 0.6); g.player.root.position.copy(g.P.pos); }, 1300); }, 1200); }
  function tv(m) {
    const s = S(), scr = m.userData.screen; let ch = 0;
    const chans = [() => ['MOG NEWS', 'Day ' + (Math.floor(s.time / 24) + 1) + ': ' + U.pick(['Local rat benches car.', 'Plaza party tonight!', 'Drip Depot restock.', 'Gary walks straight line.']), 'Weather: ' + s.weather.toUpperCase()],
      () => ['YOUR STATS', 'Lv ' + s.level + '  ' + U.money(s.money), U.kfmt(s.followers) + ' followers', 'Rep ' + s.rep],
      () => ['MOG-OFF TV', 'Season ' + s.comp.season, 'Your wins: ' + s.stats.wins, 'Tier: ' + D.TIERS[s.comp.unlockedTier || 0].n],
      () => ['GYM RAT 2000', 'THE MOGGING ERA', 'Workouts: ' + s.stats.workouts, 'S ranks: ' + s.stats.sRanks]];
    const draw = () => { const c = scr.ctx; c.fillStyle = ['#13213a', '#1b1b1d', '#2b1d3b', '#3a0d0d'][ch]; c.fillRect(0, 0, 256, 160); c.fillStyle = '#fff'; c.font = 'bold 20px monospace'; chans[ch]().forEach((l, i) => c.fillText(l.slice(0, 22), 10, 30 + i * 32)); scr.tex.needsUpdate = true; };
    draw(); GR.Game.player.anim.play('sitChill');
    const p = GR.UI.open('tv', { title: '📺 MOG TV', cls: 'small', html: `<p>Kick back. Watching TV restores a little energy and passes time.</p><div class="row"><button class="btn" id="tvn">Next channel</button><button class="btn go" id="tvw">Watch 1 hour (+10 energy)</button></div>` });
    p.querySelector('#tvn').onclick = () => { ch = (ch + 1) % chans.length; draw(); GR.Audio.sfx('beep'); };
    p.querySelector('#tvw').onclick = () => { GR.Game.fade(() => { s.time += 1; s.energy = Math.min(100, s.energy + 10); GR.UI.toast('📺 You watched an hour of MOG TV. Relaxed. +10 energy'); }, 0.5); };
  }
  function stream(m, it) {
    const s = S(), g = GR.Game; const chair = s.apt.items.find(x => x.id === 'gamechair');
    g.player.anim.play('sitGame');
    const p = GR.UI.open('pc', { title: '🖥️ CLOUT.TV — GO LIVE', cls: 'small', html: `<p>Stream a gaming session to your followers. Bigger audiences = more tips and followers. Takes 2 in-game hours and 15 energy.</p><p>Viewers expected: <b>${Math.max(3, Math.round(s.followers * 0.03))}</b></p><div class="row"><button class="btn go" id="golive">🔴 Go live</button><button class="btn" id="arc">🎮 Practice MOG RUN</button></div>` });
    p.querySelector('#golive').onclick = () => { if (s.energy < 15) { GR.UI.toast('🥱 Too tired to stream.', 'warn'); return; } GR.UI.close(); g.fade(() => { s.time += 2; s.energy -= 15; const viewers = Math.max(3, Math.round(s.followers * U.rand(0.02, 0.05))); const tips = Math.round(viewers * U.rand(0.3, 0.8)) + 10; const fol = Math.round(viewers * U.rand(0.2, 0.5)) + 5; GR.Prog.addMoney(tips); GR.Prog.addFollowers(fol); GR.Prog.addXP(40); GR.Prog.stat('streams'); GR.Prog.event('stream', {}); GR.UI.toast(`🔴 Stream ended: ${viewers} viewers, +${U.money(tips)} tips, +${fol} followers`); }, 0.6); };
    p.querySelector('#arc').onclick = () => { GR.UI.close(); arcade(); };
  }
  function arcade() {
    // tiny endless-runner on a canvas: jump the dumbbells
    const p = GR.UI.open('arcade', { title: '🕹️ MOG RUN', cls: 'small', html: `<canvas id="arc" width="480" height="200"></canvas><p class="muted">SPACE to jump. Collect protein ⭐. Don't trip on dumbbells.</p>` });
    const cv = p.querySelector('#arc'), c = cv.getContext('2d'); let y = 0, vy = 0, obs = [], stars = [], t = 0, score = 0, alive = true, spd = 220;
    const off = GR.Input.onKey(code => { if (GR.UI.topId() !== 'arcade') { off(); return false; } if (code === 'Space') { if (!alive) { obs = []; stars = []; score = 0; t = 0; alive = true; spd = 220; } else if (y === 0) vy = 420; return true; } return false; });
    let last = performance.now();
    const tick = () => { if (GR.UI.topId() !== 'arcade') { const best = S().flags.arcadeBest || 0; if (score > best) { S().flags.arcadeBest = Math.floor(score); GR.UI.toast('🕹️ New MOG RUN high score: ' + Math.floor(score)); } if (score > 50) GR.Prog.addXP(Math.min(60, Math.floor(score / 10))); return; } const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (alive) { t += dt; score += dt * 10; spd += dt * 6; vy -= 1200 * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = 0; if (Math.random() < dt * 1.1) obs.push(480); if (Math.random() < dt * 0.8) stars.push({ x: 480, y: 40 + Math.random() * 60 }); obs = obs.map(o => o - spd * dt).filter(o => o > -30); stars.forEach(s2 => s2.x -= spd * dt); stars = stars.filter(s2 => { if (Math.abs(s2.x - 60) < 18 && Math.abs(150 - y - s2.y) < 22) { score += 25; GR.Audio.sfx('coin'); return false; } return s2.x > -20; }); if (obs.some(o => Math.abs(o - 60) < 20 && y < 24)) { alive = false; GR.Audio.sfx('error'); } }
      c.fillStyle = '#120a22'; c.fillRect(0, 0, 480, 200); c.fillStyle = '#7b61ff'; c.fillRect(0, 170, 480, 30); c.fillStyle = '#5ff0ff'; c.fillRect(48, 150 - y - 20, 24, 40); c.fillStyle = '#ffd23f'; stars.forEach(s2 => c.fillText('⭐', s2.x, s2.y)); c.fillStyle = '#ff4fa3'; obs.forEach(o => { c.fillRect(o - 14, 160, 28, 8); c.fillRect(o - 16, 152, 6, 18); c.fillRect(o + 10, 152, 6, 18); }); c.fillStyle = '#fff'; c.font = 'bold 16px monospace'; c.fillText('SCORE ' + Math.floor(score), 10, 22); if (!alive) { c.font = 'bold 24px monospace'; c.fillText('GAME OVER — SPACE', 120, 100); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ------------ decorate mode ------------ */
  function decorate() {
    if (GR.World.current !== 'apartment') return; load();
    const g = GR.Game, s = S(), B = zn.placeArea;
    g.lockPlayer(true); g.player.root.visible = false;
    g.camTo({ pos: new THREE.Vector3(zn.ox - 0.5, 17, 1.0), look: new THREE.Vector3(zn.ox - 0.5, 0, 0), dur: 0.7, fov: 55 });
    deco = { sel: null, ghost: null, ry: 0, moving: null };
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = GR.UI.open('deco', { title: '🛠️ DECORATE APARTMENT', side: 'right', cls: 'shop deco', onClose: () => { endGhost(); g.lockPlayer(false); g.player.root.visible = true; g.camRelease(); window.removeEventListener('mousemove', mm); g.renderer.domElement.removeEventListener('click', clk); off(); build(); GR.Save.save(s); deco = null; } });
    const render = () => {
      const groups = {}; s.owned.furniture.forEach(f => { (groups[f.id] = groups[f.id] || []).push(f); });
      p.querySelector('.pb').innerHTML = `<p class="muted">Mouse: position • <span class="k">R</span> rotate 90° • <span class="k">Q</span>/<span class="k">E</span> fine rotate • Click / <span class="k">Enter</span> place • <span class="k">Del</span> store selected • Esc exit</p>
        <h4>Storage (${s.owned.furniture.length})</h4><div class="grid">${Object.entries(groups).map(([id, arr]) => `<button class="card ${deco.sel && deco.sel.id === id && !deco.moving ? 'sel' : ''}" data-st="${arr[0].uid}"><div class="sw" style="background:${def(id).colors[arr[0].c % def(id).colors.length]}"><span>🛋️</span></div><b>${esc(def(id).n)}</b><small>×${arr.length}${def(id).surf === 'wall' ? ' • wall' : ''}</small></button>`).join('') || '<p class="muted">Storage empty. Buy decor at Nest & Co or win it from mystery machines.</p>'}</div>
        <h4>Placed (${s.apt.items.length})</h4><div class="grid">${s.apt.items.map(it => `<button class="card ${deco.moving === it ? 'sel' : ''}" data-pl="${it.uid}"><b>${esc(def(it.id).n)}</b><small>move</small></button>`).join('')}</div>
        ${deco.moving ? `<div class="row"><button class="btn" id="dstore">📦 Put "${esc(def(deco.moving.id).n)}" in storage</button></div>` : ''}`;
      p.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const f = s.owned.furniture.find(x => x.uid === b.dataset.st); startGhost(f, false); render(); });
      p.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const it = s.apt.items.find(x => x.uid === b.dataset.pl); startGhost(it, true); render(); });
      const ds = p.querySelector('#dstore'); if (ds) ds.onclick = () => storeSel();
    };
    const esc = U.esc;
    function startGhost(item, moving) {
      endGhost(); deco.sel = item; deco.moving = moving ? item : null; deco.ry = moving ? item.ry : 0;
      if (moving) { s.apt.items = s.apt.items.filter(x => x !== item); build(); s.apt.items.push(item); /* keep in list; ghost replaces visually */ s.apt.items = s.apt.items.filter(x => x !== item); }
      const gh = P.furniture(def(item.id), item.c); gh.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.65; } }); zn.furnGroup.add(gh); deco.ghost = gh; deco.pos = { x: 0, z: 0 };
    }
    function endGhost() { if (deco && deco.ghost) { zn.furnGroup.remove(deco.ghost); deco.ghost = null; } if (deco && deco.moving) { s.apt.items.push(deco.moving); deco.moving = null; build(); } }
    function valid() {
      const d = def(deco.sel.id); const f = footprint(d, deco.ry); const x = deco.pos.x, z = deco.pos.z;
      if (d.surf === 'wall') return true;
      if (x - f.w / 2 < B.x1 - zn.ox - 0.05 || x + f.w / 2 > B.x2 - zn.ox + 0.05 || z - f.d / 2 < B.z1 - 0.05 || z + f.d / 2 > B.z2 + 0.05) return false;
      if (d.flat) return true;
      for (const b of zn.boxes) { if (zn.furnBoxes.includes(b) || b.top < 0.2) continue; if (b.x2 - zn.ox > x - f.w / 2 + 0.05 && b.x1 - zn.ox < x + f.w / 2 - 0.05 && b.z2 > z - f.d / 2 + 0.05 && b.z1 < z + f.d / 2 - 0.05) return false; }
      for (const it of s.apt.items) { const dd = def(it.id); if (dd.flat || dd.surf === 'wall') continue; const ff = footprint(dd, it.ry); if (Math.abs(it.x - x) < (ff.w + f.w) / 2 - 0.05 && Math.abs(it.z - z) < (ff.d + f.d) / 2 - 0.05) return false; }
      return true;
    }
    function mm(e) {
      if (!deco || !deco.ghost) return; const r = g.renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, g.camera);
      const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return;
      const d = def(deco.sel.id);
      let x = Math.round((hit.x - zn.ox) * 4) / 4, z = Math.round(hit.z * 4) / 4;
      if (d.surf === 'wall') { const Bz = zn.bounds; const dists = [[z - Bz.z1, 'n'], [Bz.z2 - z, 's'], [x - (Bz.x1 - zn.ox), 'w'], [(Bz.x2 - zn.ox) - x, 'e']].sort((a, b) => a[0] - b[0]); const w = dists[0][1]; if (w === 'n') { z = Bz.z1 + 0.07; deco.ry = 0; } if (w === 's') { z = Bz.z2 - 0.07; deco.ry = Math.PI; } if (w === 'w') { x = Bz.x1 - zn.ox + 0.07; deco.ry = Math.PI / 2; } if (w === 'e') { x = Bz.x2 - zn.ox - 0.07; deco.ry = -Math.PI / 2; } }
      deco.pos = { x, z }; deco.ghost.position.set(zn.ox + x, 0, z); deco.ghost.rotation.y = deco.ry;
      const ok = valid(); deco.ghost.traverse(o => { if (o.isMesh) o.material.emissive && o.material.emissive.set(ok ? '#003300' : '#660000'); });
    }
    function clk() { if (!deco || !deco.ghost) return; if (!valid()) { GR.Audio.sfx('error'); GR.UI.toast('❌ Doesn\'t fit there.'); return; } const it = deco.moving || deco.sel; const item = { uid: it.uid, id: it.id, c: it.c, x: deco.pos.x, z: deco.pos.z, ry: deco.ry, wall: def(it.id).surf === 'wall' }; if (!deco.moving) { s.owned.furniture = s.owned.furniture.filter(x => x.uid !== it.uid); GR.Prog.stat('furnPlaced'); GR.Prog.event('furniture', { id: it.id }); } deco.moving = null; zn.furnGroup.remove(deco.ghost); deco.ghost = null; s.apt.items.push(item); build(); GR.Audio.sfx('pop'); GR.Save.save(s); deco.sel = null; render(); }
    function storeSel() { if (!deco.moving) return; const it = deco.moving; s.owned.furniture.push({ uid: it.uid, id: it.id, c: it.c }); deco.moving = null; if (deco.ghost) zn.furnGroup.remove(deco.ghost); deco.ghost = null; deco.sel = null; build(); GR.Save.save(s); render(); }
    window.addEventListener('mousemove', mm); g.renderer.domElement.addEventListener('click', clk);
    const off = GR.Input.onKey(code => { if (!deco) return false; if (code === 'KeyR') { deco.ry += Math.PI / 2; return true; } if (code === 'KeyQ') { deco.ry -= Math.PI / 12; return true; } if (code === 'KeyE') { deco.ry += Math.PI / 12; return true; } if (code === 'Enter') { clk(); return true; } if (code === 'Delete' || code === 'Backspace') { storeSel(); return true; } return false; });
    render();
  }

  /* ------------ small offscreen preview renderer (shop thumbnails, phone videos) ------------ */
  let pv = null;
  function pvInit() { if (pv) return pv; const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(420, 420); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x777788, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 4, 3); sc.add(dl); const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 50); pv = { r, sc, cam }; return pv; }
  function previewFurniture(canvas, d, c) {
    const v = pvInit(); const obj = P.furniture(d, c); v.sc.add(obj); const size = Math.max(d.w, d.d, 1.2); v.cam.position.set(size * 1.3, size * 1.0 + 0.6, size * 1.6); v.cam.lookAt(0, d.surf === 'wall' ? 1.6 : 0.4, 0); v.r.setSize(canvas.width, canvas.height); v.cam.aspect = canvas.width / canvas.height; v.cam.updateProjectionMatrix(); v.r.setClearColor(0x000000, 0); v.r.render(v.sc, v.cam); canvas.getContext('2d').drawImage(v.r.domElement, 0, 0); v.sc.remove(obj);
  }
  function update(dt) { if (GR.World.current === 'apartment' && zn) { const t = performance.now() / 1000; zn.furnGroup.children.forEach(m => m.traverse && m.children.forEach(ch => { if (ch.userData.blob != null) ch.position.y = 0.28 + ch.userData.blob * 0.07 + Math.sin(t * 0.7 + ch.userData.blob * 2) * 0.05; })); } }
  return { load, build, decorate, previewFurniture, pvInit, update, figurine, get decorating() { return !!deco; } };
})();
