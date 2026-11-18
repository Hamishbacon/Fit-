/* Smartphone + apps, Clout (social feed), Flicks (short videos w/ live 3D playback), Messages, BrandDeals (sponsors),
   photo/video camera mode, engagement simulation. */
'use strict';
GR.Social = (() => {
  const U = GR.U, D = GR.Data;
  const S = () => GR.state;
  function init() { const s = S(); s.social.gallery = s.social.gallery || []; }
  function trending() { const day = Math.floor(S().time / 24); const r = U.rng('tr' + day); return U.shuffle(D.TRENDS).sort(() => r() - 0.5).slice(0, 4); }
  function quality(post) {
    const s = S(); let q = 1;
    const drip = GR.Comp.dripScore(s.outfit).total; q *= 0.7 + drip / 120;
    const h = s.time % 24; q *= h > 17 && h < 23 ? 1.35 : h > 7 && h < 10 ? 1.1 : h < 6 ? 0.6 : 1;
    const tr = trending(); const hit = (post.tags || []).filter(t => tr.map(x => x.toLowerCase()).some(x => x.includes(t.replace('#', '').toLowerCase()))).length; q *= 1 + hit * 0.3;
    q *= 1 + Math.min(3, (post.tags || []).length) * 0.05;
    const locBoost = { plaza: 1.3, arena: 1.4, gym: 1.15, glowlab: 1.1, park: 1.2, court: 1.15, dripdepot: 1.25, apartment: 0.95 }[post.loc] || 1; q *= locBoost;
    if (post.type === 'video') q *= post.dance ? 1.6 : 1.3;
    if (post.emote) q *= 1 + ((D.emote(post.emote) || {}).aura || 0) * 0.06;
    const sb = s.flags.shareBonus; if (sb && sb.until > s.time) { q *= sb.grade === 'S' ? 1.8 : 1.4; s.flags.shareBonus = null; }
    if (post.friend) q *= 1.3;
    const recent = s.social.posts.filter(p => s.time - p.t < 2).length; q *= Math.max(0.4, 1 - recent * 0.2); // spam penalty
    return q;
  }
  function publish(post) {
    const s = S(); post.id = U.uid(); post.t = s.time; post.likes = 0; post.views = 0; post.comments = []; post.loc = post.loc || GR.World.current;
    post.brands = GR.Shops.brandsWorn(s.outfit);
    const reach = (8 + Math.pow(s.followers, 0.82) * 0.09) * quality(post);
    post.potential = Math.round(reach * U.rand(0.8, 1.25)); post.vpot = Math.round(post.potential * U.rand(4, 7));
    s.social.posts.unshift(post); if (s.social.posts.length > 40) s.social.posts.length = 40;
    s.social.posts.slice(25).forEach(p => p.img = null);
    GR.Prog.stat(post.type === 'video' ? 'videos' : 'posts');
    GR.Prog.event(post.type === 'video' ? 'video' : 'post', { loc: post.loc, brands: post.brands, dance: post.dance, zone: post.loc });
    GR.Prog.addXP(post.type === 'video' ? 30 : 20);
    GR.UI.toast(post.type === 'video' ? '🎬 Uploaded to Flicks!' : '📸 Posted to Clout!');
    GR.Save.save(s);
    return post;
  }
  // engagement grows over ~3 in-game hours (logistic), followers and NPC comments trickle in
  let acc = 0;
  function tick(dt) {
    const s = S(); if (!s) return; acc += dt; if (acc < 1) return; acc = 0;
    s.social.posts.slice(0, 12).forEach(p => {
      const age = s.time - p.t; const k = 1 / (1 + Math.exp(-(age - 1.2) * 3)); const target = Math.round(p.potential * k);
      if (target > p.likes) { const add = target - p.likes; p.likes = target; s.stats.totalLikes += add; GR.Prog.event('likes', { amount: add, noSave: true }); const fol = Math.round(add * U.rand(0.08, 0.16)); if (fol) GR.Prog.addFollowers(fol); if (add > 3 && Math.random() < 0.35) GR.Prog.notify(`${U.pick(D.HANDLES)} and ${U.kfmt(add)} others liked your ${p.type}`, '❤️', 'info', false); }
      p.views = Math.max(p.views, Math.round(p.vpot * k));
      if (p.comments.length < 8 && Math.random() < 0.08 * (1 - age / 6) && age < 6) { const pool = D.COMMENTS[p.dance ? 'dance' : p.kind === 'workout' ? 'gym' : p.kind === 'fit' ? 'fashion' : 'general'].concat(D.COMMENTS.general); const c = { h: U.pick(D.HANDLES), t: Math.random() < 0.06 ? U.pick(D.COMMENTS.hater) : U.pick(pool) }; p.comments.push(c); GR.Prog.notify(`@${c.h} commented: "${c.t}"`, '💬', 'info', Math.random() < 0.4); }
    });
  }
  function hourly() { }
  // generated NPC feed (deterministic per day)
  function feed() {
    const s = S(), day = Math.floor(s.time / 24), r = U.rng('feed' + day), tr = trending();
    const cast = D.CAST.filter(c => !c.worker || Math.random() < 0.3);
    const kinds = [['fit', '👕', 'Fit check at {loc} 💧'], ['gym', '💪', 'New PR on {mach}! {tag}'], ['dance', '💃', 'Learning the {dance} 😭 {tag}'], ['food', '🍔', 'Protein Palace never misses {tag}'], ['view', '🌅', 'Golden hour in Mog City {tag}'], ['meme', '🤡', 'POV: you skipped leg day {tag}']];
    const out = [];
    for (let i = 0; i < 14; i++) {
      const c = U.rpick(r, cast), k = U.rpick(r, kinds); const handle = c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
      const txt = k[2].replace('{loc}', U.rpick(r, ['the Plaza', 'Drip Street', 'Sigma Park', 'Iron Temple'])).replace('{mach}', U.rpick(r, Object.values(D.MACHINES)).n).replace('{dance}', U.rpick(r, D.EMOTES.filter(e => e.dance)).n).replace('{tag}', U.rpick(r, tr));
      out.push({ npc: c.id, name: c.name, handle, icon: k[1], kind: k[0], txt, likes: Math.round(50 + r() * 4000 * (c.pers === 'influencer' ? 6 : 1)), seed: i + day * 31, h: Math.floor(r() * 12) + 1 });
    }
    return out;
  }
  function thumb(seed, icon, txt) { // procedural thumbnail for NPC posts
    return GR.Tex.memo('thumb' + seed + icon, () => { const c = GR.Tex.canvas(240, 240), x = c.getContext('2d'), r = U.rng(seed); const g = x.createLinearGradient(0, 0, 240, 240); g.addColorStop(0, U.pick(['#ff4fa3', '#7b61ff', '#28e0ff', '#ffd23f', '#10b981', '#ef4444'])); g.addColorStop(1, U.pick(['#111', '#2b1d3b', '#1e3a5f', '#3f4a2c'])); x.fillStyle = g; x.fillRect(0, 0, 240, 240); for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`; x.beginPath(); x.arc(r() * 240, r() * 240, 20 + r() * 60, 0, 7); x.fill(); } x.font = '90px sans-serif'; x.textAlign = 'center'; x.fillText(icon, 120, 150); return c.toDataURL('image/jpeg', 0.7); });
  }
  return { init, publish, tick, hourly, feed, trending, thumb, quality };
})();

GR.Sponsors = (() => {
  const U = GR.U, D = GR.Data;
  const S = () => GR.state;
  function init() { checkOffers(true); }
  function checkOffers(quiet) {
    const s = S(); if (!s) return; const sp = s.sponsors;
    D.SPONSORS.forEach(o => {
      if (sp.offered.includes(o.id) || sp.done.includes(o.id) || sp.active.some(a => a.id === o.id) || sp.declined.includes(o.id)) return;
      if (s.followers >= o.req.followers && s.rep >= o.req.rep) {
        sp.offered.push(o.id);
        GR.Phone.message('sp_' + o.id, o.n, `Hey ${s.name}! 👋 ${o.pitch} We'd pay ${U.money(o.pay)} + ${o.followers} followers in promo${o.reward.item ? ' + an exclusive item' : ''}. Check BrandDeals to accept.`, { sponsor: o.id });
        if (!quiet) GR.Prog.notify('New sponsor offer from ' + o.n + '!', '🤝', 'big');
      }
    });
  }
  function accept(id) { const s = S(), o = D.SPONSORS.find(x => x.id === id); s.sponsors.offered = s.sponsors.offered.filter(x => x !== id); s.sponsors.active.push({ id, started: s.time, tasks: o.tasks.map(t => Object.assign({ prog: 0 }, t)) }); GR.Prog.notify('Sponsorship accepted: ' + o.n + '. Objectives added to your tracker.', '🤝', 'info'); GR.Phone.message('sp_' + id, o.n, 'Contract signed! ✍️ Here\'s the brief: ' + o.tasks.map(t => t.txt).join(' • ')); GR.Save.save(s); }
  function decline(id) { const s = S(); s.sponsors.offered = s.sponsors.offered.filter(x => x !== id); s.sponsors.declined.push(id); setTimeout(() => { s.sponsors.declined = s.sponsors.declined.filter(x => x !== id); }, 1000 * 60 * 6); GR.Save.save(s); }
  function wearing(brand, n = 1) { const b = GR.Shops.brandsWorn(S().outfit); return (b[brand] || 0) >= n; }
  function onEvent(evt, data) {
    const s = S(); if (!s) return;
    s.sponsors.active.forEach(a => {
      const o = D.SPONSORS.find(x => x.id === a.id);
      a.tasks.forEach(t => {
        if (t.prog >= t.n || t.evt !== evt) return;
        if (t.wear && !wearing(t.wear)) { if (evt === 'post' || evt === 'video') GR.UI.toast(`🤝 ${o.n}: that post didn't count — wear their gear!`, 'warn'); return; }
        if (t.where && (data.loc || data.zone) !== t.where) return;
        if (t.filter) { const f = t.filter; if (f === 'cardio' && !['treadmill', 'bike', 'rower'].includes(data.machine)) return; if (f === 'gym' && data.zone !== 'gym') return; if ((f === 'A' || f === 'S') && !('SAB'.slice(0, 'SAB'.indexOf(f) + 1)).includes(data.grade)) return; if (f === 'drink' && data.type !== 'drink') return; if (f === 'dance' && !data.dance) return; if (f === 'fashion' && data.type !== 'fashion') return; }
        t.prog = Math.min(t.n, t.prog + (data.amount || 1));
        if (t.prog >= t.n) GR.Prog.notify(`${o.n} objective done: ${t.txt}`, '✅', 'info');
      });
      if (a.tasks.every(t => t.prog >= t.n)) complete(a, o);
    });
  }
  function complete(a, o) {
    const s = S(); s.sponsors.active = s.sponsors.active.filter(x => x !== a); s.sponsors.done.push(o.id);
    GR.Prog.addMoney(o.pay); GR.Prog.addFollowers(o.followers); GR.Prog.addRep(20); GR.Prog.stat('sponsorsDone');
    let extra = '';
    if (o.reward.item) { const it = D.ITEMS.find(i => i.exclusive && i.id.startsWith(o.reward.item) && (i.source || '').toUpperCase().includes(o.n)) || D.ITEMS.find(i => i.exclusive && i.id.startsWith(o.reward.item)); if (it) { GR.Shops.grant(it, 0, true); extra = ' + ' + it.name; } }
    if (o.reward.tokens) { s.tokens += o.reward.tokens; extra = ' + ✨' + o.reward.tokens + ' glow tokens'; }
    if (o.reward.money) { GR.Prog.addMoney(o.reward.money); extra = ' + bonus ' + U.money(o.reward.money); }
    if (o.reward.emote && !s.owned.emotes.includes(o.reward.emote)) { s.owned.emotes.push(o.reward.emote); extra = ' + emote ' + D.emote(o.reward.emote).n; }
    GR.Prog.notify(`Sponsorship complete: ${o.n}! +${U.money(o.pay)}${extra}`, '🤝', 'big'); GR.UI.banner('SPONSOR DEAL COMPLETE', o.n + ' • ' + U.money(o.pay) + extra);
    GR.Phone.message('sp_' + o.id, o.n, 'Campaign smashed it 📈 Payment sent. Let\'s work again soon!'); GR.Audio.sfx('achievement'); GR.Prog.event('sponsor_task', {}); GR.Save.save(s);
  }
  return { init, checkOffers, accept, decline, onEvent, wearing };
})();

