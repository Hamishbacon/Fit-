/* GameSession — the authoritative investigation simulation.
 *
 * One GameSession exists per investigation. In solo play it runs in the
 * browser (LocalHost); in online play it runs on the host (or on the Node
 * server — see server/server.js). Clients never mutate it directly: they send
 * actions (applyAction) and receive `state` snapshots plus discrete `events`.
 *
 * State is plain JSON so it can be serialised over the network as-is.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  const U = NW.util;
  const EQ = () => NW.EQUIPMENT_BY_ID;

  const THROWABLE_TYPES = ['book', 'cup', 'bottle', 'box', 'can', 'frame', 'tin', 'phone'];
  const ROOM_THROWABLES = { office: 3, records: 2, kitchen: 4, living: 3, bedroom: 2, lab: 3, storage: 2, exam: 2, pharmacy: 3, cafe: 4, ticket: 2, control: 2, ward: 2, laundry: 2, lobby: 1, hall: 2, baggage: 3, cabin: 2, theatre: 2, archive: 2, morgue: 1, dome: 2, utility: 1, generator: 1 };

  class Objectives {
    constructor(s, count) {
      this.s = s;
      const has = (e) => s.entity.def.evidence.indexOf(e) >= 0 && !s.isHidden(e);
      let pool = NW.OBJECTIVES.filter((o) => !o.final && (!o.needsEvidence || has(o.needsEvidence)));
      if (s.state.power) pool = pool.filter((o) => o.id !== 'power');
      s.rng.shuffle(pool);
      const chosen = pool.slice(0, Math.max(0, count - 1)).concat([NW.OBJECTIVES.find((o) => o.final)]);
      s.state.objectives = chosen.map((o) => ({ id: o.id, name: o.name, reward: o.reward, done: false }));
    }
    mark(id) {
      const o = this.s.state.objectives.find((x) => x.id === id);
      if (o && !o.done) { o.done = true; this.s.event({ t: 'objective', id, name: o.name }); this.s.log('Objective complete: ' + o.name); }
    }
    markIfSeen(pos) { if (this.s.alivePlayers().some((p) => this.s.canSee(p, pos, 13))) this.mark('witness'); }
  }

  class GameSession {
    /**
     * @param {object} cfg { locationId, difficulty (object), seed, entityId?, loadout:{type:count}, tiers:{type:tier} }
     */
    constructor(cfg) {
      this.cfg = cfg;
      this.seed = cfg.seed >>> 0 || (Math.random() * 1e9) >>> 0;
      this.rng = U.rng(this.seed);
      this.loc = NW.LOCATION_BY_ID[cfg.locationId];
      this.diff = cfg.difficulty;
      this.world = new NW.World(this.loc, this.seed);
      this.events = [];          // outbound events since last flush
      this.listeners = [];
      this.timers = [];
      this.players = {};
      this.lastSpeechT = -99;
      this.revealT = 0;
      this.beaconActive = false;
      this.beaconTarget = null;
      const def = NW.ENTITY_BY_ID[cfg.entityId] || this.rng.pick(NW.ENTITIES);
      const W = this.world;
      this.state = {
        t: 0, phase: 'active', seed: this.seed, loc: this.loc.id, diffId: this.diff.id, diff: this.diff,
        power: !!this.loc.power, hunting: false, huntCount: 0, knockSet: 0,
        doors: W.doors.map((d) => ({ open: false, locked: d.locked })),
        roomLights: W.rooms.map(() => false),
        rooms: W.rooms.map((r) => { const base = 1013 + this.rng.range(-4, 4); return { temp: r.baseTemp, hpa: base, hpaBase: base, hpaTarget: base, hpaHold: 0, haze: 0, falseCold: 0 }; }),
        players: {}, items: {}, throwables: [],
        traces: { emf: [], touch: [], distort: [], prints: [], orbs: [] },
        journal: { ev: {}, guess: null, struck: {} },
        objectives: [], photos: [], log: [], notes: [],
        entity: null, result: null, hiddenEvidence: [],
        devices: W.devices.map(() => ({ on: false, until: 0 })),
        relic: W.relic ? { uses: 3 } : null
      };
      // hidden evidence on harder difficulties
      if (this.diff.hiddenEvidence) this.state.hiddenEvidence = this.rng.shuffle(def.evidence.slice()).slice(0, this.diff.hiddenEvidence);
      // a few lights are already on in powered buildings
      if (this.state.power) W.rooms.forEach((r, i) => { if (r.lit && this.rng.chance(0.2)) this.state.roomLights[i] = true; });
      this._spawnThrowables();
      this._spawnNotes();
      this._stockTruck(cfg.loadout || {}, cfg.tiers || {});
      this.entity = new NW.EntityAI(this, def);
      this.director = new NW.Director(this);
      this.objectives = new Objectives(this, this.diff.objectives + 1);
      this._syncEntity();
      this.log('Investigation started at ' + this.loc.name + '. Field unit parked outside.');
      if (!this.state.power) this.log('Site power is OFF. Find the generator to restore it.');
    }

    /* ---------- setup ---------- */
    _spawnThrowables() {
      const W = this.world;
      let id = 0;
      for (const r of W.rooms) {
        const n = ROOM_THROWABLES[r.kind] || 0;
        for (let i = 0; i < n; i++) {
          const p = W.randomTileInRoom(r.id, this.rng);
          // prefer resting on furniture if a table/counter is adjacent
          let y = r.f * W.FH + 0.02;
          const x = p.x + this.rng.range(-0.3, 0.3), z = p.z + this.rng.range(-0.3, 0.3);
          this.state.throwables.push({ id: 'th' + (id++), type: this.rng.pick(THROWABLE_TYPES), f: r.f, x, y, z, ry: this.rng() * 6.28 });
        }
      }
    }
    _spawnNotes() {
      const W = this.world;
      (this.loc.notes || []).forEach((n, i) => {
        const room = W.rooms.find((r) => r.ch === n.room);
        if (!room) return;
        const p = W.randomTileInRoom(room.id, this.rng);
        this.state.notes.push({ id: 'n' + i, f: p.f, x: p.x, y: p.f * W.FH + 0.03, z: p.z, title: n.title, text: n.text, takenBy: null });
      });
    }
    _stockTruck(loadout, tiers) {
      const res = this.diff.resources;
      for (const type in loadout) {
        const def = EQ()[type];
        if (!def) continue;
        for (let i = 0; i < loadout[type]; i++) this._newItem(type, tiers[type] || 0, res);
      }
    }
    _newItem(type, tier, res) {
      const def = EQ()[type];
      const t = (def.tiers && def.tiers[tier]) || {};
      const id = U.uid('i');
      const charges = type === 'lens' ? (t.film || 8) : type === 'samplekit' ? (t.swabs || 5) : def.charges || null;
      const battery = t.battery || def.battery;
      const it = {
        id, type, tier: tier || 0, holder: null, inTruck: true, placed: false, on: false,
        f: 0, x: 0, y: 0, z: 0, ry: 0,
        battery: battery ? Math.round(battery * (res || 1)) : null, batteryMax: battery ? Math.round(battery * (res || 1)) : null,
        charges: charges != null ? Math.max(1, Math.round(charges * (type === 'spike' || type === 'flare' || type === 'tablets' || type === 'beacon' ? 1 : res || 1))) : null,
        data: {}
      };
      this.state.items[id] = it;
      return it;
    }

    /* ---------- players ---------- */
    addPlayer(info) {
      const W = this.world, sp = W.spawn;
      const idx = Object.keys(this.players).length;
      const p = {
        id: info.id, name: info.name || 'Investigator', suit: info.suit || '#4a5866', torchColor: info.torchColor || '#ffe6bf', badge: info.badge || 'none',
        f: sp.f, x: sp.x + (idx % 2) * 0.8, y: sp.f * W.FH, z: sp.z + Math.floor(idx / 2) * 0.8, yaw: Math.PI, pitch: 0,
        speed: 0, running: false, crouch: false, torch: true, held: null, inv: [null, null, null, null], slot: 0,
        composure: this.diff.startComposure, alive: true, hidden: null, hideT: -99, speakT: -99, inside: false,
        tabletsTaken: 0, connected: true, spectate: null, downT: 0, stats: { photos: 0, swabs: 0, notes: 0 }
      };
      // everyone gets a personal radio
      const radio = this._newItem('radio', 0, 1); radio.inTruck = false; radio.holder = p.id; p.inv[3] = radio.id;
      this.players[p.id] = p;
      this.state.players[p.id] = p;
      this.event({ t: 'join', pid: p.id, name: p.name });
      this.log(p.name + ' joined the investigation.');
      return p;
    }
    removePlayer(pid) {
      const p = this.players[pid];
      if (!p) return;
      // drop their carried items where they stood
      for (const iid of p.inv) if (iid) this._dropItem(p, this.state.items[iid], { f: p.f, x: p.x, y: p.f * this.world.FH + 0.05, z: p.z });
      if (p.hidden != null) this.world.hides[p.hidden].occupant = null;
      delete this.players[pid]; delete this.state.players[pid];
      this.event({ t: 'leave', pid, name: p.name });
      this.log(p.name + ' left the investigation.');
    }
    alivePlayers() { return Object.values(this.players).filter((p) => p.alive && p.connected); }

    /* ---------- event & state helpers ---------- */
    event(e) { e.at = this.state.t; this.events.push(e); }
    flushEvents() { const e = this.events; this.events = []; return e; }
    log(text) { this.state.log.push({ t: Math.round(this.state.t), text }); if (this.state.log.length > 40) this.state.log.shift(); }
    later(sec, fn) { this.timers.push({ t: this.state.t + sec, fn }); }
    isHidden(ev) { return this.state.hiddenEvidence.indexOf(ev) >= 0; }

    addTrace(kind, o) {
      o.id = o.id || U.uid('tr');
      o.until = this.state.t + (o.ttl || 20); delete o.ttl;
      const arr = this.state.traces[kind];
      arr.push(o);
      const cap = { emf: 20, touch: 40, distort: 6, prints: 50, orbs: 4 }[kind] || 20;
      while (arr.length > cap) arr.shift();
      if (kind === 'emf') this.event({ t: 'emf', f: o.f, x: o.x, z: o.z, level: o.level });
      return o;
    }
    spawnDistortion(pos, ttl) {
      const w = this.world;
      const a = this.rng() * Math.PI * 2;
      let x = pos.x + Math.cos(a) * 0.8, z = pos.z + Math.sin(a) * 0.8;
      if (!w.walkable(pos.f, Math.floor(x), Math.floor(z))) { x = pos.x; z = pos.z; }
      this.addTrace('distort', { f: pos.f, x, y: w.heightAt(pos.f, x, z) + this.rng.range(0.9, 1.7), z, ttl });
    }
    emitSound(kind, x, z, f, vol, extra) {
      this.event(Object.assign({ t: 'sound', kind, x, z, f, y: this.world.heightAt(f, x, z) + 1.2, vol: vol || 1 }, extra || {}));
    }
    setDoor(id, open, locked, by, slam) {
      const d = this.world.doors[id], ds = this.state.doors[id];
      const changed = d.open !== open || d.locked !== locked;
      d.open = open; d.locked = locked; ds.open = open; ds.locked = locked;
      if (changed) this.event({ t: 'door', id, open, locked, by, slam: !!slam });
    }
    setRoomLight(r, on, by) {
      if (this.state.roomLights[r] === on) return;
      this.state.roomLights[r] = on;
      this.event({ t: 'light', room: r, on, by });
    }
    setDevice(id, on, by, dur) {
      const d = this.state.devices[id]; if (!d || d.on === on) return;
      d.on = on; d.until = on && dur ? this.state.t + dur : 0;
      const dv = this.world.devices[id];
      this.event({ t: 'device', id, on, by });
      if (on && by === 'entity') this.log('A ' + (dv.kind === 'tv' ? 'television' : dv.kind) + ' switched itself on in ' + this.world.rooms[dv.room].name + '.');
    }
    roomLit(r) { return r >= 0 && this.state.power && this.state.roomLights[r] && this.world.rooms[r].lit; }
    tripBreaker() {
      if (!this.state.power) return;
      this.state.power = false;
      this.event({ t: 'power', on: false, tripped: true });
      this.log('The power has cut out.');
      const g = this.world.generator;
      if (g) this.emitSound('breaker', g.x, g.z, g.f, 1);
    }

    itemPos(it) {
      if (it.holder && this.players[it.holder]) { const p = this.players[it.holder]; return { f: p.f, x: p.x, y: p.y + 1.2, z: p.z }; }
      return { f: it.f, x: it.x, y: it.y, z: it.z };
    }
    findItemNear(type, pos, r, filter) {
      let best = null, bd = r;
      for (const it of Object.values(this.state.items)) {
        if (it.type !== type || it.inTruck) continue;
        if (filter && !filter(it)) continue;
        const p = this.itemPos(it);
        if (p.f !== pos.f) continue;
        const d = U.dist(p.x, p.z, pos.x, pos.z);
        if (d < bd) { bd = d; best = it; }
      }
      return best;
    }
    nearActiveLight(pos, r) {
      for (const it of Object.values(this.state.items)) {
        if (it.type !== 'elight' || !it.on || it.inTruck) continue;
        const p = this.itemPos(it);
        if (p.f === pos.f && U.dist(p.x, p.z, pos.x, pos.z) < r) return true;
      }
      return false;
    }
    canSee(p, pos, range) {
      if (!p.alive || p.hidden != null || p.f !== pos.f) return false;
      const d = U.dist(p.x, p.z, pos.x, pos.z);
      if (d > range) return false;
      // facing check (wide cone)
      const ax = pos.x - p.x, az = pos.z - p.z;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      if (d > 1.5 && (ax * fx + az * fz) / d < 0.35) return false;
      return this.world.los(p.f, p.x, p.z, pos.x, pos.z);
    }
    noiseOf(p) {
      let n = p.speed > 0.2 ? (p.running ? 0.9 : p.crouch ? 0.12 : 0.45) : 0;
      if (this.state.t - p.speakT < 3) n = Math.max(n, 1.1);
      n += this.electronicsOf(p) * 0.25;
      return n;
    }
    electronicsOf(p) {
      let e = p.torch ? 0.4 : 0;
      for (const iid of p.inv) { const it = iid && this.state.items[iid]; if (it && it.on && EQ()[it.type].electronic) e += iid === p.held ? 1 : 0.3; }
      return e;
    }
    isolationFactor() {
      const ps = this.alivePlayers().filter((p) => p.inside);
      if (ps.length <= 1) return ps.length ? 0.6 : 0;
      let max = 0;
      for (const a of ps) { let nearest = 1e9; for (const b of ps) if (a !== b) nearest = Math.min(nearest, a.f === b.f ? U.dist(a.x, a.z, b.x, b.z) : 30); max = Math.max(max, nearest); }
      return U.clamp((max - 8) / 15, 0, 1);
    }
    teamComposure(fixTarget) {
      if (fixTarget && this.players[fixTarget] && this.players[fixTarget].alive) return this.players[fixTarget].composure;
      const ps = this.alivePlayers();
      const inside = ps.filter((p) => p.inside);
      const set = inside.length ? inside : ps;
      if (!set.length) return 100;
      return set.reduce((a, p) => a + p.composure, 0) / set.length;
    }
    composureHit(p, amount, why) {
      p.composure = U.clamp(p.composure - amount, 0, 100);
      if (why) this.event({ t: 'shock', to: p.id, amount, why });
    }
    incapacitate(p, by) {
      p.alive = false; p.downT = this.state.t;
      if (p.hidden != null) { this.world.hides[p.hidden].occupant = null; p.hidden = null; }
      this.event({ t: 'caught', pid: p.id, name: p.name, f: p.f, x: p.x, z: p.z });
      this.log(p.name + ' has been incapacitated.');
      for (const o of this.alivePlayers()) if (this.canSee(o, p, 14)) this.composureHit(o, 15, 'saw ' + p.name + ' taken');
      // drop items where they fell (except radio, which is broken)
      for (const iid of p.inv) {
        const it = iid && this.state.items[iid];
        if (!it) continue;
        it.data.lastHolder = p.id;
        this._dropItem(p, it, { f: p.f, x: p.x + this.rng.range(-0.3, 0.3), y: p.f * this.world.FH + 0.05, z: p.z + this.rng.range(-0.3, 0.3) });
      }
      if (!this.alivePlayers().length) this.endMission('all_down');
    }

    /* ---------- main tick ---------- */
    tick(dt) {
      const st = this.state;
      if (st.phase !== 'active') return;
      st.t += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= st.t) { const tm = this.timers[i]; this.timers.splice(i, 1); tm.fn(); }
      this.entity.tick(dt);
      this.director.tick(dt);
      this._tickPlayers(dt);
      this._tickItems(dt);
      this._expireTraces();
      this._syncEntity();
      for (let i = 0; i < st.devices.length; i++) { const d = st.devices[i]; if (d.on && d.until && st.t > d.until) this.setDevice(i, false, 'timeout'); }
      if (this.beaconActive && st.t > this.beaconEnd) { this.beaconActive = false; this.beaconTarget = null; this.event({ t: 'beacon', on: false }); }
    }

    _tickPlayers(dt) {
      const W = this.world, ent = this.entity, d = this.diff;
      for (const p of Object.values(this.players)) {
        if (!p.alive) continue;
        const r = W.roomAtPos(p);
        p.inside = r >= 0 && !W.rooms[r].outdoor;
        const atTruck = W.truck && p.f === W.truck.f && U.dist(p.x, p.z, W.truck.x, W.truck.z) < 4;
        if (!p.inside) {
          if (atTruck || (r >= 0 && W.rooms[r].outdoor)) {
            const cap = 100;
            p.composure = Math.min(cap, p.composure + dt * (d.huntRegenInTruck ? 0.5 : 0.12) * (atTruck ? 1 : 0.4));
          }
          continue;
        }
        const lit = this.roomLit(r) || this.nearActiveLight(p, 5);
        let drain = lit ? 0.015 : 0.1;
        if (!lit && p.torch) drain *= 0.75;
        if (p.hidden != null) drain *= 0.6;
        const mates = this.alivePlayers().filter((o) => o !== p && o.f === p.f && U.dist(o.x, o.z, p.x, p.z) < 8).length;
        drain *= mates ? 0.8 : Object.keys(this.players).length > 1 ? 1.4 : 1.1;
        if (ent.pos.f === p.f && U.dist(ent.pos.x, ent.pos.z, p.x, p.z) < 5) drain *= 1.6;
        if (ent.has('psychic')) drain *= 1.5;
        if (ent.has('fixate') && ent.fixTarget === p.id) drain *= 1.9;
        if (this.state.hunting && ent.pos.f === p.f && U.dist(ent.pos.x, ent.pos.z, p.x, p.z) < 15) drain += 0.45;
        p.composure = U.clamp(p.composure - drain * d.drain * dt, 0, 100);
      }
    }

    _tickItems(dt) {
      const ent = this.entity;
      for (const it of Object.values(this.state.items)) {
        if (it.inTruck) continue;
        if (it.on && it.battery != null) {
          it.battery = Math.max(0, it.battery - dt);
          if (it.battery <= 0) { it.on = false; this.event({ t: 'item', id: it.id, on: false, dead: true }); }
        }
        if (it.type === 'motion' && it.placed) {
          it.data.cool = Math.max(0, (it.data.cool || 0) - dt);
          if (it.data.cool > 0) continue;
          let tripped = null;
          if (ent.pos.f === it.f && U.dist(ent.pos.x, ent.pos.z, it.x, it.z) < 1.8 && (ent.mode !== 'hunt' || true)) {
            const fakeMotion = this.director.fakeMotion && this.director.fakeMotion > this.state.t;
            tripped = { phase: this.director.evidenceRoll('motion', 1.1) || (fakeMotion && this.rng.chance(0.5)), by: 'entity' };
          } else {
            for (const p of this.alivePlayers()) if (p.f === it.f && p.speed > 0.2 && U.dist(p.x, p.z, it.x, it.z) < 1.8) { tripped = { phase: false, by: p.id }; break; }
          }
          if (tripped) {
            it.data.cool = 5;
            it.data.trips = (it.data.trips || 0) + 1;
            it.data.last = { t: this.state.t, phase: tripped.phase };
            this.event({ t: 'motion', item: it.id, phase: tripped.phase });
            const room = this.world.roomAtPos(it);
            this.log('Motion node in ' + (room >= 0 ? this.world.rooms[room].name : 'unknown') + ' tripped' + (tripped.phase ? ' — PHASE signature.' : '.'));
            if (tripped.by === 'entity') this.objectives.mark('motion_trip');
          }
        }
        if (it.type === 'elight' && it.on) {
          // flickering when the entity is close
          if (ent.pos.f === it.f && U.dist(ent.pos.x, ent.pos.z, it.x, it.z) < 4 && this.rng.chance(dt * 0.5)) this.event({ t: 'item', id: it.id, flicker: true });
        }
      }
    }
    _expireTraces() {
      const t = this.state.t, tr = this.state.traces;
      for (const k in tr) { const a = tr[k]; for (let i = a.length - 1; i >= 0; i--) if (a[i].until <= t) a.splice(i, 1); }
    }
    _syncEntity() {
      const e = this.entity;
      e.y = this.world.heightAt(e.pos.f, e.pos.x, e.pos.z);
      this.state.entity = {
        f: e.pos.f, x: e.pos.x, y: e.y, z: e.pos.z, yaw: e.yaw, visible: e.visible, mode: e.mode,
        look: e.def.look, silent: e.has('silentHunt'), muffle: e.has('muffle'), haze: e.has('deteriorate'),
        lair: e.lair // NOTE: replicated for rendering ambience; a hardened server would withhold it
      };
    }

    /* ---------- actions from clients ---------- */
    applyAction(pid, a) {
      const p = this.players[pid];
      if (!p) return;
      const st = this.state, W = this.world, I = st.items;
      if (st.phase !== 'active' && a.k !== 'journal') return;
      const near = (x, z, f, r) => f === p.f && U.dist(p.x, p.z, x, z) < (r || 2.6);
      const own = (iid) => p.inv.indexOf(iid) >= 0 ? I[iid] : null;
      switch (a.k) {
        case 'pose': {
          if (!p.alive || p.hidden != null) return;
          p.x = a.x; p.y = a.y; p.z = a.z; p.f = a.f | 0; p.yaw = a.yaw; p.pitch = a.pitch;
          p.speed = a.speed || 0; p.running = !!a.running; p.crouch = !!a.crouch; p.torch = !!a.torch;
          if (a.slot != null && a.slot >= 0 && a.slot < 4) { p.slot = a.slot; p.held = p.inv[a.slot]; }
          return;
        }
        case 'door': {
          if (!p.alive) return;
          const d = W.doors[a.id]; if (!d || !near(d.x + 0.5, d.z + 0.5, d.f, 2.4)) return;
          if (d.locked) { this.event({ t: 'locked', id: d.id, pid }); this.emitSound('door_rattle', d.x + 0.5, d.z + 0.5, d.f, 0.6); return; }
          this.setDoor(d.id, !d.open, false, pid);
          return;
        }
        case 'switch': {
          const r = W.rooms[a.room]; if (!r || !r.switch || !near(r.switch.x, r.switch.z, r.f, 2.6)) return;
          if (!st.power) { this.emitSound('click', r.switch.x, r.switch.z, r.f, 0.4); this.event({ t: 'nopower', pid }); return; }
          this.setRoomLight(r.id, !st.roomLights[r.id], pid);
          return;
        }
        case 'generator': {
          const g = W.generator; if (!g || !near(g.x, g.z, g.f, 2.8) || this.state.hunting) return;
          st.power = !st.power;
          this.event({ t: 'power', on: st.power, by: pid });
          this.log(p.name + (st.power ? ' restored site power.' : ' shut the power off.'));
          if (st.power) {
            this.objectives.mark('power');
            for (const d of W.doors) if (d.sealed && d.locked) { this.setDoor(d.id, false, false, 'power'); this.log('A sealed door has unlocked.'); }
            // noisy: attracts the entity a little
            this.entity.anger = Math.min(1, this.entity.anger + 0.05);
          }
          return;
        }
        case 'hide': {
          const h = W.hides[a.id]; if (!h || !p.alive || h.occupant != null) return;
          if (!near(h.entry[0] + 0.5, h.entry[1] + 0.5, h.f, 1.8)) return;
          h.occupant = p.id; p.hidden = h.id; p.hideT = st.t;
          this.event({ t: 'hide', pid, id: h.id, on: true });
          return;
        }
        case 'unhide': {
          if (p.hidden == null) return;
          const h = W.hides[p.hidden]; h.occupant = null; p.hidden = null;
          p.x = h.entry[0] + 0.5; p.z = h.entry[1] + 0.5;
          this.event({ t: 'hide', pid, id: h.id, on: false, x: p.x, z: p.z });
          return;
        }
        case 'take': { // from the field unit locker
          if (!W.truck || !near(W.truck.x, W.truck.z, W.truck.f, 4.5)) return;
          const slot = p.inv.findIndex((x, i) => x == null && i < 4);
          if (slot < 0) return;
          const it = Object.values(I).find((x) => x.inTruck && x.type === a.type);
          if (!it) return;
          it.inTruck = false; it.holder = p.id; p.inv[slot] = it.id;
          if (p.slot === slot) p.held = it.id;
          this.event({ t: 'inv', pid, inv: p.inv.slice() });
          return;
        }
        case 'stow': {
          const it = own(a.item); if (!it || !W.truck || !near(W.truck.x, W.truck.z, W.truck.f, 4.5)) return;
          p.inv[p.inv.indexOf(it.id)] = null; if (p.held === it.id) p.held = null;
          it.holder = null; it.inTruck = true; it.on = false; it.placed = false;
          this.event({ t: 'inv', pid, inv: p.inv.slice() });
          return;
        }
        case 'pickup': {
          const it = I[a.item]; if (!it || it.holder || it.inTruck || !p.alive) return;
          if (!near(it.x, it.z, it.f, 2.4)) return;
          const slot = p.inv[p.slot] == null ? p.slot : p.inv.findIndex((x) => x == null);
          if (slot < 0) return;
          it.holder = p.id; it.placed = false; it.data.lastHolder = null; p.inv[slot] = it.id; if (slot === p.slot) p.held = it.id;
          if (it.type === 'motion' || it.type === 'pressure') it.on = false;
          this.event({ t: 'inv', pid, inv: p.inv.slice() });
          this.event({ t: 'item', id: it.id, picked: pid });
          return;
        }
        case 'drop': case 'place': {
          const it = own(a.item); if (!it || !p.alive) return;
          const pos = a.pos;
          if (!pos || U.dist(pos.x, pos.z, p.x, p.z) > 3.2) return;
          this._dropItem(p, it, pos, a.k === 'place', a.ry);
          return;
        }
        case 'toggle': {
          const it = I[a.item]; if (!it) return;
          if (it.holder && it.holder !== pid) return;
          if (!it.holder && !near(it.x, it.z, it.f, 2.4)) return;
          if (it.battery != null && it.battery <= 0) { this.event({ t: 'item', id: it.id, dead: true }); return; }
          if (it.type === 'beacon') return this._beacon(p, it);
          it.on = !it.on;
          this.event({ t: 'item', id: it.id, on: it.on });
          return;
        }
        case 'ask': {
          const it = own(a.item); if (!it || it.type !== 'recorder' || !it.on) return;
          p.speakT = st.t; this.lastSpeechT = st.t;
          if (this.entity.has('voiceReactive')) EntityAIonSpeech(this, p);
          this.event({ t: 'say', pid, text: a.text, prox: true });
          this.director.ask(p, it, a.q);
          return;
        }
        case 'say': { // spoken aloud (proximity) or callout
          p.speakT = st.t; this.lastSpeechT = st.t;
          if (this.entity.has('voiceReactive')) EntityAIonSpeech(this, p);
          this.event({ t: 'say', pid, text: String(a.text || '').slice(0, 140), prox: true });
          return;
        }
        case 'radio': { // transmit over personal radio
          const has = p.inv.some((iid) => iid && I[iid] && I[iid].type === 'radio');
          if (!has || !p.alive) return;
          p.speakT = st.t; this.lastSpeechT = st.t;
          if (this.entity.has('voiceReactive')) EntityAIonSpeech(this, p);
          const jam = st.hunting ? 0.8 : this.entity.pos.f === p.f && U.dist(this.entity.pos.x, this.entity.pos.z, p.x, p.z) < 8 ? 0.4 : 0;
          this.event({ t: 'radio', pid, name: p.name, text: String(a.text || '').slice(0, 140), jam });
          return;
        }
        case 'device': {
          const dv = W.devices[a.id]; if (!dv || !near(dv.x, dv.z, dv.f, 2.4)) return;
          this.setDevice(dv.id, !st.devices[dv.id].on, pid);
          return;
        }
        case 'relic': {
          const rl = W.relic; if (!rl || !st.relic || st.relic.uses <= 0 || !p.alive || !near(rl.x, rl.z, rl.f, 2.4) || st.hunting) return;
          st.relic.uses--;
          this.composureHit(p, 12, 'the relic');
          this.entity.anger = Math.min(1, this.entity.anger + 0.15);
          this.emitSound('manifest', rl.x, rl.z, rl.f, 0.9);
          const canHunt = st.t >= this.diff.setup && this.entity.huntCooldown <= 0;
          if (canHunt && this.rng.chance(0.3 + 0.1 * (3 - st.relic.uses))) {
            this.event({ t: 'relic', pid, text: 'The relic burns cold in your hands. Something answers.' });
            this.log(p.name + ' disturbed the relic — and something answered.');
            this.entity.startHunt();
            return;
          }
          const def = this.entity.def;
          const ruled = NW.EVIDENCE.map((e) => e.id).filter((e) => def.evidence.indexOf(e) < 0 && st.journal.ev[e] !== 2);
          if (!ruled.length) { this.event({ t: 'relic', pid, text: 'The relic is silent. It has nothing more to tell you.' }); return; }
          const ev = this.rng.pick(ruled);
          st.journal.ev[ev] = 2;
          const name = NW.EVIDENCE_BY_ID[ev].name;
          this.event({ t: 'relic', pid, ev, text: 'The relic whispers what is NOT here: ' + name + '. (Ruled out in the journal.)' });
          this.log(p.name + ' used the relic: ' + name + ' ruled out.');
          return;
        }
        case 'ptt': { // push-to-talk on the personal radio (voice chat)
          const has = p.inv.some((iid) => iid && I[iid] && I[iid].type === 'radio');
          const on = !!a.on && has && p.alive;
          if (on) { p.speakT = st.t; this.lastSpeechT = st.t; if (this.entity.has('voiceReactive')) EntityAIonSpeech(this, p); }
          p.onAir = on;
          this.event({ t: 'ptt', pid, on });
          return;
        }
        case 'swab': {
          const it = own(a.item); if (!it || it.type !== 'samplekit' || it.charges <= 0) return;
          const tr = st.traces.touch.find((x) => x.id === a.trace);
          if (!tr || tr.swabbed || tr.f !== p.f || U.dist(tr.x, tr.z, p.x, p.z) > 2.6) return;
          tr.swabbed = true; it.charges--;
          p.stats.swabs++;
          const fast = it.tier > 0;
          this.later(fast ? 3 : 6, () => {
            const positive = tr.residue && !(this.beaconActive && tr.fake);
            this.event({ t: 'swab', to: pid, item: it.id, residue: positive });
            this.log(p.name + '\'s sample: ' + (positive ? 'RESIDUE TRACE POSITIVE.' : 'inconclusive (dust, oils).'));
            if (positive) this.objectives.mark('swab');
          });
          return;
        }
        case 'photo': {
          const it = own(a.item); if (!it || it.type !== 'lens' || it.charges <= 0) return;
          it.charges--;
          p.stats.photos++;
          const ph = { by: p.name, t: Math.round(st.t), entity: !!a.entity && this.entity.visible, distortion: false, room: W.roomAtPos(p) };
          if (a.distort) {
            const tr = st.traces.distort.find((x) => x.id === a.distort);
            if (tr && !(tr.fake && this.beaconActive)) ph.distortion = true;
          }
          st.photos.push(ph);
          if (ph.entity) this.objectives.mark('photo_entity');
          if (ph.distortion) this.objectives.mark('photo_distortion');
          this.event({ t: 'photo', pid, entity: ph.entity, distortion: ph.distortion });
          this.emitSound('shutter', p.x, p.z, p.f, 0.4);
          return;
        }
        case 'flare': {
          const it = own(a.item); if (!it || it.type !== 'flare' || it.charges <= 0) return;
          it.charges = 0;
          p.inv[p.inv.indexOf(it.id)] = null; if (p.held === it.id) p.held = null;
          delete I[it.id];
          this.event({ t: 'flare', pid, x: a.pos.x, z: a.pos.z, f: p.f, y: a.pos.y });
          this.event({ t: 'inv', pid, inv: p.inv.slice() });
          const e = this.entity;
          if (e.pos.f === p.f && U.dist(e.pos.x, e.pos.z, a.pos.x, a.pos.z) < 5.5) e.stun(this.rng.range(3.5, 5));
          return;
        }
        case 'tablets': {
          const it = own(a.item); if (!it || it.type !== 'tablets' || it.charges <= 0) return;
          it.charges--;
          const amt = 35 * (this.entity.has('psychic') ? 2 : 1);
          p.composure = Math.min(100, p.composure + amt);
          this.event({ t: 'tablets', pid });
          if (it.charges <= 0) { p.inv[p.inv.indexOf(it.id)] = null; if (p.held === it.id) p.held = null; delete I[it.id]; this.event({ t: 'inv', pid, inv: p.inv.slice() }); }
          return;
        }
        case 'note': {
          const n = st.notes.find((x) => x.id === a.id);
          if (!n || n.takenBy || !near(n.x, n.z, n.f, 2.4)) return;
          n.takenBy = p.name; p.stats.notes++;
          this.event({ t: 'note', pid, id: n.id, title: n.title });
          this.log(p.name + ' recovered a document: ' + n.title);
          if (st.notes.filter((x) => x.takenBy).length >= 2) this.objectives.mark('notes');
          return;
        }
        case 'thermalRead': { // client reports a thermal reading for objective tracking
          const r = W.roomAtPos(p);
          if (r >= 0 && st.rooms[r].temp < 5) this.objectives.mark('temp');
          return;
        }
        case 'journal': {
          if (a.ev && NW.EVIDENCE_BY_ID[a.ev]) { st.journal.ev[a.ev] = U.clamp(a.val | 0, 0, 2); this.event({ t: 'journal', by: p.name }); }
          if (a.strike) { st.journal.struck[a.strike] = !st.journal.struck[a.strike]; }
          if (a.guess !== undefined) { st.journal.guess = NW.ENTITY_BY_ID[a.guess] ? a.guess : null; this.event({ t: 'journal', by: p.name, guess: st.journal.guess }); }
          return;
        }
        case 'end': {
          if (!W.truck || !near(W.truck.x, W.truck.z, W.truck.f, 4.5)) return;
          this.endMission('left');
          return;
        }
      }
    }

    _dropItem(p, it, pos, place, ry) {
      const idx = p.inv.indexOf(it.id);
      if (idx >= 0) p.inv[idx] = null;
      if (p.held === it.id) p.held = null;
      it.holder = null; it.f = pos.f; it.x = pos.x; it.y = pos.y; it.z = pos.z; it.ry = ry || 0;
      it.placed = !!place;
      if (place && (it.type === 'motion' || it.type === 'pressure' || it.type === 'slate' || it.type === 'spike')) it.on = true;
      if (it.type === 'radio') it.on = false;
      this.event({ t: 'inv', pid: p.id, inv: p.inv.slice() });
      this.event({ t: 'item', id: it.id, dropped: true, placed: it.placed });
    }

    _beacon(p, it) {
      if (it.charges <= 0 || this.beaconActive) { this.event({ t: 'item', id: it.id, dead: true }); return; }
      it.charges--; it.on = true;
      const pos = this.itemPos(it);
      this.beaconActive = true; this.beaconEnd = this.state.t + 30; this.beaconTarget = { f: pos.f, x: pos.x, z: pos.z };
      this.revealT = this.state.t + 30;
      this.entity.anger = Math.min(1, this.entity.anger + 0.2);
      // strip false traces
      for (const k of ['emf', 'distort', 'touch']) this.state.traces[k] = this.state.traces[k].filter((t) => !t.fake);
      this.event({ t: 'beacon', on: true, item: it.id, f: pos.f, x: pos.x, z: pos.z });
      this.log(p.name + ' activated a Signal Beacon. Activity is surging.');
      this.later(30, () => { it.on = false; });
      // the entity responds by showing itself
      this.later(this.rng.range(4, 10), () => { if (this.entity.mode !== 'hunt') { this.director.queue(0, 'manifest'); } });
    }

    endMission(reason) {
      const st = this.state;
      if (st.phase !== 'active') return;
      st.phase = 'ended';
      if (this.entity.mode === 'hunt') { this.entity.mode = 'roam'; st.hunting = false; }
      const correct = st.journal.guess === this.entity.def.id;
      const everyone = Object.values(this.players);
      // anyone still inside the building when the van leaves is left behind
      const W = this.world;
      const escaped = (p) => p.alive && reason === 'left' && !p.inside;
      const leftBehind = everyone.filter((p) => p.alive && reason === 'left' && p.inside);
      if (reason === 'left' && everyone.every(escaped)) this.objectives.mark('all_escape');
      const objDone = st.objectives.filter((o) => o.done);
      const mult = this.diff.reward;
      const perPlayer = {};
      for (const p of everyone) {
        const alive = escaped(p);
        let credits = Math.round((40 + (correct ? 120 : 0) + objDone.reduce((a, o) => a + o.reward, 0)) * mult);
        let xp = Math.round((60 + (correct ? 160 : 0) + objDone.length * 30 + Math.min(240, st.t / 4)) * mult);
        if (!alive) { credits = Math.round(credits * 0.25); xp = Math.round(xp * 0.5); }
        // items dropped by an incapacitated investigator, or carried by one left behind, are lost
        let lost = [];
        if (!alive) {
          lost = Object.values(st.items).filter((it) => it.type !== 'radio' && it.data.lastHolder === p.id).map((it) => it.type);
          if (leftBehind.indexOf(p) >= 0) for (const iid of p.inv) { const it = iid && st.items[iid]; if (it && it.type !== 'radio') lost.push(it.type); }
        }
        perPlayer[p.id] = { name: p.name, alive, leftBehind: leftBehind.indexOf(p) >= 0, credits, xp, lostTypes: lost };
      }
      void W;
      // equipment left inside the building is recovered on success, partly lost on failure
      const lostItems = [];
      if (reason === 'all_down') for (const it of Object.values(st.items)) if (!it.inTruck && it.type !== 'radio') lostItems.push(it.type);
      st.result = {
        reason, correct, entity: this.entity.def.id, entityName: this.entity.def.name, guess: st.journal.guess,
        objectives: st.objectives, perPlayer, lostItems, time: Math.round(st.t), difficulty: this.diff.id, location: this.loc.id,
        hiddenEvidence: st.hiddenEvidence
      };
      this.event({ t: 'mission_end', result: st.result });
    }

    /** JSON-safe snapshot of the full state (for joining players and periodic sync). */
    snapshot() { return this.state; }
    /** Small, frequent update (players + entity + held items). */
    fastSnapshot() {
      const ps = {};
      for (const id in this.state.players) { const p = this.state.players[id]; ps[id] = { x: p.x, y: p.y, z: p.z, f: p.f, yaw: p.yaw, pitch: p.pitch, speed: p.speed, torch: p.torch, held: p.held, alive: p.alive, hidden: p.hidden, composure: p.composure, crouch: p.crouch }; }
      return { t: this.state.t, players: ps, entity: this.state.entity, hunting: this.state.hunting, orbs: this.state.traces.orbs };
    }
  }

  function EntityAIonSpeech(s, p) {
    const t = NW.EntityAI.TRAITS.voiceReactive;
    const e = s.entity;
    if (p.f === e.pos.f && U.dist(p.x, p.z, e.pos.x, e.pos.z) < 16) t.onSpeech(e, p);
  }

  NW.GameSession = GameSession;
})(typeof window !== 'undefined' ? window : globalThis);
