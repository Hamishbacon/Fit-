/* =====================================================================
   LEVEL STYLES — every map has its own architecture, materials, props,
   sky, weather and light. Five architectures:
     facility  roofed industrial/military interiors, blast doors, catwalks
     hall      towering roofed halls: cathedrals, slaughterhouses, forges
     caves     irregular rock caverns under a rock ceiling, stalactites
     outdoor   open sky, cliffs, canyons, distant mountains
     islands   platforms floating over an abyss, joined by bridges
   ===================================================================== */
const STYLES={
 facility:{arch:'facility',wallH:11,ceil:true,erode:0,lightI:1.5,lightD:28,lightY:8.5,hemi:.42,sun:.2,expo:1,doors:'blast'},
 hall:{arch:'hall',wallH:15,ceil:true,erode:0,lightI:1.3,lightD:32,lightY:10,hemi:.3,sun:.15,expo:.95,doors:'gate'},
 caves:{arch:'caves',wallH:10,ceil:true,erode:.55,lightI:1.5,lightD:24,lightY:6,hemi:.3,sun:.1,expo:1.05,doors:'energy'},
 outdoor:{arch:'outdoor',wallH:12,ceil:false,erode:.45,lightI:.8,lightD:26,lightY:7,hemi:.5,sun:.85,expo:.9,doors:'energy'},
 islands:{arch:'islands',wallH:0,ceil:false,erode:0,lightI:1.1,lightD:28,lightY:6,hemi:.5,sun:.8,expo:.95,doors:'energy'}
};
/* per level: architecture + materials + set dressing */
const LEVEL_LOOK=[
 /* 1 Outpost Breach */ {arch:'facility',wall:[0x6a6c6a,'concrete'],floor:[0x55585a,'tile'],ceil:[0x3a3c40,'metal'],trim:0x9a8a30,cover:'crate',pillar:'column',props:['console','pipes','locker','barrel','alarm'],weather:'dust',light:0xffe6c8,tpl:['halls','pillars','ledges','plaza']},
 /* 2 Blood Quarry */ {expo:.85,arch:'outdoor',wall:[0x8a3a22,'rock'],floor:[0x7a3a24,'dirt'],cover:'boulder',pillar:'spire',props:['drill','boulder','scaffold','barrel'],weather:'dust',sky:'reddust',planet:0xd88a5a,light:0xffb070,tpl:['pit','ledges','plaza','pillars']},
 /* 3 Furnace Works */ {arch:'facility',wall:[0x5a4a40,'metal'],floor:[0x4a4440,'grate'],ceil:[0x2a2420,'metal'],trim:0xd86a10,cover:'crate',pillar:'column',props:['pipes','vat','chain','console'],weather:'embers',light:0xff8a3a,tpl:['lavafield','halls','tower','plaza']},
 /* 4 Deep Mines */ {arch:'caves',wall:[0x4a3a30,'rock'],floor:[0x3a3028,'dirt'],ceil:[0x2a2420,'rock'],cover:'cart',pillar:'timber',props:['timber','lantern','rails','crystal'],crystal:0xffaa30,weather:'dust',light:0xffb050,tpl:['halls','pillars','lavafield','ledges']},
 /* 5 Butcher's Pit */ {expo:.85,arch:'hall',wall:[0x6a3a2a,'brick'],floor:[0x5a3a34,'tile'],ceil:[0x2a1a14,'wood'],trim:0x8a1a10,cover:'block',pillar:'brickcol',props:['hooks','chain','meat','banner'],weather:'embers',light:0xff5a3a,tpl:['nave','pit','pillars','plaza']},
 /* 6 Bone Cathedral */ {expo:.8,arch:'hall',wall:[0xd0c4aa,'bone'],floor:[0x9a8a78,'floor'],ceil:[0x6a5a7a,'bone'],trim:0xb44aff,cover:'pew',pillar:'bonecol',props:['window','candles','skulls','banner'],window:0xb44aff,weather:'motes',light:0xd8a8ff,tpl:['nave','plaza','pillars','nave']},
 /* 7 Ossuary Bridges */ {expo:.62,arch:'islands',wall:[0xa89a80,'bone'],floor:[0x7a6c5a,'bone'],cover:'skullpile',pillar:'bonecol',props:['ribs','candles','skulls'],abyss:'void',abyssCol:0x2a1030,weather:'motes',sky:'purple',light:0xff7ad8,tpl:['plaza','pillars','ledges','pit']},
 /* 8 Magma Foundry */ {arch:'islands',wall:[0x2e2420,'rock'],floor:[0x34282a,'rock'],cover:'crate',pillar:'column',props:['pipes','vat','chain'],abyss:'lava',abyssCol:0xff4a00,weather:'embers',sky:'inferno',light:0xff7a2a,tpl:['tower','plaza','pit']},
 /* 9 The Crucible */ {arch:'facility',wall:[0x3a2a22,'brick'],floor:[0x4a3a32,'metal'],ceil:[0x1a1210,'metal'],trim:0xff5a00,cover:'block',pillar:'brickcol',props:['vat','runes','chain','pipes'],weather:'embers',light:0xff7a30,tpl:['pillars','halls','lavafield','plaza']},
 /* 10 Forge of the Tyrant */ {arch:'hall',wall:[0x3a2c26,'metal'],floor:[0x2e2824,'grate'],ceil:[0x1a1412,'metal'],trim:0xff4a00,cover:'anvil',pillar:'column',props:['lavafall','chain','anvil','pipes'],window:0xff5a00,weather:'embers',light:0xff6a20,tpl:['nave','lavafield','tower','plaza']},
 /* 11 Frozen Abyss */ {expo:.66,arch:'outdoor',wall:[0x8ab0d0,'ice'],floor:[0xc8d8e4,'ice'],cover:'iceblock',pillar:'icespire',props:['frozen','icespike','crystal'],crystal:0x7ad8ff,weather:'snow',sky:'aurora',light:0x9ad8ff,fog:[8,60],tpl:['plaza','pillars','tower','pit']},
 /* 12 Void Spires */ {arch:'islands',wall:[0x2a2236,'rock'],floor:[0x3a2e4a,'rock'],cover:'monolith',pillar:'obelisk',props:['runes','crystal','obelisk'],crystal:0xa87aff,abyss:'void',abyssCol:0x2a1a5a,weather:'motes',sky:'nebula',light:0xb08aff,tpl:['tower','ledges','plaza','pit']},
 /* 13 The Ninth Gate */ {arch:'outdoor',wall:[0x2a2220,'rock'],floor:[0x2e2624,'floor'],cover:'block',pillar:'brickcol',props:['brazier','banner','spikes','gatefar'],weather:'ash',sky:'eclipse',light:0xff4a2a,tpl:['pillars','plaza','pit','ledges']},
 /* 14 Catacombs of Woe */ {arch:'caves',wall:[0x5a5048,'rock'],floor:[0x6a6058,'floor'],ceil:[0x3a3430,'rock'],cover:'sarcophagus',pillar:'bonecol',props:['skulls','candles','crypt'],crystal:0x9a5aff,weather:'motes',light:0xc08aff,tpl:['pillars','halls','pit','ledges']},
 /* 15 Throne of Ash */ {arch:'hall',wall:[0x1e1818,'brick'],floor:[0x18141a,'tile'],ceil:[0x0e0a0a,'brick'],trim:0xff2200,cover:'block',pillar:'brickcol',props:['banner','brazier','throne','window'],window:0xff2a00,weather:'ash',light:0xff3a1a,tpl:['nave','plaza','pillars','pit']},
 /* 16 Flesh Gardens */ {arch:'outdoor',wall:[0x7a2a34,'flesh'],floor:[0x5a2028,'flesh'],cover:'pod',pillar:'tendril',props:['tendril','pod','eggs'],weather:'spores',sky:'sick',light:0xff6a8a,tpl:['pit','lavafield','ledges','plaza']},
 /* 17 Spire of Eyes */ {arch:'hall',wall:[0x1a2a2a,'rock'],floor:[0x1a2a2a,'tile'],ceil:[0x0a1414,'rock'],trim:0x3affc0,cover:'monolith',pillar:'obelisk',props:['eyes','runes','window'],window:0x3affc0,weather:'motes',light:0x5affd0,tpl:['tower','nave','ledges','plaza']},
 /* 18 Weeping Hive */ {arch:'caves',wall:[0x6a2430,'flesh'],floor:[0x5a2028,'flesh'],ceil:[0x4a1820,'flesh'],cover:'pod',pillar:'tendril',props:['eggs','resin','pod','crystal'],crystal:0xffcc30,weather:'spores',light:0xffaa50,tpl:['pit','pillars','halls','ledges']},
 /* 19 Abyssal Citadel */ {arch:'facility',wall:[0x3a3a4e,'metal'],floor:[0x2a2a38,'tile'],ceil:[0x1a1a24,'metal'],trim:0xa87aff,cover:'monolith',pillar:'column',props:['statue','runes','console','window'],window:0xa87aff,weather:'motes',light:0xc0a8ff,tpl:['halls','pillars','tower','ledges']},
 /* 20 Hollow Crown */ {arch:'outdoor',wall:[0x141016,'rock'],floor:[0x1e161c,'floor'],cover:'monolith',pillar:'obelisk',props:['crownsky','obelisk','crystal','runes'],crystal:0xffcf3a,weather:'motes',sky:'crown',light:0xffd890,tpl:['plaza','pillars','tower','pit']}
];
LEVELS.forEach((L,i)=>{const k=LEVEL_LOOK[i];if(!k)return;L.look=k;L.style=STYLES[k.arch];L.tpl=k.tpl;});
/* themes used by Descent / survival floors pick a look from the theme name */
const THEME_LOOK={outpost:0,quarry:1,furnace:2,mines:3,bone:5,ossuary:6,magma:7,frozen:10,void:11,ash:12,flesh:15,eldritch:16,crown:19};
function lookFor(L){if(L.look)return L.look;for(const[th,i]of Object.entries(THEME_LOOK))if(TH[th]&&TH[th].sky===L.sky&&TH[th].ground===L.ground)return LEVEL_LOOK[i];return LEVEL_LOOK[0];}
