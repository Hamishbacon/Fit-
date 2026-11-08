/* =====================================================================
   ACTORS — the friendly side of the fight.
   - makeHuman(): marines, colonists, Reyne.
   - Softs: things demons can hurt besides you (allies, survivors,
     escort targets, defended objects). Demons pick a soft target to
     attack ("aggro") and their shots and claws land on it instead of you.
   - Allies: Fireteam Ash. They follow, shoot, go down, and can be revived.
   - gridPath(): breadth-first path across the level grid.
   ===================================================================== */
function makeHuman(o){
  o=o||{};const s=o.scale||1;const g=new THREE.Group();
  const suit=skinMat(o.suit||0x4a5a6a),armor=skinMat(o.armor||0x6a7a8a),skin=skinMat(o.skin||0xb07a58),dark=mat(0x1a1a1e);
  const add=(m,sx,sy,sz,x,y,z,p=g)=>{const b=new THREE.Mesh(rboxGeo,m);b.castShadow=true;b.scale.set(sx*s,sy*s,sz*s);b.position.set(x*s,y*s,z*s);p.add(b);return b;};
  const legL=new THREE.Group(),legR=new THREE.Group(),armL=new THREE.Group(),armR=new THREE.Group(),body=new THREE.Group();g.add(body);
  legL.position.set(-.14*s,.78*s,0);legR.position.set(.14*s,.78*s,0);armL.position.set(-.36*s,1.42*s,0);armR.position.set(.36*s,1.42*s,0);body.add(legL,legR,armL,armR);
  add(suit,.22,.78,.24,0,-.39,0,legL);add(suit,.22,.78,.24,0,-.39,0,legR);add(dark,.24,.12,.3,0,-.74,.03,legL);add(dark,.24,.12,.3,0,-.74,.03,legR);
  add(armor,.56,.62,.32,0,1.12,0,body);add(suit,.5,.18,.28,0,.8,0,body);
  add(o.coat?skinMat(o.coat):suit,.2,.66,.2,0,-.3,0,armL);add(o.coat?skinMat(o.coat):suit,.2,.66,.2,0,-.3,0,armR);
  for(const sx of[-1,1])add(armor,.22,.14,.34,sx*.32,1.44,0,body);
  const head=new THREE.Group();head.position.set(0,1.66*s,0);body.add(head);
  if(o.helmet!==false){add(armor,.42,.4,.44,0,0,0,head);add(mat(o.visor||0x3ab0ff,new THREE.Color(o.visor||0x3ab0ff).multiplyScalar(.6).getHex()),.34,.12,.04,0,.02,.22,head).userData.keep=true;}
  else{add(skin,.36,.4,.36,0,0,0,head);add(dark,.06,.04,.02,-.08,.04,.185,head);add(dark,.06,.04,.02,.08,.04,.185,head);add(skinMat(o.hair||0x2a201a),.4,.12,.4,0,.2,0,head);
    if(o.hat)add(skinMat(o.hat),.44,.12,.44,0,.24,0,head);if(o.glasses)add(mat(0x9ad8ff,0x2a4a5a),.3,.06,.02,0,.04,.19,head);}
  if(o.gun!==false){const gun=add(dark,.08,.1,.6,0,-.62,.22,armR);add(skinMat(0x3a3a40),.06,.14,.1,0,-.72,.05,armR);armR.rotation.x=-1.2;armL.rotation.x=-1.0;armL.rotation.z=.35;}
  return{g,body,legL,legR,armL,armR,head};
}

