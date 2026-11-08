/* =====================================================================
   CINEMATICS & STORY IN THE WORLD
   - Mission intros: dropship insertion on open-sky maps, an over-the-
     shoulder push-in on roofed maps. The Warden is visible.
   - Mission outros: the camera circles the Warden when the job is done.
   - Story cards (prologue, interludes, ending) play over rendered 3D
     scenes: Erebus and the Bore, the Long Vigil, the cryo pod, the gate,
     the Hollow Crown.
   - Echoes: holographic imprints of what happened in each place, replayed
     when you walk close.
   ===================================================================== */
CAST.echo={name:'ECHO',role:'Residual imprint',col:'#7affff',voice:{f:380,w:'sine',v:.03}};
PORTRAITS.echo=Object.assign({},PORTRAITS.marine,{bg:['#06242a','#020a0c'],pal:{h:'#2a8a9a',H:'#5ad8e8',v:'#aaffff',V:'#ffffff',k:'#04161a',u:'#1a5a6a'}});

function wardenModel(){const H=makeHuman({suit:0x2e3a26,armor:0x5e7052,visor:0xff8a1a});const g=H.g;
  for(const sx of[-1,1]){const p=new THREE.Mesh(rboxGeo,GFX.mat(0x4e6044,'metal',{size:128}));p.scale.set(.34,.2,.42);p.position.set(sx*.4,1.5,0);H.body.add(p);}
  const pack=new THREE.Mesh(rboxGeo,GFX.mat(0x3a4a30,'metal',{size:128}));pack.scale.set(.5,.6,.25);pack.position.set(0,1.15,-.28);H.body.add(pack);
  const heart=new THREE.Mesh(SPH,new THREE.MeshBasicMaterial({color:0xff3a1a}));heart.scale.setScalar(.07);heart.position.set(.12,1.3,.17);H.body.add(heart);
  g.scale.setScalar(1.08);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return H;}

