/* ---------- UPGRADES ---------- */
const UPGRADES=[
 {id:'vit',name:'Vitality',desc:'+25 max health per rank.',costs:[300,700,1300]},
 {id:'plate',name:'Plating',desc:'+25 max armor per rank.',costs:[250,600,1100]},
 {id:'power',name:'Firepower',desc:'+12% damage with everything per rank.',costs:[500,1100,2000]},
 {id:'hands',name:'Quick Hands',desc:'Reload 15% faster per rank.',costs:[300,800]},
 {id:'dash',name:'Phase Boots',desc:'+1 dash charge.',costs:[700]},
 {id:'nade',name:'Grenadier',desc:'Carry 2 more grenades.',costs:[400]},
 {id:'pyro',name:'Pyromancer',desc:'Flame Burst recharges 30% faster.',costs:[600]},
 {id:'fury',name:'Fury',desc:'Rage builds 25% faster and lasts 3s longer.',costs:[800]}
];
const ABILS=[
 {id:'dash',name:'DASH',key:'dash',desc:'Burst a short distance in the direction you are moving. Brief invulnerability. Recharges.'},
 {id:'djump',name:'DOUBLE JUMP',key:'jump',desc:'Jump again in mid-air. Reach high platforms and dodge shockwaves.'},
 {id:'flame',name:'FLAME BURST',key:'flame',desc:'Set nearby demons on fire. Burning demons drop green armor shards when you hit them.'},
 {id:'rage',name:'RAGE',key:'rage',desc:'Fill the meter by dealing damage. Unleash for double damage, faster firing, half damage taken and health on kill.'}
];
function applyUpgrades(){const u=save.upg;
  P.maxHp=100+25*(u.vit||0);P.maxArmor=100+25*(u.plate||0);P.maxDash=2+(u.dash||0);P.maxNades=5+2*(u.nade||0);
  P.flameMax=18*(u.pyro?.7:1);P.rageDur=8+(u.fury?3:0);}
applyUpgrades();
startReload=function(){const w=curW();if(P.reloading>0||P.ammo[w.id]===w.mag)return;P.reloading=w.reload*(1-.15*(save.upg.hands||0));P.reloadMax=P.reloading;SFX.reload();};
hurtPlayer=function(d,ignoreArmor){
  if(G.state!=='play'||d<=0)return;if(P.iframe>0)return;
  d*=DIFFS[S.diff].dmg;if(P.rageT>0)d*=.5;
  if(P.armor>0&&!ignoreArmor){const absorb=Math.min(P.armor,d*.6);P.armor-=absorb;d-=absorb;}
  P.hp-=d;P.hurtT=.3;SFX.hurt();shake(.18);G.tookDamage=true;
  $('vig').style.opacity=.6;setTimeout(()=>$('vig').style.opacity=0,160);
  if(P.hp<=0){P.hp=0;endRun(false);}
};

/* ---------- ABILITIES ---------- */
function moveDir(){let fx=0,fz=0;if(kb('fwd')||keys.ArrowUp)fz+=1;if(kb('back')||keys.ArrowDown)fz-=1;if(kb('left')||keys.ArrowLeft)fx-=1;if(kb('right')||keys.ArrowRight)fx+=1;fx+=touchMove.x;fz+=touchMove.y;
  if(Math.hypot(fx,fz)<.2)fz=1;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);return new THREE.Vector3(-sy*fz+cy*fx,0,-cy*fz-sy*fx).normalize();}
