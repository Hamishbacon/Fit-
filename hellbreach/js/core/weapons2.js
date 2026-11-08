/* ---------- NEW WEAPONS ---------- */
WEAPONS.push(
 {id:'chainsaw',name:'RIPPER CHAINSAW',cost:900,dmg:28,rate:.09,mag:100,reload:0,spread:0,pellets:1,auto:true,col:0xffaa22,kick:.01,sound:'saw',saw:true,desc:'Hold fire to carve anything in front of you. Kills drop ammo and armor. Fuel refills on its own.'},
 {id:'flamer',name:'INCINERATOR',cost:1200,dmg:11,rate:.06,mag:120,reload:2.2,spread:0,pellets:1,auto:true,col:0xff6a1a,kick:.005,sound:'flame',flamer:true,desc:'Short-range torrent of fire. Everything it touches burns.'},
 {id:'nadel',name:'GRENADE LAUNCHER',cost:1500,dmg:150,rate:.65,mag:6,reload:2,spread:.01,pellets:1,auto:false,col:0x8aa83a,kick:.18,proj:true,lob:true,speed:27,splash:4.6,sound:'rocket',desc:'Lobs explosive shells in an arc. Bank them over cover.'},
 {id:'eternity',name:'ETERNITY CANNON',cost:0,mythic:true,dmg:2600,rate:3,mag:1,reload:4,spread:0,pellets:1,auto:false,col:0x3aff6a,kick:.5,proj:true,bfg:true,speed:13,splash:13,sound:'anni',heavy:true,desc:'Mythic. A slow orb that shreds everything near its path, then erases the room. Earned by collecting all 20 Doom Sigils.'}
);
SFX.saw=()=>tone('sawtooth',95+Math.random()*25,80,.1,.12);SFX.flame=()=>tone('',900,0,.08,.12,true);
function ownedIdx(){return WEAPONS.map((w,i)=>save.owned.includes(w.id)?i:-1).filter(i=>i>=0);}
updateSlots=function(){const o=ownedIdx();$('slots').innerHTML=o.map((wi,n)=>'<span class="'+(wi===P.weapon?'on':'')+(masteryTier(WEAPONS[wi].id)>=4?' gold':'')+'">'+(n<9?n+1:'·')+'</span>').join('');};
const MASTERY=[50,200,600,1500];
function masteryTier(id){const k=(save.wk&&save.wk[id])||0;let t=0;for(const m of MASTERY)if(k>=m)t++;return t;}
const _tfW=tryFire;
tryFire=function(){
  const w=curW();
  if(!(w.saw||w.flamer||w.lob||w.bfg)){const b=P.cool;_tfW();if(P.cool>b&&typeof fireMul==='function')P.cool*=fireMul();return;}
  if(P.cool>0||P.reloading>0)return;
  if(G.trial&&G.trial.T.noGuns){_tfW();return;}
  if(P.ammo[w.id]<=0){if(!w.saw)startReload();return;}
  P.cool=w.rate*(typeof fireMul==='function'?fireMul():1);
  camera.updateMatrixWorld(true);const d=new THREE.Vector3();camera.getWorldDirection(d);const o=camera.getWorldPosition(new THREE.Vector3());const muzzle=muzzleWorld();
  if(w.saw){SFX.saw();let hit=false;
    for(const e of enemies.slice()){if(e.hp<=0)continue;const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();if(dist<2.6+e.size*.45&&to.normalize().dot(new THREE.Vector3(d.x,0,d.z).normalize())>.45&&Math.abs(e.pos.y-P.pos.y)<2.5){hit=true;e.lastW='chainsaw';damageEnemy(e,w.dmg*(e.boss?.6:1),false,e.pos.clone().setY(e.pos.y+1.1*e.size),'saw');if(!e.boss)e.stunT=Math.max(e.stunT||0,.15);}}
    if(hit){P.ammo[w.id]=Math.max(0,P.ammo[w.id]-1);shake(.08);recoil=Math.min(.12,recoil+.03);}
    gunRoot.position.x+=rand(-.01,.01);return;}
  P.ammo[w.id]--;recoil=Math.min(recoil+w.kick,.4);SFX[w.sound]();flash.material.opacity=1;flashLight.intensity=2;flashLight.color.set(w.col);
  if(w.flamer){for(let i=0;i<3;i++){const v=d.clone().multiplyScalar(rand(11,16));v.x+=rand(-1.2,1.2);v.y+=rand(-.6,1.2);v.z+=rand(-1.2,1.2);const m=new THREE.Mesh(partGeo,mat(Math.random()<.5?0xff7a00:0xffcc33,0xff5500));m.position.copy(muzzle);m.scale.setScalar(rand(1.2,2.4));scene.add(m);parts.push({m,v,life:rand(.35,.6)});}
    const fl=new THREE.Vector3(d.x,0,d.z).normalize();
    for(const e of enemies.slice()){if(e.hp<=0)continue;const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();if(dist<9+e.size*.4&&(dist<1.8||to.normalize().dot(fl)>.82)){e.lastW='flamer';if(!(e.burnT>0)&&typeof stat==='function')stat('burns');e.burnT=Math.max(e.burnT||0,4);damageEnemy(e,w.dmg,false,null,'flame');}}return;}
  if(w.lob){const dd=d.clone();dd.y+=.22;fireOrb(muzzle,dd,w.speed,w.dmg,w.col,.7,'player',{rocket:true,splash:w.splash,ecol:0xaaff44,pre:(s,dt)=>{s.v.y-=16*dt;}});return;}
  if(w.bfg){shake(.6);let tk=0;fireOrb(muzzle,d,w.speed,w.dmg,w.col,3.2,'player',{rocket:true,splash:w.splash,ecol:0x3aff6a,glow:true,life:7,pre:(s,dt)=>{tk-=dt;s.m.rotation.y+=dt*6;if(tk>0)return;tk=.12;
    for(const e of enemies.slice()){if(e.hp<=0||e.T.static&&e.type!=='gate')continue;const p=e.pos.clone().setY(e.pos.y+1.2*e.size);if(p.distanceTo(s.m.position)<9){e.lastW='eternity';tracer(s.m.position.clone(),p,0x6aff8a,.08,.12);damageEnemy(e,80,false,p,'proj');}}}});}
};
const _rlW=startReload;startReload=function(){if(curW().saw)return;_rlW();if(P.reloading>0&&typeof reloadMul==='function'){P.reloading*=reloadMul();P.reloadMax=P.reloading;}};
frameHooks.push(dt=>{const s=WEAPONS.find(w=>w.id==='chainsaw');if(P.ammo&&P.ammo.chainsaw<s.mag&&!(curW().saw&&(mouseDown||touchFire)))P.ammo.chainsaw=Math.min(s.mag,P.ammo.chainsaw+dt*6);});
/* models for the new guns, plus gold skins for mastered weapons */
const _bgW=buildGun;
buildGun=function(w){
  const custom={chainsaw:1,flamer:1,nadel:1,eternity:1}[w.id];
  _bgW(custom?Object.assign({},w,{id:'pistol'}):w);
  if(custom){const keep=gunModel.children.filter(c=>c.material===skinMat(0x8a6a52)||c.material===skinMat(0x2e2e26));gunModel.children.filter(c=>c!==flash&&!keep.includes(c)).forEach(c=>gunModel.remove(c));
    const metal=skinMat(0x5a5c66),dark=skinMat(0x2a2a30),acc=mat(w.col,new THREE.Color(w.col).multiplyScalar(.35).getHex());
    const part=(m,sx,sy,sz,x,y,z)=>boxIn(gunModel,m,sx,sy,sz,x,y,z);let L=.6;
    if(w.id==='chainsaw'){L=.85;part(dark,.16,.2,.32,0,-.02,0);part(acc,.18,.06,.3,0,.1,0);part(metal,.04,.13,.7,0,.02,-.5);for(let i=0;i<9;i++)part(skinMat(0xd8d8d8),.06,.04,.04,0,.1-(i%2)*.17,-.2-i*.075);}
    if(w.id==='flamer'){L=.7;const t=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.34,8),acc);t.position.set(0,-.12,-.05);gunModel.add(t);part(metal,.09,.1,.6,0,0,-.35);part(dark,.12,.12,.1,0,0,-.66);}
    if(w.id==='nadel'){L=.7;const t=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.22,8),acc);t.rotation.z=Math.PI/2;t.position.set(0,-.02,-.2);gunModel.add(t);part(metal,.1,.12,.7,0,.04,-.38);part(dark,.08,.16,.08,0,-.14,-.05);}
    if(w.id==='eternity'){L=.85;part(metal,.26,.24,.85,0,0,-.42);const c=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mat(w.col,w.col));c.position.set(0,.16,-.35);gunModel.add(c);for(let i=0;i<4;i++)part(acc,.3,.05,.04,0,0,-.2-i*.17);part(dark,.1,.18,.12,0,-.18,-.05);}
    gunModel.userData.tip.set(0,.02,-L-.08);flash.position.copy(gunModel.userData.tip);}
  if(masteryTier(w.id)>=4){const keep=gunModel.children.filter(c=>c.material===skinMat(0x8a6a52)||c.material===skinMat(0x2e2e26));const gold=skinMat(0xd4a017);gunModel.children.forEach(c=>{if(c===flash||keep.includes(c)||!c.isMesh)return;if(c.material&&c.material.emissive&&c.material.emissive.getHex()>0)return;c.material=gold;});}
};

