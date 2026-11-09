/* =====================================================================
   DEAD SIGNAL — a horror campaign (MODES tab).
   Five chapters in Helix Site 9, the lab where the Warden's heart was
   taken. Always dark, flashlight only, no music, just the drone and your
   heartbeat. Tougher demons, fewer pickups, more twists, and THE PALE
   MOTHER: an unkillable thing that only moves when you are not looking.
   Rewards: double coins, big first-clear bonuses, a legendary relic per
   chapter, and the LAZARUS revolver for finishing it.
   ===================================================================== */
save.horror=Object.assign({done:{},seenIntro:false},save.horror||{});
CAST.voss={name:'DR. VOSS',role:'Helix Site 9 · deceased',col:'#c8d8c8',voice:{f:230,w:'sine',v:.045}};
CAST.mother={name:'THE PALE MOTHER',role:'',col:'#f0e8e0',demon:true,voice:{f:95,w:'sine',v:.08}};
PORTRAITS.voss={bg:['#0e1612','#030504'],pal:{h:'#141414',S:'#b8beb4',s:'#8a9088',k:'#050505',r:'#5a3a3a',w:'#c8d0c8',u:'#d8dcd8'},map:[
'................','....hhhhhhhh....','...hhhhhhhhhh...','..hhSSSSSSSShh..','..hSSSSSSSSSSh..','..hSkkSSSSkkSh..','..hSkkSSSSkkSh..','..hSSSSSSSSSSh..',
'..hSSSSssSSSSh..','..hhSSSSSSSShh..','..hhSSrrrrSShh..','..hhhSSSSSShhh..','...hh.ssss.hh...','..uuuuSSSSuuuu..','.uuuuuukkuuuuuu.','.uuuuuuuuuuuuuu.']};
PORTRAITS.mother={bg:['#141010','#020101'],pal:{w:'#e8e0d8',W:'#c8c0b8',k:'#000000',r:'#8a0000'},map:[
'................','.....wwwwww.....','....wwwwwwww....','...wwwwwwwwww...','...wwkkwwkkww...','...wwkkwwkkww...','...wwkrwwkrww...','...wwwwwwwwww...',
'....wwwwwwww....','....wwkkkkww....','....wkkkkkkw....','....wkkkkkkw....','.....wkkkkw.....','.....WwwwwW.....','......WWWW......','................']};

/* the reward weapon */
WEAPONS.push({id:'lazarus',base:'pistol',exclusive:true,name:'LAZARUS REVOLVER',cost:0,dmg:175,rate:.48,mag:6,reload:1.3,spread:.003,pellets:1,auto:false,col:0x7affc8,kick:.22,sound:'crack',pierce:true,desc:'Taken from Site 9. Every shot punches through. Awarded for surviving Dead Signal.'});
RELICS.mheart={n:'The Mother\'s Heart',r:'legendary',d:'+30 max health and blood orbs heal 50% more'};
const _auH=applyUpgrades;applyUpgrades=function(){_auH();if(relicOn('mheart'))P.maxHp+=30;};
const _orbH=spawnOrbs;spawnOrbs=function(x,y,z,n,heal){if(G.mode==='horror')n=Math.max(1,Math.round(n*.6));if(relicOn('mheart'))heal*=1.5;_orbH(x,y,z,n,heal);};

