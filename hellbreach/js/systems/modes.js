/* =====================================================================
   MODES — play outside the story.
   SURVIVAL  endless waves (original).
   HORDE     waves with SKULLS: modifiers that make it harder and
             multiply your score.
   BOSS RUSH every champion and Warlord of an episode, back to back.
   DAILY     one seeded arena, skulls and mutator per day. Same for everyone.
   DESCENT   roguelite: random multi-room floors with random objectives.
             Pick a boon between floors. One life.
   ===================================================================== */
save.modes=Object.assign({horde:0,rush:{},daily:{},descent:0,skulls:[]},save.modes||{});
const SKULLS={
 iron:{n:'IRON',d:'No armor. Ever.',m:.3},
 famine:{n:'FAMINE',d:'Half the blood orbs and pickups.',m:.4},
 thunder:{n:'THUNDERSTORM',d:'A third of all demons are elites.',m:.5},
 tilt:{n:'TILT',d:'Body shots deal 40% less. Headshots deal 40% more.',m:.3},
 fury:{n:'FURY',d:'Demons move 25% faster and hit 15% harder.',m:.4},
 blackout:{n:'BLACKOUT',d:'The lights are out. Flashlight only.',m:.3},
 glass:{n:'GLASS',d:'You have 50 maximum health.',m:.6},
 mythic:{n:'MYTHIC',d:'Demons have 60% more health.',m:.5}
};
const BOONS={
 dmg:{n:'SHARPENED HATE',d:'+15% damage.'},vit:{n:'IRON BLOOD',d:'+25 maximum health.'},leech:{n:'LEECH',d:'Headshots heal 3 health.'},
 nades:{n:'BANDOLIER',d:'+2 grenades, and one regrows every 20 seconds.'},dash:{n:'PHASE STEP',d:'+1 dash charge.'},rage:{n:'WRATH',d:'Rage builds 35% faster.'},
 boom:{n:'VOLATILE',d:'Kills have a 15% chance to explode.'},armor:{n:'BULWARK',d:'Start every floor with full armor.'},swift:{n:'SWIFT',d:'+12% movement speed.'},
 reload:{n:'SLEIGHT',d:'Reload 20% faster.'},orbs:{n:'GLUTTON',d:'Blood orbs heal 35% more.'},crit:{n:'EXECUTIONER',d:'10% of hits deal triple damage.'}
};
const skullOn=k=>(G.mode==='horde'||G.mode==='daily')&&G.skulls&&G.skulls.includes(k);
const boonN=k=>G.mode==='descent'&&G.descent?G.descent.boons.filter(b=>b===k).length:0;
const skullMult=list=>1+(list||[]).reduce((s,k)=>s+SKULLS[k].m,0);

/* ---------- MODIFIER HOOKS ---------- */
const _spM=spawnEnemy;
spawnEnemy=function(type,x,z){const e=_spM(type,x,z);if(!e)return e;
  if(skullOn('fury')){e.speed*=1.25;e.dmg*=1.15;}if(skullOn('mythic')){e.hp*=1.6;e.max*=1.6;}return e;};
const _orbM=spawnOrbs;spawnOrbs=function(x,y,z,n,heal){if(skullOn('famine'))n=Math.ceil(n/2);heal*=1+.35*boonN('orbs');_orbM(x,y,z,n,heal);};
const _dropM=dropPickup;dropPickup=function(x,z,k){if(skullOn('famine')&&Math.random()<.5)return;_dropM(x,z,k);};
const _dmM=damageEnemy;
damageEnemy=function(e,amt,head,point,src){const pl=src===undefined||src==='proj'||src==='explosive';
  if(pl&&skullOn('tilt'))amt*=head?1.4:.6;
  if(pl&&G.mode==='descent'){amt*=1+.15*boonN('dmg');if(boonN('crit')&&Math.random()<.1*boonN('crit')){amt*=3;if(point)burst(point,0xffcf3a,6,4,.8,.3);}
    if(head&&boonN('leech'))P.hp=Math.min(P.maxHp,P.hp+3*boonN('leech'));}
  _dmM(e,amt,head,point,src);};
