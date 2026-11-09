/* =====================================================================
   MISSIONS — mission objectives layered onto the room-by-room levels.
   Each story mission assigns a different objective to each room:
   rescue, escort, activate (consoles/valves/charges/mirrors), defend,
   holdout, capture, carry, assassinate, purify, darkness and gauntlet.
   Plus level modifiers (blackout, fog, low gravity, falling slag),
   a timed escape after some bosses, checkpoints and waypoints.
   ===================================================================== */
G.mode='story';
LEVELS.forEach((L,i)=>{const M=STORY.missions[i];if(M){L.mission=M;L.rooms=M.rooms||L.rooms;}});
function curMission(){return(!G.survival&&!G.trial&&G.L&&G.L.mission)||null;}
Object.assign(ENC,{rescue:'RESCUE',escort:'ESCORT',activate:'SABOTAGE',defend:'DEFEND',holdout:'HOLD OUT',capture:'CAPTURE',carry:'RETRIEVE',assassinate:'ASSASSINATE',purify:'PURGE THE ROT',darkness:'BLACKOUT',gauntlet:'GAUNTLET'});
const HARD={rate:()=>G.mode==='horror'?.6:G.mode==='story'||G.mode==='descent'?Math.max(.62,.86-epN()*.05):1,cap:()=>G.mode==='horror'?3+epN():G.mode==='story'||G.mode==='descent'?2+epN():0};
const liveCount=()=>enemies.filter(e=>!e.T.static).length;
const epN=()=>(G.L&&G.L.ep)||0;
function pickType(strong){const pool=G.L.pool;if(strong){const s=['juggernaut','brute','shielder','revenant','gnasher','stalker','fiend','marksman','leaper'].filter(t=>pool.includes(t));if(s.length)return s[Math.floor(Math.random()*Math.min(3,s.length))];}return pool[Math.floor(Math.random()*pool.length)];}
function openAt(x,z){const k=idx(ci(x),ci(z));return grid.t[k]===T_FLOOR&&grid.roomOf[k]===G.curRoom;}
function trickle(E,dt,every,cap,near){every*=HARD.rate();cap+=HARD.cap();E.spawnT-=G.dtE;if(E.spawnT>0)return;if(liveCount()>=cap){E.spawnT=.6;return;}
  let x,z;if(near&&Math.random()<.55){const a=Math.random()*6.28,r=rand(6,10);x=near.x+Math.cos(a)*r;z=near.z+Math.sin(a)*r;if(!openAt(x,z)||Math.hypot(x-P.pos.x,z-P.pos.z)<7)[x,z]=spawnPoint();}else[x,z]=spawnPoint();
  spawnEnemy(pickType(),x,z);E.spawnT=Math.max(.6,every)*rand(.7,1.3);}
function wadd(o){world.add(o);return o;}
function floorY(x,z){return surfaceAt(x,z);}

/* ---------- PROPS ---------- */
const Props={
 box(g,m,sx,sy,sz,x,y,z){return boxIn(g,m,sx,sy,sz,x,y,z);},
 glow(col){return new THREE.MeshBasicMaterial({color:col});},
 terminal(x,z){const g=new THREE.Group();const m=skinMat(0x4a4a52);boxIn(g,m,1,1.1,.7,0,.55,0);boxIn(g,skinMat(0x2a2a30),1.1,.12,.8,0,1.12,0);
  const sc=new THREE.Mesh(boxGeo,this.glow(0xff3a1a));sc.scale.set(.8,.5,.05);sc.position.set(0,1.45,-.1);sc.rotation.x=-.4;g.add(sc);g.userData.screen=sc;boxIn(g,m,.15,.5,.15,0,1.3,.2);return g;},
 valve(x,z){const g=new THREE.Group();const m=skinMat(0x6a5a4a);boxIn(g,m,.5,3.2,.5,0,1.6,0);boxIn(g,skinMat(0x8a3a10),1.2,.3,1.2,0,.15,0);
  const w=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,6,14),mat(0xff3a1a,0x881a00));w.position.set(0,1.4,.35);g.add(w);g.userData.wheel=w;for(let i=0;i<4;i++){const s=boxIn(w,skinMat(0x3a3a3a),.06,1.1,.06,0,0,0);s.rotation.z=i*Math.PI/4;}return g;},
 charge(x,z){const g=new THREE.Group();const col=G.L.block[2];boxIn(g,skinMat(col),1.3,5,1.3,0,2.5,0);boxIn(g,skinMat(0xff5a00),1.5,.25,1.5,0,4.2,0);boxIn(g,skinMat(0xff5a00),1.5,.25,1.5,0,1.2,0);
  const c=new THREE.Group();c.visible=false;c.position.set(0,1.6,.72);g.add(c);boxIn(c,skinMat(0x3a4a2a),.5,.4,.2,0,0,0);const l=new THREE.Mesh(boxGeo,this.glow(0xff2200));l.scale.setScalar(.12);l.position.set(0,.25,.05);c.add(l);g.userData.charge=c;g.userData.led=l;return g;},
 mirror(x,z){const g=new THREE.Group();boxIn(g,skinMat(0x5a5a62),.4,2.2,.4,0,1.1,0);const p=new THREE.Group();p.position.y=2.4;g.add(p);
  const pane=new THREE.Mesh(boxGeo,new THREE.MeshLambertMaterial({color:0x9ad8ff,emissive:0x1a3a4a}));pane.scale.set(1.8,1.3,.08);p.add(pane);boxIn(p,skinMat(0x3a3a42),1.95,.1,.12,0,.68,0);boxIn(p,skinMat(0x3a3a42),1.95,.1,.12,0,-.68,0);
  p.rotation.y=rand(1,2.5);p.rotation.x=.5;g.userData.pane=p;return g;},
 uplink(){const g=new THREE.Group();const m=skinMat(0x6a6a72);for(let i=0;i<3;i++){const l=boxIn(g,m,.12,1.6,.12,Math.cos(i*2.1)*.5,.75,Math.sin(i*2.1)*.5);l.rotation.z=Math.cos(i*2.1)*.3;l.rotation.x=-Math.sin(i*2.1)*.3;}
  boxIn(g,skinMat(0x3a3a42),.6,.5,.6,0,1.6,0);const dish=new THREE.Mesh(new THREE.ConeGeometry(.9,.4,10,1,true),new THREE.MeshLambertMaterial({color:0xc8c8d0,side:THREE.DoubleSide}));dish.position.set(0,2.2,0);dish.rotation.x=Math.PI*.8;g.add(dish);g.userData.dish=dish;
  const l=new THREE.Mesh(boxGeo,this.glow(0x3affc0));l.scale.setScalar(.14);l.position.set(0,2.9,0);g.add(l);g.userData.led=l;boxIn(g,m,.05,1,.05,0,2.6,0);return g;},
 console(){const g=this.terminal();g.scale.setScalar(1.4);return g;},
 lantern(){const g=new THREE.Group();const brass=skinMat(0xb08a3a);boxIn(g,skinMat(0x3a3028),1.6,.4,1.6,0,.2,0);
  for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])boxIn(g,brass,.14,1.9,.14,a*.55,1.3,b*.55);boxIn(g,brass,1.3,.16,1.3,0,2.3,0);boxIn(g,brass,.6,.4,.6,0,2.55,0);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.42),this.glow(0xffb040));core.position.y=1.3;g.add(core);g.userData.core=core;return g;},
 gate(){const g=new THREE.Group();const st=skinMat(G.L.block[2]);boxIn(g,st,.9,5.5,.9,-1.8,2.75,0);boxIn(g,st,.9,5.5,.9,1.8,2.75,0);boxIn(g,st,4.6,.8,1,0,5.6,0);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3,.12,6,20),this.glow(0xffcf3a));ring.position.set(0,2.8,0);g.add(ring);g.userData.ring=ring;return g;},
 beacon(){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(6.6,7,40),new THREE.MeshBasicMaterial({color:0x8ee05a,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;g.add(ring);
  boxIn(g,skinMat(0x4a4a52),.8,.8,.8,0,.4,0);const l=new THREE.Mesh(boxGeo,this.glow(0x8ee05a));l.scale.set(.3,1.2,.3);l.position.y=1.4;g.add(l);g.userData.led=l;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const b=new THREE.Mesh(boxGeo,this.glow(0x8ee05a));b.scale.set(.2,.3,.2);b.position.set(Math.cos(a)*6.8,.15,Math.sin(a)*6.8);g.add(b);}return g;},
 cage(kind){const g=new THREE.Group();const bar=mat(0x3a0a06,0xaa1a00);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;boxIn(g,bar,.1,2.4,.1,Math.cos(a)*.75,1.2,Math.sin(a)*.75);}
  boxIn(g,skinMat(0x2a1a14),1.8,.2,1.8,0,2.45,0);boxIn(g,skinMat(0x2a1a14),1.8,.15,1.8,0,.07,0);
  const h=makeHuman(kind==='marine'?{suit:0x3a4a5a,armor:0x5a6a7a}:kind==='rook'?{suit:0x5a5a3a,armor:0x7a7a52,visor:0xffae1f}:kind==='reyne'?{helmet:false,coat:0xd8d8d8,suit:0x3a3a42,armor:0xd8d8d8,skin:0xd8b8a0,hair:0x9a9aa0,glasses:true,gun:false}:{helmet:false,suit:0xd86a1a,armor:0xd86a1a,hat:0xe8b020,gun:false});
  h.body.position.y=-.3;h.armL.rotation.x=-2.6;h.armR.rotation.x=-2.6;h.legL.rotation.x=-1.2;h.legR.rotation.x=-1.2;g.add(h.g);g.userData.human=h;return g;},
 item(kind){const g=new THREE.Group();let m;if(kind==='shard')m=new THREE.Mesh(new THREE.OctahedronGeometry(.45),this.glow(0xc07aff));else if(kind==='lantern'){const l=this.lantern();l.scale.setScalar(.45);g.add(l);m=l.userData.core;}else m=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.6),this.glow(0x3affff));
  if(kind!=='lantern')g.add(m);g.userData.core=m;return g;},
 pedestal(){const g=new THREE.Group();boxIn(g,skinMat(0x4a4a52),1.4,1,1.4,0,.5,0);const r=new THREE.Mesh(new THREE.TorusGeometry(.6,.06,6,18),this.glow(0x3affff));r.rotation.x=Math.PI/2;r.position.y=1.05;g.add(r);g.userData.ring=r;return g;},
 zone(r){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(r-.25,r,36),new THREE.MeshBasicMaterial({color:0xff3a1a,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,14,8,1,true),new THREE.MeshBasicMaterial({color:0xff3a1a,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=7;g.add(beam);
  const fill=new THREE.Mesh(new THREE.CircleGeometry(r,36),new THREE.MeshBasicMaterial({color:0xffcf3a,transparent:true,opacity:.25,depthWrite:false}));fill.rotation.x=-Math.PI/2;fill.position.y=.05;fill.scale.setScalar(.01);g.add(fill);
  g.userData={ring,beam,fill};return g;},
 evac(){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,16,10,1,true),new THREE.MeshBasicMaterial({color:0x8ee05a,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));b.position.y=8;g.add(b);
  const r=new THREE.Mesh(new THREE.RingGeometry(1,1.3,24),new THREE.MeshBasicMaterial({color:0x8ee05a,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.position.y=.06;g.add(r);return g;},
 crawler(){const g=new THREE.Group();const hull=skinMat(0xb08a3a),dk=skinMat(0x3a3a3a);boxIn(g,hull,2.4,1.5,4.2,0,1.25,0);boxIn(g,skinMat(0x8a6a2a),2.2,.9,1.6,0,2.3,-.9);
  boxIn(g,mat(0x9ad8ff,0x2a4a5a),1.8,.4,.1,0,2.4,-.08);for(const sx of[-1,1])for(const sz of[-1.4,0,1.4]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.4,10),dk);w.rotation.z=Math.PI/2;w.position.set(sx*1.3,.55,sz);g.add(w);}
  const l=new THREE.Mesh(boxGeo,this.glow(0xffcf3a));l.scale.set(.3,.15,.1);l.position.set(-.7,1.6,2.12);g.add(l);const l2=l.clone();l2.position.x=.7;g.add(l2);return g;},
 nest(style){const g=new THREE.Group();let core;
  if(style==='altar'){const bone=skinMat(0xe0d6c0);boxIn(g,skinMat(0x3a2a40),2,.6,2,0,.3,0);for(let i=0;i<5;i++){const s=boxIn(g,bone,.25,1.4+i*.2,.25,Math.cos(i*1.26)*.7,1,Math.sin(i*1.26)*.7);s.rotation.z=Math.cos(i)*.3;}
   core=new THREE.Mesh(new THREE.OctahedronGeometry(.45),this.glow(0xb44aff));core.position.y=1.8;g.add(core);}
  else if(style==='egg'){for(let i=0;i<6;i++){const e=new THREE.Mesh(new THREE.SphereGeometry(rand(.4,.7),8,6),skinMat(0xe8e0c8));e.position.set(rand(-.8,.8),rand(.4,1.2),rand(-.8,.8));e.castShadow=true;g.add(e);}
   core=new THREE.Mesh(new THREE.SphereGeometry(.35,8,6),this.glow(0x9aff3a));core.position.y=.9;g.add(core);}
  else{const flesh=skinMat(0x8a2a34);const b=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),flesh);b.position.y=1;b.castShadow=true;g.add(b);for(let i=0;i<6;i++){const t=boxIn(g,skinMat(0x5a1018),.25,1.6,.25,Math.cos(i)*1,.6,Math.sin(i)*1);t.rotation.z=Math.cos(i)*.8;t.rotation.x=Math.sin(i)*.8;}
   core=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),this.glow(0xff3a6a));core.position.set(0,1.2,.85);g.add(core);g.userData.blob=b;}
  core.userData.keep=true;g.userData.core=core;return g;},
 dropship(){const g=new THREE.Group();const hull=skinMat(0x5a6a7a),dk=skinMat(0x2a3a4a);boxIn(g,hull,3.6,1.6,7,0,0,0);boxIn(g,dk,2.6,1.1,2.2,0,.7,2.6);boxIn(g,hull,9,.3,2,0,.4,-.8);
  for(const sx of[-4.2,4.2]){const e=boxIn(g,dk,1.1,1.1,2,sx,.2,-.8);const f=new THREE.Mesh(boxGeo,this.glow(0x3ac0ff));f.scale.set(.8,.8,.2);f.position.set(sx,.2,-1.85);g.add(f);}
  boxIn(g,mat(0x9ad8ff,0x3a5a7a),2.2,.5,.1,0,.9,3.72);return g;}
};

