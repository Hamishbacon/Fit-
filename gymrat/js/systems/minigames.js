/* Workout minigames (one engine, eight mechanics mapped onto 16 machines) + basketball shooting + trainer challenges.
   Each workout: intro card → countdown → active play synced to the character + machine animation → results, rewards, records. */
'use strict';
GR.Mini = (() => {
  const U = GR.U, D = GR.Data;
  let G = null; // active game
  let cv, cx, unKey = null, hoop = null;
  const DIFF = [{ n: 'Light', k: 0.8, pay: 0.8 }, { n: 'Standard', k: 1, pay: 1 }, { n: 'Heavy', k: 1.25, pay: 1.4 }, { n: 'Beast Mode', k: 1.5, pay: 1.9 }];
  const ARROWS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'], AGLYPH = { ArrowUp: '▲', ArrowRight: '▶', ArrowDown: '▼', ArrowLeft: '◀' };
  const grade = acc => acc >= 0.92 ? 'S' : acc >= 0.8 ? 'A' : acc >= 0.65 ? 'B' : acc >= 0.45 ? 'C' : 'D';
  function canvas() { if (!cv) { cv = document.getElementById('mini'); cx = cv.getContext('2d'); } cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); cv.hidden = false; }
  function rec(type) { const s = GR.state; if (!s.stats.machines[type]) s.stats.machines[type] = { best: 0, sessions: 0, bestGrade: null, unlocked: 1, history: [] }; return s.stats.machines[type]; }

  /* ------------ start ------------ */
  function startWorkout(type, machine, opts = {}) {
    if (G) return;
    const s = GR.state, M = D.MACHINES[type], game = GR.Game;
    if (!opts.comp && s.energy < 6) { GR.UI.toast('🥱 Too tired to train. Eat, drink or sleep to restore energy.', 'warn'); return; }
    const r = rec(type);
    G = { type, M, machine, opts, phase: 'intro', t: 0, diff: opts.comp ? Math.min(3, Math.round(opts.comp.diff * 3)) : Math.min(r.unlocked, 1), score: 0, hits: 0, total: 0, perfect: 0, combo: 0, maxCombo: 0, reps: 0, p: 0, repAnim: 0, side: 0, fx: [], speed: 0, phaseRun: 0, dist: 0 };
    game.lockPlayer(true); game.pushUI(); game.standUp && game.standUp();
    // move the character onto the machine
    if (machine) {
      const w = machine.world, a = machine.anchor, c = Math.cos(w.ry), sn = Math.sin(w.ry);
      const px = w.x + a.x * c + a.z * sn, pz = w.z - a.x * sn + a.z * c;
      game.P.pos.set(px, (w.y || 0) + (a.y || 0), pz); game.player.root.position.copy(game.P.pos); game.P.facing = w.ry + (a.ry || 0); game.player.root.rotation.y = game.P.facing;
      const target = new THREE.Vector3(px, (w.y || 0) + 0.9, pz);
      game.camTo({ orbit: { target, yaw: game.P.facing + (['bench', 'legpress', 'rower'].includes(type) ? Math.PI / 2 : Math.PI * 0.8), dist: ['bench', 'rower', 'legpress', 'treadmill'].includes(type) ? 3.6 : 3.0, h: 0.9, lookH: 0.2 }, dur: 0.7 });
    }
    game.player.anim.play(M.anim, { p: 0, side: 0, speed: 0, phase: 0 });
    canvas(); document.getElementById('hud').classList.add('photo');
    unKey = GR.Input.onKey((code, e) => onKey(code, e, true));
    window.addEventListener('keyup', onKeyUp);
    GR.UI.miniIntro(G, DIFF, r, d => { G.diff = d; begin(); }, () => cancel());
  }
  function begin() { G.phase = 'count'; G.t = 0; setupGame(); GR.Audio.music(G.opts.comp ? 'arena' : 'gym'); }
  function setupGame() {
    const k = DIFF[G.diff].k * (GR.Prog.hasBuff('focus') ? 0.85 : 1) * (GR.state.energy < 15 ? 1.15 : 1);
    G.k = k; const gm = G.M.game;
    if (gm === 'timing') { G.mark = 0; G.dir = 1; G.zone = { c: U.rand(0.35, 0.65), w: 0.2 / k }; G.total = G.M.reps; }
    if (gm === 'squat') { G.depth = 0; G.holding = false; G.band = { lo: 0.62, hi: 0.62 + 0.18 / k }; G.total = G.M.reps; G.lastHold = null; }
    if (gm === 'rhythm' || gm === 'rhythm2') { G.notes = []; G.spawnT = 0; G.dur = G.M.dur; G.bpm = 100 * k; G.lanes = gm === 'rhythm' ? ['KeyA', 'KeyD'] : ['KeyW', 'KeyS']; G.noteIdx = 0; }
    if (gm === 'pedal') { G.dur = G.M.dur; G.beat = 0; G.beatT = 0; G.cad = 0.75 / k; G.expect = 'KeyA'; G.windowHit = false; }
    if (gm === 'sequence') { G.total = G.M.reps; G.seqLen = 3; newSeq(); }
    if (gm === 'reaction') { G.total = G.M.reps; G.prompt = null; G.wait = 0.6; }
    if (gm === 'alternate') { G.total = G.M.reps; G.beatT = 0; G.beatLen = 0.85 / k; G.expect = 'KeyQ'; G.got = false; G.pairs = 0; }
  }
  function newSeq() { G.seq = Array.from({ length: G.seqLen }, () => U.pick(ARROWS)); G.seqIn = []; G.show = 1.2 + G.seqLen * 0.35; G.seqT = 0; G.limit = 2.5 + G.seqLen * 0.6 / G.k; }
  function judge(q, label) {
    // q: 0 miss, 1 ok, 2 good, 3 perfect
    G.total = Math.max(G.total, 0);
    const pts = [0, 50, 80, 100][q];
    if (q > 0) { G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.hits++; } else G.combo = 0;
    if (q === 3) G.perfect++;
    G.score += Math.round(pts * (1 + Math.min(G.combo, 20) * 0.05));
    G.acc = (G.acc || 0) + [0, 0.6, 0.85, 1][q]; G.judged = (G.judged || 0) + 1;
    G.fx.push({ t: 0, txt: label || ['MISS', 'OK', 'GOOD', 'PERFECT!'][q], col: ['#ff5a5a', '#ffd23f', '#7cff6b', '#5ff0ff'][q] });
    GR.Audio.sfx(['miss', 'good', 'good', 'perfect'][q]);
    if (q === 0) GR.Game.player.setExpr('strain', 1); else if (q === 3 && G.combo % 5 === 0) GR.Game.player.setExpr('smile', 1);
  }
  function rep(ok = true) { if (ok) { G.reps++; G.repAnim = 1; G.side++; GR.Audio.sfx('clank'); } else { G.repAnim = 0.5; } }

  /* ------------ input ------------ */
  function onKey(code, e) {
    if (!G) return false;
    if (code === 'Escape') { if (G.phase === 'results') { finish(); return true; } if (G.phase !== 'intro') { cancel(); return true; } return false; }
    if (G.phase !== 'play') return G.phase === 'count' || G.phase === 'results' ? true : false;
    if (e.repeat) return true;
    const gm = G.M.game;
    if (gm === 'timing' && code === 'Space') { const d = Math.abs(G.mark - G.zone.c) / (G.zone.w / 2); const q = d < 0.25 ? 3 : d < 0.65 ? 2 : d < 1 ? 1 : 0; judge(q); rep(q > 0); G.zone = { c: U.rand(0.25, 0.75), w: Math.max(0.07, (0.2 - G.reps * 0.006) / G.k) }; G.speedUp = 1 + G.reps * 0.06; return true; }
    if (gm === 'squat' && code === 'Space') { G.holding = true; G.holdStart = G.t; return true; }
    if ((gm === 'rhythm' || gm === 'rhythm2') && G.lanes.includes(code)) { const lane = G.lanes.indexOf(code); let best = null; G.notes.forEach(n => { if (n.lane === lane && !n.done) { const d = Math.abs(n.y - 0.85); if (d < 0.12 && (!best || d < Math.abs(best.y - 0.85))) best = n; } }); if (best) { best.done = true; const d = Math.abs(best.y - 0.85); judge(d < 0.03 ? 3 : d < 0.06 ? 2 : 1); G.speed = Math.min(4, G.speed + 0.25); G.repAnim = 1; } else { judge(0); G.speed = Math.max(0.5, G.speed - 0.4); } return true; }
    if (gm === 'pedal' && (code === 'KeyA' || code === 'KeyD')) { const ph = G.beatT / G.cad; const inWin = ph > 0.7 || ph < 0.15; if (code === G.expect && inWin && !G.windowHit) { G.windowHit = true; judge(ph > 0.85 || ph < 0.05 ? 3 : 2); G.speed = Math.min(4, G.speed + 0.35); G.expect = G.expect === 'KeyA' ? 'KeyD' : 'KeyA'; } else { judge(0); G.speed = Math.max(0.3, G.speed - 0.5); } return true; }
    if (gm === 'sequence' && ARROWS.includes(code)) { if (G.show > 0) return true; const i = G.seqIn.length; G.seqIn.push(code); if (G.seq[i] !== code) { judge(0); rep(false); G.seqLen = Math.max(3, G.seqLen - 1); newSeq(); } else if (G.seqIn.length === G.seq.length) { judge(G.seqT < G.limit * 0.5 ? 3 : 2); rep(true); if (G.reps % 2 === 0) G.seqLen = Math.min(7, G.seqLen + 1); newSeq(); } else GR.Audio.sfx('beep'); return true; }
    if (gm === 'reaction' && ARROWS.includes(code)) { if (!G.prompt) { judge(0); return true; } if (code === G.prompt.key) { const r = G.prompt.t / G.prompt.win; judge(r < 0.35 ? 3 : r < 0.7 ? 2 : 1); rep(true); if (G.machine && G.machine.type === 'punch') { G.machine.hitData = (G.machine.hitData || 0) + 1; GR.Audio.sfx('punch'); } } else { judge(0); rep(false); } G.prompt = null; G.wait = U.rand(0.25, 0.6) / G.k; return true; }
    if (gm === 'alternate' && (code === 'KeyQ' || code === 'KeyE')) { const ph = G.beatT / G.beatLen; const inWin = ph > 0.72 || ph < 0.2; if (code === G.expect && inWin && !G.got) { G.got = true; judge(ph > 0.86 || ph < 0.08 ? 3 : 2); G.expect = G.expect === 'KeyQ' ? 'KeyE' : 'KeyQ'; if (G.expect === 'KeyQ') { rep(true); } } else { judge(0); } return true; }
    return ['Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ', 'KeyE', ...ARROWS].includes(code);
  }
  function onKeyUp(e) { if (!G || G.phase !== 'play') return; if (G.M.game === 'squat' && e.code === 'Space' && G.holding) { G.holding = false; const d = G.depth; const inBand = d >= G.band.lo && d <= G.band.hi; const held = G.t - G.holdStart; let q = 0; if (inBand) { const mid = (G.band.lo + G.band.hi) / 2; const dd = Math.abs(d - mid) / ((G.band.hi - G.band.lo) / 2); q = dd < 0.35 ? 3 : dd < 0.75 ? 2 : 1; if (G.lastHold != null && Math.abs(held - G.lastHold) < 0.15 && q < 3) q++; } judge(q, q === 0 ? (d < G.band.lo ? 'TOO SHALLOW' : 'TOO DEEP') : null); rep(q > 0); G.lastHold = held; G.rise = 1; G.band = { lo: U.rand(0.5, 0.72), hi: 0 }; G.band.hi = G.band.lo + Math.max(0.08, 0.18 / G.k - G.reps * 0.005); } }

  /* ------------ update ------------ */
  function update(dt) {
    if (hoop) updateHoops(dt);
    if (!G) return;
    G.t += dt;
    const gm = G.M.game, anim = GR.Game.player.anim.act;
    if (G.phase === 'count') { const n = 3 - Math.floor(G.t); if (n !== G.lastCount && n > 0) { G.lastCount = n; GR.Audio.sfx('countdown'); } if (G.t >= 3) { G.phase = 'play'; G.t = 0; GR.Audio.sfx('go'); G.fx.push({ t: 0, txt: 'GO!', col: '#7cff6b' }); } }
    else if (G.phase === 'play') {
      if (gm === 'timing') { const sp = (0.9 + (G.speedUp || 1) * 0.35) * G.k; G.mark += G.dir * sp * dt; if (G.mark > 1) { G.mark = 1; G.dir = -1; } if (G.mark < 0) { G.mark = 0; G.dir = 1; } if (G.reps + ((G.judged || 0) - G.reps) >= G.total) end(); }
      if (gm === 'squat') { if (G.holding) G.depth = Math.min(1.05, G.depth + dt * 0.75 * G.k); else if (G.rise) { G.depth = Math.max(0, G.depth - dt * 1.6); if (G.depth <= 0) G.rise = 0; } if ((G.judged || 0) >= G.total && !G.holding && G.depth <= 0) end(); }
      if (gm === 'rhythm' || gm === 'rhythm2') { const beat = 60 / G.bpm; G.spawnT -= dt; if (G.spawnT <= 0 && G.t < G.dur - 2) { G.spawnT = beat * (gm === 'rhythm2' ? 2 : 1); const lane = gm === 'rhythm2' ? G.noteIdx % 2 : (Math.random() < 0.5 ? G.noteIdx % 2 : Math.floor(Math.random() * 2)); G.notes.push({ lane, y: 0, done: false }); G.noteIdx++; G.bpm += 0.6 * G.k; } const fall = 0.45 * (G.bpm / 100); G.notes.forEach(n => { n.y += fall * dt; if (n.y > 0.97 && !n.done) { n.done = true; judge(0); G.speed = Math.max(0.5, G.speed - 0.4); } }); G.notes = G.notes.filter(n => n.y < 1.1); G.speed = U.damp(G.speed, 1.2, 0.3, dt); G.dist += G.speed * dt * 4; G.phaseRun += G.speed * 2.5 * dt; if (G.t >= G.dur) end(); }
      if (gm === 'pedal') { G.beatT += dt; if (G.beatT >= G.cad) { if (!G.windowHit && G.t > 1) { judge(0); G.speed = Math.max(0.3, G.speed - 0.4); } G.beatT -= G.cad; G.windowHit = false; G.beat++; if (G.beat % 8 === 0) G.cad = U.clamp(G.cad * U.rand(0.86, 1.08), 0.35 / G.k, 0.9); } G.speed = U.damp(G.speed, 1, 0.25, dt); G.dist += G.speed * dt * 6; G.phaseRun += G.speed * 4 * dt; if (G.t >= G.dur) end(); }
      if (gm === 'sequence') { if (G.show > 0) G.show -= dt; else { G.seqT += dt; if (G.seqT > G.limit) { judge(0, 'TOO SLOW'); rep(false); newSeq(); } } if ((G.judged || 0) >= G.total + 4 || G.reps >= G.total) end(); }
      if (gm === 'reaction') { if (G.prompt) { G.prompt.t += dt; if (G.prompt.t > G.prompt.win) { judge(0, 'TOO SLOW'); rep(false); G.prompt = null; G.wait = 0.4; } } else { G.wait -= dt; if (G.wait <= 0) G.prompt = { key: U.pick(ARROWS), x: U.rand(0.25, 0.75), y: U.rand(0.25, 0.6), t: 0, win: Math.max(0.5, 1.25 - (G.judged || 0) * 0.04) / G.k }; } if ((G.judged || 0) >= G.total) end(); }
      if (gm === 'alternate') { G.beatT += dt; if (G.beatT >= G.beatLen) { if (!G.got && G.t > 1) judge(0); G.beatT -= G.beatLen; G.got = false; G.beatLen = Math.max(0.38, G.beatLen * 0.985); } if (G.reps >= G.total || (G.judged || 0) >= G.total * 2 + 6) end(); }
    }
    // drive character + machine animation
    G.repAnim = Math.max(0, G.repAnim - dt * 1.4);
    let p;
    if (gm === 'squat') p = U.clamp(G.depth, 0, 1) * 0.5;
    else if (gm === 'rhythm' || gm === 'rhythm2' || gm === 'pedal') p = (G.phaseRun * 0.15) % 1;
    else p = (1 - G.repAnim) * 0.999;
    if (gm === 'timing' || gm === 'sequence' || gm === 'reaction' || gm === 'alternate') p = G.repAnim > 0 ? (1 - G.repAnim) : 0;
    if (anim) { anim.p = p; anim.side = G.side; anim.speed = gm === 'rhythm' ? 2 + G.speed * 1.5 : 0; anim.phase = G.phaseRun * 2.5; }
    const k = gm === 'squat' ? U.clamp(G.depth, 0, 1) : Math.sin(Math.min(1, p) * Math.PI);
    if (G.machine) { const md = { p, phase: G.phaseRun * 2.5, speed: gm === 'rhythm' ? 2 + G.speed * 1.5 : 0, dt, hit: G.machine.hitData || 0 }; G.machine.anim(gm === 'squat' ? k : U.clamp(k, 0, 1), md); if (G.machine.hitData) G.machine.hitData *= 0.9; const scr = G.machine.g.userData.screen; if (scr && Math.random() < 0.2) { scr.ctx.fillStyle = '#0b1020'; scr.ctx.fillRect(0, 0, 256, 160); scr.ctx.fillStyle = '#3cf'; scr.ctx.font = 'bold 22px monospace'; scr.ctx.fillText((gm === 'pedal' ? 'RPM ' + Math.round(G.speed * 30) : 'SPEED ' + (G.speed * 3).toFixed(1)), 12, 40); scr.ctx.fillText('DIST ' + (G.dist / 1000).toFixed(2) + 'km', 12, 80); scr.ctx.fillText('COMBO x' + G.combo, 12, 120); scr.tex.needsUpdate = true; } }
    draw(dt);
  }
  function end() { if (G.phase !== 'play') return; G.phase = 'results'; G.t = 0; results(); }

  /* ------------ drawing ------------ */
  function draw(dt) {
    const w = innerWidth, h = innerHeight; cx.clearRect(0, 0, w, h); if (G.phase === 'intro') return;
    const gm = G.M.game, cxm = w / 2, base = h * 0.72;
    cx.save(); cx.font = '700 18px "Rubik", sans-serif'; cx.textAlign = 'center';
    // header bar
    panel(cxm - 230, 18, 460, 54); cx.fillStyle = '#fff'; cx.font = '800 20px "Bungee", "Rubik", sans-serif'; cx.fillText(G.M.n.toUpperCase(), cxm, 44); cx.font = '600 14px Rubik, sans-serif'; cx.fillStyle = '#ffd23f';
    const prog = gm === 'rhythm' || gm === 'rhythm2' || gm === 'pedal' ? `TIME ${Math.max(0, Math.ceil(G.dur - (G.phase === 'play' ? G.t : 0)))}s • DIST ${(G.dist).toFixed(0)}m` : `REPS ${G.reps}/${G.total}`;
    cx.fillText(`${prog} • SCORE ${G.score} • COMBO x${G.combo}`, cxm, 64);
    if (G.opts.comp && G.opts.comp.target) { cx.fillStyle = '#ff9ec7'; cx.fillText('Beat ' + G.opts.comp.target + ' to lead!', cxm, 90); }
    if (G.phase === 'count') { const n = Math.max(1, 3 - Math.floor(G.t)); big(String(n), cxm, h * 0.45, '#fff'); }
    if (G.phase === 'play' || G.phase === 'count') {
      if (gm === 'timing') { const bw = Math.min(560, w * 0.7), bx = cxm - bw / 2; panel(bx - 12, base - 30, bw + 24, 70); cx.fillStyle = '#222a'; cx.fillRect(bx, base, bw, 18); cx.fillStyle = '#2ecc71'; cx.fillRect(bx + (G.zone.c - G.zone.w / 2) * bw, base - 4, G.zone.w * bw, 26); cx.fillStyle = '#5ff0ff'; cx.fillRect(bx + (G.zone.c - G.zone.w / 8) * bw, base - 4, G.zone.w / 4 * bw, 26); cx.fillStyle = '#fff'; cx.fillRect(bx + G.mark * bw - 3, base - 12, 6, 42); cx.fillStyle = '#ddd'; cx.font = '600 13px Rubik'; cx.fillText('Press SPACE in the green', cxm, base + 34); }
      if (gm === 'squat') { const bh = 260, bx = cxm + 180, by = base - bh; panel(bx - 20, by - 20, 80, bh + 60); cx.fillStyle = '#222a'; cx.fillRect(bx, by, 40, bh); cx.fillStyle = '#2ecc71'; cx.fillRect(bx - 4, by + G.band.lo * bh, 48, (G.band.hi - G.band.lo) * bh); cx.fillStyle = '#ffd23f'; cx.fillRect(bx, by, 40, G.depth * bh); cx.fillStyle = '#fff'; cx.fillRect(bx - 8, by + G.depth * bh - 2, 56, 4); cx.font = '600 13px Rubik'; cx.fillStyle = '#ddd'; cx.fillText('HOLD SPACE ↓', bx + 20, by + bh + 20); cx.fillText('release in green', bx + 20, by + bh + 36); }
      if (gm === 'rhythm' || gm === 'rhythm2') { const lw = 90, lx = cxm - lw, top = h * 0.2, bot = h * 0.82; panel(lx - 14, top - 10, lw * 2 + 28, bot - top + 50); for (let i = 0; i < 2; i++) { cx.fillStyle = i ? '#1b4dff33' : '#ff4fa333'; cx.fillRect(lx + i * lw + 4, top, lw - 8, bot - top); } cx.fillStyle = '#fff'; cx.fillRect(lx, top + (bot - top) * 0.85 - 2, lw * 2, 4); const lab = G.lanes.map(l => l.replace('Key', '')); G.notes.forEach(n => { if (n.done) return; const y = top + (bot - top) * n.y; cx.fillStyle = n.lane ? '#5ff0ff' : '#ff4fa3'; rr(lx + n.lane * lw + 12, y - 16, lw - 24, 32, 10); cx.fill(); cx.fillStyle = '#111'; cx.font = '800 16px Rubik'; cx.fillText(lab[n.lane], lx + n.lane * lw + lw / 2, y + 6); }); cx.fillStyle = '#fff'; cx.font = '800 18px Rubik'; lab.forEach((l, i) => cx.fillText(l, lx + i * lw + lw / 2, bot + 30)); }
      if (gm === 'pedal') { const r0 = 70, ph = G.beatT / G.cad; panel(cxm - 110, base - 170, 220, 230); cx.strokeStyle = '#ffffff55'; cx.lineWidth = 6; cx.beginPath(); cx.arc(cxm, base - 60, r0, 0, 7); cx.stroke(); cx.strokeStyle = ph > 0.7 || ph < 0.15 ? '#2ecc71' : '#ffd23f'; cx.lineWidth = 10; cx.beginPath(); cx.arc(cxm, base - 60, r0 * (1.6 - ph * 0.6), 0, 7); cx.stroke(); cx.fillStyle = '#fff'; cx.font = '900 40px Rubik'; cx.fillText(G.expect.replace('Key', ''), cxm, base - 46); cx.font = '600 13px Rubik'; cx.fillText('alternate A / D when the ring closes', cxm, base + 46); }
      if (gm === 'sequence') { panel(cxm - 260, base - 90, 520, 130); const n = G.seq.length; G.seq.forEach((a, i) => { const x = cxm + (i - (n - 1) / 2) * 64; const shown = G.show > 0, done = i < G.seqIn.length; cx.fillStyle = done ? '#2ecc71' : shown ? '#fff' : '#ffffff22'; rr(x - 26, base - 70, 52, 52, 12); cx.fill(); cx.fillStyle = '#111'; cx.font = '900 26px Rubik'; if (shown || done) cx.fillText(AGLYPH[a], x, base - 34); }); cx.fillStyle = '#ddd'; cx.font = '600 14px Rubik'; cx.fillText(G.show > 0 ? 'MEMORISE…' : `REPEAT IT! (${Math.max(0, G.limit - G.seqT).toFixed(1)}s)`, cxm, base + 20); }
      if (gm === 'reaction' && G.prompt) { const x = w * G.prompt.x, y = h * G.prompt.y, k = 1 - G.prompt.t / G.prompt.win; cx.fillStyle = '#000a'; cx.beginPath(); cx.arc(x, y, 56, 0, 7); cx.fill(); cx.strokeStyle = k > 0.5 ? '#2ecc71' : k > 0.25 ? '#ffd23f' : '#ff5a5a'; cx.lineWidth = 8; cx.beginPath(); cx.arc(x, y, 50, -Math.PI / 2, -Math.PI / 2 + k * U.TAU); cx.stroke(); cx.fillStyle = '#fff'; cx.font = '900 46px Rubik'; cx.fillText(AGLYPH[G.prompt.key], x, y + 16); }
      if (gm === 'alternate') { const ph = G.beatT / G.beatLen; panel(cxm - 150, base - 100, 300, 150); ['Q', 'E'].forEach((l, i) => { const on = G.expect === 'Key' + l; cx.fillStyle = on ? (ph > 0.72 || ph < 0.2 ? '#2ecc71' : '#ffd23f') : '#ffffff22'; rr(cxm - 110 + i * 130, base - 80, 90, 90, 18); cx.fill(); cx.fillStyle = '#111'; cx.font = '900 44px Rubik'; cx.fillText(l, cxm - 65 + i * 130, base - 20); }); cx.fillStyle = '#fff'; cx.fillRect(cxm - 120, base + 22, 240 * ph, 6); cx.font = '600 13px Rubik'; cx.fillText('alternate on the beat', cxm, base + 44); }
    }
    // floating judgement texts
    G.fx.forEach(f => { f.t += dt; cx.globalAlpha = Math.max(0, 1 - f.t / 0.9); cx.fillStyle = f.col; cx.font = '900 34px "Bungee", Rubik, sans-serif'; cx.fillText(f.txt, cxm, h * 0.38 - f.t * 50); cx.globalAlpha = 1; }); G.fx = G.fx.filter(f => f.t < 0.9);
    if (G.combo >= 5) { cx.fillStyle = '#ff9ec7'; cx.font = '900 22px Rubik'; cx.fillText('🔥 x' + G.combo + ' COMBO', w - 120, h * 0.3); }
    cx.restore();
  }
  function panel(x, y, w, h) { cx.fillStyle = 'rgba(12,10,24,0.72)'; rr(x, y, w, h, 14); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,0.15)'; cx.lineWidth = 2; cx.stroke(); }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function big(t, x, y, c) { cx.fillStyle = c; cx.font = '900 120px "Bungee", Rubik, sans-serif'; cx.fillText(t, x, y); }

  /* ------------ results ------------ */
  function results() {
    const s = GR.state, r = rec(G.type), judged = Math.max(1, G.judged || 1);
    const acc = U.clamp((G.acc || 0) / judged, 0, 1); const gr = grade(acc);
    const inGym = GR.World.current === 'gym', member = !!s.flags.member;
    const mult = DIFF[G.diff].pay * (GR.Prog.hasBuff('pump') ? 1.2 : 1) * (s.energy < 15 ? 0.6 : 1) * (inGym ? (member ? 1.15 : 0.85) : 1);
    const score = Math.round(G.score * mult);
    const res = { type: G.type, acc, grade: gr, score, reps: G.reps, combo: G.maxCombo, perfect: G.perfect, dist: G.dist, diff: G.diff };
    G.res = res;
    if (G.opts.comp) { GR.UI.miniResults(res, null, () => { const cb = G.opts.comp.done; close(); cb && cb(res); }); return; }
    const money = Math.round((15 + score / 40) * mult * ({ S: 1.6, A: 1.3, B: 1.1, C: 0.9, D: 0.6 }[gr]));
    const xp = Math.round((40 + score / 25) * ({ S: 1.5, A: 1.25, B: 1.1, C: 1, D: 0.8 }[gr]));
    const pb = score > r.best; if (pb) r.best = score;
    r.sessions++; r.history.unshift({ score, grade: gr, d: Math.floor(s.time / 24) + 1 }); r.history.length = Math.min(r.history.length, 10);
    if (!r.bestGrade || 'SABCD'.indexOf(gr) < 'SABCD'.indexOf(r.bestGrade)) r.bestGrade = gr;
    let unlockedNew = false; if ('SAB'.includes(gr) && r.unlocked < 3 && G.diff >= r.unlocked - 1 + 0) { if (G.diff + 1 > r.unlocked) { r.unlocked = Math.min(3, G.diff + 1); unlockedNew = true; } }
    s.energy = Math.max(0, s.energy - 8);
    GR.Prog.addMoney(money); GR.Prog.addXP(xp); GR.Prog.stat('workouts'); if (gr === 'S') GR.Prog.stat('sRanks');
    GR.Prog.event('workout', { machine: G.type, grade: gr, zone: GR.World.current });
    if ('SAB'.includes(gr)) GR.Prog.event('workout_grade', { machine: G.type, grade: gr });
    // trainer task
    const tt = s.flags.trainerTask; if (tt && tt.machine === G.type && 'SABCD'.indexOf(gr) <= 'SABCD'.indexOf(tt.grade)) { GR.Prog.addMoney(tt.reward); GR.Prog.addXP(80); GR.Prog.notify(`Coach Priya's challenge complete! +${U.money(tt.reward)}`, '🏋️', 'ach'); s.flags.trainerTask = null; }
    if (s.stats.workouts % 4 === 0) GR.Game.applyMuscle();
    if ('SA'.includes(gr)) { GR.NPC.onPlayerAct('flex', GR.Game.player.root.position); GR.Game.player.setExpr('smile', 2); }
    GR.Audio.sfx(gr === 'S' || gr === 'A' ? 'achievement' : 'good');
    GR.UI.miniResults(res, { money, xp, pb, unlockedNew, nextDiff: DIFF[r.unlocked] && DIFF[r.unlocked].n, best: r.best }, () => finish());
  }
  function finish() { const res = G && G.res; close(); if (res && 'SAB'.includes(res.grade)) GR.UI.quickShare && GR.UI.quickShare('workout', res); }
  function cancel() { if (!G) return; const cb = G.opts.comp && G.opts.comp.done; if (G.opts.comp && G.phase !== 'intro') { G.phase = 'play'; end(); return; } close(); if (cb) cb(null); }
  function close() {
    if (!G) return; const game = GR.Game; game.player.anim.stop(); if (G.machine) G.machine.anim(0, { p: 0, dt: 0 });
    // step off the machine
    if (G.machine) { const w = G.machine.world; const back = new THREE.Vector3(Math.sin(w.ry), 0, Math.cos(w.ry)); game.P.pos.x += back.x * (['bench', 'rower', 'legpress'].includes(G.type) ? 0 : 1.0) + (['bench'].includes(G.type) ? Math.cos(w.ry) * 0.9 : 0); game.P.pos.z += back.z * 1.0; game.P.pos.y = GR.World.groundAt(GR.World.Z, game.P.pos.x, game.P.pos.z, 3); GR.World.collide(GR.World.Z, game.P.pos, 0.33, game.P.pos.y); game.player.root.position.copy(game.P.pos); }
    game.camRelease(); game.lockPlayer(false); game.popUI(); if (unKey) unKey(); unKey = null; window.removeEventListener('keyup', onKeyUp); cv.hidden = true; cx.clearRect(0, 0, innerWidth, innerHeight);
    GR.UI.miniClose(); G = null; game.music(); document.getElementById('hud').classList.remove('photo');
  }
  function trainerChallenge() {
    const s = GR.state; const types = Object.keys(D.MACHINES).filter(t => !['dips', 'pushup', 'punch'].includes(t) || Math.random() < 0.2);
    const m = U.pick(types), g = U.pick(['B', 'B', 'A', 'S']), reward = { B: 60, A: 120, S: 250 }[g];
    s.flags.trainerTask = { machine: m, grade: g, reward };
    return `Alright! Get a ${g} or better on the ${D.MACHINES[m].n}. Do it and I'll pay you ${U.money(reward)} from the coaching budget.`;
  }

  /* ------------ BASKETBALL ------------ */
  function basketball(hoopObj, idx) {
    if (hoop || G) return; const game = GR.Game; game.pushUI(); game.lockPlayer(true); canvas();
    const rim = hoopObj.userData.rim.clone().applyMatrix4(hoopObj.matrixWorld);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(hoopObj.quaternion);
    const spots = [3.2, 4.5, 5.8, 4.5, 6.6].map((d, i) => { const ang = [-0.6, -0.3, 0, 0.3, 0.6][i]; const v = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).multiplyScalar(d); return rim.clone().add(v).setY(0.13); });
    hoop = { rim, spots, spot: 0, t: 60, makes: 0, shots: 0, streak: 0, power: 0, charging: false, ball: null, phase: 'intro', best: GR.state.stats.bestBuckets || 0, hoopObj };
    const ballM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9692a, roughness: 0.7 })); ballM.castShadow = true; game.scene.add(ballM); ballM.visible = false; hoop.ballM = ballM;
    moveToSpot();
    unKey = GR.Input.onKey((code, e) => { if (!hoop) return false; if (code === 'Escape') { endHoops(); return true; } if (code === 'Space') { if (hoop.phase === 'intro') { hoop.phase = 'play'; GR.Audio.sfx('whistle'); return true; } if (hoop.phase === 'play' && !hoop.ball && !e.repeat) { hoop.charging = true; hoop.power = 0; hoop.pdir = 1; game.player.anim.play('shoot', { rate: 0.0001 }); } return true; } return false; });
    window.addEventListener('keyup', hoopUp);
  }
  function moveToSpot() { const game = GR.Game, s = hoop.spots[hoop.spot]; game.P.pos.copy(s); game.player.root.position.copy(s); const f = Math.atan2(hoop.rim.x - s.x, hoop.rim.z - s.z); game.P.facing = f; game.player.root.rotation.y = f; game.camTo({ pos: s.clone().add(new THREE.Vector3(-Math.sin(f) * 3.2 + Math.cos(f) * 1.0, 2.2, -Math.cos(f) * 3.2 - Math.sin(f) * 1.0)), look: hoop.rim.clone().add(new THREE.Vector3(0, -0.6, 0)), dur: 0.5 }); game.player.prop('ball', true); hoop.ideal = U.lerp(0.55, 0.8, (s.distanceTo(hoop.rim) - 3) / 4); }
  function hoopUp(e) {
    if (!hoop || e.code !== 'Space' || !hoop.charging) return; hoop.charging = false;
    const game = GR.Game; const q = 1 - Math.min(1, Math.abs(hoop.power - hoop.ideal) / 0.18); const make = q > 0.55 || (q > 0.3 && Math.random() < q);
    game.player.anim.play('shoot', { restart: true }); game.player.prop('ball', false); hoop.shots++;
    const start = game.player.root.position.clone().add(new THREE.Vector3(Math.sin(game.P.facing) * 0.3, 2.3, Math.cos(game.P.facing) * 0.3));
    const end = hoop.rim.clone(); if (!make) { const miss = (hoop.power - hoop.ideal) * 2.2; end.add(new THREE.Vector3(Math.sin(game.P.facing) * miss, 0.05, Math.cos(game.P.facing) * miss)).add(new THREE.Vector3(U.rand(-0.15, 0.15), 0, U.rand(-0.15, 0.15))); }
    hoop.ball = { t: 0, start, end, make, swish: q > 0.85, dur: 0.9 + start.distanceTo(end) * 0.05 };
    hoop.ballM.visible = true;
  }
  function updateHoops(dt) {
    const h = hoop, w = innerWidth, H = innerHeight, game = GR.Game;
    if (h.phase === 'play') { h.t -= dt; if (h.t <= 0 && !h.ball) { endHoops(true); return; } }
    if (h.charging) { h.power += h.pdir * dt * 1.1; if (h.power > 1) { h.power = 1; h.pdir = -1; } if (h.power < 0) { h.power = 0; h.pdir = 1; } }
    if (h.ball) { const b = h.ball; b.t += dt / b.dur; const t = Math.min(1, b.t); const p = b.start.clone().lerp(b.end, t); p.y += Math.sin(t * Math.PI) * 1.6 - (t > 1 ? 0 : 0); h.ballM.position.copy(p); h.ballM.rotation.x += dt * 8;
      if (b.t >= 1 && !b.scored) { b.scored = true; if (b.make) { h.makes++; h.streak++; const pts = 2 + (h.streak >= 3 ? 1 : 0); h.score = (h.score || 0) + pts; GR.Audio.sfx(b.swish ? 'swish' : 'rim'); if (b.swish) GR.Audio.sfx('swish'); GR.Prog.stat('buckets'); GR.Prog.event('bucket', {}); h.msg = { t: 0, txt: b.swish ? 'SWISH! +' + pts : 'BUCKET +' + pts, col: '#7cff6b' }; GR.NPC.onPlayerAct('flex', game.player.root.position, { r: 14 }); } else { h.streak = 0; GR.Audio.sfx('rim'); h.msg = { t: 0, txt: 'BRICK', col: '#ff5a5a' }; } }
      if (b.t >= 1) { b.drop = (b.drop || 0) + dt; h.ballM.position.y = Math.max(0.25, b.end.y - b.drop * 6); if (b.make) h.hoopObj.userData.net.scale.y = 1 + Math.sin(b.drop * 20) * 0.1 * Math.max(0, 1 - b.drop * 2); if (b.drop > 0.6) { h.ball = null; h.ballM.visible = false; if (h.makes % 2 === 0 || !b.make) { h.spot = (h.spot + 1) % h.spots.length; } moveToSpot(); } } }
    // draw UI
    cx.clearRect(0, 0, w, H); cx.save(); cx.textAlign = 'center';
    panel(w / 2 - 220, 18, 440, 58); cx.fillStyle = '#fff'; cx.font = '800 20px "Bungee", Rubik'; cx.fillText('BLACKTOP BUCKETS', w / 2, 44); cx.font = '600 14px Rubik'; cx.fillStyle = '#ffd23f'; cx.fillText(`TIME ${Math.max(0, Math.ceil(h.t))}s • MAKES ${h.makes}/${h.shots} • SCORE ${h.score || 0} • STREAK ${h.streak}`, w / 2, 66);
    if (h.phase === 'intro') { panel(w / 2 - 230, H * 0.35, 460, 150); cx.fillStyle = '#fff'; cx.font = '700 17px Rubik'; cx.fillText('Hold SPACE to charge, release in the green zone.', w / 2, H * 0.35 + 46); cx.fillText('3 makes in a row = bonus points. 60 seconds.', w / 2, H * 0.35 + 76); cx.fillStyle = '#7cff6b'; cx.fillText('Press SPACE to start • ESC to quit', w / 2, H * 0.35 + 116); }
    const bx = w / 2 + 200, by = H * 0.35, bh = 260; panel(bx - 18, by - 18, 76, bh + 36); cx.fillStyle = '#222a'; cx.fillRect(bx, by, 40, bh); cx.fillStyle = '#2ecc71'; cx.fillRect(bx - 4, by + bh * (1 - h.ideal - 0.07), 48, bh * 0.14); cx.fillStyle = '#5ff0ff'; cx.fillRect(bx - 4, by + bh * (1 - h.ideal - 0.02), 48, bh * 0.04); cx.fillStyle = '#ffd23f'; cx.fillRect(bx, by + bh * (1 - h.power), 40, bh * h.power);
    if (h.msg) { h.msg.t += dt; cx.globalAlpha = Math.max(0, 1 - h.msg.t); cx.fillStyle = h.msg.col; cx.font = '900 36px Bungee, Rubik'; cx.fillText(h.msg.txt, w / 2, H * 0.3 - h.msg.t * 40); cx.globalAlpha = 1; }
    cx.restore();
  }
  function endHoops(done) {
    const h = hoop, game = GR.Game; if (!h) return;
    h.ballM.parent && h.ballM.parent.remove(h.ballM); game.player.prop('ball', false);
    if (unKey) unKey(); unKey = null; window.removeEventListener('keyup', hoopUp); cv.hidden = true; cx.clearRect(0, 0, innerWidth, innerHeight);
    game.camRelease(); game.lockPlayer(false); game.popUI(); hoop = null; game.player.anim.stop();
    if (done && h.shots > 0) { const s = GR.state; const money = 10 + (h.score || 0) * 4, xp = 20 + (h.score || 0) * 5; GR.Prog.addMoney(money); GR.Prog.addXP(xp); if ((h.score || 0) > (s.stats.bestBuckets || 0)) { s.stats.bestBuckets = h.score; GR.Prog.notify('New Blacktop record: ' + h.score + ' points!', '🏀', 'ach'); } GR.UI.toast(`🏀 ${h.makes}/${h.shots} makes • ${h.score || 0} pts • +${U.money(money)}`); s.energy = Math.max(0, s.energy - 5); GR.Prog.event('minigame', { kind: 'hoops' }); }
  }
  return { _dbg: () => G, _hoop: () => hoop, startWorkout, update, trainerChallenge, basketball, get active() { return !!G || !!hoop; }, grade, DIFF };
})();
