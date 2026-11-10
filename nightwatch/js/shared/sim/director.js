/* Director — the EventSystem.
 *
 * Schedules entity interactions, escalates activity over time, emits
 * evidence (respecting difficulty reliability, hidden evidence and false
 * readings), drives trait-specific ambient behaviour and hallucinations.
 * It only manipulates session state through Session helpers, so every
 * effect is replicated to clients as state or events.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  const U = NW.util;

  const WHISPERS = ['...here...', '...get out...', '...cold...', '...we stayed...', '...behind you...', '...count them...', '...not yet...', '...listen...', '...stay...', '...mine...'];
  const VOICE_ANSWERS = {
    where: ['...here...', '...below...', '...close...', '...with you...', '...behind...'],
    what: ['...leave...', '...stay...', '...warm...', '...you...', '...quiet...'],
    who: ['...nobody...', '...the last one...', '...we...', '...yours...'],
    sign: ['...look...', '...now...', '...watch...'],
    age: ['...old...', '...young...', '...always...']
  };
  const BLEED_LINES = ['...is anyone receiving...', '...wrong frequency... get out...', '...it\'s in the walls...', '...forty-one... forty...', '...can you hear me... I can hear you...', '...don\'t open it...'];

  class Director {
    constructor(session) {
      this.s = session;
      this.nextAct = 8;
      this.queueList = [];
      this.falseT = 30 + session.rng() * 60;
      this.hallucT = {};
      this.coldCycleT = 0;
      this.mimicT = 0;
      this.orbT = 3;
      this.bleedT = 2;
      this.deceiveType = null;
      const e = session.entity.def;
      if (e.traits.indexOf('deceiver') >= 0) {
        const lacks = ['emf', 'thermal', 'voice', 'residue', 'optical', 'motion', 'pressure'].filter((x) => e.evidence.indexOf(x) < 0);
        this.deceiveType = session.rng.pick(lacks);
        this.deceivedRooms = new Set();
      }
    }

    queue(delay, kind, opts) { this.queueList.push({ t: this.s.state.t + delay, kind, opts: opts || {} }); }

    /** Probability that an evidence-capable interaction actually produces this evidence. */
    evidenceRoll(ev, mul) {
      const s = this.s, def = s.entity.def;
      if (def.evidence.indexOf(ev) < 0 || s.isHidden(ev)) return false;
      const rate = (def.evidenceRate && def.evidenceRate[ev]) || 1;
      return s.rng.chance(U.clamp(s.diff.reliability * rate * (mul || 1), 0, 1));
    }

    tick(dt) {
      const s = this.s, st = s.state, ent = s.entity;
      if (st.phase !== 'active') return;
      // delayed actions
      for (let i = this.queueList.length - 1; i >= 0; i--) {
        const q = this.queueList[i];
        if (q.t <= st.t) { this.queueList.splice(i, 1); this.perform(q.kind, q.opts); }
      }
      // escalation over time
      ent.anger = Math.min(1, ent.anger + dt * 0.0004 * s.diff.aggression);
      if (ent.def.traits.indexOf('isolationHungry') >= 0) ent.anger = Math.min(1, ent.anger + dt * 0.002 * s.isolationFactor());
      // scheduled interactions
      if (ent.mode !== 'hunt') {
        this.nextAct -= dt;
        if (this.nextAct <= 0) {
          const playersInLair = s.alivePlayers().filter((p) => s.world.roomAtPos(p) === ent.lair).length;
          const mult = s.diff.eventRate * (1 + ent.anger * 1.2 + playersInLair * 0.35 + (s.beaconActive ? 1.8 : 0) + Math.min(1, st.t / 900));
          this.nextAct = (60 / (ent.def.activity * mult)) * s.rng.range(0.5, 1.5);
          this.perform(this.pickInteraction());
        }
      }
      this._thermal(dt);
      this._pressure(dt);
      this._traitAmbient(dt);
      this._falseReadings(dt);
      this._hallucinations(dt);
      this._radioBleed(dt);
    }

    pickInteraction() {
      const w = Object.assign({}, this.s.entity.def.weights);
      const s = this.s;
      // manifestations need someone nearby
      const near = s.alivePlayers().some((p) => p.f === s.entity.pos.f && U.dist(p.x, p.z, s.entity.pos.x, s.entity.pos.z) < 9);
      if (!near) w.manifest = 0;
      if (s.beaconActive) w.manifest = (w.manifest || 1) * 4;
      if (!s.findItemNear('slate', s.entity.pos, 5, (it) => it.placed || !it.holder)) w.write = 0;
      if (!s.state.power) w.light = 0.3;
      let total = 0; for (const k in w) total += w[k];
      let r = s.rng() * total;
      for (const k in w) { r -= w[k]; if (r <= 0) return k; }
      return 'sound';
    }

    /* ------------------------------------------------------------------ */
    perform(kind, opts) {
      const s = this.s, ent = s.entity, w = s.world, def = ent.def, rng = s.rng;
      opts = opts || {};
      const pos = ent.pos;
      switch (kind) {
        case 'door': {
          const doors = w.doors.filter((d) => d.f === pos.f && !d.exit && !d.sealed && U.dist(d.x + 0.5, d.z + 0.5, pos.x, pos.z) < 7);
          if (!doors.length) return this.perform('sound');
          const d = rng.pick(doors);
          if (ent.has('doorMaster') && rng.chance(0.65)) {
            if (s.nearActiveLight({ f: d.f, x: d.x + 0.5, z: d.z + 0.5 }, 5)) { s.setDoor(d.id, false, false, 'entity', true); }
            else {
              s.emitSound('keys', d.x + 0.5, d.z + 0.5, d.f, 0.7);
              s.setDoor(d.id, false, true, 'entity', true);
              s.later(rng.range(25, 55), () => { if (!d.sealed) s.setDoor(d.id, d.open, false, 'entity'); });
            }
          } else {
            const slam = rng.chance(0.25 + ent.anger * 0.3);
            s.setDoor(d.id, !d.open, d.locked, 'entity', slam);
          }
          this.touchAt(d.x + 0.5 + (d.pass === 'z' ? 0.35 : 0), 1.0, d.z + 0.5 + (d.pass === 'x' ? 0.35 : 0), d.f);
          this.emf(d.x + 0.5, 1.0, d.z + 0.5, d.f);
          if (ent.has('mimic')) this.queue(rng.range(4, 7), 'sound', { kind: 'door_echo', x: d.x + 0.5, z: d.z + 0.5, f: d.f });
          break;
        }
        case 'light': {
          const r = w.roomAtPos(pos);
          const room = r >= 0 ? w.rooms[r] : null;
          if (!room || !room.lit || !room.switch) return this.perform('emf');
          let on = !s.state.roomLights[r];
          if (ent.has('darkness')) on = false;
          if (ent.has('lure') && rng.chance(0.7)) on = true;
          if (ent.has('drain') || ent.has('breakerHungry')) {
            if (s.state.power && rng.chance(0.18 + (ent.has('breakerHungry') ? 0.12 : 0))) { s.tripBreaker(); break; }
          }
          if (rng.chance(0.3)) s.event({ t: 'flicker', room: r, dur: rng.range(1.5, 4) });
          else s.setRoomLight(r, on, 'entity');
          this.touchAt(room.switch.x, room.switch.y, room.switch.z, room.f);
          this.emf(room.switch.x, room.switch.y, room.switch.z, room.f);
          break;
        }
        case 'throw': {
          const items = s.state.throwables.filter((t) => t.f === pos.f && U.dist(t.x, t.z, pos.x, pos.z) < 5);
          if (!items.length) return this.perform('touch');
          const it = rng.pick(items);
          const ang = rng() * Math.PI * 2, force = rng.range(1.5, 4.5) * (1 + ent.anger);
          let tx = it.x + Math.cos(ang) * force * 0.6, tz = it.z + Math.sin(ang) * force * 0.6;
          // land on a walkable tile
          for (let k = 0; k < 6 && !w.walkable(it.f, Math.floor(tx), Math.floor(tz)); k++) { tx = (tx + it.x) / 2; tz = (tz + it.z) / 2; }
          const from = { x: it.x, y: it.y, z: it.z };
          it.x = tx; it.z = tz; it.y = it.f * w.FH + 0.05; it.ry = rng() * 6.28;
          s.event({ t: 'throw', id: it.id, from, to: { x: it.x, y: it.y, z: it.z }, ry: it.ry, force });
          this.touchAt(it.x, it.y + 0.1, it.z, it.f);
          this.emf(it.x, it.y, it.z, it.f);
          break;
        }
        case 'touch': {
          const p = this.surfaceNear(pos);
          this.touchAt(p.x, p.y, p.z, pos.f, true);
          if (rng.chance(0.4)) this.emf(p.x, p.y, p.z, pos.f);
          break;
        }
        case 'sound': {
          const k = opts.kind || def.look.sound;
          const x = opts.x != null ? opts.x : pos.x, z = opts.z != null ? opts.z : pos.z, f = opts.f != null ? opts.f : pos.f;
          if (k === 'door_echo') { s.emitSound('door_creak', x, z, f, 0.7); break; }
          if (k === 'whisper' || k === 'none' && rng.chance(0.3)) { s.emitSound('whisper', x, z, f, 0.7, { text: rng.pick(WHISPERS) }); break; }
          if (ent.has('counter')) {
            const n = [3, 2, 1][(s.state.knockSet = ((s.state.knockSet || 0) + 1) % 3)];
            s.emitSound('knock', x, z, f, 1, { count: n });
            break;
          }
          const pool = { whisper: 'whisper', chime: 'chime', keys: 'keys', mimic: 'steps', breath: 'breath', heartbeat: 'groan', drip: 'drip', knock: 'knock', buzz: 'buzz', drag: 'drag', rustle: 'steps', drone: 'groan', crackle: 'crackle', none: 'creak' };
          const pk = rng.chance(0.35) ? rng.pick(['creak', 'knock', 'steps', 'scratch', 'groan']) : (pool[k] || 'creak');
          s.emitSound(pk, x, z, f, 0.9, { count: pk === 'knock' ? rng.int(1, 3) : undefined });
          if (ent.has('mimic')) {
            // replay a nearby player's footsteps a few seconds late
            const p = s.alivePlayers().find((pp) => pp.f === f && U.dist(pp.x, pp.z, x, z) < 15);
            if (p) this.queue(rng.range(3, 6), 'sound', { kind: 'steps_echo', x: p.x, z: p.z, f: p.f });
          }
          break;
        }
        case 'steps_echo': s.emitSound('steps', opts.x, opts.z, opts.f, 0.8); break;
        case 'emf': this.emf(pos.x, ent.y + 1, pos.z, pos.f); break;
        case 'cold': {
          s.state.rooms[ent.lair].temp -= 0.6;
          if (ent.has('deteriorate')) { const r = w.roomAtPos(pos); if (r >= 0) s.state.rooms[r].haze = Math.min(1, s.state.rooms[r].haze + 0.15); }
          s.emitSound('breath', pos.x, pos.z, pos.f, 0.5);
          if (def.evidence.indexOf('pressure') >= 0 && this.evidenceRoll('pressure', 0.8)) this.pressureDrop(true);
          break;
        }
        case 'manifest': {
          const kinds = ent.has('deceiver') ? ['shadow'] : ent.has('invisible') ? ['shadow', 'partial'] : ['full', 'full', 'partial', 'shadow'];
          ent.manifest(ent.has('invisible') ? rng.range(0.6, 1.2) : rng.range(1.8, 3.5), rng.pick(kinds));
          s.emitSound(def.look.sound === 'none' ? 'groan' : 'manifest', pos.x, pos.z, pos.f, 0.8);
          this.emf(pos.x, ent.y + 1, pos.z, pos.f, 1.2);
          break;
        }
        case 'write': {
          const slate = s.findItemNear('slate', pos, 5, (it) => it.placed || !it.holder);
          if (slate && !slate.data.glyph && this.evidenceRoll('inscription', 1.4)) {
            slate.data.glyph = ent.has('counter') ? 'tally' : rng.pick(['spiral', 'eye', 'hand', 'door', 'word', 'circle']);
            slate.data.glyphSeed = rng.int(1, 9999);
            s.event({ t: 'slate', item: slate.id, glyph: slate.data.glyph });
            s.emitSound('scratch', slate.x, slate.z, slate.f, 0.6);
            this.touchAt(slate.x, slate.y + 0.05, slate.z, slate.f);
          } else this.perform('touch');
          break;
        }
        case 'roam': {
          if (rng.chance(0.15) && !ent.has('fixate')) {
            const cands = w.lairCandidates({ avoidWater: ent.has('hatesWater') }).filter((r) => r.f === w.rooms[ent.lair].f);
            const nr = rng.pick(cands);
            if (nr && U.dist(nr.cx, nr.cz, w.rooms[ent.lair].cx, w.rooms[ent.lair].cz) < 14) ent.lair = nr.id;
          }
          s.emitSound('steps', pos.x, pos.z, pos.f, 0.6);
          if (rng.chance(0.4)) this.distortion();
          break;
        }
        default: this.perform('sound');
      }
      // optical distortion can accompany any interaction
      if (kind !== 'roam' && rng.chance(0.18)) this.distortion();
    }

    emf(x, y, z, f, mul) {
      const s = this.s;
      const peak = this.evidenceRoll('emf', 0.4 * (mul || 1));
      const level = peak ? 5 : s.rng.chance(0.5) ? 2 : s.rng.chance(0.6) ? 3 : 4;
      s.addTrace('emf', { f, x, y, z, level, ttl: 18 });
    }
    touchAt(x, y, z, f, isTouch) {
      const s = this.s, ent = s.entity;
      const residue = this.evidenceRoll('residue', 0.75);
      s.addTrace('touch', { f, x, y, z, residue, swabbed: false, scorch: ent.has('scorch') && s.rng.chance(0.6), wet: ent.has('wetPrints'), ttl: 400 });
    }
    distortion() {
      if (this.evidenceRoll('optical', 0.7)) this.s.spawnDistortion(this.s.entity.pos, 20);
    }
    surfaceNear(pos) {
      const w = this.s.world;
      const x0 = Math.floor(pos.x), z0 = Math.floor(pos.z);
      const opts = [];
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = x0 + dx, z = z0 + dz;
        if (!w.walkable(pos.f, x, z)) continue;
        for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = w.ch(pos.f, x + nx, z + nz);
          if (c === '#' || c === 'W' || 'TCKOMBY'.indexOf(c) >= 0) {
            const tall = c === '#' || c === 'W' || c === 'C';
            opts.push({ x: x + 0.5 + nx * 0.49, y: pos.f * w.FH + (tall ? this.s.rng.range(0.6, 1.8) : 0.82), z: z + 0.5 + nz * 0.49 });
          }
        }
      }
      if (!opts.length) return { x: pos.x, y: pos.f * w.FH + 0.02, z: pos.z };
      return this.s.rng.pick(opts);
    }

    pressureDrop(real) {
      const s = this.s, r = s.entity.lair;
      const st = s.state.rooms;
      const drop = real ? s.rng.range(16, 24) : s.rng.range(1.5, 5);
      const rid = s.world.roomAtPos(s.entity.pos) >= 0 ? s.world.roomAtPos(s.entity.pos) : r;
      st[rid].hpaTarget = st[rid].hpaBase - drop;
      st[rid].hpaHold = 6;
      if (real) s.emitSound('pressure', s.entity.pos.x, s.entity.pos.z, s.entity.pos.f, 0.5);
    }

    /* ---------- continuous environment ---------- */
    _thermal(dt) {
      const s = this.s, ent = s.entity, rooms = s.state.rooms;
      this.coldCycleT -= dt;
      if (this.coldCycleT <= 0) {
        this.coldCycleT = 50;
        const has = ent.def.evidence.indexOf('thermal') >= 0 && !s.isHidden('thermal');
        this.lairTarget = ent.has('scorch') ? s.rng.range(19, 24)
          : has && s.rng.chance(Math.min(1, s.diff.reliability + 0.15)) ? s.rng.range(-7, -1.5) : s.rng.range(2.5, 7);
      }
      for (let i = 0; i < rooms.length; i++) {
        const rs = rooms[i], room = s.world.rooms[i];
        let target = room.baseTemp;
        if (i === ent.lair) target = this.lairTarget;
        else if (s.state.power && s.roomLit(i) && !room.outdoor) target = room.baseTemp + 2;
        // the entity chills whichever room it currently occupies a little
        if (s.world.roomAtPos(ent.pos) === i && i !== ent.lair) target -= ent.has('scorch') ? -3 : 4;
        if (rs.falseCold > s.state.t) target = -1.5;
        rs.temp += (target - rs.temp) * Math.min(1, dt * 0.05);
        if (rs.haze > 0 && i !== ent.lair) rs.haze = Math.max(0, rs.haze - dt * 0.004);
      }
      if (ent.has('deteriorate')) rooms[ent.lair].haze = Math.min(0.9, rooms[ent.lair].haze + dt * 0.006);
    }
    _pressure(dt) {
      const s = this.s, rooms = s.state.rooms;
      for (const rs of rooms) {
        if (rs.hpaHold > 0) { rs.hpaHold -= dt; rs.hpa += (rs.hpaTarget - rs.hpa) * Math.min(1, dt * 1.5); }
        else rs.hpa += (rs.hpaBase - rs.hpa) * Math.min(1, dt * 0.08);
      }
      // small natural drifts and non-evidence dips near the entity
      if (s.rng.chance(dt * 0.02)) this.pressureDrop(false);
      if (s.entity.def.evidence.indexOf('pressure') >= 0 && s.rng.chance(dt * 0.012) && this.evidenceRoll('pressure', 1)) this.pressureDrop(true);
    }

    _traitAmbient(dt) {
      const s = this.s, ent = s.entity;
      // Lantern: drifting light motes
      if (ent.has('lure')) {
        this.orbT -= dt;
        const orbs = s.state.traces.orbs;
        if (this.orbT <= 0 && orbs.length < 3) {
          this.orbT = s.rng.range(10, 25);
          const start = { f: ent.pos.f, x: ent.pos.x, z: ent.pos.z };
          const goal = s.world.randomTileInRoom(s.rng.chance(0.5) ? ent.lair : s.rng.pick(s.world.lairCandidates()).id, s.rng);
          const path = s.world.path(start, goal, { ignoreLocks: true });
          if (path) s.addTrace('orbs', { f: start.f, x: start.x, y: start.f * s.world.FH + 1.4, z: start.z, path: path.slice(1, 40), ttl: 40 });
        }
        for (const o of orbs) {
          if (!o.path || !o.path.length) continue;
          const n = o.path[0];
          const dx = n.x - o.x, dz = n.z - o.z, d = Math.hypot(dx, dz);
          if (d < 0.1) { o.path.shift(); o.f = n.f; continue; }
          o.x += (dx / d) * dt * 0.55; o.z += (dz / d) * dt * 0.55;
          o.y = s.world.heightAt(o.f, o.x, o.z) + 1.4 + Math.sin(s.state.t * 2 + o.x) * 0.15;
        }
      }
      // Tether keeps draining its chosen one (handled in composure); Siltborn drips
      if (ent.has('wetPrints') && s.rng.chance(dt * 0.08)) s.emitSound('drip', ent.pos.x, ent.pos.z, ent.pos.f, 0.5);
      // Flicker / drain: batteries near it drain quickly
      if (ent.has('drain')) {
        for (const it of Object.values(s.state.items)) {
          if (it.battery == null || !it.on) continue;
          const p = s.itemPos(it);
          if (p.f === ent.pos.f && U.dist(p.x, p.z, ent.pos.x, ent.pos.z) < 10) it.battery = Math.max(0, it.battery - dt * 1.5);
        }
      }
    }

    _falseReadings(dt) {
      const s = this.s, d = s.diff;
      // deceiver plants consistent-looking false traces, never twice in the same room
      if (this.deceiveType && !s.beaconActive && s.rng.chance(dt * 0.012)) this._fake(this.deceiveType, true);
      if (!d.falseRate) return;
      this.falseT -= dt * d.falseRate;
      if (this.falseT > 0) return;
      this.falseT = s.rng.range(50, 110);
      const lacks = NW.EVIDENCE.map((e) => e.id).filter((x) => s.entity.def.evidence.indexOf(x) < 0 && ['emf', 'thermal', 'optical', 'pressure'].indexOf(x) >= 0);
      if (lacks.length) this._fake(s.rng.pick(lacks), false);
    }
    _fake(type, deceiver) {
      const s = this.s, w = s.world;
      const rooms = w.lairCandidates().filter((r) => r.id !== s.entity.lair && (!deceiver || !this.deceivedRooms.has(r.id)));
      if (!rooms.length) return;
      const room = s.rng.pick(rooms);
      if (deceiver) this.deceivedRooms.add(room.id);
      const p = w.randomTileInRoom(room.id, s.rng);
      if (type === 'emf') s.addTrace('emf', { f: p.f, x: p.x, y: p.f * w.FH + 1, z: p.z, level: 5, ttl: 8, fake: true });
      else if (type === 'thermal') s.state.rooms[room.id].falseCold = s.state.t + 40;
      else if (type === 'optical') s.addTrace('distort', { f: p.f, x: p.x, y: p.f * w.FH + 1.3, z: p.z, ttl: 12, fake: true });
      else if (type === 'pressure') { const rs = s.state.rooms[room.id]; rs.hpaTarget = rs.hpaBase - 17; rs.hpaHold = 4; }
      else if (type === 'voice') this.fakeVoice = s.state.t + 60;
      else if (type === 'residue') s.addTrace('touch', { f: p.f, x: p.x, y: p.f * w.FH + 1, z: p.z, residue: true, fake: true, ttl: 300 });
      else if (type === 'motion') this.fakeMotion = s.state.t + 60;
    }

    _hallucinations(dt) {
      const s = this.s, ent = s.entity;
      for (const p of s.alivePlayers()) {
        if (!p.inside) continue;
        const thr = ent.has('psychic') ? 50 : 35;
        if (p.composure > thr) continue;
        this.hallucT[p.id] = (this.hallucT[p.id] || 10) - dt * (ent.has('psychic') ? 2 : 1) * (1 + (thr - p.composure) / 30);
        if (this.hallucT[p.id] > 0) continue;
        this.hallucT[p.id] = s.rng.range(14, 30);
        const kind = s.rng.pick(['footsteps', 'voice', 'figure', 'door', 'radio', 'reading', 'whisper']);
        const others = s.alivePlayers().filter((o) => o.id !== p.id);
        s.event({ t: 'halluc', to: p.id, kind, name: others.length ? s.rng.pick(others).name : 'Base', text: s.rng.pick(['Over here...', 'Come to the basement.', 'I found it, hurry.', 'Get out. Now.', 'Is that you behind me?', 'Why did you close the door?']), seed: s.rng.int(0, 99999) });
        s.composureHit(p, 2, null);
      }
    }

    _radioBleed(dt) {
      const s = this.s, ent = s.entity;
      this.bleedT -= dt;
      if (this.bleedT > 0) return;
      this.bleedT = 2.5;
      for (const p of s.alivePlayers()) {
        const it = p.held && s.state.items[p.held];
        if (!it || it.type !== 'radio' || !it.on) continue;
        const near = p.f === ent.pos.f && U.dist(p.x, p.z, ent.pos.x, ent.pos.z) < 8;
        if (near && this.evidenceRoll('bleed', 0.45)) {
          s.event({ t: 'bleed', to: p.id, text: s.rng.pick(BLEED_LINES) });
          s.log(p.name + ' picked up carrier bleed on an empty channel.');
        } else if (near || s.rng.chance(0.15)) s.event({ t: 'static', to: p.id, strength: near ? 0.8 : 0.3 });
      }
    }

    /** Recorder question. Returns nothing; responds with events after a short delay. */
    ask(p, item, q) {
      const s = this.s, ent = s.entity;
      const d = p.f === ent.pos.f ? U.dist(p.x, p.z, ent.pos.x, ent.pos.z) : 99;
      const inLair = s.world.roomAtPos(p) === ent.lair;
      const tier = (NW.EQUIPMENT_BY_ID.recorder.tiers[item.tier || 0] || {}).gain || 1;
      if (ent.has('voiceReactive')) ent.anger = Math.min(1, ent.anger + 0.05);
      const inRange = (d < 6 * tier || inLair) && ent.mode !== 'hunt';
      const fakeVoice = this.fakeVoice && this.fakeVoice > s.state.t;
      if ((inRange && this.evidenceRoll('voice', 0.55)) || (fakeVoice && s.rng.chance(0.3))) {
        const pool = VOICE_ANSWERS[q] || VOICE_ANSWERS.what;
        let text = s.rng.pick(pool);
        if (ent.has('mimic')) text = '...' + (p.name || 'you').toLowerCase() + '...';
        if (ent.has('counter')) text = '...' + ['three', 'two', 'one'][s.rng.int(0, 2)] + '...';
        this.queue(s.rng.range(1.2, 2.8), '__voice', { pid: p.id, text, item: item.id });
      } else if (inRange && s.rng.chance(ent.has('muffle') ? 0 : 0.35)) {
        this.queue(s.rng.range(1, 2.5), 'sound', { kind: 'knock' });
      } else {
        s.event({ t: 'voice_none', to: p.id, item: item.id });
      }
    }
  }

  // Delayed voice delivery
  const basePerform = Director.prototype.perform;
  Director.prototype.perform = function (kind, opts) {
    if (kind === '__voice') {
      const s = this.s;
      const p = s.players[opts.pid];
      s.event({ t: 'voice', pid: opts.pid, text: opts.text, item: opts.item, f: s.entity.pos.f, x: s.entity.pos.x, z: s.entity.pos.z });
      s.log((p ? p.name : 'Someone') + ' recorded a spectral voice: "' + opts.text + '"');
      s.objectives.mark('record_voice');
      return;
    }
    return basePerform.call(this, kind, opts);
  };

  NW.Director = Director;
})(typeof window !== 'undefined' ? window : globalThis);