/* nests: destructible static targets that feed corruption */
function makeNest(x,z,style,hp){
  const g=Props.nest(style);const B={g,legL:dummyG(),legR:dummyG(),armL:dummyG(),armR:dummyG(),head:null};
  const[hb,hh]=hitPair(g,[[2.2,2.4,2.2],[0,1.2,0]],[[.1,.1,.1],[0,-5,0]]);B.hb=hb;B.hh=hh;
  const y=surfaceAt(x,z);g.position.set(x,y,z);scene.add(g);
  const e={type:'nest',T:{static:true,name:'Nest',size:1.6,score:60,coins:20,col:0x8a2a34},body:B,pos:new THREE.Vector3(x,y,z),hp,max:hp,cd:0,t:rand(0,5),hurt:0,boss:false,size:1.6,speed:0,dmg:0,vy:0,spawnT:0,spawnCd:rand(3,5),style};
  hb.userData.e=e;hh.userData.e=e;hitboxes.push(hb,hh);enemies.push(e);addHealthBar(e);if(e.bar){e.bar.bg.position.y=e.bar.fg.position.y=3.2;}
  return e;
}
const _killN=killEnemy;
killEnemy=function(e,head,over){
  if(e.type==='nest'){if(!enemies.includes(e))return;const p=e.pos.clone().setY(e.pos.y+1.2);SFX.explode();shake(.5);
    const col=e.style==='altar'?0xb44aff:e.style==='egg'?0x9aff3a:0xff3a6a;burst(p,col,40,9,1.4,1.1);burst(p,0x5a1018,16,6,1.2,1);lightFlash(p,col,4,24,.5);
    G.score+=60;G.earned+=20;spawnOrbs(p.x,p.y,p.z,6,4);feed(e.style==='altar'?'ALTAR DESTROYED':e.style==='egg'?'EGG SAC BURNED':'GROWTH BURNED');removeEnemy(e);return;}
  return _killN(e,head,over);
};

/* ---------- INTERACTION (stand still in range to make progress) ---------- */
const ACT={label:'',v:0,on:false};
function interact(list,r,time,dt,verb){
  let best=null,bd=r;for(const o of list){if(o.done)continue;const d=Math.hypot(P.pos.x-o.pos.x,P.pos.z-o.pos.z);if(d<bd&&Math.abs(P.pos.y-o.pos.y)<2.6){bd=d;best=o;}}
  if(!best)return null;
  const contested=enemies.some(e=>!e.T.static&&e.hp>0&&Math.hypot(e.pos.x-best.pos.x,e.pos.z-best.pos.z)<3.2);
  if(!contested){best.prog=(best.prog||0)+dt/time;if(Math.random()<.25)tone('square',400+best.prog*900,400+best.prog*900,.03,.03);}
  ACT.on=true;ACT.v=Math.min(1,best.prog||0);ACT.label=contested?'CONTESTED · CLEAR THE AREA':verb;
  if(best.prog>=1){best.done=true;tone('sine',660,1320,.25,.18);setTimeout(()=>tone('sine',990,1980,.3,.15),110);}
  return best;
}

