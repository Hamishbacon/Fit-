/* =====================================================================
   MENU & STORY FLOW
   Prologue → briefing → mission → debrief → interlude → … → ending.
   Also: the STORY / MODES / CODEX tabs, checkpoints on death, and the
   start/end hooks that tie every mode together.
   ===================================================================== */

/* ---------- RUN START / END HOOKS ---------- */
const _srS=startRun;
startRun=function(i,s){
  G.mode=G._modeNext||(s?'survival':'story');G._modeNext=null;
  if(G.mode!=='descent')G.descent=null;
  _srS(i,s);
  G.fogN=scene.fog?scene.fog.near:16;G.fogF=scene.fog?scene.fog.far:78;
  applyModeStart();
  if(G.mode!=='story')return;
  const M=curMission();if(!M)return;
  const env=M.env||{};
  if(env.fog&&scene.fog){scene.fog.near=G.fogN=env.fog[0];scene.fog.far=G.fogF=env.fog[1];}
  if(env.grav)G.grav=env.grav;if(env.meteors)G.envMeteors=true;
  if(env.dark){G.darkLevel=true;setDark(true);}
  if(M.allies){Allies.spawn(M.allies.n,M.allies.rook);G.squad=true;}
  G.rescued=0;placeIntel(i);
  banner(M.name,M.code+' · '+G.L.name+' · '+DIFF().label,3.2);
  Comms.clear();if(M.intro){const l=M.intro.map(x=>x.slice());if(l[0])l[0][2]=Object.assign({},l[0][2],{delay:1.2});Comms.seq(l);}
};
const _placeP=placePortal;placePortal=function(li){if(G.mode!=='story')return;_placeP(li);};

const _erS=endRun;
endRun=function(won){
  if(G.state!=='play')return;
  const mode=G.mode,li=G.levelIdx,M=curMission(),fail=G.failMsg;
  if(mode==='descent'&&won){Modes.floorWon();return;}
  let stash=null;if(mode!=='story'&&mode!=='survival'){stash={best:save.best,lvl:save.survivalLvl};G.survival=true;}
  Comms.clear();Markers.set([]);
  _erS(won);
  if(stash){save.best=stash.best;save.survivalLvl=stash.lvl;persist();Modes.result(won);}
  if(mode==='story'&&M)storyResult(won,li,M,fail);
};

/* ---------- STORY RESULT ---------- */
function portraitLine(id,text){const c=CAST[id]||CAST.marine;return '<div class="dl"><canvas width="40" height="40" data-port="'+id+'"></canvas><div><b style="color:'+c.col+'">'+c.name+'</b><p>'+text+'</p></div></div>';}
function paintPorts(root){root.querySelectorAll('canvas[data-port]').forEach(c=>drawPortrait(c,PORTRAITS[c.dataset.port]?c.dataset.port:(CAST[c.dataset.port]&&CAST[c.dataset.port].demon?'demon':'marine')));}
function heartsHTML(){return '<div class="lantern"><span>THE LANTERN</span>'+[4,9,14].map(i=>'<i class="'+(save.story.hearts[i]?'on':'')+'" title="Warlord heart"></i>').join('')+'<i class="'+(save.story.seenEnd?'on w':'w')+'" title="The fourth heart"></i><em>'+Object.keys(save.story.hearts).length+' / 4</em></div>';}
function storyResult(won,li,M,fail){
  const res=$('resbody');const h2=res.querySelector('h2');
  if(won){
    save.story.done[li]=1;if(M.heart)save.story.hearts[li]=1;save.story.rescued=(save.story.rescued||0)+(G.rescued||0);
    const newCx=(M.codex||[]).filter(id=>Codex.unlock(id,true));persist();
    if(h2)h2.innerHTML='MISSION COMPLETE<small class="mname">'+M.code+' · '+M.name+'</small>';
    const box=document.createElement('div');box.className='debrief';
    box.innerHTML='<span class="dk">DEBRIEF</span>'+(M.outro||[]).map(l=>portraitLine(l[0],l[1])).join('')+heartsHTML()+
      ((G.rescued||0)?'<div class="rl">Survivors rescued this mission: <b>'+G.rescued+'</b> · Total: <b>'+save.story.rescued+'</b></div>':'')+
      (newCx.length?'<div class="rl">CODEX: '+newCx.map(id=>'<b style="color:#c07aff">'+STORY.codex[id].t+'</b>').join(', ')+'</div>':'');
    res.insertBefore(box,res.querySelector('.stars')?res.querySelector('.stars').nextSibling:h2.nextSibling);paintPorts(box);
    const nx=$('rnext');
    if(li===STORY.missions.length-1){const row=res.querySelector('.row');const b=document.createElement('button');b.className='go';b.textContent='THE ENDING';b.onclick=()=>playCards(STORY.ending,()=>{save.story.seenEnd=true;persist();showMenu();renderTab('levels');toast('STORY COMPLETE','Thank you for playing','Nightmare, Descent and every Boss Rush are waiting.','#ffcf3a');});row.prepend(b);
      const r=$('rretry');if(r)r.className='';}
    else if(nx){nx.textContent='CONTINUE STORY';nx.onclick=()=>{if(M.interlude)playCards([M.interlude],()=>openBriefing(li+1));else openBriefing(li+1);};}
  }else{
    if(h2)h2.innerHTML=fail?'MISSION FAILED<small class="mname">'+fail+'</small>':'YOU DIED';
    const box=document.createElement('div');box.className='debrief';box.innerHTML=portraitLine('vesta',fail?['Objective lost. We go again.','That one is on both of us. Again.','Reset. Breathe. Again.'][Math.floor(Math.random()*3)]:STORY.chatter.vestaLow[Math.floor(Math.random()*3)]);
    res.insertBefore(box,h2.nextSibling);paintPorts(box);
    if(G.cp){const row=res.querySelector('.row');const b=document.createElement('button');b.className='go';b.textContent='RETRY FROM CHECKPOINT';b.onclick=restoreCheckpoint;row.prepend(b);const r=$('rretry');if(r){r.className='';r.textContent='RESTART MISSION';}}
  }
}

