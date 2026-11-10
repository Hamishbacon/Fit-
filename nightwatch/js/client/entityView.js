/* Entity and remote-investigator rendering.
 * All figures are procedural (primitives + a custom spectral shader).
 */
(function () {
  'use strict';
  const NW = window.NW;
  const V3 = THREE.Vector3;

  const SPECTRAL_VS = `
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vW = wp.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const SPECTRAL_FS = `
    uniform vec3 uColor; uniform vec3 uRim; uniform float uOpacity; uniform float uTime; uniform float uDissolve; uniform float uEmber;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      float n = n3(vW * 4.0 + vec3(0.0, uTime * 0.9, 0.0));
      float d = n3(vW * 9.0 - vec3(0.0, uTime * 0.4, 0.0));
      if (d < uDissolve) discard;
      vec3 c = mix(uColor * 0.35, uRim, rim);
      float ember = uEmber * smoothstep(0.62, 0.7, n) * (0.6 + 0.4 * sin(uTime * 6.0 + vW.y * 9.0));
      c += vec3(1.0, 0.45, 0.1) * ember * 2.0;
      float a = uOpacity * (0.55 + 0.45 * rim) * (0.75 + 0.25 * n);
      gl_FragColor = vec4(c, clamp(a + ember, 0.0, 1.0));
    }`;

  function spectralMat(look) {
    const col = new THREE.Color(look.color || '#9aa7c7');
    const rim = look.form === 'shadow' || look.form === 'crawler' ? new THREE.Color(0x101216) : col.clone().lerp(new THREE.Color(0xffffff), 0.4);
    return new THREE.ShaderMaterial({
      vertexShader: SPECTRAL_VS, fragmentShader: SPECTRAL_FS, transparent: true, depthWrite: true,
      uniforms: { uColor: { value: col }, uRim: { value: rim }, uOpacity: { value: look.opacity || 0.6 }, uTime: { value: 0 }, uDissolve: { value: 0 }, uEmber: { value: look.form === 'burnt' ? 1 : 0 } }
    });
  }

  /** Build a humanoid rig: returns { group, parts } */
  function humanoid(material, opts) {
    const g = new THREE.Group();
    const h = opts.height || 1.75, thin = opts.thin || 1;
    const cap = (r, len) => { const geo = new THREE.CylinderGeometry(r, r * 0.85, len, 10, 1); return new THREE.Mesh(geo, material); };
    const torso = cap(0.19 * thin, h * 0.32); torso.position.y = h * 0.62;
    const hips = cap(0.16 * thin, h * 0.1); hips.position.y = h * 0.44;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115 * (opts.headScale || 1), 12, 10), material); head.position.y = h * 0.86; head.scale.y = 1.2;
    const neck = cap(0.05, 0.1); neck.position.y = h * 0.79;
    g.add(torso, hips, head, neck);
    const limb = (x, y, len, r) => { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); const m = cap(r, len); m.position.y = -len / 2; pivot.add(m); g.add(pivot); return pivot; };
    const armL = limb(-0.25 * thin, h * 0.76, h * 0.42 * (opts.armLen || 1), 0.05);
    const armR = limb(0.25 * thin, h * 0.76, h * 0.42 * (opts.armLen || 1), 0.05);
    const legL = limb(-0.1, h * 0.42, h * 0.43, 0.075);
    const legR = limb(0.1, h * 0.42, h * 0.43, 0.075);
    return { group: g, parts: { torso, head, armL, armR, legL, legR }, h };
  }

  class EntityView {
    constructor(scene, look) {
      this.scene = scene; this.look = look;
      this.mat = spectralMat(look);
      this.root = new THREE.Group(); this.root.visible = false;
      this.pos = new V3(); this.target = new V3(); this.yaw = 0; this.walkT = 0; this.vis = 0; this.prevPos = new V3();
      const f = look.form;
      if (f === 'orb') {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
        orb.position.y = 1.5; this.root.add(orb);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: NW.glowTex(), color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(2.2, 2.2, 1); orb.add(halo);
        this.rig = humanoid(this.mat, { height: look.height }); this.mat.uniforms.uOpacity.value = 0.25; this.root.add(this.rig.group);
        this.light = new THREE.PointLight(0xffe2a0, 1.2, 7, 2); this.light.position.y = 1.5; this.root.add(this.light);
      } else if (f === 'mist') {
        this.rig = humanoid(this.mat, { height: look.height, thin: 1.2 }); this.root.add(this.rig.group);
        this.puffs = [];
        for (let i = 0; i < 14; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: NW.glowTex(), color: 0x5f6a5c, transparent: true, opacity: 0.45, depthWrite: false }));
          s.position.set((Math.random() - 0.5) * 0.6, Math.random() * 1.8, (Math.random() - 0.5) * 0.6); s.scale.setScalar(0.6 + Math.random() * 0.6);
          this.root.add(s); this.puffs.push(s);
        }
      } else if (f === 'crawler') {
        this.rig = humanoid(this.mat, { height: 1.6, armLen: 1.25 });
        this.rig.group.rotation.x = 1.2; this.rig.group.position.set(0, 0.35, -0.6);
        this.root.add(this.rig.group);
      } else if (f === 'tall') {
        this.rig = humanoid(this.mat, { height: look.height || 2.2, thin: 0.75, armLen: 1.3, headScale: 0.85 }); this.root.add(this.rig.group);
      } else if (f === 'drowned') {
        this.rig = humanoid(this.mat, { height: look.height || 1.6 }); this.rig.parts.head.rotation.x = 0.5; this.rig.group.rotation.x = 0.15; this.root.add(this.rig.group);
      } else {
        this.rig = humanoid(this.mat, { height: look.height || 1.75 }); this.root.add(this.rig.group);
      }
      // eyes (faint) for figure-like forms
      if (this.rig && f !== 'orb' && f !== 'mist') {
        const em = new THREE.MeshBasicMaterial({ color: f === 'burnt' ? 0xffa040 : 0xd8e6ff, transparent: true, opacity: 0.8 });
        for (const x of [-0.04, 0.04]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), em); e.position.set(x, 0.02, 0.1); this.rig.parts.head.add(e); }
      }
      scene.add(this.root);
    }
    /** state: replicated entity state; t: time; camPos for distance fade */
    update(es, dt, t, hunting) {
      if (!es) return;
      this.target.set(es.x, es.y, es.z);
      if (this.pos.distanceTo(this.target) > 3) this.pos.copy(this.target); else this.pos.lerp(this.target, Math.min(1, dt * 10));
      const moved = this.pos.distanceTo(this.prevPos) / Math.max(dt, 1e-3); this.prevPos.copy(this.pos);
      this.root.position.copy(this.pos);
      let dy = es.yaw - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 6); this.root.rotation.y = this.yaw;
      // visibility with pursuit "blink"
      let want = es.visible;
      if (want && es.mode === 'hunt') {
        const b = Math.sin(t * 7.3) + Math.sin(t * 3.1 + 1.3) * 0.8;
        want = b > -0.6;
      }
      this.vis += ((want ? 1 : 0) - this.vis) * Math.min(1, dt * (want ? 8 : 14));
      this.root.visible = this.vis > 0.02;
      this.mat.uniforms.uTime.value = t;
      this.mat.uniforms.uDissolve.value = (1 - this.vis) * 0.9;
      // walking animation
      if (this.rig) {
        this.walkT += dt * Math.min(moved, 3) * 3.2;
        const sw = Math.sin(this.walkT) * Math.min(1, moved) * 0.6;
        const p = this.rig.parts;
        p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
        p.armL.rotation.x = -sw * 0.6 + (hunting ? -0.6 : 0); p.armR.rotation.x = sw * 0.6 + (hunting ? -0.6 : 0);
        p.head.rotation.z = Math.sin(t * 13) * 0.03 + (hunting ? Math.sin(t * 2.1) * 0.15 : 0);
        this.rig.group.position.y = (this.look.form === 'crawler' ? 0.35 : 0) + Math.abs(Math.sin(this.walkT)) * 0.03;
      }
      if (this.puffs) this.puffs.forEach((s, i) => { s.position.y += dt * 0.25; if (s.position.y > 2) s.position.y = 0; s.material.opacity = 0.45 * this.vis; s.material.rotation = t * 0.2 + i; });
      if (this.light) this.light.intensity = this.vis * (1 + Math.sin(t * 9) * 0.2);
    }
    dispose() { this.scene.remove(this.root); }
  }

  /** Remote investigator avatar with torch and name tag. */
  class PlayerAvatar {
    constructor(scene, p) {
      this.scene = scene; this.id = p.id;
      const suit = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.suit || '#4a5866'), roughness: 0.8 });
      const skin = new THREE.MeshStandardMaterial({ color: 0xc89f86, roughness: 0.7 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.5, metalness: 0.4 });
      this.rig = humanoid(suit, { height: 1.75 });
      this.rig.parts.head.material = skin;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark); helmet.position.y = 0.03; this.rig.parts.head.add(helmet);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(p.torchColor || '#ffe6bf'), emissiveIntensity: 1 }));
      lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 0.08, 0.12); this.rig.parts.head.add(lamp); this.lampMesh = lamp;
      this.root = new THREE.Group(); this.root.add(this.rig.group);
      this.rig.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.torch = new THREE.SpotLight(new THREE.Color(p.torchColor || '#ffe6bf'), 0, 16, 0.42, 0.5, 2);
      this.torch.position.set(0, 1.62, 0.2); this.torchTarget = new THREE.Object3D(); this.torchTarget.position.set(0, 1.4, 3);
      this.root.add(this.torch, this.torchTarget); this.torch.target = this.torchTarget;
      // held item block
      this.held = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), dark); this.held.position.set(0.25, 0.9, 0.25); this.root.add(this.held);
      // name tag
      const c = NW.Tex.canvas(256, 64), x = c.getContext('2d');
      x.font = '600 28px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 10, 256, 44); x.fillStyle = '#e7ecef'; x.textAlign = 'center'; x.fillText(p.name, 128, 42);
      this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
      this.tag.scale.set(0.9, 0.22, 1); this.tag.position.y = 2.1; this.root.add(this.tag);
      this.pos = new V3(p.x, p.y, p.z); this.yaw = p.yaw; this.walkT = 0;
      scene.add(this.root);
    }
    update(p, dt, t) {
      const tgt = new V3(p.x, p.y, p.z);
      if (this.pos.distanceTo(tgt) > 4) this.pos.copy(tgt); else this.pos.lerp(tgt, Math.min(1, dt * 12));
      this.root.position.copy(this.pos);
      let dy = (p.yaw + Math.PI) - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 12); this.root.rotation.y = this.yaw;
      this.root.visible = p.hidden == null;
      const parts = this.rig.parts;
      if (!p.alive) { this.rig.group.rotation.x = -Math.PI / 2; this.rig.group.position.y = 0.2; this.torch.intensity = 0; this.tag.material.opacity = 0.4; return; }
      this.rig.group.rotation.x = 0; this.rig.group.position.y = p.crouch ? -0.35 : 0;
      this.walkT += dt * (p.speed || 0) * 3.5;
      const sw = Math.sin(this.walkT) * Math.min(1, (p.speed || 0)) * 0.6;
      parts.legL.rotation.x = sw; parts.legR.rotation.x = -sw; parts.armL.rotation.x = -sw * 0.7; parts.armR.rotation.x = -0.8;
      parts.head.rotation.x = -(p.pitch || 0) * 0.7;
      this.torch.intensity = p.torch ? 1.6 : 0; this.lampMesh.material.emissiveIntensity = p.torch ? 1.5 : 0;
      this.torchTarget.position.set(0, 1.4 - Math.sin(p.pitch || 0) * 3, Math.cos(p.pitch || 0) * 3);
      this.held.visible = !!p.held;
    }
    dispose() { this.scene.remove(this.root); }
  }

  /** Brief false figure shown to a single player during hallucinations. */
  function hallucinationFigure(scene, pos, yaw) {
    const look = { form: 'shadow', color: '#121418', opacity: 0.85, height: 1.8 };
    const v = new EntityView(scene, look);
    v.pos.copy(pos); v.target.copy(pos); v.root.position.copy(pos); v.root.rotation.y = yaw;
    return v;
  }

  NW.EntityView = EntityView;
  NW.PlayerAvatar = PlayerAvatar;
  NW.hallucinationFigure = hallucinationFigure;
})();
