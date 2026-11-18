/* Procedural hairstyles built on the sculpted head: fitted scalp caps, strand tubes, clumps, curls, braids, locs, buns. */
'use strict';
GR.Hair = (() => {
  const U = GR.U, G = GR.Geo, H = GR.Head;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // scalp cap from the deformed head: keep vertices above the hairline, push outward by thickness
  function hairline(x, y, z, style) {
    const ax = Math.abs(x);
    // front hairline ~y .42, temples .3, around ears ~.05, nape -.45
    const front = U.smooth(0.2, 0.75, z), back = U.smooth(0.1, -0.7, z);
    let h = U.lerp(0.12, 0.44, front) - back * 0.5;
    if (ax > 0.7 && z > -0.2 && z < 0.4) h = Math.min(h, 0.12 + (style === 'long' ? -0.15 : 0)); // around ears
    return y - h;
  }
  function cap(P, th, style, opts = {}) {
    const keep = [];
    const g = H.faceSphere(P, 64, 48, (x, y, z) => {
      const hd = hairline(x, y, z, style), ok = hd > 0 && (!opts.sidesOnly || Math.abs(x) > 0.55 || z < -0.3 || y < 0.55) && (!opts.topOnly || (y > 0.45 && Math.abs(x) < 0.75));
      keep.push(ok);
      const p = H.deform(x, y, z, P), l = Math.hypot(...p);
      let t = th * (0.2 + 0.8 * U.smooth(0, 0.22, hd)); if (opts.fadeSides) t *= U.lerp(0.35, 1, U.smooth(0.2, 0.7, y));
      if (opts.volTop) t += opts.volTop * U.smooth(0.3, 0.9, y) * (z > -0.5 ? 1 : 0.6);
      return [p[0] + p[0] / l * t, p[1] + p[1] / l * t, p[2] + p[2] / l * t];
    });
    const I = g.index.array, k = [];
    for (let i = 0; i < I.length; i += 3) if (keep[I[i]] && keep[I[i + 1]] && keep[I[i + 2]]) k.push(I[i], I[i + 1], I[i + 2]);
    g.setIndex(k); g.computeVertexNormals(); g.deleteAttribute('color');
    return g;
  }
  // point on scalp at sphere angles (az around Y from front, el from top)
  function scalp(P, az, el, off = 0) {
    const x = Math.sin(el) * Math.sin(az), y = Math.cos(el), z = Math.sin(el) * Math.cos(az);
    const p = H.deform(x, y, z, P), l = Math.hypot(...p);
    return { p: V(p[0] * (1 + off / l), p[1] * (1 + off / l), p[2] * (1 + off / l)), n: V(p[0] / l, p[1] / l, p[2] / l) };
  }
  // simulate a hanging strand: starts at scalp, lifts along normal, falls under gravity while staying outside the head ellipsoid
  function strand(P, az, el, len, opts = {}) {
    const s = scalp(P, az, el, 0.02), pts = [s.p.clone()];
    let pos = s.p.clone(), dir = s.n.clone().multiplyScalar(opts.lift ?? 0.6).add(V(0, -0.4, 0)).normalize();
    const segs = opts.segs || 8, step = len / segs, r = opts.rng || Math.random;
    for (let i = 0; i < segs; i++) {
      dir.add(V(0, -(opts.grav ?? 0.35), 0)).add(opts.push || V(0, 0, 0)).normalize();
      pos = pos.clone().add(dir.clone().multiplyScalar(step));
      // collide with head + shoulders volume (ellipsoid around head, cylinder below)
      const ex = pos.x / 1.0, ey = pos.y / 1.15, ez = (pos.z + 0.02) / 1.05, e = Math.hypot(ex, ey, ez);
      const minR = 1.06 + (opts.bulk || 0);
      if (pos.y > -1.0 && e < minR) pos.multiplyScalar(minR / e);
      if (pos.y < -1.0) { const rr = Math.hypot(pos.x, pos.z + 0.15), need = 1.0 + (opts.bulk || 0); if (rr < need) { const k = need / (rr || 1); pos.x *= k; pos.z = (pos.z + 0.15) * k - 0.15; } }
      if (opts.wave) { pos.x += Math.sin(i * 1.3 + az * 3) * opts.wave; pos.z += Math.cos(i * 1.1 + az * 2) * opts.wave * 0.6; }
      if (opts.jit) { pos.x += (r() - 0.5) * opts.jit; pos.z += (r() - 0.5) * opts.jit; }
      pts.push(pos.clone());
    }
    return pts;
  }
  // A sculpted hair sheet: hugs the scalp from elTop to elHead, then hangs straight down by `drop` (unit space).
  function curtain(P, { a0 = -Math.PI, a1 = Math.PI, elTop = 0.15, elHead = 1.75, drop = 0.6, off = 0.07, flare = 0.12, wave = 0, rows = 14, cols = 40, rag = 0.12, seed = 1, inward = 0 }) {
    const r = U.rng(seed), pos = [], uv = [], idx = [];
    const rag0 = []; for (let j = 0; j <= cols; j++) rag0.push(1 - r() * rag);
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      for (let j = 0; j <= cols; j++) {
        const u = j / cols, az = U.lerp(a0, a1, u);
        const split = elHead / (elHead + drop * 2.2);
        let p;
        if (t <= split) { const el = U.lerp(elTop, elHead, t / split); p = scalp(P, az, el, off + U.smooth(0.6, 1.6, el) * 0.04).p; }
        else { const base = scalp(P, az, elHead, off + 0.04).p; const k = (t - split) / (1 - split) * rag0[j]; const out = V(base.x, 0, base.z).normalize(); p = base.clone().add(V(0, -drop * 2.2 * k * (1 - split) / (1 - split) * 0.45, 0)).add(out.multiplyScalar(flare * k - inward * k * k)); if (wave) { p.x += Math.sin(k * 9 + az * 4) * wave * k; p.z += Math.cos(k * 8 + az * 3) * wave * k * 0.6; } }
        pos.push(p.x, p.y, p.z); uv.push(u * 3, t);
      }
    }
    const row = cols + 1; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * row + j, b = a + row; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    return G.build(pos, null, uv, idx);
  }
  const clumpCone = (base, n, len, r, bend = V(0, 0, 0)) => {
    const tip = base.clone().add(n.clone().multiplyScalar(len)).add(bend);
    const mid = base.clone().lerp(tip, 0.5).add(n.clone().multiplyScalar(len * 0.15));
    return G.tube([base.clone().sub(n.clone().multiplyScalar(0.03)), mid, tip], t => r * (1 - t * 0.92), 5, 6);
  };
  const braid = (pts, r) => G.tube(pts, t => r * (0.85 + 0.25 * Math.abs(Math.sin(t * pts.length * 6))) * (t > 0.96 ? 0.7 : 1), 6, pts.length * 6);

  /** Returns { main: BufferGeometry, hi: BufferGeometry|null, pony?: geometry for swinging part } in head-unit space. */
  function build(style, P, opts = {}) {
    const r = U.rng(style + (opts.seed || 0));
    const main = [], hi = [], swing = [];
    const hat = !!opts.hat, lod = opts.lod ?? 1;
    const add = (g, isHi = false) => (isHi && opts.hi ? hi : main).push(g);
    const dens = lod ? 1 : 0.4;
    switch (style) {
      case 'bald': break;
      case 'buzz': main.push(cap(P, 0.012, style)); break;
      case 'fade': main.push(cap(P, 0.03, style, { fadeSides: true, volTop: 0.04 }));
        if (!hat) for (let i = 0; i < 40 * dens; i++) { const s = scalp(P, (r() - 0.5) * 1.4, r() * 0.5, 0.05); add(clumpCone(s.p, s.n.clone().multiplyScalar(0.35).add(V(0, 0.2, 0.9)).normalize(), 0.09, 0.05), r() > 0.7); }
        break;
      case 'crop': main.push(cap(P, 0.04, style, { volTop: 0.03 }));
        if (!hat) for (let i = 0; i < 70 * dens; i++) { const az = (r() - 0.5) * 2.6, el = r() * 0.75; const s = scalp(P, az, el, 0.05); add(clumpCone(s.p, s.n.clone().multiplyScalar(0.3).add(V(0, 0.15, 0.95)).normalize(), 0.12 + r() * 0.05, 0.06), r() > 0.75); }
        break;
      case 'hightop': main.push(cap(P, 0.02, style, { fadeSides: true }));
        if (!hat) { const top = new THREE.CylinderGeometry(0.62, 0.7, 0.55, 24, 4); const p = top.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + (Math.sin(x * 40) * Math.cos(z * 37) + Math.sin(y * 31)) * 0.02; p.setXYZ(i, x * n, y, z * n); } top.computeVertexNormals(); main.push([top, G.M.trs(0, 0.95, -0.05, -0.12, 0, 0)][0].applyMatrix4(G.M.trs(0, 0.95, -0.05, -0.12, 0, 0))); }
        break;
      case 'quiff': case 'pomp': { const big = style === 'pomp'; main.push(cap(P, 0.05, style, { volTop: big ? 0.07 : 0.04 }));
        if (!hat) for (let i = 0; i < 50 * dens; i++) { const az = (r() - 0.5) * 1.4, el = 0.15 + r() * 0.55; const s = scalp(P, az, el, 0.04); const pts = [s.p, s.p.clone().add(V(0, 0.18 + (big ? 0.12 : 0), 0.12)), s.p.clone().add(V(0, 0.26 + (big ? 0.15 : 0), -0.1 - el * 0.6)), V(s.p.x * 0.9, 0.85 + (big ? 0.08 : 0), -0.5)]; add(G.tube(pts, t => 0.07 * (1 - t * 0.6), 5, 10), r() > 0.7); }
        break; }
      case 'slick': main.push(cap(P, 0.06, style, { volTop: 0.03 }));
        if (!hat) for (let i = 0; i < 40 * dens; i++) { const az = (r() - 0.5) * 2, s = scalp(P, az, 0.3, 0.05); const pts = [s.p, V(s.p.x * 1.02, 1.05, 0.1), V(s.p.x * 1.0, 0.92, -0.55), V(s.p.x * 0.9, 0.55, -0.95)]; add(G.tube(pts, 0.045, 4, 10), r() > 0.7); }
        break;
      case 'spiky': main.push(cap(P, 0.04, style));
        if (!hat) for (let i = 0; i < 55 * dens; i++) { const az = (r() - 0.5) * 3.2, el = r() * 0.9; const s = scalp(P, az, el, 0.03); const n = s.n.clone().add(V(0, 0.8, 0.1)).normalize(); add(clumpCone(s.p, n, 0.22 + r() * 0.12, 0.075), true); }
        break;
      case 'curtains': case 'fringe': case 'mullet': case 'wolf': {
        main.push(cap(P, 0.05, style, { volTop: 0.03 }));
        const back = style === 'mullet' ? 0.75 : style === 'wolf' ? 0.55 : 0.12;
        main.push(curtain(P, { a0: Math.PI * 0.55, a1: Math.PI * 1.45, elTop: 0.5, elHead: 1.9, drop: back, flare: 0.08, rag: 0.25, seed: 3, wave: style === 'wolf' ? 0.04 : 0 }));
        if (!hat) {
          if (style === 'curtains') for (const sd of [1, -1]) main.push(curtain(P, { a0: sd > 0 ? 0.05 : -1.3, a1: sd > 0 ? 1.3 : -0.05, elTop: 0.05, elHead: 1.0, drop: 0.12, off: 0.08, flare: 0.1, rag: 0.3, seed: 5 + sd, rows: 10, cols: 18 }));
          else if (style === 'fringe') main.push(curtain(P, { a0: -1.4, a1: 1.4, elTop: 0.05, elHead: 0.95, drop: 0.0, off: 0.085, flare: 0.04, rag: 0.08, seed: 7, rows: 10, cols: 30 }));
          else main.push(curtain(P, { a0: -1.5, a1: 1.5, elTop: 0.05, elHead: 0.9, drop: 0.05, off: 0.08, flare: 0.05, rag: 0.3, seed: 9, rows: 8, cols: 26 }));
          for (let i = 0; i < 28 * dens; i++) { const az = (r() - 0.5) * 2.4, s2 = scalp(P, az, r() * 0.6, 0.07); add(clumpCone(s2.p, s2.n.clone().multiplyScalar(0.3).add(V(az * 0.3, -0.1, 0.9)).normalize(), 0.12, 0.05), r() > 0.7); }
        }
        break; }
      case 'curlytop': case 'curlymid': case 'afro': case 'puffs': {
        main.push(cap(P, style === 'curlytop' ? 0.03 : 0.06, style, { fadeSides: style === 'curlytop' }));
        if (style === 'afro' && !hat) {
          const g = new THREE.SphereGeometry(1.42, 32, 24); const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + (Math.sin(x * 9) * Math.sin(y * 11) * Math.sin(z * 10)) * 0.04 + (r() - 0.5) * 0.02; p.setXYZ(i, x * n * 1.0, y * n * 0.9, z * n * 0.95); }
          g.computeVertexNormals(); g.applyMatrix4(G.M.t(0, 0.38, -0.12)); main.push(g);
        }
        if (style === 'puffs' && !hat) for (const sx of [-1, 1]) { const g = new THREE.SphereGeometry(0.5, 20, 16); g.applyMatrix4(G.M.t(sx * 0.62, 0.95, -0.15)); main.push(g); main.push(G.torus(0.22, 0.05, 6, 16).applyMatrix4(G.M.trs(sx * 0.48, 0.72, -0.12, 1.2, sx * 0.4, 0))); }
        const N = Math.round((style === 'afro' ? 40 : style === 'curlymid' ? 220 : 150) * dens);
        for (let i = 0; i < N; i++) {
          const az = (r() - 0.5) * (style === 'curlytop' ? 2.2 : U.TAU), el = r() * (style === 'curlytop' ? 0.75 : 1.3);
          if (hat && el < 1.1) continue;
          const s = scalp(P, az, el, style === 'afro' ? 0.38 : 0.07 + r() * 0.06);
          const g = new THREE.TorusGeometry(0.045 + r() * 0.02, 0.025, 5, 8); g.applyMatrix4(G.M.trs(s.p.x, s.p.y, s.p.z, r() * 6, r() * 6, r() * 6));
          add(g, r() > 0.7);
          if (style === 'curlymid' && el > 0.9 && r() > 0.4) { const pts = strand(P, az, el, 0.3, { wave: 0.06, rng: r }); add(G.tube(pts, 0.04, 4, 10), r() > 0.7); }
        }
        break; }
      case 'twists': case 'shortlocs': {
        main.push(cap(P, 0.05, style));
        const N = Math.round(90 * dens);
        for (let i = 0; i < N; i++) {
          const az = (r() - 0.5) * U.TAU, el = r() * 1.35; if (hat && el < 1.0) continue;
          const s = scalp(P, az, el, 0.03), len = style === 'twists' ? 0.22 + r() * 0.1 : 0.32 + r() * 0.15;
          const n = s.n.clone().add(V(0, -0.35, 0)).normalize(); const pts = [s.p, s.p.clone().add(n.clone().multiplyScalar(len * 0.5)).add(V(0, -0.02, 0)), s.p.clone().add(n.clone().multiplyScalar(len)).add(V(0, -len * 0.3, 0))];
          add(style === 'twists' ? braid(pts, 0.045) : G.tube(pts, t => 0.055 * (1 - t * 0.15), 5, 6), r() > 0.7);
        }
        break; }
      case 'cornrows': {
        main.push(cap(P, 0.015, style));
        for (let k = -4; k <= 4; k++) {
          const pts = []; for (let i = 0; i <= 12; i++) { const el = 0.3 + i / 12 * 1.7, s = scalp(P, k * 0.17 * (1 - i / 30), el, 0.04); pts.push(s.p); }
          add(braid(pts, 0.045), k % 3 === 0);
        }
        break; }
      case 'boxbraids': case 'locs': {
        main.push(cap(P, 0.03, style));
        const N = Math.round((style === 'locs' ? 70 : 95) * dens);
        for (let i = 0; i < N; i++) {
          const az = (r() - 0.5) * U.TAU * 0.95, el = 0.15 + r() * 1.35;
          if (Math.abs(az) < 1.25 && el < 1.3) continue; // keep the face clear
          if (hat && el < 1.0) continue;
          const pts = strand(P, az, el, 1.5 + r() * 0.4, { rng: r, grav: 0.9, lift: 0.1, segs: 10, jit: 0.01, bulk: 0.08 });
          add(style === 'boxbraids' ? braid(pts, 0.045) : G.tube(pts, t => 0.065 * (0.9 + Math.sin(t * 20 + i) * 0.1), 5, 20), r() > 0.72);
        }
        if (style === 'boxbraids' && !hat) for (let i = 0; i < 8; i++) { const s = scalp(P, (r() - 0.5) * 1.2, 0.2 + r() * 0.2, 0.02); add(G.tube([s.p, s.p.clone().add(V(0, 0.05, 0.08))], 0.03, 4, 3)); }
        break; }
      case 'bob': case 'long': case 'wavy': case 'pixie': {
        main.push(cap(P, 0.05, style, { volTop: 0.035 }));
        const drop = style === 'bob' ? 0.22 : style === 'pixie' ? 0.0 : 1.05, wave = style === 'wavy' ? 0.07 : 0;
        // back + sides sheet (leaves the face open)
        main.push(curtain(P, { a0: style === 'pixie' ? Math.PI * 0.5 : 0.95, a1: style === 'pixie' ? Math.PI * 1.5 : U.TAU - 0.95, elTop: 0.35, elHead: style === 'pixie' ? 1.75 : 1.85, drop, flare: style === 'bob' ? 0.05 : 0.14, inward: style === 'bob' ? 0.1 : 0, rag: style === 'bob' ? 0.03 : 0.18, wave, seed: 11, rows: 18, cols: 44, off: 0.075 }));
        if (style !== 'pixie') main.push(curtain(P, { a0: 0.9, a1: 1.6, elTop: 0.12, elHead: 1.85, drop: drop * 0.95, flare: 0.1, rag: 0.15, wave, seed: 12, rows: 14, cols: 10, off: 0.085 }), curtain(P, { a0: -1.6, a1: -0.9, elTop: 0.12, elHead: 1.85, drop: drop * 0.95, flare: 0.1, rag: 0.15, wave, seed: 13, rows: 14, cols: 10, off: 0.085 }));
        if (!hat) {
          if (style === 'bob' || style === 'pixie') main.push(curtain(P, { a0: -1.2, a1: 1.2, elTop: 0.05, elHead: style === 'pixie' ? 0.8 : 0.92, drop: 0, off: 0.09, flare: 0.04, rag: 0.15, seed: 14, rows: 8, cols: 26 }));
          else main.push(curtain(P, { a0: 0.08, a1: 1.0, elTop: 0.03, elHead: 0.95, drop: 0, off: 0.085, rag: 0.2, seed: 15, rows: 8, cols: 12 }), curtain(P, { a0: -1.0, a1: -0.08, elTop: 0.03, elHead: 0.95, drop: 0, off: 0.085, rag: 0.2, seed: 16, rows: 8, cols: 12 }));
        }
        // highlight streaks (on top of the sheet) + a few loose strands for long styles
        if (opts.hi) [-1.6, -0.9, 0.9, 1.6, Math.PI].forEach((a, i) => hi.push(curtain(P, { a0: a - 0.12, a1: a + 0.12, elTop: 0.3, elHead: 1.85, drop: style === 'pixie' ? 0 : drop * 0.98, off: 0.085, flare: style === 'bob' ? 0.05 : 0.14, inward: style === 'bob' ? 0.1 : 0, rag: 0.1, wave, seed: 30 + i, rows: 12, cols: 4 })));
        if (drop > 0.5) for (let i = 0; i < 18 * dens; i++) { const az = Math.PI + (r() - 0.5) * 3.2, el = 0.9 + r() * 0.7; if (hat && el < 1.1) continue; const pts = strand(P, az, el, drop * 0.75, { rng: r, lift: 0.02, grav: 1.2, bulk: 0.1, wave: wave * 0.6, segs: 8 }); add(G.tube(pts, t => 0.035 * (1 - t * 0.6), 4, 10)); }
        break; }
      case 'pony': case 'bun': case 'spacebuns': case 'manbun': {
        main.push(cap(P, 0.04, style, { fadeSides: style === 'manbun' }));
        if (!hat) for (let i = 0; i < 40 * dens; i++) { const az = (r() - 0.5) * U.TAU, s = scalp(P, az, 0.3 + r() * 0.8, 0.045); const target = style === 'spacebuns' ? V(Math.sign(s.p.x || 1) * 0.55, 1.05, -0.2) : style === 'pony' ? V(0, 0.8, -0.85) : style === 'bun' ? V(0, 1.15, -0.25) : V(0, 0.75, -0.8); add(G.tube([s.p, s.p.clone().lerp(target, 0.5).multiplyScalar(1.04), target], 0.04, 4, 6), r() > 0.7); }
        if (style === 'pony') { const pts = [V(0, 0.8, -0.95), V(0, 0.6, -1.25), V(0, 0.1, -1.35), V(0, -0.45, -1.3), V(0, -0.9, -1.2)]; swing.push(G.tube(pts, t => 0.2 * (1 - t * 0.7), 8, 20)); if (opts.hi) hi.push(G.tube(pts.map(p => p.clone().add(V(0.05, 0, -0.03))), t => 0.09 * (1 - t * 0.7), 6, 16)); main.push(G.torus(0.13, 0.04, 6, 16).applyMatrix4(G.M.trs(0, 0.8, -0.95, 0.9, 0, 0))); }
        if (!hat && style === 'bun') { const g = new THREE.SphereGeometry(0.34, 18, 14); g.applyMatrix4(G.M.t(0, 1.2, -0.3)); main.push(g); main.push(G.torus(0.22, 0.04, 6, 16).applyMatrix4(G.M.trs(0, 1.02, -0.26, 1.3, 0, 0))); }
        if (!hat && style === 'spacebuns') for (const sx of [-1, 1]) { const g = new THREE.SphereGeometry(0.3, 16, 12); g.applyMatrix4(G.M.t(sx * 0.58, 1.08, -0.2)); main.push(g); }
        if (style === 'manbun') { const g = new THREE.SphereGeometry(0.28, 16, 12); g.applyMatrix4(G.M.t(0, 0.85, -1.0)); main.push(g); }
        break; }
      default: main.push(cap(P, 0.04, style));
    }
    return { main: main.length ? G.merge(main) : null, hi: hi.length ? G.merge(hi) : null, swing: swing.length ? G.merge(swing) : null, buzz: style === 'buzz' };
  }
  return { build };
})();
