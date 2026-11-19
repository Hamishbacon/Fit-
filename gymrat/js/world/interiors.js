/* Interiors: Iron Temple gym, Threadlord, Drip Depot, Sole Survivor, Fade Factory, Glow Lab, Nest & Co, apartment, cafe, Protein Palace, Aura Arena. */
'use strict';
GR.Interiors = (() => {
  const U = GR.U, P = GR.Props, T = GR.Tex, W = GR.World, D = GR.Data;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let idx = 0;
  const mat = (tex, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.map, normalMap: tex.normalMap, roughness: r, metalness: m });

  function mk(id, opts) { const ox = 1000 + (idx++) * 120; const zn = W.zone(id, Object.assign({ indoor: true, name: D.LOCATIONS[id] ? D.LOCATIONS[id].n : id, music: D.LOCATIONS[id] ? D.LOCATIONS[id].music : null }, opts)); zn.ox = ox; return zn; }
  // place helpers in zone-local coords (offset by ox)
  const L = zn => ({
    add: (o, x, z, ry = 0, y = 0) => { o.position.set(zn.ox + x, y, z); o.rotation.y = ry; zn.group.add(o); return o; },
    box: (x, z, w, d, top = 2, bottom = 0, tag) => zn.boxC(zn.ox + x, z, w, d, top, bottom, tag),
    boxR: (x, z, w, d, ry, top = 2) => zn.boxR(zn.ox + x, z, w, d, ry, top),
    inter: (o) => { o.pos = V(zn.ox + o.x, o.y || 0, o.z); return zn.interact(o); },
    light: (x, y, z, c, i, d) => zn.light(zn.ox + x, y, z, c, i, d),
    seat: (x, z, ry, h, extra) => zn.seats.push(Object.assign({ x: zn.ox + x, z, ry, h }, extra || {})),
    spot: (x, z, kind, extra) => zn.npcSpots.push(Object.assign({ x: zn.ox + x, z, kind }, extra || {})),
    wall: (x, z, w, d, h = 3.2, m) => { const b = P.box(w, h, d, m || P.std('#e9e4da', 0.85), zn.ox + x, h / 2, z); zn.group.add(b); zn.boxC(zn.ox + x, z, w, d, h); return b; },
    panel: (tex, w, h, x, y, z, ry, glow) => W.panel(zn, tex, w, h, zn.ox + x, y, z, ry, glow),
    mirror: (w, h, x, y, z, ry, frame) => { const m = P.mirrorFrame(w, h, frame || '#2b2b2b', 512); m.position.set(zn.ox + x, y, z); m.rotation.y = ry; zn.group.add(m); zn.mirrors.push(m.userData.mirror); return m; }
  });
  function exitDoor(zn, l, x, z, ry, target = 'city') {
    const g = new THREE.Group(); P.box(2.2, 2.8, 0.12, P.std('#1b1b1d', 0.3, 0.6), 0, 1.4, 0, g); P.box(1.9, 2.6, 0.06, P.std('#bfe3ff', 0.1, 0.2, { emissive: new THREE.Color('#fff6dd'), emissiveIntensity: 0.6 }), 0, 1.3, 0.04, g);
    const ex = P.box(0.6, 0.22, 0.04, P.emissive('#34c759', 1.5), 0, 3.0, 0.05, g); l.add(g, x, z, ry);
    const fx = x + Math.sin(ry) * 1.3, fz = z + Math.cos(ry) * 1.3;
    l.inter({ id: zn.id + '_exit', x: fx, z: fz, r: 1.7, prompt: 'Exit to Mog City', action: () => GR.Game.exitZone(), kind: 'door' });
    zn.spawn = { x: zn.ox + fx, z: fz, ry };
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32), new THREE.MeshBasicMaterial({ color: 0x34c759, transparent: true, opacity: 0.55, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(zn.ox + fx, 0.02, fz); zn.group.add(ring);
  }
  function machineAt(zn, l, type, x, z, ry, i) {
    const m = P.machine(type); l.add(m.g, x, z, ry);
    const fp = { bench: [0.7, 1.5], squat: [1.4, 1.3], treadmill: [0.85, 2.0], bike: [0.5, 1.1], rower: [0.5, 2.5], dumbbell: [1.9, 0.6, 0, -0.9], cable: [2.9, 0.45], latpull: [0.6, 1.3], legpress: [1.0, 2.2, 0, 0.2], chestpress: [0.6, 1.0], shoulderpress: [0.6, 1.0], curl: [0.7, 1.2], pullup: [1.5, 0.4], dips: [0.7, 1.0], punch: [0.5, 0.5, 0, -0.15] }[type] || [1, 1];
    if (type === 'pullup' || type === 'cable' || type === 'squat') { for (const s of [-1, 1]) { const off = type === 'cable' ? 1.25 : type === 'squat' ? 0.62 : 0.7; const c = Math.cos(ry), sn = Math.sin(ry); l.box(x + s * off * c, z - s * off * sn, 0.4, 0.4, 2.3); } }
    else if (type !== 'dumbbell') { const c = Math.cos(ry), sn = Math.sin(ry), lx = fp[2] || 0, lz = fp[3] || 0; l.boxR(x + lx * c + lz * sn, z - lx * sn + lz * c, fp[0], fp[1], ry, type === 'treadmill' ? 0.14 : 0.9); if (type === 'treadmill') zn.boxes[zn.boxes.length - 1].tag = 'nocam'; }
    else { const c = Math.cos(ry), sn = Math.sin(ry); l.boxR(x + -0.9 * sn, z - 0.9 * c, 1.9, 0.55, ry, 1.0); }
    // interaction point: in front of the anchor
    const a = m.anchor, ax = x + a.x * Math.cos(ry) + a.z * Math.sin(ry), az = z - a.x * Math.sin(ry) + a.z * Math.cos(ry);
    const off = type === 'bench' ? 0.9 : type === 'rower' ? 0.9 : type === 'treadmill' ? 1.4 : 0.9;
    const dirx = Math.sin(ry + (type === 'bench' ? Math.PI : 0)), dirz = Math.cos(ry + (type === 'bench' ? Math.PI : 0));
    const ip = { id: zn.id + '_m' + i, x: ax + (type === 'treadmill' || type === 'rower' || type === 'bike' ? -Math.sin(ry) * off : dirx * off * 0.6), z: az + (type === 'treadmill' || type === 'rower' || type === 'bike' ? -Math.cos(ry) * off : dirz * off * 0.6), r: 1.5, prompt: 'Train: ' + D.MACHINES[type].n, action: () => GR.Mini.startWorkout(type, m), kind: 'machine', machine: m };
    l.inter(ip);
    m.world = { zone: zn.id, x: zn.ox + x, z, ry, y: 0 };
    zn.machines = zn.machines || []; zn.machines.push(m);
    return m;
  }

  /* ================= IRON TEMPLE GYM ================= */
  function gym() {
    const zn = mk('gym', { ambient: { sky: '#fff4e6', ground: '#4b4f57', intensity: 0.55, key: 0.7, keyDir: [6, 10, 3] } }), l = L(zn);
    const flo = mat(T.ENV.rubber([10, 7], '#2a2b2e'), 0.85);
    W.room(zn, { x1: zn.ox - 22, z1: -14, x2: zn.ox + 22, z2: 14, h: 6, floor: flo, wall: '#3b3f46', ceil: '#2b2d31', trim: '#d7261e' });
    // wood lifting platform zone & cardio carpet
    const wood = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), mat(T.ENV.wood([4, 3], '#9a6a3a'), 0.6)); wood.rotation.x = -Math.PI / 2; wood.position.set(zn.ox - 13, 0.01, -7.5); zn.group.add(wood);
    exitDoor(zn, l, 0, 13.9, Math.PI);
    // reception
    const desk = P.counter(4, '#d7261e', '#1b1b1d'); l.add(desk, 6, 10, Math.PI); l.box(6, 10, 4.1, 0.8, 1.05);
    l.panel(T.sign('IRON TEMPLE', { bg: '#111', fg: '#d7261e', w: 1024, h: 200, sub: 'NO EXCUSES • 24/7' }), 8, 1.6, 6, 4.4, 13.9, Math.PI, 0.6);
    l.inter({ id: 'gym_desk', x: 6, z: 8.9, r: 1.6, prompt: 'Front desk: Gym stats, records & challenges', action: () => GR.UI.gymDashboard(), kind: 'desk' });
    l.spot(6, 11, 'worker', { face: 0, role: 'gymdesk' });
    // free weights: benches + squat racks + dumbbells
    const list = [['bench', -18, -10, 0], ['bench', -14.5, -10, 0], ['squat', -10, -11, 0], ['squat', -6, -11, 0], ['dumbbell', -14, -3.2, 0], ['dumbbell', -9, -3.2, 0],
      ['cable', 2, -11.8, 0], ['latpull', 7, -11.5, 0], ['legpress', 11.5, -11, 0], ['chestpress', 15.5, -11.6, 0], ['shoulderpress', 18.8, -11.6, 0], ['curl', 15.5, -6.5, Math.PI],
      ['treadmill', 9, 3, Math.PI], ['treadmill', 11.5, 3, Math.PI], ['treadmill', 14, 3, Math.PI], ['bike', 17, 3.5, Math.PI], ['bike', 19, 3.5, Math.PI], ['rower', 5.5, 3, Math.PI], ['rower', 3, 3, Math.PI],
      ['pullup', -3, -12.6, 0], ['punch', -19, 2, Math.PI / 2]];
    list.forEach(([t, x, z, ry], i) => machineAt(zn, l, t, x, z, ry, i));
    // plate trees, kettlebells, racks decor
    for (const x of [-20.5, -1.5]) { const tree = new THREE.Group(); P.cyl(0.05, 0.05, 1.3, P.chrome(), 0, 0.65, 0, tree); for (let k = 0; k < 4; k++) { const p = P.plate(0.24 - k * 0.03, 0.05, k % 2 ? '#c0392b' : '#1b1b1d'); p.rotation.y = Math.PI / 2; p.position.set(k % 2 ? 0.12 : -0.12, 0.35 + Math.floor(k / 2) * 0.5, 0); tree.add(p); } l.add(tree, x, -6.5); l.box(x, -6.5, 0.6, 0.6, 1.3); }
    for (let i = 0; i < 6; i++) { const kb = new THREE.Group(); P.mesh(G_sphere(0.12), P.std(['#d7261e', '#1b4dff', '#10b981', '#f59e0b', '#7b2cbf', '#111'][i], 0.5, 0.3), 0, 0.12, 0, 0, 0, 0, kb); P.mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), P.std('#111', 0.4, 0.6), 0, 0.24, 0, 0, 0, 0, kb); l.add(kb, -5 + i * 0.4, -6.2); }
    // big mirror wall (free weights) + smaller mirrors
    l.mirror(16, 2.6, -12, 1.9, -13.9, 0, '#111');
    l.mirror(6, 2.2, 13, 1.7, -13.9, 0, '#111');
    // posters & clock
    [['LEG DAY', '#d7261e', '#1b1b1d', 'NEVER SKIP'], ['LOCKED IN', '#1b4dff', '#111', 'FOCUS'], ['BULK SZN', '#10b981', '#111', 'EAT • LIFT • SLEEP'], ['PR OR DIE', '#f59e0b', '#111', '(PLEASE DON\'T DIE)']].forEach((p, i) => l.panel(T.poster(...p), 1.4, 2, -21.9, 2.7, -8 + i * 4.5, Math.PI / 2, 0.15));
    l.panel(T.sign('🕒', { bg: '#f4f4f2', fg: '#111', w: 128, h: 128 }), 0.8, 0.8, 0, 4.5, -13.9, 0, 0.2);
    // changing room (east side) z 6..14, x 15..22
    l.wall(14.8, 9.5, 0.15, 7.5, 3.2, P.std('#cfd8dc', 0.7));
    l.wall(20, 5.8, 4, 0.15, 3.2, P.std('#cfd8dc', 0.7)); // doorway gap at x 14.8..18
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(7, 8), mat(T.ENV.tile([7, 8], '#e8f1f5', '#9fb4c0'), 0.4)); tiles.rotation.x = -Math.PI / 2; tiles.position.set(zn.ox + 18.5, 0.012, 10); zn.group.add(tiles);
    const lk = P.lockers(6, '#2c5d8f'); l.add(lk, 18.5, 13.6, Math.PI); l.box(18.5, 13.6, 2.6, 0.55, 1.9); zn.lockers = lk;
    l.inter({ id: 'gym_locker', x: 18.5, z: 12.5, r: 1.5, prompt: 'Locker: change outfit (wardrobe)', action: () => GR.Shops.wardrobe({ lockers: lk }), kind: 'wardrobe' });
    const bnch = P.box(2.4, 0.08, 0.45, P.std('#7c4a2d', 0.6), zn.ox + 18.5, 0.45, 10.4); zn.group.add(bnch); l.box(18.5, 10.4, 2.4, 0.45, 0.48); l.seat(18, 10.4, Math.PI, 0.5); l.seat(19.2, 10.4, 0, 0.5);
    l.mirror(1.6, 2.0, 21.9, 1.5, 9.3, -Math.PI / 2, '#d9d9de');
    // showers
    for (let i = 0; i < 3; i++) { const sx = 15.6 + i * 0.01, sz = 6.8 + i * 1.3; const head = P.cyl(0.1, 0.12, 0.05, P.chrome(), zn.ox + 21.7, 2.3, sz); head.rotation.z = Math.PI / 2; zn.group.add(head); P.box(0.04, 2.2, 1.2, P.std('#bfe3ff', 0.05, 0.1, { transparent: true, opacity: 0.3 }), zn.ox + 20.9, 1.1, sz + 0.6, zn.group); }
    l.inter({ id: 'gym_shower', x: 21, z: 7.6, r: 1.4, prompt: 'Shower (+energy, fresh vibes)', action: () => GR.Game.shower(), kind: 'misc' });
    l.panel(T.sign('CHANGE ROOM', { bg: '#2c5d8f', fg: '#fff', w: 512, h: 96 }), 2.2, 0.45, 16.5, 2.9, 5.7, Math.PI, 0.4);
    // water fountain + vending + recovery area
    const wf = new THREE.Group(); P.box(0.5, 1.0, 0.35, P.std('#c0c0c0', 0.25, 0.8), 0, 0.5, 0, wf); P.box(0.45, 0.06, 0.3, P.std('#e0e0e0', 0.2, 0.9), 0, 1.0, 0.03, wf); l.add(wf, -21.6, 8, Math.PI / 2); l.box(-21.6, 8, 0.4, 0.5, 1);
    l.inter({ id: 'gym_water', x: -20.8, z: 8, r: 1.2, prompt: 'Water fountain (+5 energy)', action: () => GR.Game.drinkWater(), kind: 'misc' });
    const vm = P.vending('drink'); l.add(vm, -21.4, 11, Math.PI / 2); l.box(-21.4, 11, 0.8, 1.0, 2);
    l.inter({ id: 'gym_vend', x: -20.2, z: 11, r: 1.4, prompt: 'Use HYDRO HOMIE machine', action: () => GR.Shops.vending('drink', vm), kind: 'vend' });
    for (let i = 0; i < 3; i++) { const ch = P.furniture(D.FURNITURE.find(f => f.id === 'beanbag'), i); l.add(ch, -16 + i * 1.6, 11.5); l.box(-16 + i * 1.6, 11.5, 0.8, 0.8, 0.5); l.seat(-16 + i * 1.6, 11.5, Math.PI, 0.45); }
    for (let i = 0; i < 4; i++) { const roll = P.cyl(0.08, 0.08, 0.5, P.std(['#1b4dff', '#10b981', '#ef4444', '#111'][i], 0.7), zn.ox - 12 + i * 0.3, 0.08, 12); roll.rotation.z = Math.PI / 2; zn.group.add(roll); }
    // lights
    [[-12, -7], [6, -7], [12, 4], [-10, 6], [18, 10]].forEach(([x, z]) => l.light(x, 5.4, z, '#fff1dc', 1.2, 18));
    // NPC workout spots (machines filled by NPC manager)
    W.marker('gymi', 'Iron Temple', 0, 0);
    return zn;
  }
  const G_sphere = r => new THREE.SphereGeometry(r, 12, 10);

  /* ================= CLOTHING STORES ================= */
  function clothingStore(id, theme) {
    const zn = mk(id, { ambient: { sky: theme.sky, ground: theme.ground, intensity: 0.7, key: 0.45, keyDir: [2, 8, 5] } }), l = L(zn);
    const floor = theme.floorTex;
    W.room(zn, { x1: zn.ox - 13, z1: -9, x2: zn.ox + 13, z2: 9, h: 4.2, floor, wall: theme.wall, ceil: theme.ceil, trim: theme.trim });
    exitDoor(zn, l, -6, 8.9, Math.PI);
    l.panel(T.sign(theme.title, { bg: theme.signBg, fg: theme.signFg, w: 1024, h: 200, sub: theme.sub }), 7, 1.4, 0, 3.4, -8.95, 0, 0.6);
    const items = D.ITEMS.filter(i => i.store === id);
    const tops = items.filter(i => i.slot === 'top'), bots = items.filter(i => i.slot === 'bottom'), shoes = items.filter(i => i.slot === 'shoes'), accs = items.filter(i => !['top', 'bottom', 'shoes'].includes(i.slot));
    // counter + staff
    const ctr = P.counter(3, theme.counter, '#f4f1ea'); l.add(ctr, 9, 6.5, Math.PI); l.box(9, 6.5, 3.1, 0.8, 1.05);
    l.inter({ id: id + '_ctr', x: 9, z: 5.4, r: 1.6, prompt: 'Browse the full catalogue', action: () => GR.Shops.store(id, 'all'), kind: 'shop' });
    l.spot(9, 7.6, 'worker', { face: 0, role: id });
    if (id !== 'solesurvivor') {
      // racks
      const racks = [[-9, -5, 0, tops.slice(0, 7), 'top'], [-9, -1, 0, tops.slice(7, 14).length ? tops.slice(7, 14) : tops.slice(0, 7), 'top'], [-3, -5, 0, bots.slice(0, 7), 'bottom'], [-3, -1, 0, bots.slice(4, 11).length ? bots.slice(4, 11) : bots, 'bottom']];
      racks.forEach(([x, z, ry, its, cat], i) => { if (!its.length) return; const r = P.clothingRack(its); l.add(r, x, z, ry); l.box(x, z, 1.9, 0.5, 1.6); l.inter({ id: id + '_rack' + i, x, z: z + 1.0, r: 1.4, prompt: 'Browse ' + (cat === 'top' ? 'Tops' : 'Bottoms'), action: () => GR.Shops.store(id, cat), kind: 'shop' }); });
      // mannequins wearing store outfits
      const mq = [];
      for (let i = 0; i < 3; i++) { const t = tops[(i * 3) % tops.length], b = bots[(i * 2) % bots.length], s = D.ITEMS.filter(x => x.slot === 'shoes')[i * 3]; const m = P.mannequin({ top: { id: t.id, c: i }, bottom: { id: b.id, c: i }, shoes: { id: s.id, c: i }, acc: {} }); l.add(m.root, 2.5 + i * 2.2, -6.8, 0, 0.06); l.box(2.5 + i * 2.2, -6.8, 0.6, 0.6, 1.8); mq.push(m); m.anim.play(['cross', 'mewing', 'peace'][i]); m.update(1); m.anim.update(2); }
      zn.mannequins = mq;
      l.inter({ id: id + '_mq', x: 4.7, z: -5.2, r: 2.2, prompt: 'Shop the mannequin looks', action: () => GR.Shops.store(id, 'looks'), kind: 'shop' });
      // display table with folded tees
      const tbl = new THREE.Group(); P.box(2.4, 0.8, 1.2, P.std(theme.counter, 0.5), 0, 0.4, 0, tbl, 0.02); tops.slice(0, 6).forEach((t, i) => { P.box(0.35, 0.06, 0.3, new THREE.MeshStandardMaterial({ map: T.clothing(t, t.colors[i % t.colors.length], 'torso'), roughness: 0.9 }), -0.9 + (i % 3) * 0.9, 0.84 + Math.floor(i / 3) * 0.07, (i % 2) * 0.3 - 0.15, tbl); }); l.add(tbl, 3, 1.5); l.box(3, 1.5, 2.4, 1.2, 0.85);
      l.inter({ id: id + '_tbl', x: 3, z: 2.7, r: 1.4, prompt: 'Browse new arrivals', action: () => GR.Shops.store(id, 'new'), kind: 'shop' });
      // changing room area (east) with 3 cubicles + big mirror + benches + lockers
      l.panel(T.sign('CHANGING ROOMS', { bg: theme.signBg, fg: theme.signFg, w: 512, h: 96 }), 3, 0.55, 10, 3.5, -8.95, 0, 0.5);
      for (let i = 0; i < 3; i++) { const cb = P.changingCubicle(theme.curtain); l.add(cb, 7 + i * 1.75, -8.0, 0); l.box(7 + i * 1.75 - 0.8, -8.0, 0.1, 1.6, 2.3); l.box(7 + i * 1.75 + 0.8, -8.0, 0.1, 1.6, 2.3); zn.mirrors.push(cb.userData.mirror); (zn.cubicles = zn.cubicles || []).push(cb); l.inter({ id: id + '_cub' + i, x: 7 + i * 1.75, z: -6.6, r: 1.0, prompt: 'Changing room: try on & equip outfits', action: () => GR.Shops.changingRoom(id, cb), kind: 'wardrobe' }); }
      l.mirror(2.4, 2.4, 12.9, 1.5, -4, -Math.PI / 2, theme.trim);
      const bn = P.box(2, 0.08, 0.5, P.std('#7c4a2d', 0.6), zn.ox + 10.5, 0.45, -3.6); zn.group.add(bn); l.box(10.5, -3.6, 2, 0.5, 0.48); l.seat(10, -3.6, 0, 0.5); l.seat(11, -3.6, 0, 0.5);
      const lk = P.lockers(3, theme.curtain); l.add(lk, 12.6, -1.0, -Math.PI / 2); l.box(12.6, -1.0, 0.55, 1.3, 1.9);
      l.inter({ id: id + '_lock', x: 11.5, z: -1, r: 1.3, prompt: 'Locker: your wardrobe & saved outfits', action: () => GR.Shops.wardrobe({ lockers: lk }), kind: 'wardrobe' });
      // accessory shelf
      const sh = new THREE.Group(); P.box(1.6, 1.4, 0.4, P.std(theme.counter, 0.5), 0, 0.7, 0, sh); for (let i = 0; i < 6; i++) P.box(0.18, 0.12, 0.18, P.std(U.pick(['#111', '#e8c45a', '#ff4fa3', '#1b4dff', '#f4f4f2']), 0.3, 0.5), -0.55 + (i % 3) * 0.55, 1.47 + Math.floor(i / 3) * 0.0, -0.05 + Math.floor(i / 3) * 0.12, sh); l.add(sh, -11.5, 4, Math.PI / 2); l.box(-11.5, 4, 0.45, 1.6, 1.5);
    } else {
      // shoe walls + accessory cases + try-on benches
      const sAll = shoes;
      [[-8, -8.6, 0], [-3, -8.6, 0], [2, -8.6, 0]].forEach(([x, z, ry], i) => { const sh = P.shoeShelf(sAll.slice(i * 5, i * 5 + 5).concat(sAll.slice(0, 10)).slice(0, 15)); l.add(sh, x, z, ry); l.box(x, z, 2.1, 0.5, 2.2); l.inter({ id: id + '_shoe' + i, x, z: z + 1.4, r: 1.6, prompt: 'Browse sneakers', action: () => GR.Shops.store(id, 'shoes'), kind: 'shop' }); });
      for (let i = 0; i < 3; i++) { const cs = new THREE.Group(); P.box(1.4, 0.9, 0.7, P.std('#1b1b1d', 0.4, 0.3), 0, 0.45, 0, cs); P.box(1.36, 0.4, 0.66, P.std('#bfe3ff', 0.05, 0.1, { transparent: true, opacity: 0.3 }), 0, 1.1, 0, cs); for (let k = 0; k < 3; k++) P.mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 14), P.std(['#e8c45a', '#d9d9de', '#c48b6a'][k], 0.2, 0.95), -0.4 + k * 0.4, 0.98, 0, Math.PI / 2, 0, 0, cs); l.add(cs, -8 + i * 3.5, 2.5); l.box(-8 + i * 3.5, 2.5, 1.4, 0.7, 1.3); l.inter({ id: id + '_acc' + i, x: -8 + i * 3.5, z: 3.6, r: 1.4, prompt: 'Browse accessories', action: () => GR.Shops.store(id, 'acc'), kind: 'shop' }); }
      for (let i = 0; i < 2; i++) { const b = P.box(2, 0.42, 0.6, P.std('#d9b26b', 0.7), zn.ox - 4 + i * 4, 0.21, -3.5); zn.group.add(b); l.box(-4 + i * 4, -3.5, 2, 0.6, 0.42); l.seat(-4 + i * 4, -3.5, Math.PI, 0.45); }
      l.mirror(1.0, 1.4, 6.5, 0.9, -8.9, 0, '#d9b26b');
      l.inter({ id: id + '_mirror', x: 6.5, z: -7.6, r: 1.3, prompt: 'Mirror: change outfit', action: () => GR.Shops.wardrobe({}), kind: 'wardrobe' });
      const caps = new THREE.Group(); for (let i = 0; i < 8; i++) { const c = P.mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, U.TAU, 0, Math.PI / 2), P.std(U.pick(D.PALETTES.sport), 0.7), -0.9 + (i % 4) * 0.6, 1.2 + Math.floor(i / 4) * 0.5, 0, 0, 0, 0, caps); } P.box(2.4, 1.5, 0.1, P.std('#f4f1ea', 0.6), 0, 1.3, -0.1, caps); l.add(caps, 11, -2, -Math.PI / 2); l.box(12.8, -2, 0.3, 2.4, 2);
    }
    // ceiling spot lights
    [[-6, -3], [4, -4], [8, 3], [-6, 5]].forEach(([x, z]) => l.light(x, 3.8, z, theme.light, 1.0, 12));
    return zn;
  }

  /* ================= FADE FACTORY (barber) ================= */
  function barber() {
    const zn = mk('barber', { ambient: { sky: '#fff1dc', ground: '#5b3a2e', intensity: 0.65, key: 0.5, keyDir: [3, 8, 4] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 9, z1: -7, x2: zn.ox + 9, z2: 7, h: 3.8, floor: mat(T.ENV.tile([9, 7], '#f4f4f2', '#111'), 0.4), wall: '#e9e4da', ceil: '#2b2b2b', trim: '#7f1d1d' });
    // checker floor override
    const chk = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), new THREE.MeshStandardMaterial({ map: T.memo('checker', () => { const c = T.canvas(256, 256), x = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f2'; x.fillRect(i * 32, j * 32, 32, 32); } const t = T.toTex(c, [4, 3]); return t; }), roughness: 0.3 })); chk.rotation.x = -Math.PI / 2; chk.position.set(zn.ox, 0.005, 0); zn.group.add(chk);
    exitDoor(zn, l, -4, 6.9, Math.PI);
    l.panel(T.sign('FADE FACTORY', { bg: '#111', fg: '#ef4444', w: 1024, h: 200, sub: 'SHARP CUTS • SHARPER BANTER' }), 6, 1.2, 0, 3.0, -6.95, 0, 0.6);
    const chairs = [];
    for (let i = 0; i < 2; i++) { const x = -3 + i * 5; l.mirror(1.6, 1.4, x, 1.7, -6.9, 0, '#d9b26b'); const st = P.box(2.2, 0.9, 0.5, P.std('#3b2416', 0.6), zn.ox + x, 0.45, -6.6); zn.group.add(st); l.box(x, -6.6, 2.2, 0.5, 0.92); for (let k = 0; k < 4; k++) { const b = P.bottle(['#2ecc71', '#3498db', '#e74c3c', '#f1c40f'][k], 0.16, 'FADE'); b.position.set(zn.ox + x - 0.7 + k * 0.45, 0.9, -6.6); zn.group.add(b); }
      const ch = P.barberChair(); l.add(ch, x, -4.6, Math.PI); l.box(x, -4.6, 0.7, 0.7, 0.5); chairs.push({ x: zn.ox + x, z: -4.6 }); l.inter({ id: 'barber_chair' + i, x, z: -3.6, r: 1.4, prompt: 'Get a haircut (hair, colour, beard, brows)', action: () => GR.Shops.barber(i), kind: 'shop' }); }
    zn.chairs = chairs;
    l.spot(-1.8, -4.0, 'worker', { face: Math.PI * 0.75, role: 'barber' });
    // waiting bench + magazine table + counter
    for (let i = 0; i < 3; i++) { const c = P.furniture(D.FURNITURE.find(f => f.id === 'armchair'), 0); c.scale.setScalar(0.85); l.add(c, -7.6, -1 + i * 1.6, Math.PI / 2); l.box(-7.6, -1 + i * 1.6, 0.8, 0.8, 0.5); l.seat(-7.6, -1 + i * 1.6, Math.PI / 2, 0.42); }
    const ctr = P.counter(2.4, '#3b2416', '#d9b26b'); l.add(ctr, 6, 4.5, -Math.PI / 2); l.box(6, 4.5, 0.8, 2.5, 1.05);
    l.panel(T.poster('THE CUTS', '#111', '#7f1d1d', 'FADE • TAPER • BUZZ'), 1.2, 1.7, 8.95, 1.9, -1, -Math.PI / 2, 0.15);
    l.panel(T.poster('2011', '#d9b26b', '#3b2416', 'SINCE FOREVER'), 1.2, 1.7, 8.95, 1.9, 1.5, -Math.PI / 2, 0.15);
    const pl = new THREE.Group(); P.cyl(0.12, 0.12, 1.1, P.std('#fff'), 0, 0, 0, pl); l.add(pl, 8.7, 6.3, 0, 1.8);
    [[-2, -3], [3, -3], [0, 3]].forEach(([x, z]) => l.light(x, 3.4, z, '#ffe8c4', 1.0, 10));
    return zn;
  }

  /* ================= GLOW LAB ================= */
  function glowlab() {
    const zn = mk('glowlab', { ambient: { sky: '#fff5fa', ground: '#d8c3ff', intensity: 0.8, key: 0.4, keyDir: [2, 8, 5] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 10, z1: -7, x2: zn.ox + 10, z2: 7, h: 3.8, floor: mat(T.ENV.marble([5, 4], '#f7f0f4'), 0.2, 0.05), wall: '#fbeff5', ceil: '#ffffff', trim: '#d8c3ff' });
    exitDoor(zn, l, -5, 6.9, Math.PI);
    l.panel(T.sign('GLOW LAB', { bg: ['#ffd6e7', '#d8c3ff'], fg: '#5b2a6e', w: 1024, h: 200, sub: 'SKINCARE • COSMETICS • GLASS SKIN' }), 6, 1.2, 0, 3.0, -6.95, 0, 0.5);
    // product shelves (back wall)
    const steps = D.SKINCARE_STEPS;
    for (let s = 0; s < 3; s++) { const sh = new THREE.Group(); P.box(2.6, 2.2, 0.4, P.std('#ffffff', 0.4), 0, 1.1, 0, sh); for (let r = 0; r < 4; r++) { P.box(2.5, 0.03, 0.38, P.std('#f3e3ea', 0.3), 0, 0.4 + r * 0.5, 0.02, sh); for (let k = 0; k < 6; k++) { const st = steps[(k + r + s) % steps.length]; const b = P.bottle(st.col, 0.14 + (k % 3) * 0.03, st.n.split(' ')[0].toUpperCase()); b.position.set(-1.05 + k * 0.42, 0.42 + r * 0.5, 0.03); sh.add(b); } } l.add(sh, -6 + s * 3, -6.7); l.box(-6 + s * 3, -6.7, 2.6, 0.45, 2.2); l.inter({ id: 'glow_shelf' + s, x: -6 + s * 3, z: -5.5, r: 1.5, prompt: 'Browse cosmetics & face presets', action: () => GR.Shops.glowlab('shop'), kind: 'shop' }); }
    // vanity with bulb mirror + treatment chair
    l.mirror(2.0, 1.2, 9.9, 1.6, -1.5, -Math.PI / 2, '#ffffff');
    for (let i = 0; i < 8; i++) { const b = P.mesh(G_sphere(0.05), P.emissive('#fff6e0', 1.5), zn.ox + 9.85, 1.0 + (i < 4 ? i * 0.4 : 0), -2.6 + (i < 4 ? 0 : (i - 4) * 0.7 + 0.15), 0, 0, 0, zn.group); }
    const vn = P.box(0.6, 0.85, 2.4, P.std('#ffffff', 0.3), zn.ox + 9.6, 0.42, -1.5); zn.group.add(vn); l.box(9.6, -1.5, 0.6, 2.4, 0.9);
    const ch = P.barberChair('#d8c3ff'); l.add(ch, 8.3, -1.5, -Math.PI / 2); l.box(8.3, -1.5, 0.7, 0.7, 0.5);
    l.inter({ id: 'glow_chair', x: 7.0, z: -1.5, r: 1.5, prompt: 'Skincare routine (minigame)', action: () => GR.Shops.glowlab('routine'), kind: 'shop' });
    zn.chair = { x: zn.ox + 8.3, z: -1.5, ry: -Math.PI / 2 };
    const ctr = P.counter(3, '#ffffff', '#ffd6e7'); l.add(ctr, 3, 4, Math.PI); l.box(3, 4, 3.1, 0.8, 1.05);
    l.spot(3, 5.1, 'worker', { face: Math.PI, role: 'glowlab' });
    for (let i = 0; i < 3; i++) { const p = P.furniture(D.FURNITURE.find(f => f.id === 'plant_monstera'), 0); l.add(p, -9 + i * 0.01, -3 + i * 3); }
    for (let i = 0; i < 2; i++) { const s = P.furniture(D.FURNITURE.find(f => f.id === 'armchair'), 3); s.scale.setScalar(0.8); l.add(s, -6 + i * 2, 3, Math.PI); l.box(-6 + i * 2, 3, 0.75, 0.75, 0.45); l.seat(-6 + i * 2, 3, Math.PI, 0.4); }
    [[-4, -2], [4, -2], [0, 3]].forEach(([x, z]) => l.light(x, 3.4, z, '#fff0f6', 1.0, 11));
    return zn;
  }

  /* ================= NEST & CO (furniture) ================= */
  function nest() {
    const zn = mk('nest', { ambient: { sky: '#fff8ee', ground: '#a89f88', intensity: 0.7, key: 0.5, keyDir: [3, 8, 4] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 14, z1: -10, x2: zn.ox + 14, z2: 10, h: 4.5, floor: mat(T.ENV.wood([8, 6], '#c19a6b'), 0.6), wall: '#efe8db', ceil: '#f6f2ea', trim: '#3f4a2c' });
    exitDoor(zn, l, -8, 9.9, Math.PI);
    l.panel(T.sign('NEST & CO', { bg: '#3f4a2c', fg: '#f5f0e6', w: 1024, h: 200, sub: 'MAKE YOUR APARTMENT A PERSONALITY' }), 7, 1.4, 0, 3.6, -9.95, 0, 0.5);
    const show = ['sofa_modern', 'armchair', 'bed_double', 'desk_gaming', 'gamechair', 'tvstand', 'arcade', 'lamp_floor', 'plant_palm', 'shelf_display', 'trophy_case', 'rug_round', 'beanbag', 'bookshelf', 'punchbag', 'bed_race'];
    show.forEach((id, i) => { const f = D.FURNITURE.find(x => x.id === id); const g = P.furniture(f, i % f.colors.length); const x = -11 + (i % 6) * 4.4, z = -6.5 + Math.floor(i / 6) * 5; l.add(g, x, z, 0); if (!f.flat) l.box(x, z, Math.min(f.w, 2.6), Math.min(f.d, 2.4), 0.6); if (f.seat) l.seat(x, z, 0, 0.45); });
    const ctr = P.counter(3, '#3f4a2c', '#f5f0e6'); l.add(ctr, 9, 7.5, Math.PI); l.box(9, 7.5, 3.1, 0.8, 1.05);
    l.inter({ id: 'nest_ctr', x: 9, z: 6.3, r: 1.8, prompt: 'Browse furniture & decor catalogue', action: () => GR.Shops.furniture(), kind: 'shop' });
    l.inter({ id: 'nest_floor', x: 0, z: -1.5, r: 3.5, prompt: 'Browse furniture & decor catalogue', action: () => GR.Shops.furniture(), kind: 'shop' });
    l.spot(9, 8.6, 'worker', { face: Math.PI, role: 'nest' });
    l.panel(T.sign('NEON SIGNS', { bg: 'transparent', fg: '#ff4fa3', w: 512, h: 128, glow: true }), 3, 0.75, -13.9, 2.6, 4, Math.PI / 2, 1.2);
    [[-8, -5], [2, -5], [8, 2], [-6, 4]].forEach(([x, z]) => l.light(x, 4.0, z, '#fff3e0', 0.9, 14));
    return zn;
  }

  /* ================= APARTMENT ================= */
  function apartment() {
    const zn = mk('apartment', { ambient: { sky: '#fff4e6', ground: '#8a7f73', intensity: 0.6, key: 0.55, keyDir: [-4, 8, 6] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 9, z1: -7, x2: zn.ox + 9, z2: 7, h: 3.2, floor: mat(T.ENV.wood([6, 5], '#b08155'), 0.55), wall: '#efe7dc', ceil: '#f8f4ee', trim: '#6b4e3d', lightsGrid: false });
    const iw = P.std('#efe7dc', 0.85);
    // interior walls (bedroom, bathroom)
    l.wall(-7.2, 0, 3.6, 0.15, 3.2, iw); l.wall(-2.2, 0, 2.4, 0.15, 3.2, iw); // bedroom wall with door gap x -5.4..-3.4
    l.wall(-1, -3.5, 0.15, 7, 3.2, iw);
    l.wall(4, -5.6, 0.15, 2.8, 3.2, iw); l.wall(6.5, -2, 5, 0.15, 3.2, iw); // bathroom
    // bathroom tiles
    const bt = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), mat(T.ENV.tile([5, 5], '#e8f1f5', '#9fb4c0'), 0.3)); bt.rotation.x = -Math.PI / 2; bt.position.set(zn.ox + 6.5, 0.01, -4.5); zn.group.add(bt);
    // kitchen tiles
    const kt = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 5.5), mat(T.ENV.tile([6, 5], '#f4f1ea', '#c9c2b4'), 0.4)); kt.rotation.x = -Math.PI / 2; kt.position.set(zn.ox + 5.7, 0.01, 4.2); zn.group.add(kt);
    exitDoor(zn, l, -1, 6.9, Math.PI);
    // kitchen: benches along east wall + fridge + stove
    const kb = P.box(0.7, 0.92, 4.6, P.std('#f4f4f2', 0.4), zn.ox + 8.6, 0.46, 3.8); zn.group.add(kb); P.box(0.75, 0.05, 4.7, P.std('#2b2b2b', 0.2, 0.2), zn.ox + 8.6, 0.94, 3.8, zn.group); l.box(8.6, 3.8, 0.7, 4.6, 0.95);
    P.box(0.5, 0.02, 0.5, P.std('#111', 0.2, 0.5), zn.ox + 8.6, 0.97, 2.5, zn.group); for (let i = 0; i < 4; i++) P.mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16), P.std('#555', 0.4, 0.6), zn.ox + 8.5 + (i % 2) * 0.22 - 0.1, 0.985, 2.4 + Math.floor(i / 2) * 0.22, Math.PI / 2, 0, 0, zn.group);
    const fridge = P.box(0.8, 1.9, 0.75, P.std('#d9d9de', 0.25, 0.7), zn.ox + 8.5, 0.95, 6.4); zn.group.add(fridge); l.box(8.5, 6.4, 0.8, 0.75, 1.9);
    l.inter({ id: 'apt_fridge', x: 7.5, z: 6.0, r: 1.3, prompt: 'Fridge: eat snacks from your inventory', action: () => GR.UI.inventory('consumables'), kind: 'misc' });
    for (let i = 0; i < 3; i++) P.box(0.4, 0.6, 1.4, P.std('#f4f4f2', 0.4), zn.ox + 8.75, 2.2, 2 + i * 1.5, zn.group);
    l.inter({ id: 'apt_cook', x: 7.6, z: 3.0, r: 1.3, prompt: 'Cook a protein meal (+40 energy, $6)', action: () => GR.Game.cook(), kind: 'misc' });
    // kitchen island stools
    const isl = P.box(2.4, 0.95, 0.9, P.std('#6b4e3d', 0.5), zn.ox + 4.5, 0.47, 3.5); zn.group.add(isl); l.box(4.5, 3.5, 2.4, 0.9, 0.98);
    // bathroom: sink + mirror + shower + toilet
    const sink = P.box(1.2, 0.85, 0.5, P.std('#f4f4f2', 0.3), zn.ox + 6.5, 0.42, -6.7); zn.group.add(sink); l.box(6.5, -6.7, 1.2, 0.5, 0.88);
    l.mirror(1.1, 1.0, 6.5, 1.65, -6.95, 0, '#d9d9de');
    l.inter({ id: 'apt_mirror', x: 6.5, z: -5.8, r: 1.2, prompt: 'Bathroom mirror: skincare routine / selfie', action: () => GR.Shops.glowlab('home'), kind: 'misc' });
    P.box(0.02, 2.1, 1.5, P.std('#bfe3ff', 0.05, 0.1, { transparent: true, opacity: 0.3 }), zn.ox + 7.5, 1.05, -4.0, zn.group); l.box(8.3, -4.0, 1.4, 1.5, 0.06);
    const sh = P.cyl(0.12, 0.12, 0.04, P.chrome(), zn.ox + 8.8, 2.2, -4.0); sh.rotation.z = Math.PI / 2; zn.group.add(sh);
    l.inter({ id: 'apt_shower', x: 8.1, z: -4.0, r: 1.0, prompt: 'Shower (+energy)', action: () => GR.Game.shower(), kind: 'misc' });
    const toilet = new THREE.Group(); P.box(0.4, 0.4, 0.55, P.std('#f4f4f2', 0.3), 0, 0.2, 0, toilet); P.box(0.42, 0.5, 0.18, P.std('#f4f4f2', 0.3), 0, 0.55, -0.25, toilet); l.add(toilet, 4.6, -3.0, Math.PI / 2); l.box(4.6, -3.0, 0.55, 0.42, 0.4);
    // wardrobe (bedroom, fixed)
    const wd = new THREE.Group(); P.box(2.2, 2.3, 0.65, P.std('#6b4e3d', 0.5), 0, 1.15, 0, wd); P.box(0.02, 2.2, 0.02, P.std('#111'), 0, 1.15, 0.33, wd); for (const s of [-1, 1]) P.box(0.04, 0.4, 0.04, P.chrome(), s * 0.12, 1.2, 0.35, wd); l.add(wd, -8.6, -4.5, Math.PI / 2); l.box(-8.6, -4.5, 0.65, 2.2, 2.3);
    l.inter({ id: 'apt_wardrobe', x: -7.6, z: -4.5, r: 1.4, prompt: 'Wardrobe: outfits & saved fits', action: () => GR.Shops.wardrobe({ home: true }), kind: 'wardrobe' });
    // trophy wall shelf (fixed) – trophies from competitions appear here
    const tw = new THREE.Group(); for (let i = 0; i < 2; i++) P.box(3.2, 0.05, 0.3, P.std('#6b4e3d', 0.5), 0, 1.4 + i * 0.6, 0, tw); l.add(tw, -5, 6.82, Math.PI); zn.trophyWall = { g: tw, slots: [0, 1].flatMap(r => [-1.3, -0.65, 0, 0.65, 1.3].map(x => V(x, 1.43 + r * 0.6, 0))) };
    l.inter({ id: 'apt_trophies', x: -5, z: 5.6, r: 1.5, prompt: 'Trophy wall: achievements & stats', action: () => GR.UI.profile('achievements'), kind: 'misc' });
    // decorate terminal
    l.inter({ id: 'apt_decorate', x: 1.5, z: 5.5, r: 1.8, prompt: 'Decorate apartment (place/move furniture)', action: () => GR.Apt.decorate(), kind: 'misc' });
    // windows (city view)
    const view = T.memo('cityview', () => { const c = T.canvas(512, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#8fc6ff'); g.addColorStop(1, '#ffd9a8'); x.fillStyle = g; x.fillRect(0, 0, 512, 256); const r = U.rng(3); for (let i = 0; i < 30; i++) { const w = 15 + r() * 30, h = 40 + r() * 160; x.fillStyle = U.pick(['#4a5568', '#2d3748', '#5a6577']); x.fillRect(r() * 512, 256 - h, w, h); } return T.toTex(c); });
    for (const z of [-4, 3]) { const wnd = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: view })); wnd.position.set(zn.ox - 8.97, 1.7, z); wnd.rotation.y = Math.PI / 2; zn.group.add(wnd); P.box(0.06, 1.6, 2.7, P.std('#f4f4f2', 0.5), zn.ox - 8.96, 1.7, z, zn.group); }
    zn.windowViews = view;
    zn.placeArea = { x1: zn.ox - 8.6, z1: -6.6, x2: zn.ox + 7.8, z2: 6.6 };
    zn.furnGroup = new THREE.Group(); zn.furnGroup.userData.dyn = true; zn.group.add(zn.furnGroup);
    zn.furnBoxes = [];
    [[-6, 4], [2, 3], [-4, -3.5], [2, -4], [6.5, -4.5]].forEach(([x, z]) => l.light(x, 2.9, z, '#ffe8c8', 1.0, 9));
    // ceiling lamps
    [[-5, 3.5], [3, 3.5], [-5, -3.5], [1.5, -3.5]].forEach(([x, z]) => { const lp = P.mesh(G_sphere(0.18), P.emissive('#fff2d8', 1.4), zn.ox + x, 3.0, z, 0, 0, 0, zn.group); });
    return zn;
  }

  /* ================= CAFE & PROTEIN PALACE ================= */
  function eatery(id, t) {
    const zn = mk(id, { ambient: { sky: '#fff2e0', ground: '#7a5a3a', intensity: 0.7, key: 0.5, keyDir: [3, 8, 4] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 10, z1: -7, x2: zn.ox + 10, z2: 7, h: 3.8, floor: t.floor, wall: t.wall, ceil: '#f6efe4', trim: t.trim });
    exitDoor(zn, l, 4, 6.9, Math.PI);
    const ctr = P.counter(6, t.counter, t.top); l.add(ctr, 0, -4.5, 0); l.box(0, -4.5, 6.1, 0.8, 1.05);
    l.inter({ id: id + '_order', x: 0, z: -3.2, r: 1.8, prompt: 'Order food & drinks', action: () => GR.Shops.food(id), kind: 'shop' });
    l.spot(0, -5.6, 'worker', { face: 0, role: id });
    l.panel(T.memo('menu_' + id, () => { const c = T.canvas(512, 256), x = c.getContext('2d'); x.fillStyle = '#1b1b1d'; x.fillRect(0, 0, 512, 256); x.fillStyle = t.accent; x.font = 'bold 34px Impact'; x.fillText(t.title, 20, 44); x.font = '20px Arial'; x.fillStyle = '#f4f1de'; D.FOOD[id === 'cafe' ? 'cafe' : 'protein'].forEach((f, i) => { x.fillText(f.n, 24, 86 + i * 32); x.fillText('$' + f.price, 440, 86 + i * 32); }); return T.toTex(c); }), 4.5, 2.2, 0, 2.6, -6.95, 0, 0.5);
    if (id === 'cafe') { const em = new THREE.Group(); P.box(0.7, 0.5, 0.5, P.std('#c0c0c0', 0.2, 0.9), 0, 0.25, 0, em); P.box(0.5, 0.06, 0.3, P.std('#111'), 0, 0.03, 0.15, em); l.add(em, -1.8, -4.6, 0, 1.05); for (let i = 0; i < 4; i++) { const pastry = P.mesh(G_sphere(0.08), P.std('#d9a441', 0.7), zn.ox + 1 + i * 0.3, 1.12, -4.4, 0, 0, 0, zn.group); pastry.scale.y = 0.6; } }
    else { for (let i = 0; i < 3; i++) P.cyl(0.08, 0.06, 0.22, P.std(['#ef4444', '#f97316', '#10b981'][i], 0.3, 0.1), zn.ox - 2 + i * 0.4, 1.16, -4.4, zn.group); }
    for (let i = 0; i < 6; i++) { const x = -7 + (i % 3) * 4, z = -0.5 + Math.floor(i / 3) * 4; const ts = P.tableSet(t.table, id === 'protein' ? 4 : 2, false); l.add(ts, x, z); l.box(x, z, 0.9, 0.9, 0.78); ts.userData.seats.forEach(s => l.seat(x + s.x, z + s.z, s.ry, 0.48)); }
    [[-5, 0], [5, 0], [0, 4]].forEach(([x, z]) => l.light(x, 3.4, z, t.light, 1.0, 12));
    for (let i = 0; i < 4; i++) { const pl = P.furniture(D.FURNITURE.find(f => f.id === 'plant_monstera'), 0); l.add(pl, -9.3, -5 + i * 3.2); }
    return zn;
  }

  /* ================= AURA ARENA ================= */
  function arena() {
    const zn = mk('arena', { ambient: { sky: '#c9b8ff', ground: '#2b1d3b', intensity: 0.5, key: 0.75, keyDir: [0, 12, 6] } }), l = L(zn);
    W.room(zn, { x1: zn.ox - 26, z1: -20, x2: zn.ox + 26, z2: 20, h: 12, floor: mat(T.ENV.concrete([12, 10], '#2b2d33'), 0.7), wall: '#1a1028', ceil: '#0f0a18', trim: '#7b61ff', lightsGrid: false });
    exitDoor(zn, l, 0, 19.9, Math.PI);
    // stage + runway
    const stage = new THREE.Group(); P.box(22, 1.2, 9, P.std('#141018', 0.4), 0, 0.6, 0, stage); P.box(22.2, 0.05, 9.2, P.std('#2a1f4a', 0.25, 0.2, { emissive: new THREE.Color('#7b61ff'), emissiveIntensity: 0.18 }), 0, 1.22, 0, stage); for (const ex of [-11, 11]) P.box(0.12, 0.08, 9.2, P.emissive('#7b61ff', 1.4), ex, 1.24, 0, stage); P.box(22.2, 0.08, 0.12, P.emissive('#ff4fa3', 1.4), 0, 1.24, 4.6, stage); l.add(stage, 0, -13);
    l.box(0, -13, 22, 9, 1.22, 0, 'nocam');
    const run = P.box(3, 1.2, 10, P.std('#0f0d14', 0.25, 0.3), zn.ox, 0.6, -3.5); zn.group.add(run); P.box(3.1, 0.04, 10.1, P.std('#1a1424', 0.15, 0.4, { emissive: new THREE.Color('#ff4fa3'), emissiveIntensity: 0.12 }), zn.ox, 1.21, -3.5, zn.group); for (const ex of [-1.5, 1.5]) P.box(0.08, 0.06, 10.1, P.emissive('#ff4fa3', 1.6), zn.ox + ex, 1.23, -3.5, zn.group); l.box(0, -3.5, 3, 10, 1.22, 0, 'nocam');
    P.box(3, 1.2, 1.2, P.std('#2b2b2b'), zn.ox + 2.4, 0.3, 1.3, zn.group); // steps
    for (let i = 0; i < 3; i++) { const st = P.box(1.2, 0.4 * (i + 1), 1.2, P.std('#2b2b2b', 0.6), zn.ox + 2.3, 0.2 * (i + 1), 0.8 - i * 1.2 + 0.4); zn.group.add(st); l.box(2.3, 0.8 - i * 1.2 + 0.4, 1.2, 1.2, 0.4 * (i + 1)); }
    // big screen
    const scr = T.screen(['MOG-OFF', 'AURA ARENA'], '#120a22', '#ffd23f'); scr.canvas.width = 1024; scr.canvas.height = 512; const sm = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false })); sm.position.set(zn.ox, 7.0, -19.9); zn.group.add(sm); zn.screen = { canvas: scr.canvas, tex: scr.tex };
    P.box(16.6, 8.6, 0.3, P.std('#111', 0.4, 0.5), zn.ox, 7.0, -20.1, zn.group);
    // trusses + spotlights
    for (const x of [-11, 11]) P.box(0.4, 11, 0.4, P.std('#333', 0.4, 0.8), zn.ox + x, 5.5, -9, zn.group);
    P.box(22.4, 0.4, 0.4, P.std('#333', 0.4, 0.8), zn.ox, 10.5, -9, zn.group);
    zn.spots = [];
    for (let i = 0; i < 6; i++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#ff4fa3', '#28e0ff', '#ffd23f', '#a3e635', '#7b61ff', '#ffffff'][i]), transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); cone.position.set(zn.ox - 9 + i * 3.6, 5.6, -9); cone.userData.dyn = true; zn.group.add(cone); zn.spots.push(cone); }
    // judges desk
    const jd = new THREE.Group(); P.box(5.5, 1.0, 1.0, P.std('#2b1d3b', 0.4, 0.3), 0, 0.5, 0, jd); P.box(5.6, 0.05, 1.1, P.std('#d9b26b', 0.2, 0.8), 0, 1.02, 0, jd); P.mesh(new THREE.PlaneGeometry(5.2, 0.6), new THREE.MeshBasicMaterial({ map: T.sign('JUDGES', { bg: '#111', fg: '#d9b26b', w: 512, h: 64 }) }), 0, 0.6, -0.51, 0, Math.PI, 0, jd); l.add(jd, 0, 5.5, Math.PI); l.box(0, 5.5, 5.6, 1.1, 1.05);
    zn.judgeSeats = [-1.8, 0, 1.8].map(x => ({ x: zn.ox + x, z: 6.5, ry: Math.PI }));
    for (const j of zn.judgeSeats) { const c = P.furniture(D.FURNITURE.find(f => f.id === 'gamechair'), 0); l.add(c, j.x - zn.ox, j.z, Math.PI); }
    // bleachers (east, west, south)
    zn.crowdSeats = [];
    for (const side of [-1, 1]) for (let r = 0; r < 5; r++) { const x = side * (16 + r * 1.6); P.box(1.6, 0.5 + r * 0.5, 30, P.std('#3b3f46', 0.6, 0.3), zn.ox + x, (0.5 + r * 0.5) / 2, -2, zn.group); l.box(x, -2, 1.6, 30, 0.5 + r * 0.5); for (let k = 0; k < 9; k++) zn.crowdSeats.push({ x: zn.ox + x, z: -14 + k * 3.2, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, h: 0.5 + r * 0.5 }); }
    for (let r = 0; r < 3; r++) { P.box(20, 0.5 + r * 0.5, 1.6, P.std('#3b3f46', 0.6, 0.3), zn.ox, (0.5 + r * 0.5) / 2, 11 + r * 1.6, zn.group); l.box(0, 11 + r * 1.6, 20, 1.6, 0.5 + r * 0.5); for (let k = 0; k < 7; k++) zn.crowdSeats.push({ x: zn.ox - 9 + k * 3, z: 11 + r * 1.6, ry: Math.PI, h: 0.5 + r * 0.5 }); }
    // registration desk + MC
    const reg = P.counter(4, '#7b61ff', '#111'); l.add(reg, -9, 16, Math.PI); l.box(-9, 16, 4.1, 0.8, 1.05);
    l.panel(T.sign('MOG-OFF REGISTRATION', { bg: '#111', fg: '#ffd23f', w: 512, h: 96 }), 4, 0.75, -9, 2.6, 16.5, Math.PI, 0.8);
    l.inter({ id: 'arena_reg', x: -9, z: 14.8, r: 2.0, prompt: 'Mog-Off registration: enter a competition', action: () => GR.Comp.open(), kind: 'shop' });
    l.inter({ id: 'arena_board', x: 9, z: 14.8, r: 2.0, prompt: 'Leaderboards & season standings', action: () => GR.UI.leaderboard(), kind: 'misc' });
    const lb = T.screen(['LEADERBOARD', 'SEASON 1'], '#111', '#28e0ff'); l.panel(lb.tex, 4, 2.5, 9, 2.2, 17, Math.PI, 0.8); zn.lbScreen = lb;
    l.spot(-9, 17.1, 'worker', { face: Math.PI, role: 'arena' });
    zn.stageMarks = [-6, -2, 2, 6].map(x => ({ x: zn.ox + x, z: -12, y: 1.22 }));
    zn.runway = { x: zn.ox, z1: -9, z2: 1.3, y: 1.22 };
    [[-8, -12], [8, -12], [0, -3], [0, 8], [-14, 0], [14, 0]].forEach(([x, z]) => l.light(x, 9, z, '#d6c8ff', 1.1, 22));
    return zn;
  }

  function build() {
    const fl = (k, a, b) => mat(T.ENV[k]([8, 6], a, b), 0.6);
    gym();
    clothingStore('threadlord', { sky: '#fff6ea', ground: '#8a6a4a', floorTex: mat(T.ENV.wood([8, 6], '#b08155'), 0.55), wall: '#f1ebe1', ceil: '#faf7f2', trim: '#7c4a2d', title: 'THREADLORD', sub: 'EVERYDAY FITS • FAIR PRICES', signBg: '#7c4a2d', signFg: '#f5f0e6', counter: '#7c4a2d', curtain: '#3f6b3a', light: '#fff2dd' });
    clothingStore('dripdepot', { sky: '#d8c8ff', ground: '#1a1028', floorTex: mat(T.ENV.concrete([6, 4], '#3b3f46'), 0.35, 0.1), wall: '#24202e', ceil: '#141218', trim: '#f2c94c', title: 'DRIP DEPOT', sub: 'HYPE • LIMITED • DRIP OR DROWN', signBg: '#111', signFg: '#f2c94c', counter: '#111', curtain: '#7b2cbf', light: '#e8dcff' });
    clothingStore('solesurvivor', { sky: '#f2f6ff', ground: '#8a8f98', floorTex: mat(T.ENV.marble([5, 4], '#eeeae4'), 0.25), wall: '#f4f1ea', ceil: '#ffffff', trim: '#1b4dff', title: 'SOLE SURVIVOR', sub: 'SNEAKERS • CHAINS • SHADES', signBg: '#1b4dff', signFg: '#fff', counter: '#1b4dff', curtain: '#1b4dff', light: '#f4f8ff' });
    barber(); glowlab(); nest(); apartment();
    eatery('cafe', { floor: mat(T.ENV.wood([8, 6], '#8a5a3a'), 0.6), wall: '#efe0cc', trim: '#1e3a2f', counter: '#3b2416', top: '#d9c3a0', title: 'BEAN THERE MENU', accent: '#f4d9b0', table: '#d9c3a0', light: '#ffe2bd' });
    eatery('protein', { floor: mat(T.ENV.tile([8, 6], '#f4f1ea', '#c9c2b4'), 0.4), wall: '#fff3e0', trim: '#ef4444', counter: '#ef4444', top: '#f4f4f2', title: 'PROTEIN PALACE', accent: '#ffd23f', table: '#f4f4f2', light: '#fff4e0' });
    arena();
  }
  return { build };
})();