/* ---------- CHECKPOINTS ---------- */
function restoreCheckpoint(){
  const cp=G.cp;if(!cp){startRun(G.levelIdx,false);return;}
  $('result').hidden=true;
  for(const R of grid.rooms){if(R.state!=='active')continue;const E=R.es;const K=E&&MK[E.kind];
    if(K&&K.kill){try{K.kill(R,E);}catch(err){}}
    if(E){if(E.objs)for(const o of E.objs)if(o.parent)o.parent.remove(o);if(E.soft)Softs.remove(E.soft);if(E.npc&&E.npc.soft)Softs.remove(E.npc.soft);if(E.runners)for(const r of E.runners)Softs.remove(r.soft);}
    R.state='idle';R.es=null;R._saidStart=false;sealRoom(R,false);}
  for(const e of enemies.slice())removeEnemy(e);
  for(const a of[shots,grenades])for(const o of a.splice(0))scene.remove(o.m);for(const f of FX.splice(0))if(f.kill)f.kill();
  G.gates=[];G.bossE=null;G.pendingBoss=null;G.bossPhase=false;G.winT=0;$('boss').hidden=true;MUS.boss=false;G.ignite=null;G.tide=null;$('gaze').style.opacity=0;
  if(G.carrying){G.carrying=null;P.spdMul=P._spdBase||1;}if(G.dark&&!G.darkLevel)setDark(false);
  const esc=G._escM&&!G.escaped?G._escM:null;if(G.escape&&G.escape.g&&G.escape.g.parent)G.escape.g.parent.remove(G.escape.g);G.escape=null;
  P.pos.set(cp.x,cp.y,cp.z);P.vel.set(0,0,0);P.yaw=cp.yaw;P.pitch=0;P.hp=P.maxHp;P.armor=Math.max(P.armor,50);P.nades=Math.max(P.nades,3);WEAPONS.forEach(w=>P.ammo[w.id]=w.mag);
  P.iframe=1.5;P.rageT=0;P.slowT=0;P.reloading=0;G.curRoom=cp.room;lightRoom(grid.rooms[cp.room]);
  for(const a of Allies.list){if(a.state==='down')Allies.revive(a,true);if(a.state==='follow'){a.pos.set(cp.x+rand(-1.5,1.5),cp.y,cp.z+rand(-1.5,1.5));a.hp=a.max;}}
  G.earned=0;G.failMsg=null;G.xpGain=0;G.runAch=[];G.runRelics=[];
  $('hud').hidden=false;$('touch').hidden=!isTouch;G.state='play';last=performance.now();navT=0;buildNav();lockPointer();
  banner('CHECKPOINT','',1.4);objText();if(esc)startEscape(esc);
}