/* ---------- ROOM POINTS ---------- */
function roomDoor(R,dir){ // dir -1: the way you came in, +1: the way onward
  let best=null;for(const d of R.doors){if(d.locked)continue;const o=grid.rooms[d.other];if(!o||o.type==='vault'||o.type==='trial')continue;const ord=o.order||0;
    if(dir<0?(ord<R.order&&(!best||ord>best.o)):(ord>R.order&&(!best||ord<best.o)))best={d,o:ord};}
  return best&&best.d;}
function inside(R,d,k){const v=d.horiz?V3(Math.sign(R.cx-d.x)*k,0,0):V3(0,0,Math.sign(R.cz-d.z)*k);const p=V3(d.x,0,d.z).add(v);p.y=surfaceAt(p.x,p.z);return p;}
function entryPoint(R){const d=roomDoor(R,-1);return d?inside(R,d,5.6):V3(R.cx,0,R.cz);}
function exitPoint(R){const d=roomDoor(R,1);if(d)return inside(R,d,4.8);const en=entryPoint(R);let far=null,fd=0;for(const[i,j]of openCells((t,i,j)=>t===T_FLOOR&&inRoom(R,i,j,1))){const dd=Math.hypot(cx(i)-en.x,cx(j)-en.z);if(dd>fd){fd=dd;far=V3(cx(i),0,cx(j));}}return far||V3(R.cx,0,R.cz);}
function centerPoint(R){let best=null,bd=1e9;for(const[i,j]of openCells((t,i,j)=>t===T_FLOOR&&inRoom(R,i,j,2))){const d=Math.hypot(cx(i)-R.cx,cx(j)-R.cz);if(d<bd){bd=d;best=V3(cx(i),0,cx(j));}}return best||V3(R.cx,0,R.cz);}
function cellsIn(R,n,minP,apart){return farCells(n,minP,apart,[T_FLOOR],R).map(([i,j])=>V3(cx(i),0,cx(j)));}

/* ---------- MISSION KINDS ---------- */
const MK={};
MK.rescue={name:'RESCUE',sub:'Free the captives',
 start(R,E,sp){const n=sp.n||3;E.caps=[];E.runners=[];E.saved=0;E.lost=0;E.need=sp.need||Math.max(1,n-1);
  E.evac=(sp.recruit||sp.vip)?null:entryPoint(R);if(E.evac){const ev=wadd(Props.evac());ev.position.copy(E.evac);E.objs.push(ev);}
  const pts=cellsIn(R,n,7,7);pts.forEach((p,k)=>{const kind=sp.recruit?(k===0?'rook':'marine'):sp.vip||'survivor';const g=wadd(Props.cage(kind));g.position.set(p.x,surfaceAt(p.x,p.z),p.z);E.objs.push(g);
    E.caps.push({pos:V3(p.x,g.position.y,p.z),g,kind,prog:0});});
  E.spawnT=2;},
 tick(R,E,dt){trickle(E,dt,2.6-epN()*.2,5+epN()*2);
  interact(E.caps,2.4,2,dt,'FREEING');
  for(const c of E.caps){if(c.done&&!c.handled){c.handled=true;burst(c.pos.clone().setY(c.pos.y+1.2),0xff3a1a,24,6,1,.8);c.g.children.slice().forEach(o=>{if(o!==c.g.userData.human.g)c.g.remove(o);});
    const h=c.g.userData.human;h.body.position.y=0;h.armL.rotation.x=h.armR.rotation.x=0;h.legL.rotation.x=h.legR.rotation.x=0;
    if(c.kind==='rook'||c.kind==='marine'){world.remove(c.g);Allies.add(c.kind==='rook'?'ROOK':ASH_NAMES[Allies.list.filter(a=>!a.rook).length%3],c.pos.x,c.pos.z,{rook:c.kind==='rook'});G.squad=true;}
    else if(c.kind==='reyne'){c.vip=true;h.g.rotation.y=Math.atan2(P.pos.x-c.pos.x,P.pos.z-c.pos.z);}
    else{Comms.say('survivor',STORY.chatter.survivorFree[Math.floor(Math.random()*STORY.chatter.survivorFree.length)],{low:true,dur:2.2});
      const r={h,pos:c.pos.clone(),path:gridPath(c.pos.x,c.pos.z,E.evac.x,E.evac.z),wp:0,faceA:0,g:c.g};
      r.soft=Softs.add({kind:'survivor',pos:r.pos,hp:130*(1+epN()*.25),max:130,r:.6,attract:.6,maxAggro:3,onDown:()=>{r.dead=true;}});E.runners.push(r);}}}
  for(let n=E.runners.length-1;n>=0;n--){const r=E.runners[n];
    if(r.dead){E.lost++;feed('A SURVIVOR WAS KILLED');burst(r.pos.clone().setY(1),0x8a0606,16,5,1,.7);world.remove(r.g);Softs.remove(r.soft);E.runners.splice(n,1);continue;}
    r.moving=false;const done=walkPath(r,dt,5.2);animHuman(r.h,r,dt);r.g.position.set(0,0,0);r.h.g.position.copy(r.pos);
    if(done||Math.hypot(r.pos.x-E.evac.x,r.pos.z-E.evac.z)<1.4){E.saved++;ring(r.pos.clone(),0x8ee05a,3,.6);burst(r.pos.clone().setY(1.5),0x8ee05a,20,5,1,.8);tone('sine',800,1600,.3,.12);world.remove(r.g);Softs.remove(r.soft);E.runners.splice(n,1);
      G.rescued=(G.rescued||0)+1;Comms.say('vesta',STORY.chatter.survivorSafe[Math.floor(Math.random()*3)],{low:true,dur:1.8});}}
  if(E.caps.length-E.lost<E.need){missionFail('Too many captives were killed.');return false;}
  return E.caps.every(c=>c.handled)&&!E.runners.length;},
 kill(R,E){for(const c of E.caps)if(c.vip&&c.g.parent)c.g.parent.remove(c.g);},
 text(R,E){return 'FREE THE CAPTIVES · '+E.caps.filter(c=>c.handled).length+'/'+E.caps.length+(E.runners.length?' · PROTECT THE RUNNERS':'');},
 marks(R,E){const m=E.caps.filter(c=>!c.done).map(c=>({pos:c.pos,label:'FREE',col:'#ffcf3a',near:2.5}));for(const r of E.runners)m.push({pos:r.pos,label:'PROTECT',col:'#8ee05a',h:2.2});if(E.evac&&E.runners.length)m.push({pos:E.evac,label:'EVAC',col:'#8ee05a'});return m;}};

