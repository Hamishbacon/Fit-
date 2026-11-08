/* =====================================================================
   COMMS & CINEMATICS
   - Comms: radio dialogue box with portrait, typewriter text and voice.
   - Cine:  letterboxed in-engine camera sequences (boss intros, deaths).
   - Markers: Halo-style world-space waypoints projected onto the HUD.
   ===================================================================== */
const Comms={
 q:[],cur:null,box:null,
 say(id,text,o){o=o||{};const line={id,text,t:0,shown:0,dur:o.dur||Math.max(2.6,text.length*.052+1.3),delay:o.delay||0,onStart:o.onStart,onEnd:o.onEnd,low:o.low};
  if(o.low&&(this.cur||this.q.length))return; // chatter never queues behind story lines
  if(o.now){this.q.unshift(line);if(this.cur)this.finish(true);}else this.q.push(line);},
 seq(lines){if(!lines)return;for(const l of lines){if(typeof l==='function'){this.q.push({fn:l,t:0,dur:0,delay:0,text:''});continue;}this.say(l[0],l[1],l[2]);}},
 clear(){this.q=[];this.cur=null;const b=$('comms');if(b)b.hidden=true;},
 busy(){return !!this.cur||this.q.length>0;},
 finish(silent){const c=this.cur;this.cur=null;if(c&&c.onEnd&&!silent)c.onEnd();},
 tick(dt){
  const box=$('comms');if(!box)return;
  const live=G.state==='play'||G.state==='cine'||G.state==='story';
  if(!live){box.hidden=true;return;}
  if(!this.cur&&this.q.length){const n=this.q[0];n.delay-=dt;if(n.delay<=0){this.q.shift();if(n.fn){n.fn();return;}this.cur=n;this.show(n);if(n.onStart)n.onStart();}}
  const c=this.cur;if(!c){box.hidden=true;return;}
  box.hidden=false;box.classList.toggle('cine',G.state==='cine');
  c.t+=dt;const before=Math.floor(c.shown);c.shown=Math.min(c.text.length,c.shown+dt*58);const now=Math.floor(c.shown);
  if(now>before){const seg=c.text.slice(before,now);if(/\s/.test(seg)||before===0)Voice.blip(c.id);$('ctxt').textContent=c.text.slice(0,now);}
  if(c.t>=c.dur)this.finish();
 },
 show(c){const ch=CAST[c.id]||{name:c.id.toUpperCase(),role:'',col:'#fff'};$('cname').textContent=ch.name;$('cname').style.color=ch.col;$('crole').textContent=ch.role;
  $('comms').style.setProperty('--cc',ch.col);drawPortrait($('cport'),PORTRAITS[c.id]?c.id:(ch.demon?'demon':'marine'));$('ctxt').textContent='';Voice.radio();}
};

