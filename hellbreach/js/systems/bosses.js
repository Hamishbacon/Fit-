/* =====================================================================
   BOSSES — making every boss an event.
   - Cinematic intro: camera swings to the boss, it roars, name card,
     it speaks. Allies and VESTA call out how to fight it.
   - Break meter: headshots, explosives and melee fill it. When it breaks
     the boss is stunned and F performs a GLORY STRIKE.
   - Phase dialogue, low-health lines, slow-motion death and last words.
   - Signature mechanics: the Butcher's hook and feast, the Tyrant's magma
     tide, Vharos's echoes and burning throne, the Pale Knight's blade
     dance, and the Hollow God's gaze and the Lantern's ignition.
   ===================================================================== */
for(const k in BOSSES)BOSSES[k].key=k;
const BL=e=>STORY.bossLines[e.T.key]||{};
const bossVoice=e=>BL(e).voice||({butcher:'butcher',tyrant:'tyrant',arch:'vharos'}[e.T.key])||'demon';

/* signature attacks join the attack pools */
BOSSES.butcher.phases[1].attacks.push('hook','hook');BOSSES.butcher.phases[2].attacks.push('hook','feast','feast');
BOSSES.tyrant.phases[1].attacks.push('tide');BOSSES.tyrant.phases[2].attacks.push('tide');
BOSSES.arch.phases[1].attacks.push('echo');BOSSES.arch.phases[2].attacks.push('burn','burn','echo');
BOSSES.knight.attacks.push('blades','blades');
BOSSES.god.phases.forEach(p=>p.attacks.push('gaze'));
BOSSES.ravager.attacks.push('hook');

/* ---------- INTRO ---------- */
const _sbI=spawnBoss;
spawnBoss=function(def){const e=_sbI(def);e.brk=0;e.brkMul=1;
  if(G.state==='play'&&!G.trial)bossIntro(e);
  return e;};
function bossFace(e){const fly=e.flying||e.T.flying;return e.pos.clone().setY(e.pos.y+(e.T.body==='eye'?0:fly?e.size*2.6:e.size*(e.T.body==='hydra'?.8:1.65)));}
function bossIntro(e){
  const L=BL(e);const story=G.mode==='story';
  if(e.T.body==='eye'){e.pos.y=6;}
  e.spawnT=0;e.body.g.scale.setScalar(1);e.body.g.position.copy(e.pos);
  const to=V3(P.pos.x-e.pos.x,0,P.pos.z-e.pos.z).normalize();e.faceA=Math.atan2(to.x,to.z);e.body.g.rotation.y=e.faceA;
  if(e.heads)for(const h of e.heads)headTick(h,0);
  const say=()=>{if(L.intro)Comms.say(bossVoice(e),L.intro,{now:true,dur:Math.max(3.4,L.intro.length*.06)});};
  const hints=()=>{if(L.hint)setTimeout(()=>{if(G.state==='play'&&G.bossE===e){Comms.seq(L.hint);if(G.squad)Allies.chat('marineBoss',true);}},2200);};
  if(!story||save.skipCine){say();hints();return;}
  const face=bossFace(e);const eye=V3(P.pos.x,P.pos.y+P.height,P.pos.z);const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);const look0=eye.clone().addScaledVector(fwd,10);
  const s=e.size;const near=face.clone().addScaledVector(to,s*2.2+3).add(V3(0,-s*.35,0));const far=face.clone().addScaledVector(to,s*3.4+5).add(V3(-to.z*3,s*.4,to.x*3));
  const B=e.body;
  Cine.play([
   {dur:.9,from:eye,to:eye.clone().add(V3(0,.4,0)),look:k=>look0.clone().lerp(face,k)},
   {dur:3.4,from:far,to:near,look:face,card:{kick:e.T.major?'WARLORD':'CHAMPION',name:e.T.name,sub:e.T.title||''},
    start(){SFX.boss();shake(1);ring(e.pos.clone(),e.T.eye||0xff2200,14,1.2);lightFlash(face.clone(),e.T.eye||0xff3300,6,40,1.4);say();},
    tick(dt,k){const r=Math.sin(Math.min(1,k*1.6)*Math.PI);B.armL.rotation.x=B.armR.rotation.x=-2.4*r;if(B.head)B.head.rotation.x=-.4*r;B.g.scale.setScalar(1+.05*Math.sin(G.time*30+k*40)*r);
      if(Math.random()<.3)burst(face.clone(),e.T.eye||0xff4400,1,4,.8,.4);if(e.heads)for(const h of e.heads)headTick(h,dt*.001);}},
   {dur:.7,from:()=>camera.position.clone(),to:eye,look:k=>face.clone().lerp(look0,k*.4),cardOff:true}
  ],()=>{B.g.scale.setScalar(1);B.armL.rotation.x=B.armR.rotation.x=0;hints();});
}