/* ---------- SOFT TARGETS ---------- */
const Softs={list:[],
 add(o){o.alive=true;o.r=o.r||.8;o.h=o.h||1.8;o.attract=o.attract==null?.5:o.attract;o.hurtT=0;this.list.push(o);return o;},
 remove(o){const i=this.list.indexOf(o);if(i>=0)this.list.splice(i,1);o.alive=false;},
 hit(o,d){if(!o||!o.alive||o.invuln||d<=0)return;d*=DIFF().dmg*(o.armor||1);o.hp-=d;o.hurtT=.18;o.lastHit=G.time;if(o.onHurt)o.onHurt(d);
  if(o.hp<=0){o.hp=0;o.alive=false;if(o.onDown)o.onDown();}},
 clear(){this.list.length=0;}
};
/* enemy shots can hit soft targets */
frameHooks.push(dt=>{
  if(!Softs.list.length)return;
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];if(s.owner!=='enemy')continue;const p=s.m.position;
    for(const o of Softs.list){if(!o.alive)continue;const dx=p.x-o.pos.x,dz=p.z-o.pos.z;if(dx*dx+dz*dz<o.r*o.r&&p.y>o.pos.y-.2&&p.y<o.pos.y+o.h){
      Softs.hit(o,s.dmg*.85);burst(p.clone(),0xffd27a,4,3,.6,.3);if(s.onDie)s.onDie(s,p.clone());scene.remove(s.m);shots.splice(i,1);break;}}}
});
/* demons choose a soft target now and then */
let _aggroT=0;
frameHooks.push(dt=>{
  _aggroT-=dt;if(_aggroT>0)return;_aggroT=.7;
  const live=Softs.list.filter(o=>o.alive&&o.attract>0);
  const count=new Map();
  for(const e of enemies){if(e.boss||e.T.static||e.custom||e.lt)continue;
    if(e.aggro&&!e.aggro.alive)e.aggro=null;
    if(!live.length){e.aggro=null;continue;}
    let best=null,bd=1e9;for(const o of live){const d=Math.hypot(o.pos.x-e.pos.x,o.pos.z-e.pos.z);if(d<bd){bd=d;best=o;}}
    const dp=Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z);const n=count.get(best)||0;
    if(best&&bd<18&&n<(best.maxAggro||5)&&(bd<dp*.7||Math.random()<best.attract*.55)){e.aggro=best;count.set(best,n+1);}else e.aggro=null;}
});
const _ueA=updateEnemy;
updateEnemy=function(e,dt){
  const a=e.aggro;if(!a||!a.alive||e.boss||e.T.static||e.custom){if(a&&!a.alive)e.aggro=null;return _ueA(e,dt);}
  const px=P.pos.x,py=P.pos.y,pz=P.pos.z,vx=P.vel.x,vy=P.vel.y,vz=P.vel.z;
  P.pos.set(a.pos.x,a.pos.y,a.pos.z);P.vel.set(0,0,0);G._aggro=a;
  try{_ueA(e,dt);}finally{P.pos.set(px,py,pz);P.vel.set(vx,vy,vz);G._aggro=null;}
};
const _navA=navDir;
navDir=function(e,out){if(G._aggro){const dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z;if(Math.hypot(dx,dz)<16)return out.set(dx,0,dz).normalize();}return _navA(e,out);};
const _hpA=hurtPlayer;
hurtPlayer=function(d,ia){if(G._aggro){Softs.hit(G._aggro,d);return;}return _hpA(d,ia);};
const _shA=shake;shake=function(a){if(G._aggro)return;_shA(a);};

/* quiet damage for allies: no hit markers, no rage, no weapon mastery */
const _hmA=hitMark;hitMark=function(k){if(G._quiet)return;_hmA(k);};
const _dnA=dmgNumber;dmgNumber=function(p,a,h){if(G._quiet)return;_dnA(p,a,h);};
function allyDamage(e,amt,point){G._quiet=true;const h=SFX.hit,hd=SFX.head;SFX.hit=SFX.head=()=>{};
  try{damageEnemy(e,amt,false,point,'env');}finally{SFX.hit=h;SFX.head=hd;G._quiet=false;const c=$('cross');if(c&&!c._mine)c.className='';}}