/* ---------- the campaign ---------- */
const H_LOOK=[
 {arch:'facility',wall:[0x50565a,'tile'],floor:[0x34383a,'tile'],ceil:[0x1a1c1e,'metal'],trim:0x2a8a5a,cover:'crate',pillar:'column',props:['console','locker','alarm','pipes'],weather:'dust',light:0xa8c8c0,fog:[3,30],expo:.95},
 {arch:'facility',wall:[0x6a7a84,'metal'],floor:[0x4a5a64,'tile'],ceil:[0x161c20,'metal'],trim:0x5ab8e8,cover:'sarcophagus',pillar:'column',props:['locker','frozen','chain','console'],weather:'motes',crystal:0x9ad8ff,light:0x9ad8ff,fog:[3,28],expo:.95},
 {arch:'hall',wall:[0x7a6a5a,'concrete'],floor:[0x4a3a2a,'wood'],ceil:[0x1a120c,'wood'],trim:0x6a1a10,cover:'pew',pillar:'brickcol',props:['candles','banner','window','skulls','chain'],window:0x5a1008,weather:'motes',light:0xffa060,fog:[3,30],expo:.95},
 {arch:'caves',wall:[0x3a3430,'rock'],floor:[0x4a4038,'floor'],ceil:[0x1a1614,'rock'],cover:'sarcophagus',pillar:'bonecol',props:['crypt','skulls','candles','crystal'],crystal:0x5aff9a,weather:'motes',light:0x8affc0,fog:[3,26],expo:1},
 {arch:'caves',wall:[0x6a4a4a,'flesh'],floor:[0x4a3030,'flesh'],ceil:[0x2a1414,'flesh'],cover:'pod',pillar:'tendril',props:['eggs','resin','pod','crystal'],crystal:0xff3a2a,weather:'spores',light:0xff6a5a,fog:[3,26],expo:1}
];
function hBoss(base,key,name,title,col,shirt,eye,hpMul){return Object.assign({},BOSSES[base],{key,name,title,col:col??BOSSES[base].col,shirt:shirt??BOSSES[base].shirt,eye:eye??BOSSES[base].eye,hp:Math.round(BOSSES[base].hp*(hpMul||1.4))});}
const HORROR={
 prologue:[
  {kick:'HELIX SITE 9 · TWO YEARS AGO',scene:'void',text:'Site 9 ran the first breach test. Forty-two staff went in. One thing came out: a heart, cut from something on the other side.'},
  {kick:'NOW',scene:'moon',text:'A signal is coming out of Site 9. It has been repeating for six days. It is a woman\'s voice, and it is saying your designation.',lines:[['voss','Seven. Seven, come home. You have something that isn\'t yours.']]},
  {kick:'OVERWATCH',scene:'frigate',text:'Site 9 is off every map the Coalition has. Nobody is ordered in. Nobody would go.',lines:[['okafor','Warden, there is nothing alive down there. ...You\'re going anyway, aren\'t you.'],['vesta','I will keep the light on. It is all I can do in there.']]}
 ],
 ending:[
  {kick:'SITE 9',scene:'void',text:'The Mother screamed for a long time. Then the station was quiet, for the first time in two years.',lines:[['voss','Thank you, Seven. She was in so much pain. So was I. Let us both sleep now.']]},
  {kick:'THREE DAYS LATER',scene:'moon',text:'Site 9 burned for three days. The signal stopped on the second.'},
  {kick:'THE FOURTH NIGHT',scene:'pod',text:'On the fourth night, VESTA logged something she could not explain.',lines:[['vesta','Warden. I am reading a second heartbeat in your chest. Very faint. Very patient.']]},
  {kick:'DEAD SIGNAL',scene:'void',text:'Thank you for playing. If you hear a woman\'s voice on an empty channel, do not answer it.'}
 ],
 ch:[
  {code:'I',name:'DEAD SIGNAL',loc:'Site 9 · Reception and Comms',base:18,pool:'d',boss:()=>hBoss('deacon','h_surgeon','THE SURGEON','He Kept Operating',0xd8d0c8,0x6a0a0a,0xff2a1a,1.3),
   brief:[['okafor','Site 9 went dark two years ago, the day of the first breach test. The signal started six days ago.'],['vesta','Power is at four percent. Your flashlight is the only light in that building.'],['okafor','Restore comms so I can hear you. And Warden, if the voice asks you to do anything, don\'t.']],
   obj:['Find what cut the power','Restore the comms relay','Get the survivor out','Kill the Surgeon'],
   intro:[['voss','You came. They said you wouldn\'t. I said you would. You always come home.'],['vesta','The voice is coming from every speaker in the building at once. I cannot locate it.']],
   spec:[{k:'darkness',say:{start:[['voss','Do you like the dark, Seven? I\'ve had two years to get used to it.']]}},
    {k:'activate',n:2,style:'terminal',say:{start:[['vesta','Two relay consoles. Hold at each.']],done:[['okafor','...arden? Warden, I hear you. Barely. Something is on the line with us.'],['voss','Hello, Commander.']]}},
    {k:'rescue',n:1,need:1,say:{start:[['vesta','One heat signature. Human. Alive. Somehow.']],done:[['survivor','I hid in the vents for two years. Don\'t let her see you. Don\'t look away from her either.'],['vesta','"Her"?']]}}],
   outro:[['okafor','The survivor made it to the surface. He hasn\'t stopped screaming.'],['vesta','He keeps saying one word. "Mother."'],['voss','Go down to the cold rooms, Seven. She is waiting there. She has been waiting so long.']],
   log:['voss','Test log 1. The heart is still beating outside the body. Director Hale wants it implanted. Something is scratching at the containment glass. I think it wants it back.']},
  {code:'II',name:'THE COLD ROOMS',loc:'Site 9 · Morgue and Cryo',base:10,pool:'f',stalker:true,boss:()=>hBoss('widow','h_coldman','THE COLD MAN','He Never Thawed',0xb8c8d4,0x2a3a4a,0x9ad8ff,1.35),
   brief:[['vesta','The cold rooms. Forty-two bodies, or there should be. My count keeps changing.'],['okafor','Get the morgue key, burn whatever is growing in there, restore cryo power. Then get out.']],
   obj:['Recover the morgue key','Burn the body bags','Restore cryo power','Kill the Cold Man'],
   intro:[['vesta','Movement. Tall. It stopped the moment your light touched it.'],['vesta','Warden, whatever that is, bullets did not register on it. Keep your eyes on it. Do not let it close the distance.']],
   spec:[{k:'carry',item:'core',say:{start:[['voss','The key is in Hale\'s hand. Hale won\'t mind. Hale doesn\'t mind anything anymore.']]}},
    {k:'purify',n:3,nest:'egg',say:{start:[['vesta','The body bags are moving. Burn them.']],done:[['voss','They were my friends, you know.']]}},
    {k:'capture',n:2,say:{start:[['vesta','Cryo breakers. Stand in the circles. Keep checking behind you.']]}}],
   outro:[['vesta','The thing that follows you. I have a match in the Site 9 files. Specimen M. The donor.'],['okafor','The donor of what?'],['vesta','Of the Warden\'s heart. It is the mother of the thing they cut it from. And it has followed the heart all the way here.']],
   log:['voss','Test log 9. We put the heart in Subject One. He lasted a day. Specimen M stood outside his room the whole time. Not moving. Only when no one was watching.']},
  {code:'III',name:'LULLABY',loc:'Site 9 · Staff Chapel and Daycare',base:5,pool:'h',stalker:true,boss:()=>hBoss('hollow','h_lullaby','LULLABY','Sing Her to Sleep',0xe8e0d8,0x1a1a1a,0xff3a1a,1.35),
   brief:[['okafor','The staff families lived on-site. There was a daycare. I am sorry, Warden. I didn\'t know.'],['vesta','The generator room is past the chapel. Hold it until the lights come back.']],
   obj:['Hold the generator','Survive the lights going out','Kill the Nurse and the Orderly','Kill Lullaby'],
   intro:[['voss','Do you hear them singing? The children always sang when she came. It helped.'],['vesta','I am hearing singing, Warden. There is no one here to sing.']],
   spec:[{k:'defend',obj:'uplink',t:45,say:{start:[['vesta','Generator spinning up. Forty-five seconds. Keep it alive.']],done:[['vesta','Power restored. ...And gone again.']]}},
    {k:'darkness',say:{start:[['voss','Shh. Shh. Lights out, little ones.']]}},
    {k:'assassinate',n:2,names:['THE NURSE','THE ORDERLY'],say:{start:[['voss','My colleagues. They still do their rounds.']]}}],
   outro:[['voss','I was the one who asked for the daycare, Seven. I wanted the families close. I wanted everyone close.'],['vesta','Warden. Dr. Voss\'s quarters are directly below us. Her voice is coming from there.']],
   log:['voss','Test log 17. Specimen M has learned to sing. It sings the songs the children sing. The children have stopped being afraid of it. That frightens me more than anything.']},
  {code:'IV',name:'WHAT WAS TAKEN',loc:'Site 9 · Deep Archive',base:13,pool:'j',stalker:true,boss:()=>hBoss('necrarch','h_archivist','THE ARCHIVIST','Keeper of Every Scream',0x8a8a7a,0x1a1a14,0x5aff9a,1.35),
   brief:[['vesta','The deep archive holds the Site 9 research. The truth about your heart is in there.'],['okafor','And so are the doctors who ran the test. What is left of them.']],
   obj:['Cross the collapsing stacks','Carry out Voss\'s research','Kill the Hollow Doctors','Kill the Archivist'],
   intro:[['voss','You want to know what we did. Come and read it. I wrote it all down. I wrote it on the walls when they took the paper away.']],
   spec:[{k:'gauntlet',say:{start:[['vesta','The ceiling is coming down. Move.']]}},
    {k:'carry',item:'shard',say:{start:[['vesta','The research core. It will slow you. She will not be slow.']],done:[['vesta','Reading. Warden... they didn\'t take the heart from a dead specimen. They took it from Specimen M\'s child. While it was alive. While she watched.']]}},
    {k:'assassinate',n:3,names:['DR. HALE','DR. MERCER','DR. VOSS'],say:{start:[['voss','There I am. Don\'t look at me, Seven. I wasn\'t pretty even before.']]}}],
   outro:[['voss','Now you know. I held the scalpel. She has been punishing me for two years, and I deserve every second of it.'],['voss','But you don\'t, Seven. So go to the nest, and give her back what we took. Or kill her. I don\'t think she minds which anymore.'],['okafor','Warden, you are not giving anyone your heart.'],['vesta','Commander, I don\'t think it is up to us.']],
   log:['voss','Final test log. The heart is gone. Subject Seven took it, at Okafor\'s base. Specimen M has gone quiet. I think she is waiting. I think she is very good at waiting.']},
  {code:'V',name:'THE MOTHER',loc:'Site 9 · The Nest',base:17,pool:'k',stalker:true,escape:{t:70},boss:()=>hBoss('empress','h_mother','THE PALE MOTHER','She Wants Her Child Back',0xe8e0d8,0x1a1a1a,0xff1a1a,1.5),
   brief:[['vesta','The nest. The test chamber became her home. Everything in Site 9 grows from there.'],['okafor','Burn it out. Overload the chamber. Then run.'],['voss','She will come to you herself this time. She is tired of waiting.']],
   obj:['Burn the nest','Hold while the chamber overloads','Plant the charges','Kill the Pale Mother','Escape Site 9'],
   intro:[['mother','MINE.'],['vesta','Warden. Your heart rate just doubled. That isn\'t you. That is the heart. It knows she is here.']],
   spec:[{k:'purify',n:4,nest:'growth',rate:1.5,say:{start:[['vesta','Burn the growths. They are feeding her.']]}},
    {k:'holdout',obj:'lantern',t:55,say:{start:[['vesta','Chamber overloading. Stay in the ring.']],done:[['vesta','Overload primed. Charges next.']]}},
    {k:'activate',n:3,style:'charge',boom:true,say:{start:[['voss','Plant them, Seven. All of them. Bring the roof down on all of us.']]}}],
   escapeSay:[['vesta','Site 9 is coming down! Get to the lift! Do not look back. Actually, Warden, DO look back. Keep your eyes on her!']],
   outro:[['vesta','We are out. The station is gone.'],['okafor','Warden. Come home.']],
   log:['mother','*a sound like a lullaby, played backwards, very slowly*']}
 ]
};
STORY.bossLines.h_surgeon={intro:'HOLD STILL. THIS WILL HURT, AND THEN IT WILL HURT MORE.',low:'I AM NOT FINISHED...',death:'*the bone saw spins down*',hint:[['vesta','Keep moving. Its homing shots turn slowly.']]};
STORY.bossLines.h_coldman={intro:'SO COLD. SO COLD. COME AND SHARE YOUR WARMTH.',low:'WARM... SO WARM...',death:'*ice cracking, then silence*',hint:[['vesta','Its webs slow you. Dash out of them.']]};
STORY.bossLines.h_lullaby={intro:'HUSH, LITTLE LIGHT. DON\'T SAY A WORD.',low:'THE SONG... IS ENDING...',death:'*a child\'s music box winds down*',hint:[['vesta','It is only vulnerable with its eye open.']]};
STORY.bossLines.h_archivist={intro:'EVERY SCREAM IN THIS PLACE IS FILED. YOURS WILL BE THE LAST.',low:'THE RECORDS... BURN...',death:'*pages, falling*',hint:[['vesta','It raises the dead. Kill the necromancers first.']]};
STORY.bossLines.h_mother={voice:'mother',intro:'GIVE. IT. BACK.',p2:'MY CHILD. MY CHILD IS IN YOU.',p3:'THEN I WILL TAKE YOU BOTH.',low:'...SO TIRED...',death:'SLEEP... MY CHILD... SLEEP...',hint:[['vesta','Break her guard with headshots. Do not let the brood surround you.']]};

