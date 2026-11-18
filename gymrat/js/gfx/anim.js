/* Procedural animation: locomotion (idle/walk/run/sprint with distance-driven phase so feet don't slide), jumps and
   landings, turning leans, and a library of actions (emotes, dances, sitting, phone, workouts) blended with cross-fades. */
'use strict';
GR.Anim = (() => {
  const U = GR.U;
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'lArm', 'lFore', 'lHand', 'rArm', 'rFore', 'rHand', 'lThigh', 'lShin', 'lFoot', 'rThigh', 'rShin', 'rFoot'];
  const UPPER = ['spine', 'chest', 'neck', 'head', 'lArm', 'lFore', 'lHand', 'rArm', 'rFore', 'rHand'];
  const ARMS = ['lArm', 'lFore', 'lHand', 'rArm', 'rFore', 'rHand'];
  const EXTRA = ['hipsY', 'hipsZ', 'hipsX', 'rootRX', 'rootRZ', 'rootY', 'gripL', 'gripR'];
  const REST = () => ({ hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], lArm: [0, 0, 0.1], lFore: [-0.12, 0, 0], lHand: [0, 0, 0], rArm: [0, 0, -0.1], rFore: [-0.12, 0, 0], rHand: [0, 0, 0], lThigh: [0, 0, 0], lShin: [0, 0, 0], lFoot: [0, 0, 0], rThigh: [0, 0, 0], rShin: [0, 0, 0], rFoot: [0, 0, 0], hipsY: 0, hipsZ: 0, hipsX: 0, rootRX: 0, rootRZ: 0, rootY: 0, gripL: 0.25, gripR: 0.25 });
  const mir = a => [a[0], -a[1], -a[2]];
  // set both arms (left given), legs etc.
  const arms = (p, up, fore, hand = [0, 0, 0]) => { p.lArm = up; p.rArm = mir(up); p.lFore = fore; p.rFore = mir(fore); p.lHand = hand; p.rHand = mir(hand); return p; };
  const legs = (p, th, sh, ft = [0, 0, 0]) => { p.lThigh = th; p.rThigh = mir(th); p.lShin = sh; p.rShin = mir(sh); p.lFoot = ft; p.rFoot = mir(ft); return p; };
  const pose = (fn) => fn;
  const ease = t => t * t * (3 - 2 * t);
  const tri = t => 1 - Math.abs(((t % 2) + 2) % 2 - 1); // 0..1..0 triangle
  const sq = (t, k = 6) => Math.tanh(S(t) * k) * 0.5 + 0.5; // snappy square-ish wave for robot moves

  // ---------------- LOCOMOTION ----------------
  function locomotion(st, t) {
    const p = REST(), sp = st.speed, run = U.smooth(2.8, 6.5, sp), walk = U.smooth(0.05, 1.2, sp), sprint = U.smooth(5.5, 8, sp);
    const ph = st.phase, s = S(ph), c = C(ph);
    // idle: breathing + weight shift
    const br = S(t * 1.7) * 0.025, shift = S(t * 0.35) * 0.5 + 0.5;
    const idleW = 1 - walk;
    const A = U.lerp(0.42, 0.85, run) * walk; // thigh swing
    p.lThigh = [-A * s - run * 0.15 * walk, 0, 0.02 * idleW + 0.03]; p.rThigh = [A * s - run * 0.15 * walk, 0, -0.02 * idleW - 0.03];
    const kAmp = U.lerp(0.55, 1.5, run) * walk;
    const kL = kAmp * Math.pow(Math.max(0, C(ph + 0.6)), 1.4) + 0.06 * walk + run * 0.25 * walk, kR = kAmp * Math.pow(Math.max(0, C(ph + PI + 0.6)), 1.4) + 0.06 * walk + run * 0.25 * walk;
    p.lShin = [kL, 0, 0]; p.rShin = [kR, 0, 0];
    p.lFoot = [-(p.lThigh[0] + kL) * 0.55 * walk + Math.max(0, -s) * 0.25 * walk, 0, 0]; p.rFoot = [-(p.rThigh[0] + kR) * 0.55 * walk + Math.max(0, s) * 0.25 * walk, 0, 0];
    // idle weight shift: one knee relaxed
    p.lShin[0] += idleW * shift * 0.12; p.rShin[0] += idleW * (1 - shift) * 0.12; p.hipsX = idleW * (shift - 0.5) * 0.03;
    p.hips = [0, S(ph) * 0.12 * walk, (shift - 0.5) * 0.06 * idleW];
    p.hipsY = -Math.abs(s) * U.lerp(0.03, 0.06, run) * walk - run * 0.04 + br * 0.15 * idleW;
    p.spine = [0.03 + run * 0.16 + sprint * 0.08, -S(ph) * 0.08 * walk, 0];
    p.chest = [br * idleW, -S(ph) * 0.12 * walk, -(shift - 0.5) * 0.04 * idleW];
    p.neck = [-run * 0.1, S(ph) * 0.06 * walk, 0]; p.head = [-run * 0.08 + S(t * 0.4) * 0.03 * idleW, S(t * 0.23) * 0.2 * idleW, 0];
    const aA = U.lerp(0.35, 1.0, run) * walk;
    p.lArm = [aA * s * 0.9 - run * 0.1, 0, 0.1 + run * 0.12 + br * 0.3]; p.rArm = [-aA * s * 0.9 - run * 0.1, 0, -0.1 - run * 0.12 - br * 0.3];
    const eb = 0.15 + walk * 0.15 + run * 1.15;
    p.lFore = [-eb - Math.max(0, -s) * run * 0.3, 0, 0]; p.rFore = [-eb - Math.max(0, s) * run * 0.3, 0, 0];
    p.gripL = p.gripR = 0.25 + run * 0.6;
    // turning lean
    p.hips[2] += -st.turn * 0.05 * U.clamp(sp / 4, 0, 1.4); p.chest[2] += -st.turn * 0.04;
    // walk styles
    if (st.style === 'swagger' && walk > 0.1) { p.chest[1] += S(ph) * 0.18 * walk; p.lArm[2] += 0.15; p.rArm[2] -= 0.15; p.head[0] -= 0.12; p.hips[2] += S(ph) * 0.06; p.lFore[0] -= 0.2; p.rFore[0] -= 0.2; }
    if (st.style === 'hype' && walk > 0.1) { p.hipsY += Math.abs(S(ph * 2)) * 0.05; p.lArm = [-1.3 + S(ph * 2) * 0.4, 0, 0.6]; p.rArm = [-1.3 - S(ph * 2) * 0.4, 0, -0.6]; p.lFore = [-0.6, 0, 0]; p.rFore = [-0.6, 0, 0]; p.head[0] -= 0.2; }
    if (st.style === 'mog' && walk > 0.1) { p.chest[0] -= 0.12; p.head[0] -= 0.18; p.lArm[2] += 0.28; p.rArm[2] -= 0.28; p.lArm[0] *= 0.4; p.rArm[0] *= 0.4; p.hips[1] *= 1.6; }
    if (st.style === 'phone') phoneArm(p, t, walk);
    // airborne / landing
    if (!st.grounded) { const up = U.clamp(st.vy / 5, -1, 1); legs(p, [-0.6 - up * 0.2, 0, 0.05], [1.1, 0, 0], [0.3, 0, 0]); p.rThigh = [-0.15, 0, -0.05]; p.rShin = [0.5, 0, 0]; p.lArm = [-0.4, 0, 0.6 + up * 0.3]; p.rArm = [-0.2, 0, -0.6 - up * 0.3]; p.lFore = [-0.6, 0, 0]; p.rFore = [-0.6, 0, 0]; p.spine = [0.1, 0, 0]; }
    if (st.land > 0) { const L = st.land; p.hipsY -= 0.14 * L; p.lThigh[0] -= 0.7 * L; p.rThigh[0] -= 0.7 * L; p.lShin[0] += 1.2 * L; p.rShin[0] += 1.2 * L; p.lFoot[0] -= 0.5 * L; p.rFoot[0] -= 0.5 * L; p.spine[0] += 0.3 * L; p.lArm[2] += 0.3 * L; p.rArm[2] -= 0.3 * L; }
    if (st.takeoff > 0) { const k = st.takeoff; p.hipsY -= 0.1 * k; p.lThigh[0] -= 0.5 * k; p.rThigh[0] -= 0.5 * k; p.lShin[0] += 0.9 * k; p.rShin[0] += 0.9 * k; p.lFoot[0] -= 0.4 * k; p.rFoot[0] -= 0.4 * k; }
    return p;
  }
  function phoneArm(p, t, w = 1) { p.rArm = [-0.55, -0.25, -0.12]; p.rFore = [-1.7, 0.2, 0]; p.rHand = [0.15, 0.2, -0.25]; p.head[0] += 0.3 * w + 0.15; p.neck[0] = 0.15; p.gripR = 0.55; }

  // ---------------- ACTIONS ----------------
  // Each: { loop, dur, upper(bool overlay while moving), props:[...], expr, fn(t, a) → pose }
  const A = {};
  const def = (name, o) => { A[name] = o; };
  // everyday
  def('sit', { loop: true, fn: t => { const p = REST(); legs(p, [-1.5, 0, 0.08], [1.5, 0, 0], [0, 0, 0]); p.hipsY = -0.43; p.hipsZ = -0.05; arms(p, [-0.3, 0, 0.12], [-0.9, 0, 0]); p.spine = [-0.08 + S(t * 1.6) * 0.01, 0, 0]; p.head = [0.05, S(t * 0.3) * 0.2, 0]; return p; } });
  def('sitChill', { loop: true, fn: t => { const p = A.sit.fn(t); p.lThigh = [-1.35, 0.25, 0.3]; p.rThigh = [-1.45, -0.1, -0.1]; p.lArm = [0.25, 0, 0.5]; p.rArm = [0.25, 0, -0.5]; p.lFore = [-0.3, 0, 0]; p.rFore = [-0.3, 0, 0]; p.spine = [-0.25, 0, 0]; return p; } });
  def('sitTyping', { loop: true, fn: t => { const p = A.sit.fn(t); arms(p, [-0.75, 0, 0.18], [-0.95, 0, 0], [0.3, 0, 0]); p.lFore[0] += S(t * 14) * 0.05; p.rFore[0] += C(t * 13) * 0.05; p.spine = [0.12, 0, 0]; p.head = [0.1, 0, 0]; p.gripL = p.gripR = 0.4; return p; } });
  def('sitGame', { loop: true, fn: t => { const p = A.sit.fn(t); arms(p, [-0.6, 0, 0.25], [-1.2, -0.3, 0], [0.3, 0, 0]); p.lHand = [0.3, 0.6, 0]; p.rHand = [0.3, -0.6, 0]; p.lFore[0] += S(t * 9) * 0.04; p.spine = [0.18, 0, 0]; p.gripL = p.gripR = 0.7; return p; } });
  def('lean', { loop: true, fn: t => { const p = REST(); p.hips = [0, 0.1, 0.06]; p.hipsZ = -0.04; p.lThigh = [0.05, 0, 0.05]; p.rThigh = [-0.1, 0.2, 0.18]; p.rShin = [0.25, 0, 0]; p.spine = [-0.1, 0, -0.04]; arms(p, [0.3, 0, 0.35], [-1.7, 0.4, 0]); p.lArm = [0.1, 0.8, 0.7]; p.lFore = [-1.6, 0, 0]; p.rArm = [0.1, -0.8, -0.7]; p.rFore = [-1.6, 0, 0]; p.head = [0, S(t * 0.4) * 0.3, 0]; return p; } });
  def('phone', { loop: true, upper: true, props: ['phone'], fn: t => { const p = REST(); phoneArm(p, t); p.lArm = [-0.2, 0, 0.15]; p.lFore = [-0.3, 0, 0]; p.rFore[0] += S(t * 0.7) * 0.03; return p; } });
  def('phonecheck', { dur: 3, props: ['phone'], fn: t => A.phone.fn(t) });
  def('talk', { loop: true, upper: true, fn: t => { const p = REST(); const g = S(t * 2.3), h = S(t * 1.7 + 1); p.lArm = [-0.35 - Math.max(0, g) * 0.4, 0, 0.25]; p.lFore = [-0.9 - Math.max(0, g) * 0.5, 0.3, 0]; p.rArm = [-0.25 - Math.max(0, h) * 0.3, 0, -0.2]; p.rFore = [-0.8 - Math.max(0, h) * 0.6, -0.3, 0]; p.lHand = [0, 0, -0.4]; p.rHand = [0, 0, 0.4]; p.head = [S(t * 3) * 0.05, S(t * 1.1) * 0.15, S(t * 1.3) * 0.05]; p.gripL = p.gripR = 0.1; return p; } });
  def('listen', { loop: true, upper: true, fn: t => { const p = REST(); p.head = [Math.max(0, S(t * 2.6)) * 0.12, 0, S(t * 0.5) * 0.08]; p.lArm = [0, 0, 0.12]; p.rArm = [0, 0, -0.12]; return p; } });
  def('wave', { dur: 2.2, upper: true, expr: 'smile', fn: t => { const p = REST(); p.rArm = [-0.2, 0, -2.5]; p.rFore = [-0.6 + S(t * 12) * 0.35, 0, 0]; p.rHand = [0, 0, S(t * 12) * 0.3]; p.head = [0, -0.15, 0.08]; p.chest = [0, -0.1, 0.05]; p.gripR = 0; return p; } });
  def('flex', { dur: 2.6, expr: 'strain', fn: t => { const p = REST(); const k = ease(U.clamp(t * 3, 0, 1)); arms(p, [0, 0, 1.5 * k], [-2.1 * k, 0, 0], [0, 0, 0]); p.lArm = [-0.1, 0.0, 1.55 * k]; p.rArm = [-0.1, 0, -1.55 * k]; p.lFore = [-2.2 * k, -0.2, 0]; p.rFore = [-2.2 * k, 0.2, 0]; p.chest = [-0.12 * k + S(t * 20) * 0.01 * k, 0, 0]; p.spine = [-0.05 * k, 0, 0]; legs(p, [0, 0, 0.12 * k], [0.12, 0, 0]); p.hipsY = -0.02 * k; p.gripL = p.gripR = 1; p.head = [-0.1, S(t * 2) * 0.2, 0]; return p; } });
  def('sidechest', { dur: 2.6, expr: 'strain', fn: t => { const p = REST(); const k = ease(U.clamp(t * 3, 0, 1)); p.hips = [0, 0.6 * k, 0]; p.chest = [0, -0.35 * k, 0]; p.lArm = [-0.6 * k, 0.4, 0.3]; p.lFore = [-1.6 * k, 0, 0]; p.rArm = [-0.7 * k, -0.3, -0.25]; p.rFore = [-1.3 * k, -0.3, 0]; p.lThigh = [-0.2 * k, 0, 0.05]; p.lShin = [0.4 * k, 0, 0]; p.lFoot = [0.3 * k, 0, 0]; p.head = [0, -0.6 * k, 0]; p.gripL = p.gripR = 1; return p; } });
  def('latspread', { dur: 2.6, expr: 'strain', fn: t => { const p = REST(); const k = ease(U.clamp(t * 3, 0, 1)); arms(p, [-0.2, 0, 0.6 * k], [-1.5 * k, 0, 0], [0, 0, 0]); p.lHand = [0, 0, -0.3]; p.rHand = [0, 0, 0.3]; p.chest = [-0.15 * k, 0, 0]; legs(p, [0, 0, 0.12 * k], [0.05, 0, 0]); p.gripL = p.gripR = 1; return p; } });
  def('thumbs', { dur: 1.8, upper: true, expr: 'smile', fn: t => { const p = REST(); p.rArm = [-1.2, 0, -0.25]; p.rFore = [-0.9, 0, 0]; p.rHand = [0, -1.2, 0]; p.gripR = 1; p.head = [0, 0, 0.1]; return p; } });
  def('clap', { dur: 2.5, upper: true, expr: 'smile', fn: t => { const p = REST(); const c = (S(t * 7) * 0.5 + 0.5); arms(p, [-0.9, 0.1, 0.25 + c * 0.25], [-1.2, 0.4, 0], [0, 0, 0]); p.gripL = p.gripR = 0; return p; } });
  def('shrug', { dur: 1.8, upper: true, expr: 'smug', fn: t => { const p = REST(); const k = tri(t * 1.1); arms(p, [-0.2, 0, 0.45 * k + 0.1], [-1.4 * k, 0.6 * k, 0], [0, 0.8 * k, 0]); p.neck = [0, 0, 0.2 * k]; p.chest = [0, 0, 0]; p.hipsY = 0; p.gripL = p.gripR = 0; return p; } });
  def('point', { dur: 2.5, upper: true, expr: 'laugh', fn: t => { const p = REST(); p.rArm = [-1.5, 0.2, -0.1]; p.rFore = [-0.1, 0, 0]; p.gripR = 0.8; p.lArm = [-0.3, 0, 0.2]; p.lFore = [-1.6, 0, 0]; p.spine = [0.15 + S(t * 14) * 0.06, 0, 0]; p.head = [-0.1 + S(t * 14) * 0.08, 0, 0]; return p; } });
  def('laugh', { dur: 2.5, expr: 'laugh', fn: t => { const p = REST(); p.spine = [0.2 + S(t * 13) * 0.05, 0, 0]; p.chest = [0.1, 0, 0]; arms(p, [-0.5, 0, 0.3], [-1.5, 0, 0]); p.head = [-0.2 + S(t * 13) * 0.06, 0, 0]; p.hipsY = -0.02; return p; } });
  def('shock', { dur: 1.8, expr: 'surprise', fn: t => { const p = REST(); const k = ease(U.clamp(t * 5, 0, 1)); p.spine = [-0.2 * k, 0, 0]; arms(p, [-1.0 * k, 0, 0.3], [-1.8 * k, 0.2, 0]); p.head = [-0.15 * k, 0, 0]; p.gripL = p.gripR = 0; p.hipsY = -0.02 * k; return p; } });
  def('peace', { dur: 2.2, upper: true, expr: 'smile', fn: t => { const p = REST(); p.rArm = [-0.5, 0, -1.3]; p.rFore = [-1.9, 0, 0]; p.rHand = [0, 0, 0.3]; p.gripR = 0.4; p.head = [0, -0.1, 0.18]; p.chest = [0, 0, 0.06]; return p; } });
  def('selfie', { dur: 2.6, upper: true, props: ['phone'], expr: 'smile', fn: t => { const p = REST(); p.rArm = [-1.6, 0.4, -0.35]; p.rFore = [-0.35, 0, 0]; p.rHand = [-0.4, 0.4, 0]; p.lArm = [-0.4, 0, 0.8]; p.lFore = [-1.9, 0, 0]; p.gripL = 0.4; p.head = [0.05, -0.3, 0.15]; return p; } });
  def('cross', { loop: true, upper: true, expr: 'smug', fn: t => { const p = REST(); arms(p, [-0.75, 0.25, 0.15], [-1.75, 0.55, 0], [0, 0, 0]); p.chest = [-0.04, 0, 0]; p.head = [-0.06, S(t * 0.4) * 0.15, 0]; return p; } });
  def('mewing', { dur: 3, upper: true, expr: 'smug', fn: t => { const p = REST(); p.rArm = [-1.1, 0.3, -0.2]; p.rFore = [-2.2, 0, 0]; p.rHand = [0.4, 0, 0.5]; p.gripR = 0.8; p.head = [-0.28, 0.25, 0.05]; p.neck = [-0.12, 0, 0]; return p; } });
  def('victory', { dur: 2.2, expr: 'laugh', fn: t => { const p = REST(); const j = Math.max(0, S(t * 5.5)); p.rootY = j * 0.35; arms(p, [0, 0, 2.6], [-0.2, 0, 0]); legs(p, [-0.2 * j, 0, 0.1], [0.6 * j, 0, 0]); p.gripL = p.gripR = 1; p.head = [-0.3, 0, 0]; return p; } });
  def('trophy', { dur: 3, props: ['trophy'], expr: 'laugh', fn: t => { const p = REST(); arms(p, [-2.6, 0, 0.2], [-0.3, 0, 0]); p.rArm = [-2.8, 0, -0.1]; p.lArm = [-2.7, 0, 0.3]; p.lFore = [-0.6, 0, 0]; p.head = [-0.35, S(t * 2) * 0.1, 0]; p.rootY = Math.max(0, S(t * 4)) * 0.1; p.gripR = 1; return p; } });
  def('facepalm', { dur: 2.4, upper: true, expr: 'sad', fn: t => { const p = REST(); p.rArm = [-1.1, 0.2, -0.05]; p.rFore = [-2.3, 0, 0]; p.rHand = [0.3, 0, 0]; p.gripR = 0; p.head = [0.35, 0, 0]; p.spine = [0.1, 0, 0]; return p; } });
  def('cry', { dur: 3, expr: 'sad', fn: t => { const p = REST(); arms(p, [-1.1, 0.25, 0.1], [-2.3, 0.2, 0]); p.head = [0.3 + S(t * 9) * 0.05, 0, 0]; p.spine = [0.25, 0, 0]; p.hipsY = -0.03 + S(t * 9) * 0.01; return p; } });
  def('salute', { dur: 2, upper: true, expr: 'smug', fn: t => { const p = REST(); p.rArm = [-0.5, 0.3, -1.45]; p.rFore = [-2.3, 0, 0]; p.rHand = [0, 0, 0.3]; p.gripR = 0; p.chest = [-0.08, 0, 0]; return p; } });
  def('bow', { dur: 2.2, expr: 'smile', fn: t => { const p = REST(); const k = tri(t * 0.9); p.spine = [0.8 * k, 0, 0]; p.chest = [0.2 * k, 0, 0]; p.rArm = [-0.6 * k, 0, -0.2]; p.rFore = [-1.6 * k, 0, 0]; p.lArm = [0.4 * k, 0, 0.2]; p.lFore = [-1.2 * k, 0, 0]; p.hipsZ = -0.05 * k; return p; } });
  def('heart', { dur: 2.4, upper: true, expr: 'smile', fn: t => { const p = REST(); arms(p, [-1.9, 0.5, 0.35], [-1.4, 0.6, 0], [0.2, 0, -0.4]); p.gripL = p.gripR = 0.5; p.head = [0, 0, S(t * 3) * 0.12]; return p; } });
  def('comehere', { dur: 2.4, upper: true, expr: 'smug', fn: t => { const p = REST(); p.rArm = [-1.3, 0, -0.2]; p.rFore = [-0.3 - (S(t * 9) * 0.5 + 0.5) * 1.0, 0, 0]; p.rHand = [0, 1.4, 0]; p.gripR = (S(t * 9) * 0.5 + 0.5); p.head = [-0.1, 0, 0]; return p; } });
  def('yawn', { dur: 3, expr: 'surprise', fn: t => { const p = REST(); const k = tri(t * 0.7); arms(p, [-0.6, 0, 1.2 * k + 0.2], [-1.8 * k, 0, 0]); p.spine = [-0.18 * k, 0, 0]; p.head = [-0.35 * k, 0, 0]; return p; } });
  def('npcglitch', { dur: 3, expr: 'neutral', fn: t => { const p = REST(); const g = Math.floor(t * 12) % 4; arms(p, [0, 0, 1.55], [0, 0, 0]); p.rootY = g === 1 ? 0.05 : 0; p.hips = [0, g * 0.35, 0]; p.head = [0, g === 2 ? 1.5 : 0, g === 3 ? 0.6 : 0]; p.rootRZ = g === 3 ? 0.08 : 0; p.gripL = p.gripR = 0; return p; } });
  def('stare', { dur: 3.5, expr: 'smug', fn: t => { const p = A.cross.fn(t); p.head = [0.12, 0, 0]; p.neck = [-0.1, 0, 0]; p.chest = [-0.1, 0, 0]; legs(p, [0, 0, 0.12], [0, 0, 0]); return p; } });
  def('stretch', { dur: 3.5, fn: t => { const p = REST(); const k = tri(t * 0.6); arms(p, [-2.6 * k, 0, 0.3], [-0.2, 0, 0]); p.spine = [-0.15 * k, 0, S(t * 2) * 0.15 * k]; p.rootY = 0.03 * k; return p; } });
  def('pushups', { dur: 3.2, expr: 'strain', fn: t => A.pushup.fn(t, { p: (t * 1.2) % 1 }) });
  def('sleep', { loop: true, fn: t => { const p = REST(); p.rootRX = -PI / 2; p.rootY = -0.24; arms(p, [-0.1, 0, 0.25], [-0.3, 0, 0]); p.chest = [S(t * 1.2) * 0.02, 0, 0]; p.head = [0, 0, 0.2]; legs(p, [0, 0, 0.05], [0.1, 0, 0]); return p; } });
  def('eat', { dur: 3, upper: true, props: ['cup'], expr: 'smile', fn: t => { const p = REST(); const k = (S(t * 3) * 0.5 + 0.5); p.rArm = [-0.7 - k * 0.5, 0.2, -0.12]; p.rFore = [-1.5 - k * 0.7, 0, 0]; p.gripR = 0.9; p.head = [-0.05 * k, 0, 0]; return p; } });
  def('cheer', { loop: true, expr: 'laugh', fn: t => { const p = REST(); const j = Math.max(0, S(t * 7)); arms(p, [-0.4, 0, 2.3 + j * 0.3], [-0.4, 0, 0]); p.rootY = j * 0.06; p.gripL = p.gripR = 1; return p; } });
  def('judge', { loop: true, fn: t => { const p = A.sit.fn(t); arms(p, [-0.9, 0, 0.2], [-0.9, 0.5, 0], [0, 0, 0]); p.head = [0.05, S(t * 0.5) * 0.2, 0]; return p; } });
  def('browse', { loop: true, fn: t => { const p = REST(); const k = S(t * 0.8) * 0.5 + 0.5; p.rArm = [-0.9 - k * 0.3, -0.2, -0.15]; p.rFore = [-0.6, 0, 0]; p.gripR = 0.6; p.head = [0.15, -0.2 + S(t * 0.4) * 0.3, 0]; p.lArm = [-0.1, 0, 0.12]; return p; } });
  def('counter', { loop: true, fn: t => { const p = REST(); arms(p, [-0.6, 0, 0.15], [-1.0, 0, 0]); p.spine = [0.08, 0, 0]; p.head = [0.05, S(t * 0.5) * 0.25, 0]; p.lFore[0] += S(t * 3) * 0.05; return p; } });
  def('dj', { loop: true, fn: t => { const p = REST(); arms(p, [-0.9, 0, 0.3], [-1.0, 0, 0]); p.rFore[0] += S(t * 8) * 0.2; p.lFore[1] = S(t * 4) * 0.3; p.head = [Math.abs(S(t * 4)) * 0.3, 0, 0]; p.hipsY = -Math.abs(S(t * 4)) * 0.02; return p; } });
  def('shoot', { dur: 1.2, props: ['ball'], fn: t => { const p = REST(); const k = t < 0.45 ? ease(t / 0.45) : 1, rel = U.smooth(0.45, 0.6, t); p.hipsY = -0.12 * k * (1 - rel) + rel * 0.04; legs(p, [-0.5 * k * (1 - rel), 0, 0.08], [0.9 * k * (1 - rel), 0, 0]); p.rArm = [-2.2 - rel * 0.6, 0, -0.1]; p.rFore = [-1.8 * (1 - rel), 0, 0]; p.rHand = [-1.0 * (1 - rel) + rel * 0.8, 0, 0]; p.lArm = [-2.0, 0, 0.35]; p.lFore = [-1.4, 0, 0]; p.head = [-0.25, 0, 0]; p.gripR = 0.2; p.rootY = rel * 0.1 * (1 - U.smooth(0.8, 1.2, t)); return p; } });
  def('skincare', { loop: true, props: ['product'], fn: t => { const p = REST(); const k = S(t * 4); p.rArm = [-1.15, 0.35, -0.15]; p.rFore = [-2.1 + k * 0.1, 0, 0]; p.rHand = [0.3, k * 0.3, 0.4]; p.lArm = [-1.1, -0.3, 0.15]; p.lFore = [-2.15 - k * 0.1, 0, 0]; p.lHand = [0.3, 0, -0.4]; p.head = [-0.1, 0, 0]; p.gripL = 0; return p; } });
  def('kneel', { loop: true, fn: t => { const p = REST(); p.hipsY = -0.45; legs(p, [-0.2, 0, 0.05], [2.2, 0, 0], [0.8, 0, 0]); p.lThigh = [-1.6, 0, 0.05]; p.lShin = [1.6, 0, 0]; p.spine = [0.1, 0, 0]; return p; } });

  // ---------------- DANCES (beat-synced: t in seconds, b = beats) ----------------
  const D = (name, bpm, f) => def(name, { loop: true, dance: true, bpm, expr: 'smile', fn: (t) => { const b = t * bpm / 60 * PI; const p = REST(); f(p, b, t); return p; } });
  D('d_shuffle', 120, (p, b) => { const s = S(b); p.hipsY = -0.06 - Math.abs(S(b)) * 0.05; legs(p, [-0.3, 0, 0.1], [0.6, 0, 0]); p.lThigh = [-0.4 + s * 0.6, 0, 0.1]; p.rThigh = [-0.4 - s * 0.6, 0, -0.1]; p.lShin = [0.5 + Math.max(0, s) * 0.7, 0, 0]; p.rShin = [0.5 + Math.max(0, -s) * 0.7, 0, 0]; arms(p, [-0.6, 0, 0.4], [-1.2, 0, 0]); p.lArm[0] += s * 0.4; p.rArm[0] -= s * 0.4; p.chest = [0.1, s * 0.15, 0]; p.hips = [0, s * 0.3, 0]; });
  D('d_sway', 96, (p, b) => { const s = S(b * 0.5); p.hips = [0, 0, s * 0.12]; p.hipsX = s * 0.05; p.chest = [0, 0, -s * 0.18]; arms(p, [-0.3, 0, 0.3 + Math.max(0, s) * 0.3], [-0.9, 0, 0]); p.rArm[2] = -0.3 - Math.max(0, -s) * 0.3; p.head = [0.05, 0, s * 0.2]; legs(p, [0, 0, 0.04], [0.12 + Math.abs(s) * 0.15, 0, 0]); p.hipsY = -Math.abs(s) * 0.03; });
  D('d_shake', 128, (p, b) => { const s = S(b * 2); p.rArm = [-1.6, 0, -0.3]; p.rFore = [-1.2 + s * 0.4, 0, 0]; p.rHand = [s * 0.5, 0, 0]; p.gripR = 1; p.lArm = [-0.4, 0, 0.5]; p.lFore = [-1.4, 0, 0]; p.hips = [0, S(b) * 0.25, 0]; p.hipsY = -Math.abs(S(b)) * 0.06; legs(p, [-0.15, 0, 0.1], [0.3 + Math.abs(S(b)) * 0.3, 0, 0]); p.head = [S(b * 2) * 0.12, 0, 0]; });
  D('d_rizz', 104, (p, b) => { const s = S(b * 0.5), c = C(b * 0.5); p.hips = [0, 0, s * 0.15]; p.hipsZ = c * 0.04; p.chest = [c * 0.12, 0, -s * 0.2]; p.spine = [c * 0.1, 0, 0]; arms(p, [-0.5 - c * 0.3, 0, 0.5], [-1.4, 0, 0]); p.lArm[2] += s * 0.4; p.rArm[2] += s * 0.4; p.head = [-0.15, s * 0.2, 0]; legs(p, [-0.05, 0, 0.08], [0.25, 0, 0]); });
  D('d_robot', 110, (p, b) => { const s = sq(b * 0.5) * 2 - 1, c = sq(b * 0.25 + 1) * 2 - 1; arms(p, [-0.8, 0, 0.3], [-1.57, 0, 0]); p.lArm = [-0.8 + s * 0.8, 0, 0.3]; p.rArm = [-0.8 - s * 0.8, 0, -0.3]; p.lFore = [-1.57, 0, 0]; p.rFore = [-1.57, 0, 0]; p.chest = [0, c * 0.5, 0]; p.head = [0, -c * 0.6, 0]; p.hipsY = -Math.abs(s) * 0.03; p.gripL = p.gripR = 0; });
  D('d_floss', 130, (p, b) => { const s = S(b * 2); p.hips = [0, 0, -s * 0.2]; p.hipsX = s * 0.06; p.lArm = [s * 0.6, 0, 0.35]; p.rArm = [s * 0.6, 0, -0.35]; p.lFore = [-0.1, 0, 0]; p.rFore = [-0.1, 0, 0]; p.chest = [0, 0, s * 0.1]; p.gripL = p.gripR = 0.8; });
  D('d_groove', 116, (p, b) => { const s = S(b), c = C(b); p.hipsY = -0.05 - Math.abs(s) * 0.06; legs(p, [-0.35, 0, 0.12], [0.6 + Math.abs(s) * 0.3, 0, 0]); p.chest = [0.1 + Math.abs(s) * 0.1, c * 0.2, 0]; arms(p, [-0.9 + s * 0.3, 0, 0.6], [-1.3, 0, 0]); p.rArm = [-0.9 - s * 0.3, 0, -0.6]; p.head = [Math.abs(s) * 0.2, 0, 0]; p.gripL = p.gripR = 1; });
  D('d_bop', 100, (p, b) => { const s = Math.abs(S(b)); p.hipsY = -s * 0.04; p.head = [s * 0.25 - 0.05, 0, 0]; p.neck = [s * 0.1, 0, 0]; arms(p, [-0.25, 0, 0.2], [-1.0 - s * 0.3, 0, 0]); p.chest = [s * 0.08, 0, 0]; legs(p, [0, 0, 0.06], [s * 0.2, 0, 0]); });
  D('d_strut', 98, (p, b, t) => { const s = S(b); p.hips = [0, s * 0.25, s * 0.08]; p.hipsZ = 0; p.chest = [-0.1, -s * 0.2, 0]; p.head = [-0.15, s * 0.2, 0]; legs(p, [0, 0, 0.05], [0, 0, 0]); p.lThigh = [-Math.max(0, s) * 0.5, 0, 0.05]; p.rThigh = [-Math.max(0, -s) * 0.5, 0, -0.05]; p.lShin = [Math.max(0, s) * 0.7, 0, 0]; p.rShin = [Math.max(0, -s) * 0.7, 0, 0]; p.lArm = [-0.1, 0.5, 0.75]; p.lFore = [-1.7, 0, 0]; p.rArm = [s * 0.4, 0, -0.2]; p.rFore = [-0.4, 0, 0]; });
  D('d_chop', 124, (p, b) => { const s = sq(b, 4); p.rArm = [-2.4 + s * 1.6, 0, -0.2]; p.rFore = [-0.2, 0, 0]; p.lArm = [-2.4 + (1 - s) * 1.6, 0, 0.2]; p.lFore = [-0.2, 0, 0]; p.gripL = p.gripR = 0; p.spine = [s * 0.25, 0, 0]; p.hipsY = -s * 0.08; legs(p, [-0.3 * s, 0, 0.12], [0.6 * s, 0, 0]); });
  D('d_wave', 108, (p, b) => { const w = i => S(b - i * 0.7); p.lArm = [-0.1, 0, 1.5 + w(0) * 0.25]; p.lFore = [w(1) * 0.6, 0, 0]; p.rArm = [-0.1, 0, -1.5 - w(4) * 0.25]; p.rFore = [-w(3) * 0.6, 0, 0]; p.chest = [0, 0, w(2) * 0.12]; p.head = [0, 0, w(2) * 0.15]; p.lHand = [0, 0, w(1.5) * 0.5]; p.rHand = [0, 0, w(3.5) * 0.5]; p.gripL = p.gripR = 0; p.hipsY = -Math.abs(w(2)) * 0.03; });
  D('d_hype', 140, (p, b) => { const j = Math.abs(S(b)); p.rootY = j * 0.15; arms(p, [-2.3, 0, 0.5], [-0.3, 0, 0]); p.rArm[0] += S(b * 2) * 0.4; p.lArm[0] -= S(b * 2) * 0.4; legs(p, [-0.2 * j, 0, 0.1], [0.4 * j, 0, 0]); p.head = [-0.2 + j * 0.2, 0, 0]; p.gripL = p.gripR = 1; });
  D('d_disco', 118, (p, b) => { const s = S(b * 0.5); p.rArm = s > 0 ? [-2.8, 0, -0.5] : [0.3, 0, -0.6]; p.rFore = [-0.1, 0, 0]; p.lArm = [-0.1, 0, 0.3]; p.lFore = [-1.6, 0, 0]; p.lHand = [0, 0, 0]; p.hips = [0, s * 0.35, 0]; p.chest = [0, -s * 0.25, 0]; p.hipsY = -0.05; legs(p, [-0.2, 0, 0.12], [0.4, 0, 0]); p.head = [s > 0 ? -0.3 : 0.2, 0, 0]; p.gripR = 0.5; });
  D('d_moon', 100, (p, b, t) => { const s = S(b); p.lThigh = [-0.05, 0, 0.02]; p.rThigh = [-0.05, 0, -0.02]; p.lShin = [Math.max(0, s) * 0.9, 0, 0]; p.rShin = [Math.max(0, -s) * 0.9, 0, 0]; p.lFoot = [-Math.max(0, s) * 0.9, 0, 0]; p.rFoot = [-Math.max(0, -s) * 0.9, 0, 0]; p.hipsZ = ((t * 0.25) % 1) * -0.4; arms(p, [s * 0.2, 0, 0.15], [-0.8, 0, 0]); p.head = [0.05, 0, 0]; p.chest = [0.06, 0, 0]; });
  D('d_twist', 126, (p, b) => { const s = S(b); p.hips = [0, s * 0.55, 0]; p.chest = [0, -s * 0.4, 0]; p.hipsY = -0.12; legs(p, [-0.5, 0, 0.08], [0.9, 0, 0], [-0.4, 0, 0]); arms(p, [-0.9, 0, 0.6], [-1.3, 0, 0]); p.lArm[0] += s * 0.4; p.rArm[0] -= s * 0.4; });
  D('d_aura', 92, (p, b) => { const s = S(b * 0.5); p.lArm = [-0.3, 0.2, 0.9 + s * 0.4]; p.rArm = [-0.3, -0.2, -0.9 - s * 0.4]; p.lFore = [-0.6, 0, 0]; p.rFore = [-0.6, 0, 0]; p.lHand = [0, 0, -0.6]; p.rHand = [0, 0, 0.6]; p.gripL = p.gripR = 0; p.head = [-0.2, s * 0.3, 0]; p.chest = [-0.1, 0, 0]; p.rootY = 0.02 + Math.abs(s) * 0.04; legs(p, [0, 0, 0.1], [0, 0, 0]); });
  // group variants reuse dance bases
  def('g_line', { loop: true, dance: true, bpm: 120, fn: t => A.d_shuffle.fn(t) });
  def('g_flex', { loop: true, fn: t => A.flex.fn(Math.min(t % 3.2, 2.6)) });
  def('g_hype', { loop: true, dance: true, bpm: 140, fn: t => A.d_hype.fn(t) });
  def('g_wave', { loop: true, dance: true, bpm: 108, fn: t => A.d_wave.fn(t) });

  // ---------------- WORKOUTS (a.p = rep progress 0..1, a.k = effort) ----------------
  const W = (name, f, o = {}) => def(name, Object.assign({ loop: true, workout: true, expr: 'strain', fn: (t, a) => { const p = REST(); f(p, a && a.p != null ? a.p : (t * 0.5) % 1, t, a || {}); return p; } }, o));
  // lying on back: rootRX = -PI/2 puts the body along +z facing up
  W('bench', (p, x) => { const k = tri(x * 2); p.rootRX = -PI / 2; p.rootY = -0.3; arms(p, [-1.57 + 0.05, 0, 0.55 - k * 0.45], [-1.2 * (1 - k), 0, 0], [0, 0, 0]); p.lArm[1] = 0; p.lFore = [0, 0, -1.25 * (1 - k)]; p.rFore = [0, 0, 1.25 * (1 - k)]; p.lArm = [-1.57, 0, 0.35 + (1 - k) * 0.6]; p.rArm = [-1.57, 0, -0.35 - (1 - k) * 0.6]; legs(p, [0.3, 0, 0.3], [1.35, 0, 0], [-0.3, 0, 0]); p.gripL = p.gripR = 1; p.head = [0.05, 0, 0]; });
  W('squat', (p, x) => { const k = tri(x * 2); p.hipsY = -0.42 * k; p.hipsZ = -0.12 * k; legs(p, [-1.45 * k, 0, 0.12], [1.85 * k, 0, 0], [-0.45 * k, 0, 0]); p.spine = [0.55 * k + 0.05, 0, 0]; p.head = [-0.4 * k, 0, 0]; arms(p, [-0.2, 0, 1.25], [-2.0, 0, 0]); p.lArm = [0.4, 0, 1.2]; p.rArm = [0.4, 0, -1.2]; p.lFore = [-2.0, 0.4, 0]; p.rFore = [-2.0, -0.4, 0]; p.gripL = p.gripR = 1; });
  W('treadmill', (p, x, t, a) => { const sp = a.speed || 3.5, ph = a.phase || t * 6; const L = locomotion({ speed: sp, phase: ph, grounded: true, turn: 0, style: 'normal', land: 0, takeoff: 0, vy: 0 }, t); Object.assign(p, L); }, { expr: 'concentrate' });
  W('bike', (p, x, t, a) => { const ph = a.phase || t * 6; p.hipsY = -0.24; p.hipsZ = -0.05; p.spine = [0.55, 0, 0]; p.head = [-0.35, 0, 0]; arms(p, [-1.2, 0, 0.15], [-0.3, 0, 0], [0.3, 0, 0]); p.gripL = p.gripR = 1; p.lThigh = [-1.35 + S(ph) * 0.4, 0, 0.06]; p.rThigh = [-1.35 - S(ph) * 0.4, 0, -0.06]; p.lShin = [1.25 + C(ph) * 0.45, 0, 0]; p.rShin = [1.25 - C(ph) * 0.45, 0, 0]; p.lFoot = [-0.2 + C(ph) * 0.2, 0, 0]; p.rFoot = [-0.2 - C(ph) * 0.2, 0, 0]; }, { expr: 'concentrate' });
  W('rower', (p, x) => { const drive = x < 0.45 ? ease(x / 0.45) : 1 - ease((x - 0.45) / 0.55); p.hipsY = -0.62; p.hipsZ = -0.18 * drive; p.spine = [0.4 - drive * 0.75, 0, 0]; legs(p, [-1.6 + drive * 1.3, 0, 0.1], [2.2 - drive * 2.0, 0, 0], [-0.6 + drive * 0.6, 0, 0]); arms(p, [-1.4 + drive * 1.3, 0, 0.12], [-0.1 - drive * 1.8, 0, 0], [0, 0, 0]); p.lFore[1] = -drive * 0.6; p.rFore[1] = drive * 0.6; p.gripL = p.gripR = 1; p.head = [-0.1, 0, 0]; });
  W('dumbbell', (p, x, t, a) => { const side = (a.side || 0) % 2; const k = tri(x * 2); arms(p, [0.05, 0, 0.15], [-0.15, 0, 0]); if (side === 0) { p.lFore = [-0.15 - k * 2.1, 0, 0]; p.lArm = [-0.15 * k, 0, 0.15]; } else { p.rFore = [-0.15 - k * 2.1, 0, 0]; p.rArm = [-0.15 * k, 0, -0.15]; } p.gripL = p.gripR = 1; legs(p, [0, 0, 0.1], [0.08, 0, 0]); p.chest = [-0.05, side ? 0.08 : -0.08, 0]; }, { props: ['dumbbellL', 'dumbbellR'] });
  W('curl', (p, x) => { const k = tri(x * 2); Object.assign(p, A.sit.fn(0)); arms(p, [-1.0, 0, 0.2], [-0.3 - k * 1.8, 0, 0]); p.spine = [0.2, 0, 0]; p.gripL = p.gripR = 1; });
  W('cable', (p, x, t, a) => { const k = tri(x * 2); arms(p, [-0.6 - k * 0.5, 0.0, 1.5 - k * 1.25], [-0.25 - k * 0.2, 0.5 * k, 0]); p.spine = [0.18 + k * 0.1, 0, 0]; legs(p, [-0.25, 0, 0.08], [0.3, 0, 0]); p.rThigh = [0.15, 0, -0.08]; p.gripL = p.gripR = 1; p.head = [0.1, 0, 0]; });
  W('latpull', (p, x) => { const k = tri(x * 2); Object.assign(p, A.sit.fn(0)); arms(p, [-0.2, 0, 2.7 - k * 1.25], [-0.2 - k * 1.6, 0, 0]); p.spine = [-0.15 - k * 0.1, 0, 0]; p.head = [-0.15, 0, 0]; p.gripL = p.gripR = 1; });
  W('legpress', (p, x) => { const k = tri(x * 2); p.rootRX = -1.0; p.rootY = -0.45; legs(p, [-2.1 + k * 1.1, 0, 0.18], [2.1 - k * 1.9, 0, 0], [-0.4, 0, 0]); arms(p, [-0.2, 0, 0.35], [-0.8, 0, 0]); p.gripL = p.gripR = 1; p.head = [0.25, 0, 0]; });
  W('chestpress', (p, x) => { const k = tri(x * 2); Object.assign(p, A.sit.fn(0)); arms(p, [-1.45, 0, 0.75 - k * 0.55], [-1.3 + k * 1.2, 0, 0]); p.lFore = [0, 0, -1.2 * (1 - k)]; p.rFore = [0, 0, 1.2 * (1 - k)]; p.lArm = [-1.45 + k * 0.1, 0, 0.9 - k * 0.6]; p.rArm = [-1.45 + k * 0.1, 0, -0.9 + k * 0.6]; p.spine = [-0.15, 0, 0]; p.gripL = p.gripR = 1; });
  W('shoulderpress', (p, x) => { const k = tri(x * 2); Object.assign(p, A.sit.fn(0)); p.lArm = [-0.1, 0, 1.5 + k * 1.2]; p.rArm = [-0.1, 0, -1.5 - k * 1.2]; p.lFore = [0, 0, -1.6 * (1 - k)]; p.rFore = [0, 0, 1.6 * (1 - k)]; p.spine = [-0.12, 0, 0]; p.gripL = p.gripR = 1; p.head = [-0.1, 0, 0]; });
  W('pullup', (p, x) => { const k = tri(x * 2); p.rootY = 0.55 + k * 0.42; arms(p, [-0.15, 0, 2.95 - k * 1.5], [-k * 1.9, 0, 0]); p.lFore = [0, 0, -k * 1.4]; p.rFore = [0, 0, k * 1.4]; legs(p, [-0.25, 0, 0.04], [0.9, 0, 0], [0.4, 0, 0]); p.gripL = p.gripR = 1; p.head = [-0.2 * k, 0, 0]; });
  W('dips', (p, x) => { const k = tri(x * 2); p.rootY = 0.55 - k * 0.25; arms(p, [0.15 + k * 0.7, 0, 0.18], [-0.05 - k * 1.5, 0, 0]); p.spine = [0.15 + k * 0.15, 0, 0]; legs(p, [-0.2, 0, 0.03], [1.2, 0, 0], [0.3, 0, 0]); p.gripL = p.gripR = 1; });
  W('pushup', (p, x) => { const k = tri(x * 2); p.rootRX = PI / 2 - 0.14; p.rootY = -0.55 - k * 0.12; arms(p, [-1.45 + k * 0.2, 0, 0.3], [-k * 1.3, 0, 0], [1.4 - k * 0.4, 0, 0]); p.lFore = [0, 0, -k * 1.3]; p.rFore = [0, 0, k * 1.3]; p.lArm = [-1.5, 0, 0.3 + k * 0.4]; p.rArm = [-1.5, 0, -0.3 - k * 0.4]; legs(p, [0, 0, 0.04], [0, 0, 0], [0.9, 0, 0]); p.head = [-0.3, 0, 0]; p.gripL = p.gripR = 0; });
  W('punch', (p, x, t, a) => { const side = (a.side || 0) % 2, k = Math.pow(tri(x * 2), 0.6); arms(p, [-1.3, 0, 0.35], [-2.0, 0, 0]); if (side === 0) { p.lArm = [-1.5, 0, 0.1]; p.lFore = [-2.0 * (1 - k) - 0.05, 0, 0]; p.chest = [0, -0.3 * k, 0]; } else { p.rArm = [-1.5, 0, -0.1]; p.rFore = [-2.0 * (1 - k) - 0.05, 0, 0]; p.chest = [0, 0.3 * k, 0]; } legs(p, [-0.25, 0, 0.12], [0.35, 0, 0]); p.rThigh = [0.25, 0, -0.1]; p.gripL = p.gripR = 1; p.head = [0.1, 0, 0]; }, { expr: 'concentrate' });
  W('barberchair', (p, x, t) => { Object.assign(p, A.sit.fn(t)); arms(p, [-0.6, 0, 0.12], [-0.4, 0, 0]); p.spine = [-0.2, 0, 0]; p.head = [-0.05, 0, 0]; }, { expr: 'neutral' });
  W('barber', (p, x, t) => { arms(p, [-0.9, 0.2, 0.2], [-1.4, 0, 0]); p.rFore[0] += S(t * 10) * 0.1; p.spine = [0.25, 0, 0]; p.head = [0.2, 0, 0]; p.gripR = 0.8; legs(p, [0, 0, 0.12], [0.1, 0, 0]); }, { expr: 'concentrate' });

  // ---------------- CONTROLLER ----------------
  class Controller {
    constructor(ch) { this.ch = ch; this.t = 0; this.loco = { speed: 0, phase: 0, grounded: true, vy: 0, turn: 0, style: 'normal', land: 0, takeoff: 0 }; this.act = null; this.prev = null; this.w = 0; this.sway = 0; this.speed01 = 0; this.cur = REST(); }
    rebind() { /* joints refreshed via this.ch.j each frame */ }
    play(name, opts = {}) {
      const d = A[name]; if (!d) return false;
      if (this.act && this.act.name === name && d.loop && !opts.restart) { Object.assign(this.act, opts); return true; }
      if (this.act) this.endProps(this.act);
      this.act = Object.assign({ name, def: d, t: 0, w: this.act ? this.w : 0, fade: opts.fade ?? 0.22 }, opts);
      (d.props || []).forEach(pr => this.ch.prop(pr, true));
      if (d.expr) { this.ch.setExpr(d.expr, d.dur || 2); this.ch.exprHold = !!d.loop; }
      return true;
    }
    endProps(a) { (a.def.props || []).forEach(pr => this.ch.prop(pr, false)); this.ch.exprHold = false; }
    stop(fade = 0.25) { if (this.act) { this.act.stopping = true; this.act.fade = fade; } }
    get busy() { return !!(this.act && !this.act.stopping); }
    get actionName() { return this.act && !this.act.stopping ? this.act.name : null; }
    update(dt, ctx = {}) {
      this.t += dt;
      const L = this.loco;
      if (ctx.speed != null) L.speed = ctx.speed;
      // distance-driven phase: one full cycle = 2 strides
      const stride = U.lerp(1.25, 2.6, U.smooth(2.5, 7.5, L.speed));
      L.phase += (L.speed * dt / stride) * Math.PI * 2;
      if (L.land > 0) L.land = Math.max(0, L.land - dt * 3.5);
      if (L.takeoff > 0) L.takeoff = Math.max(0, L.takeoff - dt * 6);
      this.speed01 = U.clamp(L.speed / 6, 0, 1);
      let p = locomotion(L, this.t);
      const a = this.act;
      if (a) {
        a.t += dt;
        const d = a.def;
        if (!d.loop && a.t >= (a.dur || d.dur || 2)) a.stopping = true;
        a.w = a.stopping ? Math.max(0, a.w - dt / a.fade) : Math.min(1, a.w + dt / a.fade);
        const q = d.fn(a.t * (a.rate || 1), a);
        // upper-body overlays blend only the upper joints when moving
        const moving = L.speed > 0.4 || !L.grounded;
        const mask = d.upper && moving ? UPPER : null;
        p = blend(p, q, a.w, mask);
        if (a.stopping && a.w <= 0) { this.endProps(a); this.act = null; if (a.onEnd) a.onEnd(); }
      }
      // smooth toward the target pose (prevents snaps)
      const c = this.cur, k = 1 - Math.exp(-dt * 22);
      for (const j of JOINTS) { const s = c[j], tt = p[j]; s[0] += (tt[0] - s[0]) * k; s[1] += (tt[1] - s[1]) * k; s[2] += (tt[2] - s[2]) * k; }
      for (const e of EXTRA) c[e] += ((p[e] || 0) - c[e]) * k;
      this.apply(c);
      this.sway = U.damp(this.sway, -L.speed * 0.12 + (L.grounded ? 0 : L.vy * 0.05), 4, dt);
    }
    apply(p) {
      const J = this.ch.j; if (!J) return;
      for (const j of JOINTS) { const o = J[j]; if (o) o.rotation.set(p[j][0], p[j][1], p[j][2]); }
      const hb = J.hips.userData.base; J.hips.position.set(hb.x + p.hipsX, hb.y + p.hipsY, hb.z + p.hipsZ);
      const body = this.ch.body, h = this.ch.hipY * body.scale.y, rx = p.rootRX; // rotate about the hips, not the feet
      body.rotation.x = rx; body.rotation.z = p.rootRZ; body.position.set(0, h - h * Math.cos(rx) + p.rootY, -h * Math.sin(rx));
      const hl = J.lHand.userData.fingers, hr = J.rHand.userData.fingers;
      if (hl) hl.rotation.z = -p.gripL * 1.5; if (hr) hr.rotation.z = p.gripR * 1.5;
      const tl = J.lHand.userData.thumb, tr = J.rHand.userData.thumb;
      if (tl) tl.rotation.z = -0.3 - p.gripL * 0.6; if (tr) tr.rotation.z = 0.3 + p.gripR * 0.6;
    }
  }
  function blend(a, b, w, mask) {
    if (w <= 0) return a; const out = {};
    const js = mask || JOINTS;
    for (const j of JOINTS) out[j] = a[j];
    for (const j of js) { const x = a[j], y = b[j] || x; out[j] = [x[0] + (y[0] - x[0]) * w, x[1] + (y[1] - x[1]) * w, x[2] + (y[2] - x[2]) * w]; }
    for (const e of EXTRA) out[e] = mask ? (e.startsWith('grip') ? U.lerp(a[e], b[e] ?? a[e], w) : a[e]) : U.lerp(a[e] || 0, b[e] ?? 0, w);
    return out;
  }
  return { Controller, ACTIONS: A, REST, locomotion };
})();