/* ---------- BREAK METER & GLORY STRIKE ---------- */
const _dmB=damageEnemy;
damageEnemy=function(e,amt,head,point,src){
  if(e.forceInvuln){if(point)burst(point,0xffcf3a,4,3,.6,.3);hitMark('blk');return;}
  const before=e.hp;_dmB(e,amt,head,point,src);
  if(!e.boss||e.hp<=0||!enemies.includes(e)||e.broken)return;const dealt=before-e.hp;if(dealt<=0)return;
  if(e.feasting){e.feastDmg=(e.feastDmg||0)+dealt;if(e.feastDmg>e.max*.05)interruptFeast(e);}
  const k=dealt/(e.max*.085)*100*(head?1:.3)*(src==='explosive'?1.5:1)*(src==='melee'||src==='punch'?2:1)*(src==='env'?.35:1)*e.brkMul;
  e.brk=(e.brk||0)+k;if(e.brk>=100)breakBoss(e);
};
function breakBoss(e){e.broken=true;e.brokenT=4.5;e.brk=100;e.stunT=Math.max(e.stunT||0,4.5);e.atk=null;e.feasting=false;
  if(e.beam){scene.remove(e.beam);e.beam=null;}if(e.line){scene.remove(e.line);e.line=null;}
  banner('GUARD BROKEN',(isTouch?'Tap MELEE':'Press '+keyName(S.kb.melee))+' for a GLORY STRIKE',2);SFX.boss();shake(.7);burst(bossFace(e),0xffcf3a,40,10,1.4,1);ring(e.pos.clone(),0xffcf3a,8,.6);
  Comms.say('vesta',['It\'s open. Finish it!','Guard broken! Get in close!','Now, Warden! Glory strike!'][Math.floor(Math.random()*3)],{low:true,dur:1.8});}
frameHooks.push(dt=>{const e=G.bossE;if(!e)return;
  if(e.broken){e.brokenT-=dt;if(Math.random()<.4)burst(bossFace(e).add(V3(rand(-1,1),rand(-.5,.5),rand(-1,1))),0xffcf3a,1,2,.7,.4);if(e.brokenT<=0){e.broken=false;e.brk=0;e.brkMul*=.8;}}
  $('bbrk').style.transform='scaleX('+clamp((e.brk||0)/100,0,1)+')';$('bbrk').parentNode.classList.toggle('full',!!e.broken);
  if(!e.saidLow&&e.hp<e.max*(e.T.major?.22:.3)&&e.hp>0){e.saidLow=true;const L=BL(e);if(L.low)Comms.say(bossVoice(e),L.low,{dur:2.8});}
});
const _hudB=hud;
hud=function(){_hudB();const e=G.bossE;if(e&&e.broken&&Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<e.size*1.2+4){$('finish').hidden=false;$('finish').textContent=(isTouch?'TAP MELEE':'PRESS '+keyName(S.kb.melee))+' · GLORY STRIKE';}};
const _melB=melee;
melee=function(){const e=G.bossE;
  if(e&&e.broken&&G.state==='play'&&P.meleeCd<=0&&Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<e.size*1.2+4){glory(e);return;}_melB();};
