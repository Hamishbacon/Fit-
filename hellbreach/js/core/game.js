/* ---------- GAME STATE ---------- */
const G={state:'menu',levelIdx:0,survival:false,wave:0,waveQueue:[],spawnT:0,time:0,score:0,kills:0,earned:0,streak:0,lastKill:-9,bossE:null,bossPhase:false,betweenT:0,obj:'purge',gates:[],surviveLeft:0,secrets:[],found:0,rage:0};
function banner(text,sub='',dur=2){const b=$('banner');b.innerHTML=text+(sub?'<small>'+sub+'</small>':'');b.style.opacity=1;clearTimeout(b._t);b._t=setTimeout(()=>b.style.opacity=0,dur*1000);}
function feed(t){const d=document.createElement('div');d.textContent=t;$('feed').prepend(d);setTimeout(()=>d.remove(),2000);while($('feed').children.length>5)$('feed').lastChild.remove();}
const FX=[];function addFx(o){FX.push(o);return o;}
function clearEntities(){
  for(const e of enemies.slice())removeEnemy(e);
  for(const a of[shots,parts,tracers,rings,pickups,grenades,flashes,decals])for(const o of a.splice(0))scene.remove(o.m||o.g||o.l||o);
  for(const f of FX.splice(0))if(f.kill)f.kill();
  for(const s of G.secrets||[])scene.remove(s.m);G.secrets=[];G.gates=[];
}
const DIFF=()=>DIFFS[S.diff];

function startRun(levelIdx,survival){
  audioInit();musicInit();clearEntities();
  Object.assign(G,{levelIdx,survival,wave:0,time:0,score:0,kills:0,earned:0,streak:0,bossE:null,bossPhase:false,waveQueue:[],betweenT:1.5,winT:0,pendingBoss:null,gates:[],secrets:[],found:0,rage:0,spawnT:2});
  const L=survival?LEVELS[Math.floor(Math.random()*LEVELS.length)]:LEVELS[levelIdx];G.L=L;G.obj=survival?'survival':L.obj;
  buildWorld(L,survival?Math.floor(Math.random()*9999)+20:levelIdx+1);
  P.pos.set(cx(grid.spawn.i),0,cx(grid.spawn.j));P.vel.set(0,0,0);P.yaw=0;P.pitch=0;
  applyUpgrades();P.hp=P.maxHp;P.armor=0;P.nades=P.maxNades>3?4:3;P.spin=0;P.zoom=false;P.rageT=0;P.dashes=P.maxDash;P.flameCd=0;
  WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);
  const pref=['sshot','shotgun','rifle','chain','plasma','pistol'];const bid=pref.find(id=>save.owned.includes(id))||'pistol';const best=WEAPONS.findIndex(w=>w.id===bid);
  P.weapon=-1;gunModel=null;switchWeapon(best);
  $('boss').hidden=true;['menu','pause','result'].forEach(id=>$(id).hidden=true);$('hud').hidden=false;$('touch').hidden=!isTouch;
  navT=0;buildNav();
  if(!survival){G.secrets=placeSecrets(L).map((p,k)=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.35),mat(0xc07aff,0x8a3aff));m.position.copy(p);scene.add(m);return{m,k,got:!!save.secrets[levelIdx+'-'+k]};});
    G.secrets.forEach(s=>{if(s.got)s.m.material=mat(0x6a5a7a,0x221a2a);});}
  if(G.obj==='gates'){farCells(3,22,18).forEach(([i,j])=>G.gates.push(spawnGate(cx(i),cx(j))));}
  if(G.obj==='survive')G.surviveLeft=L.surviveT;
  G.state='play';
  const ep=EPISODES[L.ep];
  banner(survival?'SURVIVAL':L.name,survival?DIFF().label+' · How long can you last?':ep.name+' · '+OBJ[L.obj]+' · '+DIFF().label,3);
  objText();lockPointer();
}
function objText(){
  let t='';const o=G.obj;
  if(G.bossE)t='KILL '+G.bossE.T.name+(G.bossE.shielded?' · DESTROY THE WARD CRYSTALS':'');
  else if(G.pendingBoss)t='SOMETHING IS COMING…';
  else if(o==='purge'||o==='boss')t='PURGE THE DEMONS · WAVE '+Math.max(1,G.wave)+'/'+(G.L.waves||[]).length;
  else if(o==='gates')t='DESTROY THE HELL GATES · '+G.gates.filter(g=>g.hp>0).length+' LEFT';
  else if(o==='survive')t='SURVIVE · '+Math.ceil(Math.max(0,G.surviveLeft))+'s';
  else if(o==='survival')t='SURVIVAL · WAVE '+G.wave;
  $('objective').textContent=t;
}
function queueBoss(def){G.bossPhase=true;G.pendingBoss=def;G.bossTimer=2.4;banner(def.major?'WARLORD':'CHAMPION',def.name,2.5);SFX.boss();}

