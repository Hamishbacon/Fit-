/* AudioSystem — fully synthesised, spatial (HRTF) sound.
 *
 * No audio files: every sound is generated with WebAudio so the whole game
 * stays original and self-contained. Ambient beds are per-location.
 * Low composure routes everything through a detuning low-pass "stress" bus.
 */
(function () {
  'use strict';
  const NW = window.NW;

  class AudioSystem {
    constructor() { this.ctx = null; this.vol = 0.8; this.muffle = 0; this.stress = 0; }
    init(vol) {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = vol == null ? this.vol : vol;
      // stress filter: low composure muffles and darkens the world
      this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 18000;
      this.comp = ctx.createDynamicsCompressor();
      this.filter.connect(this.comp); this.comp.connect(this.master); this.master.connect(ctx.destination);
      // reverb send
      this.verb = ctx.createConvolver(); this.verb.buffer = this._impulse(2.4, 2.6);
      this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.32;
      this.verb.connect(this.verbGain); this.verbGain.connect(this.filter);
      this.world = ctx.createGain(); this.world.connect(this.filter); this.world.connect(this.verb);
      this.ui = ctx.createGain(); this.ui.connect(this.master);
      this.noiseBuf = this._noise(2);
    }
    setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    _noise(sec) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    _impulse(sec, decay) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return b;
    }
    setRoomReverb(size) { if (this.verbGain) this.verbGain.gain.setTargetAtTime(0.12 + size * 0.45, this.ctx.currentTime, 0.4); }

    /** Listener follows the camera. */
    listen(cam) {
      if (!this.ctx) return;
      const L = this.ctx.listener, p = cam.position;
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      if (!isFinite(p.x + p.y + p.z + f.x + f.y + f.z + u.x + u.y + u.z)) return;
      if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
      else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
    }
    /** Composure 0..100 → stress bus; muffle 0..1 for the Hush. */
    setStress(comp, muffle) {
      if (!this.ctx) return;
      const s = Math.max(0, (45 - comp) / 45);
      this.stress = s;
      const freq = 18000 * (1 - s * 0.82) * (1 - muffle * 0.75);
      this.filter.frequency.setTargetAtTime(Math.max(500, freq), this.ctx.currentTime, 0.3);
    }

    /** Output node at a world position (or non-spatial if pos is null). */
    _out(pos, vol, opts) {
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = vol;
      if (!pos) { g.connect((opts && opts.ui) ? this.ui : this.world); return g; }
      const p = ctx.createPanner();
      p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = (opts && opts.ref) || 1.2; p.maxDistance = 60; p.rolloffFactor = (opts && opts.roll) || 1.3;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); p.connect(this.world);
      return g;
    }
    _osc(type, f0, f1, t0, dur, out, vol) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
      return o;
    }
    _nz(t0, dur, out, vol, ftype, freq, q, attack) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.value = freq || 1000; f.Q.value = q || 0.7;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
      return f;
    }

    /** Play a named sound. pos: {x,y,z} or null. */
    play(kind, pos, vol, extra) {
      if (!this.ctx) return;
      vol = vol == null ? 1 : vol;
      const t = this.ctx.currentTime, out = this._out(pos, vol, extra);
      const R = Math.random;
      switch (kind) {
        case 'step': { const surf = (extra && extra.surf) || 'hard'; const freq = surf === 'water' ? 900 : surf === 'soft' ? 500 : surf === 'metal' ? 2600 : 1400; this._nz(t, surf === 'water' ? 0.22 : 0.08, out, 0.35, 'bandpass', freq * (0.8 + R() * 0.4), surf === 'metal' ? 4 : 1.2); if (surf === 'metal') this._osc('triangle', 180 + R() * 40, 160, t, 0.12, out, 0.05); if (surf === 'water') this._nz(t + 0.05, 0.3, out, 0.15, 'highpass', 2000, 1); break; }
        case 'steps': for (let i = 0; i < 4; i++) { this._nz(t + i * 0.45, 0.1, out, 0.5, 'bandpass', 700 + R() * 300, 1.2); this._osc('sine', 70, 50, t + i * 0.45, 0.12, out, 0.25); } break;
        case 'door_creak': { const o = this._osc('sawtooth', 220 + R() * 80, 140 + R() * 60, t, 0.9, out, 0.06); const f = this.ctx.createBiquadFilter(); void o; void f; this._nz(t, 0.9, out, 0.05, 'bandpass', 900, 8, 0.2); break; }
        case 'door_open': this._osc('sawtooth', 300 + R() * 60, 180, t, 0.5, out, 0.035); this._nz(t, 0.15, out, 0.2, 'bandpass', 1500, 2); break;
        case 'door_close': this._nz(t, 0.18, out, 0.5, 'lowpass', 600, 1); this._osc('sine', 90, 50, t, 0.2, out, 0.5); break;
        case 'door_slam': this._nz(t, 0.5, out, 1.0, 'lowpass', 900, 1); this._osc('sine', 70, 35, t, 0.45, out, 0.9); break;
        case 'door_rattle': for (let i = 0; i < 5; i++) this._nz(t + i * 0.07, 0.05, out, 0.4, 'bandpass', 1800 + R() * 400, 3); break;
        case 'locked': for (let i = 0; i < 3; i++) this._nz(t + i * 0.09, 0.05, out, 0.35, 'bandpass', 2400, 4); break;
        case 'click': this._nz(t, 0.025, out, 0.5, 'highpass', 3000, 1); break;
        case 'switch': this._nz(t, 0.03, out, 0.6, 'bandpass', 3500, 2); this._osc('square', 1800, 1200, t, 0.02, out, 0.05); break;
        case 'knock': { const n = (extra && extra.count) || 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { this._osc('sine', 120, 70, t + i * 0.32, 0.18, out, 0.9); this._nz(t + i * 0.32, 0.06, out, 0.6, 'lowpass', 1200, 1); } break; }
        case 'whisper': { const dur = 1.2 + R(); for (let i = 0; i < 6; i++) { const f = this._nz(t + i * dur / 6, dur / 5, out, 0.18, 'bandpass', 1500 + R() * 2500, 6, 0.05); f.frequency.linearRampToValueAtTime(800 + R() * 3000, t + (i + 1) * dur / 6); } break; }
        case 'breath': this._nz(t, 1.6, out, 0.3, 'bandpass', 500, 1.5, 0.6); this._nz(t + 1.7, 1.2, out, 0.2, 'bandpass', 700, 1.5, 0.3); break;
        case 'groan': { const o = this._osc('sawtooth', 70 + R() * 30, 45, t, 2.2, out, 0.12); void o; this._nz(t, 2.2, out, 0.08, 'bandpass', 300, 3, 0.5); break; }
        case 'creak': this._osc('sawtooth', 160 + R() * 120, 90 + R() * 60, t, 0.6 + R() * 0.6, out, 0.04); break;
        case 'scratch': for (let i = 0; i < 8; i++) this._nz(t + i * 0.09, 0.07, out, 0.25, 'highpass', 3000 + R() * 2000, 2); break;
        case 'drip': this._osc('sine', 1400 + R() * 600, 500, t, 0.12, out, 0.4); break;
        case 'chime': this._osc('sine', 880, 880, t, 2.5, out, 0.12); this._osc('sine', 1318, 1318, t + 0.05, 2.0, out, 0.07); break;
        case 'keys': for (let i = 0; i < 7; i++) this._osc('triangle', 3000 + R() * 2500, 2800, t + i * 0.05 + R() * 0.04, 0.12, out, 0.08); break;
        case 'buzz': this._osc('sawtooth', 120, 120, t, 0.8, out, 0.06); this._osc('square', 60, 60, t, 0.8, out, 0.04); break;
        case 'drag': this._nz(t, 1.6, out, 0.35, 'lowpass', 300, 2, 0.4); break;
        case 'crackle': for (let i = 0; i < 14; i++) this._nz(t + R() * 1.2, 0.02, out, 0.4, 'highpass', 2500, 1); break;
        case 'manifest': this._osc('sine', 55, 40, t, 3, out, 0.3); this._nz(t, 2.5, out, 0.12, 'bandpass', 900, 10, 0.5); this._osc('sine', 1760, 1700, t, 2, out, 0.03); break;
        case 'pressure': this._osc('sine', 38, 30, t, 2.5, out, 0.5); break;
        case 'breaker': this._nz(t, 0.25, out, 0.9, 'lowpass', 2000, 1); this._osc('square', 90, 40, t, 0.3, out, 0.3); break;
        case 'generator_start': for (let i = 0; i < 3; i++) this._osc('sawtooth', 40, 60, t + i * 0.25, 0.25, out, 0.3); break;
        case 'thud': this._osc('sine', 110, 60, t, 0.15, out, 0.6); this._nz(t, 0.08, out, 0.4, 'lowpass', 1500, 1); break;
        case 'glass': for (let i = 0; i < 10; i++) this._osc('sine', 3000 + R() * 4000, 2500, t + R() * 0.25, 0.2, out, 0.08); break;
        case 'shutter': this._nz(t, 0.04, out, 0.5, 'highpass', 4000, 1); this._nz(t + 0.06, 0.04, out, 0.4, 'highpass', 3000, 1); break;
        case 'flash_charge': { const o = this._osc('sine', 2000, 7000, t, 0.8, out, 0.03); void o; break; }
        case 'beep': this._osc('square', (extra && extra.f) || 1200, (extra && extra.f) || 1200, t, (extra && extra.d) || 0.06, out, 0.08); break;
        case 'static': this._nz(t, (extra && extra.d) || 0.4, out, 0.25, 'bandpass', 2500, 0.5); break;
        case 'radio_in': this._nz(t, 0.08, out, 0.2, 'bandpass', 3000, 1); this._osc('square', 1800, 1800, t + 0.02, 0.05, out, 0.05); break;
        case 'heartbeat': this._osc('sine', 60, 40, t, 0.15, out, 0.8); this._osc('sine', 55, 38, t + 0.22, 0.15, out, 0.6); break;
        case 'hunt_sting': this._osc('sawtooth', 50, 30, t, 2.5, out, 0.25); this._nz(t, 2, out, 0.3, 'bandpass', 200, 2, 0.05); this._osc('sine', 2093, 2000, t, 1.5, out, 0.04); break;
        case 'stinger': this._osc('sawtooth', 300, 40, t, 1.2, out, 0.12); this._nz(t, 1, out, 0.3, 'highpass', 1500, 1, 0.02); break;
        case 'swallow': this._nz(t, 0.3, out, 0.2, 'bandpass', 400, 2); break;
        case 'spike': this._osc('triangle', 600, 2000, t, 0.6, out, 0.2); this._nz(t, 0.6, out, 0.3, 'highpass', 4000, 1); break;
        case 'flare': this._nz(t, 2.5, out, 0.5, 'highpass', 1500, 1, 0.05); this._osc('sawtooth', 120, 60, t, 0.4, out, 0.3); break;
        case 'motion_beep': this._osc('square', (extra && extra.phase) ? 640 : 1600, (extra && extra.phase) ? 420 : 1600, t, 0.25, out, 0.12); break;
        case 'pickup': this._nz(t, 0.05, out, 0.3, 'bandpass', 2000, 2); break;
        case 'ui': this._osc('sine', (extra && extra.f) || 700, (extra && extra.f) || 700, t, 0.05, out, 0.06); break;
        case 'voice': this._voice(t, out, extra && extra.text); break;
        case 'catch': this._osc('sawtooth', 400, 30, t, 1.4, out, 0.4); this._nz(t, 1.2, out, 0.6, 'lowpass', 3000, 1, 0.01); break;
        default: this._nz(t, 0.1, out, 0.2, 'bandpass', 1000, 1);
      }
    }
    /** A distorted, formant-ish "voice" made from filtered noise and a buzzing carrier. */
    _voice(t, out, text) {
      const syll = Math.max(2, Math.min(8, Math.round(((text || '...').replace(/\./g, '').length) / 2.5)));
      for (let i = 0; i < syll; i++) {
        const t0 = t + i * 0.22 + Math.random() * 0.05;
        this._osc('sawtooth', 90 + Math.random() * 30, 70, t0, 0.2, out, 0.05);
        this._nz(t0, 0.2, out, 0.25, 'bandpass', 600 + Math.random() * 1600, 8, 0.04);
      }
    }

    /* ---------- loops (ambience, hum, hunts) ---------- */
    startAmbience(locId) {
      if (!this.ctx) return;
      this.stopAmbience();
      const ctx = this.ctx, t = ctx.currentTime;
      const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.5, t + 3); g.connect(this.filter);
      const nodes = [];
      const noiseLoop = (ftype, freq, q, vol, lfoRate, lfoAmt) => {
        const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
        const gg = ctx.createGain(); gg.gain.value = vol;
        if (lfoRate) { const l = ctx.createOscillator(); l.frequency.value = lfoRate; const la = ctx.createGain(); la.gain.value = lfoAmt; l.connect(la); la.connect(f.frequency); l.start(); nodes.push(l); }
        s.connect(f); f.connect(gg); gg.connect(g); s.start(); nodes.push(s);
      };
      const drone = (freq, vol) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; const gg = ctx.createGain(); gg.gain.value = vol; o.connect(gg); gg.connect(g); o.start(); nodes.push(o); };
      if (locId === 'observatory') { noiseLoop('bandpass', 400, 0.8, 0.5, 0.07, 250); noiseLoop('lowpass', 120, 1, 0.4, 0.03, 40); drone(43, 0.05); }
      else if (locId === 'apartments') { noiseLoop('lowpass', 200, 1, 0.25); drone(60, 0.025); drone(120, 0.01); noiseLoop('bandpass', 1500, 2, 0.03, 0.2, 400); }
      else if (locId === 'clinic') { noiseLoop('lowpass', 300, 1, 0.2, 0.05, 80); drone(50, 0.04); drone(100, 0.012); }
      else { noiseLoop('lowpass', 500, 0.7, 0.45, 0.09, 350); noiseLoop('bandpass', 180, 1, 0.3, 0.05, 60); drone(38, 0.05); }
      this.amb = { g, nodes };
      // random distant one-shots
      this.ambT = 6;
    }
    stopAmbience() { if (this.amb) { this.amb.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* */ } }); this.amb.g.disconnect(); this.amb = null; } this.setHum(false); this.setHunt(false); }
    tickAmbience(dt, camPos, locId) {
      if (!this.amb) return;
      this.ambT -= dt;
      if (this.ambT <= 0) {
        this.ambT = 8 + Math.random() * 14;
        const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 15;
        const pos = { x: camPos.x + Math.cos(a) * d, y: camPos.y + (Math.random() - 0.3) * 3, z: camPos.z + Math.sin(a) * d };
        const pool = { observatory: ['creak', 'drip', 'thud', 'creak'], apartments: ['creak', 'thud', 'drip', 'knock'], clinic: ['creak', 'drip', 'thud'], ferry: ['drip', 'creak', 'thud', 'drip'] }[locId] || ['creak'];
        this.play(pool[Math.floor(Math.random() * pool.length)], pos, 0.25);
      }
    }
    setAmbienceLevel(v) { if (this.amb) this.amb.g.gain.setTargetAtTime(0.5 * v, this.ctx.currentTime, 0.5); }
    /** Generator / power hum. */
    setHum(on, pos) {
      if (!this.ctx) return;
      if (on && !this.hum) {
        const ctx = this.ctx, out = this._out(pos, 0.25, { ref: 2 });
        const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
        o1.connect(f); f.connect(out); o1.start();
        const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 150; const ng = ctx.createGain(); ng.gain.value = 0.4; n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
        this.hum = [o1, n];
      } else if (!on && this.hum) { this.hum.forEach((x) => x.stop()); this.hum = null; }
    }
    /** Pursuit drone + heartbeat, intensity 0..1 */
    setHunt(on) {
      if (!this.ctx) return;
      if (on && !this.huntLoop) {
        const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1); g.connect(this.filter);
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 36; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3; const la = ctx.createGain(); la.gain.value = 6; lfo.connect(la); la.connect(o.frequency);
        o.connect(f); f.connect(g); o.start(); lfo.start();
        this.huntLoop = { g, nodes: [o, lfo] };
      } else if (!on && this.huntLoop) {
        const h = this.huntLoop; h.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        setTimeout(() => h.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* */ } }), 1500);
        this.huntLoop = null;
      }
    }
    /** Entity footsteps during pursuit (spatial). */
    entityStep(pos, heavy) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, out = this._out(pos, heavy ? 1.2 : 0.9, { ref: 1.6, roll: 1.1 });
      this._osc('sine', heavy ? 55 : 75, 35, t, 0.2, out, 0.8);
      this._nz(t, 0.12, out, 0.5, 'lowpass', 700, 1);
    }

    /** Speak text with the browser's speech engine if allowed (optional flavour). */
    speak(text, pitch, rate, vol) {
      if (!('speechSynthesis' in window) || !NW.Save.data.settings.tts) return;
      try { const u = new SpeechSynthesisUtterance(text.replace(/\./g, ' ')); u.pitch = pitch == null ? 0.3 : pitch; u.rate = rate || 0.7; u.volume = (vol == null ? 0.7 : vol) * this.vol; speechSynthesis.speak(u); } catch (e) { /* */ }
    }
  }
  NW.Audio = new AudioSystem();
})();
