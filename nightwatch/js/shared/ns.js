/* Nightwatch Protocol — shared namespace and utilities.
 *
 * Everything under js/shared/ is "simulation-safe": it never touches the DOM,
 * three.js, WebAudio or localStorage. The same files run inside the browser
 * (solo / host) and inside Node (server/server.js) so that the authoritative
 * game simulation can move to a dedicated server without being rewritten.
 *
 * Files register themselves on the global NW object. In Node, server.js loads
 * them in order into a shared vm context (see server/simLoader.js).
 */
(function (root) {
  'use strict';
  const NW = root.NW = root.NW || {};
  NW.VERSION = '0.6.0';
  NW.PROTOCOL_VERSION = 3;

  const U = NW.util = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
  U.dist = (ax, az, bx, bz) => Math.sqrt(U.dist2(ax, az, bx, bz));

  /** Small, fast, seedable PRNG (mulberry32). Seeded so a host can reproduce a run. */
  U.rng = function (seed) {
    let s = seed >>> 0;
    const r = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + r() * (b - a);
    r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return r;
  };

  let uid = 1;
  U.uid = (p) => (p || 'o') + (uid++).toString(36);

  /** Minimal event emitter used by sim and client alike. */
  U.Emitter = class {
    constructor() { this._h = {}; }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return () => this.off(t, f); }
    off(t, f) { const a = this._h[t]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }
    emit(t, d) { const a = this._h[t]; if (a) for (const f of a.slice()) f(d); const s = this._h['*']; if (s) for (const f of s.slice()) f(t, d); }
  };

  U.deepCopy = (o) => JSON.parse(JSON.stringify(o));
})(typeof window !== 'undefined' ? window : globalThis);