/* ---------- POWERS ---------- */
const POWERS={
 hook:{name:'MEAT HOOK',cd:7,desc:'Aim at a demon and yank yourself to it. Perfect with shotguns.',unlock:'Clear level 3',req:()=>(save.cleared||0)>=3},
 flame:{name:'FLAME BURST',cd:16,desc:'Ignite every demon in a cone. Burning demons drop armor shards when hit.',unlock:'Clear level 5',req:()=>(save.cleared||0)>=5},
 frost:{name:'FROST NOVA',cd:20,desc:'Freeze nearby demons solid. Frozen demons take 50% more damage.',unlock:'Clear level 7',req:()=>(save.cleared||0)>=7},
 slam:{name:'HELL SLAM',cd:12,desc:'Smash the ground, hurting and launching demons. Hits harder from higher up.',unlock:'Clear level 10',req:()=>(save.cleared||0)>=10},
 storm:{name:'TEMPEST',cd:18,desc:'Call lightning down on the nearest demons.',unlock:'Reach rank 25',req:()=>typeof rankOf==='function'&&rankOf()>=25},
 chrono:{name:'BULLET TIME',cd:30,desc:'Slow every demon and projectile to a crawl.',unlock:'Trial exclusive',req:()=>!!(save.perks&&save.perks.chrono)},
 bulwark:{name:'BULWARK',cd:24,desc:'A shield that soaks damage and reflects projectiles back at triple damage.',unlock:'Trial exclusive',req:()=>!!(save.perks&&save.perks.bulwark)}
};
const prank=id=>(save.prank&&save.prank[id])||0;
function powerCd(id){let c=POWERS[id].cd*(1-.1*prank(id))*(1-.06*(typeof sk==='function'?sk('focus'):0));if(id==='flame'&&save.upg.pyro)c*=.7;if(typeof relicOn==='function'){if(relicOn('pyre'))c*=.85;if(relicOn('eternal'))c*=.6;}return c;}
P.pcd={};
const POWER_FX={
 hook(r){camera.updateMatrixWorld(true);for(const e of enemies)e.body.g.updateMatrixWorld(true);const d=new THREE.Vector3();camera.getWorldDirection(d);ray.set(camera.position.clone(),d);ray.far=40+r*6;
   const h=ray.intersectObjects(hitboxes.concat(solidMeshes),false)[0];if(!h||!h.object.userData.e){feed('NO TARGET IN SIGHT');return false;}
   P.hook={e:h.object.userData.e,t:1.2};P.iframe=Math.max(P.iframe||0,.5);tone('sawtooth',300,900,.2,.2);stat('hooks');return true;},
 flame(r){const d=new THREE.Vector3();camera.getWorldDirection(d);const o=camera.position.clone();SFX.rocket();tone('',600,0,.6,.5,true);
   for(let i=0;i<40;i++){const v=d.clone().multiplyScalar(rand(8,16));v.x+=rand(-4,4);v.y+=rand(-1.5,3);v.z+=rand(-4,4);const m=new THREE.Mesh(partGeo,mat(Math.random()<.5?0xff7a00:0xffcc33,0xff5500));m.position.copy(o).addScaledVector(d,.8);m.position.y-=.3;m.scale.setScalar(rand(1.5,3));scene.add(m);parts.push({m,v,life:rand(.3,.55)});}
   lightFlash(o.clone().addScaledVector(d,3),0xff7a00,3,14,.4);const fl=new THREE.Vector3(d.x,0,d.z).normalize();let n=0;
   for(const e of enemies.slice()){if(e.T.static)continue;const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();if(dist<8+r*1.5+e.size*.4&&(dist<2||to.normalize().dot(fl)>.55)){e.burnT=e.boss?3:6+r;e.burnTick=0;n++;damageEnemy(e,14+r*8,false,e.pos.clone().setY(e.pos.y+1.2),'burn');}}
   stat('burns',n);feed(n?'IGNITED '+n:'FLAME BURST');return true;},
 frost(r){const rad=10+r*2;let n=0;ring(P.pos.clone(),0x9ae8ff,rad,.6);burst(P.pos.clone().setY(P.pos.y+1),0xcff4ff,40,10,1,.8);tone('sine',1800,400,.6,.3);tone('',5000,0,.4,.2,true);
   for(const e of enemies.slice()){if(e.T.static||e.hp<=0)continue;if(e.pos.distanceTo(P.pos)<rad+e.size*.4){const t=(e.boss?1.4:3.2)+r*.7;e.stunT=Math.max(e.stunT||0,t);e.frozenT=t;n++;
     if(!e.ice){const ic=new THREE.Mesh(boxGeo,new THREE.MeshLambertMaterial({color:0x9ae8ff,emissive:0x2a6a8a,transparent:true,opacity:.5}));ic.userData.keep=true;ic.scale.set(1.2*e.size,(e.T.flying?1.8:2.3)*e.size,1.2*e.size);ic.position.y=(e.T.flying?2.4:1.1)*e.size;e.body.g.add(ic);e.ice=ic;}}}
   stat('freezes',n);feed(n?'FROZE '+n:'FROST NOVA');return true;},
 slam(r){P.slamR=r;if(P.onGround){P.vel.y=13;P.slamQ=.32;}else startSlam();return true;},
 storm(r){const tg=enemies.filter(e=>e.hp>0&&!(e.T.static&&e.type!=='gate')&&e.pos.distanceTo(P.pos)<22).sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos)).slice(0,6+r*2);
   if(!tg.length){feed('NO DEMONS IN RANGE');return false;}
   tg.forEach((e,k)=>setTimeout(()=>{if(!enemies.includes(e))return;const p=e.pos.clone().setY(e.pos.y+1.2*e.size);let a=p.clone().setY(p.y+14);for(let q=1;q<=5;q++){const b=a.clone().lerp(p,q/5);if(q<5){b.x+=rand(-.8,.8);b.z+=rand(-.8,.8);}tracer(a,b,0xbfe8ff,.12,.2);a=b;}
     lightFlash(p,0x9ad8ff,3,12,.2);tone('',4000,0,.15,.3,true);damageEnemy(e,130+r*45,false,p,'proj');if(!e.boss&&e.hp>0)e.stunT=Math.max(e.stunT||0,.6);},k*70));return true;},
 chrono(r){G.slowT=5+r*1.2;banner('BULLET TIME','',1);tone('sine',800,100,1.2,.3);return true;},
 bulwark(r){P.shieldHp=120+r*50;P.shieldT=7+r;tone('sine',300,900,.4,.3);feed('BULWARK UP');return true;}
};
function startSlam(){P.slamming=true;P.slamY=P.pos.y;P.vel.y=-38;P.vel.x*=.2;P.vel.z*=.2;tone('sawtooth',400,80,.3,.2);}
function slamImpact(){P.slamming=false;const r=P.slamR||0;const hgt=Math.max(0,P.slamY-P.pos.y);const dmg=90+r*35+hgt*20,rad=6+r;
  ring(P.pos.clone(),0xff7a1a,rad,.5);burst(P.pos.clone().setY(P.pos.y+.3),0x886644,36,11,1.3,.8);SFX.explode();shake(.8);P.iframe=Math.max(P.iframe||0,.3);stat('slams');
  for(const e of enemies.slice()){if(e.T.static||e.hp<=0)continue;const d=e.pos.distanceTo(P.pos);if(d<rad+e.size*.4){damageEnemy(e,dmg*(1-d/(rad+e.size)*.5),false,e.pos.clone().setY(e.pos.y+1),'explosive');if(!e.boss&&e.hp>0&&!e.T.flying&&!e.custom){e.air=true;e.vy=9;e.stunT=Math.max(e.stunT||0,.8);}}}}
