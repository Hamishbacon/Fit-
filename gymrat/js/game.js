/* Main engine: renderer + post FX, sky/day-night/weather, player controller, third-person camera with collision,
   zone transitions, interaction prompts, mirrors, graphics presets and the frame loop. */
'use strict';
GR.Game = (() => {
  const U = GR.U, W = GR.World, D = GR.Data;
  let renderer, scene, camera, composer, bloomPass, fxaaPass, clock, hemi, sun, pool = [], sky, stars, rain, rainOn = false;
  let player = null, mode = 'menu', uiDepth = 0, fpsAvg = 60, fpsLow = 0, settings, quality = 'high', initialized = false;
  const cam = { yaw: Math.PI, pitch: 0.25, dist: 4.2, tDist: 4.2, pos: new THREE.Vector3(), look: new THREE.Vector3(), override: null, shake: 0, fov: 60 };
  const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), vy: 0, grounded: true, facing: 0, speed: 0, locked: false, seat: null, stepT: 0, lastStep: 0, walkStyle: 'normal', distAcc: 0 };
  let near = null, prevVisitedCheck = 0, districtName = '', interactCooldown = 0;

  /* ---------------- SETUP ---------------- */
  function init() {
    settings = GR.Save.settings();
    const canvas = document.getElementById('game');
    const q = resolveQuality(settings.quality);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    GR.Tex.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.08, 600);
    hemi = new THREE.HemisphereLight(0xdfefff, 0x6b5f50, 0.6); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1dd, 1.6); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 12, 2); scene.add(l); pool.push(l); }
    buildSky();
    buildRain();
    scene.fog = new THREE.Fog(0xbfd8ef, 60, 330);
    clock = new THREE.Clock();
    window.addEventListener('resize', resize);
    GR.Input.init(canvas); GR.Input.setBinds(settings.keys);
    // world
    GR.City.build(); GR.Interiors.build();
    Object.values(W.zones).forEach(z => { const r = W.batch(z); console.log('[batch]', z.id, r.removed, '→', r.added); });
    Object.values(W.zones).forEach(z => scene.add(z.group));
    W.zones.city.group.visible = true;
    GR.Traffic && GR.Traffic.init(scene);
    applyQuality(q);
    resize();
    initialized = true;
    requestAnimationFrame(loop);
  }
  function resolveQuality(q) { if (q && q !== 'auto') return q; const mobile = /Mobi|Android/i.test(navigator.userAgent); return mobile ? 'low' : (window.devicePixelRatio > 1.5 ? 'medium' : 'high'); }
  function applyQuality(q) {
    quality = q; const dpr = window.devicePixelRatio || 1, sc = settings.resScale || 1;
    const pr = { low: 0.7, medium: Math.min(dpr, 1), high: Math.min(dpr, 1.5), ultra: Math.min(dpr, 2) }[q] * sc;
    renderer.setPixelRatio(pr);
    const sh = { low: 0, medium: 1024, high: 2048, ultra: 4096 }[q];
    renderer.shadowMap.enabled = !!sh && settings.shadows !== false;
    if (sh) { sun.shadow.mapSize.set(sh, sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    renderer.shadowMap.type = q === 'medium' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
    camera.far = q === 'low' ? 220 : 600; camera.updateProjectionMatrix();
    scene.fog.far = q === 'low' ? 200 : 330;
    composer = null;
    if ((q === 'high' || q === 'ultra') && settings.bloom !== false && THREE.EffectComposer && THREE.UnrealBloomPass) {
      try {
        composer = new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene, camera));
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.88); composer.addPass(bloomPass);
        if (q === 'ultra' && THREE.FXAAShader) { fxaaPass = new THREE.ShaderPass(THREE.FXAAShader); composer.addPass(fxaaPass); }
      } catch (e) { composer = null; }
    }
    if (GR.NPC) GR.NPC.setDensity({ low: 0.5, medium: 0.8, high: 1, ultra: 1.25 }[q] * (settings.npcDensity || 1));
    resize();
  }
  function resize() {
    if (!renderer) return; const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); composer.setPixelRatio && composer.setPixelRatio(renderer.getPixelRatio()); if (fxaaPass) fxaaPass.material.uniforms.resolution.value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio())); }
  }
  function buildSky() {
    const g = new THREE.SphereGeometry(500, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color('#3f86d8') }, hor: { value: new THREE.Color('#cfe6ff') }, bot: { value: new THREE.Color('#9fb6c8') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff2cc') }, cloud: { value: 0.2 }, t: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform vec3 top, hor, bot, sunCol, sunDir; uniform float cloud, t; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
        void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.55)) : mix(hor, bot, pow(-y, 0.4));
          float sd = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(sd, 400.0) * 3.0 + pow(sd, 8.0) * 0.25);
          if (y > 0.02) { vec2 uv = vP.xz / (y + 0.15) * 1.6 + vec2(t*0.004, t*0.002); float cl = smoothstep(0.55 - cloud*0.35, 0.85, fbm(uv)); c = mix(c, mix(vec3(1.0), hor*0.9 + sunCol*0.15, 0.35) * (0.75 + 0.25*sd), cl * smoothstep(0.02, 0.25, y) * (0.6 + cloud*0.4)); }
          gl_FragColor = vec4(c, 1.0);