/* ---------------- CAMERA: photo & video mode ---------------- */
GR.Camera = (() => {
  const U = GR.U, D = GR.Data;
  let on = false, rec = null, orbit = null, filter = 'none', unKey = null, opts = {};
  const FILTERS = { none: '', warm: 'sepia(0.25) saturate(1.3) brightness(1.05)', cool: 'hue-rotate(-12deg) saturate(1.1) brightness(1.05)', bw: 'grayscale(1) contrast(1.15)', vintage: 'sepia(0.55) contrast(0.9) brightness(1.1)', vhs: 'saturate(1.6) contrast(1.2) hue-rotate(8deg)', neon: 'saturate(2) contrast(1.15) hue-rotate(-25deg)' };
  const ANGLES = { orbit: 'Orbit', front: 'Front', low: 'Low hero', close: 'Close-up', top: 'Top-down', side: 'Side' };
  function photoMode(o = {}) {
    if (on) return; const G = GR.Game; opts = o; on = true; filter = 'none';
    G.pushUI(); G.lockPlayer(true); document.getElementById('hud').classList.add('photo');
    const p = G.player.root.position; orbit = { target: new THREE.Vector3(p.x, p.y + 1.0, p.z), yaw: G.P.facing, dist: o.video ? 3.6 : 2.8, h: 0.4, lookH: 0.2 };
    G.camTo({ orbit, dur: 0.5 });
    if (o.friend) { const n = o.friend.char.root; n.position.set(p.x + Math.cos(G.P.facing) * 0.7, n.position.y, p.z - Math.sin(G.P.facing) * 0.7); n.rotation.y = G.P.facing; o.friend.char.anim.play('peace'); }
    ui();
    unKey = GR.Input.onKey(code => { if (!on) return false; if (code === 'Escape') { close(); return true; } if (code === 'Space' || code === 'Enter') { if (opts.video) toggleRec(); else shoot(); return true; } if (code === 'KeyA') { orbit.yaw -= 0.15; return true; } if (code === 'KeyD') { orbit.yaw += 0.15; return true; } if (code === 'KeyW') { orbit.dist = Math.max(1.0, orbit.dist - 0.2); return true; } if (code === 'KeyS') { orbit.dist = Math.min(7, orbit.dist + 0.2); return true; } if (code === 'KeyQ') { orbit.h += 0.15; return true; } if (code === 'KeyE') { orbit.h -= 0.15; return true; } const m = code.match(/Digit(\d)/); if (m) { const em = quickEmotes()[+m[1] - 1]; if (em) GR.UI.playEmote(em.id); return true; } return false; });
  }
  function quickEmotes() { return D.EMOTES.filter(e => GR.state.owned.emotes.includes(e.id) && !e.walk && !e.group && ['pose', 'dance', 'gym', 'celebrate', 'react'].includes(e.cat)).slice(0, 9); }
  function ui() {
    const box = document.getElementById('photoui'); box.hidden = false;
    box.innerHTML = `<div class="pt">${opts.video ? '🎬 FLICKS — VIDEO MODE' : '📸 PHOTO MODE'}${rec ? ` <span class="rec">● REC ${Math.max(0, Math.ceil(rec.left))}s</span>` : ''}</div>
      <div class="pc"><span class="k">A</span><span class="k">D</span> orbit <span class="k">W</span><span class="k">S</span> zoom <span class="k">Q</span><span class="k">E</span> height • drag to rotate • <span class="k">1-9</span> pose/emote • <span class="k">Space</span> ${opts.video ? 'record' : 'shutter'} • <span class="k">Esc</span> exit</div>
      <div class="pe">${quickEmotes().map((e, i) => `<button data-e="${e.id}"><span class="k">${i + 1}</span>${U.esc(e.n)}</button>`).join('')}</div>
      <div class="pf">${Object.keys(FILTERS).map(f => `<button class="${f === filter ? 'on' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
      ${opts.video ? `<div class="pf">${Object.entries(ANGLES).map(([k, n]) => `<button class="${(opts.angle || 'orbit') === k ? 'on' : ''}" data-a="${k}">${n}</button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn go" id="shut">${opts.video ? (rec ? '⏹ Stop' : '⏺ Record (6s)') : '📸 Take photo'}</button><button class="btn" id="pvid">${opts.video ? '📸 Photo mode' : '🎬 Video mode'}</button><button class="btn" id="pclose">Exit</button></div>`;
    document.getElementById('game').style.filter = FILTERS[filter];
    box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => GR.UI.playEmote(b.dataset.e));
    box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; ui(); });
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { opts.angle = b.dataset.a; applyAngle(); ui(); });
    box.querySelector('#shut').onclick = () => opts.video ? toggleRec() : shoot();
    box.querySelector('#pvid').onclick = () => { if (rec) return; opts.video = !opts.video; ui(); };
    box.querySelector('#pclose').onclick = close;
  }
  function applyAngle() { const a = opts.angle || 'orbit'; const set = { orbit: [3.6, 0.4], front: [2.6, 0.5], low: [2.4, -0.55], close: [1.2, 0.55], top: [2.2, 3.2], side: [3.0, 0.3] }[a]; orbit.dist = set[0]; orbit.h = set[1]; if (a === 'side') orbit.yaw = GR.Game.P.facing + Math.PI / 2; if (a === 'front' || a === 'close' || a === 'low') orbit.yaw = GR.Game.P.facing; }
  function grab(size = 300) { const c = GR.Game.capture(GR.Game.camera, size, size); if (filter !== 'none') { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.filter = FILTERS[filter]; x.drawImage(c, 0, 0); return o.toDataURL('image/jpeg', 0.72); } return c.toDataURL('image/jpeg', 0.72); }
  function nearMirror() { const z = GR.World.Z, p = GR.Game.player.root.position; return z.mirrors.some(m => { const wp = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld); return wp.distanceTo(p) < 3.2; }); }
  function shoot() {
    GR.Audio.sfx('shutter'); const fl = document.getElementById('flash'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 120);
    const img = grab(300); const s = GR.state; s.social.gallery.unshift({ img, t: s.time, loc: GR.World.current, emote: GR.Game.player.anim.actionName, friend: opts.friend ? opts.friend.name : null }); if (s.social.gallery.length > 12) s.social.gallery.length = 12;
    if (nearMirror()) GR.Prog.stat('mirrorSelfies');
    GR.Prog.event('photo', {});
    composer('photo', s.social.gallery[0]);
  }
  function toggleRec() {
    if (rec) { stopRec(); return; }
    applyAngle(); const s = GR.state;
    rec = { left: 6, emotes: [], thumb: grab(200), loc: GR.World.current, angle: opts.angle || 'orbit', fx: filter, startEmote: GR.Game.player.anim.actionName, workout: GR.Mini.active };
    if (rec.startEmote) rec.emotes.push({ id: rec.startEmote, t: 0 });
    ui(); toastRec();
  }
  function toastRec() { GR.UI.toast('⏺ Recording! Perform emotes (1-9) — dances get the most views.'); }
  function recordEmote(id) { if (rec) rec.emotes.push({ id, t: 6 - rec.left }); }
  function stopRec() { const r = rec; rec = null; ui(); if (!r) return; const dance = r.emotes.some(e => (D.emote(e.id) || {}).dance); if (!r.emotes.length) { GR.UI.toast('🎬 Nothing happened in that clip — try emoting while recording!'); return; } composer('video', { img: r.thumb, clip: { emotes: r.emotes, angle: r.angle, fx: r.fx, loc: r.loc }, dance, emote: r.emotes[0].id }); }
  function update(dt) { if (rec) { rec.left -= dt; const el = document.querySelector('#photoui .rec'); if (el) el.textContent = '● REC ' + Math.max(0, Math.ceil(rec.left)) + 's'; if (rec.left <= 0) stopRec(); } if (on && orbit) { const o = GR.Game.cam.override; if (o) o.orbit = orbit; } }
  function composer(type, media) {
    const s = GR.state, tr = GR.Social.trending(); let tags = [];
    const p = GR.UI.open('compose', { title: type === 'video' ? '🎬 UPLOAD TO FLICKS' : '📸 POST TO CLOUT', cls: 'small', html: `<img class="shot" src="${media.img}"><textarea id="cap" maxlength="120" placeholder="Write a caption…">${U.esc(U.pick(['Locked in 🔒', 'Main character energy ✨', 'Fit check 💧', 'Gym rat behaviour 🐀', 'Mog City nights 🌃', 'Not chopped. Never chopped.', 'Aura +1000']))}</textarea>
      <div class="chips">${[...new Set([...tr.map(t => t.toLowerCase().replace(/challenge|friday|season/g, '')), ...D.HASHTAGS])].slice(0, 16).map(t => `<button class="chip" data-tag="${U.esc(t)}">${U.esc(t)}</button>`).join('')}</div>
      <p class="muted">Trending now: ${tr.map(U.esc).join(' ')} • Wearing: ${Object.keys(GR.Shops.brandsWorn(s.outfit)).map(b => (D.BRANDS[b] || { n: b }).n).join(', ') || 'no brands'}</p>
      <div class="row"><button class="btn go" id="pub">${type === 'video' ? 'Upload' : 'Post'}</button><button class="btn" id="keep">${type === 'video' ? 'Discard' : 'Save to gallery only'}</button></div>` });
    p.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { const t = b.dataset.tag; if (tags.includes(t)) tags = tags.filter(x => x !== t); else if (tags.length < 5) tags.push(t); b.classList.toggle('on', tags.includes(t)); });
    p.querySelector('#pub').onclick = () => { const cap = p.querySelector('#cap').value; GR.UI.closeId('compose'); GR.Social.publish({ type, img: media.img, caption: cap, tags, kind: media.emote && (D.emote(media.emote) || {}).cat === 'gym' ? 'workout' : 'fit', emote: media.emote, dance: media.dance, clip: media.clip, friend: !!media.friend, loc: media.loc || GR.World.current }); };
    p.querySelector('#keep').onclick = () => GR.UI.closeId('compose');
  }
  function close() { if (!on) return; if (rec) stopRec(); on = false; const G = GR.Game; G.popUI(); G.lockPlayer(false); G.camRelease(); document.getElementById('hud').classList.remove('photo'); document.getElementById('photoui').hidden = true; document.getElementById('game').style.filter = ''; if (unKey) unKey(); unKey = null; G.player.anim.stop(); }
  return { photoMode, recordEmote, update, close, compose: composer, get recording() { return !!rec; }, get on() { return on; } };
})();

