/* EntityAI — the authoritative behaviour of the supernatural entity.
 *
 * The entity is invisible most of the time. It wanders between its lair and
 * nearby rooms, the Director (sim/director.js) asks it to perform
 * interactions, and when the team's composure is low enough it can begin a
 * pursuit ("hunt"). Hunting behaviour is driven by the definition's `senses`,
 * `speed`, `doorDelay` and trait hooks.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  const U = NW.util;

  /** Trait hooks: each may implement any of these optional functions. */
  const TRAITS = {
    voiceReactive: { onSpeech(e, p) { e.anger = Math.min(1, e.anger + 0.06); e.s.director.queue(1.5, 'sound', { kind: 'whisper' }); } },
    lure: {},
    doorMaster: {},
    mimic: {},
    isolationHungry: {},
    deteriorate: {},
    coldSpeed: {
      speedMul(e, room) { if (!room) return 1; const s = e.s; if (s.roomLit(room.id)) return 0.75; return s.state.rooms[room.id].temp < 8 ? 1.35 : 1; }
    },
    deceiver: {},
    silentHunt: {},
    fixate: {
      canSense(e, p) { return p.id === e.fixTarget || !e.s.players[e.fixTarget] || !e.s.players[e.fixTarget].alive; }
    },
    wetPrints: {},
    waterSpeed: { speedMul(e, room) { return room && room.wet ? 1.4 : 0.88; } },
    persistent: {},
    searcher: {},
    counter: {},
    drain: {},
    breakerHungry: {},
    darkness: {
      speedMul(e, room) { const s = e.s; if ((room && s.roomLit(room.id)) || s.nearActiveLight(e.pos, 6)) return 0.45; return 1.25; },
      canHunt(e) { const s = e.s; const r = s.world.roomAtPos(e.pos); return !(r >= 0 && s.roomLit(r)) && !s.nearActiveLight(e.pos, 6); }
    },
    invisible: {},
    psychic: {},
    scorch: {},
    hatesWater: {},
    muffle: {}
  };

  class EntityAI {
    constructor(session, def) {
      this.s = session;
      this.def = def;
      this.traits = def.traits.map((t) => TRAITS[t]).filter(Boolean);
      this.has = (t) => def.traits.indexOf(t) >= 0;
      const w = session.world, rng = session.rng;
      const cands = w.lairCandidates({ avoidWater: this.has('hatesWater') });
      // preferred conditions bias the lair choice
      const score = (r) => {
        let s = rng() * 2;
        if (def.prefers === 'wet' && r.wet) s += 3;
        if (def.prefers === 'cold' && r.baseTemp < 12) s += 2;
        if (def.prefers === 'dark' && !r.lit) s += 1.5;
        if (def.prefers === 'enclosed' && r.area < 40) s += 1.5;
        if (def.prefers === 'electrical' && (r.kind === 'generator' || r.kind === 'control' || r.kind === 'utility')) s += 2.5;
        if (def.prefers === 'warm' && r.baseTemp >= 12) s += 1.5;
        if (r.kind === 'corridor') s -= 2;
        return s;
      };
      this.lair = cands.reduce((b, r) => (score(r) > score(b) ? r : b), cands[0]).id;
      this.pos = w.randomTileInRoom(this.lair, rng);
      this.y = w.heightAt(this.pos.f, this.pos.x, this.pos.z);
      this.yaw = 0;
      this.path = null; this.goal = null; this.idleT = 2;
      this.anger = 0;                 // 0..1 agitation
      this.mode = 'roam';             // roam | hunt | stunned
      this.hunt = null;
      this.huntCooldown = 0;
      this.huntCheckT = 4;
      this.manifestT = 0;
      this.fixTarget = null;
      this.doorWait = 0;
      this.printT = 0;
      this.visible = false;
    }

    get room() { const r = this.s.world.roomAtPos(this.pos); return r >= 0 ? this.s.world.rooms[r] : null; }

    speedMul() {
      let m = 1;
      const room = this.room;
      for (const t of this.traits) if (t.speedMul) m *= t.speedMul(this, room);
      if (room && room.flooded && !this.has('waterSpeed')) m *= 0.75;
      return m;
    }

    /* ------------------------------------------------------------------ */
    tick(dt) {
      if (this.huntCooldown > 0) this.huntCooldown -= dt;
      if (this.manifestT > 0) { this.manifestT -= dt; if (this.manifestT <= 0 && this.mode !== 'hunt') this.visible = false; }
      if (this.mode === 'stunned') {
        this.stunT -= dt;
        if (this.stunT <= 0) this.mode = this.hunt ? 'hunt' : 'roam';
        return;
      }
      if (this.mode === 'hunt') return this._huntTick(dt);
      this._roamTick(dt);
      this.huntCheckT -= dt;
      if (this.huntCheckT <= 0) { this.huntCheckT = 4; this._considerHunt(); }
    }

    /* ---------- roaming ---------- */
    _roamTick(dt) {
      const s = this.s, w = s.world;
      if (this.has('fixate') && !this.fixTarget) {
        const alive = s.alivePlayers();
        if (alive.length) this.fixTarget = s.rng.pick(alive).id;
      }
      if (!this.path || !this.path.length) {
        this.idleT -= dt;
        if (this.idleT > 0) return;
        this.idleT = s.rng.range(2, 7);
        let goalRoom = this.lair;
        const fixP = this.fixTarget && s.players[this.fixTarget];
        if (fixP && fixP.alive && fixP.inside && s.rng.chance(0.55)) {
          const r = w.roomAtPos(fixP); if (r >= 0 && !w.rooms[r].outdoor) goalRoom = r;
        } else if (s.beaconTarget && s.rng.chance(0.8)) {
          goalRoom = w.roomAtPos(s.beaconTarget);
        } else if (s.rng.chance(0.3)) {
          const near = w.lairCandidates({ avoidWater: this.has('hatesWater') }).filter((r) => r.f === this.pos.f || s.rng.chance(0.2));
          goalRoom = s.rng.pick(near).id;
        }
        if (goalRoom < 0) goalRoom = this.lair;
        const goal = w.randomTileInRoom(goalRoom, s.rng);
        this.path = w.path(this.pos, goal, { ignoreLocks: true, avoidWater: this.has('hatesWater') });
        if (this.path) this.path.shift();
        return;
      }
      this._follow(dt, this.def.speed.roam * this.speedMul(), true);
      // Siltborn leaves wet prints
      if (this.has('wetPrints')) {
        this.printT -= dt;
        if (this.printT <= 0) { this.printT = 1.1; if (s.rng.chance(0.55)) s.addTrace('prints', { f: this.pos.f, x: this.pos.x, z: this.pos.z, yaw: this.yaw, ttl: 70 }); }
      }
    }

    /** Move along the current path. Roaming entities pass doors without opening them (they are not physical yet). */
    _follow(dt, speed, ghostly) {
      const s = this.s, w = s.world;
      if (!this.path || !this.path.length) return true;
      if (this.doorWait > 0) { this.doorWait -= dt; return false; }
      const n = this.path[0];
      // physical door in the way during a hunt
      if (!ghostly) {
        const d = w.doorAtFast(n.f, Math.floor(n.x), Math.floor(n.z));
        if (d && !d.open) {
          if (d.locked && !d.exit) { s.setDoor(d.id, true, false, 'entity'); }
          else if (d.locked && d.exit) { this.path = null; return true; }
          else {
            if (this.def.doorDelay > 0 && !this._openingDoor) { this._openingDoor = d.id; this.doorWait = this.def.doorDelay; s.emitSound('door_rattle', d.x + 0.5, d.z + 0.5, d.f, 0.8); return false; }
            this._openingDoor = null; s.setDoor(d.id, true, false, 'entity', true);
          }
        }
      }
      const dx = n.x - this.pos.x, dz = n.z - this.pos.z, d = Math.hypot(dx, dz);
      const step = speed * dt;
      if (d <= step || d < 0.05) {
        this.pos.x = n.x; this.pos.z = n.z; this.pos.f = n.f; this.path.shift();
      } else {
        this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step;
        this.yaw = Math.atan2(dx, dz);
        if (n.f !== this.pos.f) {
          // crossing between floors on stairs: floor follows height
          const hy = Math.max(w.heightAt(this.pos.f, this.pos.x, this.pos.z), w.heightAt(n.f, this.pos.x, this.pos.z));
          this.pos.f = w.floorFromHeight(hy);
        }
      }
      this.y = w.heightAt(this.pos.f, this.pos.x, this.pos.z);
      if (w.ch(this.pos.f, Math.floor(this.pos.x), Math.floor(this.pos.z)) === '_') this.y = w.heightAt(this.pos.f, this.pos.x, this.pos.z);
      return false;
    }

    /* ---------- hunts ---------- */
    _considerHunt() {
      const s = this.s, d = s.diff;
      if (s.state.phase !== 'active' || this.huntCooldown > 0) return;
      if (s.state.t < d.setup) return;
      const inside = s.alivePlayers().filter((p) => p.inside);
      if (!inside.length) return;
      let threshold = this.def.huntAt;
      if (this.has('voiceReactive') && s.state.t - s.lastSpeechT < 20) threshold += 12;
      if (this.has('isolationHungry') && s.isolationFactor() > 0.5) threshold += 10;
      threshold += this.anger * 8;
      const comp = s.teamComposure(this.fixTarget);
      if (comp > threshold) return;
      for (const t of this.traits) if (t.canHunt && !t.canHunt(this)) return;
      let p = 0.16 * d.aggression * (1 + this.anger) * (comp < threshold - 25 ? 1.6 : 1);
      if (s.beaconActive) p *= 2.2;
      if (this.has('deceiver')) p *= 0.55;
      if (!s.rng.chance(p)) return;
      // Grounding Spike absorbs the attempt
      const spike = s.findItemNear('spike', this.pos, 4, (it) => it.placed && it.charges > 0);
      if (spike) {
        spike.charges = 0; spike.data.spent = true;
        s.event({ t: 'spike', item: spike.id, f: spike.f, x: spike.x, z: spike.z });
        s.log('A grounding spike discharged — something tried to reach for you.');
        s.objectives.mark('spike_block');
        this.huntCooldown = 25; this.anger = Math.max(0, this.anger - 0.2);
        return;
      }
      this.startHunt();
    }

    startHunt() {
      const s = this.s, d = s.diff;
      const len = s.rng.range(this.def.huntLength[0], this.def.huntLength[1]) * (0.85 + d.aggression * 0.15);
      this.mode = 'hunt';
      this.hunt = { t: 0, len, target: null, last: null, seenT: 0, sawHide: {}, searchT: 0, fakeStepT: 2, speed: this.def.speed.hunt };
      this.path = null;
      this.visible = !this.has('invisible');
      s.state.hunting = true; s.state.huntCount++;
      if (s.world.exitDoor) s.setDoor(s.world.exitDoor.id, false, true, 'entity', true);
      s.event({ t: 'hunt_start', f: this.pos.f, x: this.pos.x, z: this.pos.z, silent: this.has('silentHunt') });
      s.log('PURSUIT — the entity is hunting. Hide or get out of its way.');
      // witnessing the start hurts
      for (const p of s.alivePlayers()) if (s.canSee(p, this.pos, 14)) s.composureHit(p, 8, 'saw the entity');
      if (this.has('doorMaster')) this._wardenLockdown();
    }

    _wardenLockdown() {
      const s = this.s, w = s.world;
      for (const p of s.alivePlayers()) {
        if (!p.inside) continue;
        const r = w.roomAtPos(p);
        for (const d of w.doors) {
          if (d.exit || d.rooms.indexOf(r) < 0) continue;
          if (s.nearActiveLight({ f: d.f, x: d.x + 0.5, z: d.z + 0.5 }, 5)) continue;
          s.setDoor(d.id, false, true, 'entity', true);
          s.later(s.rng.range(8, 14), () => { if (d.locked && !d.sealed) s.setDoor(d.id, d.open, false, 'entity'); });
        }
      }
    }

    endHunt(reason) {
      const s = this.s;
      this.mode = 'roam'; this.hunt = null; this.visible = false; this.path = null;
      this.huntCooldown = 25 + s.rng.range(0, 15) / s.diff.aggression;
      this.anger = Math.max(0, this.anger - 0.25);
      s.state.hunting = false;
      if (s.world.exitDoor) s.setDoor(s.world.exitDoor.id, false, false, 'entity', true);
      // anyone still standing inside survived it
      for (const p of s.alivePlayers()) if (p.inside) s.objectives.mark('survive_hunt');
      s.event({ t: 'hunt_end', reason: reason || 'timeout' });
      s.log('The pursuit has ended.');
    }

    stun(sec) {
      if (this.mode !== 'hunt') return false;
      this.mode = 'stunned'; this.stunT = sec;
      this.s.event({ t: 'stun', x: this.pos.x, z: this.pos.z, f: this.pos.f, sec });
      return true;
    }

    /** Can this entity sense player p right now during a pursuit? Returns 0..1 confidence. */
    sense(p) {
      const s = this.s, w = s.world, h = this.hunt;
      if (!p.alive || !p.inside) return 0;
      for (const t of this.traits) if (t.canSense && !t.canSense(this, p)) return 0;
      if (p.f !== this.pos.f) return 0;
      const d = U.dist(p.x, p.z, this.pos.x, this.pos.z);
      if (p.hidden != null) {
        if (h.sawHide[p.id] && s.state.t - h.sawHide[p.id] < 6) return d < 10 ? 1 : 0;
        return 0;
      }
      const los = d < 18 && w.los(p.f, this.pos.x, this.pos.z, p.x, p.z);
      let best = 0;
      for (const sense of this.def.senses) {
        if (sense === 'sight' && los && d < 14) best = Math.max(best, 1);
        else if (sense === 'sound') {
          const noise = s.noiseOf(p);
          const range = (3 + noise * 10) * (this.has('voiceReactive') && s.state.t - p.speakT < 3 ? 2 : 1);
          if (d < range) best = Math.max(best, 0.8);
        } else if (sense === 'motion' && p.speed > 0.35 && d < 11) best = Math.max(best, 0.9);
        else if (sense === 'electric') {
          const e = s.electronicsOf(p);
          if (e > 0 && d < 7 + e * 8) best = Math.max(best, 0.9);
        } else if (sense === 'light') {
          if (p.torch && (los ? d < 18 : d < 6)) best = Math.max(best, 0.9);
        }
      }
      if (this.has('persistent') && h.target === p.id) best = Math.max(best, 0.7);
      return best;
    }

    _huntTick(dt) {
      const s = this.s, w = s.world, h = this.hunt;
      h.t += dt;
      if (h.t >= h.len) return this.endHunt('timeout');
      // pick target
      h.senseT = (h.senseT || 0) - dt;
      if (h.senseT <= 0) {
        h.senseT = 0.3;
        let best = null, bestScore = 0;
        for (const p of s.alivePlayers()) {
          const c = this.sense(p);
          if (c <= 0) continue;
          const sc = c / (1 + U.dist(p.x, p.z, this.pos.x, this.pos.z) * 0.1);
          if (sc > bestScore) { bestScore = sc; best = p; }
        }
        // players hiding with LOS watched
        for (const p of s.alivePlayers()) {
          if (p.hidden != null && s.state.t - p.hideT < 1.2 && p.f === this.pos.f && U.dist(p.x, p.z, this.pos.x, this.pos.z) < 8 && w.los(p.f, this.pos.x, this.pos.z, p.x, p.z)) h.sawHide[p.id] = s.state.t;
        }
        if (best) {
          const newTarget = h.target !== best.id;
          h.target = best.id; h.last = { f: best.f, x: best.x, z: best.z };
          const hidePos = best.hidden != null ? w.hides[best.hidden] : null;
          const goal = hidePos ? { f: hidePos.f, x: hidePos.entry[0] + 0.5, z: hidePos.entry[1] + 0.5 } : h.last;
          if (newTarget || !this.path || !this.path.length || s.rng.chance(0.5)) {
            this.path = w.path(this.pos, goal, { avoidWater: this.has('hatesWater') });
            if (this.path) this.path.shift();
          }
          h.seenT = Math.min(6, h.seenT + 0.3);
        } else {
          h.seenT = Math.max(0, h.seenT - 0.3);
          if (!this.path || !this.path.length) {
            // search: last known spot, then random nearby room
            let goal = h.last;
            h.last = null;
            if (!goal) { const rooms = w.lairCandidates({ avoidWater: this.has('hatesWater') }).filter((r) => r.f === this.pos.f); goal = w.randomTileInRoom(s.rng.pick(rooms.length ? rooms : w.lairCandidates()).id, s.rng); }
            this.path = w.path(this.pos, goal, { avoidWater: this.has('hatesWater') });
            if (this.path) this.path.shift();
          }
        }
      }
      // speed ramps while it has a target in sight
      const base = this.def.speed.hunt, max = this.def.speed.huntMax;
      h.speed = U.lerp(base, max, h.seenT / 6) * this.speedMul() * (0.9 + 0.1 * s.diff.aggression);
      this._follow(dt, h.speed, false);
      // Tallyman / searcher: check hiding spots it passes
      if (this.has('searcher')) {
        h.searchT -= dt;
        if (h.searchT <= 0) {
          h.searchT = 1.5;
          for (const hs of w.hides) {
            if (hs.occupant == null || hs.f !== this.pos.f) continue;
            if (U.dist(hs.entry[0] + 0.5, hs.entry[1] + 0.5, this.pos.x, this.pos.z) < 1.6 && s.rng.chance(0.3)) {
              const p = s.players[hs.occupant];
              if (p) { s.event({ t: 'search', hide: hs.id }); return this._catch(p); }
            }
          }
        }
      }
      // Echo / misleading footsteps away from its real position
      if (this.has('mimic')) {
        h.fakeStepT -= dt;
        if (h.fakeStepT <= 0) {
          h.fakeStepT = s.rng.range(2, 4);
          const a = s.rng() * Math.PI * 2;
          s.emitSound('steps', this.pos.x + Math.cos(a) * 7, this.pos.z + Math.sin(a) * 7, this.pos.f, 1);
        }
      }
      // Shroud flickers into view occasionally
      if (this.has('invisible')) this.visible = s.revealT > s.state.t || (Math.sin(h.t * 2.3) > 0.96);
      // catches
      for (const p of s.alivePlayers()) {
        if (p.f !== this.pos.f && Math.abs(p.y - this.y) > 1.2) continue;
        const d = U.dist(p.x, p.z, this.pos.x, this.pos.z);
        if (d > 0.75) continue;
        if (p.hidden != null) {
          const seen = h.sawHide[p.id] && s.state.t - h.sawHide[p.id] < 6;
          if (!seen) continue;
        }
        for (const t of this.traits) if (t.canSense && !t.canSense(this, p)) return;
        return this._catch(p);
      }
    }

    _catch(p) {
      const s = this.s;
      s.incapacitate(p, this);
      this.endHunt('caught');
    }

    /** Short visible manifestation for evidence/photos/scares. */
    manifest(sec, kind) {
      const s = this.s;
      if (this.mode === 'hunt') return;
      this.visible = true; this.manifestT = sec;
      s.event({ t: 'manifest', f: this.pos.f, x: this.pos.x, z: this.pos.z, sec, kind: kind || 'full' });
      s.objectives.markIfSeen(this.pos);
      for (const p of s.alivePlayers()) {
        if (s.canSee(p, this.pos, 13)) s.composureHit(p, kind === 'shadow' ? 6 : 11, 'witnessed a manifestation');
      }
      if (this.def.evidence.indexOf('optical') >= 0 && !s.isHidden('optical')) s.spawnDistortion(this.pos, 18);
    }
  }

  EntityAI.TRAITS = TRAITS;
  NW.EntityAI = EntityAI;
})(typeof window !== 'undefined' ? window : globalThis);
