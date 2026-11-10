/* Evidence categories. Nine in total; every entity presents exactly three.
 * `tool` names the equipment that confirms it. `hint` is shown in the
 * tablet's field manual. Adding a category here + a detector in
 * sim/evidenceSystem.js is all that is required to extend the system.
 */
(function (root) {
  'use strict';
  const NW = root.NW;
  NW.EVIDENCE = [
    { id: 'emf', name: 'EM Peak', short: 'EM', color: '#ff7a3d', tool: 'scanner',
      hint: 'Field Spectrum Scanner reaches band 5 (PEAK) near an entity interaction. Lower bands are common to every entity.' },
    { id: 'thermal', name: 'Sub-Zero Field', short: 'SZ', color: '#6fd3ff', tool: 'thermal',
      hint: 'Thermal Imaging Unit reads below 0 °C in the entity\'s resting room. Cold rooms alone are not proof.' },
    { id: 'voice', name: 'Spectral Voice', short: 'SV', color: '#d7b8ff', tool: 'recorder',
      hint: 'Ask questions (Q) while the Directional Audio Recorder is running near the entity. A response waveform is evidence.' },
    { id: 'residue', name: 'Residue Trace', short: 'RT', color: '#9cff8f', tool: 'samplekit',
      hint: 'Swab surfaces the entity touched with the Environmental Sample Kit. Its UV lamp shows touch points; lab analysis confirms residue.' },
    { id: 'optical', name: 'Optical Distortion', short: 'OD', color: '#ffd84d', tool: 'lens',
      hint: 'Distortions only visible through the Spectral Lens Camera. Photograph one to confirm.' },
    { id: 'motion', name: 'Phase Motion', short: 'PM', color: '#ff5fa8', tool: 'motion',
      hint: 'Motion Sensor Nodes register a PHASE signature (violet) when something unseen passes. Red trips are ordinary movement.' },
    { id: 'pressure', name: 'Pressure Collapse', short: 'PC', color: '#7fffd4', tool: 'pressure',
      hint: 'A Pressure Monitor records a drop of 15 hPa or more in seconds. Small drifts are normal.' },
    { id: 'inscription', name: 'Inscriptions', short: 'IN', color: '#f0e6c8', tool: 'slate',
      hint: 'Leave a Scribe Slate in an active room. Some entities mark it with symbols.' },
    { id: 'bleed', name: 'Carrier Bleed', short: 'CB', color: '#ffa0a0', tool: 'radio',
      hint: 'Hold the Personal Radio in scan mode near activity. A voice cutting through the static on an empty channel is evidence.' }
  ];
  NW.EVIDENCE_BY_ID = {};
  NW.EVIDENCE.forEach((e) => (NW.EVIDENCE_BY_ID[e.id] = e));
})(typeof window !== 'undefined' ? window : globalThis);
