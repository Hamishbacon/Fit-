/* World: rasterises a location definition into per-floor tile grids and
 * offers spatial queries used by both the simulation (AI, events) and the
 * client (collision, rendering).
 *
 * Coordinates: tile (x, z) covers world [x, x+1) × [z, z+1). Floor f sits at
 * y = f * FLOOR_HEIGHT. Stairs are runs of arrow tiles on the lower floor
 * mirrored by '_' (open shaft) tiles on the floor above.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  const U = NW.util;

  const ARROWS = { n: '^', s: '=', e: '>', w: '<' };
  const DIRV = { '^': [0, -1], '=': [0, 1], '>': [1, 0], '<': [-1, 0] };
  const PROP_BLOCK = 'TCBOGKMYQNF~:H';
  const SIGHT_BLOCK = 'COGMFQH#W ';
  const isRoomCh = (c) => c >= 'a' && c <= 'z';

  // furniture auto-dressing per room kind: [char, count range, tile footprint]
  const DRESS = {
    office: [['T', 1, 2], ['C', 1, 2]], records: [['C', 2, 4]], control: [['K', 1, 2], ['C', 0, 1]],
    kitchen: [['K', 1, 2], ['T', 1, 1]], living: [['N', 1, 1], ['T', 1, 1], ['C', 0, 1]],
    bedroom: [['B', 1, 1], ['C', 0, 1]], lab: [['T', 1, 2], ['C', 1, 2]], storage: [['Y', 2, 4]],
    ward: [['C', 0, 1]], exam: [['B', 1, 1], ['C', 1, 1]], theatre: [['C', 1, 2]], pharmacy: [['C', 1, 2]],
    cafe: [['T', 2, 3]], ticket: [['C', 1, 1]], hall: [], baggage: [['Y', 1, 2]], dock: [['Y', 1, 3], ['O', 0, 1]],
    cabin: [['N', 1, 2]], utility: [['O', 1, 1], ['C', 0, 1]], generator: [['C', 0, 1]], bath: [['K', 0, 1]],
    laundry: [['T', 0, 1]], lobby: [['N', 1, 1]], morgue: [['C', 1, 2]], archive: [], dome: [['C', 1, 2]]
  };

  class World {
    constructor(loc, seed) {
      this.loc = loc;
      this.W = loc.W; this.H = loc.H;
      this.FH = NW.FLOOR_HEIGHT;
      this.nf = loc.floors.length;
      this.rng = U.rng(seed || 1);
      this._rasterise();
      this._fixStairs();
      this._dress();
      this._index();
    }

    /* ---------- construction ---------- */
    _rasterise() {
      const { W, H } = this;
      this.grid = [];
      this.stairs = [];
      this.windows = [];
      const roomOrder = [];
      for (let f = 0; f < this.nf; f++) {
        const g = new Array(W * H).fill(' ');
        const outdoorAt = new Uint8Array(W * H);
        const ops = this.loc.floors[f];
        // rooms first (in order), then features
        for (const op of ops) {
          if (op[0] !== 'R') continue;
          const [, ch, x0, z0, w, h] = op;
          const def = this.loc.rooms[ch] || {};
          for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) {
            if (!this._in(x, z)) continue;
            g[z * W + x] = ch; outdoorAt[z * W + x] = def.outdoor ? 1 : 0;
          }
          if (!def.outdoor) {
            for (let z = z0 - 1; z <= z0 + h; z++) for (let x = x0 - 1; x <= x0 + w; x++) {
              if (!this._in(x, z)) continue;
              const i = z * W + x;
              if (x >= x0 && x < x0 + w && z >= z0 && z < z0 + h) continue;
              if (g[i] === ' ' || outdoorAt[i]) { g[i] = '#'; outdoorAt[i] = 0; }
            }
          }
          roomOrder.push(f + ':' + ch);
        }
        for (const op of ops) {
          const t = op[0];
          if (t === 'D' || t === 'X' || t === 'L') { if (this._in(op[1], op[2])) g[op[2] * W + op[1]] = t; }
          else if (t === 'P') {
            const [, ch, x0, z0, w = 1, h = 1] = op;
            for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (this._in(x, z)) g[z * W + x] = ch;
          } else if (t === 'V') {
            const [, x0, z0, w, h] = op;
            for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (this._in(x, z)) g[z * W + x] = ' ';
          } else if (t === 'W') {
            const [, x0, z0, w, h] = op;
            for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (this._in(x, z) && g[z * W + x] === '#') g[z * W + x] = 'W';
          }
        }
        this.grid.push(g);
      }
      // stairs last because they cut through both floors
      for (let f = 0; f < this.nf; f++) {
        for (const op of this.loc.floors[f]) {
          if (op[0] !== 'S') continue;
          const [, x0, z0, w, len, dir] = op;
          const a = ARROWS[dir];
          const horizontal = dir === 'e' || dir === 'w';
          const run = { f, dir, a, x0, z0, w, len, horizontal, tiles: [] };
          for (let i = 0; i < len; i++) for (let j = 0; j < w; j++) {
            const x = horizontal ? x0 + i : x0 + j;
            const z = horizontal ? z0 + j : z0 + i;
            this.grid[f][z * this.W + x] = a;
            if (f + 1 < this.nf) this.grid[f + 1][z * this.W + x] = '_';
            run.tiles.push([x, z]);
          }
          this.stairs.push(run);
        }
      }
    }

    /** Make stair ends unambiguous and fence the sides, so you can only step on at the ends. */
    _fixStairs() {
      for (const r of this.stairs) {
        const [dx, dz] = DIRV[r.a];
        const g0 = this.grid[r.f], g1 = this.grid[r.f + 1];
        const set = (g, x, z, c) => { if (g && this._in(x, z)) g[z * this.W + x] = c; };
        const get = (g, x, z) => (g && this._in(x, z) ? g[z * this.W + x] : ' ');
        for (let j = 0; j < r.w; j++) {
          // low end tile and high end tile along the run
          let lx, lz, hx, hz;
          if (r.horizontal) { const zz = r.z0 + j; lx = dx > 0 ? r.x0 - 1 : r.x0 + r.len; hx = dx > 0 ? r.x0 + r.len : r.x0 - 1; lz = hz = zz; }
          else { const xx = r.x0 + j; lz = dz > 0 ? r.z0 - 1 : r.z0 + r.len; hz = dz > 0 ? r.z0 + r.len : r.z0 - 1; lx = hx = xx; }
          if (this._open(get(g0, hx, hz))) set(g0, hx, hz, '#');          // can't walk off the top on the lower floor
          if (g1 && this._open(get(g1, lx, lz))) set(g1, lx, lz, '#');    // can't walk into the shaft from the bottom end upstairs
        }
        // sides
        for (const [x, z] of r.tiles) {
          const sides = r.horizontal ? [[x, z - 1], [x, z + 1]] : [[x - 1, z], [x + 1, z]];
          for (const [sx, sz] of sides) {
            for (const g of [g0, g1]) {
              if (!g) continue;
              const c = get(g, sx, sz);
              if (this._open(c) && c !== '_' && !DIRV[c]) set(g, sx, sz, ':');
            }
          }
        }
      }
    }

    _open(c) { return isRoomCh(c) || c === 'D' || c === 'X' || c === 'L' || c === '_' || !!DIRV[c]; }
    _in(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.H; }

    /** Add furniture along walls per room kind without breaking connectivity. */
    _dress() {
      const rng = this.rng;
      for (let f = 0; f < this.nf; f++) {
        const g = this.grid[f];
        const letters = new Set(g.filter(isRoomCh));
        for (const ch of letters) {
          const def = this.loc.rooms[ch] || {};
          const plan = DRESS[def.kind];
          if (!plan || def.outdoor) continue;
          const tiles = [];
          for (let i = 0; i < g.length; i++) if (g[i] === ch) tiles.push(i);
          const entries = this._entriesOf(f, ch);
          for (const [pc, lo, hi] of plan) {
            const n = rng.int(lo, hi);
            for (let k = 0; k < n; k++) {
              for (let tries = 0; tries < 12; tries++) {
                const i = rng.pick(tiles);
                if (g[i] !== ch) continue;
                const x = i % this.W, z = (i / this.W) | 0;
                if (!this._againstWall(f, x, z) || this._nearDoor(f, x, z)) continue;
                g[i] = pc;
                if (!this._roomConnected(f, ch, entries)) { g[i] = ch; continue; }
                break;
              }
            }
          }
        }
      }
    }
    _againstWall(f, x, z) {
      const g = this.grid[f];
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const c = g[(z + dz) * this.W + x + dx]; return c === '#' || c === 'W'; });
    }
    _nearDoor(f, x, z) {
      const g = this.grid[f];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!this._in(x + dx, z + dz)) continue;
        const c = g[(z + dz) * this.W + x + dx];
        if (c === 'D' || c === 'X' || c === 'L' || DIRV[c] || c === '_' || c === 'H') return true;
      }
      return false;
    }
    _entriesOf(f, ch) {
      const g = this.grid[f], out = [];
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== ch) continue;
        const x = i % this.W, z = (i / this.W) | 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = this._in(x + dx, z + dz) ? g[(z + dz) * this.W + x + dx] : ' ';
          if (c !== ch && this._open(c)) { out.push(i); break; }
        }
      }
      return out;
    }
    _roomConnected(f, ch, entries) {
      const g = this.grid[f];
      let total = 0; for (let i = 0; i < g.length; i++) if (g[i] === ch) total++;
      const start = entries.find((i) => g[i] === ch);
      if (start === undefined) return true;
      const seen = new Set([start]); const q = [start];
      while (q.length) {
        const i = q.pop(); const x = i % this.W, z = (i / this.W) | 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!this._in(x + dx, z + dz)) continue;
          const j = (z + dz) * this.W + x + dx;
          if (!seen.has(j) && g[j] === ch) { seen.add(j); q.push(j); }
        }
      }
      return seen.size === total && entries.every((i) => g[i] !== ch || seen.has(i));
    }

    /* ---------- indexing ---------- */
    _index() {
      const { W, H } = this;
      this.rooms = []; this.doors = []; this.hides = []; this.lights = []; this.props = [];
      this.roomAt = [];
      const key = {};
      for (let f = 0; f < this.nf; f++) {
        const g = this.grid[f];
        const ra = new Int16Array(W * H).fill(-1);
        for (let i = 0; i < g.length; i++) {
          const c = g[i];
          if (!isRoomCh(c)) continue;
          const k = f + ':' + c;
          if (key[k] === undefined) {
            const def = this.loc.rooms[c] || { name: 'Room ' + c, kind: 'room' };
            key[k] = this.rooms.length;
            this.rooms.push({
              id: this.rooms.length, ch: c, f, name: def.name + (this._letterOnFloors(c) > 1 ? ' (L' + f + ')' : ''), kind: def.kind,
              outdoor: !!def.outdoor, flooded: !!def.flooded, wet: !!def.wet || !!def.flooded,
              h: def.h || (def.outdoor ? 0 : 3.0), baseTemp: def.temp != null ? def.temp : (def.outdoor ? this.loc.outsideTemp : 15),
              lit: def.lit !== false && !def.outdoor, tiles: [], cx: 0, cz: 0
            });
          }
          ra[i] = key[k];
          this.rooms[key[k]].tiles.push(i);
        }
        this.roomAt.push(ra);
      }
      for (const r of this.rooms) {
        let sx = 0, sz = 0;
        for (const i of r.tiles) { sx += i % W + 0.5; sz += ((i / W) | 0) + 0.5; }
        r.cx = sx / r.tiles.length; r.cz = sz / r.tiles.length; r.area = r.tiles.length;
      }
      // features: assign each to an adjacent room
      for (let f = 0; f < this.nf; f++) {
        const g = this.grid[f], ra = this.roomAt[f];
        const adjRooms = (x, z) => {
          const out = [];
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (!this._in(x + dx, z + dz)) continue;
            const r = ra[(z + dz) * W + x + dx];
            if (r >= 0 && out.indexOf(r) < 0) out.push(r);
          }
          return out;
        };
        for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
          const i = z * W + x, c = g[i];
          if (c === 'D' || c === 'X' || c === 'L') {
            const wallX = !this._open(g[i - 1] || ' ') && !this._open(g[i + 1] || ' ');
            const rooms = adjRooms(x, z);
            this.doors.push({ id: this.doors.length, f, x, z, pass: wallX ? 'z' : 'x', rooms, exit: c === 'X', sealed: c === 'L', open: false, locked: c === 'L', angle: 0 });
          } else if (c === 'H') {
            const rooms = adjRooms(x, z);
            let entry = null;
            for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              if (this._in(x + dx, z + dz) && isRoomCh(g[(z + dz) * W + x + dx])) { entry = [x + dx, z + dz]; break; }
            }
            if (rooms.length && entry) { ra[i] = rooms[0]; this.hides.push({ id: this.hides.length, f, x, z, room: rooms[0], entry, occupant: null }); }
          } else if (PROP_BLOCK.indexOf(c) >= 0 || c === '~') {
            const rooms = adjRooms(x, z);
            if (rooms.length) ra[i] = rooms[0];
            this.props.push({ ch: c, f, x, z, room: rooms.length ? rooms[0] : -1 });
          } else if (DIRV[c] || c === '_') {
            const rooms = adjRooms(x, z);
            if (rooms.length) ra[i] = rooms[0];
          }
        }
      }
      // light fixtures (farthest-point sampling over room tiles) + switches
      for (const r of this.rooms) {
        r.lights = [];
        if (!r.lit) continue;
        const k = Math.max(1, Math.round(r.area / 22));
        const pts = [];
        const tiles = r.tiles.map((i) => [i % W + 0.5, ((i / W) | 0) + 0.5]);
        pts.push(tiles.reduce((b, t) => (U.dist2(t[0], t[1], r.cx, r.cz) < U.dist2(b[0], b[1], r.cx, r.cz) ? t : b)));
        while (pts.length < k) {
          let best = null, bd = -1;
          for (const t of tiles) { const d = Math.min(...pts.map((p) => U.dist2(p[0], p[1], t[0], t[1]))); if (d > bd) { bd = d; best = t; } }
          // pull toward room centre a little so fixtures don't sit on walls
          pts.push([U.lerp(best[0], r.cx, 0.35), U.lerp(best[1], r.cz, 0.35)]);
        }
        for (const p of pts) {
          const id = this.lights.length;
          this.lights.push({ id, room: r.id, f: r.f, x: p[0], z: p[1], y: r.f * this.FH + r.h - 0.05 });
          r.lights.push(id);
        }
        // light switch next to the first door into the room
        const d = this.doors.find((dd) => dd.f === r.f && dd.rooms.indexOf(r.id) >= 0);
        if (d) {
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = d.x + dx, z = d.z + dz;
            if (this._in(x, z) && this.roomAt[r.f][z * W + x] === r.id && isRoomCh(this.grid[r.f][z * W + x])) {
              // switch on the wall beside the door frame, facing into the room
              if (d.pass === 'z') r.switch = { x: d.x + 1.45, z: (dz > 0 ? d.z + 1 : d.z) + dz * 0.04, nx: 0, nz: dz };
              else r.switch = { x: (dx > 0 ? d.x + 1 : d.x) + dx * 0.04, z: d.z + 1.45, nx: dx, nz: 0 };
              r.switch.y = r.f * this.FH + 1.3; r.switch.f = r.f; r.switch.door = d.id;
              break;
            }
          }
        }
      }
      // rooms with no door (open archways) have no switch: leave them unlit for atmosphere
      const keep = [];
      for (const r of this.rooms) { if (!r.switch) { r.lit = false; r.lights = []; } }
      for (const l of this.lights) if (this.rooms[l.room].lit) keep.push(l);
      keep.forEach((l, i) => { l.id = i; });
      this.lights = keep;
      for (const r of this.rooms) r.lights = [];
      for (const l of this.lights) this.rooms[l.room].lights.push(l.id);
      // haunted electronics: one TV / monitor / radio against a wall in suitable rooms
      const DEV = { living: 'tv', bedroom: 'radio', kitchen: 'radio', office: 'monitor', control: 'monitor', ward: 'monitor', exam: 'monitor', lab: 'monitor', dome: 'monitor', theatre: 'monitor', ticket: 'monitor', cafe: 'radio', lobby: 'radio', cabin: 'radio', hall: 'tv', laundry: 'radio', records: 'radio', archive: 'radio', pharmacy: 'radio' };
      this.devices = [];
      const wallSpot = (r) => {
        for (let tries = 0; tries < 30; tries++) {
          const t = this.rng.pick(r.tiles), x = t % W, z = (t / W) | 0;
          if (!isRoomCh(this.grid[r.f][t]) || this._nearDoor(r.f, x, z)) continue;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = this.ch(r.f, x + dx, z + dz);
            if (c === '#') return { f: r.f, x: x + 0.5 + dx * 0.36, z: z + 0.5 + dz * 0.36, ry: Math.atan2(-dx, -dz), room: r.id, tx: x, tz: z };
          }
        }
        return null;
      };
      for (const r of this.rooms) {
        const kind = DEV[r.kind];
        if (!kind || r.outdoor || !this.rng.chance(0.75)) continue;
        const sp = wallSpot(r); if (!sp) continue;
        sp.id = this.devices.length; sp.kind = kind; this.devices.push(sp);
      }
      // the site relic: an object tied to the haunting
      const RELICS = { observatory: 'Halvorsen\'s listening plate', apartments: 'Wind-up music box', clinic: 'Patient bracelet No. 7', ferry: 'The Caldera\'s bell' };
      const cands = this.lairCandidates();
      for (let k = 0; k < 10 && !this.relic; k++) { const sp = wallSpot(this.rng.pick(cands)); if (sp) this.relic = Object.assign(sp, { name: RELICS[this.loc.id] || 'Relic' }); }
      // breaker / generator
      const gp = this.props.find((p) => p.ch === 'G');
      this.generator = gp ? { f: gp.f, x: gp.x + 0.5, z: gp.z + 0.5, room: gp.room } : null;
      // field unit (truck)
      const trucks = this.props.filter((p) => p.ch === 'F');
      if (trucks.length) {
        const mx = trucks.reduce((a, p) => a + p.x, 0) / trucks.length + 0.5;
        const mz = trucks.reduce((a, p) => a + p.z, 0) / trucks.length + 0.5;
        this.truck = { f: trucks[0].f, x: mx, z: mz };
      }
      this.exitDoor = this.doors.find((d) => d.exit);
      this.spawn = this.loc.spawn;
    }
    _letterOnFloors(c) { let n = 0; for (const g of this.grid) if (g.indexOf(c) >= 0) n++; return n; }

    /* ---------- queries ---------- */
    ch(f, x, z) { return f >= 0 && f < this.nf && this._in(x, z) ? this.grid[f][z * this.W + x] : ' '; }
    roomIdAt(f, wx, wz) { const x = Math.floor(wx), z = Math.floor(wz); return this._in(x, z) && f >= 0 && f < this.nf ? this.roomAt[f][z * this.W + x] : -1; }
    roomAtPos(p) { return this.roomIdAt(p.f, p.x, p.z); }
    doorAt(f, x, z) { return this.doors.find((d) => d.f === f && d.x === x && d.z === z); }

    _doorIndex() {
      if (!this._dIdx) { this._dIdx = new Map(); for (const d of this.doors) this._dIdx.set(d.f * 100000 + d.z * this.W + d.x, d); }
      return this._dIdx;
    }
    doorAtFast(f, x, z) { return this._doorIndex().get(f * 100000 + z * this.W + x); }

    /** Walkable for bodies (players/entity). Closed doors block unless `throughDoors`. */
    walkable(f, x, z, throughDoors) {
      const c = this.ch(f, x, z);
      if (isRoomCh(c) || DIRV[c] || c === '_') return true;
      if (c === 'D' || c === 'X' || c === 'L') { const d = this.doorAtFast(f, x, z); return !!d && (d.open || (throughDoors && !d.locked)); }
      return false;
    }
    blocksSight(f, x, z) {
      const c = this.ch(f, x, z);
      if (c === 'D' || c === 'X' || c === 'L') { const d = this.doorAtFast(f, x, z); return !d || !d.open; }
      return SIGHT_BLOCK.indexOf(c) >= 0;
    }
    isOutdoor(f, wx, wz) { const r = this.roomIdAt(f, wx, wz); return r >= 0 && this.rooms[r].outdoor; }

    stairRunAt(f, x, z) {
      for (const r of this.stairs) {
        if (r.f !== f) continue;
        for (const t of r.tiles) if (t[0] === x && t[1] === z) return r;
      }
      return null;
    }
    /** Ground height (world y) at a world position for a body currently on floor f. */
    heightAt(f, wx, wz) {
      const x = Math.floor(wx), z = Math.floor(wz);
      const c = this.ch(f, x, z);
      let run = null;
      if (DIRV[c]) run = this.stairRunAt(f, x, z);
      else if (c === '_') run = this.stairRunAt(f - 1, x, z);
      if (!run) return f * this.FH;
      const [dx, dz] = DIRV[run.a];
      let t;
      if (run.horizontal) t = dx > 0 ? (wx - run.x0) / run.len : (run.x0 + run.len - wx) / run.len;
      else t = dz > 0 ? (wz - run.z0) / run.len : (run.z0 + run.len - wz) / run.len;
      return (run.f + U.clamp(t, 0, 1)) * this.FH;
    }
    floorFromHeight(y) { return U.clamp(Math.round(y / this.FH), 0, this.nf - 1); }

    /** Circle-vs-grid collision resolve for a body of radius r on floor f. Returns adjusted [x,z]. */
    collide(f, x, z, r) {
      for (let iter = 0; iter < 2; iter++) {
        const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
        for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
          if (this.walkable(f, tx, tz)) continue;
          const nx = U.clamp(x, tx, tx + 1), nz = U.clamp(z, tz, tz + 1);
          const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            if (d2 > 1e-8) { const d = Math.sqrt(d2), p = (r - d) / d; x += dx * p; z += dz * p; }
            else { // centre inside the tile — push out along the shortest axis
              const cx = tx + 0.5, cz = tz + 0.5, ax = x - cx, az = z - cz;
              if (Math.abs(ax) > Math.abs(az)) x = ax > 0 ? tx + 1 + r : tx - r; else z = az > 0 ? tz + 1 + r : tz - r;
            }
          }
        }
      }
      return [x, z];
    }

    /** Line of sight on one floor (samples every 0.25 m). */
    los(f, ax, az, bx, bz) {
      const d = U.dist(ax, az, bx, bz), n = Math.ceil(d / 0.25);
      for (let i = 1; i < n; i++) {
        const t = i / n, x = Math.floor(ax + (bx - ax) * t), z = Math.floor(az + (bz - az) * t);
        if (this.blocksSight(f, x, z)) return false;
      }
      return true;
    }

    /* ---------- pathfinding (A*) across floors ---------- */
    _nodeKey(f, x, z) { return (f * this.H + z) * this.W + x; }
    _neighbours(f, x, z, opts) {
      const out = [];
      const cur = this.ch(f, x, z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        let c = this.ch(f, nx, nz);
        let nf = f;
        if (c === '_') { nf = f - 1; }
        else if (!this._passable(f, nx, nz, c, opts)) {
          // stepping off the high end of a stair onto the floor above
          if (DIRV[cur] && DIRV[cur][0] === dx && DIRV[cur][1] === dz && this._passable(f + 1, nx, nz, this.ch(f + 1, nx, nz), opts)) nf = f + 1;
          else continue;
        }
        if (nf !== f) c = this.ch(nf, nx, nz);
        if (!this._passable(nf, nx, nz, c, opts) && c !== '_') continue;
        if (c === '_') continue; // shaft tile on the upper floor — handled as stair on the lower floor
        out.push([nf, nx, nz]);
      }
      return out;
    }
    _passable(f, x, z, c, opts) {
      if (f < 0 || f >= this.nf) return false;
      if (isRoomCh(c)) {
        if (opts && opts.avoidWater) { const r = this.roomAt[f][z * this.W + x]; if (r >= 0 && this.rooms[r].flooded) return false; }
        return true;
      }
      if (DIRV[c]) return true;
      if (c === 'D' || c === 'X' || c === 'L') { const d = this.doorAtFast(f, x, z); return !!d && (d.open || !d.locked || (opts && opts.ignoreLocks)); }
      return false;
    }
    /** Returns array of {f,x,z} tile centres from a to b, or null. */
    path(a, b, opts) {
      const sx = Math.floor(a.x), sz = Math.floor(a.z), tx = Math.floor(b.x), tz = Math.floor(b.z);
      const sf = this._normFloor(a.f, sx, sz), tf = this._normFloor(b.f, tx, tz);
      const start = this._nodeKey(sf, sx, sz), goal = this._nodeKey(tf, tx, tz);
      if (start === goal) return [{ f: tf, x: tx + 0.5, z: tz + 0.5 }];
      const open = [[0, sf, sx, sz]]; const g = new Map([[start, 0]]); const came = new Map();
      const hfn = (f, x, z) => Math.abs(x - tx) + Math.abs(z - tz) + Math.abs(f - tf) * 6;
      let it = 0;
      while (open.length && it++ < 6000) {
        let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
        const [, f, x, z] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
        const k = this._nodeKey(f, x, z);
        if (k === goal) {
          const out = []; let c = k;
          while (c !== undefined) { const ff = Math.floor(c / (this.W * this.H)); const rem = c - ff * this.W * this.H; out.push({ f: ff, x: rem % this.W + 0.5, z: Math.floor(rem / this.W) + 0.5 }); c = came.get(c); }
          return out.reverse();
        }
        const gc = g.get(k);
        for (const [nf, nx, nz] of this._neighbours(f, x, z, opts)) {
          const nk = this._nodeKey(nf, nx, nz);
          const ng = gc + 1;
          if (ng < (g.has(nk) ? g.get(nk) : 1e9)) { g.set(nk, ng); came.set(nk, k); open.push([ng + hfn(nf, nx, nz), nf, nx, nz]); }
        }
      }
      return null;
    }
    /** A body on floor f standing on a '_' tile is really on the lower floor's stair. */
    _normFloor(f, x, z) { return this.ch(f, x, z) === '_' ? f - 1 : f; }

    randomTileInRoom(roomId, rng) {
      const r = this.rooms[roomId];
      for (let i = 0; i < 20; i++) {
        const t = rng.pick(r.tiles);
        const x = t % this.W, z = (t / this.W) | 0;
        if (isRoomCh(this.grid[r.f][t])) return { f: r.f, x: x + 0.5, z: z + 0.5 };
      }
      return { f: r.f, x: r.cx, z: r.cz };
    }
    /** Rooms the entity may live in: indoor, not stairs. */
    lairCandidates(opts) {
      return this.rooms.filter((r) => !r.outdoor && r.kind !== 'stair' && r.area >= 6 && !(opts && opts.avoidWater && r.flooded));
    }
    isRoomChar(c) { return isRoomCh(c); }
  }
  World.DIRV = DIRV;
  World.PROP_BLOCK = PROP_BLOCK;
  NW.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
