# Nightwatch Protocol: design reference

The data files in `js/shared/data/` are the source of truth. This page summarises them.

## Evidence

| Evidence | Short | Instrument | How it shows |
|---|---|---|---|
| EM Peak | EM | Field Spectrum Scanner | Band 5 (PEAK) near an interaction. Bands 2–4 are common to every entity. |
| Sub-Zero Field | SZ | Thermal Imaging Unit | Lair temperature below 0 °C. Cold alone is not proof. |
| Spectral Voice | SV | Directional Audio Recorder | A voice reply after a question (Q) near the entity |
| Residue Trace | RT | Environmental Sample Kit | A UV-visible touch point that swabs positive |
| Optical Distortion | OD | Spectral Lens Camera | A shimmer visible only through the lens, photographed |
| Phase Motion | PM | Motion Sensor Node | A violet trip. Red trips are ordinary movement. |
| Pressure Collapse | PC | Pressure Monitor | A drop of 15 hPa or more |
| Inscriptions | IN | Scribe Slate | Symbols or tallies on a placed slate |
| Carrier Bleed | CB | Personal Radio (hold LMB) | A voice on an empty channel |

On Training and Standard, readings are never false. Professional adds isolated false readings that don't repeat in the same room. Nightmare also removes one of the entity's three evidence types for the whole mission.

## Entities

| Entity | Evidence | Threat | Pursuit senses | Pursuit at ≤ | Signature behaviour | Weakness |
|---|---|---|---|---|---|---|
| The Murmur | SV CB SZ | 2 | sound (speech ×2) | 45 | Whispers. Speech agitates it. | Silence |
| The Lantern | OD EM PM | 3 | light, sight | 50 | Light motes lure investigators | Darkness, torches off |
| The Warden | PM PC IN | 4 | sight, sound | 50 | Locks doors and seals sections. Locks you in when a pursuit starts. | Slow. Can't lock inside Emergency Light. |
| The Echo | SV RT OD | 3 | sound, sight | 45 | Repeats your steps and doors. Fakes footsteps during pursuits. | Stay together |
| The Pall | SZ PC RT | 3 | sight, motion | 50 | Haze, condensation, decay | Slow in warm, lit rooms |
| The Hollow | EM IN CB | 2 | sight, sound | 30 | Plants one false evidence type. Silent pursuits. | Signal Beacon strips its decoys |
| The Tether | EM SZ OD | 4 | sight, sound (target only) | 55 | Fixates on one investigator | Harmless to everyone else |
| The Siltborn | RT PM CB | 3 | sound, motion | 48 | Wet footprints, dripping | Slower on dry floors |
| The Tallyman | IN SV PC | 5 | sight, sound, motion | 40 | Counted knocks. Never loses its target and searches hiding spots. | Very slow. Doors take it 4 s. |
| The Flicker | EM CB PM | 3 | electronics | 50 | Flips lights, drains batteries, trips the breaker | Switch everything off |
| The Undertow | SZ IN OD | 4 | sight, motion | 52 | Only turns lights off. Very fast in the dark. | Can't start a pursuit in light |
| The Shroud | PC OD CB | 4 | sight | 48 | Nearly invisible while hunting | A Signal Beacon reveals it |
| The Gloam | SV PC PM | 5 | sight, sound | 62 | Drains everyone and causes hallucinations | Tablets work twice as well |
| The Kindled | RT EM IN | 3 | sight, sound | 50 | Warms rooms, leaves scorch marks, overloads circuits | Can't cross water |
| The Hush | SZ RT PM | 4 | motion | 46 | Sound dies near it. Silent pursuits. | Blind to anyone standing still |