MK.escort={name:'ESCORT',sub:'Keep them alive. Stay close.',
 start(R,E,sp){const a=entryPoint(R),b=exitPoint(R);const crawler=sp.npc==='crawler';
  const npc={crawler,g:crawler?Props.crawler():null,h:null,pos:V3(a.x,surfaceAt(a.x,a.z),a.z),path:gridPath(a.x,a.z,b.x,b.z,crawler),ghost:crawler,wp:0,faceA:0,rad:crawler?1.1:.35,goal:b,total:1};
  if(!crawler){const H=makeHuman({helmet:false,coat:0xd8d8d8,suit:0x3a3a42,armor:0xd8d8d8,skin:0xd8b8a0,hair:0x9a9aa0,glasses:true,gun:false});npc.g=H.g;npc.h=H;}
  if(crawler){clearPath(npc.path);npc.pos.y=0;}wadd(npc.g);npc.g.position.copy(npc.pos);E.objs.push(npc.g);E.npc=npc;npc.total=Math.max(1,npc.path.reduce((s,p,i,arr)=>s+(i?p.distanceTo(arr[i-1]):p.distanceTo(npc.pos)),0));
  const hp=(crawler?1100:520)*(1+epN()*.3);npc.soft=Softs.add({kind:'escort',pos:npc.pos,hp,max:hp,r:crawler?1.6:.6,h:crawler?2.8:1.9,attract:.8,maxAggro:6,onDown:()=>{npc.dead=true;}});
  E.spawnT=2;},
 tick(R,E,dt){const n=E.npc;trickle(E,dt,1.9-epN()*.15,7+epN()*2,n.pos);
  if(n.dead){burst(n.pos.clone().setY(1.2),0xff6a00,40,9,1.6,1);SFX.explode();missionFail(n.crawler?'Crawler Nine was destroyed.':'Dr. Reyne was killed.');return false;}
  const near=Math.hypot(P.pos.x-n.pos.x,P.pos.z-n.pos.z)<(n.crawler?12:9);n.moving=false;let done=false;
  const prog=1-this.left(n)/n.total;
  if(!E.stalled&&prog>.4){E.stalled=true;E.stallT=n.crawler?16:14;E.spawnT=0;banner(n.crawler?'DRIVE STALLED':'REYNE IS PINNED','Hold them off',2);
    Comms.say(n.crawler?'vesta':'reyne',n.crawler?'The crawler\'s drive has seized. Rebooting. Keep them off the hull!':'I can\'t cross that! Clear them out, please!',{now:true,dur:3});}
  if(E.stallT>0){E.stallT-=dt;trickle(E,dt,1.1-epN()*.1,9+epN()*2,n.pos);if(E.stallT<=0){feed(n.crawler?'DRIVE RESTARTED':'REYNE IS MOVING');tone('sine',300,900,.4,.2);}}
  else if(near){done=walkPath(n,dt,n.crawler?1.7:2.6);E.waitT=0;}else{E.waitT=(E.waitT||0)+dt;if(E.waitT>6){E.waitT=-8;Comms.say(n.crawler?'survivor':'reyne',n.crawler?'Warden! We can\'t move without you!':'Warden, please! I can\'t do this alone!',{low:true,dur:2.2});}}
  if(n.crawler){n.g.position.copy(n.pos);let da=n.faceA-n.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));n.g.rotation.y+=da*Math.min(1,dt*3);if(n.moving&&Math.random()<.3)burst(n.pos.clone().setY(.3),0x777766,1,1.5,.8,.4);
    if(n.soft.hurtT>0)n.soft.hurtT-=dt;}
  else animHuman(n.h,n,dt);
  return done||Math.hypot(n.pos.x-n.goal.x,n.pos.z-n.goal.z)<1.2;},
 left(n){return n.path.slice(n.wp).reduce((s,p,i,a)=>s+(i?p.distanceTo(a[i-1]):p.distanceTo(n.pos)),0);},
 text(R,E){const n=E.npc;if(E.stallT>0)return (n.crawler?'CRAWLER STALLED':'REYNE PINNED')+' · HOLD FOR '+Math.ceil(E.stallT)+'s';
  const near=Math.hypot(P.pos.x-n.pos.x,P.pos.z-n.pos.z)<(n.crawler?12:9);return 'ESCORT '+(n.crawler?'CRAWLER NINE':'DR. REYNE')+' · '+Math.round((1-this.left(n)/n.total)*100)+'%'+(near?'':' · STAY CLOSE');},
 bar(R,E){const s=E.npc.soft;return{label:E.npc.crawler?'CRAWLER HULL':'REYNE',v:s.hp/s.max,col:'#8ee05a'};},
 marks(R,E){return[{pos:E.npc.pos,label:'ESCORT',col:'#8ee05a',h:E.npc.crawler?3.2:2.2},{pos:E.npc.goal,label:'DESTINATION',col:'#ffcf3a'}];}};

const ACT_STYLE={terminal:['BYPASS THE CONSOLES','BYPASSING',3],valve:['OPEN THE COOLANT VALVES','TURNING VALVE',3],charge:['PLANT THE CHARGES','PLANTING CHARGE',2.6],mirror:['ALIGN THE MIRROR ARRAYS','ALIGNING',3.6]};
MK.activate={name:'SABOTAGE',sub:'Hold position at each objective',
 start(R,E,sp){const st=sp.style||'terminal';E.st=st;E.list=cellsIn(R,sp.n||3,6,9).map(p=>{const g=wadd(Props[st]());const y=surfaceAt(p.x,p.z);g.position.set(p.x,y,p.z);g.rotation.y=Math.atan2(R.cx-p.x,R.cz-p.z);E.objs.push(g);return{pos:V3(p.x,y,p.z),g,prog:0};});
  ENC.activate=ACT_STYLE[st][0].split(' ')[0];E.spawnT=1.5;},
 tick(R,E,dt){const sp=E.spec,st=E.st;trickle(E,dt,2.3-epN()*.18,6+epN()*2);
  interact(E.list,2.6,(ACT_STYLE[st][2])*(sp.t?sp.t/3:1),dt,ACT_STYLE[st][1]);
  for(const o of E.list){const u=o.g.userData;
    if(st==='valve'&&u.wheel){u.wheel.rotation.z+=(o.done?0:(o.prog||0)*.2)+(o.done?0:0);if(o.done&&!o.fx){o.fx=1;u.wheel.material=mat(0x3aff6a,0x1a8a2a);}
      if(o.done&&Math.random()<.5)burst(o.pos.clone().setY(o.pos.y+3.2),0xd8f0ff,1,3,1.2,.8);}
    if(st==='terminal'&&o.done&&!o.fx){o.fx=1;u.screen.material=Props.glow(0x3aff6a);}
    if(st==='mirror'&&u.pane){if(!o.done&&o.prog>0)u.pane.rotation.y+=dt*.6;if(o.done&&!o.fx){o.fx=1;u.pane.children[0].material=new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x8ad8ff});}}
    if(st==='charge'&&u.charge){u.charge.visible=o.done;if(o.done)u.led.visible=Math.floor(G.time*(E.boomT?10:3))%2===0;}}
  if(!E.list.every(o=>o.done))return false;
  if(sp.boom){if(E.boomT==null){E.boomT=4;banner('CHARGES ARMED','Get clear!',2);}E.boomT-=dt;if(Math.floor(E.boomT*4)!==Math.floor((E.boomT+dt)*4))tone('square',1200,1200,.05,.12);
    if(E.boomT>0)return false;if(!E.boomed){E.boomed=true;E.list.forEach((o,k)=>setTimeout(()=>{if(G.state!=='play')return;explode(o.pos.clone().setY(o.pos.y+2),6.5,500,0xff8a1a);world.remove(o.g);},k*260));shake(1.2);}return true;}
  return true;},
 text(R,E){return ACT_STYLE[E.st][0]+' · '+E.list.filter(o=>o.done).length+'/'+E.list.length+(E.boomT>0?' · DETONATION '+Math.ceil(E.boomT):'');},
 marks(R,E){return E.list.filter(o=>!o.done).map(o=>({pos:o.pos,label:E.st==='charge'?'PLANT':E.st==='valve'?'VALVE':E.st==='mirror'?'ALIGN':'CONSOLE',col:'#ffcf3a',near:2.6,h:2.6}));}};

