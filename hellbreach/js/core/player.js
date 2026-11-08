/* ---------- PLAYER ---------- */
const P={pos:new THREE.Vector3(),vel:new THREE.Vector3(),yaw:0,pitch:0,hp:100,maxHp:100,armor:0,maxArmor:100,nades:3,maxNades:5,onGround:true,height:1.6,radius:.4,weapon:0,ammo:{},cool:0,reloading:0,zoom:false,hurtT:0,spin:0,meleeCd:0,nadeCd:0};
const keys={};let mouseDown=false;
function resolveXZ(pos,rad,feet,height){
  for(const s of solids){
    if(feet>=s.max.y-.05||feet+height<=s.min.y)continue;
    const cx=clamp(pos.x,s.min.x,s.max.x),cz=clamp(pos.z,s.min.z,s.max.z);
    const dx=pos.x-cx,dz=pos.z-cz,d2=dx*dx+dz*dz;
    if(d2<rad*rad){
      if(d2>1e-6){const d=Math.sqrt(d2);pos.x+=dx/d*(rad-d);pos.z+=dz/d*(rad-d);}
      else{const px=Math.min(pos.x-s.min.x,s.max.x-pos.x),pz=Math.min(pos.z-s.min.z,s.max.z-pos.z);
        if(px<pz)pos.x=(pos.x-s.min.x<s.max.x-pos.x)?s.min.x-rad:s.max.x+rad;else pos.z=(pos.z-s.min.z<s.max.z-pos.z)?s.min.z-rad:s.max.z+rad;}
    }
  }
  pos.x=clamp(pos.x,-ARENA+rad,ARENA-rad);pos.z=clamp(pos.z,-ARENA+rad,ARENA-rad);
}
function groundAt(x,z,feet,rad){
  let g=0;for(const s of solids){if(x+rad>s.min.x&&x-rad<s.max.x&&z+rad>s.min.z&&z-rad<s.max.z&&s.max.y<=feet+.45)g=Math.max(g,s.max.y);}return g;
}
function inSolid(p){for(const b of solids){if(p.x>b.min.x&&p.x<b.max.x&&p.z>b.min.z&&p.z<b.max.z&&p.y<b.max.y&&p.y>b.min.y)return b;}return null;}

