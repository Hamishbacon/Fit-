// Evidence integrity: on Training/Standard (no false readings) an entity must
// only ever produce its own three evidence types, and should produce all of
// them within a reasonable investigation when the team works its lair.
require('../js/shared/ns.js');
for (const f of ['evidence','equipment','entities','difficulty','locations']) require('../js/shared/data/' + f + '.js');
for (const f of ['world','entityAI','director','session']) require('../js/shared/sim/' + f + '.js');
const NW = globalThis.NW, U = NW.util;
let failures = 0;
const rows = [];
for (const ent of NW.ENTITIES) {
  const found = {};
  for (const loc of ['observatory', 'clinic']) {
    const diff = Object.assign({}, NW.DIFFICULTY_BY_ID.training, { setup: 99999 }); // no hunts: we are measuring evidence
    const s = new NW.GameSession({ locationId: loc, difficulty: diff, seed: 77 + ent.id.length, entityId: ent.id,
      loadout: { recorder: 1, motion: 2, pressure: 1, slate: 1, samplekit: 1 } });
    const p = s.addPlayer({ id: 'p1', name: 'Tester' });
    const lair = () => s.world.rooms[s.entity.lair];
    const goLair = () => { const t = s.world.randomTileInRoom(lair().id, U.rng(1)); p.f = t.f; p.x = t.x; p.z = t.z; p.y = t.f * 3.4; };
    const tw = s.world.truck; p.x = tw.x; p.z = tw.z - 2.8;
    for (const t of ['recorder', 'motion', 'slate']) s.applyAction('p1', { k: 'take', type: t });
    goLair();
    const place = (iid) => s.applyAction('p1', { k: 'place', item: iid, pos: { f: p.f, x: p.x + 0.3, y: p.f * 3.4, z: p.z + 0.2 } });
    place(p.inv[1]); place(p.inv[2]);
    // keep the radio scanning in hand; recorder lives in slot 0
    const radio = p.inv[3];
    let lastLair = s.entity.lair;
    for (let step = 0; step < 20 * 60 * 12; step++) {
      if (s.entity.lair !== lastLair) { lastLair = s.entity.lair; goLair(); }
      if (step % 200 === 0) { // every 10 s: ask a question, then scan the radio
        p.slot = 0; p.held = p.inv[0]; const rec = s.state.items[p.inv[0]]; if (!rec.on) s.applyAction('p1', { k: 'toggle', item: rec.id });
        s.applyAction('p1', { k: 'ask', item: rec.id, q: 'where', text: 'Where are you?' });
      }
      if (step % 200 === 100) { p.slot = 3; p.held = radio; if (!s.state.items[radio].on) s.applyAction('p1', { k: 'toggle', item: radio }); }
      p.composure = 100;
      s.tick(0.05);
      for (const e of s.flushEvents()) {
        if (e.t === 'voice') found.voice = 1;
        if (e.t === 'bleed') found.bleed = 1;
        if (e.t === 'motion' && e.phase) found.motion = 1;
        if (e.t === 'emf' && e.level === 5) found.emf = 1;
        if (e.t === 'slate') found.inscription = 1;
      }
      const st = s.state;
      if (st.traces.touch.some((t) => t.residue && !t.fake)) found.residue = 1;
      if (st.traces.distort.some((t) => !t.fake)) found.optical = 1;
      if (st.rooms.some((r) => r.temp < 0)) found.thermal = 1;
      if (st.rooms.some((r) => r.hpaBase - r.hpa >= 15)) found.pressure = 1;
    }
  }
  const got = Object.keys(found);
  const extra = got.filter((x) => ent.evidence.indexOf(x) < 0);
  const missing = ent.evidence.filter((x) => got.indexOf(x) < 0);
  const deceiver = ent.traits.indexOf('deceiver') >= 0; // the Hollow plants one decoy evidence type per run by design
  if (extra.length && !(deceiver && extra.length <= 2)) failures++;
  rows.push(`${ent.id.padEnd(9)} evidence=${ent.evidence.join(',').padEnd(26)} found=${got.sort().join(',').padEnd(30)} ${extra.length ? (deceiver ? 'decoys(by design):' : 'FALSE:') + extra.join(',') : ''} ${missing.length ? 'missing:' + missing.join(',') : 'complete'}`);
}
console.log(rows.join('\n'));
console.log(failures ? 'FAILURES: ' + failures : 'OK — no entity produced evidence it does not have');
process.exit(failures ? 1 : 0);