function objectiveTick(dt){
  const L=G.L,o=G.obj;
  if(G.pendingBoss){G.bossTimer-=dt;if(G.bossTimer<=0){spawnBoss(G.pendingBoss);G.pendingBoss=null;}objText();return;}
  if(G.bossPhase){if(!G.bossE&&!G.winT&&enemies.filter(e=>!e.T.static).length===0){if(o==='survival'){G.bossPhase=false;G.betweenT=2.5;feed('CHAMPION DOWN! +25 HP');P.hp=Math.min(P.maxHp,P.hp+25);}else{G.winT=2.5;banner('VICTORY!','',2.5);}}objText();return;}
  const cap=10+L.ep*2;
  if(o==='purge'||o==='boss'||o==='survival'){
    if(G.waveQueue.length){G.spawnT-=dt;if(G.spawnT<=0&&enemies.length<cap+2){const[x,z]=spawnPoint();spawnEnemy(G.waveQueue.shift(),x,z);G.spawnT=rand(.3,.8);}}
    else if(enemies.length===0){G.betweenT-=dt;if(G.betweenT<=0){if(G.wave>0)P.hp=Math.min(P.maxHp,P.hp+15);nextWave();G.betweenT=2.2;}}
  }else if(o==='gates'){
    const alive=G.gates.filter(g=>g.hp>0);
    for(const g of alive){g.spawnCd-=dt;if(g.spawnCd<=0&&enemies.length<cap){g.spawnCd=rand(4,7)-L.ep*.6;const pool=L.pool;spawnEnemy(pool[Math.floor(Math.random()*pool.length)],g.pos.x+rand(-2,2),g.pos.z+rand(-2,2)).fromGate=true;}}
    if(!alive.length)queueBoss(L.boss);
  }else if(o==='survive'){
    G.surviveLeft-=dt;G.spawnT-=dt;const k=1-G.surviveLeft/L.surviveT;
    if(G.spawnT<=0&&enemies.length<cap){const pool=L.pool;const n=Math.min(pool.length,2+Math.floor(k*pool.length));const[x,z]=spawnPoint();spawnEnemy(pool[Math.floor(Math.random()*n)],x,z);G.spawnT=Math.max(.55,2.1-k*1.5)-L.ep*.15;}
    if(G.surviveLeft<=0){banner('YOU SURVIVED','The champion arrives',2);queueBoss(L.boss);}
  }
  objText();
}
function nextWave(){
  G.wave++;const L=G.L;
  if(G.survival){
    if(G.wave%5===0){const bl=LEVELS[(Math.floor(G.wave/5)-1)%LEVELS.length];queueBoss(bl.boss);return;}
    const n=4+G.wave*2;const all=['husk','fiend','leaper','gnasher','bloater','marksman','wraith','shielder','summoner','brute'];const pool=all.slice(0,Math.min(all.length,3+Math.floor(G.wave/1.5)));
    G.waveQueue=Array.from({length:n},()=>pool[Math.floor(Math.random()*pool.length)]);banner('WAVE '+G.wave,n+' demons incoming',1.8);
  }else{
    if(G.wave>L.waves.length){queueBoss(L.boss);return;}
    const w=L.waves[G.wave-1];G.waveQueue=[];for(const k in w)for(let i=0;i<w[k];i++)G.waveQueue.push(k);G.waveQueue.sort(()=>Math.random()-.5);
    banner('WAVE '+G.wave+' / '+L.waves.length,G.waveQueue.length+' demons incoming',1.8);
  }
  SFX.wave();G.spawnT=.5;
}

/* ---------- BODIES ---------- */
const _makeBody=makeBody;
makeBody=function(T,s,boss){
  const B=_makeBody(T,s,boss);const g=B.g;
  const add=(m,sx,sy,sz,x,y,z,p=g)=>{const b=new THREE.Mesh(boxGeo,m);b.castShadow=true;b.scale.set(sx*s,sy*s,sz*s);b.position.set(x*s,y*s,z*s);p.add(b);return b;};
  if(T.bloat){const belly=new THREE.Mesh(new THREE.SphereGeometry(.55*s,8,6),skinMat(T.col));belly.position.set(0,1.05*s,.1*s);belly.scale.set(1.15,1,1.1);belly.castShadow=true;g.add(belly);B.belly=belly;
    for(let i=0;i<6;i++)add(mat(0xd8ff4a,0x667700),.12,.12,.12,rand(-.45,.45),1.05+rand(-.4,.4),.55);}
  if(T.shield){const sh=new THREE.Mesh(new THREE.BoxGeometry(1.3*s,1.5*s,.08*s),new THREE.MeshBasicMaterial({color:0x3ac0ff,transparent:true,opacity:.45}));sh.position.set(0,1.05*s,.55*s);g.add(sh);B.shield=sh;
    add(mat(0x2a3a5a),.16,1.55,.12,-.62,1.05,.55);add(mat(0x2a3a5a),.16,1.55,.12,.62,1.05,.55);}
  if(T.robe){const r=new THREE.Mesh(new THREE.ConeGeometry(.55*s,1.5*s,6),skinMat(T.shirt));r.position.set(0,.75*s,0);r.castShadow=true;g.add(r);B.legL.visible=B.legR.visible=false;
    const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.18*s),mat(T.eye,T.eye));orb.position.set(.45*s,1.95*s,.25*s);g.add(orb);B.orb=orb;}
  if(T.leap){for(let i=0;i<4;i++)add(mat(0xd8ccb0),.06,.3,.06,0,1.4-i*.12,-.3+i*.02).rotation.x=-1;}
  if(T.shot==='snipe'){add(mat(0x1a1a1a),.07,.07,.9,0,-.65,.35,B.armR);const las=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xff0000,transparent:true,opacity:.7}));las.visible=false;scene.add(las);B.laser=las;}
  return B;
};
function staticTarget(kind,x,z,T){
  const g=new THREE.Group();const B={g,legL:new THREE.Group(),legR:new THREE.Group(),armL:new THREE.Group(),armR:new THREE.Group(),head:null};
  const hb=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false})),hh=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));
  if(kind==='gate'){const L=G.L;const st=skinMat(L.block[2]),hn=mat(0xd8ccb0);
    for(const sx of[-1.5,1.5]){const p=new THREE.Mesh(boxGeo,st);p.scale.set(.8,5,.8);p.position.set(sx,2.5,0);p.castShadow=true;g.add(p);const h=new THREE.Mesh(new THREE.ConeGeometry(.35,1.4,4),hn);h.position.set(sx,5.6,0);g.add(h);}
    const top=new THREE.Mesh(boxGeo,st);top.scale.set(4,.7,.9);top.position.set(0,5,0);g.add(top);
    const portal=new THREE.Mesh(new THREE.PlaneGeometry(2.2,4.2),new THREE.MeshBasicMaterial({color:L.torch,transparent:true,opacity:.85,side:THREE.DoubleSide}));portal.position.set(0,2.4,0);g.add(portal);B.portal=portal;
    const l=new THREE.PointLight(L.torch,1.4,14);l.position.set(0,2.5,1);g.add(l);
    hb.scale.set(3.6,5,1.2);hb.position.y=2.5;hh.scale.set(1.2,1.2,1.2);hh.position.y=5;}
  else{const c=new THREE.Mesh(new THREE.OctahedronGeometry(.9),mat(0x7affff,0x2aa0c0));c.position.y=2.4;g.add(c);B.crystal=c;
    const base=new THREE.Mesh(boxGeo,skinMat(0x2a3a4a));base.scale.set(1.4,.6,1.4);base.position.y=.3;g.add(base);
    hb.scale.set(1.6,2.2,1.6);hb.position.y=2.4;hh.scale.set(.1,.1,.1);hh.position.y=-5;}
  g.add(hb,hh);B.hb=hb;B.hh=hh;g.position.set(x,0,z);scene.add(g);
  const e={type:kind,T:Object.assign({static:true,size:1.6,score:60,coins:20,col:0x888888},T),body:B,pos:new THREE.Vector3(x,surfaceAt(x,z),z),hp:T.hp,max:T.hp,cd:0,t:0,hurt:0,boss:false,size:1.6,speed:0,dmg:0,vy:0,spawnT:0,spawnCd:rand(1,3)};
  g.position.y=e.pos.y;hb.userData.e=e;hh.userData.e=e;hitboxes.push(hb,hh);enemies.push(e);addHealthBar(e);
  if(e.bar){e.bar.bg.position.y=e.bar.fg.position.y=kind==='gate'?6.6:3.8;}
  return e;
}
function spawnGate(x,z){const g=staticTarget('gate',x,z,{name:'Hell Gate',hp:Math.round(650*DIFF().hp*(1+G.L.ep*.35))});ring(g.pos,G.L.torch,5,1);return g;}

