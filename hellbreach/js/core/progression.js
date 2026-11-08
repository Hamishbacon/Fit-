/* ---------- PROGRESSION ---------- */
save=Object.assign({xp:0,sp:0,skills:{},prank:{},relics:{},equip:[],ach:{},st:{},wk:{},sigils:{},nmClears:{},ultraClears:{},trials:{},loadout:['hook','flame']},save);
function stat(k,n=1){save.st[k]=(save.st[k]||0)+n;}
const st=k=>save.st[k]||0;
const sk=id=>save.skills[id]||0;
const TITLES=['RECRUIT','GRUNT','SOLDIER','VETERAN','SLAYER','HUNTER','REAPER','DESTROYER','WARLORD','DOOM LORD'];
function rankTitle(r){return TITLES[Math.min(9,Math.floor((r-1)/10))];}
function xpNeed(r){return Math.round(250+25*Math.pow(r,1.6));}
function rankInfo(){let r=1,x=save.xp;while(r<100&&x>=xpNeed(r)){x-=xpNeed(r);r++;}return{r,into:x,need:xpNeed(r)};}
function rankOf(){return rankInfo().r;}
function addXp(n){if(!n)return;n=Math.round(n*DIFF().coins*(1+.05*sk('scholar')));const b=rankOf();save.xp+=n;G.xpGain=(G.xpGain||0)+n;const a=rankOf();
  if(a>b){save.sp=(save.sp||0)+(a-b);toast('RANK UP','RANK '+a+' · '+rankTitle(a),'+'+(a-b)+' skill point'+(a-b>1?'s':''));SFX.wave();}}

/* skills (spend skill points) */
const SKILLS=[
 {id:'toughness',name:'Toughness',max:10,d:'+8 max health'},{id:'armorer',name:'Armorer',max:10,d:'+8 max armor'},
 {id:'firepower',name:'Firepower',max:10,d:'+3% damage'},{id:'marksman',name:'Marksman',max:5,d:'+10% headshot damage'},
 {id:'quickhands',name:'Quick Hands',max:5,d:'+6% reload speed, +3% fire rate'},{id:'agility',name:'Agility',max:5,d:'Dash recharges 10% faster'},
 {id:'focus',name:'Focus',max:5,d:'Powers recharge 6% faster'},{id:'vampirism',name:'Vampirism',max:5,d:'Blood orbs heal 12% more'},
 {id:'bloodlust',name:'Bloodlust',max:5,d:'Rage builds 10% faster'},{id:'demolition',name:'Demolition',max:5,d:'+10% explosive damage, +1 grenade at ranks 3 and 5'},
 {id:'greed',name:'Greed',max:5,d:'+6% coins'},{id:'scholar',name:'Scholar',max:5,d:'+5% XP'}
];