/* ---------- GUN VIEWMODEL ---------- */
const gunScene=new THREE.Scene();const gunCam=new THREE.PerspectiveCamera(62,1,.01,10);gunScene.add(gunCam);
const gunRoot=new THREE.Group();gunCam.add(gunRoot);
const gunHemi=new THREE.HemisphereLight(0xfff0e0,0x663322,.85);gunScene.add(gunHemi);
const gunKey=new THREE.DirectionalLight(0xffd8c0,.9);gunKey.position.set(-1,2,1.5);gunScene.add(gunKey);
const gunLight=new THREE.PointLight(0xffc06a,0,3);gunCam.add(gunLight);gunLight.position.set(.2,0,-.9);
let gunModel=null,flash=null,flashLight=null,barrels=null;
function buildGun(w){
  if(gunModel)gunRoot.remove(gunModel);gunModel=new THREE.Group();barrels=null;
  const metal=GFX.mat(0x6a6c76,'metal',{size:128,rough:.55,metal:.45}),dark=GFX.mat(0x2a2a30,'metal',{size:128,rough:.6,metal:.4}),wood=GFX.mat(0x8a5428,'wood',{size:128}),acc=mat(w.col,new THREE.Color(w.col).multiplyScalar(.06).getHex());
  const part=(m,sx,sy,sz,x,y,z,par=gunModel)=>{const b=new THREE.Mesh(rboxGeo,m);b.scale.set(sx,sy,sz);b.position.set(x,y,z);par.add(b);return b;};
  const cyl=(m,r,l,x,y,z,par=gunModel)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,8),m);c.rotation.x=Math.PI/2;c.position.set(x,y,z);par.add(c);return c;};
  let L=.5;
  switch(w.id){
    case 'pistol':L=.32;part(metal,.08,.1,L,0,0,-L/2);part(dark,.07,.17,.09,0,-.12,-.05);part(acc,.085,.03,L*.9,0,.065,-L/2);break;
    case 'shotgun':L=.8;cyl(metal,.04,L,0,.02,-L/2);cyl(dark,.035,L*.8,0,-.05,-L*.45);part(wood,.1,.08,.22,0,-.06,-L*.55);part(wood,.08,.12,.2,0,-.04,.02);break;
    case 'rifle':L=.75;part(metal,.08,.1,L,0,0,-L/2);part(dark,.06,.18,.08,0,-.13,-L*.5);part(dark,.06,.15,.07,0,-.12,-.05);part(acc,.05,.07,.18,0,.1,-L*.35);cyl(dark,.02,.25,0,.01,-L-.1);part(metal,.07,.09,.22,0,-.01,.12);break;
    case 'sshot':L=.7;cyl(metal,.045,L,-.045,.02,-L/2);cyl(metal,.045,L,.045,.02,-L/2);part(wood,.14,.11,.22,0,-.06,0);part(wood,.12,.06,.25,0,-.05,-L*.3);break;
    case 'chain':L=.75;barrels=new THREE.Group();barrels.position.set(0,0,-L/2);gunModel.add(barrels);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cyl(metal,.025,L,Math.cos(a)*.07,Math.sin(a)*.07,0,barrels);}part(dark,.18,.18,.18,0,0,-.02);part(acc,.06,.15,.1,0,-.15,-.05);break;
    case 'sniper':L=1;part(metal,.07,.09,L,0,0,-L/2);cyl(dark,.05,.35,0,.12,-L*.35);part(wood,.09,.13,.22,0,-.04,.02);part(dark,.06,.16,.07,0,-.13,-.05);cyl(dark,.02,.3,0,0,-L-.12);break;
    case 'rocket':L=.9;cyl(metal,.1,L,0,.03,-L/2);part(acc,.24,.24,.08,0,.03,-L);part(dark,.06,.16,.08,0,-.14,-L*.35);part(dark,.06,.16,.08,0,-.14,-.05);break;
    case 'plasma':L=.75;part(metal,.12,.14,L,0,0,-L/2);for(let i=0;i<4;i++)part(acc,.15,.03,.04,0,.02,-.15-i*.13);part(acc,.06,.06,.2,0,.1,-L*.4);part(dark,.06,.17,.08,0,-.15,-.06);break;
    case 'anni':L=.85;part(metal,.22,.2,L,0,0,-L/2);const core=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:w.col}));core.position.set(0,.13,-L*.4);gunModel.add(core);part(acc,.26,.05,.06,0,0,-L);part(acc,.05,.26,.06,0,0,-L);part(dark,.08,.18,.1,0,-.17,-.05);break;
  }
  flash=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0}));flash.scale.set(.2,.2,.2);flash.position.set(0,.02,-L-.08);gunModel.add(flash);
  gunModel.userData.tip=new THREE.Vector3(0,.02,-L-.08);
  // hands
  const skin=skinMat(0x8a6a52),glove=skinMat(0x2e2e26);
  part(glove,.1,.1,.14,0,-.13,-.02);part(skin,.08,.08,.3,-.12,-.1,-L*.55).rotation.y=.4;
  gunRoot.add(gunModel);
}
gunRoot.position.set(.26,-.24,-.5);gunRoot.scale.setScalar(.85);
flashLight=new THREE.PointLight(0xffc06a,0,10);camera.add(flashLight);flashLight.position.set(.2,-.1,-.8);

