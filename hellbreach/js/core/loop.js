/* ---------- MAIN LOOP ---------- */
let last=performance.now(),menuCam=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=Math.min(.05,(now-last)/1000);last=now;
  if(G.state==='play')update(dt);
  else if(G.state==='menu'){menuCam+=dt*.07;camera.position.set(Math.cos(menuCam)*26,16,Math.sin(menuCam)*26);camera.lookAt(0,1,0);gunRoot.visible=false;for(const t of torches){t.t+=dt;t.f.scale.y=.7*(.85+Math.sin(t.t*13)*.1);}}
  musicTick();
  renderer.clear();renderer.render(scene,camera);
  if(G.state!=='menu'&&gunRoot.visible){renderer.clearDepth();if(gunCam.aspect!==camera.aspect){gunCam.aspect=camera.aspect;gunCam.updateProjectionMatrix();}renderer.render(gunScene,gunCam);}
}
function update(dt){
  G.time+=dt;gunRoot.visible=true;
  const w=curW();
  // movement
  let fx=0,fz=0;
  if(kb('fwd')||keys.ArrowUp)fz+=1;if(kb('back')||keys.ArrowDown)fz-=1;if(kb('left')||keys.ArrowLeft)fx-=1;if(kb('right')||keys.ArrowRight)fx+=1;
  fx+=touchMove.x;fz+=touchMove.y;const len=Math.hypot(fx,fz);if(len>1){fx/=len;fz/=len;}
  const sprint=kb('sprint')&&fz>0&&!P.zoom;
  const spd=(sprint?9.5:6.6)*(P.zoom?.6:1)*(w.spin&&P.spin>.3?.6:1)*(P.rageT>0?1.25:1)*(P.slowT>0?.45:1)*(P.spdMul||1)*(w.heavy?.85:1);
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);
  const tx=(-sy*fz+cy*fx)*spd,tz=(-cy*fz-sy*fx)*spd;
  if(P.dashT>0){P.dashT-=dt;P.vel.x=P.dashV.x;P.vel.z=P.dashV.z;if(Math.random()<.6)burst(P.pos.clone().setY(P.pos.y+.6),0x9ad8ff,1,1,.5,.25);}
  else{const acc=P.onGround?14:(P.padT>0?.5:4);P.vel.x+=(tx-P.vel.x)*Math.min(1,acc*dt);P.vel.z+=(tz-P.vel.z)*Math.min(1,acc*dt);}
  P.padT=Math.max(0,(P.padT||0)-dt);
  P.vel.y-=26*dt;
  P.pos.x+=P.vel.x*dt;P.pos.z+=P.vel.z*dt;
  resolveXZ(P.pos,P.radius,P.pos.y,P.height+.2);
  P.pos.y+=P.vel.y*dt;
  const gnd=groundAt(P.pos.x,P.pos.z,P.vel.y>0?P.pos.y-1:P.pos.y,P.radius*.7);
  if(P.pos.y<=gnd){if(P.vel.y<-14)shake(.2);P.pos.y=gnd;P.vel.y=0;P.onGround=true;P.usedDJ=false;}else P.onGround=P.pos.y-gnd<.02;
  for(const s of near(P.pos.x,P.pos.z,.5)){if(P.vel.y>0&&P.pos.x>s.min.x&&P.pos.x<s.max.x&&P.pos.z>s.min.z&&P.pos.z<s.max.z&&P.pos.y+P.height+.2>s.min.y&&P.pos.y<s.min.y)P.vel.y=0;}
  if(P.jumpQ||touchJump||(kb('jump')&&P.onGround)){
    if(P.onGround){P.vel.y=9.5;P.onGround=false;SFX.jump();}
    else if((P.jumpQ||touchJump)&&abilityOn('djump')&&!P.usedDJ){P.usedDJ=true;P.vel.y=9;SFX.jump();ring(P.pos.clone(),0x9ad8ff,1.5,.3);P.pos.y+=.01;}
    P.jumpQ=false;touchJump=false;}
  hazardTick(dt);abilityTick(dt);
  // camera
  P.pitch=clamp(P.pitch,-1.5,1.5);
  const moving=Math.hypot(P.vel.x,P.vel.z);bob+=dt*Math.min(moving,10)*1.6;
  camera.position.set(P.pos.x,P.pos.y+P.height+(P.onGround?Math.sin(bob)*.04*Math.min(1,moving/6):0),P.pos.z);
  if(shakeAmt>0){camera.position.x+=rand(-1,1)*shakeAmt*.3;camera.position.y+=rand(-1,1)*shakeAmt*.3;shakeAmt=Math.max(0,shakeAmt-dt*2.5);}
  camera.rotation.set(0,0,0);camera.rotation.order='YXZ';camera.rotation.y=P.yaw;camera.rotation.x=P.pitch+recoil*.15;
  const scoped=P.zoom&&w.scope&&P.reloading<=0;$('scope').hidden=!scoped;
  const fov=P.zoom?(w.scope?18:S.fov*(w.id==='rifle'||w.id==='plasma'?.58:.7)):S.fov*(P.dashT>0?1.12:1)*(P.rageT>0?1.05:1);camera.fov+=(fov-camera.fov)*Math.min(1,dt*12);camera.updateProjectionMatrix();
  // gun anim
  recoil=Math.max(0,recoil-dt*1.6);
  const gx=P.zoom?0:.26,gy=P.zoom?-.18:-.24;
  gunRoot.position.x+=(gx-gunRoot.position.x)*Math.min(1,dt*14);
  gunRoot.position.y+=(gy+Math.sin(bob*2)*.012*Math.min(1,moving/6)-gunRoot.position.y)*Math.min(1,dt*10);
  gunRoot.position.z+=(-.5+recoil*.6-gunRoot.position.z)*Math.min(1,dt*20);
  const rl=P.reloading>0?Math.sin(Math.min(1,1-P.reloading/(P.reloadMax||w.reload))*Math.PI)*-.9:0;gunRoot.rotation.x=recoil*1.2+rl;
  gunModel.visible=!scoped;
  if(w.spin){const firing=(mouseDown||touchFire)&&P.reloading<=0;P.spin=clamp(P.spin+(firing?dt*2.2:-dt*1.5),0,1.4);if(barrels)barrels.rotation.z+=P.spin*dt*30;if(firing&&P.spin<1&&Math.random()<.3)tone('square',100+P.spin*300,100+P.spin*300,.05,.05);}
  P.meleeCd-=dt;P.nadeCd-=dt;
  if(flash){flash.material.opacity=Math.max(0,flash.material.opacity-dt*18);}flashLight.intensity=Math.max(0,flashLight.intensity-dt*30);gunLight.intensity=flashLight.intensity*1.4;gunLight.color.copy(flashLight.color);
  // firing
  P.cool-=dt;
  if(P.reloading>0){P.reloading-=dt;if(P.reloading<=0){P.ammo[w.id]=w.mag;P.reloading=0;}}
  if((mouseDown||touchFire)&&(w.auto||!P.triggerHeld)){const before=P.cool;tryFire();if(P.rageT>0&&P.cool>before)P.cool*=.66;P.triggerHeld=true;}
  if(!mouseDown&&!touchFire)P.triggerHeld=false;
  // world logic
  navT-=dt;if(navT<=0){navT=.25;buildNav();}
  objectiveTick(dt);
  if(G.winT){G.winT-=dt;if(G.winT<=0){G.winT=0;endRun(true);return;}}
  const edtv=edt(dt);for(const e of enemies.slice())updateEnemy(e,edtv);
  if(G.state!=='play')return;
  for(let i=FX.length-1;i>=0;i--){if(!FX[i].tick(edtv))FX.splice(i,1);}
  // projectiles
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];const sdt=s.owner==='enemy'?edtv:dt;s.life-=sdt;if(s.pre)s.pre(s,sdt);s.m.position.addScaledVector(s.v,sdt);s.m.rotation.x+=s.spin*dt;s.m.rotation.y+=s.spin*dt;
    const p=s.m.position;let dead=s.life<=0||p.y<-.5||Math.abs(p.x)>ARENA+2||Math.abs(p.z)>ARENA+2||(p.y<surfaceAt(p.x,p.z)-.05&&grid.t[idx(ci(p.x),ci(p.z))]!==T_STAIR)||!!inSolid(p);
    if(s.owner==='enemy'&&!dead){const dx=p.x-P.pos.x,dz=p.z-P.pos.z,dy=p.y-(P.pos.y+.9);if(dx*dx+dz*dz<.55&&Math.abs(dy)<1.1){if(P.shieldHp>0&&!s.refl){s.refl=true;s.owner='player';s.v.multiplyScalar(-1.4);s.dmg*=3;s.life=3;s.pre=null;tone('sine',1200,600,.12,.15);}else{hurtPlayer(s.dmg);if(s.onHit)s.onHit(s);dead=true;}}}
    if(s.owner==='player'&&!dead){if(s.rocket)burst(p,0x777777,1,1,.9,.5);for(const e of enemies){const fly=e.T.flying,lo=fly?1.5*e.size:0,hi=fly?3.4*e.size:(e.T.static?5:2*e.size);if(Math.hypot(p.x-e.pos.x,p.z-e.pos.z)<(e.T.static?1.8:.5*e.size+.3)&&p.y>e.pos.y+lo&&p.y<e.pos.y+hi){dead=true;s.hitE=e;break;}}}
    if(dead){if(s.onDie)s.onDie(s,p.clone());if(s.rocket)explode(p.clone(),s.splash,s.dmg,s.ecol);else if(s.hitE)damageEnemy(s.hitE,s.dmg,false,p.clone(),'proj');else burst(p,s.m.material.color.getHex(),4,3,.7,.3);scene.remove(s.m);shots.splice(i,1);}
  }
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.life-=dt;q.v.y-=18*dt;q.m.position.addScaledVector(q.v,dt);if(q.m.position.y<.07){q.m.position.y=.07;q.v.multiplyScalar(.5);q.v.y*=-.3;}q.m.rotation.x+=dt*5;if(q.life<=0){scene.remove(q.m);parts.splice(i,1);}else if(q.life<.2)q.m.scale.multiplyScalar(.9);}
  if(parts.length>500)for(const q of parts.splice(0,parts.length-500))scene.remove(q.m);
  updateGrenades(dt);
  for(let i=flashes.length-1;i>=0;i--){const f=flashes[i];f.life-=dt;f.l.intensity=f.i*Math.max(0,f.life/f.max);if(f.life<=0){scene.remove(f.l);flashes.splice(i,1);}}
  for(const t of torches){t.t+=dt;if(t.pad){t.f.position.y=.6+Math.sin(t.t*4)*.15;t.f.rotation.y+=dt*3;continue;}const k=.85+Math.sin(t.t*13)*.08+Math.sin(t.t*7.3)*.07;t.f.scale.y=.7*k;if(t.l)t.l.intensity=1.7*k;}
  if(world.userData.embers){world.userData.embers.position.y=(G.time*.6)%6;world.userData.embers.rotation.y+=dt*.02;}
  for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.life-=dt;t.m.material.opacity=t.life/t.max;if(t.life<=0){scene.remove(t.m);t.m.material.dispose();tracers.splice(i,1);}}
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.life-=dt;const k=1-r.life/r.max;r.m.scale.setScalar(.5+k*r.maxR);r.m.material.opacity=1-k;if(r.life<=0){scene.remove(r.m);rings.splice(i,1);}}
  // pickups
  for(let i=pickups.length-1;i>=0;i--){const k=pickups[i];
    if(k.kind==='orb'){k.t+=dt;k.life-=dt;const to=new THREE.Vector3(P.pos.x-k.g.position.x,P.pos.y+1-k.g.position.y,P.pos.z-k.g.position.z);const d=to.length();
      if(k.t>.35&&d<10){k.v.lerp(to.normalize().multiplyScalar(18),Math.min(1,dt*6));}else{k.v.y-=18*dt;k.v.x*=.97;k.v.z*=.97;}
      k.g.position.addScaledVector(k.v,dt);const fl=surfaceAt(k.g.position.x,k.g.position.z)+.2;if(k.g.position.y<fl){k.g.position.y=fl;k.v.y=Math.abs(k.v.y)*.3;}k.g.rotation.y+=dt*6;
      if(d<1&&k.t>.35){if(k.armor)P.armor=Math.min(P.maxArmor,P.armor+k.heal);else P.hp=Math.min(P.maxHp,P.hp+k.heal);tone('triangle',(k.armor?500:700)+Math.random()*300,1200,.06,.08);scene.remove(k.g);pickups.splice(i,1);}
      else if(k.life<=0){scene.remove(k.g);pickups.splice(i,1);}continue;}
    k.t+=dt;k.life-=dt;k.g.rotation.y+=dt*2.5;const base=k.base??(k.base=surfaceAt(k.g.position.x,k.g.position.z)+.6);k.g.position.y=base+Math.sin(k.t*3)*.15;
    if(Math.hypot(k.g.position.x-P.pos.x,k.g.position.z-P.pos.z)<1.3&&Math.abs(P.pos.y+.6-k.g.position.y)<1.8){
      if(k.kind==='hp'){P.hp=Math.min(P.maxHp,P.hp+30);feed('+30 HEALTH');SFX.coin();}else if(k.kind==='armor'){P.armor=Math.min(P.maxArmor,P.armor+50);feed('+50 ARMOR');SFX.armor();}else if(k.kind==='nade'){P.nades=Math.min(P.maxNades,P.nades+2);feed('+2 GRENADES');SFX.coin();}else{WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);feed('FULL AMMO');SFX.reload();}
      scene.remove(k.g);pickups.splice(i,1);}else if(k.life<=0){scene.remove(k.g);pickups.splice(i,1);}}
  // secrets
  for(const s of G.secrets){s.m.rotation.y+=dt*2;s.m.position.y+=Math.sin(G.time*3+s.k)*.004;
    if(!s.taken&&s.m.position.distanceTo(P.pos.clone().setY(P.pos.y+1))<1.4){s.taken=true;scene.remove(s.m);G.found++;feed('SECRET SHARD '+G.secrets.filter(x=>x.taken||x.got).length+'/3');tone('sine',880,1760,.4,.2);setTimeout(()=>tone('sine',1320,2640,.4,.15),150);burst(s.m.position,0xc07aff,20,5,1,.8);}}
  MUS.intensity=clamp(enemies.length/6,.1,1);
  updateNums(dt);hud();
}
function hud(){
  const w=curW();
  $('hpbar').style.transform='scaleX('+(P.hp/P.maxHp)+')';$('hptxt').textContent=Math.ceil(P.hp)+' / '+P.maxHp;$('hpbig').textContent=Math.ceil(P.hp);$('hpbig').style.color=P.hp<35?'var(--hot)':P.hp<P.maxHp*.65?'var(--gold)':'var(--ink)';$('arbig').textContent=Math.ceil(P.armor);
  $('arbar').style.transform='scaleX('+(P.armor/P.maxArmor)+')';$('artxt').textContent=Math.ceil(P.armor)+' / '+P.maxArmor+' ARMOR';$('nades').textContent='GRENADES '+P.nades+(isTouch?'':' ['+keyName(S.kb.nade)+']');
  $('finish').hidden=!finisherTarget();$('finish').textContent=isTouch?'TAP MELEE TO FINISH':'PRESS '+keyName(S.kb.melee)+' TO FINISH';
  $('lowhp').style.opacity=P.hp<35?(.5+Math.sin(G.time*6)*.3):0;
  $('ammo').innerHTML=(P.reloading>0?'<small>RELOADING</small>':w.spin&&P.spin<1&&(mouseDown||touchFire)?'<small>SPINNING UP</small>':P.ammo[w.id]+'<small>/'+w.mag+'</small>');
  $('wname').textContent=w.name;
  $('wave').innerHTML=G.survival?'WAVE <b>'+G.wave+'</b>':'<b>'+(G.L.name)+'</b>';
  $('left').innerHTML='DEMONS <b>'+(enemies.filter(e=>!e.T.static).length+G.waveQueue.length)+'</b>'+(G.survival?'':' · SECRETS <b>'+G.secrets.filter(x=>x.taken||x.got).length+'/3</b>');
  $('hcoins').textContent=G.earned;$('hscore').textContent=G.score;
  if(G.bossE)$('bbar').style.transform='scaleX('+Math.max(0,G.bossE.hp/G.bossE.max)+')';
}
function updateSlots(){$('slots').innerHTML=WEAPONS.map((w,i)=>'<span class="'+(i===P.weapon?'on':'')+(save.owned.includes(w.id)?'':' lock')+'">'+(i+1)+'</span>').join('');}

