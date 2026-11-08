/* ---------- MINIMAP ---------- */
let mmT=0,mmKey='',mmBase=null;
frameHooks.push(dt=>{mmT-=dt;if(mmT>0)return;mmT=.12;drawMM();$('keyi').hidden=!G.hasKey;});
function drawMM(){
  const cv=$('mm');if(!cv)return;if(!grid||!grid.rooms||G.trial||grid.single){cv.style.display='none';return;}cv.style.display='block';
  const W=cv.width,s=W/N,g=cv.getContext('2d');
  const key=grid.rooms.map(r=>r.seen?1:0).join('')+grid.doors.map(d=>d.open?1:d.locked?2:0).join('');
  if(key!==mmKey){mmKey=key;mmBase=mmBase||document.createElement('canvas');mmBase.width=mmBase.height=W;const b=mmBase.getContext('2d');b.clearRect(0,0,W,W);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=idx(i,j),t=grid.t[k];if(t===T_WALL&&!(grid.h[k]>0))continue;const ro=grid.roomOf[k];
      if(ro>=0&&!grid.rooms[ro].seen)continue;
      if(ro<0&&t!==T_DOOR){const near=grid.doors.some(d=>grid.rooms[d.room].seen&&Math.hypot(cx(i)-d.x,cx(j)-d.z)<C*4);if(!near)continue;}
      let c='#4a3c38';if(t===T_LAVA)c='#ff6a1a';else if(t===T_PLAT)c=grid.h[k]>3?'#a89880':'#7a6a5c';else if(t===T_COVER)c='#665a52';else if(t===T_PILLAR||t===T_WALL)c='#1e1a18';else if(t===T_PAD)c='#30ff9a';else if(t===T_STAIR)c='#6a5c50';
      else if(t===T_DOOR){const d=grid.doors.find(d=>d.cells.includes(k));c=d.locked?'#ffcf3a':d.open?'#3a3330':'#ff3a1a';}
      b.fillStyle=c;b.fillRect(i*s,j*s,s+.4,s+.4);}
  }
  g.clearRect(0,0,W,W);g.drawImage(mmBase,0,0);
  const nr=nextRoom(),cur=curRoomObj();
  const rect=(r,col,dash)=>{g.setLineDash(dash||[]);g.strokeStyle=col;g.lineWidth=1.5;g.strokeRect(r.i0*s-1,r.j0*s-1,(r.i1-r.i0+1)*s+2,(r.j1-r.j0+1)*s+2);g.setLineDash([]);};
  if(nr&&nr!==cur){rect(nr,Math.floor(G.time*3)%2?'#ffcf3a':'#8a6a10',[3,2]);if(!nr.seen){g.fillStyle='#ffcf3a';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText(nr.enc==='boss'?'☠':'?',(nr.i0+nr.i1+1)/2*s,(nr.j0+nr.j1+1)/2*s+4);}}
  if(cur)rect(cur,'#f2e6d8');
  for(const r of grid.rooms){if(!r.seen)continue;if(r.enc==='boss'&&r!==cur){g.fillStyle='#ff3a1a';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText('☠',(r.i0+r.i1+1)/2*s,(r.j0+r.j1+1)/2*s+4);}
    if(r.chest&&!r.chest.opened){g.fillStyle='#ffcf3a';g.fillRect((r.i0+r.i1)/2*s,(r.j0+r.j1)/2*s,5,5);}}
  if(G.portal){const p=G.portal;const k=grid.roomOf[idx(ci(p.x),ci(p.z))];if(k<0||grid.rooms[k].seen){g.strokeStyle='#ffcf3a';g.beginPath();g.arc((p.x+ARENA)/C*s,(p.z+ARENA)/C*s,4,0,7);g.stroke();}}
  if(G.keyDrop){g.fillStyle='#ffcf3a';g.beginPath();g.arc((G.keyDrop.m.position.x+ARENA)/C*s,(G.keyDrop.m.position.z+ARENA)/C*s,3,0,7);g.fill();}
  g.fillStyle='#ff3a2a';for(const e of enemies){if(e.T.static&&e.type!=='gate')continue;if(e.cloakMats&&e.cloakA<.5)continue;const r=e.boss?3.5:1.8;g.fillRect((e.pos.x+ARENA)/C*s-r/2,(e.pos.z+ARENA)/C*s-r/2,r,r);}
  const px=(P.pos.x+ARENA)/C*s,pz=(P.pos.z+ARENA)/C*s;g.save();g.translate(px,pz);g.rotate(-P.yaw);g.fillStyle='#8ee05a';g.beginPath();g.moveTo(0,-5);g.lineTo(3.5,4);g.lineTo(-3.5,4);g.closePath();g.fill();g.restore();
}