/* ---------- MISSION INTRO ---------- */
const INSERT_SHIP=new Set([0,1,4,9,12,17]);
function missionIntro(M,li){
  if(save.skipCine)return;
  const eye=V3(P.pos.x,P.pos.y+P.height,P.pos.z),fwd=V3(-Math.sin(P.yaw),0,-Math.cos(P.yaw)),side=V3(fwd.z,0,-fwd.x);
  const W=wardenModel();W.g.position.set(P.pos.x,P.pos.y,P.pos.z);W.g.rotation.y=P.yaw+Math.PI;scene.add(W.g);
  const card={kick:M.code+' · '+(STORY.episodes[G.L.ep]||{}).title,name:M.name,sub:G.L.name+' · '+M.time};
  const open=!G.ceil;const cleanup=()=>{scene.remove(W.g);};
  if(open&&INSERT_SHIP.has(li)){
    const ship=Props.dropship();ship.scale.setScalar(.9);scene.add(ship);const hover=V3(P.pos.x,P.pos.y+5.2,P.pos.z);const from=hover.clone().add(V3(fwd.x*-50,40,fwd.z*-50));ship.rotation.y=P.yaw+Math.PI;
    const lights=[];ship.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x3ac0ff)lights.push(o);});
    W.g.visible=false;let landed=false;
    Cine.play([
     {dur:3.4,from:eye.clone().add(fwd.clone().multiplyScalar(14)).add(side.clone().multiplyScalar(6)).setY(eye.y+3),to:eye.clone().add(fwd.clone().multiplyScalar(10)).add(side.clone().multiplyScalar(3)).setY(eye.y+1.5),look:k=>ship.position.clone(),card,
      tick(dt,k){ship.position.lerpVectors(from,hover,ease(k));ship.rotation.x=(1-k)*.25;if(Math.random()<.5)burst(ship.position.clone().add(V3(0,-1,-3)),0x9ad8ff,1,3,.8,.3);if(k>.8&&Math.random()<.4)burst(V3(P.pos.x+rand(-4,4),P.pos.y+.2,P.pos.z+rand(-4,4)),0x8a7a6a,2,4,1,.6);}},
     {dur:1.5,from:()=>camera.position.clone(),to:eye.clone().add(fwd.clone().multiplyScalar(5)).add(side.clone().multiplyScalar(2)).setY(eye.y-.4),look:k=>V3(P.pos.x,P.pos.y+1.2,P.pos.z),cardOff:true,
      start(){W.g.visible=true;W.g.position.y=hover.y-1.5;tone('sine',300,90,.4,.2);},
      tick(dt,k){const y=hover.y-1.5-(hover.y-1.5-P.pos.y)*Math.min(1,k*k*1.6);W.g.position.y=y;if(!landed&&k>.78){landed=true;shake(.6);SFX.punch();ring(P.pos.clone(),0xd8c8a8,4,.5);burst(P.pos.clone().setY(P.pos.y+.2),0x8a7a6a,24,6,1.2,.8);W.armL.rotation.x=W.armR.rotation.x=-1.2;}}},
     {dur:.8,from:()=>camera.position.clone(),to:eye,look:k=>eye.clone().add(fwd.clone().multiplyScalar(10)),start(){W.armL.rotation.x=-1;W.armR.rotation.x=-1.2;}}
    ],()=>{cleanup();let t=0;addFx({kill(){scene.remove(ship);},tick(dt){t+=dt;ship.position.y+=dt*(4+t*8);ship.position.addScaledVector(fwd,dt*t*6);if(t>4){this.kill();return false;}return true;}});});
  }else{
    const back=eye.clone().addScaledVector(fwd,-2.4).addScaledVector(side,.7).setY(eye.y+.3);const far=eye.clone().addScaledVector(fwd,9).addScaledVector(side,-3).setY(eye.y+(open?3:1.5));
    Cine.play([
     {dur:3.2,from:far,to:far.clone().lerp(eye,.35),look:k=>V3(P.pos.x,P.pos.y+1.4,P.pos.z),card,start(){W.armR.rotation.x=-1.25;}},
     {dur:1.5,from:()=>camera.position.clone(),to:back,look:k=>eye.clone().addScaledVector(fwd,12),cardOff:true},
     {dur:.6,from:()=>camera.position.clone(),to:eye,look:k=>eye.clone().addScaledVector(fwd,12)}
    ],cleanup);
  }
}
const _srC=startRun;
startRun=function(i,s){G._outro=false;_srC(i,s);if(G.mode==='story'&&curMission()&&G.state==='play'){const M=curMission();missionIntro(M,i);placeEchoes(M);}};

/* ---------- MISSION OUTRO ---------- */
const _erC=endRun;
endRun=function(won){
  if(won&&G.mode==='story'&&!G._outro&&G.state==='play'&&!save.skipCine&&curMission()){G._outro=true;const M=curMission();
    const W=wardenModel();W.g.position.set(P.pos.x,surfaceAt(P.pos.x,P.pos.z),P.pos.z);scene.add(W.g);const c=V3(P.pos.x,W.g.position.y+1.3,P.pos.z);const a0=P.yaw;
    W.g.rotation.y=P.yaw+Math.PI;W.armR.rotation.x=-.4;
    Cine.play([{dur:4.2,from:c.clone().add(V3(Math.sin(a0)*-4,.6,Math.cos(a0)*-4)),to:c.clone(),look:c,card:{kick:'MISSION COMPLETE',name:M.name,sub:Object.keys(save.story.hearts).length+(M.heart&&!save.story.hearts[G.levelIdx]?1:0)+' / 4 hearts in the Lantern'},
      tick(dt,k){const a=a0+Math.PI+k*1.6;camera.position.set(c.x+Math.sin(a)*4.6,c.y+.4+k*.8,c.z+Math.cos(a)*4.6);camera.lookAt(c);W.armR.rotation.x=-.4-Math.min(1,k*2)*1.6;}}],
      ()=>{scene.remove(W.g);endRun(true);});
    return;}
  _erC(won);
};