/* ---------- SPAWN ---------- */
spawnEnemy=function(type,x,z){
  const T=ENEMY[type];const lvl=G.survival?Math.min(11,G.wave/2):G.levelIdx;
  const eliteChance=G.survival?Math.min(.2,G.wave*.012):.02+lvl*.012;const elite=Math.random()<Math.max(eliteChance,G.forceElite||0);
  const sz=T.size*(elite?1.18:1);const B=makeBody(T,sz);
  const diff=(1+lvl*.12+(G.survival?G.wave*.05:0))*DIFF().hp*(elite?2.2:1);
  const y=T.flying?0:surfaceAt(x,z);
  const e={type,T,body:B,pos:new THREE.Vector3(x,y,z),hp:T.hp*diff,max:T.hp*diff,cd:rand(.8,2),t:rand(0,6),hurt:0,boss:false,size:sz,speed:T.speed*rand(.9,1.1)*(elite?1.12:1),dmg:T.dmg*(1+lvl*.06)*(elite?1.3:1),vy:0,spawnT:.6,elite,faceA:0,shieldHp:T.shield?260*DIFF().hp:0,summonCd:rand(4,7),pillarCd:rand(3,5)};
  if(elite){const rg=new THREE.Mesh(new THREE.TorusGeometry(.75*sz,.06,6,18),mat(0xffcf3a,0xffaa00));rg.rotation.x=Math.PI/2;rg.position.y=.1;B.g.add(rg);B.eliteRing=rg;}
  B.g.position.copy(e.pos);B.g.scale.setScalar(.01);scene.add(B.g);
  B.hb.userData.e=e;B.hh.userData.e=e;B.hh.userData.head=true;hitboxes.push(B.hb,B.hh);
  addHealthBar(e);enemies.push(e);
  burst(new THREE.Vector3(x,y+.5,z),G.L.torch,12,4,1,.6);ring(new THREE.Vector3(x,y,z),G.L.torch,2,.5);if(Math.random()<.3)SFX.growl();
  if(elite&&Math.random()<.5)feed('ELITE '+T.name.toUpperCase()+'!');
  return e;
};
const _removeEnemy=removeEnemy;
removeEnemy=function(e){if(e.body.laser)scene.remove(e.body.laser);_removeEnemy(e);};

