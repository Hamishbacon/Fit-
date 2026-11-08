/* ---------- TRIAL EXCLUSIVES ---------- */
WEAPONS.push(
 {id:'hellfire',base:'shotgun',exclusive:true,name:'HELLFIRE SHOTGUN',cost:0,dmg:26,rate:.7,mag:10,reload:1.5,spread:.06,pellets:10,auto:false,col:0xff6a00,kick:.2,sound:'boom',burn:true,desc:'Every pellet sets demons ablaze. Burning demons drop armor.'},
 {id:'rail',base:'sniper',exclusive:true,name:'RAILGUN',cost:0,dmg:420,rate:1.15,mag:4,reload:1.8,spread:0,pellets:1,auto:false,col:0x5affff,kick:.3,sound:'crack',pierce:true,rail:true,desc:'Hip-fire beam that punches through every demon in a line.'},
 {id:'tesla',base:'rifle',exclusive:true,name:'TESLA RIFLE',cost:0,dmg:28,rate:.1,mag:40,reload:1.5,spread:.01,pellets:1,auto:true,col:0x7ab8ff,kick:.03,sound:'zap',chain:true,desc:'Lightning arcs from your target into up to 3 nearby demons.'},
 {id:'unmaker',base:'plasma',exclusive:true,name:'UNMAKER',cost:0,dmg:40,rate:.13,mag:75,reload:2,spread:.004,pellets:1,auto:true,col:0xff2a3a,kick:.04,sound:'zap',proj:true,tri:true,speed:70,desc:'Fires three demonic laser bolts at once.'}
);
save=Object.assign({perks:{},trials:{}},save);
const REWARDS={
 hellfire:{type:'weapon',name:'HELLFIRE SHOTGUN',desc:'A shotgun whose pellets set demons on fire.'},
 rail:{type:'weapon',name:'RAILGUN',desc:'A piercing beam weapon. 420 damage through every demon in a line.'},
 tesla:{type:'weapon',name:'TESLA RIFLE',desc:'Full-auto rifle. Lightning jumps to nearby demons.'},
 unmaker:{type:'weapon',name:'UNMAKER',desc:'Fires three laser bolts per shot. Shreds bosses.'},
 blade:{type:'perk',name:'CRUCIBLE BLADE',desc:'Your melee becomes a burning sword. Longer reach, kills most demons in one swing.'},
 phantom:{type:'perk',name:'PHANTOM DASH',desc:'+1 dash charge, and dashing through demons cuts them for heavy damage.'},
 wind:{type:'perk',name:'SECOND WIND',desc:'Once per level, survive a killing blow with 50 health.'},
 siphon:{type:'perk',name:'BLOOD SIPHON',desc:'Every kill heals you 4 health.'}
};
const TRIALS={
 arena:{name:'BLOOD ARENA',rules:'Kill 20 demons in 70 seconds.',kind:'count',target:20,time:70},
 arena2:{name:'BLOOD ARENA II',rules:'Kill 30 demons in 80 seconds. Elites are everywhere.',kind:'count',target:30,time:80,elite:.3},
 lava:{name:'FLOOR IS LAVA',rules:'The floor is lava. Grab 6 rune crystals from the platforms in 45 seconds. Use double jump.',kind:'collect',target:6,time:45},
 lava2:{name:'FLOOR IS LAVA II',rules:'Grab 8 rune crystals in 50 seconds while Wraiths hunt you.',kind:'collect',target:8,time:50,wraiths:true},
 melee:{name:'BARE KNUCKLE',rules:'Guns are locked. Kill 10 demons with melee, finishers and grenades. You start with 8 grenades.',kind:'count',target:10,noGuns:true,nades:8},
 onehp:{name:'GLASS CANNON',rules:'You have 1 health and no armor. Kill 12 demons. One hit and you fail.',kind:'count',target:12,oneHp:true},
 elite:{name:'ELITE GAUNTLET',rules:'Defeat 6 elite demons. No healing orbs.',kind:'count',target:6,elite:1,noHeal:true},
 speed:{name:'EXECUTION',rules:"Kill this level's champion in 50 seconds.",kind:'boss',time:50}
};
const LEVEL_TRIALS={1:{t:'arena',r:'hellfire'},2:{t:'lava',r:'phantom'},4:{t:'melee',r:'blade'},5:{t:'onehp',r:'rail'},6:{t:'elite',r:'siphon'},8:{t:'speed',r:'tesla'},9:{t:'lava2',r:'wind'},10:{t:'arena2',r:'unmaker'}};

