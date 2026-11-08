/* ---------- SETTINGS ---------- */
const DIFFS={
 easy:{label:'RECRUIT',hp:.7,dmg:.5,coins:.8,desc:'Demons are weaker and hit softer.'},
 normal:{label:'SOLDIER',hp:1,dmg:1,coins:1,desc:'The intended experience.'},
 hard:{label:'VETERAN',hp:1.35,dmg:1.4,coins:1.3,desc:'Tougher demons, 30% more coins.'},
 nightmare:{label:'NIGHTMARE',hp:1.8,dmg:2,coins:1.7,desc:'Brutal. 70% more coins and XP. Legendary relics can drop.'},
 ultra:{label:'ULTRA',hp:2.4,dmg:2.6,coins:2.5,desc:'Unlocked at rank 40. 150% more coins and XP. Legendary relics can drop.'}
};
const ACTIONS=[['fwd','Move forward','KeyW'],['back','Move back','KeyS'],['left','Strafe left','KeyA'],['right','Strafe right','KeyD'],['jump','Jump','Space'],['sprint','Sprint','ShiftLeft'],['reload','Reload','KeyR'],['nade','Throw grenade','KeyG'],['melee','Melee / finisher','KeyF'],['dash','Dash','KeyE'],['flame','Power slot 1','KeyX'],['power2','Power slot 2','KeyC'],['rage','Rage','KeyZ'],['next','Next weapon','KeyQ'],['pause','Pause','KeyP']];
const S_DEFAULT={music:.6,pix:2,shadows:true,diff:'normal',sens:1,invert:false,fov:78,vol:.7,gore:'full',dmgNums:true,bars:true,aimAssist:true,shake:1,xcol:'#f2e6d8',kb:Object.fromEntries(ACTIONS.map(a=>[a[0],a[2]]))};
let S=JSON.parse(JSON.stringify(S_DEFAULT));
try{const s=JSON.parse(localStorage.getItem('hellbreach-settings'));if(s){S=Object.assign(S,s);S.kb=Object.assign({},S_DEFAULT.kb,s.kb||{});if(S.music===undefined)S.music=.6;}}catch(e){}
function saveSettings(){try{localStorage.setItem('hellbreach-settings',JSON.stringify(S));}catch(e){}applySettings();}
function applySettings(){if(typeof resize==='function')resize();if(renderer.shadowMap.enabled!==S.shadows){renderer.shadowMap.enabled=S.shadows;sun.castShadow=S.shadows;Object.values(matCache).concat(Object.values(skinCache)).forEach(m=>m.needsUpdate=true);scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}if(master)master.gain.value=.5*S.vol;document.documentElement.style.setProperty('--xcol',S.xcol);}
const kb=a=>keys[S.kb[a]];
function keyName(c){if(!c)return'—';return c.replace(/^Key/,'').replace(/^Digit/,'').replace('ShiftLeft','L-SHIFT').replace('ShiftRight','R-SHIFT').replace('ControlLeft','L-CTRL').replace('AltLeft','L-ALT').replace('Space','SPACE').replace(/^Arrow/,'').toUpperCase();}
let rebindAction=null;

/* ---------- FEEDBACK: damage numbers + health bars ---------- */
const nums=[];const projV=new THREE.Vector3();
function dmgNumber(pos,amt,head){
  if(!S.dmgNums)return;
  const el=document.createElement('div');el.className='dn'+(head?' hd':'');el.textContent=Math.round(amt)+(head?'!':'');$('nums').appendChild(el);
  nums.push({el,pos:pos.clone().add(new THREE.Vector3(rand(-.3,.3),.3,rand(-.3,.3))),life:.8});
  if(nums.length>40){const n=nums.shift();n.el.remove();}
}
function updateNums(dt){
  for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.life-=dt;n.pos.y+=dt*1.5;
    if(n.life<=0){n.el.remove();nums.splice(i,1);continue;}
    projV.copy(n.pos).project(camera);
    if(projV.z>1){n.el.style.opacity=0;continue;}
    n.el.style.opacity=Math.min(1,n.life*2.5);n.el.style.transform='translate('+((projV.x*.5+.5)*innerWidth)+'px,'+((-projV.y*.5+.5)*innerHeight)+'px) translate(-50%,-50%)';}
}
const barTex=(()=>{const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,4,4);return new THREE.CanvasTexture(c);})();
function addHealthBar(e){
  const bg=new THREE.Sprite(new THREE.SpriteMaterial({map:barTex,color:0x000000,opacity:.6,transparent:true,depthWrite:false}));
  const fg=new THREE.Sprite(new THREE.SpriteMaterial({map:barTex,color:0xe8261c,depthWrite:false}));
  const w=1.3*Math.min(1.6,e.size);bg.scale.set(w+.1,.2,1);fg.scale.set(w,.13,1);fg.center.set(0,.5);
  const y=(e.T.flying?3.6:2.35)*e.size;bg.position.y=y;fg.position.set(-w/2,y,0);
  // keep bars upright regardless of group scale
  e.body.g.add(bg,fg);e.bar={bg,fg,w};bg.visible=fg.visible=false;
}
function updateBar(e){
  if(!e.bar)return;const show=S.bars&&e.spawnT<=0&&e.hp>0&&(e.hp<e.max||Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<22);e.bar.bg.visible=e.bar.fg.visible=show;
  if(show){const k=Math.max(0,e.hp/e.max);e.bar.fg.scale.x=e.bar.w*k;e.bar.fg.material.color.set(e.staggered?(Math.floor(G.time*8)%2?0xff9a1a:0x3ac0ff):0xe8261c);}
}

