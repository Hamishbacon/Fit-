/* ---------- INPUT ---------- */
const isTouch=matchMedia('(pointer:coarse)').matches;
let locked=false,dragLook=false,lastMX=0,lastMY=0;
function lockPointer(){if(isTouch)return;try{const r=canvas.requestPointerLock&&canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function unlockPointer(){try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}}
document.addEventListener('pointerlockchange',()=>{const was=locked;locked=document.pointerLockElement===canvas;if(was&&!locked&&G.state==='play'&&!isTouch)pause();});
addEventListener('keydown',e=>{
  if(captureRebind(e))return;
  keys[e.code]=true;if(G.state!=='play'){if(e.code==='Escape'&&G.state==='paused')resume();return;}
  if(e.code===S.kb.reload)startReload();
  if(e.code===S.kb.nade)throwGrenade();
  if(e.code===S.kb.melee)melee();
  if(e.code===S.kb.dash)doDash();
  if(e.code===S.kb.flame)doFlame();
  if(e.code===S.kb.power2)usePower(1);
  if(e.code===S.kb.rage)doRage();
  if(e.code===S.kb.jump&&!e.repeat)P.jumpQ=true;
  if(/^Digit[1-9]$/.test(e.code)){const o=ownedIdx(),n=+e.code.slice(5)-1;if(o[n]!=null)switchWeapon(o[n]);}
  if(e.code===S.kb.next)cycleWeapon(1);
  if(e.code==='Escape'||e.code===S.kb.pause)pause();
  if(['Space','ArrowUp','ArrowDown','Tab'].includes(e.code))e.preventDefault();
});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseDown=false;});
canvas.addEventListener('mousedown',e=>{
  if(G.state!=='play'||isTouch)return;
  if(!locked){lockPointer();dragLook=true;lastMX=e.clientX;lastMY=e.clientY;}
  if(e.button===0)mouseDown=true;if(e.button===2)P.zoom=true;
});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)P.zoom=false;dragLook=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{
  if(G.state!=='play'||isTouch)return;
  const sens=(P.zoom?(curW().scope?.0006:.0012):.0022)*S.sens;const inv=S.invert?-1:1;
  if(locked){P.yaw-=e.movementX*sens;P.pitch-=e.movementY*sens*inv;}
  else if(dragLook){P.yaw-=(e.clientX-lastMX)*sens*1.5;P.pitch-=(e.clientY-lastMY)*sens*1.5*inv;lastMX=e.clientX;lastMY=e.clientY;}
});
addEventListener('wheel',e=>{if(G.state==='play')cycleWeapon(e.deltaY>0?1:-1);},{passive:true});

/* touch */
const touchMove={x:0,y:0};let touchFire=false,touchJump=false;
let stickId=null,lookId=null,lookX=0,lookY=0;
const stick=$('stick'),knob=$('knob');
stick.addEventListener('touchstart',e=>{e.preventDefault();stickId=e.changedTouches[0].identifier;moveStick(e.changedTouches[0]);},{passive:false});
function moveStick(t){const r=stick.getBoundingClientRect();let dx=t.clientX-(r.left+60),dy=t.clientY-(r.top+60);const d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d;}knob.style.transform='translate('+dx+'px,'+dy+'px)';touchMove.x=dx/50;touchMove.y=-dy/50;}
const holdBtn=(id,on,off)=>{const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();on();},{passive:false});b.addEventListener('touchend',e=>{e.preventDefault();off&&off();},{passive:false});};
holdBtn('tfire',()=>{touchFire=true;audioInit();},()=>touchFire=false);
holdBtn('tjump',()=>touchJump=true);
holdBtn('tswap',()=>cycleWeapon(1));
holdBtn('treload',()=>startReload());
holdBtn('tnade',()=>throwGrenade());
holdBtn('tmelee',()=>melee());
holdBtn('tdash',()=>doDash());
holdBtn('tflame',()=>{doFlame();doRage();});
addEventListener('touchstart',e=>{if(G.state!=='play')return;for(const t of e.changedTouches){if(t.identifier!==stickId&&t.clientX>innerWidth*.4&&lookId===null){lookId=t.identifier;lookX=t.clientX;lookY=t.clientY;}}},{passive:true});
addEventListener('touchmove',e=>{if(G.state!=='play')return;for(const t of e.changedTouches){
  if(t.identifier===stickId)moveStick(t);
  else if(t.identifier===lookId){P.yaw-=(t.clientX-lookX)*.005*S.sens;P.pitch-=(t.clientY-lookY)*.005*S.sens*(S.invert?-1:1);lookX=t.clientX;lookY=t.clientY;}}},{passive:true});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===stickId){stickId=null;touchMove.x=touchMove.y=0;knob.style.transform='';}if(t.identifier===lookId)lookId=null;}});
if(isTouch)$('hint').textContent='TAP II TO PAUSE';
$('hint').style.pointerEvents='auto';$('hint').addEventListener('click',()=>{if(G.state==='play')pause();});

/* ---------- PAUSE ---------- */
function pause(){if(G.state!=='play')return;G.state='paused';$('scope').hidden=true;P.zoom=false;mouseDown=false;touchFire=false;$('pause').hidden=false;}
function resume(){G.state='play';$('pause').hidden=true;last=performance.now();lockPointer();}
$('resume').onclick=resume;
$('quit').onclick=()=>{G.state='menu';$('pause').hidden=true;showMenu();};

