/* ---------- RUN START ---------- */
const _updNums=updateNums;updateNums=function(dt){_updNums(dt);for(const f of frameHooks)f(dt);};
function startRun(levelIdx,survival){
  audioInit();musicInit();clearEntities();
  Object.assign(G,{levelIdx,survival,wave:0,time:0,score:0,kills:0,earned:0,streak:0,bossE:null,bossPhase:false,waveQueue:[],betweenT:1.5,winT:0,pendingBoss:null,gates:[],secrets:[],found:0,rage:0,spawnT:2,
    curRoom:-1,hasKey:false,keyDrop:null,corpses:[],roomsCleared:0,tookDamage:false,roomDmg:false,runRelics:[],xpGain:0,sigilGot:false,vaultOpened:false,maxStreak:0});
  const L=survival?LEVELS[Math.floor(Math.random()*Math.min(LEVELS.length,Math.max(5,save.unlocked)))]:LEVELS[levelIdx];G.L=L;G.obj=survival?'survival':L.obj;
  G.state='loading';
  buildWorld(L,survival?Math.floor(Math.random()*9999)+20:levelIdx*13+1,{single:survival});
  P.pos.set(cx(grid.spawn.i),0,cx(grid.spawn.j));P.vel.set(0,0,0);P.pitch=0;
  const d0=grid.rooms[0].doors[0];P.yaw=d0?Math.atan2(-(d0.x-P.pos.x),-(d0.z-P.pos.z)):0;
  applyUpgrades();P.hp=P.maxHp;P.armor=0;P.nades=Math.min(P.maxNades,4);P.spin=0;P.zoom=false;P.rageT=0;P.dashes=P.maxDash;P.flameCd=0;
  WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);
  const pref=['sshot','shotgun','rifle','chain','plasma','pistol'];const bid=pref.find(id=>save.owned.includes(id))||'pistol';
  P.weapon=-1;gunModel=null;switchWeapon(WEAPONS.findIndex(w=>w.id===bid));
  $('boss').hidden=true;['menu','pause','result'].forEach(id=>$(id).hidden=true);$('hud').hidden=false;$('touch').hidden=!isTouch;
  navT=0;buildNav();
  if(!survival){G.secrets=placeSecrets().map((p,k)=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.35),mat(0xc07aff,0x8a3aff));m.position.copy(p);scene.add(m);return{m,k,got:!!save.secrets[levelIdx+'-'+k]};});
    G.secrets.forEach(s=>{if(s.got)s.m.material=mat(0x6a5a7a,0x221a2a);});}
  setupRooms(L);
  G.state='play';
  const ep=EPISODES[L.ep];
  banner(survival?'SURVIVAL':L.name,survival?DIFF().label+' · How long can you last?':ep.name+' · '+(grid.rooms.filter(r=>r.type==='main'||r.type==='boss').length+1)+' rooms · '+DIFF().label,3);
  objText();lockPointer();
}
function setupRooms(L){
  const R=grid.rooms;
  if(grid.single){R[0].enc='survival';startEnc(R[0]);G.curRoom=0;return;}
  const mains=R.filter(r=>r.type==='main');
  mains.forEach((r,k)=>{r.enc=L.enc[k%L.enc.length];r.order=k+2;});
  R[0].order=1;R[0].state='clear';R[0].seen=true;
  const boss=R.find(r=>r.type==='boss');boss.enc='boss';boss.order=mains.length+2;
  const vault=grid.side.vault;
  if(vault){vault.enc='vault';const kr=mains.filter(r=>r.enc!=='s');(kr.length?kr:mains)[Math.floor(Math.random()*(kr.length||mains.length))].hasKey=true;
    const c=new THREE.Group();const base=new THREE.Mesh(boxGeo,skinMat(0x6a4a10));base.scale.set(1.4,.8,1);base.position.y=.4;c.add(base);
    const lid=new THREE.Mesh(boxGeo,skinMat(0xd4a017));lid.scale.set(1.5,.35,1.1);lid.position.y=.95;c.add(lid);
    const glow=new THREE.Mesh(new THREE.OctahedronGeometry(.25),mat(0xffcf3a,0xffaa00));glow.position.y=1.6;c.add(glow);
    c.position.set(vault.cx,.5,vault.cz);world.add(c);vault.chest={g:c,lid,glow,opened:false};}
  if(grid.side.trial)grid.side.trial.state='clear';
  G.curRoom=0;
}
function roomName(r){return r.enc==='boss'?'BOSS':r.enc==='vault'?'VAULT':ENC[r.enc]||'';}
function sealRoom(R,on){for(const d of R.doors){if(d.locked)continue;setDoor(d,!on);}}
function startEnc(R){
  const L=G.L,li=G.levelIdx,ep=L.ep;R.state='active';G.roomDmg=false;G.corpses=[];
  const pool=L.pool;const pk=()=>pool[Math.floor(Math.random()*pool.length)];
  const E=R.es={kind:R.enc,wave:0,queue:[],spawnT:1.2,t:0};
  if(R.enc!=='survival')sealRoom(R,true);
  if(R.enc==='p'){E.waves=3+(ep>=2?1:0);}
  else if(R.enc==='g'){const n=li>=9?3:2;farCells(n,9,10,[T_FLOOR]).forEach(([i,j])=>G.gates.push(spawnGate(cx(i),cx(j))));E.queue=Array.from({length:2},pk);}
  else if(R.enc==='s'){E.timeLeft=38+li*1.6;}
  else if(R.enc==='e'){E.elites=3+(ep>=2?1:0);E.queue=Array.from({length:5+ep*2},pk);}
  else if(R.enc==='boss'){queueBoss(L.boss);E.queue=Array.from({length:2+ep},pk);}
  else if(R.enc==='vaultamb'){E.queue=Array.from({length:6+Math.floor(li/3)},pk);E.elites=1+Math.floor(ep/2);}
  else if(R.enc==='survival'){E.survival=true;}
  if(R.hasKey){E.keyBearer=true;}
  if(R.enc!=='survival'){banner(roomName(R==null?{}:R)||'ROOM',R.enc==='p'?'Purge every demon':R.enc==='g'?'Destroy the Hell Gates':R.enc==='s'?'Hold out until the timer ends':R.enc==='e'?'Kill the elites':R.enc==='vaultamb'?'It was a trap!':'',2);SFX.wave();}
  MUS.intensity=1;
}
function spawnFromQueue(E,cap){E.spawnT-=G.dtE;if(E.queue.length&&E.spawnT<=0&&enemies.length<cap){const[x,z]=spawnPoint();spawnEnemy(E.queue.shift(),x,z);E.spawnT=rand(.3,.75);}}
function encTick(R,dt){
  const E=R.es,L=G.L,li=G.levelIdx,ep=L.ep,cap=10+ep*2;const pool=L.pool;const pk=()=>pool[Math.floor(Math.random()*pool.length)];
  const alive=enemies.filter(e=>!e.T.static).length;E.t+=dt;
  if(E.keyBearer&&E.t>1.5){E.keyBearer=false;G.forceElite=1;const[x,z]=spawnPoint();const types=pool.filter(t=>!ENEMY[t].swarm);const e=spawnEnemy(types[Math.floor(Math.random()*types.length)],x,z);G.forceElite=0;
    e.keyBearer=true;const k=new THREE.Mesh(boxGeo,mat(0xffcf3a,0xffaa00));k.scale.set(.35,.35,.35);k.position.y=(e.T.flying?3.8:2.5)*e.size;k.userData.keep=true;e.body.g.add(k);e.body.keyIcon=k;feed('A KEY BEARER HAS APPEARED (GOLD CUBE)');}
  if(E.kind==='p'){spawnFromQueue(E,cap);
    if(!E.queue.length&&alive===0){if(E.wave>=E.waves){clearRoom(R);return;}E.wave++;const n=6+Math.floor(li*.55)+E.wave*3;E.queue=Array.from({length:n},pk);if(E.wave>1)banner('WAVE '+E.wave+' / '+E.waves,n+' demons',1.4);E.spawnT=E.wave===1?.4:1.2;}}
  else if(E.kind==='g'){const g=G.gates.filter(x=>x.hp>0);
    for(const x of g){x.spawnCd-=dt;if(x.spawnCd<=0&&enemies.length<cap){x.spawnCd=rand(3.5,6)-ep*.5;spawnEnemy(pk(),x.pos.x+rand(-2,2),x.pos.z+rand(-2,2));}}
    spawnFromQueue(E,cap);if(!g.length&&alive===0&&!E.queue.length)clearRoom(R);}
  else if(E.kind==='s'){E.timeLeft-=dt;E.spawnT-=G.dtE;const k=Math.min(1,E.t/(E.t+E.timeLeft));
    if(E.timeLeft>0&&E.spawnT<=0&&enemies.length<cap){const[x,z]=spawnPoint();spawnEnemy(pk(),x,z);E.spawnT=Math.max(.5,1.9-k*1.3)-ep*.12;}
    if(E.timeLeft<=0){for(const e of enemies.slice())if(!e.T.static&&!e.keyBearer)killEnemy(e,false,true);if(!enemies.some(e=>e.keyBearer))clearRoom(R);}}
  else if(E.kind==='e'||E.kind==='vaultamb'){if(E.elites>0&&E.t>.8){E.elites--;G.forceElite=1;const[x,z]=spawnPoint();const types=pool.filter(t=>!ENEMY[t].swarm);spawnEnemy(types[Math.floor(Math.random()*types.length)],x,z);G.forceElite=0;}
    spawnFromQueue(E,cap);if(E.elites<=0&&!E.queue.length&&alive===0)clearRoom(R);}
  else if(E.kind==='boss'){
    if(G.pendingBoss){G.bossTimer-=dt;if(G.bossTimer<=0){spawnBoss(G.pendingBoss);G.pendingBoss=null;}}
    else{E.escT=(E.escT||0)-dt;if(G.bossE&&E.escT<=0&&alive<4+ep){E.escT=9-ep;E.queue.push(pk());}spawnFromQueue(E,cap);
      if(!G.bossE&&alive===0&&!G.winT){clearRoom(R);}}}
  else if(E.survival){survivalTick(E,dt);}
}
function survivalTick(E,dt){
  const alive=enemies.filter(e=>!e.T.static).length;
  if(G.pendingBoss){G.bossTimer-=dt;if(G.bossTimer<=0){spawnBoss(G.pendingBoss);G.pendingBoss=null;}return;}
  if(G.bossPhase){if(!G.bossE&&alive===0){G.bossPhase=false;G.betweenT=2.5;feed('CHAMPION DOWN! +25 HP');P.hp=Math.min(P.maxHp,P.hp+25);}return;}
  if(G.waveQueue.length){G.spawnT-=G.dtE;if(G.spawnT<=0&&enemies.length<14){const[x,z]=spawnPoint();spawnEnemy(G.waveQueue.shift(),x,z);G.spawnT=rand(.3,.8);}}
  else if(alive===0){G.betweenT-=dt;if(G.betweenT<=0){if(G.wave>0)P.hp=Math.min(P.maxHp,P.hp+15);nextWave();G.betweenT=2.2;}}
}
function nextWave(){
  G.wave++;
  if(G.wave%5===0){const keys=Object.keys(BOSSES);const b=BOSSES[keys[(G.wave/5-1)%keys.length]];queueBoss(b.major?Object.assign({},b,{hp:b.hp*.6}):b);return;}
  const n=4+G.wave*2;const all=Object.keys(ENEMY);const pool=all.slice(0,Math.min(all.length,3+Math.floor(G.wave/1.3)));
  G.waveQueue=Array.from({length:n},()=>pool[Math.floor(Math.random()*pool.length)]);banner('WAVE '+G.wave,n+' demons incoming',1.8);SFX.wave();G.spawnT=.5;
}
function clearRoom(R){
  R.state='clear';G.roomsCleared++;sealRoom(R,false);G.corpses=[];
  if(R.enc==='boss'){G.winT=2.5;banner(G.L.boss.major?'WARLORD SLAIN':'VICTORY','',2.5);return;}
  P.hp=Math.min(P.maxHp,P.hp+15);G.score+=100;
  banner('ROOM CLEARED',R.enc==='vaultamb'?'The vault is yours':'The doors are open',1.6);tone('sine',523,1046,.4,.2);setTimeout(()=>tone('sine',784,1568,.5,.2),160);
  if(typeof onRoomClear==='function')onRoomClear(R);
  MUS.intensity=.15;
}
function queueBoss(def){G.bossPhase=true;G.pendingBoss=def;G.bossTimer=2.4;banner(def.major?'WARLORD':'CHAMPION',def.name,2.5);SFX.boss();}

