/* UIManager — menus, field HQ, lobby, HUD, investigation tablet, locker,
 * documents, pause and results. Plain DOM; no framework.
 */
(function () {
  'use strict';
  const NW = window.NW;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const fmtT = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const PCOL = ['#e0782f', '#6fe0c8', '#b48cff', '#e8d36a'];

  const UI = {
    g: null, tab: 'journal', contract: null, photos: [], notesRead: [],
    init(game) {
      this.g = game;
      $('clickToPlay').addEventListener('click', () => { if (this.g.inGame && !this.blocking()) this.g.input.lock(); });
      $('radioText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) this.g.net.act({ k: 'radio', text: v }); e.target.value = ''; this.closeRadio(); }
        if (e.key === 'Escape') this.closeRadio();
        e.stopPropagation();
      });
      addEventListener('keydown', (e) => this._keys(e));
    },
    _keys(e) {
      const g = this.g;
      if (!g.inGame) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code === 'Tab') { e.preventDefault(); if (!$('modal').hidden) return; this.toggleTablet(); }
      else if (e.code === 'KeyT' && !this.blocking()) { e.preventDefault(); this.openRadio(); }
      else if (e.code === 'KeyR' && !this.blocking()) g.player.altInteract();
      else if (e.code === 'Escape') { if (!$('tablet').hidden) this.toggleTablet(false); else if (!$('modal').hidden) this.closeModal(); }
      else if (e.code === 'KeyP' && !this.blocking()) this.pauseMenu();
      else if (e.code === 'KeyH' && !this.blocking() && g.tutorial) g.tutorial.toggle();
    },
    blocking() { return !$('tablet').hidden || !$('modal').hidden || !$('radioInput').hidden; },

    /* ================= MENUS ================= */
    menu(html) { $('menu').hidden = false; $('menuWrap').innerHTML = html; $('menu').scrollTop = 0; },
    hideMenu() { $('menu').hidden = true; },
    bind(sel, fn) { document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (ev) => { NW.Audio.init(NW.Save.data.settings.vol); NW.Audio.play('ui', null, 0.6, { ui: true, f: 900 }); fn(el, ev); })); },
    profileCard() {
      const S = NW.Save, rp = S.rankProgress();
      return `<div class="profile-card"><div class="muted" style="font-size:11px;color:var(--dim)">INVESTIGATOR</div>
        <div style="font-size:16px;font-weight:600">${esc(S.data.name)}</div>
        <div class="rk">Rank ${rp.rank} · ${S.rankTitle(rp.rank)}</div>
        <div class="bar"><i style="width:${Math.min(100, rp.cur / rp.need * 100)}%;background:var(--sig)"></i></div>
        <div style="font-size:11px;color:var(--bone2);margin-top:6px">${S.data.credits} research credits · ${S.data.missions} missions · ${S.data.solved} identified</div></div>`;
    },
    showMain() {
      this.g.leaveGame();
      this.menu(`${this.profileCard()}
        <div class="brand">NIGHTWATCH<br>PROTOCOL<em>FIELD INVESTIGATION UNIT</em></div>
        <p class="tagline">Enter places where something is still awake. Read the instruments, record the evidence, name what is there — and leave before it decides you have stayed too long.</p>
        <div class="mainnav">
          <button data-a="solo">Solo investigation<small>Take a contract alone</small></button>
          <button data-a="coop">Co-op investigation<small>Host or join a team of up to 4 (server required)</small></button>
          <button data-a="hq">Field HQ<small>Equipment stock, upgrades and cosmetics</small></button>
          <button data-a="manual">Field manual<small>Entities, evidence and equipment</small></button>
          <button data-a="howto">How to investigate<small>Controls and procedure</small></button>
          <button data-a="settings">Settings</button>
        </div>`);
      this.bind('[data-a]', (el) => {
        const a = el.dataset.a;
        if (a === 'solo') this.showContract('solo');
        else if (a === 'coop') this.showCoop();
        else if (a === 'hq') this.showHQ('stock');
        else if (a === 'manual') this.showManual();
        else if (a === 'howto') this.showHowTo();
        else if (a === 'settings') this.showSettings(() => this.showMain());
      });
      if (!NW.Save.data.seenTutorial) { NW.Save.data.seenTutorial = true; NW.Save.persist(); }
    },

    /* ---------- contract (location / difficulty / loadout) ---------- */
    defaultContract() {
      const S = NW.Save.data;
      return { location: S.lastLocation || 'observatory', difficulty: S.lastDifficulty || 'training', custom: { aggression: 0.5, reliability: 0.6, resources: 0.5, eventRate: 0.5, startComposure: 1, objectives: 3, hiddenEvidence: false }, loadout: S.lastLoadout || NW.Save.defaultLoadout(), tiers: Object.assign({}, S.tiers) };
    },
    contractHTML(c, editable) {
      const S = NW.Save;
      const locs = NW.LOCATIONS.map((l) => {
        const locked = !S.canUse(l.rank);
        return `<div class="card ${c.location === l.id ? 'sel' : ''} ${locked ? 'locked' : ''}" data-loc="${l.id}">
          <div class="meta">${esc(l.region)} · ${l.size}${locked ? ' · Rank ' + l.rank + ' required' : ''}</div>
          <h4>${esc(l.name)}</h4><p>${esc(l.blurb)}</p></div>`;
      }).join('');
      const diffs = NW.DIFFICULTIES.map((d) => {
        const locked = !S.canUse(d.rank);
        return `<div class="card ${c.difficulty === d.id ? 'sel' : ''} ${locked ? 'locked' : ''}" data-diff="${d.id}"><h4>${d.name}</h4><p>${esc(d.desc)}</p><div class="meta">Payout ×${d.reward}${locked ? ' · Rank ' + d.rank : ''}</div></div>`;
      }).join('') + `<div class="card ${c.difficulty === 'custom' ? 'sel' : ''}" data-diff="custom"><h4>Custom</h4><p>Tune aggression, evidence, resources, events, composure and objectives.</p><div class="meta">Payout ×0.5</div></div>`;
      const cu = c.custom;
      const custom = c.difficulty !== 'custom' ? '' : `<div class="panel"><h3>Custom investigation</h3>
        ${[['aggression', 'Entity aggression'], ['reliability', 'Evidence reliability'], ['resources', 'Player resources'], ['eventRate', 'Event frequency'], ['startComposure', 'Starting composure']].map(([k, n]) => `<div class="slider"><span>${n}</span><input type="range" min="0" max="1" step="0.05" value="${cu[k]}" data-cu="${k}" ${editable ? '' : 'disabled'}><b>${Math.round(cu[k] * 100)}%</b></div>`).join('')}
        <div class="slider"><span>Optional objectives</span><input type="range" min="1" max="5" step="1" value="${cu.objectives}" data-cu="objectives" ${editable ? '' : 'disabled'}><b>${cu.objectives}</b></div>
        <label style="font-size:12px"><input type="checkbox" data-cuh ${cu.hiddenEvidence ? 'checked' : ''} ${editable ? '' : 'disabled'}> One evidence type is never present</label></div>`;
      const load = NW.EQUIPMENT.filter((e) => e.id !== 'radio').map((e) => {
        const have = S.data.stock[e.id] || 0, n = c.loadout[e.id] || 0;
        return `<div class="load-row"><div class="nm">${esc(e.name)}<small>stock ${have}${(c.tiers[e.id] || 0) > 0 ? ' · ' + e.tiers[c.tiers[e.id]].label.split(' ')[0] + ' ' + e.tiers[c.tiers[e.id]].label.split(' ')[1] : ''}</small></div>
          <div class="stepper"><button data-ld="${e.id}" data-d="-1" ${editable ? '' : 'disabled'}>−</button><b>${n}</b><button data-ld="${e.id}" data-d="1" ${editable ? '' : 'disabled'}>+</button></div></div>`;
      }).join('');
      return `<div class="panel"><h3>Location</h3><div class="cards">${locs}</div></div>
        <div class="panel"><h3>Difficulty</h3><div class="cards">${diffs}</div></div>${custom}
        <div class="panel"><h3>Field unit loadout <span style="font-size:12px;color:var(--bone2)">— loaded from your HQ stock; a Personal Radio is issued to everyone</span></h3><div class="load-grid">${load}</div></div>`;
    },
    bindContract(c, rerender, editable) {
      if (!editable) return;
      this.bind('[data-loc]', (el) => { const l = NW.LOCATION_BY_ID[el.dataset.loc]; if (!NW.Save.canUse(l.rank)) return this.toast('Reach rank ' + l.rank + ' to unlock this location.', 'bad'); c.location = l.id; rerender(); });
      this.bind('[data-diff]', (el) => { const id = el.dataset.diff; const d = NW.DIFFICULTY_BY_ID[id]; if (d && !NW.Save.canUse(d.rank)) return this.toast('Reach rank ' + d.rank + ' to unlock ' + d.name + '.', 'bad'); c.difficulty = id; rerender(); });
      this.bind('[data-ld]', (el) => { const id = el.dataset.ld, d = +el.dataset.d; const max = NW.Save.data.stock[id] || 0; c.loadout[id] = Math.max(0, Math.min(max, (c.loadout[id] || 0) + d)); rerender(); });
      document.querySelectorAll('[data-cu]').forEach((el) => el.addEventListener('input', () => { c.custom[el.dataset.cu] = +el.value; el.nextElementSibling.textContent = el.dataset.cu === 'objectives' ? el.value : Math.round(el.value * 100) + '%'; if (this.onContractChange) this.onContractChange(); }));
      document.querySelectorAll('[data-cuh]').forEach((el) => el.addEventListener('change', () => { c.custom.hiddenEvidence = el.checked; if (this.onContractChange) this.onContractChange(); }));
    },
    saveContractPrefs(c) { const S = NW.Save.data; S.lastLocation = c.location; S.lastDifficulty = c.difficulty; S.lastLoadout = c.loadout; NW.Save.persist(); },
    showContract() {
      const c = this.contract = this.contract || this.defaultContract();
      c.tiers = Object.assign({}, NW.Save.data.tiers);
      this.onContractChange = null;
      const render = () => {
        this.menu(`<div class="screen-title">Solo contract <small><button class="btn" data-back>← Back</button></small></div>
          ${this.contractHTML(c, true)}
          <div class="actions"><button class="btn pri" data-go>Deploy to site ▸</button><button class="btn" data-hq>Field HQ</button></div>`);
        this.bindContract(c, render, true);
        this.bind('[data-back]', () => this.showMain());
        this.bind('[data-hq]', () => this.showHQ('stock', () => this.showContract()));
        this.bind('[data-go]', () => { this.saveContractPrefs(c); this.g.startSolo(JSON.parse(JSON.stringify(c))); });
      };
      render();
    },

    /* ---------- co-op ---------- */
    defaultServer() {
      const s = NW.Save.data.settings.serverUrl;
      if (s) return s;
      if (location.protocol.startsWith('http')) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
      return 'ws://localhost:' + NW.NET.DEFAULT_PORT + '/ws';
    },
    showCoop(err) {
      this.menu(`<div class="screen-title">Co-op investigation <small><button class="btn" data-back>← Back</button></small></div>
        <div class="panel"><h3>Server</h3>
          <p style="color:var(--bone2);font-size:12px;line-height:1.5">Co-op runs on the Nightwatch dedicated server (<code>node server/server.js</code>). The server runs the authoritative simulation; everyone's tablet, evidence, doors and entity are shared. Open the game from the server's address (e.g. <code>http://localhost:8787</code>) and the address below fills in automatically.</p>
          <div class="row"><input type="text" id="srv" class="grow" value="${esc(this.defaultServer())}"></div>
          ${err ? `<p class="bad">${esc(err)}</p>` : ''}</div>
        <div class="panel"><h3>Lobby</h3><div class="row"><button class="btn pri" data-host>Host new lobby</button><span style="color:var(--dim)">or</span><input type="text" id="code" maxlength="4" placeholder="CODE" style="width:90px;text-transform:uppercase"><button class="btn" data-join>Join</button></div></div>`);
      this.bind('[data-back]', () => this.showMain());
      const go = async (fn) => {
        const url = $('srv').value.trim();
        NW.Save.data.settings.serverUrl = url === this.defaultServer() ? NW.Save.data.settings.serverUrl : url; NW.Save.persist();
        try { await this.g.connectRemote(url); fn(); } catch (e) { this.showCoop(e.message || 'Connection failed'); }
      };
      this.bind('[data-host]', () => go(() => this.g.net.create()));
      this.bind('[data-join]', () => { const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) return this.toast('Enter the 4-letter lobby code.'); go(() => this.g.net.join(code)); });
    },
    showLobby(room) {
      this.room = room;
      const g = this.g, isHost = room.hostId === g.net.id;
      if (!room.settings || !room.settings.custom) {
        const base = this.defaultContract();
        room.settings = Object.assign(base, room.settings || {});
        if (isHost) { room.settings.loadout = base.loadout; room.settings.tiers = Object.assign({}, NW.Save.data.tiers); g.net.setLobby(room.settings); }
      }
      const c = room.settings;
      const me = room.players.find((p) => p.id === g.net.id) || {};
      const players = [0, 1, 2, 3].map((i) => {
        const p = room.players[i];
        if (!p) return `<div class="lp" style="opacity:.4">Open slot</div>`;
        return `<div class="lp ${p.ready ? 'ready' : ''}" style="border-left:4px solid ${PCOL[i]}"><div class="h">${p.id === room.hostId ? 'HOST' : 'INVESTIGATOR'}${p.id === g.net.id ? ' · YOU' : ''}</div><b>${esc(p.name)}</b><div style="font-size:11px;color:${p.ready ? 'var(--ok)' : 'var(--dim)'}">${p.ready ? 'READY' : 'not ready'}</div></div>`;
      }).join('');
      const render = () => {
        this.menu(`<div class="screen-title">Lobby <small><button class="btn" data-leave>Leave</button></small></div>
          <div class="panel row"><div><div style="font-size:11px;color:var(--dim)">ROOM CODE</div><div class="code">${esc(room.code)}</div></div><div class="grow" style="color:var(--bone2);font-size:12px">Share this code with up to three teammates. ${room.inGame ? '<b class="ok">Mission in progress — you will drop in.</b>' : ''}</div></div>
          <div class="panel"><h3>Team</h3><div class="lobby-players">${players}</div></div>
          ${this.contractHTML(c, isHost)}
          <div class="panel"><h3>Lobby chat</h3><div id="lchat" style="max-height:120px;overflow:auto;font-size:12px;color:var(--bone2)">${(this.lobbyChat || []).map((m) => '<div><b>' + esc(m.from) + ':</b> ' + esc(m.text) + '</div>').join('')}</div><div class="row" style="margin-top:6px"><input type="text" id="lmsg" class="grow" placeholder="Say something…"><button class="btn" data-say>Send</button></div></div>
          <div class="actions"><button class="btn" data-ready>${me.ready ? 'Unready' : 'Ready'}</button>${isHost ? `<button class="btn pri" data-start ${room.players.every((p) => p.ready || p.id === room.hostId) ? '' : 'disabled'}>Deploy team ▸</button>` : '<span style="color:var(--dim)">Waiting for host to deploy…</span>'}</div>`);
        this.onContractChange = () => g.net.setLobby(c);
        this.bindContract(c, () => { g.net.setLobby(c); }, isHost);
        this.bind('[data-leave]', () => { g.net.leave(); this.showCoop(); });
        this.bind('[data-ready]', () => g.net.ready(!me.ready));
        this.bind('[data-start]', () => { this.saveContractPrefs(c); g.net.start(); });
        const say = () => { const v = $('lmsg').value.trim(); if (v) g.net.chat(v); $('lmsg').value = ''; };
        this.bind('[data-say]', say);
        $('lmsg').addEventListener('keydown', (e) => { if (e.key === 'Enter') say(); });
      };
      render();
    },
    lobbyChatMsg(m) { (this.lobbyChat = this.lobbyChat || []).push(m); const el = $('lchat'); if (el) { el.innerHTML += '<div><b>' + esc(m.from) + ':</b> ' + esc(m.text) + '</div>'; el.scrollTop = 1e6; } },

    /* ---------- HQ ---------- */
    showHQ(tab, back) {
      const S = NW.Save, d = S.data;
      back = back || (() => this.showMain());
      const tabs = [['stock', 'Equipment stock'], ['upgrades', 'Upgrades'], ['cosmetics', 'Cosmetics'], ['record', 'Service record']];
      let body = '';
      if (tab === 'stock') {
        body = `<p style="color:var(--bone2);font-size:12px">Equipment you take into the field comes from this stock. Items carried by an incapacitated investigator are lost. Sell-back returns half the price.</p><div class="shop">` + NW.EQUIPMENT.filter((e) => e.id !== 'radio').map((e) => {
          const lock = !S.canUse(e.rank);
          return `<div class="it"><div class="row"><h4 class="grow">${esc(e.name)}</h4><b>${d.stock[e.id] || 0}</b></div><p>${esc(e.desc)}</p>
            <div class="row"><button class="btn" data-buy="${e.id}" ${lock || d.credits < e.price ? 'disabled' : ''}>Buy · ${e.price} cr</button><button class="btn" data-sell="${e.id}" ${(d.stock[e.id] || 0) ? '' : 'disabled'}>Sell</button>${lock ? '<span class="bad" style="font-size:11px">Rank ' + e.rank + '</span>' : ''}</div></div>`;
        }).join('') + '</div>';
      } else if (tab === 'upgrades') {
        body = `<p style="color:var(--bone2);font-size:12px">Upgrades improve convenience — range, capacity, precision. Every entity can be identified with base equipment.</p><div class="shop">` + NW.EQUIPMENT.filter((e) => e.tiers && e.tiers.length > 1).map((e) => {
          const cur = d.tiers[e.id] || 0, next = e.tiers[cur + 1];
          return `<div class="it"><h4>${esc(e.name)}</h4><p>Current: <b>${esc(e.tiers[cur].label)}</b>${next ? '<br>Next: ' + esc(next.label) : '<br><span class="ok">Fully upgraded</span>'}</p>
            ${next ? `<button class="btn" data-up="${e.id}" ${d.credits < next.cost || !S.canUse(next.rank) ? 'disabled' : ''}>Upgrade · ${next.cost} cr${!S.canUse(next.rank) ? ' · Rank ' + next.rank : ''}</button>` : ''}</div>`;
        }).join('') + '</div>';
      } else if (tab === 'cosmetics') {
        body = `<div class="panel"><h3>Callsign</h3><div class="row"><input type="text" id="cname" value="${esc(d.name)}" maxlength="20"><button class="btn" data-name>Save</button></div></div>` + Object.keys(NW.COSMETICS).map((cat) => `<div class="panel"><h3>${{ suit: 'Field suit', torch: 'Head torch', badge: 'Shoulder patch' }[cat]}</h3><div class="cards">` + NW.COSMETICS[cat].map((c) => {
          const owned = S.ownsCosmetic(cat, c.id), sel = d.cosmetics[cat] === c.id, lock = !S.canUse(c.rank);
          return `<div class="card ${sel ? 'sel' : ''} ${lock && !owned ? 'locked' : ''}" data-cos="${cat}:${c.id}"><h4>${c.color ? `<span style="display:inline-block;width:14px;height:14px;background:${c.color};margin-right:6px;vertical-align:-2px"></span>` : ''}${esc(c.name)}</h4><div class="meta">${owned ? (sel ? 'Equipped' : 'Owned') : c.price + ' cr' + (lock ? ' · Rank ' + c.rank : '')}</div></div>`;
        }).join('') + '</div></div>').join('');
      } else {
        body = `<div class="kv"><span>Missions</span><b>${d.missions}</b><span>Entities identified</span><b>${d.solved}</b><span>Times incapacitated</span><b>${d.deaths}</b><span>Experience</span><b>${d.xp} XP</b></div><h3 style="margin-top:16px">Recent investigations</h3>` +
          (d.history.length ? d.history.map((h) => `<div style="font-size:12px;border-bottom:1px solid var(--line);padding:4px 0">${new Date(h.at).toLocaleDateString()} · ${esc((NW.LOCATION_BY_ID[h.loc] || {}).name)} · ${h.diff} · ${esc((NW.ENTITY_BY_ID[h.entity] || {}).name)} · <span class="${h.correct ? 'ok' : 'bad'}">${h.correct ? 'identified' : 'misidentified'}</span> · +${h.credits} cr${h.alive ? '' : ' · <span class="bad">incapacitated</span>'}</div>`).join('') : '<p style="color:var(--dim)">No field work yet.</p>') +
          `<div class="actions"><button class="btn danger" data-reset>Reset profile</button></div>`;
      }
      this.menu(`<div class="screen-title">Field HQ <small>${d.credits} credits · <button class="btn" data-back>← Back</button></small></div>
        <div class="row" style="gap:4px;margin-bottom:12px">${tabs.map(([id, n]) => `<button class="btn ${tab === id ? 'pri' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>${body}`);
      const re = () => this.showHQ(tab, back);
      this.bind('[data-back]', back);
      this.bind('[data-tab]', (el) => this.showHQ(el.dataset.tab, back));
      this.bind('[data-buy]', (el) => { S.buy(el.dataset.buy); re(); });
      this.bind('[data-sell]', (el) => { S.sell(el.dataset.sell); re(); });
      this.bind('[data-up]', (el) => { S.upgrade(el.dataset.up); re(); });
      this.bind('[data-cos]', (el) => { const [cat, id] = el.dataset.cos.split(':'); if (!S.buyCosmetic(cat, id)) this.toast('Not enough credits or rank.', 'bad'); re(); });
      this.bind('[data-name]', () => { d.name = $('cname').value.trim().slice(0, 20) || d.name; S.persist(); re(); });
      this.bind('[data-reset]', () => { if (confirm('Erase all progress?')) { S.reset(); this.contract = null; re(); } });
    },

    /* ---------- manual ---------- */
    manualEntity(e) {
      return `<h3>${esc(e.name)} <span class="threat">${'■'.repeat(e.threat)}${'□'.repeat(5 - e.threat)}</span></h3>
        <p><i>${esc(e.blurb)}</i></p>
        <div class="kv"><span>Evidence</span><span>${e.evidence.map((x) => NW.EVIDENCE_BY_ID[x].name).join(' · ')}</span>
        <span>Behaviour</span><span>${esc(e.behaviour)}</span><span>Prefers</span><span>${esc(e.prefers)}</span>
        <span>Strengths</span><span>${esc(e.strengths)}</span><span>Weaknesses</span><span>${esc(e.weaknesses)}</span>
        <span>Pursuit senses</span><span>${e.senses.join(', ')}</span><span>Pursuit speed</span><span>${e.speed.hunt.toFixed(1)}–${e.speed.huntMax.toFixed(1)} m/s · begins at ≤${e.huntAt}% team composure</span>
        <span>Field tells</span><span>${e.tells.map(esc).join('<br>')}</span></div>`;
    },
    showManual(sel) {
      sel = sel || 'evidence';
      const list = [['evidence', 'Evidence categories'], ['equipment', 'Equipment'], ['composure', 'Field Composure'], ...NW.ENTITIES.map((e) => [e.id, e.name])];
      let body = '';
      if (sel === 'evidence') body = '<h3>Evidence categories</h3>' + NW.EVIDENCE.map((e) => `<h4 style="color:${e.color}">${e.name}</h4><p style="font-size:12px;color:var(--bone2)">${esc(e.hint)}</p>`).join('') + '<p style="font-size:12px;color:var(--bone2)">Every entity presents exactly three categories. On Nightmare, one of them never appears — use behaviour tells to separate the remaining candidates. On Professional and above, instruments occasionally give isolated false readings: confirm twice.</p>';
      else if (sel === 'equipment') body = '<h3>Equipment</h3>' + NW.EQUIPMENT.map((e) => `<h4>${esc(e.name)}</h4><p style="font-size:12px;color:var(--bone2)">${esc(e.desc)}${e.evidence ? '<br><b>Confirms:</b> ' + NW.EVIDENCE_BY_ID[e.evidence].name : ''}</p>`).join('');
      else if (sel === 'composure') body = `<h3>Field Composure</h3><p style="font-size:12px;color:var(--bone2);line-height:1.6">Composure (0–100) is each investigator's psychological stability. It falls in darkness, faster when alone, near the entity, when witnessing manifestations and pursuits, and when targeted. Lit rooms, Emergency Lights, staying together and time at the Field Unit slow or restore it; Stabiliser Tablets restore 35.<br><br>Below 50, sound dulls and colour drains. Below 35, investigators experience <b>false events</b>: voices on the radio, figures, footsteps and instrument glitches that others don't see. Entities begin pursuits when the team's average composure drops below their threshold.</p>`;
      else body = this.manualEntity(NW.ENTITY_BY_ID[sel]);
      this.menu(`<div class="screen-title">Field manual <small><button class="btn" data-back>← Back</button></small></div>
        <div class="manual"><div class="panel list">${list.map(([id, n]) => `<button class="${sel === id ? 'on' : ''}" data-m="${id}">${esc(n)}</button>`).join('')}</div><div class="panel">${body}</div></div>`);
      this.bind('[data-back]', () => this.showMain());
      this.bind('[data-m]', (el) => this.showManual(el.dataset.m));
    },
    showHowTo() {
      this.menu(`<div class="screen-title">How to investigate <small><button class="btn" data-back>← Back</button></small></div>
        <div class="panel"><h3>Procedure</h3><ol style="line-height:1.7;color:var(--bone2);font-size:13px">
          <li>At the <b>Field Unit</b> (the van), press <b>E</b> to open the equipment locker and take tools (4 slots; your radio fills one).</li>
          <li>Restore site power at the generator if the building is dark. Turn on lights to protect your composure.</li>
          <li>Find the <b>entity's room</b>: cold readings, EM activity, sounds and disturbed objects cluster there.</li>
          <li>Use each instrument to test for evidence. Place motion nodes, slates and pressure monitors in active rooms and come back.</li>
          <li>Open the <b>tablet (TAB)</b>: mark evidence as confirmed or ruled out; the entity list narrows itself. Select your identification.</li>
          <li>Every site hides a <b>relic</b> tied to the haunting. Using it (E) costs composure and may provoke a pursuit — but if it doesn't, it rules out one evidence type for you. Three uses.</li>
          <li>Televisions, monitors and radios switch themselves on near the entity. Static is a sign it is close.</li>
          <li>When composure drops, the entity can begin a <b>pursuit</b>. The exit locks. Break line of sight, close doors, hide (<b>E</b> on lockers/wardrobes) — or use its weakness.</li>
          <li>Return to the Field Unit and choose <b>End investigation</b>. Correct identification and objectives pay research credits.</li></ol></div>
        <div class="panel"><h3>Controls</h3><div class="keys">
          <kbd>W A S D</kbd><span>Move · <kbd>Shift</kbd> sprint · <kbd>C</kbd> crouch</span>
          <kbd>Mouse</kbd><span>Look · <kbd>LMB</kbd> use / toggle / place · <kbd>RMB</kbd> raise (lens, thermal)</span>
          <kbd>E</kbd><span>Interact: doors, switches, hiding, pick up, swab (hold)</span>
          <kbd>R</kbd><span>Activate a placed Signal Beacon / Emergency Light</span>
          <kbd>1–4 / wheel</kbd><span>Select slot · <kbd>G</kbd> drop</span>
          <kbd>F</kbd><span>Head torch</span>
          <kbd>Q</kbd><span>Ask a question (into the recorder if it is running)</span>
          <kbd>V</kbd><span>Call out aloud</span>
          <kbd>T</kbd><span>Transmit on the personal radio</span>
          <kbd>TAB</kbd><span>Investigation tablet · <kbd>P</kbd> pause · <kbd>ESC</kbd> release mouse</span></div></div>`);
      this.bind('[data-back]', () => this.showMain());
    },
    showSettings(back) {
      const s = NW.Save.data.settings;
      this.menu(`<div class="screen-title">Settings <small><button class="btn" data-back>← Back</button></small></div>
        <div class="panel">
          <div class="slider"><span>Mouse sensitivity</span><input type="range" min="0.2" max="3" step="0.05" value="${s.sens}" data-s="sens"><b>${s.sens}</b></div>
          <div class="slider"><span>Master volume</span><input type="range" min="0" max="1" step="0.05" value="${s.vol}" data-s="vol"><b>${s.vol}</b></div>
          <div class="slider"><span>Field of view</span><input type="range" min="60" max="95" step="1" value="${s.fov}" data-s="fov"><b>${s.fov}</b></div>
          <div class="slider"><span>Graphics quality</span><select data-sq><option ${s.quality === 'low' ? 'selected' : ''}>low</option><option ${s.quality === 'medium' ? 'selected' : ''}>medium</option><option ${s.quality === 'high' ? 'selected' : ''}>high</option></select><b></b></div>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="invert" ${s.invert ? 'checked' : ''}> Invert mouse Y</label>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="tts" ${s.tts ? 'checked' : ''}> Speak spectral voices with the browser speech engine</label>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="voice" ${s.voice ? 'checked' : ''}> Co-op voice chat (microphone): proximity voice, hold <b>B</b> for radio</label>
          <div class="slider"><span>Voice ICE servers</span><input type="text" data-st="ice" value="${esc(s.ice || '')}" placeholder="optional, e.g. stun:stun.example.org:3478"><b></b></div>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="mic" ${s.mic ? 'checked' : ''}> Use microphone: speaking loudly counts as calling out (entities may hear you)</label>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="briefing" ${s.briefing !== false ? 'checked' : ''}> Field briefing (guided steps) on Training</label>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="showFps" ${s.showFps ? 'checked' : ''}> Show frame rate</label>
          <label style="display:block;margin:8px 0;font-size:12px"><input type="checkbox" data-sb="unlockAll" ${s.unlockAll ? 'checked' : ''}> Sandbox: unlock all locations, difficulties and equipment ranks</label>
        </div>`);
      this.bind('[data-back]', back);
      document.querySelectorAll('[data-s]').forEach((el) => el.addEventListener('input', () => { s[el.dataset.s] = +el.value; el.nextElementSibling.textContent = el.value; NW.Save.persist(); if (el.dataset.s === 'vol') NW.Audio.setVolume(+el.value); }));
      document.querySelectorAll('[data-sb]').forEach((el) => el.addEventListener('change', () => { s[el.dataset.sb] = el.checked; NW.Save.persist(); if (el.dataset.sb === 'mic' && el.checked) this.g.enableMic(); }));
      document.querySelectorAll('[data-st]').forEach((el) => el.addEventListener('change', () => { s[el.dataset.st] = el.value.trim(); NW.Save.persist(); }));
      document.querySelector('[data-sq]').addEventListener('change', (e) => { s.quality = e.target.value; NW.Save.persist(); this.toast('Quality applies on the next deployment.'); });
    },

    /* ================= IN-GAME ================= */
    enterGame() { this.hideMenu(); $('hud').hidden = false; this.photos = []; this.notesRead = []; $('radioFeed').innerHTML = ''; $('toasts').innerHTML = ''; this.tab = 'journal'; },
    exitGame() { $('hud').hidden = true; $('tablet').hidden = true; $('modal').hidden = true; $('clickToPlay').hidden = true; $('hideSlats').hidden = true; $('spectate').hidden = true; $('downFx').style.opacity = 0; },
    prompt(t) { const el = $('prompt'); if (el._t !== t) { el._t = t; el.textContent = t || ''; } },
    progress(label, k) { const el = $('progress'); if (label == null) { el.hidden = true; return; } el.hidden = false; $('progressLbl').textContent = label; $('progressFill').style.width = Math.min(100, k * 100) + '%'; },
    toast(text, cls) { const el = document.createElement('div'); el.className = 't ' + (cls || ''); el.textContent = text; $('toasts').appendChild(el); setTimeout(() => el.remove(), 5200); },
    subtitle(text, sec) { const el = $('subtitle'); el.textContent = text; clearTimeout(this._subT); this._subT = setTimeout(() => (el.textContent = ''), (sec || 3) * 1000); },
    radioLine(name, text, jam) {
      const el = document.createElement('div'); el.className = 'rl' + (jam ? ' jam' : '');
      el.innerHTML = '<b>' + esc(name) + '</b>' + esc(text);
      $('radioFeed').appendChild(el); setTimeout(() => el.remove(), 9200);
      while ($('radioFeed').children.length > 6) $('radioFeed').firstChild.remove();
    },
    spectating(name) { const el = $('spectate'); el.hidden = false; el.textContent = 'INCAPACITATED — spectating ' + name + ' (click to switch)'; },
    openRadio() {
      const me = this.g.me();
      if (!me || !me.alive) return this.toast('You cannot transmit.');
      if (!me.inv.some((i) => i && this.g.state.items[i] && this.g.state.items[i].type === 'radio')) return this.toast('You are not carrying a radio.');
      $('radioInput').hidden = false; this.g.input.unlock(); setTimeout(() => $('radioText').focus(), 0);
    },
    closeRadio() { $('radioInput').hidden = true; $('radioText').blur(); this.g.input.lock(); },

    updateHUD() {
      const g = this.g, st = g.state, me = g.me();
      if (!st || !me) return;
      // team
      const ps = Object.values(st.players);
      const teamHTML = ps.map((p, i) => `<div class="tm ${p.alive ? '' : 'down'}" style="--c:${PCOL[i % 4]}"><span class="rad ${g.time - (g.speakingAt[p.id] || -9) < 1.2 ? 'on' : ''}"></span>${esc(p.name)}${p.id === g.myId ? ' (you)' : ''}</div>`).join('');
      if ($('team')._h !== teamHTML) { $('team')._h = teamHTML; $('team').innerHTML = teamHTML; }
      $('chipPower').textContent = st.power ? 'POWER ON' : 'POWER OFF';
      $('chipPower').className = 'chip' + (st.power ? '' : ' warn');
      const fc = $('chipFps'); fc.hidden = !NW.Save.data.settings.showFps; if (!fc.hidden) fc.textContent = Math.round(g.fps) + ' FPS';
      $('chipTime').textContent = fmtT(st.t) + (st.t < st.diff.setup ? ' · setup' : '');
      // slots
      const sl = me.inv.map((iid, i) => {
        const it = iid && st.items[iid];
        const def = it && NW.EQUIPMENT_BY_ID[it.type];
        let s = '';
        if (it) { if (it.battery != null) s = Math.ceil(it.battery) + 's'; else if (it.charges != null) s = '×' + it.charges; if (it.on) s += ' ON'; }
        return `<div class="sl ${g.player.slot === i ? 'sel' : ''}"><span class="k">${i + 1}</span><span class="n">${def ? def.short : '—'}</span><span class="s">${s}</span></div>`;
      }).join('');
      if ($('slots')._h !== sl) { $('slots')._h = sl; $('slots').innerHTML = sl; }
      const it = g.equip.held();
      const hints = { scanner: 'LMB on/off', thermal: 'LMB on/off · hold RMB to view', recorder: 'LMB on/off · Q ask a question', samplekit: 'LMB UV lamp · hold E on a touch point', lens: 'Hold RMB to frame · LMB photo', motion: 'LMB place on floor', pressure: 'Reads in hand · LMB place', slate: 'LMB place', radio: 'Hold LMB scan · T transmit', beacon: 'LMB place · R activate', elight: 'LMB place · R toggle', spike: 'LMB drive into floor', flare: 'LMB strike & throw (pursuits)', tablets: 'LMB take' };
      $('heldHint').textContent = it ? NW.EQUIPMENT_BY_ID[it.type].name + ' — ' + (hints[it.type] || '') + ' · G drop' : 'F torch · E interact · TAB tablet';
      $('stamina').firstElementChild.style.width = (g.player.stamina * 100) + '%';
      $('stamina').style.opacity = g.player.stamina < 0.99 ? 1 : 0;
      $('onAir').hidden = !(g.voice && g.voice.ptt);
      $('huntEdge').className = st.hunting && g.entityNear(g.camera.position, me.f, 14) ? 'on' : '';
      $('hideSlats').hidden = me.hidden == null;
      if (me.alive) $('spectate').hidden = true;
      $('downFx').style.opacity = me.alive ? 0 : 0.7;
      $('clickToPlay').hidden = g.input.locked || this.blocking() || !g.inGame;
      if (!$('tablet').hidden) { this._tabT = (this._tabT || 0) + 1; if (this._tabT % 30 === 0) this.renderTablet(); $('tabClock').textContent = fmtT(st.t); }
    },

    /* ---------- tablet ---------- */
    toggleTablet(force) {
      const el = $('tablet'); const show = force == null ? el.hidden : force;
      el.hidden = !show;
      if (show) { this.g.input.unlock(); this.renderTablet(); NW.Audio.play('ui', null, 0.5, { ui: true, f: 1200 }); } else this.g.input.lock();
    },
    possible(ent, j, hidden) {
      for (const ev in j.ev) {
        if (j.ev[ev] === 1 && ent.evidence.indexOf(ev) < 0) return false;
        if (j.ev[ev] === 2 && ent.evidence.indexOf(ev) >= 0) return false;
      }
      void hidden;
      return true;
    },
    renderTablet() {
      const g = this.g, st = g.state, me = g.me();
      const tabs = [['journal', 'Journal'], ['database', 'Entity database'], ['objectives', 'Objectives'], ['team', 'Team'], ['mission', 'Mission'], ['photos', 'Photos'], ['docs', 'Documents'], ['log', 'Activity log']];
      $('tabNav').innerHTML = tabs.map(([id, n]) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}">${n}</button>`).join('');
      $('tabNav').querySelectorAll('button').forEach((b) => b.onclick = () => { this.tab = b.dataset.tab; this.renderTablet(); });
      const j = st.journal;
      let h = '';
      if (this.tab === 'journal') {
        const confirmed = Object.keys(j.ev).filter((k) => j.ev[k] === 1).length;
        h = `<h3>Evidence journal</h3><p class="muted">Click to cycle: unknown → confirmed → ruled out. Shared with the whole team.${st.diff.hiddenEvidence ? ' <b>Nightmare: one of the entity\'s evidence types will never appear.</b>' : ''}</p>
          <div class="ev-grid">${NW.EVIDENCE.map((e) => `<div class="ev c${j.ev[e.id] || 0}" data-ev="${e.id}"><div class="nm" style="color:${e.color === '#f0e6c8' ? '#6b5d3a' : ''}">${e.name}</div><div class="tl">${NW.EQUIPMENT_BY_ID[e.tool].name}</div></div>`).join('')}</div>
          <h4>Possible entities <span class="muted">(${confirmed}/3 confirmed — click an entity to strike it out, double-click to select as your identification)</span></h4>
          <div class="ent-list">${NW.ENTITIES.map((e) => { const ok = this.possible(e, j); return `<div class="ent ${ok ? '' : 'out'} ${j.struck[e.id] ? 'struck' : ''} ${j.guess === e.id ? 'guess' : ''}" data-ent="${e.id}"><b>${esc(e.name)}</b><div class="tags">${e.evidence.map((x) => `<span class="tag ${j.ev[x] === 1 ? 'hit' : j.ev[x] === 2 ? 'miss' : ''}">${NW.EVIDENCE_BY_ID[x].short}</span>`).join('')}</div></div>`; }).join('')}</div>
          <p style="margin-top:10px">Identification: <b>${j.guess ? esc(NW.ENTITY_BY_ID[j.guess].name) : '— none selected —'}</b></p>`;
      } else if (this.tab === 'database') {
        const sel = this._dbSel || NW.ENTITIES[0].id;
        h = `<div style="display:grid;grid-template-columns:200px 1fr;gap:14px"><div>${NW.ENTITIES.map((e) => `<div class="ent ${sel === e.id ? 'guess' : ''} ${this.possible(e, j) ? '' : 'out'}" data-db="${e.id}" style="margin-bottom:4px">${esc(e.name)}</div>`).join('')}</div><div>${this.manualEntity(NW.ENTITY_BY_ID[sel])}</div></div>`;
      } else if (this.tab === 'objectives') {
        h = `<h3>Objectives</h3><p><b>Primary:</b> identify the entity and record it in the journal, then end the investigation at the Field Unit.</p>` +
          st.objectives.map((o) => `<div class="row" style="padding:5px 0;border-bottom:1px solid rgba(0,0,0,.15)"><span style="font-size:18px">${o.done ? '☑' : '☐'}</span><span class="grow">${esc(o.name)}</span><span class="muted">+${o.reward} cr</span></div>`).join('');
      } else if (this.tab === 'team') {
        h = '<h3>Team status</h3>' + Object.values(st.players).map((p) => {
          const room = g.world.roomIdAt(p.f, p.x, p.z);
          return `<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,.15)"><div class="row"><b class="grow">${esc(p.name)}${p.id === g.myId ? ' (you)' : ''}</b><span>${p.alive ? (p.hidden != null ? 'hiding' : 'active') : '<span style="color:#9a3b2c">INCAPACITATED</span>'}</span></div>
            <div class="row"><span style="width:150px">Field composure</span><div class="meter grow"><i style="width:${p.composure}%;background:${p.composure < 35 ? '#9a3b2c' : p.composure < 60 ? '#b88a2c' : '#2c6a7a'}"></i></div><b style="width:40px;text-align:right">${Math.round(p.composure)}</b></div>
            <div class="muted">Location: ${room >= 0 ? esc(g.world.rooms[room].name) : 'unknown'}</div></div>`;
        }).join('');
      } else if (this.tab === 'mission') {
        const team = Object.values(st.players).filter((p) => p.alive);
        const avg = team.length ? team.reduce((a, p) => a + p.composure, 0) / team.length : 0;
        h = `<h3>${esc(g.world.loc.name)}</h3><p class="muted">${esc(g.world.loc.story)}</p>
          <div class="kv"><span>Difficulty</span><b>${esc(st.diff.name)}</b><span>Elapsed</span><b>${fmtT(st.t)}</b>
          <span>Setup window</span><b>${st.t < st.diff.setup ? fmtT(st.diff.setup - st.t) + ' remaining (no pursuits)' : 'over — pursuits possible'}</b>
          <span>Site power</span><b>${st.power ? 'ON' : 'OFF'}</b><span>Pursuits so far</span><b>${st.huntCount}</b>
          <span>Team composure</span><b>${Math.round(avg)}%</b><span>Your composure</span><b>${Math.round(me.composure)}%</b></div>
          <div class="actions"><button class="btn" data-pause>Pause / settings</button></div>`;
      } else if (this.tab === 'photos') {
        h = `<h3>Photographs</h3><p class="muted">Team photo log: ${st.photos.length} frame(s). ${st.photos.filter((p) => p.entity).length} show the entity, ${st.photos.filter((p) => p.distortion).length} show an optical distortion.</p><div class="photo-grid">${this.photos.map((p) => `<figure><img src="${p.src}"><figcaption>${p.entity ? 'ENTITY · ' : ''}${p.distortion ? 'OPTICAL DISTORTION · ' : ''}${fmtT(p.t)}</figcaption></figure>`).join('') || '<p class="muted">Your photos appear here.</p>'}</div>`;
      } else if (this.tab === 'docs') {
        const got = st.notes.filter((n) => n.takenBy);
        h = `<h3>Recovered documents (${got.length}/${st.notes.length})</h3>` + (got.map((n) => `<h4>${esc(n.title)}</h4><p style="font-family:Georgia,serif">${esc(n.text)}</p><p class="muted">recovered by ${esc(n.takenBy)}</p>`).join('') || '<p class="muted">Search the site for notes, logs and papers.</p>');
      } else if (this.tab === 'log') {
        h = '<h3>Activity log</h3>' + st.log.slice().reverse().map((l) => `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.1)"><span class="muted">${fmtT(l.t)}</span> ${esc(l.text)}</div>`).join('');
      }
      $('tabBody').innerHTML = h;
      $('tabBody').querySelectorAll('[data-ev]').forEach((el) => el.onclick = () => { const id = el.dataset.ev; g.net.act({ k: 'journal', ev: id, val: ((j.ev[id] || 0) + 1) % 3 }); setTimeout(() => this.renderTablet(), 80); });
      $('tabBody').querySelectorAll('[data-ent]').forEach((el) => {
        el.onclick = () => { g.net.act({ k: 'journal', strike: el.dataset.ent }); setTimeout(() => this.renderTablet(), 80); };
        el.ondblclick = () => { g.net.act({ k: 'journal', guess: j.guess === el.dataset.ent ? null : el.dataset.ent }); setTimeout(() => this.renderTablet(), 80); };
      });
      $('tabBody').querySelectorAll('[data-db]').forEach((el) => el.onclick = () => { this._dbSel = el.dataset.db; this.renderTablet(); });
      $('tabBody').querySelectorAll('[data-pause]').forEach((el) => el.onclick = () => { this.toggleTablet(false); this.pauseMenu(); });
    },

    /* ---------- modal: locker, notes, pause ---------- */
    modal(html) { $('modal').hidden = false; $('modalCard').innerHTML = html; this.g.input.unlock(); },
    closeModal() { $('modal').hidden = true; if (this.g.inGame) this.g.input.lock(); if (this.g.net && this.g.net.kind === 'local') this.g.net.paused = false; },
    openLocker() {
      const g = this.g, st = g.state, me = g.me();
      if (g.tutorial) g.tutorial.note('lockerOpened');
      const counts = {};
      for (const it of Object.values(st.items)) if (it.inTruck) counts[it.type] = (counts[it.type] || 0) + 1;
      const free = me.inv.filter((x) => x == null).length;
      const held = g.equip.held();
      const j = st.journal;
      this.modal(`<h2>Field Unit</h2>
        <p style="color:var(--bone2);font-size:12px">Free slots: ${free}/4. ${held ? 'Holding: ' + NW.EQUIPMENT_BY_ID[held.type].name : ''}</p>
        <div class="locker">${NW.EQUIPMENT.filter((e) => counts[e.id]).map((e) => `<button data-take="${e.id}" ${free ? '' : 'disabled'}>${esc(e.name)}<small>${counts[e.id]} in locker</small></button>`).join('') || '<p style="color:var(--dim)">The locker is empty.</p>'}</div>
        <div class="actions">${held ? `<button class="btn" data-stow>Return ${esc(NW.EQUIPMENT_BY_ID[held.type].short)} to locker</button>` : ''}<button class="btn" data-tab>Open tablet</button><button class="btn" data-close>Close</button></div>
        <hr style="border-color:var(--line);margin:16px 0">
        <h3 style="font-family:var(--head);margin:0 0 6px">End investigation</h3>
        <p style="font-size:12px;color:var(--bone2)">Identification: <b>${j.guess ? esc(NW.ENTITY_BY_ID[j.guess].name) : 'none selected'}</b>. Anyone still inside will be left behind (counted as incapacitated).</p>
        <button class="btn danger" data-end>End investigation and leave</button>`);
      this.bind('[data-take]', (el) => { g.net.act({ k: 'take', type: el.dataset.take }); setTimeout(() => this.openLocker(), 80); });
      this.bind('[data-stow]', () => { g.net.act({ k: 'stow', item: held.id }); setTimeout(() => this.openLocker(), 80); });
      this.bind('[data-close]', () => this.closeModal());
      this.bind('[data-tab]', () => { this.closeModal(); this.toggleTablet(true); });
      this.bind('[data-end]', () => { if (!j.guess && !confirm('No entity identified. Leave anyway?')) return; g.net.act({ k: 'end' }); this.closeModal(); });
    },
    openNote(n) {
      this.modal(`<h2>${esc(n.title)}</h2><div class="paper">${esc(n.text)}</div><div class="actions"><button class="btn" data-close>Close</button></div>`);
      this.bind('[data-close]', () => this.closeModal());
    },
    pauseMenu() {
      const g = this.g;
      if (g.net.kind === 'local') g.net.paused = true;
      this.modal(`<h2>${g.net.kind === 'local' ? 'Paused' : 'Menu'}</h2><p style="color:var(--bone2);font-size:12px">${g.net.kind === 'local' ? 'The investigation is paused.' : 'Co-op sessions keep running while this menu is open.'}</p>
        <div class="actions" style="flex-direction:column;align-items:stretch">
          <button class="btn pri" data-resume>Resume</button><button class="btn" data-howto>Controls</button>
          <button class="btn" data-sens>Mouse sensitivity: <input type="range" min="0.2" max="3" step="0.05" value="${NW.Save.data.settings.sens}" id="psens" style="vertical-align:middle"></button>
          <button class="btn danger" data-quit>Abandon investigation</button></div>`);
      $('psens').addEventListener('input', (e) => { NW.Save.data.settings.sens = +e.target.value; NW.Save.persist(); });
      this.bind('[data-resume]', () => this.closeModal());
      this.bind('[data-howto]', () => this.modal(`<h2>Controls</h2><div class="keys"><kbd>WASD</kbd><span>move · Shift sprint · C crouch</span><kbd>E</kbd><span>interact / hide / pick up / hold to swab</span><kbd>LMB/RMB</kbd><span>use / raise</span><kbd>R</kbd><span>activate placed beacon or light</span><kbd>F</kbd><span>torch</span><kbd>Q</kbd><span>ask question</span><kbd>V</kbd><span>call out</span><kbd>T</kbd><span>radio</span><kbd>G</kbd><span>drop</span><kbd>1-4</kbd><span>slots</span><kbd>TAB</kbd><span>tablet</span></div><div class="actions"><button class="btn" data-back>Back</button></div>`) || this.bind('[data-back]', () => this.pauseMenu()));
      this.bind('[data-quit]', () => { if (confirm('Abandon the investigation? You will be counted as incapacitated.')) { this.closeModal(); g.abandon(); } });
    },

    /* ---------- results ---------- */
    showResults(r, sum) {
      const ent = NW.ENTITY_BY_ID[r.entity];
      const loc = NW.LOCATION_BY_ID[r.location];
      const lost = Object.keys(sum.lost || {}).map((k) => sum.lost[k] + '× ' + NW.EQUIPMENT_BY_ID[k].name).join(', ');
      this.menu(`<div class="screen-title">Investigation report <small>${esc(loc.name)} · ${esc(r.difficulty)}</small></div>
        <div class="panel"><p class="muted" style="margin:0;color:var(--dim)">THE ENTITY WAS</p><p class="result-big">${esc(ent.name)}</p>
          <p>Your identification: <b class="${r.correct ? 'ok' : 'bad'}">${r.guess ? esc(NW.ENTITY_BY_ID[r.guess].name) : 'none'}</b> — ${r.correct ? 'correct.' : 'incorrect.'}</p>
          ${r.hiddenEvidence && r.hiddenEvidence.length ? `<p class="muted" style="color:var(--bone2)">Withheld evidence this run: ${r.hiddenEvidence.map((x) => NW.EVIDENCE_BY_ID[x].name).join(', ')}</p>` : ''}
          <p style="color:var(--bone2)">${esc(ent.behaviour)}</p>
          <p>${r.reason === 'all_down' ? '<b class="bad">Every investigator was incapacitated. The mission failed.</b>' : r.reason === 'abandon' ? '<b class="bad">Investigation abandoned.</b>' : 'The team left the site after ' + fmtT(r.time) + '.'}</p></div>
        <div class="panel"><h3>Objectives</h3>${r.objectives.map((o) => `<div>${o.done ? '☑' : '☐'} ${esc(o.name)} <span style="color:var(--dim)">+${o.reward}</span></div>`).join('')}</div>
        <div class="panel"><h3>Team</h3>${Object.values(r.perPlayer).map((p) => `<div>${esc(p.name)} — ${p.alive ? '<span class="ok">returned</span>' : p.leftBehind ? '<span class="bad">left behind</span>' : '<span class="bad">incapacitated</span>'} · +${p.credits} cr · +${p.xp} XP</div>`).join('')}</div>
        <div class="panel"><h3>Your rewards</h3><p>+${sum.credits} research credits · +${sum.xp} XP${sum.rankUp ? ` · <b class="ok">Promoted to rank ${sum.rank} (${NW.Save.rankTitle(sum.rank)})</b>` : ''}</p>${lost ? `<p class="bad">Equipment lost: ${esc(lost)}</p>` : ''}</div>
        <div class="actions"><button class="btn pri" data-again>${this.g.net && this.g.net.kind === 'remote' ? 'Back to lobby' : 'New contract'}</button><button class="btn" data-hq>Field HQ</button><button class="btn" data-main>Main menu</button></div>`);
      this.bind('[data-again]', () => { if (this.g.net && this.g.net.kind === 'remote' && this.room) this.showLobby(this.room); else this.showContract(); });
      this.bind('[data-hq]', () => this.showHQ('stock', () => this.showMain()));
      this.bind('[data-main]', () => { if (this.g.net && this.g.net.kind === 'remote') this.g.net.leave(); this.g.net = null; this.showMain(); });
    }
  };
  NW.UI = UI;
})();