/* ---------- PARTICLES ---------- */
const parts=[];const partGeo=new THREE.BoxGeometry(.15,.15,.15);
function burst(pos,col,n=10,spd=5,size=1,life=.7,stick=false){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(partGeo,mat(col));m.position.copy(pos);m.scale.setScalar(size*rand(.6,1.3));scene.add(m);
    parts.push({m,v:new THREE.Vector3(rand(-1,1),rand(.2,1.4),rand(-1,1)).multiplyScalar(spd),life:life*rand(.6,1.2),stick});}
}
const decals=[];
function bloodPool(x,z,s){if(S.gore!=='full')return;const m=new THREE.Mesh(boxGeo,mat(0x5a0404));m.scale.set(s*rand(.8,1.4),.02,s*rand(.8,1.4));m.position.set(x,.015+Math.random()*.005,z);m.rotation.y=Math.random()*3;scene.add(m);decals.push(m);if(decals.length>60)scene.remove(decals.shift());}
function blood(pos,n=6,spd=4){if(S.gore==='off'){burst(pos,0x777066,Math.ceil(n/2),spd*.6,.6,.4);return;}if(S.gore==='reduced')n=Math.ceil(n/2);burst(pos,0x8a0606,n,spd,.8,.7,true);burst(pos,0xb01010,Math.ceil(n/2),spd*.6,.6,.4);}
function gib(e){
  const p=e.pos.clone().setY(e.size*(e.T.flying?3:1));
  blood(p,30,10);if(S.gore!=='off'){burst(p,e.T.col,10,9,1.6,1.4,true);burst(p,0xe8d8c0,5,8,1,1.2,true);}else burst(p,0x555048,16,8,1.4,1);
  for(let i=0;i<4;i++)bloodPool(e.pos.x+rand(-1.5,1.5),e.pos.z+rand(-1.5,1.5),rand(.8,1.8));
  SFX.gib();
}
const tracers=[];
function tracer(a,b,col,w=.03,life=.06){
  const len=a.distanceTo(b);const m=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9}));
  m.scale.set(w,w,len);m.position.copy(a).lerp(b,.5);m.lookAt(b);scene.add(m);tracers.push({m,life,max:life});
}
const rings=[];
function ring(pos,col,maxR,life=.5){const m=new THREE.Mesh(new THREE.RingGeometry(.8,1,32),new THREE.MeshBasicMaterial({color:col,transparent:true,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y=.1;scene.add(m);rings.push({m,life,max:life,maxR});}
const flashes=[];
function lightFlash(pos,col,intensity,dist,life){const l=new THREE.PointLight(col,intensity,dist);l.position.copy(pos);scene.add(l);flashes.push({l,life,max:life,i:intensity});}

/* ---------- ENEMIES ---------- */
const enemies=[];const hitboxes=[];
function makeBody(T,s,boss=false){
  const g=new THREE.Group();
  const skin=skinMat(T.col),cloth=skinMat(T.shirt),dark=mat(0x1a1010),eye=mat(T.eye,T.eye),horn=mat(0xd8ccb0),tooth=mat(0xf0e8d0);
  const add=(m,sx,sy,sz,x,y,z,parent=g)=>{const b=new THREE.Mesh(rboxGeo,m);b.castShadow=true;b.scale.set(sx*s,sy*s,sz*s);b.position.set(x*s,y*s,z*s);parent.add(b);return b;};
  const legL=new THREE.Group(),legR=new THREE.Group(),armL=new THREE.Group(),armR=new THREE.Group();
  let head,hbS,hbY,hhY;
  if(T.flying){
    // floating demon: big head-body, horns, gaping maw, small claws
    const off=2.4;
    head=add(skin,1.2,1.1,1.1,0,off,0);
    add(dark,.7,.35,.1,0,off-.15,.56);for(let i=-2;i<=2;i++){add(tooth,.08,.12,.06,i*.13,off+.02,.6);add(tooth,.08,.12,.06,i*.13,off-.3,.6);}
    add(eye,.32,.22,.06,0,off+.32,.56);add(dark,.1,.14,.07,0,off+.32,.58);
    for(let i=-1;i<=1;i+=2){add(horn,.14,.4,.14,i*.4,off+.7,0).rotation.z=-i*.4;add(skin,.15,.15,.6,i*.62,off-.2,.2);}
    for(let i=0;i<5;i++)add(cloth,.12,.12,.12,rand(-.5,.5),off+rand(-.4,.5),-.55);
    g.add(legL,legR,armL,armR);
    hbS=[1.25,1.15,1.15];hbY=off;hhY=off+.3;
  }else{
    const beast=T.beast;
    legL.position.set(-.16*s,.75*s,beast?-.1*s:0);legR.position.set(.16*s,.75*s,beast?-.1*s:0);armL.position.set(-.42*s,1.4*s,0);armR.position.set(.42*s,1.4*s,0);
    g.add(legL,legR,armL,armR);
    add(dark,.26,.75,.28,0,-.375,0,legL);add(dark,.26,.75,.28,0,-.375,0,legR);
    add(skin,.24,.72,.24,0,-.3,0,armL);add(skin,.24,.72,.24,0,-.3,0,armR);
    // claws
    for(const a of[armL,armR])for(let i=-1;i<=1;i++)add(horn,.04,.12,.04,i*.07,-.72,.06,a);
    if(beast){add(skin,.8,.75,.9,0,1.05,.05);add(cloth,.6,.2,.7,0,1.45,-.05);head=add(skin,.62,.5,.6,0,1.3,.55);add(dark,.5,.18,.05,0,1.2,.86);for(let i=-2;i<=2;i++)add(tooth,.07,.14,.05,i*.1,1.27,.88);
      add(eye,.1,.07,.03,-.18,1.48,.86);add(eye,.1,.07,.03,.18,1.48,.86);hhY=1.3;}
    else{
      add(cloth,.6,.72,.34,0,1.1,0);add(skin,.42,.3,.3,0,1.25,.06);
      for(let i=-1;i<=1;i+=2)add(cloth,.22,.12,.36,i*.38,1.5,0);
      head=add(skin,.5,.5,.5,0,1.72,0);
      add(eye,.12,.08,.02,-.12,1.76,.255);add(eye,.12,.08,.02,.12,1.76,.255);
      add(dark,.3,.08,.02,0,1.58,.255);for(let i=-1;i<=1;i++)add(tooth,.05,.06,.02,i*.09,1.59,.26);
      if(T.horns||boss){for(let i=-1;i<=1;i+=2){add(horn,.1,.3,.1,i*.2,2.05,0).rotation.z=-i*.35;add(horn,.07,.15,.07,i*.26,2.24,0).rotation.z=-i*.7;}}
      if(T.shot==='bullet'){add(dark,.08,.08,.5,0,-.65,.25,armR);}
      if(T.shot==='fire'){add(mat(0xff6a00,0xff4400),.16,.16,.16,0,-.78,.05,armR);}
      // spines on back
      for(let i=0;i<3;i++)add(horn,.07,.18,.07,0,1.3+i*.15,-.2).rotation.x=-.6;
      hhY=1.72;
    }
    hbS=[.75,1.45,.6];hbY=.72;
  }
  if(boss){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(horn,.1,.45,.1,Math.cos(a)*.3,(T.flying?3.2:2.1),Math.sin(a)*.3);}add(mat(0x3a0a00,0xff2200),.7,.08,.5,0,1.25,.2);}
  const gen=S.aimAssist?1.35:1.1;const hb=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));hb.scale.set(hbS[0]*s*gen,hbS[1]*s*1.05,hbS[2]*s*gen);hb.position.y=hbY*s;g.add(hb);
  const hh=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));hh.scale.set(.56*s*gen,.6*s,.56*s*gen);hh.position.y=hhY*s;if(T.beast)hh.position.z=.55*s;if(T.flying)hh.scale.multiplyScalar(1.3);g.add(hh);
  return {g,legL,legR,armL,armR,head,hb,hh};
}
function spawnEnemy(type,x,z){
  const T=ENEMY[type];const B=makeBody(T,T.size);
  const diff=(1+(G.levelIdx||0)*.16+(G.survival?G.wave*.07:0))*DIFFS[S.diff].hp;
  const e={type,T,body:B,pos:new THREE.Vector3(x,0,z),hp:T.hp*diff,max:T.hp*diff,cd:rand(.8,2),t:rand(0,6),hurt:0,boss:false,size:T.size,speed:T.speed*rand(.9,1.1),dmg:T.dmg*(1+(G.levelIdx||0)*.1),vy:0,spawnT:.6};
  B.g.position.copy(e.pos);B.g.scale.setScalar(.01);scene.add(B.g);
  B.hb.userData.e=e;B.hh.userData.e=e;B.hh.userData.head=true;hitboxes.push(B.hb,B.hh);
  addHealthBar(e);enemies.push(e);burst(new THREE.Vector3(x,.5,z),0xff4a00,12,4,1,.6);ring(new THREE.Vector3(x,0,z),0xff3a00,2,.5);if(Math.random()<.3)SFX.growl();return e;
}
function spawnBoss(def){
  const T=Object.assign({},def,{horns:true,score:600,coins:150});
  const B=makeBody(T,def.size,true);
  const hpScale=(G.survival?(1+G.wave*.12):1)*DIFFS[S.diff].hp;
  const e={type:'boss',T,body:B,pos:new THREE.Vector3(0,0,22),hp:def.hp*hpScale,max:def.hp*hpScale,cd:2,t:0,hurt:0,boss:true,size:def.size,speed:def.speed,dmg:22,def,atk:null,atkT:0,spawnT:1.2,vy:0};
  B.g.position.copy(e.pos);scene.add(B.g);B.hb.userData.e=e;B.hh.userData.e=e;B.hh.userData.head=true;hitboxes.push(B.hb,B.hh);
  enemies.push(e);G.bossE=e;$('boss').hidden=false;$('bname').textContent=def.name;
  ring(e.pos,0xff2200,16,1.2);lightFlash(e.pos.clone().setY(4),0xff3300,6,40,1.2);SFX.boss();shake(.8);
  return e;
}
function removeEnemy(e){
  scene.remove(e.body.g);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
  for(const h of[e.body.hb,e.body.hh]){const k=hitboxes.indexOf(h);if(k>=0)hitboxes.splice(k,1);}
}
function damageEnemy(e,amt,head,point,src){
  if(e.hp<=0)return;
  if(head)amt*=2;const shown=Math.min(amt,Math.max(1,e.hp));e.hp-=amt;e.hurt=.12;e.flinch=.15;
  dmgNumber((point||e.pos.clone().setY(1.5)).clone(),shown,head);
  blood(point||e.pos.clone().setY(1),head?8:4,head?5:3);
  const c=$('cross');c.className=head?'head':'hit';clearTimeout(c._t);c._t=setTimeout(()=>c.className='',90);hitMark(head?'hd':'');
  head?SFX.head():SFX.hit();
  // knockback
  if(!e.boss&&point){const k=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z).normalize().multiplyScalar(Math.min(.6,amt/120));e.pos.add(k);}
  if(e.hp<=0)killEnemy(e,head,-e.hp>e.max*.35||src==='explosive'||src==='melee');
}
function killEnemy(e,head,overkill){
  SFX.die();hitMark('kill');const p=e.pos.clone();p.y=e.size*(e.T.flying?2.6:1);
  spawnOrbs(e.pos.x,e.size*(e.T.flying?2.4:1),e.pos.z,e.boss?14:(e.finished?6:2+Math.floor(e.size*1.5)),e.boss?6:(e.finished?5:3));
  if(overkill||e.boss){gib(e);if(!e.boss)feed('SPLATTERED');}else{blood(p,16,6);burst(p,e.T.col,8,5,1.1,.9,true);bloodPool(e.pos.x,e.pos.z,1.2);}
  if(e.boss){burst(p,0xffaa00,60,14,2,1.6);lightFlash(p,0xff6600,8,50,1);}
  G.score+=e.T.score*(head?2:1)*(overkill?1.5:1)|0;G.kills++;G.earned+=Math.round(e.T.coins*DIFFS[S.diff].coins);SFX.coin();
  const now=G.time;if(now-G.lastKill<2){G.streak++;}else G.streak=1;G.lastKill=now;
  const names={2:'DOUBLE KILL',3:'TRIPLE KILL',4:'RAMPAGE',5:'MASSACRE',6:'RIP AND TEAR'};
  if(G.streak>=2){feed(names[Math.min(G.streak,6)]+' +'+(G.streak*5));G.score+=G.streak*5;}
  else if(head)feed('HEADSHOT +'+e.T.coins+'c');
  const roll=Math.random();
  if(e.boss){for(let i=0;i<3;i++)dropPickup(e.pos.x+rand(-3,3),e.pos.z+rand(-3,3),'hp');dropPickup(e.pos.x,e.pos.z,'armor');dropPickup(e.pos.x+2,e.pos.z,'nade');}
  else if(roll<.08)dropPickup(e.pos.x,e.pos.z,'hp');else if(roll<.13)dropPickup(e.pos.x,e.pos.z,'armor');else if(roll<.19)dropPickup(e.pos.x,e.pos.z,'ammo');else if(roll<.24)dropPickup(e.pos.x,e.pos.z,'nade');
  if(e.boss){G.bossE=null;$('boss').hidden=true;shake(1.2);SFX.explode();}
  removeEnemy(e);
}