/* ---------- CINEMATIC CAMERA ---------- */
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const Cine={
 on:false,shots:[],i:0,t:0,done:null,
 play(shots,done){
  if(this.on)this.end(true);
  this.on=true;this.shots=shots;this.i=-1;this.t=0;this.done=done;G.state='cine';mouseDown=false;touchFire=false;
  gunRoot.visible=false;$('scope').hidden=true;$('cine').hidden=false;$('hud').classList.add('cine');$('touch').hidden=true;
  requestAnimationFrame(()=>$('cine').classList.add('on'));this.next();
 },
 next(){this.i++;this.t=0;const s=this.shots[this.i];if(!s){this.end();return;}
  s._from=typeof s.from==='function'?s.from():(s.from||camera.position.clone());s._to=typeof s.to==='function'?s.to():(s.to||s._from.clone());
  s._lookA=typeof s.look==='function'?null:(s.look||null);
  if(s.card)this.card(s.card);else if(s.cardOff)this.card(null);
  if(s.lines)Comms.seq(s.lines);if(s.start)s.start();},
 tick(dt){const s=this.shots[this.i];if(!s)return;this.t+=dt;const k=ease(clamp(this.t/s.dur,0,1));
  camera.position.lerpVectors(s._from,s._to,k);
  const look=typeof s.look==='function'?s.look(k):s.look;if(look)camera.lookAt(look);
  if(s.fov){camera.fov=s.fov;camera.updateProjectionMatrix();}
  if(s.shake)camera.position.add(V3(rand(-1,1),rand(-1,1),rand(-1,1)).multiplyScalar(s.shake*(1-k)));
  if(s.tick)s.tick(dt,k);
  if(this.t>=s.dur)this.next();},
 card(c){const el=$('cinecard');if(!c){el.classList.remove('on');return;}$('cc_kick').textContent=c.kick||'';$('cc_name').textContent=c.name||'';$('cc_sub').textContent=c.sub||'';el.classList.remove('on');void el.offsetWidth;el.classList.add('on');},
 end(skipped){if(!this.on)return;this.on=false;const d=this.done;this.done=null;
  if(skipped)for(let j=Math.max(0,this.i);j<this.shots.length;j++){const s=this.shots[j];if(s.skip)s.skip();}
  $('cine').classList.remove('on');$('cinecard').classList.remove('on');setTimeout(()=>{if(!Cine.on)$('cine').hidden=true;},350);
  $('hud').classList.remove('cine');$('touch').hidden=!isTouch;if(G.state==='cine')G.state='play';last=performance.now();camera.fov=S.fov;camera.updateProjectionMatrix();
  if(d)d();},
 skip(){if(!this.on)return;Comms.clear();this.end(true);}
};
addEventListener('keydown',e=>{if(Cine.on&&(e.code==='Space'||e.code==='Enter'||e.code==='Escape')){e.preventDefault();Cine.skip();}});
document.addEventListener('pointerdown',e=>{if(Cine.on&&e.target.id==='cineskip')Cine.skip();});

/* ---------- LOOP + TIME-SCALE HOOKS ---------- */
let _lastC=performance.now();
const _loopC=loop;
loop=function(now){const dt=Math.min(.05,(now-_lastC)/1000);_lastC=now;
  if(G.state==='cine')Cine.tick(dt);
  if(G.state!=='paused')Comms.tick(dt);
  if(typeof storyTick==='function')storyTick(dt);
  _loopC(now);};
G.timeScale=1;
const _updT=update;
update=function(dt){if(G.slowmo>0){G.slowmo-=dt;dt*=.28;}_updT(dt);};

/* ---------- WORLD-SPACE OBJECTIVE MARKERS ---------- */
const Markers={list:[],els:[],
 set(list){this.list=list||[];},
 tick(){const box=$('markers');if(!box)return;const L=this.list;
  while(this.els.length<L.length){const d=document.createElement('div');d.className='mk';d.innerHTML='<i></i><b></b><small></small>';box.appendChild(d);this.els.push(d);}
  this.els.forEach((el,n)=>{const m=L[n];if(!m||G.state!=='play'){el.style.display='none';return;}
   const p=(typeof m.pos==='function'?m.pos():m.pos);if(!p){el.style.display='none';return;}
   const v=p.clone();v.y+=m.h||1.8;v.project(camera);const dist=Math.hypot(p.x-P.pos.x,p.z-P.pos.z);
   if(m.near&&dist<m.near){el.style.display='none';return;}
   let x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;const behind=v.z>1;
   if(behind){x=innerWidth-x;y=innerHeight-40;}
   x=clamp(x,30,innerWidth-30);y=clamp(y,60,innerHeight-60);
   el.style.display='';el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';el.style.setProperty('--mc',m.col||'#ffcf3a');
   el.querySelector('b').textContent=m.label||'';el.querySelector('small').textContent=Math.round(dist)+'m';el.classList.toggle('pulse',!!m.pulse);});}
};
frameHooks.push(()=>Markers.tick());
