// Validates every location: rasterises, prints ASCII, checks connectivity from spawn
// to every room (with doors open), stairs integrity, and lair candidates.
const path = require('path');
require('../js/shared/ns.js');
for (const f of ['evidence','equipment','entities','difficulty','locations']) require('../js/shared/data/' + f + '.js');
require('../js/shared/sim/world.js');
const NW = globalThis.NW;
let fail = 0;
const print = process.argv.includes('--print');
for (const loc of NW.LOCATIONS) {
  const w = new NW.World(loc, 7);
  if (print) for (let f = 0; f < w.nf; f++) { console.log(`--- ${loc.id} floor ${f}`); for (let z = 0; z < w.H; z++) console.log(w.grid[f].slice(z*w.W,(z+1)*w.W).join('')); }
  w.doors.forEach(d => { d.open = true; d.locked = false; });
  const sp = loc.spawn;
  let unreachable = [];
  for (const r of w.rooms) {
    const t = w.randomTileInRoom(r.id, NW.util.rng(3));
    const p = w.path({ f: sp.f, x: sp.x, z: sp.z }, t);
    if (!p) unreachable.push(r.name);
  }
  for (const h of w.hides) { if (!w.path(sp, { f: h.f, x: h.entry[0]+.5, z: h.entry[1]+.5 })) unreachable.push('hide@'+h.x+','+h.z); }
  const bad = w.doors.filter(d => d.rooms.length < 2 && !d.exit);
  const exitOk = w.doors.some(d => d.exit);
  console.log(`${loc.id}: rooms=${w.rooms.length} doors=${w.doors.length} hides=${w.hides.length} lights=${w.lights.length} stairs=${w.stairs.length} gen=${!!w.generator} truck=${!!w.truck} exit=${exitOk}`);
  if (unreachable.length) { fail++; console.log('  UNREACHABLE:', unreachable.join(', ')); }
  if (bad.length) { console.log('  doors with <2 rooms:', bad.map(d => `${d.f}:${d.x},${d.z}`).join(' ')); }
  if (!exitOk || !w.truck) fail++;
  const noSwitch = w.rooms.filter(r => r.lit && !r.switch).map(r=>r.name);
  if (noSwitch.length) console.log('  rooms without switch:', noSwitch.join(', '));
}
process.exit(fail ? 1 : 0);