/* exclusive gun models: base model plus glowing parts */
const _buildGun=buildGun;
buildGun=function(w){
  if(!w.exclusive){_buildGun(w);return;}
  _buildGun(Object.assign({},w,{id:w.base}));
  const glow=mat(w.col,w.col);const add=(sx,sy,sz,x,y,z)=>{const b=new THREE.Mesh(boxGeo,glow);b.scale.set(sx,sy,sz);b.position.set(x,y,z);gunModel.add(b);};
  if(w.id==='hellfire'){for(let i=0;i<4;i++)add(.1,.1,.03,0,.02,-.2-i*.12);}
  if(w.id==='rail'){for(let i=0;i<5;i++)add(.13,.13,.03,0,0,-.25-i*.13);add(.03,.03,.9,0,.08,-.5);}
  if(w.id==='tesla'){const s=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),glow);s.position.set(0,.12,-.3);gunModel.add(s);add(.02,.2,.02,0,.05,-.3);}
  if(w.id==='unmaker'){for(const x of[-.06,0,.06])add(.03,.03,.5,x,.09,-.45);}
};
function chainLightning(src,dmg,point){
  const from=(point||src.pos.clone().setY(src.pos.y+1.2)).clone();
  const targets=enemies.filter(e=>e!==src&&!e.T.static&&e.hp>0&&e.pos.distanceTo(src.pos)<8).sort((a,b)=>a.pos.distanceTo(src.pos)-b.pos.distanceTo(src.pos)).slice(0,3);
  for(const t of targets){const to=t.pos.clone().setY(t.pos.y+1.2*t.size);let a=from.clone();
    for(let k=1;k<=4;k++){const b=from.clone().lerp(to,k/4);if(k<4)b.add(new THREE.Vector3(rand(-.4,.4),rand(-.4,.4),rand(-.4,.4)));tracer(a,b,0x9ad8ff,.05,.12);a=b;}
    damageEnemy(t,dmg,false,to,'chain');}
  if(targets.length)tone('sawtooth',1200,300,.08,.05);
}
function swingBlade(){
  const b=new THREE.Mesh(boxGeo,mat(0xff5a1a,0xff3a00));b.scale.set(.05,.07,1.2);const piv=new THREE.Group();piv.add(b);b.position.z=-.65;piv.position.set(.35,-.15,-.3);gunCam.add(piv);
  let t=0;piv.rotation.y=.9;addFx({kill(){gunCam.remove(piv);},tick(dt){t+=dt;piv.rotation.y=.9-t*9;piv.rotation.z=-.3;if(t>.22){this.kill();return false;}return true;}});
  tone('',3000,0,.15,.3,true);
}
function phantomTick(){for(const e of enemies.slice()){if(e.T.static||P.dashHit.has(e))continue;if(Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<1.6+e.size*.3&&Math.abs(e.pos.y-P.pos.y)<2.2){P.dashHit.add(e);damageEnemy(e,e.boss?50:110,false,e.pos.clone().setY(e.pos.y+1.2),'punch');burst(e.pos.clone().setY(e.pos.y+1),0x9ad8ff,10,6,.8,.4);}}}