/* ---------- PROJECTILES ---------- */
const shots=[];
const projGeo=new THREE.BoxGeometry(.35,.35,.35);
function fireOrb(from,dir,speed,dmg,col,size=1,owner='enemy',extra={}){
  const m=new THREE.Mesh(projGeo,new THREE.MeshBasicMaterial({color:col}));m.scale.setScalar(size);m.position.copy(from);scene.add(m);
  const s=Object.assign({m,v:dir.clone().normalize().multiplyScalar(speed),dmg,owner,life:6,spin:rand(-8,8),col},extra);shots.push(s);return s;
}
function explode(pos,radius,dmg,col=0xff8a3a){
  SFX.explode();shake(Math.min(1.2,.25+radius*.06));burst(pos,col,30,radius*2,1.4,.9);burst(pos,0x2a2a2a,14,5,1.8,1.4);ring(pos,col,radius,.45);lightFlash(pos,col,2.5,radius*3,.3);
  for(const e of enemies.slice()){const d=e.pos.distanceTo(pos.clone().setY(e.pos.y));if(d<radius+e.size*.4)damageEnemy(e,dmg*(1-d/(radius+e.size)*.5),false,e.pos.clone().setY(1),'explosive');}
  const pd=P.pos.distanceTo(pos);if(pd<radius*.55)hurtPlayer(Math.min(35,dmg*.15)*(1-pd/radius));
  // push player
  if(pd<radius){const k=P.pos.clone().sub(pos).setY(0).normalize().multiplyScalar(10*(1-pd/radius));P.vel.add(k);P.vel.y+=4*(1-pd/radius);}
}

