/* MOG CITY: roads, sidewalks, districts, buildings with lit windows and readable storefronts, parks, court, car park, plaza. */
'use strict';
GR.City = (() => {
  const U = GR.U, P = GR.Props, T = GR.Tex, W = GR.World;
  const ROADS = [-120, -40, 40, 120], BLOCKS = [-80, 0, 80], HALF = 35, INNER = 32;
  const windowMats = [], lamps = [], doors = [], signs = [];
  let zn;

  const facadeMat = (kind, col, w, h) => {
    const rep = [Math.max(1, w / 4), Math.max(1, h / 4)];
    const tex = kind === 'brick' ? T.ENV.brick(rep, col) : kind === 'siding' ? T.ENV.siding(rep, col) : kind === 'plaster' ? T.ENV.plaster(rep, col) : T.ENV.concrete(rep, col);
    return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  };
  const winCache = new Map();
  function windowsMat(seed, cols, rows, frame) {
    seed = seed % 5; const ck = seed + '_' + cols + '_' + rows + '_' + frame; if (winCache.has(ck)) return winCache.get(ck);
    const day = T.windowTex(false, seed, cols, rows, frame), lit = T.windowTex(true, seed, cols, rows, frame);
    const m = new THREE.MeshStandardMaterial({ map: day, emissiveMap: lit, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.25, metalness: 0.3 });
    windowMats.push(m); winCache.set(ck, m); return m;
  }
  const faceInfo = (f, x, z, w, d) => ({ s: { nx: 0, nz: 1, px: x, pz: z + d / 2, len: w, ry: 0 }, n: { nx: 0, nz: -1, px: x, pz: z - d / 2, len: w, ry: Math.PI }, e: { nx: 1, nz: 0, px: x + w / 2, pz: z, len: d, ry: Math.PI / 2 }, w: { nx: -1, nz: 0, px: x - w / 2, pz: z, len: d, ry: -Math.PI / 2 } })[f];

  /** generic building. opts.door = {face, off, target, label}; opts.store = {face, name, bg, fg, display}  */
  function building(o) {
    const { x, z, w, d, h, kind = 'concrete', col = '#b9b6ae', roof = 'flat', floors = true } = o;
    const g = new THREE.Group(); g.position.set(x, 0.12, z); zn.group.add(g);
    const fm = facadeMat(kind, col, w, h);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
    P.box(w + 0.4, 0.4, d + 0.4, P.std(U.shade(col, -0.35), 0.7), 0, h + 0.2, 0, g);
    if (roof === 'gable') { const rg = new THREE.CylinderGeometry(0.01, d * 0.62, w + 0.6, 4, 1); rg.rotateZ(Math.PI / 2); rg.rotateX(Math.PI / 4); const r = new THREE.Mesh(rg, P.std(o.roofCol || '#7a3e2b', 0.8)); r.scale.set(1, 0.5, 1); r.position.y = h + 0.2 + d * 0.2; r.castShadow = true; g.add(r); }
    else { const r = U.rng(x * 13 + z); for (let i = 0; i < 3; i++) P.box(1.2 + r() * 1.5, 0.8, 1.2, P.std('#9aa0a6', 0.5, 0.5), (r() - 0.5) * (w - 3), h + 0.8, (r() - 0.5) * (d - 3), g); }
    zn.box(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h + 0.12);
    // window bands on all faces above the ground floor
    if (floors) {
      const rows = Math.max(1, Math.floor((h - 4.4) / 3.2));
      ['s', 'n', 'e', 'w'].forEach((f, fi) => {
        const F = faceInfo(f, 0, 0, w, d); if (F.len < 4 || rows < 1) return;
        const cols = Math.max(1, Math.round(F.len / 3)), wm = windowsMat(Math.floor(x * 7 + z * 3 + fi), cols, rows, o.frame || '#2b2f36');
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(F.len - 1.2, rows * 3.2 - 0.6), wm); pl.position.set(F.px + F.nx * 0.03, 4.4 + rows * 1.6, F.pz + F.nz * 0.03); pl.rotation.y = F.ry; g.add(pl);
        for (let r2 = 0; r2 <= rows; r2++) { const ledge = P.box(F.len - 1.0, 0.12, 0.18, P.std(U.shade(col, -0.2), 0.7), F.px + F.nx * 0.08, 4.1 + r2 * 3.2, F.pz + F.nz * 0.08, g); ledge.rotation.y = F.ry; }
      });
    }
    // storefront
    if (o.store) {
      const S = o.store, F = faceInfo(S.face, 0, 0, w, d);
      const glassW = Math.min(F.len - 2, 12);
      const disp = T.memo('disp_' + S.name, () => storeDisplay(S));
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(glassW, 3.2), new THREE.MeshStandardMaterial({ map: disp, emissive: new THREE.Color('#ffffff'), emissiveMap: disp, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.2 }));
      gl.position.set(F.px + F.nx * 0.04, 1.75, F.pz + F.nz * 0.04); gl.rotation.y = F.ry; g.add(gl); windowMats.push(gl.material); gl.material.userData.store = true;
      const frame = P.box(glassW + 0.3, 3.5, 0.15, P.std('#1b1b1d', 0.4, 0.5), F.px + F.nx * 0.02, 1.75, F.pz + F.nz * 0.02, g); frame.rotation.y = F.ry; frame.scale.z = 0.5;
      const st = T.sign(S.name, { bg: S.bg, fg: S.fg, w: 1024, h: 200, sub: S.sub, glow: true });
      const sm = new THREE.MeshStandardMaterial({ map: st, emissive: new THREE.Color('#ffffff'), emissiveMap: st, emissiveIntensity: 0.5, roughness: 0.4 });
      const sg = new THREE.Mesh(new THREE.BoxGeometry(Math.min(F.len - 1, 10), 1.4, 0.3), [P.std(S.bg instanceof Array ? S.bg[0] : S.bg), P.std(S.bg instanceof Array ? S.bg[0] : S.bg), P.std('#111'), P.std('#111'), sm, P.std('#111')]);
      sg.position.set(F.px + F.nx * 0.25, 4.0, F.pz + F.nz * 0.25); sg.rotation.y = F.ry; g.add(sg); signs.push(sm);
      // awning
      const aw = new THREE.Mesh(new THREE.BoxGeometry(glassW + 1, 0.08, 1.4), P.std(S.awning || '#1b1b1d', 0.7)); aw.position.set(F.px + F.nx * 0.7, 3.45, F.pz + F.nz * 0.7); aw.rotation.y = F.ry; aw.rotation.x = 0; g.add(aw);
    }
    if (o.door) {
      const D = o.door, F = faceInfo(D.face, 0, 0, w, d), off = D.off || 0;
      const tx = F.nz !== 0 ? off : 0, tz = F.nx !== 0 ? off : 0;
      const dr = new THREE.Group(); dr.position.set(F.px + tx + F.nx * 0.05, 0, F.pz + tz + F.nz * 0.05); dr.rotation.y = F.ry; g.add(dr);
      P.box(2.2, 2.8, 0.1, P.std('#1b1b1d', 0.3, 0.6), 0, 1.4, 0, dr); P.box(1.9, 2.6, 0.06, P.std('#9fd3ff', 0.05, 0.3, { transparent: true, opacity: 0.55, emissive: new THREE.Color('#ffe7b0'), emissiveIntensity: 0.2 }), 0, 1.3, 0.04, dr); P.box(0.05, 0.6, 0.05, P.chrome(), 0.6, 1.2, 0.12, dr);
      const wx = x + F.px + tx + F.nx * 1.6, wz = z + F.pz + tz + F.nz * 1.6;
      // glowing entry marker
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), new THREE.MeshBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0.65, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(wx, 0.14, wz); zn.group.add(ring); ring.userData.dyn = true; doors.push(ring);
      if (D.target) {
        zn.interact({ id: 'door_' + D.target, pos: new THREE.Vector3(wx, 0, wz), r: 1.8, prompt: 'Enter ' + (GR.Data.LOCATIONS[D.target] ? GR.Data.LOCATIONS[D.target].n : D.label), action: () => GR.Game.enterZone(D.target), kind: 'door' });
        W.zones.city.doorOut = W.zones.city.doorOut || {}; W.zones.city.doorOut[D.target] = { x: wx, z: wz, ry: Math.atan2(F.nx, F.nz) };
      }
    }
    return g;
  }
  function storeDisplay(S) {
    const c = T.canvas(512, 256), ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, S.inside || '#f4efe6'); g.addColorStop(1, U.shade(S.inside || '#f4efe6', -0.3)); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(255,255,240,0.6)'; for (let i = 0; i < 5; i++) ctx.fillRect(40 + i * 100, 8, 60, 6);
    const r = U.rng(S.name);
    for (let i = 0; i < 4; i++) { const x = 50 + i * 120; // mannequins / racks / shelves silhouettes
      if (S.display === 'shoes') { ctx.fillStyle = '#e8e2d6'; ctx.fillRect(x - 40, 60, 90, 170); for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = U.pick(['#1b4dff', '#ef4444', '#111', '#f4f4f2', '#f97316', '#10b981']); ctx.beginPath(); ctx.ellipse(x - 18 + j * 42, 90 + k * 38, 16, 8, 0, 0, 7); ctx.fill(); } }
      else if (S.display === 'furniture') { ctx.fillStyle = U.pick(['#4b5563', '#7c4a2d', '#1e3a5f', '#d6d3c9']); ctx.fillRect(x - 45, 170, 100, 45); ctx.fillRect(x - 45, 140, 100, 35); ctx.fillStyle = '#2f7d32'; ctx.beginPath(); ctx.arc(x + 40, 110, 22, 0, 7); ctx.fill(); }
      else if (S.display === 'bottles') { ctx.fillStyle = '#fff'; ctx.fillRect(x - 45, 70, 100, 150); for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) { ctx.fillStyle = U.pick(['#ffd6e7', '#9ad1ff', '#ffe08a', '#d8c3ff', '#b7f0d0']); ctx.fillRect(x - 40 + j * 19, 80 + k * 48, 12, 34); } }
      else if (S.display === 'barber') { ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x - 25, 150, 55, 60); ctx.fillRect(x - 25, 105, 55, 50); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 5, 210, 15, 30); ctx.fillStyle = '#bcd'; ctx.fillRect(x - 35, 40, 75, 60); }
      else if (S.display === 'food') { ctx.fillStyle = '#6b4e3d'; ctx.fillRect(0, 170, 512, 86); ctx.fillStyle = U.pick(['#f4f1de', '#ffd23f']); ctx.beginPath(); ctx.arc(x, 150, 20, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2f36'; ctx.fillRect(x - 30, 30, 60, 40); }
      else { ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(x, 70, 14, 0, 7); ctx.fill(); ctx.fillStyle = U.pick(['#ef4444', '#1b4dff', '#111', '#f2c94c', '#7b2cbf', '#10b981', '#ff4fa3']); ctx.fillRect(x - 24, 86, 48, 70); ctx.fillStyle = U.pick(['#3a5a8c', '#111', '#6b5b3e', '#4b5563']); ctx.fillRect(x - 20, 156, 18, 70); ctx.fillRect(x + 2, 156, 18, 70); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(200, 0); ctx.lineTo(0, 256); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.fillText(r() > 0.5 ? 'NEW DROP' : 'OPEN', 410, 40);
    return T.toTex(c);
  }
  function house(x, z, ry, col, seed) {
    const g = new THREE.Group(); g.position.set(x, 0.12, z); g.rotation.y = ry; zn.group.add(g);
    const fm = facadeMat('siding', col, 9, 4); const b = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 8), fm); b.position.y = 2.1; b.castShadow = b.receiveShadow = true; g.add(b);
    const rg = new THREE.ConeGeometry(7.2, 2.6, 4, 1); rg.rotateY(Math.PI / 4); const rf = new THREE.Mesh(rg, P.std(U.pick(['#7a3e2b', '#3f4a2c', '#2c3e66', '#4b5563']), 0.85)); rf.scale.set(1, 1, 0.9); rf.position.y = 5.5; rf.castShadow = true; g.add(rf);
    P.box(1.2, 2.3, 0.1, P.std(U.pick(['#7f1d1d', '#1e3a5f', '#3f4a2c', '#111']), 0.5), 0, 1.15, 4.02, g);
    const wm = windowsMat(seed, 2, 1, '#f4f4f2'); [[-2.8, 4.02, 0], [2.8, 4.02, 0]].forEach(([wx, wz]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), wm); w.position.set(wx, 2.2, wz); g.add(w); });
    // fence + mailbox
    for (let i = -5; i <= 5; i++) P.box(0.08, 0.9, 0.08, P.std('#f4f4f2', 0.6), i, 0.45, 6.5, g); P.box(10.2, 0.08, 0.05, P.std('#f4f4f2', 0.6), 0, 0.8, 6.5, g); P.box(10.2, 0.08, 0.05, P.std('#f4f4f2', 0.6), 0, 0.4, 6.5, g);
    P.box(0.3, 0.25, 0.45, P.std('#1b4dff', 0.4, 0.4), 4.2, 1.05, 6.8, g, 0.05); P.box(0.06, 0.95, 0.06, P.std('#555'), 4.2, 0.47, 6.8, g);
    const c = Math.abs(Math.cos(ry)) > 0.5; zn.boxC(x, z, c ? 9 : 8, c ? 8 : 9, 4.3);
  }

  function streetDecor() {
    // streetlights + trees along sidewalks
    for (const bx of BLOCKS) for (const bz of BLOCKS) {
      for (const [side, nx, nz] of [['s', 0, 1], ['n', 0, -1], ['e', 1, 0], ['w', -1, 0]]) {
        for (let t = -24; t <= 24; t += 16) {
          const px = bx + (nx ? nx * (HALF - 0.6) : t), pz = bz + (nz ? nz * (HALF - 0.6) : t);
          const sl = P.streetLight(); sl.position.set(px, 0.12, pz); sl.rotation.y = Math.atan2(nx, nz); zn.group.add(sl); lamps.push(sl); zn.box(px - 0.12, pz - 0.12, px + 0.12, pz + 0.12, 5);
          const tx = bx + (nx ? nx * (HALF - 1.6) : t + 8), tz = bz + (nz ? nz * (HALF - 1.6) : t + 8);
          if (Math.abs(t) < 24) { const tr = P.tree(Math.floor(tx * 3 + tz * 7), 0.85); tr.position.set(tx, 0.12, tz); zn.group.add(tr); zn.box(tx - 0.2, tz - 0.2, tx + 0.2, tz + 0.2, 3); foliage(tx, tz, 1.3); }
        }
      }
    }
    // dashed lane lines + crosswalks
    const markMat = new THREE.MeshStandardMaterial({ map: T.roadMarks(), transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const r of ROADS) {
      for (const seg of [[-125, -45], [-35, 35], [45, 125], [-125, 125]].slice(0, 3)) { const len = seg[1] - seg[0]; const mid = (seg[0] + seg[1]) / 2;
        const a = new THREE.Mesh(new THREE.PlaneGeometry(0.4, len), markMat.clone()); a.material.map = T.roadMarks().clone(); a.material.map.needsUpdate = true; a.material.map.wrapT = THREE.RepeatWrapping; a.material.map.repeat.set(1, len / 6); a.rotation.x = -Math.PI / 2; a.position.set(r, 0.012, mid); zn.group.add(a);
        const b = a.clone(); b.rotation.z = Math.PI / 2; b.position.set(mid, 0.012, r); zn.group.add(b); }
    }
    const white = P.std('#f4f1e1', 0.6);
    for (const xr of ROADS) for (const zr of ROADS) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      for (let i = -2; i <= 2; i++) { const s = P.box(dx ? 0.5 : 1.0, 0.02, dx ? 1.0 : 0.5, white, xr + dx * 6.6 + (dz ? i * 1.0 : 0), 0.011, zr + dz * 6.6 + (dx ? i * 1.0 : 0)); s.castShadow = false; zn.group.add(s); }
    }
    // traffic lights at intersections
    for (const xr of [-40, 40]) for (const zr of [-40, 40]) for (const [dx, dz] of [[1, 1], [-1, -1]]) { const tl = P.trafficLight(); tl.position.set(xr + dx * 5.8, 0.12, zr + dz * 5.8); tl.rotation.y = dx > 0 ? 0 : Math.PI; zn.group.add(tl); tl.userData.dyn = true; GR.City.tlights.push(tl); }
    // bus stops (fast travel)
    [[-40 - 6.2, 20, Math.PI / 2, 'Drip Street'], [40 + 6.2, -20, -Math.PI / 2, 'Iron Temple'], [20, 40 + 6.2, Math.PI, 'Bean There'], [-20, -40 - 6.2, 0, 'Aura Arena'], [-40 - 6.2, 95, Math.PI / 2, 'Mog Towers'], [40 + 6.2, 95, -Math.PI / 2, 'Sigma Park']].forEach(([x, z, ry, name], i) => {
      const b = P.busStop(); b.position.set(x, 0.12, z); b.rotation.y = ry; zn.group.add(b);
      const fx = x + Math.sin(ry) * 1.2, fz = z + Math.cos(ry) * 1.2;
      zn.interact({ id: 'bus_' + i, pos: new THREE.Vector3(fx, 0, fz), r: 2.2, prompt: 'Mog Metro (Fast travel)', action: () => GR.UI.openMap(true), kind: 'bus' });
      zn.seats.push({ x: x - Math.sin(ry) * 0.3, z: z - Math.cos(ry) * 0.3, ry, h: 0.5 });
      GR.City.busStops.push({ name, x: fx, z: fz });
    });
    // hydrants & bins
    for (const bx of BLOCKS) for (const bz of BLOCKS) { const h = P.hydrant(); h.position.set(bx + HALF - 0.8, 0.12, bz + 10); zn.group.add(h); const b = P.bin(); b.position.set(bx - HALF + 0.9, 0.12, bz - 12); zn.group.add(b); zn.box(bx - HALF + 0.6, bz - 12.3, bx - HALF + 1.2, bz - 11.7, 0.95); }
  }

  function build() {
    zn = W.zone('city', { name: 'Mog City', indoor: false, music: null, spawn: { x: -80, z: 60, ry: Math.PI } });
    GR.City.tlights = []; GR.City.busStops = [];
    // asphalt everywhere + outer grass
    const asp = T.ENV.asphalt([60, 60]);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(256, 256), new THREE.MeshStandardMaterial({ color: 0xffffff, map: asp.map, normalMap: asp.normalMap, roughness: 0.92 })); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; zn.group.add(road); GR.City.roadMat = road.material;
    const gr = T.ENV.grass([120, 120]);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, roughness: 1 })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true; zn.group.add(outer);
    // outer berm ring (walkable grass beyond the ring road), boundary at ±150
    const gm = new THREE.MeshStandardMaterial({ map: T.ENV.grass([40, 4]).map, roughness: 1 });
    [[0, -138, 300, 24], [0, 138, 300, 24], [-138, 0, 24, 300], [138, 0, 24, 300]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), gm); m.position.set(x, 0.06, z); m.receiveShadow = true; zn.group.add(m); zn.boxC(x, z, w, d, 0.12); });
    zn.bounds = { x1: -148, z1: -148, x2: 148, z2: 148 };
    // sidewalk slabs per block
    const sw = T.ENV.sidewalk([18, 18]);
    const swm = new THREE.MeshStandardMaterial({ map: sw.map, normalMap: sw.normalMap, roughness: 0.9 });
    for (const bx of BLOCKS) for (const bz of BLOCKS) { const m = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.12, HALF * 2), swm); m.position.set(bx, 0.06, bz); m.receiveShadow = true; zn.group.add(m); zn.boxC(bx, bz, HALF * 2, HALF * 2, 0.12); const curb = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 0.3, 0.14, HALF * 2 + 0.3), P.std('#8d8a84', 0.8)); curb.position.set(bx, 0.05, bz); zn.group.add(curb); }
    // distant skyline
    const r = U.rng(42);
    for (let i = 0; i < 60; i++) { const a = i / 60 * U.TAU, dist = 190 + r() * 60, h = 20 + r() * 60, w = 14 + r() * 18; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), windowsMat(i, 5, 10, ['#2b2f36', '#3b3f46', '#4a4e57'][i % 3])); m.position.set(Math.cos(a) * dist, h / 2, Math.sin(a) * dist); m.material.map.repeat.set(1, 1); zn.group.add(m); }
    for (let i = 0; i < 30; i++) { const a = r() * U.TAU, d = 160 + r() * 20; const t = P.tree(i * 31, 1.3 + r() * 0.5); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); zn.group.add(t); }

    shopping(); gym(); arena(); plaza(); commercial(); residential(); park(); offices(); maple();
    streetDecor();
    return zn;
  }
  const foliage = (x, z, r = 1.5) => zn.box(x - r, z - r, x + r, z + r, 5.5, 2.1);
  const groundPatch = (x, z, w, d, tex, y = 0.125) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; zn.group.add(m); return m; };
  const place = (obj, x, z, ry = 0, y = 0.12) => { obj.position.set(x, y, z); obj.rotation.y = ry; zn.group.add(obj); return obj; };

  /* ---------- SHOPPING DISTRICT: Drip Street (-80, 0) ---------- */
  function shopping() {
    const cx = -80;
    groundPatch(cx, 0, 18, 70, T.ENV.tile([9, 35], '#d9d2c3', '#b0a690'));
    const L = [
      { z: -21, name: 'THREADLORD', target: 'threadlord', bg: '#7c4a2d', fg: '#f5f0e6', sub: 'CLOTHING • CHANGING ROOMS', kind: 'brick', col: '#9c4a35', h: 12, display: 'clothes', inside: '#f4efe6' },
      { z: 0, name: 'DRIP DEPOT', target: 'dripdepot', bg: ['#111', '#7b2cbf'], fg: '#f2c94c', sub: 'STREETWEAR • HYPE DROPS', kind: 'concrete', col: '#4a4e57', h: 14, display: 'clothes', inside: '#2a1d3b' },
      { z: 21, name: 'SOLE SURVIVOR', target: 'solesurvivor', bg: '#1b4dff', fg: '#fff', sub: 'SNEAKERS • ACCESSORIES', kind: 'plaster', col: '#e0d6c8', h: 10, display: 'shoes', inside: '#f4f1ea' }
    ];
    const R = [
      { z: -21, name: 'FADE FACTORY', target: 'barber', bg: '#111', fg: '#ef4444', sub: 'BARBERS • EST. 2011', kind: 'brick', col: '#5b3a2e', h: 9, display: 'barber', inside: '#e9e4da' },
      { z: 0, name: 'GLOW LAB', target: 'glowlab', bg: ['#ffd6e7', '#d8c3ff'], fg: '#5b2a6e', sub: 'SKINCARE • COSMETICS', kind: 'plaster', col: '#f3e3ea', h: 11, display: 'bottles', inside: '#fff5fa' },
      { z: 21, name: 'NEST & CO', target: 'nest', bg: '#3f4a2c', fg: '#f5f0e6', sub: 'FURNITURE • DECOR', kind: 'siding', col: '#c2b280', h: 10, display: 'furniture', inside: '#efe8db' }
    ];
    L.forEach(s => building({ x: cx - 21, z: s.z, w: 24, d: 20, h: s.h, kind: s.kind, col: s.col, store: { face: 'e', name: s.name, bg: s.bg, fg: s.fg, sub: s.sub, display: s.display, inside: s.inside, awning: Array.isArray(s.bg) ? s.bg[0] : s.bg }, door: { face: 'e', off: 0, target: s.target } }));
    R.forEach(s => building({ x: cx + 21, z: s.z, w: 24, d: 20, h: s.h, kind: s.kind, col: s.col, store: { face: 'w', name: s.name, bg: s.bg, fg: s.fg, sub: s.sub, display: s.display, inside: s.inside, awning: Array.isArray(s.bg) ? s.bg[0] : s.bg }, door: { face: 'w', off: 0, target: s.target } }));
    // promenade: planters, benches, banners, kiosk, vending
    for (let z = -26; z <= 26; z += 13) { const pl = P.planter(z * 3, 2.2); place(pl, cx, z); zn.boxC(cx, z, 2.2, 0.8, 0.5); const b1 = P.parkBench(); place(b1, cx - 3.2, z + 3, Math.PI / 2); zn.boxC(cx - 3.2, z + 3, 0.6, 1.8, 0.45); zn.seats.push({ x: cx - 3.2, z: z + 3, ry: Math.PI / 2, h: 0.57 }); const b2 = P.parkBench(); place(b2, cx + 3.2, z - 3, -Math.PI / 2); zn.boxC(cx + 3.2, z - 3, 0.6, 1.8, 0.45); zn.seats.push({ x: cx + 3.2, z: z - 3, ry: -Math.PI / 2, h: 0.57 }); }
    for (let z = -30; z <= 30; z += 10) { const pole = P.cyl(0.05, 0.05, 6, P.std('#222', 0.4, 0.7), cx - 8.8, 3.12, z); zn.group.add(pole); const ban = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), new THREE.MeshStandardMaterial({ map: T.poster(z % 20 ? 'DRIP ST' : 'NEW SZN', z % 20 ? '#7b2cbf' : '#ef4444', '#111', 'MOG CITY'), side: THREE.DoubleSide })); ban.position.set(cx - 8.3, 4.5, z); ban.rotation.y = Math.PI / 2; zn.group.add(ban); }
    vend('accessory', cx + 7.5, -33.5, Math.PI); vend('snack', cx - 7.5, 33.5, 0);
    W.marker('shopping', 'Drip Street', cx, 0, '🛍️');
    ['threadlord', 'dripdepot', 'solesurvivor'].forEach((t, i) => W.marker(t, GR.Data.LOCATIONS[t].n, cx - 9, L[i].z, GR.Data.LOCATIONS[t].icon));
    ['barber', 'glowlab', 'nest'].forEach((t, i) => W.marker(t, GR.Data.LOCATIONS[t].n, cx + 9, R[i].z, GR.Data.LOCATIONS[t].icon));
    // barber pole
    const pole = new THREE.Group(); P.cyl(0.12, 0.12, 1.2, new THREE.MeshStandardMaterial({ map: T.memo('pole', () => { const c = T.canvas(64, 128), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 128); for (let i = -4; i < 12; i++) { x.fillStyle = i % 2 ? '#d7261e' : '#1b4dff'; x.beginPath(); x.moveTo(0, i * 16); x.lineTo(64, i * 16 + 32); x.lineTo(64, i * 16 + 40); x.lineTo(0, i * 16 + 8); x.fill(); } return T.toTex(c); }), emissive: new THREE.Color('#333') }), 0, 0, 0, pole); pole.position.set(cx + 8.85, 2.4, -26); zn.group.add(pole); pole.userData.dyn = true; GR.City.barberPole = pole;
  }
  function vend(type, x, z, ry) {
    const v = P.vending(type); place(v, x, z, ry); zn.boxR(x, z, 1.0, 0.8, ry, 2.0);
    const fx = x + Math.sin(ry) * 1.2, fz = z + Math.cos(ry) * 1.2;
    zn.interact({ id: 'vend_' + type + '_' + Math.round(x) + '_' + Math.round(z), pos: new THREE.Vector3(fx, 0, fz), r: 1.4, prompt: 'Use ' + GR.Data.VENDING[type].n + ' machine', action: () => GR.Shops.vending(type, v), kind: 'vend' });
    return v;
  }
  GR.City_vend = (...a) => vend(...a);

  /* ---------- GYM DISTRICT (80, 0) ---------- */
  function gym() {
    const cx = 80;
    building({ x: cx, z: -18, w: 56, d: 26, h: 11, kind: 'concrete', col: '#3b3f46', store: { face: 's', name: 'IRON TEMPLE', bg: ['#d7261e', '#7f1d1d'], fg: '#fff', sub: 'GYM • 24/7 • NO EXCUSES', display: 'clothes', inside: '#3a3d44', awning: '#111' }, door: { face: 's', off: -8, target: 'gym' }, frame: '#111' });
    W.marker('gym', 'Iron Temple Gym', cx - 8, -4, '🏋️');
    // Cali Yard outdoor gym
    groundPatch(cx + 4, 16, 46, 26, T.ENV.rubber([12, 6], '#2c3e50'));
    const fence = P.std('#2b2f36', 0.5, 0.6);
    for (let x = cx - 19; x <= cx + 27; x += 2.3) { P.cyl(0.04, 0.04, 2, fence, x, 1.12, 29.2, zn.group); }
    P.box(46, 0.05, 0.05, fence, cx + 4, 2.1, 29.2, zn.group); zn.box(cx - 19, 29, cx + 27, 29.4, 2);
    const st = [['pullup', cx - 10, 10, 0], ['pullup', cx - 4, 10, 0], ['dips', cx + 3, 10, 0], ['pushup', cx + 10, 12, 0], ['pushup', cx + 15, 12, 0], ['dips', cx + 21, 10, 0]];
    st.forEach(([type, x, z, ry], i) => stationOut(type, x, z, ry, 'outdoorgym', i));
    const sign = W.panel(zn, T.sign('CALI YARD', { bg: '#111', fg: '#84cc16', w: 512, h: 128, sub: 'OUTDOOR CALISTHENICS' }), 6, 1.5, cx + 4, 3.0, 29.0, Math.PI);
    vend('drink', cx - 17, 22, Math.PI / 2);
    for (let i = 0; i < 3; i++) { const b = P.parkBench(); place(b, cx + 24 - i * 4, 25.5, Math.PI); zn.boxC(cx + 24 - i * 4, 25.5, 1.8, 0.6, 0.45); zn.seats.push({ x: cx + 24 - i * 4, z: 25.5, ry: Math.PI, h: 0.57 }); }
    W.marker('outdoorgym', 'Cali Yard', cx + 4, 16, '🤸');
    const bb = P.billboard('SWOLEFORCE', '#d7261e', '#111', 'ENGINEERED FOR THE PUMP'); place(bb, cx + 22, -30, 0); zn.boxC(cx + 22, -30, 6, 0.5, 2);
  }
  function stationOut(type, x, z, ry, zoneTag, i) {
    const m = P.machine(type); place(m.g, x, z, ry); zn.boxC(x, z, type === 'pushup' ? 0.1 : 1.4, type === 'pushup' ? 0.1 : 0.4, type === 'pushup' ? 0.02 : 2.3);
    if (type !== 'pushup') { zn.removeBox(zn.boxes[zn.boxes.length - 1]); for (const s of [-1, 1]) zn.boxC(x + s * (type === 'dips' ? 0.3 : 0.7), z, 0.2, type === 'dips' ? 1 : 0.4, 2.3); }
    zn.interact({ id: 'st_' + zoneTag + '_' + i, pos: new THREE.Vector3(x, 0, z + 1.0), r: 1.6, prompt: 'Train: ' + GR.Data.MACHINES[type].n, action: () => GR.Mini.startWorkout(type, m), kind: 'machine', machine: m });
    m.world = { zone: 'city', x, z, ry, y: 0.12 };
  }

  /* ---------- ENTERTAINMENT: Aura Arena (0,-80) ---------- */
  function arena() {
    const cz = -80;
    building({ x: 0, z: cz - 12, w: 60, d: 30, h: 16, kind: 'concrete', col: '#2b1d3b', store: { face: 's', name: 'AURA ARENA', bg: ['#7b61ff', '#ff4fa3'], fg: '#fff', sub: 'HOME OF THE MOG-OFF', display: 'clothes', inside: '#1a1028', awning: '#111' }, door: { face: 's', off: 0, target: 'arena' }, frame: '#111' });
    W.marker('arena', 'Aura Arena', 0, cz + 3, '🎤');
    groundPatch(0, cz + 20, 60, 22, T.ENV.tile([15, 6], '#3b3f46', '#2b2f36'));
    // LED screen above entrance
    const scr = T.screen(['MOG-OFF TONIGHT', 'ROOKIE NIGHT • CITY CIRCUIT', 'ENTER INSIDE →'], '#120a22', '#ffd23f');
    const sm = W.panel(zn, scr.tex, 14, 5, 0, 10.5, cz + 3.3, 0, 1.0); GR.City.arenaScreen = scr;
    for (const x of [-22, 22]) { const sp = P.speaker(2.4); place(sp, x, cz + 6, 0); zn.boxC(x, cz + 6, 0.6, 0.5, 2.4); }
    for (const x of [-12, 12]) { const lamp = P.streetLight(); place(lamp, x, cz + 12, Math.PI); lamps.push(lamp); }
    // food truck
    const truck = P.car(99); truck.scale.set(1.4, 1.6, 1.3); place(truck, 22, cz + 22, Math.PI / 2); zn.boxC(22, cz + 22, 7, 2.6, 2.5);
    W.panel(zn, T.sign('TACO TUESDAY (EVERY DAY)', { bg: '#f97316', fg: '#fff', w: 512, h: 96 }), 4, 0.8, 22, 3.4, cz + 20.7, Math.PI);
    for (let i = 0; i < 3; i++) { const t = P.tableSet('#f4f1de', 2, true); place(t, -16 + i * 7, cz + 24); zn.boxC(-16 + i * 7, cz + 24, 0.9, 0.9, 0.78); t.userData.seats.forEach(s => zn.seats.push({ x: -16 + i * 7 + s.x, z: cz + 24 + s.z, ry: s.ry, h: 0.58 })); }
    zn.npcSpots.push({ x: 0, z: cz + 18, kind: 'social' });
  }
  /* ---------- THE PLAZA (0,0) ---------- */
  function plaza() {
    groundPatch(0, 0, 66, 66, T.ENV.tile([20, 20], '#cfc7b6', '#a9a08c'));
    const f = P.fountain(); place(f, 0, 6); zn.boxC(0, 6, 8.2, 8.2, 0.62, 0, 'nocam'); GR.City.fountain = f;
    zn.interact({ id: 'fountain', pos: new THREE.Vector3(0, 0, 11.5), r: 2.5, prompt: 'Toss a coin ($1) for luck', action: () => GR.Game.fountainWish(), kind: 'misc' });
    // stage
    const stg = new THREE.Group(); place(stg, 0, -22);
    P.box(16, 1.0, 7, P.std('#1b1b1d', 0.6), 0, 0.5, 0, stg); P.box(16.2, 0.06, 7.2, P.std('#7b61ff', 0.4, 0, { emissive: new THREE.Color('#7b61ff'), emissiveIntensity: 0.6 }), 0, 1.02, 0, stg);
    for (const x of [-7.5, 7.5]) P.cyl(0.12, 0.12, 6, P.std('#333', 0.4, 0.8), x, 3.5, -3, stg); P.box(15.4, 0.3, 0.3, P.std('#333', 0.4, 0.8), 0, 6.4, -3, stg);
    for (let i = 0; i < 5; i++) { const spot = P.cyl(0.15, 0.25, 0.4, P.std('#222', 0.4, 0.8), -6 + i * 3, 6.1, -2.8, stg); spot.rotation.x = 0.7; P.mesh(new THREE.CircleGeometry(0.22, 12), P.emissive(['#ff4fa3', '#28e0ff', '#ffd23f', '#a3e635', '#7b61ff'][i], 2), -6 + i * 3, 5.85, -2.55, -0.9 + Math.PI, 0, 0, stg); }
    for (const x of [-9.5, 9.5]) { const sp = P.speaker(2); sp.position.set(x, 0, 1.5); stg.add(sp); }
    W.panel(zn, T.sign('THE PLAZA', { bg: ['#ff4fa3', '#7b61ff'], fg: '#fff', w: 1024, h: 200, sub: 'LIVE • DANCE • VIBES' }), 10, 2, 0, 5.3, -25.2, 0, 0.8);
    zn.boxC(0, -22, 16, 7, 1.12, 0, 'nocam');
    // steps up to stage
    P.box(4, 0.5, 1, P.std('#2b2b2b', 0.6), 0, 0.37, -17.9, zn.group); zn.boxC(0, -17.9, 4, 1, 0.62);
    zn.interact({ id: 'stage', pos: new THREE.Vector3(0, 1.12, -21), r: 3, prompt: 'Perform on stage (open emotes, crowd bonus)', action: () => GR.Game.stagePerform(), kind: 'misc', y: 1.12 });
    // seating rings + trees
    for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU + 0.2, x = Math.cos(a) * 20, z = Math.sin(a) * 20 + 4; if (z < -12) continue; const b = P.parkBench(); place(b, x, z, Math.atan2(-x, -(z - 4))); zn.boxC(x, z, 1.4, 1.4, 0.45); zn.seats.push({ x, z, ry: Math.atan2(-x, -(z - 4)), h: 0.57 }); const t = P.tree(i * 9, 0.9); place(t, Math.cos(a) * 26, Math.sin(a) * 26 + 4); zn.box(Math.cos(a) * 26 - 0.2, Math.sin(a) * 26 + 3.8, Math.cos(a) * 26 + 0.2, Math.sin(a) * 26 + 4.2, 3); foliage(Math.cos(a) * 26, Math.sin(a) * 26 + 4, 1.4); }
    vend('mystery', 28, 28, -Math.PI * 0.75);
    vend('collectible', -28, 28, Math.PI * 0.75);
    const bb = P.billboard('DRIPLORD', '#111', '#f2c94c', 'DRIP OR DROWN'); place(bb, -26, -30, Math.PI * 0.15); zn.boxC(-26, -30, 6, 1, 2);
    W.marker('plaza', 'The Plaza', 0, 0, '⛲');
    zn.npcSpots.push({ x: 0, z: -14, kind: 'party' }, { x: 12, z: 14, kind: 'social' }, { x: -12, z: 14, kind: 'social' });
  }
  /* ---------- COMMERCIAL (0,80): cafe, protein palace, car park ---------- */
  function commercial() {
    const cz = 80;
    building({ x: -18, z: cz - 22, w: 26, d: 18, h: 8, kind: 'brick', col: '#7a3e2b', store: { face: 'n', name: 'BEAN THERE', bg: '#3b2416', fg: '#f4d9b0', sub: 'COFFEE • BRUNCH • VIBES', display: 'food', inside: '#f4e7d3', awning: '#1e3a2f' }, door: { face: 'n', off: 4, target: 'cafe' } });
    building({ x: 18, z: cz - 22, w: 26, d: 18, h: 8, kind: 'plaster', col: '#f2c94c', store: { face: 'n', name: 'PROTEIN PALACE', bg: ['#ef4444', '#f97316'], fg: '#fff', sub: 'SHAKES • BOWLS • THE MOG BURGER', display: 'food', inside: '#fff3e0', awning: '#ef4444' }, door: { face: 'n', off: -4, target: 'protein' } });
    W.marker('cafe', 'Bean There Cafe', -14, cz - 32, '☕'); W.marker('protein', 'Protein Palace', 14, cz - 32, '🍔');
    for (let i = 0; i < 3; i++) { const t = P.tableSet('#f4f1de', 2, true); place(t, -26 + i * 5, cz - 34); zn.boxC(-26 + i * 5, cz - 34, 0.9, 0.9, 0.78); t.userData.seats.forEach(s => zn.seats.push({ x: -26 + i * 5 + s.x, z: cz - 34 + s.z, ry: s.ry, h: 0.58 })); }
    // car park
    groundPatch(0, cz + 14, 62, 34, T.ENV.asphalt([12, 7]), 0.125);
    const lineM = P.std('#f4f1e1', 0.6);
    for (let i = 0; i < 12; i++) for (const row of [0, 1]) { const x = -27 + i * 5, z = cz + 4 + row * 20; P.box(0.15, 0.02, 5, lineM, x - 2.5, 0.135, z, zn.group); if (Math.random() < 0.65 || i % 3 === 0) { const c = P.car(i * 7 + row * 31); place(c, x, z, row ? Math.PI : 0, 0.12); zn.boxC(x, z, 2.0, c.userData.len, 1.6); } }
    for (const x of [-20, 0, 20]) { const l = P.streetLight(); place(l, x, cz + 14, 0); lamps.push(l); zn.boxC(x, cz + 14, 0.25, 0.25, 5); }
    const pay = P.box(0.6, 1.6, 0.5, P.std('#1b4dff', 0.4, 0.4), 28, 0.92, cz + 14, zn.group); zn.boxC(28, cz + 14, 0.6, 0.5, 1.6);
    W.panel(zn, T.sign('MOG CITY CAR PARK', { bg: '#1b4dff', fg: '#fff', w: 512, h: 128, sub: 'P • FIRST 2 HRS FREE' }), 5, 1.25, 0, 3.0, cz + 31.5, Math.PI);
    W.marker('carpark', 'Car Park', 0, cz + 14, '🚗');
    vend('drink', 30, cz - 10, -Math.PI / 2);
  }
  /* ---------- RESIDENTIAL (-80,80): Mog Towers + houses ---------- */
  function residential() {
    const cx = -80, cz = 80;
    building({ x: cx - 12, z: cz - 14, w: 26, d: 24, h: 34, kind: 'brick', col: '#b5654a', store: { face: 'e', name: 'MOG TOWERS', bg: '#1e3a5f', fg: '#fff', sub: 'RESIDENCES • LOBBY', display: 'furniture', inside: '#e9e4da', awning: '#1e3a5f' }, door: { face: 'e', off: 0, target: 'apartment' } });
    W.marker('apartment', 'Mog Towers (Home)', cx + 2, cz - 14, '🏠');
    const cols = ['#cfd8dc', '#f4e1c1', '#d4e6d0', '#e8d0d8', '#d0dcef', '#f2f0e6'];
    [[-104, 102, 0], [-88, 102, 0], [-72, 102, 0], [-56, 102, 0], [-58, 62, -Math.PI / 2]].forEach(([x, z, ry], i) => house(x, z, ry, cols[i], 100 + i));
    for (let i = 0; i < 5; i++) { const t = P.tree(500 + i, 1.0); place(t, -108 + i * 16, 90); zn.box(-108 + i * 16 - 0.2, 89.8, -108 + i * 16 + 0.2, 90.2, 3); foliage(-108 + i * 16, 90, 1.5); }
    groundPatch(cx + 10, cz - 6, 20, 30, T.ENV.grass([6, 8]));
    for (let i = 0; i < 2; i++) { const b = P.parkBench(); place(b, cx + 6 + i * 8, cz - 18, 0); zn.boxC(cx + 6 + i * 8, cz - 18, 1.8, 0.6, 0.45); zn.seats.push({ x: cx + 6 + i * 8, z: cz - 18, ry: 0, h: 0.57 }); }
    W.marker('residential', 'Maple Rise', cx, cz + 22, '🏘️');
  }
  /* ---------- SUBURBAN (80,80): Sigma Park + Blacktop ---------- */
  function park() {
    const cx = 80, cz = 80;
    groundPatch(cx, cz, 66, 66, T.ENV.grass([20, 20]));
    // pond
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshStandardMaterial({ color: 0x5aa6c8, roughness: 0.08, metalness: 0.3, map: T.ENV.water([4, 4]).map })); pond.rotation.x = -Math.PI / 2; pond.position.set(cx - 14, 0.14, cz + 14); zn.group.add(pond); GR.City.pond = pond;
    zn.boxC(cx - 14, cz + 14, 15, 15, 0.9, 0, 'nocam');
    for (let i = 0; i < 18; i++) { const a = i / 18 * U.TAU; const rk = P.mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.4), P.std('#8d8a84', 0.9), cx - 14 + Math.cos(a) * 9.2, 0.2, cz + 14 + Math.sin(a) * 9.2, Math.random(), Math.random(), 0, zn.group); rk.scale.y = 0.5; }
    // paths (dirt)
    const dm = T.ENV.dirt([2, 20]);
    [[cx - 14, cz - 12, 3, 40, 0.3], [cx, cz + 28, 60, 3, 0], [cx + 2, cz - 2, 3, 40, -0.5]].forEach(([x, z, w, d, ry]) => { const m = groundPatch(x, z, w, d, dm, 0.128); m.rotation.z = ry; });
    for (let i = 0; i < 14; i++) { const r = U.rng(i * 77); const x = cx - 30 + r() * 30, z = cz - 30 + r() * 60; if (Math.hypot(x - (cx - 14), z - (cz + 14)) < 12) continue; const t = P.tree(i * 13 + 7, 1.0 + r() * 0.4); place(t, x, z); zn.box(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 3); foliage(x, z, 1.6); }
    for (let i = 0; i < 4; i++) { const x = cx - 26 + i * 6, z = cz - 6; const b = P.parkBench(); place(b, x, z, Math.PI); zn.boxC(x, z, 1.8, 0.6, 0.45); zn.seats.push({ x, z, ry: Math.PI, h: 0.57 }); }
    for (let i = 0; i < 2; i++) { const t = P.tableSet('#9a6a3a', 4, false); place(t, cx - 2 + i * 6, cz + 22); zn.boxC(cx - 2 + i * 6, cz + 22, 0.9, 0.9, 0.78); t.userData.seats.forEach(s => zn.seats.push({ x: cx - 2 + i * 6 + s.x, z: cz + 22 + s.z, ry: s.ry, h: 0.58 })); }
    vend('collectible', cx - 32, cz - 32, Math.PI * 0.25);
    W.marker('park', 'Sigma Park', cx - 14, cz, '🌳');
    zn.npcSpots.push({ x: cx - 20, z: cz - 2, kind: 'social' }, { x: cx - 4, z: cz + 6, kind: 'chill' });
    // The Blacktop
    const bx = cx + 18, bz = cz - 2;
    const court = new THREE.Mesh(new THREE.PlaneGeometry(15, 28), new THREE.MeshStandardMaterial({ map: T.memo('courtlines', () => { const c = T.canvas(256, 512), x = c.getContext('2d'); x.fillStyle = '#2f6f8f'; x.fillRect(0, 0, 256, 512); x.fillStyle = '#c0573b'; x.fillRect(78, 0, 100, 110); x.fillRect(78, 402, 100, 110); x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(8, 8, 240, 496); x.beginPath(); x.moveTo(8, 256); x.lineTo(248, 256); x.stroke(); x.beginPath(); x.arc(128, 256, 36, 0, 7); x.stroke(); x.beginPath(); x.arc(128, 30, 110, 0, Math.PI); x.stroke(); x.beginPath(); x.arc(128, 482, 110, Math.PI, 0); x.stroke(); x.strokeRect(78, 0, 100, 110); x.strokeRect(78, 402, 100, 110); x.font = 'bold 36px Impact'; x.fillStyle = 'rgba(255,255,255,0.5)'; x.save(); x.translate(128, 256); x.rotate(Math.PI / 2); x.textAlign = 'center'; x.fillText('THE BLACKTOP', 0, 12); x.restore(); return T.toTex(c); }), roughness: 0.75 }));
    court.rotation.x = -Math.PI / 2; court.position.set(bx, 0.13, bz); court.receiveShadow = true; zn.group.add(court);
    const hoops = [];
    for (const s of [-1, 1]) { const h = P.hoop(); place(h, bx, bz + s * 13.2, s > 0 ? Math.PI : 0); hoops.push(h); zn.boxC(bx, bz + s * 14.1, 0.4, 0.4, 3.2); }
    GR.City.hoops = hoops;
    for (let x = bx - 8; x <= bx + 8; x += 2) { P.cyl(0.04, 0.04, 3, P.std('#555', 0.5, 0.7), x, 1.62, bz - 15, zn.group); P.cyl(0.04, 0.04, 3, P.std('#555', 0.5, 0.7), x, 1.62, bz + 15, zn.group); }
    zn.box(bx - 8, bz - 15.2, bx + 8, bz - 14.8, 3); zn.box(bx - 8, bz + 14.8, bx + 8, bz + 15.2, 3);
    // bleachers
    for (let r2 = 0; r2 < 3; r2++) { P.box(1, 0.4 + r2 * 0.4, 12, P.std('#9aa0a6', 0.5, 0.6), bx - 9 - r2, 0.32 + r2 * 0.2, bz, zn.group); zn.boxC(bx - 9 - r2, bz, 1, 12, 0.52 + r2 * 0.4); zn.seats.push({ x: bx - 9 - r2, z: bz - 3 + r2 * 2, ry: Math.PI / 2, h: 0.52 + r2 * 0.4 + 0.12 }); }
    hoops.forEach((h, i) => zn.interact({ id: 'hoop' + i, pos: new THREE.Vector3(bx, 0, bz + (i ? 1 : -1) * 8.5), r: 3.5, prompt: 'Shoot hoops (Basketball challenge)', action: () => GR.Mini.basketball(h, i), kind: 'misc' }));
    W.marker('court', 'The Blacktop', bx, bz, '🏀');
    zn.npcSpots.push({ x: bx, z: bz + 6, kind: 'hoop' });
  }
  /* ---------- OFFICES (80,-80) + MAPLE (-80,-80) ---------- */
  function offices() {
    building({ x: 70, z: -92, w: 24, d: 22, h: 44, kind: 'concrete', col: '#7f8c8d', frame: '#1b2a3a' });
    building({ x: 98, z: -70, w: 18, d: 24, h: 28, kind: 'concrete', col: '#95a5a6', frame: '#1b2a3a' });
    building({ x: 96, z: -104, w: 16, d: 14, h: 18, kind: 'brick', col: '#8e5b4a' });
    groundPatch(70, -62, 24, 14, T.ENV.grass([6, 4]));
    for (let i = 0; i < 3; i++) { const t = P.tree(900 + i); place(t, 62 + i * 8, -62); zn.box(62 + i * 8 - 0.2, -62.2, 62 + i * 8 + 0.2, -61.8, 3); }
    W.panel(zn, T.sign('MOG CITY BUSINESS PARK', { bg: '#1b2a3a', fg: '#e5e7eb', w: 512, h: 96 }), 7, 1.3, 70, 2.2, -80.8, 0, 0.3);
    const bb = P.billboard('VELOCITEE', '#1b4dff', '#111827', 'FASTER THAN YOUR EXCUSES'); place(bb, 60, -110, 0.2);
  }
  function maple() {
    const cols = ['#cfd8dc', '#f4e1c1', '#d4e6d0', '#e8d0d8'];
    [[-104, -100, 0], [-88, -100, 0], [-72, -100, 0], [-56, -100, 0], [-104, -64, Math.PI], [-88, -64, Math.PI]].forEach(([x, z, ry], i) => house(x, z, ry, cols[i % 4], 200 + i));
    building({ x: -66, z: -66, w: 16, d: 18, h: 16, kind: 'siding', col: '#d0dcef' });
    // playground-ish
    groundPatch(-80, -82, 30, 10, T.ENV.dirt([6, 2]));
    for (let i = 0; i < 2; i++) { const b = P.parkBench(); place(b, -88 + i * 10, -86, 0); zn.boxC(-88 + i * 10, -86, 1.8, 0.6, 0.45); zn.seats.push({ x: -88 + i * 10, z: -86, ry: 0, h: 0.57 }); }
    const sw = new THREE.Group(); P.bar(3, 0.05, P.std('#ef4444', 0.4, 0.6), 0, 2.4, 0, 'x', sw); for (const s of [-1, 1]) { const l = P.cyl(0.05, 0.05, 2.6, P.std('#ef4444', 0.4, 0.6), s * 1.5, 1.2, 0, sw); } for (const s of [-0.6, 0.6]) { P.box(0.5, 0.05, 0.25, P.std('#111'), s, 0.6, 0, sw); } place(sw, -78, -80); zn.boxC(-78, -80, 3.2, 0.4, 2.5);
  }

  /** day/night: windows & signs glow, lamps switch */
  function setNight(n, rain) {
    windowMats.forEach(m => { m.emissiveIntensity = m.userData.store ? 0.25 + n * 0.6 : n * 0.95; });
    signs.forEach(m => { m.emissiveIntensity = 0.4 + n * 1.0; });
    lamps.forEach(l => { l.userData.lamp.material.emissiveIntensity = n > 0.3 ? 2.5 : 0; });
    if (GR.City.roadMat) GR.City.roadMat.roughness = rain ? 0.35 : 0.92;
  }
  return { build, setNight, lamps, doors, ROADS, BLOCKS, HALF, tlights: [], busStops: [], building, vend };
})();