/* relics */
const RELICS={
 bloodstone:{n:'Bloodstone',r:'common',d:'+20 max health'},ironheart:{n:'Iron Heart',r:'common',d:'+25 max armor'},gloves:{n:'Quick Gloves',r:'common',d:'Reload 15% faster'},
 luckycoin:{n:'Lucky Coin',r:'common',d:'+20% coins'},fuse:{n:'Spare Fuse',r:'common',d:'+2 grenades'},ember:{n:'Ember Charm',r:'common',d:'Burning deals double damage'},
 hunter:{n:"Hunter's Eye",r:'rare',d:'Headshots deal 30% more damage'},fang:{n:'Vampire Fang',r:'rare',d:'Every kill heals 3'},boots:{n:'Swift Boots',r:'rare',d:'+1 dash, move 10% faster'},
 pyre:{n:'Pyre Heart',r:'rare',d:'Powers recharge 15% faster'},idol:{n:'Rage Idol',r:'rare',d:'Rage builds 35% faster'},
 horn:{n:'Demon Horn',r:'epic',d:'+15% damage'},skin:{n:'Second Skin',r:'epic',d:'The first hit you take in each room does nothing'},lantern:{n:'Soul Lantern',r:'epic',d:'Blood orbs heal double'},overclock:{n:'Overclock',r:'epic',d:'Fire 12% faster'},
 thorns:{n:'Crown of Thorns',r:'legendary',d:'+25% damage and take 15% less damage'},eternal:{n:'Eternal Flame',r:'legendary',d:'Powers recharge 40% faster, dashes twice as fast'},
 godslayer:{n:'Godslayer Sigil',r:'legendary',d:'+50% damage to bosses'},voidheart:{n:'Heart of the Void',r:'legendary',d:'Rage lasts twice as long. Kills in rage heal 8'}
};
const RARITY={common:{c:'#b8b0a0',w:55},rare:{c:'#4ab0ff',w:30},epic:{c:'#c07aff',w:13},legendary:{c:'#ffb020',w:2}};
function relicSlots(){const r=rankOf();return 1+(r>=10)+(r>=30)+(r>=60);}
function relicOn(id){return save.equip.includes(id)&&!!save.relics[id];}
function giveRelic(id,why){if(save.relics[id]){save.coins+=250;toast('DUPLICATE RELIC',RELICS[id].n,'Converted to 250 coins');return;}
  save.relics[id]=1;(G.runRelics||(G.runRelics=[])).push(id);if(save.equip.length<relicSlots())save.equip.push(id);applyUpgrades();
  toast('RELIC FOUND',RELICS[id].n,RELICS[id].r.toUpperCase()+' · '+RELICS[id].d,RARITY[RELICS[id].r].c);persist();}
function rollRelic(chance){if(Math.random()>=chance)return;
  const leg=S.diff==='nightmare'||S.diff==='ultra';const tot=Object.entries(RARITY).reduce((a,[k,v])=>a+(k==='legendary'&&!leg?0:v.w),0);let x=Math.random()*tot,rar='common';
  for(const[k,v]of Object.entries(RARITY)){if(k==='legendary'&&!leg)continue;x-=v.w;if(x<=0){rar=k;break;}}
  const pool=Object.keys(RELICS).filter(k=>RELICS[k].r===rar);giveRelic(pool[Math.floor(Math.random()*pool.length)]);}

/* modifiers used by combat code */
playerDmgMul=function(e,src){let m=1+.12*(save.upg.power||0)+.03*sk('firepower')+(relicOn('horn')?.15:0)+(relicOn('thorns')?.25:0);
  if(P.rageT>0)m*=2;const w=curW();if(w&&(src===undefined||src==='proj'||src==='saw'||src==='flame'))m*=1+.05*masteryTier(w.id);
  if(e&&e.boss&&relicOn('godslayer'))m*=1.5;if(src==='explosive')m*=1+.1*sk('demolition');if(src==='burn'&&relicOn('ember'))m*=2;return m;};
function headMul(){return 2*(1+.1*sk('marksman')+(relicOn('hunter')?.3:0)+(save.perks.headhunter?.25:0));}
function coinMul(){return 1+.06*sk('greed')+(relicOn('luckycoin')?.2:0);}
function rageMul(){return(1+.25*(save.upg.fury||0))*(1+.1*sk('bloodlust'))*(relicOn('idol')?1.35:1);}
function fireMul(){return(1-.03*sk('quickhands'))*(relicOn('overclock')?.88:1);}
function reloadMul(){return(1-.06*sk('quickhands'))*(relicOn('gloves')?.85:1);}
const _auG=applyUpgrades;
applyUpgrades=function(){_auG();P.maxHp+=8*sk('toughness')+(relicOn('bloodstone')?20:0);P.maxArmor+=8*sk('armorer')+(relicOn('ironheart')?25:0);
  if(relicOn('boots'))P.maxDash++;P.maxNades+=(relicOn('fuse')?2:0)+(sk('demolition')>=3?1:0)+(sk('demolition')>=5?1:0);P.spdMul=relicOn('boots')?1.1:1;if(relicOn('voidheart'))P.rageDur*=2;};
