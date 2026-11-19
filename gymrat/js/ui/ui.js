/* UI core: panel stack, HUD (money/XP/energy/followers/time/minimap/quest tracker), toasts, banners, prompts, dialogue,
   full map + fast travel + waypoint, emote wheel, inventory, pause + settings (graphics/audio/controls remap), dashboards. */
'use strict';
GR.UI = (() => {
  const U = GR.U, D = GR.Data, $ = U.$, el = U.el, esc = U.esc;
  const stack = [];
  let waypoint = null, mapCanvasCache = null, promptEl, hudEl;

  /* ---------------- panel stack ---------------- */
  function open(id, o = {}) {
    closeId(id, true);
    const p = el('div', 'panel ' + (o.cls || '') + (o.side ? ' side-' + o.side : ''));
    p.dataset.id = id;
    p.innerHTML = `<div class="ph"><h2>${o.title || ''}</h2>${o.noClose ? '' : '<button class="x" title="Close (Esc)">✕</button>'}</div><div class="pb">${o.html || ''}</div>`;
    document.getElementById('panels').appendChild(p);
    const x = p.querySelector('.x'); if (x) x.onclick = () => close();
    stack.push({ id, el: p, o });
    if (!o.noPush) GR.Game.pushUI();
    GR.Audio.sfx('open');
    requestAnimationFrame(() => p.classList.add('in'));
    return p;
  }
  function close(silent) { const top = stack.pop(); if (!top) return; top.el.remove(); if (!top.o.noPush) GR.Game.popUI(); if (top.o.onClose) top.o.onClose(); if (!silent) GR.Audio.sfx('close'); }
  function closeId(id, silent) { const i = stack.findIndex(s => s.id === id); if (i < 0) return; const [s] = stack.splice(i, 1); s.el.remove(); if (!s.o.noPush) GR.Game.popUI(); if (s.o.onClose) s.o.onClose(); }
  function closeAll() { while (stack.length) close(true); }
  function back() { const top = stack[stack.length - 1]; if (top && top.o.onBack) { top.o.onBack(); return; } if (top) close(); else if (GR.Dialogue.active) GR.Dialogue.end(); }
  const topId = () => stack.length ? stack[stack.length - 1].id : null;
  const pauseTime = () => stack.some(s => s.o.pauseTime);
  function body(id) { const s = stack.find(s => s.id === id); return s ? s.el.querySelector('.pb') : null; }
  function setBody(id, html) { const b = body(id); if (b) b.innerHTML = html; return b; }

  /* ---------------- toasts / banners / float text ---------------- */
  function toast(txt, kind = 'info') { const t = el('div', 'toast ' + kind, esc(txt)); document.getElementById('toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3800); setTimeout(() => t.remove(), 4400); const all = document.querySelectorAll('.toast'); if (all.length > 5) all[0].remove(); }
  let bannerT = null;
  function banner(title, sub, small) { const b = document.getElementById('banner'); b.className = small ? 'small' : ''; b.innerHTML = `<div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}`; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), small ? 2200 : 3200); }
  function floatText(txt, col) { const f = el('div', 'float', esc(txt)); f.style.color = col; f.style.left = (50 + U.rand(-6, 6)) + '%'; document.getElementById('floats').appendChild(f); setTimeout(() => f.remove(), 1600); }
  function prompt(txt) { promptEl = promptEl || document.getElementById('prompt'); if (!txt) { promptEl.classList.remove('on'); return; } const key = GR.Input.keyName(GR.Input.binds.interact); const html = txt === 'Move to stand up' ? `<span class="k">WASD</span> ${esc(txt)}` : `<span class="k">${key}</span> ${esc(txt)}`; if (promptEl.innerHTML !== html) promptEl.innerHTML = html; promptEl.classList.add('on'); }

  /* ---------------- HUD ---------------- */
  function showHUD(v) { hudEl = hudEl || document.getElementById('hud'); hudEl.hidden = !v; }
  function updateHUD() {
    const s = GR.state; if (!s) return;
    const set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== String(v)) e.textContent = v; };
    set('h_money', U.money(s.money)); set('h_lvl', s.level); set('h_fol', U.kfmt(s.followers)); set('h_rep', U.kfmt(s.rep));
    document.getElementById('h_xpf').style.width = (s.xp / D.xpForLevel(s.level) * 100).toFixed(1) + '%';
    document.getElementById('h_enf').style.width = s.energy + '%'; document.getElementById('h_enf').style.background = s.energy < 20 ? '#ff5a5a' : s.energy < 50 ? '#ffd23f' : '#7cff6b';
    set('h_time', U.timeStr(s.time) + ' • Day ' + (Math.floor(s.time / 24) + 1));
    set('h_wx', { sunny: '☀️', cloudy: '☁️', rain: '🌧️' }[s.weather] + (GR.World.Z.indoor ? ' ' + (GR.World.Z.name || '') : ' ' + GR.Game.district(GR.Game.P.pos.x, GR.Game.P.pos.z)));
    const unread = s.social.notif.filter(n => !n.read).length + Object.values(s.msgs.unread).reduce((a, b) => a + b, 0);
    const nb = document.getElementById('h_notif'); nb.textContent = unread > 99 ? '99+' : unread; nb.hidden = !unread;
    set('h_fps', GR.Game.settings.fps ? Math.round(GR.Game.fps) + ' FPS' : '');
    const bf = document.getElementById('h_buffs'); const bh = s.buffs.filter(b => b.until > s.time).map(b => `<span title="${b.type}">${{ xp: '📈', focus: '🎯', drip: '💧', hype: '🔥', pump: '💪' }[b.type]}</span>`).join(''); if (bf.innerHTML !== bh) bf.innerHTML = bh;
    // quest tracker
    const q = document.getElementById('quests'); const items = [];
    const tt = s.flags.trainerTask; if (tt) items.push(`🏋️ Coach: ${tt.grade}+ on ${D.MACHINES[tt.machine].n}`);
    s.challenges.daily.filter(c => !c.done).slice(0, 2).forEach(c => items.push(`📅 ${c.t} <b>${U.fmt(c.prog)}/${U.fmt(c.n)}</b>`));
    s.sponsors.active.slice(0, 2).forEach(a => { const sp = D.SPONSORS.find(x => x.id === a.id); const t = a.tasks.find(t => t.prog < t.n); if (t) items.push(`🤝 ${sp.n}: ${t.txt} <b>${t.prog}/${t.n}</b>`); });
    if (s.tut && !s.tut.done && GR.Tutorial) items.unshift('⭐ ' + GR.Tutorial.text());
    if (waypoint) { const d = Math.hypot(waypoint.x - GR.Game.P.pos.x, waypoint.z - GR.Game.P.pos.z); items.unshift(`📍 ${esc(waypoint.name)} — ${GR.World.current === 'city' ? Math.round(d) + 'm' : 'outside'}`); if (d < 8 && GR.World.current === 'city') waypoint = null; }
    const qh = items.map(i => `<div>${i}</div>`).join(''); if (q.innerHTML !== qh) q.innerHTML = qh;
    drawMinimap();
  }
  function frame(dt) { }

  /* ---------------- MINIMAP & MAP ---------------- */
  function cityBase() {
    if (mapCanvasCache) return mapCanvasCache;
    const S = 600, c = GR.Tex.canvas(S, S), x = c.getContext('2d'), sc = S / 300; // 300m → 600px
    const tx = v => (v + 150) * sc;
    x.fillStyle = '#5f8f4e'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#3d4047'; x.fillRect(tx(-128), tx(-128), 256 * sc, 256 * sc);
    for (const bx of GR.City.BLOCKS) for (const bz of GR.City.BLOCKS) { x.fillStyle = '#b9b6ae'; x.fillRect(tx(bx - 35), tx(bz - 35), 70 * sc, 70 * sc); }
    const zn = GR.World.zones.city; zn.boxes.forEach(b => { if (b.top < 0.5 || b.bottom > 1) return; x.fillStyle = b.top > 3.5 ? '#7d7f86' : '#9a9a8f'; if (b.top > 3.5 || (b.x2 - b.x1) * (b.z2 - b.z1) > 1.5) x.fillRect(tx(b.x1), tx(b.z1), (b.x2 - b.x1) * sc, (b.z2 - b.z1) * sc); });
    x.fillStyle = '#5f9f4e'; x.fillRect(tx(47), tx(47), 66 * sc, 66 * sc); x.fillStyle = '#4a90c2'; x.beginPath(); x.arc(tx(66), tx(94), 9 * sc, 0, 7); x.fill(); x.fillStyle = '#2f6f8f'; x.fillRect(tx(90.5), tx(64), 15 * sc, 28 * sc);
    x.fillStyle = '#d9d2c3'; x.fillRect(tx(-89), tx(-35), 18 * sc, 70 * sc); x.fillStyle = '#cfc7b6'; x.fillRect(tx(-33), tx(-33), 66 * sc, 66 * sc); x.fillStyle = '#9bd3ff'; x.beginPath(); x.arc(tx(0), tx(6), 4 * sc, 0, 7); x.fill();
    x.strokeStyle = '#e8e2a0'; x.setLineDash([6, 6]); x.lineWidth = 1; for (const r of GR.City.ROADS) { x.beginPath(); x.moveTo(tx(-128), tx(r)); x.lineTo(tx(128), tx(r)); x.stroke(); x.beginPath(); x.moveTo(tx(r), tx(-128)); x.lineTo(tx(r), tx(128)); x.stroke(); }
    mapCanvasCache = { c, sc, tx }; return mapCanvasCache;
  }
  function drawMinimap() {
    const cv = document.getElementById('minimap'); if (!cv) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height, P = GR.Game.P;
    x.save(); x.clearRect(0, 0, W, H); x.beginPath(); x.arc(W / 2, H / 2, W / 2 - 2, 0, 7); x.clip();
    const z = GR.World.Z;
    if (!z.indoor) {
      const b = cityBase(), zoom = 1.6, px = b.tx(P.pos.x), pz = b.tx(P.pos.z);
      x.fillStyle = '#5f8f4e'; x.fillRect(0, 0, W, H);
      x.translate(W / 2, H / 2); x.rotate(-(GR.Game.cam.yaw - Math.PI)); x.scale(zoom, zoom); x.drawImage(b.c, -px, -pz);
      GR.World.markers.forEach(m => { if (!m.icon) return; const mx = b.tx(m.x) - px, mz = b.tx(m.z) - pz; x.save(); x.translate(mx, mz); x.rotate(GR.Game.cam.yaw - Math.PI); x.font = '9px sans-serif'; x.textAlign = 'center'; x.fillText(m.icon, 0, 3); x.restore(); });
      GR.NPC.list.forEach(n => { if (n.kind !== 'cast') return; const mx = b.tx(n.char.root.position.x) - px, mz = b.tx(n.char.root.position.z) - pz; x.fillStyle = '#ff9ec7'; x.beginPath(); x.arc(mx, mz, 1.6, 0, 7); x.fill(); });
      if (waypoint) { const mx = b.tx(waypoint.x) - px, mz = b.tx(waypoint.z) - pz; x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(mx, mz, 3, 0, 7); x.fill(); }
      x.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      x.fillStyle = '#1c1f26'; x.fillRect(0, 0, W, H); const B = z.bounds; const sc = Math.min(W, H) / Math.max(B.x2 - B.x1, B.z2 - B.z1) * 0.85;
      x.translate(W / 2, H / 2); x.rotate(-(GR.Game.cam.yaw - Math.PI)); x.scale(sc, sc); x.translate(-P.pos.x, -P.pos.z);
      x.fillStyle = '#3a3f4b'; x.fillRect(B.x1, B.z1, B.x2 - B.x1, B.z2 - B.z1);
      x.fillStyle = '#5a6070'; z.boxes.forEach(b => { if (b.top > 0.3 && b.bottom < 1) x.fillRect(b.x1, b.z1, b.x2 - b.x1, b.z2 - b.z1); });
      z.inter.forEach(i => { x.fillStyle = i.kind === 'door' ? '#34c759' : i.kind === 'machine' ? '#ff5a5a' : i.kind === 'shop' ? '#ffd23f' : '#5ff0ff'; x.beginPath(); x.arc(i.pos.x, i.pos.z, 0.45, 0, 7); x.fill(); });
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    // player arrow (always up = camera forward)
    x.translate(W / 2, H / 2); x.rotate(-(P.facing - GR.Game.cam.yaw + Math.PI) + Math.PI); x.fillStyle = '#5ff0ff'; x.strokeStyle = '#111'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -8); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.closePath(); x.fill(); x.stroke();
    x.restore();
    x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, H / 2, W / 2 - 2, 0, 7); x.stroke();
    x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; const ang = GR.Game.cam.yaw - Math.PI; x.fillText('N', W / 2 + Math.sin(ang) * (W / 2 - 10), H / 2 - Math.cos(ang) * (H / 2 - 10) + 4);
  }
  function openMap(fastTravel) {
    if (GR.World.Z.indoor && !fastTravel) { toast('🗺️ Showing Mog City. You are inside ' + GR.World.Z.name + '.'); }
    const p = open('map', { title: fastTravel ? '🚌 MOG METRO — FAST TRAVEL ($5)' : '🗺️ MOG CITY MAP', cls: 'mapp', pauseTime: true, html: `<div class="maprow"><canvas id="bigmap" width="720" height="720"></canvas><div class="maplist" id="maplist"></div></div><div class="hint">${fastTravel ? 'Click a destination to ride the Mog Metro.' : 'Click a location to set a waypoint. Bus stops offer fast travel.'}</div>` });
    const cv = $('#bigmap', p), x = cv.getContext('2d'), b = cityBase(), s = cv.width / 600;
    const visited = GR.state.stats.visitedList;
    const draw = (hover) => {
      x.setTransform(s, 0, 0, s, 0, 0); x.drawImage(b.c, 0, 0);
      x.font = 'bold 13px Rubik, sans-serif'; x.textAlign = 'center';
      GR.World.markers.forEach(m => { if (!m.icon) return; const known = visited.includes(m.id) || ['apartment', 'gym', 'arena', 'shopping', 'plaza'].includes(m.id); const X = b.tx(m.x), Z = b.tx(m.z); x.globalAlpha = known ? 1 : 0.5; x.font = '16px sans-serif'; x.fillText(m.icon, X, Z + 5); x.font = 'bold 10px Rubik, sans-serif'; x.fillStyle = '#000a'; x.fillText(known ? m.name : '???', X + 1, Z + 19); x.fillStyle = hover === m ? '#ffd23f' : '#fff'; x.fillText(known ? m.name : '???', X, Z + 18); x.globalAlpha = 1; });
      GR.City.busStops.forEach(bs => { x.fillStyle = '#1b4dff'; x.fillRect(b.tx(bs.x) - 4, b.tx(bs.z) - 4, 8, 8); });
      const P = GR.World.current === 'city' ? GR.Game.P.pos : (GR.World.zones.city.doorOut[GR.World.current] || { x: 0, z: 0 });
      x.fillStyle = '#5ff0ff'; x.strokeStyle = '#111'; x.beginPath(); x.arc(b.tx(P.x), b.tx(P.z), 6, 0, 7); x.fill(); x.stroke();
      if (waypoint) { x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(b.tx(waypoint.x), b.tx(waypoint.z), 5, 0, 7); x.fill(); }
    };
    draw();
    const list = $('#maplist', p);
    list.innerHTML = GR.World.markers.filter(m => m.icon).map((m, i) => { const known = visited.includes(m.id) || ['apartment', 'gym', 'arena', 'shopping', 'plaza'].includes(m.id); return `<button class="mrow" data-i="${GR.World.markers.indexOf(m)}">${m.icon} ${known ? esc(m.name) : '???'}<small>${known && D.LOCATIONS[m.id] ? esc(D.LOCATIONS[m.id].d) : 'Undiscovered'}</small></button>`; }).join('');
    const pick = m => {
      if (fastTravel) { if (!GR.Prog.spend(5)) return; close(); const door = GR.World.zones.city.doorOut[m.id]; const dest = door ? { x: door.x, z: door.z, ry: door.ry } : { x: m.x, z: m.z + 4, ry: 0 }; GR.Game.fade(() => { if (GR.World.current !== 'city') GR.Game.enterZone('city', { instant: true }); GR.Game.P.pos.set(dest.x, 0.12, dest.z); GR.World.collide(GR.World.Z, GR.Game.P.pos, 0.4, 0.12); GR.Game.player.root.position.copy(GR.Game.P.pos); GR.Game.P.facing = dest.ry; GR.Game.cam.yaw = dest.ry + Math.PI; toast('🚌 Mog Metro dropped you at ' + m.name); }, 0.6); return; }
      waypoint = { x: m.x, z: m.z, name: m.name }; toast('📍 Waypoint set: ' + m.name); draw();
    };
    list.querySelectorAll('.mrow').forEach(bt => bt.onclick = () => pick(GR.World.markers[+bt.dataset.i]));
    cv.onclick = e => { const r = cv.getBoundingClientRect(); const mx = (e.clientX - r.left) / r.width * 600, mz = (e.clientY - r.top) / r.height * 600; let best = null, bd = 22; GR.World.markers.forEach(m => { if (!m.icon) return; const d = Math.hypot(b.tx(m.x) - mx, b.tx(m.z) - mz); if (d < bd) { bd = d; best = m; } }); if (best) pick(best); };
    cv.onmousemove = e => { const r = cv.getBoundingClientRect(); const mx = (e.clientX - r.left) / r.width * 600, mz = (e.clientY - r.top) / r.height * 600; let best = null, bd = 22; GR.World.markers.forEach(m => { if (!m.icon) return; const d = Math.hypot(b.tx(m.x) - mx, b.tx(m.z) - mz); if (d < bd) { bd = d; best = m; } }); draw(best); };
  }

  /* ---------------- DIALOGUE ---------------- */
  function dialogue(n, text, opts, f) {
    const box = document.getElementById('dialogue');
    if (!n) { box.hidden = true; if (box.dataset.open) { delete box.dataset.open; GR.Game.popUI(); } return; }
    if (!box.dataset.open) { box.dataset.open = 1; GR.Game.pushUI(); }
    box.hidden = false;
    const hearts = f ? '❤️'.repeat(f.lvl) + '🤍'.repeat(5 - f.lvl) : '';
    const nextLv = f ? GR.Dialogue.LV[Math.min(5, f.lvl + 1)] : 0;
    box.innerHTML = `<div class="dn">${esc(n.name)} <small>${esc(n.cast ? n.cast.title || n.cast.role : 'Mog City local')}</small><span class="hearts">${hearts}${f && f.lvl < 5 ? ` <small>${f.pts}/${nextLv}</small>` : ''}</span></div><div class="dt" id="dtext"></div><div class="dopts">${opts.map((o, i) => `<button data-i="${i}"><span class="k">${i + 1}</span>${esc(o.t)}</button>`).join('')}</div>`;
    const dt = $('#dtext', box); let i = 0; clearInterval(box._ti); box._ti = setInterval(() => { i += 2; dt.textContent = text.slice(0, i); if (i % 6 === 0) GR.Audio.sfx('type'); if (i >= text.length) clearInterval(box._ti); }, 18);
    box.querySelectorAll('button').forEach(b => b.onclick = () => opts[+b.dataset.i].fn());
    box._keys && box._keys(); box._keys = GR.Input.onKey(code => { if (box.hidden) return false; const m = code.match(/Digit(\d)/); if (m && opts[+m[1] - 1]) { opts[+m[1] - 1].fn(); return true; } if (code === 'Escape') { GR.Dialogue.end(); box._keys && box._keys(); box._keys = null; return true; } return false; });
  }
  function choice(title, acts, opts = {}) {
    const p = open('choice', { title, cls: 'small', html: `${opts.text ? `<p>${opts.text}</p>` : ''}<div class="col">${acts.map((a, i) => `<button class="btn" data-i="${i}">${esc(a.t)}</button>`).join('')}</div>` });
    p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { closeId('choice'); acts[+b.dataset.i].fn(); });
  }
  function confirm(title, text, yes, no) { choice(title, [{ t: '✅ Yes', fn: yes }, { t: '❌ No', fn: no || (() => { }) }], { text }); }

  /* ---------------- EMOTE WHEEL ---------------- */
  const CATS = [['dance', '💃 Dances'], ['react', '😮 Reactions'], ['gym', '💪 Gym'], ['pose', '📸 Poses'], ['celebrate', '🏆 Celebrate'], ['taunt', '😏 Taunts'], ['idle', '🧍 Idle'], ['walk', '🚶 Walks'], ['group', '👥 Group']];
  let wheelCat = 'dance';
  function emoteWheel(opts = {}) {
    const s = GR.state; if (opts.group) wheelCat = 'group';
    const p = open('wheel', { title: opts.stage ? '🎤 STAGE PERFORMANCE — pick an emote' : '😎 EMOTE WHEEL', cls: 'wheelp', html: '' });
    const render = () => {
      const owned = D.EMOTES.filter(e => s.owned.emotes.includes(e.id) && e.cat === wheelCat);
      const lockedN = D.EMOTES.filter(e => !s.owned.emotes.includes(e.id) && e.cat === wheelCat).length;
      const n = Math.max(owned.length, 1), R = 170;
      p.querySelector('.pb').innerHTML = `<div class="wtabs">${CATS.map(([k, t]) => `<button class="${k === wheelCat ? 'on' : ''}" data-c="${k}">${t}</button>`).join('')}</div>
        <div class="wheel">${owned.map((e, i) => { const a = i / n * U.TAU - Math.PI / 2; return `<button class="wb" style="left:calc(50% + ${Math.cos(a) * R}px);top:calc(50% + ${Math.sin(a) * R}px)" data-e="${e.id}"><span class="k">${i < 9 ? i + 1 : ''}</span>${esc(e.n)}</button>`; }).join('')}<div class="wc">${owned.length ? 'Pick one' : 'None unlocked'}<small>${lockedN ? lockedN + ' more to unlock: shop, competitions, friends, levels & mystery machines' : 'All unlocked!'}</small></div></div>`;
      p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { wheelCat = b.dataset.c; render(); });
      p.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { close(); playEmote(b.dataset.e, opts); });
    };
    render();
    const off = GR.Input.onKey(code => { if (topId() !== 'wheel') { off(); return false; } const m = code.match(/Digit(\d)/); if (m) { const owned = D.EMOTES.filter(e => s.owned.emotes.includes(e.id) && e.cat === wheelCat); const e = owned[+m[1] - 1]; if (e) { close(); off(); playEmote(e.id, opts); } return true; } return false; });
  }
  function playEmote(id, opts = {}) {
    const e = D.emote(id), G = GR.Game, s = GR.state;
    if (e.walk) { G.P.walkStyle = { w_swagger: 'swagger', w_hype: 'hype', w_phone: 'phone', w_mog: 'mog', w_normal: 'normal' }[id]; toast('🚶 Walk style: ' + e.n); return; }
    G.standUp();
    if (e.group) { G.player.anim.play(e.base === 'flex' ? 'g_flex' : id, { restart: true }); const n = GR.NPC.groupEmote(id, G.player.root.position); if (n) { GR.Prog.stat('groupEmotes'); GR.Prog.event('group_emote', { n }); toast(`👥 ${n} people joined your ${e.n}!`); GR.Prog.addFollowers(n * 3); } else toast('👥 Nobody nearby to join… get closer to people!'); setTimeout(() => G.player.anim.stop(), 8000); }
    else { G.player.anim.play(id, { restart: true, dur: e.dance ? 8 : undefined }); if (e.dance) setTimeout(() => { if (G.player.anim.actionName === id) G.player.anim.stop(); }, 8000); }
    if (id === 'sit') { const st = G.P.pos; G.player.anim.play('kneel'); }
    GR.Prog.event('emote', { id, dance: !!e.dance });
    const n = GR.NPC.onPlayerAct(e.dance ? 'dance' : e.cat === 'gym' ? 'flex' : 'emote', G.player.root.position, { r: opts.stage ? 22 : 9 });
    if (opts.stage) { const bonus = Math.round(5 + n * 4 + (e.aura || 0) * 3); GR.Prog.addFollowers(bonus); GR.Prog.addRep(2); toast(`🎤 The Plaza crowd loved it! +${bonus} followers`); GR.Audio.sfx('cheer'); }
    if (GR.Camera.recording) GR.Camera.recordEmote(id);
  }

  /* ---------------- INVENTORY ---------------- */
  function inventory(tab = 'clothes') {
    const s = GR.state;
    const p = open('inv', { title: '🎒 INVENTORY', cls: 'wide', pauseTime: true, html: '' });
    const tabs = [['clothes', '👕 Clothing'], ['acc', '⌚ Accessories'], ['consumables', '🥤 Consumables'], ['collect', '🧸 Collectibles'], ['furn', '🛋️ Furniture'], ['emotes', '😎 Emotes'], ['trophies', '🏆 Trophies']];
    const render = () => {
      let html = `<div class="tabs">${tabs.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div class="grid">`;
      if (tab === 'clothes' || tab === 'acc') {
        s.owned.clothes.map(k => { const [id, c] = k.split('|'); return { it: D.item(id), c: +c, k }; }).filter(o => o.it && ((tab === 'acc') === !['top', 'bottom', 'shoes'].includes(o.it.slot))).forEach(o => { const on = isEquipped(o.it, o.c); html += `<button class="card ${on ? 'eq' : ''}" data-k="${o.k}">${GR.Shops.swatch(o.it, o.c)}<b>${esc(o.it.name)}</b><small>${o.it.slot}${on ? ' • EQUIPPED' : ''}</small></button>`; });
      } else if (tab === 'consumables') {
        Object.entries(s.owned.consumables).filter(([, n]) => n > 0).forEach(([id, n]) => { const v = Object.values(D.VENDING).flatMap(v => v.items).find(i => i.id === id) || D.FOOD.cafe.concat(D.FOOD.protein).find(f => f.id === id); if (!v) return; html += `<button class="card" data-use="${id}"><div class="ico">🥤</div><b>${esc(v.n)} ×${n}</b><small>+${v.energy} energy${v.buff ? ' • ' + v.buff : ''}</small></button>`; });
      } else if (tab === 'collect') {
        D.COLLECTIBLES.forEach(c => { const n = s.owned.collectibles[c.id] || 0; html += `<div class="card ${n ? '' : 'lock'}"><div class="ico">${n ? '🧸' : '❔'}</div><b>${n ? esc(c.n) : '???'}</b><small>${c.r}${n > 1 ? ' ×' + n : ''}</small></div>`; });
      } else if (tab === 'furn') {
        s.owned.furniture.forEach(f => { const d = D.FURNITURE.find(x => x.id === f.id); html += `<div class="card"><div class="ico">🛋️</div><b>${esc(d.n)}</b><small>In storage — place it from your apartment</small></div>`; });
        if (!s.owned.furniture.length) html += '<p class="muted">No furniture in storage. Buy some at Nest & Co, then decorate your apartment.</p>';
      } else if (tab === 'emotes') {
        D.EMOTES.forEach(e => { const own = s.owned.emotes.includes(e.id); html += `<button class="card ${own ? '' : 'lock'}" data-em="${own ? e.id : ''}"><div class="ico">${e.dance ? '💃' : e.walk ? '🚶' : e.group ? '👥' : '😎'}</div><b>${esc(e.n)}</b><small>${own ? e.cat : 'Locked: ' + ({ shop: 'buy at Phone › Emote Shop', comp: 'win competitions', mystery: 'mystery machines', friend: 'friendship', level: 'level ' + e.lvl }[e.unlock] || '')}</small></button>`; });
      } else if (tab === 'trophies') {
        s.owned.trophies.forEach(t => { html += `<div class="card"><div class="ico">🏆</div><b>${esc(t.n)}</b><small>${esc(t.tier)} • Day ${t.day}</small></div>`; });
        if (!s.owned.trophies.length) html += '<p class="muted">No trophies yet. Win a Mog-Off at Aura Arena!</p>';
      }
      html += '</div>';
      p.querySelector('.pb').innerHTML = html;
      p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
      p.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const [id, c] = b.dataset.k.split('|'); GR.Shops.equip(D.item(id), +c, true); render(); });
      p.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { GR.Shops.consume(b.dataset.use); render(); });
      p.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { if (!b.dataset.em) return; close(); playEmote(b.dataset.em); });
    };
    render();
  }
  function isEquipped(it, c) { const o = GR.state.outfit; if (it.slot === 'top' || it.slot === 'bottom' || it.slot === 'shoes') return o[it.slot] && o[it.slot].id === it.id && o[it.slot].c === c; const a = o.acc && o.acc[it.slot]; return a && a.id === it.id && a.c === c; }

  /* ---------------- PAUSE / SETTINGS ---------------- */
  function pause() {
    const p = open('pause', { title: '⏸ PAUSED <small style="font-size:11px;opacity:.7">' + GR.VERSION + '</small>', cls: 'small', pauseTime: true, html: `<div class="col">
      <button class="btn" data-a="resume">▶ Resume</button><button class="btn" data-a="inv">🎒 Inventory</button><button class="btn" data-a="map">🗺️ Map</button><button class="btn" data-a="profile">📊 Stats & Achievements</button>
      <button class="btn" data-a="settings">⚙️ Settings</button><button class="btn" data-a="save">💾 Save Game</button><button class="btn" data-a="help">❓ Controls & Help</button><button class="btn danger" data-a="menu">🏠 Save & Quit to Menu</button></div>` });
    p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'resume') close(); if (a === 'inv') { close(); inventory(); } if (a === 'map') { close(); openMap(); } if (a === 'profile') { close(); profile(); } if (a === 'settings') settingsPanel(); if (a === 'save') { const ok = GR.Save.save(GR.state, true); toast(ok ? '💾 Game saved to slot ' + (GR.state.slot + 1) : '⚠️ Could not save to browser storage.'); } if (a === 'help') help(); if (a === 'menu') { GR.Save.save(GR.state); location.reload(); } });
  }
  function help() {
    const k = GR.Input.binds, n = GR.Input.keyName;
    open('help', { title: '❓ CONTROLS & HELP', pauseTime: true, html: `<div class="help"><table>${GR.Input.ACTIONS.map(a => `<tr><td><span class="k">${n(k[a])}</span></td><td>${GR.Input.LABEL[a]}</td></tr>`).join('')}<tr><td><span class="k">Mouse</span></td><td>Look around (click the game to lock the cursor; drag also works)</td></tr><tr><td><span class="k">Wheel</span></td><td>Camera zoom</td></tr></table>
      <h3>How Mog City works</h3><ul><li><b>Money</b>: workouts, competitions, challenges, sponsors, streaming and achievements.</li><li><b>Followers</b>: post photos & videos (Phone › Clout, Phone › Camera, photo mode with C), perform on the Plaza stage, win competitions.</li><li><b>Reputation</b>: unlocks harder tournaments and better sponsors. Earn it at the arena, through friendships and big performances.</li><li><b>Energy</b>: workouts use it. Eat at Bean There / Protein Palace, use vending machines, shower, or sleep in your bed.</li><li><b>Friends</b>: talk to named locals daily. Friendship unlocks group emotes, invites, gifts and hangouts.</li><li><b>Apartment</b>: buy furniture at Nest & Co, then use the decorate terminal by your front door.</li></ul></div>` });
  }
  function settingsPanel() {
    const st = GR.Game.settings;
    const p = open('settings', { title: '⚙️ SETTINGS', cls: 'wide', pauseTime: true, html: '' });
    const render = () => {
      p.querySelector('.pb').innerHTML = `<div class="set">
        <h3>Graphics</h3>
        <label>Quality preset <select id="s_q">${['auto', 'low', 'medium', 'high', 'ultra'].map(q => `<option ${st.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
        <p class="muted">Low: integrated GPUs (no shadows/mirrors). Medium: balanced. High: soft shadows, bloom, live mirrors. Ultra: 4K shadows, FXAA, 2 live mirrors. Current: <b>${GR.Game.quality.toUpperCase()}</b></p>
        <label>Resolution scale <input id="s_rs" type="range" min="0.5" max="1.25" step="0.05" value="${st.resScale}"><span>${Math.round(st.resScale * 100)}%</span></label>
        <label><input type="checkbox" id="s_sh" ${st.shadows ? 'checked' : ''}> Dynamic shadows</label><label><input type="checkbox" id="s_bl" ${st.bloom ? 'checked' : ''}> Bloom glow (High/Ultra)</label><label><input type="checkbox" id="s_mi" ${st.mirrors ? 'checked' : ''}> Live mirror reflections</label>
        <label>NPC density <input id="s_npc" type="range" min="0.4" max="1.5" step="0.1" value="${st.npcDensity}"><span>${Math.round(st.npcDensity * 100)}%</span></label>
        <label>Field of view <input id="s_fov" type="range" min="50" max="85" step="1" value="${st.fov}"><span>${st.fov}°</span></label>
        <label><input type="checkbox" id="s_fps" ${st.fps ? 'checked' : ''}> Show FPS</label>
        <button class="btn" id="s_full">${document.fullscreenElement ? '🗗 Windowed' : '⛶ Fullscreen'}</button>
        <h3>Audio</h3>
        <label>Music <input id="s_mu" type="range" min="0" max="1" step="0.05" value="${st.music}"></label><label>Sound effects <input id="s_sf" type="range" min="0" max="1" step="0.05" value="${st.sfx}"></label><label>Dialogue voices <input id="s_dl" type="range" min="0" max="1" step="0.05" value="${st.dialogue}"></label><label><input type="checkbox" id="s_mute" ${st.mute ? 'checked' : ''}> Mute all</label>
        <h3>Minigames</h3><label>Timing windows <select id="s_as">${['relaxed', 'normal', 'hard'].map(a => `<option ${st.assist === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><p class="muted">Relaxed gives every workout, dance and basketball shot a wider timing window.</p>
        <h3>Controls</h3>
        <label>Mouse sensitivity <input id="s_sens" type="range" min="0.3" max="2.5" step="0.1" value="${st.sens}"><span>${st.sens}</span></label><label><input type="checkbox" id="s_inv" ${st.invertY ? 'checked' : ''}> Invert camera Y</label>
        <div class="binds">${GR.Input.ACTIONS.map(a => `<div><span>${GR.Input.LABEL[a]}</span><button class="bind" data-a="${a}">${GR.Input.keyName(st.keys[a])}</button></div>`).join('')}</div>
        <button class="btn" id="s_reset">Reset controls to default</button></div>`;
      const q = id => p.querySelector(id);
      q('#s_as').onchange = e => { st.assist = e.target.value; save(); };
      q('#s_q').onchange = e => { st.quality = e.target.value; GR.Game.applyQuality(GR.Game.resolveQuality(st.quality)); save(); render(); };
      const rng = (id, key, fn) => { q(id).oninput = e => { st[key] = +e.target.value; if (e.target.nextElementSibling) e.target.nextElementSibling.textContent = key === 'fov' ? st[key] + '°' : key === 'sens' ? st[key] : Math.round(st[key] * 100) + '%'; fn && fn(); save(); }; };
      rng('#s_rs', 'resScale', () => GR.Game.applyQuality(GR.Game.quality)); rng('#s_npc', 'npcDensity', () => GR.NPC.setDensity(st.npcDensity)); rng('#s_fov', 'fov'); rng('#s_sens', 'sens');
      const aud = () => GR.Audio.setVolumes({ music: st.music, sfx: st.sfx, dialogue: st.dialogue, mute: st.mute });
      rng('#s_mu', 'music', aud); rng('#s_sf', 'sfx', aud); rng('#s_dl', 'dialogue', aud);
      const chk = (id, key, fn) => { q(id).onchange = e => { st[key] = e.target.checked; fn && fn(); save(); }; };
      chk('#s_sh', 'shadows', () => GR.Game.applyQuality(GR.Game.quality)); chk('#s_bl', 'bloom', () => GR.Game.applyQuality(GR.Game.quality)); chk('#s_mi', 'mirrors'); chk('#s_fps', 'fps'); chk('#s_mute', 'mute', aud); chk('#s_inv', 'invertY');
      q('#s_full').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { } setTimeout(render, 300); };
      q('#s_reset').onclick = () => { st.keys = Object.assign({}, GR.Save.DEFAULT_SET.keys); GR.Input.setBinds(st.keys); save(); render(); };
      p.querySelectorAll('.bind').forEach(b => b.onclick = () => { b.textContent = 'Press a key…'; const off = GR.Input.onKey(code => { if (code !== 'Escape') { Object.keys(st.keys).forEach(k => { if (st.keys[k] === code) st.keys[k] = st.keys[b.dataset.a]; }); st.keys[b.dataset.a] = code; GR.Input.setBinds(st.keys); save(); } off(); render(); return true; }); });
    };
    const save = () => GR.Save.saveSettings(st);
    render();
  }

  /* ---------------- DASHBOARDS ---------------- */
  function gymDashboard() {
    const s = GR.state, st = s.stats;
    const rows = Object.entries(D.MACHINES).map(([k, m]) => { const r = st.machines[k]; return `<tr><td>${esc(m.n)}</td><td>${r ? r.sessions : 0}</td><td>${r ? U.fmt(r.best) : '—'}</td><td>${r && r.bestGrade ? `<b class="g${r.bestGrade}">${r.bestGrade}</b>` : '—'}</td><td>${r ? GR.Mini.DIFF[Math.min(3, r.unlocked)].n : 'Standard'}</td><td>${r && r.history[0] ? r.history.slice(0, 5).map(h => h.grade).join(' ') : ''}</td></tr>`; }).join('');
    const ch = [...s.challenges.daily.map(c => ['📅', c]), ...s.challenges.weekly.map(c => ['🗓️', c])].map(([i, c]) => `<div class="chal ${c.done ? 'done' : ''}">${i} ${esc(c.t)} <span>${U.fmt(c.prog)}/${U.fmt(c.n)}</span><em>${U.money(c.r)}</em><div class="bar"><i style="width:${c.prog / c.n * 100}%"></i></div></div>`).join('');
    const mem = s.flags.member; const memH = mem ? `<div class="chal">🪪 <b>IRON TEMPLE MEMBER</b> since day ${mem} — +15% workout pay, free shakes at the desk once a day.</div>${s.flags.shakeDay !== Math.floor(s.time / 24) ? '<button class="btn sm go" id="gshake">🥤 Claim today\'s free shake (+20 energy)</button>' : ''}` : `<div class="chal">🪪 Day pass (free) — workouts pay 85%. <button class="btn sm go" id="gjoin">Become a member — $60</button><small class="muted"> Members: +15% pay, daily free shake.</small></div>`;
    const gp = open('gymdash', { title: '🏋️ IRON TEMPLE — GYM DASHBOARD', cls: 'wide', pauseTime: true, html: memH + `<div class="stats4"><div><b>${st.workouts}</b>Workouts</div><div><b>${Object.keys(st.machines).length}/16</b>Machines used</div><div><b>${st.sRanks}</b>S ranks</div><div><b>Lv ${s.level}</b>${U.fmt(s.xp)}/${U.fmt(D.xpForLevel(s.level))} XP</div></div>
      <h3>💪 Physique</h3><div class="gains">${Object.entries(D.MUSCLES).map(([k, n]) => { const v = (s.app.mus || {})[k] ?? s.app.muscle ?? 0; const trains = Object.entries(D.TRAINS).filter(([, t]) => t[0].includes(k)).map(([m]) => D.MACHINES[m].n).slice(0, 3).join(', '); return `<div class="gain"><span>${n}</span><div class="bar"><i class="old" style="width:${v * 100}%"></i></div><b>${Math.round(v * 100)}%</b><small class="muted">${trains}</small></div>`; }).join('')}</div>
      <h3>Challenges</h3>${ch}${s.flags.trainerTask ? `<div class="chal">🏋️ Coach Priya: ${s.flags.trainerTask.grade}+ on ${D.MACHINES[s.flags.trainerTask.machine].n}<em>${U.money(s.flags.trainerTask.reward)}</em></div>` : '<p class="muted">Talk to Coach Priya for a personal training challenge.</p>'}
      <h3>Machine records</h3><table class="tbl"><tr><th>Machine</th><th>Sessions</th><th>Best score</th><th>Best grade</th><th>Unlocked</th><th>Recent</th></tr>${rows}</table>
      <p class="muted">Get a B or better to unlock the next difficulty (Heavy → Beast Mode). Heavier sets pay more. Your physique visibly develops as you train.</p>` });
    const j = gp.querySelector('#gjoin'); if (j) j.onclick = () => { if (!GR.Prog.spend(60)) return; s.flags.member = Math.floor(s.time / 24) + 1; GR.Prog.notify('Welcome to the Iron Temple family! Membership active.', '🪪', 'big'); GR.Save.save(s); close(); gymDashboard(); };
    const sh = gp.querySelector('#gshake'); if (sh) sh.onclick = () => { s.flags.shakeDay = Math.floor(s.time / 24); s.energy = Math.min(100, s.energy + 20); GR.Prog.event('eat', { id: 'shake' }); toast('🥤 Free member shake! +20 energy'); close(); gymDashboard(); };
  }
  function profile(tab = 'stats') {
    const s = GR.state; const p = open('profile', { title: '📊 ' + esc(s.name).toUpperCase() + ' — PROFILE', cls: 'wide', pauseTime: true, html: '' });
    const render = () => {
      const st = s.stats; let h = `<div class="tabs">${[['stats', '📊 Stats'], ['achievements', '🏆 Achievements'], ['friends', '💞 Friends'], ['comps', '🎤 Competitions']].map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>`;
      if (tab === 'stats') h += `<div class="stats4"><div><b>Lv ${s.level}</b>Level</div><div><b>${U.money(s.money)}</b>Money (${U.money(s.lifetimeMoney)} lifetime)</div><div><b>${U.kfmt(s.followers)}</b>Followers</div><div><b>${U.fmt(s.rep)}</b>Reputation</div></div>
        <table class="tbl">${[['Workouts', st.workouts], ['Machines used', Object.keys(st.machines).length], ['S ranks', st.sRanks], ['Competitions', st.comps + ' (' + st.wins + ' wins)'], ['Best placements', Object.entries(st.bestPlace).map(([k, v]) => D.COMP_TYPES[k].n + ': #' + v).join(', ') || '—'], ['Clothing owned', s.owned.clothes.length], ['Emotes unlocked', s.owned.emotes.length + '/' + D.EMOTES.length], ['Posts / Videos', st.posts + ' / ' + st.videos], ['Total likes', U.fmt(st.totalLikes)], ['Sponsorships done', st.sponsorsDone + ' (' + s.sponsors.active.length + ' active)'], ['Haircuts', st.haircuts], ['Skincare routines', st.skincare], ['Trophies', s.owned.trophies.length], ['Collectibles', Object.keys(s.owned.collectibles).length + '/' + D.COLLECTIBLES.length], ['Furniture placed', st.furnPlaced], ['Distance walked', (st.distance / 1000).toFixed(2) + ' km'], ['Baskets made', st.buckets], ['Locations discovered', st.visitedList.length + '/17'], ['Days in Mog City', Math.floor(s.time / 24) + 1], ['Time played', Math.floor(s.played / 60) + ' min']].map(([a, b]) => `<tr><td>${a}</td><td><b>${b}</b></td></tr>`).join('')}</table>`;
      if (tab === 'achievements') { const n = Object.keys(s.ach).length; h += `<p>${n}/${D.ACHIEVEMENTS.length} unlocked</p><div class="grid">${D.ACHIEVEMENTS.map(a => { const on = s.ach[a.id]; const v = GR.Prog.statVal(a.stat); return `<div class="card ${on ? 'eq' : 'lock'}"><div class="ico">${on ? a.icon : '🔒'}</div><b>${esc(a.n)}</b><small>${esc(a.d)}${on ? '' : ` (${U.fmt(Math.min(v, a.gte))}/${U.fmt(a.gte)})`}</small></div>`; }).join('')}</div>`; }
      if (tab === 'friends') h += `<div class="grid">${D.CAST.filter(c => !c.judge).map(c => { const f = s.friends[c.id]; return `<div class="card ${f ? '' : 'lock'}"><div class="ico">${f ? '❤️'.repeat(f.lvl) || '🤝' : '❔'}</div><b>${esc(c.name)}</b><small>${esc(c.title)}<br>${f ? 'Level ' + f.lvl + ' • ' + f.pts + ' pts' : 'Not met yet'} • Usually: ${esc(Object.values(c.sched).map(l => (D.LOCATIONS[l] || { n: l }).n).filter((v, i, a) => a.indexOf(v) === i).join(', '))}</small></div>`; }).join('')}</div>`;
      if (tab === 'comps') h += `<p>Season ${s.comp.season} • ${s.comp.points} season points</p><table class="tbl"><tr><th>Day</th><th>Event</th><th>Tier</th><th>Place</th><th>Score</th></tr>${s.comp.history.slice(0, 30).map(c => `<tr><td>${c.day}</td><td>${D.COMP_TYPES[c.type].n}</td><td>${D.TIERS[c.tier].n}</td><td>#${c.place}</td><td>${c.score}</td></tr>`).join('') || '<tr><td colspan=5>No competitions yet.</td></tr>'}</table>`;
      p.querySelector('.pb').innerHTML = h; p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    };
    render();
  }
  function leaderboard() { GR.Comp.leaderboardPanel(); }

  /* ---------------- MINIGAME CARDS ---------------- */
  function miniIntro(G, DIFF, r, start, cancel) {
    const p = open('miniintro', { title: '🏋️ ' + G.M.n.toUpperCase(), cls: 'small mini', noPush: true, onBack: () => { closeId('miniintro'); cancel(); }, html: `<p>${esc(G.M.desc)}</p><p class="keys">Controls: <span class="k">${G.M.key}</span></p>
      <p>Personal best: <b>${r.best ? U.fmt(r.best) : '—'}</b> ${r.bestGrade ? `(<b class="g${r.bestGrade}">${r.bestGrade}</b>)` : ''} • Sessions: ${r.sessions}</p>
      ${G.opts.comp ? `<p class="hl">COMPETITION ROUND — difficulty ${DIFF[G.diff].n}</p>` : `<div class="diffs">${DIFF.map((d, i) => `<button class="btn ${i === G.diff ? 'on' : ''}" data-d="${i}" ${i > r.unlocked ? 'disabled' : ''}>${d.n}${i > r.unlocked ? ' 🔒' : ''}<small>×${d.pay} pay</small></button>`).join('')}</div>`}
      <div class="row"><button class="btn go" id="mi_go">START (Space)</button><button class="btn" id="mi_x">Leave (Esc)</button></div>` });
    let d = G.diff; p.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { d = +b.dataset.d; p.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); });
    const go = () => { off(); closeId('miniintro'); start(d); };
    p.querySelector('#mi_go').onclick = go; p.querySelector('#mi_x').onclick = () => { off(); closeId('miniintro'); cancel(); };
    const off = GR.Input.onKey(code => { if (topId() !== 'miniintro') { return false; } if (code === 'Space' || code === 'Enter') { go(); return true; } if (code === 'Escape') { off(); closeId('miniintro'); cancel(); return true; } return false; });
  }
  function miniResults(res, rw, done) {
    const p = open('miniresult', { title: (res.grade === 'S' ? '🌟 ' : '') + 'WORKOUT COMPLETE', cls: 'small mini', noPush: true, html: `<div class="grade g${res.grade}">${res.grade}</div>
      <table class="tbl"><tr><td>Accuracy</td><td><b>${Math.round(res.acc * 100)}%</b></td></tr><tr><td>Reps / hits</td><td><b>${res.reps}</b></td></tr><tr><td>Max combo</td><td><b>x${res.combo}</b></td></tr><tr><td>Perfects</td><td><b>${res.perfect}</b></td></tr>${res.dist ? `<tr><td>Distance</td><td><b>${Math.round(res.dist)} m</b></td></tr>` : ''}<tr><td>Score</td><td><b>${U.fmt(res.score)}</b></td></tr></table>
      ${rw && rw.gains && rw.gains.length ? `<div class="gains"><h4>💪 Gains</h4>${rw.gains.map(g => `<div class="gain"><span>${g.n}</span><div class="bar"><i class="old" style="width:${g.before * 100}%"></i><i class="new" style="left:${g.before * 100}%;width:${(g.after - g.before) * 100}%"></i></div><b>${Math.round(g.after * 100)}%</b></div>`).join('')}</div>` : ''}
      ${rw ? `<p class="hl">+${U.money(rw.money)} • +${rw.xp} XP ${rw.pb ? '• 🏅 NEW PERSONAL BEST!' : ''}</p>${rw.unlockedNew ? `<p class="hl">🔓 Unlocked difficulty: ${esc(rw.nextDiff)}</p>` : ''}` : ''}
      <button class="btn go" id="mr_ok">Continue (Space)</button>` });
    const go = () => { off(); closeId('miniresult'); done(); };
    p.querySelector('#mr_ok').onclick = go;
    const off = GR.Input.onKey(code => { if (code === 'Space' || code === 'Enter' || code === 'Escape') { go(); return true; } return false; });
  }
  function miniClose() { closeId('miniintro'); closeId('miniresult'); }
  function quickShare(kind, res) {
    toast(`📸 Press ${GR.Input.keyName(GR.Input.binds.camera)} for photo mode to post your ${kind === 'workout' ? res.grade + '-rank workout' : 'moment'} (bonus followers for fresh achievements!)`);
    GR.state.flags.shareBonus = { kind, until: GR.state.time + 0.5, grade: res && res.grade };
  }
  function tutorial() { GR.Tutorial && GR.Tutorial.start(); }
  return { open, close, closeId, closeAll, back, body, setBody, topId, pauseTime, toast, banner, floatText, prompt, showHUD, updateHUD, frame, openMap, dialogue, choice, confirm, emoteWheel, playEmote, inventory, isEquipped, pause, settingsPanel, help, gymDashboard, profile, leaderboard, miniIntro, miniResults, miniClose, quickShare, tutorial, drawMinimap, get waypoint() { return waypoint; }, set waypoint(v) { waypoint = v; } };
})();
