/* Traffic: cars drive the road grid (keep-left, Aussie rules), turn at intersections, brake for the player and pedestrians,
   headlights at night. Gentle push instead of damage (health-free game). */
'use strict';
GR.Traffic = (() => {
  const U = GR.U;
  const R = [-120, -40, 40, 120];
  let cars = [], active = true, scene;
  const nodeKey = (x, z) => x + ',' + z;
  function neighbours(x, z) { const out = []; const i = R.indexOf(x), j = R.indexOf(z); if (i > 0) out.push([R[i - 1], z]); if (i < 3) out.push([R[i + 1], z]); if (j > 0) out.push([x, R[j - 1]]); if (j < 3) out.push([x, R[j + 1]]); return out; }
  function init(sc) {
    scene = sc; cars.forEach(c => sc.remove(c.g)); cars = [];
    for (let i = 0; i < 16; i++) {
      const g = GR.Props.car(1000 + i); sc.add(g); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      const a = [U.pick(R), U.pick(R)]; const nb = U.pick(neighbours(a[0], a[1]));
      cars.push({ g, a, b: nb, t: Math.random(), speed: U.rand(8, 12), v: 0, len: g.userData.len });
    }
  }
  function lanePos(c, t) {
    const [ax, az] = c.a, [bx, bz] = c.b; const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
    const x = U.lerp(ax, bx, t), z = U.lerp(az, bz, t); const off = 2.5; // keep left: offset to the left of travel direction
    return { x: x + dz * off, z: z - dx * off, ry: Math.atan2(dx, dz) };
  }
  function update(dt, ppos) {
    if (!active) return;
    for (const c of cars) {
      const segLen = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
      // look ahead for obstacles
      const p = lanePos(c, c.t), fx = Math.sin(p.ry), fz = Math.cos(p.ry);
      let blocked = false;
      const ahead = (x, z, r) => { const rx = x - p.x, rz = z - p.z, along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx); return along > 0 && along < r && lat < 1.8; };
      if (ahead(ppos.x, ppos.z, 9) && ppos.y < 0.3) blocked = true;
      for (const o of cars) if (o !== c && ahead(o.g.position.x, o.g.position.z, 8)) blocked = true;
      for (const n of GR.NPC.list) if (n.kind === 'ped' && n.char.root.position.y < 0.06 && ahead(n.char.root.position.x, n.char.root.position.z, 7)) blocked = true;
      c.v = U.damp(c.v, blocked ? 0 : c.speed, blocked ? 6 : 1.5, dt);
      c.t += c.v * dt / segLen;
      if (c.t >= 1) { const opts = neighbours(c.b[0], c.b[1]).filter(n => !(n[0] === c.a[0] && n[1] === c.a[1])); c.a = c.b; c.b = U.pick(opts.length ? opts : neighbours(c.b[0], c.b[1])); c.t = 0.12; }
      if (c.t < 0.12) c.t = 0.12;
      const q = lanePos(c, Math.min(c.t, 0.88));
      c.g.position.set(q.x, 0, q.z); c.g.rotation.y = U.dampAngle(c.g.rotation.y, q.ry, 4, dt);
      c.g.visible = Math.hypot(q.x - ppos.x, q.z - ppos.z) < 140;
    }
  }
  function pushPlayer(p) { for (const c of cars) { const dx = p.x - c.g.position.x, dz = p.z - c.g.position.z; const ry = c.g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry); const along = dx * fx + dz * fz, lat = dx * fz - dz * fx; if (Math.abs(along) < c.len / 2 + 0.3 && Math.abs(lat) < 1.2 && p.y < 1.4) { const push = 1.2 - Math.abs(lat); p.x += fz * Math.sign(lat || 1) * push; p.z -= fx * Math.sign(lat || 1) * push; } } }
  function carNear(pos, r) { for (const c of cars) if (Math.hypot(pos.x - c.g.position.x, pos.z - c.g.position.z) < r && c.v > 1) return true; return false; }
  function setActive(v) { active = v; cars.forEach(c => c.g.visible = v); }
  function setNight(n) { cars.forEach(c => c.g.userData.headlights.forEach(h => h.material.emissiveIntensity = 0.2 + n * 2.5)); }
  return { init, update, pushPlayer, carNear, setActive, setNight, get cars() { return cars; } };
})();