const _orbG=spawnOrbs;spawnOrbs=function(x,y,z,n,heal){_orbG(x,y,z,n,heal*(1+.12*sk('vampirism'))*(relicOn('lantern')?2:1));};
frameHooks.push(dt=>{if(P.dashes<P.maxDash){const f=(1/(1-.1*sk('agility')))*(relicOn('eternal')?2:1)-1;P.dashRe=(P.dashRe||0)+dt*f;}});
const _rgG=doRage;doRage=function(){const b=P.rageT;_rgG();if(P.rageT>0&&!(b>0))stat('rages');};

/* hooks into damage, kills and getting hurt */
const _dmG=damageEnemy;
damageEnemy=function(e,amt,head,point,src){
  if(G._nade&&src==='explosive')e.lastW='grenade';else if(src==='punch'||(src==='melee'&&!e.boss))e.lastW='punch';else if(src===undefined||src==='proj'||src==='explosive')e.lastW=curW().id;
  _dmG(e,amt,head,point,src);
  if(head&&save.perks.headhunter&&src===undefined)P.hp=Math.min(P.maxHp,P.hp+3);
};
const _kG=killEnemy;
killEnemy=function(e,head,over){const sta=e.T.static,fin=e.finished,gib=over||e.hp<-e.max*.35,w=e.lastW,pos=e.pos.clone();
  _kG(e,head,over);if(sta||e.type==='crystal')return;
  stat('kills');if(head)stat('heads');if(gib)stat('gibs');if(fin)stat('fins');if(e.elite)stat('elites');stat('t_'+e.type);
  if(e.boss){stat('bosses');if(e.T.major)stat('warlordKills');addXp(e.T.major?4000:1500);rollRelic(G.trial?0:(e.T.major?.45:G.survival?.3:.2));}
  else{addXp((e.T.score||10)*2*(e.elite?3:1));if(e.elite)rollRelic(.025);}
  if(w){if(w==='grenade')stat('nades');else if(w==='punch')stat('punch');else{const b=masteryTier(w);save.wk[w]=(save.wk[w]||0)+1;const a=masteryTier(w);
      if(a>b){const wn=(WEAPONS.find(x=>x.id===w)||{}).name||w;toast('WEAPON MASTERY',wn+' · TIER '+a,a===4?'GOLD SKIN UNLOCKED':'+5% damage with this weapon',a===4?'#ffcf3a':null);if(a===4&&curW().id===w){gunModel=null;buildGun(curW());}}}
    if(w==='chainsaw'){stat('sawk');dropPickup(pos.x,pos.z,'ammo');spawnShards(pos.x,pos.y+1,pos.z,3);}
    if(w==='eternity')stat('bfgk');}
  if(relicOn('fang'))P.hp=Math.min(P.maxHp,P.hp+3);if(P.rageT>0&&relicOn('voidheart'))P.hp=Math.min(P.maxHp,P.hp+8);
  if(save.perks.reaper&&(fin||w==='chainsaw')&&!G._reap){G._reap=true;explode(pos.clone().setY(pos.y+1),4.5,140,0xff3a1a);G._reap=false;}
  G.maxStreak=Math.max(G.maxStreak||0,G.streak||0);
};
const _hpG=hurtPlayer;
hurtPlayer=function(d,ia){
  if(G.state!=='play'||d<=0||P.iframe>0)return;
  if(P.shieldHp>0){const a=Math.min(P.shieldHp,d);P.shieldHp-=a;d-=a;burst(P.pos.clone().setY(P.pos.y+1.2),0x7ad8ff,4,3,.6,.3);if(d<=0)return;}
  if(relicOn('skin')&&!G.trial&&G.skinRoom!==G.curRoom){G.skinRoom=G.curRoom;feed('SECOND SKIN ABSORBED THE HIT');tone('sine',900,400,.2,.15);return;}
  if(relicOn('thorns'))d*=.85;G.roomDmg=true;_hpG(d,ia);
};
function onRoomClear(R){addXp(150);if(!G.roomDmg)stat('cleanRooms');if(P.hp<=5)stat('closeCalls');}
function openVault(v){const li=G.levelIdx;const c=Math.round((200+li*25)*coinMul());G.earned+=c;addXp(500);stat('vaults');feed('+'+c+' COINS');rollRelic(1);
  if(!save.sigils[li]){save.sigils[li]=1;const n=Object.keys(save.sigils).length;toast('DOOM SIGIL',n+' / '+LEVELS.length,n>=LEVELS.length?'THE ETERNITY CANNON IS YOURS':'Collect every sigil to forge the mythic Eternity Cannon','#3aff6a');
    if(n>=LEVELS.length&&!save.owned.includes('eternity')){save.owned.push('eternity');updateSlots();}}
  else feed('SIGIL ALREADY CLAIMED HERE');persist();}