const DEF_OBJ={console:['LIFT CONSOLE',900],uplink:['UPLINK',1000],reyne:['DR. REYNE',760],lantern:['THE LANTERN',1400],gate:['GATE MECHANISM',1500],beacon:['LANDING BEACON',1200]};
MK.defend={name:'DEFEND',sub:'Protect the objective',
 start(R,E,sp){const p=centerPoint(R);const y=surfaceAt(p.x,p.z);let g;
  if(sp.obj==='reyne'){const H=makeHuman({helmet:false,coat:0xd8d8d8,suit:0x3a3a42,armor:0xd8d8d8,skin:0xd8b8a0,hair:0x9a9aa0,glasses:true,gun:false});g=new THREE.Group();g.add(H.g);H.body.position.y=-.35;H.armL.rotation.x=H.armR.rotation.x=-1.3;
    const t=Props.terminal();t.position.set(0,0,.9);t.rotation.y=Math.PI;g.add(t);}
  else g=Props[sp.obj]?Props[sp.obj]():Props.uplink();
  g.position.set(p.x,y,p.z);wadd(g);E.objs.push(g);E.obj={pos:V3(p.x,y,p.z),g};const d=DEF_OBJ[sp.obj]||DEF_OBJ.uplink;E.oname=d[0];
  const hp=d[1]*(1+epN()*.3);E.soft=Softs.add({kind:'object',pos:E.obj.pos,hp,max:hp,r:sp.obj==='gate'?2.4:1.4,h:3,attract:.75,maxAggro:7,armor:sp.obj==='lantern'?.8:1,onDown:()=>{E.dead=true;}});
  E.left=sp.t||45;E.total=E.left;E.zone=!!sp.zone||E.kind==='holdout';E.zr=7;if(E.kind==='holdout'&&sp.obj!=='beacon'){const z=wadd(Props.beacon());z.position.copy(E.obj.pos);z.userData.led.visible=false;E.objs.push(z);}
  E.spawnT=1;},
 tick(R,E,dt){const sp=E.spec;
  if(E.dead){burst(E.obj.pos.clone().setY(E.obj.pos.y+1.5),0xff6a00,50,10,1.6,1.2);SFX.explode();missionFail(E.oname+' was destroyed.');return false;}
  const u=E.obj.g.userData;if(u.dish)u.dish.rotation.z+=dt*.8;if(u.led)u.led.visible=Math.floor(G.time*3)%2===0;if(u.core){u.core.rotation.y+=dt*2;u.core.scale.setScalar(1+Math.sin(G.time*6)*.12);}if(u.ring)u.ring.rotation.z+=dt*(1+(1-E.left/E.total)*4);
  if(sp.obj==='reyne'&&Math.random()<.2)burst(E.obj.pos.clone().add(V3(0,1.2,.6)),0x9ad8ff,1,2,.5,.3);
  if(E.ship)return this.shipTick(R,E,dt);
  trickle(E,dt,(1.45-epN()*.12)*(E.left<E.total*.35?.75:1),9+epN()*2,E.obj.pos);
  const inZ=Math.hypot(P.pos.x-E.obj.pos.x,P.pos.z-E.obj.pos.z)<E.zr;E.away=E.zone&&!inZ;
  if(!E.away)E.left-=dt;
  if(!E.midSaid&&E.left<E.total/2){E.midSaid=true;if(sp.say&&sp.say.mid)Comms.seq(sp.say.mid);else if(G.squad)Allies.chat('marineContact',true);}
  if(E.left<=0){if(sp.dropship){E.ship=this.ship(E);return false;}return true;}
  return false;},
 ship(E){const g=Props.dropship();const p=E.obj.pos;g.position.set(p.x,40,p.z-30);g.rotation.y=0;wadd(g);E.objs.push(g);banner('KESTREL INBOUND','',2);Comms.say('okafor','Kestrel on final. Covering fire coming in!',{dur:2.5});SFX.boss();return{g,t:0};},
 shipTick(R,E,dt){const s=E.ship;s.t+=dt;const p=E.obj.pos;const k=Math.min(1,s.t/4);s.g.position.set(p.x,p.y+3.5+36*(1-ease(k)),p.z-30*(1-ease(k)));s.g.rotation.x=(1-k)*.3;
  if(s.t>1.5&&Math.random()<.4){const e=enemies.filter(e=>!e.T.static&&e.hp>0)[0];if(e){tracer(s.g.position.clone(),e.pos.clone().setY(1),0x3ac0ff,.08,.08);allyDamage(e,80,e.pos.clone().setY(1));}}
  if(s.t>5.5){for(const e of enemies.slice())if(!e.T.static&&!e.keyBearer)killEnemy(e,false,true);return true;}return false;},
 kill(R,E){if(E.soft)Softs.remove(E.soft);
  if(E.spec.ashStays){G.ashGone=true;const back=entryPoint(R);for(const a of Allies.list){a.state='leave';a.soft.invuln=true;a.path=gridPath(a.pos.x,a.pos.z,back.x,back.z);a.wp=0;}E.leavers=Allies.list.slice();
    const tick=dt=>{for(const a of E.leavers){if(!a.h.g.parent)continue;a.moving=false;if(walkPath(a,dt,5)){scene.remove(a.h.g);Softs.remove(a.soft);}animHuman(a.h,a,dt);}if(E.leavers.every(a=>!a.h.g.parent)){Allies.list.length=0;return false;}return true;};
    addFx({kill(){},tick});}},
 text(R,E){if(E.ship)return 'EXTRACTION · KESTREL LANDING';return(E.kind==='holdout'?'HOLD THE ZONE':'DEFEND '+E.oname)+' · '+Math.ceil(Math.max(0,E.left))+'s'+(E.away?' · RETURN TO THE ZONE!':'');},
 bar(R,E){return{label:E.oname,v:E.soft.hp/E.soft.max,col:'#3ac0ff'};},
 marks(R,E){return[{pos:E.obj.pos,label:E.kind==='holdout'?'HOLD':'DEFEND',col:'#3ac0ff',h:3.4,pulse:E.soft.lastHit&&G.time-E.soft.lastHit<.5}];}};
MK.holdout=Object.assign({},MK.defend,{name:'HOLD OUT',sub:'Stay inside the ring'});

MK.capture={name:'CAPTURE',sub:'Stand in each zone until it is yours',
 start(R,E,sp){E.zones=farCells(sp.n||2,7,9,[T_FLOOR],R).map(([i,j])=>{const x=cx(i),z=cx(j),y=surfaceAt(x,z);const g=wadd(Props.zone(3));g.position.set(x,y,z);E.objs.push(g);return{pos:V3(x,y,z),g,prog:0,r:3};});E.spawnT=1.5;},
 tick(R,E,dt){const sp=E.spec;const open=E.zones.filter(z=>!z.done);trickle(E,dt,2.1-epN()*.15,7+epN()*2,open[0]&&open[0].pos);
  for(const z of E.zones){const u=z.g.userData;u.beam.rotation.y+=dt;if(z.done)continue;
    const inside=Math.hypot(P.pos.x-z.pos.x,P.pos.z-z.pos.z)<z.r&&Math.abs(P.pos.y-z.pos.y)<2.5;const cont=enemies.some(e=>!e.T.static&&e.hp>0&&Math.hypot(e.pos.x-z.pos.x,e.pos.z-z.pos.z)<z.r+.5);
    if(inside){ACT.on=true;ACT.label=cont?'CONTESTED · CLEAR THE ZONE':'CAPTURING';if(!cont)z.prog+=dt/(sp.t||7);ACT.v=z.prog;}
    u.fill.scale.setScalar(Math.max(.01,z.prog));const col=cont&&inside?0xff3a1a:0xffcf3a;u.ring.material.color.set(z.prog>0?col:0xff3a1a);
    if(z.prog>=1){z.done=true;u.ring.material.color.set(0x8ee05a);u.beam.material.color.set(0x8ee05a);u.fill.material.color.set(0x8ee05a);ring(z.pos.clone(),0x8ee05a,5,.6);tone('sine',523,1046,.3,.2);setTimeout(()=>tone('sine',784,1568,.4,.2),140);feed('ZONE CAPTURED');}}
  return E.zones.every(z=>z.done);},
 text(R,E){return 'CAPTURE THE ZONES · '+E.zones.filter(z=>z.done).length+'/'+E.zones.length;},
 marks(R,E){return E.zones.filter(z=>!z.done).map(z=>({pos:z.pos,label:'CAPTURE',col:'#ffcf3a',near:3,h:3}));}};

MK.carry={name:'RETRIEVE',sub:'Carry it home. Don\'t drop it.',
 start(R,E,sp){const goal=exitPoint(R);const far=farCells(1,12,0,[T_FLOOR],R).map(([i,j])=>V3(cx(i),0,cx(j)))[0]||centerPoint(R);
  E.item=wadd(Props.item(sp.item||'core'));E.item.position.set(far.x,surfaceAt(far.x,far.z)+1,far.z);E.objs.push(E.item);E.ipos=E.item.position.clone();
  E.ped=wadd(Props.pedestal());E.ped.position.set(goal.x,surfaceAt(goal.x,goal.z),goal.z);E.objs.push(E.ped);E.goal=E.ped.position.clone();E.held=false;E.iname=sp.item==='shard'?'VOID SHARD':sp.item==='lantern'?'LANTERN':'DATA CORE';E.spawnT=1.5;},
 tick(R,E,dt){trickle(E,dt,1.8-epN()*.15,8+epN()*2,E.held?P.pos:E.ipos);
  const core=E.item.userData.core;if(core){core.rotation.y+=dt*2;core.rotation.x+=dt;}
  if(!E.held){E.item.visible=true;E.item.position.y=E.ipos.y+Math.sin(G.time*3)*.15;
    if(Math.hypot(P.pos.x-E.ipos.x,P.pos.z-E.ipos.z)<1.7&&Math.abs(P.pos.y+1-E.ipos.y)<2){E.held=true;G.carrying=E;P._spdBase=P.spdMul||1;P.spdMul=P._spdBase*.7;E.item.visible=false;feed(E.iname+' ACQUIRED');tone('sine',440,880,.2,.15);}}
  else{if(Math.random()<.3)burst(P.pos.clone().setY(P.pos.y+1.1),0x3affff,1,1,.5,.3);
    if(Math.hypot(P.pos.x-E.goal.x,P.pos.z-E.goal.z)<2.6){E.held=false;G.carrying=null;P.spdMul=P._spdBase||1;E.item.visible=true;E.item.position.copy(E.goal).setY(E.goal.y+1.6);E.ipos=E.item.position.clone();
      ring(E.goal.clone(),0x3affff,5,.7);lightFlash(E.goal.clone().setY(2),0x3affff,4,20,.5);SFX.wave();return true;}}
  return false;},
 drop(E){if(!E||!E.held)return;E.held=false;G.carrying=null;P.spdMul=P._spdBase||1;const y=surfaceAt(P.pos.x,P.pos.z)+1;E.ipos=V3(P.pos.x,y,P.pos.z);E.item.position.copy(E.ipos);E.item.visible=true;banner('DROPPED THE '+E.iname,'Pick it back up',1.4);tone('sawtooth',300,100,.3,.2);},
 kill(R,E){if(G.carrying===E){G.carrying=null;P.spdMul=P._spdBase||1;}},
 text(R,E){return E.held?'CARRY THE '+E.iname+' TO THE RECEPTACLE · '+Math.round(Math.hypot(P.pos.x-E.goal.x,P.pos.z-E.goal.z))+'m':'RECOVER THE '+E.iname;},
 marks(R,E){return E.held?[{pos:E.goal,label:'DELIVER',col:'#3affff'}]:[{pos:E.ipos,label:E.iname,col:'#3affff',h:1}];}};