function doDash(){
  if(G.state!=='play'||P.dashes<1||P.dashT>0)return;
  const d=moveDir();P.dashes--;P.dashT=.17;P.iframe=.22;P.dashV=d.multiplyScalar(26);if(!P.onGround)P.vel.y=Math.max(P.vel.y,1.5);
  tone('',2500,0,.18,.35,true);tone('sine',500,1400,.15,.12);camera.fov+=8;
  for(let i=0;i<6;i++)burst(P.pos.clone().setY(P.pos.y+.8),0x9ad8ff,1,2,.6,.3);
}
function doFlame(){
  if(G.state!=='play'||!abilityOn('flame')||P.flameCd>0)return;
  P.flameCd=P.flameMax;const d=new THREE.Vector3();camera.getWorldDirection(d);
  const o=camera.position.clone();SFX.rocket();tone('',600,0,.6,.5,true);
  for(let i=0;i<40;i++){const v=d.clone().multiplyScalar(rand(8,16));v.x+=rand(-4,4);v.y+=rand(-1.5,3);v.z+=rand(-4,4);const m=new THREE.Mesh(partGeo,mat(Math.random()<.5?0xff7a00:0xffcc33,0xff5500));m.position.copy(o).addScaledVector(d,.8);m.position.y-=.3;m.scale.setScalar(rand(1.5,3));scene.add(m);parts.push({m,v,life:rand(.3,.55)});}
  lightFlash(o.clone().addScaledVector(d,3),0xff7a00,3,14,.4);
  let n=0;for(const e of enemies.slice()){if(e.T.static)continue;const to=new THREE.Vector3(e.pos.x-P.pos.x,0,e.pos.z-P.pos.z);const dist=to.length();const fl=new THREE.Vector3(d.x,0,d.z).normalize();
    if(dist<8+e.size*.4&&(dist<2||to.normalize().dot(fl)>.6)){e.burnT=6;e.burnTick=0;n++;if(e.boss)e.burnT=3;damageEnemy(e,14,false,e.pos.clone().setY(e.pos.y+1.2),'burn');}}
  feed(n?'IGNITED '+n:'FLAME BURST');
}
function doRage(){
  if(G.state!=='play'||!abilityOn('rage')||G.rage<100||P.rageT>0)return;
  P.rageT=P.rageDur;G.rage=0;banner('RAGE','',1.2);shake(.6);SFX.boss();P.hp=Math.min(P.maxHp,P.hp+20);
}
function abilityTick(dt){
  P.iframe=Math.max(0,(P.iframe||0)-dt);P.flameCd=Math.max(0,P.flameCd-dt);
  if(P.dashes<P.maxDash){P.dashRe=(P.dashRe||0)+dt;if(P.dashRe>=1.6){P.dashRe=0;P.dashes++;tone('triangle',900,900,.05,.06);}}else P.dashRe=0;
  if(P.rageT>0){P.rageT-=dt;if(P.rageT<=0){P.rageT=0;feed('RAGE ENDED');}}
  $('rage').style.opacity=P.rageT>0?(.55+Math.sin(G.time*10)*.15):0;
  // HUD
  const pip='<i class="on"></i>'.repeat(P.dashes)+'<i></i>'.repeat(P.maxDash-P.dashes);
  $('ab_dash').innerHTML='<b>DASH</b><span class="pips">'+pip+'</span><em>'+keyName(S.kb.dash)+'</em>';
  const fl=abilityOn('flame');$('ab_flame').className='ab'+(fl?(P.flameCd<=0?' ready':''):' lock');
  $('ab_flame').innerHTML='<b>FLAME</b><span class="meter"><i style="width:'+(fl?(1-P.flameCd/P.flameMax)*100:0)+'%"></i></span><em>'+(fl?keyName(S.kb.flame):'LOCKED')+'</em>';
  const rg=abilityOn('rage');$('ab_rage').className='ab rage'+(rg?(G.rage>=100||P.rageT>0?' ready':''):' lock');
  $('ab_rage').innerHTML='<b>RAGE</b><span class="meter"><i style="width:'+(rg?(P.rageT>0?P.rageT/P.rageDur*100:G.rage):0)+'%"></i></span><em>'+(rg?keyName(S.kb.rage):'LOCKED')+'</em>';
}

/* ---------- UPGRADES UI ---------- */
function renderUpgrades(P_){
  const lvlName=n=>LEVELS[n-1]?LEVELS[n-1].name:'';
  P_.innerHTML='<div class="set"><section class="wide"><h3>ABILITIES</h3><div class="note">Abilities unlock as you clear the campaign.</div><div class="grid">'+
   ABILS.map(a=>{const on=a.id==='dash'||abilityOn(a.id);const need=ABILITY_UNLOCK[a.id];
     return '<div class="gun"><h3 style="color:'+(on?'var(--teal)':'var(--dim)')+'">'+a.name+'</h3><div class="meta">'+a.desc+'</div><div class="meta"><b style="color:'+(on?'var(--gold)':'var(--dim)')+'">'+(on?'KEY: '+keyName(S.kb[a.key])+(a.id==='djump'?' (in mid-air)':''):'Unlocks after clearing level '+need+': '+lvlName(need))+'</b></div></div>';}).join('')+
   '</div></section><section class="wide"><h3>UPGRADES</h3><div class="grid">'+
   UPGRADES.map(u=>{const rk=save.upg[u.id]||0;const max=u.costs.length;const cost=u.costs[rk];
     return '<div class="gun"><h3>'+u.name+'</h3><div class="stars">'+'■'.repeat(rk)+'<span class="off">'+'■'.repeat(max-rk)+'</span></div><div class="meta">'+u.desc+'</div>'+
     (rk>=max?'<button disabled>MAXED</button>':'<button '+(save.coins>=cost?'class="go"':'disabled')+' data-upg="'+u.id+'">BUY · '+cost+' COINS</button>')+'</div>';}).join('')+
   '</div></section></div>';
  P_.querySelectorAll('[data-upg]').forEach(b=>b.onclick=()=>{const u=UPGRADES.find(x=>x.id===b.dataset.upg);const rk=save.upg[u.id]||0;const c=u.costs[rk];if(save.coins>=c){save.coins-=c;save.upg[u.id]=rk+1;persist();applyUpgrades();audioInit();SFX.armor();renderTab('upgrades');}});
}
function renderBestiary(P_){
  P_.innerHTML='<div class="grid">'+Object.entries(ENEMY).map(([k,T])=>'<div class="gun"><h3 style="color:#'+new THREE.Color(T.eye).getHexString()+'">'+T.name.toUpperCase()+'</h3><div class="meta">'+T.desc+'</div><div class="meta">Health '+T.hp+' · Damage '+T.dmg+'</div></div>').join('')+
   '<div class="gun"><h3 style="color:var(--gold)">ELITES</h3><div class="meta">Any demon can spawn as an elite with a gold ring. More than double health, hits harder, drops armor and triple coins.</div></div>'+
   '<div class="gun"><h3 style="color:var(--hot)">HELL GATES</h3><div class="meta">Portals that keep spawning demons. Destroy all of them to draw out the champion.</div></div></div>';
}