function glory(e){P.meleeCd=.8;const to=V3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z).normalize();
  P.pos.x=e.pos.x-to.x*(e.size*.55+1.4);P.pos.z=e.pos.z-to.z*(e.size*.55+1.4);P.yaw=Math.atan2(-to.x,-to.z);P.iframe=1.2;
  const face=bossFace(e);gunRoot.position.z=-.9;SFX.gib();SFX.punch();shake(1.3);G.slowmo=.55;
  setTimeout(()=>{if(!enemies.includes(e))return;e.broken=false;e.brk=0;e.brkMul*=.8;e.stunT=1;const dmg=e.max*(e.T.major?.08:.1);
    burst(face,0x8a0606,50,12,1.6,1.2);burst(face,0xffcf3a,30,10,1.2,.9);lightFlash(face,0xffaa33,6,30,.4);damageEnemy(e,dmg,false,face,'env');e.brk=0;
    P.hp=Math.min(P.maxHp,P.hp+35);P.armor=Math.min(P.maxArmor,P.armor+25);feed('GLORY STRIKE · +35 HP');$('gibflash').style.opacity=.5;setTimeout(()=>$('gibflash').style.opacity=0,140);stat('glory');},90);}

/* ---------- PHASES & DEATH ---------- */
const _bpcB=bossPhaseChange;
bossPhaseChange=function(e){_bpcB(e);const L=BL(e);const line=e.phase===1?L.p2:L.p3;if(line)Comms.say(bossVoice(e),line,{now:true,dur:3.2});
  const h=e.phase===1?L.hint2:L.hint3;if(h)setTimeout(()=>{if(G.bossE===e)Comms.seq(h);},2600);};
const _killB=killEnemy;
killEnemy=function(e,head,over){
  if(!e.boss||!enemies.includes(e))return _killB(e,head,over);
  const face=bossFace(e),L=BL(e),major=e.T.major,story=G.mode==='story';
  clearBossFx(e);
  _killB(e,head,over);
  G.slowmo=1.4;ring(face.clone().setY(.1),0xffaa00,20,1.4);lightFlash(face,0xffcc66,8,60,1.6);
  if(L.death)Comms.say(bossVoice(e),L.death,{now:true,dur:Math.max(3.2,L.death.length*.06)});
  if(story&&(G.L.mission&&G.L.mission.heart)&&major)heartOrb(face);
  G.bossDied=G.time;
};
function heartOrb(from){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.5),new THREE.MeshBasicMaterial({color:0xff3a1a}));m.position.copy(from);scene.add(m);let t=0;
  addFx({kill(){scene.remove(m);},tick(dt){t+=dt;m.rotation.y+=dt*4;m.scale.setScalar(1+Math.sin(t*12)*.15);
    if(t<1.2)m.position.y+=dt*1.5;else{const tg=V3(P.pos.x,P.pos.y+1.3,P.pos.z);m.position.lerp(tg,Math.min(1,dt*4));if(m.position.distanceTo(tg)<.6){this.kill();
      toast('WARLORD HEART','The Lantern drinks it in','','#ff5a3a');SFX.boss();$('gibflash').style.opacity=.4;setTimeout(()=>$('gibflash').style.opacity=0,200);return false;}}
    if(Math.random()<.6)burst(m.position.clone(),0xff6a3a,1,1.5,.6,.4);return true;}});}
const _clearRoomB=clearRoom;
clearRoom=function(R){_clearRoomB(R);if(R.enc==='boss'&&G.mode==='story'&&G.winT)G.winT=Math.max(G.winT,4.2);};
function clearBossFx(e){if(e.hookLine){scene.remove(e.hookLine);e.hookLine=null;}if(G.tide&&G.tide.boss===e)G.tide.end=true;$('gaze').style.opacity=0;}
const _ubB=updateBoss;
updateBoss=function(e,dt,to,dist){_ubB(e,dt,to,dist);if(['hook','feast','gaze','blades','burn','echo','tide'].includes(e.atk))e.moveMul=0;};

