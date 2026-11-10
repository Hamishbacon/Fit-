/* Network protocol shared by the browser client and the Node server.
 *
 * Transport: JSON text frames over WebSocket. Solo play uses LocalHost which
 * delivers the same messages in-process without serialisation.
 *
 * Client → server
 *   hello   { v, name, cosmetics }               first message after connecting
 *   create  { }                                   create a lobby, become host
 *   join    { code }                              join a lobby by room code
 *   lobby   { settings }                          host updates contract settings
 *   ready   { ready }                             toggle ready state in the lobby
 *   start   { }                                   host deploys the team
 *   act     { a }                                 in-game action (see GameSession.applyAction)
 *   chat    { text }                              lobby chat
 *   leave   { }                                   leave room
 *
 * Server → client
 *   welcome { id, v }                             assigned client id
 *   room    { code, hostId, players[], settings, inGame }
 *   start   { cfg, you, snap }                    mission begins (full snapshot)
 *   snap    { s }                                 full state (low rate)
 *   fast    { s }                                 players/entity (high rate)
 *   ev      { e: [] }                             discrete events since the last tick
 *   chat    { from, text }
 *   error   { msg }
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  NW.NET = {
    TICK_HZ: 20,        // simulation rate on the authority
    FAST_HZ: 10,        // fast snapshot rate
    SNAP_HZ: 3,         // full snapshot rate
    POSE_HZ: 15,        // client pose upload rate
    MAX_PLAYERS: 4,
    DEFAULT_PORT: 8787
  };

  /** Lobby settings → GameSession config. Shared so server and LocalHost agree. */
  NW.buildSessionConfig = function (settings, seed) {
    const diff = settings.difficulty === 'custom' && settings.custom
      ? NW.makeCustomDifficulty(settings.custom)
      : NW.DIFFICULTY_BY_ID[settings.difficulty] || NW.DIFFICULTY_BY_ID.standard;
    return {
      locationId: NW.LOCATION_BY_ID[settings.location] ? settings.location : 'observatory',
      difficulty: diff,
      seed: seed >>> 0,
      entityId: settings.entity || null,
      loadout: settings.loadout || {},
      tiers: settings.tiers || {}
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