/* ---------- DAMAGE & DEATH ---------- */
function playerDmgMul(){return(1+.12*(save.upg.power||0))*(P.rageT>0?2:1);}
damageEnemy=function(e,amt,head,point,src){
  if(e.hp<=0)return;
  if(e.invuln||e.shielded){if(point)burst(point,0x7affff,4,3,.6,.3);hitMark('blk');return;}
  if(src!=='env')amt*=playerDmgMul(e,src);
  if(e.T.shield&&e.shieldHp>0&&(src===undefined||src==='proj')){
    const f=new THREE.Vector3(Math.sin(e.faceA),0,Math.cos(e.faceA));const d=new THREE.Vector3(P.pos.x-e.pos.x,0,P.pos.z-e.pos.z).normalize();
    if(f.dot(d)>.3){e.shieldHp-=amt;burst(point||e.pos.clone().setY(1.2),0x7ad8ff,5,4,.6,.3);hitMark('blk');SFX.hit();
      if(e.shieldHp<=0&&e.body.shield){e.body.shield.visible=false;feed('SHIELD BROKEN');burst(e.pos.clone().setY(1.2*e.size),0x7ad8ff,20,7,1,.6);}return;}
  }
  if(head&&!e.T.static)amt*=headMul();if(e.T.armored&&src!=='burn'&&src!=='env'){const fq=new THREE.Vector3(Math.sin(e.faceA),0,Math.cos(e.faceA)),dq=new THREE.Vector3(P.pos.x-e.pos.x,0,P.pos.z-e.pos.z).normalize().dot(fq);if(dq>.3)amt*=.3;else if(dq<-.3)amt*=2.2;}if(e.stunT>0)amt*=1.5;
  const shown=Math.min(amt,Math.max(1,e.hp));e.hp-=amt;e.hurt=.12;e.flinch=e.T.static||e.boss?0:.15;
  dmgNumber((point||e.pos.clone().setY(1.5)).clone(),shown,head);
  if(e.T.static)burst(point||e.pos.clone().setY(2),0xaaaaaa,4,4,.7,.4);else blood(point||e.pos.clone().setY(1),head?8:4,head?5:3);
  const c=$('cross');c.className=head?'head':'hit';clearTimeout(c._t);c._t=setTimeout(()=>c.className='',90);hitMark(head?'hd':'');head?SFX.head():SFX.hit();
  if(src!=='env'&&P.rageT<=0&&abilityOn('rage'))G.rage=Math.min(100,G.rage+shown/28*rageMul());
  if(e.burnT>0&&src!=='burn'&&Math.random()<.3)spawnShards(e.pos.x,e.pos.y+1,e.pos.z,1);
  if(!e.boss&&!e.T.static&&point){const k=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z).normalize().multiplyScalar(Math.min(.6,amt/120));e.pos.add(k);}
  if(e.boss)bossHpCheck(e);
  if(e.hp<=0)killEnemy(e,head,-e.hp>e.max*.35||src==='explosive'||src==='melee');
};
killEnemy=function(e,head,overkill){
  const p=e.pos.clone();p.y+=e.size*(e.T.flying?2.6:1);
  hitMark('kill');
  if(e.T.static){SFX.explode();burst(p,G.L.torch,40,10,1.6,1.2);burst(p,0x555555,20,7,1.4,1.4);lightFlash(p,G.L.torch,4,30,.6);shake(.6);
    G.score+=e.T.score;G.earned+=e.T.coins;feed(e.type==='gate'?'HELL GATE DESTROYED':'CRYSTAL SHATTERED');spawnOrbs(p.x,p.y,p.z,6,4);removeEnemy(e);
    if(e.owner){e.owner.crystals=e.owner.crystals.filter(c=>c!==e);if(!e.owner.crystals.length)breakShield(e.owner);}return;}
  SFX.die();
  if(e.T.bloat&&!e.popped){e.popped=true;setTimeout(()=>explode(p.clone(),4.2,e.dmg*1.6,0xc8ff3a),10);}
  spawnOrbs(e.pos.x,p.y,e.pos.z,e.boss?16:(e.finished?6:2+Math.floor(e.size*1.5)),e.boss?6:(e.finished?5:3));
  if(e.burnT>0)spawnShards(e.pos.x,p.y,e.pos.z,3);
  if(overkill||e.boss){gib(e);if(!e.boss&&Math.random()<.4)feed('SPLATTERED');}else{blood(p,16,6);burst(p,e.T.col,8,5,1.1,.9,true);bloodPool(e.pos.x,e.pos.z,1.2);}
  if(e.boss){burst(p,0xffaa00,80,16,2,1.8);lightFlash(p,0xff6600,8,60,1.2);for(const f of FX)if(f.boss===e&&f.kill)f.kill();}
  const coins=Math.round((e.T.coins||10)*DIFF().coins*(e.elite?3:1)*coinMul());
  G.score+=Math.round((e.T.score||10)*(head?2:1)*(overkill?1.5:1)*(e.elite?2:1));G.kills++;G.earned+=coins;SFX.coin();
  if(abilityOn('rage')&&P.rageT<=0)G.rage=Math.min(100,G.rage+4);
  if(P.rageT>0)P.hp=Math.min(P.maxHp,P.hp+3);
  const now=G.time;if(now-G.lastKill<2)G.streak++;else G.streak=1;G.lastKill=now;
  const names={2:'DOUBLE KILL',3:'TRIPLE KILL',4:'RAMPAGE',5:'MASSACRE',6:'RIP AND TEAR'};
  if(G.streak>=2){feed(names[Math.min(G.streak,6)]+' +'+(G.streak*5));G.score+=G.streak*5;}else if(head)feed('HEADSHOT');
  if(e.elite){dropPickup(e.pos.x,e.pos.z,'armor');feed('ELITE DOWN +'+coins+'c');}
  const roll=Math.random();
  if(e.boss){dropPickup(e.pos.x+2,e.pos.z,'armor');dropPickup(e.pos.x-2,e.pos.z,'nade');dropPickup(e.pos.x,e.pos.z+2,'ammo');}
  else if(roll<.05)dropPickup(e.pos.x,e.pos.z,'armor');else if(roll<.12)dropPickup(e.pos.x,e.pos.z,'ammo');else if(roll<.17)dropPickup(e.pos.x,e.pos.z,'nade');
  if(e.boss){G.bossE=null;$('boss').hidden=true;shake(1.4);SFX.explode();MUS.boss=false;for(const o of enemies.slice())if(!o.boss&&!o.T.static)killEnemy(o,false,true);}
  removeEnemy(e);
};
function spawnShards(x,y,z,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(orbGeo,mat(0x8ee05a,0x2a8a10));m.scale.setScalar(.8);m.position.set(x+rand(-.5,.5),y,z+rand(-.5,.5));scene.add(m);pickups.push({g:m,kind:'orb',armor:true,t:0,life:14,heal:4,v:new THREE.Vector3(rand(-3,3),rand(3,6),rand(-3,3))});}}

