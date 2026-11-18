/* Character model: hierarchical rig, sculpted body segments, clothing shells fitted to body proportions, shoes, accessories,
   facial animation (blinking, gaze, expressions, talking). Animation poses come from GR.Anim. */
'use strict';
GR.Char = (() => {
  const U = GR.U, D = GR.Data, G = GR.Geo, T = GR.Tex;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // --- materials ------------------------------------------------------------------------------------------------
  function makeMats(app, lod) {
    const glow = app.cosmetics && app.cosmetics.glow ? 1 : 0;
    const skinCol = new THREE.Color(app.skin);
    const skinBase = { color: skinCol, roughness: glow ? 0.34 : 0.62, metalness: 0, emissive: new THREE.Color(app.skin).multiplyScalar(0.07) };
    const skin = new THREE.MeshStandardMaterial(Object.assign({ map: T.skinMap(), normalMap: lod ? T.skinNormal() : null, normalScale: new THREE.Vector2(0.25, 0.25) }, skinBase));
    const face = new THREE.MeshStandardMaterial(Object.assign({ map: T.faceTex(app), normalMap: lod ? T.skinNormal() : null, normalScale: new THREE.Vector2(0.15, 0.15), vertexColors: true }, skinBase));
    const hairCol = app.hairColor || '#2a211d', browCol = app.browColor || (U.luminance(hairCol) > 0.6 ? U.shade(hairCol, -0.35) : hairCol);
    const facialCol = app.facialColor || hairCol;
    return {
      skin, face,
      earInner: new THREE.MeshStandardMaterial({ color: new THREE.Color(U.shade(app.skin, -0.18)), roughness: 0.7 }),
      eyeball: new THREE.MeshStandardMaterial({ map: T.eyeTex(app.eyeColor || '#3b2416'), roughness: 0.12, metalness: 0 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1a100c, roughness: 0.8 }),
      mouth: new THREE.MeshBasicMaterial({ color: new THREE.Color(U.shade(U.mix(app.skin, '#6b1f1a', 0.55), -0.45)), side: THREE.DoubleSide }),
      mouthIn: new THREE.MeshStandardMaterial({ color: 0x3a1210, roughness: 0.9 }),
      teeth: new THREE.MeshStandardMaterial({ color: 0xf3f0e6, roughness: 0.3 }),
      brow: new THREE.MeshStandardMaterial({ color: new THREE.Color(browCol), roughness: 0.9, map: T.hairTex(browCol) }),
      hair: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.hairTex(hairCol), normalMap: lod ? T.hairNormal() : null, roughness: 0.48, metalness: 0.05, side: THREE.DoubleSide }),
      hairHi: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.hairTex(app.hairHi || hairCol), roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide }),
      buzz: new THREE.MeshStandardMaterial({ map: T.fadeTex(hairCol, app.skin), transparent: true, depthWrite: false, roughness: 0.9 }),
      beard: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.hairTex(facialCol), roughness: 0.8 }),
      stubble: new THREE.MeshStandardMaterial({ color: new THREE.Color(U.mix(facialCol, app.skin, 0.25)), map: T.fadeTex(facialCol, app.skin), transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.95 })
    };
  }
  const metalMat = hex => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.9, roughness: 0.22 });
  const plastic = (hex, r = 0.5) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: r, metalness: 0.05 });

  // --- body dimensions --------------------------------------------------------------------------------------------
  function dims(app) {
    const b = app.build ?? 0.5, s = app.shoulders ?? 0.5, m = app.muscle ?? 0.2, L = 0.95 + (app.legs ?? 0.5) * 0.1;
    return {
      b, s, m, L,
      thigh: 0.42 * L, shin: 0.41 * L, ankle: 0.075,
      hipRx: 0.145 + b * 0.035, hipRz: 0.105 + b * 0.025,
      waistRx: 0.12 + b * 0.05 - m * 0.006, waistRz: 0.09 + b * 0.055,
      chestRx: 0.15 + s * 0.035 + m * 0.035 + b * 0.02, chestRz: 0.1 + m * 0.032 + b * 0.035,
      shX: 0.17 + s * 0.045 + m * 0.025 + b * 0.015,
      armR: 0.039 + m * 0.024 + b * 0.01, foreR: 0.034 + m * 0.014 + b * 0.006,
      thighR: 0.072 + m * 0.022 + b * 0.025, shinR: 0.05 + m * 0.014 + b * 0.012,
      neckR: 0.048 + m * 0.018 + b * 0.008,
      up: 0.29, fore: 0.255
    };
  }
  // body segment profiles (shared by skin meshes and clothing shells)
  function profiles(d) {
    const { m } = d;
    return {
      pelvis: t => [U.lerp(d.waistRx * 1.04, d.hipRx, U.smooth(0, 0.5, t)) * (t > 0.6 ? U.lerp(1, 0.78, (t - 0.6) / 0.4) : 1), U.lerp(d.waistRz, d.hipRz, U.smooth(0, 0.5, t)) * (t > 0.7 ? 0.92 : 1), 0, -0.005],
      abd: t => [U.lerp(d.chestRx * 0.92, d.waistRx, U.smooth(0, 0.7, t)), U.lerp(d.chestRz * 0.98, d.waistRz, U.smooth(0, 0.8, t)), 0, U.lerp(0.012, 0, t)],
      chest: t => { const sh = t < 0.12 ? U.lerp(0.72, 1.06, t / 0.12) : U.lerp(1.06, 0.93, U.smooth(0.12, 1, t)); return [d.chestRx * sh * (1 + m * 0.04), d.chestRz * (t < 0.1 ? U.lerp(0.75, 1, t / 0.1) : 1) * (t > 0.3 && t < 0.75 ? 1.04 : 1), 0, 0.01 * U.smooth(0, 0.4, t)]; },
      up: t => { const r = d.armR * (t < 0.2 ? U.lerp(1.18, 1.05, t / 0.2) : U.lerp(1.05, 0.78, U.smooth(0.3, 1, t))); return [r, r * 0.95, 0, 0]; },
      fore: t => { const r = d.foreR * (t < 0.3 ? U.lerp(1.08, 1.16, t / 0.3) : U.lerp(1.16, 0.66, U.smooth(0.3, 1, t))); return [r, r * 0.82, 0, 0]; },
      thigh: t => { const r = d.thighR * (t < 0.15 ? 1.05 : U.lerp(1.05, 0.62, U.smooth(0.15, 1, t))); return [r, r * 1.02, 0, 0.005]; },
      shin: t => { const r = d.shinR * (t < 0.3 ? U.lerp(0.95, 1.12, t / 0.3) : U.lerp(1.12, 0.6, U.smooth(0.3, 1, t))); return [r * 0.95, r, 0, t < 0.6 ? -0.006 : 0]; }
    };
  }
  // muscle sculpt displacement
  const dispPecs = m => (a, t) => (Math.abs(a) < 1.1 ? Math.exp(-((t - 0.38) ** 2) / 0.02) * Math.cos(a * 1.4) ** 2 * m * 0.09 : 0) + (Math.abs(Math.abs(a) - Math.PI) < 1 ? Math.exp(-((t - 0.3) ** 2) / 0.03) * m * 0.05 : 0);
  const dispBicep = m => (a, t) => Math.exp(-((t - 0.42) ** 2) / 0.03) * Math.max(0, Math.cos(a)) * m * 0.22 + Math.exp(-((t - 0.1) ** 2) / 0.01) * m * 0.08;
  const dispQuad = m => (a, t) => Math.exp(-((t - 0.45) ** 2) / 0.05) * Math.max(0, Math.cos(a)) * m * 0.12;
  const dispCalf = m => (a, t) => Math.exp(-((t - 0.28) ** 2) / 0.02) * Math.max(0, -Math.cos(a)) * (0.06 + m * 0.12);
  const dispAbs = m => (a, t) => Math.abs(a) < 0.6 ? Math.sin(t * 12) * 0.01 * m : 0;

  // --- clothing specs --------------------------------------------------------------------------------------------------
  const TOP = {
    tee: { off: 0.011, sl: 0.45, len: 0.25, collar: 'crew' }, oversized: { off: 0.034, sl: 0.72, slw: 1.45, len: 0.5, collar: 'crew', drop: 0.03 },
    tank: { off: 0.01, sl: 0, len: 0.25, collar: 'scoop' }, singlet: { off: 0.008, sl: 0, len: 0.3, collar: 'deep' },
    jersey: { off: 0.022, sl: 0, len: 0.45, collar: 'v', trim: true }, football: { off: 0.02, sl: 0.45, len: 0.3, collar: 'v', trim: true },
    longsleeve: { off: 0.013, sl: 1, fore: 1, len: 0.28, collar: 'crew' }, hoodie: { off: 0.03, sl: 1, fore: 1, len: 0.42, hood: true, pocket: true, cuffs: true, strings: true, collar: 'none' },
    ziphoodie: { off: 0.03, sl: 1, fore: 1, len: 0.4, hood: true, zip: true, cuffs: true, strings: true, collar: 'none' }, puffer: { off: 0.062, sl: 1, fore: 1, len: 0.3, collar: 'high', zip: true, puffy: true, cuffs: true },
    jacket: { off: 0.038, sl: 1, fore: 1, len: 0.22, collar: 'bomber', zip: true, cuffs: true, band: true }, trackjacket: { off: 0.028, sl: 1, fore: 1, len: 0.25, collar: 'high', zip: true, cuffs: true }
  };
  const BOT = {
    baggyjeans: { off: 0.04, thigh: 1, shin: 1, flare: 1.3, stack: true }, jeans: { off: 0.012, thigh: 1, shin: 1, flare: 1.05 }, cargo: { off: 0.03, thigh: 1, shin: 1, flare: 1.12 },
    trackpants: { off: 0.022, thigh: 1, shin: 1, flare: 0.9, cuff: true }, sweats: { off: 0.03, thigh: 1, shin: 1, flare: 0.85, cuff: true, band: true },
    gymshorts: { off: 0.022, thigh: 0.55 }, bballshorts: { off: 0.05, thigh: 0.95, band: true }, shorts: { off: 0.022, thigh: 0.62 }
  };
  function itemColor(it, c) { if (!it) return '#888'; if (typeof c === 'string') return c; return it.colors[(c || 0) % it.colors.length]; }
  function clothMat(item, hex, part) {
    const fab = T.fabricOf(item.kind);
    const gloss = item.gloss || item.kind === 'puffer' && item.gloss;
    return new THREE.MeshStandardMaterial({ map: T.clothing(item, hex, part), normalMap: T.fabricNormal(fab), normalScale: new THREE.Vector2(0.3, 0.3), roughness: gloss ? 0.22 : fab === 'nylon' ? 0.5 : fab === 'denim' ? 0.88 : 0.82, metalness: gloss ? 0.15 : 0 });
  }

  // --- the Character ------------------------------------------------------------------------------------------------
  class Character {
    constructor(app, outfit, opts = {}) {
      this.app = JSON.parse(JSON.stringify(app));
      this.outfit = JSON.parse(JSON.stringify(outfit || {}));
      this.lod = opts.lod ?? 1;
      this.root = new THREE.Group(); this.root.name = 'char';
      this.root.userData.char = this;
      this.face = { blink: 0, lookX: 0, lookY: 0, smile: 0.15, open: 0, ooh: 0, wide: 0, squint: 0, browUp: 0, browDown: 0, frown: 0 };
      this.faceT = Object.assign({}, this.face);
      this.expr = 'neutral'; this.exprT = 0; this.talkT = 0; this.blinkT = U.rand(1, 4); this.lookT = 0;
      this.disposables = [];
      this.props = {};
      this.build();
      this.anim = GR.Anim ? new GR.Anim.Controller(this) : null;
    }
    track(o) { this.disposables.push(o); return o; }
    disposeAll() { this.disposables.forEach(o => o.dispose && o.dispose()); this.disposables = []; }
    build() {
      // keep transform of root; rebuild everything under it
      const keepProps = this.props;
      while (this.root.children.length) this.root.remove(this.root.children[0]);
      this.disposeAll();
      const app = this.app, lod = this.lod, d = this.d = dims(app), pr = this.prof = profiles(d);
      const mats = this.mats = makeMats(app, lod);
      Object.values(mats).forEach(m => this.track(m));
      const body = this.body = new THREE.Group(); body.scale.setScalar(app.height || 1); this.root.add(body);
      const J = this.j = {};
      const mk = (name, parent, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); J[name] = g; g.userData.base = g.position.clone(); return g; };
      const hipY = d.thigh + d.shin + d.ankle;
      const hips = mk('hips', body, 0, hipY, 0);
      const spine = mk('spine', hips, 0, 0.08, 0);
      const chest = mk('chest', spine, 0, 0.2, 0);
      const neck = mk('neck', chest, 0, 0.29, 0);
      const head = mk('head', neck, 0, 0.085, 0.01);
      const shY = 0.225;
      for (const s of [1, -1]) {
        const p = s > 0 ? 'l' : 'r';
        const arm = mk(p + 'Arm', chest, s * d.shX, shY, -0.005);
        const fore = mk(p + 'Fore', arm, 0, -d.up, 0);
        mk(p + 'Hand', fore, 0, -d.fore, 0);
        const th = mk(p + 'Thigh', hips, s * (d.hipRx * 0.55), -0.05, 0);
        const sh = mk(p + 'Shin', th, 0, -d.thigh, 0);
        mk(p + 'Foot', sh, 0, -d.shin, 0);
      }
      this.hipY = hipY;
      const addM = (geo, mat, parent, shadow = true) => { this.track(geo); const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; parent.add(m); return m; };
      const sU = lod ? 20 : 10, sV = lod ? 10 : 5;
      // skin body
      this.skinMeshes = {};
      this.skinMeshes.pelvis = addM(G.sweep({ len: 0.2, segU: sU, segV: sV, prof: pr.pelvis, capTop: false, capK: 3 }), mats.skin, hips); this.skinMeshes.pelvis.position.y = 0.08;
      this.skinMeshes.abd = addM(G.sweep({ len: 0.3, segU: sU, segV: sV, prof: pr.abd, disp: dispAbs(d.m), capTop: false, capBot: false }), mats.skin, spine); this.skinMeshes.abd.position.y = 0.24;
      this.skinMeshes.chest = addM(G.sweep({ len: 0.34, segU: sU + 4, segV: sV + 2, prof: pr.chest, disp: dispPecs(d.m), capBot: false, capScale: 0.45 }), mats.skin, chest); this.skinMeshes.chest.position.y = 0.3;
      this.skinMeshes.neck = addM(G.sweep({ len: 0.16, segU: 12, segV: 3, prof: () => [d.neckR, d.neckR * 1.05, 0, 0.004], capTop: false, capBot: false }), mats.skin, neck); this.skinMeshes.neck.position.y = 0.12;
      for (const s of [1, -1]) {
        const p = s > 0 ? 'l' : 'r';
        this.skinMeshes[p + 'Up'] = addM(G.sweep({ len: d.up, segU: 14, segV: sV, prof: pr.up, disp: dispBicep(d.m) }), mats.skin, J[p + 'Arm']);
        addM(G.sphere(d.armR * 1.25, 12, 10), mats.skin, J[p + 'Arm']).position.set(s * 0.008, 0, 0);
        this.skinMeshes[p + 'Fore'] = addM(G.sweep({ len: d.fore, segU: 12, segV: sV, prof: pr.fore }), mats.skin, J[p + 'Fore']);
        this.skinMeshes[p + 'Thigh'] = addM(G.sweep({ len: d.thigh, segU: 16, segV: sV, prof: pr.thigh, disp: dispQuad(d.m) }), mats.skin, J[p + 'Thigh']);
        this.skinMeshes[p + 'Shin'] = addM(G.sweep({ len: d.shin, segU: 14, segV: sV, prof: pr.shin, disp: dispCalf(d.m) }), mats.skin, J[p + 'Shin']);
        addM(G.sphere(d.thighR * 0.66, 10, 8), mats.skin, J[p + 'Shin']);
        this.buildHand(s, J[p + 'Hand'], mats, addM);
      }
      // head
      const hb = GR.Head.build(app, mats, lod);
      this.headParts = hb.parts; hb.group.position.y = 0.105; head.add(hb.group); this.headGeo = hb.group;
      hb.group.traverse(o => { if (o.geometry) this.track(o.geometry); });
      this.buildHair();
      this.clothes = new THREE.Group(); this.root.add(this.clothes);
      this.buildOutfit();
      Object.values(J).forEach(g => g.userData.joint = true);
      [J.lHand, J.rHand].forEach(h => { h.userData.fingers.userData.anim = true; h.userData.thumb.userData.anim = true; });
      if (this.hairSwing) this.hairSwing.userData.anim = true;
      this.compact();
      // re-attach props (phone, dumbbells) if any
      this.props = {};
      Object.keys(keepProps || {}).forEach(k => this.prop(k, true));
    }
    buildHand(s, parent, mats, addM) {
      // palm faces the body (±X); fingers are spaced along Z and curl about Z.
      const palm = addM(G.rbox(0.03, 0.085, 0.072, 0.012, 2), mats.skin, parent, this.lod > 0); palm.position.set(-s * 0.003, -0.045, 0);
      const fingers = new THREE.Group(); fingers.position.set(-s * 0.003, -0.085, 0); parent.add(fingers);
      if (this.lod) {
        const fg = G.merge([0, 1, 2, 3].map(i => [G.cyl(0.0085, 0.0075, 0.065 - Math.abs(i - 1.5) * 0.006, 6), G.M.t(0, -0.032, (1.5 - i) * 0.018)]));
        addM(fg, mats.skin, fingers, false);
      } else addM(G.rbox(0.026, 0.06, 0.07, 0.01, 1), mats.skin, fingers, false).position.y = -0.03;
      const thumb = new THREE.Group(); thumb.position.set(-s * 0.012, -0.03, 0.034); thumb.rotation.x = -0.55; parent.add(thumb);
      addM(G.cyl(0.0095, 0.008, 0.055, 6), mats.skin, thumb, false).position.y = -0.027;
      parent.userData.fingers = fingers; parent.userData.thumb = thumb; parent.userData.side = s;
    }
    hatOn() { const h = this.outfit.acc && this.outfit.acc.head; return h && !['a_headband'].includes(h.id); }
    buildHair() {
      if (this.hairMesh) { this.headParts.S.remove(this.hairMesh); }
      if (this.hairHi) this.headParts.S.remove(this.hairHi);
      if (this.hairSwing) this.headParts.S.remove(this.hairSwing);
      const style = (D.HAIR.find(h => h.id === this.app.hair) || D.HAIR[0]).type;
      const hb = GR.Hair.build(style, this.headParts.P, { hat: this.hatOn(), hi: !!this.app.hairHi, lod: this.lod, seed: this.app.hair });
      this.hairMesh = this.hairHi = this.hairSwing = null;
      if (hb.main) { this.track(hb.main); this.hairMesh = new THREE.Mesh(hb.main, hb.buzz ? this.mats.buzz : this.mats.hair); this.hairMesh.castShadow = true; this.headParts.S.add(this.hairMesh); }
      if (hb.hi) { this.track(hb.hi); this.hairHi = new THREE.Mesh(hb.hi, this.mats.hairHi); this.headParts.S.add(this.hairHi); }
      if (hb.swing) { this.track(hb.swing); const g = new THREE.Group(); g.position.set(0, 0.8, -0.95); const m = new THREE.Mesh(hb.swing, this.mats.hair); m.position.set(0, -0.8, 0.95); m.castShadow = true; g.add(m); this.headParts.S.add(g); this.hairSwing = g; }
    }
    // ---------- clothing ----------
    buildOutfit() {
      const C = this.clothes; while (C.children.length) C.remove(C.children[0]);
      // clothing meshes are parented to joints; track for removal
      (this.clothMeshes || []).forEach(m => m.parent && m.parent.remove(m));
      this.clothMeshes = [];
      const o = this.outfit, d = this.d, pr = this.prof, J = this.j;
      const put = (geo, mat, parent, shadow = true) => { this.track(geo); const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; parent.add(m); this.clothMeshes.push(m); return m; };
      const off = (prof, k, flare = 1, from = 0) => t => { const p = prof(t); const f = 1 + (flare - 1) * U.smooth(from, 1, t); return [(p[0] + k) * f, (p[1] + k) * f, p[2], p[3]]; };
      // hide skin under clothes (perf + z-fighting)
      Object.values(this.skinMeshes).forEach(m => { m.visible = true; });
      // ---- TOP
      const topI = o.top && D.item(o.top.id);
      if (topI) {
        const sp = TOP[topI.kind] || TOP.tee, hex = itemColor(topI, o.top.c);
        const mt = this.track(clothMat(topI, hex, 'torso')), mtl = this.track(clothMat(topI, hex, 'torsoLow')), ms = this.track(clothMat(topI, hex, 'sleeve'));
        const k = sp.off;
        put(G.sweep({ len: 0.34, segU: 24, segV: 8, prof: off(pr.chest, k * (sp.puffy ? 1.2 : 1)), disp: dispPecs(d.m * 0.6), capBot: false, capScale: 0.5 }), mt, J.chest).position.y = 0.3 + k * 0.4;
        const abdLen = 0.3 + sp.len * 0.25;
        put(G.sweep({ len: abdLen, segU: 24, segV: 6, prof: t => { const tt = Math.min(1, t * abdLen / 0.3); const p = tt < 1 ? pr.abd(tt) : pr.pelvis(Math.min(1, (t * abdLen - 0.3) / 0.2)); return [p[0] + k + (sp.drop || 0) * t, p[1] + k + (sp.drop || 0) * t * 0.6, 0, p[3]]; }, capTop: false, capBot: false }), mtl, J.spine).position.y = 0.24;
        this.skinMeshes.chest.visible = !!(topI.kind === 'tank' || topI.kind === 'singlet' || topI.kind === 'jersey'); this.skinMeshes.abd.visible = false;
        // hem ring
        put(G.torus(1, 0.012, 4, 24), this.track(plastic(U.shade(hex, -0.15), 0.8)), J.spine).scale.set(pr.pelvis(0)[0] + k + (sp.drop || 0) + 0.005, pr.pelvis(0)[1] + k + 0.005, 1); this.clothMeshes[this.clothMeshes.length - 1].rotation.x = Math.PI / 2; this.clothMeshes[this.clothMeshes.length - 1].position.y = 0.24 - abdLen;
        for (const s of [1, -1]) {
          const p = s > 0 ? 'l' : 'r';
          if (sp.sl > 0) {
            const w = sp.slw || 1, slen = d.up * sp.sl * (sp.slw ? 1.05 : 1);
            put(G.sweep({ len: slen, segU: 14, segV: 4, prof: t => { const pp = pr.up(t * sp.sl); return [(pp[0] + k * 0.8) * U.lerp(1.05, w, t), (pp[1] + k * 0.8) * U.lerp(1.05, w, t), 0, 0]; }, disp: dispBicep(d.m * 0.5), capBot: false }), ms, J[p + 'Arm']);
            put(G.sphere(d.armR * 1.25 + k, 12, 10), mt, J[p + 'Arm']).position.x = s * 0.008;
            if (sp.fore) {
              put(G.sphere(d.foreR * 1.2 + k, 10, 8), ms, J[p + 'Fore']);
              put(G.sweep({ len: d.fore * 0.94, segU: 12, segV: 4, prof: off(pr.fore, k * 0.8, sp.cuffs ? 0.9 : 1.05, 0.6), capTop: false, capBot: !!sp.cuffs }), ms, J[p + 'Fore']);
              if (sp.cuffs) put(G.torus(d.foreR * 0.7 + k * 0.6, 0.01, 4, 14), this.track(plastic(U.shade(hex, -0.2), 0.9)), J[p + 'Fore']).rotation.x = Math.PI / 2, this.clothMeshes[this.clothMeshes.length - 1].position.y = -d.fore * 0.92;
            }
          }
        }
        // collar & details
        const neckY = 0.29, nr = d.neckR;
        const trim = this.track(plastic(sp.trim || topI.pattern === 'ringer' ? T.contrast(hex, topI.brand) : U.shade(hex, -0.12), 0.8));
        if (sp.collar === 'crew') put(G.torus(nr + 0.012, 0.01, 6, 20), trim, J.chest).rotation.x = Math.PI / 2, this.clothMeshes[this.clothMeshes.length - 1].position.set(0, neckY - 0.005, 0.004);
        if (sp.collar === 'v' || sp.collar === 'scoop' || sp.collar === 'deep') { const depth = sp.collar === 'deep' ? 0.12 : sp.collar === 'v' ? 0.07 : 0.05; const pts = [V(-nr - 0.03, neckY - 0.01, 0.02), V(0, neckY - depth, d.chestRz * 0.95 + k), V(nr + 0.03, neckY - 0.01, 0.02)]; put(G.tube(pts, 0.009, 4, 10), trim, J.chest); }
        if (sp.collar === 'high') put(G.cyl(nr + 0.02, nr + 0.03, 0.07, 16, true), this.track(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.6, side: THREE.DoubleSide })), J.neck).position.y = 0.0;
        if (sp.collar === 'bomber') put(G.torus(nr + 0.025, 0.02, 6, 20), this.track(plastic(T.contrast(hex, topI.brand) === '#16161a' ? '#2a2a2a' : U.shade(hex, -0.3), 0.9)), J.chest).rotation.x = Math.PI / 2, this.clothMeshes[this.clothMeshes.length - 1].position.set(0, neckY - 0.01, 0);
        if (sp.zip) { const zm = this.track(metalMat('#c8c8cc')); const zl = 0.3 + abdLen * 0.85; const zg = put(G.box(0.008, zl, 0.006), zm, J.spine); zg.position.set(0, 0.24 + 0.27 - zl / 2, U.lerp(d.chestRz, d.waistRz, 0.5) + k + 0.012); const pull = put(G.box(0.014, 0.03, 0.006), zm, J.chest); pull.position.set(0, 0.22, d.chestRz + k + 0.016); }
        if (sp.hood) { const hc = this.track(new THREE.MeshStandardMaterial({ map: T.clothing(topI, hex, 'hood'), normalMap: T.fabricNormal('fleece'), roughness: 0.85, side: THREE.DoubleSide })); const hood = put(new THREE.TorusGeometry(0.1, 0.045, 8, 18, Math.PI * 1.25), hc, J.chest); hood.position.set(0, neckY + 0.02, -0.04); hood.rotation.set(Math.PI / 2 - 0.35, 0, Math.PI * 0.375 + Math.PI); hood.scale.set(1.15, 1, 1); }
        if (sp.strings) { const sm = this.track(plastic(T.contrast(hex, topI.brand), 0.7)); for (const s of [-1, 1]) { const st = put(G.cyl(0.004, 0.004, 0.13, 4), sm, J.chest); st.position.set(s * 0.035, neckY - 0.085, d.chestRz + k + 0.006); } }
        if (sp.pocket) { const pk = put(G.rbox(0.2, 0.09, 0.02, 0.01, 1), this.track(clothMat(topI, U.shade(hex, -0.05), 'pocket')), J.spine); pk.position.set(0, 0.24 - 0.2, d.waistRz + k + 0.006); }
        if (sp.band) put(G.torus(1, 0.018, 4, 24), this.track(plastic(T.contrast(hex, topI.brand) === '#16161a' ? '#2a2a2a' : '#e8e8e8', 0.9)), J.spine).scale.set(pr.pelvis(0)[0] + k + 0.01, pr.pelvis(0)[1] + k + 0.01, 1), this.clothMeshes[this.clothMeshes.length - 1].rotation.x = Math.PI / 2, this.clothMeshes[this.clothMeshes.length - 1].position.y = 0.24 - abdLen + 0.01;
        if (sp.puffy) { const pm = this.track(clothMat(topI, U.shade(hex, -0.06), 'torso')); for (let i = 0; i < 4; i++) { const ring = put(G.torus(1, 0.022, 6, 24), pm, i < 2 ? J.chest : J.spine); ring.rotation.x = Math.PI / 2; ring.scale.set((i < 2 ? d.chestRx : d.waistRx) + k + 0.012, (i < 2 ? d.chestRz : d.waistRz) + k + 0.012, 1); ring.position.y = i < 2 ? 0.18 - i * 0.1 : 0.12 - (i - 2) * 0.1; } }
      } else { this.skinMeshes.chest.visible = true; this.skinMeshes.abd.visible = true; }
      // ---- BOTTOM
      const botI = o.bottom && D.item(o.bottom.id);
      if (botI) {
        const sp = BOT[botI.kind] || BOT.jeans, hex = itemColor(botI, o.bottom.c), k = sp.off;
        const mp = this.track(clothMat(botI, hex, 'pelvis')), ml = this.track(clothMat(botI, hex, 'leg'));
        put(G.sweep({ len: 0.21, segU: 24, segV: 5, prof: off(pr.pelvis, k), capTop: false, capK: 3 }), mp, J.hips).position.y = 0.085;
        const wb = put(G.torus(1, sp.band ? 0.016 : 0.01, 4, 24), this.track(plastic(sp.band ? U.shade(hex, -0.2) : U.shade(hex, -0.1), 0.8)), J.hips); wb.rotation.x = Math.PI / 2; wb.scale.set(pr.pelvis(0)[0] + k + 0.004, pr.pelvis(0)[1] + k + 0.004, 1); wb.position.y = 0.083;
        this.skinMeshes.pelvis.visible = false;
        for (const s of [1, -1]) {
          const p = s > 0 ? 'l' : 'r';
          const tl = d.thigh * sp.thigh;
          put(G.sweep({ len: tl + (sp.thigh < 1 ? 0 : 0.02), segU: 16, segV: 5, prof: t => { const pp = pr.thigh(t * sp.thigh); const f = sp.thigh < 1 ? 1 + 0.12 * t : 1; return [(pp[0] + k) * f, (pp[1] + k) * f, 0, pp[3]]; }, disp: dispQuad(d.m * 0.5), capBot: sp.thigh < 1 }), ml, J[p + 'Thigh']);
          if (sp.shin) {
            put(G.sphere(d.thighR * 0.66 + k, 10, 8), ml, J[p + 'Shin']);
            const flare = sp.flare || 1, len = d.shin * (sp.stack ? 1.0 : 0.96);
            put(G.sweep({ len, segU: 16, segV: 6, prof: t => { const pp = pr.shin(t); const base = Math.max(pp[0] + k, (sp.flare > 1 ? d.shinR * 0.9 + k : 0)); const f = U.lerp(1, flare, U.smooth(0.3, 1, t)); const st = sp.stack && t > 0.75 ? 1 + Math.sin(t * 60) * 0.06 : 1; return [base * f * st, base * f * st * 1.04, 0, 0]; }, capTop: false, capBot: false }), ml, J[p + 'Shin']);
            if (sp.cuff) { const cf = put(G.torus(d.shinR * 0.62 + k * 0.6, 0.012, 4, 14), this.track(plastic(U.shade(hex, -0.18), 0.9)), J[p + 'Shin']); cf.rotation.x = Math.PI / 2; cf.position.y = -len * 0.97; }
            this.skinMeshes[p + 'Shin'].visible = false;
          } else this.skinMeshes[p + 'Shin'].visible = true;
          this.skinMeshes[p + 'Thigh'].visible = sp.thigh < 1;
        }
      } else { this.skinMeshes.pelvis.visible = true; }
      // ---- SHOES
      const shI = o.shoes && D.item(o.shoes.id);
      for (const s of [1, -1]) {
        const p = s > 0 ? 'l' : 'r', foot = J[p + 'Foot'];
        const g = this.buildShoe(shI, shI ? itemColor(shI, o.shoes.c) : null, s);
        foot.add(g); this.clothMeshes.push(g);
      }
      // ---- ACCESSORIES
      const acc = o.acc || {};
      Object.entries(acc).forEach(([slot, a]) => { if (!a) return; const it = D.item(a.id); if (!it) return; this.buildAcc(it, itemColor(it, a.c), put); });
      // hair depends on hats
      this.buildHair();
    }
    buildShoe(it, hex, s) {
      const g = new THREE.Group(); g.userData.flat = true; const kind = it ? it.kind : 'bare';
      if (!it) { const m = new THREE.Mesh(this.track(G.rbox(0.085, 0.05, 0.22, 0.025, 2)), this.mats.skin); m.position.set(0, -0.05, 0.06); m.castShadow = true; g.add(m); return g; }
      const acc = T.contrast(hex, it.brand), soleCol = ['slides'].includes(kind) ? hex : (U.luminance(hex) < 0.25 && kind !== 'runner' ? '#f2f2f0' : kind === 'retro' ? '#f2e8d0' : '#f4f4f2');
      const up = this.track(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: kind === 'lowtop' || kind === 'sneaker' ? 0.45 : 0.6, normalMap: T.fabricNormal(kind === 'lowtop' ? 'leather' : 'mesh'), normalScale: new THREE.Vector2(0.4, 0.4) }));
      const sole = this.track(plastic(soleCol, 0.7)), accM = this.track(plastic(acc, 0.5));
      const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { this.track(geo); const mm = new THREE.Mesh(geo, m); mm.position.set(x, y, z); mm.rotation.set(rx, ry, rz); mm.scale.set(sx, sy, sz); mm.castShadow = true; g.add(mm); return mm; };
      const chunky = kind === 'sneaker' && it.brand === 'driplord' ? 1.8 : kind === 'hightop' || kind === 'lowtop' ? 1.2 : 1;
      const soleH = 0.022 * chunky;
      add(G.rbox(0.098, soleH, 0.28, 0.012, 2), sole, 0, -0.075 + soleH / 2 - 0.005, 0.055);
      if (kind === 'slides') { add(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 14, 1, true, -Math.PI / 2, Math.PI), up, 0, -0.05, 0.1, Math.PI / 2, 0, Math.PI / 2, 1, 1, 0.7); add(G.box(0.07, 0.005, 0.03), accM, 0, -0.035, 0.1); return g; }
      // upper: ellipsoid body + toe box
      add(G.sphere(1, 16, 12), up, 0, -0.045 + soleH * 0.4, 0.045, 0, 0, 0, 0.05, 0.045, 0.135);
      add(G.sphere(1, 12, 8), up, 0, -0.05 + soleH * 0.4, 0.12, 0, 0, 0, 0.047, 0.03, 0.07);
      // heel counter & collar
      add(G.cyl(0.048, 0.052, kind === 'hightop' ? 0.12 : 0.05, 14, false), up, 0, kind === 'hightop' ? -0.0 : -0.03, -0.01);
      if (kind === 'hightop') add(G.torus(0.05, 0.008, 6, 14), accM, 0, 0.06, -0.01, Math.PI / 2);
      // side stripe / swoosh-like panel (original fictional shape)
      const stripe = new THREE.Shape(); stripe.moveTo(0, 0); stripe.quadraticCurveTo(0.06, 0.005, 0.11, 0.03); stripe.lineTo(0.1, 0.038); stripe.quadraticCurveTo(0.05, 0.016, 0, 0.012); stripe.closePath();
      const sg = new THREE.ShapeGeometry(stripe); for (const sd of [1, -1]) add(sg.clone(), accM, sd * 0.051, -0.07 + soleH, -0.015, 0, sd * -Math.PI / 2, 0).material.side = THREE.DoubleSide;
      // laces
      const lace = this.track(plastic(kind === 'runner' ? acc : '#f4f4f2', 0.8));
      for (let i = 0; i < 4; i++) add(G.box(0.05, 0.006, 0.008), lace, 0, -0.01 - i * 0.006 + soleH * 0.3, 0.035 + i * 0.022, -0.5);
      if (kind === 'retro' || kind === 'runner') add(G.box(0.1, 0.012, 0.06), accM, 0, -0.068 + soleH, 0.12).scale.set(0.98, 1, 1);
      return g;
    }
    buildAcc(it, hex, put) {
      const J = this.j, d = this.d, S = this.headParts.S, k = it.kind;
      const mm = it.colors.length && ['#e8c45a', '#d9d9de', '#c48b6a', '#e6f3ff'].includes(hex) || ['chain_cuban', 'chain_rope', 'chain_pendant', 'watch_classic', 'bracelet_cuff', 'ring_band', 'ring_signet', 'crown'].includes(k) ? this.track(metalMat(hex)) : this.track(plastic(hex, 0.45));
      const neckY = 0.29, nr = d.neckR;
      const topK = this.outfit.top ? (TOP[(D.item(this.outfit.top.id) || {}).kind] || {}).off || 0 : 0;
      if (k.startsWith('chain')) {
        const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * U.TAU; const front = Math.max(0, Math.cos(a)); pts.push(V(Math.sin(a) * (nr + 0.03), neckY - 0.02 - front * front * (k === 'chain_pendant' ? 0.1 : 0.07), Math.cos(a) * (nr + 0.025) + front * (d.chestRz - nr + topK + 0.002) * 0.9)); }
        if (k === 'chain_beads') pts.forEach((p, i) => { if (i % 1 === 0 && i < 24) put(G.sphere(0.009, 6, 4), mm, J.chest).position.copy(p); });
        else put(G.tube(pts, k === 'chain_cuban' ? 0.0075 : 0.0045, 5, 48, true), mm, J.chest, false);
        if (k === 'chain_pendant') { const pd = put(G.merge([[G.cyl(0.005, 0.005, 0.05, 6), G.M.trs(0, 0, 0, 0, 0, Math.PI / 2)], [G.cyl(0.014, 0.014, 0.012, 10), G.M.trs(0.025, 0, 0, 0, 0, Math.PI / 2)], [G.cyl(0.014, 0.014, 0.012, 10), G.M.trs(-0.025, 0, 0, 0, 0, Math.PI / 2)]]), mm, J.chest); pd.position.copy(pts[0]).add(V(0, -0.025, 0.008)); }
      } else if (k.startsWith('watch') || k.startsWith('bracelet')) {
        const left = k.startsWith('watch'); const fore = J[left ? 'lFore' : 'rFore'];
        const sleeve = this.outfit.top && (TOP[(D.item(this.outfit.top.id) || {}).kind] || {}).fore ? 0.012 : 0;
        const band = put(G.torus(d.foreR * 0.72 + 0.006 + sleeve, k === 'bracelet_beads' ? 0.007 : 0.008, 6, 18), k === 'watch_classic' || k === 'watch_digital' ? this.track(plastic(k === 'watch_classic' ? '#3b2416' : hex, 0.6)) : mm, fore, false);
        band.rotation.x = Math.PI / 2; band.position.y = -d.fore * 0.86;
        if (left) { const face = put(k === 'watch_smart' ? G.rbox(0.028, 0.006, 0.034, 0.004, 1) : G.cyl(0.017, 0.017, 0.008, 16), k === 'watch_classic' ? this.track(metalMat(hex)) : this.track(plastic('#111', 0.2)), fore, false); face.position.set(d.foreR * 0.72 + 0.012 + sleeve, -d.fore * 0.86, 0); face.rotation.z = Math.PI / 2; const dial = put(G.cyl(0.013, 0.013, 0.002, 16), this.track(new THREE.MeshBasicMaterial({ color: k === 'watch_digital' ? 0x9cff6a : k === 'watch_smart' ? 0x33ccff : 0xf8f4e8 })), fore, false); dial.position.copy(face.position).add(V(0.005, 0, 0)); dial.rotation.z = Math.PI / 2; }
      } else if (k.startsWith('ring')) {
        const r = put(G.torus(0.011, k === 'ring_signet' ? 0.004 : 0.0025, 6, 12), mm, J.rHand.userData.fingers, false); r.rotation.y = Math.PI / 2; r.position.set(0, -0.022, 0.009);
      } else if (k.startsWith('glasses')) {
        const lens = this.track(new THREE.MeshStandardMaterial({ color: k === 'glasses_round' ? 0xbfd8ff : 0x111111, transparent: true, opacity: k === 'glasses_round' ? 0.25 : 0.82, metalness: 0.6, roughness: 0.05 }));
        const eyes = this.headParts.eyes, z = eyes[0].g.position.z + eyes[0].er + 0.07, y = eyes[0].g.position.y;
        const grp = new THREE.Group(); grp.userData.flat = true; grp.position.set(0, y, z); S.add(grp); this.clothMeshes.push(grp);
        const ex = Math.abs(eyes[0].g.position.x);
        if (k === 'glasses_shield') { const sh = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 24, 1, true, -0.75, 1.5)), this.track(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.8, roughness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }))); sh.position.set(0, 0, -1.02); grp.add(sh); }
        else for (const s of [1, -1]) {
          const w = k === 'glasses_rect' ? 0.26 : k === 'glasses_square' ? 0.34 : 0.3, h = k === 'glasses_rect' ? 0.13 : k === 'glasses_aviator' ? 0.27 : 0.26;
          const fr = k === 'glasses_round' ? G.torus(0.15, 0.022, 6, 20) : G.torus(0.16, 0.025, 4, 4);
          const f = new THREE.Mesh(this.track(fr), mm); f.position.set(s * ex, 0, 0); if (k !== 'glasses_round') { f.rotation.z = Math.PI / 4; f.scale.set(w / 0.23, h / 0.23, 1); } grp.add(f);
          const l = new THREE.Mesh(this.track(new THREE.CircleGeometry(k === 'glasses_round' ? 0.15 : 0.17, k === 'glasses_round' ? 20 : 4)), lens); l.position.set(s * ex, 0, -0.005); if (k !== 'glasses_round') { l.rotation.z = Math.PI / 4; l.scale.set(w / 0.24, h / 0.24, 1); } grp.add(l);
          const arm = new THREE.Mesh(this.track(G.box(0.03, 0.03, 0.75)), mm); arm.position.set(s * (ex + w * 0.55), 0.02, -0.38); arm.rotation.y = s * 0.12; grp.add(arm);
        }
        const bridge = new THREE.Mesh(this.track(G.box(ex * 0.9, 0.03, 0.03)), mm); bridge.position.y = 0.06; grp.add(bridge);
      } else if (['cap', 'cap_back', 'beanie', 'bucket', 'headband', 'crown'].includes(k)) {
        const grp = new THREE.Group(); grp.userData.flat = true; grp.position.set(0, 0.22, -0.05); S.add(grp); this.clothMeshes.push(grp);
        const mat = k === 'crown' ? mm : this.track(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.75, normalMap: T.fabricNormal(k === 'beanie' ? 'knit' : 'nylon') }));
        const addG = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const mesh = new THREE.Mesh(this.track(geo), m); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; grp.add(mesh); return mesh; };
        if (k === 'cap' || k === 'cap_back') {
          addG(new THREE.SphereGeometry(1.0, 24, 12, 0, U.TAU, 0, Math.PI / 2), mat, 0, 0.02, 0, -0.12, 0, 0, 1.04, 0.85, 1.12);
          const brim = new THREE.CylinderGeometry(0.62, 0.62, 0.05, 20, 1, false, -Math.PI / 2, Math.PI); addG(brim, mat, 0, 0.0, k === 'cap' ? 0.85 : -0.9, 0.18 * (k === 'cap' ? 1 : -1), k === 'cap' ? 0 : Math.PI, 0, 1.1, 1, 1);
          const logo = addG(new THREE.PlaneGeometry(0.4, 0.2), this.track(new THREE.MeshBasicMaterial({ map: T.sign('MOG', { bg: hex, fg: T.contrast(hex), w: 128, h: 64 }) })), 0, 0.42, k === 'cap' ? 1.0 : -1.0, -0.4 * (k === 'cap' ? 1 : -1), k === 'cap' ? 0 : Math.PI, 0);
          addG(G.sphere(0.07, 8, 6), mat, 0, 0.88, -0.1);
        } else if (k === 'beanie') { addG(new THREE.SphereGeometry(1.0, 24, 14, 0, U.TAU, 0, Math.PI / 2 + 0.1), mat, 0, 0.05, 0, -0.12, 0, 0, 1.06, 1.15, 1.1); addG(G.cyl(1.09, 1.1, 0.28, 24, true), mat, 0, 0.02, 0, -0.12, 0, 0, 1, 1, 1.04).material.side = THREE.DoubleSide; }
        else if (k === 'bucket') { addG(G.cyl(0.85, 1.05, 0.65, 24), mat, 0, 0.3, 0, -0.1); addG(G.cyl(1.05, 1.5, 0.2, 24, true), mat, 0, -0.05, 0, -0.1).material.side = THREE.DoubleSide; }
        else if (k === 'headband') { addG(G.torus(1.0, 0.09, 6, 28), mat, 0, 0.05, 0.02, Math.PI / 2 - 0.25, 0, 0, 1.0, 1.08, 1); }
        else if (k === 'crown') { addG(G.cyl(0.8, 0.82, 0.35, 20, true), mm, 0, 0.6, 0, -0.1).material.side = THREE.DoubleSide; for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU; addG(G.cyl(0, 0.12, 0.3, 4), mm, Math.sin(a) * 0.78, 0.92, Math.cos(a) * 0.78, -0.1); addG(G.sphere(0.07, 6, 4), this.track(plastic(['#ef4444', '#3b82f6', '#10b981'][i % 3], 0.1)), Math.sin(a) * 0.82, 0.62, Math.cos(a) * 0.82); } }
      } else if (k.startsWith('bag')) {
        const big = k === 'bag_school' || k === 'bag_gym';
        const bag = put(G.rbox(big ? 0.28 : 0.2, big ? 0.36 : 0.24, big ? 0.13 : 0.09, 0.04, 2), mm, J.chest); bag.position.set(0, 0.08, -(d.chestRz + topK + (big ? 0.07 : 0.05)));
        const pocket = put(G.rbox(big ? 0.2 : 0.14, 0.1, 0.04, 0.015, 1), this.track(plastic(U.shade(hex, -0.2), 0.6)), J.chest); pocket.position.set(0, big ? -0.02 : 0.02, bag.position.z - (big ? 0.075 : 0.055));
        const strap = this.track(plastic('#222', 0.8));
        for (const s of [1, -1]) { const pts = [V(s * 0.08, 0.2, bag.position.z + 0.02), V(s * 0.1, 0.3, 0), V(s * 0.1, 0.22, d.chestRz + topK + 0.01), V(s * 0.11, 0.02, d.chestRz + topK + 0.005), V(s * 0.1, -0.05, bag.position.z + 0.03)]; put(G.tube(pts, 0.01, 4, 20), strap, J.chest); }
      } else if (k.startsWith('phones')) {
        const onHead = k === 'phones_head';
        const cupM = mm, padM = this.track(plastic('#1d1d1f', 0.9));
        if (onHead) { const grp = new THREE.Group(); grp.userData.flat = true; S.add(grp); this.clothMeshes.push(grp); const band = new THREE.Mesh(this.track(G.torus(1.12, 0.06, 6, 24, Math.PI)), cupM); band.position.y = 0.0; band.rotation.z = 0; grp.add(band); grp.position.set(0, 0.05, -0.04); for (const s of [1, -1]) { const cup = new THREE.Mesh(this.track(G.cyl(0.32, 0.32, 0.18, 16)), cupM); cup.rotation.z = Math.PI / 2; cup.position.set(s * 1.12, 0, 0); grp.add(cup); const pad = new THREE.Mesh(this.track(G.cyl(0.28, 0.28, 0.08, 16)), padM); pad.rotation.z = Math.PI / 2; pad.position.set(s * 1.0, 0, 0); grp.add(pad); } }
        else { const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * 0.5 + i / 12 * Math.PI; pts.push(V(Math.cos(a) * (nr + 0.045), neckY + 0.02, Math.sin(a) * -(nr + 0.04))); } put(G.tube(pts, 0.008, 4, 16), cupM, J.chest); for (const s of [1, -1]) { const cup = put(G.cyl(0.04, 0.04, 0.025, 14), cupM, J.chest); cup.position.set(s * (nr + 0.05), neckY + 0.01, 0.035); cup.rotation.set(Math.PI / 2 - 0.3, 0, s * 0.5); } }
      }
    }
    // ---------- props held in hands (phone, dumbbells, mic, trophy, ball) ----------
    prop(name, on) {
      if (!on) { if (this.props[name]) { this.props[name].parent && this.props[name].parent.remove(this.props[name]); delete this.props[name]; } return; }
      if (this.props[name] && this.props[name].parent) return this.props[name];
      let m;
      if (name === 'phone') { m = new THREE.Group(); const body = new THREE.Mesh(G.rbox(0.07, 0.14, 0.009, 0.008, 2), plastic('#111', 0.2)); m.add(body); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.125), new THREE.MeshBasicMaterial({ color: 0x5fd0ff })); scr.position.z = -0.0055; scr.rotation.y = Math.PI; m.add(scr); const cam = new THREE.Mesh(G.cyl(0.006, 0.006, 0.004, 8), plastic('#333')); cam.rotation.x = Math.PI / 2; cam.position.set(0.02, 0.05, 0.006); m.add(cam); m.position.set(0, -0.1, 0.03); m.rotation.set(-0.2, Math.PI, 0); this.j.rHand.add(m); }
      else if (name === 'dumbbellL' || name === 'dumbbellR') { m = GR.Props ? GR.Props.dumbbell(0.11) : new THREE.Group(); m.position.set(0, -0.09, 0.0); m.rotation.z = Math.PI / 2; this.j[name === 'dumbbellL' ? 'lHand' : 'rHand'].add(m); }
      else if (name === 'mic') { m = new THREE.Group(); const h = new THREE.Mesh(G.cyl(0.012, 0.009, 0.14, 8), plastic('#222')); m.add(h); const b = new THREE.Mesh(G.sphere(0.025, 10, 8), metalMat('#bbb')); b.position.y = 0.08; m.add(b); m.position.set(0, -0.08, 0.02); this.j.rHand.add(m); }
      else if (name === 'trophy') { m = GR.Props ? GR.Props.trophy('#e8c45a', 0.6) : new THREE.Group(); m.position.set(0, -0.12, 0.05); this.j.rHand.add(m); }
      else if (name === 'ball') { m = new THREE.Mesh(G.sphere(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9692a, roughness: 0.7, map: T.sign('', { bg: '#d9692a', fg: '#000', w: 64, h: 64 }) })); m.position.set(0, -0.14, 0.06); this.j.rHand.add(m); }
      else if (name === 'product') { m = new THREE.Mesh(G.cyl(0.02, 0.022, 0.1, 10), plastic('#ffd6e7', 0.3)); m.position.set(0, -0.1, 0.02); this.j.rHand.add(m); }
      else if (name === 'cup') { m = new THREE.Mesh(G.cyl(0.035, 0.028, 0.11, 12), plastic('#f4f1de', 0.6)); m.position.set(0, -0.09, 0.03); this.j.rHand.add(m); }
      if (m) { m.traverse(o => { o.castShadow = true; }); this.props[name] = m; }
      return m;
    }
    // ---------- appearance mutation ----------
    // appearance/outfit changes rebuild the model once per tick (calls in the same frame are coalesced)
    setAppearance(app) { this.app = JSON.parse(JSON.stringify(app)); this.queue(); }
    queue() { if (this._q) return; this._q = true; Promise.resolve().then(() => this.flush()); }
    flush() { if (!this._q) return; this._q = false; const pos = this.root.position.clone(), rot = this.root.rotation.y; this.build(); this.root.position.copy(pos); this.root.rotation.y = rot; }
    setOutfit(outfit) { this.outfit = JSON.parse(JSON.stringify(outfit)); this.queue(); }
    /** merge static meshes per joint by material to cut draw calls (animated parts are kept separate) */
    compact() {
      const keep = new Set();
      const hp = this.headParts; hp.eyes.forEach(e => keep.add(e.g)); hp.brows.forEach(b => keep.add(b.g)); [hp.mouth.line, hp.mouth.interior, hp.mouth.teeth, this.hairMesh, this.hairHi, this.hairSwing].forEach(o => o && keep.add(o));
      const doNode = node => {
        const groups = new Map(), drop = [];
        const collect = (obj, mat) => {
          for (const ch of obj.children.slice()) {
            if (keep.has(ch) || ch.userData.joint || ch.userData.anim) continue;
            const m = new THREE.Matrix4().multiplyMatrices(mat, new THREE.Matrix4().compose(ch.position, ch.quaternion, ch.scale));
            if (ch.isMesh && !Array.isArray(ch.material) && ch.geometry.attributes.uv) { drop.push(ch); if (!ch.visible) continue; const k = ch.material.uuid; if (!groups.has(k)) groups.set(k, { mat: ch.material, list: [], shadow: false }); const g = groups.get(k); g.list.push([ch.geometry, m]); g.shadow = g.shadow || ch.castShadow; }
            else if (ch.type === 'Group' && ch.userData.flat) { collect(ch, m); drop.push(ch); }
          }
        };
        collect(node, new THREE.Matrix4());
        if (drop.filter(d => d.isMesh).length < 2) return;
        drop.forEach(d => d.parent && d.parent.remove(d));
        groups.forEach(g => { const geo = g.list.length === 1 && g.list[0][1].equals(new THREE.Matrix4()) ? g.list[0][0] : this.track(GR.Geo.merge(g.list)); const mesh = new THREE.Mesh(geo, g.mat); geo.computeBoundingSphere(); mesh.castShadow = g.shadow && geo.boundingSphere.radius > 0.07; node.add(mesh); });
      };
      Object.values(this.j).forEach(doNode); doNode(this.headParts.S);
    }
    // ---------- face ----------
    setExpr(name, dur = 1.5) { this.expr = name; this.exprT = dur; }
    talk(dur = 2) { this.talkT = dur; }
    lookAt(worldPos) { this.lookTarget = worldPos ? worldPos.clone() : null; }
    updateFace(dt, cam) {
      const f = this.faceT;
      // blink
      this.blinkT -= dt; if (this.blinkT < 0) { this.blinkT = U.rand(2, 5.5); this.blinking = 0.16; }
      if (this.blinking > 0) { this.blinking -= dt; f.blink = 1; } else f.blink = 0;
      // gaze saccades
      this.lookT -= dt; if (this.lookT < 0) { this.lookT = U.rand(0.6, 2.6); this.sacc = [U.rand(-0.25, 0.25), U.rand(-0.12, 0.12)]; }
      f.lookX = this.sacc ? this.sacc[0] : 0; f.lookY = this.sacc ? this.sacc[1] : 0;
      // expression presets
      const E = { neutral: { smile: 0.12 }, smile: { smile: 0.9, squint: 0.25 }, laugh: { smile: 1, open: 0.6, squint: 0.5, browUp: 0.3 }, surprise: { ooh: 1, wide: 1, browUp: 1 },
        concentrate: { browDown: 1, frown: 0.2, squint: 0.3, smile: -0.1 }, sad: { frown: 1, browUp: 0.4 }, smug: { smile: 0.55, squint: 0.4, browDown: 0.2 }, strain: { browDown: 0.8, open: 0.25, squint: 0.7, smile: 0.4 }, shout: { open: 0.85, browUp: 0.5, wide: 0.4, smile: 0.3 } };
      if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0 && !this.exprHold) this.expr = 'neutral'; }
      const tgt = Object.assign({ smile: 0, open: 0, ooh: 0, wide: 0, squint: 0, browUp: 0, browDown: 0, frown: 0 }, E[this.expr] || E.neutral);
      if (this.talkT > 0) { this.talkT -= dt; const t = performance.now() / 1000; tgt.open = Math.max(tgt.open, (Math.sin(t * 17) * 0.5 + 0.5) * (Math.sin(t * 5.3) * 0.3 + 0.55) * 0.45); tgt.browUp += Math.max(0, Math.sin(t * 2.1)) * 0.25; }
      for (const k in tgt) f[k] = U.damp(f[k], tgt[k], 12, dt);
      GR.Head.animate(this.headParts, f);
    }
    update(dt, ctx = {}) {
      if (this.anim) this.anim.update(dt, ctx);
      if (this.lod || ctx.near) this.updateFace(dt);
      if (this.hairSwing) { const sw = this.anim ? this.anim.sway : 0; this.hairSwing.rotation.x = U.damp(this.hairSwing.rotation.x, U.clamp(sw * 0.6, -0.4, 0.6), 6, dt); this.hairSwing.rotation.z = Math.sin(performance.now() / 300) * 0.05 * (this.anim ? this.anim.speed01 : 0); }
    }
    /** distance LOD: hide fine facial parts + fingers when far away */
    setDetail(on) { if (this._detail === on) return; this._detail = on; const hp = this.headParts; hp.eyes.forEach(e => e.g.visible = on); hp.brows.forEach(b => b.g.visible = on); hp.mouth.line.visible = on; hp.mouth.teeth.visible = on; hp.mouth.interior.visible = on; [this.j.lHand, this.j.rHand].forEach(h => { h.userData.fingers.visible = on; h.userData.thumb.visible = on; }); if (this.hairHi) this.hairHi.visible = on; }
    dispose() { this.disposeAll(); if (this.root.parent) this.root.parent.remove(this.root); }
  }

  return { Character, dims, itemColor, TOP, BOT };
})();
