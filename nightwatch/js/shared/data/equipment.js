/* Equipment definitions (data-driven).
 *  kind:      'tool' (held, toggled), 'placeable' (can be set down and works
 *             while placed), 'consumable' (single/limited use)
 *  evidence:  evidence id this tool is the primary confirmation for
 *  electronic: counts as active electronics for entities that track them
 *  battery:   seconds of active use (null = unlimited)
 *  charges:   uses (film, swabs, pulses...)
 *  price:     research credits for one unit in HQ stock
 *  rank:      investigator rank required to buy
 *  tiers:     upgrade tiers; tier 1 is the base. Upgrades are sidegrades
 *             in convenience (range, capacity), never required to win.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  NW.EQUIPMENT = [
    { id: 'scanner', name: 'Field Spectrum Scanner', short: 'SCANNER', kind: 'tool', evidence: 'emf', electronic: true,
      battery: null, price: 40, rank: 1, starter: 2,
      desc: 'Five-band electromagnetic and frequency meter. Band 5 (PEAK) is rare and meaningful.',
      tiers: [{ label: 'Mk I', range: 3.2 }, { label: 'Mk II — directional needle', range: 4.5, cost: 250, rank: 3 }] },
    { id: 'thermal', name: 'Thermal Imaging Unit', short: 'THERMAL', kind: 'tool', evidence: 'thermal', electronic: true,
      battery: 240, price: 60, rank: 1, starter: 1,
      desc: 'Raise (RMB) to see a false-colour heat image. Reads the ambient temperature of the current room.',
      tiers: [{ label: 'Mk I', precision: 1.5 }, { label: 'Mk II — 0.2 °C precision, longer battery', precision: 0.2, battery: 420, cost: 300, rank: 4 }] },
    { id: 'recorder', name: 'Directional Audio Recorder', short: 'RECORDER', kind: 'tool', evidence: 'voice', electronic: true,
      battery: 300, price: 50, rank: 1, starter: 1,
      desc: 'Turn on, aim, and ask questions (Q). The bearing meter points toward unusual sound sources.',
      tiers: [{ label: 'Mk I', gain: 1 }, { label: 'Mk II — parabolic dish, longer reach', gain: 1.6, cost: 260, rank: 3 }] },
    { id: 'samplekit', name: 'Environmental Sample Kit', short: 'SAMPLE KIT', kind: 'tool', evidence: 'residue', electronic: false,
      battery: null, charges: 5, price: 45, rank: 1, starter: 1,
      desc: 'Built-in UV lamp shows touch points the entity left. Hold E on a point to swab; analysis takes a few seconds.',
      tiers: [{ label: 'Mk I', swabs: 5 }, { label: 'Mk II — 8 swabs, faster analysis', swabs: 8, cost: 220, rank: 3 }] },
    { id: 'lens', name: 'Spectral Lens Camera', short: 'LENS CAM', kind: 'tool', evidence: 'optical', electronic: true,
      battery: null, charges: 8, price: 55, rank: 1, starter: 1,
      desc: 'Raise (RMB) to look through the lens; distortions appear only in the viewfinder. LMB takes a photo.',
      tiers: [{ label: 'Mk I', film: 8 }, { label: 'Mk II — 14 frames', film: 14, cost: 240, rank: 4 }] },
    { id: 'motion', name: 'Motion Sensor Node', short: 'MOTION NODE', kind: 'placeable', evidence: 'motion', electronic: true,
      battery: null, price: 30, rank: 1, starter: 2,
      desc: 'Place (LMB) on the floor. Red flash = movement, violet = phase signature. Trips are logged to the tablet.' },
    { id: 'pressure', name: 'Pressure Monitor', short: 'PRESSURE', kind: 'placeable', evidence: 'pressure', electronic: true,
      battery: null, price: 35, rank: 1, starter: 1,
      desc: 'Barometric logger. Reads in hand or placed. A collapse of 15 hPa or more is significant.' },
    { id: 'slate', name: 'Scribe Slate', short: 'SLATE', kind: 'placeable', evidence: 'inscription', electronic: false,
      battery: null, price: 15, rank: 1, starter: 1,
      desc: 'A chalk slate and stylus. Place it in an active room and check it later.' },
    { id: 'radio', name: 'Personal Radio', short: 'RADIO', kind: 'tool', evidence: 'bleed', electronic: true,
      battery: null, price: 20, rank: 1, starter: 1, perPlayer: true,
      desc: 'Team comms (T to transmit). Hold LMB to scan empty channels for carrier bleed. Activity causes interference.' },
    { id: 'beacon', name: 'Signal Beacon', short: 'BEACON', kind: 'placeable', evidence: null, electronic: true,
      battery: null, charges: 2, price: 70, rank: 2, starter: 0,
      desc: 'Place and activate to emit a provoking pulse for 30 s. Draws the entity, forces it to show itself and strips false traces. Greatly raises danger.' },
    { id: 'elight', name: 'Emergency Light', short: 'E-LIGHT', kind: 'placeable', evidence: null, electronic: true,
      battery: 150, price: 45, rank: 1, starter: 1,
      desc: 'Battery flood lamp. Counts as a lit area: stops darkness strain and repels darkness-bound entities. Limited charge.' },
    { id: 'spike', name: 'Grounding Spike', short: 'SPIKE', kind: 'placeable', evidence: null, electronic: false,
      battery: null, charges: 1, price: 50, rank: 2, starter: 1,
      desc: 'Iron spike driven into the floor. If the entity tries to begin a pursuit within 4 m, the spike absorbs it and is spent.' },
    { id: 'flare', name: 'Static Flare', short: 'FLARE', kind: 'consumable', evidence: null, electronic: false,
      battery: null, charges: 1, price: 40, rank: 3, starter: 0,
      desc: 'Strike and throw (LMB) during a pursuit. A magnesium-static burst stuns entities within 5 m for a few seconds.' },
    { id: 'tablets', name: 'Stabiliser Tablets', short: 'TABLETS', kind: 'consumable', evidence: null, electronic: false,
      battery: null, charges: 1, price: 25, rank: 1, starter: 2,
      desc: 'Restores 35 Field Composure. Takes a moment to swallow.' }
  ];
  NW.EQUIPMENT_BY_ID = {};
  NW.EQUIPMENT.forEach((e) => (NW.EQUIPMENT_BY_ID[e.id] = e));

  /** Cosmetics are purely visual and cost credits only — never sold for money. */
  NW.COSMETICS = {
    suit: [
      { id: 'slate', name: 'Slate Field Suit', color: '#4a5866', price: 0 },
      { id: 'olive', name: 'Olive Drab', color: '#5b6342', price: 120 },
      { id: 'rust', name: 'Rust Overalls', color: '#8a4b2c', price: 160 },
      { id: 'navy', name: 'Harbour Navy', color: '#24365c', price: 160 },
      { id: 'bone', name: 'Bone Hazmat', color: '#cfc7b0', price: 300, rank: 4 },
      { id: 'crimson', name: 'Crimson Lead', color: '#7a1f2a', price: 450, rank: 6 }
    ],
    torch: [
      { id: 'warm', name: 'Warm Halogen', color: '#ffe6bf', price: 0 },
      { id: 'cool', name: 'Cool LED', color: '#dfeaff', price: 90 },
      { id: 'amber', name: 'Amber Filter', color: '#ffc27a', price: 140, rank: 3 }
    ],
    badge: [
      { id: 'none', name: 'No Patch', price: 0 },
      { id: 'eye', name: 'Watcher Patch', price: 80 },
      { id: 'moon', name: 'Night Shift Patch', price: 80 },
      { id: 'key', name: 'Archivist Patch', price: 200, rank: 5 }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
