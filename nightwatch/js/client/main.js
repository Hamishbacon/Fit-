/* Boot. */
(function () {
  'use strict';
  const NW = window.NW;
  NW.Save.load();
  const game = NW.game = new NW.Game();
  NW.UI.showMain();
  // first user gesture unlocks audio
  addEventListener('pointerdown', () => { NW.Audio.init(NW.Save.data.settings.vol); NW.Audio.resume(); }, { once: true });
  // ?debug=1 exposes a tiny console helper for testing
  if (/debug=1/.test(location.search)) window.nw = game;
})();