/* ---------- SIGNATURE ATTACKS ---------- */
Object.assign(BOSS_ATK,{
 hook(e,to){e.atkT=1.3;const hand=()=>e.pos.clone().setY(e.pos.y+e.size*1.3);
  const line=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:.6}));scene.add(line);e.hookLine=line;tone('sawtooth',300,900,.5,.12);let t=0;
  addFx({boss:e,kill(){scene.remove(line);if(e.hookLine===line)e.hookLine=null;},tick(dt){t+=dt;const a=hand(),b=V3(P.pos.x,P.pos.y+1,P.pos.z);const L=a.distanceTo(b);line.scale.set(.06,.06,L);line.position.copy(a).lerp(b,.5);line.lookAt(b);line.material.opacity=.25+.5*Math.min(1,t/.55);
    if(t>=.6){this.kill();if(!enemies.includes(e)||e.stunT>0)return false;const d=b.clone().sub(a);
      fireOrb(a,d,40,14*DIFF().dmg,0xd8d8d8,.8,'enemy',{life:1.4,onHit:()=>{const pull=V3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const L2=pull.length();pull.normalize();P.vel.copy(pull.multiplyScalar(Math.min(26,L2*2.4)));P.vel.y=5;P.onGround=false;feed('HOOKED!');shake(.6);SFX.punch();}});
      tone('',2000,0,.25,.4,true);return false;}return true;}});},
 feast(e){e.atkT=3.2;e.feasting=true;e.feastDmg=0;banner('IT\'S FEEDING','Hit it hard to interrupt',1.8);Comms.say('vesta','It is healing! Interrupt it!',{low:true,dur:1.8});SFX.growl();
  const near=(G.corpses||[]).filter(c=>Math.hypot(c.x-e.pos.x,c.z-e.pos.z)<16);let t=0,tk=0;
  for(const c of near){const p=V3(c.x,surfaceAt(c.x,c.z)+.5,c.z);for(let i=0;i<8;i++)setTimeout(()=>burst(p.clone().lerp(bossFace(e),i/8),0x8a0606,3,2,.8,.4),i*60);}
  e.hp=Math.min(e.max,e.hp+e.max*.015*near.length);G.corpses=(G.corpses||[]).filter(c=>!near.includes(c));
  addFx({boss:e,kill(){e.feasting=false;},tick(dt){t+=dt;tk-=dt;if(!e.feasting||e.stunT>0||e.atk!=='feast'){e.feasting=false;return false;}
    if(tk<=0){tk=.5;e.hp=Math.min(e.max,e.hp+e.max*.012);burst(bossFace(e),0xff1a1a,6,3,.8,.5);dmgNumber(bossFace(e),e.max*.012,false);}
    e.body.armL.rotation.x=e.body.armR.rotation.x=-1.6+Math.sin(t*14)*.4;if(t>=3){e.feasting=false;return false;}return true;}});},
 tide(e){e.atkT=1.2;if(G.tide)return;const R=curRoomObj();if(!R)return;
  const w=R.w*C,h=R.h*C;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:0xff5a00,transparent:true,opacity:.0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(R.cx,.03,R.cz);scene.add(m);
  banner('MAGMA SURGE','Get off the floor!',2);SFX.rocket();tone('sawtooth',60,40,2.5,.3);
  const T=G.tide={boss:e,m,t:0,tk:0,end:false};
  addFx({boss:e,kill(){scene.remove(m);if(G.tide===T)G.tide=null;},tick(dt){T.t+=dt;const warn=2.6,live=6.5;
    if(T.t<warn){m.material.opacity=.15+.25*(T.t/warn)*(.6+.4*Math.sin(T.t*14));m.position.y=.03;}
    else if(T.t<warn+live&&!T.end){m.material.opacity=.85;m.material.color.set(Math.floor(T.t*6)%2?0xff6a00:0xff4a00);m.position.y=.22;
      T.tk-=dt;if(T.tk<=0&&P.pos.y<.38&&inRoom(R,ci(P.pos.x),ci(P.pos.z),0)){T.tk=.3;hurtPlayer(8,true);burst(P.pos.clone().setY(.3),0xff7a00,4,3,.8,.4);}
      if(Math.random()<.5)burst(V3(R.cx+rand(-w/2,w/2),.3,R.cz+rand(-h/2,h/2)),0xffaa33,1,3,.9,.5);}
    else{m.material.opacity-=dt;m.position.y-=dt*.2;if(m.material.opacity<=0){this.kill();return false;}}return true;}});},
 echo(e){e.atkT=1.2;const R=curRoomObj();feed('VHAROS SPLITS ITS SHADOW');tone('sine',200,60,.8,.3);
  for(let k=0;k<2;k++){const a=e.faceA+(k?1.6:-1.6);let x=e.pos.x+Math.sin(a)*5,z=e.pos.z+Math.cos(a)*5;if(!R||!inRoom(R,ci(x),ci(z),1)||grid.t[idx(ci(x),ci(z))]!==T_FLOOR){const p=spawnPoint();x=p[0];z=p[1];}
    const c=spawnEnemy('brute',x,z);c.echo=true;c.hp=c.max=380*DIFF().hp;c.T=Object.assign({},c.T,{name:'Echo',coins:2,score:20});c.body.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.visible!==false&&!o.userData.keep){o.material=mat(0x1a0404,0x5a0000);}});
    c.dieT=22;burst(V3(x,1.5,z),0xff2a1a,30,8,1.2,.8);}},
 burn(e){e.atkT=1;const R=curRoomObj();if(!R)return;G.burnt=G.burnt||0;if(G.burnt>46)return;
  const cells=openCells((t,i,j)=>t===T_FLOOR&&inRoom(R,i,j,0)&&Math.hypot(cx(i)-P.pos.x,cx(j)-P.pos.z)>3.5).sort(()=>Math.random()-.5).slice(0,8);
  feed('THE THRONE ROOM BURNS');const lavaM=mat(0xff3a00,0xdd2a00);
  for(const[i,j]of cells){groundWarn(cx(i),cx(j),C*.55,1.3,0xff2a00,()=>{const k=idx(i,j);if(grid.t[k]!==T_FLOOR)return;grid.t[k]=T_LAVA;G.burnt++;const m=new THREE.Mesh(boxGeo,lavaM);m.scale.set(C,.06,C);m.position.set(cx(i),.02,cx(j));world.add(m);burst(V3(cx(i),.4,cx(j)),0xff6a00,6,4,.9,.5);},e);}},
 blades(e){e.atkT=3.4;let n=0,t=0,stage=0,dir=null;const line=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0xa87aff,transparent:true,opacity:.5,depthWrite:false}));scene.add(line);
  addFx({boss:e,kill(){scene.remove(line);},tick(dt){if(!enemies.includes(e)||e.stunT>0){this.kill();return false;}t+=dt;
    if(stage===0){if(!dir){dir=V3(P.pos.x-e.pos.x,0,P.pos.z-e.pos.z).normalize();e.faceA=Math.atan2(dir.x,dir.z);tone('sine',1400,2400,.3,.12);e.hitB=false;}
      line.visible=true;line.scale.set(e.size*.5,.03,14);line.position.copy(e.pos).addScaledVector(dir,7);line.position.y=surfaceAt(e.pos.x,e.pos.z)+.06;line.rotation.y=Math.atan2(dir.x,dir.z);line.material.opacity=.2+.5*(t/.45);
      if(t>=.45){stage=1;t=0;line.visible=false;tone('',3000,0,.2,.3,true);}}
    else{e.pos.addScaledVector(dir,24*dt);resolveXZ(e.pos,.3*e.size,e.pos.y,1.8*e.size);e.pos.y=surfaceAt(e.pos.x,e.pos.z);e.body.g.position.copy(e.pos);burst(e.pos.clone().setY(1.4),0xd8d8ff,2,2,.8,.3);
      if(!e.hitB&&Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<1.7+e.size*.3&&Math.abs(P.pos.y-e.pos.y)<2.4){e.hitB=true;hurtPlayer(e.dmg*.9);P.vel.addScaledVector(dir,9);}
      if(t>=.36){n++;stage=0;t=0;dir=null;if(n>=3){this.kill();return false;}}}return true;}});},
 gaze(e){e.atkT=3.4;let t=0;const el=$('gaze');if(!G.gazeWarned){G.gazeWarned=true;Comms.say('vesta','It is looking for you. Get behind something solid!',{now:true,dur:2.6});}else feed('THE GOD OPENS ITS EYE');
  tone('sine',90,1200,2.6,.2);if(e.eyeT!=null)e.eyeT=Math.max(e.eyeT,3.5);
  addFx({boss:e,kill(){el.style.opacity=0;},tick(dt){t+=dt;if(!enemies.includes(e)){this.kill();return false;}el.style.opacity=Math.min(.8,t/2.6*.8);
    if(t>=2.6){this.kill();const from=bossFace(e);if(losTo(e,from)){hurtPlayer(42,true);$('gibflash').style.background='#fff';$('gibflash').style.opacity=.8;setTimeout(()=>{$('gibflash').style.opacity=0;$('gibflash').style.background='';},180);feed('YOU WERE SEEN');}
      else{feed('IT CANNOT SEE YOU');}lightFlash(from,0xffffff,8,60,.4);return false;}return true;}});}
});
/* echoes fade */
frameHooks.push(dt=>{for(const e of enemies.slice())if(e.echo){e.dieT-=dt;if(e.dieT<=0){burst(e.pos.clone().setY(1.5),0x3a0000,20,6,1,.6);removeEnemy(e);}}});