function horrorLevel(c){const C_=HORROR.ch[c];const base=LEVELS[C_.base];
  return Object.assign({},base,{name:'SITE 9 · '+C_.name,ep:Math.min(3,1+Math.floor(c*.7)),rooms:5,pool:PO[C_.pool],boss:C_.boss(),par:9999,obj:'rooms',sky:0x020203,fog:0x040405,torch:0x6a2a1a,
    look:H_LOOK[c],style:STYLES[H_LOOK[c].arch],tpl:STYLES[H_LOOK[c].arch]===STYLES.hall?['nave','pillars','plaza']:['halls','pillars','ledges','pit'],
    mission:{code:'DS-'+C_.code,name:C_.name,time:'SITE 9',spec:C_.spec,obj:C_.obj,rooms:5,intro:C_.intro,outro:C_.outro,escape:C_.escape,escapeSay:C_.escapeSay,horror:c}});}

/* ---------- flow: brief → chapter → result ---------- */
const Horror={
 unlocked(c){return c===0||!!save.horror.done[c-1];},
 begin(c){if(c===0&&!save.horror.seenIntro){save.horror.seenIntro=true;persist();playCards(HORROR.prologue,()=>Horror.brief(0));return;}Horror.brief(c);},
 brief(c){const C_=HORROR.ch[c];showMenu();$('menu').hidden=true;G.state='brief';const first=!save.horror.done[c];
  $('briefBody').innerHTML='<div class="bhead"><span style="color:#7affc8">DEAD SIGNAL · CHAPTER '+C_.code+'</span><h2>'+C_.name+'</h2><p>'+C_.loc+'</p></div>'+
   '<div class="bcols"><div class="bmain"><div class="bk">BRIEFING</div><div id="br_lines"></div></div><div class="bside"><div class="bk">OBJECTIVES</div><ol class="bobj">'+C_.obj.map(o=>'<li>'+o+'</li>').join('')+'</ol>'+
   '<div class="bk">WARNING</div><div class="bint" style="color:#ff6a5a">Total darkness. Flashlight only. Tougher demons, fewer pickups, no squad.'+(C_.stalker?' <b>The Pale Mother is hunting you. She only moves when you are not looking at her.</b>':'')+'</div>'+
   '<div class="bk">REWARD</div><div class="bint" style="color:#ffcf3a">Double coins during the chapter.'+(first?' First clear: '+(1500*(c+1))+' coins, '+(3000*(c+1))+' XP, 1 skill point and a legendary relic'+(c===4?', plus the LAZARUS REVOLVER':'')+'.':' Already cleared: replay for double coins.')+'</div></div></div>'+
   '<div class="row"><button class="go" id="br_go">ENTER SITE 9</button><button id="br_back">BACK</button></div><div class="help">Best played with headphones, in the dark.</div>';
  BR.lines=C_.brief.slice();BR.i=0;BR.t=.35;$('brief').hidden=false;
  $('br_go').onclick=()=>{$('brief').hidden=true;BR.lines=null;audioInit();Horror.start(c);};
  $('br_back').onclick=()=>{$('brief').hidden=true;BR.lines=null;showMenu();renderTab('survival');};},
 start(c){const L=horrorLevel(c);const idx=HORROR.ch[c].base;const saved=LEVELS[idx];LEVELS[idx]=L;G._modeNext='horror';G.horrorCh=c;
  try{startRun(idx,false);}finally{LEVELS[idx]=saved;}
  G.levelIdx=Math.min(19,8+c*3);for(const s of G.secrets)scene.remove(s.m);G.secrets=[];
  G.darkLevel=true;setDark(true);if(scene.fog){scene.fog.near=G.fogN=3;scene.fog.far=G.fogF=30;}
  const M=curMission();banner(M.name,'DEAD SIGNAL · CHAPTER '+HORROR.ch[c].code,3);Comms.clear();Comms.seq(M.intro.map((l,i)=>i?l:[l[0],l[1],{delay:1.5}]));
  Drone.start();G.scareT=rand(12,20);Weeper.reset(HORROR.ch[c].stalker);missionIntro(M,-1);
  // the chapter's datapad
  placeHorrorLog(c);},
 end(won){const c=G.horrorCh,C_=HORROR.ch[c],first=won&&!save.horror.done[c];const res=$('resbody');let rew='';
  if(won){save.horror.done[c]=1;if(first){const coins=1500*(c+1);save.coins+=coins;addXp(3000*(c+1));save.sp=(save.sp||0)+1;
     const leg=Object.keys(RELICS).filter(k=>RELICS[k].r==='legendary'&&!save.relics[k]);const rel=c===4||!leg.length?'mheart':leg[Math.floor(Math.random()*leg.length)];giveRelic(rel);
     rew='<div class="unlock">FIRST CLEAR<small>+'+coins+' coins · +'+(3000*(c+1))+' XP · +1 skill point · '+RELICS[rel].n+'</small></div>';
     if(c===4&&!save.owned.includes('lazarus')){save.owned.push('lazarus');rew+='<div class="unlock" style="border-color:#7affc8;color:#aaffd8">LAZARUS REVOLVER UNLOCKED<small>Six shots. Every one goes through everything.</small></div>';}}persist();}
  const h2=res.querySelector('h2');if(h2)h2.innerHTML=won?'YOU SURVIVED<small class="mname">CHAPTER '+C_.code+' · '+C_.name+'</small>':(G.failMsg?'MISSION FAILED<small class="mname">'+G.failMsg+'</small>':'YOU DIED<small class="mname">Site 9 keeps you</small>');
  const tbl=res.querySelector('.tbl');if(tbl)tbl.innerHTML='<span>KILLS</span><span>'+G.kills+'</span><span>TIME</span><span>'+fmt(G.time)+'</span><span>COINS</span><span>'+G.earned+' (doubled)</span>';
  const box=document.createElement('div');box.className='debrief';box.innerHTML=(won?C_.outro:[['voss',['Stay, Seven. Stay with us.','She is so close to you now.','Again? Good. I hate being alone.'][Math.floor(Math.random()*3)]]]).map(l=>portraitLine(l[0],l[1])).join('')+rew;
  res.insertBefore(box,h2?h2.nextSibling:res.firstChild);paintPorts(box);
  const help=res.querySelector('.help');if(help)help.remove();
  const row=res.querySelector('.row');row.innerHTML='';const btn=(t,f,go)=>{const b=document.createElement('button');b.textContent=t;if(go)b.className='go';b.onclick=f;row.appendChild(b);};
  if(won){if(c<4)btn('NEXT CHAPTER',()=>Horror.brief(c+1),true);else btn('THE END',()=>playCards(HORROR.ending,()=>{showMenu();renderTab('survival');}),true);}
  else if(G.cp)btn('RETRY FROM CHECKPOINT',()=>{restoreCheckpoint();Drone.start();},true);
  btn(won?'REPLAY':'RESTART CHAPTER',()=>Horror.start(c),!won&&!G.cp);btn('MENU',()=>{showMenu();renderTab('survival');});}
};
const _erH=endRun;
endRun=function(won){const h=G.mode==='horror'&&G.state==='play';Drone.stop();Weeper.hide();_erH(won);if(h)Horror.end(won);};

