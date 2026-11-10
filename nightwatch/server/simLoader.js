/* Loads the browser-shared simulation files into Node.
 * The order here must match the <script> order in index.html for js/shared.
 */
'use strict';
const path = require('path');
const SHARED = [
  'ns.js',
  'data/evidence.js', 'data/equipment.js', 'data/entities.js', 'data/difficulty.js', 'data/locations.js',
  'sim/world.js', 'sim/entityAI.js', 'sim/director.js', 'sim/session.js',
  'net/protocol.js'
];
function loadSim() {
  for (const f of SHARED) require(path.resolve(__dirname, '../js/shared', f));
  return globalThis.NW;
}
module.exports = { loadSim, SHARED };