/* ---------- MENUS ---------- */
const NEWTABS={skills:'tabSkills',relics:'tabRelics',ach:'tabAch'};
const ALLTABS={levels:'tabLevels',armory:'tabArmory',upgrades:'tabUpg',skills:'tabSkills',relics:'tabRelics',ach:'tabAch',survival:'tabSurv',bestiary:'tabBest',settings:'tabSet'};
const _rtU=renderTab;
renderTab=function(t){
  if(t!=='settings')rebindAction=null;
  if(['levels','armory','skills','relics','ach'].includes(t)){tab=t;bankUI();const P_=$('panel');UI[t](P_);}
  else{_rtU(t);if(t==='settings')lockUltra();}
  Object.entries(ALLTABS).forEach(([k,id])=>$(id)&&$(id).classList.toggle('sel',k===t));
};
const _bankU=bankUI;bankUI=function(){_bankU();const ri=rankInfo();$('mrank').textContent=ri.r;$('mtitle').textContent=rankTitle(ri.r);$('mxp').style.width=Math.min(100,ri.into/ri.need*100)+'%';$('msp').hidden=!(save.sp>0);$('msp').textContent=save.sp+' SKILL POINT'+(save.sp>1?'S':'');};
function lockUltra(){const b=document.querySelector('[data-diff="ultra"]');if(b&&rankOf()<40){b.disabled=true;b.textContent='ULTRA (RANK 40)';}}
if(S.diff==='ultra'&&rankOf()<40){S.diff='normal';}
const pips=(n,m)=>'<span class="pips2">'+'<i class="on"></i>'.repeat(n)+'<i></i>'.repeat(Math.max(0,m-n))+'</span>';
const UI={
 levels(P_){
  P_.innerHTML=EPISODES.map((ep,ei)=>{const lockEp=ei*5>=save.unlocked;
   return '<section class="ep'+(lockEp?' eplock':'')+'"><div class="ephead"><span>'+ep.name+'</span><h2>'+ep.title+'</h2><p>'+(lockEp?'Locked. Clear the previous episode to open it.':ep.desc)+'</p></div><div class="grid">'+
   LEVELS.map((L,i)=>[L,i]).filter(([L])=>L.ep===ei).map(([L,i])=>{const lock=i>=save.unlocked;const s=save.stars[i]||0;const sec=[0,1,2].filter(k=>save.secrets[i+'-'+k]).length;
    return '<div class="lvl'+(lock?' locked':'')+(L.boss.major?' bosslvl':'')+'"><div class="sw" style="background:linear-gradient(180deg,'+hex(L.sky)+' 0 40%,'+hex(L.block[0])+' 40% 58%,'+hex(L.ground)+' 58%)"><span class="obj">'+(L.boss.major?'WARLORD':L.rooms+' ROOMS')+'</span>'+(save.nmClears[i]?'<span class="nmk" title="Cleared on Nightmare">☠</span>':'')+'</div>'+
    '<h3>'+(i+1)+'. '+L.name+'</h3><div class="meta">'+(L.boss.major?'Warlord: ':'Boss: ')+L.boss.name+'</div>'+
    '<div class="lrow"><span class="stars">'+[0,1,2].map(k=>k<s?'★':'<span class="off">★</span>').join('')+'</span><span class="sec">◆ '+sec+'/3</span><span class="sig'+(save.sigils[i]?' on':'')+'" title="Doom Sigil from the vault">◈</span></div>'+
    (LEVEL_TRIALS[i]?'<div class="trialb'+(save.trials[i]?' won':'')+'">'+(save.trials[i]?'✓ ':'')+'TRIAL: '+REWARDS[LEVEL_TRIALS[i].r].name+'</div>':'')+
    '<button '+(lock?'disabled':'class="go"')+' data-lvl="'+i+'">'+(lock?'LOCKED':(s?'REPLAY':'PLAY'))+'</button></div>';}).join('')+'</div></section>';}).join('')+
   '<div class="help">Each level is a chain of rooms. Doors seal until the room is clear. A Key Bearer (gold cube) drops the Skull Key for the gold vault, which holds a relic and that level\'s Doom Sigil.</div>';
  P_.querySelectorAll('[data-lvl]').forEach(b=>b.onclick=()=>startRun(+b.dataset.lvl,false));},
 armory(P_){
  const maxD=Math.max(...WEAPONS.map(w=>w.dmg*w.pellets/w.rate));const sig=cnt(save.sigils);
  P_.innerHTML='<div class="grid">'+WEAPONS.map(w=>{const own=save.owned.includes(w.id);const dps=w.dmg*w.pellets/w.rate;const mt=masteryTier(w.id),k=save.wk[w.id]||0,nx=MASTERY[mt];
   const bar=(lbl,v)=>'<div class="stat"><span>'+lbl+'</span><u style="position:relative"><i style="width:'+Math.round(clamp(v,.05,1)*100)+'%"></i></u></div>';
   return '<div class="gun'+(mt>=4?' goldc':'')+'"><h3 style="color:'+(mt>=4?'#ffcf3a':hex(w.col))+'">'+w.name+'</h3>'+bar('DAMAGE',Math.sqrt(w.dmg*w.pellets/1100))+bar('FIRE RATE',.06/w.rate*1.4)+bar('DPS',dps/maxD)+
    (w.exclusive?'<div class="excl">TRIAL EXCLUSIVE</div>':w.mythic?'<div class="excl" style="color:#3aff6a">MYTHIC · DOOM SIGILS '+sig+'/20</div>':'')+'<div class="meta">'+w.desc+'</div>'+
    (own?'<div class="mast">MASTERY '+pips(mt,4)+' <small>'+(nx?k+'/'+nx+' kills':'GOLD')+'</small></div>':'')+
    (own?'<button disabled>OWNED</button>':w.exclusive?'<button disabled>WIN THE TRIAL IN '+trialWhere(w.id)+'</button>':w.mythic?'<button disabled>COLLECT ALL 20 SIGILS</button>':'<button '+(save.coins>=w.cost?'class="go"':'disabled')+' data-buy="'+w.id+'">UNLOCK · '+w.cost+' COINS</button>')+'</div>';}).join('')+'</div>'+
   '<div class="help">Mastery: kill demons with a weapon to rank it up. Each tier adds 5% damage. Tier 4 turns the weapon gold.</div>';
  P_.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const w=WEAPONS.find(x=>x.id===b.dataset.buy);if(save.coins>=w.cost){save.coins-=w.cost;save.owned.push(w.id);persist();audioInit();SFX.coin();renderTab('armory');}});},
 skills(P_){
  const ri=rankInfo();
  P_.innerHTML='<div class="set"><section class="wide"><h3>RANK '+ri.r+' · '+rankTitle(ri.r)+'</h3><div class="xpbar big"><i style="width:'+Math.min(100,ri.into/ri.need*100)+'%"></i></div><div class="note">'+(ri.r>=100?'Max rank reached.':ri.into+' / '+ri.need+' XP to the next rank.')+' Every rank gives a skill point. Rank 100 is the end of the road.</div>'+
   '<div class="sr"><label><b style="font-size:20px;margin:0">'+(save.sp||0)+'</b> skill points to spend</label><button id="respec">RESET SKILLS · 1000 COINS</button></div></section>'+
   '<section class="wide"><h3>POWERS</h3><div class="note">Two power slots: '+keyName(S.kb.flame)+' and '+keyName(S.kb.power2)+'. Upgrading a power costs 2 skill points per rank.</div><div class="grid">'+
   Object.entries(POWERS).map(([id,p])=>{const ok=p.req(),r=prank(id),sl=(save.loadout||[]).indexOf(id);
    return '<div class="gun'+(ok?'':' locked')+'"><h3 style="color:'+(ok?'var(--teal)':'var(--dim)')+'">'+p.name+'</h3><div class="meta">'+p.desc+'</div><div class="meta">Cooldown '+powerCd(id).toFixed(1)+'s · Rank '+pips(r,3)+'</div>'+
    (ok?'<div class="row" style="justify-content:flex-start;gap:6px"><button data-eq="'+id+'" data-s="0" class="'+(sl===0?'sel':'')+'">SLOT 1</button><button data-eq="'+id+'" data-s="1" class="'+(sl===1?'sel':'')+'">SLOT 2</button>'+(r<3?'<button data-pr="'+id+'" '+(save.sp>=2?'class="go"':'disabled')+'>+RANK · 2 SP</button>':'')+'</div>':'<div class="meta"><b style="color:#c07aff">'+p.unlock.toUpperCase()+'</b></div>')+'</div>';}).join('')+'</div></section>'+
   '<section class="wide"><h3>SKILLS</h3><div class="grid">'+SKILLS.map(s=>{const r=sk(s.id);return '<div class="gun"><h3>'+s.name+'</h3>'+pips(r,s.max)+'<div class="meta">'+s.d+' per rank</div>'+(r<s.max?'<button data-sk="'+s.id+'" '+(save.sp>=1?'class="go"':'disabled')+'>+1 · 1 SP</button>':'<button disabled>MAXED</button>')+'</div>';}).join('')+'</div></section></div>';
  P_.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{if(save.sp<1)return;save.sp--;save.skills[b.dataset.sk]=sk(b.dataset.sk)+1;persist();applyUpgrades();SFX.armor();renderTab('skills');});
  P_.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{if(save.sp<2)return;save.sp-=2;save.prank[b.dataset.pr]=prank(b.dataset.pr)+1;persist();SFX.armor();renderTab('skills');});
  P_.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{const id=b.dataset.eq,s=+b.dataset.s;const L=save.loadout||(save.loadout=[null,null]);const o=L.indexOf(id);if(o>=0)L[o]=L[s];L[s]=id;persist();renderTab('skills');});
  $('respec').onclick=()=>{const spent=Object.values(save.skills).reduce((a,b)=>a+b,0)+Object.values(save.prank).reduce((a,b)=>a+b*2,0);if(!spent||save.coins<1000){feedMenu(spent?'You need 1000 coins':'Nothing to reset');return;}
    save.coins-=1000;save.sp+=spent;save.skills={};save.prank={};persist();applyUpgrades();renderTab('skills');feedMenu('Skills reset');};},
 relics(P_){
  const n=relicSlots();save.equip=save.equip.filter(id=>save.relics[id]).slice(0,n);
  P_.innerHTML='<div class="set"><section class="wide"><h3>EQUIPPED · '+save.equip.length+'/'+n+' SLOTS</h3><div class="note">More slots at rank 10, 30 and 60. Relics drop from elites (rare), bosses and vault chests. Legendary relics only drop on Nightmare or Ultra, or come from the hardest achievements.</div>'+
   '<div class="row" style="justify-content:flex-start">'+[0,1,2,3].map(k=>{const id=save.equip[k];return '<div class="rslot'+(k>=n?' lockd':'')+'">'+(id?'<b style="color:'+RARITY[RELICS[id].r].c+'">'+RELICS[id].n+'</b><small>'+RELICS[id].d+'</small>':k>=n?'<small>RANK '+[1,10,30,60][k]+'</small>':'<small>EMPTY</small>')+'</div>';}).join('')+'</div></section>'+
   '<section class="wide"><h3>COLLECTION · '+cnt(save.relics)+'/'+Object.keys(RELICS).length+'</h3><div class="grid">'+
   Object.entries(RELICS).map(([id,r])=>{const own=save.relics[id],on=save.equip.includes(id),col=RARITY[r.r].c;
    return '<div class="gun relic'+(own?'':' locked')+'" style="border-color:'+(own?col:'var(--line)')+'"><h3 style="color:'+col+'">'+(own?r.n:'???')+'</h3><div class="excl" style="color:'+col+'">'+r.r.toUpperCase()+'</div><div class="meta">'+(own?r.d:'Not found yet.')+'</div>'+
    (own?'<button data-rl="'+id+'" class="'+(on?'sel':'go')+'">'+(on?'UNEQUIP':'EQUIP')+'</button>':'')+'</div>';}).join('')+'</div></section></div>';
  P_.querySelectorAll('[data-rl]').forEach(b=>b.onclick=()=>{const id=b.dataset.rl;const i=save.equip.indexOf(id);if(i>=0)save.equip.splice(i,1);else{if(save.equip.length>=relicSlots()){feedMenu('All slots full. Unequip one first');return;}save.equip.push(id);}persist();applyUpgrades();renderTab('relics');});},
 ach(P_){
  const done=ACH.filter(a=>save.ach[a[0]]).length;
  P_.innerHTML='<div class="set"><section class="wide"><h3>ACHIEVEMENTS · '+done+'/'+ACH.length+'</h3><div class="xpbar big"><i style="width:'+(done/ACH.length*100)+'%"></i></div></section></div><div class="grid achg">'+
   ACH.map(([id,n,d,t,rw,secret])=>{const ok=save.ach[id];const rws=[rw.c?rw.c+' coins':'',rw.sp?rw.sp+' SP':'',rw.xp?rw.xp+' XP':'',rw.relic?'Relic: '+RELICS[rw.relic].n:''].filter(Boolean).join(' · ');
    return '<div class="ach'+(ok?' done':'')+'"><b>'+(ok?'✓ ':'')+(secret&&!ok?'SECRET':n)+'</b><small>'+(secret&&!ok?'Keep playing to discover this one.':d)+'</small><em>'+rws+'</em></div>';}).join('')+'</div>';}
};
$('tabSkills').onclick=()=>renderTab('skills');$('tabRelics').onclick=()=>renderTab('relics');$('tabAch').onclick=()=>renderTab('ach');
renderTab(tab);
