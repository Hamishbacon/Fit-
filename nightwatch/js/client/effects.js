/* Visual effects: Field Composure distortion, thermal & lens viewfinders,
 * UV lamp, hallucinations and per-room haze.
 */
(function () {
  'use strict';
  const NW = window.NW;

  class Effects {
    constructor(game) {
      this.g = game;
      this.el = document.getElementById('fx');
      this.grain = document.getElementById('grain');
      this.vign = document.getElementById('vignette');
      this.lensEl = document.getElementById('lensView');
      this.thermEl = document.getElementById('thermView');
      this.canvas = game.renderer.domElement;
      this.thermal = false; this.lens = false;
      this.ghosts = [];
      this.uv = new THREE.SpotLight(0x8a5cff, 0, 7, 0.5, 0.6, 2);
      game.camera.add(this.uv); this.uv.position.set(0.15, -0.1, 0); this.uv.target.position.set(0.1, -0.2, -3); game.camera.add(this.uv.target);
      this.grainCtx = this.grain.getContext('2d');
      this.grainT = 0; this.shock = 0; this.heartT = 0;
    }
    setThermal(on, reading) {
      if (on !== this.thermal) {
        this.thermal = on; this.thermEl.hidden = !on;
        const scene = this.g.scene;
        scene.overrideMaterial = on ? this._thermalMat() : null;
        // sprites/points cannot use the override material: hide them while imaging
        if (on) { this._hidden = []; scene.traverse((o) => { if ((o.isSprite || o.isPoints) && o.visible) { o.visible = false; this._hidden.push(o); } }); }
        else if (this._hidden) { this._hidden.forEach((o) => (o.visible = true)); this._hidden = null; }
        this._applyFilter();
      }
      if (on) {
        this._updateThermal();
        document.getElementById('thermReadout').textContent = reading == null ? '--.- °C' : reading.toFixed(1) + ' °C';
      }
    }
    /** False-colour heat shader driven by replicated room temperatures (a W×H texture per floor). */
    _thermalMat() {
      if (this._tm) return this._tm;
      const w = this.g.world;
      this._tdata = new Uint8Array(w.W * w.H * 4);
      this._ttex = new THREE.DataTexture(this._tdata, w.W, w.H, THREE.RGBAFormat);
      this._ttex.magFilter = THREE.LinearFilter; this._ttex.minFilter = THREE.LinearFilter;
      this._tm = new THREE.ShaderMaterial({
        uniforms: { uTemp: { value: this._ttex }, uSize: { value: new THREE.Vector2(w.W, w.H) }, uPlayers: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -99, 0, 0)) }, uEnt: { value: new THREE.Vector4(0, -99, 0, 0) }, uTime: { value: 0 }, uOutside: { value: 0 } },
        vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
        fragmentShader: `uniform sampler2D uTemp; uniform vec2 uSize; uniform vec4 uPlayers[4]; uniform vec4 uEnt; uniform float uTime; uniform float uOutside;
          varying vec3 vW; varying vec3 vN;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          vec3 pal(float t){ // -12 .. 38 °C
            float k = clamp((t + 12.0) / 50.0, 0.0, 1.0);
            vec3 a = vec3(0.05,0.0,0.18), b = vec3(0.15,0.15,0.8), c = vec3(0.1,0.75,0.7), d = vec3(0.95,0.8,0.15), e = vec3(1.0,0.25,0.1), f = vec3(1.0,1.0,0.95);
            if (k < 0.2) return mix(a,b,k/0.2); if (k < 0.4) return mix(b,c,(k-0.2)/0.2); if (k < 0.6) return mix(c,d,(k-0.4)/0.2); if (k < 0.8) return mix(d,e,(k-0.6)/0.2); return mix(e,f,(k-0.8)/0.2);
          }
          void main(){
            vec2 uv = vW.xz / uSize;
            float t = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? uOutside : texture2D(uTemp, uv).r * 60.0 - 20.0;
            t += vN.y * 0.8 - abs(vN.x) * 0.3 + (h(floor(vW.xz * 6.0) + floor(uTime * 8.0)) - 0.5) * 0.6;
            for (int i = 0; i < 4; i++) { vec4 p = uPlayers[i]; if (p.w > 0.5) { float d = length(vW.xz - p.xz); if (d < 0.42 && vW.y > p.y - 0.05 && vW.y < p.y + 1.95) t = mix(t, 34.0, smoothstep(0.42, 0.15, d)); } }
            if (uEnt.w > 0.5) { float d = length(vW.xz - uEnt.xz); if (abs(vW.y - uEnt.y - 1.0) < 1.6) t -= smoothstep(1.6, 0.0, d) * 9.0; }
            gl_FragColor = vec4(pal(t), 1.0);
          }`
      });
      return this._tm;
    }
    _updateThermal() {
      const g = this.g, w = g.world, st = g.state, me = g.me();
      const m = this._tm; if (!m) return;
      m.uniforms.uTime.value = g.time;
      m.uniforms.uOutside.value = w.loc.outsideTemp;
      this._tT = (this._tT || 0) - 1;
      if (this._tT <= 0) {
        this._tT = 10;
        const ra = w.roomAt[me.f], d = this._tdata;
        for (let i = 0; i < ra.length; i++) {
          const r = ra[i];
          const t = r >= 0 ? st.rooms[r].temp : w.loc.outsideTemp + 3;
          d[i * 4] = Math.max(0, Math.min(255, Math.round((t + 20) / 60 * 255)));
          d[i * 4 + 3] = 255;
        }
        this._ttex.needsUpdate = true;
      }
      const ps = Object.values(st.players);
      for (let i = 0; i < 4; i++) {
        const p = ps[i], u = m.uniforms.uPlayers.value[i];
        if (p && p.id !== g.myId && p.alive && p.hidden == null && p.f === me.f) u.set(p.x, p.y, p.z, 1); else u.set(0, -99, 0, 0);
      }
      const e = st.entity;
      m.uniforms.uEnt.value.set(e.x, e.y, e.z, e.f === me.f ? 1 : 0);
    }
    setLens(on) { if (on !== this.lens) { this.lens = on; this.lensEl.hidden = !on; this._applyFilter(); } }
    setUV(on) { this.uv.intensity = on ? 2.4 : 0; }
    _applyFilter() {
      const f = [];
      if (this.lens) f.push('sepia(0.35) saturate(0.6) contrast(1.15) brightness(1.15)');
      this.canvas.style.filter = f.join(' ');
    }

    update(dt, me, t) {
      if (!me) return;
      const comp = me.composure;
      const low = Math.max(0, (50 - comp) / 50);
      this.shock = Math.max(0, this.shock - dt * 0.8);
      // vignette pulses with heartbeat at low composure
      let pulse = 0;
      if (comp < 30 && me.alive) {
        this.heartT -= dt;
        if (this.heartT <= 0) { this.heartT = 0.55 + comp / 60; NW.Audio.play('heartbeat', null, 0.25 + low * 0.5, { ui: true }); this._beat = t; }
        pulse = Math.max(0, 1 - (t - (this._beat || 0)) * 3) * low;
      }
      const hunt = this.g.state.hunting ? 0.25 : 0;
      this.vign.style.opacity = Math.min(1, 0.35 + low * 0.45 + pulse * 0.3 + this.shock * 0.5 + hunt).toFixed(3);
      // film grain intensity
      this.grainT -= dt;
      if (this.grainT <= 0) {
        this.grainT = 0.06;
        const c = this.grainCtx, W = this.grain.width, H = this.grain.height;
        const img = c.createImageData(W, H);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        c.putImageData(img, 0, 0);
      }
      this.grain.style.opacity = (0.035 + low * 0.12 + (this.g.state.hunting && this.g.entityNear(this.g.camera.position, me.f, 10) ? 0.15 : 0)).toFixed(3);
      // instability: slight camera roll and FOV breathing
      if (me.alive && me.hidden == null) {
        this.g.camera.rotation.z += Math.sin(t * 0.7) * 0.012 * low;
        const fov = (NW.Save.data.settings.fov || 72) + Math.sin(t * 0.9) * 1.6 * low - this.shock * 4;
        if (Math.abs(this.g.camera.fov - fov) > 0.05) { this.g.camera.fov = fov; this.g.camera.updateProjectionMatrix(); }
      }
      if (!this.lens && !this.thermal) {
        const sat = 1 - low * 0.55;
        this.canvas.style.filter = low > 0.05 ? 'saturate(' + sat.toFixed(2) + ') contrast(' + (1 + low * 0.12).toFixed(2) + ')' : '';
      }
      // hallucinated figures
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        const gh = this.ghosts[i];
        gh.t -= dt;
        gh.v.update({ x: gh.v.pos.x, y: gh.v.pos.y, z: gh.v.pos.z, yaw: gh.yaw, visible: gh.t > 0.15, mode: 'roam' }, dt, t, false);
        if (gh.t <= 0) { gh.v.dispose(); this.ghosts.splice(i, 1); }
      }
      // room haze (the Pall)
      const st = this.g.state, r = this.g.world.roomIdAt(me.f, this.g.camera.position.x, this.g.camera.position.z);
      const haze = r >= 0 ? st.rooms[r].haze : 0;
      const room = r >= 0 ? this.g.world.rooms[r] : null;
      const base = room && room.outdoor ? 0.022 : 0.05;
      const target = base + haze * 0.18 + (this.thermal ? -0.03 : 0);
      this.g.scene.fog.density += (Math.max(0.005, target) - this.g.scene.fog.density) * Math.min(1, dt * 1.5);
      document.getElementById('condensation').style.opacity = (haze * 0.8).toFixed(2);
    }

    onShock(amount) { this.shock = Math.min(1, this.shock + amount / 12); }

    /** Single-player hallucination effects (only the targeted player sees/hears these). */
    hallucinate(e) {
      const g = this.g, cam = g.camera, me = g.me();
      const r = NW.util.rng(e.seed || 1);
      const behind = (d) => { const a = g.player.yaw + (r() - 0.5) * 1.2; return { x: cam.position.x + Math.sin(a) * d, y: cam.position.y - 0.3, z: cam.position.z + Math.cos(a) * d }; };
      switch (e.kind) {
        case 'footsteps': NW.Audio.play('steps', behind(4), 0.9); break;
        case 'door': NW.Audio.play('door_slam', behind(6), 0.8); break;
        case 'whisper': NW.Audio.play('whisper', behind(0.8), 0.9); break;
        case 'voice': g.ui.radioLine(e.name, e.text, true); NW.Audio.play('radio_in', null, 0.6, { ui: true }); break;
        case 'radio': g.ui.radioLine(e.name, e.text, true); NW.Audio.play('static', null, 0.5, { d: 0.8, ui: true }); break;
        case 'reading': g.equip.glitch = 3; break;
        case 'figure': {
          // appear ahead at the edge of the light, then vanish
          const a = g.player.yaw + Math.PI + (r() - 0.5) * 0.8;
          const d = 6 + r() * 3;
          let x = cam.position.x - Math.sin(g.player.yaw) * d, z = cam.position.z - Math.cos(g.player.yaw) * d;
          if (!g.world.walkable(me.f, Math.floor(x), Math.floor(z)) || !g.world.los(me.f, cam.position.x, cam.position.z, x, z)) { x = cam.position.x - Math.sin(g.player.yaw) * 3; z = cam.position.z - Math.cos(g.player.yaw) * 3; }
          const v = NW.hallucinationFigure(g.scene, new THREE.Vector3(x, g.world.heightAt(me.f, x, z), z), a);
          this.ghosts.push({ v, t: 0.9, yaw: a });
          NW.Audio.play('stinger', null, 0.35, { ui: true });
          break;
        }
      }
    }
  }
  NW.Effects = Effects;
})();
