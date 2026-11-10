/* MultiplayerManager — one interface for solo and online play.
 *
 *   LocalHost  runs a GameSession in this browser tab (solo / offline).
 *   RemoteHost talks to server/server.js over WebSocket (online co-op).
 *
 * Both emit the same messages ('start', 'snap', 'fast', 'ev', 'room',
 * 'chat', 'error', 'closed') and accept the same calls, so the rest of the
 * client never needs to know which one it is using.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const U = NW.util;

  class LocalHost extends U.Emitter {
    constructor(profile) {
      super();
      this.kind = 'local';
      this.id = 'p1';
      this.profile = profile;
      this.session = null;
      this.acc = 0; this.tickN = 0;
    }
    start(settings) {
      const cfg = NW.buildSessionConfig(settings, (Math.random() * 1e9) >>> 0);
      this.session = new NW.GameSession(cfg);
      const c = this.profile.cosmetics;
      this.session.addPlayer({ id: this.id, name: this.profile.name, suit: c.suitColor, torchColor: c.torchColor, badge: c.badge });
      this.session.flushEvents();
      this.emit('start', { cfg: { locationId: cfg.locationId, difficulty: cfg.difficulty, seed: cfg.seed }, you: this.id, snap: this.session.snapshot() });
    }
    /** Called from the game loop with real dt; advances the sim at a fixed rate. */
    update(dt) {
      const s = this.session; if (!s) return;
      const step = 1 / NW.NET.TICK_HZ;
      this.acc = Math.min(this.acc + dt, 0.25);
      while (this.acc >= step) {
        this.acc -= step;
        if (this.paused) continue;
        s.tick(step); this.tickN++;
        const ev = s.flushEvents();
        if (ev.length) this.emit('ev', { e: ev });
        this.emit('fast', { s: s.fastSnapshot() });
        if (this.tickN % 5 === 0) this.emit('snap', { s: s.snapshot() });
      }
    }
    act(a) { if (this.session) this.session.applyAction(this.id, a); }
    leave() { this.session = null; }
  }

  class RemoteHost extends U.Emitter {
    constructor(profile, url) {
      super();
      this.kind = 'remote';
      this.profile = profile;
      this.url = url;
      this.id = null;
      this.ws = null;
    }
    connect() {
      return new Promise((resolve, reject) => {
        let ws;
        try { ws = new WebSocket(this.url); } catch (e) { reject(e); return; }
        this.ws = ws;
        const to = setTimeout(() => { reject(new Error('Connection timed out')); try { ws.close(); } catch (e) { /* */ } }, 6000);
        ws.onopen = () => {
          clearTimeout(to);
          const c = this.profile.cosmetics;
          this._send({ type: 'hello', v: NW.PROTOCOL_VERSION, name: this.profile.name, cosmetics: { suit: c.suitColor, torch: c.torchColor, badge: c.badge } });
          resolve();
        };
        ws.onerror = () => { clearTimeout(to); reject(new Error('Could not reach server')); };
        ws.onclose = () => this.emit('closed', {});
        ws.onmessage = (m) => {
          let msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
          if (msg.type === 'welcome') { this.id = msg.id; return; }
          this.emit(msg.type, msg);
        };
      });
    }
    _send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
    create() { this._send({ type: 'create' }); }
    join(code) { this._send({ type: 'join', code }); }
    setLobby(settings) { this._send({ type: 'lobby', settings }); }
    ready(r) { this._send({ type: 'ready', ready: r }); }
    chat(text) { this._send({ type: 'chat', text }); }
    start() { this._send({ type: 'start' }); }
    act(a) { this._send({ type: 'act', a }); }
    update() { /* network-driven */ }
    leave() { this._send({ type: 'leave' }); try { this.ws.close(); } catch (e) { /* */ } }
  }

  NW.LocalHost = LocalHost;
  NW.RemoteHost = RemoteHost;
})();