/* ---------- DEMON AI ---------- */
const navV=new THREE.Vector3();
function updateEnemy(e,dt){
  const B=e.body;e.t+=dt;
  if(e.custom){e.custom(e,dt);updateBar(e);return;}
  if(e.T.static){updateStatic(e,dt);return;}
  if(e.spawnT>0){e.spawnT-=dt;B.g.scale.setScalar(clamp(1-e.spawnT/(e.boss?1.2:.6),.01,1));if(e.spawnT>0)return;}
  const to=new THREE.Vector3(P.pos.x-e.pos.x,0,P.pos.z-e.pos.z);const dist=to.length();to.normalize();
  const T=e.T;let move=e.speed;
  if(!e.boss&&!e.staggered&&!e.stagDone&&e.hp>0&&e.hp<e.max*.3){e.staggered=true;e.stagT=4.5;if(Math.random()<.5)SFX.growl();}
  if(e.staggered){e.stagT-=dt;move=e.speed*.12;if(e.stagT<=0){e.staggered=false;e.stagDone=true;}}
  if(e.burnT>0){e.burnT-=dt;e.burnTick=(e.burnTick||0)-dt;if(e.burnTick<=0){e.burnTick=.5;damageEnemy(e,6,false,null,'burn');if(e.hp<=0)return;}if(Math.random()<.5)burst(e.pos.clone().setY(e.pos.y+rand(.5,1.8)*e.size),Math.random()<.5?0xff7a00:0xffcc33,1,2,.8,.4);}
  if(e.stunT>0){e.stunT-=dt;move=0;}
  let dir;
  if(e.boss){updateBoss(e,dt,to,dist);move=e.moveMul===undefined?e.speed:e.speed*e.moveMul;dir=e.chargeDir&&e.atk==='charge'&&e.atkStage===1?e.chargeDir:(e.flying?to.clone():navDir(e,navV).clone());}
  else{
    dir=T.flying?to.clone():navDir(e,navV).clone();
    const keep=T.keep||(T.shot==='snipe'?[14,26]:T.summon?[11,20]:(T.ranged&&!T.melee)?[9,20]:null);
    if(keep){if(dist<keep[0])dir.copy(to).multiplyScalar(-1),move=e.speed*.7;else if(dist<keep[1])move=e.speed*.15;}
    if(T.leap&&e.leaping)move=0;
    if(T.bloat&&e.fuse)move=0;
    if(e.aiming)move=0;
    const side=new THREE.Vector3(-to.z,0,to.x).multiplyScalar(Math.sin(e.t*1.3+e.size)*(T.ranged?.5:.25));dir.add(side).normalize();
  }
  e.pos.addScaledVector(dir,move*dt);
  if(e.leaping){e.pos.x+=e.lv.x*dt;e.pos.z+=e.lv.z*dt;}
  for(const o of enemies){if(o===e||o.T.static)continue;const dx=e.pos.x-o.pos.x,dz=e.pos.z-o.pos.z,d=Math.hypot(dx,dz),min=(e.size+o.size)*.4;if(d<min&&d>0){e.pos.x+=dx/d*(min-d)*.5;e.pos.z+=dz/d*(min-d)*.5;}}
  const before=e.pos.clone();
  resolveXZ(e.pos,(e.boss?.28:.35)*e.size,e.pos.y+(T.flying||e.flying?3.3:2.65),1.8*e.size);
  if(e.boss&&e.atk==='charge'&&e.atkStage===1&&before.distanceTo(e.pos)>.05&&!e.wallHit){e.wallHit=true;bossChargeWall(e);}
  // vertical: terrain following, hops, gravity
  const sH=(T.flying)?0:(e.flying?6:surfaceAt(e.pos.x,e.pos.z));
  if(e.air){e.vy-=30*dt;e.pos.y+=e.vy*dt;if(e.pos.y<=sH&&e.vy<=0){e.pos.y=sH;e.air=false;e.vy=0;if(e.leaping){e.leaping=false;e.cd=rand(1.8,2.8);burst(e.pos.clone(),0x777766,8,4,.9,.5);}if(e.slamming)bossLand(e);}}
  else if(e.flying){e.pos.y+=(sH-e.pos.y)*Math.min(1,dt*2);}
  else if(sH>e.pos.y+.35){e.vy=Math.sqrt(60*(sH-e.pos.y+.4));e.air=true;}
  else if(sH<e.pos.y-.4){e.air=true;e.vy=0;}
  else e.pos.y+=(sH-e.pos.y)*Math.min(1,dt*14);
  B.g.position.copy(e.pos);
  // facing
  const want=Math.atan2(to.x,to.z);let da=want-e.faceA;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
  const turn=T.shield?1.7:12;e.faceA+=clamp(da,-turn*dt,turn*dt);B.g.rotation.y=e.faceA;
  if(T.flying){B.g.position.y=e.pos.y+Math.sin(e.t*1.8)*.35;B.g.rotation.z=Math.sin(e.t*1.1)*.1;}
  if(T.robe){B.g.position.y=e.pos.y+.25+Math.sin(e.t*2)*.12;if(B.orb)B.orb.rotation.y+=dt*4;}
  if(B.eliteRing)B.eliteRing.rotation.z+=dt*3;
  const sw=Math.sin(e.t*(e.speed*2.2))*.7*(Math.abs(move)>.1?1:.15);
  B.legL.rotation.x=sw;B.legR.rotation.x=-sw;
  if(T.ranged&&dist>5){B.armR.rotation.x=-Math.PI/2;B.armL.rotation.x=-sw*.5;}else{B.armL.rotation.x=-Math.PI/2.4+sw*.2;B.armR.rotation.x=-Math.PI/2.4-sw*.2;}
  const stagFlash=e.staggered&&Math.floor(e.t*7)%2===0;const shFlash=e.shielded&&Math.floor(e.t*4)%2===0;
  if(e.hurt>0||stagFlash||shFlash){e.hurt-=dt;const fm=e.hurt>0?mat(0xffffff,0xffffff):shFlash?mat(0x7affff,0x2a8aaa):mat(0xff8a1a,0xff6a00);B.g.traverse(o=>{if(o.isMesh&&o.material.emissive&&!o.userData.keep){o.userData.base=o.userData.base??o.material;o.material=fm;}});}
  else B.g.traverse(o=>{if(o.isMesh&&o.userData.base){o.material=o.userData.base;delete o.userData.base;}});
  if(e.flinch>0){e.flinch-=dt;B.g.rotation.x=-e.flinch*1.6;}else B.g.rotation.x=e.staggered?-.25:0;
  updateBar(e);
  if(e.boss||e.staggered||e.stunT>0)return;
  // attacks
  e.cd-=dt;const ySame=Math.abs(P.pos.y-e.pos.y)<2.2;
  if(T.melee&&!e.leaping&&dist<1.1+e.size*.5&&e.cd<=0&&ySame){hurtPlayer(e.dmg);e.cd=.9;B.armL.rotation.x=B.armR.rotation.x=-Math.PI;if(T.beast)shake(.25);}
  if(T.leap&&!e.leaping&&!e.air&&e.cd<=0&&dist>4&&dist<15){e.leaping=true;e.air=true;e.vy=10.5;const tFlight=.72;const tgt=P.pos.clone().addScaledVector(P.vel,.4);e.lv=new THREE.Vector3(tgt.x-e.pos.x,0,tgt.z-e.pos.z).divideScalar(tFlight);if(e.lv.length()>20)e.lv.setLength(20);e.hitThisLeap=false;tone('sawtooth',200,500,.2,.08);}
  if(e.leaping&&!e.hitThisLeap&&dist<1.3&&Math.abs(P.pos.y+.8-e.pos.y)<1.6){e.hitThisLeap=true;hurtPlayer(e.dmg);P.vel.addScaledVector(to,6);}
  if(T.bloat){if(!e.fuse&&dist<2.4&&ySame){e.fuse=.9;tone('square',600,1200,.8,.12);}
    if(e.fuse){e.fuse-=dt;const k=1+Math.sin(e.t*30)*.08+(.9-e.fuse)*.35;if(B.belly)B.belly.scale.set(1.15*k,k,1.1*k);if(e.fuse<=0){e.popped=true;e.hp=0;explode(e.pos.clone().setY(e.pos.y+1),4.2,e.dmg*1.6,0xc8ff3a);killEnemy(e,false,true);}}}
  if(T.shot==='snipe'){
    if(!e.aiming&&e.cd<=0&&dist<45&&losTo(e)){e.aiming=1.3;}
    if(e.aiming){e.aiming-=dt;const from=e.pos.clone().setY(e.pos.y+1.45*e.size);const tgt=P.pos.clone().setY(P.pos.y+1.3);const L2=from.distanceTo(tgt);const las=B.laser;las.visible=true;las.scale.set(.04,.04,L2);las.position.copy(from).lerp(tgt,.5);las.lookAt(tgt);las.material.opacity=.3+.7*(1-e.aiming/1.3);
      if(e.aiming<=0){e.aiming=0;las.visible=false;e.cd=rand(3,4.5);SFX.crack();if(losTo(e)){hurtPlayer(e.dmg);tracer(from,tgt,0xff3030,.06,.12);}else tracer(from,tgt,0xff3030,.04,.08);}}
  }else if(T.ranged&&e.cd<=0&&dist<34&&(!T.melee||dist>5)){
    const from=e.pos.clone().setY(e.pos.y+(T.flying?2.4*e.size:1.5*e.size));const target=P.pos.clone().setY(P.pos.y+1.3);
    if(losTo(e,from)){const sh=T.shot;const d=target.sub(from);
      if(sh==='bullet'){d.x+=rand(-.6,.6);d.y+=rand(-.3,.3);fireOrb(from,d,32,e.dmg,0xffe066,.3);}
      else if(sh==='orb')fireOrb(from,d,11,e.dmg,0xff3a6a,1.5,'enemy',{glow:true});
      else fireOrb(from,d,15,e.dmg,0xff6a10,.9,'enemy',{glow:true});SFX.enemyShot();}
    e.cd=T.shot==='bullet'?rand(.9,1.6):rand(1.6,2.8);
  }
  if(T.ai&&ENEMY_AI[T.ai])ENEMY_AI[T.ai](e,dt,dist,to,ySame);
  if(T.summon){e.summonCd-=dt;e.pillarCd-=dt;
    if(e.summonCd<=0&&enemies.length<16){e.summonCd=rand(8,11);for(let i=0;i<2;i++){const a=Math.random()*6.28;spawnEnemy(Math.random()<.5?'husk':'fiend',clamp(e.pos.x+Math.cos(a)*3,-30,30),clamp(e.pos.z+Math.sin(a)*3,-30,30));}feed('A SUMMONER RAISES DEMONS');}
    if(e.pillarCd<=0&&dist<30){e.pillarCd=rand(5,7);firePillars(e,2,.5);}}
}
function losTo(e,from){from=from||e.pos.clone().setY(e.pos.y+1.5*e.size);const tgt=P.pos.clone().setY(P.pos.y+1.3);const d=tgt.clone().sub(from);const L2=d.length();ray.set(from,d.normalize());ray.far=L2;return!ray.intersectObjects(solidMeshes,false).length;}
function updateStatic(e,dt){
  const B=e.body;if(B.portal){B.portal.material.opacity=.6+Math.sin(e.t*5)*.25;B.portal.rotation.y=Math.sin(e.t)*.1;if(Math.random()<.3)burst(e.pos.clone().setY(rand(.5,4)),G.L.torch,1,2,.8,.5);}
  if(B.crystal){B.crystal.rotation.y+=dt*2;B.crystal.position.y=2.4+Math.sin(e.t*2)*.2;}
  if(e.hurt>0){e.hurt-=dt;}
  updateBar(e);
}

