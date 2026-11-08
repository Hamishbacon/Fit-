/* ---------- NEW DEMON BEHAVIOUR ---------- */
function homingShot(from,dir,speed,dmg,col,size,turn){return fireOrb(from,dir,speed,dmg,col,size,'enemy',{glow:true,life:5.5,pre:(s,dt)=>{const to=new THREE.Vector3(P.pos.x-s.m.position.x,P.pos.y+1.1-s.m.position.y,P.pos.z-s.m.position.z).normalize().multiplyScalar(speed);s.v.lerp(to,Math.min(1,turn*dt));if(Math.random()<.4)burst(s.m.position.clone(),0x777777,1,.5,.6,.4);}});}
function lobShot(from,target,dmg,col,size,extra){const tt=1.05,g=18;const v=new THREE.Vector3((target.x-from.x)/tt,(target.y-from.y+.5*g*tt*tt)/tt,(target.z-from.z)/tt);
  const s=fireOrb(from,v,1,dmg,col,size,'enemy',Object.assign({glow:true,life:4,pre:(s,dt)=>{s.v.y-=g*dt;}},extra||{}));s.v.copy(v);return s;}
function acidPool(p,dur=5,rad=1.7,dps=14){const y=surfaceAt(p.x,p.z)+.05;const m=new THREE.Mesh(new THREE.CircleGeometry(rad,16),new THREE.MeshBasicMaterial({color:0x8aff2a,transparent:true,opacity:.6,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(p.x,y,p.z);scene.add(m);
  let el=0,tk=0;addFx({kill(){scene.remove(m);},tick(dt){el+=dt;tk-=dt;m.material.opacity=.6*Math.min(1,dur-el);if(Math.random()<.15)burst(new THREE.Vector3(p.x+rand(-rad,rad)*.7,y+.1,p.z+rand(-rad,rad)*.7),0xaaff44,1,1.5,.5,.4);
    if(tk<=0&&Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<rad&&P.pos.y-y<.6){tk=.4;hurtPlayer(dps*.4,true);}if(el>=dur){this.kill();return false;}return true;}});}
const ENEMY_AI={
 spitter(e,dt,dist){if(e.cd<=0&&dist<26&&losTo(e)){e.cd=rand(2.2,3.2);const from=e.pos.clone().setY(e.pos.y+1.6*e.size);
   for(let k=0;k<(e.elite?3:1);k++){const tg=P.pos.clone().add(new THREE.Vector3(rand(-1.6,1.6)*k,0,rand(-1.6,1.6)*k)).addScaledVector(P.vel,.35);tg.y=surfaceAt(tg.x,tg.z)+.3;lobShot(from,tg,e.dmg,0x9aff3a,.8,{onDie:(s,p)=>acidPool(p)});}SFX.enemyShot();}},
 revenant(e,dt,dist,to){if(e.cd<=0&&dist<32&&losTo(e)){e.cd=rand(2.6,3.6);const rx=Math.cos(e.faceA),rz=-Math.sin(e.faceA);
   for(const sx of[-.45,.45]){const from=e.pos.clone().add(new THREE.Vector3(rx*sx*e.size,1.95*e.size,rz*sx*e.size));const d=to.clone();d.y=.8;homingShot(from,d,11,e.dmg,0xff8a3a,.5,2.1);}SFX.rocket();}},
 stalker(e,dt,dist){const vis=dist<7.5||e.hurt>0||e.staggered;e.cloakA=(e.cloakA??0)+(((vis?1:.07))-(e.cloakA??0))*Math.min(1,dt*5);
   if(e.cloakMats)for(const m of e.cloakMats)m.opacity=e.cloakA*(.85+Math.sin(e.t*20)*.15*(1-e.cloakA));if(e.bar&&e.cloakA<.5)e.bar.bg.visible=e.bar.fg.visible=false;
   if(vis&&!e.revealed){e.revealed=true;tone('sawtooth',180,90,.3,.12);}if(!vis)e.revealed=false;},
 jugg(e,dt,dist,to,ySame){e.cd2=(e.cd2??4)-dt;
   if(!(e.jc>0)&&e.cd2<=0&&dist>5&&dist<22&&ySame){e.jc=1.3;e.jdir=to.clone();e.cd2=rand(6,8);e.jhit=false;SFX.growl();tone('sawtooth',70,140,.6,.2);}
   if(e.jc>0){e.jc-=dt;e.pos.addScaledVector(e.jdir,e.speed*3.4*dt);if(Math.random()<.5)burst(e.pos.clone().setY(e.pos.y+.2),0x777777,1,2,1,.4);
     if(!e.jhit&&dist<2+e.size*.4&&ySame){e.jhit=true;hurtPlayer(e.dmg*1.2);P.vel.addScaledVector(to,12);P.vel.y=6;shake(.45);}}},
 necro(e,dt,dist,to){e.rv=(e.rv??4)-dt;
   if(e.rv<=0){e.rv=rand(6,8);const nearC=G.corpses.filter(c=>Math.hypot(c.x-e.pos.x,c.z-e.pos.z)<22).slice(0,e.elite?4:3);
     if(nearC.length){for(const c of nearC){G.corpses.splice(G.corpses.indexOf(c),1);const y=surfaceAt(c.x,c.z);ring(new THREE.Vector3(c.x,y,c.z),0x9a5aff,2.5,.6);burst(new THREE.Vector3(c.x,y+.5,c.z),0x9a5aff,14,5,1,.7);const n=spawnEnemy(c.type,c.x,c.z);n.revived=true;}
       feed('THE NECROMANCER RAISES THE DEAD');tone('sine',200,90,.8,.25);if(e.body.orb)e.body.orb.scale.setScalar(2);}}
   if(e.cd<=0&&dist<30&&losTo(e)){e.cd=rand(2,3);const from=e.pos.clone().setY(e.pos.y+2*e.size);homingShot(from,to.clone().setY(.3),8,e.dmg,0x9a5aff,.9,1.3);SFX.enemyShot();}}
};
const _spE=spawnEnemy;
spawnEnemy=function(type,x,z){
  const e=_spE(type,x,z);const T=ENEMY[type];
  if(T.swarm&&!G._sw){G._sw=true;for(let k=0;k<3;k++){const a=k*2.1+Math.random();_spE(type,clamp(x+Math.cos(a)*1.4,-ARENA+2,ARENA-2),clamp(z+Math.sin(a)*1.4,-ARENA+2,ARENA-2));}G._sw=false;}
  if(T.cloak){e.cloakMats=[];e.body.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.visible!==false){o.material=o.material.clone();o.material.transparent=true;e.cloakMats.push(o.material);}});e.cloakA=0;}
  return e;
};
const _mkB=makeBody;
makeBody=function(T,s,boss){
  if(boss&&T.body&&ARCH[T.body])return ARCH[T.body](T,s);
  const B=_mkB(T,s,boss);const g=B.g;
  const add=(m,sx,sy,sz,x,y,z,p=g)=>{const b=new THREE.Mesh(boxGeo,m);b.castShadow=true;b.scale.set(sx*s,sy*s,sz*s);b.position.set(x*s,y*s,z*s);p.add(b);return b;};
  if(T.ai==='revenant'){for(const sx of[-1,1]){add(skinMat(0x3a3a3a),.22,.3,.3,sx*.42,1.85,-.05);add(mat(0xff8a3a,0xff5a00),.12,.06,.12,sx*.42,2.02,-.05);}for(let i=0;i<3;i++)add(mat(0xd8ccb0),.42,.05,.32,0,1.0+i*.14,.16);}
  if(T.armored){add(skinMat(0x6a6a72),.85,.95,.14,0,1.15,.26);add(skinMat(0x6a6a72),.62,.25,.14,0,1.72,.27);const core=add(mat(0xff6a1a,0xff4a00),.32,.32,.1,0,1.2,-.22);core.userData.keep=true;B.core=core;}
  return B;
};

