# Nightwatch Protocol

A first-person co-op paranormal investigation game for 1–4 players. You enter a haunted site, use field instruments to collect evidence, work out which of 15 entities is there, and get out before it decides you've stayed too long.

Everything is original: the entities, evidence types, instruments, maps, interface, textures (generated from noise at startup) and sound (synthesised with WebAudio). There are no asset files.

## Playing

**Solo:** open `index.html` in a browser (Chrome, Edge or Firefox). There's no install or build step, and three.js is vendored, so it works offline.

**Co-op (2–4 players):** run the bundled server. It needs Node 18+ and has no dependencies.

```bash
node server/server.js
```

Everyone opens `http://<host-ip>:8787`. To talk, tick **Co-op voice chat** in Settings: nearby teammates hear you through walls and floors, and holding **B** talks on the radio. Voice works on a local network out of the box. For play over the internet, add a STUN/TURN server under **Voice ICE servers**. One person picks **Co-op → Host new lobby** and shares the 4-letter code. The others choose **Join**. The host picks the contract and deploys once everyone is ready. Players can drop in to a mission that is already running.

**Single file:** `python3 tools/bundle.py` writes `dist/nightwatch.html`, which plays solo from one file.

## How an investigation works

On **Training**, a Field Briefing walks you through your first investigation step by step. Turn it off in Settings.


1. Take equipment from the **Field Unit** (the van). Press **E** at its open rear doors. You have four slots, and a personal radio takes one.
2. If the site is dark, find the generator and restore power. Lit rooms protect your **Field Composure**.
3. Find the entity's room. Cold readings, EM spikes, sounds and moved objects cluster there.
4. Test for evidence with each instrument. Leave motion nodes, slates and pressure monitors in active rooms and come back later.
5. Record what you find in the **tablet** (TAB). Mark each evidence type as confirmed or ruled out and the entity list narrows itself. Double-click an entity to set it as your identification.
6. When the team's composure drops low enough, the entity can start a **pursuit**. The exit locks. Break line of sight, shut doors, hide in lockers and wardrobes, or use its weakness.
7. Go back to the van and **End investigation**. A correct identification and completed objectives earn research credits and XP.

### Controls

| Key | Action |
|---|---|
| WASD, Shift, C | Move, sprint, crouch |
| Mouse, LMB, RMB | Look; use, toggle or place; raise the lens or thermal viewfinder |
| E | Doors, light switches, generator, hide, pick up, read; hold to swab |
| R | Activate a placed Signal Beacon or Emergency Light |
| 1–4, mouse wheel, G | Select slot, drop |
| F | Head torch |
| Q / V | Ask a question (into the recorder if it is on) / call out |
| T / hold B | Type a radio message / talk on the radio (voice chat) |
| H | Hide or show the Field Briefing |
| TAB / P / ESC | Tablet / pause / release mouse |

## Content

- **4 locations:** Brackenridge Observatory (dome, platform, rock tunnels, a sealed lab that opens when power is restored), Hollowmere Apartments (basement, two residential floors, laundry, roof), Saint Vesper Clinic (wards, burned operating theatre, pharmacy, underground archives, cold store) and Redwater Ferry Terminal (waiting hall, baggage, flooded lower levels, a ferry with a cabin, wheelhouse and flooded hold). Each has its own layout, materials, ambience, hiding spots and recoverable documents.
- **15 entities.** Each has its own pursuit senses, speed, preferred conditions, strengths, weaknesses and field tells. See [docs/DESIGN.md](docs/DESIGN.md).
- **9 evidence types**, each confirmed by a different instrument. Every entity shows three of them.
- **14 pieces of equipment**, with batteries or charges, screens, sounds and upgrade tiers.
- **Field Composure** replaces a sanity meter. It drops in darkness, when you're alone, near the entity, and when you witness things. Low composure muffles sound, drains colour and causes false events that only you see.
- **Difficulties:** Training, Standard, Professional and Nightmare, plus Custom sliders. Harder difficulties add unreliable readings, isolated false readings and, on Nightmare, one missing evidence type.
- **Progression:** research credits, XP and ranks, equipment stock (gear carried by an incapacitated investigator is lost), upgrades, unlockable sites and difficulties, and cosmetic suits, torches and patches. Everything is earned in play. Nothing is for sale, and upgrades never make entities easier.