const _kM=killEnemy;killEnemy=function(e,h,o){const st=e.T.static,pos=e.pos.clone();_kM(e,h,o);if(!st&&!e.boss&&boonN('boom')&&!G._boonBoom&&Math.random()<.15*boonN('boom')){G._boonBoom=true;explode(pos.setY(pos.y+1),4,120,0xff8a3a);G._boonBoom=false;}};
const _auM=applyUpgrades;applyUpgrades=function(){_auM();if(skullOn('glass'))P.maxHp=50;P.maxHp+=25*boonN('vit');P.maxDash+=boonN('dash');P.maxNades+=2*boonN('nades');if(boonN('swift'))P.spdMul=(P.spdMul||1)*(1+.12*boonN('swift'));};
const _rmM=rageMul;rageMul=function(){return _rmM()*(1+.35*boonN('rage'));};
const _rlM=reloadMul;reloadMul=function(){return _rlM()*(boonN('reload')?Math.pow(.8,boonN('reload')):1);};
frameHooks.push(dt=>{
  if(skullOn('iron'))P.armor=0;if(skullOn('thunder'))G.forceElite=.33;
  if(boonN('nades')){G._nadeT=(G._nadeT||20)-dt;if(G._nadeT<=0){G._nadeT=20;if(P.nades<P.maxNades){P.nades++;feed('+1 GRENADE');}}}
  if(G.mode==='bossrush'&&G.rush)$('wave').innerHTML='BOSS <b>'+Math.min(G.rush.i,G.rush.list.length)+'/'+G.rush.list.length+'</b>';
  if(G.mode==='descent'&&G.descent)$('wave').innerHTML='FLOOR <b>'+G.descent.floor+'</b>';
});

/* ---------- WAVE LOGIC PER MODE ---------- */
const _survTickM=survivalTick;
survivalTick=function(E,dt){if(G.mode==='bossrush')return rushTick(E,dt);_survTickM(E,dt);};
const _nextWaveM=nextWave;
nextWave=function(){if(G.mode==='daily'&&G.wave>=G.dailyGoal){G.wave++;banner('OPERATION COMPLETE','',2);G.winT=2;G.dailyWon=true;return;}_nextWaveM();};
function rushTick(E,dt){const Q=G.rush;
  if(G.pendingBoss){G.bossTimer-=dt;if(G.bossTimer<=0){spawnBoss(G.pendingBoss);G.pendingBoss=null;}return;}
  if(G.bossE)return;
  if(liveCount()>0){for(const e of enemies.slice())if(!e.T.static)killEnemy(e,false,true);return;}
  if(Q.i>0&&!Q.healed){Q.healed=true;P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.5);P.armor=Math.min(P.maxArmor,P.armor+50);P.nades=Math.min(P.maxNades,P.nades+2);WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);
    if(Q.i<Q.list.length)feed('BREATHER · +50% HEALTH · AMMO REFILLED');}
  Q.breakT-=dt;if(Q.breakT>0)return;
  if(Q.i>=Q.list.length){if(!G.winT){G.winT=2.5;G.rushWon=true;banner('GAUNTLET COMPLETE',fmt(G.time),2.5);}return;}
  const def=BOSSES[Q.list[Q.i++]];Q.breakT=5;Q.healed=false;queueBoss(def);}