/* ---------- ECHOES ---------- */
const ECHO_MAT=new THREE.MeshBasicMaterial({color:0x7affff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
function placeEchoes(M){G.echoes=[];const list=M.echoes||[];if(!list.length)return;
  const mains=grid.rooms.filter(r=>r.type==='main').sort((a,b)=>a.order-b.order);
  list.forEach((ec,n)=>{const R=mains[Math.min(mains.length-1,ec.room!=null?ec.room:n)];if(!R)return;
    const c=openCells((t,i,j)=>t===T_FLOOR&&inRoom(R,i,j,2)).sort(()=>Math.random()-.5)[0];if(!c)return;const x=cx(c[0]),z=cx(c[1]);
    const g=new THREE.Group();(ec.figures||[ec.pose||'stand']).forEach((pose,k)=>{const H=makeHuman(pose==='miner'?{helmet:false,gun:false,hat:0xe8b020}:pose==='reyne'?{helmet:false,gun:false,glasses:true}:{});
      H.g.traverse(o=>{if(o.isMesh)o.material=ECHO_MAT;});H.g.position.set(k*1.1-(ec.figures?ec.figures.length-1:0)*.55,0,0);
      if(pose==='kneel'){H.body.position.y=-.4;H.legL.rotation.x=H.legR.rotation.x=-1.3;}if(pose==='aim'){H.armR.rotation.x=-1.5;H.armL.rotation.x=-1.4;}if(pose==='fall'){H.body.rotation.x=-1.2;H.body.position.y=-.6;}if(pose==='reach'){H.armL.rotation.x=H.armR.rotation.x=-2.6;}
      g.add(H.g);});
    const base=new THREE.Mesh(new THREE.RingGeometry(.7,.85,24),new THREE.MeshBasicMaterial({color:0x7affff,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));base.rotation.x=-Math.PI/2;base.position.y=.05;g.add(base);
    g.position.set(x,surfaceAt(x,z),z);g.rotation.y=Math.random()*6;world.add(g);G.echoes.push({g,ec,pos:V3(x,0,z),state:0,t:0});});}
frameHooks.push(dt=>{if(!G.echoes||G.trial)return;for(const E of G.echoes){if(E.state===2)continue;const d=Math.hypot(P.pos.x-E.pos.x,P.pos.z-E.pos.z);
  if(E.state===0&&d<8){E.state=1;E.t=0;Comms.seq(E.ec.lines.map(l=>[l[0]||'echo',l[1]]));tone('sine',200,800,.8,.08);}
  if(E.state===1){E.t+=dt;const dur=E.ec.lines.reduce((s,l)=>s+Math.max(2.6,l[1].length*.052+1.3),0);const k=E.t<1?E.t:E.t>dur?Math.max(0,1-(E.t-dur)):1;
    ECHO_MAT.opacity=.35*k*(.85+Math.sin(G.time*20)*.15);E.g.position.y=surfaceAt(E.pos.x,E.pos.z)+Math.sin(G.time*2)*.05;if(Math.random()<.2)burst(E.pos.clone().setY(surfaceAt(E.pos.x,E.pos.z)+rand(.2,1.8)),0x7affff,1,1,.5,.5);
    if(E.t>dur+1){E.state=2;E.g.parent&&E.g.parent.remove(E.g);}}}});

/* ---------- STORY SCENES behind the cards ---------- */
const storyScene=new THREE.Scene(),storyCam=new THREE.PerspectiveCamera(50,1,.1,2000);storyScene.add(new THREE.AmbientLight(0x404050,.6));
const SS={key:'moon',built:false,camFrom:V3(0,0,60),camTo:V3(0,0,60),look:V3(0,0,0),t:0,anim:[]};
function buildStoryScene(){if(SS.built)return;SS.built=true;
  const W=1024,H=512,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.fillStyle='#020206';g.fillRect(0,0,W,H);for(let i=0;i<2600;i++){const a=Math.random();g.fillStyle='rgba(255,255,255,'+a*a+')';g.fillRect(Math.random()*W,Math.random()*H,1,1);}
  const dome=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.BackSide}));storyScene.add(dome);
  const sunL=new THREE.DirectionalLight(0xffe8d0,1.6);sunL.position.set(-200,60,120);storyScene.add(sunL);
  // gas giant
  const gc=document.createElement('canvas');gc.width=512;gc.height=256;const gg=gc.getContext('2d');for(let y=0;y<256;y++){const n=Math.sin(y*.09)*.5+Math.sin(y*.031+1)*.5;gg.fillStyle='rgb('+(150+n*50|0)+','+(90+n*30|0)+','+(60+n*20|0)+')';gg.fillRect(0,y,512,1);}
  const giant=new THREE.Mesh(new THREE.SphereGeometry(220,48,32),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(gc),roughness:1}));giant.position.set(-380,60,-600);storyScene.add(giant);
  // Erebus with the Breach
  const moon=new THREE.Mesh(new THREE.SphereGeometry(30,64,48),GFX.mat(0x6a5a50,'rock',{size:512}));storyScene.add(moon);SS.moon=moon;
  const crack=new THREE.Mesh(new THREE.TorusGeometry(6,1.2,8,32),new THREE.MeshBasicMaterial({color:0xff4a10}));crack.position.set(0,24,17.5);crack.lookAt(0,0,0);storyScene.add(crack);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),new THREE.MeshBasicMaterial({color:0xff3a00,transparent:true,opacity:.35,blending:THREE.AdditiveBlending}));glow.position.copy(crack.position);storyScene.add(glow);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.5,4,60,16,1,true),new THREE.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));beam.position.copy(crack.position).multiplyScalar(1.6);beam.lookAt(0,0,0);beam.rotateX(Math.PI/2);storyScene.add(beam);
  SS.anim.push(dt=>{moon.rotation.y+=dt*.01;glow.material.opacity=.3+Math.sin(performance.now()/500)*.08;});
  // the Long Vigil
  const ship=new THREE.Group();const hm=GFX.mat(0x6a7078,'metal',{size:256});boxIn(ship,hm,4,3,26,0,0,0);boxIn(ship,hm,10,1,6,0,0,4);boxIn(ship,hm,3,5,6,0,2.4,-6);boxIn(ship,hm,2.4,2,8,0,0,15);
  for(const sx of[-1.4,1.4]){const e=new THREE.Mesh(CYL,new THREE.MeshBasicMaterial({color:0x6ad8ff}));e.scale.set(.9,.3,.9);e.rotation.x=Math.PI/2;e.position.set(sx,0,-13.2);ship.add(e);}
  ship.position.set(70,22,-30);ship.rotation.y=-.7;storyScene.add(ship);SS.ship=ship;SS.anim.push(dt=>{ship.position.x-=dt*.6;});
  // the cryo pod
  const pod=new THREE.Group();const W_=wardenModel();pod.add(W_.g);const glass=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,2.6,24,1,true),new THREE.MeshStandardMaterial({color:0x9ad8ff,transparent:true,opacity:.25,roughness:.05,metalness:.2,side:THREE.DoubleSide}));glass.position.y=1.2;pod.add(glass);
  boxIn(pod,GFX.mat(0x3a3c40,'metal',{size:128}),2.2,.4,2.2,0,-.2,0);boxIn(pod,GFX.mat(0x3a3c40,'metal',{size:128}),2.2,.4,2.2,0,2.6,0);const pl=new THREE.PointLight(0x5aff9a,2.5,8);pl.position.set(0,1.5,1.6);pod.add(pl);
  pod.position.set(600,0,0);storyScene.add(pod);SS.pod=pod;SS.anim.push(dt=>{pl.intensity=2.2+Math.sin(performance.now()/300)*.6;});
  // the gate
  const gate=new THREE.Group();const st=GFX.mat(0x2a1a14,'brick',{size:256});boxIn(gate,st,6,40,6,-14,20,0);boxIn(gate,st,6,40,6,14,20,0);boxIn(gate,st,36,6,7,0,42,0);
  const fire=new THREE.Mesh(new THREE.PlaneGeometry(22,36),new THREE.MeshBasicMaterial({color:0xff3a10,transparent:true,opacity:.8}));fire.position.set(0,18,0);gate.add(fire);const gl=new THREE.PointLight(0xff4a1a,3,80);gl.position.set(0,18,10);gate.add(gl);
  gate.position.set(-600,-10,0);storyScene.add(gate);SS.gate=gate;SS.anim.push(dt=>{fire.material.opacity=.7+Math.sin(performance.now()/120)*.1;});
  // the crown
  const crown=new THREE.Group();const ring_=new THREE.Mesh(new THREE.TorusGeometry(18,1.4,12,64),new THREE.MeshStandardMaterial({color:0xffcf3a,emissive:0xaa7a10,emissiveIntensity:1.2,metalness:.8,roughness:.3}));crown.add(ring_);
  for(let i=0;i<12;i++){const s=new THREE.Mesh(CONE,ring_.material);const a=i/12*Math.PI*2;s.scale.set(1.4,8,1.4);s.position.set(Math.cos(a)*18,Math.sin(a)*18,0);s.rotation.z=a-Math.PI/2;crown.add(s);}
  const core=new THREE.Mesh(new THREE.SphereGeometry(5,32,24),new THREE.MeshBasicMaterial({color:0xffffff}));crown.add(core);const cl=new THREE.PointLight(0xffcf8a,3,120);crown.add(cl);
  crown.position.set(0,600,0);storyScene.add(crown);SS.crown=crown;SS.anim.push(dt=>{crown.rotation.z+=dt*.08;});
}
const SCENE_CAM={moon:[V3(0,10,95),V3(0,5,75),V3(0,0,0)],bore:[V3(10,40,48),V3(4,30,34),V3(0,24,17)],frigate:[V3(100,30,0),V3(85,26,-15),V3(70,22,-30)],pod:[V3(604,2,7),V3(602,1.6,4.2),V3(600,1.4,0)],
 gate:[V3(-600,8,90),V3(-600,12,60),V3(-600,18,0)],crown:[V3(0,600,80),V3(0,600,55),V3(0,600,0)],void:[V3(0,-200,40),V3(0,-200,20),V3(0,-200,0)]};