/* ---------- TELEGRAPHS ---------- */
function groundWarn(x,z,r,t,col,onDone,boss){
  const y=surfaceAt(x,z)+.05;
  const m=new THREE.Mesh(new THREE.CircleGeometry(r,20),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.25,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);
  const f=new THREE.Mesh(new THREE.CircleGeometry(r,20),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.55,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.set(x,y+.01,z);f.scale.setScalar(.01);scene.add(f);
  let el=0;return addFx({boss,kill(){scene.remove(m);scene.remove(f);},tick(dt){el+=dt;f.scale.setScalar(Math.min(1,el/t));if(el>=t){this.kill();onDone&&onDone(x,y,z);return false;}return true;}});
}
function meteorStrike(x,y,z,dmg){
  const p=new THREE.Vector3(x,y+.5,z);burst(p,0xff7a1a,22,8,1.3,.8);burst(p,0x444444,10,5,1.4,1);lightFlash(p,0xff6a00,3,14,.3);SFX.explode();shake(.25);
  const d=Math.hypot(P.pos.x-x,P.pos.z-z);if(d<2.8&&P.pos.y<y+2.5)hurtPlayer(dmg);
  for(const e of enemies.slice())if(!e.boss&&!e.T.static&&Math.hypot(e.pos.x-x,e.pos.z-z)<2.8)damageEnemy(e,dmg*1.5,false,null,'env');
}
function firePillars(owner,n,gap){
  for(let k=0;k<n;k++)setTimeout(()=>{if(G.state!=='play'||!enemies.includes(owner))return;const tx=P.pos.x+P.vel.x*.3,tz=P.pos.z+P.vel.z*.3;
    groundWarn(tx,tz,1.5,1,0xff5a00,(x,y,z)=>{const col=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,12,10),new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.85}));col.position.set(x,y+6,z);scene.add(col);SFX.rocket();
      let el=0,hit=false;addFx({boss:owner,kill(){scene.remove(col);},tick(dt){el+=dt;col.scale.set(1-el,1,1-el);col.material.opacity=.85*(1-el/.8);if(!hit&&Math.hypot(P.pos.x-x,P.pos.z-z)<1.6&&P.pos.y<y+6){hit=true;hurtPlayer(26);}if(el>.8){this.kill();return false;}return true;}});},owner);},k*gap*1000);
}
function shockwave(e,speed=13,maxR=24,dmg=22){
  const c=e.pos.clone();const y=surfaceAt(c.x,c.z)+.15;
  const m=new THREE.Mesh(new THREE.RingGeometry(.92,1,48),new THREE.MeshBasicMaterial({color:0xffb030,transparent:true,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(c.x,y,c.z);scene.add(m);
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.8,48,1,true),new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));wall.position.set(c.x,y+.4,c.z);scene.add(wall);
  let r=1,hit=false;return addFx({boss:e,kill(){scene.remove(m);scene.remove(wall);},tick(dt){r+=speed*dt;m.scale.setScalar(r);wall.scale.set(r,1,r);m.material.opacity=wall.material.opacity=Math.max(0,1-r/maxR);
    const d=Math.hypot(P.pos.x-c.x,P.pos.z-c.z);if(!hit&&Math.abs(d-r)<.9&&P.pos.y-surfaceAt(P.pos.x,P.pos.z)<.6){hit=true;hurtPlayer(dmg);P.vel.y=6;feed('JUMP THE SHOCKWAVES!');}
    if(r>=maxR){this.kill();return false;}return true;}});
}