#include <encodings_fragment>
}` });
    sky = new THREE.Mesh(g, m); sky.renderOrder = -10; scene.add(sky);
    const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 900; i++) { const a = Math.random() * U.TAU, e = Math.acos(Math.random() * 0.9); sp.push(Math.sin(e) * Math.cos(a) * 450, Math.cos(e) * 450, Math.sin(e) * Math.sin(a) * 450); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
  }
  function buildRain() { const n = 1600, g = new THREE.BufferGeometry(), p = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 50, y = Math.random() * 25, z = (Math.random() - 0.5) * 50; p.set([x, y, z, x + 0.05, y - 0.6, z], i * 6); } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaecbe0, transparent: true, opacity: 0.45 })); rain.visible = false; rain.frustumCulled = false; scene.add(rain); }

  /* ---------------- START / PLAYER ---------------- */
  function startGame(state) {
    GR.state = state;
    if (player) { player.dispose(); }
    player = new GR.Char.Character(state.app, state.outfit, { lod: 1 });
    scene.add(player.root);
    applyMuscle();
    GR.Prog.rollChallenges();
    GR.NPC.init(scene);
    GR.Social.init(); GR.Sponsors.init(); GR.Apt.load();
    const z = state.zone && W.zones[state.zone] ? state.zone : 'apartment';
    enterZone(z, { instant: true, pos: state.pos });
    mode = 'play'; uiDepth = 0;
    GR.UI.showHUD(true);
    GR.Audio.resume();
    if (!state.tut.done) GR.UI.tutorial();
    GR.Bus.emit('game:start');
  }
  function applyMuscle() { // make sure every save has per-body-part muscle (older saves start from their overall value)
    const s = GR.state; if (!s.app.mus) { const m = U.clamp((s.baseMuscle ?? s.app.muscle ?? 0.2) + Math.min(0.45, (s.stats.workouts || 0) * 0.006), 0, 1); s.app.mus = {}; Object.keys(D.MUSCLES).forEach(k => s.app.mus[k] = m); player.setAppearance(s.app); }
  }
  /** grow the body parts a machine trains. Returns [{k, n, before, after}] for the results screen. */
  function gainMuscle(machine, grade, diffK = 1) {
    const s = GR.state; applyMuscle(); const T = D.TRAINS[machine]; if (!T) return [];
    const gm = { S: 1.4, A: 1.2, B: 1, C: 0.75, D: 0.5 }[grade] || 1, tired = s.energy < 15 ? 0.5 : 1, out = [];
    const grow = (k, base) => { const before = s.app.mus[k]; const add = base * gm * diffK * tired * (1 - before * 0.55); const after = U.clamp(before + add, 0, 1); s.app.mus[k] = after; if (after - before > 0.001) out.push({ k, n: D.MUSCLES[k], before, after }); };
    T[0].forEach(k => grow(k, 0.045)); T[1].forEach(k => grow(k, 0.018));
    s.app.muscle = Object.values(s.app.mus).reduce((a, b) => a + b, 0) / 6;
    player.setAppearance(s.app);
    out.forEach((g, i) => setTimeout(() => GR.UI.floatText(`💪 ${g.n.toUpperCase()} +${Math.round((g.after - g.before) * 100)}%`, '#ffd23f'), 300 + i * 450));
    return out;
  }
  function refreshPlayer() { const s = GR.state; const pos = player.root.position.clone(), ry = player.root.rotation.y; player.setAppearance(s.app); player.setOutfit(s.outfit); player.root.position.copy(pos); player.root.rotation.y = ry; }

  /* ---------------- ZONES ---------------- */
  let fading = false;
  function fade(fn, dur = 0.35) { if (fading) return; fading = true; const f = document.getElementById('fade'); f.classList.add('on'); setTimeout(() => { try { fn(); } catch (e) { console.error(e); } setTimeout(() => { f.classList.remove('on'); fading = false; }, 120); }, dur * 1000); }
  function enterZone(id, opts = {}) {
    const go = () => {
      const prev = W.current, z = W.zones[id]; if (!z) return;
      Object.values(W.zones).forEach(zz => zz.group.visible = zz.id === id);
      W.current = id;
      const sp = opts.pos && opts.pos.zone === id ? opts.pos : (id === 'city' && opts.from && W.zones.city.doorOut && W.zones.city.doorOut[opts.from]) ? W.zones.city.doorOut[opts.from] : z.spawn;
      P.pos.set(sp.x, 0, sp.z); P.vel.set(0, 0, 0); P.vy = 0; player.root.position.copy(P.pos); P.facing = sp.ry || 0; player.root.rotation.y = P.facing; cam.yaw = P.facing + Math.PI; cam.pitch = 0.22;
      P.pos.y = W.groundAt(z, P.pos.x, P.pos.z, 5); if (opts.pos && opts.pos.zone === id) W.collide(z, P.pos, 0.4, P.pos.y);
      standUp();
      setupZoneLights(z);
      GR.NPC.enterZone(id);
      if (GR.Traffic) GR.Traffic.setActive(id === 'city');
      music();
      const loc = D.LOCATIONS[id]; if (loc && id !== 'city') { GR.UI.banner(loc.n, loc.d); visit(id); }
      GR.state.zone = id;
      cam.pos.copy(player.root.position).add(new THREE.Vector3(Math.sin(cam.yaw) * cam.dist, 2, Math.cos(cam.yaw) * cam.dist));
      if (id === 'apartment') GR.Apt.build();
      GR.Audio.sfx('door');
      GR.Bus.emit('zone', { id, prev });
      GR.Save.autosave(GR.state);
    };
    if (opts.instant) go(); else fade(go);
  }
  function exitZone() { const from = W.current; enterZone('city', { from }); }
  function setupZoneLights(z) {
    const a = z.ambient;
    if (z.indoor) {
      scene.fog.near = 200; scene.fog.far = 600; sky.visible = false; stars.visible = false; rain.visible = false;
      scene.background = new THREE.Color('#0d0d10');
      hemi.color.set(a.sky); hemi.groundColor.set(a.ground); hemi.intensity = a.intensity;
      sun.color.set('#fff4e6'); sun.intensity = a.key; const b = z.bounds; const cx = (b.x1 + b.x2) / 2, cz = (b.z1 + b.z2) / 2;
      sun.position.set(cx + a.keyDir[0], a.keyDir[1], cz + a.keyDir[2]); sun.target.position.set(cx, 0, cz);
      const ext = Math.max(b.x2 - b.x1, b.z2 - b.z1) * 0.65; const sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.5; sc.far = 40; sc.updateProjectionMatrix();
      renderer.toneMappingExposure = 1.0;
    } else { sky.visible = true; stars.visible = true; scene.background = null; const sc = sun.shadow.camera; sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 160; sc.updateProjectionMatrix(); }
    renderer.shadowMap.needsUpdate = true;
  }
  function music() {
    const z = W.Z; let m = z.music || null;
    if (!z.indoor) { const h = GR.state.time % 24; m = (h > 20 || h < 5) && near_plaza() ? 'dance' : 'city'; }
    if (GR.Comp && GR.Comp.active) m = 'arena';
    GR.Audio.music(m);
    const amb = []; if (!z.indoor) { amb.push(districtName === 'Sigma Park' ? 'park' : 'city'); if (rainOn) amb.push('rain'); } else if (z.id === 'gym') amb.push('gym'); else if (z.id === 'arena') amb.push('crowd'); else if (z.id === 'cafe' || z.id === 'protein') amb.push('cafe');
    GR.Audio.ambienceOnly(amb);
  }
  const near_plaza = () => W.current === 'city' && Math.hypot(P.pos.x, P.pos.z) < 40;
  function visit(id) { const s = GR.state; if (!s.stats.visitedList.includes(id)) { s.stats.visitedList.push(id); GR.Prog.addXP(25); GR.Prog.notify('Discovered: ' + (D.LOCATIONS[id] ? D.LOCATIONS[id].n : id), '🗺️', 'info'); GR.Prog.check(); } GR.Prog.event('visit', { id }); }

  /* ---------------- DAY / NIGHT / WEATHER ---------------- */
  const KEYS = [ // hour, top, horizon, sunColor, sunI, hemiI, fog
    [0, '#0a1430', '#1b2a4a', '#8fa8ff', 0.15, 0.25, '#1b2440'], [5, '#1a2a55', '#d98b6a', '#ffb27a', 0.3, 0.35, '#5a5d78'], [7, '#4f8fd8', '#ffd7a8', '#ffe0b0', 1.2, 0.55, '#c9d5e6'],
    [12, '#3f86d8', '#cfe6ff', '#fff6e6', 1.7, 0.65, '#bfd8ef'], [17, '#4a7fc8', '#ffd2a0', '#ffd09a', 1.3, 0.55, '#d6c8b8'], [19, '#2b2f6a', '#ff8a5c', '#ff9a66', 0.5, 0.4, '#7a5d70'], [21, '#0d1838', '#2a3560', '#9fb4ff', 0.15, 0.28, '#1f2a48'], [24, '#0a1430', '#1b2a4a', '#8fa8ff', 0.15, 0.25, '#1b2440']];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function sampleSky(h) { let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= h) i++; const a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)]; const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]); const mixc = (x, y) => cA.set(x).lerp(cB.set(y), t).clone(); return { top: mixc(a[1], b[1]), hor: mixc(a[2], b[2]), sun: mixc(a[3], b[3]), si: U.lerp(a[4], b[4], t), hi: U.lerp(a[5], b[5], t), fog: mixc(a[6], b[6]) }; }
  function nightFactor(h) { return h >= 19.5 || h < 5.5 ? 1 : h > 17.5 ? (h - 17.5) / 2 : h < 7 ? (7 - h) / 1.5 : 0; }
  function updateSky(dt) {
    const s = GR.state, z = W.Z; const h = s.time % 24; const k = sampleSky(h); const n = U.clamp(nightFactor(h), 0, 1);
    const wx = s.weather, cloudy = wx === 'cloudy' ? 0.6 : wx === 'rain' ? 1 : 0.15;
    if (!z.indoor) {
      const grey = new THREE.Color('#7d8794'); const dim = wx === 'rain' ? 0.45 : wx === 'cloudy' ? 0.7 : 1;
      sky.material.uniforms.top.value.copy(k.top).lerp(grey, (1 - dim) * 0.7 * (1 - n * 0.6)); sky.material.uniforms.hor.value.copy(k.hor).lerp(grey, (1 - dim) * 0.6 * (1 - n * 0.6)); sky.material.uniforms.bot.value.copy(k.hor).multiplyScalar(0.75);
      sky.material.uniforms.cloud.value = cloudy; sky.material.uniforms.t.value += dt;
      const el = Math.sin((h - 6) / 12 * Math.PI), az = (h / 24) * U.TAU;
      const sd = new THREE.Vector3(Math.cos(az) * 0.6, Math.max(0.05, el), Math.sin(az) * 0.6 + 0.3).normalize();
      const moon = el < 0; const ld = moon ? new THREE.Vector3(-sd.x, Math.max(0.3, -el), -sd.z).normalize() : sd;
      sky.material.uniforms.sunDir.value.copy(sd); sky.material.uniforms.sunCol.value.copy(k.sun).multiplyScalar(moon ? 0.15 : 1);
      sun.color.copy(k.sun); sun.intensity = k.si * dim; hemi.intensity = k.hi * (0.8 + dim * 0.2) + 0.08; hemi.color.copy(k.hor).lerp(new THREE.Color('#ffffff'), 0.5); hemi.groundColor.set('#5e5648');
      const c = player.root.position; sun.position.set(c.x + ld.x * 80, ld.y * 80, c.z + ld.z * 80); sun.target.position.copy(c);
      scene.fog.color.copy(k.fog).lerp(grey, (1 - dim) * 0.5); scene.fog.near = wx === 'rain' ? 25 : 60; scene.fog.far = (quality === 'low' ? 200 : 330) * (wx === 'rain' ? 0.6 : 1);
      stars.material.opacity = n * (1 - cloudy * 0.8); sky.position.copy(camera.position); stars.position.copy(camera.position);
      renderer.toneMappingExposure = 1.0 + n * 0.25;
      GR.City.setNight(n, wx === 'rain');
      GR.Traffic && GR.Traffic.setNight(n);
      // night: pool lights follow nearest street lamps
      if (n > 0.3) { const lamps = GR.City.lamps.map(l => ({ l, d: l.position.distanceToSquared(c) })).sort((a, b) => a.d - b.d).slice(0, 4); pool.forEach((pl, i) => { const L = lamps[i]; if (!L) { pl.intensity = 0; return; } const lp = L.l.userData.pool; pl.position.set(L.l.position.x + Math.sin(L.l.rotation.y) * 1.3, 5, L.l.position.z + Math.cos(L.l.rotation.y) * 1.3); pl.color.set('#ffd9a0'); pl.intensity = 1.3 * n; pl.distance = 16; }); }
      else pool.forEach(pl => pl.intensity = 0);
      rain.visible = wx === 'rain'; if (rain.visible) { rain.position.set(camera.position.x, camera.position.y - 8, camera.position.z); const p = rain.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 6) { p[i + 1] -= dt * 22; p[i + 4] -= dt * 22; if (p[i + 1] < 0) { p[i + 1] += 25; p[i + 4] += 25; } } rain.geometry.attributes.position.needsUpdate = true; }
    } else {
      pool.forEach((pl, i) => { const L = z.lights.map(l => ({ l, d: l.pos.distanceToSquared(player.root.position) })).sort((a, b) => a.d - b.d)[i]; if (!L) { pl.intensity = 0; return; } pl.position.copy(L.l.pos); pl.color.copy(L.l.color); pl.intensity = L.l.intensity; pl.distance = L.l.dist; });
    }
    const wasRain = rainOn; rainOn = wx === 'rain' && !z.indoor; if (wasRain !== rainOn) music();
  }
  function tickTime(dt) {
    const s = GR.state; const prevDay = Math.floor(s.time / 24), prevH = Math.floor(s.time);
    s.time += dt / 60; // 1 game hour per real minute
    s.played += dt;
    if (Math.floor(s.time) !== prevH) { GR.Prog.tickBuffs(); hourly(); }
    if (Math.floor(s.time / 24) !== prevDay) newDay();
  }
  function hourly() {
    const s = GR.state; s.weatherT -= 1;
    if (s.weatherT <= 0) { const r = Math.random(); const old = s.weather; s.weather = r < 0.55 ? 'sunny' : r < 0.82 ? 'cloudy' : 'rain'; s.weatherT = U.randi(3, 8); if (old !== s.weather && !W.Z.indoor) GR.UI.toast({ sunny: '☀️ The sun is out!', cloudy: '☁️ Clouds rolling in.', rain: '🌧️ It\'s raining in Mog City.' }[s.weather]); }
    energyTick(); GR.Social.hourly(); GR.NPC.hourly(); music();
    if (W.current === 'city') GR.NPC.respawnCity();
  }
  function energyTick() { const s = GR.state; s.energy = U.clamp(s.energy - 2, 0, 100); if (s.energy < 15 && Math.random() < 0.3) GR.UI.toast('🥱 Low energy — eat something or rest in your bed. Workout scores are reduced.', 'warn'); }
  function newDay() { const s = GR.state; GR.Prog.rollChallenges(); GR.Comp && GR.Comp.newDay(); GR.Sponsors.checkOffers(); GR.Prog.notify('Day ' + (Math.floor(s.time / 24) + 1) + ' in Mog City. Fresh challenges!', '🌅', 'info'); GR.Save.save(s); }

  /* ---------------- PLAYER CONTROLLER ---------------- */
  const tmpV = new THREE.Vector3();
  function updatePlayer(dt) {
    const s = GR.state, z = W.Z, I = GR.Input;
    let mx = 0, mz = 0;
    const canMove = mode === 'play' && !P.locked && uiDepth === 0;
    if (canMove) { if (I.is('forward')) mz += 1; if (I.is('back')) mz -= 1; if (I.is('left')) mx += 1; if (I.is('right')) mx -= 1; }
    const len = Math.hypot(mx, mz); if (len > 0) { mx /= len; mz /= len; }
    if (len > 0 && P.seat) standUp();
    if (len > 0 && player.anim.act && !player.anim.act.def.upper && !player.anim.act.def.workout) player.anim.stop(0.2);
    const sprint = I.is('sprint') && len > 0, walkMode = P.walkStyle !== 'normal' && !sprint;
    const target = len > 0 ? (sprint ? 7.6 : walkMode ? 2.2 : 4.4) * (s.energy < 10 ? 0.8 : 1) : 0;
    // camera-relative direction
    const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const dir = new THREE.Vector3().addScaledVector(fwd, mz).addScaledVector(right, -mx);
    const accel = P.grounded ? (target > P.speed ? 10 : 14) : 3;
    P.speed = U.damp(P.speed, target, accel, dt);
    const prevFacing = P.facing;
    if (len > 0) { const want = Math.atan2(dir.x, dir.z); P.facing = U.dampAngle(P.facing, want, P.grounded ? 10 : 4, dt); }
    const turn = U.angDiff(prevFacing, P.facing) / Math.max(dt, 1e-3);
    if (P.seat) { player.root.position.copy(P.pos); player.root.rotation.y = P.facing; player.anim.loco.grounded = true; player.update(dt, { speed: 0 }); return; }
    const vx = Math.sin(P.facing) * P.speed, vz = Math.cos(P.facing) * P.speed;
    const old = P.pos.clone();
    P.pos.x += vx * dt; P.pos.z += vz * dt;
    // jump + gravity
    if (canMove && I.hit('jump') && P.grounded && !P.seat) { P.vy = 5.2; P.grounded = false; player.anim.loco.takeoff = 1; GR.Audio.sfx('jump'); }
    P.vy -= 14 * dt; P.pos.y += P.vy * dt;
    W.collide(z, P.pos, 0.33, P.pos.y);
    const g = W.groundAt(z, P.pos.x, P.pos.z, P.pos.y, 0.33);
    if (P.pos.y <= g) { if (!P.grounded && P.vy < -3) { player.anim.loco.land = U.clamp(-P.vy / 9, 0.3, 1); GR.Audio.sfx('land'); } P.pos.y = g; P.vy = 0; P.grounded = true; }
    else if (P.pos.y - g > 0.05 && P.vy <= 0 && P.grounded && P.pos.y - g < 0.45) { P.pos.y = g; } // step down smoothly
    else if (P.pos.y > g + 0.05) P.grounded = false;
    // traffic push
    if (GR.Traffic && z.id === 'city') GR.Traffic.pushPlayer(P.pos);
    const moved = Math.hypot(P.pos.x - old.x, P.pos.z - old.z);
    P.distAcc += moved; if (P.distAcc > 25) { s.stats.distance += P.distAcc; GR.Prog.event('distance', { amount: Math.round(P.distAcc), noSave: true }); P.distAcc = 0; GR.Prog.check(); }
    player.root.position.copy(P.pos); player.root.rotation.y = P.facing;
    const realSpeed = P.seat || player.anim.busy && player.anim.act.def.workout ? 0 : Math.min(P.speed, moved / Math.max(dt, 1e-3) + 0.01);
    player.anim.loco.grounded = P.grounded; player.anim.loco.vy = P.vy; player.anim.loco.turn = U.clamp(turn, -4, 4); player.anim.loco.style = sprint ? 'normal' : P.walkStyle;
    if (!P.locked) player.update(dt, { speed: realSpeed }); else player.update(dt, {});
    // footsteps
    if (P.grounded && realSpeed > 0.5) { P.stepT += moved; const strideLen = U.lerp(0.65, 1.3, U.smooth(2.5, 7.5, realSpeed)); if (P.stepT > strideLen) { P.stepT = 0; const surf = z.indoor ? (z.id === 'gym' ? 500 : 1400) : (P.pos.y > 0.1 ? 1100 : 700); GR.Audio.sfx('step', { f: surf * (0.9 + Math.random() * 0.2), v: sprint ? 1.3 : 0.9 }); } }
    // phone-out pose while walking with phone open
    if (GR.Phone && GR.Phone.open && !player.anim.busy) player.anim.play('phone');
    if (GR.Phone && !GR.Phone.open && player.anim.actionName === 'phone') player.anim.stop();
  }
  function sitOn(seat, anim = 'sit') {
    P.seat = seat; P.locked = false; P.speed = 0;
    P.pos.set(seat.x, seat.h - 0.47 + 0.0, seat.z); player.root.position.copy(P.pos); P.facing = seat.ry; player.root.rotation.y = seat.ry;
    player.anim.play(anim);
  }
  function standUp() { if (P.seat) { const s = P.seat; P.seat = null; P.pos.set(s.x + Math.sin(s.ry) * 0.7, 0, s.z + Math.cos(s.ry) * 0.7); P.pos.y = W.groundAt(W.Z, P.pos.x, P.pos.z, 2); if (player.anim.actionName && ['sit', 'sitChill', 'sitTyping', 'sitGame'].includes(player.anim.actionName)) player.anim.stop(); } }

  /* ---------------- INTERACTION ---------------- */
  function findNearest() {
    const z = W.Z, p = P.pos; let best = null, bd = 1e9;
    for (const it of z.inter) { if (it.cond && !it.cond()) continue; const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z); if (d < it.r && d < bd && Math.abs((it.y || 0) - p.y) < 1.4) { bd = d; best = it; } }
    const npc = GR.NPC.nearestTalkable(p); if (npc && (!best || (npc.d < 0.9 && npc.d < bd * 0.6 && npc.npc.state !== 'workout'))) { best = { prompt: 'Talk to ' + npc.npc.name, action: () => GR.Dialogue.talk(npc.npc), kind: 'npc', npc: npc.npc }; bd = npc.d; }
    // seats
    if (!best) { for (const s of z.seats) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < 1.0 && d < bd) { bd = d; best = { prompt: 'Sit down', action: () => sitOn(s, s.anim || (Math.random() < 0.5 ? 'sit' : 'sitChill')), kind: 'seat' }; } } }
    return best;
  }
  function updateInteract(dt) {
    interactCooldown -= dt;
    if (mode !== 'play' || uiDepth > 0 || P.locked) { near = null; GR.UI.prompt(null); return; }
    near = findNearest();
    GR.UI.prompt(near ? near.prompt : (P.seat ? 'Move to stand up' : null));
    if (near && GR.Input.hit('interact') && interactCooldown <= 0) { interactCooldown = 0.35; GR.Audio.sfx('click'); try { near.action(); } catch (e) { console.error(e); } }
  }

  /* ---------------- CAMERA ---------------- */
  function updateCamera(dt) {
    const [dx, dy] = GR.Input.mouse(); const sens = 0.0024 * (settings.sens || 1);
    if (!cam.override) {
      if (mode === 'play' && uiDepth === 0) { cam.yaw -= dx * sens; cam.pitch += dy * sens * (settings.invertY ? -1 : 1); }
      cam.pitch = U.clamp(cam.pitch, -0.6, 1.2);
      const wd = GR.Input.wheelDelta(); if (wd && uiDepth === 0) cam.tDist = U.clamp(cam.tDist + wd * 0.5, 1.6, 9);
      cam.dist = U.damp(cam.dist, cam.tDist, 6, dt);
      const head = player.root.position.clone().add(new THREE.Vector3(0, P.seat ? 1.15 : 1.55, 0));
      if (player.anim.act && player.anim.act.def.workout) head.y = player.root.position.y + 1.25;
      const off = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist);
      // shoulder offset
      const sh = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)).multiplyScalar(0.35);
      const want = head.clone().add(off).add(sh);
      const f = W.rayFrac(W.Z, head, want); const camPos = head.clone().lerp(want, Math.max(0.12, f - 0.04));
      if (camPos.y < 0.3) camPos.y = 0.3;
      cam.pos.lerp(camPos, 1 - Math.exp(-dt * 14)); cam.look.lerp(head.clone().add(sh), 1 - Math.exp(-dt * 18));
      camera.position.copy(cam.pos); camera.lookAt(cam.look);
      camera.fov = U.damp(camera.fov, settings.fov + U.smooth(5, 8, P.speed) * 6, 4, dt);
    } else {
      const o = cam.override; o.t = Math.min(1, (o.t || 0) + dt / (o.dur || 0.6)); const k = U.ease.inOut(o.t);
      if (o.orbit) { const c = o.orbit; if (uiDepth > 0 && (GR.Input.locked || dx)) { c.yaw -= dx * 0.006; } c.yaw += (o.spin || 0) * dt; o.pos = new THREE.Vector3(c.target.x + Math.sin(c.yaw) * c.dist, c.target.y + c.h, c.target.z + Math.cos(c.yaw) * c.dist); o.look = c.target.clone().add(new THREE.Vector3(0, c.lookH || 0, 0)); }
      const p = typeof o.pos === 'function' ? o.pos() : o.pos, l = typeof o.look === 'function' ? o.look() : o.look;
      if (!o.from) o.from = { p: camera.position.clone(), l: cam.look.clone() };
      camera.position.lerpVectors(o.from.p, p, k); const look = o.from.l.clone().lerp(l, k); cam.look.copy(look); camera.lookAt(look);
      if (o.fov) camera.fov = U.damp(camera.fov, o.fov, 5, dt);
      cam.pos.copy(camera.position);
    }
    if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 2); camera.position.x += (Math.random() - 0.5) * cam.shake * 0.1; camera.position.y += (Math.random() - 0.5) * cam.shake * 0.1; }
    camera.updateProjectionMatrix();
  }
  function camTo(o) { cam.override = Object.assign({ t: 0, dur: 0.6 }, o); cam.override.from = null; }
  function camRelease() { cam.override = null; }
  function camFront(dist = 2.6, h = 1.45, lookH = 1.3, side = 0) { const p = player.root.position, f = P.facing; return { pos: new THREE.Vector3(p.x + Math.sin(f + side) * dist, p.y + h, p.z + Math.cos(f + side) * dist), look: new THREE.Vector3(p.x, p.y + lookH, p.z) }; }

  /* ---------------- MIRRORS ---------------- */
  let mirrorIdx = 0;
  function renderMirrors() {
    const z = W.Z; if (!z.mirrors.length) return;
    const allowed = settings.mirrors !== false && quality !== 'low';
    const frus = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cand = [];
    z.mirrors.forEach(m => { m.updateMatrixWorld(); const wp = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld); const d = wp.distanceTo(camera.position); const vis = d < 16 && frus.intersectsObject(m); if (!allowed) { m.setLive(false); return; } if (vis) cand.push({ m, d }); else m.setLive(false); });
    cand.sort((a, b) => a.d - b.d);
    const budget = quality === 'ultra' ? 2 : 1;
    cand.slice(0, budget).forEach(c => { c.m.setLive(true); c.m.renderReflection(renderer, scene, camera); });
    cand.slice(budget).forEach(c => { if (c.m.live && Math.random() < 0.15) c.m.renderReflection(renderer, scene, camera); });
  }

  /* ---------------- LOOP ---------------- */
  let last = performance.now(), hudT = 0, discT = 0;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(); let dt = Math.min(0.05, (now - last) / 1000); last = now;
    fpsAvg = U.lerp(fpsAvg, 1 / Math.max(dt, 1e-3), 0.05);
    if (mode === 'menu' || !GR.state) { GR.UI.menuFrame && GR.UI.menuFrame(dt, scene, camera, renderer); GR.Input.endFrame(); return; }
    const timeScale = uiDepth > 0 && GR.UI.pauseTime() ? 0 : 1;
    if (timeScale) tickTime(dt);
    updatePlayer(dt);
    GR.NPC.update(dt, P.pos, camera);
    if (GR.Traffic && W.current === 'city') GR.Traffic.update(dt, P.pos);
    W.Z.updaters.forEach(f => f(dt));
    worldAnims(dt);
    GR.Mini.update(dt); GR.Comp.update(dt); GR.Apt.update(dt); GR.Phone.update(dt); GR.Shops.update && GR.Shops.update(dt);
    updateInteract(dt);
    hotkeys();
    updateCamera(dt);
    updateSky(dt);
    discT -= dt; if (discT <= 0) { discT = 1; discovery(); }
    renderer.shadowMap.needsUpdate = true;
    renderMirrors();
    if (composer) composer.render(); else renderer.render(scene, camera);
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; GR.UI.updateHUD(); }
    GR.UI.frame(dt);
    autoQuality(dt);
    GR.Input.endFrame();
  }
  function autoQuality(dt) { if (settings.quality !== 'auto') return; if (fpsAvg < 26) fpsLow += dt; else fpsLow = Math.max(0, fpsLow - dt * 0.5); if (fpsLow > 6) { fpsLow = 0; const order = ['ultra', 'high', 'medium', 'low']; const i = order.indexOf(quality); if (i < 3) { applyQuality(order[i + 1]); GR.UI.toast('⚙️ Auto graphics lowered to ' + order[i + 1].toUpperCase() + ' for smoother play.'); } } }
  function hotkeys() {
    const I = GR.Input; if (mode !== 'play') return;
    if (I.hit('pause')) { if (uiDepth > 0) GR.UI.back(); else GR.UI.pause(); return; }
    if (uiDepth > 0 || P.locked) return;
    if (I.hit('phone')) GR.Phone.toggle();
    if (I.hit('inventory')) GR.UI.inventory();
    if (I.hit('emote')) GR.UI.emoteWheel();
    if (I.hit('map')) GR.UI.openMap(false);
    if (I.hit('camera')) GR.Camera.photoMode();
  }
  function worldAnims(dt) {
    const t = performance.now() / 1000;
    if (W.current === 'city') {
      GR.City.doors.forEach(r => { r.material.opacity = 0.4 + Math.sin(t * 3) * 0.25; r.scale.setScalar(1 + Math.sin(t * 3) * 0.05); });
      if (GR.City.barberPole) GR.City.barberPole.children[0].material.map.offset.y = t * 0.4;
      const f = GR.City.fountain; if (f) { const p = f.userData.jet.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const k = ((t * 0.6 + i * 0.0137) % 1), a = i * 1.7; const r = k * 3.2; p[i] = Math.cos(a) * r; p[i + 1] = 2.9 + k * 2.2 - k * k * 4.6; p[i + 2] = Math.sin(a) * r; } f.userData.jet.geometry.attributes.position.needsUpdate = true; f.userData.water.material.map.offset.x = t * 0.02; }
      if (GR.City.pond) GR.City.pond.material.map.offset.set(t * 0.01, t * 0.007);
      GR.City.tlights.forEach((tl, i) => { const ph = Math.floor((t + i * 7) / 6) % 3; tl.userData.lights.forEach((l, k) => l.material.emissiveIntensity = k === [2, 1, 0][ph] ? 2 : 0.1); });
      if (GR.City.arenaScreen && Math.floor(t) % 4 === 0 && !GR.City._asT) { GR.City._asT = true; const s = GR.City.arenaScreen; s.ctx.fillStyle = '#120a22'; s.ctx.fillRect(0, 0, 256, 160); s.ctx.fillStyle = ['#ffd23f', '#ff4fa3', '#28e0ff'][Math.floor(t / 4) % 3]; s.ctx.font = 'bold 22px monospace'; ['MOG-OFF TONIGHT', 'ROOKIE NIGHT', 'CITY CIRCUIT', 'ENTER INSIDE >'].forEach((l, i) => s.ctx.fillText(l, 12, 34 + i * 30)); s.tex.needsUpdate = true; } else if (Math.floor(t) % 4 !== 0) GR.City._asT = false;
    } else if (W.current === 'arena') { const z = W.Z; z.spots.forEach((s, i) => { s.rotation.z = Math.sin(t * 0.8 + i) * 0.35; s.rotation.x = Math.cos(t * 0.6 + i * 2) * 0.25; }); }
  }
  function discovery() {
    if (W.current !== 'city') return;
    const p = P.pos; for (const m of W.markers) { if (!m.id || D.LOCATIONS[m.id] == null) continue; if (['gym', 'threadlord', 'dripdepot', 'solesurvivor', 'barber', 'glowlab', 'nest', 'apartment', 'cafe', 'protein', 'arena'].includes(m.id)) continue; if (Math.hypot(m.x - p.x, m.z - p.z) < 18) visit(m.id); }
    const dn = district(p.x, p.z); if (dn !== districtName) { districtName = dn; GR.UI.banner(dn, '', true); music(); }
  }
  function district(x, z) {
    const bx = Math.round(x / 80), bz = Math.round(z / 80);
    if (Math.abs(x) > 125 || Math.abs(z) > 125) return 'Mog City Outskirts';
    return ({ '-1,0': 'Drip Street (Shopping)', '1,0': 'Gym District', '0,-1': 'Entertainment District', '0,0': 'The Plaza', '0,1': 'Commercial Strip', '-1,1': 'Maple Rise (Residential)', '1,1': 'Sigma Park (Suburbs)', '1,-1': 'Business Park', '-1,-1': 'Maple Rise North' })[bx + ',' + bz] || 'Mog City Streets';
  }

  /* ---------------- MISC ACTIONS ---------------- */
  function shower() { fade(() => { const s = GR.state; s.energy = Math.min(100, s.energy + 20); s.time += 0.25; GR.UI.toast('🚿 Fresh. Clean. Main character. (+20 energy)'); GR.Audio.sfx('splash'); }, 0.6); }
  function drinkWater() { const s = GR.state; s.energy = Math.min(100, s.energy + 5); player.anim.play('eat'); GR.UI.toast('💧 Hydrated. +5 energy'); GR.Prog.event('eat', { kind: 'water' }); }
  function cook() { if (!GR.Prog.spend(6)) return; const s = GR.state; player.anim.play('counter', { dur: 3 }); setTimeout(() => { player.anim.stop(); s.energy = Math.min(100, s.energy + 40); GR.Prog.stat('meals'); GR.Prog.event('eat', { kind: 'meal' }); GR.UI.toast('🍳 Home-cooked chicken & rice. +40 energy'); }, 2500); }
  function fountainWish() { if (!GR.Prog.spend(1)) return; GR.Audio.sfx('coin'); const r = Math.random(); if (r < 0.15) { GR.Prog.addMoney(20); GR.UI.toast('🍀 The fountain blesses you: +$20'); } else if (r < 0.35) { GR.Prog.addBuff('hype', 1); } else GR.UI.toast('🪙 You make a wish. The fountain says nothing. Respectfully.'); }
  function stagePerform() { GR.UI.emoteWheel({ stage: true }); }
  function sleep() {
    const s = GR.state; fade(() => { const h = s.time % 24; const add = h < 8 ? 8 - h : 32 - h; const prevDay = Math.floor(s.time / 24); s.time += add; s.energy = 100; GR.Prog.stat('sleeps'); GR.UI.toast('😴 You slept until 8 AM. Energy fully restored!'); if (Math.floor(s.time / 24) !== prevDay) newDay(); GR.Save.save(s); }, 0.8);
  }
  /** capture a still from a camera into a small jpeg dataURL */
  function capture(cameraUse, w = 360, h = 360, mirrorOk = true) {
    const c = cameraUse || camera;
    const oldA = c.aspect; c.aspect = w / h; c.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true; if (mirrorOk) renderMirrors();
    const rt = new THREE.WebGLRenderTarget(w * 2, h * 2, { format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding });
    renderer.setRenderTarget(rt); renderer.render(scene, c); renderer.setRenderTarget(null);
    const px = new Uint8Array(w * 2 * h * 2 * 4); renderer.readRenderTargetPixels(rt, 0, 0, w * 2, h * 2, px);
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const cx = cv.getContext('2d'); const img = cx.createImageData(w * 2, h * 2);
    for (let y = 0; y < h * 2; y++) img.data.set(px.subarray((h * 2 - 1 - y) * w * 8, (h * 2 - y) * w * 8), y * w * 8);
    cx.putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = w; out.height = h; out.getContext('2d').drawImage(cv, 0, 0, w, h);
    rt.dispose(); c.aspect = oldA; c.updateProjectionMatrix();
    return out;
  }

  return {
    init, gainMuscle, startGame, enterZone, exitZone, camTo, camRelease, camFront, sitOn, standUp, sleep, shower, drinkWater, cook, fountainWish, stagePerform, capture, refreshPlayer, applyMuscle, applyQuality, resolveQuality, visit, fade,
    get player() { return player; }, get P() { return P; }, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, get settings() { return settings; }, set settings(v) { settings = v; }, get quality() { return quality; }, get cam() { return cam; },
    get mode() { return mode; }, set mode(v) { mode = v; }, get fps() { return fpsAvg; }, district,
    pushUI() { uiDepth++; GR.Input.unlock(); }, popUI() { uiDepth = Math.max(0, uiDepth - 1); }, uiOpen: () => uiDepth > 0, get uiDepth() { return uiDepth; }, set uiDepth(v) { uiDepth = v; },
    wantsLock: () => mode === 'play' && uiDepth === 0 && !cam.override, lockPlayer(v) { P.locked = v; if (v) P.speed = 0; }, music, near: () => near
  };
})();