/* ---------- END RUN ---------- */
function endRun(won){
  if(G.state!=='play')return;G.state='result';$('scope').hidden=true;$('rage').style.opacity=0;for(const n of nums.splice(0))n.el.remove();unlockPointer();mouseDown=false;MUS.boss=false;
  $('hud').hidden=true;$('touch').hidden=true;
  let stars=0,bonus=0,txt='',unlockMsg='';
  if(G.survival){
    bonus=Math.max(0,G.wave-1)*20;const newBest=G.score>save.best;if(newBest)save.best=G.score;if(G.wave>save.survivalLvl)save.survivalLvl=G.wave;
    txt='<h2>'+(newBest?'NEW BEST!':'KNOCKED OUT')+'</h2><div class="tbl"><span>WAVE REACHED</span><span>'+G.wave+'</span><span>KILLS</span><span>'+G.kills+'</span><span>SCORE</span><span>'+G.score+'</span><span>COINS</span><span>'+G.earned+' + '+bonus+' bonus</span></div>';
  }else if(won){
    let newSecrets=0;G.secrets.forEach(s=>{const key=G.levelIdx+'-'+s.k;if(s.taken&&!save.secrets[key]){save.secrets[key]=1;newSecrets++;}});
    const allSecrets=G.secrets.every(s=>save.secrets[G.levelIdx+'-'+s.k]);
    stars=1+(G.time<=G.L.par?1:0)+(allSecrets?1:0);
    const prev=save.stars[G.levelIdx]||0;if(stars>prev)save.stars[G.levelIdx]=stars;
    const before=save.cleared||0;save.cleared=Math.max(before,G.levelIdx+1);
    if(G.levelIdx+2>save.unlocked)save.unlocked=Math.min(LEVELS.length,G.levelIdx+2);
    for(const[k,n]of Object.entries(ABILITY_UNLOCK))if(before<n&&save.cleared>=n)unlockMsg+='<div class="unlock">NEW ABILITY: '+ABILS.find(a=>a.id===k).name+'<small>'+ABILS.find(a=>a.id===k).desc+'</small></div>';
    const firstBoss=!save.bossKills[G.levelIdx];save.bossKills[G.levelIdx]=1;
    bonus=120+G.levelIdx*60+stars*30+newSecrets*75+(firstBoss&&G.L.boss.major?400:0);
    txt='<h2>'+(G.L.boss.major?'WARLORD SLAIN!':'LEVEL CLEAR!')+'</h2><div class="big stars">'+[0,1,2].map(i=>i<stars?'★':'<span class="off">★</span>').join('')+'</div>'+
      '<div class="tbl"><span>TIME</span><span>'+fmt(G.time)+' (par '+fmt(G.L.par)+')</span><span>SECRETS</span><span>'+G.secrets.filter(s=>save.secrets[G.levelIdx+'-'+s.k]).length+'/3</span><span>KILLS</span><span>'+G.kills+'</span><span>SCORE</span><span>'+G.score+'</span><span>COINS</span><span>'+G.earned+' + '+bonus+' bonus</span></div>'+
      '<div class="help">Stars: clear it · beat the par time · find all 3 secret shards (purple crystals on high ledges and hard-to-reach spots)</div>'+unlockMsg+
      (G.levelIdx===LEVELS.length-1?'<div class="unlock">THE ARCH-WARLORD IS DEAD<small>You closed the Ninth Gate. Try Nightmare, hunt every star, or see how far you get in Survival.</small></div>':'');
  }else{
    txt='<h2>YOU DIED</h2><div class="tbl"><span>REACHED</span><span>'+(G.bossE?G.bossE.T.name:(G.bossPhase?'CHAMPION':'MISSION'))+'</span><span>KILLS</span><span>'+G.kills+'</span><span>COINS KEPT</span><span>'+G.earned+'</span></div><div class="help">Tip: dash out of danger, jump the shockwaves, hide behind pillars from beams, and finish staggered demons to heal.</div>';
  }
  save.coins+=G.earned+bonus;persist();
  const nextBtn=(!G.survival&&won&&G.levelIdx<LEVELS.length-1)?'<button class="go" id="rnext">NEXT LEVEL</button>':'';
  $('resbody').innerHTML=txt+'<div class="row">'+nextBtn+'<button '+(nextBtn?'':'class="go"')+' id="rretry">'+(won?'REPLAY':'TRY AGAIN')+'</button><button id="rarm">ARMORY</button><button id="rupg">UPGRADES</button><button id="rmenu">MENU</button></div>';
  $('result').hidden=false;
  if($('rnext'))$('rnext').onclick=()=>startRun(G.levelIdx+1,false);
  $('rretry').onclick=()=>startRun(G.levelIdx,G.survival);
  $('rarm').onclick=()=>{showMenu();renderTab('armory');};$('rupg').onclick=()=>{showMenu();renderTab('upgrades');};
  $('rmenu').onclick=showMenu;
}
function fmt(t){t=Math.floor(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
