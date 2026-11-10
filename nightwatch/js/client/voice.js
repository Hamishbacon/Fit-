/* VoiceChat — WebRTC voice for co-op (mesh, up to 4 players).
 *
 * Signalling goes through the game server ({type:'rtc'} relay). Each remote
 * voice is routed into WebAudio twice:
 *   proximity: HRTF panner at the speaker's position, quieter through walls
 *              and between floors, silent beyond ~18 m
 *   radio:     band-passed, distorted, with static; only while the speaker
 *              holds push-to-talk (B) and both carry a radio. Interference
 *              rises near the entity and during pursuits.
 * The living and the incapacitated cannot hear each other.
 *
 * ICE servers are configurable in Settings (default: none, which works on a
 * LAN). Add a STUN/TURN server URL there for play across the internet.
 */
(function () {
  'use strict';
  const NW = window.NW;

  class VoiceChat {
    constructor(game) { this.g = game; this.peers = {}; this.stream = null; this.active = false; this.ptt = false; this.radioOn = {}; }

    async start() {
      const g = this.g;
      if (this.active || !g.net || g.net.kind !== 'remote' || !NW.Save.data.settings.voice) return;
      if (!window.RTCPeerConnection || !navigator.mediaDevices) { NW.UI.toast('Voice chat is not supported in this browser.', 'bad'); return; }
      try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { NW.UI.toast('Microphone unavailable — voice chat off.', 'bad'); return; }
      this.active = true;
      NW.Audio.init(); this.ctx = NW.Audio.ctx;
      this._noise = this.ctx.createBufferSource(); this._noise.buffer = NW.Audio.noiseBuf; this._noise.loop = true; this._noise.start();
      g.attachMicStream(this.stream);
      this._off = g.net.on('rtc', (m) => this._signal(m.from, m.data));
      this.sync();
      NW.UI.toast('Voice chat on: speak nearby, hold B to talk on the radio.', 'good');
    }
    stop() {
      for (const id in this.peers) this._close(id);
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this._off) this._off();
      if (this._noise) { try { this._noise.stop(); } catch (e) { /* */ } }
      this.stream = null; this.active = false; this.peers = {};
    }
    iceServers() {
      const raw = (NW.Save.data.settings.ice || '').trim();
      return raw ? raw.split(/[\s,]+/).filter(Boolean).map((u) => ({ urls: u })) : [];
    }
    /** Make sure we have a connection to every other player in the mission. */
    sync() {
      if (!this.active || !this.g.state) return;
      const me = this.g.myId, ids = Object.keys(this.g.state.players).filter((id) => id !== me);
      for (const id of ids) if (!this.peers[id] && me < id) this._connect(id, true);
      for (const id in this.peers) if (ids.indexOf(id) < 0) this._close(id);
    }
    _send(to, data) { this.g.net._send({ type: 'rtc', to, data }); }
    _connect(id, initiator) {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers() });
      const peer = this.peers[id] = { pc, nodes: null };
      this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
      pc.onicecandidate = (e) => { if (e.candidate) this._send(id, { ice: e.candidate }); };
      pc.ontrack = (e) => this._attach(id, e.streams[0]);
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { this._close(id); } };
      if (initiator) pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => this._send(id, { sdp: pc.localDescription }));
      return peer;
    }
    async _signal(from, data) {
      if (!this.active) return;
      let peer = this.peers[from];
      if (!peer) peer = this._connect(from, false);
      const pc = peer.pc;
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === 'offer') { await pc.setLocalDescription(await pc.createAnswer()); this._send(from, { sdp: pc.localDescription }); }
          for (const c of peer.pending || []) await pc.addIceCandidate(c);
          peer.pending = null;
        } else if (data.ice) {
          if (pc.remoteDescription) await pc.addIceCandidate(data.ice); else (peer.pending = peer.pending || []).push(data.ice);
        }
      } catch (e) { console.warn('voice signalling', e); }
    }
    _attach(id, stream) {
      const peer = this.peers[id]; if (!peer || peer.nodes) return;
      const ctx = this.ctx;
      // Chrome only feeds remote WebRTC audio into WebAudio while an element plays it
      const el = new Audio(); el.srcObject = stream; el.muted = true; el.play().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      // proximity path
      const prox = ctx.createGain(); prox.gain.value = 0;
      const pan = ctx.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 1.5; pan.rolloffFactor = 1;
      const wall = ctx.createBiquadFilter(); wall.type = 'lowpass'; wall.frequency.value = 20000;
      src.connect(wall); wall.connect(prox); prox.connect(pan); pan.connect(NW.Audio.master);
      // radio path
      const radio = ctx.createGain(); radio.gain.value = 0;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.1;
      const shaper = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } shaper.curve = curve;
      const st = ctx.createGain(); st.gain.value = 0; const stf = ctx.createBiquadFilter(); stf.type = 'highpass'; stf.frequency.value = 1800;
      this._noise.connect(stf); stf.connect(st); st.connect(radio);
      src.connect(bp); bp.connect(shaper); shaper.connect(radio); radio.connect(NW.Audio.master);
      // level meter to light the speaking indicator
      const an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
      peer.nodes = { el, src, prox, pan, wall, radio, st, an, buf: new Float32Array(256) };
    }
    _close(id) {
      const p = this.peers[id]; if (!p) return;
      try { p.pc.close(); } catch (e) { /* */ }
      if (p.nodes) { try { p.nodes.src.disconnect(); p.nodes.prox.disconnect(); p.nodes.radio.disconnect(); p.nodes.st.disconnect(); } catch (e) { /* */ } p.nodes.el.srcObject = null; }
      delete this.peers[id];
    }

    setPTT(on) {
      const g = this.g;
      if (on === this.ptt) return;
      if (on) { const me = g.me(); if (!me || !me.alive || !g.hasItem('radio')) return; }
      this.ptt = on;
      g.net.act({ k: 'ptt', on });
      NW.Audio.play('radio_in', null, 0.4, { ui: true });
    }
    onEvent(e) { if (e.t === 'ptt') this.radioOn[e.pid] = e.on; if (e.t === 'join' || e.t === 'leave') setTimeout(() => this.sync(), 300); }

    /** Per-frame routing: positions, walls, floors, radio and interference. */
    update(dt) {
      if (!this.active) return;
      const g = this.g, st = g.state, me = g.me(); if (!st || !me) return;
      this._syncT = (this._syncT || 0) - dt; if (this._syncT <= 0) { this._syncT = 2; this.sync(); }
      const t = this.ctx.currentTime, cam = g.camera.position;
      const iHaveRadio = g.hasItem('radio');
      for (const id in this.peers) {
        const n = this.peers[id].nodes, p = st.players[id];
        if (!n || !p) continue;
        n.an.getFloatTimeDomainData(n.buf);
        let s = 0; for (let i = 0; i < n.buf.length; i += 4) s += n.buf[i] * n.buf[i];
        if (Math.sqrt(s / 64) > 0.03) g.speakingAt[id] = g.time;
        const sameWorld = p.alive === me.alive;
        // proximity
        const d = Math.hypot(p.x - cam.x, p.z - cam.z), floorDiff = Math.abs(p.f - me.f);
        let gp = sameWorld ? Math.max(0, 1 - d / 18) : 0;
        let cutoff = 20000;
        if (floorDiff) { gp *= 0.2; cutoff = 500; } else if (!g.world.los(me.f, cam.x, cam.z, p.x, p.z)) { gp *= 0.55; cutoff = 900; }
        if (p.hidden != null) cutoff = Math.min(cutoff, 1200);
        n.prox.gain.setTargetAtTime(gp, t, 0.08);
        n.wall.frequency.setTargetAtTime(cutoff, t, 0.1);
        if (n.pan.positionX) { n.pan.positionX.value = p.x; n.pan.positionY.value = p.y + 1.6; n.pan.positionZ.value = p.z; } else n.pan.setPosition(p.x, p.y + 1.6, p.z);
        // radio
        const onAir = this.radioOn[id] && iHaveRadio && sameWorld && p.alive;
        const nearEnt = (pp) => st.entity && st.entity.f === pp.f && Math.hypot(st.entity.x - pp.x, st.entity.z - pp.z) < 8;
        const jam = st.hunting ? 0.75 : (nearEnt(p) || nearEnt(me)) ? 0.4 : 0.05;
        const drop = st.hunting && Math.random() < 0.15 ? 0.1 : 1;
        n.radio.gain.setTargetAtTime(onAir ? 0.9 * drop * (1 - jam * 0.5) : 0, t, 0.03);
        n.st.gain.setTargetAtTime(onAir ? 0.08 + jam * 0.5 : 0, t, 0.05);
      }
    }
  }
  NW.VoiceChat = VoiceChat;
})();