/* perk hooks */
const _applyUp=applyUpgrades;applyUpgrades=function(){_applyUp();if(save.perks.phantom)P.maxDash++;};applyUpgrades();
const _doDash=doDash;doDash=function(){const b=P.dashes;_doDash();if(P.dashes<b)P.dashHit=new Set();};
const _abTick=abilityTick;abilityTick=function(dt){_abTick(dt);if(P.dashT>0&&save.perks.phantom&&P.dashHit)phantomTick();};
const _kill=killEnemy;killEnemy=function(e,h,o){const st=e.T.static;_kill(e,h,o);if(st)return;if(G.trial)G.trial.kills++;if(save.perks.siphon)P.hp=Math.min(P.maxHp,P.hp+4);};
const _orbs=spawnOrbs;spawnOrbs=function(...a){if(G.trial&&(G.trial.T.noHeal||G.trial.T.oneHp))return;_orbs(...a);};
hurtPlayer=function(d,ignoreArmor){
  if(G.state!=='play'||d<=0)return;if(P.iframe>0)return;if(G.trial&&G.trial.done)return;
  d*=DIFFS[S.diff].dmg;if(P.rageT>0)d*=.5;
  if(P.armor>0&&!ignoreArmor){const absorb=Math.min(P.armor,d*.6);P.armor-=absorb;d-=absorb;}
  P.hp-=d;P.hurtT=.3;SFX.hurt();shake(.18);G.tookDamage=true;$('vig').style.opacity=.6;setTimeout(()=>$('vig').style.opacity=0,160);
  if(P.hp<=0){
    if(G.trial){P.hp=0;trialEnd(false);return;}
    if(save.perks.wind&&!G.windUsed){G.windUsed=true;P.hp=50;P.iframe=2;banner('SECOND WIND','',1.5);SFX.boss();return;}
    P.hp=0;endRun(false);}
};

/* ---------- PORTAL IN THE MAIN LEVEL ---------- */
const _startRun=startRun;
startRun=function(i,s){G.trial=null;G.portal=null;G.windUsed=false;TS=null;$('trialAsk').hidden=true;$('reward').hidden=true;_startRun(i,s);if(!s&&LEVEL_TRIALS[i])placePortal(i);};
function placePortal(li){
  const c=farCells(1,20,0,[T_FLOOR])[0]||farCells(1,10,0,[T_FLOOR])[0];if(!c)return;
  const x=cx(c[0]),z=cx(c[1]),done=!!save.trials[li];const col=done?0x9a7aff:0xffcf3a;
  const g=new THREE.Group();g.position.set(x,0,z);
  const ringM=new THREE.Mesh(new THREE.TorusGeometry(1.25,.14,8,28),mat(col,col));ringM.position.y=1.6;g.add(ringM);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.15,24),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.45,side:THREE.DoubleSide}));disc.position.y=1.6;g.add(disc);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.8,.25,12),skinMat(0x2a2230));base.position.y=.12;g.add(base);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,40,10,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=20;g.add(beam);
  const l=new THREE.PointLight(col,1.6,16);l.position.y=2;g.add(l);
  world.add(g);G.portal={x,z,g,ringM,disc,li,armed:true,done};
  setTimeout(()=>{if(G.state==='play'&&G.portal&&!G.trial)feed(done?'TRIAL PORTAL OPEN (REWARD CLAIMED)':'A TRIAL PORTAL HAS OPENED. FOLLOW THE GOLDEN LIGHT');},3800);
}
function portalTick(dt){
  const p=G.portal;if(!p||G.trial)return;p.ringM.rotation.y+=dt*1.5;p.disc.rotation.y=p.ringM.rotation.y;p.disc.material.opacity=.35+Math.sin(G.time*4)*.15;
  const d=Math.hypot(P.pos.x-p.x,P.pos.z-p.z);
  if(d>3.5)p.armed=true;
  if(p.armed&&d<1.6&&P.pos.y<2)askTrial();
}
const _objTick=objectiveTick;objectiveTick=function(dt){if(G.trial){trialTick(dt);return;}_objTick(dt);portalTick(dt);};