/* ---------- THE LANTERN IGNITES (final boss, story only) ---------- */
frameHooks.push(dt=>{const e=G.bossE;if(!e||e.T.key!=='god'||G.mode!=='story')return;
  if(!G.ignite&&e.hp<e.max*.12&&e.hp>0){e.forceInvuln=true;e.broken=false;G.ignite={t:22,total:22,spawnT:1};const p=centerPoint(curRoomObj());const lan=wadd(Props.lantern());lan.scale.setScalar(1.6);lan.position.set(p.x,surfaceAt(p.x,p.z),p.z);G.ignite.lan=lan;G.ignite.pos=lan.position.clone();
    banner('THE LANTERN IGNITES','Survive until it burns!',3);SFX.boss();shake(1);Comms.seq([['vesta','Lantern at critical! It needs twenty seconds!'],['god','NO. NO. WE HAVE BEEN IN THE DARK SO LONG.']]);}
  const I=G.ignite;if(!I)return;I.t-=dt;I.spawnT-=dt;const core=I.lan.userData.core;core.scale.setScalar(1+(1-I.t/I.total)*2.5+Math.sin(G.time*20)*.2);core.rotation.y+=dt*6;
  if(Math.random()<.5)burst(I.pos.clone().setY(I.pos.y+2),0xffcf3a,2,5,1,.6);
  if(I.spawnT<=0&&liveCount()<14){I.spawnT=rand(.8,1.4);const[x,z]=spawnPoint();spawnEnemy(pickType(),x,z);}
  $('objective').textContent='THE LANTERN IGNITES · SURVIVE · '+Math.ceil(Math.max(0,I.t))+'s';
  if(I.t<=0){G.ignite=null;e.forceInvuln=false;const from=I.pos.clone().setY(I.pos.y+2.6),to=bossFace(e);
    for(let k=0;k<6;k++)setTimeout(()=>tracer(from,to,0xffcf3a,.5,.8),k*120);lightFlash(to,0xffffff,10,80,1.5);shake(1.5);
    setTimeout(()=>{if(enemies.includes(e)){e.invuln=false;e.shielded=false;for(const c of e.crystals||[])if(enemies.includes(c))removeEnemy(c);e.hp=1;damageEnemy(e,99999,false,to,'env');}},700);}
});
const _clearBI=clearEntities;clearEntities=function(){_clearBI();G.ignite=null;G.tide=null;G.burnt=0;G.gazeWarned=false;const gz=$('gaze');if(gz)gz.style.opacity=0;};
