/* ---------- DEMONS ---------- */
const ENEMY={
 husk:{name:'Husk',hp:45,speed:2.7,dmg:6,size:1,col:0x8a7a68,shirt:0x3a4a2a,eye:0xff3300,score:10,coins:3,ranged:true,shot:'bullet',desc:'Possessed soldier. Weak, but shoots from range.'},
 swarmling:{name:'Swarmling',hp:18,speed:7,dmg:5,size:.55,col:0xd8c8a8,shirt:0x6a4a3a,eye:0xff2200,score:4,coins:1,melee:true,beast:true,swarm:true,desc:'Tiny, fast and always in packs of four.'},
 fiend:{name:'Fiend',hp:70,speed:3.3,dmg:12,size:1.05,col:0x7a3a22,shirt:0x4a1a10,eye:0xffaa00,score:14,coins:4,ranged:true,melee:true,horns:true,shot:'fire',desc:'Hurls fireballs, then closes in to claw.'},
 leaper:{name:'Leaper',hp:55,speed:4.6,dmg:11,size:.9,col:0x6a7a4a,shirt:0x2a3a1a,eye:0xaaff00,score:14,coins:4,melee:true,leap:true,horns:true,desc:'Pounces across the room in huge arcs.'},
 gnasher:{name:'Gnasher',hp:120,speed:6.4,dmg:16,size:1.25,col:0xd06a7a,shirt:0x7a2a3a,eye:0xffee00,score:18,coins:5,melee:true,beast:true,desc:'Charging beast. Sidestep it.'},
 spitter:{name:'Spitter',hp:75,speed:2.4,dmg:8,size:1.05,col:0x6a8a3a,shirt:0x2a4a1a,eye:0xccff00,score:16,coins:5,ai:'spitter',keep:[9,18],desc:'Lobs acid that leaves burning pools. Keep moving.'},
 bloater:{name:'Bloater',hp:90,speed:1.9,dmg:34,size:1.2,col:0x8a9a3a,shirt:0x4a5a1a,eye:0xffff66,score:16,coins:5,bloat:true,desc:'Explodes when close or killed. Pop it near other demons.'},
 marksman:{name:'Marksman',hp:60,speed:2.3,dmg:24,size:1,col:0x6a6a7a,shirt:0x1a1a2a,eye:0xff0000,score:20,coins:6,ranged:true,shot:'snipe',desc:'Red laser means a shot is coming. Break line of sight.'},
 stalker:{name:'Stalker',hp:95,speed:5.6,dmg:18,size:1.05,col:0x3a3a4a,shirt:0x1a1a22,eye:0xff00aa,score:22,coins:6,melee:true,horns:true,ai:'stalker',cloak:true,desc:'Nearly invisible until it is close. Watch for the shimmer.'},
 wraith:{name:'Wraith',hp:150,speed:2.5,dmg:18,size:1.3,col:0xa8201a,shirt:0x5a0a0a,eye:0x3affff,score:24,coins:6,ranged:true,flying:true,shot:'orb',desc:'Floating demon that spits slow, heavy orbs.'},
 revenant:{name:'Revenant',hp:140,speed:3,dmg:14,size:1.15,col:0xd8ccb0,shirt:0x3a3a3a,eye:0xff6a00,score:26,coins:7,ai:'revenant',keep:[10,22],horns:true,desc:'Skeletal soldier with shoulder rockets that home in on you.'},
 shielder:{name:'Shielder',hp:190,speed:2.5,dmg:20,size:1.3,col:0x4a5a7a,shirt:0x1a2a4a,eye:0x3ac0ff,score:28,coins:8,melee:true,shield:true,horns:true,desc:'Blocks bullets from the front. Flank it, or use grenades and fire.'},
 necromancer:{name:'Necromancer',hp:220,speed:2.2,dmg:12,size:1.15,col:0x3a2a3a,shirt:0x2a1a3a,eye:0x9a5aff,score:38,coins:12,robe:true,ai:'necro',keep:[12,22],horns:true,desc:'Raises dead demons. Splatter bodies so they cannot come back.'},
 summoner:{name:'Summoner',hp:260,speed:2.2,dmg:16,size:1.2,col:0x5a3a6a,shirt:0x2a0a3a,eye:0xff44ff,score:40,coins:12,summon:true,robe:true,horns:true,desc:'Raises fresh demons and calls fire pillars. Kill it first.'},
 juggernaut:{name:'Juggernaut',hp:520,speed:1.8,dmg:30,size:1.75,col:0x4a4a52,shirt:0x2a2a30,eye:0xff3a00,score:55,coins:16,melee:true,armored:true,ai:'jugg',horns:true,desc:'Armored front. Shoot the glowing core on its back for massive damage.'},
 brute:{name:'Brute',hp:360,speed:2,dmg:28,size:1.6,col:0x5a5a3a,shirt:0x2a1a0a,eye:0x66ff22,score:40,coins:10,melee:true,ranged:true,horns:true,shot:'fire',desc:'Huge, slow and tough. Throws fireballs.'}
};

