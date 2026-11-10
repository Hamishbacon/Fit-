/* PlayerController — first-person movement, look, interaction and hiding.
 * Movement is client-authoritative (co-op trust model) and uploaded as poses.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const U = NW.util;
  const V3 = THREE.Vector3;

  class Input {
    constructor(el) {
      this.keys = {}; this.mouse = { dx: 0, dy: 0, l: false, r: false }; this.wheel = 0; this.locked = false; this.el = el;
      this.pressed = {};
      addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (!this.keys[e.code]) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        if (['Tab', 'Space', 'KeyQ'].indexOf(e.code) >= 0 && this.locked) e.preventDefault();
        if (e.code === 'Tab') e.preventDefault();
      });
      addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      addEventListener('blur', () => { this.keys = {}; });
      document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; if (this.onLock) this.onLock(this.locked); });
      el.addEventListener('mousedown', (e) => {
        if (!this.locked) return;
        if (e.button === 0) { this.mouse.l = true; this.pressed.Mouse0 = true; }
        if (e.button === 2) { this.mouse.r = true; this.pressed.Mouse2 = true; }
      });
      addEventListener('mouseup', (e) => { if (e.button === 0) { this.mouse.l = false; this.pressed.Mouse0Up = true; } if (e.button === 2) { this.mouse.r = false; this.pressed.Mouse2Up = true; } });
      addEventListener('mousemove', (e) => { if (this.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } });
      addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    take(code) { const v = !!this.pressed[code]; this.pressed[code] = false; return v; }
    lock() { try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* */ } }
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
    endFrame() { this.mouse.dx = 0; this.mouse.dy = 0; this.wheel = 0; this.pressed = {}; }
  }

  class PlayerController {
    constructor(game) {
      this.g = game;
      this.pos = new V3(); this.f = 1; this.yaw = Math.PI; this.pitch = 0;
      this.vel = new V3(); this.speed = 0; this.running = false; this.crouch = false; this.crouchK = 0;
      this.stamina = 1; this.bob = 0; this.stepAcc = 0; this.torch = true; this.slot = 0;
      this.ray = new THREE.Raycaster(); this.ray.far = 2.4;
      this.aim = null; this.poseT = 0; this.spectate = 0;
      this.hideView = null;
    }
    spawn(p) { this.pos.set(p.x, p.y, p.z); this.f = p.f; this.yaw = p.yaw || Math.PI; }

    update(dt) {
      const g = this.g, inp = g.input, w = g.world, me = g.me(), cam = g.camera;
      if (!me) return;
      const sens = 0.0022 * (NW.Save.data.settings.sens || 1);
      const inv = NW.Save.data.settings.invert ? -1 : 1;
      if (g.uiBlocking()) { inp.mouse.dx = inp.mouse.dy = 0; }
      // ---------- incapacitated: spectate teammates ----------
      if (!me.alive) return this._spectate(dt);
      // ---------- hidden ----------
      if (me.hidden != null) {
        const h = w.hides[me.hidden];
        const look = Math.atan2(-(h.entry[0] - h.x), -(h.entry[1] - h.z));
        this.yaw = U.clamp(this.yaw - inp.mouse.dx * sens, look - 0.7, look + 0.7);
        this.pitch = U.clamp(this.pitch - inp.mouse.dy * sens * inv, -0.4, 0.3);
        cam.position.set(h.x + 0.5 + (h.entry[0] - h.x) * 0.3, h.f * w.FH + 1.55, h.z + 0.5 + (h.entry[1] - h.z) * 0.3);
        cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        if (inp.take('KeyE') || inp.take('Space')) g.net.act({ k: 'unhide' });
        this.speed = 0; this._pose(dt, true);
        return;
      }
      // ---------- look ----------
      this.yaw -= inp.mouse.dx * sens;
      this.pitch = U.clamp(this.pitch - inp.mouse.dy * sens * inv, -1.45, 1.45);
      // ---------- move ----------
      const k = inp.keys;
      let mx = 0, mz = 0;
      if (!g.uiBlocking()) {
        if (k.KeyW || k.ArrowUp) mz -= 1; if (k.KeyS || k.ArrowDown) mz += 1;
        if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
      }
      if (inp.take('KeyC') || inp.take('ControlLeft')) this.crouch = !this.crouch;
      const len = Math.hypot(mx, mz);
      const wantRun = (k.ShiftLeft || k.ShiftRight) && len > 0 && !this.crouch && this.stamina > 0.05;
      this.running = wantRun && !this.exhausted;
      this.stamina = U.clamp(this.stamina + (this.running ? -dt / 4.5 : dt / 6), 0, 1);
      if (this.stamina <= 0.02) this.exhausted = true; if (this.stamina > 0.4) this.exhausted = false;
      const room = w.roomIdAt(this.f, this.pos.x, this.pos.z);
      const flooded = room >= 0 && w.rooms[room].flooded;
      let spd = this.crouch ? 0.95 : this.running ? 3.3 : 1.75;
      if (flooded) spd *= 0.62;
      if (me.composure < 15) spd *= 0.92;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let tx = 0, tz = 0;
      if (len > 0) { tx = (fx * -mz + rx * mx) / len * spd; tz = (fz * -mz + rz * mx) / len * spd; }
      this.vel.x += (tx - this.vel.x) * Math.min(1, dt * 10); this.vel.z += (tz - this.vel.z) * Math.min(1, dt * 10);
      let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
      [nx, nz] = w.collide(this.f, nx, nz, 0.28);
      // stairs and floors
      const prevY = this.pos.y;
      const gy = w.heightAt(this.f, nx, nz);
      this.pos.set(nx, gy, nz);
      const nf = w.floorFromHeight(gy + 0.01);
      if (nf !== this.f) {
        // only change floor if the tile is valid on the new floor
        if (w.walkable(nf, Math.floor(nx), Math.floor(nz))) this.f = nf;
      }
      this.pos.y = w.heightAt(this.f, nx, nz);
      const moved = Math.hypot(this.vel.x, this.vel.z);
      this.speed = moved;
      void prevY;
      // head bob + footsteps
      if (moved > 0.2) {
        this.bob += dt * moved * 4.2;
        this.stepAcc += moved * dt;
        const stride = this.running ? 0.95 : this.crouch ? 0.6 : 0.75;
        if (this.stepAcc > stride) { this.stepAcc = 0; NW.Audio.play('step', null, this.crouch ? 0.15 : this.running ? 0.55 : 0.32, { surf: this.surface(room, flooded), ui: false }); }
      }
      this.crouchK += ((this.crouch ? 1 : 0) - this.crouchK) * Math.min(1, dt * 8);
      const eye = 1.62 - this.crouchK * 0.62 + (moved > 0.2 ? Math.sin(this.bob * 2) * 0.03 : 0);
      cam.position.set(this.pos.x, this.pos.y + eye, this.pos.z);
      cam.rotation.set(this.pitch, this.yaw, (moved > 0.2 ? Math.sin(this.bob) * 0.004 : 0), 'YXZ');
      // torch
      if (inp.take('KeyF')) { this.torch = !this.torch; NW.Audio.play('click', null, 0.5, { ui: true }); }
      // inventory slots
      for (let i = 0; i < 4; i++) if (inp.take('Digit' + (i + 1))) this.slot = i;
      if (inp.wheel) this.slot = (this.slot + (inp.wheel > 0 ? 1 : 3)) % 4;
      // interaction
      this._aim();
      if (inp.take('KeyE')) this._interact();
      if (inp.take('KeyG')) g.equip.drop();
      if (inp.take('KeyQ')) g.equip.ask();
      if (inp.take('KeyV')) { g.net.act({ k: 'say', text: 'Hello? Is anyone here?' }); g.ui.subtitle('You: "Hello? Is anyone here?"', 2); }
      if (inp.take('Mouse0')) g.equip.primary(true);
      if (inp.take('Mouse0Up')) g.equip.primary(false);
      if (inp.take('Mouse2')) g.equip.secondary(true);
      if (inp.take('Mouse2Up')) g.equip.secondary(false);
      this._pose(dt);
    }
    surface(room, flooded) {
      if (flooded) return 'water';
      const r = room >= 0 ? this.g.world.rooms[room] : null;
      if (!r) return 'hard';
      const name = NW.Tex.surfaceFor(this.g.world.loc.id, r.outdoor ? 'outdoor' : r.kind, 'floor');
      return name === 'carpet' ? 'soft' : name === 'metal' || name === 'deck' ? 'metal' : name === 'gravel' ? 'soft' : 'hard';
    }
    _pose(dt, force) {
      this.poseT -= dt;
      if (this.poseT > 0 && !force) return;
      this.poseT = 1 / NW.NET.POSE_HZ;
      this.g.net.act({ k: 'pose', x: this.pos.x, y: this.pos.y, z: this.pos.z, f: this.f, yaw: this.yaw, pitch: this.pitch, speed: this.speed, running: this.running, crouch: this.crouch, torch: this.torch, slot: this.slot });
    }

    /** Raycast interactables under the crosshair. */
    _aim() {
      const g = this.g, cam = g.camera;
      this.ray.setFromCamera({ x: 0, y: 0 }, cam);
      this.ray.far = 2.5;
      const objs = g.level.interactables.filter((o) => o.userData.interact && (o.visible !== false));
      const uvObjs = g.level.touchObjects();
      const hits = this.ray.intersectObjects(objs.concat(uvObjs), false);
      this.aim = null;
      for (const h of hits) {
        const ia = h.object.userData.interact; if (!ia) continue;
        // don't interact through walls: check grid LOS to the hit point
        if (!g.world.los(this.f, cam.position.x, cam.position.z, h.point.x, h.point.z) && ia.kind !== 'door' && ia.kind !== 'hide' && ia.kind !== 'truck' && ia.kind !== 'generator') continue;
        this.aim = { ia, obj: h.object, point: h.point, dist: h.distance };
        break;
      }
      g.ui.prompt(this.aim ? this.promptFor(this.aim.ia) : null);
    }
    promptFor(ia) {
      const g = this.g, st = g.state;
      switch (ia.kind) {
        case 'door': { const d = st.doors[ia.id]; const wd = g.world.doors[ia.id]; return d.locked ? (wd.sealed ? 'Sealed — needs site power' : 'Locked') : (d.open ? '[E] Close door' : '[E] Open door'); }
        case 'switch': return st.power ? '[E] Light switch' : '[E] Light switch (no power)';
        case 'generator': return st.power ? '[E] Shut down generator' : '[E] Start generator';
        case 'hide': return '[E] Hide';
        case 'truck': return '[E] Field Unit — equipment locker / end investigation';
        case 'note': return '[E] Read document';
        case 'item': { const it = st.items[ia.id]; if (!it) return null; const def = NW.EQUIPMENT_BY_ID[it.type]; const extra = (it.type === 'elight' || it.type === 'beacon') && it.placed ? '   [R] ' + (it.type === 'beacon' ? 'Activate' : 'Toggle') : ''; return '[E] Pick up ' + def.name + extra; }
        case 'touch': return '[Hold E] Swab touch point';
        case 'device': { const d = st.devices[ia.id], dv = g.world.devices[ia.id]; const nm = { tv: 'television', monitor: 'monitor', radio: 'radio' }[dv.kind]; return '[E] Switch ' + (d && d.on ? 'off' : 'on') + ' the ' + nm; }
        case 'relic': return st.relic && st.relic.uses > 0 ? '[E] Use ' + g.world.relic.name + ' — risky (' + st.relic.uses + ' left)' : g.world.relic.name + ' (spent)';
      }
      return null;
    }
    _interact() {
      const g = this.g, a = this.aim;
      if (!a) return;
      const ia = a.ia;
      switch (ia.kind) {
        case 'door': g.net.act({ k: 'door', id: ia.id }); break;
        case 'switch': g.net.act({ k: 'switch', room: ia.id }); NW.Audio.play('switch', a.point, 0.6); break;
        case 'generator': g.net.act({ k: 'generator' }); break;
        case 'hide': g.net.act({ k: 'hide', id: ia.id }); break;
        case 'truck': g.ui.openLocker(); break;
        case 'note': g.net.act({ k: 'note', id: ia.id }); break;
        case 'item': g.net.act({ k: 'pickup', item: ia.id }); NW.Audio.play('pickup', null, 0.6, { ui: true }); break;
        case 'touch': g.equip.tryBeginSwab(a.obj); break;
        case 'device': g.net.act({ k: 'device', id: ia.id }); NW.Audio.play('click', a.point, 0.6); break;
        case 'relic': if (g.state.hunting) NW.UI.toast('Not now.'); else g.net.act({ k: 'relic' }); break;
      }
    }
    /** R on a placed beacon / e-light toggles it. */
    altInteract() {
      const a = this.aim; if (!a || a.ia.kind !== 'item') return;
      this.g.net.act({ k: 'toggle', item: a.ia.id });
    }

    /** Point on the floor under the crosshair within reach, or null. */
    aimFloor(maxD) {
      const g = this.g, cam = g.camera, w = g.world;
      const dir = new V3(0, 0, -1).applyQuaternion(cam.quaternion);
      const fy = w.heightAt(this.f, this.pos.x, this.pos.z);
      if (dir.y > -0.05) return null;
      const t = (fy - cam.position.y) / dir.y;
      const p = cam.position.clone().addScaledVector(dir, t);
      if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) > maxD) {
        const s = maxD / Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
        p.x = this.pos.x + (p.x - this.pos.x) * s; p.z = this.pos.z + (p.z - this.pos.z) * s;
      }
      if (!w.walkable(this.f, Math.floor(p.x), Math.floor(p.z)) || !w.los(this.f, this.pos.x, this.pos.z, p.x, p.z)) return null;
      return { f: this.f, x: p.x, y: w.heightAt(this.f, p.x, p.z) + 0.01, z: p.z };
    }

    _spectate(dt) {
      const g = this.g, inp = g.input, cam = g.camera;
      const alive = Object.values(g.state.players).filter((p) => p.alive);
      if (inp.take('Mouse0') || inp.take('Space')) this.spectate++;
      if (!alive.length) {
        // free orbit above where we fell
        this.yaw -= inp.mouse.dx * 0.002; cam.position.set(this.pos.x + Math.sin(this.yaw) * 3, this.pos.y + 3, this.pos.z + Math.cos(this.yaw) * 3);
        cam.lookAt(this.pos.x, this.pos.y + 0.5, this.pos.z); return;
      }
      const p = alive[this.spectate % alive.length];
      this.yaw -= inp.mouse.dx * 0.003;
      this.pitch = U.clamp(this.pitch - inp.mouse.dy * 0.003, -0.6, 0.8);
      const d = 2.4;
      const tx = p.x - Math.sin(this.yaw) * d * Math.cos(this.pitch), tz = p.z - Math.cos(this.yaw) * d * Math.cos(this.pitch);
      const [cx, cz] = g.world.collide(p.f, tx, tz, 0.2);
      cam.position.set(cx, p.y + 1.6 + Math.sin(this.pitch) * d, cz);
      cam.lookAt(p.x, p.y + 1.4, p.z);
      g.ui.spectating(p.name);
    }
  }

  NW.Input = Input;
  NW.PlayerController = PlayerController;
})();
