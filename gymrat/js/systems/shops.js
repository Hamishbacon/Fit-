/* Shops: clothing stores (browse, live try-on on the 3D character, colourways, buy, equip), wardrobe + saved outfits,
   changing rooms, Fade Factory barber, Glow Lab (skincare minigame, cosmetics, face presets), Nest & Co furniture,
   food ordering, vending machines with dispense animations and mystery rewards. */
'use strict';
GR.Shops = (() => {
  const U = GR.U, D = GR.Data, esc = U.esc;
  const S = () => GR.state, G = () => GR.Game;
  const key = (id, c) => id + '|' + c;
  const owns = (id, c) => S().owned.clothes.includes(key(id, c));
  function swatch(it, c) { const col = GR.Char.itemColor(it, c); const icon = { top: '👕', bottom: '👖', shoes: '👟', neck: '📿', wrist: '⌚', ring: '💍', eyes: '🕶️', head: '🧢', back: '🎒', ears: '🎧' }[it.slot] || '✨'; return `<div class="sw" style="background:linear-gradient(135deg, ${col}, ${U.shade(col, -0.3)})"><span>${icon}</span></div>`; }
  function slotOf(it) { return ['top', 'bottom', 'shoes'].includes(it.slot) ? it.slot : 'acc'; }
  function withItem(outfit, it, c) { const o = JSON.parse(JSON.stringify(outfit)); if (slotOf(it) === 'acc') { o.acc = o.acc || {}; o.acc[it.slot] = { id: it.id, c }; } else o[it.slot] = { id: it.id, c }; return o; }
  function equip(it, c, save) { const s = S(); s.outfit = withItem(s.outfit, it, c); G().player.setOutfit(s.outfit); if (save) { GR.Save.autosave(s); GR.Audio.sfx('pop'); GR.UI.toast('👕 Equipped ' + it.name); } GR.Bus.emit('outfit'); }
  function unequipAcc(slot) { const s = S(); if (s.outfit.acc) delete s.outfit.acc[slot]; G().player.setOutfit(s.outfit); GR.Save.autosave(s); }
  function previewCam(dist = 3.0, h = 0.55, lookH = 0.15, yawOff = 0) { const p = G().player.root.position; G().camTo({ orbit: { target: new THREE.Vector3(p.x, p.y + 0.95, p.z), yaw: G().P.facing + yawOff, dist, h, lookH }, dur: 0.6 }); }
  function rotateBtns() { return `<div class="rot"><button class="btn sm" data-rot="-1">⟲</button><span>Drag the view to rotate</span><button class="btn sm" data-rot="1">⟳</button></div>`; }
  function wireRot(p) { p.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { const o = G().cam.override; if (o && o.orbit) o.orbit.yaw += +b.dataset.rot * 0.7; }); }
  function brandsWorn(outfit) { const out = {}; [outfit.top, outfit.bottom, outfit.shoes, ...Object.values(outfit.acc || {})].forEach(x => { if (!x) return; const it = D.item(x.id); if (it && (it.brand || it.source)) { const b = it.brand || (it.source || '').split(' ')[0].toLowerCase(); out[b] = (out[b] || 0) + 1; } }); return out; }

  /* ---------------- CLOTHING STORE ---------------- */
  function store(storeId, cat = 'all') {
    const s = S(), loc = D.LOCATIONS[storeId]; const orig = JSON.parse(JSON.stringify(s.outfit));
    let items = D.ITEMS.filter(i => i.store === storeId);
    const cats = storeId === 'solesurvivor' ? [['shoes', '👟 Sneakers'], ['acc', '⌚ Accessories'], ['all', '✨ Everything']] : [['all', '✨ All'], ['top', '👕 Tops'], ['bottom', '👖 Bottoms'], ['new', '🆕 New Arrivals'], ['looks', '🧍 Mannequin Looks']];
    if (storeId === 'solesurvivor' && cat === 'all') cat = 'shoes';
    let sel = null, selC = 0, filterBrand = null;
    G().player.anim.play('cross');
    previewCam(3.1, 0.5, 0.1);
    const p = GR.UI.open('store', { title: '🛍️ ' + loc.n.toUpperCase(), side: 'right', cls: 'shop', onClose: () => { s.outfit = s.outfit; G().player.setOutfit(s.outfit); G().camRelease(); G().player.anim.stop(); } });
    const render = () => {
      let list = items;
      if (cat === 'top' || cat === 'bottom' || cat === 'shoes') list = items.filter(i => i.slot === cat);
      if (cat === 'acc') list = items.filter(i => slotOf(i) === 'acc');
      if (cat === 'new') list = items.filter((i, k) => (U.hash(i.id) + Math.floor(s.time / 24)) % 3 === 0);
      if (filterBrand) list = list.filter(i => i.brand === filterBrand);
      const brands = [...new Set(items.map(i => i.brand).filter(Boolean))];
      let h = `<div class="tabs">${cats.map(([k, t]) => `<button class="${k === cat ? 'on' : ''}" data-c="${k}">${t}</button>`).join('')}</div>`;
      if (cat !== 'looks') h += `<div class="chips">${brands.map(b => `<button class="chip ${filterBrand === b ? 'on' : ''}" data-b="${b}" style="--bc:${D.BRANDS[b].col}">${D.BRANDS[b].n}</button>`).join('')}</div>`;
      if (cat === 'looks') {
        const looks = lookbook(storeId);
        h += looks.map((L, i) => { const total = L.items.reduce((a, [it, c]) => a + (owns(it.id, c) ? 0 : it.price), 0); return `<div class="look"><b>${esc(L.n)}</b><small>${L.items.map(([it]) => esc(it.name)).join(' • ')}</small><div class="row"><button class="btn sm" data-lp="${i}">Try on</button><button class="btn sm go" data-lb="${i}">${total ? 'Buy look ' + U.money(total) : 'Equip look'}</button></div></div>`; }).join('');
      } else {
        h += `<div class="grid">${list.map(it => { const anyOwn = it.colors.some((_, c) => owns(it.id, c)); return `<button class="card ${sel === it ? 'sel' : ''}" data-i="${it.id}">${swatch(it, 0)}<b>${esc(it.name)}</b><small>${U.money(it.price)}${anyOwn ? ' • owned' : ''}</small></button>`; }).join('')}</div>`;
      }
      if (sel) {
        const own = owns(sel.id, selC), eq = GR.UI.isEquipped(sel, selC);
        const b = sel.brand ? D.BRANDS[sel.brand] : null;
        h += `<div class="detail"><h3>${esc(sel.name)}</h3><p class="muted">${b ? esc(b.tag) + ' • ' : ''}${esc(sel.kind)} • tags: ${sel.tags.map(esc).join(', ')}</p>
          <div class="colors">${sel.colors.map((col, i) => `<button class="cdot ${i === selC ? 'on' : ''}" data-col="${i}" style="background:${col}" title="Colourway ${i + 1}${owns(sel.id, i) ? ' (owned)' : ''}">${owns(sel.id, i) ? '✓' : ''}</button>`).join('')}</div>
          <div class="row">${own ? `<button class="btn go" id="eq">${eq ? '✓ Equipped' : 'Equip'}</button>` : `<button class="btn go" id="buy">Buy ${U.money(sel.price)}</button>`}<span class="muted">You have ${U.money(s.money)}</span></div></div>`;
      }
      h += rotateBtns() + `<p class="muted">Tip: changing rooms let you mix and save complete outfits.</p>`;
      p.querySelector('.pb').innerHTML = h; wireRot(p);
      p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; sel = null; render(); });
      p.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { filterBrand = filterBrand === b.dataset.b ? null : b.dataset.b; render(); });
      p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sel = D.item(b.dataset.i); selC = Math.max(0, sel.colors.findIndex((_, c) => owns(sel.id, c))); preview(); render(); });
      p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { selC = +b.dataset.col; preview(); render(); });
      const buyB = p.querySelector('#buy'); if (buyB) buyB.onclick = () => { if (buy(sel, selC)) { equip(sel, selC, true); render(); } };
      const eqB = p.querySelector('#eq'); if (eqB) eqB.onclick = () => { equip(sel, selC, true); render(); };
      p.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => { const L = lookbook(storeId)[+b.dataset.lp]; let o = s.outfit; L.items.forEach(([it, c]) => o = withItem(o, it, c)); G().player.setOutfit(o); G().player.anim.play('mewing'); });
      p.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => { const L = lookbook(storeId)[+b.dataset.lb]; const total = L.items.reduce((a, [it, c]) => a + (owns(it.id, c) ? 0 : it.price), 0); if (total && !GR.Prog.spend(total)) return; L.items.forEach(([it, c]) => { if (!owns(it.id, c)) grant(it, c, true); equip(it, c, false); }); GR.Save.save(s); GR.UI.toast('🧍 Look complete: ' + L.n); render(); });
    };
    const preview = () => { if (!sel) return; G().player.setOutfit(withItem(s.outfit, sel, selC)); G().player.anim.play(U.pick(['peace', 'mewing', 'cross', 'selfie']), { restart: true }); };
    render();
  }
  function lookbook(storeId) {
    const its = D.ITEMS.filter(i => i.store === storeId || (storeId !== 'solesurvivor' && i.store === 'solesurvivor' && i.slot === 'shoes'));
    const pick = (slot, tag, n) => its.filter(i => i.slot === slot && (!tag || i.tags.includes(tag)))[n % Math.max(1, its.filter(i => i.slot === slot && (!tag || i.tags.includes(tag))).length)];
    return [['Gym Rat Starter', 'gym'], ['Street Royalty', 'street'], ['2012 Throwback', 'retro'], ['Cozy Mode', 'cozy']].map(([n, tag], k) => ({ n, items: [pick('top', tag, k), pick('bottom', tag, k), pick('shoes', tag, k)].filter(Boolean).map(it => [it, k % it.colors.length]) })).filter(L => L.items.length >= 2);
  }
  function buy(it, c) { if (owns(it.id, c)) return true; if (!GR.Prog.spend(it.price)) return false; grant(it, c, false); GR.Save.save(S()); return true; }
  function grant(it, c, quiet) { const s = S(); s.owned.clothes.push(key(it.id, c)); GR.Prog.stat('clothesBought'); GR.Prog.event('buy', { item: it.id, brand: it.brand }); GR.Prog.event('buy_clothing', { item: it.id, brand: it.brand }); if (!quiet) GR.UI.toast('🛍️ Bought ' + it.name + ' — added to your wardrobe'); GR.Prog.check(); }

  /* ---------------- WARDROBE / CHANGING ROOM ---------------- */
  function wardrobe(ctx = {}) {
    const s = S(); let slot = 'top';
    if (ctx.lockers && ctx.lockers.userData.doors) ctx.lockers.userData.doors.forEach((d, i) => { if (i === 0) d.rotation.y = -1.6; });
    if (!ctx.cubicle) previewCam(3.0, 0.5, 0.1);
    G().player.anim.play('cross');
    const p = GR.UI.open('wardrobe', { title: ctx.cubicle ? '🪞 CHANGING ROOM' : '👔 WARDROBE', side: 'right', cls: 'shop', onClose: () => { G().player.setOutfit(s.outfit); G().camRelease(); G().player.anim.stop(); if (ctx.lockers && ctx.lockers.userData.doors) ctx.lockers.userData.doors.forEach(d => d.rotation.y = 0); if (ctx.onClose) ctx.onClose(); GR.Save.save(s); } });
    const slots = [['top', '👕'], ['bottom', '👖'], ['shoes', '👟'], ['neck', '📿'], ['wrist', '⌚'], ['ring', '💍'], ['eyes', '🕶️'], ['head', '🧢'], ['back', '🎒'], ['ears', '🎧'], ['outfits', '💾 Outfits']];
    const render = () => {
      let h = `<div class="tabs">${slots.map(([k, t]) => `<button class="${k === slot ? 'on' : ''}" data-s="${k}">${t}</button>`).join('')}</div>`;
      if (slot === 'outfits') {
        h += `<div class="row"><input id="ofn" maxlength="24" placeholder="Outfit name" value="Fit #${s.outfits.length + 1}"><button class="btn go" id="ofs">💾 Save current</button></div>`;
        h += s.outfits.map((o, i) => `<div class="look"><b>${esc(o.name)}</b><small>${[o.outfit.top, o.outfit.bottom, o.outfit.shoes].filter(Boolean).map(x => esc((D.item(x.id) || {}).name || '?')).join(' • ')}</small><div class="row"><button class="btn sm go" data-ow="${i}">Wear</button><button class="btn sm" data-od="${i}">Delete</button></div></div>`).join('') || '<p class="muted">No saved outfits yet.</p>';
      } else {
        const own = s.owned.clothes.map(k => { const [id, c] = k.split('|'); return { it: D.item(id), c: +c }; }).filter(o => o.it && o.it.slot === slot);
        h += `<div class="grid">${own.map(o => { const eq = GR.UI.isEquipped(o.it, o.c); return `<button class="card ${eq ? 'eq' : ''}" data-k="${o.it.id}|${o.c}">${swatch(o.it, o.c)}<b>${esc(o.it.name)}</b><small>${eq ? 'EQUIPPED' : 'tap to wear'}</small></button>`; }).join('') || '<p class="muted">Nothing here yet — visit the stores on Drip Street!</p>'}</div>`;
        if (!['top', 'bottom', 'shoes'].includes(slot) && s.outfit.acc && s.outfit.acc[slot]) h += `<button class="btn" id="rm">Remove ${slot} accessory</button>`;
      }
      const drip = GR.Comp ? GR.Comp.dripScore(s.outfit) : null;
      if (drip) h += `<div class="drip">💧 Drip check: <b>${drip.total}</b>/100 <small>coordination ${drip.coord} • colour ${drip.colour} • accessories ${drip.acc}</small></div>`;
      h += rotateBtns();
      p.querySelector('.pb').innerHTML = h; wireRot(p);
      p.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { slot = b.dataset.s; render(); });
      p.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const [id, c] = b.dataset.k.split('|'); equip(D.item(id), +c, true); G().player.anim.play(U.pick(['peace', 'mewing', 'selfie', 'flex']), { restart: true }); render(); });
      const rm = p.querySelector('#rm'); if (rm) rm.onclick = () => { unequipAcc(slot); render(); };
      const ofs = p.querySelector('#ofs'); if (ofs) ofs.onclick = () => { const n = (p.querySelector('#ofn').value || 'Fit').slice(0, 24); s.outfits.push({ name: n, outfit: JSON.parse(JSON.stringify(s.outfit)) }); GR.Prog.stat('outfitsSaved'); GR.Save.save(s); GR.UI.toast('💾 Saved outfit "' + n + '"'); render(); };
      p.querySelectorAll('[data-ow]').forEach(b => b.onclick = () => { s.outfit = JSON.parse(JSON.stringify(s.outfits[+b.dataset.ow].outfit)); G().player.setOutfit(s.outfit); GR.Save.save(s); G().player.anim.play('mewing', { restart: true }); render(); });
      p.querySelectorAll('[data-od]').forEach(b => b.onclick = () => { s.outfits.splice(+b.dataset.od, 1); GR.Save.save(s); render(); });
    };
    render();
  }
  function changingRoom(storeId, cub) {
    const g = G(); cub.updateMatrixWorld(true);
    const inside = new THREE.Vector3(0, 0, -0.2).applyMatrix4(cub.matrixWorld);
    g.P.pos.set(inside.x, 0, inside.z); g.player.root.position.copy(g.P.pos);
    const mirror = new THREE.Vector3(0.74, 1.2, 0).applyMatrix4(cub.matrixWorld);
    g.P.facing = Math.atan2(mirror.x - inside.x, mirror.z - inside.z); g.player.root.rotation.y = g.P.facing;
    cub.userData.setOpen(false);
    const camP = new THREE.Vector3(-0.55, 1.55, 0.45).applyMatrix4(cub.matrixWorld);
    g.camTo({ pos: camP, look: mirror.clone().setY(1.25), dur: 0.6, fov: 62 });
    wardrobe({ cubicle: cub, onClose: () => { cub.userData.setOpen(true); g.P.pos.copy(new THREE.Vector3(0, 0, 1.4).applyMatrix4(cub.matrixWorld)); g.P.pos.y = 0; g.player.root.position.copy(g.P.pos); } });
    if (Math.random() < 0.5) GR.UI.toast('🪞 Mirror selfie tip: open photo mode (C) in here!');
  }

  /* ---------------- BARBER ---------------- */
  function barber(chairIdx = 0) {
    const s = S(), g = G(), z = GR.World.Z; const chair = z.chairs ? z.chairs[chairIdx] : null; const origApp = JSON.parse(JSON.stringify(s.app));
    let app = JSON.parse(JSON.stringify(s.app)), tab = 'hair';
    if (chair) { g.P.pos.set(chair.x, 0.05, chair.z); g.player.root.position.copy(g.P.pos); g.P.facing = Math.PI; g.player.root.rotation.y = Math.PI; g.player.anim.play('barberchair'); g.lockPlayer(true); }
    const barberNpc = GR.NPC.castById('tfade'); if (barberNpc) { barberNpc.char.root.position.set(g.P.pos.x + 0.7, 0, g.P.pos.z + 0.4); barberNpc.char.root.rotation.y = -2.3; barberNpc.char.anim.play('barber'); barberNpc.char.prop('product', true); GR.NPC.bark(barberNpc, U.pick(['Sit back. Trust the process.', 'Ooh we\'re doing something new today?', 'Hold still, I\'m an artist.', 'This is gonna be CLEAN.'])); }
    g.camTo({ pos: new THREE.Vector3(g.P.pos.x, 1.45, g.P.pos.z - 1.25), look: new THREE.Vector3(g.P.pos.x, 1.3, g.P.pos.z), dur: 0.6, fov: 45 });
    const p = GR.UI.open('barber', { title: '💈 FADE FACTORY', side: 'right', cls: 'shop', onClose: () => { g.player.setAppearance(s.app); g.player.setOutfit(s.outfit); g.camRelease(); g.player.anim.stop(); g.lockPlayer(false); g.P.pos.z += 1.0; g.P.pos.y = 0; g.player.root.position.copy(g.P.pos); if (barberNpc) { barberNpc.char.anim.play('counter'); barberNpc.char.prop('product', false); } } });
    const cost = () => { let c = 0; const H = D.HAIR.find(h => h.id === app.hair); if (app.hair !== origApp.hair && !s.owned.hair.includes(app.hair)) c += H.price; else if (app.hair !== origApp.hair) c += 8; if (app.hairColor !== origApp.hairColor) c += 12; if (app.hairHi !== origApp.hairHi) c += 15; const F = D.FACIAL_HAIR.find(f => f.id === app.facialHair); if (app.facialHair !== origApp.facialHair) c += s.owned.facial.includes(app.facialHair) ? 5 : F.price; if (app.facialColor !== origApp.facialColor) c += 6; if (app.brow !== origApp.brow || app.browThick !== origApp.browThick || app.browColor !== origApp.browColor) c += 6; return c; };
    const upd = () => { g.player.setAppearance(app); g.player.setOutfit(s.outfit); g.player.anim.play('barberchair'); GR.Audio.sfx(tab === 'hair' || tab === 'beard' ? 'buzz' : 'spray'); };
    const render = () => {
      const tabs = [['hair', '✂️ Cut'], ['colour', '🎨 Colour'], ['beard', '🧔 Facial hair'], ['brows', '〰️ Brows']];
      let h = `<div class="tabs">${tabs.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>`;
      if (tab === 'hair') h += `<div class="grid">${D.HAIR.map(H => `<button class="card ${app.hair === H.id ? 'sel' : ''}" data-h="${H.id}"><div class="ico">💇</div><b>${esc(H.n)}</b><small>${s.owned.hair.includes(H.id) ? 'owned' : U.money(H.price)}</small></button>`).join('')}</div>`;
      if (tab === 'colour') h += `<h4>Hair colour</h4><div class="colors">${D.HAIR_COLORS.map(c => `<button class="cdot ${app.hairColor === c.c ? 'on' : ''}" data-hc="${c.c}" style="background:${c.c}" title="${c.n}"></button>`).join('')}</div><h4>Highlights</h4><div class="colors"><button class="cdot ${!app.hairHi ? 'on' : ''}" data-hh="" title="None">✕</button>${D.HAIR_COLORS.map(c => `<button class="cdot ${app.hairHi === c.c ? 'on' : ''}" data-hh="${c.c}" style="background:${c.c}" title="${c.n}"></button>`).join('')}</div><label>Custom colour <input type="color" id="hcust" value="${app.hairColor}"></label>`;
      if (tab === 'beard') h += `<div class="grid">${D.FACIAL_HAIR.map(F => `<button class="card ${app.facialHair === F.id ? 'sel' : ''}" data-f="${F.id}"><div class="ico">🧔</div><b>${esc(F.n)}</b><small>${s.owned.facial.includes(F.id) ? 'owned' : U.money(F.price)}</small></button>`).join('')}</div><h4>Beard colour</h4><div class="colors"><button class="cdot ${!app.facialColor ? 'on' : ''}" data-fc="">=</button>${D.HAIR_COLORS.slice(0, 10).map(c => `<button class="cdot ${app.facialColor === c.c ? 'on' : ''}" data-fc="${c.c}" style="background:${c.c}"></button>`).join('')}</div>`;
      if (tab === 'brows') h += `<div class="grid">${D.BROWS.map(B => `<button class="card ${app.brow === B.id ? 'sel' : ''}" data-br="${B.id}"><div class="ico">〰️</div><b>${esc(B.n)}</b></button>`).join('')}</div><label>Thickness <input type="range" id="bth" min="0.5" max="1.6" step="0.05" value="${app.browThick || 1}"></label><div class="colors"><button class="cdot ${!app.browColor ? 'on' : ''}" data-bc="">=</button>${D.HAIR_COLORS.slice(0, 10).map(c => `<button class="cdot ${app.browColor === c.c ? 'on' : ''}" data-bc="${c.c}" style="background:${c.c}"></button>`).join('')}</div>`;
      const c = cost();
      h += `<div class="detail"><div class="row"><button class="btn go" id="bconf">${c ? 'Get this look — ' + U.money(c) : 'No changes'}</button><button class="btn" id="breset">Reset</button></div><p class="muted">T-Fade: "${esc(U.pick(['Trust me, this is gonna hit.', 'Bold. I respect it.', 'The mirror is about to be jealous.', 'You walked in a 7, you walk out a 10. Emotionally.']))}"</p></div>`;
      p.querySelector('.pb').innerHTML = h;
      const on = (sel, fn) => p.querySelectorAll(sel).forEach(b => b.onclick = () => { fn(b); upd(); render(); });
      p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
      on('[data-h]', b => app.hair = b.dataset.h); on('[data-hc]', b => app.hairColor = b.dataset.hc); on('[data-hh]', b => app.hairHi = b.dataset.hh || null); on('[data-f]', b => app.facialHair = b.dataset.f); on('[data-fc]', b => app.facialColor = b.dataset.fc || null); on('[data-br]', b => app.brow = b.dataset.br); on('[data-bc]', b => app.browColor = b.dataset.bc || null);
      const hc = p.querySelector('#hcust'); if (hc) hc.onchange = e => { app.hairColor = e.target.value; upd(); render(); };
      const bt = p.querySelector('#bth'); if (bt) bt.onchange = e => { app.browThick = +e.target.value; upd(); render(); };
      p.querySelector('#breset').onclick = () => { app = JSON.parse(JSON.stringify(origApp)); upd(); render(); };
      p.querySelector('#bconf').onclick = () => { const c2 = cost(); if (!c2) { GR.UI.close(); return; } if (!GR.Prog.spend(c2)) return; if (!s.owned.hair.includes(app.hair)) s.owned.hair.push(app.hair); if (!s.owned.facial.includes(app.facialHair)) s.owned.facial.push(app.facialHair); const hairChanged = app.hair !== origApp.hair || app.hairColor !== origApp.hairColor; s.app = JSON.parse(JSON.stringify(app)); Object.assign(origApp, JSON.parse(JSON.stringify(app))); if (hairChanged) GR.Prog.stat('haircuts'); GR.Prog.event('haircut', {}); GR.Prog.addXP(20); GR.Save.save(s); GR.Audio.sfx('cash'); GR.UI.toast('💈 Fresh! The new look is saved.'); if (barberNpc) GR.NPC.bark(barberNpc, U.pick(['CLEAN. Go break some hearts.', 'Certified fresh.', 'Mirror, mirror… yeah, it\'s you.'])); render(); };
    };
    render();
  }

  /* ---------------- GLOW LAB ---------------- */
  function glowlab(mode = 'shop') {
    const s = S(), g = G();
    if (mode === 'routine' || mode === 'home') return skincare(mode);
    previewCam(1.4, 0.65, 0.65, 0);
    let tab = 'cosm';
    const p = GR.UI.open('glow', { title: '🧴 GLOW LAB', side: 'right', cls: 'shop', onClose: () => { g.player.setAppearance(s.app); g.player.setOutfit(s.outfit); g.camRelease(); } });
    const render = () => {
      const c = s.app.cosmetics;
      let h = `<p>Glow tokens: <b>✨ ${s.tokens}</b> <small class="muted">(earn them from skincare routines & sponsors)</small></p><div class="tabs">${[['cosm', '💄 Cosmetics'], ['faces', '🙂 Face presets'], ['routine', '🧖 Skincare routine']].map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>`;
      if (tab === 'cosm') h += `<div class="grid">${D.COSMETICS.map(cm => { const own = s.owned.cosmetics.includes(cm.id); const on = isOn(cm); return `<button class="card ${on ? 'eq' : ''}" data-cm="${cm.id}"><div class="ico">✨</div><b>${esc(cm.n)}</b><small>${own ? (on ? 'ON — tap to remove' : 'owned — tap to apply') : '✨ ' + cm.price}</small><small class="muted">${esc(cm.d)}</small></button>`; }).join('')}</div>`;
      if (tab === 'faces') h += `<div class="grid">${D.FACE_PRESETS.map(fp => `<button class="card" data-fp="${fp.id}"><div class="ico">🙂</div><b>${esc(fp.n)}</b><small>${s.owned.presets.includes(fp.id) ? 'owned' : '✨ ' + fp.price}</small></button>`).join('')}</div><p class="muted">Presets reshape your avatar's face structure. Purely cosmetic avatar fun — every face is a main-character face.</p>`;
      if (tab === 'routine') h += `<p>Follow the routine steps in the right order to earn glow tokens and XP. Mei Lin will guide you.</p><button class="btn go" id="startr">Start routine</button>`;
      p.querySelector('.pb').innerHTML = h;
      p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
      p.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { const cm = D.COSMETICS.find(x => x.id === b.dataset.cm); if (!s.owned.cosmetics.includes(cm.id)) { if (s.tokens < cm.price) { GR.UI.toast('✨ Not enough glow tokens.', 'warn'); return; } s.tokens -= cm.price; s.owned.cosmetics.push(cm.id); GR.Audio.sfx('cash'); } toggle(cm); g.player.setAppearance(s.app); g.player.setOutfit(s.outfit); GR.Save.save(s); render(); });
      p.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { const fp = D.FACE_PRESETS.find(x => x.id === b.dataset.fp); if (!s.owned.presets.includes(fp.id)) { if (s.tokens < fp.price) { GR.UI.toast('✨ Not enough glow tokens.', 'warn'); return; } s.tokens -= fp.price; s.owned.presets.push(fp.id); } Object.assign(s.app, fp.set); g.player.setAppearance(s.app); g.player.setOutfit(s.outfit); GR.Save.save(s); GR.UI.toast('🙂 Applied ' + fp.n); render(); });
      const sr = p.querySelector('#startr'); if (sr) sr.onclick = () => { GR.UI.close(); skincare('routine'); };
    };
    render();
  }
  function isOn(cm) { const c = S().app.cosmetics; return cm.type === 'mask' ? c.mask === cm.val : cm.type === 'paint' ? c.paint === cm.val : cm.type === 'freckles' ? S().app.freckles > 0.3 : cm.type === 'beauty' ? !!S().app.beautyMark : cm.type === 'glow' ? !!c.glow : cm.type === 'blush' ? !!c.blush : cm.type === 'liner' ? !!c.liner : cm.type === 'glitter' ? !!c.glitter : false; }
  function toggle(cm) { const a = S().app, c = a.cosmetics, on = isOn(cm); if (cm.type === 'mask') c.mask = on ? null : cm.val; else if (cm.type === 'paint') c.paint = on ? null : cm.val; else if (cm.type === 'freckles') a.freckles = on ? 0 : cm.val; else if (cm.type === 'beauty') a.beautyMark = !on; else c[cm.type] = on ? 0 : cm.val; }
  function skincare(mode) {
    const s = S(), g = G(), z = GR.World.Z;
    if (mode === 'routine' && z.chair) { g.P.pos.set(z.chair.x - 0.1, 0, z.chair.z); g.player.root.position.copy(g.P.pos); g.P.facing = Math.PI / 2; g.player.root.rotation.y = g.P.facing; }
    g.lockPlayer(true); g.player.anim.play(mode === 'routine' ? 'sit' : 'cross');
    g.camTo(g.camFront(1.2, 1.55, 1.55), 0.5);
    const order = ['cleanse', 'tone', 'serum', 'eye', 'moist', 'spf'];
    const steps = order.filter((x, i) => i < 2 || Math.random() < 0.65).slice(0, 5); if (!steps.includes('moist')) steps.splice(Math.min(steps.length, 3), 0, 'moist');
    const shuffled = U.shuffle(D.SKINCARE_STEPS.filter(st => steps.includes(st.id) || Math.random() < 0.3));
    let idx = 0, mistakes = 0, rub = 0, phase = 'show', t0 = performance.now();
    const p = GR.UI.open('skin', { title: '🧖 SKINCARE ROUTINE', side: 'right', cls: 'shop', onClose: () => { g.lockPlayer(false); g.player.anim.stop(); g.camRelease(); s.app.cosmetics.mask = s.app.cosmetics.mask === 'sheet_tmp' ? null : s.app.cosmetics.mask; } });
    const render = () => {
      let h = '';
      if (phase === 'show') h = `<p>Memorise today's routine order:</p><ol class="steps">${steps.map(id => `<li>${esc(D.SKINCARE_STEPS.find(x => x.id === id).n)}</li>`).join('')}</ol><button class="btn go" id="ready">I'm ready</button>`;
      else if (phase === 'pick') h = `<p>Step ${idx + 1} of ${steps.length}: pick the right product.</p><div class="grid">${shuffled.map(st => `<button class="card" data-st="${st.id}"><div class="sw" style="background:${st.col}"><span>🧴</span></div><b>${esc(st.n)}</b></button>`).join('')}</div><p class="muted">Mistakes: ${mistakes}</p>`;
      else if (phase === 'rub') h = `<p>${esc(D.SKINCARE_STEPS.find(x => x.id === steps[idx]).verb)}! Move your mouse in circles over the pad (or tap SPACE).</p><div class="rubpad" id="pad">🙂</div><div class="bar big"><i style="width:${Math.min(100, rub)}%"></i></div>`;
      else if (phase === 'done') { const acc = Math.max(0, 1 - mistakes / (steps.length + 1)); const tokens = 1 + Math.round(acc * 3); const xp = 30 + Math.round(acc * 40); h = `<div class="grade g${acc > 0.9 ? 'S' : acc > 0.7 ? 'A' : 'B'}">${acc > 0.9 ? 'S' : acc > 0.7 ? 'A' : 'B'}</div><p class="hl">Glass skin achieved. +✨${tokens} tokens • +${xp} XP</p><button class="btn go" id="fin">Done</button>`; if (!p._paid) { p._paid = true; s.tokens += tokens; GR.Prog.addXP(xp); GR.Prog.stat('skincare'); GR.Prog.event('skincare', { where: z.id }); s.energy = Math.min(100, s.energy + 5); GR.Audio.sfx('achievement'); GR.Save.save(s); } }
      p.querySelector('.pb').innerHTML = h;
      const r = p.querySelector('#ready'); if (r) r.onclick = () => { phase = 'pick'; render(); };
      const f = p.querySelector('#fin'); if (f) f.onclick = () => GR.UI.close();
      p.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { if (b.dataset.st === steps[idx]) { phase = 'rub'; rub = 0; g.player.anim.play('skincare'); GR.Audio.sfx('pop'); if (steps[idx] === 'mask' && !s.app.cosmetics.mask) { s.app.cosmetics.mask = 'sheet'; g.player.setAppearance(s.app); g.player.setOutfit(s.outfit); s.app.cosmetics.mask = null; } render(); } else { mistakes++; GR.Audio.sfx('error'); b.classList.add('bad'); GR.UI.toast('❌ Not that one! Remember the order.'); } });
      const pad = p.querySelector('#pad'); if (pad) { let last = null; pad.onmousemove = e => { if (last) rub += Math.hypot(e.clientX - last[0], e.clientY - last[1]) * 0.25; last = [e.clientX, e.clientY]; p.querySelector('.bar i').style.width = Math.min(100, rub) + '%'; if (rub >= 100) next(); }; }
    };
    const next = () => { GR.Audio.sfx('spray'); idx++; if (idx >= steps.length) { phase = 'done'; g.player.anim.play('mewing'); g.player.setExpr('smile', 3); } else { phase = 'pick'; g.player.anim.play('sit'); } render(); };
    const off = GR.Input.onKey(code => { if (GR.UI.topId() !== 'skin') { off(); return false; } if (code === 'Space' && phase === 'rub') { rub += 9; const bi = p.querySelector('.bar i'); if (bi) bi.style.width = Math.min(100, rub) + '%'; if (rub >= 100) next(); return true; } return false; });
    render();
  }

  /* ---------------- FURNITURE ---------------- */
  function furniture() {
    const s = S(); let cat = 'All', sel = null, selC = 0;
    const cats = ['All', ...new Set(D.FURNITURE.map(f => f.cat))];
    const p = GR.UI.open('furn', { title: '🛋️ NEST & CO', cls: 'wide', pauseTime: true, html: '' });
    const render = () => {
      const list = D.FURNITURE.filter(f => cat === 'All' || f.cat === cat);
      let h = `<div class="tabs">${cats.map(c => `<button class="${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div><div class="grid">${list.map(f => `<button class="card ${sel === f ? 'sel' : ''}" data-f="${f.id}"><div class="sw" style="background:${f.colors[0]}"><span>🛋️</span></div><b>${esc(f.n)}</b><small>${U.money(f.price)} • ${f.surf === 'wall' ? 'wall' : f.w + '×' + f.d + 'm'}</small></button>`).join('')}</div>`;
      if (sel) h += `<div class="detail"><h3>${esc(sel.n)}</h3><div class="colors">${sel.colors.map((c, i) => `<button class="cdot ${i === selC ? 'on' : ''}" data-col="${i}" style="background:${c}"></button>`).join('')}</div><div class="row"><button class="btn go" id="fbuy">Buy ${U.money(sel.price)}</button><span class="muted">Owned in storage: ${s.owned.furniture.filter(x => x.id === sel.id).length} • Placed: ${s.apt.items.filter(x => x.id === sel.id).length}</span></div><canvas id="fprev" width="420" height="240"></canvas></div>`;
      p.querySelector('.pb').innerHTML = h;
      p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; render(); });
      p.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { sel = D.FURNITURE.find(f => f.id === b.dataset.f); selC = 0; render(); });
      p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { selC = +b.dataset.col; render(); });
      const fb = p.querySelector('#fbuy'); if (fb) fb.onclick = () => { if (!GR.Prog.spend(sel.price)) return; s.owned.furniture.push({ uid: U.uid(), id: sel.id, c: selC }); GR.Prog.event('buy', { item: sel.id, kind: 'furniture' }); GR.Save.save(s); GR.UI.toast('🛋️ ' + sel.n + ' delivered to your apartment storage. Use the decorate terminal at home!'); render(); };
      if (sel) GR.Apt.previewFurniture(p.querySelector('#fprev'), sel, selC);
    };
    render();
  }

  /* ---------------- FOOD ---------------- */
  function food(where) {
    const s = S(); const menu = D.FOOD[where === 'cafe' ? 'cafe' : 'protein'];
    const p = GR.UI.open('food', { title: where === 'cafe' ? '☕ BEAN THERE — ORDER' : '🍔 PROTEIN PALACE — ORDER', cls: 'small', html: '' });
    const render = () => { p.querySelector('.pb').innerHTML = `<p>Energy: <b>${Math.round(s.energy)}/100</b></p>${menu.map(f => `<div class="look"><b>${esc(f.n)} — ${U.money(f.price)}</b><small>+${f.energy} energy • ${esc(f.d)}</small><div class="row"><button class="btn sm go" data-eat="${f.id}">Eat here</button><button class="btn sm" data-take="${f.id}">Takeaway</button></div></div>`).join('')}`;
      p.querySelectorAll('[data-eat]').forEach(b => b.onclick = () => { const f = menu.find(x => x.id === b.dataset.eat); if (!GR.Prog.spend(f.price)) return; GR.UI.close(); eat(f); });
      p.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { const f = menu.find(x => x.id === b.dataset.take); if (!GR.Prog.spend(f.price)) return; s.owned.consumables[f.id] = (s.owned.consumables[f.id] || 0) + 1; GR.UI.toast('🥡 ' + f.n + ' added to your inventory.'); GR.Save.save(s); render(); }); };
    render();
  }
  function eat(f) { const s = S(); s.energy = Math.min(100, s.energy + (f.energy || 10)); if (f.buff) GR.Prog.addBuff(f.buff, 1); G().player.anim.play('eat'); GR.Prog.stat('meals'); GR.Prog.event('eat', { id: f.id }); GR.UI.toast(`😋 ${f.n}: +${f.energy} energy`); GR.Save.autosave(s); }
  function consume(id) { const s = S(); if (!s.owned.consumables[id]) return; const v = Object.values(D.VENDING).flatMap(v => v.items).find(i => i.id === id) || D.FOOD.cafe.concat(D.FOOD.protein).find(f => f.id === id); s.owned.consumables[id]--; if (s.owned.consumables[id] <= 0) delete s.owned.consumables[id]; eat(v); }

  /* ---------------- VENDING ---------------- */
  function vending(type, machine) {
    const s = S(), V = D.VENDING[type];
    const p = GR.UI.open('vend', { title: '🥤 ' + V.n, cls: 'small', html: '' });
    const render = () => {
      let h = '';
      if (V.items.length) h = V.items.map(i => `<div class="look"><b>${esc(i.n)} — ${U.money(i.price)}</b><small>+${i.energy} energy${i.buff ? ' • buff: ' + i.buff : ''}</small><div class="row"><button class="btn sm go" data-v="${i.id}">Buy</button></div></div>`).join('');
      else h = `<p>${type === 'mystery' ? 'A capsule of pure chaos: accessories, exclusive clothes, emotes, apartment decor, collectibles or buffs.' : type === 'accessory' ? 'Random accessory drop — chains, shades, caps and more.' : 'Collectible figurines for your apartment shelves.'}</p><button class="btn go" id="vr">Insert ${U.money(V.price)}</button>`;
      p.querySelector('.pb').innerHTML = h + `<p class="muted">You have ${U.money(s.money)}</p>`;
      p.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const it = V.items.find(i => i.id === b.dataset.v); if (!GR.Prog.spend(it.price)) return; dispense(machine, V.col); s.owned.consumables[it.id] = (s.owned.consumables[it.id] || 0) + 1; GR.Prog.stat('vending'); GR.Prog.event('vending', { type }); GR.UI.toast(`🥤 ${it.n} dispensed! (In your inventory — or eat it now from I › Consumables)`); GR.Save.autosave(s); render(); });
      const vr = p.querySelector('#vr'); if (vr) vr.onclick = () => { if (!GR.Prog.spend(V.price)) return; dispense(machine, V.col); GR.Prog.stat('vending'); GR.Prog.event('vending', { type }); if (type === 'mystery') GR.Prog.stat('mystery'); GR.UI.close(); setTimeout(() => reveal(type), 900); };
    };
    render();
  }
  function dispense(machine, col) {
    GR.Audio.sfx('vend'); if (!machine) return; const tray = machine.userData.tray; if (!tray) return;
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.3, metalness: 0.5 }));
    can.position.set(0, 0.9, -0.15); tray.add(can); let t = 0; const iv = setInterval(() => { t += 0.05; can.position.y = Math.max(0, 0.9 - t * t * 4); can.rotation.z = t * 4; if (t > 0.8) { clearInterval(iv); setTimeout(() => tray.remove(can), 1500); } }, 16);
  }
  function reveal(type) {
    const s = S(); let r;
    if (type === 'accessory') { const opts = D.ITEMS.filter(i => slotOf(i) === 'acc' && !i.exclusive); const it = U.pick(opts), c = U.randi(0, it.colors.length - 1); r = { icon: '⌚', n: it.name, d: owns(it.id, c) ? 'Duplicate! Converted to $20' : 'Added to wardrobe', give: () => { if (owns(it.id, c)) GR.Prog.addMoney(20); else s.owned.clothes.push(key(it.id, c)); } }; }
    else if (type === 'collectible') { const c = U.pick(D.COLLECTIBLES.filter(x => x.r !== 'epic' || Math.random() < 0.3)); r = { icon: '🧸', n: c.n, d: c.r.toUpperCase() + ' collectible — shows on your apartment shelves', give: () => { s.owned.collectibles[c.id] = (s.owned.collectibles[c.id] || 0) + 1; } }; }
    else {
      const roll = Math.random();
      if (roll < 0.25) { const ex = D.ITEMS.filter(i => i.exclusive && i.source === 'Mystery machine'); const it = U.pick(ex); r = { icon: '👕', n: it.name, d: 'EXCLUSIVE clothing!', give: () => { if (owns(it.id, 0)) GR.Prog.addMoney(60); else s.owned.clothes.push(key(it.id, 0)); } }; }
      else if (roll < 0.45) { const em = D.EMOTES.filter(e => e.unlock === 'mystery' && !s.owned.emotes.includes(e.id)); if (em.length) { const e = U.pick(em); r = { icon: '💃', n: e.n, d: 'New emote unlocked!', give: () => s.owned.emotes.push(e.id) }; } else r = { icon: '💰', n: '$80 cashback', d: 'You own every mystery emote!', give: () => GR.Prog.addMoney(80) }; }
      else if (roll < 0.62) { const f = U.pick(D.FURNITURE.filter(f => ['lamp_lava', 'neon_mog', 'neon_aura', 'poster_retro', 'plant_cactus', 'beanbag'].includes(f.id))); r = { icon: '🛋️', n: f.n, d: 'Apartment decor sent to storage', give: () => s.owned.furniture.push({ uid: U.uid(), id: f.id, c: U.randi(0, f.colors.length - 1) }) }; }
      else if (roll < 0.82) { const c = U.pick(D.COLLECTIBLES); r = { icon: '🧸', n: c.n, d: 'Collectible!', give: () => { s.owned.collectibles[c.id] = (s.owned.collectibles[c.id] || 0) + 1; } }; }
      else { const b = U.pick(['xp', 'focus', 'hype', 'pump', 'drip']); r = { icon: '✨', n: 'Temporary buff: ' + b.toUpperCase(), d: 'Active for 1 in-game hour', give: () => GR.Prog.addBuff(b, 1) }; }
    }
    r.give(); GR.Save.save(s); GR.Prog.check();
    GR.Audio.sfx('reveal');
    const p = GR.UI.open('reveal', { title: '🎁 YOU GOT…', cls: 'small reveal', html: `<div class="capsule"><div class="cap-top"></div><div class="cap-bot"></div></div><div class="rv"><div class="ico big">${r.icon}</div><h3>${esc(r.n)}</h3><p>${esc(r.d)}</p></div><button class="btn go" id="rok">Nice!</button>` });
    p.querySelector('#rok').onclick = () => GR.UI.close();
    G().player.anim.play(U.pick(['victory', 'shock', 'laugh']));
  }
  return { store, wardrobe, changingRoom, barber, glowlab, furniture, food, vending, equip, consume, swatch, brandsWorn, owns, grant, withItem };
})();