/* ---------- difficulty and rewards ---------- */
const _spH=spawnEnemy;spawnEnemy=function(t,x,z){const e=_spH(t,x,z);if(e&&G.mode==='horror'){e.hp*=1.45;e.max*=1.45;e.dmg*=1.3;e.speed*=1.06;}return e;};
const _dpH=dropPickup;dropPickup=function(x,z,k){if(G.mode==='horror'&&Math.random()<.5)return;_dpH(x,z,k);};
const _cmH=coinMul;coinMul=function(){return _cmH()*(G.mode==='horror'?2:1);};
const _axH=addXp;addXp=function(n){_axH(G.mode==='horror'?n*1.6:n);};

/* ---------- atmosphere: drone, heartbeat, scares, grade ---------- */
const Drone={nodes:null,
 start(){if(!actx||this.nodes)return;const g=actx.createGain();g.gain.value=0;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=220;lp.connect(g);g.connect(master);
  const osc=[55,55.6,82.4].map((f,i)=>{const o=actx.createOscillator();o.type=i===2?'sine':'sawtooth';o.frequency.value=f;o.connect(lp);o.start();return o;});
  const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=.07;lg.gain.value=90;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
  this.nodes={g,osc,lfo};g.gain.setTargetAtTime(.09*(S.vol>0?1:0),actx.currentTime,2);},
 stop(){if(!this.nodes)return;const n=this.nodes;this.nodes=null;n.g.gain.setTargetAtTime(0,actx.currentTime,.4);setTimeout(()=>{n.osc.forEach(o=>o.stop());n.lfo.stop();n.g.disconnect();},1500);}
};
function beat(v){tone('sine',62,38,.13,.5*v);setTimeout(()=>tone('sine',55,34,.12,.35*v),190);}
function scream(){tone('sawtooth',900,1500,.6,.22);tone('sawtooth',1340,2100,.5,.14);tone('',3000,0,.5,.3,true);}
const SCARES=[
 ()=>{tone('',400,0,.25,.5,true);setTimeout(()=>tone('',380,0,.25,.5,true),350);setTimeout(()=>tone('',360,0,.3,.6,true),700);feed('...');},
 ()=>{tone('sawtooth',700,300,1.4,.05);tone('sine',1200,900,1.4,.03);},
 ()=>{const l=STORY.chatter.horror[Math.floor(Math.random()*STORY.chatter.horror.length)];Comms.say(l[0],l[1],{low:true,dur:3});},
 ()=>{let n=0;const iv=setInterval(()=>{flashlight.intensity=n%2?2.6:0;if(++n>9){clearInterval(iv);flashlight.intensity=2.6;}},70);tone('',5000,0,.3,.06,true);},
 ()=>{Weeper.glimpse();}
];
STORY.chatter.horror=[['voss','Seven... down here...'],['voss','Do you remember the cold? You were so small when the heart went in.'],['voss','Don\'t turn around.'],['voss','She is closer than you think.'],['mother','...mine...'],['vesta','I heard something behind you. Then it stopped.'],['voss','We used to sing here.']];
frameHooks.push(dt=>{if(G.mode!=='horror'||G.trial){$('horrorFx').style.opacity=0;return;}
  G.scareT-=dt;if(G.scareT<=0&&!G.bossE){G.scareT=rand(20,38);SCARES[Math.floor(Math.random()*SCARES.length)]();}
  const d=Weeper.active?Weeper.dist():99;const danger=Math.max(d<20?1-d/20:0,P.hp<P.maxHp*.35?.6:0);
  G.beatT=(G.beatT||0)-dt;if(danger>.05&&G.beatT<=0){G.beatT=1.1-danger*.65;beat(.4+danger*.8);}
  $('horrorFx').style.opacity=.55+danger*.4;});