/* ---------- STORY CARDS (prologue, interludes, ending) ---------- */
const SC={cards:null,i:0,done:null,typed:0,text:'',lines:[],li:0,lt:0};
function playCards(cards,done){showMenu();$('menu').hidden=true;G.state='story';SC.cards=cards;SC.i=-1;SC.done=done;$('story').hidden=false;audioInit();musicInit();nextCard();}
function nextCard(){SC.i++;const c=SC.cards[SC.i];if(!c){$('story').hidden=true;Comms.clear();const d=SC.done;SC.done=null;if(d)d();else showMenu();return;}
  $('st_kick').textContent=c.kick||'';$('st_text').textContent='';$('st_lines').innerHTML='';SC.text=c.text||'';SC.typed=0;SC.lines=(c.lines||[]).slice();SC.li=0;SC.lt=.6;
  $('st_next').textContent=SC.i===SC.cards.length-1?'CONTINUE ▸':'NEXT ▸';const st=$('story');st.classList.remove('in');void st.offsetWidth;st.classList.add('in');}
function cardSkip(){if(SC.typed<SC.text.length||SC.li<SC.lines.length){SC.typed=SC.text.length;$('st_text').textContent=SC.text;while(SC.li<SC.lines.length){const l=SC.lines[SC.li++];$('st_lines').insertAdjacentHTML('beforeend',portraitLine(l[0],l[1]));}paintPorts($('st_lines'));return;}nextCard();}
function storyTick(dt){
  if(G.state==='story'||G.state==='brief'){menuCam+=dt*.05;camera.position.set(Math.cos(menuCam)*24,13,Math.sin(menuCam)*24);camera.lookAt(0,1,0);gunRoot.visible=false;for(const t of torches){t.t+=dt;t.f.scale.y=.7*(.85+Math.sin(t.t*13)*.1);}}
  if(G.state==='story'&&SC.cards){const b=Math.floor(SC.typed);SC.typed=Math.min(SC.text.length,SC.typed+dt*42);const a=Math.floor(SC.typed);if(a>b){$('st_text').textContent=SC.text.slice(0,a);if(/\s/.test(SC.text.slice(b,a)))Voice.blip('log');}
    if(SC.typed>=SC.text.length&&SC.li<SC.lines.length){SC.lt-=dt;if(SC.lt<=0){const l=SC.lines[SC.li++];$('st_lines').insertAdjacentHTML('beforeend',portraitLine(l[0],l[1]));paintPorts($('st_lines'));Voice.blip(l[0]);Voice.blip(l[0]);SC.lt=Math.max(1.6,l[1].length*.045);}}}
  if(G.state==='brief'&&BR.lines){BR.t-=dt;if(BR.t<=0&&BR.i<BR.lines.length){const l=BR.lines[BR.i++];const box=$('br_lines');box.insertAdjacentHTML('beforeend',portraitLine(l[0],l[1]));paintPorts(box);box.lastChild.classList.add('in');Voice.blip(l[0]);BR.t=Math.max(1.2,l[1].length*.03);}}
}
addEventListener('keydown',e=>{if(G.state==='story'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();cardSkip();}
  else if(G.state==='brief'&&e.code==='Enter'){e.preventDefault();$('br_go').click();}
  else if(G.state==='brief'&&e.code==='Escape'){$('br_back').click();}});

