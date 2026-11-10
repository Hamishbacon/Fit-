#!/usr/bin/env node
/* Nightwatch Protocol — dedicated co-op server (zero dependencies).
 *
 *   node server/server.js [--port 8787]
 *
 * • Serves the game client over HTTP (open http://<host>:8787 in a browser).
 * • Hosts lobbies over WebSocket (/ws) with 4-letter room codes.
 * • Runs the authoritative GameSession for every room, using the exact same
 *   simulation files the browser uses for solo play (js/shared/**).
 *
 * Players' own movement is client-authoritative (co-op trust model) and is
 * uploaded as `pose` actions; everything else — entity, evidence, doors,
 * items, composure, objectives — is decided here and replicated.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSim } = require('./simLoader');

const NW = loadSim();
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = Number((args[args.indexOf('--port') + 1]) || process.env.PORT || NW.NET.DEFAULT_PORT);

/* ---------------- static files ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}server${path.sep}`)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ---------------- minimal RFC 6455 WebSocket ---------------- */
class Socket {
  constructor(sock) {
    this.sock = sock; this.buf = Buffer.alloc(0); this.open = true; this.onmessage = null; this.onclose = null; this.frags = [];
    sock.setNoDelay(true);
    sock.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]); this._parse(); });
    sock.on('close', () => this._closed());
    sock.on('error', () => this._closed());
  }
  _closed() { if (!this.open) return; this.open = false; if (this.onclose) this.onclose(); }
  _parse() {
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) return this.close();
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = this.buf.subarray(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      this.buf = this.buf.subarray(need);
      if (op === 0x8) return this.close();
      if (op === 0x9) { this._frame(0xA, payload); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x0) {
        this.frags.push(payload);
        if (fin) { const msg = Buffer.concat(this.frags).toString('utf8'); this.frags = []; if (this.onmessage) this.onmessage(msg); }
      }
    }
  }
  _frame(op, data) {
    if (!this.open) return;
    const len = data.length;
    let head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | op;
    this.sock.write(Buffer.concat([head, data]));
  }
  send(obj) { this._frame(0x1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))); }
  close() { if (this.open) { try { this._frame(0x8, Buffer.alloc(0)); this.sock.end(); } catch (e) { /* ignore */ } } this._closed(); }
}

server.on('upgrade', (req, sock) => {
  if (!/^\/ws/.test(req.url || '') || (req.headers.upgrade || '').toLowerCase() !== 'websocket') return sock.destroy();
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  onClient(new Socket(sock));
});

/* ---------------- lobbies ---------------- */
const rooms = new Map();
let nextId = 1;
const code4 = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s; do { s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; } while (rooms.has(s)); return s; };
const defaultSettings = () => ({ location: 'observatory', difficulty: 'standard', loadout: { scanner: 2, thermal: 1, recorder: 1, samplekit: 1, lens: 1, motion: 2, pressure: 1, slate: 1, elight: 1, spike: 1, tablets: 2 }, tiers: {} });

function roomInfo(r) {
  return { type: 'room', code: r.code, hostId: r.hostId, settings: r.settings, inGame: !!r.session,
    players: [...r.clients.values()].map((c) => ({ id: c.id, name: c.name, ready: c.ready, cosmetics: c.cosmetics })) };
}
function broadcast(r, msg) { const s = JSON.stringify(msg); for (const c of r.clients.values()) c.ws.send(s); }

function onClient(ws) {
  const c = { id: 'p' + (nextId++), ws, name: 'Investigator', ready: false, cosmetics: {}, room: null };
  ws.send({ type: 'welcome', id: c.id, v: NW.PROTOCOL_VERSION });
  ws.onmessage = (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    try { handle(c, m); } catch (e) { console.error('handler error', e); }
  };
  ws.onclose = () => leaveRoom(c);
}