Every evidence combination is unique. `tests/evidence.test.js` checks that each entity only produces its own evidence (the Hollow's decoys are expected). Where Nightmare leaves two entities with the same two evidence types, the tells tell them apart.

## Field Composure

Composure runs from 0 to 100 per investigator, and the starting value depends on difficulty.

- **What lowers it:** darkness (×0.75 with a torch on, ×0.6 while hiding), being alone (×1.4 in co-op), being within 5 m of the entity (×1.6), the Gloam (×1.5), being the Tether's target (×1.9) and a nearby pursuit (+0.45/s).
- **One-off hits:** seeing a manifestation (6–11), seeing a pursuit start (8), seeing a teammate taken (15) and hallucinations (2).
- **What restores it:** lit rooms and Emergency Lights (almost no drain), time outside or at the van, and Stabiliser Tablets (+35).

Low composure causes desaturation, a narrowing vignette, a heartbeat, camera unsteadiness, a muffled sound mix, instrument glitches below 25, and private hallucinations below 35: false radio calls, figures, footsteps and slammed doors.

## Pursuits

A pursuit can start after the setup window, once the team's average composure (or the Tether target's) is at or below the entity's threshold. Agitation, the Murmur hearing speech, and the Echo with the team spread out all raise that threshold. The chance per check scales with difficulty aggression, and a Signal Beacon doubles it.

- A Grounding Spike within 4 m absorbs the attempt.
- When a pursuit starts, the exit locks, lights flicker, nearby electronics glitch and the entity materialises with a blinking visibility.
- The entity tracks investigators with its own senses (see the table). It chases the strongest contact, searches the last known position, opens doors after a delay, and speeds up while it can see its target.
- Hiding works unless it saw you go in within the last 6 s. The Tallyman searches hiding spots anyway.
- A Static Flare stuns it for 3.5–5 s.
- Being caught incapacitates you. You drop your gear and switch to spectating. If everyone goes down, the mission fails.

## Locations

| Site | Floors | Power at start | Feature |
|---|---|---|---|
| Brackenridge Observatory | Tunnels, ground | Off (generator) | Telescope dome. Sealed lab opens when power returns. |
| Hollowmere Apartments | Basement, ground, upper, roof | On | Long corridors, several unit layouts, flooded sump |
| Saint Vesper Clinic | Archives, ground | Off (emergency generator) | Wards, burned theatre, cold store |
| Redwater Ferry Terminal | Flooded lower level, terminal and ferry | On | Ferry deck, cabin, wheelhouse, flooded hold |

## Relics and electronics

- **Relic:** each site has one, placed on a pedestal in a random room (3 uses). Using it costs 12 composure and raises agitation. During the setup window it always answers: one evidence type the entity does *not* have is ruled out in the shared journal. After setup, it has a 30–50% chance to provoke a pursuit instead.
- **Electronics:** TVs, monitors and radios are placed in suitable rooms. The entity switches them on to static (the Flicker much more often), which leaves EM and touch traces. Players can switch them off.

## Rendering

- **Walls:** built per tile face with exterior shells, caps, parapets and window reveals, so there are no single-sided gaps.
- **Drawing:** static geometry is merged per material per floor, and only floors near the camera are drawn.
- **Lights:** a fixed budget of 6 point lights (fixtures, emergency lights, beacon, flash, UV, screens, motes, street lamps) is reassigned each frame, plus your torch and the nearest teammate's torch.
- **Textures:** 512 px with Sobel normal maps.
- **Grading:** colour effects (composure desaturation, lens tint) are done in the post-processing grade pass rather than CSS filters.

## Network model

- **Authority:** `GameSession`, in the browser for solo play or on the Node server for co-op.
- **Client to server:** `act` messages. `pose` goes at 15 Hz. Everything else is sent as it happens.
- **Server to clients:** `ev` events every tick (20 Hz), `fast` at 10 Hz (players, entity, light motes) and `snap` at 3 Hz (full JSON state).
- **Joining and leaving:** joining mid-mission adds a player and sends a full snapshot. A player who leaves drops their items. If the host leaves the lobby, the next player becomes host.
- **Voice:** a WebRTC mesh between players, connected through the server (`rtc` relay). Proximity voice is spatial, fades out by about 18 m, and is muffled through walls (by line of sight) and between floors. Radio voice (hold B) needs a radio in your inventory. It is band-passed with static, and the static rises near the entity and during pursuits. The living and the incapacitated can't hear each other. Speaking on the radio also counts as speech for entities like the Murmur.
- **Communication:** proximity speech (`say`, heard within 14 m on the same floor) and radio (`radio`). Radio text gets interference near the entity and during pursuits, and the living and the dead can't hear each other.