/* ---------- PER-FRAME OBJECTIVES ---------- */
function objectiveTick(dt){
  G.dtE=dt*(G.slowT>0?.3:1);
  const R=grid.rooms;const i=ci(P.pos.x),j=ci(P.pos.z);const r=grid.roomOf[idx(i,j)];
  if(r>=0&&r!==G.curRoom){G.curRoom=r;const RR=R[r];if(!RR.seen){RR.seen=true;}lightRoom(RR);G.corpses=[];}
  const cur=curRoomObj();
  if(cur&&cur.state==='idle'&&cur.enc&&cur.enc!=='vault'&&inRoom(cur,i,j,1))startEnc(cur);
  for(const RR of R)if(RR.state==='active')encTick(RR,dt);
  // key, vault door, chest
  if(G.keyDrop){const k=G.keyDrop;k.m.rotation.y+=dt*3;k.m.position.y=k.y+Math.sin(G.time*4)*.15;
    if(k.m.position.distanceTo(P.pos.clone().setY(P.pos.y+1))<1.6){world.remove(k.m);G.keyDrop=null;G.hasKey=true;banner('SKULL KEY','Open the gold vault door',2);tone('sine',660,1320,.3,.2);setTimeout(()=>tone('sine',990,1980,.4,.2),140);}}
  if(G.hasKey){for(const d of grid.doors){if(d.locked&&Math.hypot(P.pos.x-d.x,P.pos.z-d.z)<4){d.locked=false;G.hasKey=false;setDoor(d,true);feed('VAULT UNLOCKED');}}}
  const v=grid.side&&grid.side.vault;
  if(v&&v.chest&&!v.chest.opened){v.chest.glow.rotation.y+=dt*2;if(Math.hypot(P.pos.x-v.cx,P.pos.z-v.cz)<2.2&&curRoomObj()===v){v.chest.opened=true;v.chest.lid.rotation.x=-1.1;v.chest.lid.position.z=-.4;v.chest.glow.visible=false;
    G.vaultOpened=true;burst(new THREE.Vector3(v.cx,1.6,v.cz),0xffcf3a,40,7,1.2,1.2);SFX.boss();if(typeof openVault==='function')openVault(v);
    setTimeout(()=>{if(G.state==='play'&&!G.trial){v.enc='vaultamb';startEnc(v);}},1600);}}
  objText();
}
function nextRoom(){return grid.rooms.filter(r=>(r.type==='main'||r.type==='boss')&&r.state!=='clear').sort((a,b)=>a.order-b.order)[0];}
function objText(){
  if(!grid||!grid.rooms)return;let t='';const R=curRoomObj();
  if(G.survival)t='SURVIVAL · WAVE '+G.wave+(G.bossE?' · KILL '+G.bossE.T.name:'');
  else if(G.bossE)t='KILL '+G.bossE.T.name+(G.bossE.shielded?(G.bossE.T.body==='hydra'?' · DESTROY THE HEADS':' · DESTROY THE WARD CRYSTALS'):'');
  else if(G.pendingBoss)t='SOMETHING IS COMING…';
  else if(R&&R.state==='active'){const E=R.es;const tot=grid.rooms.filter(r=>r.type==='main'||r.type==='boss').length+1;
    t=(R.enc==='vaultamb'?'VAULT AMBUSH':'ROOM '+R.order+'/'+tot+' · '+roomName(R))+(E.kind==='p'?' · WAVE '+Math.max(1,E.wave)+'/'+E.waves:E.kind==='g'?' · '+G.gates.filter(g=>g.hp>0).length+' GATES':E.kind==='s'?' · '+Math.ceil(Math.max(0,E.timeLeft))+'s':'');}
  else{const n=nextRoom();t=n?'PROCEED TO '+(n.enc==='boss'?'THE BOSS ROOM':'ROOM '+n.order)+' ▸ (MAP)':'';
    if(G.keyDrop)t='PICK UP THE SKULL KEY';else if(G.hasKey)t='KEY IN HAND · FIND THE GOLD VAULT DOOR';}
  $('objective').textContent=t;
}
const _killR=killEnemy;
killEnemy=function(e,head,overkill){
  const st=e.T.static,bear=e.keyBearer,pos=e.pos.clone();const gib=overkill||e.hp<-e.max*.35;
  _killR(e,head,overkill);
  if(bear){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.4),mat(0xffcf3a,0xffaa00));const y=surfaceAt(pos.x,pos.z)+1.1;m.position.set(pos.x,y,pos.z);world.add(m);G.keyDrop={m,y};feed('THE SKULL KEY DROPPED');}
  if(!st&&!e.boss&&!e.T.swarm&&!gib&&!e.custom&&G.corpses.length<30)G.corpses.push({type:e.type,x:pos.x,z:pos.z});
};