/* ---------- ACHIEVEMENTS ---------- */
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+(+b||0),0),cnt=o=>Object.keys(o||{}).filter(k=>o[k]).length;
const ACH=[
 ['first','First Blood','Kill your first demon',()=>st('kills')>=1,{c:100}],
 ['k500','Demon Slayer','Kill 500 demons',()=>st('kills')>=500,{c:500,xp:1000}],
 ['k2500','Exterminator','Kill 2,500 demons',()=>st('kills')>=2500,{c:1500,sp:1}],
 ['k10000','Extinction Event','Kill 10,000 demons',()=>st('kills')>=10000,{c:5000,sp:2}],
 ['h250','Headhunter','Land 250 headshot kills',()=>st('heads')>=250,{c:400}],
 ['h2000','Skull Collector','Land 2,000 headshot kills',()=>st('heads')>=2000,{c:2000,sp:1}],
 ['g200','Splatter','Splatter 200 demons',()=>st('gibs')>=200,{c:400}],
 ['f50','Finisher','Perform 50 finishers',()=>st('fins')>=50,{c:300}],
 ['f500','Executioner','Perform 500 finishers',()=>st('fins')>=500,{c:2000,sp:1}],
 ['e100','Elite Hunter','Kill 100 elite demons',()=>st('elites')>=100,{c:1500}],
 ['b5','Champion Breaker','Defeat 5 bosses',()=>st('bosses')>=5,{c:500}],
 ['b50','Boss Rush','Defeat 50 bosses',()=>st('bosses')>=50,{c:3000,sp:1}],
 ['ep1','The Breach Is Sealed','Complete Episode I',()=>(save.cleared||0)>=5,{c:1000,sp:1}],
 ['ep2','Depths Conquered','Complete Episode II',()=>(save.cleared||0)>=10,{c:2000,sp:1}],
 ['ep3','The Throne Falls','Complete Episode III',()=>(save.cleared||0)>=15,{c:3000,sp:1}],
 ['ep4','God Killer','Complete Episode IV',()=>(save.cleared||0)>=20,{c:6000,sp:2}],
 ['wl','Warlord\'s Bane','Slay all four Warlords',()=>[4,9,14,19].every(i=>save.bossKills[i]),{relic:'godslayer'}],
 ['star30','Star Hunter','Earn 30 stars',()=>sum(save.stars)>=30,{c:1500}],
 ['star60','Perfectionist','Earn all 60 stars',()=>sum(save.stars)>=60,{c:5000,relic:'eternal'}],
 ['sec20','Treasure Hunter','Find 20 secret shards',()=>cnt(save.secrets)>=20,{c:1000}],
 ['sec60','Archaeologist','Find all 60 secret shards',()=>cnt(save.secrets)>=60,{c:4000,relic:'voidheart'}],
 ['v5','Vault Breaker','Open 5 vaults',()=>st('vaults')>=5,{c:800}],
 ['sig20','Sigil Keeper','Collect all 20 Doom Sigils',()=>cnt(save.sigils)>=20,{c:3000,sp:1}],
 ['tr5','Trial Champion','Win 5 trials',()=>cnt(save.trials)>=5,{c:1000}],
 ['tr12','Trial Master','Win every trial',()=>cnt(save.trials)>=12,{c:4000,sp:2}],
 ['nade100','Grenadier','Kill 100 demons with grenades',()=>st('nades')>=100,{c:600}],
 ['rage50','Berserker','Unleash Rage 50 times',()=>st('rages')>=50,{c:600}],
 ['hook100','Hooked','Use the Meat Hook 100 times',()=>st('hooks')>=100,{c:500}],
 ['slam100','Ground Pounder','Use Hell Slam 100 times',()=>st('slams')>=100,{c:500}],
 ['frz200','Frozen Solid','Freeze 200 demons',()=>st('freezes')>=200,{c:500}],
 ['burn300','Pyromaniac','Set 300 demons on fire',()=>st('burns')>=300,{c:500}],
 ['saw100','Rip and Tear','Chainsaw 100 demons',()=>st('sawk')>=100,{c:800}],
 ['punch100','Bare Hands','Kill 100 demons with melee',()=>st('punch')>=100,{c:600}],
 ['surv10','Survivor','Reach wave 10 in Survival',()=>(save.survivalLvl||0)>=10,{c:800}],
 ['surv25','Endless','Reach wave 25 in Survival',()=>(save.survivalLvl||0)>=25,{c:3000,sp:1}],
 ['surv40','Immortal','Reach wave 40 in Survival',()=>(save.survivalLvl||0)>=40,{c:6000,relic:'thorns'}],
 ['nm1','Nightmare','Clear a level on Nightmare',()=>cnt(save.nmClears)>=1,{c:1000}],
 ['nm20','Nightmare Incarnate','Clear all 20 levels on Nightmare or harder',()=>cnt(save.nmClears)>=20,{c:10000,sp:3}],
 ['ultra1','Ultra-Nightmare','Clear a level on Ultra-Nightmare',()=>cnt(save.ultraClears)>=1,{c:3000,sp:1}],
 ['flaw','Untouchable','Clear a level without taking damage',()=>st('flawless')>=1,{c:2000,sp:1}],
 ['speed','Speed Demon','Clear a level in under 3 minutes',()=>st('speedruns')>=1,{c:800}],
 ['streak','Massacre','Get a 6-kill streak',()=>st('massacres')>=1,{c:400}],
 ['rel10','Collector','Own 10 relics',()=>cnt(save.relics)>=10,{c:1500}],
 ['rel19','Hoarder','Own every relic',()=>cnt(save.relics)>=Object.keys(RELICS).length,{c:8000,sp:2}],
 ['arsenal','Arsenal','Own every weapon you can buy',()=>WEAPONS.filter(w=>!w.exclusive&&!w.mythic).every(w=>save.owned.includes(w.id)),{c:2000}],
 ['gold1','Gold Standard','Master a weapon to gold',()=>WEAPONS.some(w=>masteryTier(w.id)>=4),{c:2000}],
 ['gold5','Golden Arsenal','Master 5 weapons to gold',()=>WEAPONS.filter(w=>masteryTier(w.id)>=4).length>=5,{c:6000,sp:2}],
 ['r10','Rank 10','Reach rank 10',()=>rankOf()>=10,{c:500}],
 ['r25','Rank 25','Reach rank 25',()=>rankOf()>=25,{c:1500}],
 ['r50','Rank 50','Reach rank 50',()=>rankOf()>=50,{c:4000,sp:1}],
 ['r100','Doom Lord','Reach rank 100',()=>rankOf()>=100,{c:20000,sp:3}],
 ['jugg','Giant Slayer','Kill 25 Juggernauts',()=>st('t_juggernaut')>=25,{c:800}],
 ['necro','Exorcist','Kill 25 Necromancers',()=>st('t_necromancer')>=25,{c:800}],
 ['heads','Head Count','Destroy 30 hydra heads',()=>st('t_hydrahead')>=30,{c:800}],
 ['bfg','Eternity','Kill a demon with the Eternity Cannon',()=>st('bfgk')>=1,{c:2000}],
 ['allpow','Power Overwhelming','Unlock every power',()=>Object.values(POWERS).every(p=>p.req()),{c:3000,sp:1}],
 ['close','Close Call','Clear a room with 5 health or less',()=>st('closeCalls')>=1,{c:500},true],
 ['die10','Persistence','Die 10 times',()=>st('deaths')>=10,{c:300},true],
 ['clean','Clean Sweep','Clear 50 rooms without taking damage',()=>st('cleanRooms')>=50,{c:1500},true]
];
function checkAch(){for(const[id,n,d,test,rw]of ACH){if(save.ach[id])continue;let ok=false;try{ok=test();}catch(e){}if(!ok)continue;
  save.ach[id]=1;(G.runAch||(G.runAch=[])).push(n);let txt=[];if(rw.c){save.coins+=rw.c;txt.push('+'+rw.c+' coins');}if(rw.sp){save.sp=(save.sp||0)+rw.sp;txt.push('+'+rw.sp+' skill point'+(rw.sp>1?'s':''));}
  toast('ACHIEVEMENT',n,txt.join(' · ')||d,'#ffcf3a');if(rw.xp)addXp(rw.xp);if(rw.relic)setTimeout(()=>giveRelic(rw.relic),900);}persist();}
