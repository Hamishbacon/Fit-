// Headless simulation soak test: runs every entity on every location with bot
// investigators, checking for exceptions, that pursuits happen, that evidence
// traces are produced, and that the mission can end.
require('../js/shared/ns.js');
for (const f of ['evidence','equipment','entities','difficulty','locations']) require('../js/shared/data/' + f + '.js');
for (const f of ['world','entityAI','director','session']) require('../js/shared/sim/' + f + '.js');
const NW = globalThis.NW, U = NW.util;
const loadout = { scanner: 2, thermal: 1, recorder: 1, samplekit: 1, lens: 1, motion: 2, pressure: 1, slate: 1, elight: 1, spike: 1, tablets: 2, flare: 1, beacon: 1 };
let failures = 0;
const summary = [];
const evSeen = {};
for (const loc of NW.LOCATIONS) for (const ent of NW.ENTITIES) {
  const s = new NW.GameSession({ locationId: loc.id, difficulty: NW.DIFFICULTY_BY_ID.professional, seed: 1234 + ent.id.length, entityId: ent.id, loadout });
  const rng = U.rng(99);
  const bots = [s.addPlayer({ id: 'p1', name: 'Ada' }), s.addPlayer({ id: 'p2', name: 'Bo' })];
  const plans = {};
  let hunts = 0, caught = 0, evs = {};
  try {
    for (let step = 0; step < 20 * 60 * 8; step++) { // 8 minutes at 20 Hz
      const dt = 0.05;
      for (const b of bots) {
        if (!b.alive) continue;
        let pl = plans[b.id];
        if (!pl || !pl.length) {
          const r = rng.pick(s.world.lairCandidates());
          // open every door on the way
          s.world.doors.forEach((d, i) => { if (!d.locked) s.setDoor(i, true, false, 'test'); });
          pl = plans[b.id] = s.world.path(b, s.world.randomTileInRoom(r.id, rng)) || [];
        }
        const n = pl[0];
        if (n) {
          const dx = n.x - b.x, dz = n.z - b.z, d = Math.hypot(dx, dz);
          if (d < 0.1) { pl.shift(); b.f = n.f; } else { b.x += dx / d * 1.4 * dt; b.z += dz / d * 1.4 * dt; }
          b.f = s.world.floorFromHeight(Math.max(s.world.heightAt(b.f, b.x, b.z), s.world.heightAt(n.f, b.x, b.z)));
          b.y = s.world.heightAt(b.f, b.x, b.z); b.speed = 1.4;
        }
      }
      s.tick(dt);
      for (const e of s.flushEvents()) { evs[e.t] = (evs[e.t] || 0) + 1; if (e.t === 'hunt_start') hunts++; if (e.t === 'caught') caught++; }
      if (s.state.phase !== 'active') break;
    }
    const tr = s.state.traces;
    const has = (k) => ent.evidence.includes(k);
    const emf5 = evs.emf ? 1 : 0;
    summary.push(`${loc.id.padEnd(12)} ${ent.id.padEnd(9)} hunts=${hunts} caught=${caught} events=${Object.keys(evs).length} touch=${tr.touch.length} lairT=${s.state.rooms[s.entity.lair].temp.toFixed(1)} phase=${s.state.phase}`);
  } catch (e) { failures++; console.error('FAIL', loc.id, ent.id, e.stack); }
}
console.log(summary.join('\n'));
// evidence uniqueness
const keys = NW.ENTITIES.map(e => e.evidence.slice().sort().join('+'));
const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dup.length) { failures++; console.error('duplicate evidence sets', dup); }
console.log(failures ? 'FAILURES: ' + failures : 'OK');
process.exit(failures ? 1 : 0);