/* ---------- STARTERS ---------- */
const Modes={
 survival(){G._modeNext='survival';startRun(0,true);},
 horde(skulls){G._modeNext='horde';G._skullsNext=skulls.slice();startRun(0,true);},
 rush(set){const keys=Object.keys(BOSSES);const order=LEVELS.map(L=>L.boss.key);const list=set==='all'?order:order.slice(set*5,set*5+5);
  G._modeNext='bossrush';G._rushNext={set,list,i:0,breakT:2.5,healed:true};startRun(0,true);},
 dailyCfg(){const d=new Date();const key=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();const r=seeded(key);const ks=Object.keys(SKULLS).filter(k=>k!=='glass');
  const sk=[];while(sk.length<3){const k=ks[Math.floor(r()*ks.length)];if(!sk.includes(k))sk.push(k);}
  const mut=['grav','meteors','none'][Math.floor(r()*3)];return{key,skulls:sk,mut,goal:10,label:d.toISOString().slice(0,10)};},
 daily(){const c=this.dailyCfg();G._modeNext='daily';G._skullsNext=c.skulls;G._dailyNext=c;const rr=seeded(c.key*7+3),orig=Math.random;Math.random=rr;try{startRun(0,true);}finally{Math.random=orig;}},
 descent(){G.descent={floor:1,boons:[],score:0,kills:0,hp:null};this.floor();},
 floor(){const D=G.descent,f=D.floor;const rnd=Math.random;
  const themes=Object.keys(TH);const th=TH[themes[Math.floor(rnd()*themes.length)]];
  const kinds=['p','g','s','e','rescue','activate','capture','purify','assassinate','darkness','gauntlet','defend','carry'];
  const n=Math.min(5,2+Math.floor((f+1)/2));const spec=[];let last='';
  const objName={p:'Purge the room',g:'Destroy the hell gates',s:'Survive the onslaught',e:'Kill the elites',rescue:'Free the captives',activate:'Sabotage the machinery',capture:'Capture the zones',purify:'Burn the nests',assassinate:'Kill the lieutenants',darkness:'Survive the blackout',gauntlet:'Run the gauntlet',defend:'Defend the objective',carry:'Retrieve the relic'};
  for(let k=0;k<n;k++){let kd;do{kd=kinds[Math.floor(rnd()*kinds.length)];}while(kd===last);last=kd;
    const sp={k:kd};if(kd==='rescue')sp.n=2+Math.floor(rnd()*2);if(kd==='activate'){sp.n=2+Math.floor(rnd()*2);sp.style=['terminal','valve','charge','mirror'][Math.floor(rnd()*4)];sp.boom=sp.style==='charge';}
    if(kd==='capture')sp.n=2;if(kd==='purify'){sp.n=2+Math.floor(rnd()*2);sp.nest=['altar','egg','growth'][Math.floor(rnd()*3)];}
    if(kd==='assassinate'){sp.n=1+Math.floor(rnd()*2);sp.names=['THE '+['RED','ASHEN','HOLLOW','WEEPING','IRON','BONE'][Math.floor(rnd()*6)]+' '+['BUTCHER','PRIEST','HOUND','KNIGHT','WARDEN','MAW'][Math.floor(rnd()*6)],'THE '+['LAST','FIRST','SILENT','HUNGRY'][Math.floor(rnd()*4)]+' '+['SON','MOURNER','JAILER','FLAME'][Math.floor(rnd()*4)]];}
    if(kd==='defend'){sp.obj=['uplink','console','lantern'][Math.floor(rnd()*3)];sp.t=30+f*2;}if(kd==='carry')sp.item=['core','shard'][Math.floor(rnd()*2)];
    spec.push(sp);}
  const champs=Object.keys(BOSSES).filter(k=>!BOSSES[k].major),majors=Object.keys(BOSSES).filter(k=>BOSSES[k].major&&k!=='god');
  const bk=f%5===0?majors[Math.floor(rnd()*majors.length)]:champs[Math.floor(rnd()*champs.length)];const boss=BOSSES[bk];
  const L=Object.assign({},th,{name:'FLOOR '+f,ep:Math.min(3,Math.floor((f-1)/4)),rooms:n+2,enc:'p',pool:PO['abcdefghijk'[Math.min(10,f)]],boss,par:9999,obj:boss.major?'boss':'rooms',
    mission:{code:'F'+String(f).padStart(2,'0'),name:'DESCENT',spec,obj:spec.map(s=>objName[s.k]).concat(['Kill '+boss.name]),rooms:n+2}});
  const idxL=Math.floor(rnd()*LEVELS.length),saved=LEVELS[idxL];LEVELS[idxL]=L;G._modeNext='descent';
  try{startRun(idxL,false);}finally{LEVELS[idxL]=saved;}
  G.levelIdx=Math.min(19,Math.floor((f-1)*1.1));
  for(const s of G.secrets)scene.remove(s.m);G.secrets=[];
  if(D.hp!=null)P.hp=Math.min(P.maxHp,D.hp+30);if(boonN('armor'))P.armor=P.maxArmor;
  banner('DESCENT · FLOOR '+f,n+' rooms · '+boss.name+' waits below',3);},
 floorWon(){const D=G.descent;G.state='boon';$('scope').hidden=true;unlockPointer();mouseDown=false;MUS.boss=false;$('hud').hidden=true;$('touch').hidden=true;Comms.clear();Markers.set([]);
  for(const n of nums.splice(0))n.el.remove();
  D.hp=P.hp;D.score+=G.score;D.kills+=G.kills;save.coins+=G.earned;addXp(300+D.floor*120);G.earned=0;persist();
  const pool=Object.keys(BOONS).sort(()=>Math.random()-.5).slice(0,3);
  $('boonBody').innerHTML='<div class="tkick">FLOOR '+D.floor+' CLEARED</div><h2>CHOOSE A BOON</h2><p class="rules">Boons last until the Descent ends. Health carries over between floors.</p>'+
   '<div class="boons">'+pool.map(k=>'<button class="boon" data-boon="'+k+'"><b>'+BOONS[k].n+'</b><small>'+BOONS[k].d+'</small>'+(D.boons.includes(k)?'<em>OWNED × '+D.boons.filter(b=>b===k).length+'</em>':'')+'</button>').join('')+'</div>'+
   (D.boons.length?'<div class="help">Current: '+D.boons.map(b=>BOONS[b].n).join(' · ')+'</div>':'');
  $('boon').hidden=false;$('boonBody').querySelectorAll('[data-boon]').forEach(b=>b.onclick=()=>{D.boons.push(b.dataset.boon);D.floor++;$('boon').hidden=true;audioInit();SFX.armor();Modes.floor();lockPointer();});},
 result(won){const res=$('resbody');const h2=res.querySelector('h2'),tbl=res.querySelector('.tbl');const m=G.mode;let title='',rows=[];
  if(m==='horde'||m==='daily'){const mult=skullMult(G.skulls);const total=Math.round(G.score*mult);
    if(m==='horde'){const nb=total>save.modes.horde;if(nb)save.modes.horde=total;title=nb?'NEW HORDE RECORD':'OVERRUN';}
    else{const c=G.dailyCfg;const prev=save.modes.daily[c.label]||0;if(total>prev)save.modes.daily[c.label]=total;title=G.dailyWon?'OPERATION COMPLETE':'OPERATION FAILED';}
    rows=[['WAVE REACHED',G.wave],['KILLS',G.kills],['SCORE',G.score],['SKULLS',(G.skulls||[]).map(k=>SKULLS[k].n).join(', ')||'NONE'],['MULTIPLIER','×'+mult.toFixed(1)],['FINAL SCORE',total]];}
  else if(m==='bossrush'){const Q=G.rush;const key='s'+Q.set;const done=Math.max(0,Q.i-(G.rushWon?0:1));let nb=false;
    if(G.rushWon&&(!save.modes.rush[key]||G.time<save.modes.rush[key])){save.modes.rush[key]=Math.round(G.time);nb=true;}
    title=G.rushWon?(nb?'NEW RECORD':'GAUNTLET COMPLETE'):'FALLEN';rows=[['BOSSES SLAIN',done+'/'+Q.list.length],['TIME',fmt(G.time)],['BEST',save.modes.rush[key]?fmt(save.modes.rush[key]):'—']];}
  else if(m==='descent'){const D=G.descent;const fl=D.floor;const nb=fl>save.modes.descent;if(nb)save.modes.descent=fl;title=nb?'DEEPEST YET':'THE DESCENT ENDS';
    rows=[['FLOOR REACHED',fl],['BEST',save.modes.descent],['KILLS',D.kills+G.kills],['BOONS',D.boons.map(b=>BOONS[b].n).join(', ')||'NONE']];}
  else return;
  persist();if(h2)h2.textContent=title;if(tbl)tbl.innerHTML=rows.map(r=>'<span>'+r[0]+'</span><span>'+r[1]+'</span>').join('');
  const rr=$('rretry');if(rr)rr.onclick=()=>{if(m==='horde')Modes.horde(G.skulls||[]);else if(m==='daily')Modes.daily();else if(m==='bossrush')Modes.rush(G.rush.set);else Modes.descent();};
  const help=res.querySelector('.help');if(help)help.remove();},
 render(P_){const sel=save.modes.skulls||[];const d=this.dailyCfg();const cl=save.cleared||0;
  const card=(t,body,btn,cls)=>'<div class="mode '+(cls||'')+'"><h3>'+t+'</h3>'+body+btn+'</div>';
  const epOpen=i=>cl>=(i+1)*5;
  P_.innerHTML='<div class="modes">'+
   card('ENDLESS SURVIVAL','<div class="meta">Every demon, elites, and a champion every fifth wave. How long can you last?</div><div class="meta">Best score <b>'+save.best+'</b> · Best wave <b>'+(save.survivalLvl||0)+'</b></div>','<button class="go" id="mSurv">START</button>')+
   card('HORDE','<div class="meta">Survival with Skulls. Each skull makes it harder and multiplies your score.</div><div class="skulls">'+Object.entries(SKULLS).map(([k,s])=>'<button class="skull'+(sel.includes(k)?' on':'')+'" data-sk="'+k+'" title="'+s.d+'"><b>'+s.n+'</b><small>'+s.d+'</small><em>+'+s.m.toFixed(1)+'</em></button>').join('')+'</div>'+
     '<div class="meta">Multiplier <b id="mMult">×'+skullMult(sel).toFixed(1)+'</b> · Record <b>'+save.modes.horde+'</b></div>','<button class="go" id="mHorde">START HORDE</button>','wide')+
   card('BOSS RUSH','<div class="meta">Every boss of an episode, back to back. Half your health back between fights.</div><div class="rush">'+[0,1,2,3].map(i=>'<button '+(epOpen(i)?'':'disabled ')+'data-rush="'+i+'">'+STORY.episodes[i].name+(save.modes.rush['s'+i]?' · '+fmt(save.modes.rush['s'+i]):'')+(epOpen(i)?'':' · LOCKED')+'</button>').join('')+
     '<button '+(cl>=20?'':'disabled ')+'data-rush="all">ALL 20'+(save.modes.rush.sall?' · '+fmt(save.modes.rush.sall):'')+(cl>=20?'':' · LOCKED')+'</button></div><div class="meta">Episodes unlock as you finish them in the story.</div>','')+
   card('DAILY OPERATION','<div class="meta">'+d.label+' · One arena, the same for everyone today. Survive '+d.goal+' waves.</div><div class="meta">Skulls: <b>'+d.skulls.map(k=>SKULLS[k].n).join(' · ')+'</b> · Mutator: <b>'+({grav:'LOW GRAVITY',meteors:'SLAG RAIN',none:'NONE'})[d.mut]+'</b></div><div class="meta">Today\'s best <b>'+(save.modes.daily[d.label]||0)+'</b></div>','<button class="go" id="mDaily">DEPLOY</button>')+
   card('DESCENT','<div class="meta">A roguelite run down through random floors. Every room has a random objective. Choose a boon after each floor. One life. A Warlord every fifth floor.</div><div class="meta">Deepest floor <b>'+save.modes.descent+'</b></div>','<button class="go" id="mDesc">BEGIN THE DESCENT</button>')+
   '</div>';
  $('mSurv').onclick=()=>Modes.survival();$('mHorde').onclick=()=>Modes.horde(save.modes.skulls||[]);$('mDaily').onclick=()=>Modes.daily();$('mDesc').onclick=()=>Modes.descent();
  P_.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{const k=b.dataset.sk;const s=save.modes.skulls||(save.modes.skulls=[]);const i=s.indexOf(k);if(i>=0)s.splice(i,1);else s.push(k);persist();b.classList.toggle('on');$('mMult').textContent='×'+skullMult(s).toFixed(1);});
  P_.querySelectorAll('[data-rush]').forEach(b=>b.onclick=()=>Modes.rush(b.dataset.rush==='all'?'all':+b.dataset.rush));}
};

