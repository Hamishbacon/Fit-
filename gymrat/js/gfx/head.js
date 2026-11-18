/* Sculpted head: a face-dense sphere deformed by face-shape parameters (jaw, chin, cheekbones, brow ridge, nose, lips),
   plus eyes with irises/pupils/eyelids, brows, ears, nose tip, animated mouth, teeth and facial hair shells. */
'use strict';
GR.Head = (() => {
  const U = GR.U, D = GR.Data, G = GR.Geo;
  const g3 = (x, y, z, cx, cy, cz, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / (s * s));

  function params(app) {
    const fs = D.FACE_SHAPES.find(f => f.id === app.face) || D.FACE_SHAPES[0];
    const nose = D.NOSES.find(n => n.id === app.nose) || D.NOSES[1];
    const mouth = D.MOUTHS.find(m => m.id === app.mouth) || D.MOUTHS[0];
    const eye = D.EYE_SHAPES.find(e => e.id === app.eyeShape) || D.EYE_SHAPES[0];
    return {
      jaw: app.jaw ?? fs.jaw, chin: app.chin ?? fs.chin, cheek: app.cheek ?? fs.cheek, len: fs.len, wid: fs.wid,
      nw: nose.w * (0.85 + 0.15 * app.noseSize), nl: nose.l * (0.85 + 0.15 * app.noseSize), np: nose.p * (0.8 + 0.2 * app.noseSize), nb: nose.b, nup: nose.up || 0,
      mw: mouth.w, mf: mouth.full, bow: mouth.bow || 0, eye, eyeSize: app.eyeSize || 1, eyeSp: app.eyeSpacing || 1
    };
  }

  /** Deform a unit-sphere point into the sculpted head (unit space, ~1 = head radius). Also returns lip/socket weights. */
  function deform(x, y, z, P, out) {
    let sx = 0.84 * P.wid, sy = 1.05 * P.len, sz = 0.97;
    if (z < 0) sz *= 1.06 + 0.04 * U.smooth(0, 0.6, y); // fuller cranium at the back
    const jt = U.smooth(0.05, -0.95, y);
    sx *= U.lerp(1, 0.62 + P.jaw * 0.36, jt);
    sz *= U.lerp(1, 0.9 + P.jaw * 0.08, jt * U.smooth(0, -0.6, z) + jt * 0.3);
    if (y > 0.3) sx *= 1 - (y - 0.3) * 0.08; // temple taper
    let X = x * sx, Y = y * sy, Z = z * sz;
    // flatten face front a bit for a more human profile
    if (z > 0.4) Z -= (z - 0.4) * 0.12;
    // chin
    const chinW = U.smooth(-0.55, -0.98, y) * U.smooth(0.05, 0.6, z);
    Z += chinW * (0.05 + P.chin * 0.08); Y -= chinW * 0.03 * P.chin;
    const chinSq = U.smooth(-0.7, -1, y); X *= 1 + chinSq * (P.jaw - 0.8) * 0.4;
    // cheekbones
    const ck = g3(Math.abs(x), y, z, 0.6, -0.06, 0.68, 0.26); X += Math.sign(x) * ck * P.cheek * 0.06; Z += ck * P.cheek * 0.035;
    // cheek hollow under cheekbone
    Z -= g3(Math.abs(x), y, z, 0.5, -0.38, 0.7, 0.18) * 0.02 * P.cheek;
    // brow ridge
    const br = U.smooth(0.12, 0.26, y) * U.smooth(0.42, 0.24, y) * U.smooth(0.55, 0.85, z) * U.smooth(0.7, 0.3, Math.abs(x));
    Z += br * 0.035;
    // eye sockets
    const sockX = 0.33 * P.eyeSp;
    const sock = g3(Math.abs(x), y, z, sockX, 0.12, 0.93, 0.17); Z -= sock * 0.075;
    // nose: bridge → tip
    const ny = y + 0.02, nTop = 0.2, nTip = -0.2 * P.nl - 0.02;
    if (z > 0.55 && ny < nTop + 0.05 && ny > nTip - 0.12) {
      const tt = U.clamp((nTop - ny) / (nTop - nTip), 0, 1.15);
      const width = (0.045 + tt * 0.07) * P.nw;
      const prof = (tt <= 1 ? (0.02 * P.nb + tt * tt * 0.17 * P.np + Math.sin(tt * Math.PI) * 0.03 * (P.nb - 0.8)) : 0.17 * P.np * Math.max(0, 1 - (tt - 1) * 7));
      const fall = Math.exp(-(x * x) / (width * width));
      Z += prof * fall; Y += P.nup * prof * fall * 0.25;
      // nostril wings
      const wing = g3(Math.abs(x), ny, z, 0.085 * P.nw, nTip + 0.03, 0.9, 0.06) * U.smooth(0.5, 0.9, tt);
      Z += wing * 0.05; X += Math.sign(x) * wing * 0.02;
    }
    // philtrum groove and lips
    const mw = 0.2 * P.mw;
    const lipU = Math.exp(-((y + 0.42) ** 2) / 0.0016) * Math.exp(-(x * x) / (mw * mw)) * U.smooth(0.6, 0.85, z);
    const lipL = Math.exp(-((y + 0.52) ** 2) / 0.0022) * Math.exp(-(x * x) / ((mw * 0.85) ** 2)) * U.smooth(0.6, 0.85, z);
    const bowDip = P.bow ? Math.exp(-(x * x) / 0.0015) * Math.exp(-((y + 0.4) ** 2) / 0.001) * 0.012 : 0;
    Z += lipU * 0.035 * P.mf + lipL * 0.04 * P.mf - bowDip;
    const crease = Math.exp(-((y + 0.47) ** 2) / 0.0004) * Math.exp(-(x * x) / ((mw * 1.05) ** 2)) * U.smooth(0.6, 0.85, z);
    Z -= crease * 0.025;
    Z -= Math.exp(-((y + 0.62) ** 2) / 0.002) * Math.exp(-(x * x) / 0.02) * 0.012 * U.smooth(0.6, 0.85, z); // mentolabial sulcus
    Z -= Math.exp(-(x * x) / 0.0012) * Math.exp(-((y + 0.34) ** 2) / 0.002) * 0.01 * U.smooth(0.6, 0.85, z); // philtrum
    if (out) { out.lip = Math.min(1, (lipU + lipL) * 1.3); out.sock = sock; out.crease = crease; }
    return [X, Y, Z];
  }

  // custom sphere with denser sampling around the face
  function faceSphere(P, segU, segV, mapper) {
    const pos = [], uv = [], col = [], idx = [], w = {};
    for (let i = 0; i <= segV; i++) {
      const v = i / segV, vv = v + 0.45 * Math.sin(U.TAU * v) / U.TAU, phi = vv * Math.PI;
      for (let j = 0; j <= segU; j++) {
        const u = j / segU, s = 2 * u - 1, th = Math.PI * (0.45 * s + 0.55 * s * s * s);
        const x = Math.sin(phi) * Math.sin(th), y = Math.cos(phi), z = Math.sin(phi) * Math.cos(th);
        const p = mapper ? mapper(x, y, z, w) : deform(x, y, z, P, w);
        pos.push(p[0], p[1], p[2]); uv.push(u, 1 - vv);
        const lip = w.lip || 0, sock = w.sock || 0;
        // vertex colour multipliers: lips redder/darker, sockets a touch darker, slight cheek warmth
        const cheek = g3(Math.abs(x), y, z, 0.5, -0.2, 0.8, 0.22) * 0.06;
        col.push(1 - lip * 0.2 - sock * 0.1, 1 - lip * 0.45 - sock * 0.12 - cheek, 1 - lip * 0.42 - sock * 0.12 - cheek);
      }
    }
    const row = segU + 1;
    for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) { const a = i * row + j, b = a + row; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    // weld the u seam (back of head) normals
    const n = g.attributes.normal; for (let i = 0; i <= segV; i++) { const a = i * row, b = a + segU; const nx = n.getX(a) + n.getX(b), ny = n.getY(a) + n.getY(b), nz = n.getZ(a) + n.getZ(b), l = Math.hypot(nx, ny, nz) || 1; n.setXYZ(a, nx / l, ny / l, nz / l); n.setXYZ(b, nx / l, ny / l, nz / l); }
    return g;
  }

  /** surface point helper in unit space for a direction */
  const surf = (P, dx, dy, dz) => { const l = Math.hypot(dx, dy, dz); return deform(dx / l, dy / l, dz / l, P); };

  // Facial hair mask (unit sphere coords). Returns [mask 0..1, thickness, drop].
  function beardMask(style, x, y, z, P) {
    const ax = Math.abs(x), mw = 0.2 * P.mw;
    const lipZone = (y > -0.6 && y < -0.38 && ax < mw * 1.15 && z > 0.5);
    const lower = U.smooth(-0.02, -0.2, y) * U.smooth(-0.5, -0.2, z);
    const cheekLine = y < -0.12 - 0.22 * U.smooth(0.3, 0.75, z) * (1 - U.smooth(0.55, 0.85, ax)); // keep upper cheeks clear
    const side = ax > 0.72 && y > -0.35 && y < 0.18 && z > -0.3 && z < 0.4; // sideburns
    const stache = ax < mw * 1.35 && y > -0.43 && y < -0.3 && z > 0.6;
    const chinZ = ax < 0.26 && y < -0.53 && z > 0.3;
    switch (style) {
      case 'stubble': return [(((lower && cheekLine) || side) && !lipZone) || stache ? 1 : 0, 0.006, 0];
      case 'moustache': return [stache ? 1 : 0, 0.035, 0];
      case 'pencil': return [ax < mw * 1.1 && y > -0.41 && y < -0.37 && z > 0.6 ? 1 : 0, 0.015, 0];
      case 'goatee': return [(chinZ && !lipZone) || stache ? 1 : 0, 0.04, chinZ ? 0.03 : 0];
      case 'chinstrap': { const edge = y < -0.12 && (z < 0.55 || y < -0.72) && z > -0.35 && !lipZone; return [edge || side ? 1 : 0, 0.03, 0]; }
      case 'short': return [(((lower && cheekLine) || side) && !lipZone) || stache ? 1 : 0, 0.045, 0.02];
      case 'full': return [(((lower && cheekLine) || side) && !lipZone) || stache ? 1 : 0, 0.08, 0.08];
      case 'viking': return [(((lower && cheekLine) || side) && !lipZone) || stache ? 1 : 0, 0.11, 0.32];
      default: return [0, 0, 0];
    }
  }
  function beardGeo(style, P, segU, segV) {
    if (!style || style === 'none') return null;
    // Build a displaced copy of the face sphere, then drop triangles outside the mask.
    const masks = [];
    const g = faceSphere(P, segU, segV, (x, y, z) => {
      const [m, th, drop] = beardMask(style, x, y, z, P); masks.push(m);
      const p = deform(x, y, z, P), l = Math.hypot(p[0], p[1], p[2]);
      const dropF = drop * U.smooth(-0.3, -1, y) * (m ? 1 : 0);
      return [p[0] + p[0] / l * th * m * 1.0, p[1] + p[1] / l * th * m - dropF, p[2] + p[2] / l * th * m + dropF * 0.3];
    });
    const I = g.index.array, keep = [];
    for (let i = 0; i < I.length; i += 3) if (masks[I[i]] && masks[I[i + 1]] && masks[I[i + 2]]) keep.push(I[i], I[i + 1], I[i + 2]);
    g.setIndex(keep); g.computeVertexNormals(); g.deleteAttribute('color');
    return g;
  }

  /** Build the full head group. Returns {group, parts} where parts gives animatable bits. */
  function build(app, mats, lod = 1) {
    const P = params(app);
    const R = 0.128; // head radius in metres (stylised, slightly large)
    const grp = new THREE.Group(); grp.name = 'headgeo';
    const S = new THREE.Group(); S.scale.setScalar(R); grp.add(S);
    const segU = lod ? 72 : 32, segV = lod ? 56 : 24;
    const headMesh = new THREE.Mesh(faceSphere(P, segU, segV), mats.face); headMesh.castShadow = true; S.add(headMesh);
    const parts = { P, R, S, head: headMesh };

    // nose tip + alae for crisper definition
    const tip = surf(P, 0, -0.2 * P.nl - 0.02, 1);
    const ng = G.merge([[G.sphere(0.07, 12, 10), G.M.trs(tip[0], tip[1] + 0.01, tip[2] - 0.05, 0, 0, 0, 0.75 * P.nw, 0.62, 0.7)],
      [G.sphere(0.045, 10, 8), G.M.trs(0.07 * P.nw, tip[1] + 0.005, tip[2] - 0.075, 0, 0, 0, 1, 0.8, 0.9)], [G.sphere(0.045, 10, 8), G.M.trs(-0.07 * P.nw, tip[1] + 0.005, tip[2] - 0.075, 0, 0, 0, 1, 0.8, 0.9)]]);
    const nose = new THREE.Mesh(ng, mats.skin); S.add(nose);
    // nostrils (dark)
    const nst = new THREE.Mesh(G.merge([[G.sphere(0.018, 8, 6), G.M.trs(0.035 * P.nw, tip[1] - 0.04, tip[2] - 0.06, 0, 0, 0, 1.3, 0.6, 1)], [G.sphere(0.018, 8, 6), G.M.trs(-0.035 * P.nw, tip[1] - 0.04, tip[2] - 0.06, 0, 0, 0, 1.3, 0.6, 1)]]), mats.dark);
    S.add(nst);

    // eyes
    const E = P.eye, er = 0.135 * P.eyeSize;
    parts.eyes = [];
    for (const side of [1, -1]) {
      const sp = surf(P, side * 0.33 * P.eyeSp, 0.12, 0.93);
      const eg = new THREE.Group(); eg.position.set(sp[0] - side * 0.012, sp[1], sp[2] - er * 0.62);
      eg.rotation.z = side * E.tilt; eg.scale.set(E.w, E.h, 1); S.add(eg);
      const ball = new THREE.Group(); eg.add(ball);
      // one textured eyeball (sclera + iris + pupil + catchlight painted on the sphere) — 1 draw call per eye
      const sclera = new THREE.Mesh(G.sphere(er, lod ? 20 : 10, lod ? 14 : 8), mats.eyeball); sclera.rotation.y = -Math.PI / 2; ball.add(sclera);
      // eyelids: hemispheres rotated about X. Upper pole +Y, lower pole -Y.
      const lidGeo = new THREE.SphereGeometry(er * 1.08, lod ? 20 : 10, 8, 0, U.TAU, 0, Math.PI / 2);
      const upper = new THREE.Mesh(lidGeo, mats.skin); eg.add(upper);
      const lower = new THREE.Mesh(lidGeo, mats.skin); lower.rotation.x = Math.PI; eg.add(lower); if (!lod) lower.visible = false;
      // lash line
      if (lod) { const lash = new THREE.Mesh(new THREE.TorusGeometry(er * 1.09, er * 0.06, 4, 16, Math.PI * 0.9), mats.dark); upper.add(lash); lash.rotation.x = Math.PI / 2; }
      parts.eyes.push({ g: eg, ball, upper, lower, side, open: E.open, er });
    }

    // brows
    const B = D.BROWS.find(b => b.id === app.brow) || D.BROWS[1];
    parts.brows = [];
    for (const side of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const t = k / 4, bx = side * (0.14 + t * 0.32) * P.eyeSp, by = 0.3 + Math.sin(t * Math.PI) * B.arch * 0.06 + (t - 0.5) * B.angle * 0.4 * -1 + (t > 0.6 ? -(t - 0.6) * 0.1 : 0);
        const p = surf(P, bx, by, 0.9); const l = Math.hypot(...p); pts.push(new THREE.Vector3(p[0] * (1 + 0.025 / l), p[1] * (1 + 0.025 / l), p[2] * (1 + 0.025 / l)));
      }
      const th = 0.028 * (B.thick || 1) * (app.browThick || 1);
      const bg = G.tube(pts, t => th * (0.6 + Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * 0.6) * (1 - Math.max(0, t - 0.8) * 2.5), 5, 12);
      const bgrp = new THREE.Group(); const bm = new THREE.Mesh(bg, mats.brow); bgrp.add(bm); S.add(bgrp);
      if (B.slit && side === 1) { const slit = new THREE.Mesh(G.box(0.012, 0.07, 0.03), mats.skin); slit.position.copy(pts[3]).multiplyScalar(1.01); slit.rotation.z = 0.3; bgrp.add(slit); }
      parts.brows.push({ g: bgrp, side, base: pts[2].clone() });
    }

    // ears
    const EA = D.EARS.find(e => e.id === app.ears) || D.EARS[0];
    for (const side of [1, -1]) {
      const p = surf(P, side, 0.02, -0.05);
      const ear = new THREE.Group(); ear.userData.flat = true; ear.position.set(p[0] - side * 0.03, p[1] - 0.02, p[2]); ear.rotation.y = side * (Math.PI / 2 - EA.a); ear.scale.setScalar(EA.s);
      const shell = new THREE.Mesh(G.sphere(0.12, 12, 10), mats.skin); shell.scale.set(0.62, 1, 0.22); shell.position.z = 0.0; ear.add(shell);
      const rim = new THREE.Mesh(G.torus(0.085, 0.022, 6, 14, Math.PI * 1.5), mats.skin); rim.rotation.z = -Math.PI * 0.75 * side + (side < 0 ? Math.PI * 0.5 : 0); rim.position.z = 0.025; rim.scale.set(0.75, 1.15, 1); ear.add(rim);
      const inner = new THREE.Mesh(G.sphere(0.05, 8, 6), mats.earInner); inner.scale.set(0.8, 1.2, 0.4); inner.position.set(0, -0.01, 0.022); ear.add(inner);
      if (EA.pt) { const ptm = new THREE.Mesh(G.cyl(0, 0.03, 0.08, 6), mats.skin); ptm.position.set(0, 0.13, 0); ear.add(ptm); }
      S.add(ear);
      (parts.ears = parts.ears || []).push(ear);
    }

    // mouth: dynamic crease ribbon, interior and teeth
    const mw = 0.2 * P.mw, MN = 9;
    const mouthGeo = new THREE.BufferGeometry(); mouthGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MN * 2 * 3), 3));
    const mi = []; for (let i = 0; i < MN - 1; i++) { const a = i * 2; mi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } mouthGeo.setIndex(mi);
    const mouthLine = new THREE.Mesh(mouthGeo, mats.mouth); mouthLine.frustumCulled = false; S.add(mouthLine);
    const base = []; for (let i = 0; i < MN; i++) { const t = i / (MN - 1), x = (t - 0.5) * 2 * mw * 1.05; const p = surf(P, x, -0.47, 0.9); base.push(p); }
    const interior = new THREE.Mesh(G.sphere(1, 14, 8), mats.mouthIn); const mc = surf(P, 0, -0.47, 1); interior.position.set(0, mc[1], mc[2] - 0.03); interior.scale.set(mw * 0.9, 0.001, 0.03); S.add(interior);
    const teeth = new THREE.Mesh(G.rbox(1, 1, 1, 0.3, 2), mats.teeth); teeth.position.set(0, mc[1] + 0.012, mc[2] - 0.03); teeth.scale.set(mw * 1.4, 0.001, 0.02); S.add(teeth);
    parts.mouth = { line: mouthLine, base, interior, teeth, mw, MN, y0: mc[1] };

    // facial hair
    if (app.facialHair && app.facialHair !== 'none') {
      const bgeo = beardGeo(app.facialHair, P, lod ? 60 : 30, lod ? 48 : 22);
      if (bgeo) { const bm = new THREE.Mesh(bgeo, app.facialHair === 'stubble' ? mats.stubble : mats.beard); bm.castShadow = app.facialHair !== 'stubble'; S.add(bm); parts.beard = bm; }
    }
    return { group: grp, parts };
  }

  /** Update eyelids, eye gaze, brows and mouth from expression state. */
  function animate(parts, st) {
    const blink = st.blink; // 0 open → 1 closed
    for (const e of parts.eyes) {
      const openA = U.lerp(0.25, 0.85, e.open) + st.wide * 0.35 - st.squint * 0.35;
      const up = U.lerp(openA, -Math.PI / 2 + 0.12, blink);
      e.upper.rotation.x = -up;
      e.lower.rotation.x = Math.PI + U.lerp(0.95 - st.squint * 0.35, Math.PI / 2 - 0.1, blink * 0.2);
      e.ball.rotation.y = st.lookX; e.ball.rotation.x = -st.lookY;
    }
    for (const b of parts.brows) { b.g.position.y = st.browUp * 0.05 - st.browDown * 0.03; b.g.rotation.z = b.side * (st.browDown * 0.12 - st.browUp * 0.06); b.g.position.x = -b.side * st.browDown * 0.012; }
    const m = parts.mouth, arr = m.line.geometry.attributes.position.array;
    const smile = st.smile, open = st.open;
    for (let i = 0; i < m.MN; i++) {
      const t = i / (m.MN - 1), c = (t - 0.5) * 2, p = m.base[i];
      const lift = smile * 0.06 * c * c - st.frown * 0.04 * c * c;
      const wide = 1 + smile * 0.12 + st.ooh * -0.35;
      const x = p[0] * wide, y = p[1] + lift, z = p[2] + 0.004;
      const th = 0.008 + open * 0.05 * (1 - c * c) + st.ooh * 0.03 * (1 - c * c);
      arr[i * 6] = x; arr[i * 6 + 1] = y + th * 0.25; arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x; arr[i * 6 + 4] = y - th; arr[i * 6 + 5] = z;
    }
    m.line.geometry.attributes.position.needsUpdate = true;
    const o = Math.max(open, st.ooh * 0.8);
    m.interior.scale.y = 0.001 + o * 0.06; m.interior.position.y = m.y0 - o * 0.03;
    m.interior.scale.x = m.mw * (0.9 + smile * 0.15 - st.ooh * 0.4);
    m.teeth.scale.y = 0.001 + Math.min(1, o * 1.5 + smile * 0.5) * 0.022; m.teeth.scale.x = m.mw * (1.2 + smile * 0.3 - st.ooh * 0.5);
  }
  return { build, animate, params, deform, surf, faceSphere };
})();