/* ---------- ENTER / EXIT ---------- */
let TS=null; // stash of the main level while you are inside a trial
function askTrial(){
  const lt=LEVEL_TRIALS[G.portal.li],T=TRIALS[lt.t],R=REWARDS[lt.r];
  G.state='trialask';unlockPointer();mouseDown=false;touchFire=false;P.zoom=false;
  $('trialBody').innerHTML='<div class="tkick">TRIAL PORTAL</div><h2>'+T.name+'</h2><p class="rules">'+T.rules+'</p>'+
    '<div class="prize"><span>'+(save.trials[G.portal.li]?'ALREADY CLAIMED · WIN AGAIN FOR 300 COINS':'EXCLUSIVE '+(R.type==='weapon'?'WEAPON':'PERK'))+'</span><b>'+R.name+'</b><small>'+R.desc+'</small></div>'+
    '<div class="help">The level waits while you are inside. If you fail, you come back here with the health you had and can try again.</div>'+
    '<div class="row"><button class="go" id="tEnter">ENTER TRIAL</button><button id="tLeave">NOT NOW</button></div>';
  $('trialAsk').hidden=false;
  $('tEnter').onclick=()=>{$('trialAsk').hidden=true;enterTrial();lockPointer();};
  $('tLeave').onclick=()=>{$('trialAsk').hidden=true;G.portal.armed=false;G.state='play';last=performance.now();lockPointer();};
}
function enterTrial(){
  const li=G.portal.li,lt=LEVEL_TRIALS[li],T=TRIALS[lt.t];
  for(const e of enemies){scene.remove(e.body.g);if(e.body.laser){scene.remove(e.body.laser);e.aiming=0;e.body.laser.visible=false;}if(e.beam){scene.remove(e.beam);e.beam=null;e.atk=null;}if(e.line){scene.remove(e.line);e.line=null;e.atk=null;}}
  for(const k of pickups)scene.remove(k.g);for(const s of G.secrets)if(!s.taken)scene.remove(s.m);
  TS={world,grid,solids,solidMeshes,torches,sIndex,enemies:enemies.splice(0),hitboxes:hitboxes.splice(0),pickups:pickups.splice(0),secrets:G.secrets,gates:G.gates,
    g:{obj:G.obj,wave:G.wave,waveQueue:G.waveQueue,spawnT:G.spawnT,betweenT:G.betweenT,bossE:G.bossE,bossPhase:G.bossPhase,pendingBoss:G.pendingBoss,bossTimer:G.bossTimer,winT:G.winT,surviveLeft:G.surviveLeft},
    p:{x:P.pos.x,z:P.pos.z,y:P.pos.y,yaw:P.yaw,hp:P.hp,armor:P.armor,nades:P.nades},bg:scene.background,fog:scene.fog,bossHidden:$('boss').hidden,portal:G.portal};
  G.secrets=[];G.gates=[];G.bossE=null;G.pendingBoss=null;G.winT=0;$('boss').hidden=true;MUS.boss=false;
  for(const a of[shots,parts,tracers,rings,grenades,flashes,decals])for(const o of a.splice(0))scene.remove(o.m||o.g||o.l||o);for(const f of FX.splice(0))if(f.kill)f.kill();
  scene.remove(world);
  G.trial={T,li,r:lt.r,kills:0,got:0,timeLeft:T.time||0,spawnT:1.5,bossT:1.5,done:false,crystals:[],wraithT:4};
  buildTrialWorld(T);
  P.pos.set(cx(12)+C/2,surfaceAt(cx(12)+C/2,cx(16)),cx(16));P.vel.set(0,0,0);P.yaw=0;P.pitch=0;
  if(T.oneHp){P.maxHp=1;P.hp=1;P.armor=0;}else{P.hp=P.maxHp;P.armor=Math.min(P.maxArmor,50);}
  if(T.nades)P.nades=T.nades;
  WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);
  navT=0;buildNav();G.state='play';last=performance.now();
  banner(T.name,T.rules,3.5);SFX.boss();
}
function buildTrialWorld(T){
  world=new THREE.Group();scene.add(world);solids=[];solidMeshes=[];torches=[];
  const TH={sky:0x060208,fog:0x14060c,ground:0x2a2228,block:[0x2a2030,0x6a5a20,0x3a2a40],torch:0xffb020};
  const t=new Int8Array(N*N).fill(T_WALL),h=new Float32Array(N*N),sd=new Array(N*N).fill(null),lo=new Float32Array(N*N);
  const A=8,B=17;for(let i=A;i<=B;i++)for(let j=A;j<=B;j++)t[idx(i,j)]=T_FLOOR;
  const crystals=[];
  if(T.kind==='collect'){
    for(let i=A;i<=B;i++)for(let j=A;j<=B;j++)t[idx(i,j)]=T_LAVA;
    for(const[i,j]of[[12,16],[13,16],[12,17],[13,17]])t[idx(i,j)]=T_FLOOR;
    const path=[[11,15],[9,15],[9,13],[9,11],[9,9],[11,9],[13,9],[15,9],[16,11],[16,13],[16,15],[14,14],[12,12],[13,11],[11,12],[14,12]];
    let ph=.6;path.forEach(([i,j],k)=>{ph=clamp(ph+[-.6,0,.6,.6][Math.floor(Math.random()*4)],.6,2.4);if(k===0)ph=.6;t[idx(i,j)]=T_PLAT;h[idx(i,j)]=ph;});
    const picks=path.slice(1).sort(()=>Math.random()-.5).slice(0,T.target);
    picks.forEach(([i,j])=>crystals.push(new THREE.Vector3(cx(i),h[idx(i,j)]+1,cx(j))));
  }else{
    for(const[i,j]of[[10,10],[15,10],[10,15],[15,15]])t[idx(i,j)]=T_PILLAR,h[idx(i,j)]=6;
    for(const[i,j]of[[12,12],[13,13],[9,13],[16,12]])t[idx(i,j)]=T_COVER;
    for(const[i,j]of[[12,9],[13,9]]){t[idx(i,j)]=T_PLAT;h[idx(i,j)]=1.2;}
  }
  grid={t,h,sd,lo,pads:[],spawn:{i:12,j:16}};
  scene.background=new THREE.Color(TH.sky);scene.fog=new THREE.Fog(TH.fog,10,48);
  hemi.groundColor.set(TH.torch);sun.color.set(0xffd8a0);
  const gt=detailTex(TH.ground,'floor').clone();gt.needsUpdate=true;gt.repeat.set(N/2,N/2);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(ARENA*2,ARENA*2),new THREE.MeshLambertMaterial({map:gt}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;world.add(fl);
  const lavaMat=mat(0xff4a00,0xdd3300);
  for(let i=A-1;i<=B+1;i++)for(let j=A-1;j<=B+1;j++){const k=idx(i,j),x=cx(i),z=cx(j),tt=t[k];
    if(tt===T_WALL)addBox(x,z,C,7,C,TH.block[0],'brick');
    else if(tt===T_PILLAR)addBox(x,z,C*.8,6,C*.8,TH.block[2],'brick');
    else if(tt===T_COVER)addBox(x,z,C*.92,1.1,C*.92,TH.block[1],'metal');
    else if(tt===T_PLAT)addBox(x,z,C*(T.kind==='collect'?.86:1),h[k],C*(T.kind==='collect'?.86:1),TH.block[1],'metal');
    else if(tt===T_LAVA){const m=new THREE.Mesh(boxGeo,lavaMat);m.scale.set(C,.06,C);m.position.set(x,.02,z);world.add(m);}}
  for(const[i,j]of[[A,A],[B,A],[A,B],[B,B]]){const l=new THREE.PointLight(TH.torch,1.6,22,1.6);l.position.set(cx(i),5,cx(j));world.add(l);const f=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:TH.torch}));f.scale.set(.5,.8,.5);f.position.set(cx(i),5,cx(j));world.add(f);torches.push({f,l,t:Math.random()*9});}
  const rr=new THREE.Mesh(new THREE.RingGeometry(3,3.3,6),new THREE.MeshBasicMaterial({color:TH.torch,side:THREE.DoubleSide}));rr.rotation.x=-Math.PI/2;rr.position.set(cx(12)+C/2,.04,cx(12)+C/2);world.add(rr);
  world.userData.embers=null;
  indexSolids();
  G.trial.crystals=crystals.map(p=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.4),mat(0xffcf3a,0xffaa00));m.position.copy(p);world.add(m);return{m,got:false};});
}
const _spawnPoint=spawnPoint;
spawnPoint=function(){if(!G.trial)return _spawnPoint();
  const c=openCells((t,i,j)=>(t===T_FLOOR||t===T_PLAT||t===T_COVER)&&Math.hypot(cx(i)-P.pos.x,cx(j)-P.pos.z)>7);const p=c[Math.floor(Math.random()*c.length)]||[10,9];return[cx(p[0]),cx(p[1])];};