/* mode setup after a run is built */
function applyModeStart(){const m=G.mode;
  if(m==='horde'||m==='daily'){G.skulls=G._skullsNext||[];G._skullsNext=null;applyUpgrades();P.hp=P.maxHp;if(skullOn('blackout'))setDark(true);
    if(m==='daily'){const c=G._dailyNext;G.dailyCfg=c;G.dailyGoal=c.goal;G.dailyWon=false;if(c.mut==='grav')G.grav=.55;if(c.mut==='meteors')G.envMeteors=true;banner('DAILY OPERATION',c.label+' · Survive '+c.goal+' waves',3);}
    else banner('HORDE',(G.skulls.length?G.skulls.map(k=>SKULLS[k].n).join(' · '):'No skulls')+' · ×'+skullMult(G.skulls).toFixed(1),3);}
  else if(m==='bossrush'){G.rush=G._rushNext;G._rushNext=null;G.rushWon=false;banner('BOSS RUSH',(G.rush.set==='all'?'ALL BOSSES':STORY.episodes[G.rush.set].name)+' · '+G.rush.list.length+' bosses',3);}
  else G.skulls=null;}

/* Doom Sigils belong to story levels; a Descent vault pays out coins and a relic roll instead. */
const _ovM=openVault;
openVault=function(v){if(G.mode!=='descent')return _ovM(v);const c=Math.round((200+G.levelIdx*25)*coinMul());G.earned+=c;addXp(500);stat('vaults');feed('+'+c+' COINS');rollRelic(.5);persist();};