const _hpCarry=hurtPlayer;hurtPlayer=function(d,ia){const hp=P.hp;_hpCarry(d,ia);if(G.carrying&&hp-P.hp>=18&&G.state==='play')MK.carry.drop(G.carrying);};
const _dashCarry=doDash;doDash=function(){if(G.carrying){if(!P._dashMsg||G.time-P._dashMsg>2){P._dashMsg=G.time;feed('TOO HEAVY TO DASH');}return;}_dashCarry();};

const LT_TAUNTS=['YOU WILL NOT LEAVE THIS PLACE, LITTLE LIGHT.','I HAVE KILLED A HUNDRED OF YOUR KIND.','COME. LET US SEE WHAT YOU ARE MADE OF.','THE WARLORD WILL DRINK FROM YOUR SKULL.','I SMELL THE STOLEN HEART IN YOU.'];
MK.assassinate={name:'ASSASSINATE',sub:'Hunt the named lieutenants',
 start(R,E,sp){E.names=(sp.names||['THE FLAYED ONE','THE HOLLOW-EYED']).slice(0,sp.n||2);E.lts=[];E.next=1.6;E.spawnT=3;},
 spawnLt(E,name){const[x,z]=spawnPoint();G.forceElite=1;const e=spawnEnemy(pickType(true),x,z);G.forceElite=0;e.lt=true;e.ltName=name;e.hp*=2.6;e.max*=2.6;e.dmg*=1.25;e.speed*=1.08;
  const crown=new THREE.Mesh(new THREE.TorusGeometry(.42*e.size,.07,5,6),mat(0xff2a1a,0xff2a1a));crown.rotation.x=Math.PI/2;crown.position.y=(e.T.flying?3.9:2.25)*e.size;crown.userData.keep=true;e.body.g.add(crown);e.body.crown=crown;
  if(e.bar){e.bar.fg.material.color.set(0xff2a1a);}
  banner(name,'LIEUTENANT',1.8);Comms.say('demon',name+': '+LT_TAUNTS[Math.floor(Math.random()*LT_TAUNTS.length)],{dur:3});E.lts.push(e);SFX.growl();return e;},
 tick(R,E,dt){trickle(E,dt,2.6-epN()*.2,5+epN());E.next-=dt;
  const alive=E.lts.filter(e=>enemies.includes(e)&&e.hp>0);for(const e of alive)if(e.body.crown)e.body.crown.rotation.z+=dt*2;
  if(E.names.length&&(E.next<=0&&alive.length<2||alive.length===0&&E.next<=0)){this.spawnLt(E,E.names.shift());E.next=alive.length?14:6;}
  for(const e of E.lts){if(!e._dead&&!enemies.includes(e)){e._dead=true;feed('LIEUTENANT SLAIN: '+e.ltName);dropPickup(e.pos.x,e.pos.z,'hp');}}
  return !E.names.length&&E.lts.every(e=>e._dead);},
 text(R,E){const tot=E.lts.length+E.names.length;return 'KILL THE LIEUTENANTS · '+E.lts.filter(e=>e._dead).length+'/'+tot;},
 marks(R,E){return E.lts.filter(e=>!e._dead).map(e=>({pos:e.pos,label:e.ltName,col:'#ff3a1a',h:(e.T.flying?4.4:2.8)*e.size}));}};

MK.purify={name:'PURGE THE ROT',sub:'Destroy every nest before the corruption takes you',
 start(R,E,sp){E.cor=0;E.nests=cellsIn(R,sp.n||3,7,8).map(p=>makeNest(p.x,p.z,sp.nest||'growth',Math.round(520*DIFF().hp*(1+epN()*.35))));E.dotT=0;E.spawnT=3;},
 tick(R,E,dt){const sp=E.spec;const alive=E.nests.filter(n=>enemies.includes(n));
  E.cor=Math.min(100,E.cor+dt*(.7+alive.length*.5)*(sp.rate||1)*(1+epN()*.12));
  for(const n of E.nests){if(!n._dead&&!enemies.includes(n)){n._dead=true;E.cor=Math.max(0,E.cor-25);acidPool(n.pos.clone(),4,2.2,10);}}
  for(const n of alive){const u=n.body.g.userData;const k=1+Math.sin(G.time*3+n.t)*.06;n.body.g.scale.set(k,1/k,k);if(u.core)u.core.scale.setScalar(1+Math.sin(G.time*6+n.t)*.25);
    n.spawnCd-=dt;if(n.spawnCd<=0&&liveCount()<6+epN()*2){n.spawnCd=rand(5,7.5)-epN()*.4;const a=Math.random()*6.28;const x=n.pos.x+Math.cos(a)*2.5,z=n.pos.z+Math.sin(a)*2.5;spawnEnemy(openAt(x,z)?(Math.random()<.4&&G.L.pool.includes('swarmling')?'swarmling':pickType()):pickType(),openAt(x,z)?x:n.pos.x+.1,openAt(x,z)?z:n.pos.z+.1);}}
  if(E.cor>=100){E.dotT-=dt;if(E.dotT<=0){E.dotT=.5;hurtPlayer(4,true);if(!E.warned){E.warned=true;Comms.say('vesta','Corruption saturation. It is eating through the suit. Burn the nests!',{now:true,dur:3});}}}
  trickle(E,dt,3.2,4+epN());
  return !alive.length;},
 kill(R,E){$('corr').style.opacity=0;},
 text(R,E){return 'DESTROY THE NESTS · '+E.nests.filter(n=>n._dead).length+'/'+E.nests.length+' · CORRUPTION '+Math.floor(E.cor)+'%';},
 bar(R,E){return{label:'CORRUPTION',v:E.cor/100,col:'#b44aff'};},
 marks(R,E){return E.nests.filter(n=>!n._dead).map(n=>({pos:n.pos,label:'NEST',col:'#b44aff',h:3.4}));}};
frameHooks.push(()=>{const R=curRoomObj();const E=R&&R.state==='active'&&R.es;$('corr').style.opacity=E&&E.kind==='purify'?Math.min(.85,E.cor/100*.85):0;});

MK.darkness={name:'BLACKOUT',sub:'Something cut the lights',
 start(R,E,sp){setDark(true,true);const n=6+epN()*2+Math.floor(G.levelIdx/4);E.queue=Array.from({length:n},(_,k)=>k%3===0?'stalker':pickType());E.spawnT=1.2;E.flick=0;SFX.growl();},
 tick(R,E,dt){spawnFromQueue(E,7+epN()*2);E.flick-=dt;if(E.flick<=0){E.flick=rand(2,5);lightFlash(V3(R.cx,6,R.cz),G.L.torch,3,30,.12);tone('',4000,0,.08,.05,true);}
  return !E.queue.length&&liveCount()===0;},
 kill(R,E){if(!G.darkLevel)setDark(false);},
 text(R,E){return 'SURVIVE THE BLACKOUT · '+(E.queue.length+liveCount())+' HOSTILES';}};

MK.gauntlet={name:'GAUNTLET',sub:'Reach the far gate alive',
 start(R,E,sp){E.goal=exitPoint(R);const z=wadd(Props.evac());z.position.copy(E.goal);E.objs.push(z);E.metT=1;E.spawnT=2;},
 tick(R,E,dt){trickle(E,dt,2.4-epN()*.2,6+epN());E.metT-=dt;
  if(E.metT<=0){E.metT=rand(.35,.6)-epN()*.04;const lead=Math.random()<.5;const x=lead?P.pos.x+P.vel.x*.9+rand(-1.5,1.5):P.pos.x+rand(-9,9),z=lead?P.pos.z+P.vel.z*.9+rand(-1.5,1.5):P.pos.z+rand(-9,9);
    if(inRoom(R,ci(x),ci(z),0))groundWarn(x,z,2.2,1.05,G.L.torch,(x,y,z)=>meteorStrike(x,y,z,16+epN()*3));}
  return Math.hypot(P.pos.x-E.goal.x,P.pos.z-E.goal.z)<2.6;},
 text(R,E){return 'RUN THE GAUNTLET · '+Math.round(Math.hypot(P.pos.x-E.goal.x,P.pos.z-E.goal.z))+'m TO THE GATE';},
 marks(R,E){return[{pos:E.goal,label:'GATE',col:'#8ee05a'}];}};

/* ---------- DARKNESS / FLASHLIGHT ---------- */
const flashlight=new THREE.SpotLight(0xfff0d0,0,36,.52,.5,1.1);camera.add(flashlight);flashlight.position.set(.2,-.15,0);flashlight.target.position.set(0,-.2,-1);camera.add(flashlight.target);
function setDark(on,roomOnly){G.dark=on;if(!roomOnly&&!on)G.darkLevel=false;flashlight.intensity=on?2.6:0;hemi.intensity=on?.07:.55;sun.intensity=on?.05:.75;
  if(scene.fog){scene.fog.near=on?6:(G.fogN||16);scene.fog.far=on?44:(G.fogF||78);}lightRoom(curRoomObj());if(on)banner('LIGHTS OUT','',1.4);}
