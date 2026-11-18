/* Procedural audio: per-location music styles (sequenced synths + drums), SFX, ambience beds, NPC voice blips.
   Independent music / sfx / dialogue volume and mute. Original music generated in-browser (no licensed tracks). */
'use strict';
GR.Audio = (() => {
  const U = GR.U;
  let ctx = null, master, musicBus, sfxBus, voxBus, ambBus, noiseBuf, verb;
  let vol = { music: 0.55, sfx: 0.8, dialogue: 0.8, mute: false };
  let track = null, nextTrack = null, schedT = 0, step = 0, timer = null, ambient = {};
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain(); voxBus = ctx.createGain(); ambBus = ctx.createGain();
    [musicBus, sfxBus, voxBus, ambBus].forEach(b => b.connect(comp));
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // tiny reverb
    verb = ctx.createConvolver(); const ir = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate); for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); } verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.18; verb.connect(vg); vg.connect(musicBus);
    apply();
    timer = setInterval(sched, 50);
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setVolumes(v) { Object.assign(vol, v); apply(); }
  function apply() { if (!ctx) return; const m = vol.mute ? 0 : 1; master.gain.value = m; musicBus.gain.value = vol.music * 0.5; sfxBus.gain.value = vol.sfx * 0.7; voxBus.gain.value = vol.dialogue * 0.5; ambBus.gain.value = vol.sfx * 0.35; }
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  function env(g, t, a, d, s, r, peak = 1, len = 0.1) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.linearRampToValueAtTime(peak * s, t + a + d); g.gain.setValueAtTime(peak * s, t + Math.max(a + d, len)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, len) + r); }
  function osc(type, freq, t, len, peak, bus, opts = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + len); if (opts.detune) o.detune.value = opts.detune;
    let node = o; if (opts.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(opts.lp, t); if (opts.lpEnd) f.frequency.exponentialRampToValueAtTime(opts.lpEnd, t + len); f.Q.value = opts.q || 1; o.connect(f); node = f; }
    node.connect(g); g.connect(bus); if (opts.verb) g.connect(verb);
    env(g, t, opts.a || 0.005, opts.d || 0.05, opts.s ?? 0.6, opts.r || 0.08, peak, len); o.start(t); o.stop(t + len + (opts.r || 0.08) + 0.05);
  }
  function noise(t, len, peak, bus, opts = {}) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); s.buffer = noiseBuf; f.type = opts.type || 'highpass'; f.frequency.value = opts.f || 6000; f.Q.value = opts.q || 0.7;
    s.connect(f); f.connect(g); g.connect(bus); env(g, t, opts.a || 0.001, opts.d || 0.03, opts.s ?? 0.2, opts.r || 0.05, peak, len); s.start(t, Math.random()); s.stop(t + len + 0.2);
  }
  const kick = (t, p = 1) => osc('sine', 150, t, 0.12, 0.9 * p, musicBus, { slide: 40, d: 0.1, s: 0.3, r: 0.12 });
  const snare = (t, p = 1) => { noise(t, 0.12, 0.45 * p, musicBus, { type: 'bandpass', f: 1800, q: 0.8, d: 0.08, s: 0.1, r: 0.1 }); osc('triangle', 200, t, 0.06, 0.3 * p, musicBus, { slide: 120 }); };
  const hat = (t, p = 1, open) => noise(t, open ? 0.15 : 0.03, 0.18 * p, musicBus, { f: 8000, r: open ? 0.15 : 0.03 });
  const clap = (t, p = 1) => { for (let i = 0; i < 3; i++) noise(t + i * 0.012, 0.03, 0.3 * p, musicBus, { type: 'bandpass', f: 1500, q: 1.5 }); };

  // chord progressions (semitones from key root) and styles
  const PROG = { edm: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], pop: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lofi: [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]], arena: [[0, 3, 7], [5, 8, 12], [8, 12, 15], [7, 10, 14]], boom: [[0, 3, 7, 10], [5, 8, 12, 15], [0, 3, 7, 10], [7, 10, 14, 17]], synth: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]], city: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]] };
  function playStep(tr, t) {
    const st = tr.style, s16 = step % 16, bar = Math.floor(step / 16) % 4, ch = PROG[st] || PROG.pop, root = 48 + tr.key, cd = ch[bar], swing = st === 'lofi' || st === 'boom' ? (s16 % 2 ? 0.04 : 0) : 0; t += swing;
    const I = tr.intensity ?? 1;
    if (st === 'edm' || st === 'arena' || st === 'synth') {
      if (s16 % 4 === 0) kick(t, st === 'arena' ? 1.2 : 1);
      if (s16 % 8 === 4) (st === 'arena' ? snare : clap)(t, I);
      if (s16 % 2 === 1) hat(t, 0.8 * I, s16 % 4 === 3);
      if (s16 % 4 === 2) osc('sawtooth', mtof(root - 12 + cd[0]), t, 0.12, 0.25 * I, musicBus, { lp: 900, lpEnd: 300, q: 4 });
      if (st !== 'arena' && I > 0.4) { const n = cd[(s16 >> 1) % cd.length] + 12 * ((s16 >> 3) % 2); osc('square', mtof(root + 12 + n), t, 0.07, 0.07 * I, musicBus, { lp: 2400, verb: true }); }
      if (s16 === 0) cd.forEach(n => osc('sawtooth', mtof(root + n), t, 1.8, 0.05, musicBus, { lp: st === 'synth' ? 1400 : 1800, a: 0.2, s: 0.8, r: 0.5, detune: (Math.random() - 0.5) * 14, verb: true }));
      if (st === 'arena' && (s16 === 0 || s16 === 10)) cd.forEach(n => osc('sawtooth', mtof(root + n + 12), t, 0.2, 0.08, musicBus, { lp: 3000 }));
    } else if (st === 'pop' || st === 'city') {
      if (s16 === 0 || s16 === 10) kick(t, 0.9); if (s16 === 4 || s16 === 12) snare(t, 0.8); if (s16 % 2 === 0) hat(t, 0.6);
      if (s16 % 4 === 0) osc('triangle', mtof(root - 12 + cd[0]), t, 0.25, 0.3, musicBus, { lp: 700 });
      if ([0, 3, 6, 8, 11, 14].includes(s16)) cd.forEach(n => osc('triangle', mtof(root + 12 + n), t, 0.12, 0.05, musicBus, { lp: 3000, verb: true }));
      if (st === 'pop' && s16 % 4 === 2) osc('sine', mtof(root + 24 + cd[(step >> 2) % cd.length]), t, 0.18, 0.06, musicBus, { verb: true });
    } else if (st === 'lofi' || st === 'boom') {
      if (s16 === 0 || s16 === 7 || (st === 'boom' && s16 === 10)) kick(t, 0.8); if (s16 === 4 || s16 === 12) snare(t, 0.55); if (s16 % 2 === 0) hat(t, 0.35);
      if (s16 === 0) cd.forEach((n, i) => osc('sine', mtof(root + 12 + n), t + i * 0.02, 1.7, 0.07, musicBus, { a: 0.02, s: 0.6, r: 0.6, verb: true }));
      if (s16 % 8 === 0) osc('sine', mtof(root - 12 + cd[0]), t, 0.5, 0.35, musicBus, { lp: 400 });
      if (s16 % 4 === 0) noise(t, 0.4, 0.015, musicBus, { type: 'bandpass', f: 3000 });
      if (st === 'boom' && s16 % 8 === 6) osc('square', mtof(root + 24 + cd[1]), t, 0.08, 0.04, musicBus, { lp: 1800 });
    }
  }
  function sched() {
    if (!ctx || !track) return;
    const spb = 60 / track.bpm / 4;
    while (schedT < ctx.currentTime + 0.12) { if (schedT < ctx.currentTime - 0.2) schedT = ctx.currentTime; playStep(track, schedT); schedT += spb; step++; if (track.onBeat && step % 4 === 0) { const tt = schedT; track.onBeat(step / 4, tt); } }
  }
  function music(name, opts = {}) {
    init(); if (!ctx) return;
    const R = GR.Data.RADIO[name];
    if (!name || !R) { fadeTo(0); track = null; return; }
    if (track && track.name === name && !opts.restart) { Object.assign(track, opts); return; }
    const nt = Object.assign({ name }, R, opts);
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    setTimeout(() => { track = nt; step = 0; schedT = ctx.currentTime + 0.05; musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.linearRampToValueAtTime(vol.mute ? 0 : vol.music * 0.5, ctx.currentTime + 0.6); }, 380);
  }
  function fadeTo(v) { if (!ctx) return; musicBus.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.5); }
  function beatTime() { if (!ctx || !track) return 0; return { now: ctx.currentTime, bpm: track.bpm, step, schedT }; }
  // ---------------- SFX ----------------
  const SFX = {
    click: t => osc('square', 900, t, 0.02, 0.12, sfxBus, { lp: 3000 }),
    open: t => { osc('sine', 500, t, 0.08, 0.2, sfxBus, { slide: 900 }); },
    close: t => { osc('sine', 800, t, 0.08, 0.2, sfxBus, { slide: 400 }); },
    cash: t => { [1320, 1760].forEach((f, i) => osc('square', f, t + i * 0.07, 0.08, 0.12, sfxBus, { lp: 4000 })); noise(t, 0.05, 0.1, sfxBus, { f: 5000 }); },
    error: t => { osc('square', 180, t, 0.12, 0.18, sfxBus, { lp: 900 }); osc('square', 140, t + 0.12, 0.15, 0.18, sfxBus, { lp: 900 }); },
    levelup: t => [0, 4, 7, 12, 16].forEach((n, i) => osc('square', mtof(72 + n), t + i * 0.08, 0.12, 0.12, sfxBus, { lp: 4000, verb: true })),
    achievement: t => [0, 7, 12, 19].forEach((n, i) => osc('triangle', mtof(76 + n), t + i * 0.06, 0.2, 0.15, sfxBus, { verb: true })),
    notif: t => { osc('sine', 1568, t, 0.07, 0.15, sfxBus); osc('sine', 2093, t + 0.08, 0.12, 0.15, sfxBus); },
    step: (t, o = {}) => noise(t, 0.04, 0.08 * (o.v || 1), sfxBus, { type: 'bandpass', f: o.f || 900, q: 1.2, d: 0.03, s: 0.1 }),
    clank: t => { osc('square', 220, t, 0.05, 0.12, sfxBus, { lp: 2500 }); osc('sine', 1200 + Math.random() * 600, t, 0.25, 0.12, sfxBus, { s: 0.3, r: 0.3 }); noise(t, 0.04, 0.15, sfxBus, { f: 3000 }); },
    whoosh: t => noise(t, 0.25, 0.2, sfxBus, { type: 'bandpass', f: 800, q: 0.5, a: 0.08 }),
    swish: t => noise(t, 0.3, 0.25, sfxBus, { type: 'highpass', f: 3000, a: 0.05 }),
    bounce: t => osc('sine', 120, t, 0.08, 0.5, sfxBus, { slide: 60 }),
    rim: t => { osc('square', 600, t, 0.1, 0.15, sfxBus, { lp: 2000 }); osc('sine', 900, t, 0.3, 0.1, sfxBus); },
    cheer: t => { noise(t, 1.4, 0.35, sfxBus, { type: 'bandpass', f: 1200, q: 0.4, a: 0.15, s: 0.7, r: 0.6 }); for (let i = 0; i < 6; i++) osc('sawtooth', 300 + Math.random() * 500, t + Math.random() * 0.6, 0.3, 0.03, sfxBus, { lp: 1500 }); },
    boo: t => { for (let i = 0; i < 5; i++) osc('sawtooth', 110 + Math.random() * 60, t + i * 0.05, 0.9, 0.04, sfxBus, { lp: 600, slide: 80 }); },
    vend: t => { for (let i = 0; i < 4; i++) osc('square', 80 + i * 10, t + i * 0.09, 0.06, 0.15, sfxBus, { lp: 600 }); noise(t + 0.45, 0.12, 0.3, sfxBus, { type: 'lowpass', f: 500 }); },
    buzz: t => osc('sawtooth', 110, t, 0.8, 0.08, sfxBus, { lp: 2000 }),
    spray: t => noise(t, 0.4, 0.12, sfxBus, { f: 4000, a: 0.03, s: 0.6 }),
    pop: t => osc('sine', 600, t, 0.06, 0.25, sfxBus, { slide: 1200 }),
    perfect: t => { osc('triangle', 1318, t, 0.08, 0.2, sfxBus); osc('triangle', 1975, t + 0.05, 0.12, 0.2, sfxBus, { verb: true }); },
    good: t => osc('triangle', 988, t, 0.08, 0.18, sfxBus),
    miss: t => osc('sawtooth', 160, t, 0.15, 0.15, sfxBus, { slide: 90, lp: 900 }),
    shutter: t => { noise(t, 0.03, 0.4, sfxBus, { f: 2000 }); noise(t + 0.06, 0.04, 0.3, sfxBus, { f: 1500 }); },
    jump: t => noise(t, 0.08, 0.12, sfxBus, { type: 'bandpass', f: 600 }),
    land: t => { noise(t, 0.07, 0.2, sfxBus, { type: 'lowpass', f: 400 }); },
    door: t => { osc('sine', 180, t, 0.15, 0.2, sfxBus, { slide: 120 }); noise(t, 0.2, 0.08, sfxBus, { type: 'lowpass', f: 800 }); },
    beep: t => osc('square', 1760, t, 0.05, 0.08, sfxBus),
    whistle: t => osc('sine', 2400, t, 0.4, 0.15, sfxBus, { slide: 2600 }),
    splash: t => noise(t, 0.6, 0.3, sfxBus, { type: 'lowpass', f: 1500, a: 0.02, s: 0.4 }),
    coin: t => { osc('square', 988, t, 0.06, 0.1, sfxBus); osc('square', 1318, t + 0.06, 0.18, 0.1, sfxBus); },
    countdown: t => osc('square', 880, t, 0.1, 0.12, sfxBus, { lp: 3000 }),
    go: t => osc('square', 1760, t, 0.3, 0.12, sfxBus, { lp: 4000 }),
    reveal: t => [0, 4, 7, 11, 14, 19].forEach((n, i) => osc('sine', mtof(70 + n), t + i * 0.05, 0.35, 0.1, sfxBus, { verb: true })),
    punch: t => { osc('sine', 90, t, 0.1, 0.5, sfxBus, { slide: 50 }); noise(t, 0.05, 0.25, sfxBus, { type: 'lowpass', f: 900 }); },
    type: t => noise(t, 0.015, 0.06, sfxBus, { f: 4000 })
  };
  function sfx(name, opts) { if (!ctx || vol.mute) return; const f = SFX[name]; if (f) try { f(ctx.currentTime + 0.005, opts); } catch (e) { } }
  // dialogue blips (Animal-Crossing-ish voice) — pitch per speaker
  function voice(text, pitch = 1) { if (!ctx || vol.mute) return; const t0 = ctx.currentTime; const n = Math.min(14, Math.ceil(text.length / 5)); for (let i = 0; i < n; i++) { const f = (180 + (U.hash(text[i * 3] || 'a') % 7) * 25) * pitch; osc('triangle', f, t0 + i * 0.075, 0.05, 0.12, voxBus, { lp: 1800 }); } }
  // ambience beds
  function ambience(kind, on, level = 1) {
    if (!ctx) return;
    if (ambient[kind] && !on) { const a = ambient[kind]; a.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); setTimeout(() => { try { a.s.stop(); } catch (e) { } }, 900); delete ambient[kind]; return; }
    if (!on) return;
    if (ambient[kind]) { ambient[kind].g.gain.linearRampToValueAtTime(level * 0.25, ctx.currentTime + 0.5); return; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(), g = ctx.createGain();
    const cfg = { city: ['lowpass', 500, 0.5], rain: ['highpass', 2500, 0.4], crowd: ['bandpass', 900, 0.6], gym: ['bandpass', 600, 0.5], park: ['bandpass', 3000, 0.2], cafe: ['bandpass', 1100, 0.4] }[kind] || ['lowpass', 500, 0.5];
    f.type = cfg[0]; f.frequency.value = cfg[1]; f.Q.value = cfg[2]; s.connect(f); f.connect(g); g.connect(ambBus); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(level * 0.25, ctx.currentTime + 1); s.start();
    ambient[kind] = { s, g };
  }
  function ambienceOnly(list) { Object.keys(ambient).forEach(k => { if (!list.includes(k)) ambience(k, false); }); list.forEach(k => ambience(k, true, k === 'rain' ? 1.2 : 1)); }
  return { init, resume, setVolumes, music, sfx, voice, ambience, ambienceOnly, beatTime, get ctx() { return ctx; }, get track() { return track; } };
})();
