/* Atmosphere — weather, lightning and torch-lit dust.
 *
 *  Rain (apartments, clinic, ferry) or wind-blown snow (observatory) falls
 *  around the camera when outdoors; indoors you hear it on the roof.
 *  Lightning is scheduled from the shared seed and mission clock so every
 *  investigator sees the same flash. Dust motes are only visible inside the
 *  head-torch cone, which sells the beam without a volumetric light.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const WEATHER = { observatory: 'snow', apartments: 'rain', clinic: 'drizzle', ferry: 'storm' };

  class Atmosphere {
    constructor(game) {
      this.g = game;
      this.kind = WEATHER[game.world.loc.id] || 'rain';
      this.seed = game.state.seed >>> 0;
      this.flash = 0; this.thunderAt = -1; this.lastSlot = -1;
      this._buildPrecip();
      this._buildDust();
    }
    _buildPrecip() {
      const N = this.kind === 'storm' ? 2600 : this.kind === 'snow' ? 1400 : this.kind === 'drizzle' ? 1000 : 2000;
      const snow = this.kind === 'snow';
      this.box = { w: 36, h: 16 };
      if (snow) {
        const pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 36; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = (Math.random() - 0.5) * 36; }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.precip = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfd8e4, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
      } else {
        const pos = new Float32Array(N * 6);
        for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 36, y = Math.random() * 16, z = (Math.random() - 0.5) * 36; pos.set([x, y, z, x + 0.03, y - 0.45, z], i * 6); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.precip = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8ea0b4, transparent: true, opacity: this.kind === 'drizzle' ? 0.25 : 0.4, depthWrite: false }));
      }
      this.precip.frustumCulled = false;
      this.g.scene.add(this.precip);
      this.speed = snow ? 1.1 : this.kind === 'storm' ? 16 : this.kind === 'drizzle' ? 9 : 13;
    }
    _buildDust() {
      const N = 420, pos = new Float32Array(N * 3), seed = new Float32Array(N);
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 10; pos[i * 3 + 1] = (Math.random() - 0.5) * 4; pos[i * 3 + 2] = (Math.random() - 0.5) * 10; seed[i] = Math.random() * 100; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
      this.dustMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uCam: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3() }, uTime: { value: 0 }, uOn: { value: 1 }, uScale: { value: 300 } },
        vertexShader: `attribute float seed; uniform vec3 uCam; uniform vec3 uDir; uniform float uTime; uniform float uScale; varying float vA;
          void main(){
            vec3 p = position + vec3(sin(uTime*0.13+seed)*0.4, sin(uTime*0.07+seed*2.0)*0.3, cos(uTime*0.11+seed)*0.4);
            p = mod(p - uCam + 5.0, 10.0) - 5.0 + uCam;                     // wrap around the camera
            vec3 d = p - uCam; float dist = length(d);
            float cone = smoothstep(0.9, 0.97, dot(normalize(d), uDir));     // inside the torch beam
            vA = cone * smoothstep(7.0, 1.0, dist) * smoothstep(0.2, 0.8, dist);
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_PointSize = uScale * 0.012 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform float uOn; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c)); gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), a * vA * 0.55 * uOn); }`
      });
      this.dust = new THREE.Points(geo, this.dustMat); this.dust.frustumCulled = false;
      this.g.scene.add(this.dust);
    }
    /** Deterministic lightning: one possible strike per 31 s slot of mission time. */
    _strikeTime(slot) {
      let h = (this.seed ^ (slot * 2654435761)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = (h ^ (h >>> 13)) >>> 0;
      return (h % 1000) / 1000;
    }

    update(dt, outdoors) {
      const g = this.g, cam = g.camera, st = g.state, t = st.t;
      // precipitation follows the camera, only drawn outdoors
      this.precip.visible = outdoors;
      if (outdoors) {
        const p = this.precip.geometry.attributes.position, a = p.array, stride = this.kind === 'snow' ? 3 : 6;
        const fall = this.speed * dt, wind = this.kind === 'snow' ? 1.6 * dt : this.kind === 'storm' ? 2.5 * dt : 0.6 * dt;
        for (let i = 0; i < a.length; i += stride) {
          a[i + 1] -= fall; a[i] += wind;
          if (stride === 6) { a[i + 4] -= fall; a[i + 3] += wind; }
          if (a[i + 1] < 0) { const nx = (Math.random() - 0.5) * 36, ny = 16, nz = (Math.random() - 0.5) * 36; a[i] = nx; a[i + 1] = ny; a[i + 2] = nz; if (stride === 6) { a[i + 3] = nx + 0.03; a[i + 4] = ny - 0.45; a[i + 5] = nz; } }
        }
        p.needsUpdate = true;
        this.precip.position.set(cam.position.x, cam.position.y - 8, cam.position.z);
      }
      // dust in the torch beam (indoors)
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      this.dustMat.uniforms.uCam.value.copy(cam.position); this.dustMat.uniforms.uDir.value.copy(fwd);
      this.dustMat.uniforms.uTime.value = g.time; this.dustMat.uniforms.uOn.value = g.player.torch && !outdoors ? 1 : 0;
      this.dustMat.uniforms.uScale.value = g.renderer.domElement.height;
      // lightning
      if (this.kind !== 'snow') {
        const slot = Math.floor(t / 31);
        const at = slot * 31 + 4 + this._strikeTime(slot) * 25;
        const chance = this.kind === 'storm' ? 1 : this.kind === 'rain' ? 0.6 : 0.3;
        if (slot !== this.lastSlot && t >= at && this._strikeTime(slot + 9999) < chance) {
          this.lastSlot = slot; this.flash = 1;
          this.thunderAt = g.time + 0.6 + this._strikeTime(slot + 77) * 2.2;
        }
        if (this.thunderAt > 0 && g.time >= this.thunderAt) { this.thunderAt = -1; NW.Audio.play('thunder', null, outdoors ? 1 : 0.6, { ui: true }); }
      }
      if (this.flash > 0) {
        this.flash = Math.max(0, this.flash - dt * 3.5);
        const k = this.flash > 0.6 ? 1 : this.flash > 0.4 ? 0.2 : this.flash > 0.25 ? 0.8 : this.flash;
        g.moon.intensity += k * (outdoors ? 3.5 : 1.2);
        if (outdoors) g.hemi.intensity += k * 1.2;
        const glass = NW.makeMat('glass2'); glass.emissiveIntensity = 0.45 + k * 4;
      }
      NW.Audio.setRain(this.kind === 'snow' ? (outdoors ? 0.35 : 0.1) : outdoors ? 1 : 0.3, this.kind);
    }
    dispose() { const sc = this.precip.parent; if (sc) { sc.remove(this.precip); sc.remove(this.dust); } NW.Audio.setRain(0); }
  }
  NW.Atmosphere = Atmosphere;
})();