const _lightRoomD=lightRoom;lightRoom=function(r){_lightRoomD(r);if(G.dark)roomLights.forEach(l=>l.intensity*=.1);};
frameHooks.push(dt=>{if(G.dark&&Math.random()<.004)flashlight.intensity=rand(.4,1.2);else if(G.dark)flashlight.intensity+=(2.6-flashlight.intensity)*Math.min(1,dt*8);});

/* ---------- ROOM WIRING ---------- */
function keyBearerTick(R,E){if(E.keyBearer&&E.t>1.5){E.keyBearer=false;G.forceElite=1;const[x,z]=spawnPoint();const types=G.L.pool.filter(t=>!ENEMY[t].swarm);const e=spawnEnemy(types[Math.floor(Math.random()*types.length)],x,z);G.forceElite=0;
  e.keyBearer=true;const k=new THREE.Mesh(boxGeo,mat(0xffcf3a,0xffaa00));k.scale.set(.35,.35,.35);k.position.y=(e.T.flying?3.8:2.5)*e.size;k.userData.keep=true;e.body.g.add(k);e.body.keyIcon=k;feed('A KEY BEARER HAS APPEARED (GOLD CUBE)');}}
const _setupR=setupRooms;
setupRooms=function(L){_setupR(L);const M=curMission();if(!M||grid.single||!M.spec)return;
  const mains=grid.rooms.filter(r=>r.type==='main').sort((a,b)=>a.order-b.order);let specs=M.spec.map((s,k)=>Object.assign({_i:k},s));
  if(specs.length>mains.length)specs=mains.length<=1?specs.slice(-1):specs.slice(0,mains.length-1).concat(specs.slice(-1));
  mains.forEach((r,k)=>{const sp=specs[k%specs.length];r.spec=sp;r.enc=sp.k;});
  const boss=grid.rooms.find(r=>r.type==='boss');if(boss)boss.spec={_i:M.spec.length,k:'boss'};};
const _startEncM=startEnc;
startEnc=function(R){
  const K=MK[R.enc];
  if(!K){_startEncM(R);}
  else{R.state='active';G.roomDmg=false;G.corpses=[];const E=R.es={kind:R.enc,spec:R.spec||{},t:0,spawnT:1.4,queue:[],objs:[],wave:0};
    sealRoom(R,true);if(R.hasKey)E.keyBearer=true;K.start(R,E,E.spec);banner(K.name,K.sub,2.2);SFX.wave();MUS.intensity=1;}
  if(R.enc==='survival')return;
  if(R.spec&&R.spec.say&&R.spec.say.start&&!R._saidStart){R._saidStart=true;Comms.seq(R.spec.say.start);}
  Allies.pull(R);if(G.squad&&R.enc!=='boss')setTimeout(()=>Allies.chat('marineContact'),1500);
};
const _encTickM=encTick;
encTick=function(R,dt){const E=R.es;const K=E&&MK[E.kind];if(!K)return _encTickM(R,dt);
  E.t+=dt;keyBearerTick(R,E);
  if(E.finishing){E.finT-=dt;if(E.finT<=0&&!enemies.some(e=>e.keyBearer)){E.finishing=false;if(K.kill)K.kill(R,E);clearRoom(R);}return;}
  const done=K.tick(R,E,dt);if(G.state!=='play')return;
  if(done){E.finishing=true;E.finT=.6;for(const e of enemies.slice())if(!e.T.static&&!e.keyBearer&&!e.boss)killEnemy(e,false,true);for(const e of enemies.slice())if(e.type==='nest')killEnemy(e);}
};
const _clearRoomM=clearRoom;
clearRoom=function(R){
  const M=curMission();
  if(R.enc==='boss'&&M&&M.escape&&!G.escaped){R.state='clear';G.roomsCleared++;startEscape(M);return;}
  _clearRoomM(R);
  if(R.spec&&R.spec.say&&R.spec.say.done)Comms.seq(R.spec.say.done);
  else if(R.enc!=='boss'&&R.enc!=='vaultamb'&&M&&Math.random()<.6)Comms.say('okafor',STORY.chatter.okaforRoom[Math.floor(Math.random()*STORY.chatter.okaforRoom.length)],{low:true,dur:2});
  if(R.enc!=='boss'&&R.enc!=='vaultamb'&&M)G.cp={x:P.pos.x,z:P.pos.z,y:P.pos.y,yaw:P.yaw,room:R.idx};
  if(G.dark&&!G.darkLevel)setDark(false);
};

/* ---------- ESCAPE SEQUENCE ---------- */
function startEscape(M){G._escM=M;
  const sr=grid.rooms[0];const goal=centerPoint(sr);G.escape={t:M.escape.t,total:M.escape.t,goal,metT:2,spawnT:4,shakeT:0};
  for(const d of grid.doors)if(!d.locked)setDoor(d,true);
  const g=wadd(Props.evac());g.position.copy(goal);G.escape.g=g;
  banner('ESCAPE!','Get back to the entry lift',2.5);SFX.boss();shake(1);Comms.seq(M.escapeSay||[['okafor','Get out of there, Warden!']]);MUS.intensity=1;MUS.boss=true;
  $('objective').classList.add('urgent');
}
function escapeTick(dt){const X=G.escape;X.t-=dt;
  {const r=grid.roomOf[idx(ci(P.pos.x),ci(P.pos.z))];if(r>=0&&r!==G.curRoom){G.curRoom=r;lightRoom(grid.rooms[r]);}}X.metT-=dt;X.spawnT-=dt;X.shakeT-=dt;
  if(X.shakeT<=0){X.shakeT=rand(1.5,3);shake(.4);tone('',200,0,.6,.3,true);}
  if(X.metT<=0){X.metT=rand(.5,.9);const x=P.pos.x+P.vel.x*.8+rand(-6,6),z=P.pos.z+P.vel.z*.8+rand(-6,6);if(grid.t[idx(ci(x),ci(z))]===T_FLOOR)groundWarn(x,z,2.4,1.1,0xff5a00,(x,y,z)=>meteorStrike(x,y,z,18));}
  if(X.spawnT<=0&&liveCount()<7){X.spawnT=rand(2.5,4);const a=Math.random()*6.28;const x=P.pos.x+Math.cos(a)*11,z=P.pos.z+Math.sin(a)*11;const k=idx(ci(x),ci(z));if(grid.t[k]===T_FLOOR)spawnEnemy(pickType(),x,z);}
  if(Math.hypot(P.pos.x-X.goal.x,P.pos.z-X.goal.z)<2.2){G.escape=null;G.escaped=true;MUS.boss=false;$('objective').classList.remove('urgent');for(const e of enemies.slice())if(!e.T.static)removeEnemy(e);banner('ESCAPED!','',2);G.winT=2.2;return;}
  if(X.t<=0){G.escape=null;missionFail('The foundry came down around you.');}}
const _objTickM=objectiveTick;
objectiveTick=function(dt){if(G.escape&&!G.trial){G.dtE=dt;escapeTick(dt);objText();return;}_objTickM(dt);};

/* ---------- FAILURE ---------- */
function missionFail(msg){if(G.state!=='play')return;G.failMsg=msg;banner('MISSION FAILED',msg,2);endRun(false);}

/* ---------- LEVEL ENVIRONMENT ---------- */
frameHooks.push(dt=>{
  if(G.grav&&G.grav<1&&!P.onGround&&!G.trial)P.vel.y+=26*dt*(1-G.grav);
  if(G.envMeteors&&!G.trial&&!G.escape){G.envMetT=(G.envMetT||6)-dt;const R=curRoomObj();if(G.envMetT<=0){G.envMetT=rand(4,8);if(R&&R.state==='active'){for(let k=0;k<3;k++){const x=P.pos.x+rand(-7,7),z=P.pos.z+rand(-7,7);if(inRoom(R,ci(x),ci(z),0))groundWarn(x,z,2.2,1.2,0xff5a00,(x,y,z)=>meteorStrike(x,y,z,14));}}}}
});

/* ---------- OBJECTIVE TEXT, BARS, MARKERS ---------- */
const _objTextM=objText;
objText=function(){_objTextM();if(!grid||!grid.rooms)return;const el=$('objective');
  if(G.escape){el.textContent='ESCAPE · REACH THE ENTRY LIFT · '+Math.ceil(Math.max(0,G.escape.t))+'s';return;}
  const R=curRoomObj();if(R&&R.state==='active'&&R.es&&MK[R.es.kind]&&!G.bossE){const tot=grid.rooms.filter(r=>r.type==='main'||r.type==='boss').length+1;el.textContent='ROOM '+R.order+'/'+tot+' · '+MK[R.es.kind].text(R,R.es);}
  el.classList.toggle('urgent',!!G.escape||!!(R&&R.es&&R.es.kind==='purify'&&R.es.cor>=100));};