## Architecture

```
nightwatch/
  index.html, css/            client shell and styling
  js/shared/                  runs in the browser AND in Node — no DOM, no three.js
    ns.js                     namespace, seeded RNG, emitter
    data/                     evidence, equipment, entities, difficulty, locations (data-driven)
    sim/world.js              rasterises location DSL → tile grids, collision, LOS, A* across floors
    sim/entityAI.js           EntityAI: roaming, pursuits, senses, trait hooks
    sim/director.js           EventSystem: interactions, evidence emission, false readings, hallucinations
    sim/session.js            GameSession: authoritative state, actions, composure, objectives, results
    net/protocol.js           message definitions shared by client and server
  js/client/                  browser only
    net.js                    MultiplayerManager: LocalHost (solo) / RemoteHost (WebSocket)
    level.js                  LevelManager: procedural geometry, doors, lights, traces
    player.js                 PlayerController + input
    equipment.js              EquipmentSystem: models, screens, readings, use
    entityView.js             entity manifestations, teammate avatars
    effects.js                composure effects, thermal shader, lens, UV, hallucinations
    audio.js                  AudioSystem: synthesised spatial sound
    ui.js                     UIManager: menus, HQ, lobby, HUD, tablet, results
    tutorial.js               Field Briefing (guided Training run) + one-time hints
    voice.js                  VoiceChat: WebRTC mesh, proximity + radio routing
    save.js                   SaveSystem + progression
    game.js, main.js          orchestration and main loop
  server/server.js            zero-dependency HTTP + WebSocket server running GameSession per lobby
  tests/                      map validation, simulation soak test, evidence integrity
```

The simulation is **authoritative and transport-agnostic**. In solo play it runs in the browser tab (`LocalHost`). In co-op the Node server runs the exact same files, loaded by `server/simLoader.js`. Clients send actions (`pose`, `door`, `place`, `ask`, `photo`, …) and receive full snapshots at 3 Hz, fast snapshots (players and entity) at 10 Hz, and discrete events every tick. Player movement is client-authoritative, which is fine for co-op. Everything else is decided by the authority.

Adding content:

- **Entity:** append an object to `js/shared/data/entities.js`. It needs three evidence ids, speeds, senses, a pursuit threshold, interaction weights, a `look` and tells. Only genuinely new behaviour needs a new hook in `EntityAI.TRAITS`.
- **Location:** write its rooms and doors in the layout DSL in `js/shared/data/locations.js`, then run `node tests/maps.test.js --print` to see the result and check that everything is reachable.
- **Evidence or equipment:** add the data entry, emit it in `director.js`, and add a reading or screen in `client/equipment.js`.

## Tests

```bash
npm test
```

This runs `tests/maps.test.js`, which rasterises every map and checks every room and hiding spot is reachable across floors. It then runs `tests/sim.test.js`, which runs all 15 entities on all 4 maps with bot investigators. Then it runs `tests/evidence.test.js`, which checks that each entity produces only its own evidence and that all three can be found. Finally `tests/server.test.js` starts the real server and drives two WebSocket clients through a lobby, a mission, the voice-signalling relay and the shared ending.

## Development phases

| Phase | Status |
|---|---|
| 1. Movement, test map, interaction, lighting, inventory | Done |
| 2. Entity, AI, manifestations, pursuits | Done |
| 3. Evidence system, instruments, entity database/journal | Done |
| 4. Multiplayer, synchronisation, communication | Done: dedicated server, lobbies, drop-in, shared journal, WebRTC proximity and radio voice, text radio with interference |
| 5. More entities, locations, progression, difficulties | Done: 15 entities, 4 locations |
| 6. Polish | Bloom and filmic grading, jointed figures with shrouds, Field Briefing, hints, FPS counter |

Because the server runs the simulation, a mission keeps going if the host disconnects; the next player becomes lobby host. Possible next steps: delta-compressed snapshots, a TURN relay bundled with the server, and more sites.