function handle(c, m) {
  switch (m.type) {
    case 'hello':
      if (m.v !== NW.PROTOCOL_VERSION) return c.ws.send({ type: 'error', msg: 'Version mismatch — refresh the page.' });
      c.name = String(m.name || 'Investigator').slice(0, 20); c.cosmetics = m.cosmetics || {};
      return;
    case 'create': {
      leaveRoom(c);
      const r = { code: code4(), hostId: c.id, clients: new Map(), settings: defaultSettings(), session: null, timer: null };
      rooms.set(r.code, r); r.clients.set(c.id, c); c.room = r;
      return broadcast(r, roomInfo(r));
    }
    case 'join': {
      const r = rooms.get(String(m.code || '').toUpperCase());
      if (!r) return c.ws.send({ type: 'error', msg: 'No lobby with that code.' });
      if (r.clients.size >= NW.NET.MAX_PLAYERS) return c.ws.send({ type: 'error', msg: 'Lobby is full.' });
      leaveRoom(c);
      r.clients.set(c.id, c); c.room = r; c.ready = false;
      broadcast(r, roomInfo(r));
      if (r.session) { // drop-in during a mission
        r.session.addPlayer({ id: c.id, name: c.name, suit: c.cosmetics.suit, torchColor: c.cosmetics.torch, badge: c.cosmetics.badge });
        c.ws.send({ type: 'start', cfg: r.cfgPublic, you: c.id, snap: r.session.snapshot() });
      }
      return;
    }
    case 'lobby': if (c.room && c.room.hostId === c.id && !c.room.session) { c.room.settings = m.settings; broadcast(c.room, roomInfo(c.room)); } return;
    case 'ready': if (c.room) { c.ready = !!m.ready; broadcast(c.room, roomInfo(c.room)); } return;
    case 'chat': if (c.room) broadcast(c.room, { type: 'chat', from: c.name, text: String(m.text || '').slice(0, 200) }); return;
    case 'start': if (c.room && c.room.hostId === c.id && !c.room.session) startMission(c.room); return;
    case 'act': if (c.room && c.room.session && m.a) c.room.session.applyAction(c.id, m.a); return;
    case 'rtc': { // WebRTC voice signalling relay within a room
      if (!c.room || !m.to) return;
      const t = c.room.clients.get(m.to);
      if (t) t.ws.send({ type: 'rtc', from: c.id, data: m.data });
      return;
    }
    case 'leave': leaveRoom(c); return;
  }
}

function startMission(r) {
  const seed = (Math.random() * 1e9) >>> 0;
  const cfg = NW.buildSessionConfig(r.settings, seed);
  const s = new NW.GameSession(cfg);
  for (const c of r.clients.values()) s.addPlayer({ id: c.id, name: c.name, suit: c.cosmetics.suit, torchColor: c.cosmetics.torch, badge: c.cosmetics.badge });
  r.session = s;
  r.cfgPublic = { locationId: cfg.locationId, difficulty: cfg.difficulty, seed };
  const snap = s.snapshot();
  for (const c of r.clients.values()) c.ws.send({ type: 'start', cfg: r.cfgPublic, you: c.id, snap });
  s.flushEvents();
  let tick = 0;
  const dt = 1 / NW.NET.TICK_HZ;
  r.timer = setInterval(() => {
    s.tick(dt); tick++;
    const ev = s.flushEvents();
    if (ev.length) broadcast(r, { type: 'ev', e: ev });
    if (tick % Math.round(NW.NET.TICK_HZ / NW.NET.FAST_HZ) === 0) broadcast(r, { type: 'fast', s: s.fastSnapshot() });
    if (tick % Math.round(NW.NET.TICK_HZ / NW.NET.SNAP_HZ) === 0) broadcast(r, { type: 'snap', s: s.snapshot() });
    if (s.state.phase === 'ended') { broadcast(r, { type: 'snap', s: s.snapshot() }); endMission(r); }
  }, 1000 / NW.NET.TICK_HZ);
  broadcast(r, roomInfo(r));
}
function endMission(r) {
  clearInterval(r.timer); r.timer = null;
  setTimeout(() => { r.session = null; for (const c of r.clients.values()) c.ready = false; if (rooms.has(r.code)) broadcast(r, roomInfo(r)); }, 1500);
}
function leaveRoom(c) {
  const r = c.room; if (!r) return;
  r.clients.delete(c.id); c.room = null;
  if (r.session) r.session.removePlayer(c.id);
  if (!r.clients.size) { if (r.timer) clearInterval(r.timer); rooms.delete(r.code); return; }
  if (r.hostId === c.id) r.hostId = r.clients.keys().next().value; // host migration
  broadcast(r, roomInfo(r));
}

server.listen(PORT, () => {
  console.log(`Nightwatch Protocol server on http://localhost:${PORT}  (WebSocket: ws://localhost:${PORT}/ws)`);
});
module.exports = { server };