const _rfH=renderFrame;
renderFrame=function(){if(Post.on){const h=G.mode==='horror'&&['play','cine','result','paused'].includes(G.state);const u=Post.grade.uniforms;u.sat.value=h?.45:1.12;u.grain.value=h?.09:.035;u.vig.value=h?1.5:.85;}_rfH();};
const _mtH=musicTick;musicTick=function(){if(G.mode==='horror'){const m=S.music;S.music=0;_mtH();S.music=m;return;}_mtH();};

/* ---------- THE PALE MOTHER (the stalker) ---------- */
const Weeper={g:null,active:false,pos:new THREE.Vector3(),cd:0,stuck:0,last:new THREE.Vector3(),seenT:0,unseenT:0,stingT:0,warned:false,
 build(){const H=makeHuman({helmet:false,gun:false,skin:0xe8e2da,suit:0xd8d0c8,armor:0xe0d8d0,hair:0x080808,coat:0xd8d0c8});
  H.g.traverse(o=>{if(o.isMesh&&!o.userData.keep)o.material=new THREE.MeshStandardMaterial({color:0xe4ded6,roughness:.95});});
  H.armL.scale.set(.8,1.7,.8);H.armR.scale.set(.8,1.7,.8);H.legL.scale.y=1.2;H.legR.scale.y=1.2;H.body.scale.set(.85,1.25,.85);
  for(const sx of[-.08,.08]){const e=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0x000000}));e.scale.set(.1,.12,.02);e.position.set(sx,.03,.19);H.head.add(e);const r=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xff1010}));r.scale.setScalar(.025);r.position.set(sx,.03,.2);H.head.add(r);}
  const mouth=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0x000000}));mouth.scale.set(.16,.14,.02);mouth.position.set(0,-.12,.19);H.head.add(mouth);
  H.armL.rotation.x=H.armR.rotation.x=-.25;this.H=H;this.g=H.g;},
 reset(on){this.hide();this.active=false;this.on=!!on;this.cd=on?rand(25,40):0;this.warned=false;},
 hide(){if(this.g&&this.g.parent)this.g.parent.remove(this.g);this.active=false;},
 dist(){return Math.hypot(this.pos.x-P.pos.x,this.pos.z-P.pos.z);},
 place(minD,maxD,roomOnly){const R=curRoomObj();const c=openCells((t,i,j,k)=>t===T_FLOOR&&grid.roomOf[k]>=0&&(!roomOnly||!R||grid.roomOf[k]===R.idx)&&(()=>{const d=Math.hypot(cx(i)-P.pos.x,cx(j)-P.pos.z);return d>minD&&d<maxD;})()).sort(()=>Math.random()-.5);
  for(const[i,j]of c){this.pos.set(cx(i),0,cx(j));if(!this.seen())return true;}return false;},
 seen(){const v=this.pos.clone();v.y=surfaceAt(v.x,v.z)+1.6;const d=this.dist();if(d>30)return false;const p=v.clone().project(camera);if(p.z>1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1)return false;
  const from=camera.getWorldPosition(new THREE.Vector3());const dir=v.clone().sub(from);const L=dir.length();ray.set(from,dir.normalize());ray.far=L;return!ray.intersectObjects(solidMeshes,false).length;},
 spawn(){if(!this.g)this.build();if(!this.place(18,40,false)&&!this.place(12,40,false))return;this.active=true;this.stuck=0;world.add(this.g);this.g.position.copy(this.pos);
  if(!this.warned){this.warned=true;setTimeout(()=>{if(this.active)Comms.say('vesta','Something tall is in the building with you. When your light is on it, it stops. Keep it in the light.',{now:true,dur:4});},1500);}},
 glimpse(){if(!this.on||this.active||G.bossE)return;if(!this.g)this.build();const fwd=V3(-Math.sin(P.yaw),0,-Math.cos(P.yaw));const p=P.pos.clone().addScaledVector(fwd,16);if(grid.t[idx(ci(p.x),ci(p.z))]!==T_FLOOR)return;
  this.g.position.set(p.x,surfaceAt(p.x,p.z),p.z);this.g.rotation.y=Math.atan2(P.pos.x-p.x,P.pos.z-p.z);world.add(this.g);tone('sawtooth',1100,1500,.4,.12);setTimeout(()=>{if(!this.active&&this.g.parent)this.g.parent.remove(this.g);},350);},
 tick(dt){if(G.mode!=='horror'||!this.on||G.trial)return;if(G.state!=='play'||G.bossE||G.pendingBoss){if(this.active&&G.bossE)this.hide();return;}
  if(!this.active){this.cd-=dt;if(this.cd<=0)this.spawn();return;}
  const seen=this.seen();const d=this.dist();this.stingT-=dt;
  if(seen){this.seenT+=dt;if(this.unseenT>1.2&&d<14&&this.stingT<=0){this.stingT=5;tone('sawtooth',1200,1550,.35,.16);tone('square',600,820,.35,.06);}this.unseenT=0;
    this.H.head.rotation.z=Math.sin(G.time*31)*.03;}
  else{this.unseenT+=dt;const dir=new THREE.Vector3();navDir({pos:this.pos},dir);const spd=7.2+G.horrorCh*.6;this.pos.addScaledVector(dir,spd*dt);resolveXZ(this.pos,.4,0,2.4);
    this.g.rotation.y=Math.atan2(P.pos.x-this.pos.x,P.pos.z-this.pos.z);
    if(this.pos.distanceTo(this.last)<spd*dt*.2){this.stuck+=dt;if(this.stuck>2.5&&d>8){this.stuck=0;this.place(10,18,true)||this.place(10,22,false);}}else this.stuck=0;}
  this.last.copy(this.pos);this.pos.y=surfaceAt(this.pos.x,this.pos.z);this.g.position.copy(this.pos);
  if(!seen&&d<10&&Math.random()<.08)flashlight.intensity=rand(0,1.2);
  if(d<1.6){hurtPlayer(48+G.horrorCh*6,true);scream();shake(1.2);$('gibflash').style.background='#e8e0d8';$('gibflash').style.opacity=.85;setTimeout(()=>{$('gibflash').style.opacity=0;$('gibflash').style.background='';},160);
    feed('SHE FOUND YOU');this.hide();this.cd=rand(16,26);}
 }
};
frameHooks.push(dt=>Weeper.tick(dt));
/* shooting her does nothing; tell the player once */
const _tfH=tryFire;tryFire=function(){_tfH();if(G.mode==='horror'&&Weeper.active&&!G._wShot&&Weeper.seen()){const f=V3(-Math.sin(P.yaw),0,-Math.cos(P.yaw));const to=Weeper.pos.clone().sub(P.pos).setY(0).normalize();
  if(f.dot(to)>.97){G._wShot=true;Comms.say('vesta','Bullets go straight through her. Don\'t waste ammo. Just don\'t look away.',{now:true,dur:3});}}};