/* ---------- BRIEFING ---------- */
const BR={lines:null,i:0,t:0};
function newDemons(li){const seen=new Set();for(let k=0;k<li;k++)LEVELS[k].pool.forEach(t=>seen.add(t));return LEVELS[li].pool.filter(t=>!seen.has(t));}
function openBriefing(li){
  if(li===0&&!save.story.seenPrologue){save.story.seenPrologue=true;persist();playCards(STORY.prologue,()=>openBriefing(0));return;}
  const M=STORY.missions[li],L=LEVELS[li],ep=STORY.episodes[L.ep];showMenu();$('menu').hidden=true;G.state='brief';
  const nd=newDemons(li);
  $('briefBody').innerHTML='<div class="bhead"><span>'+ep.name+' · '+ep.title+'</span><h2>'+M.code+' · '+M.name+'</h2><p>'+L.name+' · '+M.time+'</p></div>'+
   '<div class="bcols"><div class="bmain"><div class="bk">BRIEFING</div><div id="br_lines"></div></div><div class="bside">'+
   '<div class="bk">OBJECTIVES</div><ol class="bobj">'+M.obj.map(o=>'<li>'+o+'</li>').join('')+'</ol>'+
   '<div class="bk">INTEL</div><div class="bint">'+(L.boss.major?'<b style="color:var(--hot)">WARLORD</b> ':'<b>CHAMPION</b> ')+L.boss.name+' · '+(L.boss.title||'')+'</div>'+
   (nd.length?'<div class="bint">New hostiles: '+nd.map(t=>'<b>'+ENEMY[t].name+'</b>').join(', ')+'</div>':'')+
   (M.allies?'<div class="bint" style="color:#9ab0c8">Fireteam Ash deploys with you.</div>':'')+
   (M.env?'<div class="bint" style="color:#ffcf3a">'+[M.env.dark&&'Blackout: flashlight only',M.env.grav&&'Low gravity',M.env.fog&&'Heavy fog',M.env.meteors&&'Falling slag'].filter(Boolean).join(' · ')+'</div>':'')+
   (M.escape?'<div class="bint" style="color:#ff5a1a">Timed escape after the boss.</div>':'')+
   '<div class="bint">Intel datapad: '+(save.story.logs[li]?'<b style="color:#c07aff">RECOVERED</b>':'not yet found')+'</div>'+
   heartsHTML()+'</div></div>'+
   '<div class="row"><button class="go" id="br_go">DEPLOY</button><button id="br_back">BACK</button></div><div class="help">'+DIFF().label+' difficulty · change it in Settings · Enter to deploy</div>';
  BR.lines=M.brief.slice();BR.i=0;BR.t=.35;$('brief').hidden=false;
  $('br_go').onclick=()=>{$('brief').hidden=true;BR.lines=null;audioInit();G._modeNext='story';startRun(li,false);};
  $('br_back').onclick=()=>{$('brief').hidden=true;BR.lines=null;showMenu();};
}

