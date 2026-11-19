/* GYM RAT 2000 — game data: appearance options, catalogues, emotes, NPC cast, sponsors, competitions, achievements. */
'use strict';
GR.Data = (() => {
  const U = GR.U;

  /* ---------------- APPEARANCE ---------------- */
  const SKIN = [
    { n: 'Porcelain', c: '#f6dcc8', u: 'pink' }, { n: 'Ivory', c: '#f1d0b0', u: 'neutral' }, { n: 'Peach', c: '#efc39f', u: 'warm' },
    { n: 'Sand', c: '#e2b48a', u: 'golden' }, { n: 'Honey', c: '#d4a074', u: 'golden' }, { n: 'Olive', c: '#c49a6c', u: 'olive' },
    { n: 'Caramel', c: '#b98055', u: 'warm' }, { n: 'Amber', c: '#a9714a', u: 'red' }, { n: 'Bronze', c: '#9a6440', u: 'golden' },
    { n: 'Chestnut', c: '#87553a', u: 'red' }, { n: 'Mocha', c: '#734631', u: 'neutral' }, { n: 'Cocoa', c: '#5f3a29', u: 'warm' },
    { n: 'Espresso', c: '#4c2e22', u: 'red' }, { n: 'Ebony', c: '#3c241a', u: 'cool' }, { n: 'Rosewood', c: '#9b5c4b', u: 'pink' }, { n: 'Golden Tan', c: '#c88b56', u: 'golden' }
  ];
  const HAIR_COLORS = [
    { n: 'Jet Black', c: '#141110' }, { n: 'Soft Black', c: '#2a211d' }, { n: 'Dark Brown', c: '#3d2a1f' }, { n: 'Chestnut', c: '#6b4129' },
    { n: 'Auburn', c: '#7f3a20' }, { n: 'Copper', c: '#a85428' }, { n: 'Honey Blonde', c: '#c39a5a' }, { n: 'Platinum', c: '#e6dcc2' },
    { n: 'Silver', c: '#b8b8bc' }, { n: 'Ash Brown', c: '#7a6656' }, { n: 'Electric Blue', c: '#2f6bff' }, { n: 'Hot Pink', c: '#ff4fa3' },
    { n: 'Mint', c: '#66e0b5' }, { n: 'Lavender', c: '#a98be8' }, { n: 'Fire Red', c: '#d4231c' }, { n: 'Bleach', c: '#f2e6b0' }
  ];
  const EYE_COLORS = ['#3b2416', '#5a3a22', '#7a5230', '#3f6b3a', '#5c7d4b', '#3b6ea8', '#6d9ac9', '#7f7f86', '#a07a3b', '#2a1a12'];
  const EYE_SHAPES = [
    { id: 'almond', n: 'Almond', open: 0.82, tilt: 0.05, w: 1.05, h: 0.9 }, { id: 'round', n: 'Round', open: 1, tilt: 0, w: 1, h: 1.08 },
    { id: 'hooded', n: 'Hooded', open: 0.62, tilt: 0, w: 1.04, h: 0.85 }, { id: 'upturned', n: 'Upturned', open: 0.8, tilt: 0.18, w: 1.05, h: 0.9 },
    { id: 'downturned', n: 'Downturned', open: 0.78, tilt: -0.15, w: 1.02, h: 0.92 }, { id: 'monolid', n: 'Monolid', open: 0.66, tilt: 0.08, w: 1.12, h: 0.8 },
    { id: 'wide', n: 'Big & Bright', open: 1, tilt: 0.02, w: 1.15, h: 1.15 }
  ];
  const BROWS = [
    { id: 'straight', n: 'Straight', arch: 0, angle: 0 }, { id: 'soft', n: 'Soft Arch', arch: 0.25, angle: 0.02 }, { id: 'high', n: 'High Arch', arch: 0.5, angle: 0.06 },
    { id: 'angled', n: 'Angled', arch: 0.35, angle: 0.18 }, { id: 'thick', n: 'Bushy', arch: 0.1, angle: 0, thick: 1.5 }, { id: 'thin', n: 'Thin', arch: 0.3, angle: 0.04, thick: 0.6 },
    { id: 'slit', n: 'Slit Brow', arch: 0.2, angle: 0.06, slit: true }
  ];
  const NOSES = [
    { id: 'button', n: 'Button', w: 0.85, l: 0.8, p: 0.8, b: 0.6 }, { id: 'straight', n: 'Straight', w: 1, l: 1, p: 1, b: 1 }, { id: 'roman', n: 'Roman', w: 1, l: 1.12, p: 1.2, b: 1.35 },
    { id: 'wide', n: 'Wide', w: 1.35, l: 0.95, p: 0.9, b: 0.7 }, { id: 'snub', n: 'Snub', w: 0.95, l: 0.85, p: 0.95, b: 0.55, up: 0.3 }, { id: 'long', n: 'Long', w: 0.95, l: 1.25, p: 1.1, b: 1.1 },
    { id: 'broad', n: 'Broad Bridge', w: 1.25, l: 1.05, p: 1.05, b: 1.2 }
  ];
  const MOUTHS = [
    { id: 'classic', n: 'Classic', w: 1, full: 1 }, { id: 'full', n: 'Full Lips', w: 1.05, full: 1.45 }, { id: 'thin', n: 'Thin', w: 0.95, full: 0.65 },
    { id: 'wide', n: 'Wide', w: 1.25, full: 1 }, { id: 'small', n: 'Small', w: 0.8, full: 1 }, { id: 'bow', n: 'Cupid Bow', w: 0.95, full: 1.25, bow: 1 }
  ];
  const FACE_SHAPES = [
    { id: 'oval', n: 'Oval', jaw: 0.78, chin: 0.5, cheek: 0.5, len: 1, wid: 1 }, { id: 'square', n: 'Square', jaw: 0.95, chin: 0.3, cheek: 0.55, len: 0.98, wid: 1.04 },
    { id: 'round', n: 'Round', jaw: 0.88, chin: 0.2, cheek: 0.75, len: 0.94, wid: 1.06 }, { id: 'heart', n: 'Heart', jaw: 0.66, chin: 0.65, cheek: 0.7, len: 1, wid: 1.02 },
    { id: 'long', n: 'Long', jaw: 0.8, chin: 0.55, cheek: 0.4, len: 1.1, wid: 0.95 }, { id: 'diamond', n: 'Diamond', jaw: 0.72, chin: 0.7, cheek: 0.95, len: 1.03, wid: 0.98 },
    { id: 'chiselled', n: 'Chiselled', jaw: 1, chin: 0.75, cheek: 0.85, len: 1.04, wid: 1.0 }
  ];
  const EARS = [{ id: 'normal', n: 'Classic', s: 1, a: 0.15 }, { id: 'small', n: 'Small', s: 0.82, a: 0.1 }, { id: 'large', n: 'Large', s: 1.2, a: 0.2 }, { id: 'pointy', n: 'Pointed', s: 1.05, a: 0.18, pt: 1 }, { id: 'out', n: 'Sticky-Outy', s: 1.08, a: 0.42 }];

  // Hairstyles: type drives the procedural geometry generator in gfx/hair.js
  const HAIR = [
    { id: 'bald', n: 'Clean Shave', type: 'bald', len: 0, price: 0 },
    { id: 'buzz', n: 'Buzz Cut', type: 'buzz', len: 1, price: 15 },
    { id: 'crop', n: 'Textured Crop', type: 'crop', len: 1, price: 30 },
    { id: 'fade', n: 'Skin Fade', type: 'fade', len: 1, price: 35 },
    { id: 'highfade', n: 'High Top Fade', type: 'hightop', len: 2, price: 45 },
    { id: 'quiff', n: 'Quiff', type: 'quiff', len: 2, price: 40 },
    { id: 'pomp', n: 'Pompadour', type: 'pomp', len: 2, price: 55 },
    { id: 'curtains', n: 'Curtains (2012 Vibes)', type: 'curtains', len: 2, price: 40 },
    { id: 'fringe', n: 'Edgar Fringe', type: 'fringe', len: 2, price: 30 },
    { id: 'mullet', n: 'Modern Mullet', type: 'mullet', len: 3, price: 50 },
    { id: 'slick', n: 'Slick Back', type: 'slick', len: 2, price: 40 },
    { id: 'spiky', n: 'Frosted Spikes', type: 'spiky', len: 2, price: 45 },
    { id: 'curlytop', n: 'Curly Top Fade', type: 'curlytop', len: 2, price: 45 },
    { id: 'curlymid', n: 'Curly Shag', type: 'curlymid', len: 3, price: 50 },
    { id: 'afro', n: 'Afro', type: 'afro', len: 3, price: 55 },
    { id: 'puff', n: 'Afro Puffs', type: 'puffs', len: 3, price: 55 },
    { id: 'twists', n: 'Two-Strand Twists', type: 'twists', len: 2, price: 60 },
    { id: 'cornrows', n: 'Cornrows', type: 'cornrows', len: 2, price: 65 },
    { id: 'boxbraids', n: 'Box Braids', type: 'boxbraids', len: 4, price: 80 },
    { id: 'locs', n: 'Locs', type: 'locs', len: 4, price: 80 },
    { id: 'shortlocs', n: 'Short Locs', type: 'shortlocs', len: 2, price: 60 },
    { id: 'bob', n: 'Sleek Bob', type: 'bob', len: 3, price: 45 },
    { id: 'pixie', n: 'Pixie Cut', type: 'pixie', len: 1, price: 40 },
    { id: 'long', n: 'Long & Straight', type: 'long', len: 4, price: 55 },
    { id: 'wavy', n: 'Long Waves', type: 'wavy', len: 4, price: 60 },
    { id: 'pony', n: 'High Ponytail', type: 'pony', len: 4, price: 50 },
    { id: 'bun', n: 'Top Knot', type: 'bun', len: 3, price: 45 },
    { id: 'spacebuns', n: 'Space Buns', type: 'spacebuns', len: 3, price: 55 },
    { id: 'wolf', n: 'Wolf Cut', type: 'wolf', len: 3, price: 55 },
    { id: 'manbun', n: 'Man Bun + Undercut', type: 'manbun', len: 3, price: 50 }
  ];
  const FACIAL_HAIR = [
    { id: 'none', n: 'Clean', price: 0 }, { id: 'stubble', n: 'Stubble', price: 10 }, { id: 'moustache', n: 'Moustache', price: 20 },
    { id: 'goatee', n: 'Goatee', price: 20 }, { id: 'chinstrap', n: 'Chinstrap', price: 25 }, { id: 'short', n: 'Short Beard', price: 25 },
    { id: 'full', n: 'Full Beard', price: 35 }, { id: 'viking', n: 'Viking Beard', price: 45 }, { id: 'pencil', n: 'Pencil Stache', price: 20 }
  ];

  /* ---------------- STARTING CHARACTERS ---------------- */
  const app = o => Object.assign({
    skin: '#c49a6c', face: 'oval', eyeShape: 'almond', eyeColor: '#3b2416', eyeSize: 1, eyeSpacing: 1, brow: 'soft', browThick: 1, browColor: null,
    nose: 'straight', noseSize: 1, mouth: 'classic', ears: 'normal', hair: 'crop', hairColor: '#2a211d', hairHi: null, facialHair: 'none', facialColor: null,
    freckles: 0, beautyMark: false, height: 1, build: 0.5, shoulders: 0.5, muscle: 0.2, legs: 0.5, cheek: null, jaw: null, chin: null,
    cosmetics: { mask: null, paint: null, glow: 0, blush: 0, liner: false, glitter: false }
  }, o);
  const STARTERS = [
    { id: 'jayden', name: 'Jayden "Jay" Brooks', title: 'The Hype Man',
      desc: 'Never misses a session, never misses a trend. Has hyped up every stranger at the gym at least once.',
      stats: { money: 300, followers: 120, rep: 10, muscle: 0.25 }, intro: 'hype',
      app: app({ skin: '#5f3a29', face: 'square', eyeShape: 'almond', eyeColor: '#2a1a12', brow: 'thick', nose: 'wide', mouth: 'full', hair: 'highfade', hairColor: '#141110', facialHair: 'chinstrap', height: 1.03, build: 0.55, shoulders: 0.6, muscle: 0.3 }),
      outfit: { top: { id: 't_jersey_ballr', c: 0 }, bottom: { id: 'b_bballshorts_ballr', c: 0 }, shoes: { id: 's_hightop_ballr', c: 0 }, acc: { neck: { id: 'a_chain_cuban', c: 0 } } } },
    { id: 'mei', name: 'Mei Tanaka-Hughes', title: 'The Trendsetter',
      desc: 'Fashion student turned content creator. Thinks every outfit should tell a story — even gym fits.',
      stats: { money: 420, followers: 260, rep: 5, muscle: 0.12 }, intro: 'pose',
      app: app({ skin: '#f1d0b0', face: 'heart', eyeShape: 'monolid', eyeColor: '#3b2416', brow: 'soft', browThick: 0.85, nose: 'button', mouth: 'bow', hair: 'bob', hairColor: '#141110', hairHi: '#a98be8', height: 0.94, build: 0.35, shoulders: 0.35, muscle: 0.12, freckles: 0.2 }),
      outfit: { top: { id: 't_oversized_aura', c: 1 }, bottom: { id: 'b_cargo_driplord', c: 0 }, shoes: { id: 's_retro_retrowave', c: 2 }, acc: { eyes: { id: 'a_glasses_round', c: 0 }, wrist: { id: 'a_watch_classic', c: 1 } } } },
    { id: 'diego', name: 'Diego Morales', title: 'The Gym Rat',
      desc: 'Lives at Iron Temple. Knows every machine by its first name. Owns more shakers than cups.',
      stats: { money: 250, followers: 60, rep: 25, muscle: 0.45 }, intro: 'flex',
      app: app({ skin: '#b98055', face: 'chiselled', eyeShape: 'hooded', eyeColor: '#5a3a22', brow: 'angled', browThick: 1.2, nose: 'roman', mouth: 'classic', hair: 'fade', hairColor: '#2a211d', facialHair: 'short', height: 1.0, build: 0.65, shoulders: 0.75, muscle: 0.5 }),
      outfit: { top: { id: 't_singlet_swoleforce', c: 0 }, bottom: { id: 'b_gymshorts_swoleforce', c: 0 }, shoes: { id: 's_runner_velocitee', c: 0 }, acc: { head: { id: 'a_cap_back', c: 0 } } } },
    { id: 'amara', name: 'Amara Okonkwo', title: 'The Competitor',
      desc: 'Former track star with a trophy shelf that needs reinforcing. Here to win the Mog-Off. All of them.',
      stats: { money: 280, followers: 150, rep: 30, muscle: 0.35 }, intro: 'victory',
      app: app({ skin: '#4c2e22', face: 'diamond', eyeShape: 'upturned', eyeColor: '#2a1a12', brow: 'high', nose: 'broad', mouth: 'full', hair: 'boxbraids', hairColor: '#141110', hairHi: '#a85428', height: 1.02, build: 0.45, shoulders: 0.5, muscle: 0.38 }),
      outfit: { top: { id: 't_trackjacket_velocitee', c: 1 }, bottom: { id: 'b_trackpants_velocitee', c: 1 }, shoes: { id: 's_runner_velocitee', c: 2 }, acc: { neck: { id: 'a_chain_pendant', c: 0 } } } },
    { id: 'liam', name: 'Liam O\'Sullivan', title: 'The Comeback Kid',
      desc: 'Signed up for a gym membership in January 2019. Finally going today. Big main character arc incoming.',
      stats: { money: 350, followers: 30, rep: 0, muscle: 0.05 }, intro: 'wave',
      app: app({ skin: '#f6dcc8', face: 'round', eyeShape: 'round', eyeColor: '#3b6ea8', brow: 'straight', nose: 'snub', mouth: 'wide', hair: 'curtains', hairColor: '#7f3a20', facialHair: 'stubble', facialColor: '#7f3a20', freckles: 0.7, height: 0.98, build: 0.6, shoulders: 0.45, muscle: 0.05 }),
      outfit: { top: { id: 't_hoodie_basicbro', c: 2 }, bottom: { id: 'b_sweats_basicbro', c: 0 }, shoes: { id: 's_slides_basicbro', c: 0 }, acc: { ears: { id: 'a_phones_neck', c: 0 } } } },
    { id: 'priya', name: 'Priya Sharma', title: 'The Strategist',
      desc: 'Spreadsheet for her workouts, spreadsheet for her outfits, spreadsheet for her spreadsheets. Unstoppable.',
      stats: { money: 500, followers: 90, rep: 15, muscle: 0.2 }, intro: 'think',
      app: app({ skin: '#a9714a', face: 'oval', eyeShape: 'wide', eyeColor: '#3b2416', brow: 'high', nose: 'long', mouth: 'classic', hair: 'pony', hairColor: '#141110', beautyMark: true, height: 0.96, build: 0.4, shoulders: 0.4, muscle: 0.22 }),
      outfit: { top: { id: 't_jacket_peakpuff', c: 0 }, bottom: { id: 'b_jeans_threadco', c: 1 }, shoes: { id: 's_sneaker_driplord', c: 0 }, acc: { back: { id: 'a_bag_mini', c: 1 }, wrist: { id: 'a_watch_smart', c: 0 } } } }
  ];

  /* ---------------- BRANDS & CLOTHING ---------------- */
  const BRANDS = {
    driplord: { n: 'DRIPLORD', col: '#111111', acc: '#f2c94c', mult: 1.6, vibe: 'street', tag: 'Hype streetwear for main characters.' },
    velocitee: { n: 'VELOCITEE', col: '#1b4dff', acc: '#ffffff', mult: 1.3, vibe: 'sport', tag: 'Faster than your excuses.' },
    swoleforce: { n: 'SWOLEFORCE', col: '#d7261e', acc: '#111111', mult: 1.2, vibe: 'gym', tag: 'Engineered for the pump.' },
    retrowave: { n: 'RETROWAVE', col: '#ff4fa3', acc: '#28e0ff', mult: 1.25, vibe: 'retro', tag: 'Vintage 2012 energy, remastered.' },
    basicbro: { n: 'BASIC BRO', col: '#6b7280', acc: '#ffffff', mult: 0.7, vibe: 'casual', tag: 'It\'s fine. It\'s a shirt.' },
    aura: { n: 'AURA ATELIER', col: '#2b1d3b', acc: '#d9b26b', mult: 2.4, vibe: 'luxury', tag: 'Quiet luxury, loud aura.' },
    ballr: { n: 'BALLR', col: '#f97316', acc: '#111827', mult: 1.2, vibe: 'sport', tag: 'Built for the blacktop.' },
    peakpuff: { n: 'PEAKPUFF', col: '#0f766e', acc: '#fbbf24', mult: 1.4, vibe: 'outdoor', tag: 'Summit-ready. Mostly worn to the cafe.' },
    threadco: { n: 'THREAD & CO', col: '#7c4a2d', acc: '#f5f0e6', mult: 1.0, vibe: 'casual', tag: 'Timeless basics, fair prices.' },
    mogcity: { n: 'MOG CITY FC', col: '#16a34a', acc: '#facc15', mult: 1.1, vibe: 'sport', tag: 'Official merch of the city\'s worst football club.' }
  };
  const PALETTES = {
    basic: ['#f4f4f2', '#1d1d1f', '#8a8f98', '#2c3e66', '#6b4e3d', '#b8c4a0'],
    street: ['#111111', '#f2c94c', '#f4f4f2', '#7b2cbf', '#e63946', '#3d405b'],
    sport: ['#1b4dff', '#111827', '#f4f4f2', '#ef4444', '#10b981', '#f97316'],
    gym: ['#d7261e', '#111111', '#4b5563', '#f4f4f2', '#0ea5e9', '#84cc16'],
    retro: ['#ff4fa3', '#28e0ff', '#ffd23f', '#7b61ff', '#06d6a0', '#f4f1de'],
    luxury: ['#2b1d3b', '#d9b26b', '#f5f0e6', '#111111', '#7f1d1d', '#1e3a2f'],
    outdoor: ['#0f766e', '#fbbf24', '#1f2937', '#dc2626', '#e5e7eb', '#4d7c0f'],
    denim: ['#3a5a8c', '#24324f', '#6d8fc1', '#1c1c1e', '#9fb4d4', '#c9ced6'],
    earth: ['#6b5b3e', '#3f4a2c', '#c2b280', '#1d1d1f', '#7a3e2b', '#d6d3c9']
  };
  const SLOGANS = ['MOG CITY', 'LOCKED IN', 'AURA +1000', 'NPC BEHAVIOUR', 'GYM RAT 2000', 'MAIN CHARACTER', 'TOUCH GRASS', 'RIZZ ACADEMY', 'PROTEIN CLUB', 'LEG DAY SURVIVOR', 'NO DAYS OFF*', 'CERTIFIED MOGGER', 'NOT CHOPPED', 'SIDE QUEST', 'LOW BATTERY', 'BULK SZN', 'DRIP OR DROWN', 'GRIND MODE', 'VIBE CHECK', 'W ONLY'];

  const ITEMS = [];
  const add = (slot, kind, brandId, name, price, pal, pattern, tags, store, extra) => {
    let id = `${slot[0]}_${kind}_${brandId}${extra && extra.suffix ? '_' + extra.suffix : ''}`;
    if (ITEMS.some(i => i.id === id)) { let k = 2; while (ITEMS.some(i => i.id === id + '_' + k)) k++; id += '_' + k; }
    const b = BRANDS[brandId];
    ITEMS.push(Object.assign({ id, slot, kind, brand: brandId, name: `${b.n} ${name}`, price: Math.round(price * b.mult / 5) * 5, colors: pal, pattern, tags, store, exclusive: false }, extra || {}));
  };
  // ---- TOPS
  add('top', 'tee', 'basicbro', 'Crew Tee', 20, PALETTES.basic, 'solid', ['casual', 'basic'], 'threadlord');
  add('top', 'tee', 'threadco', 'Pocket Tee', 30, PALETTES.earth, 'pocket', ['casual', 'retro'], 'threadlord');
  add('top', 'tee', 'mogcity', 'City Tee', 30, PALETTES.sport, 'graphic', ['casual', 'sport'], 'threadlord', { graphic: 'MOG CITY' });
  add('top', 'tee', 'retrowave', 'Sunset Tee', 40, PALETTES.retro, 'gradient', ['retro', 'summer'], 'threadlord');
  add('top', 'tee', 'velocitee', 'Dri-Fast Tee', 40, PALETTES.sport, 'logo', ['gym', 'sport'], 'threadlord');
  add('top', 'tee', 'basicbro', 'Ringer Tee', 25, PALETTES.retro, 'ringer', ['retro', 'casual'], 'threadlord');
  add('top', 'oversized', 'driplord', 'Boxy Logo Tee', 55, PALETTES.street, 'graphic', ['street', 'hype'], 'dripdepot', { graphic: 'DRIPLORD' });
  add('top', 'oversized', 'driplord', 'Locked In Tee', 60, PALETTES.street, 'graphic', ['street', 'gym', 'hype'], 'dripdepot', { graphic: 'LOCKED IN', suffix: 'li' });
  add('top', 'oversized', 'aura', 'Aura Heavyweight Tee', 90, PALETTES.luxury, 'logo', ['luxury', 'street'], 'dripdepot');
  add('top', 'oversized', 'retrowave', 'Tie-Dye Tee', 45, PALETTES.retro, 'tiedye', ['retro', 'summer', 'colour'], 'dripdepot');
  add('top', 'oversized', 'basicbro', 'NPC Behaviour Tee', 30, PALETTES.basic, 'graphic', ['casual', 'meme'], 'threadlord', { graphic: 'NPC BEHAVIOUR', suffix: 'npc' });
  add('top', 'oversized', 'swoleforce', 'Pump Cover', 40, PALETTES.gym, 'graphic', ['gym', 'cozy'], 'threadlord', { graphic: 'BULK SZN', suffix: 'pc' });
  add('top', 'hoodie', 'basicbro', 'Pullover Hoodie', 45, PALETTES.basic, 'solid', ['cozy', 'casual'], 'threadlord');
  add('top', 'hoodie', 'driplord', 'Heavy Hoodie', 95, PALETTES.street, 'graphic', ['street', 'cozy', 'hype'], 'dripdepot', { graphic: 'DRIPLORD' });
  add('top', 'hoodie', 'aura', 'Cashmere-ish Hoodie', 150, PALETTES.luxury, 'logo', ['luxury', 'cozy'], 'dripdepot');
  add('top', 'hoodie', 'retrowave', 'Colour Block Hoodie', 70, PALETTES.retro, 'split', ['retro', 'colour', 'cozy'], 'dripdepot');
  add('top', 'hoodie', 'swoleforce', 'Gym Hoodie', 60, PALETTES.gym, 'logo', ['gym', 'cozy'], 'threadlord');
  add('top', 'ziphoodie', 'velocitee', 'Tech Zip Hoodie', 75, PALETTES.sport, 'stripe', ['sport', 'gym'], 'threadlord');
  add('top', 'ziphoodie', 'basicbro', 'Zip Hoodie', 40, PALETTES.basic, 'solid', ['casual', 'cozy'], 'threadlord');
  add('top', 'ziphoodie', 'driplord', 'Camo Zip', 110, PALETTES.earth, 'camo', ['street', 'hype'], 'dripdepot');
  add('top', 'tank', 'basicbro', 'Muscle Tank', 15, PALETTES.basic, 'solid', ['gym', 'summer'], 'threadlord');
  add('top', 'tank', 'retrowave', 'Beach Tank', 30, PALETTES.retro, 'stripe', ['summer', 'retro'], 'threadlord');
  add('top', 'singlet', 'swoleforce', 'Stringer', 30, PALETTES.gym, 'logo', ['gym'], 'threadlord');
  add('top', 'singlet', 'velocitee', 'Race Singlet', 35, PALETTES.sport, 'stripe', ['gym', 'sport', 'summer'], 'threadlord');
  add('top', 'jersey', 'ballr', 'Home Jersey', 60, PALETTES.sport, 'number', ['sport', 'street'], 'dripdepot', { num: 23, team: 'BLACKTOP' });
  add('top', 'jersey', 'mogcity', 'Throwback Jersey', 70, PALETTES.retro, 'number', ['sport', 'retro'], 'dripdepot', { num: 2, team: 'MOGGERS' });
  add('top', 'jersey', 'retrowave', 'Glitch Jersey', 80, PALETTES.retro, 'number', ['retro', 'colour'], 'dripdepot', { num: 0, team: 'GLITCH' });
  add('top', 'football', 'mogcity', 'Home Kit', 65, PALETTES.sport, 'hoops', ['sport', 'retro'], 'threadlord', { num: 9, team: 'MOG FC' });
  add('top', 'football', 'velocitee', 'Away Kit', 70, PALETTES.sport, 'sash', ['sport'], 'threadlord', { num: 10, team: 'VELO' });
  add('top', 'longsleeve', 'threadco', 'Henley', 40, PALETTES.earth, 'solid', ['casual', 'cozy'], 'threadlord');
  add('top', 'longsleeve', 'threadco', 'Flannel Shirt', 50, PALETTES.earth, 'check', ['casual', 'retro', 'cozy'], 'threadlord');
  add('top', 'longsleeve', 'retrowave', 'Striped Long Sleeve', 45, PALETTES.retro, 'stripe', ['retro', 'colour'], 'threadlord');
  add('top', 'longsleeve', 'aura', 'Mock Neck', 110, PALETTES.luxury, 'solid', ['luxury'], 'dripdepot');
  add('top', 'puffer', 'peakpuff', 'Summit Puffer', 160, PALETTES.outdoor, 'quilt', ['cozy', 'outdoor', 'street'], 'dripdepot');
  add('top', 'puffer', 'driplord', 'Gloss Puffer', 220, PALETTES.street, 'quilt', ['street', 'hype', 'cozy'], 'dripdepot', { gloss: true });
  add('top', 'jacket', 'threadco', 'Bomber Jacket', 90, PALETTES.earth, 'solid', ['street', 'casual'], 'threadlord');
  add('top', 'jacket', 'aura', 'Varsity Jacket', 180, PALETTES.luxury, 'varsity', ['luxury', 'retro', 'street'], 'dripdepot');
  add('top', 'jacket', 'peakpuff', 'Windbreaker', 85, PALETTES.retro, 'split', ['outdoor', 'retro', 'colour'], 'dripdepot');
  add('top', 'trackjacket', 'velocitee', 'Track Jacket', 70, PALETTES.sport, 'stripe', ['sport', 'retro'], 'threadlord');
  add('top', 'trackjacket', 'retrowave', 'Shell Track Top', 75, PALETTES.retro, 'split', ['retro', 'colour'], 'threadlord');
  add('top', 'trackjacket', 'swoleforce', 'Warm-Up Jacket', 65, PALETTES.gym, 'stripe', ['gym', 'sport'], 'threadlord');
  // ---- BOTTOMS
  add('bottom', 'baggyjeans', 'driplord', 'Baggy Jeans', 110, PALETTES.denim, 'denim', ['street', 'hype'], 'dripdepot');
  add('bottom', 'baggyjeans', 'threadco', 'Skater Jeans', 70, PALETTES.denim, 'denim', ['street', 'retro'], 'threadlord');
  add('bottom', 'jeans', 'threadco', 'Straight Jeans', 60, PALETTES.denim, 'denim', ['casual'], 'threadlord');
  add('bottom', 'jeans', 'aura', 'Raw Selvedge', 160, PALETTES.denim, 'denim', ['luxury'], 'dripdepot');
  add('bottom', 'jeans', 'basicbro', 'Slim Jeans', 40, PALETTES.denim, 'denim', ['casual', 'basic'], 'threadlord');
  add('bottom', 'cargo', 'driplord', 'Utility Cargos', 95, PALETTES.earth, 'cargo', ['street', 'outdoor'], 'dripdepot');
  add('bottom', 'cargo', 'peakpuff', 'Trail Cargos', 80, PALETTES.outdoor, 'cargo', ['outdoor'], 'dripdepot');
  add('bottom', 'cargo', 'retrowave', 'Parachute Pants', 75, PALETTES.retro, 'cargo', ['retro', 'colour'], 'dripdepot');
  add('bottom', 'trackpants', 'velocitee', 'Track Pants', 55, PALETTES.sport, 'stripe', ['sport', 'retro'], 'threadlord');
  add('bottom', 'trackpants', 'swoleforce', 'Joggers', 50, PALETTES.gym, 'stripe', ['gym', 'cozy'], 'threadlord');
  add('bottom', 'gymshorts', 'swoleforce', 'Squat Shorts', 30, PALETTES.gym, 'logo', ['gym', 'summer'], 'threadlord');
  add('bottom', 'gymshorts', 'velocitee', 'Split Shorts', 35, PALETTES.sport, 'stripe', ['gym', 'sport', 'summer'], 'threadlord');
  add('bottom', 'gymshorts', 'basicbro', 'Gym Shorts', 18, PALETTES.basic, 'solid', ['gym', 'basic'], 'threadlord');
  add('bottom', 'bballshorts', 'ballr', 'Mesh Shorts', 45, PALETTES.sport, 'stripe', ['sport', 'street', 'summer'], 'dripdepot');
  add('bottom', 'bballshorts', 'mogcity', 'Retro Hoop Shorts', 50, PALETTES.retro, 'split', ['sport', 'retro'], 'dripdepot');
  add('bottom', 'sweats', 'basicbro', 'Sweatpants', 35, PALETTES.basic, 'solid', ['cozy', 'casual'], 'threadlord');
  add('bottom', 'sweats', 'aura', 'Lounge Pants', 120, PALETTES.luxury, 'solid', ['luxury', 'cozy'], 'dripdepot');
  add('bottom', 'sweats', 'driplord', 'Stacked Sweats', 90, PALETTES.street, 'logo', ['street', 'cozy', 'hype'], 'dripdepot');
  add('bottom', 'shorts', 'threadco', 'Chino Shorts', 40, PALETTES.earth, 'solid', ['summer', 'casual'], 'threadlord');
  add('bottom', 'shorts', 'retrowave', 'Board Shorts', 40, PALETTES.retro, 'tiedye', ['summer', 'retro', 'colour'], 'threadlord');
  add('bottom', 'shorts', 'basicbro', 'Denim Shorts', 30, PALETTES.denim, 'denim', ['summer', 'casual'], 'threadlord');
  // ---- SHOES (Sole Survivor)
  add('shoes', 'runner', 'velocitee', 'Zoomline Runner', 90, PALETTES.sport, 'shoe', ['gym', 'sport'], 'solesurvivor');
  add('shoes', 'runner', 'swoleforce', 'Lifter Trainer', 80, PALETTES.gym, 'shoe', ['gym'], 'solesurvivor');
  add('shoes', 'runner', 'peakpuff', 'Trail Runner', 100, PALETTES.outdoor, 'shoe', ['outdoor', 'sport'], 'solesurvivor');
  add('shoes', 'hightop', 'ballr', 'Skyhook High', 120, PALETTES.sport, 'shoe', ['sport', 'street'], 'solesurvivor');
  add('shoes', 'hightop', 'driplord', 'Grail High', 260, PALETTES.street, 'shoe', ['street', 'hype', 'luxury'], 'solesurvivor');
  add('shoes', 'lowtop', 'ballr', 'Crossover Low', 100, PALETTES.sport, 'shoe', ['sport'], 'solesurvivor');
  add('shoes', 'lowtop', 'aura', 'Court Classic', 190, PALETTES.luxury, 'shoe', ['luxury', 'casual'], 'solesurvivor');
  add('shoes', 'sneaker', 'driplord', 'Chunky Dad Shoe', 150, PALETTES.street, 'shoe', ['street', 'hype'], 'solesurvivor');
  add('shoes', 'sneaker', 'basicbro', 'Canvas Sneaker', 40, PALETTES.basic, 'shoe', ['casual', 'basic'], 'solesurvivor');
  add('shoes', 'sneaker', 'threadco', 'Leather Low', 85, PALETTES.earth, 'shoe', ['casual'], 'solesurvivor');
  add('shoes', 'retro', 'retrowave', 'Neon 2012 Trainer', 110, PALETTES.retro, 'shoe', ['retro', 'colour'], 'solesurvivor');
  add('shoes', 'retro', 'velocitee', 'OG Racer', 95, PALETTES.sport, 'shoe', ['retro', 'sport'], 'solesurvivor');
  add('shoes', 'slides', 'basicbro', 'Pool Slides', 20, PALETTES.basic, 'shoe', ['summer', 'cozy', 'casual'], 'solesurvivor');
  add('shoes', 'slides', 'driplord', 'Foam Slides', 70, PALETTES.street, 'shoe', ['summer', 'street', 'cozy'], 'solesurvivor');
  // ---- ACCESSORIES
  const METALS = ['#e8c45a', '#d9d9de', '#c48b6a', '#1d1d1f', '#9ad1ff'];
  const accs = [
    ['neck', 'chain_cuban', 'Cuban Link Chain', 120, METALS, ['luxury', 'street', 'hype']], ['neck', 'chain_rope', 'Rope Chain', 80, METALS, ['street']],
    ['neck', 'chain_pendant', 'Dumbbell Pendant', 95, METALS, ['gym', 'street']], ['neck', 'chain_beads', 'Bead Necklace', 30, PALETTES.retro, ['summer', 'retro']],
    ['wrist', 'watch_classic', 'Classic Watch', 140, METALS, ['luxury', 'casual']], ['wrist', 'watch_digital', 'Digital Watch', 45, PALETTES.retro, ['retro', 'sport']],
    ['wrist', 'watch_smart', 'Smart Band', 90, PALETTES.basic, ['gym', 'sport']], ['wrist', 'bracelet_beads', 'Bead Bracelet', 20, PALETTES.retro, ['summer', 'casual']],
    ['wrist', 'bracelet_cuff', 'Metal Cuff', 60, METALS, ['luxury']], ['ring', 'ring_band', 'Plain Band', 50, METALS, ['luxury', 'casual']],
    ['ring', 'ring_signet', 'Signet Ring', 85, METALS, ['luxury', 'street']], ['eyes', 'glasses_aviator', 'Aviators', 70, ['#2b2b2b', '#6b4e16', '#1b4dff', '#a3a3a3'], ['summer', 'retro']],
    ['eyes', 'glasses_square', 'Square Shades', 60, ['#111111', '#7b2cbf', '#f4f4f2', '#e63946'], ['street', 'hype']], ['eyes', 'glasses_round', 'Round Specs', 55, ['#c9a227', '#111111', '#7c4a2d'], ['retro', 'casual']],
    ['eyes', 'glasses_shield', 'Sport Shield', 75, PALETTES.sport, ['sport', 'gym', 'hype']], ['eyes', 'glasses_rect', 'Tiny Rectangles', 50, PALETTES.retro, ['retro', 'street']],
    ['head', 'cap', 'Baseball Cap', 35, PALETTES.sport, ['sport', 'casual']], ['head', 'cap_back', 'Backwards Cap', 35, PALETTES.gym, ['gym', 'street']],
    ['head', 'beanie', 'Ribbed Beanie', 30, PALETTES.street, ['cozy', 'street']], ['head', 'bucket', 'Bucket Hat', 45, PALETTES.retro, ['summer', 'retro', 'street']],
    ['head', 'headband', 'Sweatband', 15, PALETTES.retro, ['gym', 'retro', 'sport']], ['back', 'bag_mini', 'Mini Backpack', 75, PALETTES.street, ['street', 'casual']],
    ['back', 'bag_school', 'Daypack', 60, PALETTES.outdoor, ['casual', 'outdoor']], ['back', 'bag_gym', 'Gym Pack', 70, PALETTES.gym, ['gym', 'sport']],
    ['ears', 'phones_head', 'Over-Ear Headphones', 130, ['#111111', '#f4f4f2', '#ff4fa3', '#1b4dff', '#d9b26b'], ['street', 'hype', 'gym']],
    ['ears', 'phones_neck', 'Neck Headphones', 110, ['#111111', '#f4f4f2', '#ef4444', '#10b981'], ['street', 'casual']]
  ];
  accs.forEach(([slot, kind, name, price, pal, tags]) => ITEMS.push({ id: 'a_' + kind, slot, kind, brand: null, name, price, colors: pal, pattern: 'solid', tags, store: 'solesurvivor', exclusive: false }));
  // Exclusive rewards (competitions, sponsors, mystery, friends). Not sold in stores.
  const ex = (slot, kind, name, pal, pattern, tags, src, extra) => ITEMS.push(Object.assign({ id: 'x_' + kind + '_' + U.hash(name).toString(36).slice(0, 5), slot, kind, brand: null, name, price: 0, colors: pal, pattern, tags, store: null, exclusive: true, source: src }, extra || {}));
  ex('top', 'jacket', 'Mog-Off Champion Jacket', ['#d9b26b', '#111111'], 'varsity', ['luxury', 'sport', 'hype'], 'Win a City Circuit event');
  ex('top', 'oversized', 'Certified Mogger Tee', ['#111111', '#f4f4f2'], 'graphic', ['street', 'hype', 'meme'], 'Win a Rookie Night event', { graphic: 'CERTIFIED MOGGER' });
  ex('top', 'hoodie', 'Aura Farmer Hoodie', ['#7b61ff', '#111111'], 'graphic', ['street', 'cozy', 'hype'], 'Win an Aura competition', { graphic: 'AURA +1000' });
  ex('top', 'jersey', 'Legends Jersey', ['#d9b26b', '#2b1d3b'], 'number', ['luxury', 'sport'], 'Win the Mog Legends Grand Final', { num: 1, team: 'LEGEND' });
  ex('top', 'oversized', 'Driplord x You Collab Tee', ['#f2c94c', '#111111'], 'graphic', ['street', 'hype', 'luxury'], 'DRIPLORD sponsorship', { graphic: 'DRIPLORD x ME' });
  ex('top', 'singlet', 'Swoleforce Athlete Stringer', ['#d7261e', '#111111'], 'logo', ['gym', 'sport'], 'SWOLEFORCE sponsorship', { brand: 'swoleforce' });
  ex('shoes', 'hightop', 'Velocitee Athlete PE', ['#1b4dff', '#f2c94c'], 'shoe', ['sport', 'hype', 'luxury'], 'VELOCITEE sponsorship', { brand: 'velocitee' });
  ex('top', 'tee', 'Glitch in the Matrix Tee', ['#06d6a0', '#ff4fa3'], 'tiedye', ['retro', 'colour', 'meme'], 'Mystery machine');
  ex('bottom', 'cargo', 'Holographic Cargos', ['#9ad1ff', '#ff4fa3'], 'gradient', ['retro', 'hype', 'colour'], 'Mystery machine');
  ex('top', 'puffer', 'Gold Foil Puffer', ['#e8c45a'], 'quilt', ['luxury', 'hype'], 'Mystery machine', { gloss: true });
  ex('top', 'tee', 'Bestie Tee', ['#ff9ec7', '#9ad1ff'], 'graphic', ['casual', 'meme'], 'Max friendship', { graphic: 'BESTIES' });
  ex('top', 'tank', 'Friendship Tank', ['#f97316', '#10b981'], 'graphic', ['gym', 'summer'], 'Friendship gift', { graphic: 'SPOT ME BRO' });
  ex('head', 'crown', 'Mog Crown', ['#e8c45a', '#d9d9de'], 'solid', ['luxury', 'hype', 'meme'], 'Win the Mog Legends Grand Final');
  ex('neck', 'chain_cuban', 'Diamond Cuban', ['#e6f3ff'], 'solid', ['luxury', 'hype'], 'Elite Invitational win');
  const item = id => ITEMS.find(i => i.id === id);

  /* ---------------- FURNITURE ---------------- */
  const F = (id, n, cat, kind, price, colors, w, d, surf = 'floor', extra = {}) => Object.assign({ id, n, cat, kind, price, colors, w, d, surf }, extra);
  const FURNITURE = [
    F('sofa_modern', 'Modern Sofa', 'Seating', 'sofa', 450, ['#4b5563', '#7c4a2d', '#1e3a5f', '#d6d3c9', '#7f1d1d'], 2.2, 0.95, 'floor', { seat: true }),
    F('sofa_corner', 'Corner Lounge', 'Seating', 'sofa_l', 800, ['#d6d3c9', '#374151', '#3f4a2c'], 2.6, 2.0, 'floor', { seat: true }),
    F('armchair', 'Club Armchair', 'Seating', 'armchair', 260, ['#7c4a2d', '#1e3a5f', '#d9b26b', '#4b5563'], 0.95, 0.9, 'floor', { seat: true }),
    F('beanbag', 'Gamer Beanbag', 'Seating', 'beanbag', 90, ['#7b2cbf', '#ef4444', '#10b981', '#111111'], 0.9, 0.9, 'floor', { seat: true }),
    F('gamechair', 'Pro Gaming Chair', 'Gaming', 'gamechair', 320, ['#111111', '#ef4444', '#ff4fa3', '#1b4dff'], 0.7, 0.7, 'floor', { seat: true }),
    F('desk_gaming', 'RGB Gaming Desk', 'Gaming', 'desk', 280, ['#111111', '#d6d3c9', '#7c4a2d'], 1.6, 0.75),
    F('arcade', 'Retro Arcade Cabinet', 'Gaming', 'arcade', 650, ['#7b61ff', '#ef4444', '#06d6a0'], 0.8, 0.8),
    F('bed_double', 'Double Bed', 'Bedroom', 'bed', 520, ['#f4f4f2', '#1e3a5f', '#7f1d1d', '#3f4a2c'], 1.7, 2.2, 'floor', { bed: true }),
    F('bed_race', 'Racecar Bed (Ironic)', 'Bedroom', 'bed_race', 900, ['#ef4444', '#1b4dff', '#facc15'], 1.3, 2.3, 'floor', { bed: true }),
    F('nightstand', 'Bedside Table', 'Bedroom', 'nightstand', 80, ['#7c4a2d', '#f4f4f2', '#111111'], 0.5, 0.45),
    F('rug_round', 'Round Rug', 'Decor', 'rug_round', 70, ['#d6d3c9', '#7b2cbf', '#1e3a5f', '#f97316'], 2, 2, 'floor', { flat: true }),
    F('rug_rect', 'Shag Rug', 'Decor', 'rug_rect', 110, ['#f4f4f2', '#4b5563', '#7f1d1d', '#10b981'], 2.6, 1.8, 'floor', { flat: true }),
    F('lamp_floor', 'Arc Floor Lamp', 'Lighting', 'lamp_floor', 120, ['#e8c45a', '#111111', '#d9d9de'], 0.5, 0.5, 'floor', { light: true }),
    F('lamp_lava', 'Lava Lamp', 'Lighting', 'lamp_lava', 45, ['#ff4fa3', '#28e0ff', '#f97316'], 0.3, 0.3, 'floor', { light: true }),
    F('neon_mog', 'Neon "MOG" Sign', 'Lighting', 'neon', 180, ['#ff4fa3', '#28e0ff', '#a3e635'], 1.2, 0.1, 'wall', { light: true, text: 'MOG' }),
    F('neon_aura', 'Neon "AURA" Sign', 'Lighting', 'neon', 200, ['#7b61ff', '#facc15', '#ef4444'], 1.3, 0.1, 'wall', { light: true, text: 'AURA' }),
    F('poster_gym', 'Poster: Leg Day', 'Decor', 'poster', 25, ['#d7261e', '#1b4dff'], 0.7, 0.05, 'wall', { text: 'LEG DAY' }),
    F('poster_retro', 'Poster: 2012 Forever', 'Decor', 'poster', 25, ['#ff4fa3', '#06d6a0'], 0.7, 0.05, 'wall', { text: '2012 FOREVER' }),
    F('poster_city', 'Poster: Mog City', 'Decor', 'poster', 25, ['#111111', '#f2c94c'], 0.7, 0.05, 'wall', { text: 'MOG CITY' }),
    F('plant_monstera', 'Monstera', 'Plants', 'plant', 60, ['#2f7d32'], 0.7, 0.7),
    F('plant_cactus', 'Cactus Trio', 'Plants', 'cactus', 35, ['#4d7c0f'], 0.5, 0.4),
    F('plant_palm', 'Indoor Palm', 'Plants', 'palm', 95, ['#3f6f2a'], 0.8, 0.8),
    F('shelf_display', 'Collectibles Shelf', 'Storage', 'shelf', 150, ['#7c4a2d', '#111111', '#f4f4f2'], 1.2, 0.4, 'floor', { display: 6 }),
    F('trophy_case', 'Trophy Cabinet', 'Storage', 'trophycase', 300, ['#111111', '#7c4a2d', '#d9b26b'], 1.2, 0.5, 'floor', { display: 8 }),
    F('bookshelf', 'Bookshelf', 'Storage', 'bookshelf', 130, ['#7c4a2d', '#f4f4f2', '#111111'], 1.0, 0.35),
    F('tvstand', 'Big TV + Stand', 'Entertainment', 'tv', 600, ['#111111', '#7c4a2d'], 1.8, 0.5, 'floor', { tv: true }),
    F('coffee_table', 'Coffee Table', 'Living', 'coffeetable', 120, ['#7c4a2d', '#111111', '#f4f4f2'], 1.1, 0.6),
    F('punchbag', 'Punching Bag', 'Home Gym', 'punchbag', 220, ['#d7261e', '#111111', '#1b4dff'], 0.7, 0.7, 'floor', { gym: 'punch' }),
    F('dbrack_home', 'Home Dumbbell Rack', 'Home Gym', 'dbrack', 350, ['#111111', '#4b5563'], 1.2, 0.5, 'floor', { gym: 'dumbbell' }),
    F('minifridge', 'Mini Fridge', 'Living', 'fridge_mini', 160, ['#f4f4f2', '#111111', '#ef4444'], 0.55, 0.55),
    F('mirror_floor', 'Floor Mirror', 'Decor', 'mirror', 140, ['#d9b26b', '#111111', '#f4f4f2'], 0.7, 0.1, 'floor', { mirror: true })
  ];

  /* ---------------- EMOTES & DANCES ---------------- */
  const E = (id, n, cat, unlock, price = 0, extra = {}) => Object.assign({ id, n, cat, unlock, price }, extra);
  const EMOTES = [
    E('wave', 'Wave', 'react', 'start'), E('flex', 'Double Biceps', 'gym', 'start'), E('thumbs', 'Thumbs Up', 'react', 'start'),
    E('clap', 'Slow Clap', 'react', 'start'), E('shrug', 'Shrug', 'react', 'start'), E('point', 'Point & Laugh', 'taunt', 'start'),
    E('laugh', 'Laugh', 'react', 'start'), E('shock', 'Shocked', 'react', 'start'), E('peace', 'Peace Sign', 'pose', 'start'),
    E('selfie', 'Selfie Pose', 'pose', 'start'), E('cross', 'Crossed Arms', 'idle', 'start'), E('mewing', 'Mewing Stare', 'pose', 'start', 0, { aura: 3 }),
    E('sidechest', 'Side Chest', 'gym', 'level', 0, { lvl: 3 }), E('latspread', 'Lat Spread', 'gym', 'level', 0, { lvl: 6 }), E('pushups', 'Celebration Push-Ups', 'gym', 'level', 0, { lvl: 4 }),
    E('victory', 'Victory Jump', 'celebrate', 'start'), E('trophy', 'Trophy Lift', 'celebrate', 'comp'), E('facepalm', 'Facepalm', 'react', 'start'),
    E('cry', 'Big Cry', 'react', 'shop', 40), E('salute', 'Salute', 'pose', 'shop', 30), E('bow', 'Bow', 'celebrate', 'shop', 30),
    E('heart', 'Heart Hands', 'pose', 'shop', 40), E('comehere', 'Come Here', 'taunt', 'shop', 50), E('yawn', 'Too Easy', 'taunt', 'shop', 60, { aura: 2 }),
    E('npcglitch', 'NPC Glitch', 'taunt', 'mystery', 0, { aura: 4 }), E('stare', 'The Thousand-Yard Stare', 'pose', 'comp', 0, { aura: 5 }), E('sit', 'Sit Down', 'idle', 'start'),
    E('lean', 'Cool Lean', 'idle', 'start'), E('phonecheck', 'Check Phone', 'idle', 'start'), E('stretch', 'Stretch', 'idle', 'start'),
    // dances
    E('d_shuffle', 'The Mog Shuffle', 'dance', 'start', 0, { dance: true, bpm: 120 }), E('d_sway', 'Sigma Sway', 'dance', 'start', 0, { dance: true, bpm: 96 }),
    E('d_shake', 'Protein Shake', 'dance', 'shop', 80, { dance: true, bpm: 128 }), E('d_rizz', 'Rizz Roll', 'dance', 'shop', 90, { dance: true, bpm: 104 }),
    E('d_robot', 'Robot Rep', 'dance', 'shop', 70, { dance: true, bpm: 110 }), E('d_floss', 'Frantic Floss', 'dance', 'mystery', 0, { dance: true, bpm: 130 }),
    E('d_groove', 'Gains Groove', 'dance', 'level', 0, { dance: true, bpm: 116, lvl: 5 }), E('d_bop', 'Locked-In Bop', 'dance', 'start', 0, { dance: true, bpm: 100 }),
    E('d_strut', 'Main Character Strut', 'dance', 'comp', 0, { dance: true, bpm: 98, aura: 3 }), E('d_chop', 'Chopped Chop', 'dance', 'mystery', 0, { dance: true, bpm: 124 }),
    E('d_wave', 'Wave Rider', 'dance', 'shop', 85, { dance: true, bpm: 108 }), E('d_hype', 'Hype Bounce', 'dance', 'friend', 0, { dance: true, bpm: 140 }),
    E('d_disco', 'Disco Deadlift', 'dance', 'level', 0, { dance: true, bpm: 118, lvl: 8 }), E('d_moon', 'Moon Mog', 'dance', 'comp', 0, { dance: true, bpm: 100, aura: 4 }),
    E('d_twist', '2012 Twist', 'dance', 'shop', 75, { dance: true, bpm: 126 }), E('d_aura', 'Aura Farming', 'dance', 'friend', 0, { dance: true, bpm: 92, aura: 5 }),
    // walking emotes (modify locomotion)
    E('w_swagger', 'Swagger Walk', 'walk', 'start', 0, { walk: true }), E('w_hype', 'Hype Walk', 'walk', 'shop', 60, { walk: true }),
    E('w_phone', 'Phone Walk', 'walk', 'start', 0, { walk: true }), E('w_mog', 'Mog Strut', 'walk', 'comp', 0, { walk: true }), E('w_normal', 'Normal Walk', 'walk', 'start', 0, { walk: true }),
    // group
    E('g_line', 'Line Dance', 'group', 'start', 0, { group: true, base: 'd_shuffle' }), E('g_flex', 'Synchronised Flex', 'group', 'friend', 0, { group: true, base: 'flex' }),
    E('g_hype', 'Hype Circle', 'group', 'friend', 0, { group: true, base: 'd_hype' }), E('g_wave', 'Stadium Wave', 'group', 'comp', 0, { group: true, base: 'd_wave' })
  ];
  const emote = id => EMOTES.find(e => e.id === id);

  /* ---------------- GYM MACHINES ---------------- */
  const MACHINES = {
    bench: { n: 'Bench Press', game: 'timing', anim: 'bench', key: 'Space', desc: 'Press SPACE when the marker hits the green zone. Nail the timing to lock out each rep.', reps: 10 },
    squat: { n: 'Squat Rack', game: 'squat', anim: 'squat', key: 'Space', desc: 'Hold SPACE to descend and release in the green band to drive up. Keep the rhythm consistent.', reps: 8 },
    treadmill: { n: 'Treadmill', game: 'rhythm', anim: 'treadmill', key: 'A / D', desc: 'Tap the left/right prompts as they reach the line. Combos speed up the belt.', dur: 35 },
    bike: { n: 'Exercise Bike', game: 'pedal', anim: 'bike', key: 'A / D', desc: 'Pedal by alternating A and D in time with the cadence ring. Stay in the zone to build distance.', dur: 30 },
    rower: { n: 'Rowing Machine', game: 'rhythm2', anim: 'rower', key: 'W / S', desc: 'Drive (W) and recover (S) on the beat. Smooth strokes, big splits.', dur: 30 },
    dumbbell: { n: 'Dumbbells', game: 'sequence', anim: 'dumbbell', key: 'Arrows', desc: 'Memorise the arrow sequence, then repeat it. Each correct sequence is a rep.', reps: 8 },
    cable: { n: 'Cable Crossover', game: 'reaction', anim: 'cable', key: 'Arrows', desc: 'Hit the arrow that flashes on screen before the timer runs out.', reps: 16 },
    latpull: { n: 'Lat Pulldown', game: 'reaction', anim: 'latpull', key: 'Arrows', desc: 'Pull on the prompt! React to each flashing direction.', reps: 14 },
    legpress: { n: 'Leg Press', game: 'timing', anim: 'legpress', key: 'Space', desc: 'Time your drive with the moving marker. Heavier sets shrink the window.', reps: 10 },
    chestpress: { n: 'Chest Press', game: 'timing', anim: 'chestpress', key: 'Space', desc: 'Press on the green. Perfects build your combo.', reps: 10 },
    shoulderpress: { n: 'Shoulder Press', game: 'timing', anim: 'shoulderpress', key: 'Space', desc: 'Drive overhead on the green. Precision is aura.', reps: 10 },
    curl: { n: 'Bicep Curl Machine', game: 'sequence', anim: 'curl', key: 'Arrows', desc: 'Repeat the sequence to squeeze out reps. Sequences grow longer.', reps: 8 },
    pullup: { n: 'Pull-Up Bar', game: 'alternate', anim: 'pullup', key: 'Q / E', desc: 'Alternate Q and E on the beat to climb. Stay in rhythm as it speeds up.', reps: 10 },
    dips: { n: 'Dip Station', game: 'alternate', anim: 'dips', key: 'Q / E', desc: 'Alternate Q and E on the beat to push out dips.', reps: 10 },
    pushup: { n: 'Push-Up Mat', game: 'timing', anim: 'pushup', key: 'Space', desc: 'Push on the green. Outdoor gains hit different.', reps: 12 },
    punch: { n: 'Punching Bag', game: 'reaction', anim: 'punch', key: 'Arrows', desc: 'Throw the combo as it flashes.', reps: 14 }
  };

  // which body parts each machine trains: [primary, secondary]
  const MUSCLES = { chest: 'Chest', arms: 'Arms', back: 'Back', shoulders: 'Shoulders', legs: 'Legs', core: 'Core' };
  const TRAINS = { bench: [['chest'], ['arms', 'shoulders']], chestpress: [['chest'], ['arms']], pushup: [['chest', 'core'], ['arms']], dips: [['arms', 'chest'], ['shoulders']],
    dumbbell: [['arms'], ['shoulders']], curl: [['arms'], []], cable: [['chest', 'shoulders'], ['arms']], punch: [['arms', 'core'], ['shoulders']],
    latpull: [['back'], ['arms']], pullup: [['back', 'arms'], ['core']], rower: [['back'], ['legs', 'arms']], shoulderpress: [['shoulders'], ['arms']],
    squat: [['legs'], ['core', 'back']], legpress: [['legs'], []], treadmill: [['legs'], ['core']], bike: [['legs'], ['core']] };

  /* ---------------- FOOD / VENDING / COSMETICS ---------------- */
  const FOOD = {
    cafe: [
      { id: 'flatwhite', n: 'Flat White', price: 6, energy: 15, buff: null, d: 'Smooth. Australian. Correct.' },
      { id: 'matcha', n: 'Iced Matcha', price: 8, energy: 18, buff: 'focus', d: 'Wider timing windows for 1 hour.' },
      { id: 'croissant', n: 'Almond Croissant', price: 7, energy: 20, buff: null, d: 'Flaky. Worth it.' },
      { id: 'avotoast', n: 'Smashed Avo Toast', price: 16, energy: 35, buff: 'drip', d: '+Drip in fashion judging for 1 hour.' },
      { id: 'brekkie', n: 'Big Brekkie', price: 22, energy: 60, buff: 'xp', d: '+25% XP for 1 hour.' }
    ],
    protein: [
      { id: 'shake', n: 'Protein Shake', price: 9, energy: 25, buff: 'xp', d: '+25% XP for 1 hour.' },
      { id: 'bowl', n: 'Chicken Rice Bowl', price: 15, energy: 50, buff: null, d: 'The meal prep classic.' },
      { id: 'mogburger', n: 'The Mog Burger', price: 14, energy: 45, buff: 'hype', d: '+50% followers from posts for 1 hour.' },
      { id: 'acai', n: 'Açaí Bowl', price: 13, energy: 30, buff: 'focus', d: 'Wider timing windows for 1 hour.' },
      { id: 'creatine', n: 'Creatine Gummies', price: 5, energy: 10, buff: 'pump', d: '+20% workout score for 1 hour.' }
    ]
  };
  const VENDING = {
    drink: { n: 'HYDRO HOMIE', col: '#0ea5e9', items: [
      { id: 'v_water', n: 'Hydro Homie Water', price: 3, energy: 10 }, { id: 'v_sport', n: 'Electrolyte Blast', price: 5, energy: 20, buff: 'focus' },
      { id: 'v_energy', n: 'MOG Energy', price: 6, energy: 30, buff: 'pump' }, { id: 'v_pshake', n: 'RTD Protein', price: 7, energy: 25, buff: 'xp' }] },
    snack: { n: 'SNACK ATTACK', col: '#f97316', items: [
      { id: 'v_bar', n: 'Protein Bar', price: 4, energy: 15 }, { id: 'v_chips', n: 'Air-Fried Chips', price: 3, energy: 12 },
      { id: 'v_rice', n: 'Rice Cakes (Sad)', price: 2, energy: 8 }, { id: 'v_choc', n: 'Cheat Day Choc', price: 4, energy: 20, buff: 'hype' }] },
    mystery: { n: 'MYSTERY MOG', col: '#7b61ff', price: 50, items: [] },
    accessory: { n: 'DRIP DROP', col: '#ff4fa3', price: 35, items: [] },
    collectible: { n: 'FIGURE FRENZY', col: '#10b981', price: 25, items: [] }
  };
  const COLLECTIBLES = [
    { id: 'c_goldbell', n: 'Golden Dumbbell Figurine', r: 'rare' }, { id: 'c_ratking', n: 'Gym Rat King Statue', r: 'epic' }, { id: 'c_shaker', n: 'Vintage 2012 Shaker', r: 'common' },
    { id: 'c_npc', n: 'Bobblehead: Gary the NPC', r: 'common' }, { id: 'c_aura', n: 'Aura Crystal', r: 'rare' }, { id: 'c_cat', n: 'Lucky Swole Cat', r: 'common' },
    { id: 'c_vhs', n: '"Pump Up 2010" VHS', r: 'common' }, { id: 'c_mic', n: 'Golden Mic', r: 'rare' }, { id: 'c_sneaker', n: 'Mini Grail Sneaker', r: 'rare' },
    { id: 'c_globe', n: 'Mog City Snow Globe', r: 'common' }, { id: 'c_ufo', n: 'Tiny UFO (Unidentified Flexing Object)', r: 'epic' }, { id: 'c_frog', n: 'Hydrated Frog', r: 'common' }
  ];
  const COSMETICS = [
    { id: 'mask_sheet', n: 'Sheet Mask (Wearable)', type: 'mask', val: 'sheet', price: 3, d: 'Peak self-care energy. Wear it outside. Be brave.' },
    { id: 'mask_clay', n: 'Green Clay Mask', type: 'mask', val: 'clay', price: 3, d: 'Swamp monster but make it skincare.' },
    { id: 'mask_gold', n: '24K Gold Mask', type: 'mask', val: 'gold', price: 8, d: 'Shines under the arena lights.' },
    { id: 'freckles', n: 'Sun-Kissed Freckles', type: 'freckles', val: 0.7, price: 2, d: 'A cute scatter of freckles.' },
    { id: 'beauty', n: 'Beauty Mark', type: 'beauty', val: true, price: 2, d: 'Iconic.' },
    { id: 'paint_eye', n: 'Eye Black Stripes', type: 'paint', val: 'eyeblack', price: 3, d: 'Game day face.' },
    { id: 'paint_star', n: 'Star Sticker', type: 'paint', val: 'star', price: 4, d: 'A little sparkle on the cheek.' },
    { id: 'paint_flag', n: 'Mog City Face Paint', type: 'paint', val: 'city', price: 4, d: 'Green and gold. Civic pride.' },
    { id: 'glow', n: 'Glass Skin Glow', type: 'glow', val: 1, price: 6, d: 'Dewy sheen. Catches every light.' },
    { id: 'blush', n: 'Rosy Blush', type: 'blush', val: 0.6, price: 2, d: 'Healthy flush.' },
    { id: 'liner', n: 'Graphic Liner', type: 'liner', val: true, price: 4, d: 'Sharp enough to cut.' },
    { id: 'glitter', n: 'Festival Glitter', type: 'glitter', val: true, price: 5, d: 'Main character at the festival.' }
  ];
  const FACE_PRESETS = [
    { id: 'fp_sharp', n: 'Sharp & Defined', price: 10, set: { face: 'chiselled', cheek: 0.9, jaw: 1 } },
    { id: 'fp_soft', n: 'Soft & Friendly', price: 10, set: { face: 'round', cheek: 0.7, jaw: 0.85 } },
    { id: 'fp_hero', n: 'Leading Role', price: 12, set: { face: 'square', cheek: 0.6, jaw: 0.95, chin: 0.5 } },
    { id: 'fp_model', n: 'Runway', price: 12, set: { face: 'diamond', cheek: 1, jaw: 0.75, chin: 0.7 } },
    { id: 'fp_classic', n: 'Classic Oval', price: 8, set: { face: 'oval', cheek: 0.5, jaw: 0.78 } }
  ];
  const SKINCARE_STEPS = [
    { id: 'cleanse', n: 'Cleanser', col: '#9ad1ff', verb: 'Lather up' }, { id: 'tone', n: 'Toner', col: '#ffd6e7', verb: 'Pat in' },
    { id: 'serum', n: 'Glow Serum', col: '#ffe08a', verb: 'Three drops' }, { id: 'moist', n: 'Moisturiser', col: '#f4f4f2', verb: 'Smooth it on' },
    { id: 'spf', n: 'SPF 50', col: '#ffb86b', verb: 'Protect' }, { id: 'eye', n: 'Eye Cream', col: '#d8c3ff', verb: 'Dab gently' }, { id: 'mask', n: 'Sheet Mask', col: '#e8f5e9', verb: 'Apply' }
  ];

  /* ---------------- NPC CAST ---------------- */
  // pers: personality archetype drives dialogue; likes: what raises friendship; home: where they hang by time.
  const N = (id, name, role, pers, likes, a, outfit, sched, extra = {}) => Object.assign({ id, name, role, pers, likes, app: app(a), outfit, sched }, extra);
  const o = (top, bottom, shoes, acc = {}) => ({ top: { id: top[0], c: top[1] }, bottom: { id: bottom[0], c: bottom[1] }, shoes: { id: shoes[0], c: shoes[1] }, acc: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { id: v[0], c: v[1] }])) });
  const CAST = [
    N('chad', 'Chad Thunderbench', 'Gym Rival', 'rival', ['gym', 'banter'], { skin: '#efc39f', face: 'chiselled', eyeShape: 'hooded', eyeColor: '#3b6ea8', brow: 'angled', nose: 'straight', mouth: 'thin', hair: 'quiff', hairColor: '#c39a5a', facialHair: 'stubble', facialColor: '#c39a5a', height: 1.06, build: 0.7, shoulders: 0.9, muscle: 0.85 },
      o(['t_singlet_swoleforce', 3], ['b_gymshorts_swoleforce', 1], ['s_runner_swoleforce', 1], { eyes: ['a_glasses_shield', 0] }), { 6: 'gym', 13: 'gym', 18: 'arena', 21: 'plaza' }, { rival: true, title: 'Self-proclaimed Bench King' }),
    N('priya_t', 'Coach Priya', 'Personal Trainer', 'coach', ['gym', 'advice'], { skin: '#9a6440', face: 'oval', eyeShape: 'almond', eyeColor: '#3b2416', brow: 'high', nose: 'long', mouth: 'classic', hair: 'pony', hairColor: '#141110', height: 0.97, build: 0.45, shoulders: 0.55, muscle: 0.6 },
      o(['t_tank_basicbro', 1], ['b_trackpants_swoleforce', 1], ['s_runner_velocitee', 1], { wrist: ['a_watch_smart', 1], head: ['a_headband', 2] }), { 0: 'gym' }, { trainer: true, title: 'Iron Temple Head Coach' }),
    N('marcus', 'Marcus "Big Mac" Okafor', 'Gym Buddy', 'hype', ['gym', 'compliment'], { skin: '#4c2e22', face: 'round', eyeShape: 'round', eyeColor: '#2a1a12', brow: 'thick', nose: 'broad', mouth: 'full', hair: 'buzz', hairColor: '#141110', facialHair: 'full', height: 1.08, build: 0.95, shoulders: 0.9, muscle: 0.65 },
      o(['t_oversized_swoleforce_pc', 1], ['b_sweats_basicbro', 1], ['s_hightop_ballr', 1], { neck: ['a_chain_pendant', 1] }), { 7: 'gym', 12: 'protein', 16: 'outdoorgym', 20: 'plaza' }, { friend: true, title: 'World\'s Biggest Hype Man' }),
    N('kenji', 'Kenji Drip', 'Fashion Enthusiast', 'fashion', ['fashion', 'compliment'], { skin: '#f1d0b0', face: 'long', eyeShape: 'monolid', eyeColor: '#2a1a12', brow: 'thin', nose: 'straight', mouth: 'small', hair: 'curtains', hairColor: '#e6dcc2', height: 1.0, build: 0.3, shoulders: 0.35, muscle: 0.1 },
      o(['t_puffer_driplord', 0], ['b_baggyjeans_driplord', 3], ['s_hightop_driplord', 1], { eyes: ['a_glasses_rect', 0], neck: ['a_chain_rope', 1] }), { 9: 'dripdepot', 13: 'shopping', 17: 'cafe', 20: 'plaza' }, { friend: true, title: 'Has Opinions On Your Shoes' }),
    N('lola', 'Lola Vibes', 'Influencer', 'influencer', ['social', 'dance'], { skin: '#d4a074', face: 'heart', eyeShape: 'wide', eyeColor: '#5c7d4b', brow: 'soft', nose: 'snub', mouth: 'full', hair: 'wavy', hairColor: '#c39a5a', hairHi: '#ff4fa3', height: 0.95, build: 0.35, shoulders: 0.35, muscle: 0.15, cosmetics: { glow: 1, blush: 0.5, glitter: true } },
      o(['t_oversized_retrowave', 0], ['b_shorts_retrowave', 0], ['s_retro_retrowave', 0], { eyes: ['a_glasses_square', 3], back: ['a_bag_mini', 3] }), { 9: 'cafe', 12: 'shopping', 15: 'park', 19: 'plaza' }, { friend: true, title: '1.2M followers, 4 brand deals, 0 chill' }),
    N('tfade', 'Tyrone "T-Fade" Jackson', 'Barber', 'barber', ['banter', 'fashion'], { skin: '#5f3a29', face: 'square', eyeShape: 'almond', eyeColor: '#2a1a12', brow: 'straight', nose: 'wide', mouth: 'full', hair: 'fade', hairColor: '#141110', facialHair: 'short', height: 1.02, build: 0.6, shoulders: 0.6, muscle: 0.3 },
      o(['t_tee_threadco', 3], ['b_jeans_threadco', 1], ['s_sneaker_threadco', 3], { wrist: ['a_watch_classic', 0] }), { 0: 'barber' }, { worker: 'barber', title: 'Fade Factory Owner' }),
    N('meilin', 'Mei Lin', 'Skincare Specialist', 'calm', ['advice', 'compliment'], { skin: '#f1d0b0', face: 'oval', eyeShape: 'almond', eyeColor: '#3b2416', brow: 'soft', nose: 'button', mouth: 'bow', hair: 'bun', hairColor: '#141110', height: 0.93, build: 0.3, shoulders: 0.3, muscle: 0.05, cosmetics: { glow: 1 } },
      o(['t_longsleeve_aura', 2], ['b_sweats_aura', 2], ['s_lowtop_aura', 2], { wrist: ['a_bracelet_cuff', 0] }), { 0: 'glowlab' }, { worker: 'glowlab', title: 'Glow Lab Lead Esthetician' }),
    N('santi', 'Santiago "Santi" Reyes', 'Baller', 'chill', ['sport', 'banter'], { skin: '#c88b56', face: 'oval', eyeShape: 'almond', eyeColor: '#5a3a22', brow: 'soft', nose: 'straight', mouth: 'classic', hair: 'curlytop', hairColor: '#2a211d', facialHair: 'moustache', height: 1.04, build: 0.45, shoulders: 0.55, muscle: 0.35 },
      o(['t_jersey_ballr', 1], ['b_bballshorts_ballr', 1], ['s_hightop_ballr', 0], { head: ['a_headband', 0] }), { 8: 'court', 13: 'park', 17: 'court', 21: 'plaza' }, { friend: true, title: 'Has never missed a free throw (lie)' }),
    N('aaliyah', 'Aaliyah Brooks', 'Arena Rival', 'rival2', ['fashion', 'gym', 'banter'], { skin: '#734631', face: 'diamond', eyeShape: 'upturned', eyeColor: '#3b2416', brow: 'angled', nose: 'straight', mouth: 'full', hair: 'locs', hairColor: '#2a211d', hairHi: '#c39a5a', height: 1.0, build: 0.45, shoulders: 0.5, muscle: 0.5 },
      o(['t_jacket_aura', 1], ['b_cargo_driplord', 3], ['s_hightop_driplord', 0], { neck: ['a_chain_cuban', 0], eyes: ['a_glasses_square', 0] }), { 9: 'gym', 14: 'arena', 19: 'arena', 22: 'plaza' }, { rival: true, title: 'Two-time Mog-Off Champion' }),
    N('gary', 'Gary', 'Professional NPC', 'npc', ['banter'], { skin: '#e2b48a', face: 'round', eyeShape: 'round', eyeColor: '#7f7f86', brow: 'straight', nose: 'straight', mouth: 'thin', hair: 'crop', hairColor: '#7a6656', height: 0.99, build: 0.55, shoulders: 0.45, muscle: 0.1 },
      o(['t_tee_basicbro', 2], ['b_jeans_basicbro', 0], ['s_sneaker_basicbro', 0]), { 0: 'park', 12: 'shopping', 18: 'carpark' }, { friend: true, title: 'Walks in straight lines. Always.' }),
    N('dmitri', 'Dmitri Volkov', 'Powerlifter', 'gentle', ['gym', 'advice'], { skin: '#f6dcc8', face: 'square', eyeShape: 'hooded', eyeColor: '#6d9ac9', brow: 'thick', nose: 'roman', mouth: 'thin', hair: 'bald', facialHair: 'viking', facialColor: '#a85428', height: 1.1, build: 1, shoulders: 1, muscle: 0.95 },
      o(['t_tee_mogcity', 1], ['b_gymshorts_basicbro', 1], ['s_slides_basicbro', 1]), { 6: 'gym', 15: 'outdoorgym', 19: 'protein' }, { friend: true, title: 'Gentle Giant. Deadlifts small cars.' }),
    N('zara', 'Zara Khan', 'Threadlord Stylist', 'fashion', ['fashion', 'compliment'], { skin: '#a9714a', face: 'oval', eyeShape: 'almond', eyeColor: '#3b2416', brow: 'high', nose: 'long', mouth: 'bow', hair: 'long', hairColor: '#2a211d', height: 0.96, build: 0.35, shoulders: 0.35, muscle: 0.1 },
      o(['t_longsleeve_threadco', 1], ['b_jeans_threadco', 0], ['s_lowtop_aura', 0], { neck: ['a_chain_beads', 4] }), { 0: 'threadlord' }, { worker: 'threadlord', title: 'Threadlord Senior Stylist' }),
    N('sophie', 'Sophie Nguyen', 'Drip Depot Clerk', 'hype', ['fashion', 'social'], { skin: '#efc39f', face: 'heart', eyeShape: 'wide', eyeColor: '#3b2416', brow: 'soft', nose: 'button', mouth: 'classic', hair: 'spacebuns', hairColor: '#ff4fa3', height: 0.92, build: 0.3, shoulders: 0.3, muscle: 0.1 },
      o(['t_hoodie_retrowave', 0], ['b_cargo_retrowave', 1], ['s_retro_retrowave', 1]), { 0: 'dripdepot' }, { worker: 'dripdepot', title: 'Hype Curator' }),
    N('hiro', 'Hiro Tanaka', 'Barista', 'calm', ['advice', 'chill'], { skin: '#e2b48a', face: 'long', eyeShape: 'monolid', eyeColor: '#2a1a12', brow: 'straight', nose: 'straight', mouth: 'small', hair: 'manbun', hairColor: '#141110', facialHair: 'goatee', height: 1.0, build: 0.4, shoulders: 0.4, muscle: 0.15 },
      o(['t_tee_threadco', 2], ['b_jeans_threadco', 3], ['s_sneaker_basicbro', 1]), { 0: 'cafe' }, { worker: 'cafe', title: 'Latte Art Grandmaster' }),
    N('olu', 'Olu "The Voice" Adeyemi', 'Arena MC', 'hype', ['social', 'dance'], { skin: '#3c241a', face: 'chiselled', eyeShape: 'almond', eyeColor: '#2a1a12', brow: 'high', nose: 'broad', mouth: 'wide', hair: 'shortlocs', hairColor: '#141110', facialHair: 'goatee', height: 1.05, build: 0.55, shoulders: 0.6, muscle: 0.35 },
      o(['t_jacket_aura', 0], ['b_jeans_aura', 1], ['s_lowtop_aura', 3], { neck: ['a_chain_cuban', 0], eyes: ['a_glasses_aviator', 0] }), { 0: 'arena' }, { worker: 'arena', title: 'Voice of the Mog-Off' }),
    N('bianca', 'Bianca Rossi', 'Interior Designer', 'fashion', ['compliment', 'advice'], { skin: '#efc39f', face: 'oval', eyeShape: 'downturned', eyeColor: '#5c7d4b', brow: 'soft', nose: 'roman', mouth: 'full', hair: 'wavy', hairColor: '#6b4129', height: 0.97, build: 0.45, shoulders: 0.4, muscle: 0.1 },
      o(['t_longsleeve_aura', 0], ['b_jeans_threadco', 2], ['s_lowtop_aura', 2], { eyes: ['a_glasses_round', 0] }), { 0: 'nest' }, { worker: 'nest', title: 'Owner of Nest & Co' }),
    N('jamal', 'Jamal Carter', 'Gamer Neighbour', 'chill', ['banter', 'chill'], { skin: '#87553a', face: 'round', eyeShape: 'almond', eyeColor: '#2a1a12', brow: 'soft', nose: 'wide', mouth: 'classic', hair: 'twists', hairColor: '#141110', hairHi: '#66e0b5', height: 0.98, build: 0.5, shoulders: 0.45, muscle: 0.1 },
      o(['t_hoodie_basicbro', 1], ['b_sweats_basicbro', 2], ['s_slides_driplord', 0], { ears: ['a_phones_head', 2] }), { 0: 'residential', 14: 'cafe', 20: 'residential' }, { friend: true, title: 'Diamond rank in everything' }),
    N('rosa', 'Rosa Delgado', 'Vending Tycoon', 'chill', ['banter', 'advice'], { skin: '#c49a6c', face: 'round', eyeShape: 'round', eyeColor: '#5a3a22', brow: 'soft', nose: 'straight', mouth: 'classic', hair: 'curlymid', hairColor: '#3d2a1f', height: 0.9, build: 0.6, shoulders: 0.4, muscle: 0.05 },
      o(['t_tee_retrowave', 1], ['b_shorts_threadco', 0], ['s_sneaker_basicbro', 2], { head: ['a_bucket', 2] }), { 0: 'protein' }, { worker: 'protein', title: 'Protein Palace Manager' }),
    N('madame', 'Madame Aura', 'Judge', 'judge', ['fashion'], { skin: '#3c241a', face: 'diamond', eyeShape: 'almond', eyeColor: '#a07a3b', brow: 'high', nose: 'straight', mouth: 'bow', hair: 'afro', hairColor: '#e6dcc2', height: 1.0, build: 0.4, shoulders: 0.4, muscle: 0.1, cosmetics: { glow: 1, liner: true } },
      o(['t_jacket_aura', 1], ['b_sweats_aura', 1], ['s_lowtop_aura', 1], { neck: ['a_chain_cuban', 0], eyes: ['a_glasses_round', 0] }), { 0: 'arena' }, { judge: true, title: 'Head Judge — Aura & Fashion' }),
    N('brick', 'Coach Brick', 'Judge', 'coach', ['gym'], { skin: '#9a6440', face: 'square', eyeShape: 'hooded', eyeColor: '#3b2416', brow: 'thick', nose: 'wide', mouth: 'thin', hair: 'buzz', hairColor: '#b8b8bc', facialHair: 'moustache', facialColor: '#b8b8bc', height: 1.04, build: 0.85, shoulders: 0.9, muscle: 0.75 },
      o(['t_trackjacket_swoleforce', 1], ['b_trackpants_swoleforce', 1], ['s_runner_swoleforce', 1]), { 0: 'arena' }, { judge: true, title: 'Judge — Gains & Grit' }),
    N('djclout', 'DJ Clout', 'Judge', 'influencer', ['social', 'dance'], { skin: '#d4a074', face: 'long', eyeShape: 'wide', eyeColor: '#3f6b3a', brow: 'angled', nose: 'snub', mouth: 'wide', hair: 'spiky', hairColor: '#f2e6b0', height: 1.0, build: 0.4, shoulders: 0.4, muscle: 0.2 },
      o(['t_jersey_retrowave', 0], ['b_cargo_retrowave', 0], ['s_retro_retrowave', 0], { ears: ['a_phones_head', 1], eyes: ['a_glasses_shield', 4] }), { 0: 'arena' }, { judge: true, title: 'Judge — Clout & Rhythm' })
  ];

  // Personality dialogue packs. {n} = player name.
  const DIALOGUE = {
    rival: { greet: ['Oh look, it\'s {n}. Here to watch a real lift?', 'You\'re in my spot. Kidding. Unless...', 'Bro I benched before breakfast. What did YOU do?'],
      chat: ['I don\'t do cardio. My heart rate is naturally elite.', 'Mirror check every set. It\'s called quality control.', 'If you\'re not sore, did you even exist today?', 'I put "Bench King" on my LinkedIn. Recruiters are scared.'],
      like: ['Okay. That was decent. Don\'t let it go to your head.', 'Respect. Kinda. A little. Barely.'], dislike: ['Mid behaviour, honestly.', 'Chopped take, bro.'],
      advice: ['Advice? Lift heavier. Next question.', 'Eat. Sleep. Bench. Repeat. Ignore leg day — no wait, I\'m kidding, don\'t quote me.'] },
    coach: { greet: ['{n}! Ready to put in some honest reps?', 'Hydrated? Warmed up? Locked in? Let\'s go.', 'Form first, ego last. That\'s the rule.'],
      chat: ['Consistency beats intensity. Show up, every time.', 'Rest days are part of training, not a break from it.', 'Every machine in here has its own rhythm. Learn it.', 'Don\'t compare your chapter one to someone\'s chapter twenty.'],
      like: ['That\'s the attitude I like to see!', 'Love that energy. Keep it.'], dislike: ['Focus up. Less chat, more reps.', 'Hmm. Let\'s keep it positive, yeah?'],
      advice: ['Timing games reward patience. Wait for the green, don\'t chase it.', 'Treadmill tip: listen to the beat, not your panic.', 'Snack before a session. Energy matters for your score.', 'Daily challenges are free XP. Check your phone!'] },
    hype: { greet: ['YOOO {n}!! THE LEGEND HAS ARRIVED!', 'Look who it is!! Main character energy detected!', 'Ayy {n}! You look like you\'re about to win something!'],
      chat: ['Bro I\'m so proud of you and I don\'t even know what you did today.', 'You ever just walk in and feel the aura shift? That was you, just now.', 'I hyped up a pigeon earlier. It flew higher. Science.', 'Water break? Water break. Hydration is hype.'],
      like: ['LET\'S GOOOO!', 'That\'s my GUY/GAL/PAL! Unstoppable!'], dislike: ['Ha! Okay okay, I see you, cheeky.', 'Bro that one hurt but I still love you.'],
      advice: ['Post your wins! People wanna see the journey!', 'Group dances = instant friendships. Try one at the Plaza at night!', 'The arena crowd LOVES confidence. Strike a pose!'] },
    fashion: { greet: ['Hmm. Let me look at you. Hmm.', 'Oh, {n}! Turn around. Slowly. Okay.', 'Darling. Your fit. We need to talk. Lovingly.'],
      chat: ['Colour coordination is maths but prettier.', 'Accessories are the punctuation of an outfit.', 'Quiet luxury is loud if you listen.', 'Your shoes are the first thing judges notice. Then your aura.'],
      like: ['Stop it. You\'re making me blush.', 'Taste. Finally, someone with taste.'], dislike: ['That opinion is giving clearance rack.', 'I\'ll pretend I didn\'t hear that.'],
      advice: ['Fashion judges love two or three colours that harmonise. Not seven.', 'Match the theme with your tags — gym fits for gym themes, cozy for cozy.', 'One statement piece. Let it breathe.', 'Changing rooms exist for a reason. Use the mirror.'] },
    influencer: { greet: ['Omg hiii {n}! Wait, hold still, you\'re in my shot.', 'Hey bestie! Are you posting today?', '{n}!! We should totally collab.'],
      chat: ['Engagement is down 2% today. I\'m spiralling. Kidding. Mostly.', 'Golden hour at the park is ELITE for photos.', 'Short videos with dances get like 3x the views. Just saying.', 'I put my coffee on my story before I drank it. It went cold. Worth it.'],
      like: ['Literally iconic.', 'Okay you\'re so real for that.'], dislike: ['Hmm, not the vibe.', 'Unfollowing you in my heart. Jk. Maybe.'],
      advice: ['Post at night when the Plaza is busy — more eyes.', 'Wear sponsor brands in your posts, they track that!', 'Trending tags change daily. Check the feed.'] },
    barber: { greet: ['Welcome to the Factory. Sit down, we\'re fixing that.', '{n}! What are we doing today, something legendary?', 'My clippers are warm and ready.'],
      chat: ['A good fade fixes 80% of problems. The other 20% is a better fade.', 'People come in sad, leave dangerous.', 'I once gave a guy a lineup so sharp it cut the mirror.'],
      like: ['Ha! You\'re alright.', 'Now that\'s what I like to hear.'], dislike: ['Careful, I\'m holding scissors.', 'Hm. Bold of you.'],
      advice: ['Match your haircut to your face shape. Or don\'t. Rules are made to be faded.', 'Facial hair changes everything. Try a stubble.'] },
    calm: { greet: ['Welcome. Take a breath. You\'re doing great.', 'Hello, {n}. Peaceful day, isn\'t it?', 'Ah, hello again.'],
      chat: ['Hydration, sleep, sunscreen. The holy trinity.', 'Everything is better with a little patience.', 'Self-care isn\'t about looking different. It\'s about feeling good.'],
      like: ['That\'s kind of you.', 'You\'re very sweet.'], dislike: ['Mm. Let\'s breathe through that one.', 'Interesting choice of words.'],
      advice: ['Routines are about order. Cleanse first, protect last.', 'Rest in your bed restores your energy fully.'] },
    chill: { greet: ['Ayy, what\'s good {n}.', 'Sup. Vibes are decent today.', 'Oh hey. Didn\'t see you there. Just vibing.'],
      chat: ['Ever think about how basketballs are just orange planets.', 'I\'m not lazy, I\'m energy efficient.', 'Ranked is pain but I keep queueing.'],
      like: ['Haha, true.', 'You get it.'], dislike: ['Nah, that\'s wild.', 'Bro what.'],
      advice: ['The court\'s best at sunset. Nobody misses at sunset.', 'Mystery machines are a gamble. But the wins hit.'] },
    gentle: { greet: ['Hello, small friend. You lift today?', '{n}. Good to see you. You look strong.', 'Ah! Comrade of iron.'],
      chat: ['In my village, we lift tractors for fun. Here, I lift for joy.', 'Is important to stretch. Also is important to hug.', 'I have three cats. They are all named Deadlift.'],
      like: ['You are good person.', 'Ha ha! Yes!'], dislike: ['Hm. Is okay. Everybody has bad day.', 'I forgive. I am big, but heart is bigger.'],
      advice: ['Squat with rhythm. Down, pause, up. Like music.', 'Eat protein. Then eat more protein.'] },
    npc: { greet: ['Hello. Nice weather we are having.', 'Hello. Nice weather we are having.', 'Did you hear about the... no. Nice weather we are having.'],
      chat: ['I used to be a gym rat like you. Then I took a protein shake to the knee.', 'I walk this path every day. It is my purpose.', 'I have a strange feeling I\'ve said this before.', 'Error: dialogue not found. Nice weather we are having.'],
      like: ['Friendship +1. Wait, did I say that out loud?', 'Thank you. Nice weather we are having.'], dislike: ['That is unfortunate. Nice weather we are having.', '...'],
      advice: ['Have you tried walking in a straight line? It is very efficient.', 'Press E to talk to me. You already did. Excellent.'] },
    rival2: { greet: ['{n}. Thought you\'d be at the arena by now. Scared?', 'You again. Good. I need someone to beat today.', 'Nice fit. Mine\'s better. Respectfully.'],
      chat: ['Winning isn\'t everything. It\'s the only thing that\'s fun though.', 'My aura has aura.', 'I practise my victory pose more than my workouts. Priorities.'],
      like: ['Okay... you\'re not completely terrible.', 'Ha. Fair.'], dislike: ['Cute. See you on the scoreboard.', 'Keep talking, it fuels me.'],
      advice: ['Aura comps: variety beats spam. Mix your emotes.', 'Don\'t pick the same pose twice. Judges notice.'] },
    judge: { greet: ['Darling, the stage awaits.', 'I see potential. Raw. Unpolished. Delicious.', 'Hello, {n}.'],
      chat: ['Aura cannot be bought. But accessories help.', 'I have judged 412 competitions. I have cried at 3.'],
      like: ['Mm. Noted.', 'Charming.'], dislike: ['Points deducted. Emotionally.', 'Hm.'], advice: ['Enter the Rookie Night first. Build your reputation.'] }
  };

  /* ---------------- SPONSORS ---------------- */
  const SPONSORS = [
    { id: 'basicbro', brand: 'basicbro', n: 'BASIC BRO', type: 'Clothing', req: { followers: 0, rep: 0 }, pay: 120, followers: 50,
      pitch: 'We make shirts. You wear shirts. Synergy?', tasks: [{ evt: 'post', n: 1, wear: 'basicbro', txt: 'Post a photo wearing BASIC BRO' }, { evt: 'workout', n: 2, txt: 'Complete 2 workouts' }], reward: { item: null } },
    { id: 'hydro', brand: null, n: 'HYDRO HOMIE', type: 'Drinks', req: { followers: 150, rep: 0 }, pay: 180, followers: 80, col: '#0ea5e9',
      pitch: 'Stay hydrated, stay iconic. Show the city how you hydrate.', tasks: [{ evt: 'vending', n: 2, txt: 'Buy 2 drinks from Hydro Homie machines', filter: 'drink' }, { evt: 'video', n: 1, txt: 'Upload a short video' }], reward: { item: null } },
    { id: 'swoleforce', brand: 'swoleforce', n: 'SWOLEFORCE', type: 'Gym Equipment', req: { followers: 300, rep: 40 }, pay: 300, followers: 120,
      pitch: 'Our machines need a face. Your face. Specifically your pump.', tasks: [{ evt: 'workout', n: 4, txt: 'Complete 4 workouts at Iron Temple', filter: 'gym' }, { evt: 'workout_grade', n: 1, txt: 'Score an A or better on any machine', filter: 'A' }, { evt: 'post', n: 1, wear: 'swoleforce', txt: 'Post wearing SWOLEFORCE' }], reward: { item: 'x_singlet_' } },
    { id: 'velocitee', brand: 'velocitee', n: 'VELOCITEE', type: 'Sportswear', req: { followers: 600, rep: 80 }, pay: 450, followers: 200,
      pitch: 'Speed is a lifestyle. Run our campaign and run the city.', tasks: [{ evt: 'workout', n: 2, txt: 'Complete 2 cardio sessions (treadmill/bike/rower)', filter: 'cardio' }, { evt: 'distance', n: 600, txt: 'Walk/run 600 m around Mog City' }, { evt: 'video', n: 1, wear: 'velocitee', txt: 'Upload a video wearing VELOCITEE' }], reward: { item: 'x_hightop_' } },
    { id: 'glowup', brand: null, n: 'GLOWUP LABS', type: 'Skincare', req: { followers: 500, rep: 30 }, pay: 350, followers: 160, col: '#ffb3d1',
      pitch: 'Glass skin? Glass ceiling? Break both. Show your routine.', tasks: [{ evt: 'skincare', n: 2, txt: 'Complete 2 skincare routines at Glow Lab' }, { evt: 'post', n: 1, txt: 'Post a photo inside Glow Lab', where: 'glowlab' }], reward: { tokens: 10 } },
    { id: 'driplord', brand: 'driplord', n: 'DRIPLORD', type: 'Streetwear', req: { followers: 1200, rep: 120 }, pay: 800, followers: 400,
      pitch: 'We only work with the drippiest. Prove it on the runway and the feed.', tasks: [{ evt: 'comp_place', n: 1, txt: 'Place top 3 in a Fashion competition', filter: 'fashion' }, { evt: 'post', n: 2, wear: 'driplord', txt: 'Post 2 photos wearing DRIPLORD' }], reward: { item: 'x_oversized_' } },
    { id: 'couchking', brand: null, n: 'COUCHKING', type: 'Furniture', req: { followers: 800, rep: 60 }, pay: 400, followers: 150, col: '#a16207',
      pitch: 'Your apartment, our couches, your audience. Room tour time.', tasks: [{ evt: 'furniture', n: 3, txt: 'Place 3 furniture items in your apartment' }, { evt: 'post', n: 1, txt: 'Post a photo in your apartment', where: 'apartment' }], reward: { money: 200 } },
    { id: 'aurafm', brand: null, n: 'AURA FM', type: 'Events', req: { followers: 2000, rep: 250 }, pay: 1200, followers: 600, col: '#7b61ff',
      pitch: 'Headline our arena night. Win, dance, get the crowd screaming.', tasks: [{ evt: 'comp_win', n: 1, txt: 'Win any arena competition' }, { evt: 'group_emote', n: 1, txt: 'Lead a group emote with NPCs' }, { evt: 'video', n: 1, txt: 'Upload a dance video', filter: 'dance' }], reward: { emote: 'd_moon' } },
    { id: 'mogenergy', brand: null, n: 'MOG ENERGY', type: 'Drinks', req: { followers: 3500, rep: 400 }, pay: 2000, followers: 1000, col: '#a3e635',
      pitch: 'Unhinged energy for unhinged athletes. We want highlights.', tasks: [{ evt: 'comp_win', n: 2, txt: 'Win 2 competitions' }, { evt: 'workout_grade', n: 2, txt: 'Score S rank twice', filter: 'S' }, { evt: 'post', n: 2, txt: 'Post 2 photos' }], reward: { item: 'x_puffer_' } }
  ];

  /* ---------------- COMPETITIONS ---------------- */
  const COMP_TYPES = {
    gym: { n: 'Gym Showdown', icon: '🏋️', desc: 'Beat rivals\' scores on a randomly drawn machine.', judges: ['Workout performance', 'Accuracy & consistency', 'Timing & reactions', 'Objective completion'] },
    fashion: { n: 'Runway Riot', icon: '👟', desc: 'Style a fit to the theme, then walk the runway.', judges: ['Coordination', 'Theme creativity', 'Accessories', 'Colour play'] },
    dance: { n: 'Dance Battle', icon: '🕺', desc: 'Hit the arrows in rhythm while your character performs.', judges: ['Timing', 'Rhythm consistency', 'Performance', 'Required moves'] },
    aura: { n: 'Aura Check', icon: '✨', desc: 'Build a 5-move combo of emotes and perform it with style.', judges: ['Creativity & variety', 'Timing', 'Combo completion', 'Crowd reaction'] },
    social: { n: 'Clout Clash', icon: '📱', desc: 'Stage a photo for the theme: pose, location backdrop, filter and tags.', judges: ['Theme match', 'Drip', 'Pose', 'Hashtag game'] },
    group: { n: 'Squad Relay', icon: '👥', desc: 'Team up with two NPCs. Your rhythm leg decides the relay.', judges: ['Team sync', 'Your leg', 'Teammate bonus', 'Finish'] }
  };
  const TIERS = [
    { id: 'rookie', n: 'Rookie Night', rep: 0, fee: 0, prize: [150, 80, 40], xp: 120, rep_gain: [35, 20, 10], followers: [60, 30, 10], diff: 0.5, item: 'Certified Mogger Tee' },
    { id: 'circuit', n: 'City Circuit', rep: 150, fee: 30, prize: [400, 200, 90], xp: 260, rep_gain: [70, 40, 20], followers: [180, 90, 30], diff: 0.68, item: 'Mog-Off Champion Jacket' },
    { id: 'elite', n: 'Elite Invitational', rep: 450, fee: 80, prize: [1000, 450, 200], xp: 500, rep_gain: [130, 70, 35], followers: [450, 200, 80], diff: 0.82, item: 'Diamond Cuban' },
    { id: 'legends', n: 'Mog Legends Grand Final', rep: 1000, fee: 200, prize: [3000, 1200, 500], xp: 1000, rep_gain: [250, 120, 60], followers: [1500, 600, 200], diff: 0.92, item: 'Legends Jersey', item2: 'Mog Crown' }
  ];
  const FASHION_THEMES = [
    { n: 'Gym Rat Chic', tags: ['gym', 'sport'], d: 'Look like you lift. Even if you\'re just here for the smoothie.' },
    { n: 'Monochrome Menace', mono: true, tags: [], d: 'One colour family. Total commitment.' },
    { n: '2012 Forever', tags: ['retro', 'colour'], d: 'Neon, nostalgia and questionable choices.' },
    { n: 'Summer in Mog City', tags: ['summer'], d: 'Hot day, cold drip.' },
    { n: 'Cozy Season', tags: ['cozy'], d: 'Hoodies, layers and soft vibes.' },
    { n: 'Quiet Luxury', tags: ['luxury'], d: 'Expensive whispers, never shouts.' },
    { n: 'Streetwear Royalty', tags: ['street', 'hype'], d: 'Hype pieces only. Dress like the line around the block.' },
    { n: 'Colour Clash', clash: true, tags: ['colour'], d: 'Loud, bold and somehow coordinated.' },
    { n: 'Courtside', tags: ['sport', 'street'], d: 'Ready to hoop, ready to be photographed hooping.' }
  ];
  const SOCIAL_THEMES = [
    { n: 'Main Character Moment', tags: ['#maincharacter', '#aura', '#cinematic'] }, { n: 'Gym Glow Up', tags: ['#gymrat', '#gains', '#lockedin'] },
    { n: 'Fit Check', tags: ['#fitcheck', '#ootd', '#drip'] }, { n: 'Unhinged Energy', tags: ['#npc', '#chopped', '#unhinged'] }
  ];
  const HASHTAGS = ['#maincharacter', '#aura', '#cinematic', '#gymrat', '#gains', '#lockedin', '#fitcheck', '#ootd', '#drip', '#npc', '#chopped', '#unhinged', '#mogcity', '#vibes', '#mogging', '#sigma', '#2012', '#blessed'];
  const JUDGE_LINES = {
    great: ['That was MOGGING. Pure, uncut mogging.', 'Main Character Energy, confirmed.', 'Aura levels off the charts. Someone call a scientist.', 'Locked. In. I felt that in my soul.', 'The crowd is SHAKING.', 'Absolutely not chopped. The opposite of chopped.'],
    good: ['Solid. Respectable. Low-key aura.', 'Okay, I see you cooking.', 'Strong showing. Polish it and you\'re dangerous.', 'Not bad! The vibes were present.'],
    meh: ['Bit of NPC behaviour in there, darling.', 'It was... a choice.', 'Mid, but lovable mid.', 'You were giving tutorial level.'],
    bad: ['Chopped. Respectfully, chopped.', 'I\'m going to need you to lock in.', 'My grandmother has more aura, and she\'s asleep.', 'The crowd went to get snacks.']
  };
  const RIVAL_NAMES = ['Brayden Flex', 'Kai Momentum', 'Nova Steele', 'Rico Suave Jr.', 'Tash Ironside', 'Dex Aurafield', 'Jules Vantage', 'Bo Thunder', 'Indie Spark', 'Luca Glow', 'Rhea Quantum', 'Moe Mentum', 'Sasha Blitz', 'Ezra Stacks', 'Winnie Vibes', 'Theo Maxx'];

  /* ---------------- PROGRESSION ---------------- */
  const A = (id, n, d, stat, gte, reward = 50, icon = '🏆') => ({ id, n, d, stat, gte, reward, icon });
  const ACHIEVEMENTS = [
    A('first_rep', 'First Rep', 'Complete your first workout.', 'workouts', 1, 50, '💪'), A('ten_sessions', 'Regular', 'Complete 10 workouts.', 'workouts', 10, 150, '💪'),
    A('fifty_sessions', 'Gym Rat 2000', 'Complete 50 workouts.', 'workouts', 50, 500, '🐀'), A('all_machines', 'Machine Collector', 'Use 12 different machines.', 'machinesUsed', 12, 300, '⚙️'),
    A('s_rank', 'S-Tier Human', 'Score an S rank on any machine.', 'sRanks', 1, 200, '⭐'), A('s_rank5', 'Precision Engine', 'Score 5 S ranks.', 'sRanks', 5, 400, '⭐'),
    A('first_buy', 'Retail Therapy', 'Buy your first piece of clothing.', 'clothesBought', 1, 30, '🛍️'), A('wardrobe20', 'Closet Goblin', 'Own 20 clothing items.', 'wardrobeSize', 20, 300, '👕'),
    A('outfit_save', 'Fit Architect', 'Save an outfit preset.', 'outfitsSaved', 1, 40, '👔'), A('haircut', 'Fresh Cut', 'Get a haircut at Fade Factory.', 'haircuts', 1, 40, '💈'),
    A('haircut5', 'Hair Chameleon', 'Get 5 haircuts.', 'haircuts', 5, 150, '💈'), A('skincare', 'Glass Skin', 'Complete a skincare routine.', 'skincare', 1, 40, '🧴'),
    A('skincare10', 'Dermatologist\'s Dream', 'Complete 10 skincare routines.', 'skincare', 10, 250, '🧴'), A('first_post', 'Posted', 'Make your first social post.', 'posts', 1, 40, '📸'),
    A('posts20', 'Content Machine', 'Make 20 posts.', 'posts', 20, 300, '📸'), A('first_video', 'Going Viral (Eventually)', 'Upload a short video.', 'videos', 1, 50, '🎬'),
    A('f100', 'Micro Influencer', 'Reach 1,000 followers.', 'followers', 1000, 150, '👥'), A('f5k', 'Local Celebrity', 'Reach 5,000 followers.', 'followers', 5000, 400, '👥'),
    A('f25k', 'Mog City Icon', 'Reach 25,000 followers.', 'followers', 25000, 1000, '👑'), A('sponsor1', 'Brand Deal', 'Complete your first sponsorship.', 'sponsorsDone', 1, 150, '🤝'),
    A('sponsor5', 'Brand Ambassador', 'Complete 5 sponsorships.', 'sponsorsDone', 5, 500, '🤝'), A('comp1', 'Entered the Arena', 'Compete in the Mog-Off.', 'comps', 1, 60, '🎤'),
    A('win1', 'Mogger', 'Win a competition.', 'wins', 1, 200, '🥇'), A('win10', 'Undisputed', 'Win 10 competitions.', 'wins', 10, 800, '🥇'),
    A('allcomps', 'Renaissance Rat', 'Compete in all 6 competition types.', 'compTypes', 6, 400, '🎭'), A('legend', 'Mog Legend', 'Win the Mog Legends Grand Final.', 'legendWins', 1, 2000, '👑'),
    A('friend1', 'Squad Up', 'Reach friendship level 2 with anyone.', 'maxFriend', 2, 60, '🤜'), A('bestie', 'Bestie', 'Reach friendship level 5 with someone.', 'maxFriend', 5, 400, '💞'),
    A('talk20', 'Social Butterfly', 'Have 20 conversations.', 'talks', 20, 100, '💬'), A('group1', 'Flash Mob', 'Lead a group emote.', 'groupEmotes', 1, 80, '🕺'),
    A('emotes10', 'Expressive', 'Unlock 10 emotes.', 'emotesUnlocked', 10, 100, '😎'), A('dances10', 'Dance Machine', 'Unlock 10 dances.', 'dancesUnlocked', 10, 300, '💃'),
    A('furn1', 'Home Sweet Home', 'Place a piece of furniture.', 'furnPlaced', 1, 40, '🛋️'), A('furn10', 'Interior Designer', 'Place 10 pieces of furniture.', 'furnPlaced', 10, 250, '🛋️'),
    A('trophy3', 'Trophy Hunter', 'Collect 3 trophies.', 'trophies', 3, 200, '🏆'), A('vend10', 'Vending Addict', 'Use vending machines 10 times.', 'vending', 10, 100, '🥤'),
    A('mystery5', 'Gambler\'s Gains', 'Open 5 mystery capsules.', 'mystery', 5, 150, '🎁'), A('collect5', 'Collector', 'Own 5 collectibles.', 'collectibles', 5, 200, '🧸'),
    A('explore', 'Tourist', 'Visit 10 different locations.', 'visited', 10, 150, '🗺️'), A('explore_all', 'Mog City Local', 'Visit every location.', 'visited', 17, 500, '🗺️'),
    A('walk2k', 'Touch Grass', 'Walk 2 km around Mog City.', 'distance', 2000, 150, '🌿'), A('walk10k', 'Marathon Mogger', 'Walk 10 km.', 'distance', 10000, 400, '🌿'),
    A('bball10', 'Splash Brother', 'Make 10 basketball shots.', 'buckets', 10, 120, '🏀'), A('eat10', 'Bulking Season', 'Eat 10 meals.', 'meals', 10, 100, '🍔'),
    A('level5', 'Rising Star', 'Reach level 5.', 'level', 5, 150, '📈'), A('level10', 'Veteran', 'Reach level 10.', 'level', 10, 400, '📈'),
    A('level20', 'Final Form', 'Reach level 20.', 'level', 20, 1000, '📈'), A('rich', 'Bag Secured', 'Earn $10,000 lifetime.', 'lifetimeMoney', 10000, 300, '💰'),
    A('daily5', 'Daily Grinder', 'Complete 5 daily challenges.', 'dailiesDone', 5, 150, '📅'), A('weekly2', 'Week Warrior', 'Complete 2 weekly challenges.', 'weekliesDone', 2, 300, '📅'),
    A('sleep', 'Rest Day', 'Sleep in your bed.', 'sleeps', 1, 30, '🛏️'), A('photo_wall', 'Mirror Selfie', 'Take a photo in front of a mirror.', 'mirrorSelfies', 1, 40, '🪞')
  ];
  const CHALLENGES = {
    daily: [
      { id: 'd_work', t: 'Complete {n} workouts', evt: 'workout', n: [2, 3], r: 80 }, { id: 'd_post', t: 'Make {n} social posts', evt: 'post', n: [1, 2], r: 60 },
      { id: 'd_talk', t: 'Talk to {n} people', evt: 'talk', n: [3, 5], r: 50 }, { id: 'd_emote', t: 'Perform {n} emotes', evt: 'emote', n: [5, 8], r: 40 },
      { id: 'd_buy', t: 'Buy {n} item(s) at any store', evt: 'buy', n: [1, 2], r: 60 }, { id: 'd_eat', t: 'Eat or drink {n} times', evt: 'eat', n: [2, 3], r: 40 },
      { id: 'd_walk', t: 'Walk {n} m', evt: 'distance', n: [300, 600], r: 50 }, { id: 'd_bball', t: 'Make {n} baskets', evt: 'bucket', n: [3, 6], r: 60 },
      { id: 'd_cardio', t: 'Do {n} cardio session(s)', evt: 'workout', filter: 'cardio', n: [1, 2], r: 70 }, { id: 'd_grade', t: 'Score B or better {n} times', evt: 'workout_grade', filter: 'B', n: [1, 2], r: 80 },
      { id: 'd_video', t: 'Upload {n} short video', evt: 'video', n: [1, 1], r: 70 }, { id: 'd_skin', t: 'Do {n} skincare routine', evt: 'skincare', n: [1, 1], r: 50 },
      { id: 'd_vend', t: 'Use vending machines {n} times', evt: 'vending', n: [2, 3], r: 40 }
    ],
    weekly: [
      { id: 'w_comp', t: 'Compete in {n} arena events', evt: 'comp', n: [2, 3], r: 300 }, { id: 'w_work', t: 'Complete {n} workouts', evt: 'workout', n: [10, 15], r: 300 },
      { id: 'w_machines', t: 'Train on {n} different machines', evt: 'machine_new_week', n: [5, 7], r: 250 }, { id: 'w_posts', t: 'Earn {n} likes', evt: 'likes', n: [300, 800], r: 300 },
      { id: 'w_friend', t: 'Raise friendship {n} times', evt: 'friend_up', n: [3, 5], r: 250 }, { id: 'w_style', t: 'Buy {n} clothing items', evt: 'buy_clothing', n: [3, 5], r: 250 },
      { id: 'w_visit', t: 'Visit {n} different locations', evt: 'visit_new_week', n: [6, 9], r: 200 }, { id: 'w_win', t: 'Win {n} competition', evt: 'comp_win', n: [1, 2], r: 400 }
    ]
  };
  const xpForLevel = l => Math.round(200 + Math.pow(l, 1.55) * 120);

  /* ---------------- SOCIAL ---------------- */
  const HANDLES = ['gainzgoblin', 'mogcity_daily', 'npc_watcher', 'protein.princess', 'aura.analyst', 'legday.survivor', 'drip.detective', 'ratking2000', 'hydrated.hannah', 'sigma_steve', 'fitcheck_fiona', 'chopped_or_not', 'bench.bae', 'cardio_carl', 'vibes.only.vic', 'two_thousand_twelve', 'lowkey.luis', 'main.char.mia', 'bulk.season.ben', 'touchgrass.tara'];
  const COMMENTS = {
    general: ['W', 'this is cinema', 'main character energy fr', 'the aura is unreal', 'not chopped at all', 'mogging the whole city rn', 'okay but the lighting??', 'locked in 🔒', 'bro is HIM', 'certified W post', 'who let bro cook 🔥', 'I need this energy', 'lowkey iconic', 'npc could never', '10/10 no notes', 'saving this'],
    gym: ['PR incoming 💪', 'form check: elite', 'gym rat behaviour (positive)', 'spot me bro', 'the pump is real', 'rep count?? insane'],
    fashion: ['FIT CHECK PASSED', 'drip detected 💧', 'where is that from??', 'colour game insane', 'the shoes 😭', 'this fit is a lifestyle'],
    dance: ['the moves 😭', 'I tried this and fell over', 'choreo of the year', 'bro dances like rent is due', 'on repeat'],
    hater: ['mid', 'I\'ve seen better (I haven\'t)', 'ratio', 'npc behaviour', 'who asked (me, I did)']
  };
  const TRENDS = ['#MogShuffleChallenge', '#FitCheckFriday', '#LegDayLegends', '#AuraFarming', '#Plaza2Night', '#GlassSkinGang', '#BlacktopBuckets', '#2012Revival', '#NPCBehaviour', '#LockedInSeason'];

  /* ---------------- LOCATIONS ---------------- */
  const LOCATIONS = {
    gym: { n: 'Iron Temple Gym', d: 'Main gym: free weights, machines, cardio, changing room.', icon: '🏋️', music: 'gym' },
    threadlord: { n: 'Threadlord', d: 'Clothing store with a changing room.', icon: '👕', music: 'shop' },
    dripdepot: { n: 'Drip Depot', d: 'Streetwear and hype drops. Changing room inside.', icon: '🧢', music: 'shop' },
    solesurvivor: { n: 'Sole Survivor', d: 'Shoes and accessories.', icon: '👟', music: 'shop' },
    barber: { n: 'Fade Factory', d: 'Barber shop: haircuts, colours, facial hair, brows.', icon: '💈', music: 'barber' },
    glowlab: { n: 'Glow Lab', d: 'Skincare & cosmetic studio.', icon: '🧴', music: 'chill' },
    nest: { n: 'Nest & Co', d: 'Furniture & decor store.', icon: '🛋️', music: 'shop' },
    apartment: { n: 'Your Apartment', d: 'Home. Wardrobe, bed, TV, gaming setup, trophies.', icon: '🏠', music: 'home' },
    cafe: { n: 'Bean There Cafe', d: 'Coffee, brunch and buffs.', icon: '☕', music: 'chill' },
    protein: { n: 'Protein Palace', d: 'Food outlet. Shakes, bowls, the Mog Burger.', icon: '🍔', music: 'shop' },
    arena: { n: 'Aura Arena', d: 'Home of the Mog-Off competitions.', icon: '🎤', music: 'arena' },
    court: { n: 'The Blacktop', d: 'Outdoor basketball court.', icon: '🏀', music: null },
    park: { n: 'Sigma Park', d: 'Paths, pond, benches and good vibes.', icon: '🌳', music: null },
    plaza: { n: 'The Plaza', d: 'Social hub with a stage and fountain. Busy at night.', icon: '⛲', music: null },
    outdoorgym: { n: 'Cali Yard', d: 'Outdoor workout area: bars, dips, push-ups.', icon: '🤸', music: null },
    carpark: { n: 'Mog City Car Park', d: 'Parking. Also where Gary contemplates life.', icon: '🚗', music: null },
    residential: { n: 'Maple Rise', d: 'Residential neighbourhood and Mog Towers.', icon: '🏘️', music: null },
    shopping: { n: 'Drip Street', d: 'Shopping district.', icon: '🛍️', music: null }
  };

  const RADIO = { gym: { bpm: 128, key: 0, style: 'edm' }, shop: { bpm: 112, key: 5, style: 'pop' }, home: { bpm: 84, key: 2, style: 'lofi' }, arena: { bpm: 138, key: 7, style: 'arena' }, chill: { bpm: 90, key: 9, style: 'lofi' }, barber: { bpm: 94, key: 3, style: 'boom' }, menu: { bpm: 100, key: 4, style: 'synth' }, city: { bpm: 104, key: 0, style: 'city' }, dance: { bpm: 120, key: 2, style: 'edm' } };

  return { SKIN, HAIR_COLORS, EYE_COLORS, EYE_SHAPES, BROWS, NOSES, MOUTHS, FACE_SHAPES, EARS, HAIR, FACIAL_HAIR, STARTERS, app, BRANDS, PALETTES, SLOGANS, ITEMS, item,
    FURNITURE, EMOTES, emote, MACHINES, MUSCLES, TRAINS, FOOD, VENDING, COLLECTIBLES, COSMETICS, FACE_PRESETS, SKINCARE_STEPS, CAST, DIALOGUE, SPONSORS, COMP_TYPES, TIERS,
    FASHION_THEMES, SOCIAL_THEMES, HASHTAGS, JUDGE_LINES, RIVAL_NAMES, ACHIEVEMENTS, CHALLENGES, xpForLevel, HANDLES, COMMENTS, TRENDS, LOCATIONS, RADIO };
})();