const _ceH=clearEntities;clearEntities=function(){_ceH();Weeper.hide();if(G.mode!=='horror')Drone.stop();G._wShot=false;};

/* each chapter hides one Site 9 log */
save.horror.logs=save.horror.logs||{};
function placeHorrorLog(c){const mains=grid.rooms.filter(r=>r.type==='main');if(!mains.length)return;const R=mains[Math.floor(Math.random()*mains.length)];
  const cell=openCells((t,i,j)=>t===T_FLOOR&&inRoom(R,i,j,1)).sort(()=>Math.random()-.5)[0];if(!cell)return;const x=cx(cell[0]),z=cx(cell[1]),y=surfaceAt(x,z);
  const g=new THREE.Group();boxIn(g,skinMat(0x2a2a30),.55,.08,.38,0,.05,0);const led=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0x7affc8}));led.scale.setScalar(.1);led.position.y=.5;g.add(led);
  g.position.set(x,y,z);world.add(g);G.hlog={c,g,led,pos:V3(x,y,z),got:!!save.horror.logs[c]};if(G.hlog.got)led.material=new THREE.MeshBasicMaterial({color:0x2a3a34});}
frameHooks.push(dt=>{const L=G.hlog;if(G.mode!=='horror'||!L||L.got||!L.led)return;L.led.visible=Math.floor(G.time*2.5)%2===0;
  if(Math.hypot(P.pos.x-L.pos.x,P.pos.z-L.pos.z)<1.5){L.got=true;L.led.visible=false;save.horror.logs[L.c]=1;persist();const lg=HORROR.ch[L.c].log;
    toast('SITE 9 LOG','Recovered','','#7affc8');Comms.say(lg[0],lg[1],{dur:Math.max(5,lg[1].length*.055)});tone('sine',300,150,.6,.15);}});

