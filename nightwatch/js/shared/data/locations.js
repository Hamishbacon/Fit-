/* Investigation locations, written in a tiny layout DSL that sim/world.js
 * rasterises into a tile grid (1 tile = 1 metre, one grid per floor).
 *
 * Ops (per floor):
 *   ['R', ch, x, z, w, h]     fill a room with floor char `ch` and auto-wall its border
 *   ['D', x, z]               interior door           ['X', x, z]  exit / entry door
 *   ['L', x, z]               sealed door (opens when site power is restored)
 *   ['P', ch, x, z, w?, h?]   prop/feature tiles      ['V', x, z, w, h] carve void (solid, unrendered)
 *   ['W', x, z, w, h]         windows on wall tiles inside the rect
 *   ['S', x, z, w, len, dir]  stairs ascending to the floor above, dir n/s/e/w
 *
 * Prop chars: T table, C cabinet/shelving, H hiding spot (locker/wardrobe), B bed,
 *   O large machinery, G generator / breaker, K counter, M washer/dryer,
 *   Y crates/baggage, Q pillar, N bench, F field unit (truck), ~ deep water
 *
 * Room flags: outdoor (no ceiling), flooded (shallow water), wet, h (ceiling height),
 *   temp (base °C), lit (has ceiling fixtures; default true for indoor rooms)
 */