/* ---------- GRENADES ---------- */
const grenades=[];const nadeGeo=new THREE.SphereGeometry(.13,6,5);
function throwGrenade(){
  if(P.nades<=0||P.nadeCd>0||G.state!=='play')return;
  P.nades--;P.nadeCd=.6;SFX.pin();
  const d=new THREE.Vector3();camera.getWorldDirection(d);
  const m=new THREE.Mesh(nadeGeo,mat(0x3a4a2a));const pin=new THREE.Mesh(boxGeo,mat(0xff2200,0xff2200));pin.scale.setScalar(.06);pin.position.y=.13;m.add(pin);
  m.position.copy(camera.position).addScaledVector(d,.6);m.position.y-=.2;scene.add(m);
  const v=d.clone().multiplyScalar(19);v.y+=5;v.x+=P.vel.x*.5;v.z+=P.vel.z*.5;
  grenades.push({m,v,fuse:2,pin});feed('FRAG OUT!');
}
function updateGrenades(dt){
  for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.fuse-=dt;g.v.y-=24*dt;
    const old=g.m.position.clone();g.m.position.addScaledVector(g.v,dt);g.m.rotation.x+=dt*10;
    g.pin.material=(Math.floor(g.fuse*8)%2)?mat(0xff2200,0xff2200):mat(0x330000);
    if(g.m.position.y<.13){g.m.position.y=.13;g.v.y*=-.35;g.v.x*=.7;g.v.z*=.7;}
    const hit=inSolid(g.m.position);if(hit){g.m.position.copy(old);if(old.y>=hit.max.y-.05){g.m.position.y=hit.max.y+.13;g.v.y*=-.35;g.v.x*=.7;g.v.z*=.7;}else{const cx=(hit.min.x+hit.max.x)/2,cz=(hit.min.z+hit.max.z)/2;if(Math.abs(old.x-cx)/(hit.max.x-hit.min.x)>Math.abs(old.z-cz)/(hit.max.z-hit.min.z))g.v.x*=-.5;else g.v.z*=-.5;}}
    // detonate early on direct demon contact
    let touch=false;for(const e of enemies){if(Math.hypot(g.m.position.x-e.pos.x,g.m.position.z-e.pos.z)<.5*e.size&&g.m.position.y<e.pos.y+e.size*2){touch=g.fuse<1.7;break;}}
    if(g.fuse<=0||touch){G._nade=true;explode(g.m.position.clone(),5.5,170,0xffa040);G._nade=false;scene.remove(g.m);grenades.splice(i,1);}
  }
}

