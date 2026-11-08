/* ---------- TRIALS ACROSS THE 20-LEVEL CAMPAIGN ---------- */
Object.assign(TRIALS,{
 arena3:{name:'BLOOD ARENA III',rules:'Kill 40 demons in 90 seconds. Elites join the fight.',kind:'count',target:40,time:90,elite:.15},
 glass2:{name:'GLASS CANNON II',rules:'You have 1 health. Kill 20 demons, elites included.',kind:'count',target:20,oneHp:true,elite:.15},
 lava3:{name:'FLOOR IS LAVA III',rules:'Grab 10 rune crystals in 55 seconds while Wraiths hunt you.',kind:'collect',target:10,time:55,wraiths:true},
 exec2:{name:'EXECUTION II',rules:"Kill this level's boss in 60 seconds.",kind:'boss',time:60}
});
Object.assign(REWARDS,{
 chrono:{type:'power',name:'BULLET TIME',desc:'New power: slow every demon and projectile to a crawl.'},
 bulwark:{type:'power',name:'BULWARK',desc:'New power: a shield that soaks damage and reflects projectiles at triple damage.'},
 headhunter:{type:'perk',name:'HEADHUNTER',desc:'Headshots deal 25% more damage and heal 3 health.'},
 reaper:{type:'perk',name:'REAPER',desc:'Finishers and chainsaw kills explode, hurting nearby demons.'}
});
for(const k of Object.keys(LEVEL_TRIALS))delete LEVEL_TRIALS[k];
Object.assign(LEVEL_TRIALS,{1:{t:'arena',r:'hellfire'},2:{t:'lava',r:'phantom'},3:{t:'melee',r:'blade'},5:{t:'onehp',r:'rail'},6:{t:'elite',r:'siphon'},8:{t:'speed',r:'chrono'},
 10:{t:'arena2',r:'tesla'},11:{t:'lava2',r:'wind'},13:{t:'glass2',r:'bulwark'},15:{t:'arena3',r:'unmaker'},16:{t:'exec2',r:'headhunter'},17:{t:'lava3',r:'reaper'}});
for(const[k,v]of Object.entries(LEVEL_TRIALS))LEVELS[+k].trial=v.t;
if(!save.trialsMigr){save.trials={};for(const[k,v]of Object.entries(LEVEL_TRIALS))if(save.owned.includes(v.r)||save.perks[v.r])save.trials[k]=true;save.trialsMigr=1;persist();}
const _grT=grantReward;
grantReward=function(tr){_grT(tr);const R=REWARDS[tr.r];if(R.type==='power'){const L=save.loadout||(save.loadout=[null,null]);if(!L.includes(tr.r)){const e=[0,1].find(i=>!L[i]||!POWERS[L[i]]||!POWERS[L[i]].req());if(e!=null)L[e]=tr.r;}persist();}stat('trialWins');addXp(1000);};
function placePortal(li){
  if(!grid.rooms)return;const R=(grid.side&&grid.side.trial)||grid.rooms[0];const st=R===grid.rooms[0];
  const x=st?cx(R.i0+1):R.cx,z=st?cx(R.j0+1):R.cz,done=!!save.trials[li];const col=done?0x9a7aff:0xffcf3a;
  const g=new THREE.Group();g.position.set(x,0,z);
  const ringM=new THREE.Mesh(new THREE.TorusGeometry(1.25,.14,8,28),mat(col,col));ringM.position.y=1.6;g.add(ringM);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.15,24),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.45,side:THREE.DoubleSide}));disc.position.y=1.6;g.add(disc);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.8,.25,12),skinMat(0x2a2230));base.position.y=.12;g.add(base);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,40,10,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=20;g.add(beam);
  world.add(g);G.portal={x,z,g,ringM,disc,li,armed:true,done};
  setTimeout(()=>{if(G.state==='play'&&G.portal&&!G.trial)feed(done?'TRIAL PORTAL OPEN (REWARD CLAIMED)':'A TRIAL PORTAL IS HIDDEN IN A SIDE ROOM. FOLLOW THE GOLDEN LIGHT');},3800);
}
