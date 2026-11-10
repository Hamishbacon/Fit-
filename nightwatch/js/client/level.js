/* LevelManager — turns a World into a three.js scene and keeps the dynamic
 * parts (doors, lights, throwables, items, notes, traces) in sync with the
 * replicated state.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const U = NW.util;
  const V3 = THREE.Vector3;

  /* ---------- geometry helpers ---------- */
  class GeoBuilder {
    constructor() { this.p = []; this.n = []; this.uv = []; }
    quad(a, b, c, d, n, uvs) { // winding is corrected automatically so the face points along n
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
      if (gx * n[0] + gy * n[1] + gz * n[2] < 0) { [b, d] = [d, b]; uvs = [uvs[0], uvs[3], uvs[2], uvs[1]]; }
      this.p.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < 6; i++) this.n.push(...n);
      const [ua, ub, uc, ud] = uvs;
      this.uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
    }
    addGeometry(g, m) {
      const ng = g.index ? g.toNonIndexed() : g;
      ng.applyMatrix4(m);
      const P = ng.attributes.position.array, N = ng.attributes.normal.array, UV = ng.attributes.uv ? ng.attributes.uv.array : null;
      for (let i = 0; i < P.length; i++) this.p.push(P[i]);
      for (let i = 0; i < N.length; i++) this.n.push(N[i]);
      if (UV) for (let i = 0; i < UV.length; i++) this.uv.push(UV[i]); else for (let i = 0; i < P.length / 3; i++) this.uv.push(0, 0);
    }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.computeBoundingSphere();
      return g;
    }
    get empty() { return this.p.length === 0; }
  }
  const M4 = (x, y, z, ry, sx, sy, sz) => {
    const m = new THREE.Matrix4();
    m.compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry || 0), new V3(sx || 1, sy || 1, sz || 1));
    return m;
  };
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);

  const MAT_CACHE = {};
  function mat(key, opts) {
    if (MAT_CACHE[key]) return MAT_CACHE[key];
    const o = Object.assign({ roughness: 0.9, metalness: 0.05 }, opts || {});
    if (o.tex) { o.map = NW.Tex.get(o.tex); if (o.normal) { o.normalMap = NW.Tex.normal(o.tex); o.normalScale = new THREE.Vector2(0.9, 0.9); } delete o.tex; }
    delete o.normal;
    const m = new THREE.MeshStandardMaterial(o);
    MAT_CACHE[key] = m;
    return m;
  }

  /** Fixed-size pool of point lights shared by every light source in the scene.
   *  Forward rendering pays for every light on every pixel, so the light count
   *  is constant (no shader recompiles) and only the most relevant sources
   *  near the camera get a real light each frame; the rest stay emissive. */
  class LightBudget {
    constructor(parent, n) {
      this.pool = []; this.req = [];
      for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 8, 2); parent.add(l); this.pool.push(l); }
    }
    begin() { this.req.length = 0; }
    /** r: { x, y, z, color, intensity, distance, priority } */
    request(r) { if (r.intensity > 0.01) this.req.push(r); }
    end(cam) {
      const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      for (const r of this.req) r._s = ((r.x - cx) ** 2 + ((r.y - cy) * 2.5) ** 2 + (r.z - cz) ** 2) / ((r.priority || 1) * (r.distance || 8));
      this.req.sort((a, b) => a._s - b._s);
      for (let i = 0; i < this.pool.length; i++) {
        const l = this.pool[i], r = this.req[i];
        if (!r) { l.intensity = 0; continue; }
        l.position.set(r.x, r.y, r.z); l.color.set(r.color); l.intensity = r.intensity; l.distance = r.distance || 8;
      }
    }
  }

  class LevelManager {
    constructor(scene, world, locId, quality) {
      this.scene = scene; this.w = world; this.locId = locId; this.quality = quality;
      this.root = new THREE.Group(); scene.add(this.root);
      this.floorGroups = [];
      for (let f = 0; f < world.nf; f++) { const g = new THREE.Group(); this.root.add(g); this.floorGroups.push(g); }
      this.groundF = world.spawn.f;
      this.builders = {};
      this.interactables = [];
      this.doorMeshes = []; this.fixtures = []; this.switchMeshes = []; this.throwMeshes = {}; this.itemMeshes = {}; this.noteMeshes = {};
      this.traceMeshes = {}; this.deviceMeshes = [];
      this.flicker = {}; // room -> until
      this.budget = new LightBudget(this.root, quality === 'low' ? 4 : quality === 'medium' ? 5 : 6);
      this._buildStatic();
      this._buildDoors();
      this._buildLights();
      this._buildHides();
      this._buildSpecial();
      this._buildDevices();
      this._buildSky();
      if (NW.Decor) NW.Decor.decorate(this);
      for (const key in this.builders) {
        const b = this.builders[key];
        if (b.geo.empty) continue;
        const mesh = new THREE.Mesh(b.geo.build(), b.mat);
        mesh.receiveShadow = true; mesh.castShadow = b.cast !== false && quality === 'high';
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        (b.f != null ? this.floorGroups[b.f] : this.root).add(mesh);
      }
    }

    /** Merged-geometry builder for a material on a floor. */
    B(key, material, cast, f) {
      const k = (f == null ? 'g' : f) + '|' + key;
      if (!this.builders[k]) this.builders[k] = { geo: new GeoBuilder(), mat: material, cast, f };
      return this.builders[k].geo;
    }
    surfMat(roomKind, part) {
      const name = NW.Tex.surfaceFor(this.locId, roomKind, part);
      return { key: part + ':' + name, mat: this.texMat(name) };
    }
    texMat(name) {
      const rough = name === 'metal' || name === 'tile' ? 0.5 : name === 'checker' || name === 'lino' ? 0.65 : name === 'hullPaint' ? 0.6 : 0.9;
      return mat('s:' + name, { tex: name, roughness: rough, metalness: name === 'metal' ? 0.4 : 0.02, normal: this.quality !== 'low' });
    }
    /** Only floors near the camera are drawn (all above-ground floors when outdoors). */
    updateVisibility(camF, outdoors) {
      for (let f = 0; f < this.floorGroups.length; f++) this.floorGroups[f].visible = Math.abs(f - camF) <= 1 || (outdoors && f >= this.groundF);
    }

    /* ---------- static geometry ---------- */
    _solid(f, x, z) { const c = this.w.ch(f, x, z); return c === '#' || c === 'W' || c === ' '; }
    _buildStatic() {
      const w = this.w, FH = w.FH, DIRV = NW.World.DIRV;
      const isOpen = (c) => w._open(c);
      const isDoor = (c) => c === 'D' || c === 'X' || c === 'L';
      const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const extName = NW.Tex.exterior(this.locId);
      for (let f = 0; f < w.nf; f++) {
        const g = w.grid[f], ra = w.roomAt[f];
        const y0 = f * FH;
        for (let z = 0; z < w.H; z++) for (let x = 0; x < w.W; x++) {
          const i = z * w.W + x, c = g[i];
          const rid = ra[i];
          const room = rid >= 0 ? w.rooms[rid] : null;
          const wallTile = c === '#' || c === 'W' || c === ' ';
          // ---- floors (not under shafts or stair runs)
          if (!wallTile && c !== '_' && c !== ':' && !DIRV[c] && room) {
            const kind = room.outdoor ? (room.kind === 'roof' || room.kind === 'deck' ? room.kind : 'outdoor') : room.kind;
            const { key, mat: m } = this.surfMat(kind, 'floor');
            const sc = 0.5;
            this.B(key, m, false, f).quad([x, y0, z + 1], [x + 1, y0, z + 1], [x + 1, y0, z], [x, y0, z], [0, 1, 0], [[x * sc, (z + 1) * sc], [(x + 1) * sc, (z + 1) * sc], [(x + 1) * sc, z * sc], [x * sc, z * sc]]);
          }
          if (c === ':' && room) { // floor under railings
            const { key, mat: m } = this.surfMat(room.outdoor ? 'outdoor' : room.kind, 'floor');
            this.B(key, m, false, f).quad([x, y0, z + 1], [x + 1, y0, z + 1], [x + 1, y0, z], [x, y0, z], [0, 1, 0], [[x * 0.5, (z + 1) * 0.5], [(x + 1) * 0.5, (z + 1) * 0.5], [(x + 1) * 0.5, z * 0.5], [x * 0.5, z * 0.5]]);
          }
          // ---- ceilings (rooms, doors, railings and the top of stair shafts)
          if (room && !room.outdoor && !wallTile && !DIRV[c]) {
            const h = isDoor(c) ? 2.25 : room.h;
            const yc = y0 + h, sc = 0.5;
            const { key, mat: m } = isDoor(c) ? this.surfMat(room.kind, 'wall') : this.surfMat(room.kind, 'ceil');
            this.B(key, m, false, f).quad([x, yc, z], [x + 1, yc, z], [x + 1, yc, z + 1], [x, yc, z + 1], [0, -1, 0], [[x * sc, z * sc], [(x + 1) * sc, z * sc], [(x + 1) * sc, (z + 1) * sc], [x * sc, (z + 1) * sc]]);
          }
          // ---- interior walls: faces from every non-wall tile toward solid neighbours
          if (!wallTile && c !== '_' && room && !room.outdoor) {
            const spans = [];
            if (DIRV[c]) {
              const up = f + 1 < w.nf ? w.roomAt[f + 1][i] : -1;
              spans.push([f, y0, y0 + FH], [f + 1, y0 + FH, y0 + FH + (up >= 0 ? w.rooms[up].h : 2.8)]);
            } else spans.push([f, y0, y0 + (isDoor(c) ? Math.max(2.6, ...w.doorAtFast(f, x, z).rooms.map((r) => w.rooms[r].h || 3)) : room.h)]);
            for (const [dx, dz] of NB) {
              for (const [sf, ya, yb] of spans) {
                if (!this._solid(sf, x + dx, z + dz)) continue;
                const win = w.ch(sf, x + dx, z + dz) === 'W';
                this._face(sf, x, z, dx, dz, ya, yb, this.surfMat(room.kind, 'wall'), win, !isDoor(c) && !DIRV[c] && sf === f);
              }
            }
          }
          // outdoor tiles against props/railings get nothing; against walls the wall's own exterior shell is drawn below
          if (isDoor(c)) this._doorFrame(f, x, z, y0, room);
        }
        // ---- exterior shell, window reveals and wall caps
        for (let z = 0; z < w.H; z++) for (let x = 0; x < w.W; x++) {
          const c = g[z * w.W + x];
          if (c !== '#' && c !== 'W') continue;
          let exterior = false;
          for (const [dx, dz] of NB) {
            const nc = w.ch(f, x + dx, z + dz);
            const nr = w.roomIdAt(f, x + dx + 0.5, z + dz + 0.5);
            const outside = nc === ' ' || (nr >= 0 && w.rooms[nr].outdoor && w._open(nc));
            if (!outside || (nc === ' ' && f < this.groundF)) continue;
            exterior = true;
            this._face(f, x + dx, z + dz, -dx, -dz, y0, y0 + FH, { key: 'ext:' + extName, mat: this.texMat(extName) }, c === 'W', false);
          }
          if (c === 'W') this._windowReveal(f, x, z, y0);
          // cap the top of walls that nothing sits on (roofs, parapets, cliff edges)
          const above = f + 1 < w.nf ? w.grid[f + 1][z * w.W + x] : ' ';
          if (exterior && (above === ' ' || !(above === '#' || above === 'W'))) {
            const roofNext = f + 1 < w.nf && NB.some(([dx, dz]) => { const r = w.roomIdAt(f + 1, x + dx + 0.5, z + dz + 0.5); return r >= 0 && w.rooms[r].outdoor; });
            const top = y0 + FH + (roofNext ? 0.7 : 0.15);
            const em = this.texMat(extName);
            if (top > y0 + FH) for (const [dx, dz] of NB) {
              const nc = f + 1 < w.nf ? w.grid[f + 1][(z + dz) * w.W + x + dx] : ' ';
              if (nc === '#' || nc === 'W') continue;
              this._face(f, x + dx, z + dz, -dx, -dz, y0 + FH, top, { key: 'ext:' + extName, mat: em }, false, false);
            }
            this.B('ext:' + extName, em, true, f).quad([x, top, z + 1], [x + 1, top, z + 1], [x + 1, top, z], [x, top, z], [0, 1, 0], [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
          }
        }
        // props on this floor
        for (const p of w.props) if (p.f === f) this._prop(p);
        // railings
        for (let z = 0; z < w.H; z++) for (let x = 0; x < w.W; x++) {
          const c = g[z * w.W + x];
          if (c === ':') this._railTile(f, x, z);
          const rid = ra[z * w.W + x];
          if (rid >= 0 && w.rooms[rid].outdoor && (w.rooms[rid].kind === 'deck' || w.rooms[rid].kind === 'roof') && isOpen(c)) {
            for (const [dx, dz] of NB) {
              const nc = w._in(x + dx, z + dz) ? g[(z + dz) * w.W + x + dx] : ' ';
              if (nc === ' ') this._edgeRail(f, x, z, dx, dz);
            }
          }
        }
        for (const r of w.stairs) if (r.f === f) this._stairs(r);
        // slab edges around shafts on the upper floor
        for (let z = 0; z < w.H; z++) for (let x = 0; x < w.W; x++) {
          if (g[z * w.W + x] !== '_') continue;
          for (const [dx, dz] of NB) {
            const nc = w._in(x + dx, z + dz) ? g[(z + dz) * w.W + x + dx] : ' ';
            if (nc === '_') continue;
            const b = this.B('slab', mat('slab', { color: 0x4a4844, roughness: 1 }), true, f);
            b.addGeometry(BOX, M4(x + 0.5 + dx * 0.5, y0 - 0.225, z + 0.5 + dz * 0.5, 0, dx ? 0.04 : 1, 0.45, dz ? 0.04 : 1));
          }
        }
      }
      // sea / ground beyond the site
      if (w.loc.sea) {
        const sm = new THREE.MeshStandardMaterial({ color: 0x0c1416, roughness: 0.18, metalness: 0.4, map: NW.Tex.get('water') });
        sm.map = sm.map.clone(); sm.map.needsUpdate = true; sm.map.repeat.set(60, 60);
        const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), sm);
        sea.rotation.x = -Math.PI / 2; sea.position.set(w.W / 2, w.FH - 1.1, w.H / 2);
        this.sea = sea; this.root.add(sea);
      } else {
        const gm = new THREE.MeshStandardMaterial({ color: 0x1d1f1c, roughness: 1, map: NW.Tex.get(this.locId === 'apartments' ? 'asphalt' : 'gravel') });
        gm.map = gm.map.clone(); gm.map.needsUpdate = true; gm.map.repeat.set(80, 80);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gm);
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
        ground.position.set(w.W / 2, this.groundF * w.FH - 0.02, w.H / 2);
        this.root.add(ground);
      }
      // flooded rooms: shallow water surface
      this.waterMat = new THREE.MeshStandardMaterial({ color: 0x1d2e30, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.84, normalMap: this.quality !== 'low' ? NW.Tex.normal('water') : null });
      for (const r of w.rooms) {
        if (!r.flooded) continue;
        const b = this.B('floodwater', this.waterMat, false, r.f);
        for (const i of r.tiles) {
          const x = i % w.W, z = (i / w.W) | 0, y = r.f * FH + 0.35;
          if (!w._open(w.grid[r.f][i]) && w.grid[r.f][i] !== ':') continue;
          b.quad([x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z], [0, 1, 0], [[x * 0.25, (z + 1) * 0.25], [(x + 1) * 0.25, (z + 1) * 0.25], [(x + 1) * 0.25, z * 0.25], [x * 0.25, z * 0.25]]);
        }
      }
    }

    /** A wall face on the boundary of tile (x,z) toward (x+dx,z+dz), facing back into (x,z). */
    _face(f, x, z, dx, dz, ya, yb, sm, isWindow, trim) {
      const b = this.B(sm.key, sm.mat, true, f);
      let a, bb, nrm;
      if (dx === 1) { a = [x + 1, z + 1]; bb = [x + 1, z]; nrm = [-1, 0, 0]; }
      else if (dx === -1) { a = [x, z]; bb = [x, z + 1]; nrm = [1, 0, 0]; }
      else if (dz === 1) { a = [x, z + 1]; bb = [x + 1, z + 1]; nrm = [0, 0, -1]; }
      else { a = [x + 1, z]; bb = [x, z]; nrm = [0, 0, 1]; }
      const base = f * this.w.FH;
      const u0 = (dx ? z : x) * 0.5, u1 = u0 + 0.5, v = (yy) => (yy - base) / 2.4;
      const seg = (p, q) => { if (q - p > 0.001) b.quad([a[0], p, a[1]], [bb[0], p, bb[1]], [bb[0], q, bb[1]], [a[0], q, a[1]], nrm, [[u0, v(p)], [u1, v(p)], [u1, v(q)], [u0, v(q)]]); };
      const w0 = base + 0.9, w1 = base + 2.1;
      if (isWindow && ya <= w0 && yb >= w1) { seg(ya, w0); seg(w1, yb); }
      else seg(ya, yb);
      if (trim) {
        // skirting board and cornice give rooms a finished edge
        const tm = mat('trimWood', { tex: 'trim', roughness: 0.7 });
        const tb = this.B('trimWood', tm, false, f);
        const cx = (a[0] + bb[0]) / 2 + nrm[0] * 0.012, cz = (a[1] + bb[1]) / 2 + nrm[2] * 0.012;
        tb.addGeometry(BOX, M4(cx, ya + 0.06, cz, 0, dx ? 0.025 : 1, 0.12, dz ? 0.025 : 1));
        if (yb - ya > 2.4) tb.addGeometry(BOX, M4(cx, yb - 0.035, cz, 0, dx ? 0.04 : 1, 0.07, dz ? 0.04 : 1));
      }
    }
    /** Glass, sill and the inner faces of a window opening so you can't see into the wall. */
    _windowReveal(f, x, z, y0) {
      const w = this.w;
      const open = (dx, dz) => !this._solid(f, x + dx, z + dz) || w.ch(f, x + dx, z + dz) === ' ';
      const alongX = !(open(1, 0) || open(-1, 0)); // opening passes through in z
      const rm = this.texMat('concrete');
      const b = this.B('reveal', rm, false, f);
      const a0 = y0 + 0.9, a1 = y0 + 2.1;
      b.quad([x, a0, z], [x + 1, a0, z], [x + 1, a0, z + 1], [x, a0, z + 1], [0, 1, 0], [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
      b.quad([x, a1, z], [x + 1, a1, z], [x + 1, a1, z + 1], [x, a1, z + 1], [0, -1, 0], [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
      const sides = alongX ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      for (const [dx, dz] of sides) if (w.ch(f, x + dx, z + dz) !== 'W') this._faceRaw(b, x, z, dx, dz, a0, a1);
      // a single double-sided pane in the middle of the wall
      const gm = mat('glass2', { color: 0x0e1622, emissive: 0x1b2a44, emissiveIntensity: 0.45, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const gb = this.B('glass2', gm, false, f);
      if (alongX) gb.quad([x, a0, z + 0.5], [x + 1, a0, z + 0.5], [x + 1, a1, z + 0.5], [x, a1, z + 0.5], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      else gb.quad([x + 0.5, a0, z], [x + 0.5, a0, z + 1], [x + 0.5, a1, z + 1], [x + 0.5, a1, z], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      const fm = mat('winframe', { color: 0x2c2a26, roughness: 0.7 });
      const fb = this.B('winframe', fm, false, f);
      if (alongX) { fb.addGeometry(BOX, M4(x + 0.5, (a0 + a1) / 2, z + 0.5, 0, 0.04, a1 - a0, 0.06)); fb.addGeometry(BOX, M4(x + 0.5, a0 + 0.02, z + 0.5, 0, 1, 0.04, 0.08)); }
      else { fb.addGeometry(BOX, M4(x + 0.5, (a0 + a1) / 2, z + 0.5, 0, 0.06, a1 - a0, 0.04)); fb.addGeometry(BOX, M4(x + 0.5, a0 + 0.02, z + 0.5, 0, 0.08, 0.04, 1)); }
    }
    _faceRaw(b, x, z, dx, dz, ya, yb) {
      let a, bb, nrm;
      if (dx === 1) { a = [x + 1, z + 1]; bb = [x + 1, z]; nrm = [-1, 0, 0]; }
      else if (dx === -1) { a = [x, z]; bb = [x, z + 1]; nrm = [1, 0, 0]; }
      else if (dz === 1) { a = [x, z + 1]; bb = [x + 1, z + 1]; nrm = [0, 0, -1]; }
      else { a = [x + 1, z]; bb = [x, z]; nrm = [0, 0, 1]; }
      b.quad([a[0], ya, a[1]], [bb[0], ya, bb[1]], [bb[0], yb, bb[1]], [a[0], yb, a[1]], nrm, [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
    }
    _doorFrame(f, x, z, y0, room) {
      const w = this.w, d = w.doorAtFast(f, x, z);
      const hh = Math.max(...d.rooms.map((r) => w.rooms[r].h || 3), 2.6);
      const lm = this.surfMat(room ? (room.outdoor ? 'corridor' : room.kind) : 'corridor', 'wall');
      const b = this.B(lm.key, lm.mat, true, f);
      const top = y0 + hh, bot = y0 + 2.25;
      if (d.pass === 'z') {
        b.quad([x, bot, z], [x + 1, bot, z], [x + 1, top, z], [x, top, z], [0, 0, -1], [[0, 0], [0.5, 0], [0.5, 0.3], [0, 0.3]]);
        b.quad([x + 1, bot, z + 1], [x, bot, z + 1], [x, top, z + 1], [x + 1, top, z + 1], [0, 0, 1], [[0, 0], [0.5, 0], [0.5, 0.3], [0, 0.3]]);
      } else {
        b.quad([x, bot, z + 1], [x, bot, z], [x, top, z], [x, top, z + 1], [-1, 0, 0], [[0, 0], [0.5, 0], [0.5, 0.3], [0, 0.3]]);
        b.quad([x + 1, bot, z], [x + 1, bot, z + 1], [x + 1, top, z + 1], [x + 1, top, z], [1, 0, 0], [[0, 0], [0.5, 0], [0.5, 0.3], [0, 0.3]]);
      }
      // architrave frame, set just inside the opening (no coplanar faces)
      const fb = this.B('doorframe', mat('doorframe', { tex: 'trim', roughness: 0.65 }), false, f);
      if (d.pass === 'z') { fb.addGeometry(BOX, M4(x + 0.06, y0 + 1.12, z + 0.5, 0, 0.08, 2.25, 1.04)); fb.addGeometry(BOX, M4(x + 0.94, y0 + 1.12, z + 0.5, 0, 0.08, 2.25, 1.04)); fb.addGeometry(BOX, M4(x + 0.5, y0 + 2.2, z + 0.5, 0, 0.96, 0.08, 1.04)); }
      else { fb.addGeometry(BOX, M4(x + 0.5, y0 + 1.12, z + 0.06, 0, 1.04, 2.25, 0.08)); fb.addGeometry(BOX, M4(x + 0.5, y0 + 1.12, z + 0.94, 0, 1.04, 2.25, 0.08)); fb.addGeometry(BOX, M4(x + 0.5, y0 + 2.2, z + 0.5, 0, 1.04, 0.08, 0.96)); }
    }

    _railTile(f, x, z) {
      const m = mat('rail', { color: 0x3a3c3e, roughness: 0.5, metalness: 0.6 });
      const b = this.B('rail', m, true, f);
      const y0 = f * this.w.FH;
      b.addGeometry(CYL, M4(x + 0.5, y0 + 0.5, z + 0.5, 0, 0.06, 1, 0.06));
      b.addGeometry(BOX, M4(x + 0.5, y0 + 1.0, z + 0.5, 0, 0.9, 0.05, 0.05));
      b.addGeometry(BOX, M4(x + 0.5, y0 + 1.0, z + 0.5, 0, 0.05, 0.05, 0.9));
    }
    _edgeRail(f, x, z, dx, dz) {
      const m = mat('rail', { color: 0x3a3c3e, roughness: 0.5, metalness: 0.6 });
      const b = this.B('rail', m, true, f);
      const y0 = f * this.w.FH, cx = x + 0.5 + dx * 0.45, cz = z + 0.5 + dz * 0.45;
      b.addGeometry(CYL, M4(cx, y0 + 0.5, cz, 0, 0.05, 1, 0.05));
      b.addGeometry(BOX, M4(cx, y0 + 1.0, cz, 0, dx ? 0.05 : 1, 0.05, dz ? 0.05 : 1));
      b.addGeometry(BOX, M4(cx, y0 + 0.5, cz, 0, dx ? 0.03 : 1, 0.03, dz ? 0.03 : 1));
    }

    _stairs(r) {
      const FH = this.w.FH, steps = r.len * 4;
      const m = mat('stair', { tex: 'concrete', roughness: 0.95, normal: this.quality !== 'low' });
      const b = this.B('stair', m, true, r.f);
      const [dx, dz] = NW.World.DIRV[r.a];
      for (let j = 0; j < r.w; j++) {
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps, t1 = (s + 1) / steps;
          const yTop = r.f * FH + t1 * FH;
          let cx, cz, sx, sz;
          const along = (t0 + t1) / 2 * r.len;
          if (r.horizontal) { cx = dx > 0 ? r.x0 + along : r.x0 + r.len - along; cz = r.z0 + j + 0.5; sx = r.len / steps; sz = 1; }
          else { cz = dz > 0 ? r.z0 + along : r.z0 + r.len - along; cx = r.x0 + j + 0.5; sz = r.len / steps; sx = 1; }
          const hh = yTop - r.f * FH;
          b.addGeometry(BOX, M4(cx, r.f * FH + hh / 2, cz, 0, sx, hh, sz));
        }
      }
    }

    _prop(p) {
      const w = this.w, y0 = p.f * w.FH, x = p.x + 0.5, z = p.z + 0.5;
      const rng = NW.util.rng(p.x * 73856093 ^ p.z * 19349663 ^ p.f);
      const room = p.room >= 0 ? w.rooms[p.room] : null;
      // orient toward the nearest open neighbour
      let ry = 0;
      for (const [dx, dz, a] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) if (w.walkable(p.f, p.x + dx, p.z + dz)) { ry = a; break; }
      const wood = mat('propwood', { tex: 'wood', roughness: 0.75, normal: this.quality !== 'low' });
      const metal = mat('propmetal', { color: 0x5b5f60, roughness: 0.45, metalness: 0.55 });
      const dark = mat('propdark', { color: 0x262626, roughness: 0.6, metalness: 0.3 });
      const fabric = mat('propfabric', { tex: 'fabric', roughness: 1, normal: this.quality !== 'low' });
      const white = mat('propwhite', { color: 0xb8b5a8, roughness: 0.5 });
      const add = (material, key, m) => this.B(key, material, true, p.f).addGeometry(BOX, m);
      switch (p.ch) {
        case 'T': // table / desk
          add(wood, 'pw', M4(x, y0 + 0.76, z, ry, 0.98, 0.05, 0.85));
          for (const [ox, oz] of [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.36], [0.42, 0.36]]) add(wood, 'pw', M4(x + ox, y0 + 0.37, z + oz, 0, 0.05, 0.74, 0.05));
          if (rng() < 0.6) add(dark, 'pd', M4(x + (rng() - 0.5) * 0.4, y0 + 0.86, z + (rng() - 0.5) * 0.3, rng() * 3, 0.32, 0.16, 0.24));
          break;
        case 'C': // cabinet / shelving
          if (room && (room.kind === 'records' || room.kind === 'archive' || room.kind === 'storage' || room.kind === 'pharmacy')) {
            for (let s = 0; s < 5; s++) add(metal, 'pm', M4(x, y0 + 0.1 + s * 0.45, z, ry, 0.95, 0.03, 0.5));
            add(metal, 'pm', M4(x - 0.46, y0 + 1.0, z, ry, 0.03, 2.0, 0.5)); add(metal, 'pm', M4(x + 0.46, y0 + 1.0, z, ry, 0.03, 2.0, 0.5));
            for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) if (rng() < 0.7) add(rng() < 0.5 ? fabric : wood, rng() < 0.5 ? 'pf' : 'pw', M4(x - 0.33 + k * 0.22, y0 + 0.28 + s * 0.45, z, ry, 0.18, 0.28 + rng() * 0.1, 0.32));
          } else {
            add(wood, 'pw', M4(x, y0 + 0.95, z, ry, 0.9, 1.9, 0.5));
            add(dark, 'pd', M4(x, y0 + 0.95, z, ry, 0.02, 1.8, 0.52));
          }
          break;
        case 'H': // wardrobe / locker (hiding spot)
          if (room && (room.kind === 'utility' || room.kind === 'storage' || room.kind === 'generator' || room.kind === 'dock' || room.kind === 'tunnel' || room.kind === 'lab' || room.kind === 'corridor' || room.kind === 'control' || room.kind === 'kitchen')) {
            add(metal, 'pm', M4(x, y0 + 1.0, z, ry, 0.9, 2.0, 0.7));
            for (let k = -1; k <= 1; k += 2) add(dark, 'pd', M4(x + Math.cos(ry) * k * 0.22, y0 + 1.75, z - Math.sin(ry) * k * 0.22, ry, 0.3, 0.02, 0.72));
          } else {
            add(wood, 'pw', M4(x, y0 + 1.05, z, ry, 0.95, 2.1, 0.68));
            add(dark, 'pd', M4(x, y0 + 1.05, z, ry, 0.02, 2.0, 0.7));
          }
          break;
        case 'B': // bed
          add(metal, 'pm', M4(x, y0 + 0.3, z, ry, 0.95, 0.12, 0.95));
          add(fabric, 'pf', M4(x, y0 + 0.45, z, ry, 0.9, 0.18, 0.9));
          add(white, 'pwh', M4(x, y0 + 0.58, z, ry, 0.5, 0.08, 0.4));
          break;
        case 'K': // counter
          add(wood, 'pw', M4(x, y0 + 0.45, z, ry, 1.0, 0.9, 0.7));
          add(white, 'pwh', M4(x, y0 + 0.92, z, ry, 1.02, 0.05, 0.74));
          break;
        case 'M': // washer / dryer
          add(white, 'pwh', M4(x, y0 + 0.45, z, ry, 0.75, 0.9, 0.7));
          add(dark, 'pd', M4(x - Math.sin(ry) * 0.36, y0 + 0.5, z - Math.cos(ry) * 0.36, ry, 0.42, 0.42, 0.02));
          break;
        case 'Y': // crates / luggage
          add(wood, 'pw', M4(x, y0 + 0.35, z, rng() * 0.4, 0.8, 0.7, 0.8));
          if (rng() < 0.6) add(fabric, 'pf', M4(x + 0.1, y0 + 0.9, z, rng(), 0.55, 0.4, 0.4));
          break;
        case 'Q': add(white, 'pwh', M4(x, y0 + 3, z, 0, 0.6, 6, 0.6)); break;
        case 'N': // bench / sofa
          add(fabric, 'pf', M4(x, y0 + 0.25, z, ry, 0.95, 0.4, 0.7));
          add(fabric, 'pf', M4(x - Math.sin(ry) * -0.3, y0 + 0.65, z - Math.cos(ry) * -0.3, ry, 0.95, 0.5, 0.15));
          break;
        case 'O': // machinery / telescope (merged into one blob via neighbours) — draw as cluster
          if (room && room.kind === 'dome') break; // telescope is built in _buildSpecial
          add(metal, 'pm', M4(x, y0 + 0.7, z, 0, 0.95, 1.4, 0.95));
          add(dark, 'pd', M4(x, y0 + 1.5, z, 0, 0.3, 0.3, 0.95));
          break;
        case 'G':
          add(mat('gen', { color: 0x4f5a3c, roughness: 0.6, metalness: 0.4 }), 'pgen', M4(x, y0 + 0.6, z, 0, 0.96, 1.2, 0.96));
          break;
        case '~': {
          const wm = mat('deepwater', { color: 0x0b1416, roughness: 0.1, metalness: 0.5 });
          this.B('deepwater', wm, false, p.f).quad([p.x, y0 - 0.5, p.z + 1], [p.x + 1, y0 - 0.5, p.z + 1], [p.x + 1, y0 - 0.5, p.z], [p.x, y0 - 0.5, p.z], [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
          break;
        }
        case 'F': break; // truck built separately
      }
    }

    /* ---------- dynamic: doors ---------- */
    _buildDoors() {
      const w = this.w, FH = w.FH;
      const wood = mat('doorleaf', { tex: 'panel', roughness: 0.7 });
      const steel = mat('doorsteel', { color: 0x4d5257, roughness: 0.5, metalness: 0.6 });
      const exitM = mat('doorexit', { color: 0x5a3020, roughness: 0.7 });
      for (const d of w.doors) {
        const pivot = new THREE.Group();
        const y0 = d.f * FH;
        // hinge on the left edge of the opening
        if (d.pass === 'z') pivot.position.set(d.x + 0.1, y0, d.z + 0.5);
        else pivot.position.set(d.x + 0.5, y0, d.z + 0.1);
        const leaf = new THREE.Mesh(BOX, d.exit ? exitM : d.sealed ? steel : wood);
        if (d.pass === 'z') { leaf.scale.set(0.8, 2.15, 0.05); leaf.position.set(0.4, 1.075, 0); }
        else { leaf.scale.set(0.05, 2.15, 0.8); leaf.position.set(0, 1.075, 0.4); }
        leaf.castShadow = true; leaf.receiveShadow = true;
        pivot.add(leaf);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('knob', { color: 0xb09060, metalness: 0.8, roughness: 0.3 }));
        if (d.pass === 'z') knob.position.set(0.7, 1.0, 0.05); else knob.position.set(0.05, 1.0, 0.7);
        pivot.add(knob);
        const k2 = knob.clone(); if (d.pass === 'z') k2.position.z = -0.05; else k2.position.x = -0.05; pivot.add(k2);
        this.root.add(pivot);
        leaf.userData.interact = { kind: 'door', id: d.id };
        this.interactables.push(leaf);
        this.doorMeshes.push({ d, pivot, angle: 0, target: 0, dir: 1 });
      }
    }
    syncDoors(state, playerPos) {
      for (const dm of this.doorMeshes) {
        const ds = state.doors[dm.d.id];
        if (!ds) continue;
        if (ds.open && dm.target === 0 && playerPos) {
          // swing away from whoever is nearest (the player for local opens)
          const d = dm.d;
          const side = d.pass === 'z' ? Math.sign(playerPos.z - (d.z + 0.5)) : Math.sign(playerPos.x - (d.x + 0.5));
          dm.dir = side >= 0 ? -1 : 1;
          if (d.pass === 'x') dm.dir = -dm.dir;
        }
        dm.target = ds.open ? 1.45 * dm.dir : 0;
        // keep the world's door state for local collision in sync
        dm.d.open = ds.open; dm.d.locked = ds.locked;
      }
    }
    animateDoors(dt) {
      for (const dm of this.doorMeshes) {
        const k = Math.min(1, dt * (dm.slam ? 14 : 4));
        dm.angle += (dm.target - dm.angle) * k;
        if (Math.abs(dm.target - dm.angle) < 0.01) dm.slam = false;
        dm.pivot.rotation.y = dm.angle;
      }
    }

    /* ---------- dynamic: lights ---------- */
    _buildLights() {
      const w = this.w;
      const geoShade = new THREE.CylinderGeometry(0.18, 0.3, 0.16, 12, 1, true);
      const geoBulb = new THREE.SphereGeometry(0.08, 10, 8);
      const tubeGeo = new THREE.BoxGeometry(0.16, 0.06, 1.1);
      const shadeM = mat('shade', { color: 0x3a3936, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
      for (const l of w.lights) {
        const room = w.rooms[l.room];
        const fluorescent = ['clinic', 'observatory', 'ferry'].indexOf(this.locId) >= 0 && ['lab', 'ward', 'exam', 'corridor', 'theatre', 'office', 'records', 'pharmacy', 'archive', 'control', 'hall', 'baggage', 'ticket', 'cafe', 'dock'].indexOf(room.kind) >= 0;
        const g = new THREE.Group();
        g.position.set(l.x, l.y, l.z);
        const bulbM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe2b0, emissiveIntensity: 0 });
        let bulb;
        if (fluorescent) { bulb = new THREE.Mesh(tubeGeo, bulbM); bulb.position.y = -0.04; }
        else {
          const shade = new THREE.Mesh(geoShade, shadeM); shade.position.y = -0.18; g.add(shade);
          bulb = new THREE.Mesh(geoBulb, bulbM); bulb.position.y = -0.22;
          const cord = new THREE.Mesh(BOX, shadeM); cord.scale.set(0.01, 0.12, 0.01); cord.position.y = -0.06; g.add(cord);
        }
        g.add(bulb);
        this.root.add(g);
        this.fixtures.push({ l, g, bulbM, fluorescent, level: 0, room: l.room });
      }
      // switches
      const plateM = mat('switch', { color: 0xd7d0bc, roughness: 0.5 });
      for (const r of w.rooms) {
        if (!r.switch) continue;
        const s = r.switch;
        const m = new THREE.Mesh(BOX, plateM);
        m.scale.set(s.nx ? 0.02 : 0.08, 0.12, s.nz ? 0.02 : 0.08);
        m.position.set(s.x, s.y, s.z);
        m.userData.interact = { kind: 'switch', id: r.id };
        this.root.add(m);
        this.interactables.push(m);
        const tog = new THREE.Mesh(BOX, mat('toggle', { color: 0x333333 }));
        tog.scale.set(s.nx ? 0.03 : 0.02, 0.04, s.nz ? 0.03 : 0.02);
        tog.position.set(s.x + s.nx * 0.01, s.y, s.z + s.nz * 0.01);
        this.root.add(tog);
        this.switchMeshes.push({ r, tog });
      }
    }
    updateLights(state, cam, dt, t) {
      const camF = this.w.floorFromHeight(cam.position.y - 1.2);
      const lit = [];
      for (const fx of this.fixtures) {
        let on = state.power && state.roomLights[fx.room];
        const fl = this.flicker[fx.room];
        if (on && fl && fl > t) on = Math.sin(t * 37 + fx.l.id) > 0.1 && Math.random() > 0.25;
        if (on && this.globalFlicker > t) on = Math.random() > 0.5;
        const target = on ? 1 : 0;
        fx.level += (target - fx.level) * Math.min(1, dt * (target > fx.level ? (fx.fluorescent ? 6 : 14) : 20));
        fx.bulbM.emissiveIntensity = fx.level * (fx.fluorescent ? 1.6 : 2.2);
        if (fx.level > 0.05 && Math.abs(fx.l.f - camF) <= 1) lit.push(fx);
      }
      for (const fx of lit) this.budget.request({ x: fx.l.x, y: fx.l.y - 0.35, z: fx.l.z, color: fx.fluorescent ? 0xdfe8ff : 0xffcf90, intensity: fx.level * (fx.fluorescent ? 1.15 : 1.35), distance: fx.fluorescent ? 10 : 8, priority: 1 });
      if (this.streetLamps) for (const sl of this.streetLamps) { const on = Math.sin(t * 13 + sl.flick * 50) > -0.97 || sl.flick < 0.7; if (on) this.budget.request({ x: sl.x, y: sl.y, z: sl.z, color: 0xffc98a, intensity: 1.4, distance: 13, priority: 0.7 }); }
      if (this.vanPos) this.budget.request({ x: this.vanPos.x, y: this.vanPos.y, z: this.vanPos.z, color: 0x9fe8ff, intensity: 0.8, distance: 7, priority: 0.6 });
      for (const sm of this.switchMeshes) sm.tog.position.y = sm.r.switch.y + (state.roomLights[sm.r.id] ? 0.015 : -0.015);
    }


    /* ---------- haunted electronics and the site relic ---------- */
    _buildDevices() {
      const w = this.w, FH = w.FH;
      this.staticCanvas = NW.Tex.canvas(96, 72); this.staticTex = new THREE.CanvasTexture(this.staticCanvas);
      const body = mat('devBody', { color: 0x2a2826, roughness: 0.5, metalness: 0.2 });
      const wood = mat('propwood', { tex: 'wood', roughness: 0.75 });
      for (const dv of w.devices) {
        const g = new THREE.Group(); g.position.set(dv.x, dv.f * FH, dv.z); g.rotation.y = dv.ry;
        const scr = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.2, metalness: 0.3, emissive: 0xffffff, emissiveMap: this.staticTex, emissiveIntensity: 0 });
        const box = (m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(BOX, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
        let sy = 0.75;
        if (dv.kind === 'tv') { box(wood, 0, 0.25, -0.02, 0.8, 0.5, 0.4); box(body, 0, 0.75, -0.05, 0.62, 0.48, 0.42); box(scr, 0, 0.76, 0.165, 0.5, 0.38, 0.01); sy = 0.76; }
        else if (dv.kind === 'monitor') { box(body, 0, 0.38, -0.05, 0.5, 0.76, 0.35); box(body, 0, 0.98, -0.04, 0.44, 0.36, 0.34); box(scr, 0, 0.99, 0.135, 0.36, 0.27, 0.01); sy = 0.99; }
        else { box(wood, 0, 0.35, 0, 0.45, 0.7, 0.35); box(body, 0, 0.8, 0, 0.36, 0.2, 0.14); box(scr, 0.08, 0.8, 0.071, 0.14, 0.08, 0.01); box(body, -0.08, 0.8, 0.075, 0.12, 0.12, 0.01); sy = 0.8; }
        const hit = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, sy, 0); hit.scale.set(0.7, 0.6, 0.5); g.add(hit);
        hit.userData.interact = { kind: 'device', id: dv.id };
        this.interactables.push(hit);
        this.floorGroups[dv.f].add(g);
        const wp = new V3(0, sy, 0.4).applyAxisAngle(new V3(0, 1, 0), dv.ry).add(g.position);
        this.deviceMeshes.push({ dv, scr, pos: wp });
      }
      const rl = w.relic;
      if (rl) {
        const g = new THREE.Group(); g.position.set(rl.x, rl.f * FH, rl.z); g.rotation.y = rl.ry;
        const ped = new THREE.Mesh(BOX, wood); ped.scale.set(0.45, 0.8, 0.4); ped.position.y = 0.4; g.add(ped);
        this.relicMat = new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 0.35, metalness: 0.7, emissive: 0x6fb0ff, emissiveIntensity: 0.25 });
        let o;
        if (this.locId === 'observatory') { o = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.18), new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.05, metalness: 0.2, emissive: 0x6fb0ff, emissiveIntensity: 0.3 })); o.position.y = 0.81; this.relicMat = o.material; }
        else if (this.locId === 'apartments') { o = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.12), this.relicMat); o.position.y = 0.85; const key = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), this.relicMat); key.rotation.z = Math.PI / 2; key.position.set(0.1, 0.86, 0); g.add(key); }
        else if (this.locId === 'clinic') { o = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.6, emissive: 0x6fb0ff, emissiveIntensity: 0.25 })); o.rotation.x = Math.PI / 2; o.position.y = 0.81; this.relicMat = o.material; }
        else { o = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.085, 0.03], [0.06, 0.12], [0.03, 0.16], [0, 0.17]].map(([a, b]) => new THREE.Vector2(a, b)), 14), this.relicMat); o.position.y = 0.8; }
        g.add(o);
        const hit = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.9; hit.scale.set(0.5, 0.4, 0.5); g.add(hit);
        hit.userData.interact = { kind: 'relic' }; this.interactables.push(hit);
        this.floorGroups[rl.f].add(g);
        this.relicPos = new V3(rl.x, rl.f * FH + 0.9, rl.z);
      }
    }
    syncDevices(state, t) {
      let any = false;
      for (const dm of this.deviceMeshes) {
        const on = state.devices && state.devices[dm.dv.id] && state.devices[dm.dv.id].on;
        dm.scr.emissiveIntensity += ((on ? 1.3 : 0) - dm.scr.emissiveIntensity) * 0.3;
        if (on) { any = true; this.budget.request({ x: dm.pos.x, y: dm.pos.y, z: dm.pos.z, color: 0xb8c8ff, intensity: 0.5 + Math.random() * 0.25, distance: 4.5, priority: 1.3 }); }
      }
      if (any && (this._stT = (this._stT || 0) + 1) % 3 === 0) {
        const c = this.staticCanvas.getContext('2d'), img = c.createImageData(96, 72);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        c.putImageData(img, 0, 0); this.staticTex.needsUpdate = true;
      }
      if (this.relicMat) this.relicMat.emissiveIntensity = state.relic && state.relic.uses > 0 ? 0.25 + Math.sin(t * 1.7) * 0.15 : 0;
    }

    /* ---------- hides, generator, truck, telescope ---------- */
    _buildHides() {
      for (const h of this.w.hides) {
        const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false }));
        m.position.set(h.x + 0.5, h.f * this.w.FH + 1, h.z + 0.5); m.scale.set(1.0, 2, 1.0);
        m.userData.interact = { kind: 'hide', id: h.id };
        this.root.add(m); this.interactables.push(m);
      }
    }
    _buildSpecial() {
      const w = this.w;
      if (w.generator) {
        const g = w.generator;
        const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false }));
        m.position.set(g.x, g.f * w.FH + 0.7, g.z); m.scale.set(1.6, 1.4, 1.6);
        m.userData.interact = { kind: 'generator' };
        this.root.add(m); this.interactables.push(m);
        // status lamp
        this.genLampM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff3b2b, emissiveIntensity: 1.2 });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), this.genLampM);
        lamp.position.set(g.x, g.f * w.FH + 1.32, g.z); this.root.add(lamp);
        this.genPos = new V3(g.x, g.f * w.FH + 0.8, g.z);
      }
      if (w.truck) this._buildTruck();
      // telescope in the dome
      const dome = w.rooms.find((r) => r.kind === 'dome');
      if (dome) {
        const os = w.props.filter((p) => p.ch === 'O' && p.room === dome.id);
        if (os.length) {
          const cx = os.reduce((a, p) => a + p.x, 0) / os.length + 0.5, cz = os.reduce((a, p) => a + p.z, 0) / os.length + 0.5;
          const y0 = dome.f * w.FH;
          const tm = mat('scope', { color: 0xc9c4b6, roughness: 0.35, metalness: 0.5 });
          const dm = mat('scopeDark', { color: 0x30302e, roughness: 0.6, metalness: 0.6 });
          const g = new THREE.Group(); g.position.set(cx, y0, cz);
          const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 20), dm); base.position.y = 0.6; g.add(base);
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 16), tm); pier.position.y = 2.2; g.add(pier);
          const fork = new THREE.Mesh(BOX, dm); fork.scale.set(1.6, 0.9, 0.4); fork.position.y = 3.5; g.add(fork);
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6.5, 20, 1, true), tm);
          tube.material = tm; tube.position.set(0, 4.2, 0); tube.rotation.x = -0.75; tube.rotation.z = 0.2; g.add(tube);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 20), dm); ring.position.set(0, 6.4, -2.3); ring.rotation.x = -0.75 + Math.PI / 2; g.add(ring);
          g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          this.root.add(g);
        }
        // dome shell: ribbed cylinder wall + cap with a slit open to the sky
        const ribs = mat('domeRib', { color: 0x4a4e52, roughness: 0.6, metalness: 0.5 });
        const minX = Math.min(...dome.tiles.map((i) => i % w.W)), maxX = Math.max(...dome.tiles.map((i) => i % w.W)) + 1;
        const minZ = Math.min(...dome.tiles.map((i) => (i / w.W) | 0)), maxZ = Math.max(...dome.tiles.map((i) => (i / w.W) | 0)) + 1;
        const b = this.B('domeRib', ribs, true, dome.f);
        for (let x = minX; x <= maxX; x += 2) b.addGeometry(BOX, M4(x, dome.f * w.FH + dome.h - 0.1, (minZ + maxZ) / 2, 0, 0.12, 0.25, maxZ - minZ));
      }
    }
    _buildTruck() {
      const t = this.w.truck, y0 = t.f * this.w.FH;
      const g = new THREE.Group(); g.position.set(t.x, y0, t.z); g.rotation.y = Math.PI; // rear doors face the building
      const body = mat('van', { color: 0x2f3a3f, roughness: 0.45, metalness: 0.35 });
      const trim = mat('vanTrim', { color: 0x161819, roughness: 0.5, metalness: 0.5 });
      const glass = mat('vanGlass', { color: 0x0a0f12, roughness: 0.1, metalness: 0.8 });
      const box = (m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(BOX, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
      box(body, 0, 1.25, 0, 2.1, 1.9, 4.6);
      box(body, 0, 0.95, -2.75, 2.0, 1.2, 1.0);
      box(glass, 0, 1.55, -2.42, 1.9, 0.55, 0.3);
      box(trim, 0, 0.35, 0, 2.15, 0.25, 4.7);
      for (const [x, z] of [[-1, -2], [1, -2], [-1, 1.5], [1, 1.5]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14), trim); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.38, z); g.add(wh); }
      // stripe + agency mark (original)
      box(mat('vanStripe', { color: 0xc06a2b, roughness: 0.6 }), 0, 1.25, 0, 2.12, 0.12, 4.0);
      // open rear doors with lit interior
      box(body, -1.25, 1.25, 2.35, 0.08, 1.8, 1.0).rotation.y = 0.9;
      box(body, 1.25, 1.25, 2.35, 0.08, 1.8, 1.0).rotation.y = -0.9;
      const inner = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, emissive: 0x2c5a66, emissiveIntensity: 0.5 });
      box(inner, 0, 1.3, 2.24, 1.8, 1.6, 0.04);
      // monitors in the back
      const scr = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x6fe0c8, emissiveIntensity: 0.9 });
      box(scr, -0.5, 1.6, 2.2, 0.5, 0.32, 0.02); box(scr, 0.25, 1.6, 2.2, 0.5, 0.32, 0.02);
      this.vanPos = new V3(t.x, y0 + 1.8, t.z - 3.2);
      // hazard lamp on the roof
      this.vanLamp = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff9a2e, emissiveIntensity: 0 });
      box(this.vanLamp, 0, 2.28, -1.4, 0.3, 0.12, 0.3);
      this.root.add(g);
      // interaction zone behind the van
      const zone = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false }));
      zone.position.set(t.x, y0 + 1.2, t.z - 2.3); zone.scale.set(2.2, 2.2, 0.3);
      zone.userData.interact = { kind: 'truck' };
      this.root.add(zone); this.interactables.push(zone);
    }

    _buildSky() {
      const n = 900, pos = new Float32Array(n * 3);
      const r = NW.util.rng(4);
      for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.45, R = 300;
        pos[i * 3] = Math.cos(th) * Math.sin(ph) * R + this.w.W / 2; pos[i * 3 + 1] = Math.cos(ph) * R * 0.6 + 20; pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * R + this.w.H / 2;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0cc, size: 1.2, sizeAttenuation: false, fog: false }));
      this.root.add(stars);
      // distant silhouettes: mountains, skyline or headland
      const sil = mat('silhouette', { color: 0x07090c, roughness: 1, fog: false });
      const rr = NW.util.rng(9);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, R = 140 + rr() * 40;
        const h = this.locId === 'observatory' ? 30 + rr() * 50 : this.locId === 'apartments' ? 12 + rr() * 35 : 6 + rr() * 18;
        const geo = this.locId === 'apartments' ? new THREE.BoxGeometry(12 + rr() * 14, h, 12) : new THREE.ConeGeometry(18 + rr() * 26, h, 5);
        const m = new THREE.Mesh(geo, sil);
        m.position.set(this.w.W / 2 + Math.cos(a) * R, h / 2 - 4, this.w.H / 2 + Math.sin(a) * R);
        if (this.locId === 'ferry' && Math.sin(a) < 0.2) continue;
        this.root.add(m);
      }
      // moon
      const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc8d2e0, fog: false }));
      moon.position.set(this.w.W / 2 - 120, 110, this.w.H / 2 - 160);
      this.root.add(moon);
    }

    /* ---------- throwables / notes / items / traces ---------- */
    syncThrowables(state) {
      for (const t of state.throwables) {
        let m = this.throwMeshes[t.id];
        if (!m) {
          m = this._throwMesh(t.type);
          m.userData.anim = null;
          this.root.add(m); this.throwMeshes[t.id] = m;
          m.position.set(t.x, t.y, t.z); m.rotation.y = t.ry;
        }
        if (!m.userData.anim) { m.position.set(t.x, t.y + m.userData.h, t.z); m.rotation.y = t.ry; }
      }
    }
    _throwMesh(type) {
      const colors = { book: 0x6a2e22, cup: 0xd9d4c8, bottle: 0x2f5a3a, box: 0x8a6a42, can: 0x8a8f94, frame: 0x3a2a1a, tin: 0x6d6f5a, phone: 0x1a1a1a };
      const sizes = { book: [0.22, 0.05, 0.16], cup: [0.08, 0.1, 0.08], bottle: [0.07, 0.26, 0.07], box: [0.3, 0.2, 0.25], can: [0.07, 0.12, 0.07], frame: [0.25, 0.03, 0.2], tin: [0.15, 0.1, 0.15], phone: [0.2, 0.1, 0.15] };
      const s = sizes[type] || [0.15, 0.15, 0.15];
      const m = new THREE.Mesh(type === 'cup' || type === 'bottle' || type === 'can' ? CYL : BOX, mat('th:' + type, { color: colors[type] || 0x777777, roughness: 0.6, metalness: type === 'can' ? 0.6 : 0.05 }));
      m.scale.set(s[0], s[1], s[2]); m.castShadow = true;
      m.userData.h = s[1] / 2;
      return m;
    }
    throwAnim(e) {
      const m = this.throwMeshes[e.id]; if (!m) return;
      m.userData.anim = { t: 0, dur: 0.45 + e.force * 0.05, from: new V3(e.from.x, e.from.y + m.userData.h, e.from.z), to: new V3(e.to.x, e.to.y + m.userData.h, e.to.z), spin: (Math.random() - 0.5) * 20 };
    }
    animateThrowables(dt, onLand) {
      for (const id in this.throwMeshes) {
        const m = this.throwMeshes[id], a = m.userData.anim; if (!a) continue;
        a.t += dt;
        const k = Math.min(1, a.t / a.dur);
        m.position.lerpVectors(a.from, a.to, k);
        m.position.y += Math.sin(k * Math.PI) * 0.6;
        m.rotation.x += a.spin * dt; m.rotation.z += a.spin * 0.7 * dt;
        if (k >= 1) { m.userData.anim = null; m.rotation.x = 0; m.rotation.z = 0; if (onLand) onLand(m.position); }
      }
    }

    syncNotes(state) {
      for (const n of state.notes) {
        let m = this.noteMeshes[n.id];
        if (!m) {
          m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: NW.Tex.get('paper'), roughness: 0.9, emissive: 0x332e22, emissiveIntensity: 0.25 }));
          m.rotation.x = -Math.PI / 2; m.rotation.z = (n.x * 7) % 3;
          m.position.set(n.x, n.y, n.z);
          m.userData.interact = { kind: 'note', id: n.id };
          this.root.add(m); this.interactables.push(m); this.noteMeshes[n.id] = m;
        }
        if (n.takenBy && m.visible) { m.visible = false; m.userData.interact = null; }
      }
    }

    /** Trace visuals. `mode` gives which special views are active: { uv, lens }. */
    syncTraces(state, mode, t) {
      const live = new Set();
      const tr = state.traces;
      const ensure = (id, make) => { live.add(id); let m = this.traceMeshes[id]; if (!m) { m = make(); this.traceMeshes[id] = m; this.root.add(m); } return m; };
      // touch points (visible under the sample kit's UV lamp; scorch marks always visible)
      for (const p of tr.touch) {
        const m = ensure(p.id, () => {
          const g = new THREE.Mesh(new THREE.CircleGeometry(p.scorch ? 0.12 : 0.06, 10), new THREE.MeshBasicMaterial({ color: p.scorch ? 0x0a0806 : p.residue ? 0x6bffb5 : 0xcfd8ff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
          g.position.set(p.x, p.y, p.z);
          // orient to the nearest wall by the fractional offset
          const fx = p.x - Math.floor(p.x), fz = p.z - Math.floor(p.z);
          if (Math.abs(fx - 0.5) > Math.abs(fz - 0.5)) g.rotation.y = Math.PI / 2;
          if (Math.abs(fx - 0.5) < 0.2 && Math.abs(fz - 0.5) < 0.2) g.rotation.x = -Math.PI / 2;
          g.userData.interact = { kind: 'touch', id: p.id };
          return g;
        });
        m.visible = p.scorch || (mode.uv && !p.swabbed) || (mode.uv && p.residue);
        if (mode.uv && !p.scorch) m.material.opacity = p.residue ? 0.9 : 0.45;
        m.userData.trace = p;
      }
      // wet footprints (always visible)
      for (const p of tr.prints) {
        const m = ensure(p.id, () => {
          const g = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.26), new THREE.MeshStandardMaterial({ color: 0x0a1414, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: false }));
          g.rotation.x = -Math.PI / 2; g.rotation.z = -p.yaw;
          g.position.set(p.x + Math.cos(p.yaw) * 0.08 * (p.id.length % 2 ? 1 : -1), p.f * this.w.FH + 0.012, p.z);
          return g;
        });
        m.material.opacity = U.clamp((p.until - t) / 40, 0, 0.7);
      }
      // light motes (the Lantern) — visible to everyone
      for (const o of tr.orbs) {
        const m = ensure(o.id, () => {
          const g = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffefb0 }));
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          halo.scale.set(0.9, 0.9, 0.9); g.add(halo);
          return g;
        });
        m.position.set(o.x, o.y, o.z);
        this.budget.request({ x: o.x, y: o.y, z: o.z, color: 0xffe2a0, intensity: 0.6, distance: 4, priority: 1.5 });
      }
      // optical distortions — only through the lens
      for (const d of tr.distort) {
        const m = ensure(d.id, () => {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: distortTex(), color: 0xfff1b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          s.scale.set(0.9, 1.4, 1);
          s.position.set(d.x, d.y, d.z);
          s.userData.distort = d;
          return s;
        });
        m.visible = !!mode.lens;
        m.material.rotation = t * 0.6;
        m.material.opacity = 0.55 + Math.sin(t * 9 + d.x) * 0.25;
      }
      for (const id in this.traceMeshes) if (!live.has(id)) { this.root.remove(this.traceMeshes[id]); delete this.traceMeshes[id]; }
    }
    distortionObjects() { return Object.values(this.traceMeshes).filter((m) => m.userData.distort); }
    touchObjects() { return Object.values(this.traceMeshes).filter((m) => m.userData.trace && m.visible); }

    updateGenerator(state, t) {
      if (this.genLampM) { this.genLampM.emissive.set(state.power ? 0x48ff7a : 0xff3b2b); this.genLampM.emissiveIntensity = state.power ? 1.2 : 0.6 + Math.sin(t * 4) * 0.5; }
      if (this.vanLamp) this.vanLamp.emissiveIntensity = state.hunting ? (Math.sin(t * 10) > 0 ? 2 : 0) : 0.15;
      if (this.sea) this.sea.material.map.offset.set(t * 0.004, t * 0.002);
    }
  }

  let _glow = null, _dist = null;
  function glowTex() {
    if (_glow) return _glow;
    const c = NW.Tex.canvas(64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    _glow = new THREE.CanvasTexture(c); return _glow;
  }
  function distortTex() {
    if (_dist) return _dist;
    const c = NW.Tex.canvas(128), x = c.getContext('2d');
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = 'rgba(255,240,190,' + (0.15 + i * 0.05) + ')'; x.lineWidth = 2;
      x.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.2) { const r = 10 + i * 5 + Math.sin(a * 5 + i) * 4; const px = 64 + Math.cos(a) * r * 0.7, py = 64 + Math.sin(a) * r; if (a === 0) x.moveTo(px, py); else x.lineTo(px, py); }
      x.closePath(); x.stroke();
    }
    // a faint humanoid smear in the middle
    x.fillStyle = 'rgba(255,240,200,0.35)'; x.beginPath(); x.ellipse(64, 40, 9, 11, 0, 0, 7); x.fill(); x.fillRect(56, 50, 16, 40);
    _dist = new THREE.CanvasTexture(c); return _dist;
  }

  NW.LevelManager = LevelManager;
  NW.glowTex = glowTex;
  NW.makeMat = mat;
  NW.GeoBuilder = GeoBuilder;
  NW.M4 = M4;
})();
