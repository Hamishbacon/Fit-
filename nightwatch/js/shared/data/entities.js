/* Entity roster — fully data-driven.
 *
 * Every entity is described by the same schema; sim/entityAI.js reads the
 * numbers and dispatches `traits` to small behaviour hooks. A new entity is
 * added by appending an object here (and, only if it needs truly new
 * behaviour, one hook in entityAI.TRAITS).
 *
 *  evidence     exactly three ids from NW.EVIDENCE
 *  threat       1..5 shown in the field manual
 *  prefers      preferred environmental condition (affects lair choice + activity)
 *  activity     base interactions per minute
 *  huntAt       team composure (0-100) at or below which pursuits can begin
 *  speed        { roam, hunt, huntMax } metres/second; huntMax reached while it sees a target
 *  senses       how it finds investigators during a pursuit
 *               sound | sight | electric | motion | light
 *  huntLength   seconds [min, max]
 *  doorDelay    seconds to force a closed door during a pursuit
 *  weights      relative likelihood of interaction types
 *  evidenceRate optional per-evidence multiplier (<1 makes it harder to get)
 *  look         visual manifestation parameters for the client renderer
 *  tells        behaviour clues players can use when evidence is incomplete
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  const W = (o) => Object.assign({ door: 3, light: 2, throw: 2, touch: 3, sound: 3, emf: 2, cold: 1, manifest: 1, write: 2, roam: 2 }, o);

  NW.ENTITIES = [
    {
      id: 'murmur', name: 'The Murmur', threat: 2, prefers: 'quiet',
      evidence: ['voice', 'bleed', 'thermal'],
      blurb: 'A presence made of half-heard speech. It lives in the gaps between conversations.',
      behaviour: 'Feeds on voices. Every callout, question or radio transmission near it raises its agitation. Fills rooms with distant whispering.',
      strengths: 'Hears speech from twice the normal distance during a pursuit.',
      weaknesses: 'Total silence calms it. Teams that stop talking see far fewer pursuits.',
      activity: 5, huntAt: 45, speed: { roam: 1.0, hunt: 1.55, huntMax: 2.0 }, senses: ['sound'], huntLength: [22, 34], doorDelay: 1.4,
      weights: W({ sound: 7, door: 2 }), traits: ['voiceReactive'],
      look: { form: 'figure', color: '#9aa7c7', opacity: 0.55, height: 1.75, sound: 'whisper' },
      tells: ['Whispers far more often than other entities.', 'Pursuit chance rises sharply right after someone speaks.']
    },
    {
      id: 'lantern', name: 'The Lantern', threat: 3, prefers: 'dark',
      evidence: ['optical', 'emf', 'motion'],
      blurb: 'A cold, moving light that looks like a torch carried by someone who is not there.',
      behaviour: 'Releases drifting light motes that wander toward its lair or toward drops and dead ends. Players who follow them are walking where it wants.',
      strengths: 'During a pursuit it homes in on any active torch or lamp.',
      weaknesses: 'In complete darkness it is almost blind. Torches off and still = safe.',
      activity: 4, huntAt: 50, speed: { roam: 1.1, hunt: 1.6, huntMax: 2.6 }, senses: ['light', 'sight'], huntLength: [20, 30], doorDelay: 1.6,
      weights: W({ light: 6, manifest: 2 }), traits: ['lure'],
      look: { form: 'orb', color: '#ffe9a8', opacity: 0.8, height: 1.7, sound: 'chime' },
      tells: ['Light motes visible to the naked eye.', 'Turns lights ON more often than off.']
    },
    {
      id: 'warden', name: 'The Warden', threat: 4, prefers: 'enclosed',
      evidence: ['motion', 'pressure', 'inscription'],
      blurb: 'It keeps the building the way it wants it — doors shut, rooms sealed, visitors contained.',
      behaviour: 'Closes and locks doors throughout the investigation, gradually cutting the building into sealed sections. Locks the doors around investigators when a pursuit begins.',
      strengths: 'Passes through doors without slowing. Locks doors near its target during pursuits.',
      weaknesses: 'Slow. Cannot lock a door inside the light of an Emergency Light.',
      activity: 4, huntAt: 50, speed: { roam: 0.9, hunt: 1.3, huntMax: 1.6 }, senses: ['sight', 'sound'], huntLength: [26, 38], doorDelay: 0,
      weights: W({ door: 9, throw: 1 }), traits: ['doorMaster'],
      look: { form: 'tall', color: '#59606e', opacity: 0.75, height: 2.1, sound: 'keys' },
      tells: ['Locks doors that nobody touched.', 'Sound of keys before doors close.']
    },
    {
      id: 'echo', name: 'The Echo', threat: 3, prefers: 'crowd',
      evidence: ['voice', 'residue', 'optical'],
      blurb: 'It learns by listening, and it repeats what it hears a little too late.',
      behaviour: 'Replays investigators\' footsteps, door sounds and voices several seconds later. Becomes far more aggressive when the team splits up.',
      strengths: 'During pursuits it throws false footsteps away from its true position.',
      weaknesses: 'Teams that stay together keep it subdued.',
      activity: 5, huntAt: 45, speed: { roam: 1.0, hunt: 1.7, huntMax: 2.1 }, senses: ['sound', 'sight'], huntLength: [20, 30], doorDelay: 1.5,
      weights: W({ sound: 5 }), traits: ['mimic', 'isolationHungry'],
      look: { form: 'figure', color: '#c7c2b8', opacity: 0.6, height: 1.7, sound: 'mimic' },
      tells: ['Your own footsteps repeat a few seconds after you stop.', 'Activity spikes when someone is alone.']
    },
    {
      id: 'pall', name: 'The Pall', threat: 3, prefers: 'cold',
      evidence: ['thermal', 'pressure', 'residue'],
      blurb: 'A rot in the air itself. Rooms it settles in grow damp, grey and heavy.',
      behaviour: 'Causes condensation, thickening haze and lens fogging in its room. Rooms around it slowly deteriorate.',
      strengths: 'Moves fast through cold, unpowered rooms.',
      weaknesses: 'Slow in warm, powered rooms with lights on.',
      activity: 4, huntAt: 50, speed: { roam: 0.9, hunt: 1.5, huntMax: 2.4 }, senses: ['sight', 'motion'], huntLength: [22, 32], doorDelay: 1.6,
      weights: W({ cold: 5, touch: 4 }), traits: ['deteriorate', 'coldSpeed'],
      look: { form: 'mist', color: '#8f9a8a', opacity: 0.5, height: 1.8, sound: 'breath' },
      tells: ['Visible haze and condensation in its room.', 'Breaker trips and lights failing near it.']
    },
    {
      id: 'hollow', name: 'The Hollow', threat: 2, prefers: 'any',
      evidence: ['emf', 'inscription', 'bleed'],
      blurb: 'An absence that imitates presence. It rarely shows itself, but it lies constantly.',
      behaviour: 'Plants convincing false traces of evidence it does not have. Rarely manifests and rarely hunts — but its pursuits are silent.',
      strengths: 'False evidence. Silent pursuits.',
      weaknesses: 'A Signal Beacon pulse strips its false traces and forces it to manifest.',
      activity: 3, huntAt: 30, speed: { roam: 1.0, hunt: 1.6, huntMax: 1.9 }, senses: ['sight', 'sound'], huntLength: [18, 26], doorDelay: 1.5,
      weights: W({ manifest: 0.3, emf: 3 }), traits: ['deceiver', 'silentHunt'],
      look: { form: 'shadow', color: '#14161c', opacity: 0.9, height: 1.8, sound: 'none' },
      tells: ['Evidence that appears once and never repeats.', 'Pursuits without footsteps.']
    },
    {
      id: 'tether', name: 'The Tether', threat: 4, prefers: 'any',
      evidence: ['emf', 'thermal', 'optical'],
      blurb: 'It chooses one person and attaches to them for the rest of the night.',
      behaviour: 'Fixates on a single investigator, follows them between rooms and drains only their composure. Its pursuits target only that person.',
      strengths: 'Ignores hiding if it saw its target enter.',
      weaknesses: 'Harmless to everyone else. Teammates can bait it away from its target with a Signal Beacon.',
      activity: 4, huntAt: 55, speed: { roam: 1.1, hunt: 1.6, huntMax: 2.2 }, senses: ['sight', 'sound'], huntLength: [20, 30], doorDelay: 1.3,
      weights: W({ roam: 4 }), traits: ['fixate'],
      look: { form: 'figure', color: '#d0a9a9', opacity: 0.65, height: 1.65, sound: 'heartbeat' },
      tells: ['One investigator loses composure much faster than the rest.', 'Activity follows a person rather than a room.']
    },
    {
      id: 'siltborn', name: 'The Siltborn', threat: 3, prefers: 'wet',
      evidence: ['residue', 'motion', 'bleed'],
      blurb: 'Something that came up from the water and never dried out.',
      behaviour: 'Prefers flooded and wet rooms. Leaves wet footprints and dripping sounds wherever it walks.',
      strengths: 'Fast through water and wet rooms.',
      weaknesses: 'Slower on dry floors and in warm rooms.',
      activity: 4, huntAt: 48, speed: { roam: 1.0, hunt: 1.45, huntMax: 2.0 }, senses: ['sound', 'motion'], huntLength: [22, 32], doorDelay: 1.6,
      weights: W({ touch: 5 }), traits: ['wetPrints', 'waterSpeed'],
      look: { form: 'drowned', color: '#5a7a73', opacity: 0.75, height: 1.6, sound: 'drip' },
      tells: ['Wet footprints with no source.', 'Dripping sounds in dry rooms.']
    },
    {
      id: 'tallyman', name: 'The Tallyman', threat: 5, prefers: 'enclosed',
      evidence: ['inscription', 'voice', 'pressure'],
      blurb: 'It counts. Knocks in sets, steps in sets, and it always knows how many of you are left.',
      behaviour: 'Very slow and methodical, but never loses a target once it has one, and it checks hiding places.',
      strengths: 'Long pursuits. Searches hiding spots. Never loses track.',
      weaknesses: 'Extremely slow; closed doors take it a long time to open.',
      activity: 3, huntAt: 40, speed: { roam: 0.7, hunt: 1.05, huntMax: 1.25 }, senses: ['sight', 'sound', 'motion'], huntLength: [34, 48], doorDelay: 4.0,
      weights: W({ sound: 4, write: 4 }), traits: ['persistent', 'searcher', 'counter'],
      look: { form: 'tall', color: '#3a3530', opacity: 0.85, height: 2.4, sound: 'knock' },
      tells: ['Knocks in counted sets (3, then 2, then 1).', 'Inscriptions are tallies, never words.']
    },
    {
      id: 'flicker', name: 'The Flicker', threat: 3, prefers: 'electrical',
      evidence: ['emf', 'bleed', 'motion'],
      blurb: 'It lives in the wiring, and it is hungry for current.',
      behaviour: 'Toggles lights constantly, drains batteries and trips the breaker. During pursuits it tracks active electronics.',
      strengths: 'Finds anyone carrying an active device.',
      weaknesses: 'Investigators with everything switched off are nearly invisible to it.',
      activity: 6, huntAt: 50, speed: { roam: 1.2, hunt: 1.7, huntMax: 2.0 }, senses: ['electric'], huntLength: [18, 28], doorDelay: 1.2,
      weights: W({ light: 8, emf: 4 }), traits: ['drain', 'breakerHungry'],
      look: { form: 'shadow', color: '#6db4ff', opacity: 0.6, height: 1.7, sound: 'buzz' },
      tells: ['Batteries draining abnormally fast.', 'Breaker trips repeatedly.']
    },
    {
      id: 'undertow', name: 'The Undertow', threat: 4, prefers: 'dark',
      evidence: ['thermal', 'inscription', 'optical'],
      blurb: 'It drags darkness behind it like a tide.',
      behaviour: 'Turns lights off and avoids lit areas. Becomes much faster in the dark.',
      strengths: 'Very fast in darkness.',
      weaknesses: 'Crawls in lit rooms. Cannot begin a pursuit inside the light of an Emergency Light.',
      activity: 4, huntAt: 52, speed: { roam: 1.0, hunt: 1.3, huntMax: 2.9 }, senses: ['sight', 'motion'], huntLength: [20, 28], doorDelay: 1.6,
      weights: W({ light: 6 }), traits: ['darkness'],
      look: { form: 'crawler', color: '#0d0f14', opacity: 0.92, height: 1.1, sound: 'drag' },
      tells: ['Only ever switches lights OFF.', 'Pursuits feel slow near lights and frantic in the dark.']
    },
    {
      id: 'shroud', name: 'The Shroud', threat: 4, prefers: 'any',
      evidence: ['pressure', 'optical', 'bleed'],
      blurb: 'You will rarely see it. It prefers it that way.',
      behaviour: 'Nearly invisible during pursuits — only brief flickers betray its position. Detects investigators by sight.',
      strengths: 'Almost invisible while hunting.',
      weaknesses: 'Signal Beacon pulses render it fully visible for a time.',
      activity: 4, huntAt: 48, speed: { roam: 1.0, hunt: 1.55, huntMax: 1.9 }, senses: ['sight'], huntLength: [20, 30], doorDelay: 1.5,
      weights: W({ manifest: 0.6 }), traits: ['invisible'],
      look: { form: 'figure', color: '#e8eef5', opacity: 0.35, height: 1.85, sound: 'rustle' },
      tells: ['Manifestations are faint and short.', 'Footsteps with no visible source during pursuits.']
    },
    {
      id: 'gloam', name: 'The Gloam', threat: 5, prefers: 'dark',
      evidence: ['voice', 'pressure', 'motion'],
      blurb: 'It gets inside your head first.',
      behaviour: 'Drains composure across the whole team and causes hallucinations: false figures, false voices, false radio calls.',
      strengths: 'Begins pursuits at higher composure than most.',
      weaknesses: 'Stabiliser Tablets are twice as effective against its influence.',
      activity: 4, huntAt: 62, speed: { roam: 1.0, hunt: 1.5, huntMax: 1.9 }, senses: ['sight', 'sound'], huntLength: [20, 30], doorDelay: 1.5,
      weights: W({ manifest: 2 }), traits: ['psychic'],
      look: { form: 'figure', color: '#5e4a6e', opacity: 0.7, height: 1.8, sound: 'drone' },
      tells: ['Composure falls quickly even in lit rooms.', 'Teammates see different things at the same time.']
    },
    {
      id: 'kindled', name: 'The Kindled', threat: 3, prefers: 'warm',
      evidence: ['residue', 'emf', 'inscription'],
      blurb: 'Whatever it was, it died in a fire and it still remembers the heat.',
      behaviour: 'Leaves scorch marks, makes rooms warmer instead of colder and overloads electrics.',
      strengths: 'Breaker overloads cut power during pursuits.',
      weaknesses: 'Cannot cross water. Flooded tiles are safe ground.',
      activity: 4, huntAt: 50, speed: { roam: 1.0, hunt: 1.6, huntMax: 2.1 }, senses: ['sight', 'sound'], huntLength: [20, 30], doorDelay: 1.4,
      weights: W({ touch: 4, light: 3 }), traits: ['scorch', 'hatesWater', 'breakerHungry'],
      look: { form: 'burnt', color: '#ff6a2a', opacity: 0.8, height: 1.75, sound: 'crackle' },
      tells: ['The coldest room is warmer than outside.', 'Scorch marks on touched surfaces.']
    },
    {
      id: 'hush', name: 'The Hush', threat: 4, prefers: 'quiet',
      evidence: ['thermal', 'residue', 'motion'],
      blurb: 'Sound dies around it. The quiet is the warning.',
      behaviour: 'Absorbs sound: ambient noise drops away when it is near. Its pursuits make no footsteps, but it only senses movement.',
      strengths: 'Silent pursuits.',
      weaknesses: 'Blind to anyone standing perfectly still.',
      activity: 3, huntAt: 46, speed: { roam: 1.0, hunt: 1.65, huntMax: 2.0 }, senses: ['motion'], huntLength: [20, 30], doorDelay: 1.5,
      weights: W({ sound: 0.5 }), traits: ['silentHunt', 'muffle'],
      look: { form: 'figure', color: '#7c8a96', opacity: 0.5, height: 1.8, sound: 'none' },
      tells: ['Ambient sound dips when it is close.', 'Never responds to the audio recorder with sounds — only silence.']
    }
  ];
  NW.ENTITY_BY_ID = {};
  NW.ENTITIES.forEach((e) => (NW.ENTITY_BY_ID[e.id] = e));
})(typeof window !== 'undefined' ? window : globalThis);