/* ---------- BOSSES ---------- */
spawnBoss=function(def){
  const T=Object.assign({horns:true,score:def.major?2000:700,coins:def.major?300:150},def);
  const B=makeBody(T,def.size,true);const far=farCells(1,14,0,[T_FLOOR])[0]||[13,4];
  const hpS=(G.survival?(1+G.wave*.1):1)*DIFF().hp;
  const e={type:'boss',T,body:B,pos:new THREE.Vector3(cx(far[0]),0,cx(far[1])),hp:def.hp*hpS,max:def.hp*hpS,cd:2.5,t:0,hurt:0,boss:true,size:def.size,speed:def.speed,dmg:22*(1+G.L.ep*.15)*DIFF().dmg,spawnT:1.2,vy:0,faceA:0,phase:0,atk:null,atkT:0,crystals:[]};
  e.pos.y=surfaceAt(e.pos.x,e.pos.z);
  B.g.position.copy(e.pos);scene.add(B.g);B.hb.userData.e=e;B.hh.userData.e=e;B.hh.userData.head=true;hitboxes.push(B.hb,B.hh);
  enemies.push(e);G.bossE=e;$('boss').hidden=false;$('bname').textContent=def.name;$('btitle').textContent=def.title||'';$('bphase').textContent=def.major?'PHASE 1':'';
  ring(e.pos,0xff2200,18,1.2);lightFlash(e.pos.clone().setY(4),0xff3300,6,40,1.2);SFX.boss();shake(.8);MUS.boss=true;
  banner(def.name,def.title||'',2.5);
  return e;
};
function bossPool(e){const d=e.T;return d.phases?d.phases[e.phase].attacks:d.attacks;}
function bossPhaseDef(e){return e.T.phases?e.T.phases[e.phase]:{};}
function bossHpCheck(e){
  const d=e.T;
  if(d.phases){const want=e.hp<e.max*.34?2:e.hp<e.max*.67?1:0;if(want>e.phase&&e.hp>0){e.phase=want;bossPhaseChange(e);}}
  else if(!e.enraged&&e.hp<e.max*.5){e.enraged=true;e.speed*=1.25;banner('ENRAGED!','',1.4);shake(.5);}
}
function bossPhaseChange(e){
  const pd=bossPhaseDef(e);$('bphase').textContent='PHASE '+(e.phase+1);
  banner('PHASE '+(e.phase+1),e.T.name+' grows stronger',2);SFX.boss();shake(.9);
  e.atk=null;e.cd=2.5;if(pd.fast)e.speed=e.T.speed*pd.fast;
  shockwave(e,15,26,18);
  if(pd.shield){e.shielded=true;const cells=farCells(3,8,14,[T_FLOOR,T_PLAT]);
    e.shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(e.size*1.15,16,12),new THREE.MeshBasicMaterial({color:0x7affff,transparent:true,opacity:.22,depthWrite:false}));e.shieldMesh.position.y=e.size*1.1;e.shieldMesh.userData.keep=true;e.body.g.add(e.shieldMesh);
    cells.forEach(([i,j])=>{const c=staticTarget('crystal',cx(i),cx(j),{name:'Ward Crystal',hp:Math.round(380*DIFF().hp*(1+G.L.ep*.3))});c.owner=e;e.crystals.push(c);});
    feed('DESTROY THE WARD CRYSTALS');}
  if(pd.fly){e.flying=true;feed(e.T.name+' TAKES FLIGHT');}
}
function breakShield(e){e.shielded=false;if(e.shieldMesh){e.body.g.remove(e.shieldMesh);e.shieldMesh=null;}e.stunT=3.5;e.atk=null;banner('SHIELD BROKEN','Hit it while it is stunned!',2);shake(.6);burst(e.pos.clone().setY(e.size),0x7affff,40,12,1.4,1);}
function bossChargeWall(e){e.atk=null;e.stunT=1.6;e.cd=2;shake(.7);SFX.explode();burst(e.pos.clone().setY(1),0x999999,24,8,1.2,.8);feed('STUNNED! OPEN FIRE');}
function bossLand(e){e.slamming=false;shake(.8);SFX.explode();burst(e.pos.clone().setY(.3),0x886644,30,10,1.4,.8);shockwave(e);if(Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<e.size*.9)hurtPlayer(25);}
function updateBoss(e,dt,to,dist){
  e.moveMul=1;
  if(e.stunT>0){e.moveMul=0;return;}
  const pd=bossPhaseDef(e);const fast=pd.fast||(e.enraged?1.25:1);
  if(e.atk){e.atkT-=dt;const a=e.atk;
    if(a==='charge'){if(e.atkStage===0){e.moveMul=0;if(e.line){e.line.position.copy(e.pos).addScaledVector(e.chargeDir,8);e.line.position.y=surfaceAt(e.pos.x,e.pos.z)+.06;}if(e.atkT<=0){e.atkStage=1;e.atkT=1.1;e.wallHit=false;if(e.line){scene.remove(e.line);e.line=null;}SFX.growl();}}
      else{e.moveMul=4.6*fast;if(!e.chargeHit&&dist<e.size*.6+.6&&Math.abs(P.pos.y-e.pos.y)<2.5){e.chargeHit=true;hurtPlayer(e.dmg*1.2);P.vel.addScaledVector(to,15);P.vel.y=8;}if(Math.random()<.5)burst(e.pos.clone().setY(.2),0x999999,1,2,1,.4);if(e.atkT<=0){e.atk=null;e.cd=rand(1.2,2)/fast;}}
      return;}
    if(a==='beam'){e.moveMul=0;const from=e.pos.clone().setY(e.pos.y+e.size*1.55);
      if(e.atkStage===0){if(e.atkT<=0){e.atkStage=1;e.atkT=3.2;e.beamA=Math.atan2(to.x,to.z)+(Math.random()<.5?.9:-.9);SFX.anni();}else{if(Math.random()<.6)burst(from,0xff3a1a,1,3,.8,.3);}}
      else{const want=Math.atan2(to.x,to.z);let da=want-e.beamA;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;e.beamA+=clamp(da,-.75*fast*dt,.75*fast*dt);e.faceA=e.beamA;
        const dir=new THREE.Vector3(Math.sin(e.beamA),0,Math.cos(e.beamA));ray.set(from,dir);ray.far=60;const h=ray.intersectObjects(solidMeshes,false);const len=h.length?h[0].distance:60;
        if(!e.beam){e.beam=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xff4a1a,transparent:true,opacity:.85}));e.beam.userData.keep=true;scene.add(e.beam);}
        e.beam.scale.set(.5,.5,len);e.beam.position.copy(from).addScaledVector(dir,len/2);e.beam.lookAt(from.clone().addScaledVector(dir,len));
        if(Math.random()<.7)burst(from.clone().addScaledVector(dir,len),0xffaa33,1,4,.8,.3);
        const pd2=Math.hypot(P.pos.x-from.x,P.pos.z-from.z);const ang=Math.abs(Math.atan2(Math.sin(want-e.beamA),Math.cos(want-e.beamA)));
        if(pd2<len&&ang<Math.atan2(.8,pd2)&&P.pos.y<from.y+.5&&P.pos.y+P.height>from.y-1.2){e.beamTick=(e.beamTick||0)-dt;if(e.beamTick<=0){e.beamTick=.2;hurtPlayer(7);}}
        if(e.atkT<=0){scene.remove(e.beam);e.beam=null;e.atk=null;e.cd=rand(1.2,2)/fast;}}
      return;}
    if(a==='volley'){e.moveMul=.3;e.vt=(e.vt||0)-dt;if(e.vt<=0){e.vt=.14/fast;const from=e.pos.clone().setY(e.pos.y+e.size*1.5);const tgt=P.pos.clone().addScaledVector(P.vel,.35).setY(P.pos.y+1);const d=tgt.sub(from);d.x+=rand(-1.2,1.2);fireOrb(from,d,21,10,0xff5a10,1.2,'enemy',{glow:true});SFX.enemyShot();}}
    if(a==='slam'&&!e.slamming&&!e.air){e.atk=null;e.cd=rand(1,1.8)/fast;}
    if(e.atkT<=0&&e.atk!=='slam'){e.atk=null;e.cd=rand(1.2,2.2)/fast;}
    return;
  }
  if(e.flying&&Math.random()<dt*.6){const x=P.pos.x+rand(-6,6),z=P.pos.z+rand(-6,6);groundWarn(x,z,2.6,1.3,0xff3a00,(x,y,z)=>meteorStrike(x,y,z,22),e);}
  e.cd-=dt*(e.shielded?.6:1);
  if(dist<e.size*.55+.4&&!e.meleeCd&&Math.abs(P.pos.y-e.pos.y)<2.5){hurtPlayer(e.dmg*.7);e.meleeCd=true;setTimeout(()=>e.meleeCd=false,900);}
  if(e.cd>0)return;
  let pool=bossPool(e).slice();if(e.flying)pool=pool.filter(a=>a!=='charge'&&a!=='slam');
  const a=pool[Math.floor(Math.random()*pool.length)];e.atk=a;e.atkStage=0;
  if(a==='charge'){e.atkT=.7;e.chargeDir=to.clone();e.chargeHit=false;
    e.line=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:.45,depthWrite:false}));e.line.scale.set(e.size*.7,.02,16);e.line.rotation.y=Math.atan2(to.x,to.z);scene.add(e.line);
    addFx({boss:e,kill(){if(e.line){scene.remove(e.line);e.line=null;}},tick(){return!!e.line;}});}
  else if(a==='slam'){e.atkT=2;e.slamming=true;e.air=true;e.vy=15;const lead=Math.min(dist,10);e.pos.addScaledVector(to,lead*.15);tone('sawtooth',80,300,.5,.2);}
  else if(a==='volley')e.atkT=1.4;
  else if(a==='radial'){e.atkT=.9;const n=e.enraged||e.phase>1?24:16;const from=e.pos.clone().setY(e.pos.y+1.2);for(let k=0;k<3;k++)setTimeout(()=>{if(!enemies.includes(e)||G.state!=='play')return;for(let i=0;i<n;i++){const ang=i/n*Math.PI*2+k*.13;fireOrb(from,new THREE.Vector3(Math.cos(ang),0,Math.sin(ang)),11,10,e.T.eye,1.3);}SFX.enemyShot();},k*380);}
  else if(a==='meteor'){e.atkT=1.2;const n=6+e.phase*2;for(let i=0;i<n;i++)setTimeout(()=>{if(!enemies.includes(e)||G.state!=='play')return;const near=i<3;const x=near?P.pos.x+P.vel.x*.8+rand(-1,1):P.pos.x+rand(-12,12),z=near?P.pos.z+P.vel.z*.8+rand(-1,1):P.pos.z+rand(-12,12);groundWarn(clamp(x,-32,32),clamp(z,-32,32),2.6,1.3,0xff3a00,(x,y,z)=>meteorStrike(x,y,z,24),e);},i*140);feed('METEORS INCOMING');}
  else if(a==='beam'){e.atkT=.9;e.atkStage=0;feed('BEAM! GET BEHIND COVER');}
  else if(a==='summon'){e.atkT=.9;const n=e.phase>1||e.enraged?4:3;const type=bossPhaseDef(e).summon||(G.L.pool?G.L.pool[0]:'fiend');for(let i=0;i<n;i++){const[x,z]=spawnPoint();spawnEnemy(type,x,z);}feed('MINIONS!');}
  else if(a==='pillars'){e.atkT=1.4;firePillars(e,4+e.phase,.35);}
  else if(a==='teleport'){e.atkT=1;burst(e.pos.clone().setY(e.size),0x8a5aff,40,10,1.4,.8);const c=farCells(1,12,0,[T_FLOOR,T_PLAT])[0];if(c){e.pos.set(cx(c[0]),surfaceAt(cx(c[0]),cx(c[1])),cx(c[1]));}burst(e.pos.clone().setY(e.size),0x8a5aff,40,10,1.4,.8);tone('sine',1400,200,.4,.25);setTimeout(()=>{if(enemies.includes(e)&&!e.atk){e.atk='volley';e.atkT=1.2;}},500);}
  else if(BOSS_ATK[a])BOSS_ATK[a](e,to,dist);
}