/* ---------------- PHONE ---------------- */
GR.Phone = (() => {
  const U = GR.U, D = GR.Data, esc = U.esc;
  let isOpen = false, app = 'home', sub = null, el = null, player3d = null;
  const S = () => GR.state;
  const APPS = [['clout', '📸', 'Clout', '#ff4fa3'], ['flicks', '🎬', 'Flicks', '#111'], ['msgs', '💬', 'Messages', '#34c759'], ['deals', '🤝', 'BrandDeals', '#f2c94c'], ['chal', '📅', 'Challenges', '#1b4dff'], ['mogoff', '🎤', 'Mog-Off', '#7b61ff'], ['emoteshop', '🕺', 'Emote Shop', '#f97316'], ['map', '🗺️', 'Map', '#10b981'], ['camera', '📷', 'Camera', '#4b5563'], ['stats', '📊', 'Stats', '#0ea5e9'], ['notif', '🔔', 'Alerts', '#ef4444'], ['settings', '⚙️', 'Settings', '#6b7280']];
  function toggle() { if (isOpen) close(); else openPhone(); }
  function openPhone(a = 'home') { el = document.getElementById('phone'); isOpen = true; app = a; sub = null; el.hidden = false; requestAnimationFrame(() => el.classList.add('up')); GR.Game.pushUI(); GR.Audio.sfx('open'); render(); GR.Bus.emit('phone'); offKey = GR.Input.onKey(code => { if (!isOpen) return false; if (code === 'Escape' || code === GR.Input.binds.phone) { if (app !== 'home' && code === 'Escape') { if (sub) { sub = null; render(); } else { app = 'home'; render(); } } else close(); return true; } return false; }); }
  let offKey = null;
  function close() { if (!isOpen) return; isOpen = false; el.classList.remove('up'); setTimeout(() => { if (!isOpen) el.hidden = true; }, 250); GR.Game.popUI(); GR.Audio.sfx('close'); if (offKey) offKey(); offKey = null; stopVideo(); }
  function badge(a) { const s = S(); if (a === 'msgs') return Object.values(s.msgs.unread).reduce((x, y) => x + y, 0); if (a === 'notif') return s.social.notif.filter(n => !n.read).length; if (a === 'deals') return s.sponsors.offered.length; if (a === 'chal') return s.challenges.daily.filter(c => c.done && !c.seen).length; return 0; }
  function render() {
    const s = S(); stopVideo();
    const head = `<div class="sb"><span>${U.timeStr(s.time)}</span><span>MOGFONE 5S</span><span>📶 🔋${Math.round(s.energy)}%</span></div>`;
    let body = '';
    const top = (t) => `<div class="ah"><button class="pback">‹</button><b>${t}</b><span></span></div>`;
    switch (app) {
      case 'home': body = `<div class="pro"><b>${esc(s.name)}</b><small>Lv ${s.level} • ${U.money(s.money)} • ${U.kfmt(s.followers)} followers • ${U.kfmt(s.rep)} rep</small></div><div class="apps">${APPS.map(([k, i, n, c]) => { const b = badge(k); return `<button class="app" data-app="${k}"><span class="ai" style="background:${c}">${i}${b ? `<em>${b > 99 ? '99+' : b}</em>` : ''}</span><small>${n}</small></button>`; }).join('')}</div><div class="hint2">F / Esc to put the phone away. Your character keeps walking with the phone out.</div>`; break;
      case 'clout': body = top('📸 Clout') + clout(); break;
      case 'flicks': body = top('🎬 Flicks') + flicks(); break;
      case 'msgs': body = top(sub ? esc(threadName(sub)) : '💬 Messages') + msgs(); break;
      case 'deals': body = top('🤝 BrandDeals') + deals(); break;
      case 'chal': body = top('📅 Challenges') + chal(); break;
      case 'mogoff': body = top('🎤 Mog-Off') + GR.Comp.phoneApp(); break;
      case 'emoteshop': body = top('🕺 Emote Shop') + emoteShop(); break;
      case 'notif': body = top('🔔 Alerts') + `<div class="list">${s.social.notif.slice(0, 40).map(n => `<div class="li ${n.read ? '' : 'new'}">${n.icon} ${esc(n.txt)}<small>${U.timeStr(n.t)} day ${Math.floor(n.t / 24) + 1}</small></div>`).join('') || '<p class="muted">No alerts.</p>'}</div>`; s.social.notif.forEach(n => n.read = true); break;
    }
    if (app === 'map') { close(); GR.UI.openMap(); return; }
    if (app === 'camera') { close(); GR.Camera.photoMode(); return; }
    if (app === 'stats') { close(); GR.UI.profile(); return; }
    if (app === 'settings') { close(); GR.UI.settingsPanel(); return; }
    el.querySelector('.screen').innerHTML = head + `<div class="abody">${body}</div>`;
    const q = sel => el.querySelectorAll(sel);
    q('[data-app]').forEach(b => b.onclick = () => { app = b.dataset.app; sub = null; GR.Audio.sfx('click'); render(); });
    q('.pback').forEach(b => b.onclick = () => { if (app === 'clout' && cloutTab === 'prof') { cloutTab = 'feed'; sub = null; } else if (sub) sub = null; else app = 'home'; render(); });
    wire(q);
  }
  /* ---- Clout ---- */
  let cloutTab = 'feed';
  function clout() {
    const s = S(); let h = `<div class="ptabs">${[['feed', 'Feed'], ['me', 'My Profile'], ['post', '+ Post']].map(([k, t]) => `<button class="${cloutTab === k ? 'on' : ''}" data-ct="${k}">${t}</button>`).join('')}</div>`;
    if (cloutTab === 'feed') { h += `<div class="trend">🔥 ${GR.Social.trending().map(esc).join(' ')}</div>`; const mine = s.social.posts.filter(p => p.type === 'photo').slice(0, 2).map(p => ({ me: true, p })); const npc = GR.Social.feed(); const all = [...mine, ...npc.map(n => ({ n }))]; h += all.map(o => o.me ? postCard(o.p, true) : `<div class="post"><div class="ph2"><button class="lk" data-prof="${o.n.npc}"><b>@${esc(o.n.handle)}</b></button> <small>${o.n.h}h</small></div><img src="${GR.Social.thumb(o.n.seed, o.n.icon)}"><div class="pa"><button class="lk" data-like="${o.n.seed}">${s.flags['lk' + o.n.seed] ? '❤️' : '🤍'} ${U.kfmt(o.n.likes + (s.flags['lk' + o.n.seed] ? 1 : 0))}</button></div><p>${esc(o.n.txt)}</p></div>`).join(''); }
    if (cloutTab === 'prof' && sub) { const c = D.CAST.find(x => x.id === sub), f = s.friends[c.id], fol = Math.round((U.hash(c.id) % 900 + 100) * (c.pers === 'influencer' ? 1300 : c.judge ? 300 : 12)); const posts = GR.Social.feed().filter(p => p.npc === c.id); const following = !!s.flags['fol_' + c.id];
      h += `<div class="me"><div class="av">${esc(c.name[0])}</div><div><b>${esc(c.name)}</b><small>@${esc(c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12))} • ${U.kfmt(fol)} followers</small><small>${esc(c.title)} • ${esc(c.role)}</small><small>Vibe: ${esc(c.pers)} • Likes: ${c.likes.map(esc).join(', ')}</small><small>${f ? 'Friendship ' + '❤️'.repeat(f.lvl) + ' (' + f.pts + ' pts)' : 'You haven\'t met yet'} • Hangs at: ${esc(Object.values(c.sched).map(l => (D.LOCATIONS[l] || { n: l }).n).filter((v, i, a) => a.indexOf(v) === i).join(', '))}</small><button class="btn sm ${following ? '' : 'go'}" data-follow="${c.id}">${following ? 'Following ✓' : '+ Follow'}</button></div></div>` + (posts.map(p => `<div class="post"><img src="${GR.Social.thumb(p.seed, p.icon)}"><p>${esc(p.txt)}</p><div class="pa">❤️ ${U.kfmt(p.likes)}</div></div>`).join('') || '<p class="muted">No posts today.</p>');
    }
    if (cloutTab === 'me') { const posts = s.social.posts.filter(p => p.type === 'photo'); h += `<div class="me"><div class="av">${esc(s.name[0] || '?')}</div><div><b>@${esc(s.name.toLowerCase().replace(/\s/g, ''))}</b><small>${U.kfmt(s.followers)} followers • ${posts.length} posts • ${U.kfmt(s.stats.totalLikes)} likes</small><small>Bio: ${esc(s.flags.bio || 'Gym rat. Drip enthusiast. Main character in training.')}</small><button class="btn sm" id="bio">Edit bio</button></div></div>${posts.map(p => postCard(p)).join('') || '<p class="muted">No posts yet. Use the camera (C) to take a photo!</p>'}`; }
    if (cloutTab === 'post') { const gal = s.social.gallery || []; h += `<p>Pick a photo from your gallery, or take a new one.</p><button class="btn go" id="newpic">📷 Open camera</button><div class="gal">${gal.map((g, i) => `<button data-gal="${i}"><img src="${g.img}"></button>`).join('')}</div>`; }
    return h;
  }
  function postCard(p, mine) { return `<div class="post ${mine ? 'mine' : ''}"><div class="ph2"><b>@${esc(S().name.toLowerCase().replace(/\s/g, ''))}</b> <small>${(D.LOCATIONS[p.loc] || { n: 'Mog City' }).n} • ${Math.max(0, Math.floor(S().time - p.t))}h</small></div>${p.img ? `<img src="${p.img}">` : '<div class="noimg">📸</div>'}<div class="pa">❤️ ${U.kfmt(p.likes)} ${p.type === 'video' ? '• 👁 ' + U.kfmt(p.views) : ''} • 💬 ${p.comments.length}</div><p>${esc(p.caption || '')} <span class="tags">${(p.tags || []).map(esc).join(' ')}</span></p>${p.comments.slice(-3).map(c => `<div class="cm"><b>@${esc(c.h)}</b> ${esc(c.t)}</div>`).join('')}</div>`; }
  /* ---- Flicks ---- */
  let flickTab = 'fyp', fypIdx = 0;
  function flicks() {
    const s = S(); let h = `<div class="ptabs">${[['fyp', 'For You'], ['mine', 'My Videos'], ['rec', '⏺ Record']].map(([k, t]) => `<button class="${flickTab === k ? 'on' : ''}" data-ft="${k}">${t}</button>`).join('')}</div>`;
    if (flickTab === 'fyp') { const vids = fyp(); const v = vids[fypIdx % vids.length]; h += `<div class="vid"><canvas id="vcan" width="260" height="380"></canvas><div class="vo"><b>@${esc(v.handle)}</b><p>${esc(v.txt)}</p><small>👁 ${U.kfmt(v.views)} • ❤️ ${U.kfmt(v.likes)}</small></div></div><div class="row"><button class="btn sm" id="vprev">▲ Prev</button><button class="btn sm" id="vlike">❤️ Like</button><button class="btn sm" id="vnext">▼ Next</button></div>`; }
    if (flickTab === 'mine') { const vids = s.social.posts.filter(p => p.type === 'video'); h += vids.map((p, i) => `<div class="post"><div class="ph2"><b>My Flick</b><small>${(D.LOCATIONS[p.loc] || { n: '' }).n}</small></div><button class="vthumb" data-play="${i}"><img src="${p.img}"><span>▶</span></button><div class="pa">👁 ${U.kfmt(p.views)} • ❤️ ${U.kfmt(p.likes)} • 💬 ${p.comments.length}</div><p>${esc(p.caption || '')}</p></div>`).join('') || '<p class="muted">No videos yet. Record a dance!</p>'; if (sub != null) h = `<div class="vid"><canvas id="vcan" width="260" height="380"></canvas></div><button class="btn sm" id="vback">Back</button>`; }
    if (flickTab === 'rec') h += `<p>Record a 6-second clip of your character. Pick a camera angle and effect, then perform dances or emotes. Dance videos trend hardest.</p><button class="btn go" id="recgo">⏺ Open video camera</button>`;
    return h;
  }
  function fyp() { const day = Math.floor(S().time / 24), r = U.rng('fyp' + day); const dances = D.EMOTES.filter(e => e.dance || ['flex', 'sidechest', 'mewing', 'stare'].includes(e.id)); return D.CAST.filter(c => !c.judge).map(c => { const e = U.rpick(r, dances); return { cast: c, emote: e.id, handle: c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12), txt: `${e.dance ? 'Trying the ' + e.n : e.n + ' check'} ${U.rpick(r, D.TRENDS)}`, views: Math.round(200 + r() * 90000), likes: Math.round(30 + r() * 9000), fx: U.rpick(r, ['none', 'neon', 'vhs', 'warm']) }; }).sort(() => r() - 0.5); }
  function playVideo(canvas, app2, outfit, clip) {
    stopVideo(); const v = GR.Apt.pvInit(); const ch = new GR.Char.Character(app2, outfit, { lod: 1 }); v.sc.add(ch.root);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(U.pick(['#2b1d3b', '#1e3a5f', '#3f1d2b', '#123d34'])) })); bg.position.z = -2; v.sc.add(bg);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshStandardMaterial({ color: 0x333344 })); floor.rotation.x = -Math.PI / 2; v.sc.add(floor);
    const ctx = canvas.getContext('2d'); let t = 0, ei = 0, last = performance.now();
    const angle = clip.angle || 'front';
    player3d = { ch, bg, floor, run: true };
    const fxf = { none: '', neon: 'saturate(2) hue-rotate(-25deg)', vhs: 'saturate(1.6) contrast(1.2)', warm: 'sepia(0.3) saturate(1.3)', bw: 'grayscale(1)', cool: 'hue-rotate(-12deg)', vintage: 'sepia(0.55)' }[clip.fx || 'none'] || '';
    const loop = () => { if (!player3d || !player3d.run) return; const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const em = clip.emotes[ei]; if (em && t >= em.t) { ch.anim.play(em.id, { restart: true }); ei++; }
      if (t > 6.5) { t = 0; ei = 0; ch.anim.stop(0.1); }
      ch.update(dt, { speed: 0, near: true });
      const set = { orbit: [3.2, 1.3, t * 0.4], front: [2.6, 1.3, 0], low: [2.3, 0.4, 0], close: [1.3, 1.6, 0], top: [2.0, 3.6, 0.3], side: [2.8, 1.2, Math.PI / 2] }[angle] || [2.6, 1.3, 0];
      v.cam.position.set(Math.sin(set[2]) * set[0], set[1], Math.cos(set[2]) * set[0]); v.cam.lookAt(0, angle === 'close' ? 1.55 : 1.0, 0);
      v.r.setSize(canvas.width, canvas.height); v.cam.aspect = canvas.width / canvas.height; v.cam.updateProjectionMatrix(); v.r.setClearColor(0x000000, 1); v.r.render(v.sc, v.cam);
      ctx.filter = fxf; ctx.drawImage(v.r.domElement, 0, 0); ctx.filter = 'none';
      if (clip.fx === 'vhs') { ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 1); }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('FLICKS', 10, 18);
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  function stopVideo() { if (player3d) { player3d.run = false; const v = GR.Apt.pvInit(); v.sc.remove(player3d.ch.root); v.sc.remove(player3d.bg); v.sc.remove(player3d.floor); player3d.ch.disposeAll(); player3d = null; } }
  /* ---- Messages ---- */
  function threadName(id) { const t = S().msgs.threads[id]; return t ? t.name : id; }
  function msgs() {
    const s = S(); ensureGroups();
    if (!sub) { const ths = Object.entries(s.msgs.threads).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)); return `<div class="list">${ths.map(([id, t]) => { const un = s.msgs.unread[id] || 0; const lm = t.msgs[t.msgs.length - 1]; return `<button class="li ${un ? 'new' : ''}" data-th="${id}"><b>${esc(t.name)}</b>${un ? `<em>${un}</em>` : ''}<small>${lm ? esc((lm.from === 'me' ? 'You: ' : '') + lm.txt).slice(0, 60) : ''}</small></button>`; }).join('')}</div>`; }
    const t = s.msgs.threads[sub]; s.msgs.unread[sub] = 0;
    const replies = t.sponsor ? (s.sponsors.offered.includes(t.sponsor) ? ['✅ Accept the deal', '❌ Decline'] : ['👍 On it!']) : t.group ? ['😂', 'W', 'who\'s at the plaza tonight?', 'gym later?'] : ['haha', 'W', 'see you at the gym', 'you free later?', 'love the fit 🔥'];
    return `<div class="chat">${t.msgs.slice(-30).map(m => `<div class="msg ${m.from === 'me' ? 'me' : ''}">${m.from !== 'me' && t.group ? `<b>${esc(m.from)}</b>` : ''}${esc(m.txt)}</div>`).join('')}</div><div class="replies">${replies.map((r, i) => `<button class="chip" data-rep="${i}">${esc(r)}</button>`).join('')}</div>`;
  }
  function ensureGroups() {
    const s = S(); const T = s.msgs.threads;
    if (!T.g_gym) T.g_gym = { name: '🐀 Gym Rats (Marcus, Dmitri, Coach Priya)', group: true, members: ['marcus', 'dmitri', 'priya_t'], msgs: [{ from: 'Marcus', txt: 'WELCOME TO THE GROUP CHAT ' + s.name.toUpperCase() + '!!! 💪', t: s.time }, { from: 'Dmitri', txt: 'Hello friend. We lift.', t: s.time }], last: s.time };
    if (!T.g_drip) T.g_drip = { name: '💧 Drip Council (Kenji, Lola, Sophie)', group: true, members: ['kenji', 'lola', 'sophie'], msgs: [{ from: 'Kenji', txt: 'Rule 1: no cargo shorts. Rule 2: see rule 1.', t: s.time }, { from: 'Lola', txt: 'omg hiii 💖', t: s.time }], last: s.time };
  }
  function message(id, name, txt, extra = {}) {
    const s = S(); if (!s) return; ensureGroups(); const T = s.msgs.threads;
    if (!T[id]) T[id] = Object.assign({ name, msgs: [] }, extra);
    T[id].msgs.push({ from: name, txt, t: s.time }); T[id].last = s.time; if (T[id].msgs.length > 60) T[id].msgs.splice(0, 20);
    s.msgs.unread[id] = (s.msgs.unread[id] || 0) + 1;
    GR.Audio.sfx('notif'); if (!isOpen || app !== 'msgs') GR.UI.toast('💬 ' + name + ': ' + txt.slice(0, 70));
    GR.Bus.emit('message', { id });
  }
  // random chatter + invites (called from game hourly via Social)
  GR.Bus.on('game:start', () => { setInterval(() => { const s = S(); if (!s || GR.Game.mode !== 'play') return; const h = s.time % 24; if (Math.random() < 0.35) { ensureGroups(); const g = Math.random() < 0.5 ? 'g_gym' : 'g_drip'; const lines = g === 'g_gym' ? ['who\'s training today?', 'leg day = best day (don\'t @ me)', 'new PR on bench 😤', 'protein palace after?', 'Chad is hogging the squat rack again 🙄', 'rest day = growth day remember'] : ['the new Drip Depot drop is INSANE', 'fit check at the plaza tonight?', 'who wore cargo shorts. confess.', 'Glow Lab has a new mask 💆', 'Runway Riot at the arena this week!']; const from = g === 'g_gym' ? U.pick(['Marcus', 'Dmitri', 'Coach Priya']) : U.pick(['Kenji', 'Lola', 'Sophie']); message(g, from, U.pick(lines)); }
      if (h > 17 && h < 21 && Math.random() < 0.2) { const friends = Object.entries(s.friends).filter(([, f]) => f.lvl >= 3); if (friends.length) { const [fid] = U.pick(friends); const c = D.CAST.find(x => x.id === fid); if (c) { message(fid, c.name, U.pick(['party at the Plaza after 9! group dance? 🕺', 'Mog-Off tonight at the arena, you entering?', 'hoops at the Blacktop later?'])); } } }
    }, 75000); });
  /* ---- Deals / Challenges / Emote shop ---- */
  function deals() {
    const s = S(); let h = '';
    if (s.sponsors.offered.length) h += '<h4>New offers</h4>' + s.sponsors.offered.map(id => { const o = D.SPONSORS.find(x => x.id === id); return `<div class="deal"><b style="color:${o.brand ? D.BRANDS[o.brand].acc : o.col}">${esc(o.n)}</b> <small>${esc(o.type)}</small><p>${esc(o.pitch)}</p><small>${o.tasks.map(t => '• ' + esc(t.txt)).join('<br>')}</small><p class="hl">${U.money(o.pay)} + ${o.followers} followers${o.reward.item ? ' + exclusive item' : ''}${o.reward.emote ? ' + exclusive emote' : ''}</p><div class="row"><button class="btn sm go" data-acc="${id}">Accept</button><button class="btn sm" data-dec="${id}">Decline</button></div></div>`; }).join('');
    h += '<h4>Active</h4>' + (s.sponsors.active.map(a => { const o = D.SPONSORS.find(x => x.id === a.id); return `<div class="deal"><b>${esc(o.n)}</b><small> pays ${U.money(o.pay)}</small>${a.tasks.map(t => `<div class="chal ${t.prog >= t.n ? 'done' : ''}">${esc(t.txt)} <span>${t.prog}/${t.n}</span><div class="bar"><i style="width:${t.prog / t.n * 100}%"></i></div></div>`).join('')}</div>`; }).join('') || '<p class="muted">No active deals.</p>');
    const locked = D.SPONSORS.filter(o => !s.sponsors.offered.includes(o.id) && !s.sponsors.done.includes(o.id) && !s.sponsors.active.some(a => a.id === o.id));
    h += '<h4>Coming soon</h4>' + locked.map(o => `<div class="li">${esc(o.n)} <small>needs ${U.kfmt(o.req.followers)} followers & ${o.req.rep} rep</small></div>`).join('');
    h += `<h4>Completed (${s.sponsors.done.length})</h4>` + s.sponsors.done.map(id => `<div class="li">✅ ${esc(D.SPONSORS.find(x => x.id === id).n)}</div>`).join('');
    return h;
  }
  function chal() { const s = S(); const row = c => `<div class="chal ${c.done ? 'done' : ''}">${c.done ? '✅' : '⬜'} ${esc(c.t)} <span>${U.fmt(c.prog)}/${U.fmt(c.n)}</span><em>${U.money(c.r)}</em><div class="bar"><i style="width:${c.prog / c.n * 100}%"></i></div></div>`; s.challenges.daily.forEach(c => c.seen = true); return `<h4>Daily — resets each day</h4>${s.challenges.daily.map(row).join('')}<h4>Weekly — resets every 7 days</h4>${s.challenges.weekly.map(row).join('')}${s.flags.trainerTask ? `<h4>Coach Priya</h4><div class="chal">${s.flags.trainerTask.grade}+ on ${D.MACHINES[s.flags.trainerTask.machine].n}<em>${U.money(s.flags.trainerTask.reward)}</em></div>` : ''}`; }
  function emoteShop() { const s = S(); return `<div class="list">${D.EMOTES.filter(e => e.unlock === 'shop').map(e => { const own = s.owned.emotes.includes(e.id); return `<div class="li"><b>${esc(e.n)}</b> <small>${e.dance ? 'dance' : e.cat}</small>${own ? '<em class="ok">owned</em>' : `<button class="btn sm go" data-buyem="${e.id}">${U.money(e.price)}</button>`}</div>`; }).join('')}</div><p class="muted">Other emotes unlock from levels, competitions, friendships, sponsors and mystery machines.</p>`; }
  function wire(q) {
    const s = S();
    q('[data-ct]').forEach(b => b.onclick = () => { cloutTab = b.dataset.ct; sub = null; render(); });
    q('[data-prof]').forEach(b => b.onclick = () => { cloutTab = 'prof'; sub = b.dataset.prof; render(); });
    q('[data-follow]').forEach(b => b.onclick = () => { const id = b.dataset.follow, k = 'fol_' + id; if (!s.flags[k]) { s.flags[k] = 1; GR.Dialogue.addFriend({ cast: D.CAST.find(c => c.id === id), id }, 3); GR.Prog.addRep(1); GR.Audio.sfx('pop'); } render(); });
    q('[data-like]').forEach(b => b.onclick = () => { const k = 'lk' + b.dataset.like; if (!s.flags[k]) { s.flags[k] = 1; GR.Prog.addRep(1); GR.Audio.sfx('pop'); } render(); });
    q('#bio').forEach(b => b.onclick = () => { const v = prompt('Your Clout bio:', s.flags.bio || ''); if (v != null) { s.flags.bio = v.slice(0, 80); render(); } });
    q('#newpic').forEach(b => b.onclick = () => { close(); GR.Camera.photoMode(); });
    q('[data-gal]').forEach(b => b.onclick = () => { const g = s.social.gallery[+b.dataset.gal]; close(); GR.Camera.compose('photo', { img: g.img, emote: g.emote, loc: g.loc }); });
    q('[data-ft]').forEach(b => b.onclick = () => { flickTab = b.dataset.ft; sub = null; render(); });
    const vc = el.querySelector('#vcan');
    if (vc && app === 'flicks' && flickTab === 'fyp') { const v = fyp()[fypIdx % fyp().length]; playVideo(vc, v.cast.app, v.cast.outfit, { emotes: [{ id: v.emote, t: 0 }], angle: U.pick(['front', 'orbit', 'low']), fx: v.fx }); }
    if (vc && app === 'flicks' && flickTab === 'mine' && sub != null) { const p = s.social.posts.filter(p => p.type === 'video')[sub]; if (p && p.clip) playVideo(vc, s.app, s.outfit, p.clip); }
    q('#vnext').forEach(b => b.onclick = () => { fypIdx++; render(); }); q('#vprev').forEach(b => b.onclick = () => { fypIdx = Math.max(0, fypIdx - 1); render(); });
    q('#vlike').forEach(b => b.onclick = () => { GR.Audio.sfx('pop'); GR.Prog.addRep(1); b.textContent = '❤️ Liked'; });
    q('[data-play]').forEach(b => b.onclick = () => { sub = +b.dataset.play; render(); }); q('#vback').forEach(b => b.onclick = () => { sub = null; render(); });
    q('#recgo').forEach(b => b.onclick = () => { close(); GR.Camera.photoMode({ video: true }); });
    q('[data-th]').forEach(b => b.onclick = () => { sub = b.dataset.th; render(); const c = el.querySelector('.chat'); if (c) c.scrollTop = 1e6; });
    q('[data-rep]').forEach(b => b.onclick = () => { const t = s.msgs.threads[sub]; const txt = b.textContent; if (t.sponsor && txt.includes('Accept')) GR.Sponsors.accept(t.sponsor); else if (t.sponsor && txt.includes('Decline')) GR.Sponsors.decline(t.sponsor); t.msgs.push({ from: 'me', txt, t: s.time }); t.last = s.time; if (!t.sponsor) setTimeout(() => { const who = t.group ? U.pick(t.members.map(m => D.CAST.find(c => c.id === m)).filter(Boolean)) : D.CAST.find(c => c.id === sub); if (who) { const pack = D.DIALOGUE[who.pers] || D.DIALOGUE.chill; t.msgs.push({ from: t.group ? who.name.split(' ')[0] : who.name, txt: U.pick(pack.chat), t: s.time }); if (!t.group) GR.Dialogue.addFriend({ cast: who, id: who.id }, 2); if (isOpen && app === 'msgs' && sub) render(); } }, 1200); render(); const c = el.querySelector('.chat'); if (c) c.scrollTop = 1e6; });
    q('[data-acc]').forEach(b => b.onclick = () => { GR.Sponsors.accept(b.dataset.acc); render(); }); q('[data-dec]').forEach(b => b.onclick = () => { GR.Sponsors.decline(b.dataset.dec); render(); });
    q('[data-buyem]').forEach(b => b.onclick = () => { const e = D.emote(b.dataset.buyem); if (!GR.Prog.spend(e.price)) return; s.owned.emotes.push(e.id); GR.Prog.event('buy', { kind: 'emote' }); GR.UI.toast('🕺 Unlocked ' + e.n + ' — press B to use it'); GR.Save.save(s); render(); });
    GR.Comp.wirePhone && GR.Comp.wirePhone(q, render);
  }
  function update(dt) { GR.Social.tick(dt); GR.Camera.update(dt); if (isOpen && app === 'home' && Math.random() < 0.02) render(); }
  return { toggle, openApp: openPhone, close, message, update, get open() { return isOpen; }, playVideo, stopVideo };
})();
