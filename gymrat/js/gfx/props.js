/* Prop library: gym machines (with moving parts + character anchors), furniture, shop fittings, street furniture, vehicles, mirrors. */
'use strict';
GR.Props = (() => {
  const U = GR.U, G = GR.Geo, T = GR.Tex;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const matCache = new Map();
  const std = (hex, r = 0.6, m = 0, extra = {}) => { const k = hex + r + m + JSON.stringify(extra); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(hex), roughness: r, metalness: m }, extra))); return matCache.get(k); };
  const chrome = () => std('#d8dbe0', 0.18, 0.95);
  const blackMetal = () => std('#24262b', 0.4, 0.7);
  const rubber = () => std('#1b1b1d', 0.85, 0);
  const pad = (hex = '#1e1f24') => std(hex, 0.55, 0, { normalMap: T.fabricNormal('leather'), normalScale: new THREE.Vector2(0.4, 0.4) });
  const basic = hex => { const k = 'b' + hex; if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) })); return matCache.get(k); };
  const emissive = (hex, i = 1) => std(hex, 0.4, 0, { emissive: new THREE.Color(hex), emissiveIntensity: i });
  function mesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
  const box = (w, h, d, mat, x, y, z, p, r = 0) => mesh(r ? G.rbox(w, h, d, r, 2) : G.box(w, h, d), mat, x, y, z, 0, 0, 0, p);
  const cyl = (rt, rb, h, mat, x, y, z, p, seg = 14) => mesh(G.cyl(rt, rb, h, seg), mat, x, y, z, 0, 0, 0, p);
  const bar = (len, r, mat, x, y, z, axis, p) => { const m = cyl(r, r, len, mat, x, y, z, p, 10); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; };
  const plate = (r, w, col = '#1b1b1d') => { const g = new THREE.Group(); const m = mesh(G.cyl(r, r, w, 22), std(col, 0.6, 0.2), 0, 0, 0, 0, 0, Math.PI / 2, g); mesh(G.cyl(r * 0.25, r * 0.25, w * 1.05, 12), chrome(), 0, 0, 0, 0, 0, Math.PI / 2, g); mesh(G.torus(r * 0.85, w * 0.15, 4, 22), std(U.shade(col, 0.2), 0.5, 0.2), 0, 0, 0, 0, Math.PI / 2, 0, g); return g; };

  function dumbbell(len = 0.3, col = '#1b1b1d') { const g = new THREE.Group(); bar(len, 0.015, chrome(), 0, 0, 0, 'x', g); for (const s of [-1, 1]) { const h = mesh(G.cyl(0.055, 0.055, 0.07, 6), std(col, 0.5, 0.3), s * len * 0.42, 0, 0, 0, 0, Math.PI / 2, g); } return g; }
  function barbell(len = 2.0, plates = 2) { const g = new THREE.Group(); bar(len, 0.016, chrome(), 0, 0, 0, 'x', g); for (const s of [-1, 1]) { for (let i = 0; i < plates; i++) { const p = plate(0.22 - i * 0.04, 0.045, i ? '#c0392b' : '#1b1b1d'); p.position.x = s * (len * 0.36 + i * 0.05); g.add(p); } bar(0.12, 0.028, chrome(), s * len * 0.31, 0, 0, 'x', g); } return g; }
  function trophy(col = '#e8c45a', s = 1) { const g = new THREE.Group(); const m = std(col, 0.22, 0.9); mesh(G.cyl(0.06 * s, 0.07 * s, 0.03 * s, 12), std('#2b2b2b', 0.4), 0, 0, 0, 0, 0, 0, g); mesh(G.cyl(0.012 * s, 0.02 * s, 0.08 * s, 8), m, 0, 0.05 * s, 0, 0, 0, 0, g); const cup = new THREE.LatheGeometry([V(0, 0, 0), V(0.03, 0.005, 0), V(0.06, 0.05, 0), V(0.07, 0.11, 0), V(0.075, 0.13, 0)].map(v => new THREE.Vector2(v.x * s, v.y * s)), 16); mesh(cup, m, 0, 0.09 * s, 0, 0, 0, 0, g).material.side = THREE.DoubleSide; for (const sd of [-1, 1]) mesh(G.torus(0.03 * s, 0.006 * s, 6, 10, Math.PI), m, sd * 0.075 * s, 0.17 * s, 0, 0, 0, sd * -Math.PI / 2, g); return g; }

  /* ---------------- MIRROR (planar reflector) ---------------- */
  class Mirror extends THREE.Mesh {
    constructor(w, h, res = 512, tint = '#dfe7ea') {
      const rt = new THREE.WebGLRenderTarget(res, Math.round(res * h / w), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
      const texMatrix = new THREE.Matrix4();
      const mat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(tint) }, tDiffuse: { value: rt.texture }, textureMatrix: { value: texMatrix }, live: { value: 1 } },
        vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vU; void main(){ vUv = textureMatrix * vec4(position,1.0); vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 color; uniform sampler2D tDiffuse; uniform float live; varying vec4 vUv; varying vec2 vU; void main(){ vec3 base = texture2DProj(tDiffuse, vUv).rgb; vec3 fall = mix(vec3(0.55,0.62,0.66), vec3(0.85,0.9,0.92), vU.y) * (0.85 + 0.15*sin(vU.x*20.0+vU.y*7.0)); vec3 c = mix(fall, base, live) * color; float edge = smoothstep(0.0,0.02,vU.x)*smoothstep(1.0,0.98,vU.x)*smoothstep(0.0,0.02,vU.y)*smoothstep(1.0,0.98,vU.y); gl_FragColor = vec4(c*mix(0.6,1.0,edge),1.0);\n#include <encodings_fragment>\n}'
      });
      super(new THREE.PlaneGeometry(w, h), mat);
      this.rt = rt; this.texMatrix = texMatrix; this.mcam = new THREE.PerspectiveCamera(); this.isMirror = true; this.live = true;
    }
    renderReflection(renderer, scene, camera) {
      const mw = new THREE.Vector3().setFromMatrixPosition(this.matrixWorld), cw = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      const rot = new THREE.Matrix4().extractRotation(this.matrixWorld), normal = new THREE.Vector3(0, 0, 1).applyMatrix4(rot);
      const view = mw.clone().sub(cw); if (view.dot(normal) > 0) return false;
      view.reflect(normal).negate().add(mw);
      rot.extractRotation(camera.matrixWorld);
      const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cw);
      const target = mw.clone().sub(look).reflect(normal).negate().add(mw);
      const mc = this.mcam; mc.position.copy(view); mc.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal); mc.lookAt(target);
      mc.far = camera.far; mc.updateMatrixWorld(); mc.projectionMatrix.copy(camera.projectionMatrix);
      this.texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      this.texMatrix.multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse).multiply(this.matrixWorld);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, mw); plane.applyMatrix4(mc.matrixWorldInverse);
      const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant), pm = mc.projectionMatrix, q = new THREE.Vector4();
      q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5]; q.z = -1; q.w = (1 + pm.elements[10]) / pm.elements[14];
      clip.multiplyScalar(2 / clip.dot(q)); pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1; pm.elements[14] = clip.w;
      this.visible = false; const cur = renderer.getRenderTarget(); renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene, mc); renderer.setRenderTarget(cur); this.visible = true;
      return true;
    }
    setLive(v) { this.material.uniforms.live.value = v ? 1 : 0; this.live = v; }
  }
  function mirrorFrame(w, h, frameCol = '#2b2b2b', res = 512) {
    const g = new THREE.Group(); const m = new Mirror(w, h, res); m.position.z = 0.012; g.add(m);
    box(w + 0.08, h + 0.08, 0.02, std(frameCol, 0.4, 0.5), 0, 0, 0, g);
    g.userData.mirror = m; return g;
  }

  /* ---------------- GYM MACHINES ---------------- */
  // Each returns { g, parts, anchor: {x,y,z,ry}, anim(p, a) } — the anchor is where the character root goes (local space).
  const frameM = () => std('#2d3038', 0.35, 0.75), accentM = (c = '#d7261e') => std(c, 0.4, 0.4);
  function upright(x, z, h, p) { box(0.06, h, 0.06, frameM(), x, h / 2, z, p); }
  const machines = {
    bench() { const g = new THREE.Group(); box(0.32, 0.08, 1.25, pad(), 0, 0.44, 0.05, g, 0.03); box(0.1, 0.4, 0.1, frameM(), 0, 0.2, 0.45, g); box(0.1, 0.4, 0.1, frameM(), 0, 0.2, -0.4, g); box(0.5, 0.05, 0.08, frameM(), 0, 0.03, 0.45, g); box(0.6, 0.05, 0.08, frameM(), 0, 0.03, -0.45, g);
      for (const s of [-1, 1]) { upright(s * 0.55, -0.42, 1.3, g); box(0.12, 0.04, 0.08, chrome(), s * 0.55, 1.12, -0.37, g); box(0.06, 0.05, 0.9, frameM(), s * 0.55, 0.03, -0.42, g); }
      const bb = barbell(2.0, 2); bb.position.set(0, 1.16, -0.3); g.add(bb);
      return { g, anchor: { x: 0, y: 0, z: 0.42, ry: Math.PI }, anim: (k) => { bb.position.y = U.lerp(0.78, 1.18, k); bb.position.z = -0.2; } }; },
    squat() { const g = new THREE.Group(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) upright(sx * 0.62, sz * 0.55, 2.3, g); for (const sz of [-1, 1]) box(1.3, 0.06, 0.06, frameM(), 0, 2.3, sz * 0.55, g); for (const sx of [-1, 1]) { box(0.06, 0.06, 1.16, frameM(), sx * 0.62, 2.3, 0, g); box(0.08, 0.06, 0.6, chrome(), sx * 0.62, 0.95, 0.05, g); }
      box(1.6, 0.03, 1.6, std('#5a3e2b', 0.8), 0, 0.015, 0, g);
      const bb = barbell(2.1, 3); bb.position.set(0, 1.45, -0.05); g.add(bb);
      return { g, anchor: { x: 0, y: 0.03, z: 0.02, ry: 0 }, anim: k => { bb.position.y = 1.47 - k * 0.46; bb.position.z = -0.08 - k * 0.06; } }; },
    treadmill() { const g = new THREE.Group(); box(0.8, 0.14, 2.0, std('#202227', 0.5, 0.4), 0, 0.07, 0, g, 0.03); const belt = box(0.62, 0.02, 1.8, std('#111', 0.9), 0, 0.15, 0, g); const bt = T.ENV.rubber([1, 4]).map.clone(); bt.needsUpdate = true; belt.material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, map: bt });
      for (const s of [-1, 1]) { box(0.05, 1.2, 0.05, frameM(), s * 0.38, 0.7, 0.85, g); box(0.05, 0.05, 0.5, frameM(), s * 0.38, 1.05, 0.62, g); }
      box(0.82, 0.32, 0.12, std('#1a1c20', 0.3, 0.3), 0, 1.35, 0.9, g, 0.03); const scr = T.screen(['SPEED 0.0', 'DIST 0.00km']); const sm = mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: scr.tex }), 0, 1.36, 0.835, 0, Math.PI, 0, g); g.userData.screen = scr;
      return { g, anchor: { x: 0, y: 0.16, z: -0.15, ry: 0 }, anim: (k, a) => { bt.offset.y -= (a.speed || 0) * (a.dt || 0.016) * 0.9; } }; },
    bike() { const g = new THREE.Group(); box(0.15, 0.08, 1.0, frameM(), 0, 0.05, 0, g); const post = mesh(G.cyl(0.04, 0.05, 0.75, 10), frameM(), 0, 0.42, -0.25, -0.25, 0, 0, g); box(0.26, 0.07, 0.3, pad(), 0, 0.82, -0.32, g, 0.03); mesh(G.cyl(0.04, 0.04, 0.9, 10), frameM(), 0, 0.6, 0.35, 0.35, 0, 0, g); box(0.5, 0.04, 0.04, std('#111', 0.6), 0, 1.05, 0.5, g); mesh(G.cyl(0.25, 0.25, 0.1, 24), accentM(), 0, 0.4, 0.38, 0, 0, Math.PI / 2, g);
      const crank = new THREE.Group(); crank.position.set(0, 0.38, 0.12); g.add(crank); for (const s of [-1, 1]) { const arm = box(0.03, 0.18, 0.03, chrome(), s * 0.12, 0, 0, crank); arm.position.y = s * 0.08; const pedal = box(0.1, 0.02, 0.06, std('#111', 0.7), s * 0.17, s * 0.17, 0, crank); }
      const scr = T.screen(['RPM 0', 'KM 0.0'], '#08140b', '#7f7'); mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ map: scr.tex }), 0, 1.12, 0.55, -0.5, Math.PI, 0, g); g.userData.screen = scr;
      return { g, anchor: { x: 0, y: 0.12, z: -0.28, ry: 0 }, anim: (k, a) => { crank.rotation.x = -(a.phase || 0); } }; },
    rower() { const g = new THREE.Group(); box(0.12, 0.08, 2.4, chrome(), 0, 0.2, 0, g); box(0.08, 0.2, 0.08, frameM(), 0, 0.1, -1.1, g); box(0.4, 0.05, 0.1, frameM(), 0, 0.03, -1.1, g); const fly = mesh(G.cyl(0.28, 0.28, 0.18, 24), std('#2a2d33', 0.4, 0.6), 0, 0.45, 1.15, 0, 0, Math.PI / 2, g); box(0.4, 0.05, 0.1, frameM(), 0, 0.03, 1.1, g);
      const seat = box(0.3, 0.06, 0.3, pad(), 0, 0.3, -0.2, g, 0.02); for (const s of [-1, 1]) box(0.08, 0.03, 0.2, std('#111', 0.8), s * 0.12, 0.27, 0.65, g); const handle = box(0.5, 0.03, 0.03, std('#111', 0.6), 0, 0.6, 0.9, g);
      return { g, anchor: { x: 0, y: 0.03, z: -0.1, ry: 0 }, anim: (k, a) => { const x = a.p || 0; const drive = x < 0.45 ? x / 0.45 : 1 - (x - 0.45) / 0.55; seat.position.z = -0.2 - drive * 0.35; handle.position.z = 0.9 - drive * 0.95; handle.position.y = 0.6 + drive * 0.2; fly.rotation.x += drive * 0.2; } }; },
    dumbbell() { const g = new THREE.Group(); const rack = new THREE.Group(); rack.position.z = -0.9; g.add(rack); box(1.8, 0.06, 0.5, frameM(), 0, 0.55, 0, rack); box(1.8, 0.06, 0.5, frameM(), 0, 0.85, 0.05, rack); for (const s of [-1, 1]) upright(s * 0.85, 0, 0.9, rack);
      for (let i = 0; i < 6; i++) { for (const y of [0.62, 0.92]) { const d = dumbbell(0.3); d.position.set(-0.7 + i * 0.28, y, 0); d.rotation.y = Math.PI / 2; d.scale.setScalar(0.8 + i * 0.06); rack.add(d); } }
      box(1.4, 0.02, 1.4, std('#3c3f46', 0.8), 0, 0.01, 0, g);
      return { g, anchor: { x: 0, y: 0.02, z: 0, ry: 0 }, anim: () => { } }; },
    cable() { const g = new THREE.Group(); const hs = []; for (const s of [-1, 1]) { const t = new THREE.Group(); t.position.x = s * 1.25; g.add(t); box(0.35, 2.3, 0.35, frameM(), 0, 1.15, 0, t); box(0.25, 1.4, 0.06, std('#111', 0.5, 0.5), 0, 0.9, 0.18, t); const pul = mesh(G.cyl(0.06, 0.06, 0.04, 12), chrome(), -s * 0.2, 1.95, 0.2, 0, 0, Math.PI / 2, t); const h = box(0.04, 0.12, 0.04, std('#111', 0.6), -s * 0.55, 1.6, 0.25, g); hs.push(h); }
      box(2.6, 0.08, 0.4, frameM(), 0, 2.35, 0, g);
      const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0x111111 })); g.add(lines);
      return { g, anchor: { x: 0, y: 0, z: 0.25, ry: 0 }, anim: k => { const pts = []; hs.forEach((h, i) => { const s = i ? 1 : -1; h.position.set(s * U.lerp(0.62, 0.18, k), U.lerp(1.55, 1.12, k), U.lerp(0.35, 0.65, k)); pts.push(V(s * 1.05, 1.95, 0.2), h.position.clone()); }); lines.geometry.setFromPoints(pts); } }; },
    latpull() { const g = new THREE.Group(); box(0.12, 2.4, 0.12, frameM(), 0, 1.2, -0.55, g); box(0.12, 0.12, 0.9, frameM(), 0, 2.35, -0.15, g); box(0.38, 0.07, 0.38, pad(), 0, 0.47, 0, g, 0.03); box(0.08, 0.45, 0.08, frameM(), 0, 0.22, 0, g); box(0.36, 0.1, 0.1, pad(), 0, 0.72, 0.18, g, 0.03); box(0.25, 0.9, 0.08, std('#111', 0.5, 0.5), 0, 0.7, -0.5, g);
      const b = box(1.1, 0.03, 0.03, chrome(), 0, 2.0, 0.08, g); const line = box(0.01, 0.4, 0.01, std('#111'), 0, 2.15, 0.08, g);
      return { g, anchor: { x: 0, y: 0.02, z: 0.05, ry: 0 }, anim: k => { b.position.y = U.lerp(2.02, 1.38, k); line.scale.y = (2.35 - b.position.y) / 0.4; line.position.y = (2.35 + b.position.y) / 2; } }; },
    legpress() { const g = new THREE.Group(); box(0.9, 0.08, 2.2, frameM(), 0, 0.05, 0.2, g); const seat = box(0.5, 0.08, 0.5, pad(), 0, 0.4, -0.45, g, 0.03); const back = box(0.5, 0.7, 0.08, pad(), 0, 0.62, -0.78, g, 0.03); back.rotation.x = -0.55; for (const s of [-1, 1]) { const rail = box(0.06, 0.06, 1.5, chrome(), s * 0.4, 0.8, 0.55, g); rail.rotation.x = -0.6; }
      const sled = new THREE.Group(); g.add(sled); box(0.7, 0.6, 0.06, std('#2d3038', 0.4, 0.6), 0, 0, 0, sled); sled.rotation.x = -0.6; for (const s of [-1, 1]) { const p = plate(0.24, 0.05); p.position.set(s * 0.45, 0, -0.1); p.rotation.y = 0; sled.add(p); }
      return { g, anchor: { x: 0, y: 0.05, z: -0.42, ry: 0 }, anim: k => { const d = U.lerp(0.18, 0.62, k); sled.position.set(0, 0.62 + d * 0.55, -0.1 + d * 0.8); } }; },
    chestpress() { const g = new THREE.Group(); box(0.42, 0.08, 0.42, pad(), 0, 0.47, 0, g, 0.03); box(0.42, 0.8, 0.08, pad(), 0, 0.95, -0.25, g, 0.03); box(0.08, 0.45, 0.08, frameM(), 0, 0.22, 0, g); box(0.12, 1.8, 0.12, frameM(), 0, 0.9, -0.5, g); box(0.25, 1.0, 0.08, std('#111', 0.5, 0.5), 0, 0.9, -0.45, g);
      const hs = []; for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(s * 0.32, 1.15, -0.3); g.add(arm); box(0.05, 0.05, 0.6, chrome(), 0, 0, 0.3, arm); box(0.04, 0.14, 0.04, std('#111', 0.6), 0, -0.05, 0.6, arm); hs.push(arm); }
      return { g, anchor: { x: 0, y: 0.03, z: 0.02, ry: 0 }, anim: k => hs.forEach((a, i) => { a.rotation.y = (i ? -1 : 1) * U.lerp(0.5, 0.05, k); a.position.z = -0.3 + k * 0.1; }) }; },
    shoulderpress() { const g = new THREE.Group(); box(0.42, 0.08, 0.42, pad(), 0, 0.47, 0, g, 0.03); box(0.42, 0.85, 0.08, pad(), 0, 0.95, -0.24, g, 0.03); box(0.08, 0.45, 0.08, frameM(), 0, 0.22, 0, g); box(0.12, 2.1, 0.12, frameM(), 0, 1.05, -0.45, g);
      const hs = new THREE.Group(); g.add(hs); for (const s of [-1, 1]) { box(0.04, 0.04, 0.4, chrome(), s * 0.35, 0, 0.1, hs); box(0.04, 0.14, 0.04, std('#111', 0.6), s * 0.35, 0, 0.3, hs); } box(0.74, 0.04, 0.04, chrome(), 0, 0, -0.1, hs);
      return { g, anchor: { x: 0, y: 0.03, z: 0.02, ry: 0 }, anim: k => { hs.position.set(0, U.lerp(1.38, 1.95, k), -0.18); } }; },
    curl() { const g = new THREE.Group(); box(0.4, 0.08, 0.4, pad(), 0, 0.47, 0, g, 0.03); box(0.08, 0.45, 0.08, frameM(), 0, 0.22, 0, g); const p = box(0.6, 0.08, 0.32, pad(), 0, 0.92, 0.42, g, 0.03); p.rotation.x = 0.6; box(0.08, 0.9, 0.08, frameM(), 0, 0.45, 0.55, g);
      const h = new THREE.Group(); h.position.set(0, 0.85, 0.62); g.add(h); box(0.6, 0.03, 0.03, chrome(), 0, 0, 0.18, h); for (const s of [-1, 1]) box(0.03, 0.03, 0.2, chrome(), s * 0.3, 0, 0.08, h);
      return { g, anchor: { x: 0, y: 0.03, z: 0.0, ry: 0 }, anim: k => { h.rotation.x = -U.lerp(0.1, 1.9, k); } }; },
    pullup() { const g = new THREE.Group(); for (const s of [-1, 1]) { upright(s * 0.7, 0, 2.45, g); box(0.4, 0.05, 0.4, frameM(), s * 0.7, 0.025, 0, g); } bar(1.5, 0.02, chrome(), 0, 2.35, 0.05, 'x', g);
      return { g, anchor: { x: 0, y: 0, z: 0.05, ry: 0 }, anim: () => { } }; },
    dips() { const g = new THREE.Group(); for (const s of [-1, 1]) { upright(s * 0.3, 0.45, 1.25, g); upright(s * 0.3, -0.45, 1.25, g); bar(1.0, 0.025, chrome(), s * 0.3, 1.25, 0, 'z', g); }
      return { g, anchor: { x: 0, y: 0, z: 0.05, ry: 0 }, anim: () => { } }; },
    pushup() { const g = new THREE.Group(); box(0.8, 0.02, 1.9, std('#2a7f62', 0.9), 0, 0.01, 0.3, g, 0.008); return { g, anchor: { x: 0, y: 0.02, z: 0.0, ry: 0 }, anim: () => { } }; },
    punch() { const g = new THREE.Group(); box(0.08, 2.6, 0.08, frameM(), 0, 1.3, -1.1, g); box(0.08, 0.08, 1.0, frameM(), 0, 2.6, -0.6, g); const bag = new THREE.Group(); bag.position.set(0, 2.55, -0.15); g.add(bag); mesh(G.cyl(0.004, 0.004, 0.45, 4), std('#888', 0.3, 0.9), 0, -0.22, 0, 0, 0, 0, bag); mesh(G.cyl(0.18, 0.18, 1.0, 18), std('#d7261e', 0.55, 0, { normalMap: T.fabricNormal('leather') }), 0, -0.95, 0, 0, 0, 0, bag);
      return { g, anchor: { x: 0, y: 0, z: 0.55, ry: Math.PI }, anim: (k, a) => { bag.rotation.x = U.damp(bag.rotation.x, (a.hit || 0) * 0.25, 4, 0.016); a.hit = (a.hit || 0) * 0.94; } }; }
  };
  function machine(type) { const m = machines[type](); m.type = type; m.g.userData.machine = m; m.g.userData.dyn = true; m.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; }

  /* ---------------- FURNITURE ---------------- */
  function furniture(def, colIdx = 0) {
    const g = new THREE.Group(), col = def.colors[colIdx % def.colors.length], k = def.kind;
    const fab = std(col, 0.85, 0, { normalMap: T.fabricNormal('fleece'), normalScale: new THREE.Vector2(0.5, 0.5) });
    const wood = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.6 }, T.ENV.wood([1, 1], col.length ? (U.luminance(col) < 0.2 ? '#3a2a20' : col) : '#a0703f')));
    const dark = std('#1b1c20', 0.5, 0.2);
    switch (k) {
      case 'sofa': box(2.2, 0.42, 0.9, fab, 0, 0.25, 0, g, 0.06); box(2.2, 0.55, 0.22, fab, 0, 0.62, -0.36, g, 0.08); for (const s of [-1, 1]) box(0.22, 0.6, 0.9, fab, s * 1.0, 0.38, 0, g, 0.08); for (let i = -1; i <= 1; i += 2) box(0.95, 0.14, 0.7, std(U.shade(col, 0.08), 0.9), i * 0.48, 0.52, 0.05, g, 0.06); break;
      case 'sofa_l': box(2.6, 0.42, 0.9, fab, 0, 0.25, -0.55, g, 0.06); box(0.9, 0.42, 1.2, fab, 0.85, 0.25, 0.45, g, 0.06); box(2.6, 0.55, 0.22, fab, 0, 0.62, -0.92, g, 0.08); box(0.22, 0.55, 2.0, fab, 1.2, 0.62, 0, g, 0.08); break;
      case 'armchair': box(0.95, 0.42, 0.9, fab, 0, 0.25, 0, g, 0.06); box(0.95, 0.6, 0.2, fab, 0, 0.65, -0.35, g, 0.08); for (const s of [-1, 1]) box(0.18, 0.55, 0.9, fab, s * 0.4, 0.38, 0, g, 0.06); break;
      case 'beanbag': { const m = mesh(G.sphere(0.48, 18, 14), fab, 0, 0.3, 0, 0, 0, 0, g); m.scale.set(1, 0.65, 1); break; }
      case 'gamechair': box(0.55, 0.1, 0.55, std(col, 0.5), 0, 0.5, 0, g, 0.04); box(0.55, 0.85, 0.12, std(col, 0.5), 0, 0.95, -0.25, g, 0.05); box(0.4, 0.3, 0.13, dark, 0, 1.15, -0.24, g, 0.04); cyl(0.04, 0.04, 0.4, chrome(), 0, 0.25, 0, g); for (let i = 0; i < 5; i++) { const a = i / 5 * U.TAU; box(0.04, 0.04, 0.35, dark, Math.sin(a) * 0.17, 0.05, Math.cos(a) * 0.17, g).rotation.y = a; } break;
      case 'desk': box(1.6, 0.05, 0.75, std(col, 0.4), 0, 0.75, 0, g, 0.01); for (const s of [-1, 1]) box(0.06, 0.75, 0.65, dark, s * 0.75, 0.375, 0, g); box(1.6, 0.02, 0.02, emissive('#ff4fa3', 2), 0, 0.72, 0.37, g); { const mon = box(0.9, 0.5, 0.04, dark, 0, 1.12, -0.2, g, 0.01); mesh(new THREE.PlaneGeometry(0.85, 0.45), emissive('#3a6bff', 1.2), 0, 1.12, -0.177, 0, 0, 0, g); box(0.06, 0.3, 0.06, dark, 0, 0.9, -0.22, g); box(0.5, 0.02, 0.18, dark, 0, 0.79, 0.1, g); box(0.25, 0.45, 0.45, dark, 0.6, 1.0, -0.1, g, 0.02); box(0.01, 0.4, 0.4, emissive('#28e0ff', 1.5), 0.47, 1.0, -0.1, g); } break;
      case 'arcade': box(0.75, 1.75, 0.75, std(col, 0.5), 0, 0.875, 0, g, 0.03); mesh(new THREE.PlaneGeometry(0.55, 0.42), emissive('#06d6a0', 1.2), 0, 1.3, 0.38, -0.25, 0, 0, g); box(0.7, 0.08, 0.3, dark, 0, 1.0, 0.45, g); mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({ map: T.sign('MOG RUN', { bg: '#111', fg: '#ffd23f', w: 256, h: 64 }) }), 0, 1.66, 0.38, 0, 0, 0, g); break;
      case 'bed': box(1.7, 0.35, 2.2, wood, 0, 0.18, 0, g, 0.03); box(1.62, 0.2, 2.1, std('#f4f4f2', 0.9), 0, 0.45, 0, g, 0.06); box(1.64, 0.08, 1.5, fab, 0, 0.56, 0.3, g, 0.04); box(1.7, 0.9, 0.08, wood, 0, 0.6, -1.08, g, 0.02); for (const s of [-1, 1]) box(0.6, 0.14, 0.38, std('#ffffff', 0.9), s * 0.4, 0.62, -0.8, g, 0.06); break;
      case 'bed_race': { const m = std(col, 0.35, 0.2); box(1.3, 0.5, 2.3, m, 0, 0.3, 0, g, 0.15); box(1.1, 0.15, 1.9, std('#f4f4f2', 0.9), 0, 0.58, 0.05, g, 0.05); for (const s of [-1, 1]) for (const z of [-0.75, 0.75]) mesh(G.cyl(0.25, 0.25, 0.2, 18), dark, s * 0.66, 0.25, z, 0, 0, Math.PI / 2, g); box(1.3, 0.5, 0.15, m, 0, 0.75, 1.1, g, 0.05); mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: T.sign('MOG GT', { bg: col, fg: '#fff', w: 256, h: 96 }) }), 0, 0.3, 1.16, 0, 0, 0, g); break; }
      case 'nightstand': box(0.5, 0.5, 0.42, wood, 0, 0.25, 0, g, 0.02); box(0.42, 0.18, 0.02, dark, 0, 0.32, 0.215, g); cyl(0.06, 0.08, 0.3, std('#f4f1de', 0.6), 0.1, 0.65, 0, g); mesh(G.cyl(0.12, 0.16, 0.18, 14, true), emissive('#ffe2a8', 0.6), 0.1, 0.88, 0, 0, 0, 0, g).material.side = THREE.DoubleSide; break;
      case 'rug_round': mesh(G.cyl(1, 1, 0.012, 40), std(col, 1, 0, { normalMap: T.fabricNormal('fleece') }), 0, 0.006, 0, 0, 0, 0, g).receiveShadow = true; mesh(G.torus(0.8, 0.02, 4, 40), std(U.shade(col, -0.25), 1), 0, 0.012, 0, Math.PI / 2, 0, 0, g); break;
      case 'rug_rect': box(2.6, 0.015, 1.8, std(col, 1, 0, { normalMap: T.fabricNormal('fleece'), normalScale: new THREE.Vector2(2, 2) }), 0, 0.008, 0, g); break;
      case 'lamp_floor': cyl(0.2, 0.22, 0.03, dark, 0, 0.015, 0, g); { const pts = [V(0, 0, 0), V(0, 1.4, 0), V(0.3, 1.9, 0), V(0.7, 1.8, 0)]; mesh(G.tube(pts, 0.015, 6, 20), std(col, 0.3, 0.8), 0, 0, 0, 0, 0, 0, g); mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, U.TAU, 0, Math.PI / 2), std(col, 0.3, 0.8, { side: THREE.DoubleSide }), 0.7, 1.75, 0, 0, 0, 0, g); mesh(G.sphere(0.07, 10, 8), emissive('#fff2cc', 2), 0.7, 1.72, 0, 0, 0, 0, g); } g.userData.lightAt = V(0.7, 1.6, 0); break;
      case 'lamp_lava': cyl(0.08, 0.12, 0.2, std('#c0c0c0', 0.2, 0.9), 0, 0.1, 0, g); mesh(new THREE.LatheGeometry([new THREE.Vector2(0.06, 0), new THREE.Vector2(0.1, 0.15), new THREE.Vector2(0.06, 0.35)], 16), std(col, 0.1, 0, { transparent: true, opacity: 0.7, emissive: new THREE.Color(col), emissiveIntensity: 0.8 }), 0, 0.2, 0, 0, 0, 0, g); for (let i = 0; i < 3; i++) mesh(G.sphere(0.035, 8, 6), emissive(col, 1.6), 0, 0.28 + i * 0.07, 0, 0, 0, 0, g).userData.blob = i; break;
      case 'neon': { const tx = T.sign(def.text || 'MOG', { bg: 'transparent', fg: col, w: 512, h: 160, glow: true, font: '"Brush Script MT", "Segoe Script", cursive' }); mesh(new THREE.PlaneGeometry(1.2, 0.38), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false }), 0, 1.7, 0.02, 0, 0, 0, g); box(1.25, 0.42, 0.02, std('#111', 0.5, 0, { transparent: true, opacity: 0.25 }), 0, 1.7, 0, g); break; }
      case 'poster': { const p = def.text === 'LEG DAY' ? T.poster('LEG DAY', '#d7261e', '#1b1b1d', 'NEVER SKIP') : def.text === '2012 FOREVER' ? T.poster('2012 FOREVER', '#ff4fa3', '#28e0ff', 'RETRO NEVER DIES') : T.poster('MOG CITY', '#111', '#f2c94c', 'EST. 2010'); mesh(new THREE.PlaneGeometry(0.62, 0.86), new THREE.MeshStandardMaterial({ map: p, roughness: 0.6 }), 0, 1.6, 0.012, 0, 0, 0, g); box(0.66, 0.9, 0.015, dark, 0, 1.6, 0.0, g); break; }
      case 'plant': cyl(0.22, 0.17, 0.4, std('#d6d3c9', 0.6), 0, 0.2, 0, g); for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU, l = mesh(G.sphere(0.2, 8, 6), std(i % 2 ? '#2f7d32' : '#3f8f3a', 0.7), Math.sin(a) * 0.22, 0.65 + (i % 3) * 0.15, Math.cos(a) * 0.22, 0, a, 0.6, g); l.scale.set(1, 0.15, 0.6); } break;
      case 'cactus': for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.15; cyl(0.06, 0.06, 0.12, std('#c0663d', 0.7), x, 0.06, 0, g); mesh(G.cyl(0.04, 0.045, 0.2 + i * 0.08, 10), std('#4d7c0f', 0.7), x, 0.22 + i * 0.04, 0, 0, 0, 0, g); } break;
      case 'palm': cyl(0.25, 0.2, 0.45, std('#7c4a2d', 0.7), 0, 0.22, 0, g); cyl(0.03, 0.04, 1.2, std('#6b5b3e', 0.8), 0, 1.0, 0, g); for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU; const l = mesh(G.box(0.12, 0.01, 0.8), std('#3f6f2a', 0.7), Math.sin(a) * 0.35, 1.6, Math.cos(a) * 0.35, 0.5, a, 0, g); l.rotation.order = 'YXZ'; l.rotation.set(0.6, a, 0); } break;
      case 'shelf': box(1.2, 1.8, 0.38, wood, 0, 0.9, 0, g, 0.01); for (let i = 0; i < 3; i++) box(1.12, 0.03, 0.34, std(U.shade(col.length ? col : '#7c4a2d', 0.1), 0.6), 0, 0.5 + i * 0.5, 0.02, g); g.userData.slots = [0, 1, 2].flatMap(i => [-0.35, 0, 0.35].map(x => V(x, 0.52 + i * 0.5, 0.05))).slice(0, def.display); break;
      case 'trophycase': box(1.2, 1.9, 0.5, std(col, 0.4, 0.3), 0, 0.95, 0, g, 0.02); box(1.1, 1.75, 0.02, std('#bfe3ff', 0.05, 0.2, { transparent: true, opacity: 0.25 }), 0, 0.98, 0.25, g); for (let i = 0; i < 3; i++) box(1.08, 0.025, 0.44, std('#e8e8e8', 0.2, 0.5), 0, 0.45 + i * 0.5, 0, g); mesh(G.box(1.05, 0.02, 0.02), emissive('#fff2cc', 1.2), 0, 1.82, 0.2, 0, 0, 0, g); g.userData.slots = [0, 1, 2].flatMap(i => [-0.38, -0.13, 0.13, 0.38].map(x => V(x, 0.47 + i * 0.5, 0.02))).slice(0, def.display); break;
      case 'bookshelf': box(1.0, 1.9, 0.35, wood, 0, 0.95, 0, g, 0.01); { const r = U.rng(def.id); for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) { const h = 0.2 + r() * 0.12; box(0.07, h, 0.22, std(U.pick(['#7f1d1d', '#1e3a5f', '#3f4a2c', '#d9b26b', '#f4f4f2', '#111']), 0.7), -0.4 + j * 0.1, 0.3 + i * 0.45 + h / 2 - 0.12, 0.04, g); } } break;
      case 'tv': box(1.8, 0.5, 0.45, std(col, 0.5), 0, 0.25, 0, g, 0.02); box(1.6, 0.92, 0.05, dark, 0, 1.05, -0.1, g, 0.01); { const scr = T.screen(['MOG TV', 'Now: Gym Rat 2000 OST'], '#111', '#fff'); const s = mesh(new THREE.PlaneGeometry(1.52, 0.85), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), 0, 1.05, -0.074, 0, 0, 0, g); g.userData.screen = scr; g.userData.screenMesh = s; } break;
      case 'coffeetable': box(1.1, 0.05, 0.6, std(col, 0.3, 0.1), 0, 0.42, 0, g, 0.02); for (const s of [-1, 1]) for (const z of [-1, 1]) cyl(0.025, 0.025, 0.4, dark, s * 0.48, 0.2, z * 0.24, g); break;
      case 'punchbag': { const m = machines.punch(); m.g.scale.setScalar(0.9); g.add(m.g); g.userData.machine = m; break; }
      case 'dbrack': { const m = machines.dumbbell(); g.add(m.g); g.userData.machine = m; break; }
      case 'fridge_mini': box(0.55, 0.85, 0.55, std(col, 0.3, 0.3), 0, 0.425, 0, g, 0.03); box(0.04, 0.3, 0.04, chrome(), 0.2, 0.55, 0.29, g); break;
      case 'mirror': { const mf = mirrorFrame(0.6, 1.6, col, 256); mf.position.set(0, 0.95, 0); g.add(mf); g.userData.mirror = mf.userData.mirror; box(0.5, 0.04, 0.3, std(col, 0.4, 0.5), 0, 0.02, -0.1, g); break; }
      default: box(def.w, 0.5, def.d, fab, 0, 0.25, 0, g);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = !def.flat; o.receiveShadow = true; } });
    return g;
  }

  /* ---------------- SHOP FITTINGS ---------------- */
  function hanger(item, colIdx) {
    const g = new THREE.Group(); const col = GR.Char.itemColor(item, colIdx);
    mesh(G.torus(0.02, 0.003, 4, 8, Math.PI * 1.4), chrome(), 0, 0.04, 0, 0, Math.PI / 2, 0, g);
    const isTop = item.slot === 'top';
    const shape = new THREE.Shape(); if (isTop) { shape.moveTo(-0.22, 0); shape.lineTo(-0.3, -0.12); shape.lineTo(-0.22, -0.16); shape.lineTo(-0.18, -0.1); shape.lineTo(-0.18, -0.6); shape.lineTo(0.18, -0.6); shape.lineTo(0.18, -0.1); shape.lineTo(0.22, -0.16); shape.lineTo(0.3, -0.12); shape.lineTo(0.22, 0); shape.lineTo(0.08, 0.02); shape.quadraticCurveTo(0, -0.05, -0.08, 0.02); } else { shape.moveTo(-0.18, 0); shape.lineTo(0.18, 0); shape.lineTo(0.2, item.kind.includes('short') ? -0.4 : -0.85); shape.lineTo(0.03, item.kind.includes('short') ? -0.4 : -0.85); shape.lineTo(0, -0.2); shape.lineTo(-0.03, item.kind.includes('short') ? -0.4 : -0.85); shape.lineTo(-0.2, item.kind.includes('short') ? -0.4 : -0.85); }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    geo.computeBoundingBox(); const bb = geo.boundingBox; const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x) * 0.5 + 0.25, (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y) * 0.75 + 0.2);
    mesh(geo, new THREE.MeshStandardMaterial({ map: T.clothing(item, col, isTop ? 'torso' : 'leg'), roughness: 0.85 }), 0, 0.0, -0.02, 0, 0, 0, g);
    return g;
  }
  function clothingRack(items) {
    const g = new THREE.Group(); for (const s of [-1, 1]) { cyl(0.02, 0.02, 1.5, chrome(), s * 0.9, 0.75, 0, g); box(0.05, 0.03, 0.5, chrome(), s * 0.9, 0.02, 0, g); }
    bar(1.85, 0.015, chrome(), 0, 1.5, 0, 'x', g);
    items.slice(0, 7).forEach((it, i) => { const h = hanger(it, i % it.colors.length); h.position.set(-0.75 + i * 0.25, 1.46, 0); h.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.15; g.add(h); });
    return g;
  }
  function shoeShelf(items) {
    const g = new THREE.Group(); box(2, 2.2, 0.4, std('#f4f1ea', 0.5), 0, 1.1, -0.05, g); for (let i = 0; i < 5; i++) box(1.9, 0.03, 0.4, std('#e8e2d6', 0.4), 0, 0.3 + i * 0.42, 0.02, g);
    items.forEach((it, i) => { if (i >= 15) return; const row = Math.floor(i / 3), col = i % 3; const sh = GR.Char && GR.Props.shoeModel(it, i % it.colors.length); sh.position.set(-0.6 + col * 0.6, 0.38 + row * 0.42, 0.05); sh.rotation.y = 0.5; g.add(sh); });
    mesh(new THREE.PlaneGeometry(0.5, 0.25), emissive('#ffffff', 0.2), 0, 2.32, 0.16, 0, 0, 0, g);
    return g;
  }
  function shoeModel(it, ci) { // display shoe (reuse character shoe builder through a mini character-less path)
    const g = new THREE.Group(); const hex = GR.Char.itemColor(it, ci);
    const tmp = { track: o => o, outfit: {}, mats: {} };
    const built = GR.Char.Character.prototype.buildShoe.call(tmp, it, hex, 1); built.position.y = 0.075; g.add(built); g.scale.setScalar(1.2); return g;
  }
  function counter(w = 2.4, col = '#2b2f36', top = '#f4f1ea') { const g = new THREE.Group(); box(w, 1.0, 0.7, std(col, 0.5, 0.2), 0, 0.5, 0, g, 0.02); box(w + 0.1, 0.05, 0.8, std(top, 0.3, 0.1), 0, 1.02, 0, g, 0.01); box(0.4, 0.25, 0.3, std('#111', 0.4, 0.4), w * 0.3, 1.18, 0, g, 0.02); mesh(new THREE.PlaneGeometry(0.3, 0.16), emissive('#33ccff', 0.8), w * 0.3, 1.22, 0.152, -0.2, 0, 0, g); return g; }
  function mannequin(outfit) { const app = GR.Data.app({ skin: '#e9e9ea', hair: 'bald', face: 'oval', muscle: 0.3, build: 0.4 }); const c = new GR.Char.Character(app, outfit, { lod: 0 }); c.headParts.eyes.forEach(e => e.g.visible = false); c.headParts.brows.forEach(b => b.g.visible = false); c.headParts.mouth.line.visible = false; c.root.userData.mannequin = true; c.root.userData.dyn = true; const stand = mesh(G.cyl(0.25, 0.28, 0.06, 20), chrome(), 0, 0.03, 0, 0, 0, 0, c.root); c.update(0.1); return c; }
  function changingCubicle(curtainCol = '#7b2cbf') { const g = new THREE.Group(); const wall = std('#ece6da', 0.7); box(0.08, 2.3, 1.6, wall, -0.8, 1.15, 0, g); box(0.08, 2.3, 1.6, wall, 0.8, 1.15, 0, g); box(1.68, 2.3, 0.08, wall, 0, 1.15, -0.8, g); bar(1.6, 0.012, chrome(), 0, 2.2, 0.78, 'x', g);
    const curtain = new THREE.Group(); curtain.position.set(0, 2.18, 0.78); g.add(curtain); const cg = new THREE.PlaneGeometry(0.75, 2.0, 12, 1); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.03); cg.computeVertexNormals(); const cm = std(curtainCol, 0.9, 0, { side: THREE.DoubleSide }); const c1 = mesh(cg, cm, -0.42, -1.0, 0, 0, 0, 0, curtain); const c2 = mesh(cg, cm, 0.42, -1.0, 0, 0, 0, 0, curtain);
    box(1.0, 0.08, 0.4, std('#7c4a2d', 0.6), 0, 0.45, -0.55, g); for (let i = 0; i < 3; i++) mesh(G.cyl(0.015, 0.015, 0.1, 6), chrome(), -0.3 + i * 0.3, 1.8, -0.74, Math.PI / 2, 0, 0, g);
    const mf = mirrorFrame(0.55, 1.5, '#d9b26b', 256); mf.position.set(0.74, 1.15, 0); mf.rotation.y = -Math.PI / 2; g.add(mf);
    g.userData.curtains = [c1, c2]; g.userData.mirror = mf.userData.mirror;
    g.userData.dyn = true;
    g.userData.setOpen = o => { c1.position.x = o ? -0.7 : -0.42; c2.position.x = o ? 0.7 : 0.42; c1.scale.x = c2.scale.x = o ? 0.35 : 1; };
    return g; }
  function lockers(n = 6, col = '#2c5d8f') { const g = new THREE.Group(); const doors = []; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.42; box(0.42, 1.9, 0.5, std(U.shade(col, -0.2), 0.4, 0.6), x, 0.95, 0, g); const dg = new THREE.Group(); dg.position.set(x - 0.2, 0.95, 0.255); g.add(dg); box(0.39, 1.84, 0.02, std(col, 0.35, 0.6), 0.2, 0, 0, dg); for (let k = 0; k < 4; k++) box(0.25, 0.015, 0.01, std('#111', 0.6), 0.2, 0.75 - k * 0.04, 0.012, dg); box(0.03, 0.12, 0.03, chrome(), 0.35, 0, 0.02, dg); doors.push(dg); } g.userData.doors = doors; g.userData.dyn = true; return g; }
  function vending(type) {
    const v = GR.Data.VENDING[type], g = new THREE.Group(), col = v.col;
    box(1.0, 2.0, 0.8, std(col, 0.35, 0.3), 0, 1.0, 0, g, 0.04); box(0.7, 1.3, 0.02, std('#bfe3ff', 0.05, 0.1, { transparent: true, opacity: 0.35 }), -0.08, 1.15, 0.405, g);
    mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: T.sign(v.n, { bg: [U.shade(col, 0.3), col], fg: '#fff', w: 512, h: 128 }), toneMapped: false }), 0, 1.86, 0.41, 0, 0, 0, g);
    const r = U.rng(type); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const c = U.pick(['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#f4f4f2', '#ec4899']); if (type === 'mystery') mesh(G.sphere(0.06, 10, 8), std(c, 0.15, 0.1), -0.35 + x * 0.17, 0.7 + y * 0.28, 0.25, 0, 0, 0, g); else if (type === 'drink') cyl(0.035, 0.035, 0.16, std(c, 0.2, 0.5), -0.35 + x * 0.17, 0.72 + y * 0.28, 0.25, g); else box(0.11, 0.14, 0.06, std(c, 0.5), -0.35 + x * 0.17, 0.72 + y * 0.28, 0.25, g); }
    box(0.18, 0.5, 0.04, std('#1b1b1d', 0.4, 0.5), 0.38, 1.15, 0.41, g); mesh(new THREE.PlaneGeometry(0.12, 0.08), emissive('#7cff6b', 1), 0.38, 1.3, 0.432, 0, 0, 0, g); box(0.6, 0.18, 0.05, std('#111', 0.3, 0.5), -0.08, 0.3, 0.41, g);
    const tray = new THREE.Group(); tray.position.set(-0.08, 0.32, 0.38); g.add(tray); g.userData.tray = tray; g.userData.dyn = true;
    g.add(new THREE.PointLight(0x000000, 0)); // placeholder keeps child indices stable
    return g;
  }
  function barberChair(col = '#7f1d1d') { const g = new THREE.Group(); cyl(0.3, 0.32, 0.06, chrome(), 0, 0.03, 0, g); cyl(0.07, 0.07, 0.4, chrome(), 0, 0.25, 0, g); box(0.6, 0.12, 0.55, std(col, 0.4, 0, { normalMap: T.fabricNormal('leather') }), 0, 0.5, 0, g, 0.05); box(0.6, 0.75, 0.12, std(col, 0.4, 0, { normalMap: T.fabricNormal('leather') }), 0, 0.92, -0.25, g, 0.05); box(0.3, 0.15, 0.1, std(col, 0.4), 0, 1.38, -0.22, g, 0.04); for (const s of [-1, 1]) { box(0.08, 0.06, 0.5, chrome(), s * 0.32, 0.72, 0, g); } box(0.4, 0.04, 0.2, chrome(), 0, 0.25, 0.32, g); return g; }
  function bottle(col, h = 0.18, label = 'GLOW') { const g = new THREE.Group(); cyl(0.04, 0.045, h, std(col, 0.15, 0.05, { transparent: true, opacity: 0.92 }), 0, h / 2, 0, g); cyl(0.02, 0.02, 0.05, std('#f4f4f2', 0.3), 0, h + 0.025, 0, g); mesh(new THREE.PlaneGeometry(0.06, h * 0.5), new THREE.MeshStandardMaterial({ map: T.label(label, col), roughness: 0.5 }), 0, h * 0.5, 0.046, 0, 0, 0, g); return g; }

  /* ---------------- STREET FURNITURE & NATURE ---------------- */
  const leafMats = ['#3f7d2f', '#4f8f3a', '#2f6b2a', '#5c9c45', '#6b8f2a'].map(c => std(c, 0.85));
  function tree(seed = 1, s = 1) {
    const r = U.rng(seed), g = new THREE.Group();
    const h = (2.5 + r() * 1.5) * s; mesh(G.cyl(0.09 * s, 0.16 * s, h, 8), std('#5b4330', 0.9), 0, h / 2, 0, 0, 0, 0, g);
    const lm = leafMats[Math.floor(r() * leafMats.length)];
    for (let i = 0; i < 6; i++) { const geo = new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1); const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const f = 1 + (r() - 0.5) * 0.25; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f, p.getZ(k) * f); } geo.computeVertexNormals(); mesh(geo, lm, (r() - 0.5) * 1.4 * s, h + (r() - 0.2) * 1.0 * s, (r() - 0.5) * 1.4 * s, 0, 0, 0, g); }
    return g;
  }
  function palm(seed = 1) { const r = U.rng(seed), g = new THREE.Group(); const pts = []; for (let i = 0; i <= 6; i++) pts.push(V(Math.sin(i * 0.3) * 0.25, i * 0.9, 0)); mesh(G.tube(pts, t => 0.18 - t * 0.07, 7, 18), std('#8a6a48', 0.9), 0, 0, 0, 0, 0, 0, g); const top = pts[6]; for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU; const leaf = []; for (let k = 0; k <= 5; k++) leaf.push(V(Math.sin(a) * k * 0.5, -Math.pow(k / 5, 2) * 1.5 + k * 0.12, Math.cos(a) * k * 0.5)); const lg = G.tube(leaf, t => 0.16 * (1 - t), 3, 10); lg.scale(1, 0.25, 1); mesh(lg, leafMats[i % 3], top.x, top.y, top.z, 0, 0, 0, g); } return g; }
  function bush(seed = 1, s = 1) { const r = U.rng(seed), g = new THREE.Group(); for (let i = 0; i < 4; i++) mesh(new THREE.IcosahedronGeometry((0.45 + r() * 0.3) * s, 1), leafMats[Math.floor(r() * 5)], (r() - 0.5) * 0.8 * s, 0.35 * s, (r() - 0.5) * 0.8 * s, 0, 0, 0, g); return g; }
  function parkBench() { const g = new THREE.Group(); const wood = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.7 }, T.ENV.wood([1, 1], '#9a6a3a'))); for (let i = 0; i < 3; i++) box(1.8, 0.04, 0.12, wood, 0, 0.45, -0.15 + i * 0.14, g); for (let i = 0; i < 2; i++) box(1.8, 0.12, 0.04, wood, 0, 0.62 + i * 0.16, -0.27, g).rotation.x = -0.15; for (const s of [-1, 1]) { box(0.06, 0.45, 0.5, blackMetal(), s * 0.8, 0.22, 0, g); box(0.06, 0.4, 0.05, blackMetal(), s * 0.8, 0.68, -0.27, g); } return g; }
  function bin() { const g = new THREE.Group(); cyl(0.25, 0.22, 0.9, std('#2f5d3a', 0.5, 0.4), 0, 0.45, 0, g); cyl(0.27, 0.27, 0.06, std('#1e3a26', 0.5, 0.4), 0, 0.92, 0, g); return g; }
  function streetLight() { const g = new THREE.Group(); cyl(0.07, 0.1, 5.5, blackMetal(), 0, 2.75, 0, g); box(0.08, 0.08, 1.4, blackMetal(), 0, 5.45, 0.65, g); box(0.35, 0.12, 0.55, blackMetal(), 0, 5.4, 1.3, g); const lamp = mesh(new THREE.PlaneGeometry(0.3, 0.5), std('#fff3c4', 0.3, 0, { emissive: new THREE.Color('#ffe7a0'), emissiveIntensity: 0 }), 0, 5.33, 1.3, Math.PI / 2, 0, 0, g); g.userData.lamp = lamp; g.userData.pool = V(0, 0, 1.3); return g; }
  function trafficLight() { const g = new THREE.Group(); cyl(0.06, 0.08, 3.2, blackMetal(), 0, 1.6, 0, g); box(0.3, 0.9, 0.25, std('#1b1b1d', 0.5), 0, 3.4, 0, g); const ls = ['#ff3b30', '#ffcc00', '#34c759'].map((c, i) => mesh(G.cyl(0.09, 0.09, 0.05, 12), std(c, 0.3, 0, { emissive: new THREE.Color(c), emissiveIntensity: 0.15 }), 0, 3.68 - i * 0.28, 0.13, Math.PI / 2, 0, 0, g)); g.userData.lights = ls; return g; }
  function busStop() { const g = new THREE.Group(); box(3, 0.08, 1.4, std('#1b1b1d', 0.4, 0.6), 0, 2.5, 0, g); for (const x of [-1.4, 1.4]) cyl(0.05, 0.05, 2.5, blackMetal(), x, 1.25, -0.6, g); box(2.9, 2.1, 0.03, std('#bfe3ff', 0.05, 0.1, { transparent: true, opacity: 0.3 }), 0, 1.3, -0.65, g); box(2.4, 0.06, 0.4, std('#7c4a2d', 0.6), 0, 0.5, -0.4, g); mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshStandardMaterial({ map: T.poster('MOG ENERGY', '#a3e635', '#111', 'UNHINGED HYDRATION') }), 1.2, 1.4, -0.62, 0, 0, 0, g); const s = mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: T.sign('BUS', { bg: '#1b4dff', fg: '#fff', w: 128, h: 64 }) }), -1.4, 2.7, -0.6, 0, 0, 0, g); return g; }
  function hydrant() { const g = new THREE.Group(); cyl(0.12, 0.14, 0.6, std('#d7261e', 0.5, 0.2), 0, 0.3, 0, g); mesh(G.sphere(0.13, 10, 8), std('#d7261e', 0.5, 0.2), 0, 0.62, 0, 0, 0, 0, g); bar(0.4, 0.05, std('#d7261e', 0.5, 0.2), 0, 0.45, 0, 'x', g); return g; }
  function planter(seed, w = 2) { const g = new THREE.Group(); box(w, 0.5, 0.8, std('#8d8a84', 0.8), 0, 0.25, 0, g, 0.03); box(w - 0.1, 0.05, 0.7, std('#4a3524', 0.95), 0, 0.5, 0, g); const b = bush(seed, 0.8); b.position.y = 0.4; g.add(b); return g; }
  function fountain() { const g = new THREE.Group(); const stone = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.6 }, T.ENV.marble([2, 2]))); mesh(G.cyl(4.2, 4.4, 0.6, 40), stone, 0, 0.3, 0, 0, 0, 0, g); const water = mesh(G.cyl(3.9, 3.9, 0.05, 40), new THREE.MeshStandardMaterial(Object.assign({ color: 0x9bd3ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }, { map: T.ENV.water([3, 3]).map })), 0, 0.5, 0, 0, 0, 0, g); cyl(0.6, 0.8, 1.6, stone, 0, 1.1, 0, g); mesh(G.cyl(1.6, 1.2, 0.3, 30), stone, 0, 1.95, 0, 0, 0, 0, g); cyl(0.25, 0.3, 0.9, stone, 0, 2.5, 0, g);
    const jet = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(600 * 3), 3)), new THREE.PointsMaterial({ color: 0xdff4ff, size: 0.08, transparent: true, opacity: 0.8 })); g.add(jet); g.userData.jet = jet; g.userData.water = water; return g; }
  function hoop() { const g = new THREE.Group(); cyl(0.1, 0.12, 3.0, std('#1b4dff', 0.4, 0.5), 0, 1.5, -0.9, g); box(0.1, 0.1, 1.0, std('#1b4dff', 0.4, 0.5), 0, 3.1, -0.45, g); box(1.8, 1.05, 0.05, std('#f4f4f2', 0.2, 0, { transparent: true, opacity: 0.85 }), 0, 3.4, 0, g); mesh(new THREE.PlaneGeometry(0.59, 0.45), new THREE.MeshBasicMaterial({ map: T.sign('', { bg: 'transparent', fg: '#d7261e', border: '#d7261e', w: 128, h: 96 }), transparent: true }), 0, 3.25, 0.03, 0, 0, 0, g); mesh(G.torus(0.23, 0.012, 6, 20), std('#ff5a1f', 0.4, 0.6), 0, 3.05, 0.3, Math.PI / 2, 0, 0, g); const net = mesh(G.cyl(0.23, 0.15, 0.4, 12, true), std('#ffffff', 0.9, 0, { wireframe: true }), 0, 2.85, 0.3, 0, 0, 0, g); g.userData.rim = V(0, 3.05, 0.3); g.userData.net = net; g.userData.dyn = true; return g; }
  function car(seed = 1) {
    const r = U.rng(seed), g = new THREE.Group(); const col = U.pick(['#d7261e', '#1b4dff', '#f4f4f2', '#111111', '#7f8c8d', '#f2c94c', '#10b981', '#7b2cbf', '#2c3e66', '#e67e22']);
    const paint = std(col, 0.25, 0.6), glass = std('#22303a', 0.05, 0.6, { transparent: true, opacity: 0.85 }), type = Math.floor(r() * 3);
    const L = type === 2 ? 4.8 : 4.2, W = 1.8, H = type === 1 ? 0.75 : 0.6;
    const bodyG = G.rbox(W, H, L, 0.18, 3); mesh(bodyG, paint, 0, 0.32 + H / 2, 0, 0, 0, 0, g);
    const cabin = G.rbox(W * 0.86, type === 1 ? 0.7 : 0.55, L * (type === 2 ? 0.48 : 0.55), 0.18, 3); const cb = mesh(cabin, paint, 0, 0.32 + H + 0.26, type === 2 ? 0.2 : -0.1, 0, 0, 0, g);
    const wg = G.rbox(W * 0.88, type === 1 ? 0.55 : 0.42, L * (type === 2 ? 0.44 : 0.51), 0.14, 2); mesh(wg, glass, 0, 0.32 + H + 0.27, cb.position.z, 0, 0, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = mesh(G.cyl(0.34, 0.34, 0.24, 16), rubber(), sx * (W / 2 - 0.08), 0.34, sz * L * 0.32, 0, 0, Math.PI / 2, g); mesh(G.cyl(0.2, 0.2, 0.25, 10), chrome(), sx * (W / 2 - 0.08), 0.34, sz * L * 0.32, 0, 0, Math.PI / 2, g); }
    const hl = []; for (const sx of [-1, 1]) { hl.push(mesh(G.box(0.35, 0.12, 0.05), std('#fffbe6', 0.2, 0, { emissive: new THREE.Color('#fff1b8'), emissiveIntensity: 0.2 }), sx * 0.6, 0.62, L / 2, 0, 0, 0, g)); mesh(G.box(0.35, 0.12, 0.05), std('#b0161a', 0.3, 0, { emissive: new THREE.Color('#ff2020'), emissiveIntensity: 0.4 }), sx * 0.6, 0.65, -L / 2, 0, 0, 0, g); }
    box(1.2, 0.12, 0.05, std('#1b1b1d', 0.4), 0, 0.45, L / 2 + 0.01, g); mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: T.sign('MOG ' + Math.floor(100 + r() * 899), { bg: '#f4f4f2', fg: '#111', w: 128, h: 32 }) }), 0, 0.45, -L / 2 - 0.03, 0, Math.PI, 0, g);
    g.userData.headlights = hl; g.userData.len = L; return g;
  }
  function billboard(title, a, b, sub) { const g = new THREE.Group(); for (const x of [-2.5, 2.5]) cyl(0.12, 0.15, 6, blackMetal(), x, 3, 0, g); box(7, 3.5, 0.2, blackMetal(), 0, 7.5, 0, g); const tex = T.sign(title, { bg: [a, b], fg: '#fff', w: 1024, h: 512, sub }); mesh(new THREE.PlaneGeometry(6.8, 3.3), new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.25 }), 0, 7.5, 0.11, 0, 0, 0, g); return g; }
  function tableSet(col = '#f4f1de', chairs = 2, umbrella = false) { const g = new THREE.Group(); cyl(0.45, 0.45, 0.04, std(col, 0.4), 0, 0.75, 0, g); cyl(0.04, 0.04, 0.75, blackMetal(), 0, 0.37, 0, g); cyl(0.25, 0.25, 0.03, blackMetal(), 0, 0.015, 0, g); const seats = []; for (let i = 0; i < chairs; i++) { const a = i / chairs * U.TAU, c = new THREE.Group(); c.position.set(Math.sin(a) * 0.75, 0, Math.cos(a) * 0.75); c.rotation.y = a + Math.PI; g.add(c); box(0.42, 0.04, 0.42, std('#2b2f36', 0.5, 0.3), 0, 0.46, 0, c); box(0.42, 0.45, 0.04, std('#2b2f36', 0.5, 0.3), 0, 0.7, -0.2, c); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, 0.46, 0.03, blackMetal(), sx * 0.18, 0.23, sz * 0.18, c); seats.push({ x: c.position.x, z: c.position.z, ry: c.rotation.y }); } if (umbrella) { cyl(0.025, 0.025, 2.4, std('#eee', 0.4), 0, 1.2, 0, g); mesh(new THREE.ConeGeometry(1.4, 0.5, 12, 1, true), std(U.pick(['#d7261e', '#1b4dff', '#10b981', '#f2c94c']), 0.7, 0, { side: THREE.DoubleSide }), 0, 2.4, 0, 0, 0, 0, g); } g.userData.seats = seats; return g; }
  function speaker(h = 1.6) { const g = new THREE.Group(); box(0.6, h, 0.5, std('#1b1b1d', 0.6), 0, h / 2, 0, g, 0.02); for (let i = 0; i < 2; i++) mesh(G.cyl(0.18 - i * 0.08, 0.18 - i * 0.08, 0.04, 16), std('#333', 0.4, 0.3), 0, h * (0.35 + i * 0.35), 0.26, Math.PI / 2, 0, 0, g); return g; }
  function crowdRail(len) { const g = new THREE.Group(); bar(len, 0.03, chrome(), 0, 1.0, 0, 'x', g); for (let x = -len / 2; x <= len / 2; x += 1.5) cyl(0.03, 0.03, 1.0, chrome(), x, 0.5, 0, g); return g; }
  return { std, chrome, mesh, box, cyl, bar, plate, dumbbell, barbell, trophy, Mirror, mirrorFrame, machine, machines, furniture, hanger, clothingRack, shoeShelf, shoeModel, counter, mannequin, changingCubicle, lockers, vending, barberChair, bottle,
    tree, palm, bush, parkBench, bin, streetLight, trafficLight, busStop, hydrant, planter, fountain, hoop, car, billboard, tableSet, speaker, crowdRail, emissive, basic };
})();