/* ---------- BOSS ARCHETYPES ---------- */
const dummyG=()=>new THREE.Group();
function boxIn(p,m,sx,sy,sz,x,y,z){const b=new THREE.Mesh(boxGeo,m);b.castShadow=true;b.scale.set(sx,sy,sz);b.position.set(x,y,z);p.add(b);return b;}
function hitPair(g,hb,hh){const a=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false})),b=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));a.scale.set(...hb[0]);a.position.set(...hb[1]);b.scale.set(...hh[0]);b.position.set(...hh[1]);g.add(a,b);return[a,b];}
const ARCH={
 spider(T,s){const g=new THREE.Group();const sk=skinMat(T.col),dk=skinMat(T.shirt),ey=mat(T.eye,T.eye);
   const abd=new THREE.Mesh(new THREE.SphereGeometry(.78*s,10,8),sk);abd.position.set(0,1.1*s,-.95*s);abd.scale.set(1,.85,1.25);abd.castShadow=true;g.add(abd);
   for(let i=0;i<4;i++)boxIn(g,ey,.12*s,.06*s,.3*s,0,1.75*s-i*.04*s,-.6*s-i*.35*s);
   boxIn(g,dk,.85*s,.5*s,.85*s,0,.9*s,.1*s);const head=boxIn(g,sk,.58*s,.42*s,.48*s,0,.9*s,.66*s);
   for(let i=0;i<6;i++)boxIn(g,ey,.08*s,.08*s,.04*s,(i%3-1)*.14*s,(.98+Math.floor(i/3)*.1)*s,.91*s);
   for(const sx of[-1,1])boxIn(g,mat(0xe8e0c8),.07*s,.28*s,.07*s,sx*.12*s,.66*s,.86*s);
   const legs=[];for(const sd of[-1,1])for(let k=0;k<4;k++){const hip=new THREE.Group();hip.position.set(sd*.4*s,.95*s,(.45-k*.32)*s);g.add(hip);
     const up=new THREE.Group();up.rotation.z=sd*-.7;hip.add(up);boxIn(up,dk,1.05*s,.14*s,.14*s,sd*.52*s,0,0);
     const lo=new THREE.Group();lo.position.set(sd*1.02*s,0,0);lo.rotation.z=sd*1.9;up.add(lo);boxIn(lo,sk,1.15*s,.12*s,.12*s,sd*.56*s,0,0);legs.push({hip,sd,k});}
   const[hb,hh]=hitPair(g,[[1.9*s,1.3*s,2.6*s],[0,1*s,-.3*s]],[[.7*s,.6*s,.6*s],[0,.95*s,.7*s]]);
   return{g,legL:dummyG(),legR:dummyG(),armL:dummyG(),armR:dummyG(),head,hb,hh,legs};},
 hydra(T,s){const g=new THREE.Group();const sk=skinMat(T.col),dk=skinMat(T.shirt);
   const mound=new THREE.Mesh(new THREE.SphereGeometry(1.1*s,12,8,0,Math.PI*2,0,Math.PI/2),sk);mound.scale.set(1.2,.75,1.2);mound.castShadow=true;g.add(mound);
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;boxIn(g,dk,.25*s,.5*s,.25*s,Math.cos(a)*.9*s,.35*s,Math.sin(a)*.9*s).rotation.z=Math.cos(a)*.5;}
   const core=new THREE.Mesh(new THREE.SphereGeometry(.35*s,8,6),mat(T.eye,T.eye));core.position.set(0,.75*s,.6*s);core.userData.keep=true;g.add(core);
   const[hb,hh]=hitPair(g,[[2.4*s,1.6*s,2.4*s],[0,.6*s,0]],[[.8*s,.8*s,.8*s],[0,.8*s,.7*s]]);
   return{g,legL:dummyG(),legR:dummyG(),armL:dummyG(),armR:dummyG(),head:core,hb,hh};},
 eye(T,s){const g=new THREE.Group();const inner=new THREE.Group();g.add(inner);const r=.95*s;
   const ball=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),skinMat(T.col));ball.castShadow=true;inner.add(ball);
   for(let i=0;i<10;i++){const v=boxIn(inner,mat(0xaa1a1a),.03*s,.03*s,.5*s,0,0,0);const a=Math.random()*6.28,b=rand(-.6,.6);v.position.set(Math.cos(a)*r*.98,Math.sin(b)*r*.6,Math.sin(a)*r*.98);v.lookAt(0,0,0);}
   const iris=new THREE.Mesh(new THREE.CircleGeometry(.45*s,16),mat(T.eye,T.eye));iris.position.z=r*1.002;inner.add(iris);iris.userData.keep=true;
   const pupil=new THREE.Mesh(new THREE.CircleGeometry(.2*s,12),new THREE.MeshBasicMaterial({color:0x000000}));pupil.position.z=r*1.005;inner.add(pupil);pupil.userData.keep=true;
   const lidG=new THREE.SphereGeometry(r*1.05,16,8,0,Math.PI*2,0,Math.PI/2);const lm=skinMat(T.shirt);
   const lidT=new THREE.Mesh(lidG,lm),lidB=new THREE.Mesh(lidG,lm);lidB.rotation.x=Math.PI;inner.add(lidT,lidB);
   const tent=[];for(let i=0;i<6;i++){const t=new THREE.Group();const a=i/6*Math.PI*2;t.position.set(Math.cos(a)*r*.5,-r*.8,Math.sin(a)*r*.5);g.add(t);for(let q=0;q<4;q++)boxIn(t,lm,.18*s*(1-q*.18),.5*s,.18*s*(1-q*.18),0,-q*.45*s,0);tent.push(t);}
   const[hb,hh]=hitPair(inner,[[2*r,2*r,2*r],[0,0,0]],[[.9*s,.9*s,.3*s],[0,0,r]]);
   return{g,legL:dummyG(),legR:dummyG(),armL:dummyG(),armR:dummyG(),head:ball,hb,hh,inner,lidT,lidB,tent};}
};
function spawnHeads(b,n){
  b.heads=[];for(let k=0;k<n;k++){const s=b.size*.5;const g=new THREE.Group();scene.add(g);const sk=skinMat(b.T.col),dk=skinMat(b.T.shirt);
    const neck=[];for(let q=0;q<5;q++){const m=new THREE.Mesh(boxGeo,sk);m.scale.setScalar(.55*s*(1-q*.08));m.castShadow=true;g.add(m);neck.push(m);}
    const head=new THREE.Group();g.add(head);const hm=boxIn(head,dk,1*s,.7*s,1.4*s,0,0,0);boxIn(head,sk,.9*s,.25*s,1.1*s,0,-.45*s,.1*s);
    for(const sx of[-1,1]){boxIn(head,mat(b.T.eye,b.T.eye),.18*s,.12*s,.05*s,sx*.3*s,.15*s,.71*s).userData.keep=true;boxIn(head,mat(0xd8ccb0),.12*s,.5*s,.12*s,sx*.35*s,.5*s,-.3*s).rotation.x=-.5;}
    const[hb,hh]=hitPair(head,[[1.3*s,1.2*s,1.7*s],[0,0,0]],[[.8*s,.4*s,.8*s],[0,.35*s,.1*s]]);
    const hp=b.T.hp*.16*DIFF().hp*(1+.2*(b.regrown||0));
    const e={type:'hydrahead',T:{name:'Hydra Head',size:s,score:80,coins:15,col:b.T.col,eye:b.T.eye},body:{g,legL:dummyG(),legR:dummyG(),armL:dummyG(),armR:dummyG(),head,hb,hh,neck,hm},
      pos:new THREE.Vector3(),hp,max:hp,owner:b,ang:k/n*Math.PI*2+.4,cd:rand(1.5,3),t:rand(0,5),spawnT:0,hurt:0,size:s,speed:0,dmg:b.dmg*.6,faceA:0,custom:headTick};
    hb.userData.e=e;hh.userData.e=e;hh.userData.head=true;hitboxes.push(hb,hh);enemies.push(e);addHealthBar(e);if(e.bar)e.bar.fg.center.set(.5,.5);b.heads.push(e);}
}
function headTick(e,dt){
  const b=e.owner,B=e.body;e.t+=dt;if(!enemies.includes(b)){e.hp=0;removeEnemy(e);return;}
  const a=e.ang+Math.sin(e.t*.7)*.35,r=b.size*1.05;const base=new THREE.Vector3(b.pos.x+Math.cos(a)*r*.4,b.pos.y+b.size*.6,b.pos.z+Math.sin(a)*r*.4);
  const hp=new THREE.Vector3(b.pos.x+Math.cos(a)*r,b.pos.y+b.size*1.9+Math.sin(e.t*1.3)*.5,b.pos.z+Math.sin(a)*r);e.pos.copy(hp);
  B.neck.forEach((m,q)=>{const f=(q+.5)/5;m.position.lerpVectors(base,hp,f);m.position.y+=Math.sin(f*Math.PI)*b.size*.3;});
  B.head.position.copy(hp);e.pos.y=hp.y-.6*e.size;B.head.lookAt(P.pos.x,P.pos.y+1,P.pos.z);
  if(e.hurt>0){e.hurt-=dt;B.hm.material=mat(0xffffff,0xffffff);}else B.hm.material=skinMat(b.T.shirt);
  if(e.bar){e.bar.bg.position.set(hp.x,hp.y+1.1*e.size,hp.z);e.bar.fg.position.set(hp.x,hp.y+1.1*e.size,hp.z);}
  e.cd-=dt;if(e.cd<=0&&!b.stunT){e.cd=rand(2,3.4)/(b.enraged?1.35:1);const d=new THREE.Vector3(P.pos.x-hp.x,P.pos.y+1-hp.y,P.pos.z-hp.z);fireOrb(hp.clone(),d,16,e.dmg,0xff6a10,1.1,'enemy',{glow:true});SFX.enemyShot();}
  if(Math.hypot(P.pos.x-hp.x,P.pos.z-hp.z)<2.5&&Math.abs(P.pos.y+1-hp.y)<2.5&&!e.bite){e.bite=true;hurtPlayer(e.dmg*1.3);setTimeout(()=>e.bite=false,1200);}
}
const _sbA=spawnBoss;
spawnBoss=function(def){const e=_sbA(def);
  if(def.body==='eye'){e.flying=true;e.eyeT=0;e.invuln=true;e.lidO=0;}
  if(def.body==='hydra'){e.shielded=true;e.regrown=0;spawnHeads(e,def.heads||3);feed('DESTROY THE HEADS TO EXPOSE THE BODY');}
  return e;};