function usePower(slot){
  if(G.state!=='play')return;const id=(save.loadout||[])[slot];
  if(!id||!POWERS[id]||!POWERS[id].req()){feed(slot===0?'NO POWER IN SLOT 1 (SET IT IN SKILLS)':'NO POWER IN SLOT 2 (SET IT IN SKILLS)');return;}
  if((P.pcd[id]||0)>0)return;
  if(POWER_FX[id](prank(id)))P.pcd[id]=powerCd(id);
}
doFlame=function(){usePower(0);};
function edt(dt){return dt*(G.slowT>0?.3:1);}
frameHooks.push(dt=>{
  for(const k in P.pcd)P.pcd[k]=Math.max(0,P.pcd[k]-dt);
  if(G.slowT>0)G.slowT-=dt;$('chronoFx').style.opacity=G.slowT>0?1:0;
  if(P.shieldT>0){P.shieldT-=dt;if(P.shieldT<=0||P.shieldHp<=0){P.shieldT=0;P.shieldHp=0;}}$('shieldFx').style.opacity=P.shieldHp>0?1:0;
  if(P.slowT>0)P.slowT-=dt;
  if(P.slamQ>0){P.slamQ-=dt;if(P.slamQ<=0)startSlam();}
  if(P.slamming&&P.onGround)slamImpact();
  if(P.hook){const h=P.hook;h.t-=dt;const e=h.e;const tp=e.pos.clone().setY(e.pos.y+(e.T.flying?2:.9)*e.size);const dv=tp.sub(P.pos.clone().setY(P.pos.y+.5));const d=dv.length();
    tracer(camera.position.clone().add(new THREE.Vector3(0,-.3,0)),e.pos.clone().setY(e.pos.y+1*e.size),0xb08a6a,.04,.03);
    if(d<2.4||!enemies.includes(e)||h.t<=0){if(enemies.includes(e)&&d<3)damageEnemy(e,40+prank('hook')*25,false,e.pos.clone().setY(e.pos.y+1),'melee');P.vel.multiplyScalar(.25);P.hook=null;}
    else{P.vel.copy(dv.normalize().multiplyScalar(36));P.onGround=false;}}
  for(const e of enemies){if(e.frozenT>0){e.frozenT-=dt;if(e.frozenT<=0&&e.ice){e.body.g.remove(e.ice);e.ice=null;burst(e.pos.clone().setY(e.pos.y+1),0xcff4ff,10,4,.7,.5);}}}
  // power HUD
  for(const s of[0,1]){const el=$(s?'ab_p2':'ab_flame');const id=(save.loadout||[])[s];const ok=id&&POWERS[id]&&POWERS[id].req();const cd=ok?(P.pcd[id]||0):0;const k=s?S.kb.power2:S.kb.flame;
    el.className='ab'+(ok?(cd<=0?' ready':''):' lock');el.innerHTML='<b>'+(ok?POWERS[id].name:'EMPTY')+'</b><span class="meter"><i style="width:'+(ok?(1-cd/powerCd(id))*100:0)+'%"></i></span><em>'+keyName(k)+'</em>';}
});
