/* Input: remappable actions, raw keys for minigames, pointer-lock mouse look with drag fallback, wheel zoom. */
'use strict';
GR.Input = (() => {
  const down = new Set(), pressed = new Set();
  let mdx = 0, mdy = 0, wheel = 0, dragging = false, locked = false, canvas = null;
  const listeners = []; // raw key handlers (minigames, UI) — return true to consume
  let binds = {};
  const ACTIONS = ['forward', 'back', 'left', 'right', 'sprint', 'jump', 'interact', 'phone', 'inventory', 'emote', 'map', 'pause', 'camera'];
  const LABEL = { forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right', sprint: 'Sprint', jump: 'Jump', interact: 'Interact', phone: 'Phone', inventory: 'Inventory', emote: 'Emote wheel', map: 'City map', pause: 'Pause', camera: 'Photo mode' };
  function setBinds(b) { binds = Object.assign({}, b); }
  const keyName = code => (code || '').replace('Key', '').replace('Digit', '').replace('Left', ' L').replace('Right', ' R').replace('Arrow', '↑'.repeat(0)) || '?';
  function init(cv) {
    canvas = cv;
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i](e.code, e) === true) { e.preventDefault(); return; }
      if (!down.has(e.code)) pressed.add(e.code);
      down.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { down.delete(e.code); });
    window.addEventListener('blur', () => { down.clear(); });
    cv.addEventListener('mousedown', e => { dragging = true; if (GR.Game && GR.Game.wantsLock()) requestLock(); });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', e => { if (locked || dragging) { mdx += e.movementX || 0; mdy += e.movementY || 0; } });
    cv.addEventListener('wheel', e => { wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
  }
  function requestLock() { try { if (!locked && canvas.requestPointerLock) { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } } catch (e) { } }
  function unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } }
  const is = a => down.has(binds[a]) || (a === 'forward' && down.has('ArrowUp')) || (a === 'back' && down.has('ArrowDown')) || (a === 'left' && down.has('ArrowLeft')) || (a === 'right' && down.has('ArrowRight')) || (a === 'sprint' && down.has('ShiftRight'));
  const hit = a => pressed.has(binds[a]);
  function mouse() { const r = [mdx, mdy]; mdx = mdy = 0; return r; }
  function wheelDelta() { const w = wheel; wheel = 0; return w; }
  function endFrame() { pressed.clear(); }
  function onKey(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  function clear() { down.clear(); pressed.clear(); mdx = mdy = 0; }
  return { init, setBinds, is, hit, mouse, wheelDelta, endFrame, onKey, clear, requestLock, unlock, ACTIONS, LABEL, keyName, get locked() { return locked; }, get binds() { return binds; }, down };
})();