/* ---------- GRID PATHING ---------- */
function gridPath(ax,az,bx,bz){
  const s=idx(ci(ax),ci(az)),t=idx(ci(bx),ci(bz));const prev=new Int32Array(N*N).fill(-1);prev[s]=s;const q=[s];let h=0;
  const pass=k=>{const tt=grid.t[k];if(tt===T_FLOOR||tt===T_STAIR)return true;if(tt===T_DOOR)return !grid.dc[k];if(tt===T_PLAT)return grid.h[k]<=.6;return false;};
  while(h<q.length){const k=q[h++];if(k===t)break;const i=k%N,j=(k/N)|0;
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=i+dx,b=j+dz;if(a<1||b<1||a>N-2||b>N-2)continue;const kk=idx(a,b);if(prev[kk]>=0||!pass(kk))continue;
      if(dx&&dz&&(!pass(idx(i+dx,j))||!pass(idx(i,j+dz))))continue;prev[kk]=k;q.push(kk);}}
  if(prev[t]<0)return[new THREE.Vector3(bx,0,bz)];
  const cells=[];for(let k=t;k!==s;k=prev[k])cells.push(k);cells.reverse();
  const pts=[];let lastD=null;for(let n=0;n<cells.length;n++){const k=cells[n],nx=cells[n+1];const d=nx==null?null:(nx-k);if(d!==lastD||nx==null)pts.push(new THREE.Vector3(cx(k%N),0,cx((k/N)|0)));lastD=d;}
  pts.push(new THREE.Vector3(bx,0,bz));return pts;
}
/* walk an actor along waypoints; returns true when finished */
function walkPath(a,dt,speed){
  const w=a.path&&a.path[a.wp];if(!w)return true;const dx=w.x-a.pos.x,dz=w.z-a.pos.z,d=Math.hypot(dx,dz);
  if(d<.6){a.wp++;return a.wp>=a.path.length;}
  const st=Math.min(d,speed*dt);a.pos.x+=dx/d*st;a.pos.z+=dz/d*st;a.faceA=Math.atan2(dx,dz);
  resolveXZ(a.pos,a.rad||.35,a.pos.y,1.8);a.pos.y+=(surfaceAt(a.pos.x,a.pos.z)-a.pos.y)*Math.min(1,dt*10);a.moving=true;return false;
}
function animHuman(h,a,dt){a.t=(a.t||0)+dt;const sw=a.moving?Math.sin(a.t*9)*.7:0;h.legL.rotation.x=sw;h.legR.rotation.x=-sw;
  h.g.position.copy(a.pos);if(a.faceA!=null){let da=a.faceA-h.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));h.g.rotation.y+=da*Math.min(1,dt*10);}
  const hurt=a.soft&&a.soft.hurtT>0;if(hurt){a.soft.hurtT-=dt;}
  h.g.traverse(o=>{if(!o.isMesh||o.userData.keep)return;if(hurt){o.userData.base=o.userData.base||o.material;o.material=mat(0xffffff,0xff4444);}else if(o.userData.base){o.material=o.userData.base;delete o.userData.base;}});}

