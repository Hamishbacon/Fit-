/* Difficulty presets and optional objectives.
 *
 *  aggression        multiplier on pursuit chance and entity speed scaling
 *  reliability       chance an evidence-capable interaction actually yields its evidence
 *  falseRate         chance per minute of an isolated false reading (never repeats in a room)
 *  hiddenEvidence    how many of the entity's three evidences can never be found
 *  resources         multiplier on battery / charges
 *  eventRate         multiplier on activity frequency
 *  startComposure    starting Field Composure
 *  drain             multiplier on composure drain
 *  setup             grace seconds before the first pursuit is possible
 *  objectives        number of optional objectives
 *  reward            payout multiplier
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  NW.DIFFICULTIES = [
    { id: 'training', name: 'Training', rank: 1, aggression: 0.5, reliability: 1.0, falseRate: 0, hiddenEvidence: 0, resources: 1.5, eventRate: 1.4,
      startComposure: 100, drain: 0.6, setup: 300, objectives: 2, reward: 0.6, huntRegenInTruck: true,
      desc: 'Clear evidence, forgiving entity behaviour, a long setup window.' },
    { id: 'standard', name: 'Standard', rank: 1, aggression: 1.0, reliability: 0.85, falseRate: 0, hiddenEvidence: 0, resources: 1, eventRate: 1,
      startComposure: 100, drain: 1, setup: 180, objectives: 3, reward: 1, huntRegenInTruck: true,
      desc: 'Normal investigation conditions.' },
    { id: 'professional', name: 'Professional', rank: 3, aggression: 1.35, reliability: 0.7, falseRate: 0.5, hiddenEvidence: 0, resources: 0.8, eventRate: 1,
      startComposure: 85, drain: 1.25, setup: 90, objectives: 3, reward: 1.6, huntRegenInTruck: false,
      desc: 'Evidence is less reliable, equipment glitches, entities are more dangerous.' },
    { id: 'nightmare', name: 'Nightmare', rank: 5, aggression: 1.8, reliability: 0.55, falseRate: 1, hiddenEvidence: 1, resources: 0.6, eventRate: 1.25,
      startComposure: 70, drain: 1.5, setup: 30, objectives: 3, reward: 2.4, huntRegenInTruck: false,
      desc: 'One evidence is never present. Highly aggressive entities and heavy interference.' }
  ];
  NW.DIFFICULTY_BY_ID = {};
  NW.DIFFICULTIES.forEach((d) => (NW.DIFFICULTY_BY_ID[d.id] = d));

  /** Build a custom difficulty from slider values (0..1 normalised UI values). */
  NW.makeCustomDifficulty = function (c) {
    return {
      id: 'custom', name: 'Custom', rank: 1,
      aggression: 0.4 + c.aggression * 1.6,
      reliability: 0.45 + c.reliability * 0.55,
      falseRate: (1 - c.reliability) * 1.0,
      hiddenEvidence: c.hiddenEvidence ? 1 : 0,
      resources: 0.5 + c.resources * 1.0,
      eventRate: 0.5 + c.eventRate * 1.2,
      startComposure: Math.round(40 + c.startComposure * 60),
      drain: 0.5 + c.aggression * 1.0,
      setup: Math.round(30 + (1 - c.aggression) * 270),
      objectives: Math.max(1, Math.min(5, Math.round(c.objectives))),
      reward: 0.5, huntRegenInTruck: true,
      desc: 'Custom investigation (reduced payout).'
    };
  };

  /** Optional objectives. `check` names are evaluated by sim/objectives.js. */
  NW.OBJECTIVES = [
    { id: 'photo_entity', name: 'Photograph the entity', reward: 40 },
    { id: 'photo_distortion', name: 'Photograph an optical distortion', reward: 30 },
    { id: 'record_voice', name: 'Record a spectral voice response', reward: 30, needsEvidence: 'voice' },
    { id: 'witness', name: 'Witness a manifestation', reward: 25 },
    { id: 'swab', name: 'Collect a residue sample', reward: 25, needsEvidence: 'residue' },
    { id: 'motion_trip', name: 'Have the entity trip a motion node', reward: 25 },
    { id: 'spike_block', name: 'Prevent a pursuit with a Grounding Spike', reward: 45 },
    { id: 'survive_hunt', name: 'Survive a pursuit', reward: 35 },
    { id: 'power', name: 'Restore power to the site', reward: 20 },
    { id: 'notes', name: 'Recover two site documents', reward: 25 },
    { id: 'all_escape', name: 'Every investigator leaves alive', reward: 40, final: true },
    { id: 'temp', name: 'Find the coldest room (thermal reading under 5 °C)', reward: 20 }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
