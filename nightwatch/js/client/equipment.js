/* EquipmentSystem (client side): models, device screens, readings and use.
 *
 * Readings are computed from replicated state so every investigator sees the
 * same numbers for the same place. Anything that changes the world (placing,
 * photographing, swabbing, asking...) is sent to the authority as an action.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const U = NW.util;
  const V3 = THREE.Vector3;
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);

  const M = {
    body: new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.55, metalness: 0.35 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.9 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xc06a2b, roughness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f93, roughness: 0.35, metalness: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3b3936, roughness: 0.7, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.1, metalness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.8 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x1e2423, roughness: 0.95 }),
    red: new THREE.MeshStandardMaterial({ color: 0x8a1a12, roughness: 0.6 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.5 })
  };
  const led = (c) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0 });
  function box(g, m, x, y, z, sx, sy, sz) { const o = new THREE.Mesh(BOX, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; }
  function cyl(g, m, x, y, z, r, h, rx) { const o = new THREE.Mesh(CYL, m); o.position.set(x, y, z); o.scale.set(r * 2, h, r * 2); if (rx) o.rotation.x = rx; g.add(o); return o; }

  /** Screen with its own canvas texture. */
  function screen(g, w, h, x, y, z, ry, px) {
    const c = NW.Tex.canvas(px || 128, Math.round((px || 128) * h / w));
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    g.add(m);
    return { c, ctx: c.getContext('2d'), tex, mesh: m };
  }

  /** Build a model for an item type. Returns { group, screen?, leds?, lamp? } */
  function buildModel(type) {
    const g = new THREE.Group(); const o = { group: g };
    switch (type) {
      case 'scanner':
        box(g, M.body, 0, 0, 0, 0.075, 0.03, 0.17); box(g, M.orange, 0, -0.005, 0.07, 0.078, 0.032, 0.035);
        o.leds = [];
        for (let i = 0; i < 5; i++) { const lm = led([0x3cff6a, 0x9dff3c, 0xffe23c, 0xff8a2c, 0xff2c2c][i]); box(g, lm, -0.026 + i * 0.013, 0.017, -0.06, 0.009, 0.006, 0.009); o.leds.push(lm); }
        o.screen = screen(g, 0.06, 0.035, 0, 0.0155, -0.015, 0); o.screen.mesh.rotation.x = -Math.PI / 2;
        cyl(g, M.steel, 0, 0, -0.1, 0.006, 0.05, Math.PI / 2);
        break;
      case 'thermal':
        box(g, M.body, 0, 0, 0, 0.09, 0.08, 0.14); box(g, M.grip, 0, -0.07, 0.03, 0.04, 0.09, 0.04);
        cyl(g, M.glass, 0, 0.005, -0.08, 0.03, 0.03, Math.PI / 2);
        o.screen = screen(g, 0.08, 0.06, 0, 0.005, 0.071, 0);
        break;
      case 'recorder':
        box(g, M.body, 0, 0, 0, 0.06, 0.03, 0.13); cyl(g, M.grip, 0, 0.005, -0.1, 0.012, 0.08, Math.PI / 2);
        o.dish = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), M.steel); o.dish.rotation.x = -Math.PI / 2; o.dish.position.z = -0.12; o.dish.material.side = THREE.DoubleSide; g.add(o.dish);
        o.screen = screen(g, 0.05, 0.04, 0, 0.0155, 0.02, 0); o.screen.mesh.rotation.x = -Math.PI / 2;
        o.leds = [led(0xff2c2c)]; box(g, o.leds[0], 0.022, 0.017, -0.05, 0.006, 0.004, 0.006);
        break;
      case 'samplekit':
        box(g, M.white, 0, 0, 0, 0.12, 0.05, 0.09); box(g, M.orange, 0, 0.026, 0, 0.122, 0.006, 0.092);
        o.lampM = led(0x8a5cff); cyl(g, M.body, 0.05, 0.01, -0.07, 0.015, 0.06, Math.PI / 2); box(g, o.lampM, 0.05, 0.01, -0.101, 0.024, 0.024, 0.004);
        o.screen = screen(g, 0.06, 0.03, -0.02, 0.0295, 0.0, 0); o.screen.mesh.rotation.x = -Math.PI / 2;
        break;
      case 'lens':
        box(g, M.body, 0, 0, 0, 0.12, 0.075, 0.06); cyl(g, M.grip, 0.01, 0, -0.06, 0.03, 0.06, Math.PI / 2); cyl(g, M.glass, 0.01, 0, -0.092, 0.024, 0.004, Math.PI / 2);
        box(g, M.white, -0.04, 0.045, -0.01, 0.03, 0.015, 0.02);
        o.screen = screen(g, 0.07, 0.045, 0, 0.002, 0.031, 0);
        break;
      case 'motion':
        cyl(g, M.body, 0, 0.015, 0, 0.06, 0.03); o.leds = [led(0xff2c2c)];
        { const d = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), o.leds[0]); d.position.y = 0.03; g.add(d); }
        box(g, M.orange, 0, 0.012, 0.055, 0.03, 0.01, 0.012);
        break;
      case 'pressure':
        box(g, M.body, 0, 0.05, 0, 0.1, 0.1, 0.05); cyl(g, M.steel, 0.035, 0.11, 0, 0.006, 0.04);
        o.screen = screen(g, 0.085, 0.06, 0, 0.055, 0.026, 0);
        break;
      case 'slate':
        box(g, M.wood, 0, 0.01, 0, 0.3, 0.02, 0.22); box(g, M.slate, 0, 0.021, 0, 0.27, 0.004, 0.19);
        o.screen = screen(g, 0.26, 0.18, 0, 0.0235, 0, 0, 256); o.screen.mesh.rotation.x = -Math.PI / 2;
        cyl(g, M.white, 0.1, 0.03, 0.07, 0.004, 0.08, Math.PI / 2).rotation.z = 0.6;
        break;
      case 'radio':
        box(g, M.body, 0, 0, 0, 0.055, 0.13, 0.03); cyl(g, M.grip, 0.018, 0.11, 0, 0.006, 0.1);
        o.screen = screen(g, 0.04, 0.025, 0, 0.035, 0.016, 0);
        o.leds = [led(0x3cff6a)]; box(g, o.leds[0], -0.018, 0.06, 0.016, 0.006, 0.006, 0.002);
        break;
      case 'beacon':
        cyl(g, M.body, 0, 0.1, 0, 0.05, 0.2); o.leds = [led(0xff3c8a)]; cyl(g, o.leds[0], 0, 0.205, 0, 0.035, 0.02); cyl(g, M.orange, 0, 0.06, 0, 0.052, 0.02);
        break;
      case 'elight': {
        for (let i = 0; i < 3; i++) { const l = box(g, M.steel, Math.cos(i * 2.1) * 0.08, 0.2, Math.sin(i * 2.1) * 0.08, 0.012, 0.42, 0.012); l.rotation.z = Math.cos(i * 2.1) * 0.35; l.rotation.x = -Math.sin(i * 2.1) * 0.35; }
        box(g, M.body, 0, 0.45, 0, 0.16, 0.12, 0.08);
        o.lampM = led(0xfff2d0); box(g, o.lampM, 0, 0.45, 0.042, 0.14, 0.1, 0.004);
        break;
      }
      case 'spike': {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.3, 8), M.iron); c.position.y = 0.05; c.rotation.x = Math.PI; g.add(c);
        box(g, M.iron, 0, 0.2, 0, 0.06, 0.03, 0.06);
        o.leds = [led(0x6fe0ff)]; box(g, o.leds[0], 0, 0.22, 0, 0.03, 0.012, 0.03);
        break;
      }
      case 'flare': cyl(g, M.red, 0, 0, 0, 0.018, 0.22, Math.PI / 2); cyl(g, M.grip, 0, 0, 0.12, 0.019, 0.03, Math.PI / 2); break;
      case 'tablets': cyl(g, M.white, 0, 0.04, 0, 0.025, 0.08); cyl(g, M.orange, 0, 0.085, 0, 0.026, 0.015); break;
      default: box(g, M.body, 0, 0, 0, 0.1, 0.1, 0.1);
    }
    g.traverse((x) => { if (x.isMesh) x.castShadow = true; });
    return o;
  }

  /* ---------- glyphs for the Scribe Slate ---------- */
  function drawGlyph(ctx, glyph, seed) {
    const r = NW.Tex.rng(seed || 3), W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#1e2423'; ctx.fillRect(0, 0, W, H);
    if (!glyph) return;
    ctx.strokeStyle = 'rgba(230,226,210,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(W / 2, H / 2);
    const jitter = () => (r() - 0.5) * 6;
    if (glyph === 'tally') { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-60 + i * 16, -40 + jitter()); ctx.lineTo(-60 + i * 16 + jitter(), 40); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-70, 30); ctx.lineTo(10, -30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(40, -40); ctx.lineTo(40, 40); ctx.moveTo(60, -40); ctx.lineTo(60, 40); ctx.stroke(); }
    else if (glyph === 'spiral') { ctx.beginPath(); for (let a = 0; a < 18; a += 0.15) { const rr = a * 3.3; ctx.lineTo(Math.cos(a) * rr + jitter() * 0.3, Math.sin(a) * rr * 0.75); } ctx.stroke(); }
    else if (glyph === 'eye') { ctx.beginPath(); ctx.ellipse(0, 0, 70, 32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); }
    else if (glyph === 'hand') { ctx.beginPath(); ctx.ellipse(0, 25, 28, 32, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 12, 0); ctx.lineTo(-30 + i * 15 + jitter(), -50 + Math.abs(i - 2) * 10); ctx.stroke(); } }
    else if (glyph === 'door') { ctx.strokeRect(-30, -50, 60, 100); ctx.beginPath(); ctx.arc(18, 5, 4, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-60, 55); ctx.lineTo(60, 55); ctx.stroke(); }
    else if (glyph === 'circle') { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(jitter(), jitter(), 25 + i * 18, 0, 7); ctx.stroke(); } }
    else { ctx.font = 'italic 34px serif'; ctx.fillStyle = 'rgba(230,226,210,0.85)'; ctx.textAlign = 'center'; ctx.fillText(['g e t  o u t', 's t a y', 'w e  s e e', 'h e r e'][Math.floor(r() * 4)], 0, 10); }
    ctx.restore();
  }

  /* ================================================================== */
  class EquipmentSystem {
    constructor(game) {
      this.g = game;
      this.view = new THREE.Group(); // viewmodel attached to camera
      game.camera.add(this.view);
      this.viewModels = {};   // itemId -> model
      this.worldModels = {};  // itemId -> model
      this.raised = false; this.raiseK = 0;
      this.scanLevel = 1; this.scanNeedle = 0;
      this.recWave = new Float32Array(64); this.recResp = 0; this.recText = ''; this.recBearing = 0;
      this.thermalReading = null; this.thermalReportT = 0;
      this.pressureHist = {};
      this.qIndex = 0;
      this.swab = null; // { trace, t }
      this.analysis = null; this.analysisText = '';
      this.radioText = ''; this.radioTextT = 0;
      this.flash = { intensity: 0 };  // camera flash, rendered through the shared light budget
      this.lastSoundEvents = [];
      this.glitch = 0;
    }

    held() { const p = this.g.me(); if (!p) return null; const id = p.inv[this.g.player.slot]; return id ? this.g.state.items[id] || null : null; }
    tier(it) { return (NW.EQUIPMENT_BY_ID[it.type].tiers || [])[it.tier || 0] || {}; }

    /* ---------- per-frame ---------- */
    update(dt, t) {
      const g = this.g, st = g.state, me = g.me();
      if (!st || !me) return;
      const it = this.held();
      // viewmodel
      for (const id in this.viewModels) this.viewModels[id].group.visible = false;
      if (it && me.alive && me.hidden == null) {
        let vm = this.viewModels[it.id];
        if (!vm) { vm = this.viewModels[it.id] = buildModel(it.type); this.view.add(vm.group); vm.group.traverse((o) => { if (o.isMesh) o.castShadow = false; }); }
        vm.group.visible = true;
        const raiseable = it.type === 'thermal' || it.type === 'lens' || it.type === 'scanner' || it.type === 'recorder';
        this.raiseK += ((this.raised && raiseable ? 1 : 0) - this.raiseK) * Math.min(1, dt * 10);
        const bob = g.player.bob;
        const base = new V3(0.2, -0.2 + Math.sin(bob * 2) * 0.008, -0.38 + Math.abs(Math.cos(bob)) * 0.006);
        const up = it.type === 'lens' ? new V3(0, -0.035, -0.13) : it.type === 'thermal' ? new V3(0, -0.07, -0.2) : new V3(0.05, -0.12, -0.28);
        vm.group.position.lerpVectors(base, up, this.raiseK);
        vm.group.rotation.set(this.raiseK * (it.type === 'scanner' || it.type === 'recorder' ? 0.9 : 0), it.type === 'lens' ? Math.PI * this.raiseK : 0, 0);
        if (it.type === 'lens' && this.raiseK > 0.5) vm.group.rotation.y = Math.PI; // screen faces the eye
        if ((it.type === 'lens' || (it.type === 'thermal' && it.on)) && this.raiseK > 0.8) vm.group.visible = false;
        if (it.type === 'radio') vm.group.rotation.set(0.3, -0.3, 0);
        if (it.type === 'slate') vm.group.rotation.set(0.9, 0, 0);
        this._drive(it, vm, dt, t, true);
      } else this.raiseK = 0;
      this.g.effects.setLens(it && it.type === 'lens' && this.raiseK > 0.7 && me.alive);
      this.g.effects.setThermal(it && it.type === 'thermal' && it.on && this.raiseK > 0.7 && me.alive, this.thermalReading);
      // placed / dropped items in the world
      const live = new Set();
      const B = g.level.budget;
      for (const id in st.items) {
        const wi = st.items[id];
        if (wi.inTruck || wi.holder) continue;
        live.add(id);
        let wm = this.worldModels[id];
        if (!wm) {
          wm = this.worldModels[id] = buildModel(wi.type);
          g.scene.add(wm.group);
          const hit = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false })); hit.scale.set(0.35, 0.35, 0.35); hit.position.y = 0.1; wm.group.add(hit);
          hit.userData.interact = { kind: 'item', id }; wm.hit = hit; g.level.interactables.push(hit);
        }
        wm.group.position.set(wi.x, wi.y, wi.z); wm.group.rotation.set(0, wi.ry || 0, 0);
        if (!wi.placed && (wi.type === 'scanner' || wi.type === 'radio' || wi.type === 'thermal' || wi.type === 'recorder' || wi.type === 'lens')) wm.group.rotation.z = Math.PI / 2 * 0.98;
        this._drive(wi, wm, dt, t, false);
        if (wi.type === 'elight' && wi.on) B.request({ x: wi.x, y: wi.y + 0.6, z: wi.z, color: 0xfff2d8, distance: 11, priority: 3, intensity: 2.2 * (wi.data.flickT > t ? (Math.random() > 0.5 ? 1 : 0.1) : 1) * Math.min(1, (wi.battery || 0) / 20 + 0.2) });
        if (wi.type === 'beacon' && wi.on) B.request({ x: wi.x, y: wi.y + 0.4, z: wi.z, color: 0xff3c8a, distance: 8, priority: 3, intensity: 1 + Math.sin(t * 8) * 0.8 });
      }
      for (const id in this.worldModels) if (!live.has(id)) {
        const wm = this.worldModels[id]; g.scene.remove(wm.group);
        const ix = g.level.interactables.indexOf(wm.hit); if (ix >= 0) g.level.interactables.splice(ix, 1);
        delete this.worldModels[id];
      }
      // held electronic light sources (e-light carried counts as light)
      const cp = g.camera.position;
      if (it && it.type === 'elight' && it.on) B.request({ x: cp.x, y: cp.y - 0.3, z: cp.z, color: 0xfff2d8, intensity: 1.6, distance: 10, priority: 5 });
      if (this.flash.intensity > 0.1) { const fw = new V3(0, 0, -1).applyQuaternion(g.camera.quaternion); B.request({ x: cp.x + fw.x * 0.4, y: cp.y + fw.y * 0.4, z: cp.z + fw.z * 0.4, color: 0xf4f8ff, intensity: this.flash.intensity, distance: 14, priority: 10 }); }
      // camera flash decay
      this.flash.intensity = Math.max(0, this.flash.intensity - dt * 120);
      // swab progress
      if (this.swab) {
        this.swab.t += dt;
        if (!g.input.keys.KeyE || !it || it.type !== 'samplekit') { this.swab = null; g.ui.progress(null); }
        else { g.ui.progress('Swabbing…', this.swab.t / 2.2); if (this.swab.t >= 2.2) { g.net.act({ k: 'swab', item: it.id, trace: this.swab.trace.id }); this.analysis = { t: 0, dur: it.tier ? 3 : 6 }; this.analysisText = 'ANALYSING'; this.swab = null; g.ui.progress(null); NW.Audio.play('pickup', null, 0.6); } }
      }
      if (this.analysis) { this.analysis.t += dt; }
      if (this.glitch > 0) this.glitch -= dt;
    }

    /** Update LEDs/screens of a model from its item state. */
    _drive(it, m, dt, t, isHeld) {
      const g = this.g, st = g.state;
      const pos = isHeld ? g.camera.position : new V3(it.x, it.y, it.z);
      const f = isHeld ? g.me().f : it.f;
      const hunting = st.hunting && g.entityNear(pos, f, 12);
      const glitchy = hunting || this.glitch > 0 || (isHeld && g.me().composure < 25 && Math.random() < 0.02);
      const scr = m.screen;
      const redraw = scr && (isHeld || (Math.floor(t * 4) !== m._lastDraw));
      if (scr) m._lastDraw = Math.floor(t * 4);
      switch (it.type) {
        case 'scanner': {
          let level = 0;
          if (it.on) {
            level = this.scannerLevel(pos, f, it);
            if (glitchy) level = 1 + Math.floor(Math.random() * 5);
            if (isHeld) {
              this.scanLevel = level;
              this._beepT = (this._beepT || 0) - dt;
              if (level >= 2 && this._beepT <= 0) { NW.Audio.play('beep', null, 0.35 + level * 0.1, { f: 600 + level * 250, d: 0.04, ui: true }); this._beepT = [1, 1, 0.6, 0.35, 0.18, 0.08][level]; }
            }
          }
          m.leds.forEach((l, i) => (l.emissiveIntensity = it.on && level > i ? 2.5 : 0.05));
          if (redraw) this._screen(scr, (c, W, H) => {
            c.fillStyle = '#0a110d'; c.fillRect(0, 0, W, H);
            if (!it.on) return;
            c.fillStyle = level >= 5 ? '#ff4b3a' : '#7dffb0'; c.font = 'bold 22px monospace'; c.fillText(level >= 5 ? 'PEAK' : 'B' + level, 6, 26);
            c.font = '11px monospace'; c.fillStyle = '#7dffb0'; c.fillText('EM / FREQ', 66, 14);
            const dir = this.tier(it).range > 4 ? this.scannerDirection(pos, f) : null;
            if (dir != null) { c.save(); c.translate(98, 40); c.rotate(dir); c.beginPath(); c.moveTo(0, -14); c.lineTo(6, 6); c.lineTo(-6, 6); c.fill(); c.restore(); }
            c.fillRect(6, H - 12, (W - 12) * level / 5, 6);
          });
          break;
        }
        case 'thermal': {
          let reading = null;
          if (it.on) {
            const r = g.world.roomIdAt(f, pos.x, pos.z);
            if (r >= 0) {
              const prec = this.tier(it).precision || 1.5;
              const base = st.rooms[r].temp;
              reading = base + Math.sin(t * 1.3 + r) * prec * 0.5 + (Math.random() - 0.5) * prec * 0.3;
              if (glitchy) reading += (Math.random() - 0.5) * 12;
            }
            if (isHeld) { this.thermalReading = reading; this.thermalReportT -= dt; if (reading != null && reading < 5 && this.thermalReportT <= 0) { this.thermalReportT = 5; g.net.act({ k: 'thermalRead' }); } }
          } else if (isHeld) this.thermalReading = null;
          if (redraw) this._screen(scr, (c, W, H) => {
            const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#120a2a'); gr.addColorStop(1, '#3a0d1c'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
            if (!it.on) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); return; }
            c.fillStyle = reading != null && reading < 0 ? '#7fd8ff' : '#ffd8a0'; c.font = 'bold 26px monospace';
            c.fillText(reading == null ? '--.-' : reading.toFixed(this.tier(it).precision < 1 ? 1 : 0) + '°', 8, 40);
            c.font = '10px monospace'; c.fillStyle = '#fff'; c.fillText('THERMAL ' + (it.battery != null ? Math.ceil(it.battery) + 's' : ''), 8, 12);
          });
          break;
        }
        case 'recorder': {
          if (isHeld && it.on) {
            // waveform + bearing to the most recent unusual sound
            for (let i = 0; i < this.recWave.length - 1; i++) this.recWave[i] = this.recWave[i + 1];
            this.recResp = Math.max(0, this.recResp - dt * 0.4);
            this.recWave[this.recWave.length - 1] = (Math.random() - 0.5) * (0.15 + this.recResp * 1.7 + (glitchy ? 0.8 : 0));
            const ev = this.lastSoundEvents.filter((e) => t - e.t < 5 && e.f === f);
            if (ev.length) {
              const e = ev[ev.length - 1];
              const gain = this.tier(it).gain || 1;
              const d = Math.hypot(e.x - pos.x, e.z - pos.z);
              if (d < 16 * gain) {
                const ang = Math.atan2(e.x - pos.x, e.z - pos.z);
                this.recBearing = U.lerp(this.recBearing, ang, 0.2);
              }
            }
          }
          if (m.leds) m.leds[0].emissiveIntensity = it.on ? (Math.sin(t * 6) > 0 ? 2 : 0.3) : 0;
          if (redraw) this._screen(scr, (c, W, H) => {
            c.fillStyle = '#05080c'; c.fillRect(0, 0, W, H);
            if (!it.on) return;
            c.strokeStyle = this.recResp > 0.3 ? '#d7b8ff' : '#6fe0c8'; c.lineWidth = 2; c.beginPath();
            for (let i = 0; i < this.recWave.length; i++) c.lineTo(i * W / this.recWave.length, H * 0.6 + this.recWave[i] * H * 0.4);
            c.stroke();
            // bearing meter relative to facing
            const yaw = this.g.player.yaw + Math.PI;
            let rel = this.recBearing - yaw; while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
            c.fillStyle = '#6fe0c8'; c.fillRect(W / 2 + U.clamp(-rel / Math.PI, -1, 1) * (W / 2 - 6) - 3, 4, 6, 10);
            c.fillStyle = '#ffffff'; c.font = '9px monospace'; c.fillText('REC', 4, 12);
            if (this.recText && isHeld) { c.fillStyle = '#d7b8ff'; c.font = '10px monospace'; c.fillText(this.recText.slice(0, 18), 4, H - 4); }
          });
          break;
        }
        case 'samplekit': {
          if (m.lampM) m.lampM.emissiveIntensity = it.on ? 3 : 0;
          if (redraw) this._screen(scr, (c, W, H) => {
            c.fillStyle = '#0b0f0b'; c.fillRect(0, 0, W, H); c.fillStyle = '#9cff8f'; c.font = '12px monospace';
            const an = isHeld && this.analysis && this.analysis.t < this.analysis.dur;
            c.fillText(an ? 'ANALYSING' + '.'.repeat(1 + Math.floor(t * 3) % 3) : (isHeld && this.analysisText) || 'SWABS ' + it.charges, 4, 22);
            c.fillText('UV ' + (it.on ? 'ON' : 'OFF'), 4, 50);
          });
          break;
        }
        case 'lens':
          if (redraw) this._screen(scr, (c, W, H) => { c.fillStyle = '#05080c'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffd84d'; c.font = '11px monospace'; c.fillText('FRAMES ' + it.charges, 6, 18); c.fillText(this.raised ? 'LIVE' : 'RMB VIEW', 6, 36); });
          break;
        case 'motion': {
          const last = it.data.last;
          const recent = last && st.t - last.t < 1.2;
          m.leds[0].emissive.set(recent && last.phase ? 0xb04cff : 0xff2c2c);
          m.leds[0].emissiveIntensity = it.placed ? (recent ? 4 : Math.sin(t * 2) > 0.95 ? 0.6 : 0.05) : 0;
          break;
        }
        case 'pressure': {
          const r = g.world.roomIdAt(f, pos.x, pos.z);
          const active = it.placed || isHeld;
          let hpa = r >= 0 ? st.rooms[r].hpa : 1013;
          if (glitchy) hpa += (Math.random() - 0.5) * 8;
          const hist = this.pressureHist[it.id] = this.pressureHist[it.id] || [];
          m._ht = (m._ht || 0) + dt;
          if (active && m._ht > 0.25) { m._ht = 0; hist.push(hpa); if (hist.length > 80) hist.shift(); }
          const mx = Math.max(...hist, 0), mn = Math.min(...hist, 1e9);
          const collapse = hist.length > 4 && mx - hist[hist.length - 1] >= 15;
          if (redraw) this._screen(scr, (c, W, H) => {
            c.fillStyle = '#071012'; c.fillRect(0, 0, W, H);
            if (!active) return;
            c.fillStyle = collapse ? '#ff6b5a' : '#7fffd4'; c.font = 'bold 15px monospace'; c.fillText(hpa.toFixed(1) + ' hPa', 4, 16);
            c.strokeStyle = '#7fffd4'; c.beginPath();
            for (let i = 0; i < hist.length; i++) c.lineTo(i * W / 80, H - 6 - (hist[i] - (mn - 2)) / Math.max(10, mx - mn + 4) * (H - 26));
            c.stroke();
            if (collapse) { c.fillStyle = '#ff6b5a'; c.font = '10px monospace'; c.fillText('COLLAPSE', 4, H - 4); }
          });
          break;
        }
        case 'slate':
          if (m._glyph !== it.data.glyph) { m._glyph = it.data.glyph; drawGlyph(scr.ctx, it.data.glyph, it.data.glyphSeed); scr.tex.needsUpdate = true; }
          break;
        case 'radio': {
          if (m.leds) m.leds[0].emissiveIntensity = it.on ? (Math.random() * 3) : 0.4;
          if (redraw) this._screen(scr, (c, W, H) => {
            c.fillStyle = '#0e140a'; c.fillRect(0, 0, W, H); c.fillStyle = '#c8ff8a'; c.font = '10px monospace';
            c.fillText(it.on ? 'SCAN ' + (88 + (t * 3.7 % 20)).toFixed(1) : 'CH 4', 3, 14);
          });
          if (isHeld && it.on) { this._staticT = (this._staticT || 0) - dt; if (this._staticT <= 0) { this._staticT = 0.35; NW.Audio.play('static', null, 0.25, { d: 0.35, ui: true }); } }
          break;
        }
        case 'beacon': m.leds[0].emissiveIntensity = it.on ? 2 + Math.sin(t * 8) * 2 : 0.1; break;
        case 'elight': m.lampM.emissiveIntensity = it.on ? 3 : 0; break;
        case 'spike': m.leds[0].emissiveIntensity = it.placed && it.charges > 0 ? 1 + Math.sin(t * 2) * 0.5 : 0; break;
      }
    }
    _screen(scr, draw) { draw(scr.ctx, scr.c.width, scr.c.height); scr.tex.needsUpdate = true; }

    /** EM reading at a position: strongest nearby trace with falloff. */
    scannerLevel(pos, f, it) {
      const st = this.g.state, range = this.tier(it).range || 3.2;
      let level = 1;
      for (const tr of st.traces.emf) {
        if (tr.f !== f) continue;
        const d = Math.hypot(tr.x - pos.x, tr.z - pos.z) + Math.abs((tr.y || pos.y) - pos.y) * 0.5;
        if (d < range * 0.55) level = Math.max(level, tr.level);
        else if (d < range) level = Math.max(level, tr.level - 1);
        else if (d < range * 1.6) level = Math.max(level, Math.min(2, tr.level - 2));
      }
      const e = st.entity;
      if (e && e.f === f && Math.hypot(e.x - pos.x, e.z - pos.z) < 3) level = Math.max(level, 2);
      return U.clamp(level, 1, 5);
    }
    scannerDirection(pos, f) {
      const st = this.g.state; let best = null, bd = 9;
      for (const tr of st.traces.emf) { if (tr.f !== f) continue; const d = Math.hypot(tr.x - pos.x, tr.z - pos.z); if (d < bd) { bd = d; best = tr; } }
      if (!best) return null;
      const ang = Math.atan2(best.x - pos.x, best.z - pos.z);
      return -(ang - (this.g.player.yaw + Math.PI));
    }

    /* ---------- input ---------- */
    primary(down) {
      const g = this.g, it = this.held(), me = g.me();
      if (!it || !me.alive || me.hidden != null) return;
      const type = it.type;
      if (!down) { if (type === 'radio' && it.on) g.net.act({ k: 'toggle', item: it.id }); return; }
      switch (type) {
        case 'scanner': case 'thermal': case 'recorder': case 'samplekit':
          g.net.act({ k: 'toggle', item: it.id }); NW.Audio.play('click', null, 0.6, { ui: true });
          if (type === 'recorder' && !it.on) { this.recText = ''; }
          break;
        case 'radio': if (!it.on) g.net.act({ k: 'toggle', item: it.id }); break;
        case 'lens': this.photo(it); break;
        case 'motion': case 'pressure': case 'slate': case 'beacon': case 'elight': case 'spike': this.place(it); break;
        case 'flare': {
          const fwd = new V3(0, 0, -1).applyQuaternion(g.camera.quaternion);
          const p = g.camera.position.clone().addScaledVector(fwd, 2.5);
          g.net.act({ k: 'flare', item: it.id, pos: { x: p.x, y: p.y, z: p.z } });
          break;
        }
        case 'tablets': g.net.act({ k: 'tablets', item: it.id }); NW.Audio.play('swallow', null, 0.8, { ui: true }); break;
      }
    }
    secondary(down) { this.raised = down; if (down) { const it = this.held(); if (it && it.type === 'lens') NW.Audio.play('flash_charge', null, 0.4, { ui: true }); } }
    /** Q: ask a question into the recorder (or speak aloud otherwise). */
    ask() {
      const g = this.g, it = this.held();
      const Q = [['where', 'Where are you?'], ['what', 'What do you want?'], ['who', 'Who are you?'], ['sign', 'Give us a sign.'], ['age', 'How old are you?']];
      const [q, text] = Q[this.qIndex++ % Q.length];
      if (it && it.type === 'recorder' && it.on) { g.net.act({ k: 'ask', item: it.id, q, text }); this.recText = 'LISTENING…'; }
      else g.net.act({ k: 'say', text });
      g.ui.subtitle('You: "' + text + '"', 2);
    }

    place(it) {
      const g = this.g;
      const hit = g.player.aimFloor(2.8);
      if (!hit) { g.ui.toast('Aim at the floor nearby to place.'); return; }
      g.net.act({ k: 'place', item: it.id, pos: hit, ry: g.player.yaw });
      NW.Audio.play('thud', hit, 0.4);
    }
    drop() {
      const g = this.g, it = this.held(); if (!it) return;
      const hit = g.player.aimFloor(1.6) || { f: g.me().f, x: g.camera.position.x, y: g.me().f * g.world.FH + 0.02, z: g.camera.position.z };
      g.net.act({ k: 'drop', item: it.id, pos: hit, ry: g.player.yaw });
    }

    photo(it) {
      const g = this.g;
      if (it.charges <= 0) { g.ui.toast('Out of film.'); return; }
      if (this.raiseK < 0.6) { this.raised = true; g.ui.toast('Raise the lens (hold RMB) to frame a shot.'); return; }
      // what is in frame?
      const cam = g.camera, frustum = new THREE.Frustum(), m = new THREE.Matrix4();
      m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(m);
      const f = g.me().f;
      let entity = false, distort = null;
      const ev = g.entityView;
      if (ev && ev.root.visible && ev.vis > 0.3) {
        const c = ev.root.position.clone(); c.y += 1.2;
        if (frustum.containsPoint(c) && c.distanceTo(cam.position) < 14 && g.world.los(f, cam.position.x, cam.position.z, c.x, c.z)) entity = true;
      }
      for (const s of g.level.distortionObjects()) {
        const d = s.userData.distort;
        if (d.f !== f || !frustum.containsPoint(s.position) || s.position.distanceTo(cam.position) > 9) continue;
        if (!g.world.los(f, cam.position.x, cam.position.z, s.position.x, s.position.z)) continue;
        distort = d.id; break;
      }
      this.flash.intensity = 40;
      NW.Audio.play('shutter', null, 0.9, { ui: true });
      g.net.act({ k: 'photo', item: it.id, entity, distort });
      // capture a thumbnail for the tablet gallery after the next render
      g.capturePhoto({ entity, distortion: !!distort });
    }

    /** Begin swabbing the touch point under the crosshair. */
    tryBeginSwab(obj) {
      const it = this.held();
      if (!it || it.type !== 'samplekit' || !obj || !obj.userData.trace) return false;
      if (!it.on) { this.g.ui.toast('Switch on the UV lamp (LMB) to see touch points.'); return true; }
      if (it.charges <= 0) { this.g.ui.toast('No swabs left.'); return true; }
      if (obj.userData.trace.swabbed) { this.g.ui.toast('Already sampled.'); return true; }
      this.swab = { trace: obj.userData.trace, t: 0 };
      return true;
    }

    /* ---------- events ---------- */
    onEvent(e) {
      const g = this.g, t = g.state ? g.state.t : 0;
      if (e.t === 'sound') this.lastSoundEvents.push({ x: e.x, z: e.z, f: e.f, t: g.time });
      if (this.lastSoundEvents.length > 12) this.lastSoundEvents.shift();
      if (e.t === 'voice' && e.pid === g.myId) { this.recResp = 1; this.recText = 'EVP ' + e.text; this.lastSoundEvents.push({ x: e.x, z: e.z, f: e.f, t: g.time }); }
      if (e.t === 'voice_none' && e.to === g.myId) this.recText = 'NO RESPONSE';
      if (e.t === 'swab' && e.to === g.myId) { this.analysis = null; this.analysisText = e.residue ? 'RESIDUE +' : 'NEGATIVE'; }
      if (e.t === 'item' && e.flicker && g.state.items[e.id]) g.state.items[e.id].data.flickT = g.time + 0.8;
      void t;
    }
  }

  NW.EquipmentSystem = EquipmentSystem;
  NW.buildItemModel = buildModel;
})();
