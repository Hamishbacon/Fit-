/* Procedural texture factory: skin, fabrics, clothing prints, environment surfaces and signage. All canvas-generated, cached. */
'use strict';
GR.Tex = (() => {
  const U = GR.U;
  const cache = new Map();
  let maxAniso = 4;
  const setAniso = a => { maxAniso = a; };

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toTex = (c, repeat, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.needsUpdate = true;
    return t;
  };
  const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

  // value noise with octaves on a canvas-sized grid, tileable.
  function noiseField(w, h, seed, cell, oct = 4) {
    const r = U.rng(seed), out = new Float32Array(w * h);
    let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const cw = Math.max(1, Math.round(w / cell)), ch = Math.max(1, Math.round(h / cell));
      const g = new Float32Array(cw * ch); for (let i = 0; i < g.length; i++) g[i] = r();
      for (let y = 0; y < h; y++) {
        const gy = y / h * ch, y0 = Math.floor(gy), fy = gy - y0, y1 = (y0 + 1) % ch, sy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < w; x++) {
          const gx = x / w * cw, x0 = Math.floor(gx), fx = gx - x0, x1 = (x0 + 1) % cw, sx = fx * fx * (3 - 2 * fx);
          const a = g[y0 * cw + x0], b = g[y0 * cw + x1], c = g[y1 * cw + x0], d = g[y1 * cw + x1];
          out[y * w + x] += amp * U.lerp(U.lerp(a, b, sx), U.lerp(c, d, sx), sy);
        }
      }
      tot += amp; amp *= 0.5; cell = Math.max(1, cell / 2);
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  // height (0..1 Float32Array) → tangent-space normal map canvas
  function normalFromHeight(hgt, w, h, strength) {
    const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const l = hgt[y * w + (x - 1 + w) % w], rr = hgt[y * w + (x + 1) % w], u = hgt[((y - 1 + h) % h) * w + x], dn = hgt[((y + 1) % h) * w + x];
      let nx = (l - rr) * strength, ny = (dn - u) * strength, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return c;
  }
  function heightFromCanvas(c) {
    const ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, c.width, c.height).data, out = new Float32Array(c.width * c.height);
    for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765;
    return out;
  }

  /* ---------- SKIN ---------- */
  // Subtle albedo variation map (greyscale-ish around white so it multiplies the skin colour) + pore normal map.
  const skinMap = () => memo('skinmap', () => {
    const w = 256, c = canvas(w, w), ctx = c.getContext('2d'), img = ctx.createImageData(w, w), n = noiseField(w, w, 11, 32, 5), n2 = noiseField(w, w, 77, 6, 2);
    for (let i = 0; i < w * w; i++) { const v = 0.9 + n[i] * 0.1 - n2[i] * 0.04; img.data[i * 4] = 255 * Math.min(1, v + 0.02); img.data[i * 4 + 1] = 255 * v; img.data[i * 4 + 2] = 255 * (v - 0.01); img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0); return toTex(c, [2, 2]);
  });
  const skinNormal = () => memo('skinnormal', () => { const w = 256, n = noiseField(w, w, 3, 4, 3); return toTex(normalFromHeight(n, w, w, 1.6), [3, 3], false); });

  /* ---------- FABRICS (normal maps) ---------- */
  const fabricNormal = kind => memo('fab_' + kind, () => {
    const w = 128, c = canvas(w, w), ctx = c.getContext('2d');
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, w);
    if (kind === 'denim') { for (let i = -w; i < w * 2; i += 3) { ctx.strokeStyle = i % 6 ? '#9a9a9a' : '#5e5e5e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + w, w); ctx.stroke(); } }
    else if (kind === 'knit') { for (let y = 0; y < w; y += 4) for (let x = 0; x < w; x += 4) { ctx.fillStyle = (x + y) % 8 ? '#a0a0a0' : '#6a6a6a'; ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 1.6, 2.2, 0, 0, 7); ctx.fill(); } }
    else if (kind === 'mesh') { for (let y = 0; y < w; y += 6) for (let x = (y / 6 % 2) * 3; x < w; x += 6) { ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 7); ctx.fill(); } }
    else if (kind === 'fleece') { const n = noiseField(w, w, 9, 4, 3); return toTex(normalFromHeight(n, w, w, 3), [4, 4], false); }
    else if (kind === 'nylon') { for (let y = 0; y < w; y += 2) { ctx.fillStyle = y % 4 ? '#8a8a8a' : '#767676'; ctx.fillRect(0, y, w, 1); } }
    else if (kind === 'leather') { const n = noiseField(w, w, 21, 8, 3); return toTex(normalFromHeight(n, w, w, 2.5), [3, 3], false); }
    return toTex(normalFromHeight(heightFromCanvas(c), w, w, 2.2), [6, 6], false);
  });
  const fabricOf = kind => ({ tee: 'knit', oversized: 'knit', tank: 'knit', singlet: 'mesh', jersey: 'mesh', football: 'mesh', longsleeve: 'knit', hoodie: 'fleece', ziphoodie: 'fleece', puffer: 'nylon', jacket: 'nylon', trackjacket: 'nylon',
    baggyjeans: 'denim', jeans: 'denim', cargo: 'denim', trackpants: 'nylon', gymshorts: 'nylon', bballshorts: 'mesh', sweats: 'fleece', shorts: 'knit' }[kind] || 'knit');

  /* ---------- CLOTHING PRINT TEXTURES ---------- */
  // UV convention (see character.js sweep): u wraps around the body (0.5 = front centre), v runs top→bottom of the segment.
  const contrast = (hex, brand) => { if (brand && GR.Data.BRANDS[brand]) { const b = GR.Data.BRANDS[brand]; const cand = [b.acc, b.col]; const best = cand.sort((a, c) => Math.abs(U.luminance(c) - U.luminance(hex)) - Math.abs(U.luminance(a) - U.luminance(hex)))[0]; if (Math.abs(U.luminance(best) - U.luminance(hex)) > 0.25) return best; } return U.luminance(hex) > 0.55 ? '#16161a' : '#f4f4f2'; };
  function drawFabricNoise(ctx, w, h, hex, amt, seed) {
    const n = noiseField(w, h, seed, 16, 4), img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < w * h; i++) { const f = 1 + (n[i] - 0.5) * amt; d[i * 4] *= f; d[i * 4 + 1] *= f; d[i * 4 + 2] *= f; }
    ctx.putImageData(img, 0, 0);
  }
  function seam(ctx, x1, y1, x2, y2, col) { ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  function textFit(ctx, txt, x, y, maxW, size, font = 'Impact, "Arial Black", sans-serif') {
    let s = size; ctx.font = `${s}px ${font}`; while (ctx.measureText(txt).width > maxW && s > 8) { s -= 2; ctx.font = `${s}px ${font}`; }
    ctx.fillText(txt, x, y); return s;
  }

  /** part: 'torso' | 'torsoLow' | 'sleeve' | 'leg' | 'pelvis' | 'shoe' | 'hood' */
  function clothing(item, hex, part = 'torso') {
    const low = part === 'torsoLow'; if (low) part = 'torsoL';
    const key = `cl_${item.id}_${hex}_${part}`;
    return memo(key, () => {
      const isTorso = part === 'torso' || part === 'torsoL';
      const W = 256, H = 256, c = canvas(W, H), ctx = c.getContext('2d');
      const acc = contrast(hex, item.brand), dark = U.shade(hex, -0.25), light = U.shade(hex, 0.18), brand = item.brand ? GR.Data.BRANDS[item.brand] : null;
      const P = item.pattern, r = U.rng(item.id);
      ctx.fillStyle = hex; ctx.fillRect(0, 0, W, H);
      // base patterns
      if (P === 'stripe') {
        if (part === 'leg' || part === 'sleeve') { ctx.fillStyle = acc; ctx.fillRect(W * 0.2, 0, 10, H); ctx.fillRect(W * 0.2 + 16, 0, 6, H); ctx.fillRect(W * 0.8 - 16, 0, 10, H); ctx.fillRect(W * 0.8 + 0, 0, 6, H); }
        else { ctx.fillStyle = acc; for (let y = 30; y < H; y += 48) ctx.fillRect(0, y, W, 12); }
      } else if (P === 'hoops') { ctx.fillStyle = acc; for (let y = 0; y < H; y += 40) ctx.fillRect(0, y, W, 20); }
      else if (P === 'sash' && isTorso) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.6); ctx.fillStyle = acc; ctx.fillRect(-W, -16, W * 2, 32); ctx.restore(); }
      else if (P === 'camo') { const cols = [U.shade(hex, -0.3), U.shade(hex, 0.15), '#3b3b2a', U.mix(hex, '#556b2f', 0.5)]; for (let i = 0; i < 70; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); const x = r() * W, y = r() * H; for (let k = 0; k < 7; k++) { const a = k / 7 * U.TAU, rr = 10 + r() * 16; ctx.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); } ctx.fill(); } }
      else if (P === 'tiedye') { const cols = [hex, acc, '#ff4fa3', '#28e0ff', '#ffd23f', item.colors[(item.colors.indexOf(hex) + 2) % item.colors.length]]; for (let i = 14; i > 0; i--) { ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.85; ctx.beginPath(); for (let a = 0; a <= U.TAU + 0.01; a += 0.1) { const rr = i * 13 + Math.sin(a * 6 + i) * 8; ctx.lineTo(W / 2 + Math.cos(a) * rr, H * 0.45 + Math.sin(a) * rr * 0.8); } ctx.fill(); } ctx.globalAlpha = 1; }
      else if (P === 'check') { ctx.globalAlpha = 0.45; ctx.fillStyle = dark; for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 14, H); for (let y = 0; y < H; y += 32) ctx.fillRect(0, y, W, 14); ctx.globalAlpha = 0.35; ctx.fillStyle = acc; for (let x = 22; x < W; x += 32) ctx.fillRect(x, 0, 2, H); for (let y = 22; y < H; y += 32) ctx.fillRect(0, y, W, 2); ctx.globalAlpha = 1; }
      else if (P === 'gradient') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, light); g.addColorStop(0.5, hex); g.addColorStop(1, acc === '#f4f4f2' ? '#ff4fa3' : acc); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      else if (P === 'split') { if (isTorso) { ctx.fillStyle = acc; ctx.fillRect(0, H * 0.55, W, H); ctx.fillStyle = item.colors[(item.colors.indexOf(hex) + 3) % item.colors.length]; ctx.fillRect(0, H * 0.5, W, H * 0.06); } else { ctx.fillStyle = acc; ctx.fillRect(0, 0, W * 0.5, H); } }
      else if (P === 'quilt') { ctx.strokeStyle = dark; ctx.lineWidth = 3; for (let y = 16; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } const g = ctx.createLinearGradient(0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); for (let y = 16; y < H; y += 30) { ctx.save(); ctx.translate(0, y); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 30); ctx.restore(); } }
      else if (P === 'varsity') { if (part === 'torsoL') { ctx.fillStyle = hex; ctx.fillRect(0, H * 0.92, W, H); ctx.fillStyle = acc; ctx.fillRect(0, H * 0.92, W, 4); } else if (part === 'sleeve') { ctx.fillStyle = acc; ctx.fillRect(0, 0, W, H); ctx.fillStyle = hex; ctx.fillRect(0, H * 0.9, W, H * 0.1); } else { ctx.fillStyle = acc; ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('M', W * 0.42, H * 0.38); ctx.fillStyle = hex; ctx.fillRect(0, H * 0.92, W, H); ctx.fillStyle = acc; ctx.fillRect(0, H * 0.92, W, 4); } }
      else if (P === 'denim') { const n = noiseField(W, H, U.hash(hex), 8, 4); const img = ctx.getImageData(0, 0, W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, fade = Math.exp(-Math.pow((x - W * 0.5) / 40, 2)) * 0.25 + Math.exp(-Math.pow((x - W * 0.0) / 30, 2)) * 0.15; const f = 1 + (n[i] - 0.5) * 0.35 + fade * (y > H * 0.2 && y < H * 0.75 ? 1 : 0.3) + (((x + y) % 4) < 2 ? 0.04 : -0.04); img.data[i * 4] *= f; img.data[i * 4 + 1] *= f; img.data[i * 4 + 2] *= f; } ctx.putImageData(img, 0, 0);
        seam(ctx, W * 0.75, 0, W * 0.75, H, '#d9a441'); seam(ctx, W * 0.25, 0, W * 0.25, H, '#d9a441'); if (part === 'pelvis') { seam(ctx, 0, H * 0.18, W, H * 0.18, '#d9a441'); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.1, 4, 0, 7); ctx.fill(); seam(ctx, W * 0.5, H * 0.2, W * 0.5, H * 0.9, '#d9a441'); } }
      else if (P === 'cargo') { if (part === 'leg') { ctx.fillStyle = dark; ctx.fillRect(W * 0.68, H * 0.3, 52, 64); ctx.fillStyle = U.shade(hex, -0.12); ctx.fillRect(W * 0.68, H * 0.3, 52, 16); seam(ctx, W * 0.68, H * 0.3 + 16, W * 0.68 + 52, H * 0.3 + 16, acc); } seam(ctx, W * 0.25, 0, W * 0.25, H, dark); seam(ctx, W * 0.75, 0, W * 0.75, H, dark); }
      else if (P === 'ringer' && (part === 'sleeve')) { ctx.fillStyle = acc; ctx.fillRect(0, H * 0.82, W, H * 0.18); }
      else if (P === 'shoe') { /* handled by shoe material colours */ }
      // fabric grain
      drawFabricNoise(ctx, W, H, hex, P === 'denim' ? 0.08 : 0.12, U.hash(key));
      if (part === 'torsoL') { const dk = U.shade(hex, -0.25); seam(ctx, W * 0.25, 0, W * 0.25, H, dk); seam(ctx, W * 0.75, 0, W * 0.75, H, dk); seam(ctx, 0, H - 6, W, H - 6, dk); }
      // torso prints (front centre u=0.5 → x=128; back at x=0/256)
      if (part === 'torso') {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (P === 'graphic') { ctx.fillStyle = acc; const t = item.graphic || 'MOG CITY'; const words = t.split(' '); if (words.length > 1 && t.length > 9) { textFit(ctx, words.slice(0, Math.ceil(words.length / 2)).join(' '), W / 2, H * 0.3, 80, 30); textFit(ctx, words.slice(Math.ceil(words.length / 2)).join(' '), W / 2, H * 0.43, 80, 30); } else textFit(ctx, t, W / 2, H * 0.36, 84, 40); ctx.globalAlpha = 0.9; ctx.fillRect(W / 2 - 30, H * 0.52, 60, 3); ctx.globalAlpha = 1; }
        if (P === 'number') { ctx.fillStyle = acc; textFit(ctx, item.team || 'TEAM', W / 2, H * 0.22, 80, 20); ctx.font = 'bold 64px Impact, sans-serif'; ctx.fillText(String(item.num ?? 7), W / 2, H * 0.45); ctx.fillText(String(item.num ?? 7), 0, H * 0.4); ctx.fillText(String(item.num ?? 7), W, H * 0.4); ctx.strokeStyle = acc; ctx.lineWidth = 6; ctx.strokeRect(-3, -3, W + 6, 10); }
        if (P === 'hoops' || P === 'sash') { ctx.fillStyle = U.luminance(acc) > 0.5 ? '#111' : '#fff'; ctx.font = 'bold 44px Impact, sans-serif'; ctx.fillText(String(item.num ?? 9), 0, H * 0.4); ctx.fillText(String(item.num ?? 9), W, H * 0.4); ctx.font = 'bold 16px Arial'; ctx.fillText(item.team || '', W * 0.56, H * 0.2); }
        if (P === 'logo' || (brand && ['solid', 'stripe', 'quilt', 'split', 'gradient', 'pocket'].includes(P))) { ctx.fillStyle = acc; ctx.font = 'bold 13px "Arial Black", Arial'; ctx.fillText(brand ? brand.n : 'MOG', W * 0.43, H * 0.24); if (P === 'logo') { ctx.font = 'bold 22px Impact'; ctx.fillText(brand ? brand.n : 'MOG', 0, H * 0.25); ctx.fillText(brand ? brand.n : 'MOG', W, H * 0.25); } }
        if (P === 'pocket') { ctx.fillStyle = dark; ctx.fillRect(W * 0.52, H * 0.22, 22, 24); seam(ctx, W * 0.52, H * 0.22 + 4, W * 0.52 + 22, H * 0.22 + 4, acc); }
        // side seams + hem stitch
        seam(ctx, W * 0.25, 0, W * 0.25, H, dark); seam(ctx, W * 0.75, 0, W * 0.75, H, dark); seam(ctx, 0, H - 6, W, H - 6, dark);
      }
      if (part === 'sleeve') seam(ctx, 0, H - 6, W, H - 6, dark);
      if (part === 'leg' && item.slot === 'bottom') { seam(ctx, W * 0.5, 0, W * 0.5, H, dark); }
      if (part === 'leg' && P === 'logo' && brand) { ctx.save(); ctx.translate(W * 0.62, H * 0.2); ctx.fillStyle = acc; ctx.font = 'bold 12px Arial Black'; ctx.fillText(brand.n, 0, 0); ctx.restore(); }
      return toTex(c);
    });
  }

  /* ---------- FACE DETAIL (decals on the head texture) ---------- */
  // Head UV = sphere UV (u around with 0.75 = front for SphereGeometry? we remap in character.js so u=0.5 is front). Draw freckles, paint, masks.
  function faceTex(appr) {
    const cos = appr.cosmetics || {};
    const key = `face_${appr.freckles}_${appr.beautyMark}_${cos.paint}_${cos.mask}_${cos.liner}_${cos.glitter}_${cos.blush}`;
    return memo(key, () => {
      const W = 512, H = 256, c = canvas(W, H), ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const n = noiseField(W, H, 5, 32, 4), img = ctx.getImageData(0, 0, W, H);
      for (let i = 0; i < W * H; i++) { const v = 0.93 + n[i] * 0.07; img.data[i * 4] = 255 * Math.min(1, v + 0.015); img.data[i * 4 + 1] = 255 * v; img.data[i * 4 + 2] = 255 * (v - 0.01); }
      ctx.putImageData(img, 0, 0);
      const fx = W * 0.5; // front centre
      const r = U.rng(7);
      if (appr.freckles > 0) { ctx.fillStyle = 'rgba(120,70,40,0.55)'; const cnt = Math.floor(appr.freckles * 70); for (let i = 0; i < cnt; i++) { const s = r() > 0.5 ? 1 : -1; const x = fx + s * (10 + r() * 46), y = H * (0.5 + r() * 0.1); ctx.beginPath(); ctx.arc(x, y, 0.8 + r() * 1.3, 0, 7); ctx.fill(); } }
      if (appr.beautyMark) { ctx.fillStyle = 'rgba(50,25,15,0.9)'; ctx.beginPath(); ctx.arc(fx + 30, H * 0.66, 2.4, 0, 7); ctx.fill(); }
      if (cos.blush) { for (const s of [-1, 1]) { const g = ctx.createRadialGradient(fx + s * 44, H * 0.58, 1, fx + s * 44, H * 0.58, 22); g.addColorStop(0, `rgba(255,90,110,${0.35 * cos.blush})`); g.addColorStop(1, 'rgba(255,90,110,0)'); ctx.fillStyle = g; ctx.fillRect(fx + s * 44 - 24, H * 0.58 - 24, 48, 48); } }
      if (cos.paint === 'eyeblack') { ctx.fillStyle = '#111'; for (const s of [-1, 1]) { ctx.fillRect(fx + s * 36 - 12, H * 0.555, 24, 5); ctx.fillRect(fx + s * 36 - 12, H * 0.575, 24, 4); } }
      if (cos.paint === 'star') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * U.TAU - Math.PI / 2, rr = k % 2 ? 4 : 10; ctx.lineTo(fx + 46 + Math.cos(a) * rr, H * 0.57 + Math.sin(a) * rr); } ctx.fill(); }
      if (cos.paint === 'city') { for (const s of [-1, 1]) { ctx.fillStyle = '#16a34a'; ctx.fillRect(fx + s * 44 - 10, H * 0.55, 9, 18); ctx.fillStyle = '#facc15'; ctx.fillRect(fx + s * 44 + 1, H * 0.55, 9, 18); } }
      if (cos.liner) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + s * 22, H * 0.46); ctx.lineTo(fx + s * 52, H * 0.44); ctx.stroke(); } }
      if (cos.glitter) { for (let i = 0; i < 80; i++) { ctx.fillStyle = U.pick(['#fff6', '#ffd23f', '#ff4fa3', '#28e0ff']); const s = r() > 0.5 ? 1 : -1; ctx.fillRect(fx + s * (30 + r() * 30), H * (0.45 + r() * 0.12), 2, 2); } }
      if (cos.mask) { const col = { sheet: 'rgba(250,250,250,0.92)', clay: 'rgba(120,170,110,0.95)', gold: 'rgba(232,196,90,0.95)' }[cos.mask]; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(fx, H * 0.56, 70, 62, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * 30, H * 0.47, 12, 7, 0, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.ellipse(fx, H * 0.7, 14, 6, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; if (cos.mask === 'gold') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 30; i++) ctx.fillRect(fx - 60 + r() * 120, H * 0.35 + r() * 80, 3, 1); } }
      return toTex(c);
    });
  }

  /* ---------- EYES (equirectangular eyeball: front of the sphere = centre of the texture after rotation) ---------- */
  const eyeTex = hex => memo('eye_' + hex, () => {
    const W = 256, H = 128, c = canvas(W, H), x = c.getContext('2d');
    const g0 = x.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#e9e4df'); g0.addColorStop(0.5, '#fbf8f4'); g0.addColorStop(1, '#e4ddd8'); x.fillStyle = g0; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(200,90,90,0.18)'; x.lineWidth = 0.8; for (let i = 0; i < 14; i++) { x.beginPath(); const sx = W * (0.25 + (i % 2) * 0.5) + (Math.random() - 0.5) * 40; x.moveTo(sx, Math.random() * H); x.quadraticCurveTo(W / 2, H / 2 + (Math.random() - 0.5) * 30, W / 2 + (Math.random() - 0.5) * 30, H / 2); x.stroke(); }
    const cx = W / 2, cy = H / 2, rx = 0.62 / (2 * Math.PI) * W, ry = 0.62 / Math.PI * H;
    const gi = x.createRadialGradient(cx, cy, 1, cx, cy, rx); gi.addColorStop(0, U.shade(hex, 0.35)); gi.addColorStop(0.55, hex); gi.addColorStop(0.92, U.shade(hex, -0.45)); gi.addColorStop(1, '#1a1210');
    x.fillStyle = gi; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.12)'; for (let a = 0; a < 40; a++) { const t = a / 40 * U.TAU; x.beginPath(); x.moveTo(cx + Math.cos(t) * rx * 0.35, cy + Math.sin(t) * ry * 0.35); x.lineTo(cx + Math.cos(t) * rx * 0.85, cy + Math.sin(t) * ry * 0.85); x.stroke(); }
    x.fillStyle = '#060404'; x.beginPath(); x.ellipse(cx, cy, rx * 0.42, ry * 0.42, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(cx + rx * 0.28, cy - ry * 0.3, rx * 0.15, ry * 0.15, 0, 0, 7); x.fill();
    return toTex(c);
  });

  /* ---------- HAIR ---------- */
  const hairTex = hex => memo('hair_' + hex, () => {
    const W = 128, H = 256, c = canvas(W, H), ctx = c.getContext('2d'); ctx.fillStyle = hex; ctx.fillRect(0, 0, W, H);
    const r = U.rng(hex);
    for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H, l = 20 + r() * 60; ctx.strokeStyle = r() > 0.5 ? U.shade(hex, 0.25 + r() * 0.2) : U.shade(hex, -0.35); ctx.globalAlpha = 0.25 + r() * 0.3; ctx.lineWidth = 0.6 + r(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (r() - 0.5) * 6, y + l / 2, x + (r() - 0.5) * 4, y + l); ctx.stroke(); }
    ctx.globalAlpha = 1; return toTex(c, [2, 1]);
  });
  const hairNormal = () => memo('hairN', () => { const W = 128, H = 128, c = canvas(W, H), ctx = c.getContext('2d'); ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); const r = U.rng(4); for (let i = 0; i < 400; i++) { ctx.strokeStyle = r() > 0.5 ? '#b0b0b0' : '#505050'; ctx.lineWidth = 1; const x = r() * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (r() - 0.5) * 6, H); ctx.stroke(); } return toTex(normalFromHeight(heightFromCanvas(c), W, H, 2), [3, 3], false); });
  const fadeTex = (hex, skinHex) => memo('fade_' + hex + skinHex, () => { // buzz/fade scalp: dots of hair over transparent, fading toward the bottom
    const W = 256, H = 256, c = canvas(W, H), ctx = c.getContext('2d'); const r = U.rng(hex + 'f');
    for (let i = 0; i < 9000; i++) { const x = r() * W, y = r() * H, dens = U.smooth(H * 0.95, H * 0.45, y); if (r() > dens) continue; ctx.fillStyle = r() > 0.3 ? hex : U.shade(hex, 0.2); ctx.globalAlpha = 0.6 + r() * 0.4; ctx.fillRect(x, y, 1.6, 2.4); }
    return toTex(c);
  });

  /* ---------- ENVIRONMENT ---------- */
  function surface(key, w, base, fn, repeat, normalStrength = 2) {
    return memo('env_' + key, () => {
      const c = canvas(w, w), ctx = c.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, w, w); fn(ctx, w, U.rng(key));
      const map = toTex(c, repeat); const nmap = toTex(normalFromHeight(heightFromCanvas(c), w, w, normalStrength), repeat, false);
      return { map, normalMap: nmap };
    });
  }
  const speckle = (ctx, w, r, n, cols, s = 2) => { for (let i = 0; i < n; i++) { ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.globalAlpha = 0.3 + r() * 0.5; ctx.fillRect(r() * w, r() * w, s * r() + 0.5, s * r() + 0.5); } ctx.globalAlpha = 1; };
  const ENV = {
    asphalt: rep => surface('asphalt', 256, '#3a3b3f', (c, w, r) => { speckle(c, w, r, 6000, ['#2a2b2e', '#55575c', '#46484d', '#1f2023'], 2.5); for (let i = 0; i < 6; i++) { c.strokeStyle = '#25262a'; c.globalAlpha = 0.5; c.lineWidth = 1; c.beginPath(); let x = r() * w, y = r() * w; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; }, rep, 1.5),
    sidewalk: rep => surface('sidewalk', 256, '#b9b6ae', (c, w, r) => { speckle(c, w, r, 3000, ['#a7a49c', '#cac7bf', '#9d9a92'], 2); c.strokeStyle = '#8a877f'; c.lineWidth = 2; for (let i = 0; i <= w; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, rep, 3),
    grass: rep => surface('grass', 256, '#4d8a3a', (c, w, r) => { for (let i = 0; i < 9000; i++) { c.strokeStyle = U.pick(['#3f7a2f', '#5c9c45', '#6aa84f', '#386b29', '#79b55a']); c.globalAlpha = 0.6; c.lineWidth = 1; const x = r() * w, y = r() * w; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); c.stroke(); } c.globalAlpha = 1; }, rep, 1.5),
    brick: (rep, col = '#9c4a35') => surface('brick' + col, 256, '#8d8a84', (c, w, r) => { const bh = 16, bw = 48; for (let y = 0, row = 0; y < w; y += bh, row++) for (let x = (row % 2) * -bw / 2; x < w; x += bw) { c.fillStyle = U.shade(col, (r() - 0.5) * 0.25); c.fillRect(x + 2, y + 2, bw - 4, bh - 4); } speckle(c, w, r, 2000, ['#0002', '#fff1'], 2); }, rep, 4),
    concrete: (rep, col = '#a9aaa6') => surface('concrete' + col, 256, col, (c, w, r) => { speckle(c, w, r, 4000, [U.shade(col, -0.12), U.shade(col, 0.1), U.shade(col, -0.05)], 3); c.strokeStyle = U.shade(col, -0.2); c.globalAlpha = 0.4; for (let i = 0; i <= w; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } c.globalAlpha = 1; }, rep, 2),
    wood: (rep, col = '#a0703f') => surface('wood' + col, 256, col, (c, w, r) => { const pw = 32; for (let x = 0; x < w; x += pw) { c.fillStyle = U.shade(col, (r() - 0.5) * 0.25); c.fillRect(x, 0, pw - 1, w); for (let k = 0; k < 14; k++) { c.strokeStyle = U.shade(col, -0.2 - r() * 0.15); c.globalAlpha = 0.35; c.lineWidth = 1; c.beginPath(); const xx = x + r() * pw; c.moveTo(xx, 0); c.bezierCurveTo(xx + 4, w * 0.3, xx - 4, w * 0.7, xx + 2, w); c.stroke(); } c.globalAlpha = 1; c.fillStyle = '#0004'; c.fillRect(x + pw - 1, 0, 1, w); const cut = r() * w; c.fillRect(x, cut, pw, 1); } }, rep, 2.5),
    rubber: (rep, col = '#2a2b2e') => surface('rubber' + col, 256, col, (c, w, r) => { speckle(c, w, r, 7000, ['#3d3f44', '#1d1e21', '#4a4c52', '#c33', '#36c'], 1.5); c.strokeStyle = '#111'; c.lineWidth = 2; for (let i = 0; i <= w; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, rep, 2),
    tile: (rep, col = '#e8e6e1', grout = '#a9a69f') => surface('tile' + col + grout, 256, col, (c, w, r) => { const t = 64; for (let y = 0; y < w; y += t) for (let x = 0; x < w; x += t) { c.fillStyle = U.shade(col, (r() - 0.5) * 0.06); c.fillRect(x + 2, y + 2, t - 4, t - 4); } c.fillStyle = grout; for (let i = 0; i <= w; i += t) { c.fillRect(i - 2, 0, 4, w); c.fillRect(0, i - 2, w, 4); } }, rep, 3),
    marble: (rep, col = '#efece6') => surface('marble' + col, 256, col, (c, w, r) => { for (let i = 0; i < 14; i++) { c.strokeStyle = U.shade(col, -0.25); c.globalAlpha = 0.25; c.lineWidth = 0.5 + r() * 2; c.beginPath(); let x = r() * w, y = 0; c.moveTo(x, y); while (y < w) { x += (r() - 0.5) * 30; y += 10 + r() * 20; c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; }, rep, 0.8),
    carpet: (rep, col = '#6b4e8a') => surface('carpet' + col, 128, col, (c, w, r) => speckle(c, w, r, 5000, [U.shade(col, 0.15), U.shade(col, -0.2)], 1.5), rep, 1.5),
    plaster: (rep, col = '#e9e4da') => surface('plaster' + col, 128, col, (c, w, r) => speckle(c, w, r, 2500, [U.shade(col, -0.05), U.shade(col, 0.05)], 3), rep, 0.8),
    siding: (rep, col = '#cfd8dc') => surface('siding' + col, 128, col, (c, w, r) => { for (let y = 0; y < w; y += 16) { c.fillStyle = U.shade(col, -0.18); c.fillRect(0, y + 14, w, 2); c.fillStyle = U.shade(col, 0.08); c.fillRect(0, y, w, 2); } }, rep, 3),
    metal: (rep, col = '#8c9196') => surface('metal' + col, 128, col, (c, w, r) => { for (let y = 0; y < w; y++) { c.fillStyle = U.shade(col, (r() - 0.5) * 0.08); c.fillRect(0, y, w, 1); } }, rep, 0.6),
    court: rep => surface('court', 256, '#2f6f8f', (c, w, r) => speckle(c, w, r, 5000, ['#2a6684', '#357a9c', '#28607d'], 2), rep, 1),
    water: rep => surface('water', 128, '#3d7fa6', (c, w, r) => { for (let i = 0; i < 300; i++) { c.strokeStyle = '#ffffff'; c.globalAlpha = 0.12; c.beginPath(); const x = r() * w, y = r() * w; c.arc(x, y, 3 + r() * 10, 0, 3); c.stroke(); } c.globalAlpha = 1; }, rep, 2),
    dirt: rep => surface('dirt', 128, '#a58b62', (c, w, r) => speckle(c, w, r, 3000, ['#8d7550', '#b89e74', '#7a6545'], 2), rep, 2)
  };

  /* ---------- SIGNS, POSTERS, SCREENS ---------- */
  function sign(text, opts = {}) {
    const { bg = '#111', fg = '#fff', w = 512, h = 128, font = 'Impact, "Arial Black", sans-serif', border = null, sub = null, glow = false, align = 'center' } = opts;
    return memo(`sign_${text}_${bg}_${fg}_${w}_${h}_${sub}_${border}_${glow}`, () => {
      const c = canvas(w, h), ctx = c.getContext('2d');
      if (bg === 'transparent') ctx.clearRect(0, 0, w, h); else if (Array.isArray(bg)) { const g = ctx.createLinearGradient(0, 0, w, h); bg.forEach((col, i) => g.addColorStop(i / (bg.length - 1), col)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } else { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
      if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(4, h * 0.06); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth); }
      ctx.fillStyle = fg; ctx.textAlign = align; ctx.textBaseline = 'middle';
      if (glow) { ctx.shadowColor = fg; ctx.shadowBlur = h * 0.15; }
      const x = align === 'center' ? w / 2 : w * 0.06;
      textFit(ctx, text, x, sub ? h * 0.4 : h * 0.52, w * 0.9, Math.floor(h * (sub ? 0.5 : 0.66)), font);
      if (sub) { ctx.shadowBlur = 0; ctx.globalAlpha = 0.85; textFit(ctx, sub, x, h * 0.8, w * 0.9, Math.floor(h * 0.2), 'Arial, sans-serif'); }
      return toTex(c);
    });
  }
  function poster(title, colA, colB, sub = '') {
    return memo(`poster_${title}_${colA}_${colB}_${sub}`, () => {
      const w = 256, h = 360, c = canvas(w, h), ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, colA); g.addColorStop(1, colB); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = U.rng(title); for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`; ctx.beginPath(); ctx.arc(r() * w, r() * h, 20 + r() * 80, 0, 7); ctx.fill(); }
      // silhouette figure flexing
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(w / 2, h * 0.38, 26, 0, 7); ctx.fill(); ctx.fillRect(w / 2 - 34, h * 0.45, 68, 90); ctx.save(); ctx.translate(w / 2 - 34, h * 0.47); ctx.rotate(-2.2); ctx.fillRect(0, 0, 18, 60); ctx.restore(); ctx.save(); ctx.translate(w / 2 + 34, h * 0.47); ctx.rotate(2.2); ctx.fillRect(-18, 0, 18, 60); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; textFit(ctx, title, w / 2, h * 0.14, w * 0.9, 44); ctx.shadowBlur = 0; if (sub) { ctx.font = '16px Arial'; ctx.fillText(sub, w / 2, h * 0.92); }
      return toTex(c);
    });
  }
  // Generic product label for shelves (skincare bottles, snacks, drinks)
  function label(text, col, sub = '') {
    return memo(`label_${text}_${col}_${sub}`, () => { const w = 128, h = 128, c = canvas(w, h), ctx = c.getContext('2d'); ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); ctx.fillStyle = U.luminance(col) > 0.6 ? '#222' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; textFit(ctx, text, w / 2, h * 0.45, w * 0.86, 26, 'Arial Black, Arial'); if (sub) { ctx.font = '11px Arial'; ctx.fillText(sub, w / 2, h * 0.72); } ctx.fillRect(w * 0.2, h * 0.88, w * 0.6, 3); return toTex(c); });
  }
  function windowTex(lit, seed, cols = 4, rows = 6, frame = '#2b2f36') {
    return memo(`win_${lit}_${seed}_${cols}_${rows}_${frame}`, () => {
      const w = 256, h = 256, c = canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed); ctx.fillStyle = frame; ctx.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const on = lit && r() > 0.45; const g = ctx.createLinearGradient(0, y * ch, 0, (y + 1) * ch); if (on) { const warm = r() > 0.3; g.addColorStop(0, warm ? '#ffe2a8' : '#cfe8ff'); g.addColorStop(1, warm ? '#f2b36b' : '#8fb8e8'); } else { g.addColorStop(0, '#7f9fb8'); g.addColorStop(0.5, '#4a6278'); g.addColorStop(1, '#33475a'); } ctx.fillStyle = g; ctx.fillRect(x * cw + 5, y * ch + 5, cw - 10, ch - 10); if (!on) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x * cw + 5, y * ch + 5); ctx.lineTo(x * cw + cw * 0.5, y * ch + 5); ctx.lineTo(x * cw + 5, y * ch + ch * 0.6); ctx.fill(); } }
      return toTex(c);
    });
  }
  function screen(lines, bg = '#0b1020', fg = '#3cf') {
    const c = canvas(256, 160), ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 160); ctx.fillStyle = fg; ctx.font = 'bold 20px monospace'; lines.forEach((l, i) => ctx.fillText(l, 12, 30 + i * 26));
    const t = toTex(c); return { tex: t, canvas: c, ctx };
  }
  const roadMarks = () => memo('roadmarks', () => { const w = 64, h = 256, c = canvas(w, h), ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#f4f1e1'; ctx.fillRect(w / 2 - 3, 20, 6, 110); return toTex(c, [1, 1]); });

  return { canvas, toTex, memo, eyeTex, noiseField, normalFromHeight, skinMap, skinNormal, fabricNormal, fabricOf, clothing, faceTex, hairTex, hairNormal, fadeTex, ENV, sign, poster, label, windowTex, screen, roadMarks, setAniso, contrast };
})();
