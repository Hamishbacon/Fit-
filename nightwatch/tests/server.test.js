// Integration test: starts the real co-op server and drives two headless
// WebSocket clients through a lobby, a mission and the shared ending.
// Requires Node 22+ (global WebSocket).
const { spawn } = require('child_process');
const path = require('path');
if (typeof WebSocket === 'undefined') { console.log('SKIP: Node has no global WebSocket (need Node 22+)'); process.exit(0); }
const PORT = 8800 + Math.floor(Math.random() * 100);
const srv = spawn(process.execPath, [path.join(__dirname, '../server/server.js'), '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
const fail = (m) => { console.error('FAIL:', m); srv.kill(); process.exit(1); };
setTimeout(() => fail('timeout'), 30000);

function client(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    const c = { ws, name, msgs: [], id: null, wait(type, pred) { return new Promise((res) => { const chk = () => { const i = c.msgs.findIndex((m) => m.type === type && (!pred || pred(m))); if (i >= 0) { res(c.msgs.splice(i, 1)[0]); return true; } return false; }; if (!chk()) c._w.push(chk); }); }, _w: [], send(o) { ws.send(JSON.stringify(o)); } };
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'welcome') { c.id = m.id; c.send({ type: 'hello', v: 3, name, cosmetics: {} }); resolve(c); return; } c.msgs.push(m); c._w = c._w.filter((f) => !f()); };
    ws.onerror = reject;
  });
}
(async () => {
  await new Promise((r) => srv.stdout.once('data', r));
  const A = await client('Alice'), B = await client('Bram');
  A.send({ type: 'create' });
  const room = await A.wait('room');
  if (room.hostId !== A.id || !/^[A-Z]{4}$/.test(room.code)) fail('lobby not created');
  B.send({ type: 'join', code: room.code });
  await B.wait('room', (m) => m.players.length === 2);
  A.send({ type: 'lobby', settings: { location: 'clinic', difficulty: 'training', loadout: { scanner: 1, thermal: 1 }, tiers: {} } });
  B.send({ type: 'ready', ready: true });
  await A.wait('room', (m) => m.players.every((p) => p.ready || p.id === m.hostId));
  A.send({ type: 'start' });
  const sa = await A.wait('start'), sb = await B.wait('start');
  if (sa.cfg.locationId !== 'clinic' || Object.keys(sb.snap.players).length !== 2) fail('mission did not start for both');
  // events and snapshots flow; a journal mark by B reaches A
  B.send({ type: 'act', a: { k: 'journal', ev: 'emf', val: 1 } });
  await A.wait('snap', (m) => m.s.journal.ev.emf === 1);
  await A.wait('fast');
  // voice signalling relay
  A.send({ type: 'rtc', to: B.id, data: { hello: 1 } });
  const rtc = await B.wait('rtc');
  if (rtc.from !== A.id) fail('rtc relay');
  // take equipment at the van, then end the investigation together
  const truck = { clinic: { x: 9.5, z: 27.5 } }.clinic;
  for (const c of [A, B]) c.send({ type: 'act', a: { k: 'pose', x: truck.x, y: 3.4, z: truck.z - 2.6, f: 1, yaw: 0, pitch: 0, speed: 0, slot: 0 } });
  A.send({ type: 'act', a: { k: 'take', type: 'scanner' } });
  await A.wait('ev', (m) => m.e.some((e) => e.t === 'inv' && e.pid === A.id && e.inv[0]));
  A.send({ type: 'act', a: { k: 'journal', guess: 'murmur' } });
  A.send({ type: 'act', a: { k: 'end' } });
  const end = await B.wait('ev', (m) => m.e.some((e) => e.t === 'mission_end'));
  const res = end.e.find((e) => e.t === 'mission_end').result;
  if (!res.perPlayer[A.id] || !res.perPlayer[B.id] || !res.perPlayer[A.id].alive) fail('bad result');
  // room returns to the lobby
  await A.wait('room', (m) => !m.inGame);
  console.log('OK — lobby, start, replication, rtc relay, locker, shared ending (' + res.entityName + ')');
  srv.kill(); process.exit(0);
})().catch((e) => fail(e.stack || e));
