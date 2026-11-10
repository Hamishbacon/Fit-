/* Field Briefing — a guided first investigation on Training, plus one-time
 * contextual hints on any difficulty. Steps are checked against live state,
 * so the player can do things in any order and steps tick off on their own.
 */
(function () {
  'use strict';
  const NW = window.NW;

  const STEPS = [
    { text: 'Walk to the open rear doors of the Field Unit (the van) and press <b>E</b> to open the equipment locker.', done: (g, t) => t.lockerOpened },
    { text: 'Take a <b>Field Spectrum Scanner</b> and a <b>Thermal Imaging Unit</b>. Your radio already fills one slot.', done: (g) => g.hasItem('scanner') && g.hasItem('thermal') },
    { text: 'The building has no power. Find the <b>generator</b> and press <b>E</b> to start it.', skip: (g) => g.state.power && !g.tut.sawPowerOff, done: (g) => g.state.power },
    { text: 'Go inside. Use the <b>light switch</b> beside a door (E). Lit rooms protect your Field Composure.', done: (g, t) => t.lightOn },
    { text: 'Select the thermal unit (1–4), switch it on (<b>LMB</b>) and raise it (<b>hold RMB</b>). Search for a room colder than 5 °C — that is usually where the entity rests.', done: (g, t) => t.coldFound },
    { text: 'In the cold room, switch on the <b>scanner</b>. Band 5 (PEAK) is <b>EM Peak</b> evidence; bands 2–4 just mean activity.', done: (g, t) => t.scanned },
    { text: 'Open the <b>tablet (TAB)</b>. Click an evidence card to mark it confirmed (or ruled out). The entity list narrows itself.', done: (g) => Object.keys(g.state.journal.ev).some((k) => g.state.journal.ev[k]) },
    { text: 'Try other tools: ask questions with the recorder (<b>Q</b>), photograph with the lens, swab touch points, leave a slate or motion node. Every entity shows three kinds of evidence.', done: (g) => Object.keys(g.state.journal.ev).filter((k) => g.state.journal.ev[k] === 1).length >= 2, hint: 'Confirm a second evidence type to continue.' },
    { text: 'If the lights stutter and the exit locks, a <b>pursuit</b> has begun: break line of sight, close doors, or hide in a wardrobe/locker (<b>E</b>).', done: (g, t) => t.stepAge > 14 },
    { text: 'Pick your identification (<b>double-click</b> an entity in the tablet), go back to the van and choose <b>End investigation</b>.', done: () => false }
  ];

  const HINTS = {
    hunt: 'PURSUIT: the exit is locked. Hide (E on wardrobes/lockers), close doors behind you, or stay out of its senses until it ends.',
    lowComposure: 'Your composure is low. Find a lit room, stay near teammates, return to the van, or take Stabiliser Tablets.',
    halluc: 'At very low composure you may see and hear things nobody else does. Trust the instruments — and confirm twice.',
    uv: 'The UV lamp shows touch points. Hold E on one to swab it; the sample kit analyses it after a few seconds.',
    lens: 'Optical distortions only show through the lens viewfinder. Frame one and press LMB.',
    down: 'You are incapacitated. Your team can still finish — watch and use the tablet. The living cannot hear your radio.'
  };

  class Tutorial {
    constructor(game) {
      this.g = game;
      this.el = document.getElementById('briefing');
      this.active = false;
    }
    start() {
      const g = this.g, S = NW.Save.data;
      this.flags = { lockerOpened: false, lightOn: false, coldFound: false, scanned: false, stepAge: 0 };
      g.tut = { sawPowerOff: !g.state.power };
      this.step = 0;
      this.active = g.state.diffId === 'training' && S.settings.briefing !== false;
      this.el.hidden = !this.active;
      this.hidden = false;
      this.render();
    }
    stop() { this.active = false; if (this.el) this.el.hidden = true; }
    toggle() { if (!this.active) return; this.hidden = !this.hidden; this.el.hidden = this.hidden; }
    note(flag) { if (this.flags) this.flags[flag] = true; }

    update(dt) {
      const g = this.g; if (!g.state || !g.me()) return;
      this._hints();
      if (!this.active) return;
      const f = this.flags, me = g.me();
      const room = g.world.roomIdAt(me.f, g.camera.position.x, g.camera.position.z);
      if (room >= 0 && !g.world.rooms[room].outdoor && g.state.roomLights[room] && g.state.power) f.lightOn = true;
      if (g.equip.thermalReading != null && g.equip.thermalReading < 5) f.coldFound = true;
      const held = g.equip.held();
      if (held && held.type === 'scanner' && held.on && g.equip.scanLevel >= 2) f.scanned = true;
      f.stepAge += dt;
      let changed = false;
      while (this.step < STEPS.length) {
        const s = STEPS[this.step];
        if (s.skip && s.skip(g, f)) { this.step++; changed = true; continue; }
        if (s.done(g, f)) { this.step++; f.stepAge = 0; changed = true; NW.Audio.play('ui', null, 0.5, { ui: true, f: 1500 }); continue; }
        break;
      }
      if (changed) this.render();
      if (this.step >= STEPS.length - 1 && !NW.Save.data.briefingDone) { NW.Save.data.briefingDone = true; NW.Save.persist(); }
    }
    render() {
      if (!this.active) return;
      const s = STEPS[Math.min(this.step, STEPS.length - 1)];
      const n = STEPS.filter((x, i) => i <= this.step).length;
      this.el.innerHTML = `<div class="bf-h">FIELD BRIEFING <span>${Math.min(n, STEPS.length)}/${STEPS.length}</span><em>H to hide</em></div><div class="bf-t">${s.text}</div>${s.hint ? '<div class="bf-s">' + s.hint + '</div>' : ''}`;
    }

    /** One-time contextual hints on any difficulty. */
    _hints() {
      const g = this.g, st = g.state, me = g.me();
      const H = NW.Save.data.hints = NW.Save.data.hints || {};
      const once = (k) => { if (H[k]) return; H[k] = 1; NW.Save.persist(); NW.UI.toast(HINTS[k]); };
      if (st.hunting) once('hunt');
      if (me.alive && me.composure < 40) once('lowComposure');
      if (me.alive && me.composure < 30) once('halluc');
      if (!me.alive) once('down');
      const held = g.equip.held();
      if (held && held.type === 'samplekit' && held.on) once('uv');
      if (held && held.type === 'lens' && g.equip.raised) once('lens');
    }
  }
  NW.Tutorial = Tutorial;
})();