function setStoryScene(key){buildStoryScene();const c=SCENE_CAM[key]||SCENE_CAM.moon;SS.key=key;SS.camFrom=c[0];SS.camTo=c[1];SS.look=c[2];SS.t=0;}
const _nextCardC=nextCard;
nextCard=function(){_nextCardC();const c=SC.cards&&SC.cards[SC.i];if(c&&G.state==='story')setStoryScene(c.scene||(SC.cards===STORY.ending?'crown':'moon'));};
const _storyTickC=storyTick;
storyTick=function(dt){_storyTickC(dt);if(G.state!=='story')return;SS.t+=dt;const k=Math.min(1,SS.t/9);storyCam.position.lerpVectors(SS.camFrom,SS.camTo,ease(k));storyCam.lookAt(SS.look);for(const a of SS.anim)a(dt);
  storyCam.aspect=innerWidth/innerHeight;if(innerWidth>760)storyCam.setViewOffset(innerWidth,innerHeight,-innerWidth*.2,0,innerWidth,innerHeight);else storyCam.clearViewOffset();storyCam.updateProjectionMatrix();};
const _rfC=renderFrame;
renderFrame=function(){if(G.state==='story'&&SS.built){if(Post.on&&(S.gfx||'high')!=='low'){Post.main.scene=storyScene;Post.main.camera=storyCam;Post.gun.enabled=false;Post.comp.render();Post.main.scene=scene;Post.main.camera=camera;return;}
  renderer.setRenderTarget(null);renderer.clear();renderer.render(storyScene,storyCam);return;}_rfC();};