/* ---------- MENUS ---------- */
let tab='levels';
function showMenu(){
  G.state='menu';clearEntities();$('hud').hidden=true;$('touch').hidden=true;$('result').hidden=true;$('pause').hidden=true;$('menu').hidden=false;
  const L=LEVELS[Math.min(LEVELS.length-1,Math.max(0,(save.unlocked||1)-1))];G.L=L;buildWorld(L,(save.unlocked||1));renderTab(tab);
}
function bankUI(){$('mcoins').textContent=save.coins;$('mstars').textContent=Object.values(save.stars).reduce((a,b)=>a+b,0)+'/'+LEVELS.length*3;$('mbest').textContent=save.best;}
function hex(c){return'#'+new THREE.Color(c).getHexString();}
const OBJ_ICON={purge:'⚔',gates:'⛩',survive:'⏱',boss:'☠'};
function renderTab(t){
  tab=t;bankUI();if(t!=='settings')rebindAction=null;
  const map={levels:'tabLevels',armory:'tabArmory',upgrades:'tabUpg',survival:'tabSurv',bestiary:'tabBest',settings:'tabSet'};
  Object.entries(map).forEach(([k,id])=>$(id).classList.toggle('sel',k===t));
  const P_=$('panel');
  if(t==='levels'){
    P_.innerHTML=EPISODES.map((ep,ei)=>'<section class="ep"><div class="ephead"><span>'+ep.name+'</span><h2>'+ep.title+'</h2><p>'+ep.desc+'</p></div><div class="grid">'+
      LEVELS.map((L,i)=>[L,i]).filter(([L])=>L.ep===ei).map(([L,i])=>{const lock=i>=save.unlocked;const s=save.stars[i]||0;const sec=[0,1,2].filter(k=>save.secrets[i+'-'+k]).length;
        return '<div class="lvl'+(lock?' locked':'')+(L.obj==='boss'?' bosslvl':'')+'"><div class="sw" style="background:linear-gradient(180deg,'+hex(L.sky)+' 0 40%,'+hex(L.block[0])+' 40% 58%,'+hex(L.ground)+' 58%)"><span class="obj">'+OBJ[L.obj]+'</span></div><h3>'+(i+1)+'. '+L.name+'</h3>'+
        '<div class="meta">'+(L.obj==='boss'?'Warlord: ':'Champion: ')+L.boss.name+'</div><div class="lrow"><span class="stars">'+[0,1,2].map(k=>k<s?'★':'<span class="off">★</span>').join('')+'</span><span class="sec">◆ '+sec+'/3</span></div>'+(LEVEL_TRIALS[i]?'<div class="trialb'+(save.trials[i]?' won':'')+'">'+(save.trials[i]?'✓ ':'')+'TRIAL: '+REWARDS[LEVEL_TRIALS[i].r].name+'</div>':'')+
        '<button '+(lock?'disabled':'class="go"')+' data-lvl="'+i+'">'+(lock?'LOCKED':(s?'REPLAY':'PLAY'))+'</button></div>';}).join('')+'</div></section>').join('');
  }else if(t==='armory'){
    const maxD=Math.max(...WEAPONS.map(w=>w.dmg*w.pellets/w.rate));
    P_.innerHTML='<div class="grid">'+WEAPONS.map((w,i)=>{const own=save.owned.includes(w.id);const dps=w.dmg*w.pellets/w.rate;
      const bar=(lbl,v)=>'<div class="stat"><span>'+lbl+'</span><u style="position:relative"><i style="width:'+Math.round(clamp(v,.05,1)*100)+'%"></i></u></div>';
      return '<div class="gun"><h3 style="color:'+hex(w.col)+'">'+(i+1)+'. '+w.name+'</h3>'+bar('DAMAGE',Math.sqrt(w.dmg*w.pellets/1100))+bar('FIRE RATE',.06/w.rate*1.4)+bar('DPS',dps/maxD)+bar('MAGAZINE',w.mag/150)+
      (w.exclusive?'<div class="excl">TRIAL EXCLUSIVE</div>':'')+'<div class="meta">'+w.desc+'</div>'+(own?'<button disabled>OWNED</button>':w.exclusive?'<button disabled>WIN THE TRIAL IN '+trialWhere(w.id)+'</button>':'<button '+(save.coins>=w.cost?'class="go"':'disabled')+' data-buy="'+w.id+'">UNLOCK · '+w.cost+' COINS</button>')+'</div>';}).join('')+'</div>';
  }else if(t==='upgrades'){renderUpgrades(P_);return;}
  else if(t==='bestiary'){renderBestiary(P_);return;}
  else if(t==='settings'){renderSettings(P_);return;}
  else{
    P_.innerHTML='<div class="lvl" style="max-width:560px;margin:auto;text-align:center;justify-items:center"><h3>ENDLESS SURVIVAL</h3><div class="meta">Every demon type, elites, and a champion every 5th wave. A random hell map each run. Best score <b style="color:var(--gold)">'+save.best+'</b> · Best wave <b style="color:var(--gold)">'+(save.survivalLvl||0)+'</b></div><button class="go" id="survGo">START SURVIVAL</button></div>';
    $('survGo').onclick=()=>startRun(0,true);
  }
  P_.querySelectorAll('[data-lvl]').forEach(b=>b.onclick=()=>startRun(+b.dataset.lvl,false));
  P_.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const w=WEAPONS.find(x=>x.id===b.dataset.buy);if(save.coins>=w.cost){save.coins-=w.cost;save.owned.push(w.id);persist();audioInit();SFX.coin();renderTab('armory');}});
}
$('tabLevels').onclick=()=>renderTab('levels');$('tabArmory').onclick=()=>renderTab('armory');$('tabUpg').onclick=()=>renderTab('upgrades');$('tabSurv').onclick=()=>renderTab('survival');$('tabBest').onclick=()=>renderTab('bestiary');$('tabSet').onclick=()=>renderTab('settings');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play')pause();});
document.addEventListener('click',()=>{audioInit();musicInit();},{once:false});
showMenu();requestAnimationFrame(loop);