/* ---------- CAMPAIGN ---------- */
const EPISODES=[
 {name:'EPISODE I',title:'THE BREACH',desc:'The gate opened under a mining outpost. Push the horde back.'},
 {name:'EPISODE II',title:'INFERNO DEPTHS',desc:'Follow them down through bone halls and burning forges.'},
 {name:'EPISODE III',title:'THRONE OF ASH',desc:'Reach the throne. End the Arch-Warlord.'},
 {name:'EPISODE IV',title:'VOID ETERNAL',desc:'Something older waits beyond the throne. The hardest fights in the game.'}
];
const TH={
 outpost:{sky:0x1a0c0a,fog:0x2a120c,ground:0x4a4a48,block:[0x5a5a5e,0x6a3a20,0x3a3a40],torch:0xff3a1a,tpl:['pillars','plaza','halls','ledges']},
 mines:{sky:0x0c0806,fog:0x1a100a,ground:0x3a3028,block:[0x4a3a30,0x6a4a2a,0x2a2420],torch:0xffaa30,tpl:['halls','pillars','lavafield','ledges']},
 quarry:{sky:0x2a0806,fog:0x3a0c08,ground:0x6a2a1a,block:[0x7a3a22,0x5a2a18,0x8a4a2a],torch:0xff5a10,tpl:['pit','lavafield','pillars','ledges']},
 furnace:{sky:0x2a1206,fog:0x3a1a08,ground:0x3a3430,block:[0x5a4a40,0x8a3a10,0x3a3a3a],torch:0xff7a20,tpl:['tower','halls','lavafield','plaza']},
 bone:{sky:0x140a1a,fog:0x241228,ground:0xb8ad96,block:[0xe0d6c0,0x6a4a7a,0x3a2a40],torch:0xb44aff,tpl:['plaza','pillars','ledges','halls']},
 ossuary:{sky:0x160a12,fog:0x26101c,ground:0x9a8a78,block:[0xc8baa0,0x5a3a5a,0x2a1a2a],torch:0xff4ad0,tpl:['pit','lavafield','ledges','pillars']},
 magma:{sky:0x2a0a02,fog:0x4a1406,ground:0x2e2420,block:[0x3a2a22,0xff5a00,0x4a3a30],torch:0xff7a00,tpl:['lavafield','pit','tower']},
 frozen:{sky:0x060a14,fog:0x0e1626,ground:0x2a3a4a,block:[0x6a8aaa,0x3a4a5a,0x9ac0e0],torch:0x3ac0ff,tpl:['plaza','pillars','tower','halls']},
 void:{sky:0x08040e,fog:0x140a20,ground:0x2a2236,block:[0x4a3a6a,0x1a1a2a,0x8a6aff],torch:0x8a5aff,tpl:['tower','pit','ledges','plaza']},
 ash:{sky:0x0a0202,fog:0x1a0606,ground:0x2a2220,block:[0x1a1414,0x6a0a08,0x3a3030],torch:0xff2200,tpl:['pillars','lavafield','pit','plaza']},
 flesh:{sky:0x1a0408,fog:0x2a0810,ground:0x5a2028,block:[0x7a2a34,0x4a1018,0x9a4a50],torch:0xff3a6a,tpl:['halls','lavafield','pit','ledges']},
 eldritch:{sky:0x02080a,fog:0x061418,ground:0x1a2a2a,block:[0x2a4a4a,0x0a1a1a,0x3affc0],torch:0x3affc0,tpl:['tower','ledges','plaza','pillars']},
 crown:{sky:0x000000,fog:0x100008,ground:0x1a1218,block:[0x2a1a2a,0xffcf3a,0x0a0a0a],torch:0xffcf3a,tpl:['plaza','pillars','tower','pit']}
};
const ENC={p:'PURGE',g:'HELL GATES',s:'SURVIVE',e:'ELITE AMBUSH'};
const PO={a:['husk','fiend','leaper'],b:['husk','fiend','leaper','gnasher','swarmling'],c:['husk','fiend','leaper','gnasher','swarmling','bloater','spitter'],d:['husk','fiend','leaper','gnasher','swarmling','spitter','marksman'],
 e:['fiend','leaper','marksman','shielder','wraith','revenant','swarmling'],f:['fiend','leaper','marksman','shielder','wraith','revenant','stalker','bloater'],g:['fiend','gnasher','bloater','spitter','juggernaut','revenant','shielder','stalker'],
 h:['gnasher','spitter','juggernaut','revenant','shielder','stalker','necromancer','brute'],i:['wraith','marksman','shielder','leaper','stalker','revenant','swarmling','summoner'],j:['revenant','stalker','necromancer','juggernaut','wraith','brute','spitter','summoner'],
 k:['swarmling','gnasher','stalker','necromancer','juggernaut','revenant','brute','summoner','wraith','spitter','shielder','marksman']};
