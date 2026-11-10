/* Procedural textures (canvas-generated, no external art).
 * Every surface pattern is original and generated from noise at startup.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const cache = {};
  const S = 256;

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }

  /** Value-noise field, tileable. */
  function noiseField(size, cell, seed) {
    const r = rng(seed), n = Math.ceil(size / cell), g = [];
    for (let i = 0; i < n * n; i++) g.push(r());
    const at = (x, y) => g[((y % n + n) % n) * n + ((x % n + n) % n)];
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
      out[y * size + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
    return out;
  }
  function fbm(size, seed, octaves) {
    const out = new Float32Array(size * size); let amp = 1, tot = 0;
    for (let o = 0; o < (octaves || 4); o++) {
      const f = noiseField(size, Math.max(2, size / (4 << o)), seed + o * 97);
      for (let i = 0; i < out.length; i++) out[i] += f[i] * amp;
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  /** Paint base colour modulated by noise, then let `draw` add pattern detail. */
  function make(name, base, opts, draw) {
    if (cache[name]) return cache[name];
    opts = opts || {};
    const c = canvas(S), ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const n = fbm(S, opts.seed || name.length * 31, 5);
    const [r, g, b] = hex(base);
    const amt = opts.noise == null ? 0.25 : opts.noise;
    for (let i = 0; i < S * S; i++) {
      const k = 1 - amt / 2 + n[i] * amt;
      img.data[i * 4] = Math.min(255, r * k); img.data[i * 4 + 1] = Math.min(255, g * k); img.data[i * 4 + 2] = Math.min(255, b * k); img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const R = rng(opts.seed || 7);
    if (draw) draw(ctx, R);
    // grime: stains and water marks for decay
    if (opts.grime) {
      for (let i = 0; i < opts.grime; i++) {
        const x = R() * S, y = R() * S, rad = 10 + R() * 50;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(30,25,15,' + (0.12 + R() * 0.2) + ')'); gr.addColorStop(1, 'rgba(30,25,15,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // drips running down
      for (let i = 0; i < opts.grime / 2; i++) {
        const x = R() * S, y = R() * S * 0.5, len = 30 + R() * 120;
        const gr = ctx.createLinearGradient(x, y, x, y + len);
        gr.addColorStop(0, 'rgba(40,35,20,0.25)'); gr.addColorStop(1, 'rgba(40,35,20,0)');
        ctx.fillStyle = gr; ctx.fillRect(x, y, 2 + R() * 3, len);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    cache[name] = tex;
    return tex;
  }

  const T = {
    concrete: () => make('concrete', '#7c7a74', { noise: 0.4, grime: 14, seed: 11 }, (ctx, R) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(0,0,0,' + R() * 0.25 + ')'; ctx.fillRect(R() * S, R() * S, 2, 2); }
    }),
    rock: () => make('rock', '#5f5a52', { noise: 0.7, grime: 6, seed: 23 }),
    plaster: () => make('plaster', '#b8b2a3', { noise: 0.18, grime: 16, seed: 3 }, (ctx, R) => {
      ctx.strokeStyle = 'rgba(60,50,40,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); let x = R() * S, y = R() * S; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 30; y += R() * 20; ctx.lineTo(x, y); } ctx.stroke(); }
    }),
    clinicWall: () => make('clinicWall', '#9fb3a2', { noise: 0.15, grime: 18, seed: 5 }, (ctx, R) => {
      // tiled dado on the lower half
      ctx.fillStyle = '#cfd6c8'; ctx.fillRect(0, S * 0.55, S, S * 0.45);
      ctx.strokeStyle = 'rgba(70,80,70,0.5)';
      for (let y = S * 0.55; y < S; y += 21) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
      for (let x = 0; x < S; x += 32) { ctx.beginPath(); ctx.moveTo(x, S * 0.55); ctx.lineTo(x, S); ctx.stroke(); }
      ctx.fillStyle = '#6d7d6f'; ctx.fillRect(0, S * 0.53, S, 6);
    }),
    wallpaper: () => make('wallpaper', '#8d7b5c', { noise: 0.15, grime: 20, seed: 9 }, (ctx, R) => {
      for (let x = 0; x < S; x += 32) { ctx.fillStyle = 'rgba(70,50,30,0.25)'; ctx.fillRect(x, 0, 10, S); }
      ctx.fillStyle = 'rgba(160,140,90,0.35)';
      for (let y = 0; y < S; y += 32) for (let x = 16; x < S; x += 32) { ctx.beginPath(); ctx.ellipse(x + 5, y + 16, 4, 8, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 5, y + 16, 8, 3, -0.4, 0, 7); ctx.fill(); }
      // peeling strip
      ctx.fillStyle = 'rgba(190,180,160,0.7)'; ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(214, 0); ctx.lineTo(205, 90); ctx.lineTo(190, 60); ctx.fill();
    }),
    panel: () => make('panel', '#5b4532', { noise: 0.2, grime: 8, seed: 13 }, (ctx) => {
      ctx.strokeStyle = 'rgba(20,10,5,0.6)'; ctx.lineWidth = 3;
      for (let x = 0; x < S; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,220,180,0.06)'; for (let x = 4; x < S; x += 64) ctx.fillRect(x, 0, 8, S);
    }),
    metal: () => make('metal', '#5d6466', { noise: 0.3, grime: 12, seed: 17 }, (ctx, R) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, S - 2, S / 2 - 2); ctx.strokeRect(1, S / 2 + 1, S - 2, S / 2 - 2);
      ctx.fillStyle = 'rgba(20,20,20,0.6)'; for (let x = 8; x < S; x += 24) { ctx.beginPath(); ctx.arc(x, 8, 2.5, 0, 7); ctx.arc(x, S / 2 + 8, 2.5, 0, 7); ctx.fill(); }
      for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(120,60,20,' + R() * 0.35 + ')'; ctx.beginPath(); ctx.arc(R() * S, R() * S, 2 + R() * 12, 0, 7); ctx.fill(); }
    }),
    hullPaint: () => make('hullPaint', '#d9d4c5', { noise: 0.2, grime: 22, seed: 29 }, (ctx, R) => {
      for (let i = 0; i < 25; i++) { ctx.fillStyle = 'rgba(120,50,20,' + R() * 0.4 + ')'; ctx.fillRect(R() * S, R() * S, 2 + R() * 5, 10 + R() * 60); }
    }),
    // floors
    boards: () => make('boards', '#6b4f36', { noise: 0.25, grime: 10, seed: 41 }, (ctx, R) => {
      for (let y = 0; y < S; y += 32) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y, S, 2); const off = R() * S; ctx.fillRect(off, y, 2, 32); ctx.fillStyle = 'rgba(255,230,190,' + R() * 0.07 + ')'; ctx.fillRect(0, y + 2, S, 30); }
    }),
    tile: () => make('tile', '#b9b6ad', { noise: 0.12, grime: 18, seed: 43 }, (ctx, R) => {
      ctx.strokeStyle = 'rgba(40,40,35,0.55)'; ctx.lineWidth = 2;
      for (let i = 0; i <= S; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(30,30,30,0.3)'; ctx.fillRect(Math.floor(R() * 8) * 32 + 2, Math.floor(R() * 8) * 32 + 2, 30, 30); }
    }),
    checker: () => make('checker', '#a59a85', { noise: 0.12, grime: 18, seed: 47 }, (ctx) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(40,40,45,0.55)'; ctx.fillRect(x * 32, y * 32, 32, 32); }
    }),
    carpet: () => make('carpet', '#5a3a36', { noise: 0.35, grime: 20, seed: 53 }, (ctx, R) => {
      for (let i = 0; i < 4000; i++) { ctx.fillStyle = 'rgba(0,0,0,' + R() * 0.15 + ')'; ctx.fillRect(R() * S, R() * S, 1, 2); }
      ctx.strokeStyle = 'rgba(160,120,80,0.15)'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, S - 40, S - 40);
    }),
    lino: () => make('lino', '#7d8a7a', { noise: 0.2, grime: 22, seed: 59 }),
    gravel: () => make('gravel', '#4d4b46', { noise: 0.6, seed: 61 }, (ctx, R) => {
      for (let i = 0; i < 2500; i++) { const v = 40 + R() * 80; ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`; ctx.fillRect(R() * S, R() * S, 1 + R() * 3, 1 + R() * 3); }
    }),
    asphalt: () => make('asphalt', '#2f3032', { noise: 0.4, seed: 67 }, (ctx, R) => {
      for (let i = 0; i < 2000; i++) { const v = 30 + R() * 50; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(R() * S, R() * S, 1, 1); }
      ctx.fillStyle = 'rgba(200,190,120,0.4)'; ctx.fillRect(0, S / 2 - 3, S * 0.45, 6);
    }),
    deck: () => make('deck', '#6f6a5c', { noise: 0.3, grime: 14, seed: 71 }, (ctx, R) => {
      for (let x = 0; x < S; x += 21) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, 0, 2, S); }
      for (let i = 0; i < 20; i++) { ctx.fillStyle = 'rgba(110,50,20,' + R() * 0.3 + ')'; ctx.beginPath(); ctx.arc(R() * S, R() * S, 3 + R() * 10, 0, 7); ctx.fill(); }
    }),
    ceiling: () => make('ceiling', '#a9a597', { noise: 0.15, grime: 16, seed: 73 }, (ctx, R) => {
      ctx.strokeStyle = 'rgba(40,40,40,0.4)'; ctx.lineWidth = 2;
      for (let i = 0; i <= S; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke(); }
      ctx.fillStyle = 'rgba(15,15,15,0.85)'; ctx.fillRect(64 * Math.floor(R() * 4) + 2, 64 * Math.floor(R() * 4) + 2, 60, 60);
    }),
    wood: () => make('wood', '#5a3f2a', { noise: 0.3, seed: 79 }, (ctx, R) => {
      for (let y = 0; y < S; y += 3) { ctx.fillStyle = 'rgba(30,15,5,' + R() * 0.2 + ')'; ctx.fillRect(0, y, S, 1); }
    }),
    fabric: () => make('fabric', '#4c4a55', { noise: 0.35, seed: 83 }),
    rust: () => make('rust', '#6a4a35', { noise: 0.6, grime: 10, seed: 89 }),
    paper: () => make('paper', '#d8d0bb', { noise: 0.1, seed: 97 }, (ctx) => {
      ctx.fillStyle = 'rgba(40,40,60,0.55)';
      for (let y = 30; y < S - 20; y += 14) ctx.fillRect(24, y, 120 + ((y * 37) % 80), 3);
    }),
    water: () => make('water', '#1b2a2c', { noise: 0.5, seed: 101 })
  };

  /** Material palette per location and room kind. */
  const THEMES = {
    observatory: { wall: 'concrete', floor: 'lino', ceil: 'ceiling', byKind: { dome: { wall: 'metal', floor: 'deck' }, tunnel: { wall: 'rock', floor: 'concrete', ceil: 'rock' }, lab: { wall: 'clinicWall', floor: 'tile' }, office: { wall: 'panel', floor: 'carpet' }, outdoor: { floor: 'gravel' }, deck: { floor: 'deck' }, utility: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, storage: { floor: 'concrete', ceil: 'concrete' }, generator: { floor: 'concrete' }, bath: { wall: 'clinicWall', floor: 'tile' }, kitchen: { floor: 'checker' } } },
    apartments: { wall: 'wallpaper', floor: 'carpet', ceil: 'plaster', byKind: { corridor: { wall: 'plaster', floor: 'lino' }, lobby: { wall: 'plaster', floor: 'checker' }, bath: { wall: 'clinicWall', floor: 'tile' }, kitchen: { floor: 'checker' }, laundry: { wall: 'concrete', floor: 'tile' }, stair: { wall: 'plaster', floor: 'concrete' }, tunnel: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, storage: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, generator: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, utility: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, outdoor: { floor: 'asphalt' }, roof: { floor: 'concrete' }, office: { wall: 'panel', floor: 'boards' } } },
    clinic: { wall: 'clinicWall', floor: 'lino', ceil: 'ceiling', byKind: { lobby: { floor: 'checker' }, theatre: { wall: 'clinicWall', floor: 'tile' }, archive: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, morgue: { wall: 'clinicWall', floor: 'tile', ceil: 'concrete' }, tunnel: { wall: 'rock', floor: 'concrete', ceil: 'rock' }, utility: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, generator: { wall: 'concrete', floor: 'concrete' }, office: { wall: 'panel', floor: 'boards' }, stair: { wall: 'plaster', floor: 'concrete' }, outdoor: { floor: 'gravel' } } },
    ferry: { wall: 'plaster', floor: 'tile', ceil: 'ceiling', byKind: { hall: { wall: 'plaster', floor: 'checker' }, cafe: { floor: 'checker' }, baggage: { wall: 'concrete', floor: 'concrete' }, dock: { wall: 'metal', floor: 'concrete', ceil: 'metal' }, deck: { floor: 'deck' }, cabin: { wall: 'hullPaint', floor: 'deck', ceil: 'hullPaint' }, control: { wall: 'hullPaint', floor: 'deck', ceil: 'hullPaint' }, tunnel: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, storage: { wall: 'rust', floor: 'metal', ceil: 'rust' }, generator: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, office: { wall: 'panel', floor: 'carpet' }, outdoor: { floor: 'asphalt' } } }
  };
  function surfaceFor(locId, kind, part) {
    const th = THEMES[locId] || THEMES.observatory;
    const k = th.byKind[kind] || {};
    return k[part] || th[part];
  }

  NW.Tex = { get: (n) => (T[n] ? T[n]() : T.concrete()), surfaceFor, canvas, rng };
})();
