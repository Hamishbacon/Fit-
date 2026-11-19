/* GYM RAT 2000: THE MOGGING ERA — shared utilities, event bus and namespace. */
'use strict';
window.GR = window.GR || {};
GR.VERSION = 'v1.5 (machines usable from any side)';

GR.U = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const dampAngle = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // Deterministic RNG (mulberry32) so seeded NPCs/textures look the same every session.
  const rng = seed => { let a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const rpick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const fmt = n => Math.round(n).toLocaleString('en-AU');
  const money = n => '$' + fmt(n);
  const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : fmt(n);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hexToRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const shade = (hex, f) => { const [r, g, b] = hexToRgb(hex); return f < 0 ? rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f)) : rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); };
  const mix = (h1, h2, t) => { const a = hexToRgb(h1), b = hexToRgb(h2); return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)); };
  const hsl = hex => { let [r, g, b] = hexToRgb(hex).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h * 360, s, l]; };
  const luminance = hex => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const day = t => Math.floor(t / 24); // game hours → day index
  const timeStr = hrs => { const h = Math.floor(hrs % 24), m = Math.floor((hrs % 1) * 60); const ap = h >= 12 ? 'PM' : 'AM'; return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + ' ' + ap; };
  const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  return { TAU, clamp, lerp, smooth, damp, angDiff, dampAngle, rand, randi, pick, shuffle, hash, rng, rpick, fmt, money, kfmt, el, $, $$, esc, hexToRgb, rgbToHex, shade, mix, hsl, luminance, dist2, uid, day, timeStr, ease };
})();

/* Tiny event bus: every system talks through this so features stay connected. */
GR.Bus = (() => {
  const map = {};
  return {
    on(evt, fn) { (map[evt] = map[evt] || []).push(fn); return () => { map[evt] = map[evt].filter(f => f !== fn); }; },
    emit(evt, data) { (map[evt] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error('[bus]', evt, e); } }); (map['*'] || []).forEach(fn => { try { fn(evt, data); } catch (e) { console.error(e); } }); }
  };
})();