const BOSSES={
 ravager:{name:'RAVAGER',title:'Champion of the Breach',hp:1400,size:2.6,col:0x6a5a3a,shirt:0x2a1a0a,eye:0x66ff22,speed:3,attacks:['charge','volley','slam']},
 hound:{name:'PIT HOUND',title:'Champion of the Quarry',hp:1700,size:2.6,col:0xd06a7a,shirt:0x7a2a3a,eye:0xffee00,speed:4,beast:true,attacks:['charge','charge','slam','summon']},
 maw:{name:'IRON MAW',title:'Champion of the Furnace',hp:2000,size:3,col:0x5a4a40,shirt:0x8a3a10,eye:0xffaa00,speed:2.8,attacks:['volley','radial','pillars','acid']},
 brood:{name:'BROOD MOTHER',title:'Queen of the Deep Mines',body:'spider',hp:2300,size:3,col:0x4a3a2a,shirt:0x2a1a10,eye:0xff2200,speed:3.4,attacks:['eggs','web','acid','charge']},
 butcher:{name:'THE BUTCHER',title:'Warlord of the Breach',major:true,hp:3600,size:3.8,col:0x8a5040,shirt:0x3a0a0a,eye:0xff2200,speed:3.3,
   phases:[{attacks:['charge','slam','volley']},{attacks:['charge','slam','meteor','summon'],summon:'gnasher'},{attacks:['charge','charge','meteor','slam','homing'],fast:1.35}]},
 deacon:{name:'THE DEACON',title:'Champion of Bone',hp:2600,size:3,col:0xd8ccb0,shirt:0x4a1a5a,eye:0xb44aff,speed:2.6,attacks:['radial','pillars','summon','homing']},
 marrow:{name:'MARROW KING',title:'Champion of the Bridges',hp:3000,size:3.2,col:0xc8baa0,shirt:0x5a3a5a,eye:0xff4ad0,speed:3,attacks:['meteor','charge','radial','summon']},
 hydra:{name:'SLAG HYDRA',title:'Three-Headed Horror',body:'hydra',heads:3,hp:3200,size:3.4,col:0x3a2a22,shirt:0xff5a00,eye:0xffff44,speed:0,attacks:['radial','meteor','pillars']},
 golem:{name:'SLAG GOLEM',title:'Champion of the Crucible',hp:3600,size:3.6,col:0x3a2a22,shirt:0xff5a00,eye:0xffff44,speed:2.4,attacks:['slam','meteor','volley','pillars','acid']},
 tyrant:{name:'FORGE TYRANT',title:'Warlord of the Depths',major:true,hp:6200,size:5,col:0x3a2a22,shirt:0xff4a00,eye:0xffff44,speed:2.6,
   phases:[{attacks:['volley','radial','pillars']},{attacks:['beam','radial','meteor','pillars'],shield:true},{attacks:['beam','meteor','slam','homing','summon'],summon:'bloater',fast:1.25}]},
 widow:{name:'RIME WIDOW',title:'Spider of the Abyss',body:'spider',hp:4000,size:3.4,col:0x6a8aaa,shirt:0x0a1a2a,eye:0x3affff,speed:3.6,attacks:['web','eggs','charge','radial']},
 hollow:{name:'THE HOLLOW',title:'Eye of the Void',body:'eye',hp:4200,size:3.2,col:0xe8e0f0,shirt:0x2a1a40,eye:0x8a5aff,speed:2.4,attacks:['laserwall','homing','summon','meteor'],summon:'wraith'},
 gatekeeper:{name:'GATEKEEPER',title:'Champion of the Ninth Gate',hp:4800,size:3.8,col:0x6a0a08,shirt:0x1a0000,eye:0xff6600,speed:3,attacks:['charge','slam','pillars','beam','summon']},
 necrarch:{name:'NECRARCH',title:'Lord of the Catacombs',hp:5000,size:3.4,col:0x3a2a3a,shirt:0x2a1a3a,eye:0x9a5aff,speed:2.8,attacks:['summon','homing','teleport','radial','pillars'],summon:'necromancer'},
 arch:{name:'THE ARCH-WARLORD',title:'Lord of the Ninth Gate',major:true,hp:9500,size:6,col:0x6a0a08,shirt:0x1a0000,eye:0xffffff,speed:3.2,
   phases:[{attacks:['beam','volley','slam','summon'],summon:'fiend'},{attacks:['teleport','meteor','pillars','beam','radial'],shield:true},{attacks:['meteor','radial','beam','homing','summon'],fly:true,summon:'wraith',fast:1.2}]},
 themaw:{name:'THE MAW',title:'Garden of Teeth',body:'hydra',heads:4,hp:6000,size:3.8,col:0x7a2a34,shirt:0xff3a6a,eye:0xffee00,speed:0,attacks:['radial','meteor','acid','summon'],summon:'swarmling'},
 argus:{name:'ARGUS',title:'The Hundred-Eyed',body:'eye',hp:6800,size:3.6,col:0xe0f0e8,shirt:0x0a2a2a,eye:0x3affc0,speed:2.6,attacks:['laserwall','homing','beam','summon','meteor'],summon:'wraith'},
 empress:{name:'HIVE EMPRESS',title:'Mother of the Weeping Hive',body:'spider',hp:7800,size:4.4,col:0x7a2a34,shirt:0x2a0810,eye:0xffcc00,speed:3.4,attacks:['eggs','web','acid','charge','homing']},
 knight:{name:'THE PALE KNIGHT',title:'Sword of the Void',hp:8400,size:3.2,col:0xd8d8e8,shirt:0x1a1a2a,eye:0x8a5aff,speed:4.4,attacks:['charge','teleport','slam','beam','volley','meteor']},
 god:{name:'THE HOLLOW GOD',title:'That Which Waits Beyond',major:true,body:'eye',hp:14000,size:5,col:0xfff0d0,shirt:0x2a1a00,eye:0xffcf3a,speed:2.4,
   phases:[{attacks:['laserwall','homing','summon'],summon:'wraith'},{attacks:['beam','meteor','laserwall','pillars'],shield:true},{attacks:['laserwall','homing','meteor','summon','radial'],summon:'juggernaut',fast:1.3}]}
};
const LEVELS=[
 ['OUTPOST BREACH','outpost',4,'pp','a','ravager'],['BLOOD QUARRY','quarry',5,'pgp','b','hound'],['FURNACE WORKS','furnace',5,'psg','c','maw'],['THE DEEP MINES','mines',6,'pegp','d','brood'],["THE BUTCHER'S PIT",'quarry',6,'pgsp','d','butcher'],
 ['BONE CATHEDRAL','bone',6,'pgep','e','deacon'],['OSSUARY BRIDGES','ossuary',6,'psgp','f','marrow'],['MAGMA FOUNDRY','magma',7,'gpesp','g','hydra'],['THE CRUCIBLE','furnace',7,'pgsep','h','golem'],['FORGE OF THE TYRANT','magma',7,'pegsp','h','tyrant'],
 ['FROZEN ABYSS','frozen',7,'pegsp','i','widow'],['VOID SPIRES','void',7,'gpesp','j','hollow'],['THE NINTH GATE','ash',7,'psgep','j','gatekeeper'],['CATACOMBS OF WOE','bone',7,'pegsp','j','necrarch'],['THRONE OF ASH','ash',7,'gpesp','k','arch'],
 ['FLESH GARDENS','flesh',7,'pegsp','k','themaw'],['SPIRE OF EYES','eldritch',7,'gpesp','k','argus'],['THE WEEPING HIVE','flesh',7,'pesgp','k','empress'],['ABYSSAL CITADEL','void',7,'gpsep','k','knight'],['THE HOLLOW CROWN','crown',7,'pgesp','k','god']
].map(([name,th,rooms,enc,po,boss],i)=>Object.assign({name,ep:Math.floor(i/5),rooms,enc,pool:PO[po],boss:BOSSES[boss],par:70+rooms*40+i*6,obj:BOSSES[boss].major?'boss':'rooms'},TH[th]));
const OBJ={rooms:'ROOM ASSAULT',boss:'SLAY THE WARLORD',survival:'SURVIVAL'};