/* ---------- menu card ---------- */
const _mrH=Modes.render.bind(Modes);
Modes.render=function(P_){_mrH(P_);const box=P_.querySelector('.modes');if(!box)return;const d=document.createElement('div');d.className='mode wide horror';
  const all=HORROR.ch.every((c,i)=>save.horror.done[i]);
  d.innerHTML='<h3>DEAD SIGNAL <em>HORROR CAMPAIGN</em></h3><div class="meta">Five chapters inside Helix Site 9, the lab where the Warden\'s heart was taken. Total darkness, flashlight only, no music. Tougher demons, fewer pickups, no squad. Something pale is hunting you, and it only moves when you are not looking at it.</div>'+
   '<div class="meta"><b style="color:#ffcf3a">Rewards:</b> double coins, big first-clear bonuses, a legendary relic per chapter'+(save.owned.includes('lazarus')?' · <b style="color:#7affc8">LAZARUS REVOLVER OWNED</b>':', and the LAZARUS REVOLVER for surviving all five.')+'</div>'+
   '<div class="rush">'+HORROR.ch.map((c,i)=>'<button '+(Horror.unlocked(i)?'':'disabled ')+'data-hch="'+i+'">'+(save.horror.done[i]?'✓ ':'')+c.code+' · '+c.name+(Horror.unlocked(i)?'':' · LOCKED')+'</button>').join('')+'</div>'+
   (all?'<div class="meta">You survived. <a href="#" id="hEnd" style="color:#7affc8">Watch the ending again</a></div>':'');
  box.prepend(d);d.querySelectorAll('[data-hch]').forEach(b=>b.onclick=()=>Horror.begin(+b.dataset.hch));const e=d.querySelector('#hEnd');if(e)e.onclick=ev=>{ev.preventDefault();playCards(HORROR.ending,()=>{showMenu();renderTab('survival');});};};

const _twH=trialWhere;trialWhere=function(id){return id==='lazarus'?'DEAD SIGNAL (SURVIVE ALL 5)':_twH(id);};