/* scene keys for every story card */
['moon','bore','bore','moon','frigate','pod'].forEach((k,i)=>{if(STORY.prologue[i])STORY.prologue[i].scene=k;});
['crown','crown','moon','frigate','moon','moon','void'].forEach((k,i)=>{if(STORY.ending[i])STORY.ending[i].scene=k;});
STORY.missions.forEach(M=>{if(M.interlude)M.interlude.scene=M.code==='M05'?'bore':M.code==='M10'?'gate':'crown';});

/* echoes: what happened here, replayed */
const ECHOES=[
 [{figures:['aim','aim','kneel'],lines:[['echo','FIRETEAM ASH, 0312: Contact, ground floor! They came up through the motor pool!'],['rook','Osei, get away from the cages! Those aren\'t ours. DOWN!']]}],
 [{figures:['stand','reach'],lines:[['echo','CRAWLER NINE DRIVER: Engine\'s dead. We\'re sealing the hatches. If anyone is out there, we have kids aboard.']]}],
 [{figures:['reyne'],lines:[['echo','REYNE, DAY TWO: Keep the forge hot. She says it\'s cold where she is. I can at least do that much.']]}],
 [{figures:['miner','miner','miner'],lines:[['echo','MINERS, SINGING: ...down in the dark where the lamps don\'t burn...'],['brandt','Keep singing. Louder. Don\'t let the kids hear it eat.']]}],
 [{figures:['kneel','kneel'],lines:[['echo','PRISONER: It\'s counting again. One. Two. Three. Why does it always stop at me?']]}],
 [{figures:['stand'],lines:[['echo','COLONIST: We prayed for rescue. The walls answered instead.']]}],
 [{figures:['reyne','stand'],lines:[['echo','REYNE, TWO YEARS AGO: Subject Seven is stable. Okafor? No. She doesn\'t need the details. Nobody needs the details.']]}],
 [{figures:['reach'],lines:[['echo','PUMP TECH: Pressure\'s spiking! Shut it down! They won\'t LET us shut it down!']]}],
 [{figures:['reyne'],lines:[['echo','REYNE: I won\'t translate any more. ...Fine. FINE. Show me the next door.']]}],
 [{figures:['stand','stand','stand'],lines:[['tyrant','IMPRINT: Nine hammers. Nine locks. The oath holds while one of us stands.']]}],
 [{figures:['fall','fall'],lines:[['echo','UNKNOWN VOICE. VESTA TRANSLATING: Do not look at the Crown. Do not listen to it. It is so patient.']]}],
 [{figures:['reyne'],lines:[['echo','REYNE: Mira, sweetheart. Stay near the light if you can. Daddy\'s building you a door.']]}],
 [{figures:['stand','stand','stand'],lines:[['vharos','IMPRINT: Hold the ninth door, brothers. What sleeps beneath the Crown must never wake.']]}],
 [{figures:['kneel','kneel','kneel'],lines:[['echo','THE MOURNERS: We mourn each jailer who falls. When the last one falls, we will mourn the worlds.']]}],
 [{figures:['reyne'],lines:[['echo','REYNE, HOURS AGO: Forgive me, Commander. Forgive me, Seven. Forgive me, Hana.']]}],
 [{figures:['reach'],lines:[['echo','A CHILD\'S VOICE: Daddy?'],['vesta','That is not a child, Warden. That is something wearing one.']]}],
 [{figures:['stand','aim'],lines:[['okafor','LONG VIGIL, AN HOUR AGO: All hands, we are being boarded. Protect the LANTERN cradle. ...They already have the cradle.']]}],
 [{figures:['aim','kneel'],lines:[['echo','KESTREL CREW: The Commander\'s alive! Get her to the ship! Somebody tell the Warden!']]}],
 [{figures:['reyne'],lines:[['echo','REYNE, CHANGING: It hurts. It said it wouldn\'t hurt. Mira? Mira, where are you?']]}],
 [{figures:['aim','aim','aim','aim'],room:1,lines:[['rook','ECHO: We\'ve got the door, Warden. Go on.'],['vesta','Warden... that was Fireteam Ash. The Lantern remembers them.']]}]
];
STORY.missions.forEach((M,i)=>{M.echoes=ECHOES[i]||[];});