(function (root) {
  'use strict';
  const NW = root.NW;

  NW.LOCATIONS = [
    /* ---------------------------------------------------------------- */
    {
      id: 'observatory', name: 'Brackenridge Observatory', size: 'Medium', rank: 1, W: 44, H: 32,
      region: 'Brackenridge Range, 1,900 m', ambience: 'mountain', outsideTemp: 2, power: false,
      blurb: 'A mountain observatory closed in 1987 after a research team stopped responding. Wind, a cracked dome and tunnels cut into the rock.',
      story: 'The Halvorsen group were running "deep-field listening" experiments in a sealed basement lab. The last log mentions a signal that answered back.',
      rooms: {
        y: { name: 'Access Road', kind: 'outdoor', outdoor: true },
        q: { name: 'Observation Platform', kind: 'deck', outdoor: true },
        m: { name: 'Telescope Dome', kind: 'dome', h: 7.5, temp: 6 },
        o: { name: 'Research Office', kind: 'office' },
        r: { name: 'Plate Records', kind: 'records' },
        d: { name: 'Director\'s Office', kind: 'office' },
        e: { name: 'Control Room', kind: 'control' },
        c: { name: 'Main Corridor', kind: 'corridor', h: 2.8 },
        k: { name: 'Staff Kitchen', kind: 'kitchen' },
        s: { name: 'Stairwell', kind: 'stair', h: 3.2, lit: false },
        a: { name: 'Entrance Foyer', kind: 'lobby', h: 3.6 },
        g: { name: 'Generator Room', kind: 'generator' },
        w: { name: 'Washroom', kind: 'bath' },
        t: { name: 'Maintenance Tunnels', kind: 'tunnel', h: 2.6, temp: 9 },
        l: { name: 'Sealed Laboratory', kind: 'lab', h: 3.2, temp: 8 },
        z: { name: 'Clean Room', kind: 'lab', h: 2.8, temp: 7 },
        p: { name: 'Pump Room', kind: 'utility', wet: true, temp: 8 },
        v: { name: 'Equipment Storage', kind: 'storage', temp: 9 },
        b: { name: 'Boiler Room', kind: 'utility', h: 3.2, temp: 11 }
      },
      floors: [
        [ // floor 0 — tunnels cut into the rock
          ['R', 't', 3, 25, 38, 2], ['R', 't', 3, 6, 2, 19], ['R', 't', 39, 6, 2, 19],
          ['R', 'l', 6, 5, 15, 9], ['L', 5, 9],
          ['R', 'z', 6, 15, 7, 6], ['D', 9, 14],
          ['R', 'p', 29, 5, 9, 8], ['D', 38, 8],
          ['R', 'v', 22, 17, 12, 7], ['D', 27, 24],
          ['R', 'b', 35, 15, 3, 9], ['D', 38, 18],
          ['P', 'O', 15, 8, 3, 2], ['P', 'T', 9, 7, 3, 1], ['P', 'T', 9, 11, 3, 1], ['P', 'H', 20, 13], ['P', 'H', 6, 20],
          ['P', 'O', 31, 8, 3, 2], ['P', 'H', 37, 5], ['P', 'Y', 23, 18, 2, 2], ['P', 'Y', 30, 21, 2, 2], ['P', 'H', 33, 23],
          ['P', 'O', 35, 17, 2, 2],
          ['S', 14, 20, 2, 5, 'n']
        ],
        [ // floor 1 — ground level
          ['R', 'y', 2, 27, 40, 5], ['R', 'q', 5, 1, 34, 3],
          ['R', 'm', 12, 5, 20, 10], ['D', 15, 4], ['D', 28, 4], ['P', 'O', 20, 8, 4, 4],
          ['R', 'o', 5, 5, 6, 6], ['D', 11, 7], ['D', 7, 11],
          ['R', 'r', 5, 12, 6, 3], ['D', 8, 15],
          ['R', 'd', 33, 5, 6, 5], ['D', 32, 7],
          ['R', 'e', 33, 11, 6, 4], ['D', 32, 12], ['D', 36, 15],
          ['R', 'c', 5, 16, 34, 2], ['D', 21, 15], ['D', 22, 15],
          ['R', 'k', 5, 19, 7, 7], ['D', 8, 18],
          ['R', 's', 14, 19, 2, 1], ['D', 14, 18],
          ['R', 'a', 18, 19, 8, 7], ['D', 21, 18], ['D', 22, 18], ['X', 21, 26],
          ['R', 'g', 28, 19, 6, 7], ['D', 30, 18], ['P', 'G', 31, 22, 2, 2],
          ['R', 'w', 36, 19, 3, 5], ['D', 37, 18],
          ['W', 5, 4, 34, 1], ['W', 19, 26, 2, 1], ['W', 23, 26, 2, 1], ['W', 4, 6, 1, 4], ['W', 39, 6, 1, 3],
          ['P', 'H', 5, 5], ['P', 'H', 38, 5], ['P', 'H', 38, 14], ['P', 'H', 5, 25], ['P', 'H', 38, 23], ['P', 'H', 5, 17],
          ['P', 'K', 33, 11, 3, 1], ['P', 'F', 6, 28, 3, 3]
        ]
      ],
      spawn: { x: 10.5, z: 29.5, f: 1 },
      notes: [
        { room: 'd', title: 'Director\'s memo, 14 Oct 1987', text: 'Halvorsen insists the basement apparatus stays powered overnight. I have told him the generator cannot sustain it. He says it "doesn\'t need much any more".' },
        { room: 'o', title: 'Observation log — page 212', text: 'Plate 4471: an occlusion moving against the star field. Not cloud. It was inside the dome.' },
        { room: 'l', title: 'Lab notebook (water damaged)', text: '...the listening array returns our own voices a fraction late, as if something is practising...' },
        { room: 'k', title: 'Note pinned to fridge', text: 'WHOEVER keeps locking the stairwell — stop. Some of us need the tunnels. — R.' },
        { room: 'b', title: 'Maintenance tag', text: 'Boiler isolated. Do not relight. Tunnels stay cold by order of Dr. H.' }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'apartments', name: 'Hollowmere Apartments', size: 'Large', rank: 2, W: 40, H: 27,
      region: 'Hollowmere, east side', ambience: 'urban', outsideTemp: 9, power: true,
      blurb: 'A 1970s block condemned after a string of complaints nobody could explain. Wallpaper peeling, long corridors, a basement that floods.',
      story: 'Tenants in 2B reported a neighbour knocking through the walls for months. 2B had no neighbours — it is the corner unit.',
      rooms: {
        y: { name: 'Street', kind: 'outdoor', outdoor: true },
        a: { name: 'Lobby', kind: 'lobby', h: 3.2 },
        c: { name: 'Ground Corridor', kind: 'corridor', h: 2.7 },
        b: { name: 'Unit 1A — Living', kind: 'living' },
        e: { name: 'Unit 1A — Bedroom', kind: 'bedroom' },
        l: { name: 'Laundry Room', kind: 'laundry', wet: true },
        m: { name: 'Manager\'s Office', kind: 'office' },
        d: { name: 'Unit 1B — Living', kind: 'living' },
        f: { name: 'Unit 1B — Bathroom', kind: 'bath', wet: true },
        g: { name: 'Unit 1C', kind: 'living' },
        s: { name: 'Stairwell', kind: 'stair', h: 3.0, lit: false },
        n: { name: 'Upper Corridor', kind: 'corridor', h: 2.7 },
        h: { name: 'Unit 2A — Living', kind: 'living' },
        i: { name: 'Unit 2A — Kitchen', kind: 'kitchen' },
        j: { name: 'Unit 2B — Living', kind: 'living' },
        k: { name: 'Unit 2B — Bedroom', kind: 'bedroom' },
        o: { name: 'Unit 2C (gutted)', kind: 'storage' },
        p: { name: 'Unit 2D — Nursery', kind: 'bedroom' },
        r: { name: 'Rooftop', kind: 'roof', outdoor: true },
        t: { name: 'Roof Plant Room', kind: 'utility', h: 2.6 },
        u: { name: 'Basement Hall', kind: 'tunnel', h: 2.5, temp: 10, wet: true },
        v: { name: 'Storage Cages', kind: 'storage', temp: 10 },
        w: { name: 'Boiler Room', kind: 'generator', temp: 12 },
        x: { name: 'Flooded Sump', kind: 'utility', flooded: true, temp: 8 }
      },
      floors: [
        [ // basement
          ['R', 'u', 4, 3, 29, 2],
          ['R', 'v', 4, 6, 14, 8], ['D', 10, 5],
          ['R', 'w', 20, 6, 8, 6], ['D', 24, 5], ['P', 'G', 25, 9, 2, 2],
          ['R', 'x', 4, 15, 14, 5], ['D', 11, 14],
          ['P', 'C', 4, 8, 1, 5], ['P', 'C', 8, 8, 1, 5], ['P', 'C', 12, 8, 1, 5], ['P', 'H', 17, 13], ['P', 'H', 27, 11],
          ['S', 31, 4, 1, 5, 's']
        ],
        [ // ground
          ['R', 'y', 2, 21, 36, 6],
          ['R', 'a', 16, 14, 8, 6], ['X', 19, 20], ['D', 19, 13], ['D', 20, 13],
          ['R', 'c', 3, 11, 34, 2],
          ['R', 'b', 3, 14, 6, 6], ['D', 6, 13], ['R', 'e', 10, 14, 4, 6], ['D', 9, 16],
          ['R', 'l', 26, 14, 6, 6], ['D', 28, 13], ['P', 'M', 31, 14, 1, 4],
          ['R', 'm', 33, 14, 4, 4], ['D', 34, 13],
          ['R', 'd', 3, 3, 8, 7], ['D', 6, 10], ['R', 'f', 12, 3, 3, 4], ['D', 11, 4],
          ['R', 'g', 16, 3, 9, 7], ['D', 20, 10],
          ['R', 's', 27, 3, 5, 7], ['D', 29, 10], ['P', ':', 28, 4, 1, 5], ['P', ':', 30, 4, 1, 5],
          ['W', 2, 3, 1, 17], ['W', 16, 20, 3, 1], ['W', 21, 20, 3, 1], ['W', 4, 2, 6, 1], ['W', 17, 2, 7, 1], ['W', 3, 20, 5, 1], ['W', 26, 20, 5, 1],
          ['P', 'H', 13, 19], ['P', 'H', 3, 3], ['P', 'H', 24, 3], ['P', 'H', 36, 17],
          ['P', 'F', 5, 22, 3, 3],
          ['S', 27, 4, 1, 5, 'n']
        ],
        [ // upper floor
          ['R', 'n', 3, 11, 34, 2],
          ['R', 'h', 3, 14, 8, 6], ['D', 6, 13], ['R', 'i', 12, 14, 4, 6], ['D', 11, 17],
          ['R', 'j', 17, 14, 10, 6], ['D', 21, 13], ['R', 'k', 28, 14, 9, 6], ['D', 27, 17],
          ['R', 'o', 3, 3, 12, 7], ['D', 8, 10],
          ['R', 'p', 16, 3, 9, 7], ['D', 20, 10],
          ['R', 's', 27, 3, 5, 7], ['D', 29, 10], ['P', ':', 28, 4, 1, 5], ['P', ':', 30, 4, 1, 5],
          ['W', 2, 3, 1, 17], ['W', 4, 20, 6, 1], ['W', 18, 20, 8, 1], ['W', 29, 20, 7, 1], ['W', 4, 2, 10, 1], ['W', 17, 2, 7, 1], ['W', 37, 14, 1, 6],
          ['P', 'H', 3, 19], ['P', 'H', 36, 19], ['P', 'H', 24, 3], ['P', 'H', 14, 9],
          ['S', 31, 4, 1, 5, 'n']
        ],
        [ // roof
          ['R', 'r', 3, 1, 34, 20],
          ['R', 't', 14, 4, 6, 5], ['D', 16, 9], ['P', 'O', 15, 5, 2, 2], ['P', 'H', 19, 8],
          ['P', 'O', 8, 6, 3, 2], ['P', 'O', 16, 14, 2, 2], ['P', 'Y', 6, 16, 2, 1]
        ]
      ],
      spawn: { x: 9.5, z: 23.5, f: 1 },
      notes: [
        { room: 'm', title: 'Complaint log, 1979', text: 'Unit 2B: knocking from the west wall, three then two then one. Explained 2B has no west neighbour. Tenant became upset.' },
        { room: 'p', title: 'Child\'s drawing', text: 'A tall grey man counting the doors. Underneath, in crayon: "he says we are not all here yet."' },
        { room: 'l', title: 'Laundry notice', text: 'Please stop leaving the dryers running at night. NOBODY IS LEAVING THE DRYERS RUNNING. — Mgmt' },
        { room: 'w', title: 'Plumber\'s invoice', text: 'Sump pump replaced (third time). Water rising from below the slab. Source unknown.' },
        { room: 'k', title: 'Diary page', text: 'I put the wardrobe against the wall. The knocking moved to the inside of the wardrobe.' }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'clinic', name: 'Saint Vesper Clinic', size: 'Medium', rank: 3, W: 46, H: 30,
      region: 'Vesper Hollow, rural', ambience: 'rural', outsideTemp: 6, power: false,
      blurb: 'A rural clinic closed after a fire in its operating theatre. The emergency generator still sits ready in the east wing.',
      story: 'Patient files in the archive end abruptly in 1964. The last ward round lists one more patient than the ward had beds.',
      rooms: {
        y: { name: 'Gravel Drive', kind: 'outdoor', outdoor: true },
        a: { name: 'Reception', kind: 'lobby', h: 3.4 },
        c: { name: 'Clinic Corridor', kind: 'corridor', h: 3.0 },
        e: { name: 'Examination Room 1', kind: 'exam' },
        f: { name: 'Examination Room 2', kind: 'exam' },
        p: { name: 'Pharmacy Storage', kind: 'pharmacy' },
        g: { name: 'Emergency Generator', kind: 'generator' },
        w: { name: 'Ward A', kind: 'ward', h: 3.4 },
        o: { name: 'Operating Theatre (fire damaged)', kind: 'theatre', h: 3.4 },
        u: { name: 'Scrub Room', kind: 'bath' },
        v: { name: 'Ward B', kind: 'ward', h: 3.4 },
        s: { name: 'Archive Stairs', kind: 'stair', lit: false },
        h: { name: 'Archive Landing', kind: 'stair', h: 2.6, temp: 9 },
        r: { name: 'Underground Archives', kind: 'archive', h: 2.8, temp: 9 },
        m: { name: 'Cold Store', kind: 'morgue', h: 2.6, temp: 4 },
        q: { name: 'Records Office', kind: 'office', h: 2.6, temp: 10 },
        k: { name: 'Service Tunnel', kind: 'tunnel', h: 2.4, temp: 9, wet: true },
        b: { name: 'Old Boiler House', kind: 'utility', h: 3.0, temp: 10 }
      },
      floors: [
        [ // archives level
          ['R', 'h', 36, 2, 6, 2],
          ['R', 'r', 8, 2, 27, 10], ['D', 35, 3],
          ['R', 'm', 8, 13, 10, 7], ['D', 12, 12],
          ['R', 'q', 20, 13, 8, 5], ['D', 24, 12],
          ['R', 'k', 36, 5, 2, 14], ['D', 36, 4],
          ['R', 'b', 29, 20, 8, 4], ['D', 36, 19],
          ['P', 'C', 11, 4, 1, 6], ['P', 'C', 15, 4, 1, 6], ['P', 'C', 19, 4, 1, 6], ['P', 'C', 23, 4, 1, 6], ['P', 'C', 27, 4, 1, 6],
          ['P', 'H', 8, 2], ['P', 'H', 17, 19], ['P', 'H', 27, 17], ['P', 'O', 31, 21, 2, 2], ['P', 'B', 10, 15, 2, 1], ['P', 'B', 10, 17, 2, 1],
          ['S', 40, 4, 1, 6, 's']
        ],
        [ // ground
          ['R', 'y', 2, 25, 42, 5],
          ['R', 'a', 19, 18, 8, 6], ['X', 22, 24], ['D', 22, 17], ['D', 23, 17],
          ['R', 'c', 4, 15, 38, 2],
          ['R', 'e', 4, 18, 6, 6], ['D', 7, 17], ['R', 'f', 11, 18, 6, 6], ['D', 13, 17],
          ['R', 'p', 29, 18, 6, 6], ['D', 31, 17], ['R', 'g', 37, 18, 5, 6], ['D', 39, 17], ['P', 'G', 39, 21, 2, 2],
          ['R', 'w', 4, 3, 12, 11], ['D', 9, 14], ['D', 10, 14],
          ['R', 'o', 18, 3, 10, 7], ['D', 22, 10], ['R', 'u', 18, 11, 10, 3], ['D', 22, 14],
          ['R', 'v', 30, 3, 7, 11], ['D', 33, 14],
          ['R', 's', 40, 3, 1, 11], ['D', 40, 14],
          ['P', 'B', 5, 4, 2, 1], ['P', 'B', 5, 7, 2, 1], ['P', 'B', 5, 10, 2, 1], ['P', 'B', 13, 4, 2, 1], ['P', 'B', 13, 7, 2, 1], ['P', 'B', 13, 10, 2, 1],
          ['P', 'B', 31, 4, 2, 1], ['P', 'B', 31, 8, 2, 1], ['P', 'B', 34, 12, 2, 1], ['P', 'T', 22, 6, 2, 1],
          ['P', 'C', 29, 22, 1, 2], ['P', 'C', 34, 19, 1, 3], ['P', 'K', 20, 19, 3, 1],
          ['P', 'H', 15, 13], ['P', 'H', 36, 3], ['P', 'H', 4, 23], ['P', 'H', 16, 23], ['P', 'H', 27, 3],
          ['W', 3, 4, 1, 9], ['W', 5, 2, 10, 1], ['W', 31, 2, 5, 1], ['W', 37, 5, 1, 7], ['W', 20, 24, 2, 1], ['W', 24, 24, 2, 1], ['W', 5, 24, 4, 1],
          ['P', 'F', 8, 26, 3, 3]
        ]
      ],
      spawn: { x: 12.5, z: 27.5, f: 1 },
      notes: [
        { room: 'w', title: 'Night nurse\'s round sheet', text: 'Beds 1–6 occupied. Bed 7 occupied. Ward A has six beds. Raised with Matron.' },
        { room: 'o', title: 'Incident report (partial)', text: 'Fire began at the anaesthetic cart. Staff state the oxygen was shut off. The valve was found open, from the inside.' },
        { room: 'p', title: 'Pharmacy ledger', text: 'Sedatives missing again. Cabinet locked. Key with me all night. — S.V.' },
        { room: 'r', title: 'Archive index card', text: 'File 1964/113 — removed to cold store at request of the patient.' },
        { room: 'm', title: 'Tag on a drawer', text: 'DO NOT OPEN BEFORE DAWN.' }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'ferry', name: 'Redwater Ferry Terminal', size: 'Large', rank: 4, W: 62, H: 30,
      region: 'Redwater Sound, coast', ambience: 'coast', outsideTemp: 7, power: true, sea: true,
      blurb: 'A coastal terminal abandoned after the last crossing of the MV Caldera. The lower levels flood with every tide and the ferry is still tied up at the dock.',
      story: 'The Caldera arrived in fog with all lights burning and nobody at the helm. The manifest listed forty-one passengers. The lifeboats were still lashed down.',
      rooms: {
        y: { name: 'Car Park', kind: 'outdoor', outdoor: true },
        a: { name: 'Waiting Hall', kind: 'hall', h: 6 },
        t: { name: 'Ticket Office', kind: 'ticket' },
        k: { name: 'Harbour Café', kind: 'cafe' },
        o: { name: 'Port Offices', kind: 'office' },
        b: { name: 'Baggage Hall', kind: 'baggage', h: 4 },
        m: { name: 'Maintenance Dock', kind: 'dock', h: 6, wet: true, temp: 6 },
        g: { name: 'Gangway', kind: 'deck', outdoor: true },
        f: { name: 'Ferry Deck', kind: 'deck', outdoor: true },
        h: { name: 'Passenger Cabin', kind: 'cabin', h: 2.6 },
        e: { name: 'Wheelhouse', kind: 'control', h: 2.6 },
        l: { name: 'Flooded Service Level', kind: 'tunnel', flooded: true, h: 2.6, temp: 6 },
        w: { name: 'Drainage Tunnel', kind: 'tunnel', flooded: true, h: 2.4, temp: 6 },
        p: { name: 'Pump House', kind: 'generator', h: 3.0, temp: 8, wet: true },
        q: { name: 'Mooring Passage', kind: 'tunnel', flooded: true, h: 2.4, temp: 5 },
        v: { name: 'Ferry Hold', kind: 'storage', flooded: true, h: 2.6, temp: 5 }
      },
      floors: [
        [ // flooded lower levels
          ['R', 'l', 26, 19, 12, 3],
          ['R', 'w', 26, 8, 2, 11],
          ['R', 'p', 29, 4, 8, 6], ['D', 28, 8], ['P', 'G', 33, 5, 2, 2],
          ['R', 'q', 38, 20, 13, 1],
          ['R', 'v', 51, 8, 7, 14], ['P', 'Y', 55, 18, 2, 2], ['P', 'Y', 56, 9, 1, 2], ['P', 'H', 57, 21], ['P', 'H', 36, 9],
          ['S', 33, 14, 1, 5, 'n'], ['S', 52, 11, 1, 4, 's']
        ],
        [ // terminal and ferry deck
          ['R', 'y', 2, 23, 30, 6],
          ['R', 'a', 4, 12, 20, 10], ['X', 12, 22],
          ['R', 't', 4, 4, 7, 7], ['D', 7, 11], ['P', 'K', 4, 8, 5, 1],
          ['R', 'k', 12, 4, 8, 7], ['D', 15, 11], ['P', 'K', 12, 5, 1, 4],
          ['R', 'o', 21, 4, 14, 7], ['D', 20, 7], ['D', 28, 11],
          ['R', 'b', 25, 12, 10, 10], ['D', 24, 14], ['D', 24, 19],
          ['R', 'm', 36, 8, 12, 14], ['D', 35, 16], ['P', '~', 40, 12, 5, 7],
          ['R', 'g', 49, 14, 1, 1], ['D', 48, 14],
          ['R', 'f', 50, 6, 9, 18],
          ['R', 'h', 52, 10, 5, 8], ['D', 51, 16],
          ['R', 'e', 53, 19, 3, 2], ['D', 54, 18], ['D', 56, 20],
          ['P', 'N', 7, 14, 4, 1], ['P', 'N', 7, 17, 4, 1], ['P', 'N', 15, 14, 4, 1], ['P', 'N', 15, 17, 4, 1], ['P', 'Q', 13, 15, 1, 1], ['P', 'Q', 13, 19, 1, 1],
          ['P', 'Y', 26, 13, 2, 3], ['P', 'Y', 30, 19, 3, 2], ['P', 'K', 54, 20, 1, 1],
          ['P', 'H', 4, 4], ['P', 'H', 34, 4], ['P', 'H', 47, 21], ['P', 'H', 56, 10], ['P', 'H', 34, 21], ['P', 'H', 23, 21],
          ['W', 3, 12, 1, 10], ['W', 5, 22, 6, 1], ['W', 14, 22, 9, 1], ['W', 48, 9, 1, 4], ['W', 48, 17, 1, 4], ['W', 57, 11, 1, 6],
          ['P', 'F', 6, 24, 3, 3]
        ]
      ],
      spawn: { x: 10.5, z: 25.5, f: 1 },
      notes: [
        { room: 't', title: 'Final departure board', text: 'MV CALDERA — 23:40 — BOARDING. Someone has chalked over it: ARRIVED.' },
        { room: 'e', title: 'Captain\'s log, last entry', text: 'Fog thick. Passengers asking who the man on the stern is. There is no man on the stern.' },
        { room: 'o', title: 'Harbour master\'s letter', text: 'I will not authorise towing the Caldera. Every crew sent aboard comes back one fewer. I have stopped asking which one.' },
        { room: 'b', title: 'Unclaimed luggage tag', text: 'Forty-one bags. Forty-one names. All unclaimed. All damp, inside and out.' },
        { room: 'p', title: 'Pump house chalkboard', text: 'Tide 2 m above chart. Pumps on manual. Water tastes of iron.' }
      ]
    }
  ];
  NW.LOCATION_BY_ID = {};
  NW.LOCATIONS.forEach((l) => (NW.LOCATION_BY_ID[l.id] = l));
  NW.FLOOR_HEIGHT = 3.4;
})(typeof window !== 'undefined' ? window : globalThis);