/* ---------- MENU TABS ---------- */
$('tabLevels').textContent='STORY';$('tabSurv').textContent='MODES';$('tabBest').textContent='CODEX';
document.querySelector('#menu .tag').textContent='Erebus is falling. Feed the Lantern four Warlord hearts. Close the Breach. Hold the door.';
const _showMenuS=showMenu;showMenu=function(){$('story').hidden=true;$('brief').hidden=true;$('boon').hidden=true;Comms.clear();if(Cine.on)Cine.end(true);_showMenuS();};
function nextMission(){for(let i=0;i<STORY.missions.length;i++)if(!save.story.done[i]&&!(save.stars[i]>0))return Math.min(i,(save.unlocked||1)-1);return -1;}
UI.levels=function(P_){
  const nx=nextMission();const total=Object.keys(save.story.done).length;
  P_.innerHTML='<div class="storyhead"><div>'+heartsHTML()+'<div class="meta">Missions complete <b>'+total+'/20</b> · Survivors rescued <b>'+(save.story.rescued||0)+'</b> · Intel <b>'+Object.keys(save.story.logs).length+'/20</b> · Codex <b>'+Codex.count()+'/'+Object.keys(STORY.codex).length+'</b></div></div>'+
   '<div class="row">'+(nx>=0?'<button class="go big" id="stCont">'+(total||nx>0?'CONTINUE':'BEGIN THE STORY')+' · '+STORY.missions[nx].code+' '+STORY.missions[nx].name+'</button>':'<button class="go big" id="stEnd">WATCH THE ENDING</button>')+
   '<button id="stPro">PROLOGUE</button>'+(save.story.seenEnd?'<button id="stEnd2">ENDING</button>':'')+'</div></div>'+
   STORY.episodes.map((ep,ei)=>{const lockEp=ei*5>=save.unlocked;
   return '<section class="ep'+(lockEp?' eplock':'')+'"><div class="ephead"><span>'+ep.name+'</span><h2>'+ep.title+'</h2><p>'+(lockEp?'Locked. Finish the previous episode.':ep.desc)+'</p></div><div class="grid">'+
   LEVELS.map((L,i)=>[L,i]).filter(([L])=>L.ep===ei).map(([L,i])=>{const M=STORY.missions[i];const lock=i>=save.unlocked;const s=save.stars[i]||0;const sec=[0,1,2].filter(k=>save.secrets[i+'-'+k]).length;
    const kinds=M.spec.map(x=>ENC[x.k]||x.k).join(' · ');
    return '<div class="lvl mis'+(lock?' locked':'')+(L.boss.major?' bosslvl':'')+(i===nx?' nextm':'')+'"><div class="sw" style="background:linear-gradient(180deg,'+hex(L.sky)+' 0 40%,'+hex(L.block[0])+' 40% 58%,'+hex(L.ground)+' 58%)"><span class="obj">'+M.code+(L.boss.major?' · WARLORD':'')+'</span>'+(save.nmClears[i]?'<span class="nmk" title="Cleared on Nightmare">☠</span>':'')+'</div>'+
     '<h3>'+(lock?'???':M.name)+'</h3><div class="meta">'+L.name+'</div><div class="meta kinds">'+(lock?'':kinds+' · '+L.boss.name)+'</div>'+
     '<div class="lrow"><span class="stars">'+[0,1,2].map(k=>k<s?'★':'<span class="off">★</span>').join('')+'</span><span class="sec">◆ '+sec+'/3</span><span class="sig'+(save.story.logs[i]?' on':'')+'" title="Intel datapad" style="color:'+(save.story.logs[i]?'#c07aff':'')+'">▣</span><span class="sig'+(save.sigils[i]?' on':'')+'" title="Doom Sigil from the vault">◈</span></div>'+
     (LEVEL_TRIALS[i]?'<div class="trialb'+(save.trials[i]?' won':'')+'">'+(save.trials[i]?'✓ ':'')+'TRIAL: '+REWARDS[LEVEL_TRIALS[i].r].name+'</div>':'')+
     '<button '+(lock?'disabled':'class="go"')+' data-mis="'+i+'">'+(lock?'LOCKED':(s?'REPLAY':'BRIEFING'))+'</button></div>';}).join('')+'</div></section>';}).join('')+
   '<div class="help">Each mission is a chain of rooms with its own objectives. Doors seal until the room\'s objective is done. Clearing a room saves a checkpoint. A Key Bearer (gold cube) drops the Skull Key for the gold vault. Every mission hides an intel datapad.</div>';
  P_.querySelectorAll('[data-mis]').forEach(b=>b.onclick=()=>openBriefing(+b.dataset.mis));
  if($('stCont'))$('stCont').onclick=()=>openBriefing(nx);
  if($('stPro'))$('stPro').onclick=()=>playCards(STORY.prologue,()=>{showMenu();});
  const end=()=>playCards(STORY.ending,()=>{save.story.seenEnd=true;persist();showMenu();});if($('stEnd'))$('stEnd').onclick=end;if($('stEnd2'))$('stEnd2').onclick=end;
};
const _rtS=renderTab;
renderTab=function(t){if(t==='survival'){tab=t;bankUI();Modes.render($('panel'));Object.entries(ALLTABS).forEach(([k,id])=>$(id)&&$(id).classList.toggle('sel',k===t));return;}_rtS(t);};
$('tabSurv').onclick=()=>renderTab('survival');
document.querySelector('#menu .help').innerHTML='<kbd>WASD</kbd> move · <kbd>MOUSE</kbd> aim · <kbd>CLICK</kbd> fire · <kbd>RIGHT CLICK</kbd> zoom · <kbd>SPACE</kbd> jump · <kbd>SHIFT</kbd> sprint · <kbd>R</kbd> reload · <kbd>E</kbd> dash · <kbd>X</kbd> / <kbd>C</kbd> powers · <kbd>Z</kbd> rage · <kbd>G</kbd> grenade · <kbd>F</kbd> melee / finisher / glory strike · <kbd>1-9</kbd> / <kbd>WHEEL</kbd> switch gun · <kbd>ESC</kbd> pause<br>'+
 'Objectives that need you to hold position fill while you stand next to them, as long as no demon is in the way. Stand near a downed marine to revive them. Break a boss\'s guard with headshots, explosives and melee, then hit F up close for a Glory Strike. Rated 15+ for cartoon gore.';
document.addEventListener('pointerdown',e=>{if(G.state==='story'&&e.target.closest&&!e.target.closest('button'))cardSkip();});
$('st_next').onclick=()=>cardSkip();
renderTab(tab);