const _killA=killEnemy;
killEnemy=function(e,h,o){_killA(e,h,o);
  if(e.type==='hydrahead'){const b=e.owner;b.heads=b.heads.filter(x=>x!==e);if(!b.heads.length&&enemies.includes(b)){b.shielded=false;b.stunT=7;b.regrowT=7.2;banner('HEADS DESTROYED','Attack the body!',2);shake(.6);}}};
const _ubA=updateBoss;
updateBoss=function(e,dt,to,dist){const A=e.T.body,B=e.body;
  if(A==='spider'&&B.legs){const ph=e.t*(e.atk==='charge'?14:6);for(const L of B.legs){L.hip.rotation.y=Math.sin(ph+L.k*1.4+(L.sd>0?Math.PI:0))*.35;L.hip.rotation.z=Math.max(0,Math.sin(ph+L.k*1.4))*.25*L.sd;}}
  if(A==='eye'){if(e.atk&&e.atk!==e.prevAtk)e.eyeT=Math.max(e.eyeT,4.5);e.prevAtk=e.atk;if(e.stunT>0)e.eyeT=Math.max(e.eyeT,e.stunT);e.eyeT-=dt;
    e.invuln=e.eyeT<=0;e.lidO+=((e.eyeT>0?1:0)-e.lidO)*Math.min(1,dt*6);B.lidT.rotation.x=-e.lidO*1.25;B.lidB.rotation.x=Math.PI+e.lidO*1.25;
    const dy=(e.pos.y)-(P.pos.y+1);B.inner.rotation.x=Math.atan2(dy,Math.max(1,dist));B.tent.forEach((t,i)=>{t.rotation.x=Math.sin(e.t*2+i)*.35;t.rotation.z=Math.cos(e.t*1.7+i)*.35;});}
  if(A==='hydra'&&e.regrowT>0){e.regrowT-=dt;if(e.regrowT<=0&&!e.heads.length&&e.hp>0){e.regrown++;spawnHeads(e,(e.T.heads||3)+(e.enraged?1:0));e.shielded=true;feed('THE HEADS GROW BACK');SFX.boss();}}
  _ubA(e,dt,to,dist);
  if(A==='hydra')e.moveMul=0;
  if(A==='eye')e.moveMul=e.atk==='laserwall'?0:dist<11?-.7:dist>20?1:.25;
};
/* new boss attacks */
const BOSS_ATK={
 eggs(e){e.atkT=1.2;const n=e.enraged||e.phase>1?8:6;G._sw=true;for(let i=0;i<n&&enemies.length<22;i++){const a=Math.random()*6.28,r=rand(2,5);const x=clamp(e.pos.x+Math.cos(a)*r,-ARENA+3,ARENA-3),z=clamp(e.pos.z+Math.sin(a)*r,-ARENA+3,ARENA-3);burst(new THREE.Vector3(x,.5,z),0xe8e0c8,8,4,.8,.5);spawnEnemy('swarmling',x,z);}G._sw=false;feed('THE BROOD HATCHES');tone('',800,0,.5,.3,true);},
 web(e,to){e.atkT=1;const from=e.pos.clone().setY(e.pos.y+e.size*.9);for(let k=0;k<5;k++)setTimeout(()=>{if(!enemies.includes(e)||G.state!=='play')return;const d=new THREE.Vector3(P.pos.x-from.x+rand(-2,2),P.pos.y+1-from.y,P.pos.z-from.z+rand(-2,2));fireOrb(from,d,19,6,0xf0f0f0,1.1,'enemy',{onHit:()=>{P.slowT=2.5;feed('WEBBED! YOU ARE SLOWED');}});SFX.enemyShot();},k*120);},
 acid(e){e.atkT=1.2;const from=e.pos.clone().setY(e.pos.y+e.size*1.4);const n=e.enraged||e.phase>1?7:5;for(let k=0;k<n;k++){const tg=P.pos.clone().add(new THREE.Vector3(rand(-4,4),0,rand(-4,4)));if(k===0)tg.copy(P.pos).addScaledVector(P.vel,.5);tg.y=surfaceAt(tg.x,tg.z)+.3;lobShot(from,tg,10,0x9aff3a,1.2,{onDie:(s,p)=>acidPool(p,6,2,16)});}SFX.enemyShot();},
 homing(e,to){e.atkT=1;const n=e.enraged||e.phase>1?6:4;for(let k=0;k<n;k++){const a=(k/(n-1)-.5)*2.2;const d=to.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a);d.y=.9;homingShot(e.pos.clone().setY(e.pos.y+e.size*(e.flying?0:1.6)),d,12,12,0xff8a3a,.7,1.7);}SFX.rocket();feed('HOMING MISSILES');},
 laserwall(e){e.atkT=6;const n=e.enraged||e.phase>1?4:3;const beams=[];const y0=surfaceAt(e.pos.x,e.pos.z)+.95;let a0=Math.random()*6.28,el=0,tk=0;const sp=(Math.random()<.5?1:-1)*(.55+.1*(e.phase||0));
   for(let k=0;k<n;k++){const m=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:e.T.eye,transparent:true,opacity:.25}));m.userData.keep=true;scene.add(m);beams.push(m);}
   const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,12,8),new THREE.MeshBasicMaterial({color:e.T.eye,transparent:true,opacity:.5}));scene.add(pillar);
   feed('LASER SPOKES: JUMP OVER THEM');
   addFx({boss:e,kill(){beams.forEach(b=>scene.remove(b));scene.remove(pillar);},tick(dt){el+=dt;const live=el>1;if(live)a0+=sp*dt;const cxp=e.pos.x,czp=e.pos.z;pillar.position.set(cxp,y0+5,czp);
     beams.forEach((b,k)=>{const a=a0+k/n*Math.PI*2;const len=40;b.scale.set(live?.42:.12,live?.42:.12,len);b.position.set(cxp+Math.sin(a)*len/2,y0,czp+Math.cos(a)*len/2);b.rotation.y=a;b.material.opacity=live?.9:.25+.2*Math.sin(el*20);});
     tk-=dt;if(live&&tk<=0){const dx=P.pos.x-cxp,dz=P.pos.z-czp,d=Math.hypot(dx,dz);const pa=Math.atan2(dx,dz);
       for(let k=0;k<n;k++){const a=a0+k/n*Math.PI*2;let da=pa-a;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)<Math.PI/2&&Math.abs(Math.sin(da)*d)<.65&&d<40&&P.pos.y<y0+.2){tk=.3;hurtPlayer(14);break;}}}
     if(el>6||!enemies.includes(e)){this.kill();return false;}return true;}});}
};
