// Site relic and haunted electronics.
require('../js/shared/ns.js');
for (const f of ['evidence','equipment','entities','difficulty','locations']) require('../js/shared/data/' + f + '.js');
for (const f of ['world','entityAI','director','session']) require('../js/shared/sim/' + f + '.js');
const NW = globalThis.NW;
const fail = (m) => { console.error('FAIL:', m); process.exit(1); };
for (const loc of NW.LOCATIONS) {
  const s = new NW.GameSession({ locationId: loc.id, difficulty: NW.DIFFICULTY_BY_ID.standard, seed: 42, entityId: 'murmur', loadout: {} });
  const p = s.addPlayer({ id: 'p1', name: 'T' });
  const go = (o) => { p.f = o.f; p.x = o.x; p.z = o.z; p.y = o.f * 3.4; };
  if (!s.world.devices.length || !s.world.relic) fail(loc.id + ': missing devices or relic');
  // device toggles by player and by entity
  const dv = s.world.devices[0]; go(dv);
  s.applyAction('p1', { k: 'device', id: dv.id });
  if (!s.state.devices[dv.id].on) fail('player could not switch a device on');
  s.applyAction('p1', { k: 'device', id: dv.id });
  s.entity.pos = { f: dv.f, x: dv.x, z: dv.z };
  s.director.perform('device');
  if (!s.state.devices.some((d) => d.on)) fail('entity could not switch a device on');
  // relic during setup: never hunts, rules out an evidence the entity lacks
  go(s.world.relic);
  s.applyAction('p1', { k: 'relic' });
  const ruled = Object.keys(s.state.journal.ev).filter((k) => s.state.journal.ev[k] === 2);
  if (ruled.length !== 1 || s.entity.def.evidence.indexOf(ruled[0]) >= 0) fail('relic ruled out a wrong evidence: ' + ruled);
  if (s.state.relic.uses !== 2 || s.state.hunting) fail('relic uses / hunt state wrong');
  // after setup the relic can provoke a pursuit
  s.state.t = 9999; let hunted = false;
  for (let i = 0; i < 2; i++) { s.entity.huntCooldown = 0; s.applyAction('p1', { k: 'relic' }); if (s.state.hunting) { hunted = true; s.entity.endHunt(); } }
  if (s.state.relic.uses !== 0) fail('relic should be spent');
  console.log(loc.id.padEnd(12), 'devices', s.world.devices.length, 'relic', JSON.stringify(s.world.relic.name), 'ruled', ruled[0], hunted ? '(provoked a pursuit)' : '');
}
console.log('OK — relic and electronics');
