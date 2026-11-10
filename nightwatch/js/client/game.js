/* Game — client orchestrator.
 *
 * Owns the renderer, scene and the per-frame loop, and wires together the
 * MultiplayerManager (net), LevelManager, PlayerController, EquipmentSystem,
 * EntityView, Effects, AudioSystem and UIManager. The client never edits the
 * authoritative state; it renders it and sends actions.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const U = NW.util;
  const V3 = THREE.Vector3;

  class Game {
    constructor() {
      const S = NW.Save.data.settings;
      this.quality = S.quality || 'high';
      const canvas = document.getElementById('game');
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.25 : 1));
      NW.Tex.setAnisotropy(Math.min(16, this.renderer.capabilities.getMaxAnisotropy()));
      this.renderer.setSize(innerWidth, innerHeight);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = this.quality !== 'low';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.camera = new THREE.PerspectiveCamera(S.fov || 72, innerWidth / innerHeight, 0.06, 400);
      this.input = new NW.Input(canvas);
      this.input.onLock = () => {};
      addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this._postSize(); });
      this.inGame = false; this.time = 0; this.speakingAt = {};
      this.last = performance.now();
      this.fps = 0;
      this.ui = NW.UI;
      NW.UI.init(this);
      requestAnimationFrame((t) => this.frame(t));
    }

    /* ---------- post-processing: bloom on light sources + filmic grade (medium/high) ---------- */
    _setupPost(scene) {
      this.post = null;
      if (this.quality === 'low' || !THREE.EffectComposer || !THREE.UnrealBloomPass) { this.renderer.toneMapping = THREE.ACESFilmicToneMapping; return; }
      try {
        const r = this.renderer;
        const hf = r.capabilities.isWebGL2 || r.extensions.has('OES_texture_half_float');
        const rtOpts = { type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        let rt;
        if (r.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) { rt = new THREE.WebGLMultisampleRenderTarget(4, 4, rtOpts); rt.samples = this.quality === 'high' ? 4 : 2; }
        else rt = new THREE.WebGLRenderTarget(4, 4, rtOpts);
        const comp = new THREE.EffectComposer(r, rt);
        const rp = new THREE.RenderPass(scene, this.camera); comp.addPass(rp);
        const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82); comp.addPass(bloom);
        const grade = new THREE.ShaderPass({
          uniforms: { tDiffuse: { value: null }, exposure: { value: 1.15 }, raw: { value: 0 }, sat: { value: 1 }, contrast: { value: 1 }, tint: { value: 0 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `uniform sampler2D tDiffuse; uniform float exposure; uniform float raw; uniform float sat; uniform float contrast; uniform float tint; varying vec2 vUv;
            vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
            void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
              if (raw < 0.5) {
                c = aces(c * exposure); c = pow(c, vec3(1.0/2.2));
                float l = dot(c, vec3(0.299, 0.587, 0.114));
                c = mix(vec3(l), c, sat);
                c = (c - 0.5) * contrast + 0.5;
                c = mix(c, vec3(l * 1.08, l * 1.0, l * 0.82), tint * 0.6);
                vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.55;
              }
              gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`
        });
        comp.addPass(grade);
        r.toneMapping = THREE.NoToneMapping;
        this.post = { comp, rp, bloom, grade };
        this._postSize();
      } catch (e) { console.warn('post-processing unavailable', e); this.post = null; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; }
    }
    _postSize() {
      const P = this.post; if (!P) return;
      const pr = this.renderer.getPixelRatio();
      P.comp.setPixelRatio(pr); P.comp.setSize(innerWidth, innerHeight);
      P.bloom.resolution.set(innerWidth * pr / 2, innerHeight * pr / 2);
    }
    _render() {
      const P = this.post;
      if (!P) { this.renderer.render(this.scene, this.camera); return; }
      const thermal = this.effects && this.effects.thermal;
      P.grade.uniforms.raw.value = thermal ? 1 : 0;
      const gr = this.effects && this.effects.grade;
      if (gr) { P.grade.uniforms.sat.value = gr.sat; P.grade.uniforms.contrast.value = gr.contrast; P.grade.uniforms.tint.value = gr.tint; }
      P.bloom.enabled = !thermal;
      P.comp.render();
    }

    me() { return this.state && this.state.players[this.myId]; }
    hasItem(type) { const me = this.me(); return !!me && me.inv.some((i) => i && this.state.items[i] && this.state.items[i].type === type); }
    uiBlocking() { return NW.UI.blocking(); }
    entityNear(pos, f, r) { const e = this.state && this.state.entity; return !!e && e.f === f && Math.hypot(e.x - pos.x, e.z - pos.z) < r; }

    /* ---------------- sessions ---------------- */
    startSolo(contract) {
      NW.Audio.init(NW.Save.data.settings.vol); NW.Audio.resume();
      this.net = new NW.LocalHost(this.profile());
      this._wireNet();
      this.net.start(contract);
    }
    async connectRemote(url) {
      NW.Audio.init(NW.Save.data.settings.vol); NW.Audio.resume();
      if (this.net && this.net.kind === 'remote') { try { this.net.leave(); } catch (e) { /* */ } }
      const rh = new NW.RemoteHost(this.profile(), url);
      await rh.connect();
      this.net = rh;
      this._wireNet();
    }
    profile() { const d = NW.Save.data; return { name: d.name, cosmetics: d.cosmetics }; }
    _wireNet() {
      const n = this.net;
      n.on('start', (m) => this.beginMission(m));
      n.on('snap', (m) => this.onSnap(m.s));
      n.on('fast', (m) => this.onFast(m.s));
      n.on('ev', (m) => { for (const e of m.e) this.onEvent(e); });
      n.on('room', (m) => { NW.UI.room = m; if (!this.inGame && !this.showingResults) NW.UI.showLobby(m); });
      n.on('chat', (m) => NW.UI.lobbyChatMsg(m));
      n.on('error', (m) => NW.UI.toast(m.msg, 'bad'));
      n.on('closed', () => { if (this.net === n) { NW.UI.toast('Disconnected from server.', 'bad'); if (this.inGame) { this.leaveGame(); NW.UI.showCoop('Connection lost.'); } } });
    }

    beginMission(m) {
      this.showingResults = false;
      const ld = document.getElementById('loading');
      ld.hidden = false; document.getElementById('ldSub').textContent = NW.LOCATION_BY_ID[m.cfg.locationId].name;
      document.getElementById('ldFill').style.width = '30%';
      setTimeout(() => {
        try { this._build(m); } catch (e) { console.error(e); NW.UI.toast('Failed to load: ' + e.message, 'bad'); ld.hidden = true; return; }
        document.getElementById('ldFill').style.width = '100%';
        setTimeout(() => { ld.hidden = true; this.input.lock(); }, 150);
      }, 30);
    }
    _build(m) {
      this.leaveGame(true);
      this.myId = m.you;
      this.state = this.net.kind === 'local' ? m.snap : JSON.parse(JSON.stringify(m.snap));
      this.cfg = m.cfg;
      this.world = new NW.World(NW.LOCATION_BY_ID[m.cfg.locationId], m.cfg.seed);
      const scene = this.scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05070b);
      scene.fog = new THREE.FogExp2(0x05070b, 0.05);
      scene.add(this.camera);
      this.hemi = new THREE.HemisphereLight(0x26324a, 0x0a0a0a, 0.18); scene.add(this.hemi);
      this.moon = new THREE.DirectionalLight(0x6f86b0, 0.18); this.moon.position.set(-60, 80, -40); scene.add(this.moon);
      this.level = new NW.LevelManager(scene, this.world, m.cfg.locationId, this.quality);
      this._setupPost(scene);
      // head torch
      const me = this.state.players[this.myId];
      this.torch = new THREE.SpotLight(new THREE.Color(me.torchColor || '#ffe6bf'), 2.6, 24, 0.46, 0.55, 1.5);
      this.torch.position.set(0.12, -0.08, 0.05);
      this.torch.target.position.set(0.05, -0.15, -4);
      this.camera.add(this.torch); this.camera.add(this.torch.target);
      if (this.quality !== 'low') { this.torch.castShadow = true; this.torch.shadow.mapSize.set(this.quality === 'high' ? 1024 : 512, this.quality === 'high' ? 1024 : 512); this.torch.shadow.camera.near = 0.2; this.torch.shadow.camera.far = 24; this.torch.shadow.bias = -0.0008; }
      this.mateTorch = new THREE.SpotLight(0xffe6bf, 0, 16, 0.42, 0.5, 2); scene.add(this.mateTorch); scene.add(this.mateTorch.target);
      this.player = new NW.PlayerController(this);
      this.player.spawn(me);
      this.camera.position.set(me.x, me.y + 1.6, me.z);
      this.equip = new NW.EquipmentSystem(this);
      this.tutorial = this.tutorial || new NW.Tutorial(this);
      this.effects = new NW.Effects(this);
      this.entityView = new NW.EntityView(scene, this.state.entity.look);
      this.atmo = new NW.Atmosphere(this);
      this.avatars = {};
      this.stepT = {}; this.entityStepT = 0;
      this.level.syncDoors(this.state, null);
      this.inGame = true; this.time = 0;
      NW.UI.enterGame();
      this.tutorial.start();
      NW.Audio.startAmbience(m.cfg.locationId);
      if (this.state.power && this.world.generator) NW.Audio.setHum(true, this.level.genPos);
      NW.UI.toast('Investigation started: ' + this.world.loc.name, 'good');
      NW.UI.toast(this.state.power ? 'Collect equipment from the Field Unit (E at the van).' : 'Site power is off — find the generator. Collect equipment at the van (E).');
      this.voice = new NW.VoiceChat(this);
      if (this.net.kind === 'remote' && NW.Save.data.settings.voice) this.voice.start();
      else if (NW.Save.data.settings.mic) this.enableMic();
    }
    leaveGame(keepNet) {
      if (this.scene) {
        NW.Audio.stopAmbience();
        this.scene.remove(this.camera);
        this.scene.traverse((o) => { if (o.geometry && o.geometry !== undefined) o.geometry.dispose && o.geometry.dispose(); });
        this.scene = null;
      }
      if (this.camera) { for (const c of this.camera.children.slice()) this.camera.remove(c); }
      this.inGame = false; this.state = null;
      if (this.tutorial) this.tutorial.stop();
      if (this.atmo) { this.atmo.dispose(); this.atmo = null; }
      if (this.voice) { this.voice.stop(); this.voice = null; }
      if (this.mic) { if (this.mic.stream) this.mic.stream.getTracks().forEach((t) => t.stop()); this.mic = null; }
      NW.UI.exitGame();
      this.input.unlock();
      if (!keepNet && this.net && this.net.kind === 'local') this.net = null;
    }
    abandon() {
      if (this.net.kind === 'local') { const p = this.me(); if (p) { this.net.session.incapacitate(p, null); if (this.net.session.state.phase === 'active') this.net.session.endMission('abandon'); } }
      else { this.net.leave(); this.leaveGame(); NW.UI.showMain(); }
    }

    /* ---------------- replication ---------------- */
    onSnap(s) {
      if (!this.inGame) return;
      if (this.net.kind === 'local') { this.state = s; return; }
      this.state = s;
    }
    onFast(s) {
      if (!this.inGame || this.net.kind === 'local') return;
      const st = this.state;
      st.t = s.t; st.entity = s.entity; st.hunting = s.hunting; st.traces.orbs = s.orbs;
      for (const id in s.players) { if (st.players[id]) Object.assign(st.players[id], s.players[id]); }
    }

    onEvent(e) {
      if (!this.inGame) return;
      const st = this.state, A = NW.Audio, me = this.me();
      if (e.to && e.to !== this.myId) return;
      const posOf = (x, z, f, dy) => ({ x, y: this.world.heightAt(f, x, z) + (dy == null ? 1.2 : dy), z });
      this.equip.onEvent(e);
      if (this.voice) this.voice.onEvent(e);
      switch (e.t) {
        case 'door': {
          const d = this.world.doors[e.id];
          const p = posOf(d.x + 0.5, d.z + 0.5, d.f);
          if (this.net.kind === 'remote') { st.doors[e.id].open = e.open; st.doors[e.id].locked = e.locked; }
          const near = e.by === this.myId ? this.camera.position : (Object.values(st.players).find((pp) => pp.id === e.by) || null);
          this.level.syncDoors(st, near ? { x: near.x, z: near.z } : this.camera.position);
          const dm = this.level.doorMeshes[e.id]; if (dm) dm.slam = !!e.slam;
          A.play(e.slam ? 'door_slam' : e.open ? 'door_open' : e.locked ? 'locked' : 'door_close', p, e.slam ? 1 : 0.7);
          if (e.by === 'entity' && e.locked) NW.UI.toast('Somewhere, a lock turns.');
          break;
        }
        case 'locked': A.play('locked', posOf(this.world.doors[e.id].x + 0.5, this.world.doors[e.id].z + 0.5, this.world.doors[e.id].f), 0.7); if (e.pid === this.myId) NW.UI.toast(this.world.doors[e.id].sealed ? 'Sealed. The lock is powered — restore site power.' : st.hunting ? 'The exit is locked!' : 'It won\'t open.', 'bad'); break;
        case 'light': if (this.net.kind === 'remote') st.roomLights[e.room] = e.on; if (e.by === 'entity') { const r = this.world.rooms[e.room]; if (r.switch) A.play('switch', { x: r.switch.x, y: r.switch.y, z: r.switch.z }, 0.6); } break;
        case 'flicker': this.level.flicker[e.room] = this.time + e.dur; { const r = this.world.rooms[e.room]; A.play('buzz', posOf(r.cx, r.cz, r.f, 2.4), 0.5); } break;
        case 'power': if (this.net.kind === 'remote') st.power = e.on; A.play(e.on ? 'generator_start' : 'breaker', this.level.genPos || null, 1); A.setHum(e.on, this.level.genPos); NW.UI.toast(e.on ? 'Site power restored.' : 'The power has cut out.', e.on ? 'good' : 'bad'); break;
        case 'nopower': NW.UI.toast('No power. Start the generator first.'); break;
        case 'sound': {
          const p = { x: e.x, y: e.y, z: e.z };
          if (e.kind === 'whisper' && e.text && this.camera.position.distanceTo(new V3(e.x, e.y, e.z)) < 7) NW.UI.subtitle('(whispering) ' + e.text, 2.5);
          A.play(e.kind, p, e.vol, { count: e.count });
          break;
        }
        case 'emf': break;
        case 'throw': this.level.throwAnim(e); if (this.net.kind === 'remote') { const t = st.throwables.find((x) => x.id === e.id); if (t) { t.x = e.to.x; t.y = e.to.y; t.z = e.to.z; t.ry = e.ry; } } break;
        case 'manifest': {
          const seen = me && me.alive && this._canSee(new V3(e.x, this.world.heightAt(e.f, e.x, e.z) + 1.2, e.z), e.f, 14);
          if (seen) { A.play('stinger', null, 0.6, { ui: true }); this.effects.onShock(10); }
          break;
        }
        case 'hunt_start':
          A.setHunt(true); A.play('hunt_sting', null, 0.8, { ui: true });
          this.level.globalFlicker = this.time + 2.5;
          NW.UI.toast('Something has changed. GET OUT OF SIGHT.', 'bad');
          break;
        case 'hunt_end': A.setHunt(false); this.level.globalFlicker = this.time + 0.8; break;
        case 'stun': A.play('flare', posOf(e.x, e.z, e.f), 1); break;
        case 'caught':
          A.play('catch', e.pid === this.myId ? null : posOf(e.x, e.z, e.f), 1, { ui: e.pid === this.myId });
          if (e.pid === this.myId) { NW.UI.toast('You have been incapacitated.', 'bad'); this.equip.raised = false; }
          else NW.UI.toast(e.name + ' has been incapacitated!', 'bad');
          break;
        case 'search': A.play('door_creak', null, 1, { ui: true }); break;
        case 'voice':
          A.play('voice', posOf(e.x, e.z, e.f), 1.2, { text: e.text, ref: 3 });
          if (e.pid === this.myId) { NW.UI.subtitle('Recorder: "' + e.text + '"', 4); A.speak(e.text, 0.2, 0.6, 0.8); }
          break;
        case 'voice_none': break;
        case 'bleed': NW.UI.radioLine('??? (empty channel)', e.text, true); A.play('static', null, 0.8, { d: 1.4, ui: true }); A.play('voice', null, 0.6, { text: e.text, ui: true }); break;
        case 'static': if (Math.random() < 0.6) A.play('static', null, e.strength * 0.5, { d: 0.5, ui: true }); break;
        case 'say': {
          if (e.pid === this.myId) break;
          const p = st.players[e.pid];
          this.speakingAt[e.pid] = this.time;
          if (p && me && p.f === me.f && Math.hypot(p.x - this.camera.position.x, p.z - this.camera.position.z) < 14) NW.UI.subtitle(p.name + ': "' + e.text + '"', 3);
          break;
        }
        case 'radio': {
          this.speakingAt[e.pid] = this.time;
          const sender = st.players[e.pid];
          if (me && sender && sender.alive !== me.alive) break; // the living and the dead can't hear each other
          let text = e.text;
          if (e.jam > 0) text = text.split('').map((c) => (Math.random() < e.jam * 0.6 ? '░' : c)).join('');
          NW.UI.radioLine(e.name, text, e.jam > 0.3);
          A.play('radio_in', null, 0.5, { ui: true });
          break;
        }
        case 'halluc': this.effects.hallucinate(e); break;
        case 'shock': this.effects.onShock(e.amount); break;
        case 'objective': NW.UI.toast('Objective complete: ' + e.name, 'good'); A.play('ui', null, 0.7, { ui: true, f: 1400 }); break;
        case 'inv': if (this.net.kind === 'remote' && st.players[e.pid]) st.players[e.pid].inv = e.inv; break;
        case 'join': if (e.pid !== this.myId) NW.UI.toast(e.name + ' joined the investigation.'); break;
        case 'leave': NW.UI.toast(e.name + ' left the investigation.'); if (this.avatars[e.pid]) { this.avatars[e.pid].dispose(); delete this.avatars[e.pid]; } break;
        case 'hide': if (e.pid === this.myId && !e.on) { this.player.pos.x = e.x; this.player.pos.z = e.z; } if (e.on) A.play('door_creak', posOf(this.world.hides[e.id].x + 0.5, this.world.hides[e.id].z + 0.5, this.world.hides[e.id].f), 0.5); break;
        case 'photo': if (e.pid !== this.myId) { const p = st.players[e.pid]; if (p) A.play('shutter', posOf(p.x, p.z, p.f), 0.5); } break;
        case 'flare': A.play('flare', posOf(e.x, e.z, e.f), 1); this.equip.flash.intensity = 30; break;
        case 'tablets': if (e.pid === this.myId) NW.UI.toast('Composure steadied.', 'good'); break;
        case 'spike': A.play('spike', posOf(e.x, e.z, e.f, 0.3), 1); NW.UI.toast('A grounding spike discharged. It tried to reach for you.', 'good'); break;
        case 'beacon': if (e.on) { A.play('chime', posOf(e.x, e.z, e.f), 1); NW.UI.toast('Signal Beacon active: the entity is provoked.', 'bad'); } break;
        case 'motion': { const it = st.items[e.item]; if (it) A.play('motion_beep', posOf(it.x, it.z, it.f, 0.2), 0.8, { phase: e.phase }); break; }
        case 'swab': NW.UI.toast(e.residue ? 'Sample analysis: RESIDUE TRACE POSITIVE' : 'Sample analysis: inconclusive', e.residue ? 'good' : ''); break;
        case 'note': if (e.pid === this.myId) { const n = st.notes.find((x) => x.id === e.id); if (n) NW.UI.openNote(n); } else NW.UI.toast('A document was recovered.'); break;
        case 'item': if (e.dead && me && this.equip.held() && this.equip.held().id === e.id) NW.UI.toast('Battery depleted / no charges.'); break;
        case 'device': { if (this.net.kind === 'remote' && st.devices[e.id]) st.devices[e.id].on = e.on; const dm = this.level.deviceMeshes[e.id]; if (dm) NW.Audio.play(e.on ? 'static' : 'click', dm.pos, 0.6, { d: 0.6 }); break; }
        case 'relic': if (e.pid === this.myId) { NW.UI.subtitle(e.text, 5); NW.Audio.play('whisper', null, 0.9, { ui: true }); this.effects.onShock(6); } else NW.UI.toast(e.text.split('(')[0]); if (this.net.kind === 'remote' && e.ev) st.journal.ev[e.ev] = 2; break;
        case 'mission_end': this.endMission(e.result); break;
      }
    }
    _canSee(p, f, range) {
      const me = this.me(); if (!me || me.f !== f) return false;
      const c = this.camera.position;
      if (c.distanceTo(p) > range) return false;
      const dir = new V3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      if (dir.dot(p.clone().sub(c).normalize()) < 0.5) return false;
      return this.world.los(f, c.x, c.z, p.x, p.z);
    }

    endMission(result) {
      if (this.showingResults) return;
      this.showingResults = true;
      const sum = NW.Save.applyResult(result, this.myId);
      setTimeout(() => {
        this.leaveGame(true);
        NW.UI.showResults(result, sum);
        if (this.net && this.net.kind === 'local') this.net = null;
        setTimeout(() => { this.showingResults = false; }, 2500);
      }, result.reason === 'all_down' ? 2600 : 600);
    }

    capturePhoto(meta) { this._capture = meta; }

    enableMic() {
      if (this.mic || !navigator.mediaDevices) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => this.attachMicStream(stream)).catch(() => NW.UI.toast('Microphone unavailable.', 'bad'));
    }
    /** Voice-activity detection: speaking aloud counts as calling out (entities may hear it). */
    attachMicStream(stream) {
      NW.Audio.init(); const ctx = NW.Audio.ctx;
      const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
      this.mic = { an, buf: new Float32Array(512), loudT: 0, sentT: 0, stream };
    }
    _micTick(dt) {
      const m = this.mic; if (!m || !this.inGame) return;
      m.an.getFloatTimeDomainData(m.buf);
      let s = 0; for (let i = 0; i < m.buf.length; i++) s += m.buf[i] * m.buf[i];
      const rms = Math.sqrt(s / m.buf.length);
      m.loudT = rms > 0.06 ? m.loudT + dt : 0;
      m.sentT -= dt;
      if (m.loudT > 0.25 && m.sentT <= 0) { m.sentT = 3; this.net.act({ k: 'say', text: '(speaking)' }); this.speakingAt[this.myId] = this.time; }
    }

    /* ---------------- frame ---------------- */
    frame(now) {
      requestAnimationFrame((t) => this.frame(t));
      const rawDt = (now - this.last) / 1000; this.last = now;
      const dt = Math.min(0.05, rawDt);
      if (rawDt > 0) this.fps += (1 / rawDt - this.fps) * 0.05;
      if (!this.inGame) { this.input.endFrame(); return; }
      this.time += dt;
      this.net.update(dt);
      if (!this.inGame || !this.state) return;
      const st = this.state, me = this.me();
      if (!me) { this.renderer.render(this.scene, this.camera); return; }
      this.player.update(dt);
      this._micTick(dt);
      if (this.voice) { this.voice.setPTT(!!this.input.keys.KeyB && !this.uiBlocking()); this.voice.update(dt); }
      // world sync
      this.level.syncDoors(st, null);
      this.level.animateDoors(dt);
      this.level.budget.begin();
      this.level.updateLights(st, this.camera, dt, this.time);
      this.level.syncThrowables(st);
      this.level.animateThrowables(dt, (p) => NW.Audio.play('thud', p, 0.6));
      this.level.syncNotes(st);
      this.level.syncDevices(st, this.time);
      this._devT = (this._devT || 0) - dt;
      if (this._devT <= 0) { this._devT = 1.2; for (const dm of this.level.deviceMeshes) if (st.devices[dm.dv.id] && st.devices[dm.dv.id].on && dm.pos.distanceTo(this.camera.position) < 14) NW.Audio.play('static', dm.pos, 0.45, { d: 1.15 }); }
      const held = this.equip.held();
      const uv = !!(held && held.type === 'samplekit' && held.on && me.alive);
      this.effects.setUV(uv);
      this.level.syncTraces(st, { uv, lens: this.effects.lens }, st.t);
      this.level.updateGenerator(st, this.time);
      // entity
      const huntingNear = st.hunting;
      this.entityView.update(st.entity, dt, this.time, huntingNear);
      if (st.hunting && !st.entity.silent && st.entity.mode === 'hunt') {
        this.entityStepT -= dt;
        if (this.entityStepT <= 0) { this.entityStepT = 0.55; NW.Audio.entityStep({ x: st.entity.x, y: st.entity.y + 0.1, z: st.entity.z }, st.entity.look.form === 'tall'); }
      }
      // torch: flickers when the entity is near during pursuits
      const near = this.entityNear(this.camera.position, me.f, 10);
      let torchI = this.player.torch && me.alive ? 2.6 : 0;
      if (torchI && st.hunting && near) torchI *= Math.random() > 0.35 ? 1 : 0.05;
      if (torchI && st.entity.visible && near && Math.random() < 0.1) torchI *= 0.2;
      this.torch.intensity = torchI;
      // ambient level by place
      const room = this.world.roomIdAt(me.f, this.camera.position.x, this.camera.position.z);
      const outdoors = room >= 0 && this.world.rooms[room].outdoor;
      if (!this.effects.thermal) this.hemi.intensity += ((outdoors ? 0.55 : 0.14) - this.hemi.intensity) * Math.min(1, dt * 2);
      this.moon.intensity = outdoors ? 0.35 : 0.06;
      this.atmo.update(dt, outdoors);
      NW.Audio.setRoomReverb(room >= 0 ? Math.min(1, this.world.rooms[room].area / 150) : 0.3);
      // remote players
      for (const id in st.players) {
        if (id === this.myId) continue;
        const p = st.players[id];
        let av = this.avatars[id];
        if (!av) av = this.avatars[id] = new NW.PlayerAvatar(this.scene, p);
        av.update(p, dt, this.time);
        if (p.alive && p.speed > 0.3 && p.hidden == null) {
          this.stepT[id] = (this.stepT[id] || 0) - dt * p.speed;
          if (this.stepT[id] <= 0) { this.stepT[id] = 0.8; NW.Audio.play('step', { x: p.x, y: p.y + 0.1, z: p.z }, 0.5, { surf: 'hard' }); }
        }
      }
      for (const id in this.avatars) if (!st.players[id]) { this.avatars[id].dispose(); delete this.avatars[id]; }
      this.equip.update(dt, this.time);
      this.tutorial.update(dt);
      this.effects.update(dt, me, this.time);
      NW.Audio.listen(this.camera);
      NW.Audio.setStress(me.alive ? me.composure : 100, st.entity.muffle && near ? 1 : 0);
      NW.Audio.setAmbienceLevel(st.entity.muffle && this.entityNear(this.camera.position, me.f, 7) ? 0.1 : 1);
      NW.Audio.tickAmbience(dt, this.camera.position, this.world.loc.id);
      NW.UI.updateHUD();
      // one real spotlight for the nearest teammate whose torch is on
      let best = null, bd = 30;
      for (const id in this.avatars) { const av = this.avatars[id], p = st.players[id]; if (!p || !p.alive || !p.torch || p.hidden != null || !av.root.visible) continue; const d = av.root.position.distanceTo(this.camera.position); if (d < bd) { bd = d; best = av; } }
      if (best) { best.torch.getWorldPosition(this.mateTorch.position); best.torchTarget.getWorldPosition(this.mateTorch.target.position); this.mateTorch.color.set(best.torchColor); this.mateTorch.intensity = 1.6; } else this.mateTorch.intensity = 0;
      if (this.entityView.light && this.entityView.vis > 0.05) { const ep = this.entityView.root.position; this.level.budget.request({ x: ep.x, y: ep.y + 1.5, z: ep.z, color: 0xffe2a0, intensity: 1.3 * this.entityView.vis, distance: 7, priority: 4 }); }
      this.level.updateVisibility(me.f, outdoors);
      this.level.budget.end(this.camera);
      this._render();
      if (this._capture) {
        const meta = this._capture; this._capture = null;
        try {
          const c = document.createElement('canvas'); c.width = 320; c.height = 180;
          const x = c.getContext('2d'); x.filter = 'sepia(0.4) contrast(1.2)';
          x.drawImage(this.renderer.domElement, 0, 0, 320, 180);
          NW.UI.photos.unshift({ src: c.toDataURL('image/jpeg', 0.7), t: st.t, entity: meta.entity, distortion: meta.distortion });
          if (NW.UI.photos.length > 24) NW.UI.photos.pop();
        } catch (e) { /* capture unavailable */ }
        const fl = document.getElementById('flashFx'); fl.style.transition = 'none'; fl.style.opacity = 0.7; requestAnimationFrame(() => { fl.style.transition = 'opacity .5s'; fl.style.opacity = 0; });
      }
      this.input.endFrame();
    }
  }
  NW.Game = Game;
})();