frameHooks.push(dt=>{
  const R=curRoomObj();const E=R&&R.state==='active'&&R.es;const K=E&&MK[E.kind];
  // mission bar
  const b=G.escape?{label:'TIME TO COLLAPSE',v:G.escape.t/G.escape.total,col:'#ff5a1a'}:(K&&K.bar&&!G.bossE)?K.bar(R,E):null;
  $('objbar').hidden=!b;if(b){$('ob_lbl').textContent=b.label;$('ob_fill').style.transform='scaleX('+clamp(b.v,0,1)+')';$('ob_fill').style.background=b.col;}
  // action bar
  $('actbar').hidden=!ACT.on;if(ACT.on){$('ab_lbl').textContent=ACT.label;$('ab_fill').style.transform='scaleX('+clamp(ACT.v,0,1)+')';}ACT.on=false;
  // carrying chip
  $('carry').hidden=!G.carrying;if(G.carrying)$('carry').textContent='CARRYING '+G.carrying.iname;
  // markers
  let m=[];if(K&&K.marks)m=K.marks(R,E);
  else if(G.escape)m=[{pos:G.escape.goal,label:'EXTRACT',col:'#8ee05a',pulse:true}];
  else if(!G.bossE&&grid.rooms&&!grid.single&&!G.trial&&(!R||R.state!=='active')){const n=nextRoom();if(n&&n!==R)m=[{pos:V3(n.cx,0,n.cz),label:n.enc==='boss'?'BOSS':'NEXT',col:n.enc==='boss'?'#ff3a1a':'#ffcf3a',near:8}];
    if(G.keyDrop)m.push({pos:G.keyDrop.m.position,label:'KEY',col:'#ffcf3a',h:0});}
  for(const a of Allies.list)if(a.state==='down')m.push({pos:a.pos,label:'REVIVE '+a.name.replace('PVT. ',''),col:'#8ee05a',h:1.4,pulse:true});
  if(G.log&&!G.log.got&&Math.hypot(P.pos.x-G.log.pos.x,P.pos.z-G.log.pos.z)<12)m.push({pos:G.log.pos,label:'INTEL',col:'#c07aff',h:.6,near:1.5});
  Markers.set(m);
  // objective tracker
  tracker();
});
function tracker(){const el=$('tracker');const M=curMission();const hide=!M||!grid||!grid.rooms||G.trial;$('hint').style.display=hide?'':'none';if(hide){el.hidden=true;return;}el.hidden=false;
  const done=new Set();for(const r of grid.rooms)if(r.spec&&r.state==='clear'&&r.enc!=='boss')done.add(r.spec._i);
  const boss=grid.rooms.find(r=>r.type==='boss');const bossDone=boss&&boss.state==='clear';
  const used=new Set(grid.rooms.filter(r=>r.spec).map(r=>r.spec._i));const items=[];
  M.obj.forEach((t,i)=>{if(i<M.spec.length&&!used.has(i))return;const isBoss=i===M.spec.length,isEsc=i===M.spec.length+1;const ok=isBoss?bossDone:isEsc?G.escaped:done.has(i);items.push([t,ok]);});
  const cur=items.findIndex(x=>!x[1]);
  const key=items.map(x=>+x[1]).join('')+cur;if(el._k===key)return;el._k=key;
  el.innerHTML='<b>'+M.code+' · '+M.name+'</b>'+items.map(([t,ok],i)=>'<div class="'+(ok?'ok':i===cur?'cur':'')+'">'+(ok?'✓':i===cur?'▸':'·')+' '+t+'</div>').join('');}

/* ---------- CLEANUP ---------- */
const _clearEM=clearEntities;
clearEntities=function(){_clearEM();Allies.clear();Softs.clear();Markers.set([]);
  if(grid&&grid.rooms)for(const r of grid.rooms){if(r.es&&r.es.objs)for(const o of r.es.objs){if(o.parent)o.parent.remove(o);}}
  if(G.escape&&G.escape.g&&G.escape.g.parent)G.escape.g.parent.remove(G.escape.g);
  G.escape=null;G.escaped=false;G._escM=null;G.grav=1;G.envMeteors=false;G.squad=false;G.cp=null;G.failMsg=null;
  if(G.carrying){G.carrying=null;P.spdMul=P._spdBase||1;}if(G.dark||G.darkLevel){G.darkLevel=false;setDark(false);}
  $('objbar').hidden=true;$('actbar').hidden=true;$('carry').hidden=true;$('tracker').hidden=true;$('corr').style.opacity=0;$('objective').classList.remove('urgent');
  if(G.log&&G.log.m&&G.log.m.parent)G.log.m.parent.remove(G.log.m);G.log=null;};

/* hide allies while inside a trial portal */
frameHooks.push(()=>{for(const a of Allies.list)a.h.g.visible=!G.trial;});
const _alliesTick=Allies.tick.bind(Allies);Allies.tick=function(dt){if(G.trial)return;_alliesTick(dt);};

/* ---------- TWISTS: something goes wrong mid-room ---------- */
const TWISTS={
 reinforce:{t:[9,14],run(R,E){const[x,z]=spawnPoint();ring(V3(x,surfaceAt(x,z),z),0xff3a1a,6,1);lightFlash(V3(x,2,z),0xff3a1a,5,24,.8);banner('REINFORCEMENTS','A portal tears open',1.8);SFX.boss();
   Comms.say('vesta','New portal signature. Elites coming through.',{low:true,dur:2.2});const n=2+epN();for(let k=0;k<n;k++)setTimeout(()=>{if(G.state!=='play'||R.state!=='active')return;G.forceElite=1;spawnEnemy(pickType(true),x+rand(-2,2),z+rand(-2,2));G.forceElite=0;},k*450);}},
 champion:{t:[12,18],run(R,E){const champs=Object.keys(BOSSES).filter(k=>!BOSSES[k].major&&!BOSSES[k].body);const pick=champs[Math.min(champs.length-1,Math.floor(epN()*2+Math.random()*3))];
   const def=Object.assign({},BOSSES[pick],{hp:BOSSES[pick].hp*.42,title:'Invader'});banner('INVASION',def.name+' has found you',2);E.invader=true;G._shortIntro=true;spawnBoss(def);G._shortIntro=false;
   Comms.say('okafor','Warden, a champion just tore into your room. It wasn\'t supposed to be here.',{now:true,dur:3});}},
 swarm:{t:[8,12],run(R,E){banner('THE SWARM','',1.6);SFX.growl();Comms.say('vesta','Mass movement in the walls. Lots of small things.',{low:true,dur:2});const types=['swarmling','leaper','swarmling'];
   for(let k=0;k<4;k++)setTimeout(()=>{if(G.state!=='play'||R.state!=='active')return;const a=Math.random()*6.28,x=P.pos.x+Math.cos(a)*9,z=P.pos.z+Math.sin(a)*9;if(openAt(x,z))spawnEnemy(types[k%3],x,z);else{const p=spawnPoint();spawnEnemy(types[k%3],p[0],p[1]);}},k*700);}},
 snipers:{t:[6,10],run(R,E){banner('SNIPERS','Break line of sight',1.8);Comms.say('vesta','Laser sights. Three of them. Use cover.',{low:true,dur:2});
   const cells=farCells(3,12,8,[T_FLOOR,T_PLAT],R);for(const[i,j]of cells){G.forceElite=1;spawnEnemy('marksman',cx(i),cx(j));G.forceElite=0;}}}
};
const _setupTw=setupRooms;
setupRooms=function(L){_setupTw(L);const M=curMission();if(!M||grid.single)return;
  const li=G.mode==='horror'?12:G.mode==='story'?G.levelIdx:(G.descent?G.descent.floor:0);if(G.mode==='story'&&li<2)return;if(G.mode==='descent'&&li<3)return;
  const mains=grid.rooms.filter(r=>r.type==='main').sort((a,b)=>a.order-b.order);if(mains.length<2)return;
  const keys=Object.keys(TWISTS);const n=(G.mode==='story'||G.mode==='horror')&&li>=9?2:1;const used=new Set();
  for(let q=0;q<n;q++){let r;do{r=mains[1+Math.floor(Math.random()*(mains.length-1))];}while(used.has(r)&&used.size<mains.length-1);used.add(r);
    r.twist=keys[(li*7+q*3+Math.floor(Math.random()*2))%keys.length];if(r.enc==='gauntlet'&&r.twist==='champion')r.twist='swarm';}};
const _encTw=encTick;
encTick=function(R,dt){const E=R.es;
  if(E&&R.twist&&!E.twisted&&R.state==='active'){const T=TWISTS[R.twist];E.twAt=E.twAt||rand(T.t[0],T.t[1]);if(E.t>=E.twAt){E.twisted=true;T.run(R,E);}}
  if(E&&E.invader&&G.bossE&&E.finishing){E.finT=.6;return;}
  if(E&&E.invader&&G.bossE&&MK[E.kind]){E.t+=dt;keyBearerTick(R,E);MK[E.kind].tick(R,E,dt);return;}
  _encTw(R,dt);};
