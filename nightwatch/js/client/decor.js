/* Decor — environmental detail and storytelling (client only, no collision).
 *
 * Every room is dressed by kind with procedurally placed, merged geometry:
 * wall art, notices, clocks, radiators, pipes, cabinets, room signs, rugs,
 * papers, chairs, debris, location-specific props, ceiling vents and decals
 * (stains, cracks, handprints, scratched words). Placement is seeded by the
 * world, so every investigator sees the same building.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const V3 = THREE.Vector3;
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const SPH = new THREE.SphereGeometry(0.5, 10, 8);
  const M4 = (x, y, z, ry, sx, sy, sz, rx, rz) => {
    const m = new THREE.Matrix4();
    m.compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new V3(sx, sy, sz));
    return m;
  };

  /* ---------- texture atlases (4×4 cells of 256 px) ---------- */
  function atlas(draw) {
    const c = NW.Tex.canvas(1024), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) { x.save(); x.translate((i % 4) * 256, Math.floor(i / 4) * 256); x.beginPath(); x.rect(0, 0, 256, 256); x.clip(); draw(x, i, NW.Tex.rng(i * 977 + 13)); x.restore(); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const cellUV = (i, inset) => { const e = inset || 0.004; const u0 = (i % 4) / 4 + e, v1 = 1 - Math.floor(i / 4) / 4 - e, u1 = u0 + 0.25 - 2 * e, v0 = v1 - 0.25 + 2 * e; return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; };

  function artAtlas() {
    return atlas((x, i, r) => {
      if (i < 8) { // dim paintings: landscapes, portraits, seascapes
        const g = x.createLinearGradient(0, 0, 0, 256); const hue = Math.floor(r() * 360);
        g.addColorStop(0, `hsl(${hue},18%,${14 + r() * 14}%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360},22%,${6 + r() * 10}%)`);
        x.fillStyle = g; x.fillRect(0, 0, 256, 256);
        if (i % 3 === 0) { x.fillStyle = 'rgba(10,10,12,0.85)'; x.beginPath(); x.ellipse(128, 100, 42, 52, 0, 0, 7); x.fill(); x.fillRect(70, 140, 116, 140); x.fillStyle = 'rgba(230,220,200,0.08)'; x.beginPath(); x.ellipse(118, 92, 12, 18, 0, 0, 7); x.fill(); }
        else if (i % 3 === 1) { x.fillStyle = 'rgba(8,10,12,0.8)'; x.beginPath(); x.moveTo(0, 200); for (let k = 0; k <= 8; k++) x.lineTo(k * 32, 120 + r() * 80); x.lineTo(256, 256); x.lineTo(0, 256); x.fill(); x.fillStyle = 'rgba(220,215,190,0.35)'; x.beginPath(); x.arc(60 + r() * 140, 50 + r() * 30, 10, 0, 7); x.fill(); }
        else { x.strokeStyle = 'rgba(200,200,190,0.15)'; for (let k = 0; k < 14; k++) { x.beginPath(); x.moveTo(0, 150 + k * 8); x.bezierCurveTo(80, 140 + k * 8 + r() * 10, 170, 160 + k * 8, 256, 150 + k * 8); x.stroke(); } x.fillStyle = 'rgba(10,10,10,0.8)'; x.fillRect(150, 120, 30, 30); x.fillRect(160, 90, 4, 30); }
        // craquelure and grime
        x.strokeStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 30; k++) { x.beginPath(); const a = r() * 256, b = r() * 256; x.moveTo(a, b); x.lineTo(a + (r() - 0.5) * 30, b + (r() - 0.5) * 30); x.stroke(); }
      } else if (i < 12) { // notices / posters
        x.fillStyle = ['#d8d0b8', '#c9d4c8', '#e0d6b0', '#cfc6c0'][i - 8]; x.fillRect(0, 0, 256, 256);
        x.fillStyle = ['#7a1f1f', '#1f3a5a', '#2b2b2b', '#5a3a1a'][i - 8]; x.fillRect(16, 16, 224, 46);
        x.fillStyle = '#f0e8d8'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center';
        x.fillText(['NOTICE', 'STAFF ONLY', 'NO ENTRY', 'CAUTION'][i - 8], 128, 50);
        x.fillStyle = 'rgba(30,30,40,0.6)'; for (let y = 84; y < 236; y += 15) x.fillRect(24, y, 120 + r() * 90, 5);
        x.fillStyle = 'rgba(60,40,20,0.25)'; x.beginPath(); x.arc(200, 210, 40, 0, 7); x.fill();
      } else { // rugs
        x.fillStyle = ['#4a2a26', '#2c3448', '#3d3a24', '#3a2436'][i - 12]; x.fillRect(0, 0, 256, 256);
        x.strokeStyle = 'rgba(200,170,120,0.35)'; x.lineWidth = 8; x.strokeRect(16, 16, 224, 224); x.lineWidth = 3; x.strokeRect(36, 36, 184, 184);
        x.fillStyle = 'rgba(200,170,120,0.2)'; x.beginPath(); x.moveTo(128, 60); x.lineTo(196, 128); x.lineTo(128, 196); x.lineTo(60, 128); x.fill();
        for (let k = 0; k < 2000; k++) { x.fillStyle = 'rgba(0,0,0,' + r() * 0.2 + ')'; x.fillRect(r() * 256, r() * 256, 2, 2); }
      }
    });
  }
  function decalAtlas() {
    return atlas((x, i, r) => {
      x.clearRect(0, 0, 256, 256);
      if (i < 4) { for (let k = 0; k < 5; k++) { const g = x.createRadialGradient(128 + (r() - 0.5) * 80, 128 + (r() - 0.5) * 80, 0, 128, 128, 60 + r() * 60); g.addColorStop(0, 'rgba(25,20,10,0.55)'); g.addColorStop(1, 'rgba(25,20,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); } }
      else if (i < 6) { x.strokeStyle = 'rgba(15,12,10,0.8)'; x.lineWidth = 2; for (let k = 0; k < 4; k++) { x.beginPath(); let a = 128, b = 128; x.moveTo(a, b); for (let s = 0; s < 9; s++) { a += (r() - 0.5) * 50; b += (r() - 0.3) * 30; x.lineTo(a, b); } x.stroke(); } }
      else if (i < 8) { x.fillStyle = i === 6 ? 'rgba(40,10,8,0.75)' : 'rgba(20,22,24,0.7)'; for (let h = 0; h < (i === 6 ? 1 : 3); h++) { const ox = 90 + h * 40, oy = 120 + h * 20; x.beginPath(); x.ellipse(ox, oy, 22, 28, 0, 0, 7); x.fill(); for (let f = 0; f < 5; f++) { x.beginPath(); x.ellipse(ox - 22 + f * 11, oy - 40 - (f === 2 ? 8 : 0), 5, 16, (f - 2) * 0.15, 0, 7); x.fill(); } } }
      else if (i < 10) { x.strokeStyle = 'rgba(230,225,210,0.55)'; x.lineWidth = 3; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(60 + k * 14, 40); x.lineTo(80 + k * 16 + r() * 10, 220); x.stroke(); } }
      else if (i === 10) { const g = x.createRadialGradient(128, 128, 0, 128, 128, 120); g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.6, 'rgba(20,10,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
      else if (i < 14) { x.fillStyle = i === 13 ? 'rgba(220,215,200,0.7)' : 'rgba(60,12,10,0.8)'; x.font = 'bold ' + (i === 13 ? 70 : 54) + 'px serif'; x.textAlign = 'center'; x.save(); x.translate(128, 140); x.rotate((r() - 0.5) * 0.2); x.fillText(['GET OUT', 'WE STAYED', '|||| ||'][i - 11], 0, 0); x.restore(); }
      else if (i === 14) { x.fillStyle = 'rgba(15,20,20,0.6)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(70 + k * 40, 60 + k * 45, 14, 30, 0.2, 0, 7); x.fill(); } }
      else { const g = x.createRadialGradient(128, 128, 0, 128, 128, 120); g.addColorStop(0, 'rgba(10,20,25,0.6)'); g.addColorStop(1, 'rgba(10,20,25,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(128, 128, 120, 80, 0, 0, 7); x.fill(); }
    });
  }
  function signAtlas(names) {
    const c = NW.Tex.canvas(1024, 1024), x = c.getContext('2d');
    names.forEach((n, i) => {
      const cx = (i % 4) * 256, cy = Math.floor(i / 4) * 64;
      x.fillStyle = '#2a2d2f'; x.fillRect(cx + 4, cy + 4, 248, 56); x.strokeStyle = '#b8b0a0'; x.lineWidth = 2; x.strokeRect(cx + 8, cy + 8, 240, 48);
      x.fillStyle = '#e6dfcf'; x.font = 'bold 22px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(n.toUpperCase().slice(0, 18), cx + 128, cy + 33);
    });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const signUV = (i) => { const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) * 64 / 1024; return [[u0 + 0.004, v1 - 0.0605], [u0 + 0.246, v1 - 0.0605], [u0 + 0.246, v1 - 0.004], [u0 + 0.004, v1 - 0.004]]; };

  /* ---------- placement ---------- */
  const KITS = {
    office: { art: 2, notice: 1, clock: 1, radiator: 1, rug: 0.6, papers: 6, chairs: 2, deskTop: true, vent: 1 },
    records: { notice: 1, papers: 10, boxes: 3, vent: 1, stains: 2 },
    archive: { notice: 2, papers: 14, boxes: 6, cables: 2, stains: 3, words: 0.3 },
    control: { notice: 2, chairs: 2, papers: 4, cables: 1, deskTop: true },
    kitchen: { cabinets: 2, clock: 1, chairs: 2, counterTop: true, stains: 2 },
    living: { art: 3, radiator: 1, rug: 1, chairs: 1, papers: 2, stains: 2, words: 0.15 },
    bedroom: { art: 2, radiator: 1, rug: 0.8, papers: 1, stains: 2, hand: 0.4 },
    bath: { mirror: 1, cabinets: 1, stains: 3, pipes: 1 },
    laundry: { notice: 1, pipes: 2, buckets: 2, stains: 2 },
    lobby: { art: 2, notice: 1, clock: 1, rug: 0.6, chairs: 2, papers: 2 },
    corridor: { art: 0.15, notice: 0.1, radiator: 0.08, vent: 0.08, stains: 0.08, hand: 0.03 },
    stair: { stains: 1, notice: 0.5 },
    lab: { notice: 2, cabinets: 2, papers: 5, cables: 2, deskTop: true, vent: 1, words: 0.3 },
    dome: { notice: 1, papers: 6, cables: 3, boxes: 2, chairs: 1 },
    utility: { pipes: 3, cables: 2, buckets: 1, boxes: 2, stains: 3 },
    generator: { pipes: 2, cables: 3, notice: 1, stains: 2 },
    storage: { boxes: 8, pipes: 1, stains: 2 },
    tunnel: { pipes: 0.3, cables: 0.2, stains: 0.2, words: 0.04, hand: 0.03 },
    ward: { clock: 1, radiator: 2, chairs: 2, iv: 2, wheelchair: 1, papers: 3, stains: 3 },
    exam: { cabinets: 1, iv: 1, chairs: 1, notice: 1, papers: 2 },
    theatre: { gurney: 1, iv: 2, cabinets: 1, scorch: 4, stains: 3 },
    pharmacy: { cabinets: 2, boxes: 3, papers: 4, notice: 1 },
    morgue: { gurney: 2, notice: 1, stains: 3, words: 0.4 },
    hall: { notice: 3, clock: 1, suitcases: 4, papers: 4, stains: 3 },
    ticket: { notice: 2, papers: 6, chairs: 1, counterTop: true },
    cafe: { notice: 1, chairs: 6, counterTop: true, papers: 2 },
    baggage: { suitcases: 10, boxes: 4, notice: 1 },
    dock: { pipes: 2, boxes: 3, buoys: 2, ropes: 3, stains: 3 },
    cabin: { buoys: 1, suitcases: 3, notice: 1, chairs: 1, stains: 2 },
    deck: { ropes: 2, buoys: 1 },
    roof: { boxes: 1, cables: 1 },
    outdoor: { litter: 1 }
  };

  function decorate(L) {
    const w = L.w, FH = w.FH, rng = NW.util.rng((w.loc.id.length * 7919) ^ 0x5eed);
    const q = L.quality;
    const M = {
      wood: NW.makeMat('dWood', { tex: 'wood', roughness: 0.7, normal: q !== 'low' }),
      metal: NW.makeMat('dMetal', { color: 0x6a6f72, roughness: 0.4, metalness: 0.7 }),
      rust: NW.makeMat('dRust', { tex: 'rust', roughness: 0.8, metalness: 0.4 }),
      dark: NW.makeMat('dDark', { color: 0x222426, roughness: 0.6, metalness: 0.2 }),
      white: NW.makeMat('dWhite', { color: 0xbdb8ac, roughness: 0.5 }),
      paper: NW.makeMat('dPaper', { tex: 'paper', roughness: 0.9, side: THREE.DoubleSide }),
      fabric: NW.makeMat('dFabric', { tex: 'fabric', roughness: 1 }),
      card: NW.makeMat('dCard', { color: 0x7b5e3b, roughness: 0.9 }),
      chrome: NW.makeMat('dChrome', { color: 0xb8bcc0, roughness: 0.2, metalness: 0.9 }),
      orange: NW.makeMat('dOrange', { color: 0xc0501f, roughness: 0.6 }),
      lamp: NW.makeMat('dLamp', { color: 0x111111, emissive: 0xffd8a0, emissiveIntensity: 1.6 }),
      mirror: NW.makeMat('dMirror', { color: 0x9aa4a8, roughness: 0.05, metalness: 1 }),
      art: new THREE.MeshStandardMaterial({ map: artAtlas(), roughness: 0.75 }),
      decal: new THREE.MeshStandardMaterial({ map: decalAtlas(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.9 })
    };
    const names = w.rooms.filter((r) => !r.outdoor).map((r) => r.name.replace(/ \(L\d\)$/, ''));
    const uniq = [...new Set(names)].slice(0, 64);
    M.sign = new THREE.MeshStandardMaterial({ map: signAtlas(uniq), roughness: 0.5, metalness: 0.2 });
    const box = (m, f, x, y, z, sx, sy, sz, ry, rx, rz) => L.B('d:' + m.uuid, m, sx * sy * sz > 0.01, f).addGeometry(BOX, M4(x, y, z, ry || 0, sx, sy, sz, rx, rz));
    const cyl = (m, f, x, y, z, r, h, rx, rz, ry) => L.B('d:' + m.uuid, m, r > 0.04, f).addGeometry(CYL, M4(x, y, z, ry || 0, r * 2, h, r * 2, rx, rz));
    const sph = (m, f, x, y, z, r) => L.B('d:' + m.uuid, m, false, f).addGeometry(SPH, M4(x, y, z, 0, r * 2, r * 2, r * 2));
    // a flat quad on a wall/floor/ceiling with atlas UVs
    const plane = (m, f, c, u, v, n, uvs) => {
      // on walls, make +u point to the viewer's right so text and art read correctly
      if (!n[1]) { const l = Math.hypot(u[0], u[1], u[2]); u = [n[2] * l, 0, -n[0] * l]; }
      const b = L.B('d:' + m.uuid, m, false, f); b.quad([c[0] - u[0] - v[0], c[1] - u[1] - v[1], c[2] - u[2] - v[2]], [c[0] + u[0] - v[0], c[1] + u[1] - v[1], c[2] + u[2] - v[2]], [c[0] + u[0] + v[0], c[1] + u[1] + v[1], c[2] + u[2] + v[2]], [c[0] - u[0] + v[0], c[1] - u[1] + v[1], c[2] - u[2] + v[2]], n, uvs); };
    const used = new Set();
    const key = (f, x, z, tag) => f + ':' + x + ':' + z + ':' + tag;

    for (const r of w.rooms) {
      const kit = KITS[r.kind] || (r.outdoor ? KITS.outdoor : null);
      if (!kit) continue;
      const f = r.f, y0 = f * FH, h = r.h || 3;
      const tiles = r.tiles.map((i) => ({ x: i % w.W, z: (i / w.W) | 0, c: w.grid[f][i] })).filter((t) => w.isRoomChar(t.c) && !w._nearDoor(f, t.x, t.z));
      if (!tiles.length) continue;
      const walls = [];
      for (const t of tiles) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.ch(f, t.x + dx, t.z + dz) === '#') walls.push({ x: t.x, z: t.z, dx, dz });
      const n = (v) => { const base = v * (r.kind === 'corridor' || r.kind === 'tunnel' ? r.area : 1); return Math.floor(base) + (rng() < base % 1 ? 1 : 0); };
      const wallSlot = (tag) => { for (let k = 0; k < 12 && walls.length; k++) { const s = walls[Math.floor(rng() * walls.length)]; const kk = key(f, s.x, s.z, tag + s.dx + s.dz); if (used.has(kk)) continue; used.add(kk); return s; } return null; };
      const floorSlot = () => tiles[Math.floor(rng() * tiles.length)];
      // wall point helper: position on the wall face of slot s at height y, offset out from the wall by off
      const wp = (s, y, off, along) => { const a = along || 0; return { x: s.x + 0.5 + s.dx * (0.5 - off) + (s.dz ? a : 0), y, z: s.z + 0.5 + s.dz * (0.5 - off) + (s.dx ? a : 0), ry: Math.atan2(-s.dx, -s.dz), n: [-s.dx, 0, -s.dz], u: s.dx ? [0, 0, 1] : [1, 0, 0] }; };
      const doN = (k, fn) => { for (let i = 0, c = n(k || 0); i < c; i++) fn(); };

      doN(kit.art, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 1.5 + rng() * 0.2, 0.025, (rng() - 0.5) * 0.3); const sw = 0.35 + rng() * 0.25, sh = 0.3 + rng() * 0.25, tilt = (rng() - 0.5) * 0.12;
        box(M.wood, f, p.x - p.n[0] * 0.005, p.y, p.z - p.n[2] * 0.005, s.dx ? 0.03 : sw + 0.06, sh + 0.06, s.dz ? 0.03 : sw + 0.06, 0, s.dx ? tilt : 0, s.dz ? tilt : 0);
        plane(M.art, f, [p.x + p.n[0] * 0.012, p.y, p.z + p.n[2] * 0.012], p.u.map((v) => v * sw / 2), [0, sh / 2, 0], p.n, cellUV(Math.floor(rng() * 8))); });
      doN(kit.notice, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 1.35 + rng() * 0.3, 0.004, (rng() - 0.5) * 0.4); plane(M.art, f, [p.x, p.y, p.z], p.u.map((v) => v * 0.17), [0, 0.22, 0], p.n, cellUV(8 + Math.floor(rng() * 4))); });
      doN(kit.clock, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 2.05, 0.03); cyl(M.dark, f, p.x, p.y, p.z, 0.15, 0.05, Math.PI / 2, 0, p.ry); cyl(M.white, f, p.x + p.n[0] * 0.026, p.y, p.z + p.n[2] * 0.026, 0.13, 0.005, Math.PI / 2, 0, p.ry); box(M.dark, f, p.x + p.n[0] * 0.032, p.y + 0.04, p.z + p.n[2] * 0.032, s.dx ? 0.004 : 0.012, 0.09, s.dz ? 0.004 : 0.012, 0, 0, 0.3); });
      doN(kit.radiator, () => { const s = wallSlot('low'); if (!s) return; const p = wp(s, y0 + 0.4, 0.06); for (let k = -4; k <= 4; k++) box(M.white, f, p.x + p.u[0] * k * 0.07, p.y, p.z + p.u[2] * k * 0.07, s.dx ? 0.07 : 0.04, 0.55, s.dz ? 0.07 : 0.04); box(M.metal, f, p.x, y0 + 0.08, p.z, s.dx ? 0.03 : 0.7, 0.03, s.dz ? 0.03 : 0.7); });
      doN(kit.cabinets, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 1.75, 0.18); box(M.wood, f, p.x, p.y, p.z, s.dx ? 0.34 : 0.9, 0.6, s.dz ? 0.34 : 0.9); box(M.dark, f, p.x + p.n[0] * 0.175, p.y, p.z + p.n[2] * 0.175, s.dx ? 0.005 : 0.01, 0.56, s.dz ? 0.005 : 0.01); });
      doN(kit.mirror, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 1.55, 0.012); box(M.dark, f, p.x, p.y, p.z, s.dx ? 0.02 : 0.55, 0.7, s.dz ? 0.02 : 0.55); plane(M.mirror, f, [p.x + p.n[0] * 0.012, p.y, p.z + p.n[2] * 0.012], p.u.map((v) => v * 0.25), [0, 0.32, 0], p.n, [[0, 0], [1, 0], [1, 1], [0, 1]]); });
      doN(kit.pipes, () => { const s = wallSlot('pipe'); if (!s) return; const p = wp(s, y0 + h - 0.3 - rng() * 0.4, 0.1); const len = 1.02;
        cyl(rng() < 0.5 ? M.rust : M.metal, f, p.x, p.y, p.z, 0.05 + rng() * 0.04, len, s.dz ? 0 : Math.PI / 2, s.dz ? Math.PI / 2 : 0, s.dx ? Math.PI / 2 : 0);
        if (rng() < 0.4) cyl(M.metal, f, p.x, (y0 + p.y) / 2, p.z, 0.035, p.y - y0, 0, 0); });
      doN(kit.cables, () => { const t = floorSlot(); const cx = t.x + 0.5, cz = t.z + 0.5; for (let k = 0; k < 3; k++) cyl(M.dark, f, cx + (rng() - 0.5) * 0.6, y0 + h - 0.35 - rng() * 0.5, cz + (rng() - 0.5) * 0.6, 0.008, 0.6 + rng() * 0.7, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.4); });
      doN(kit.vent, () => { const t = floorSlot(); box(M.metal, f, t.x + 0.5, y0 + h - 0.015, t.z + 0.5, 0.5, 0.03, 0.5); for (let k = -2; k <= 2; k++) box(M.dark, f, t.x + 0.5 + k * 0.08, y0 + h - 0.032, t.z + 0.5, 0.03, 0.01, 0.4); });
      doN(kit.rug, () => { const t = floorSlot(); const s = 1.2 + rng() * 0.8, ry = rng() < 0.5 ? 0 : Math.PI / 2; const u = [Math.cos(ry) * s / 2, 0, -Math.sin(ry) * s / 2], v = [Math.sin(ry) * s * 0.35, 0, Math.cos(ry) * s * 0.35];
        plane(M.art, f, [t.x + 0.5, y0 + 0.006, t.z + 0.5], u, v, [0, 1, 0], cellUV(12 + Math.floor(rng() * 4))); });
      doN(kit.papers, () => { const t = floorSlot(); for (let k = 0; k < 2; k++) { const a = rng() * 6.28, c = [t.x + 0.2 + rng() * 0.6, y0 + 0.004 + k * 0.001, t.z + 0.2 + rng() * 0.6]; plane(M.paper, f, c, [Math.cos(a) * 0.105, 0, Math.sin(a) * 0.105], [-Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); } });
      doN(kit.chairs, () => { const t = floorSlot(); chair(M, box, f, t.x + 0.5 + (rng() - 0.5) * 0.4, y0, t.z + 0.5 + (rng() - 0.5) * 0.4, rng() * 6.28, rng() < 0.25); });
      doN(kit.boxes, () => { const t = floorSlot(); let yy = y0; const stack = 1 + Math.floor(rng() * 3); for (let k = 0; k < stack; k++) { const sz = 0.35 + rng() * 0.2; box(M.card, f, t.x + 0.5 + (rng() - 0.5) * 0.3, yy + sz * 0.4, t.z + 0.5 + (rng() - 0.5) * 0.3, sz, sz * 0.8, sz * 0.9, rng() * 0.5); yy += sz * 0.8; } });
      doN(kit.buckets, () => { const t = floorSlot(); cyl(M.metal, f, t.x + 0.3 + rng() * 0.4, y0 + 0.15, t.z + 0.3 + rng() * 0.4, 0.14, 0.3); });
      doN(kit.iv, () => { const t = floorSlot(); const cx = t.x + 0.3 + rng() * 0.4, cz = t.z + 0.3 + rng() * 0.4; cyl(M.chrome, f, cx, y0 + 0.9, cz, 0.012, 1.8); for (let k = 0; k < 4; k++) box(M.chrome, f, cx, y0 + 0.03, cz, 0.4, 0.02, 0.02, k * Math.PI / 4); box(NW.makeMat('dBag', { color: 0xc8d0c0, roughness: 0.3, transparent: true, opacity: 0.7 }), f, cx + 0.06, y0 + 1.62, cz, 0.08, 0.16, 0.03); });
      doN(kit.wheelchair, () => { const t = floorSlot(); const cx = t.x + 0.5, cz = t.z + 0.5, ry = rng() * 6.28; box(M.fabric, f, cx, y0 + 0.5, cz, 0.45, 0.05, 0.45, ry); box(M.fabric, f, cx - Math.sin(ry) * 0.22, y0 + 0.75, cz - Math.cos(ry) * 0.22, 0.45, 0.45, 0.04, ry); for (const sd of [-1, 1]) { const ox = Math.cos(ry) * 0.26 * sd, oz = -Math.sin(ry) * 0.26 * sd; cyl(M.chrome, f, cx + ox, y0 + 0.3, cz + oz, 0.3, 0.025, 0, Math.PI / 2, ry); } });
      doN(kit.gurney, () => { const t = floorSlot(); const ry = rng() < 0.5 ? 0 : Math.PI / 2; box(M.chrome, f, t.x + 0.5, y0 + 0.8, t.z + 0.5, 0.65, 0.05, 1.8, ry); box(M.white, f, t.x + 0.5, y0 + 0.85, t.z + 0.5, 0.6, 0.06, 1.7, ry); for (const [a, b] of [[-0.28, -0.8], [0.28, -0.8], [-0.28, 0.8], [0.28, 0.8]]) cyl(M.chrome, f, t.x + 0.5 + (ry ? b : a), y0 + 0.4, t.z + 0.5 + (ry ? a : b), 0.015, 0.8); });
      doN(kit.suitcases, () => { const t = floorSlot(); const s = 0.45 + rng() * 0.25; box(rng() < 0.5 ? M.fabric : M.card, f, t.x + 0.5 + (rng() - 0.5) * 0.4, y0 + 0.13, t.z + 0.5 + (rng() - 0.5) * 0.4, s, 0.26, s * 0.65, rng() * 6.28, 0, rng() < 0.3 ? Math.PI / 2 * 0.98 : 0); });
      doN(kit.buoys, () => { const s = wallSlot('wall'); if (!s) return; const p = wp(s, y0 + 1.5, 0.06); L.B('d:' + M.orange.uuid, M.orange, false, f).addGeometry(new THREE.TorusGeometry(0.28, 0.07, 8, 16), M4(p.x, p.y, p.z, p.ry, 1, 1, 1)); });
      doN(kit.ropes, () => { const t = floorSlot(); L.B('d:' + M.card.uuid, M.card, false, f).addGeometry(new THREE.TorusGeometry(0.25, 0.05, 6, 14), M4(t.x + 0.5, y0 + 0.05, t.z + 0.5, 0, 1, 1, 1, Math.PI / 2)); });
      doN(kit.litter, () => { for (let k = 0; k < Math.min(30, r.area / 6); k++) { const t = floorSlot(); const a = rng() * 6.28; plane(M.decal, f, [t.x + rng(), y0 + 0.006, t.z + rng()], [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], [-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], [0, 1, 0], cellUV(rng() < 0.5 ? 15 : Math.floor(rng() * 4))); } });
      // decals: stains, scorch, handprints, words
      const wallDecal = (cell, size, y) => { const s = wallSlot('decal'); if (!s) return; const p = wp(s, y, 0.003, (rng() - 0.5) * 0.4); plane(M.decal, f, [p.x, p.y, p.z], p.u.map((v) => v * size), [0, size, 0], p.n, cellUV(cell)); };
      doN(kit.stains, () => { if (rng() < 0.5) wallDecal(Math.floor(rng() * 6), 0.4 + rng() * 0.4, y0 + 0.6 + rng() * 1.6); else { const t = floorSlot(); plane(M.decal, f, [t.x + 0.5, y0 + h - 0.004, t.z + 0.5], [0.6, 0, 0], [0, 0, 0.6], [0, -1, 0], cellUV(rng() < 0.5 ? 15 : Math.floor(rng() * 4))); } });
      doN(kit.scorch, () => wallDecal(10, 0.6 + rng() * 0.5, y0 + 0.8 + rng()));
      doN(kit.hand, () => wallDecal(6 + Math.floor(rng() * 2), 0.25, y0 + 1.1 + rng() * 0.6));
      doN(kit.words, () => wallDecal(11 + Math.floor(rng() * 3), 0.55, y0 + 1.4 + rng() * 0.4));
      // things on furniture
      if (kit.deskTop || kit.counterTop) for (const p of w.props) {
        if (p.room !== r.id || (p.ch !== 'T' && p.ch !== 'K')) continue;
        const top = y0 + (p.ch === 'T' ? 0.785 : 0.945), cx = p.x + 0.5, cz = p.z + 0.5;
        if (rng() < 0.7) for (let k = 0; k < 2; k++) { const a = rng() * 6.28; plane(M.paper, f, [cx + (rng() - 0.5) * 0.5, top + 0.002 + k * 0.001, cz + (rng() - 0.5) * 0.4], [Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1], [-Math.sin(a) * 0.14, 0, Math.cos(a) * 0.14], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
        if (kit.deskTop && rng() < 0.5) { const lx = cx + (rng() - 0.5) * 0.5, lz = cz + (rng() - 0.5) * 0.4; cyl(M.dark, f, lx, top + 0.01, lz, 0.07, 0.02); cyl(M.dark, f, lx, top + 0.2, lz, 0.01, 0.38); L.B('d:' + M.dark.uuid, M.dark, false, f).addGeometry(new THREE.ConeGeometry(0.1, 0.12, 12, 1, true), M4(lx, top + 0.42, lz, 0, 1, 1, 1)); }
        if (kit.deskTop && rng() < 0.5) for (let k = 0; k < 3; k++) box(rng() < 0.5 ? M.fabric : M.card, f, cx + 0.25, top + 0.02 + k * 0.04, cz - 0.1, 0.22, 0.035, 0.16, rng() * 0.4);
        if (kit.counterTop) for (let k = 0; k < 3; k++) if (rng() < 0.6) cyl(rng() < 0.5 ? M.white : NW.makeMat('dGlass', { color: 0x2f5a3a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.8 }), f, cx + (rng() - 0.5) * 0.7, top + 0.07, cz + (rng() - 0.5) * 0.4, 0.035, 0.14);
      }
    }
    // room signs beside doors, on the side that is NOT the room (corridor side)
    for (const d of w.doors) {
      if (d.exit || d.rooms.length < 2) continue;
      for (const rid of d.rooms) {
        const r = w.rooms[rid];
        if (r.outdoor || r.kind === 'corridor' || r.kind === 'tunnel' || r.kind === 'stair') continue;
        const other = d.rooms.find((o) => o !== rid);
        if (other == null) continue;
        const idx = uniq.indexOf(r.name.replace(/ \(L\d\)$/, '')); if (idx < 0) continue;
        // which side of the door is the other room
        let sx = 0, sz = 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.roomAt[d.f][(d.z + dz) * w.W + d.x + dx] === other) { sx = dx; sz = dz; }
        if (!sx && !sz) continue;
        const y = d.f * FH + 2.42;
        const c = [d.x + 0.5 + sx * 0.51, y, d.z + 0.5 + sz * 0.51];
        plane(M.sign, d.f, c, sx ? [0, 0, 0.36] : [0.36, 0, 0], [0, 0.09, 0], [sx, 0, sz], signUV(idx));
        break;
      }
    }
    // exterior: street lamps and drainpipes
    L.streetLamps = [];
    const outdoor = w.rooms.filter((r) => r.outdoor && r.kind === 'outdoor');
    for (const r of outdoor) {
      const count = Math.min(4, Math.floor(r.area / 45));
      for (let k = 0; k < count; k++) {
        const t = r.tiles[Math.floor(rng() * r.tiles.length)], x = t % w.W + 0.5, z = ((t / w.W) | 0) + 0.5, y0 = r.f * FH;
        if (!w.walkable(r.f, Math.floor(x), Math.floor(z)) || (w.truck && Math.hypot(x - w.truck.x, z - w.truck.z) < 4)) continue;
        cyl(M.dark, r.f, x, y0 + 2.2, z, 0.05, 4.4); box(M.dark, r.f, x + 0.3, y0 + 4.35, z, 0.7, 0.06, 0.12); box(M.lamp, r.f, x + 0.6, y0 + 4.28, z, 0.24, 0.05, 0.16);
        L.streetLamps.push({ x: x + 0.6, y: y0 + 4.1, z, f: r.f, flick: rng() });
      }
    }
  }

  function chair(M, box, f, x, y0, z, ry, toppled) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
    if (toppled) {
      const p = P(0, 0.22, 0); box(M.wood, f, p[0], p[1], p[2], 0.42, 0.04, 0.42, ry, Math.PI / 2, 0);
      const b = P(0, 0.04, -0.3); box(M.wood, f, b[0], b[1], b[2], 0.42, 0.04, 0.42, ry);
      return;
    }
    const seat = P(0, 0.45, 0); box(M.wood, f, seat[0], seat[1], seat[2], 0.42, 0.04, 0.42, ry);
    const back = P(0, 0.72, -0.2); box(M.wood, f, back[0], back[1], back[2], 0.42, 0.5, 0.04, ry);
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = P(a, 0.22, b); box(M.wood, f, l[0], l[1], l[2], 0.035, 0.44, 0.035, ry); }
  }

  NW.Decor = { decorate };
})();