let achT=0;frameHooks.push(dt=>{achT-=dt;if(achT<=0){achT=1.5;checkAch();}});

/* ---------- TOASTS ---------- */
function toast(kind,title,sub,col){const box=$('toasts');if(!box)return;const d=document.createElement('div');d.className='toast2';if(col)d.style.borderColor=col;
  d.innerHTML='<span>'+kind+'</span><b'+(col?' style="color:'+col+'"':'')+'>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'');box.appendChild(d);setTimeout(()=>d.remove(),4200);while(box.children.length>4)box.firstChild.remove();}

/* ---------- RUN SUMMARY ---------- */
const _endG=endRun;
endRun=function(won){
  if(G.state!=='play')return;const li=G.levelIdx,surv=G.survival;const powB=Object.keys(POWERS).filter(k=>POWERS[k].req());const coinsB=save.coins;
  if(won&&!surv)addXp(800+li*80);if(surv)addXp(G.wave*150);
  _endG(won);
  if(won&&!surv){addXp((save.stars[li]||0)*250);stat('levels');if(S.diff==='nightmare'||S.diff==='ultra')save.nmClears[li]=1;if(S.diff==='ultra')save.ultraClears[li]=1;if(!G.tookDamage)stat('flawless');if(G.time<180)stat('speedruns');}
  if(!won)stat('deaths');if((G.maxStreak||0)>=6)stat('massacres');
  checkAch();stat('coinsTot',save.coins-coinsB);persist();
  const ri=rankInfo();const box=document.createElement('div');box.className='runsum';
  const newP=Object.keys(POWERS).filter(k=>POWERS[k].req()&&!powB.includes(k));
  box.innerHTML='<div class="xpline"><b>RANK '+ri.r+'</b><span>'+rankTitle(ri.r)+'</span><em>+'+(G.xpGain||0)+' XP</em></div><div class="xpbar"><i style="width:'+Math.min(100,ri.into/ri.need*100).toFixed(1)+'%"></i></div>'+
    (save.sp>0?'<div class="rl">'+save.sp+' unspent skill point'+(save.sp>1?'s':'')+'. Spend them in SKILLS.</div>':'')+
    ((G.runRelics||[]).length?'<div class="rl">RELICS: '+G.runRelics.map(id=>'<b style="color:'+RARITY[RELICS[id].r].c+'">'+RELICS[id].n+'</b>').join(', ')+'</div>':'')+
    ((G.runAch||[]).length?'<div class="rl">ACHIEVEMENTS: <b>'+G.runAch.join(', ')+'</b></div>':'')+
    newP.map(k=>'<div class="unlock">NEW POWER: '+POWERS[k].name+'<small>'+POWERS[k].desc+' Equip it in SKILLS.</small></div>').join('');
  const row=$('resbody').querySelector('.row');$('resbody').insertBefore(box,row);
  const b=document.createElement('button');b.textContent='SKILLS';b.onclick=()=>{showMenu();renderTab('skills');};row.appendChild(b);
};
