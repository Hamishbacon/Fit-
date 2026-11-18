# GYM RAT 2000: THE MOGGING ERA

A third-person 3D lifestyle sim set in **Mog City**. The gym is one part of it. You can also shop, get haircuts, do skincare, decorate your apartment, post to social media, take sponsorships, make friends and compete in the Mog-Off.

Open `index.html` in a desktop browser. It needs no server or install, and three.js is vendored. Every model, texture, hairstyle, outfit, song and sound effect is generated in the browser at runtime, so the game has no external assets. To get a single self-contained file, run `python3 tools/bundle.py`, which writes `dist/gymrat.html`.

## Controls (remappable in Settings)

| Key | Action |
| --- | --- |
| WASD / arrows | Move (Shift sprints, Space jumps) |
| Mouse | Camera (click the game to lock the cursor; dragging also works). The wheel zooms. |
| E | Interact with doors, machines, people, seats, shops and vending machines |
| F | Phone |
| I | Inventory |
| B | Emote wheel |
| M | City map, with waypoints. Bus stops give Mog Metro fast travel. |
| C | Photo and video mode |
| Esc | Pause or back |

## What's in it

- **Characters.** Six starter characters, or build your own in a full creator. The creator covers:
  - body: height, build, shoulders, muscle, legs
  - 16 skin tones plus a custom colour
  - face: 7 face shapes, jaw, chin and cheekbones
  - eyes: 7 shapes, colour, size and spacing
  - 7 brow shapes, 7 noses, 6 mouths and 5 ears
  - 30 hairstyles, including fades, curls, afro, puffs, twists, cornrows, box braids, locs, bob, long and wavy, ponytail and buns
  - 9 facial hair styles, freckles and beauty marks

  Faces are sculpted 3D geometry, with animated eyelids, gaze, brows and a talking mouth. Your physique develops as you train.
- **Mog City.** Six districts and 17 locations, with traffic, pedestrians, a day/night cycle (lit windows and street lamps), weather, a minimap and a full map.
- **Iron Temple gym.** 16 machines, each running an interactive minigame. There are eight mechanics: timing, squat hold-and-release, rhythm lanes, pedal cadence, rowing strokes, arrow sequences, reactions and alternating beats. Also in the gym:
  - grades from S to D, personal bests and unlockable difficulties
  - a dashboard, a membership and trainer challenges
  - a changing room with lockers and showers
  - the Cali Yard outdoor gym
- **Fashion.** About 120 clothing items from 10 fictional brands, each in several colourways. You try items on your 3D character, save outfits and use real changing rooms. Wardrobes also show a "drip" score.
- **Fade Factory barber** for cuts, colour, highlights, facial hair and brows. **Glow Lab** has a skincare routine minigame, cosmetics and face presets.
- **Apartment.** It has a bedroom, bathroom, kitchen, living room and gaming setup. Furniture comes from Nest & Co and is placed in a decorate mode. You can also:
  - sleep in your bed
  - watch TV
  - stream from your PC for followers
  - play the arcade machine
  - use a home gym
  - put trophies and collectibles on display
- **Phone.** It has these apps:
  - Clout: feed, NPC profiles, posts, likes and comments
  - Flicks: short videos with live 3D playback and recording
  - Messages: group chats and invites
  - BrandDeals: sponsors with real objectives
  - Challenges, Mog-Off, Emote Shop, Map, Camera, Stats, Alerts and Settings
- **Mog-Off at Aura Arena.** Six event types:
  - Gym Showdown
  - Runway Riot (fashion)
  - Dance Battle
  - Aura Check
  - Clout Clash (social media)
  - Squad Relay (team)

  There are four tiers. Events include contestant intros, judges' scores and commentary, crowd reactions, a scoreboard, trophies, exclusive rewards, seasons and leaderboards.
- **Emotes and NPCs.** 58 emotes: 16 dances, walk styles and group dances that nearby NPCs join. Twenty named NPCs have schedules, personalities, friendships and gifts. Generated locals fill the rest of the city.
- **Vending and extras.** Five vending machine types, including mystery capsules. There are also food buffs, an energy system, 50 achievements, daily and weekly challenges and a tutorial.
- **Settings and saves.** Graphics presets go from Low to Ultra. You can also set resolution scale, shadows, bloom, live mirrors, NPC density and FOV, and switch to fullscreen. There are separate music, effects and dialogue volumes. Progress is saved to three slots with autosave and a backup.

## Code layout

`js/core` holds the utilities, game data, save and progression, audio and input. `js/gfx` holds textures, geometry, heads, hair, characters, animation and props. `js/world` holds the city and interiors. `js/systems` holds the NPCs, traffic, minigames, shops, apartment, phone and competitions. `js/ui` holds the HUD and menus. `js/game.js` is the engine and frame loop.