function trialTick(dt){
  const tr=G.trial,T=tr.T;
  for(const c of tr.crystals){c.m.rotation.y+=dt*2;}
  let prog='';
  if(!tr.done){
    if(T.time){tr.timeLeft-=dt;if(tr.timeLeft<=0){tr.timeLeft=0;trialEnd(false);return;}}
    if(T.kind==='count'){
      const alive=enemies.filter(e=>!e.T.static).length;const remain=T.target-tr.kills-alive;tr.spawnT-=dt;
      if(remain>0&&alive<(T.elite===1?2:6)&&tr.spawnT<=0){tr.spawnT=rand(.4,1);G.forceElite=T.elite||0;
        const L=G.L;const pool=L.pool||Object.keys(Object.assign({},...L.waves));const[x,z]=spawnPoint();spawnEnemy(pool[Math.floor(Math.random()*pool.length)],x,z);G.forceElite=0;}
      if(tr.kills>=T.target){trialEnd(true);return;}prog=tr.kills+'/'+T.target+' KILLS';
    }else if(T.kind==='boss'){
      if(!tr.bossSpawned){tr.bossT-=dt;if(tr.bossT<=0){tr.bossSpawned=true;const d=Object.assign({},G.L.boss,{hp:G.L.boss.hp*.55});spawnBoss(d);}}
      else if(!G.bossE){trialEnd(true);return;}prog='KILL '+G.L.boss.name;
    }else if(T.kind==='collect'){
      for(const c of tr.crystals){if(!c.got&&c.m.position.distanceTo(P.pos.clone().setY(P.pos.y+1))<1.3){c.got=true;world.remove(c.m);tr.got++;tone('sine',880,1760,.25,.2);burst(c.m.position,0xffcf3a,14,5,.9,.6);}}
      if(T.wraiths){tr.wraithT-=dt;if(tr.wraithT<=0&&enemies.length<2){tr.wraithT=7;const[x,z]=spawnPoint();spawnEnemy('wraith',x,z);}}
      if(tr.got>=T.target){trialEnd(true);return;}prog=tr.got+'/'+T.target+' CRYSTALS';
    }
  }
  $('objective').textContent='TRIAL · '+T.name+' · '+prog+(T.time?' · '+fmt(Math.ceil(tr.timeLeft)):'');
  $('objective').classList.toggle('urgent',!!T.time&&tr.timeLeft<10&&!tr.done);
}
function trialEnd(win){
  const tr=G.trial;if(!tr||tr.done)return;tr.done=true;tr.win=win;P.iframe=3;
  banner(win?'TRIAL COMPLETE':'TRIAL FAILED',win?'':'Back to the level. The portal stays open.',2);
  if(win){SFX.wave();for(const e of enemies.slice())if(!e.T.static)killEnemy(e,false,true);}else SFX.die();
  setTimeout(()=>exitTrial(win),2200);
}
function exitTrial(win){
  if(!TS||!G.trial)return;const tr=G.trial;
  for(const e of enemies.slice())removeEnemy(e);
  for(const a of[shots,parts,tracers,rings,pickups,grenades,flashes,decals])for(const o of a.splice(0))scene.remove(o.m||o.g||o.l||o);for(const f of FX.splice(0))if(f.kill)f.kill();
  scene.remove(world);
  world=TS.world;grid=TS.grid;solids=TS.solids;solidMeshes=TS.solidMeshes;torches=TS.torches;sIndex=TS.sIndex;scene.add(world);
  for(const e of TS.enemies){enemies.push(e);scene.add(e.body.g);if(e.body.laser)scene.add(e.body.laser);}hitboxes.push(...TS.hitboxes);
  for(const k of TS.pickups){pickups.push(k);scene.add(k.g);}
  G.secrets=TS.secrets;for(const s of G.secrets)if(!s.taken)scene.add(s.m);G.gates=TS.gates;Object.assign(G,TS.g);
  scene.background=TS.bg;scene.fog=TS.fog;$('boss').hidden=TS.bossHidden;if(G.bossE)MUS.boss=true;
  hemi.groundColor.set(G.L.torch);sun.color.set(G.L.torch).lerp(new THREE.Color(0xffffff),.5);
  applyUpgrades();
  const pt=TS.portal;const dx=-pt.x,dz=-pt.z,dl=Math.hypot(dx,dz)||1;
  P.pos.set(pt.x+dx/dl*3,surfaceAt(pt.x+dx/dl*3,pt.z+dz/dl*3),pt.z+dz/dl*3);P.vel.set(0,0,0);P.yaw=Math.atan2(-(pt.x-P.pos.x),-(pt.z-P.pos.z));
  P.hp=win?P.maxHp:Math.max(1,TS.p.hp);P.armor=win?Math.max(TS.p.armor,50):TS.p.armor;P.nades=Math.max(TS.p.nades,win?P.maxNades:0);
  G.portal=pt;pt.armed=false;G.trial=null;TS=null;$('objective').classList.remove('urgent');navT=0;buildNav();
  if(win)grantReward(tr);else feed('TRIAL FAILED. STEP INTO THE PORTAL TO RETRY');
}
function grantReward(tr){
  const R=REWARDS[tr.r];const already=save.trials[tr.li];
  save.trials[tr.li]=true;
  if(!already){if(R.type==='weapon'){if(!save.owned.includes(tr.r))save.owned.push(tr.r);}else save.perks[tr.r]=true;}
  else G.earned+=300;
  persist();applyUpgrades();updateSlots();
  const p=G.portal;if(p){const col=0x9a7aff;p.ringM.material=mat(col,col);p.disc.material.color.set(col);p.done=true;}
  G.state='reward';unlockPointer();
  $('rewardBody').innerHTML=already?'<div class="tkick">TRIAL COMPLETE</div><h2>+300 COINS</h2><p class="rules">You already own the '+R.name+'.</p><div class="row"><button class="go" id="rwGo">BACK TO THE FIGHT</button></div>':
    '<div class="tkick">EXCLUSIVE '+(R.type==='weapon'?'WEAPON':'PERK')+' UNLOCKED</div><h2>'+R.name+'</h2><p class="rules">'+R.desc+'</p>'+
    (R.type==='weapon'?'<div class="help">It is in your weapon slots now. Scroll the mouse wheel or press '+keyName(S.kb.next)+' to reach it.</div>':'<div class="help">Active from now on, in every level.</div>')+
    '<div class="row"><button class="go" id="rwGo">BACK TO THE FIGHT</button></div>';
  $('reward').hidden=false;SFX.boss();
  $('rwGo').onclick=()=>{$('reward').hidden=true;G.state='play';last=performance.now();lockPointer();if(R.type==='weapon'&&!already)switchWeapon(WEAPONS.findIndex(w=>w.id===tr.r));};
}