/* ---------- SAVE (extended + migration from the 12-level version) ---------- */
save=Object.assign({secrets:{},upg:{},bossKills:{},survivalLvl:0},save);
if(!save.v){try{const o=JSON.parse(localStorage.getItem('hellbreach-save-v1'));if(o){save.coins=o.coins||0;save.owned=o.owned||['pistol'];save.upg=o.upg||{};save.perks=o.perks||{};save.best=o.best||0;save.survivalLvl=o.survivalLvl||0;
  const c=o.cleared||0;save.unlocked=Math.min(LEVELS.length,Math.floor(c*5/4)+1);save.cleared=save.unlocked-1;save.migrated=true;}}catch(e){}save.v=2;}
if(save.unlocked>LEVELS.length)save.unlocked=LEVELS.length;
const ABILITY_UNLOCK={djump:2,rage:12};
function abilityOn(k){return (save.cleared||0)>=ABILITY_UNLOCK[k]||save.upg['unlock_'+k];}
/* ---------- MUSIC (procedural heavy loop) ---------- */
const MUS={on:false,next:0,step:0,bpm:150,intensity:0,boss:false,gain:null,shaper:null};
const RIFFS=[[0,0,1,0,0,7,6,0,0,0,1,0,3,1,0,-1],[0,0,12,0,0,10,0,7,0,0,12,0,3,0,5,7],[0,0,3,0,0,1,0,0,0,0,3,5,6,5,3,1],[0,0,0,6,0,0,5,0,0,0,0,3,0,1,0,-2]];
function musicInit(){
  if(!actx||MUS.gain)return;
  MUS.gain=actx.createGain();MUS.gain.gain.value=.0;MUS.gain.connect(master);
  const sh=actx.createWaveShaper();const c=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;c[i]=Math.tanh(x*6);}sh.curve=c;MUS.shaper=sh;
  const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;sh.connect(lp);lp.connect(MUS.gain);
}
function musNote(t,f,dur,vol,type='sawtooth',dist=true){const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(dist?MUS.shaper:MUS.gain);o.start(t);o.stop(t+dur+.02);}
function musNoise(t,dur,vol,freq,type='highpass'){const len=Math.floor(actx.sampleRate*dur);const b=actx.createBuffer(1,len,actx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=actx.createBufferSource();s.buffer=b;const f=actx.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=actx.createGain();g.gain.value=vol;s.connect(f);f.connect(g);g.connect(MUS.gain);s.start(t);}
function musKick(t,v){const o=actx.createOscillator(),g=actx.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(g);g.connect(MUS.gain);o.start(t);o.stop(t+.2);}
function musicTick(){
  if(!actx||!MUS.gain)return;
  const target=(G.state==='play'&&S.music>0)?S.music*.9:0;
  MUS.gain.gain.setTargetAtTime(target,actx.currentTime,.4);
  if(target===0){MUS.next=0;return;}
  const sp=60/(MUS.boss?165:MUS.bpm)/4;
  if(MUS.next<actx.currentTime)MUS.next=actx.currentTime+.05;
  const ep=(G.L&&G.L.ep)||0;const riff=RIFFS[(ep+1)%4];const root=[41.2,43.65,38.89,36.71][ep%4]*(MUS.boss?1.06:1);
  while(MUS.next<actx.currentTime+.2){
    const t=MUS.next,st=MUS.step%16,bar=Math.floor(MUS.step/16)%4,I=MUS.intensity;
    if(st%4===0||(I>.5&&st%4===2&&Math.random()<.5)||(MUS.boss&&st%2===0))musKick(t,.9);
    if(st===4||st===12)musNoise(t,.16,.5,900,'bandpass');
    if(I>.2&&st%2===0)musNoise(t,.04,.18,7000);
    if(I>.05){const n=riff[st]+(bar===3&&st>11?2:0);if(n>=0||st%2===0){const f=root*Math.pow(2,Math.max(n,-2)/12);musNote(t,f*2,sp*.9,.28);musNote(t,f*2*1.498,sp*.9,.12);}}
    if(I<=.05&&st%8===0)musNote(t,root*2,sp*6,.12,'triangle',false);
    MUS.next+=sp;MUS.step++;
  }
}