/* ---------- PICKUPS ---------- */
const pickups=[];
function dropPickup(x,z,kind){
  const g=new THREE.Group();
  if(kind==='hp'){const a=new THREE.Mesh(boxGeo,mat(0xffffff,0x444444));a.scale.set(.5,.5,.2);const c1=new THREE.Mesh(boxGeo,mat(0xe8261c,0x880000));c1.scale.set(.36,.1,.22);const c2=c1.clone();c2.scale.set(.1,.36,.22);g.add(a,c1,c2);}
  else if(kind==='armor'){const a=new THREE.Mesh(boxGeo,mat(0x8ee05a,0x2a5a10));a.scale.set(.5,.55,.2);const b=new THREE.Mesh(boxGeo,mat(0x2a4a1a));b.scale.set(.2,.3,.22);b.position.y=.05;g.add(a,b);}
  else if(kind==='nade'){for(let i=0;i<2;i++){const n=new THREE.Mesh(nadeGeo,mat(0x3a4a2a,0x0a1a00));n.scale.setScalar(1.5);n.position.x=i*.3-.15;g.add(n);}}
  else{const a=new THREE.Mesh(boxGeo,mat(0xffae1f,0x553300));a.scale.set(.45,.3,.28);g.add(a);}
  g.position.set(x,.6,z);scene.add(g);pickups.push({g,kind,t:0,life:30});
}