/* ---------- BLOOD ORBS (healing) ---------- */
const orbGeo=new THREE.OctahedronGeometry(.16);
function spawnOrbs(x,y,z,n,heal){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(orbGeo,mat(0xff1a1a,0xaa0000));m.position.set(x+rand(-.6,.6),y,z+rand(-.6,.6));scene.add(m);
    pickups.push({g:m,kind:'orb',t:0,life:14,heal,v:new THREE.Vector3(rand(-3,3),rand(3,6),rand(-3,3))});}
}

/* ---------- SETTINGS UI ---------- */
function renderSettings(P_){
  const opt=(id,cur,list)=>'<select id="'+id+'">'+list.map(([v,l])=>'<option value="'+v+'"'+(String(cur)===String(v)?' selected':'')+'>'+l+'</option>').join('')+'</select>';
  const tog=(id,on)=>'<button class="tg'+(on?' on':'')+'" id="'+id+'" aria-pressed="'+on+'">'+(on?'ON':'OFF')+'</button>';
  P_.innerHTML='<div class="set">'+
   '<section><h3>GAMEPLAY</h3>'+
    '<div class="sr"><label>Difficulty</label><div class="dif">'+Object.entries(DIFFS).map(([k,d])=>'<button data-diff="'+k+'" class="'+(S.diff===k?'sel':'')+'">'+d.label+'</button>').join('')+'</div></div>'+
    '<div class="note">'+DIFFS[S.diff].desc+' Demon health ×'+DIFFS[S.diff].hp+', demon damage ×'+DIFFS[S.diff].dmg+', coins ×'+DIFFS[S.diff].coins+'.</div>'+
    '<div class="sr"><label for="s_aim">Aim assist (bigger hit zones)</label>'+tog('s_aim',S.aimAssist)+'</div>'+
    '<div class="sr"><label for="s_gore">Gore</label>'+opt('s_gore',S.gore,[['full','Full'],['reduced','Reduced'],['off','Off (dust)']])+'</div>'+
    '<div class="sr"><label for="s_nums">Damage numbers</label>'+tog('s_nums',S.dmgNums)+'</div>'+
    '<div class="sr"><label for="s_bars">Demon health bars</label>'+tog('s_bars',S.bars)+'</div>'+
   '</section>'+
   '<section><h3>CONTROLS &amp; VIEW</h3>'+
    '<div class="sr"><label for="s_pix">Pixel look</label>'+opt('s_pix',S.pix,[[1,'Sharp (1×)'],[2,'Retro (2×)'],[3,'Chunky (3×)'],[4,'Extra chunky (4×)']])+'</div>'+
    '<div class="sr"><label for="s_sh">Shadows</label>'+tog('s_sh',S.shadows)+'</div>'+
    '<div class="sr"><label for="s_sens">Mouse sensitivity <b id="v_sens">'+S.sens.toFixed(2)+'</b></label><input type="range" id="s_sens" min="0.2" max="3" step="0.05" value="'+S.sens+'"></div>'+
    '<div class="sr"><label for="s_inv">Invert look up/down</label>'+tog('s_inv',S.invert)+'</div>'+
    '<div class="sr"><label for="s_fov">Field of view <b id="v_fov">'+S.fov+'°</b></label><input type="range" id="s_fov" min="60" max="110" step="1" value="'+S.fov+'"></div>'+
    '<div class="sr"><label for="s_shake">Screen shake <b id="v_shake">'+Math.round(S.shake*100)+'%</b></label><input type="range" id="s_shake" min="0" max="1.5" step="0.05" value="'+S.shake+'"></div>'+
    '<div class="sr"><label for="s_vol">Volume <b id="v_vol">'+Math.round(S.vol*100)+'%</b></label><input type="range" id="s_vol" min="0" max="1" step="0.05" value="'+S.vol+'"></div>'+
    '<div class="sr"><label for="s_mus">Music <b id="v_mus">'+Math.round(S.music*100)+'%</b></label><input type="range" id="s_mus" min="0" max="1" step="0.05" value="'+S.music+'"></div>'+
    '<div class="sr"><label for="s_x">Crosshair colour</label>'+opt('s_x',S.xcol,[['#f2e6d8','Bone white'],['#8ee05a','Toxic green'],['#3ac0ff','Plasma blue'],['#ffae1f','Amber'],['#ff3bd0','Magenta']])+'</div>'+
   '</section>'+
   '<section class="wide"><h3>KEY BINDINGS</h3><div class="note">Click a key, then press the new key. Esc cancels. Mouse: left fire, right zoom/scope, wheel switch. Number keys 1–9 pick a weapon.</div><div class="kbs">'+
    ACTIONS.map(([a,l])=>'<div class="sr"><label>'+l+'</label><button class="kb'+(rebindAction===a?' wait':'')+'" data-kb="'+a+'">'+(rebindAction===a?'PRESS A KEY…':keyName(S.kb[a]))+'</button></div>').join('')+
   '</div><div class="row" style="justify-content:flex-start"><button id="s_kreset">RESET KEYS</button><button id="s_allreset">RESET ALL SETTINGS</button></div></section>'+
   '<section class="wide danger"><h3>PROGRESS</h3><div class="sr"><label>Wipe coins, weapons, stars and best score</label><button id="s_wipe">'+(window._wipeArm?'CLICK AGAIN TO CONFIRM':'RESET PROGRESS')+'</button></div></section>'+
  '</div>';
  const on=(id,ev,fn)=>{const el=$(id);if(el)el.addEventListener(ev,fn);};
  P_.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{S.diff=b.dataset.diff;saveSettings();renderTab('settings');});
  const togF=(id,key)=>on(id,'click',()=>{S[key]=!S[key];saveSettings();renderTab('settings');});
  togF('s_aim','aimAssist');togF('s_nums','dmgNums');togF('s_bars','bars');togF('s_inv','invert');
  on('s_pix','change',e=>{S.pix=+e.target.value;saveSettings();});togF('s_sh','shadows');
  on('s_gore','change',e=>{S.gore=e.target.value;saveSettings();});
  on('s_x','change',e=>{S.xcol=e.target.value;saveSettings();});
  const sl=(id,key,fmt)=>on(id,'input',e=>{S[key]=+e.target.value;$('v_'+id.slice(2)).textContent=fmt(S[key]);saveSettings();});
  sl('s_sens','sens',v=>v.toFixed(2));sl('s_mus','music',v=>Math.round(v*100)+'%');sl('s_fov','fov',v=>v+'°');sl('s_shake','shake',v=>Math.round(v*100)+'%');sl('s_vol','vol',v=>Math.round(v*100)+'%');
  on('s_vol','change',()=>{audioInit();applySettings();SFX.coin();});
  P_.querySelectorAll('[data-kb]').forEach(b=>b.onclick=()=>{rebindAction=b.dataset.kb;renderTab('settings');});
  on('s_kreset','click',()=>{S.kb=Object.assign({},S_DEFAULT.kb);saveSettings();renderTab('settings');});
  on('s_allreset','click',()=>{S=JSON.parse(JSON.stringify(S_DEFAULT));saveSettings();renderTab('settings');});
  on('s_wipe','click',()=>{if(!window._wipeArm){window._wipeArm=true;renderTab('settings');setTimeout(()=>{window._wipeArm=false;},4000);return;}
    window._wipeArm=false;save={coins:0,owned:['pistol'],stars:{},best:0,unlocked:1};persist();renderTab('settings');feedMenu('Progress reset');});
}
function feedMenu(t){const n=document.createElement('div');n.className='toast';n.textContent=t;document.body.appendChild(n);setTimeout(()=>n.remove(),2000);}
function captureRebind(e){
  if(!rebindAction)return false;e.preventDefault();
  if(e.code!=='Escape'){for(const k in S.kb)if(S.kb[k]===e.code&&k!==rebindAction)S.kb[k]='';S.kb[rebindAction]=e.code;saveSettings();}
  rebindAction=null;renderTab('settings');return true;
}
applySettings();
