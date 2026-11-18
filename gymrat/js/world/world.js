/* World framework: zones (city + interiors), colliders with step heights, interactables, doors, map markers, lighting rigs. */
'use strict';
GR.World = (() => {
  const U = GR.U;
  const zones = {};
  let current = 'city';
  const markers = []; // for map: {id, name, x, z, icon, zone:'city'}

  class Zone {
    constructor(id, opts = {}) {
      this.id = id; this.name = opts.name || id; this.indoor = !!opts.indoor; this.music = opts.music || null;
      this.group = new THREE.Group(); this.group.name = 'zone_' + id; this.group.visible = false;
      this.boxes = []; this.inter = []; this.lights = []; this.mirrors = []; this.updaters = []; this.npcSpots = []; this.seats = [];
      this.spawn = opts.spawn || { x: 0, z: 0, ry: 0 }; this.bounds = opts.bounds || null; this.ceiling = opts.ceiling || 0;
      this.origin = opts.origin || new THREE.Vector3(); this.grid = new Map(); this.cell = 8;
      this.ambient = opts.ambient || { sky: '#ffffff', ground: '#8a7f73', intensity: 0.65, key: 0.6, keyDir: [3, 8, 4] };
    }
    // axis-aligned collider (world coords). top = height; objects with top < 0.45 are steppable/standable.
    box(x1, z1, x2, z2, top = 3, bottom = 0, tag = null) {
      const b = { x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2), top, bottom, tag };
      this.boxes.push(b);
      const c = this.cell; for (let gx = Math.floor(b.x1 / c); gx <= Math.floor(b.x2 / c); gx++) for (let gz = Math.floor(b.z1 / c); gz <= Math.floor(b.z2 / c); gz++) { const k = gx + ',' + gz; if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(b); }
      return b;
    }
    boxC(cx, cz, w, d, top = 3, bottom = 0, tag) { return this.box(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, top, bottom, tag); }
    // rotated rectangle → approximated by its AABB (fine for 0/90° placements)
    boxR(cx, cz, w, d, ry, top = 3, bottom = 0) { const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); return this.boxC(cx, cz, w * c + d * s, w * s + d * c, top, bottom); }
    near(x, z, r = 1) { const c = this.cell, out = new Set(); for (let gx = Math.floor((x - r) / c); gx <= Math.floor((x + r) / c); gx++) for (let gz = Math.floor((z - r) / c); gz <= Math.floor((z + r) / c); gz++) { const a = this.grid.get(gx + ',' + gz); if (a) a.forEach(b => out.add(b)); } return out; }
    add(obj, x = 0, y = 0, z = 0, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; this.group.add(obj); return obj; }
    interact(o) { o.zone = this.id; this.inter.push(o); return o; }
    light(x, y, z, color = '#fff2dd', intensity = 1, dist = 14) { this.lights.push({ pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, dist }); }
    removeBox(b) { this.boxes = this.boxes.filter(x => x !== b); this.grid.forEach(a => { const i = a.indexOf(b); if (i >= 0) a.splice(i, 1); }); }
  }
  function zone(id, opts) { const z = new Zone(id, opts); zones[id] = z; return z; }

  /** ground height under a point: highest box top that is ≤ feet + step */
  function groundAt(zn, x, z, feetY, r = 0.3) {
    let g = 0; for (const b of zn.near(x, z, r + 0.1)) { if (x + r * 0.5 > b.x1 && x - r * 0.5 < b.x2 && z + r * 0.5 > b.z1 && z - r * 0.5 < b.z2 && b.top <= feetY + 0.42 && b.top > g && b.bottom <= feetY + 0.42) g = b.top; }
    return g;
  }
  /** push a circle out of boxes it can't step onto */
  function collide(zn, p, r, feetY) {
    for (let it = 0; it < 2; it++) for (const b of zn.near(p.x, p.z, r + 0.2)) {
      if (b.top <= feetY + 0.42 || b.bottom > feetY + 1.7) continue;
      const cx = U.clamp(p.x, b.x1, b.x2), cz = U.clamp(p.z, b.z1, b.z2); let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 < 1e-8) { // inside: push to nearest edge
          const ex = [p.x - b.x1, b.x2 - p.x, p.z - b.z1, b.z2 - p.z], m = Math.min(...ex), i = ex.indexOf(m);
          if (i === 0) p.x = b.x1 - r; else if (i === 1) p.x = b.x2 + r; else if (i === 2) p.z = b.z1 - r; else p.z = b.z2 + r;
        } else { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      }
    }
    if (zn.bounds) { const B = zn.bounds; p.x = U.clamp(p.x, B.x1 + r, B.x2 - r); p.z = U.clamp(p.z, B.z1 + r, B.z2 - r); }
  }
  /** segment (from → to) vs boxes, returns fraction 0..1 of first hit, for camera collision */
  function rayFrac(zn, from, to) {
    let best = 1; const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const minx = Math.min(from.x, to.x), maxx = Math.max(from.x, to.x), minz = Math.min(from.z, to.z), maxz = Math.max(from.z, to.z);
    const seen = new Set();
    const c = zn.cell; for (let gx = Math.floor(minx / c); gx <= Math.floor(maxx / c); gx++) for (let gz = Math.floor(minz / c); gz <= Math.floor(maxz / c); gz++) { const a = zn.grid.get(gx + ',' + gz); if (!a) continue; for (const b of a) { if (seen.has(b) || b.top < 1.2 || b.tag === 'nocam') continue; seen.add(b);
      let t0 = 0, t1 = 1; const ax = [[from.x, dx, b.x1 - 0.15, b.x2 + 0.15], [from.y, dy, b.bottom, b.top + 0.15], [from.z, dz, b.z1 - 0.15, b.z2 + 0.15]]; let ok = true;
      for (const [o, d, lo, hi] of ax) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } } else { let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } } }
      if (ok && t0 < best && t0 > 0.02) best = t0; } }
    if (zn.ceiling) { const top = zn.ceiling - 0.25; if (to.y > top && dy > 0) best = Math.min(best, (top - from.y) / dy); }
    if (zn.bounds) { const B = zn.bounds, m = 0.3; for (const [o, d, lo, hi] of [[from.x, dx, B.x1 + m, B.x2 - m], [from.z, dz, B.z1 + m, B.z2 - m]]) { if (d > 0 && o + d > hi) best = Math.min(best, (hi - o) / d); if (d < 0 && o + d < lo) best = Math.min(best, (lo - o) / d); } }
    return Math.max(0, best);
  }
  function marker(id, name, x, z, icon) { markers.push({ id, name, x, z, icon }); }

  // ---- shared build helpers for interiors ----
  function room(zn, { x1, z1, x2, z2, h = 4, floor, wall, ceil = '#f2f2f0', trim = '#2b2b2b', walls = true, lightsGrid = true, wallMat }) {
    const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, P = GR.Props;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floor); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0, cz); fl.receiveShadow = true; zn.group.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), P.std(ceil, 0.9)); ce.rotation.x = Math.PI / 2; ce.position.set(cx, h, cz); zn.group.add(ce);
    if (walls) {
      const wm = wallMat || new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.85 }, GR.Tex.ENV.plaster([w / 4, h / 4], wall || '#e9e4da')));
      [[cx, z1, w, 0], [cx, z2, w, Math.PI], [x1, cz, d, Math.PI / 2], [x2, cz, d, -Math.PI / 2]].forEach(([x, z, len, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wm); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; zn.group.add(m); const sk = P.box(len, 0.12, 0.03, P.std(trim, 0.5), 0, 0.06, 0); sk.position.set(x, 0.06, z); sk.rotation.y = ry; sk.translateZ(0.015); zn.group.add(sk); });
      zn.bounds = { x1, z1, x2, z2 }; zn.ceiling = h;
    }
    if (lightsGrid) for (let x = x1 + 3; x < x2 - 1; x += 5) for (let z = z1 + 3; z < z2 - 1; z += 5) { const p = P.box(1.2, 0.04, 0.3, P.emissive('#fffbf0', 1.2), x, h - 0.03, z); zn.group.add(p); }
    return { cx, cz, w, d };
  }
  // text panel on a wall (signs/menus)
  function panel(zn, tex, w, h, x, y, z, ry = 0, glow = 0.4) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: glow, roughness: 0.5 })); m.position.set(x, y, z); m.rotation.y = ry; zn.group.add(m); return m; }

  /** static batching: merge non-moving meshes by material within spatial cells to cut draw calls */
  function batch(zn, cell = 64) {
    const root = zn.group; root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), remove = [], p = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || o.isMirror || Array.isArray(o.material) || o.material.isShaderMaterial) return;
      let a = o; while (a && a !== root) { if (a.userData.dyn || a.userData.char || a.userData.mirror) return; a = a.parent; }
      const g = o.geometry; if (!g.attributes.uv || !g.attributes.normal || !g.attributes.position) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); p.setFromMatrixPosition(o.matrixWorld);
      const key = o.material.uuid + '|' + Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, list: [], cast: o.castShadow, recv: o.receiveShadow, verts: 0 });
      const b = buckets.get(key); b.list.push([g, m]); b.verts += g.attributes.position.count; remove.push(o);
    });
    remove.forEach(o => o.parent && o.parent.remove(o));
    let n = 0; buckets.forEach(b => { const geo = GR.Geo.merge(b.list); const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false; root.add(mesh); n++; });
    return { removed: remove.length, added: n };
  }
  return { zones, Zone, zone, groundAt, batch, collide, rayFrac, markers, marker, room, panel, get current() { return current; }, set current(v) { current = v; }, get Z() { return zones[current]; } };
})();