/* ---------- PLAYER COMBAT ---------- */
const ray=new THREE.Raycaster();
const tmpD=new THREE.Vector3();
let recoil=0,bob=0,shakeAmt=0;
function shake(a){shakeAmt=Math.max(shakeAmt,a*S.shake);}
function curW(){return WEAPONS[P.weapon];}
function muzzleWorld(){gunCam.updateMatrixWorld(true);const t=gunModel.userData.tip.clone();gunModel.localToWorld(t);t.z*=1.1;return t.applyMatrix4(camera.matrixWorld);}
function tryFire(){
  const w=curW();if(P.cool>0||P.reloading>0)return;
  if(G.trial&&G.trial.T.noGuns){if(!P._gl||G.time-P._gl>1.5){P._gl=G.time;feed('GUNS LOCKED: USE MELEE AND GRENADES');}return;}
  if(w.spin&&P.spin<1)return;
  if(P.ammo[w.id]<=0){startReload();return;}
  P.ammo[w.id]--;P.cool=w.rate;recoil=Math.min(recoil+w.kick,.4);SFX[w.sound]();
  flash.material.opacity=1;flash.rotation.z=Math.random()*3;flashLight.intensity=w.plasma?1:3;flashLight.color.set(w.proj?w.col:0xffc06a);
  if(w.kick>.15)shake(w.kick*.5);
  camera.updateMatrixWorld(true);for(const e of enemies)e.body.g.updateMatrixWorld(true);
  camera.getWorldDirection(tmpD);const origin=camera.getWorldPosition(new THREE.Vector3());const muzzle=muzzleWorld();
  if(w.proj){
    const d=tmpD.clone();d.x+=rand(-1,1)*w.spread;d.y+=rand(-1,1)*w.spread;
    if(w.big)fireOrb(muzzle,d,w.speed,w.dmg,w.col,3,'player',{rocket:true,splash:w.splash,ecol:w.col,glow:true});
    else if(w.tri){for(const a of[-.045,0,.045]){fireOrb(muzzle,d.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a),w.speed,w.dmg,w.col,.5,'player',{plasma:true});}}
    else if(w.plasma)fireOrb(muzzle,d,w.speed,w.dmg,w.col,.55,'player',{plasma:true});
    else fireOrb(muzzle,d,w.speed,w.dmg,0xff6a3a,.9,'player',{rocket:true,splash:w.splash});
    return;
  }
  const spreadMul=P.zoom?.35:1;
  for(let p=0;p<w.pellets;p++){
    const d=tmpD.clone();d.x+=rand(-1,1)*w.spread*spreadMul;d.y+=rand(-1,1)*w.spread*spreadMul;d.z+=rand(-1,1)*w.spread*spreadMul;d.normalize();
    ray.set(origin,d);ray.far=140;
    const hits=ray.intersectObjects(hitboxes.concat(solidMeshes),false);
    let end=origin.clone().addScaledVector(d,90);const done=new Set();
    for(const h of hits){
      if(!h.object.userData.e){end=h.point;burst(h.point,0x9a8a7a,2,2,.6,.3);break;}
      const e=h.object.userData.e;if(done.has(e))continue;done.add(e);
      const headHit=hits.find(x=>x.object.userData.e===e&&x.object.userData.head&&x.distance<h.distance+.8);
      let dmg=w.dmg;if(w.pellets>1){const dd=h.distance;dmg*=dd<8?1:Math.max(.35,1-(dd-8)/22);}
      damageEnemy(e,dmg,!!headHit,h.point);end=h.point;
      if(w.burn&&e.hp>0)e.burnT=Math.max(e.burnT||0,4);if(w.chain)chainLightning(e,dmg*.6,h.point);
      if(!w.pierce)break;
    }
    if(w.rail){tracer(muzzle,end,0x5affff,.16,.5);tracer(muzzle,end,0xffffff,.05,.25);}
    else if(p%3===0||w.pellets===1)tracer(muzzle,end,w.burn?0xff8a1a:w.pierce?0xbfe0ff:0xffd9a0,w.pierce?.05:.02,w.pierce?.15:.04);
  }
}
function melee(){
  if(P.meleeCd>0||G.state!=='play')return;P.meleeCd=.55;SFX.punch();
  gunRoot.position.z=-.75;if(save.perks&&save.perks.blade&&typeof swingBlade==='function')swingBlade();
  const d=new THREE.Vector3();camera.getWorldDirection(d);d.y=0;d.normalize();
  let hit=false;
  // finisher first: nearest staggered demon in reach, any direction you are roughly facing
  const st=finisherTarget();
  if(st){st.finished=true;const p=st.pos.clone().setY(1.2);P.pos.x=st.pos.x-d.x*1.2;P.pos.z=st.pos.z-d.z*1.2;
    damageEnemy(st,99999,false,p,'melee');P.hp=Math.min(P.maxHp,P.hp+20);P.armor=Math.min(P.maxArmor,P.armor+5);
    feed('FINISHER +20 HP');shake(.5);SFX.gib();$('gibflash').style.opacity=.35;setTimeout(()=>$('gibflash').style.opacity=0,120);return;}
  for(const e of enemies.slice()){const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();
    const blade=save.perks&&save.perks.blade;
    if(dist<2+e.size*.45+(blade?1.3:0)&&to.normalize().dot(d)>.4){hit=true;damageEnemy(e,e.boss?(blade?170:60):(blade?420:75),false,e.pos.clone().setY(1.2),blade?'melee':'punch');
      if(!e.boss)e.pos.addScaledVector(to,2);}}
  if(hit)shake(.3);
}
function finisherTarget(){
  const d=new THREE.Vector3();camera.getWorldDirection(d);d.y=0;d.normalize();let best=null,bd=1e9;
  for(const e of enemies){if(!e.staggered||e.hp<=0)continue;const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();
    if(dist<3.6+e.size*.4&&(dist<1.6||to.normalize().dot(d)>.2)&&dist<bd){bd=dist;best=e;}}
  return best;
}
function hitMark(kind){const h=$('hitm');if(!h)return;if(h.classList.contains('kill')&&kind!=='kill')return;h.className='on '+kind;void h.offsetWidth;clearTimeout(h._t);h._t=setTimeout(()=>h.className='',kind==='kill'?380:180);}
function startReload(){const w=curW();if(P.reloading>0||P.ammo[w.id]===w.mag)return;P.reloading=w.reload;SFX.reload();}
function hurtPlayer(d){
  if(G.state!=='play'||d<=0)return;d*=DIFFS[S.diff].dmg;
  if(P.armor>0){const absorb=Math.min(P.armor,d*.6);P.armor-=absorb;d-=absorb;}
  P.hp-=d;P.hurtT=.3;SFX.hurt();shake(.18);G.tookDamage=true;
  $('vig').style.opacity=.6;setTimeout(()=>$('vig').style.opacity=0,160);
  if(P.hp<=0){P.hp=0;endRun(false);}
}
function switchWeapon(i){
  if(i<0||i>=WEAPONS.length||!save.owned.includes(WEAPONS[i].id)||i===P.weapon&&gunModel)return;
  P.weapon=i;P.reloading=0;P.cool=.3;P.spin=0;P.zoom=false;buildGun(WEAPONS[i]);gunRoot.position.y=-.6;updateSlots();
}
function cycleWeapon(dir){
  const owned=WEAPONS.map((w,i)=>save.owned.includes(w.id)?i:-1).filter(i=>i>=0);
  const k=owned.indexOf(P.weapon);switchWeapon(owned[(k+dir+owned.length)%owned.length]);
}