/* ---------- ALLIES: FIRETEAM ASH ---------- */
const ASH_NAMES=['PVT. OSEI','PVT. HALE','PVT. KADE'];
const Allies={list:[],chatT:0,
 add(name,x,z,o){o=o||{};const rook=!!o.rook;const h=makeHuman({suit:rook?0x5a5a3a:0x3a4a5a,armor:rook?0x7a7a52:0x5a6a7a,visor:rook?0xffae1f:0x3ab0ff});
  const ep=(G.L&&G.L.ep)||0;const max=(rook?320:220)*(1+ep*.3);
  const a={name,rook,h,pos:new THREE.Vector3(x,surfaceAt(x,z),z),hp:max,max,state:'follow',cd:rand(.3,1),burst:0,t:rand(0,5),slot:this.list.length,faceA:0,stuckT:0,last:new THREE.Vector3(x,0,z),regenT:0};
  a.soft=Softs.add({kind:'ally',pos:a.pos,hp:max,max,r:.75,h:1.9,attract:.45,maxAggro:3,
    onHurt:()=>{a.regenT=4;},onDown:()=>this.down(a)});
  Object.defineProperty(a,'hp',{get:()=>a.soft.hp,set:v=>{a.soft.hp=v;}});
  h.g.position.copy(a.pos);scene.add(h.g);this.list.push(a);return a;},
 spawn(n,rook){const cells=[];for(let k=0;k<n+(rook?1:0);k++){const a=P.yaw+Math.PI+(k-(n-1)/2)*.6;let x=P.pos.x+Math.sin(a)*-2.5,z=P.pos.z+Math.cos(a)*-2.5;
   const kk=idx(ci(x),ci(z));if(grid.t[kk]!==T_FLOOR){x=P.pos.x+rand(-1,1);z=P.pos.z+rand(-1,1);}cells.push([x,z]);}
  let k=0;if(rook){this.add('ROOK',cells[k][0],cells[k][1],{rook:true});k++;}for(let i=0;i<n;i++,k++)this.add(ASH_NAMES[i%3],cells[k][0],cells[k][1]);},
 chat(kind,force){if(!this.list.some(a=>a.state==='follow'))return;if(!force&&this.chatT>0)return;this.chatT=rand(7,12);const lines=STORY.chatter[kind];if(!lines)return;
  const a=this.list.filter(a=>a.state==='follow')[Math.floor(Math.random()*this.list.filter(a=>a.state==='follow').length)];
  Comms.say(a.rook?'rook':'marine',lines[Math.floor(Math.random()*lines.length)],{low:true,dur:2.2});},
 down(a){if(a.state!=='follow')return;a.state='down';a.bleed=a.rook?22:26;a.rev=0;a.h.body.rotation.x=-.5;a.h.body.position.y=-.45;
  Comms.say(a.rook?'rook':'marine',STORY.chatter.marineDown[Math.floor(Math.random()*4)],{dur:2});feed(a.name+' IS DOWN · STAND NEAR TO REVIVE');},
 revive(a,auto){a.state='follow';a.soft.alive=true;a.soft.hp=a.max*(auto?.3:.55);a.h.body.rotation.x=0;a.h.body.position.y=0;
  if(!auto)Comms.say(a.rook?'rook':'marine',STORY.chatter.marineRevive[Math.floor(Math.random()*3)],{dur:2});tone('sine',500,1000,.3,.15);},
 die(a){a.state='dead';a.deadT=4;a.h.body.rotation.x=-1.5;a.h.body.position.y=-.7;Softs.remove(a.soft);feed(a.name+' KIA');Comms.say('vesta','We lost '+a.name.replace('PVT. ','Private ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())+'.',{dur:2.4});},
 pull(R){for(const a of this.list){if(a.state==='dead'||a.state==='leave')continue;const i=ci(a.pos.x),j=ci(a.pos.z);if(inRoom(R,i,j,0))continue;
   const back=V3(P.pos.x-Math.sin(P.yaw)*-1.8+rand(-1.2,1.2),0,P.pos.z-Math.cos(P.yaw)*-1.8+rand(-1.2,1.2));const kk=idx(ci(back.x),ci(back.z));
   if(grid.t[kk]===T_FLOOR&&inRoom(R,ci(back.x),ci(back.z),0)){a.pos.set(back.x,surfaceAt(back.x,back.z),back.z);}else a.pos.set(P.pos.x+rand(-.6,.6),P.pos.y,P.pos.z+rand(-.6,.6));}},
 leave(){for(const a of this.list){if(a.state==='dead')continue;a.state='leave';a.soft.attract=0;a.soft.invuln=true;}},
 clear(){for(const a of this.list){scene.remove(a.h.g);Softs.remove(a.soft);}this.list.length=0;},
 nearestTarget(a){let best=null,bd=32;for(const e of enemies){if(e.hp<=0||e.spawnT>0)continue;if(e.cloakMats&&e.cloakA<.5)continue;if(e.type==='crystal'&&!G.bossE)continue;
   const d=Math.hypot(e.pos.x-a.pos.x,e.pos.z-a.pos.z);if(d<bd){bd=d;best=e;}}return best;},
 los(from,to){const d=to.clone().sub(from);const L=d.length();ray.set(from,d.normalize());ray.far=L;return!ray.intersectObjects(solidMeshes,false).length;},
 tick(dt){this.chatT-=dt;
  for(let n=this.list.length-1;n>=0;n--){const a=this.list[n],h=a.h;a.moving=false;
   if(a.state==='dead'){a.deadT-=dt;if(a.deadT<=0){scene.remove(h.g);this.list.splice(n,1);}continue;}
   if(a.state==='down'){a.bleed-=dt;const d=Math.hypot(P.pos.x-a.pos.x,P.pos.z-a.pos.z);
     if(d<2.4){a.rev+=dt/2.2;if(Math.random()<.3)burst(a.pos.clone().setY(a.pos.y+.8),0x8ee05a,1,1.5,.5,.3);if(a.rev>=1)this.revive(a);}else a.rev=Math.max(0,a.rev-dt*.5);
     if(a.bleed<=0){if(a.rook)this.revive(a,true);else this.die(a);}animHuman(h,a,dt);continue;}
   if(a.state==='leave'){animHuman(h,a,dt);continue;}
   // regen
   a.regenT-=dt;if(a.regenT<=0&&a.hp<a.max)a.hp=Math.min(a.max,a.hp+a.max*.04*dt);
   // movement: hold a slot behind and beside the player
   const slotA=P.yaw+Math.PI+(a.slot%2?1:-1)*(.55+Math.floor(a.slot/2)*.45);
   const want=V3(P.pos.x-Math.sin(slotA)*3.2,0,P.pos.z-Math.cos(slotA)*3.2);
   const dP=Math.hypot(P.pos.x-a.pos.x,P.pos.z-a.pos.z),dW=Math.hypot(want.x-a.pos.x,want.z-a.pos.z);
   if(dP>42){a.pos.set(P.pos.x+rand(-1,1),P.pos.y,P.pos.z+rand(-1,1));}
   else if(dP>4.5||dW>2.2){const spd=dP>12?9:6.4;const dir=new THREE.Vector3();
     if(dP>6){navDir({pos:a.pos},dir);}else dir.set(want.x-a.pos.x,0,want.z-a.pos.z).normalize();
     a.pos.addScaledVector(dir,spd*dt);a.moving=true;a.moveA=Math.atan2(dir.x,dir.z);}
   for(const b of this.list){if(b===a||b.state==='dead')continue;const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<1.1&&d>0){a.pos.x+=dx/d*(1.1-d)*.5;a.pos.z+=dz/d*(1.1-d)*.5;}}
   {const dx=a.pos.x-P.pos.x,dz=a.pos.z-P.pos.z,d=Math.hypot(dx,dz);if(d<1.2&&d>0){a.pos.x+=dx/d*(1.2-d);a.pos.z+=dz/d*(1.2-d);}}
   resolveXZ(a.pos,.35,a.pos.y,1.8);const sy=surfaceAt(a.pos.x,a.pos.z);a.pos.y+=(sy-a.pos.y)*Math.min(1,dt*10);
   // unstick
   if(a.moving){if(a.pos.distanceTo(a.last)<dt*1.2){a.stuckT+=dt;if(a.stuckT>2.5&&dP>8){a.pos.set(P.pos.x+rand(-1,1),P.pos.y,P.pos.z+rand(-1,1));a.stuckT=0;}}else a.stuckT=0;}a.last.copy(a.pos);
   // combat
   a.cd-=dt;const tgt=this.nearestTarget(a);
   if(tgt){a.faceA=Math.atan2(tgt.pos.x-a.pos.x,tgt.pos.z-a.pos.z);
     if(a.cd<=0){const from=a.pos.clone().setY(a.pos.y+1.45);const to=tgt.pos.clone().setY(tgt.pos.y+(tgt.T.flying?2.6:1.1)*tgt.size*(tgt.T.static?1.4:1));
       if(this.los(from,to)){a.burst=(a.burst||0)+1;const miss=Math.random()<.22;const end=miss?to.clone().add(V3(rand(-1,1),rand(-.5,1),rand(-1,1))):to;
         tracer(from,end,a.rook?0xffcf8a:0x9ad8ff,.03,.06);tone('',2400,0,.05,.07,true);
         if(!miss)allyDamage(tgt,(9+G.levelIdx*.9)*(a.rook?1.35:1)*(tgt.boss?.7:1),to);
         if(tgt.hp<=0&&Math.random()<.35)this.chat('marineKill');
         if(a.burst>=3){a.burst=0;a.cd=rand(.9,1.5);}else a.cd=.13;}
       else a.cd=.4;}}
   else if(a.moving)a.faceA=a.moveA;
   h.armR.rotation.x=tgt?-1.45:-1.2;animHuman(h,a,dt);}
 }
};
frameHooks.push(dt=>{if(Allies.list.length)Allies.tick(dt);});