/* ---------- MENU ADDITIONS ---------- */
const _renderUpg=renderUpgrades;
renderUpgrades=function(P_){_renderUpg(P_);
  const perks=Object.entries(REWARDS).filter(([k,r])=>r.type==='perk');
  const where=k=>{const e=Object.entries(LEVEL_TRIALS).find(([i,v])=>v.r===k);return e?'Level '+(+e[0]+1)+': '+LEVELS[+e[0]].name:'';};
  P_.querySelector('.set').insertAdjacentHTML('beforeend','<section class="wide"><h3>TRIAL PERKS</h3><div class="note">Exclusive perks. Win the Trial Portal hidden in the listed level.</div><div class="grid">'+
    perks.map(([k,r])=>'<div class="gun"><h3 style="color:'+(save.perks[k]?'var(--gold)':'var(--dim)')+'">'+r.name+'</h3><div class="meta">'+r.desc+'</div><div class="meta"><b style="color:'+(save.perks[k]?'var(--teal)':'#c07aff')+'">'+(save.perks[k]?'ACTIVE':'TRIAL · '+where(k))+'</b></div></div>').join('')+'</div></section>');
};
function trialWhere(id){const e=Object.entries(LEVEL_TRIALS).find(([i,v])=>v.r===id);return e?'LEVEL '+(+e[0]+1):'';}
