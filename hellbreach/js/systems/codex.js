/* =====================================================================
   CODEX & INTEL — lore unlocked by playing the story, plus one hidden
   audio log (datapad) per mission.
   ===================================================================== */
save.story=Object.assign({hearts:{},logs:{},codex:{},done:{},seenPrologue:false,seenEnd:false,rescued:0},save.story||{});
const Codex={
 unlock(id,quiet){if(!STORY.codex[id]||save.story.codex[id])return false;save.story.codex[id]=1;persist();if(!quiet)toast('CODEX UPDATED',STORY.codex[id].t,'','#c07aff');return true;},
 count(){return Object.keys(save.story.codex).filter(k=>STORY.codex[k]).length;},
 render(P_,sub){sub=sub||Codex.sub||'lore';Codex.sub=sub;
  const cats=['PEOPLE','PLACES','THE HOST','LANTERN'];const C=STORY.codex;
  let html='<div class="tabs sub"><button data-cx="lore" class="'+(sub==='lore'?'sel':'')+'">CODEX · '+Codex.count()+'/'+Object.keys(C).length+'</button><button data-cx="logs" class="'+(sub==='logs'?'sel':'')+'">INTEL LOGS · '+Object.keys(save.story.logs).length+'/'+STORY.missions.length+'</button><button data-cx="beasts" class="'+(sub==='beasts'?'sel':'')+'">DEMONS</button></div>';
  if(sub==='lore'){html+=cats.map(cat=>'<section class="ep"><div class="ephead"><span>CODEX</span><h2>'+cat+'</h2></div><div class="cxg">'+Object.entries(C).filter(([k,v])=>v.cat===cat).map(([k,v])=>save.story.codex[k]?
    '<div class="cx"><b>'+v.t+'</b><p>'+v.b+'</p></div>':'<div class="cx locked"><b>???</b><p>Keep playing the story to unlock this entry.</p></div>').join('')+'</div></section>').join('');}
  else if(sub==='logs'){html+='<div class="cxg">'+STORY.missions.map((M,i)=>{const got=save.story.logs[i];const l=M.log;const ch=CAST[l[0]]||CAST.log;
    return got?'<div class="cx log"><canvas class="lp" width="48" height="48" data-port="'+l[0]+'"></canvas><div><b>'+M.code+' · '+LEVELS[i].name+'</b><small style="color:'+ch.col+'">'+ch.name+'</small><p>'+l[1]+'</p></div></div>':
     '<div class="cx locked"><b>'+M.code+' · INTEL MISSING</b><p>A datapad is hidden somewhere in '+(i<save.unlocked?LEVELS[i].name:'a locked mission')+'. Look for a blinking purple light.</p></div>';}).join('')+'</div>';}
  else{html+='<div id="bestiary"></div>';}
  P_.innerHTML=html;
  if(sub==='beasts')_renderBestiaryOrig($('bestiary'));
  P_.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>{Codex.render(P_,b.dataset.cx);});
  P_.querySelectorAll('[data-port]').forEach(c=>drawPortrait(c,PORTRAITS[c.dataset.port]?c.dataset.port:'log'));}
};
const _renderBestiaryOrig=renderBestiary;
renderBestiary=function(P_){Codex.render(P_);};

/* ---------- INTEL DATAPAD ---------- */
function placeIntel(li){
  const mains=grid.rooms.filter(r=>r.type==='main');if(!mains.length)return;
  const R=mains[Math.floor(Math.random()*mains.length)];
  const c=openCells((t,i,j)=>(t===T_FLOOR||t===T_COVER||t===T_PLAT)&&inRoom(R,i,j,1)).sort(()=>Math.random()-.5)[0];if(!c)return;
  const x=cx(c[0]),z=cx(c[1]),y=surfaceAt(x,z);const got=!!save.story.logs[li];
  const g=new THREE.Group();boxIn(g,skinMat(0x2a2a30),.55,.08,.38,0,.05,0);const sc=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:got?0x3a2a4a:0xc07aff}));sc.scale.set(.42,.02,.26);sc.position.y=.1;g.add(sc);
  const led=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:got?0x3a2a4a:0xc07aff}));led.scale.setScalar(.1);led.position.set(0,.5,0);g.add(led);
  g.position.set(x,y+.02,z);g.rotation.y=Math.random()*6;world.add(g);G.log={m:g,led,pos:V3(x,y,z),got,li};
}
frameHooks.push(dt=>{const L=G.log;if(!L||L.got||G.trial)return;L.led.visible=Math.floor(G.time*2.5)%2===0;L.led.position.y=.5+Math.sin(G.time*3)*.1;
  if(Math.hypot(P.pos.x-L.pos.x,P.pos.z-L.pos.z)<1.5&&Math.abs(P.pos.y-L.pos.y)<2){L.got=true;L.led.visible=false;const M=STORY.missions[L.li];save.story.logs[L.li]=1;persist();
    tone('sine',700,1400,.3,.15);setTimeout(()=>tone('sine',1050,2100,.3,.12),120);toast('INTEL RECOVERED',M.code+' · '+(CAST[M.log[0]]||CAST.log).name,'Saved to the Codex','#c07aff');
    Comms.say(M.log[0]==='demon'?'log':M.log[0],M.log[1],{dur:Math.max(5,M.log[1].length*.055)});stat('intel');}});
