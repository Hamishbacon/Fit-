/* Geometry toolkit: swept limbs with sculpt displacement, tapered tubes, rounded boxes, merging. */
'use strict';
GR.Geo = (() => {
  const U = GR.U;
  const V3 = THREE.Vector3;

  function build(pos, nor, uv, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); else g.computeVertexNormals();
    return g;
  }

  /**
   * Sweep an elliptical cross-section down -Y. prof(t) → [rx, rz, ox, oz] for t∈[0,1].
   * disp(a, t) → radial offset (a = angle, 0 = front +Z). Optional dome caps.
   * UV: u around (0.5 = front), v = t.
   */
  function sweep({ len, segV = 10, segU = 16, prof, disp, capTop = true, capBot = true, capK = 3, capScale = 1 }) {
    const rings = [];
    const p0 = prof(0), p1 = prof(1);
    if (capTop) for (let k = capK; k >= 1; k--) { const ph = (k / capK) * Math.PI / 2; rings.push({ t: 0, y: Math.sin(ph) * Math.min(p0[0], p0[1]) * capScale, s: Math.cos(ph), v: 0 }); }
    for (let i = 0; i <= segV; i++) { const t = i / segV; rings.push({ t, y: -t * len, s: 1, v: t }); }
    if (capBot) for (let k = 1; k <= capK; k++) { const ph = (k / capK) * Math.PI / 2; rings.push({ t: 1, y: -len - Math.sin(ph) * Math.min(p1[0], p1[1]) * capScale, s: Math.cos(ph), v: 1 }); }
    const pos = [], uv = [], idx = [];
    for (let r = 0; r < rings.length; r++) {
      const R = rings[r], p = prof(R.t);
      for (let j = 0; j <= segU; j++) {
        const u = j / segU, a = (u - 0.5) * Math.PI * 2;
        let rad = 1 + (disp && R.s > 0.2 ? disp(a, R.t) : 0);
        const x = Math.sin(a) * p[0] * rad * R.s + (p[2] || 0), z = Math.cos(a) * p[1] * rad * R.s + (p[3] || 0);
        pos.push(x, R.y, z); uv.push(u, 1 - R.v);
      }
    }
    const row = segU + 1;
    for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < segU; j++) {
      const a = r * row + j, b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = build(pos, null, uv, idx);
    // fix the seam normals (u=0 and u=1 share positions)
    const n = g.attributes.normal;
    for (let r = 0; r < rings.length; r++) { const i0 = r * row, i1 = r * row + segU; const nx = n.getX(i0) + n.getX(i1), ny = n.getY(i0) + n.getY(i1), nz = n.getZ(i0) + n.getZ(i1); const l = Math.hypot(nx, ny, nz) || 1; n.setXYZ(i0, nx / l, ny / l, nz / l); n.setXYZ(i1, nx / l, ny / l, nz / l); }
    return g;
  }

  /** Tube with radius function along a smooth curve through pts. */
  function tube(pts, rFn, radial = 6, segs = null, closed = false) {
    const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
    segs = segs || Math.max(4, pts.length * 3);
    const frames = curve.computeFrenetFrames(segs, closed);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, P = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = typeof rFn === 'function' ? rFn(t) : rFn;
      for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pos.push(P.x + r * (c * N.x + s * B.x), P.y + r * (c * N.y + s * B.y), P.z + r * (c * N.z + s * B.z)); uv.push(j / radial, t); }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    return build(pos, null, uv, idx);
  }

  /** Rounded box via spherised corners. */
  function rbox(w, h, d, r = 0.02, seg = 3) {
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
    const p = g.attributes.position, v = new V3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const c = new V3(U.clamp(v.x, -hw, hw), U.clamp(v.y, -hh, hh), U.clamp(v.z, -hd, hd));
      const dlt = v.clone().sub(c); if (dlt.lengthSq() > 1e-9) dlt.setLength(r); v.copy(c).add(dlt);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  /** Merge geometries (each keeps position/normal/uv). Optional matrix per entry: [geo, matrix]. */
  function merge(list) {
    const pos = [], nor = [], uv = [], col = [], idx = []; let off = 0, hasCol = list.some(e => (e.geometry || e[0] || e).attributes && (e.geometry || e[0] || e).attributes.color);
    const nm = new THREE.Matrix3();
    for (const e of list) {
      let g = Array.isArray(e) ? e[0] : e, m = Array.isArray(e) ? e[1] : null;
      if (!g) continue;
      g = g.index ? g : g.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv, C = g.attributes.color;
      const v = new V3(), n = new V3();
      if (m) nm.getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
        if (m) { v.applyMatrix4(m); n.applyMatrix3(nm).normalize(); }
        pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
        uv.push(T ? T.getX(i) : 0, T ? T.getY(i) : 0);
        if (hasCol) { if (C) col.push(C.getX(i), C.getY(i), C.getZ(i)); else col.push(1, 1, 1); }
      }
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx.push(I[i] + off); }
      else for (let i = 0; i < P.count; i++) idx.push(i + off);
      off += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (hasCol) out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (off > 65535) out.setIndex(new THREE.Uint32BufferAttribute(idx, 1)); else out.setIndex(idx);
    return out;
  }
  const M = {
    t: (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z),
    trs: (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz))
  };
  const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
  const cyl = (rt, rb, h, s = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const torus = (r, t, rs = 8, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
  // Extruded rounded footprint (used for shoe soles, tables, signs)
  function extrudeShape(pts2, depth, bevel = 0.005) {
    const s = new THREE.Shape(pts2.map(p => new THREE.Vector2(p[0], p[1])));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  }
  return { build, sweep, tube, rbox, merge, M, sphere, cyl, box, torus, extrudeShape };
})();
