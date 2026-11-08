/* =====================================================================
   WORLD BUILDER — turns the level grid into a real place.
   The grid (collision, navigation, rooms, doors) is unchanged; this file
   decides what it looks like: roofs, cliffs, caverns, floating islands,
   blast doors, set dressing, skies, distant scenery and weather.
   ===================================================================== */
const _V=new THREE.Vector3(),_O=new THREE.Object3D();
function inst(geo,m,items,shadow=true){if(!items.length)return null;const im=new THREE.InstancedMesh(geo,m,items.length);
  items.forEach((it,i)=>{_O.position.set(it[0],it[1],it[2]);_O.rotation.set(it[6]||0,it[7]||0,it[8]||0);_O.scale.set(it[3]??1,it[4]??1,it[5]??1);_O.updateMatrix();im.setMatrixAt(i,_O.matrix);});
  im.castShadow=shadow;im.receiveShadow=true;world.add(im);return im;}
function solidBox(x,z,w,h,d,y=0){const m=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));m.visible=false;m.scale.set(w,h,d);m.position.set(x,y+h/2,z);world.add(m);
  const s={min:new THREE.Vector3(x-w/2,y,z-d/2),max:new THREE.Vector3(x+w/2,y+h,z+d/2),mesh:m};solids.push(s);solidMeshes.push(m);m.userData.solid=s;return m;}
function vis(g,x,y,z,ry){g.position.set(x,y,z);if(ry)g.rotation.y=ry;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});world.add(g);return g;}
const glowM=c=>new THREE.MeshBasicMaterial({color:c});
const emM=(c,i=1.6)=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i,roughness:.5});

/* rock geometry with consistent displacement (no cracks) */
const ROCKS=[0,1,2,3].map(s=>{const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){_V.fromBufferAttribute(p,i);const n=Math.sin(_V.x*3.1+s*1.7)*Math.sin(_V.y*2.3+s*2.9)*Math.sin(_V.z*2.9+s)*.22+Math.sin(_V.x*7+_V.z*5+s)*.06;_V.multiplyScalar(1+n);_V.y*=.85;p.setXYZ(i,_V.x,_V.y,_V.z);}
  g.computeVertexNormals();return g;});
const CONE=new THREE.ConeGeometry(1,1,7),CYL=new THREE.CylinderGeometry(1,1,1,12),SPH=new THREE.SphereGeometry(1,12,10),TOR=new THREE.TorusGeometry(1,.08,8,24);

/* ---------- grid shaping: organic caves and canyons ---------- */
function reconnect(g){const t=g.t;const blocked=k=>t[k]===T_WALL||t[k]===T_PILLAR;const s0=idx(g.spawn.i,g.spawn.j);t[s0]=T_FLOOR;
  for(let pass=0;pass<10;pass++){const seen=new Uint8Array(N*N);const q=[s0];seen[s0]=1;
    while(q.length){const k=q.pop();const i=k%N,j=(k/N)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+dx,b=j+dz;if(a<0||b<0||a>=N||b>=N)continue;const kk=idx(a,b);if(!seen[kk]&&!blocked(kk)){seen[kk]=1;q.push(kk);}}}
    let fixed=false;for(let k=0;k<N*N;k++){if(g.roomOf[k]>=0&&!blocked(k)&&!seen[k]){const i=k%N,j=(k/N)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=idx(i+dx,j+dz);if(blocked(kk)&&g.roomOf[kk]>=0){t[kk]=T_FLOOR;g.h[kk]=0;fixed=true;}}}}
    if(!fixed)break;}}
function erode(g,seed,amt){const doorCells=[];for(const d of g.doors)for(const k of d.cells)doorCells.push([k%N,(k/N)|0]);
  for(const R of g.rooms){if(R.type==='vault'||R.type==='trial')continue;
    for(let i=R.i0;i<=R.i1;i++)for(let j=R.j0;j<=R.j1;j++){const e=Math.min(i-R.i0,R.i1-i,j-R.j0,R.j1-j);if(e>2)continue;const k=idx(i,j);const tt=g.t[k];if(tt!==T_FLOOR&&tt!==T_COVER&&tt!==T_LAVA)continue;
      if(doorCells.some(([a,b])=>Math.abs(a-i)<=3&&Math.abs(b-j)<=3))continue;if(Math.abs(i-g.spawn.i)<=2&&Math.abs(j-g.spawn.j)<=2)continue;
      const n=fbm(i*.32+seed*.13,j*.32,64,3,7);const thr=e===0?amt+.18:e===1?amt-.05:amt-.28;if(n<thr){g.t[k]=T_WALL;g.h[k]=0;}}}
  reconnect(g);}
const _genB=genLevel;
genLevel=function(L,seed,single){const g=_genB(L,seed,single);const look=lookFor(L),st=STYLES[look.arch];
  if(st.erode>0)erode(g,seed,st.erode);
  for(const R of g.rooms){R.lights=R.lights.map(p=>[p[0],st.lightY,p[2]]);const add=[[R.cx,st.lightY,cx(R.j0+1)],[R.cx,st.lightY,cx(R.j1-1)],[cx(R.i0+1),st.lightY,R.cz]];for(const a of add)if(R.lights.length<8)R.lights.push(a);}
  g.pads=[];for(let k=0;k<N*N;k++)if(g.t[k]===T_PAD)g.pads.push({i:k%N,j:(k/N)|0,dir:g.sd[k]});
  return g;};

/* ---------- SKY ---------- */
const _skyCache={};
function skyTex(L,look){const key=(look.sky||'plain')+L.sky+L.fog;if(_skyCache[key])return _skyCache[key];
  const W=1024,H=512,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const top=new THREE.Color(L.sky).multiplyScalar(.6),hor=new THREE.Color(L.fog).lerp(new THREE.Color(look.light||L.torch),.25);
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#'+top.getHexString());gr.addColorStop(.5,'#'+new THREE.Color(L.sky).lerp(hor,.5).getHexString());gr.addColorStop(.62,'#'+hor.getHexString());gr.addColorStop(1,'#'+new THREE.Color(L.fog).multiplyScalar(.7).getHexString());
  g.fillStyle=gr;g.fillRect(0,0,W,H);const t=look.sky;
  const stars=n=>{for(let i=0;i<n;i++){const y=Math.random()*H*.58,a=Math.random();g.fillStyle='rgba(255,255,255,'+(a*a*.9)+')';const s=Math.random()<.05?2:1;g.fillRect(Math.random()*W,y,s,s);}};
  const clouds=(col,alpha,y0,y1,sc,seed)=>{const im=g.getImageData(0,0,W,H);const c=new THREE.Color(col);for(let y=Math.floor(y0*H);y<y1*H;y+=1)for(let x=0;x<W;x+=1){const n=fbm(x/W*sc,y/H*sc*.5,sc,5,seed);const v=Math.max(0,n-.48)*2.4*alpha*Math.sin((y/H-y0)/(y1-y0)*Math.PI);if(v<=0)continue;const i=(y*W+x)*4;im.data[i]+=(c.r*255-im.data[i])*Math.min(1,v);im.data[i+1]+=(c.g*255-im.data[i+1])*Math.min(1,v);im.data[i+2]+=(c.b*255-im.data[i+2])*Math.min(1,v);}g.putImageData(im,0,0);};
  const disc=(x,y,r,c1,c2,glow)=>{if(glow){const gg=g.createRadialGradient(x,y,r*.5,x,y,r*glow);gg.addColorStop(0,c2);gg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gg;g.fillRect(x-r*glow,y-r*glow,r*glow*2,r*glow*2);}
    const dg=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);dg.addColorStop(0,c1);dg.addColorStop(1,c2);g.fillStyle=dg;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
  if(t==='reddust'){disc(W*.3,H*.28,70,'#f0c098','#8a3a22',2.2);g.globalAlpha=.25;for(let i=0;i<6;i++){g.fillStyle=i%2?'#6a2a1a':'#c0805a';g.fillRect(W*.3-70,H*.28-50+i*18,140,7);}g.globalAlpha=1;disc(W*.3,H*.28,70,'rgba(0,0,0,0)','rgba(0,0,0,0)');clouds(0xc8704a,.8,.25,.62,6,3);}
  else if(t==='aurora'){stars(1400);for(let b=0;b<3;b++){g.globalCompositeOperation='lighter';for(let x=0;x<W;x+=2){const y=H*(.18+b*.08)+Math.sin(x*.012+b)*30+Math.sin(x*.031)*12;const gg=g.createLinearGradient(0,y-60,0,y+20);gg.addColorStop(0,'rgba(80,255,180,0)');gg.addColorStop(.7,b===1?'rgba(120,120,255,.14)':'rgba(80,255,170,.16)');gg.addColorStop(1,'rgba(80,255,170,0)');g.fillStyle=gg;g.fillRect(x,y-60,2,80);}}g.globalCompositeOperation='source-over';}
  else if(t==='purple'||t==='nebula'){stars(1800);g.globalCompositeOperation='lighter';clouds(t==='nebula'?0x8a3aff:0x6a2a8a,.7,.05,.6,5,9);clouds(t==='nebula'?0x3a8aff:0xff4ad0,.5,.1,.5,7,13);g.globalCompositeOperation='source-over';if(t==='nebula')disc(W*.72,H*.22,40,'#d8c8ff','#3a2a6a',3);}
  else if(t==='inferno'){clouds(0xff5a10,.9,.2,.64,6,21);clouds(0x2a0800,.8,.05,.4,4,22);}
  else if(t==='eclipse'){stars(500);disc(W*.6,H*.25,48,'#000','#000',0);const gg=g.createRadialGradient(W*.6,H*.25,46,W*.6,H*.25,150);gg.addColorStop(0,'rgba(255,80,40,.9)');gg.addColorStop(.3,'rgba(255,40,10,.3)');gg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gg;g.fillRect(0,0,W,H);disc(W*.6,H*.25,46,'#000','#000');clouds(0x3a0a06,.9,.3,.62,6,25);}
  else if(t==='sick'){clouds(0x8aff4a,.45,.1,.6,5,31);clouds(0xff3a6a,.5,.2,.62,7,32);}
  else if(t==='crown'){stars(2200);g.globalCompositeOperation='lighter';clouds(0xffaa30,.35,.05,.5,5,41);g.globalCompositeOperation='source-over';}
  else clouds(new THREE.Color(L.fog).lerp(new THREE.Color(0xffffff),.2).getHex(),.6,.2,.6,6,51);
  const tx=new THREE.CanvasTexture(cv);tx.wrapS=THREE.RepeatWrapping;return _skyCache[key]=tx;}

/* ---------- PROPS ---------- */
const PROP={
 console(look){const g=new THREE.Group();boxIn(g,GFX.mat(0x4a4c52,'metal',{size:128}),1.2,1.1,.6,0,.55,0);const s=new THREE.Mesh(boxGeo,emM(0x3ac0ff,1.2));s.scale.set(1,.5,.05);s.position.set(0,1.35,.12);s.rotation.x=-.5;g.add(s);for(let i=0;i<3;i++){const b=new THREE.Mesh(boxGeo,emM([0xff3a1a,0x3aff6a,0xffcf3a][i],2));b.scale.setScalar(.07);b.position.set(-.3+i*.3,1.12,.25);g.add(b);}return g;},
 locker(look){const g=new THREE.Group();const m=GFX.mat(0x5a6a7a,'metal',{size:128});for(let i=0;i<3;i++)boxIn(g,m,.6,2,.55,-.62+i*.62,1,0);return g;},
 barrel(look){const g=new THREE.Group();const m=GFX.mat(Math.random()<.5?0x8a3a1a:0x3a5a3a,'metal',{size:128});const c=new THREE.Mesh(CYL,m);c.scale.set(.42,1.1,.42);c.position.y=.55;g.add(c);const r=new THREE.Mesh(TOR,m);r.scale.setScalar(.43);r.rotation.x=Math.PI/2;r.position.y=.8;g.add(r);return g;},
 alarm(look){const g=new THREE.Group();const l=new THREE.Mesh(SPH,emM(0xff1a1a,3));l.scale.setScalar(.16);l.position.y=5.5;g.add(l);g.userData.alarm=l;boxIn(g,GFX.mat(0x2a2a30,'metal',{size:128}),.3,.12,.3,0,5.35,0);return g;},
 vat(look){const g=new THREE.Group();const c=new THREE.Mesh(CYL,GFX.mat(0x4a3a32,'metal',{size:128}));c.scale.set(1.1,1.5,1.1);c.position.y=.75;g.add(c);const m=new THREE.Mesh(new THREE.CircleGeometry(1,16),emM(0xff6a10,2.2));m.rotation.x=-Math.PI/2;m.position.y=1.51;g.add(m);return g;},
 drill(look){const g=new THREE.Group();const m=GFX.mat(0xb08a3a,'metal');for(const sx of[-1.5,1.5])for(const sz of[-1.5,1.5]){const l=boxIn(g,m,.35,14,.35,sx,7,sz);}for(let y=2;y<14;y+=3)boxIn(g,m,3.4,.25,3.4,0,y,0);const b=new THREE.Mesh(CONE,GFX.mat(0x6a6a70,'metal'));b.scale.set(1.2,4,1.2);b.rotation.x=Math.PI;b.position.y=2;g.add(b);return g;},
 scaffold(look){const g=new THREE.Group();const m=GFX.mat(0x6a5a3a,'wood',{size:128});for(const sx of[-1,1]){boxIn(g,m,.2,4,.2,sx,2,0);}boxIn(g,m,2.3,.2,.9,0,2.6,0);boxIn(g,m,2.3,.15,.15,0,3.6,.4);return g;},
 chain(look){const g=new THREE.Group();const m=GFX.mat(0x4a4a4a,'metal',{size:128,metal:.8});const n=Math.floor(rand(6,12));for(let i=0;i<n;i++){const r=new THREE.Mesh(TOR,m);r.scale.setScalar(.14);r.position.y=-i*.22;r.rotation.y=i%2?Math.PI/2:0;g.add(r);}g.userData.hang=true;return g;},
 hooks(look){const g=PROP.chain(look);const h=new THREE.Mesh(new THREE.TorusGeometry(.25,.05,6,12,Math.PI*1.4),GFX.mat(0x8a8a8a,'metal',{size:128,metal:.9}));h.position.y=-g.children.length*.22-.2;g.add(h);g.userData.hang=true;return g;},
 meat(look){const g=PROP.chain(look);const m=new THREE.Mesh(SPH,GFX.mat(0x8a2a24,'flesh',{size:128}));m.scale.set(.45,.9,.35);m.position.y=-g.children.length*.22-.9;g.add(m);g.userData.hang=true;return g;},
 banner(look){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.PlaneGeometry(1.4,4.5),new THREE.MeshStandardMaterial({color:look.trim||0x8a1a10,side:THREE.DoubleSide,roughness:.95}));c.position.set(0,6,.05);g.add(c);boxIn(g,GFX.mat(0xb08a3a,'metal',{size:128}),1.7,.12,.12,0,8.3,.05);return g;},
 window(look){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.PlaneGeometry(1.6,5),emM(look.window||0xb44aff,1.3));c.position.set(0,8,.04);g.add(c);const top=new THREE.Mesh(new THREE.CircleGeometry(.8,12,0,Math.PI),emM(look.window||0xb44aff,1.3));top.position.set(0,10.5,.04);g.add(top);
   for(let i=0;i<4;i++){const b=new THREE.Mesh(boxGeo,GFX.mat(0x2a2a2a,'metal',{size:128}));b.scale.set(1.7,.08,.06);b.position.set(0,6+i*1.3,.06);g.add(b);}return g;},
 candles(look){const g=new THREE.Group();for(let i=0;i<7;i++){const h=rand(.2,.7);const x=rand(-.5,.5),z=rand(-.3,.3);const c=new THREE.Mesh(CYL,new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.8}));c.scale.set(.06,h,.06);c.position.set(x,h/2,z);g.add(c);const f=new THREE.Mesh(SPH,glowM(0xffcf6a));f.scale.set(.05,.09,.05);f.position.set(x,h+.08,z);g.add(f);}return g;},
 skulls(look){const g=new THREE.Group();const m=GFX.mat(0xe0d6c0,'bone',{size:128});for(let i=0;i<9;i++){const s=new THREE.Mesh(SPH,m);s.scale.set(.22,.2,.24);s.position.set(rand(-.6,.6),.15+rand(0,.4),rand(-.4,.4));g.add(s);}return g;},
 ribs(look){const g=new THREE.Group();const m=GFX.mat(0xe0d6c0,'bone',{size:128});const r=new THREE.Mesh(new THREE.TorusGeometry(2.2,.18,6,18,Math.PI),m);r.position.y=0;g.add(r);return g;},
 runes(look){const g=new THREE.Group();const r=new THREE.Mesh(new THREE.RingGeometry(.9,1.05,6),emM(look.trim||look.crystal||0xa87aff,1.8));r.rotation.x=-Math.PI/2;r.position.y=.03;g.add(r);const r2=new THREE.Mesh(new THREE.RingGeometry(.5,.58,3),emM(look.trim||look.crystal||0xa87aff,1.8));r2.rotation.x=-Math.PI/2;r2.position.y=.03;g.add(r2);return g;},
 lavafall(look){const g=new THREE.Group();const p=new THREE.Mesh(new THREE.PlaneGeometry(2,12),emM(0xff5a00,2.2));p.position.set(0,6,.06);g.add(p);g.userData.flow=p;return g;},
 anvil(look){const g=new THREE.Group();const m=GFX.mat(0x2a2a2e,'metal');boxIn(g,m,.9,1,.7,0,.5,0);boxIn(g,m,2,.5,.9,0,1.25,0);return g;},
 frozen(look){const g=new THREE.Group();const H=makeHuman({suit:0x3a4a5a,armor:0x5a6a7a,gun:false});H.armL.rotation.x=-2.4;g.add(H.g);const ice=new THREE.Mesh(rboxGeo,new THREE.MeshStandardMaterial({color:0xaad8ff,transparent:true,opacity:.45,roughness:.1,metalness:.1}));ice.scale.set(1.2,2.4,1);ice.position.y=1.1;g.add(ice);return g;},
 icespike(look){const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0xaad8ff,roughness:.15,metalness:.1});for(let i=0;i<4;i++){const c=new THREE.Mesh(CONE,m);const h=rand(1.5,4);c.scale.set(rand(.3,.6),h,rand(.3,.6));c.position.set(rand(-.5,.5),h/2,rand(-.5,.5));c.rotation.z=rand(-.3,.3);g.add(c);}return g;},
 crystal(look){const g=new THREE.Group();const c=look.crystal||0x7ad8ff;const m=emM(c,1.4);for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(1),m);const h=rand(.5,1.4);s.scale.set(.18,h,.18);s.position.set(rand(-.5,.5),h*.6,rand(-.4,.4));s.rotation.set(rand(-.5,.5),rand(0,3),rand(-.5,.5));g.add(s);}return g;},
 tendril(look){const g=new THREE.Group();const m=GFX.mat(0x7a2a34,'flesh',{size:128});let y=0,x=0,z=0;for(let i=0;i<8;i++){const s=new THREE.Mesh(SPH,m);const r=.45-i*.04;s.scale.setScalar(r);x+=rand(-.2,.2);z+=rand(-.2,.2);s.position.set(x,y,z);y+=r*1.3;g.add(s);}return g;},
 pod(look){const g=new THREE.Group();const s=new THREE.Mesh(SPH,GFX.mat(0x8a3a44,'flesh',{size:128}));s.scale.set(.7,1,.7);s.position.y=.9;g.add(s);const c=new THREE.Mesh(SPH,emM(0xffaa40,1.5));c.scale.setScalar(.25);c.position.set(0,1,.55);g.add(c);return g;},
 eggs(look){const g=new THREE.Group();const m=GFX.mat(0xe8e0c8,'skin',{size:128});for(let i=0;i<6;i++){const s=new THREE.Mesh(SPH,m);const r=rand(.25,.45);s.scale.set(r,r*1.3,r);s.position.set(rand(-.6,.6),r,rand(-.5,.5));g.add(s);}return g;},
 resin(look){const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0xd8a030,emissive:0x6a3a00,transparent:true,opacity:.8,roughness:.2});for(let i=0;i<3;i++){const c=new THREE.Mesh(CONE,m);c.scale.set(.25,rand(1,2.5),.25);c.rotation.x=Math.PI;c.position.set(rand(-.5,.5),9,rand(-.3,.3));g.add(c);}return g;},
 spikes(look){const g=new THREE.Group();const m=GFX.mat(0x3a3030,'metal',{size:128});for(let i=0;i<5;i++){const c=new THREE.Mesh(CONE,m);const h=rand(1,2.4);c.scale.set(.12,h,.12);c.position.set(rand(-.6,.6),h/2,rand(-.4,.4));c.rotation.z=rand(-.4,.4);g.add(c);}const s=new THREE.Mesh(SPH,GFX.mat(0xe0d6c0,'bone',{size:128}));s.scale.set(.2,.18,.22);s.position.set(0,2.3,0);g.add(s);return g;},
 brazier(look){const g=new THREE.Group();const m=GFX.mat(0x3a3028,'metal',{size:128});const b=new THREE.Mesh(CONE,m);b.scale.set(.6,.6,.6);b.rotation.x=Math.PI;b.position.y=1.3;g.add(b);boxIn(g,m,.15,1,.15,0,.5,0);
   const f=new THREE.Mesh(CONE,glowM(look.light||0xff7a1a));f.scale.set(.45,.9,.45);f.position.y=1.9;g.add(f);torches.push({f,l:null,t:Math.random()*9});return g;},
 throne(look){const g=new THREE.Group();const m=GFX.mat(0x1a1416,'brick');boxIn(g,m,3,1.5,2.4,0,.75,0);boxIn(g,m,3,6,.6,0,4,-1);for(const sx of[-1.4,1.4])boxIn(g,m,.4,2.4,2.4,sx,2.3,0);
   for(let i=0;i<5;i++){const c=new THREE.Mesh(CONE,GFX.mat(0xffcf3a,'metal',{metal:.9,rough:.3}));c.scale.set(.2,1.2,.2);c.position.set(-1.2+i*.6,7.6,-1);g.add(c);}return g;},
 statue(look){const g=new THREE.Group();const H=makeHuman({suit:0x8a8a90,armor:0xa8a8b0,visor:0x2a2a2a,gun:false,helmet:true});H.armR.rotation.x=-2.8;g.add(H.g);g.scale.setScalar(2);
   g.traverse(o=>{if(o.isMesh&&!o.userData.keep)o.material=GFX.mat(0x8a8a92,'concrete',{size:128});});boxIn(g,GFX.mat(0x4a4a52,'concrete',{size:128}),1,.4,1,0,.2,0);return g;},
 eyes(look){const g=new THREE.Group();for(let i=0;i<3;i++){const e=new THREE.Mesh(SPH,new THREE.MeshStandardMaterial({color:0xf0f0e8,roughness:.3}));const s=rand(.25,.5);e.scale.setScalar(s);e.position.set(rand(-.8,.8),rand(2,7),.1);g.add(e);
   const p=new THREE.Mesh(new THREE.CircleGeometry(s*.5,12),emM(look.trim||0x3affc0,2));p.position.set(e.position.x,e.position.y,s+.11);g.add(p);}return g;},
 crypt(look){const g=new THREE.Group();const m=GFX.mat(0x2a2420,'rock',{size:128});for(let r=0;r<3;r++){boxIn(g,m,1.6,.12,.6,0,1+r*1.4,.2);const sk=new THREE.Mesh(SPH,GFX.mat(0xe0d6c0,'bone',{size:128}));sk.scale.set(.2,.18,.22);sk.position.set(rand(-.4,.4),1.2+r*1.4,.2);g.add(sk);}return g;},
 pipes(look){const g=new THREE.Group();const m=GFX.mat(0x6a5a4a,'metal',{size:128,metal:.7});for(let i=0;i<3;i++){const c=new THREE.Mesh(CYL,m);c.scale.set(.14+i*.03,12,.14+i*.03);c.position.set(-.5+i*.45,6,.25);g.add(c);}return g;},
 timber(look){const g=new THREE.Group();const m=GFX.mat(0x6a4a2a,'wood',{size:128});boxIn(g,m,.35,9,.35,0,4.5,.15);return g;},
 lantern(look){const g=new THREE.Group();boxIn(g,GFX.mat(0x3a3028,'metal',{size:128}),.08,1.2,.08,0,5.6,.25);const l=new THREE.Mesh(boxGeo,emM(0xffb040,2.2));l.scale.set(.25,.35,.25);l.position.set(0,4.9,.25);g.add(l);return g;},
 rails(look){return null;},boulder(look){return null;},obelisk(look){return null;},gatefar(){return null;},crownsky(){return null;}
};
/* cover objects (T_COVER cells are 1.1 high, solid) */
const COVER={
 crate:(x,z,look)=>{const g=new THREE.Group();const m=GFX.mat(0x5a5a46,'metal',{size:128});boxIn(g,m,C*.85,1.1,C*.85,0,.55,0);const s=new THREE.Mesh(boxGeo,GFX.mat(0xd8b020,'metal',{size:128}));s.scale.set(C*.87,.14,C*.87);s.position.y=.85;g.add(s);return g;},
 boulder:(x,z,look)=>{const g=new THREE.Group();const r=new THREE.Mesh(ROCKS[Math.floor(Math.random()*4)],GFX.mat(look.wall[0],look.wall[1]));r.scale.set(C*.55,1.1,C*.55);r.position.y=.5;r.rotation.y=Math.random()*6;g.add(r);return g;},
 block:(x,z,look)=>{const g=new THREE.Group();boxIn(g,GFX.mat(look.wall[0],look.wall[1]==='metal'?'concrete':look.wall[1]),C*.9,1.1,C*.9,0,.55,0);return g;},
 pew:(x,z,look)=>{const g=new THREE.Group();const m=GFX.mat(0x5a3a22,'wood',{size:128});boxIn(g,m,C*.9,.5,C*.5,0,.6,0);boxIn(g,m,C*.9,1.1,.15,0,.55,-C*.25);return g;},
 skullpile:(x,z,look)=>{const g=PROP.skulls(look);g.scale.set(1.5,1.8,1.5);return g;},
 iceblock:(x,z,look)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0xaad8ff,transparent:true,opacity:.75,roughness:.1,metalness:.1});const b=new THREE.Mesh(rboxGeo,m);b.scale.set(C*.85,1.2,C*.85);b.position.y=.55;g.add(b);return g;},
 anvil:(x,z,look)=>PROP.anvil(look),
 monolith:(x,z,look)=>{const g=new THREE.Group();boxIn(g,GFX.mat(0x1a1a22,'rock'),C*.7,1.1,C*.7,0,.55,0);const r=new THREE.Mesh(boxGeo,emM(look.trim||look.crystal||0xa87aff,1.6));r.scale.set(C*.72,.06,C*.72);r.position.y=.8;g.add(r);return g;},
 sarcophagus:(x,z,look)=>{const g=new THREE.Group();const m=GFX.mat(0x6a6058,'concrete',{size:128});boxIn(g,m,C*.6,1,C*.92,0,.5,0);boxIn(g,m,C*.66,.15,C*.98,0,1.05,0);return g;},
 pod:(x,z,look)=>{const g=PROP.pod(look);g.scale.set(1.2,.9,1.2);return g;},
 cart:(x,z,look)=>{const g=new THREE.Group();const m=GFX.mat(0x5a4a3a,'metal',{size:128});boxIn(g,m,C*.6,.8,C*.85,0,.65,0);for(const sx of[-.5,.5])for(const sz of[-.7,.7]){const w=new THREE.Mesh(CYL,GFX.mat(0x2a2a2a,'metal',{size:128}));w.scale.set(.22,.12,.22);w.rotation.z=Math.PI/2;w.position.set(sx,.22,sz);g.add(w);}return g;}
};
const PILLAR={
 column:(h,look)=>{const g=new THREE.Group();const m=GFX.mat(look.wall[0],'metal');const c=new THREE.Mesh(CYL,m);c.scale.set(C*.32,h,C*.32);c.position.y=h/2;g.add(c);boxIn(g,m,C*.85,.8,C*.85,0,.4,0);boxIn(g,m,C*.85,.8,C*.85,0,h-.4,0);
   if(look.trim){const s=new THREE.Mesh(CYL,emM(look.trim,1.4));s.scale.set(C*.33,.12,C*.33);s.position.y=2.2;g.add(s);}return g;},
 brickcol:(h,look)=>{const g=new THREE.Group();boxIn(g,GFX.mat(look.wall[0],'brick'),C*.75,h,C*.75,0,h/2,0);boxIn(g,GFX.mat(look.wall[0],'concrete'),C*.95,.6,C*.95,0,h-.3,0);boxIn(g,GFX.mat(look.wall[0],'concrete'),C*.95,.6,C*.95,0,.3,0);return g;},
 bonecol:(h,look)=>{const g=new THREE.Group();const m=GFX.mat(0xe0d6c0,'bone');for(let y=0;y<h;y+=.7){const v=new THREE.Mesh(CYL,m);v.scale.set(C*.3,.45,C*.3);v.position.y=y+.25;g.add(v);const d=new THREE.Mesh(CYL,m);d.scale.set(C*.2,.25,C*.2);d.position.y=y+.6;g.add(d);}return g;},
 spire:(h,look)=>{const g=new THREE.Group();const c=new THREE.Mesh(CONE,GFX.mat(look.wall[0],look.wall[1]));c.scale.set(C*.6,h*1.6,C*.6);c.position.y=h*.8;g.add(c);return g;},
 timber:(h,look)=>{const g=new THREE.Group();const m=GFX.mat(0x6a4a2a,'wood');boxIn(g,m,.5,h,.5,0,h/2,0);boxIn(g,m,C*1.4,.4,.5,0,h-.6,0);return g;},
 icespire:(h,look)=>{const g=new THREE.Group();const c=new THREE.Mesh(CONE,new THREE.MeshStandardMaterial({color:0x9ac8e8,roughness:.12,metalness:.1}));c.scale.set(C*.55,h*1.8,C*.55);c.position.y=h*.9;g.add(c);return g;},
 obelisk:(h,look)=>{const g=new THREE.Group();const c=new THREE.Mesh(new THREE.CylinderGeometry(.5,1,1,4),GFX.mat(0x16141c,'rock'));c.scale.set(C*.6,h*1.3,C*.6);c.position.y=h*.65;c.rotation.y=Math.PI/4;g.add(c);
   const s=new THREE.Mesh(boxGeo,emM(look.crystal||look.trim||0xa87aff,2));s.scale.set(.08,h*1.1,C*.7);s.position.y=h*.6;g.add(s);return g;},
 tendril:(h,look)=>{const g=new THREE.Group();const m=GFX.mat(0x7a2a34,'flesh');let x=0,z=0;for(let y=0;y<h;y+=.6){const s=new THREE.Mesh(SPH,m);s.scale.setScalar(C*.38-y*.02);x=Math.sin(y*.7)*.3;z=Math.cos(y*.5)*.3;s.position.set(x,y,z);g.add(s);}return g;}
};

/* ---------- WEATHER ---------- */
const WX={pts:null,kind:null,vel:null};
function dotTex(){const cv=document.createElement('canvas');cv.width=cv.height=32;const g=cv.getContext('2d');const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(cv);}
const _dot=dotTex();
function buildWeather(kind,L,look,top){
  const cfg={snow:[1600,0xffffff,.22,false],ash:[900,0x6a6060,.18,false],dust:[500,0xd8a070,.14,false],embers:[500,0xff8a2a,.16,true],spores:[600,0x9aff6a,.18,true],motes:[400,look.crystal||look.light||0xffcf8a,.14,true]}[kind];if(!cfg)return;
  const n=cfg[0],pos=new Float32Array(n*3),vel=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=rand(-40,40);pos[i*3+1]=rand(0,top);pos[i*3+2]=rand(-40,40);
    const v=kind==='snow'?[rand(-.6,.6),-rand(1.5,3),rand(-.6,.6)]:kind==='ash'?[rand(-.3,.6),-rand(.4,1),rand(-.3,.3)]:kind==='embers'?[rand(-.3,.3),rand(.6,1.6),rand(-.3,.3)]:kind==='dust'?[rand(.6,1.6),rand(-.1,.1),rand(-.3,.3)]:[rand(-.2,.2),rand(-.15,.25),rand(-.2,.2)];vel.set(v,i*3);}
  const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(gm,new THREE.PointsMaterial({color:cfg[1],size:cfg[2],map:_dot,transparent:true,depthWrite:false,blending:cfg[3]?THREE.AdditiveBlending:THREE.NormalBlending,opacity:.85}));p.frustumCulled=false;world.add(p);
  WX.pts=p;WX.vel=vel;WX.kind=kind;WX.top=top;}
function weatherTick(dt){if(!WX.pts||!WX.pts.parent)return;const p=WX.pts.geometry.attributes.position,a=p.array,v=WX.vel;const cx_=P.pos.x,cz_=P.pos.z,t=G.time||performance.now()/1000;
  for(let i=0;i<a.length;i+=3){a[i]+=(v[i]+Math.sin(t+i)*.15)*dt;a[i+1]+=v[i+1]*dt;a[i+2]+=v[i+2]*dt;
    if(a[i]-cx_>40)a[i]-=80;else if(a[i]-cx_<-40)a[i]+=80;if(a[i+2]-cz_>40)a[i+2]-=80;else if(a[i+2]-cz_<-40)a[i+2]+=80;if(a[i+1]<0)a[i+1]+=WX.top;else if(a[i+1]>WX.top)a[i+1]-=WX.top;}
  p.needsUpdate=true;}
frameHooks.push(dt=>{weatherTick(dt);for(const o of WORLD_ANIM)o(dt);});
const WORLD_ANIM=[];

/* ---------- BUILD ---------- */
buildWorld=function(L,seedNum,opts){
  opts=opts||{};const single=opts.single||G.state==='menu';
  scene.remove(world);world=new THREE.Group();scene.add(world);solids=[];solidMeshes=[];torches=[];WORLD_ANIM.length=0;WX.pts=null;
  const look=lookFor(L),st=STYLES[look.arch];G.look=look;G.style=st;G.ceil=st.ceil?st.wallH:0;
  grid=genLevel(L,seedNum,single);
  const rnd=seeded(seedNum*31+7);const t=grid.t,h=grid.h;
  const fogC=new THREE.Color(L.fog);scene.background=fogC.clone();
  scene.fog=new THREE.Fog(fogC,look.fog?look.fog[0]:st.ceil?18:24,look.fog?look.fog[1]:st.ceil?85:140);
  renderer.shadowMap.enabled=S.shadows;sun.castShadow=S.shadows;
  const lc=new THREE.Color(look.light||L.torch);
  hemi.color.set(new THREE.Color(0xffffff).lerp(lc,.25));hemi.groundColor.set(new THREE.Color(L.fog).lerp(lc,.4));hemi.intensity=st.hemi;
  sun.color.set(new THREE.Color(0xffffff).lerp(lc,.45));sun.intensity=st.sun;
  if(typeof gunHemi!=='undefined'){gunHemi.groundColor.set(lc);gunKey.color.set(lc).lerp(new THREE.Color(0xffffff),.6);}
  // sky
  if(!st.ceil||G.state==='menu'){const dome=new THREE.Mesh(new THREE.SphereGeometry(195,40,20),new THREE.MeshBasicMaterial({map:skyTex(L,look),side:THREE.BackSide,fog:false,depthWrite:false}));world.add(dome);world.userData.dome=dome;}
  // need: boundary wall cells
  const need=new Uint8Array(N*N),done=new Uint8Array(N*N);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=idx(i,j);if(t[k]!==T_WALL||h[k]>0)continue;
    for(let a=-1;a<=1&&!need[k];a++)for(let b=-1;b<=1;b++){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N)continue;const kk=idx(ii,jj);if(t[kk]!==T_WALL||h[kk]>0){need[k]=1;break;}}}
  const WH=st.ceil?st.wallH:Math.max(st.wallH,7.5),walk=k=>t[k]!==T_WALL||h[k]>0;
  // floor
  if(st.arch!=='islands'){const size=st.arch==='outdoor'?520:N*C+60;const fm=blockMat(look.floor[0],look.floor[1],size/(2*C),size/(2*C));
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(size,size),fm);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;world.add(fl);}
  else buildIslands(L,look,rnd);
  // walls
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=idx(i,j);if(!need[k]||done[k])continue;
    let w=1;while(i+w<N&&need[idx(i+w,j)]&&!done[idx(i+w,j)])w++;
    const solidOnly=st.arch!=='facility'&&st.arch!=='hall';
    if(w>1){for(let q=0;q<w;q++)done[idx(i+q,j)]=1;if(solidOnly)solidBox(cx(i)+(w-1)*C/2,cx(j),w*C,WH,C);else addBox(cx(i)+(w-1)*C/2,cx(j),w*C,WH,C,look.wall[0],look.wall[1]);}
    else{let hh=1;while(j+hh<N&&need[idx(i,j+hh)]&&!done[idx(i,j+hh)])hh++;for(let q=0;q<hh;q++)done[idx(i,j+q)]=1;if(solidOnly)solidBox(cx(i),cx(j)+(hh-1)*C/2,C,WH,hh*C);else addBox(cx(i),cx(j)+(hh-1)*C/2,C,WH,hh*C,look.wall[0],look.wall[1]);}}
  // wall faces (for trim, windows, props)
  const faces=[];for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const k=idx(i,j);if(!need[k])continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=idx(i+dx,j+dz);if(walk(kk)&&t[kk]!==T_DOOR)faces.push({i,j,dx,dz,x:cx(i)+dx*C/2,z:cx(j)+dz*C/2,ry:Math.atan2(dx,dz),fk:kk});}}
  if(st.arch==='caves'||st.arch==='outdoor')buildRockWalls(need,look,st,rnd);
  if(st.arch==='islands')buildRims(need,look,rnd);
  if(st.arch==='facility'||st.arch==='hall')buildTrim(faces,look,st);
  // ceiling
  if(st.ceil){const cm=blockMat(look.ceil[0],look.ceil[1],N/2,N/2);const cp=new THREE.Mesh(new THREE.PlaneGeometry(N*C+40,N*C+40),cm);cp.rotation.x=Math.PI/2;cp.position.y=WH;cp.castShadow=true;cp.receiveShadow=true;world.add(cp);buildCeilingDetail(look,st,rnd);}
  else if(st.arch==='outdoor')buildDistant(L,look,rnd);
  // cell features
  const lavaCol=look.abyss==='lava'||L.torch;const lavaMat=emM(st.arch==='outdoor'&&look.floor[1]==='flesh'?0x9aff3a:(L.torch),1.6);
  const coverF=COVER[look.cover]||COVER.block,pillF=PILLAR[look.pillar]||PILLAR.brickcol;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=idx(i,j),tt=t[k],x=cx(i),z=cx(j);
    if(tt===T_WALL&&h[k]>0){if(st.arch==='facility'||st.arch==='hall')addBox(x,z,C,h[k],C,look.wall[0],look.wall[1]);else{solidBox(x,z,C,h[k],C);vis(new THREE.Mesh(ROCKS[k%4],GFX.mat(look.wall[0],look.wall[1])),x,h[k]/2,z).scale.set(C*.75,h[k]*.6,C*.75);}}
    else if(tt===T_PILLAR){const ph=st.ceil?WH:h[k];solidBox(x,z,C*.8,ph,C*.8);vis(pillF(ph,look),x,0,z,rnd()*0);}
    else if(tt===T_COVER){solidBox(x,z,C*.92,1.1,C*.92);vis(coverF(x,z,look),x,0,z,Math.floor(rnd()*4)*Math.PI/2);}
    else if(tt===T_PLAT)addBox(x,z,C,h[k],C,look.floor[0],h[k]>3?(look.wall[1]==='metal'?'metal':look.wall[1]):(st.arch==='facility'?'grate':look.floor[1]));
    else if(tt===T_STAIR){const d=grid.sd[k],lo=grid.lo[k],hi=h[k];for(let s=0;s<5;s++){const top=lo+(hi-lo)*(s+1)/5;const off=(-C/2+C/10+s*C/5);const px=d[0]?x+d[0]*off:x,pz=d[1]?z+d[1]*off:z;addBox(px,pz,d[0]?C/5:C,top,d[1]?C/5:C,look.floor[0],st.arch==='facility'?'grate':look.floor[1]);}}
    else if(tt===T_LAVA){const m=new THREE.Mesh(boxGeo,lavaMat);m.scale.set(C,.06,C);m.position.set(x,.02,z);world.add(m);}
    else if(tt===T_PAD){const p=new THREE.Mesh(new THREE.CylinderGeometry(C*.38,C*.42,.18,16),GFX.mat(0x3a3a42,'metal',{size:128}));p.position.set(x,.09,z);world.add(p);const ring_=new THREE.Mesh(new THREE.RingGeometry(C*.22,C*.34,24),emM(0x30ff9a,2));ring_.rotation.x=-Math.PI/2;ring_.position.set(x,.19,z);world.add(ring_);
      const a=new THREE.Mesh(new THREE.ConeGeometry(.35,.6,4),emM(0x30ff9a,2));a.position.set(x,.6,z);world.add(a);torches.push({f:a,l:null,t:0,pad:true});}}
  // doors
  for(const d of grid.doors)buildDoor(d,st,look,WH);
  // room lamps and props
  dressRooms(faces,look,st,rnd,WH);
  indexSolids();
  buildWeather(look.weather,L,look,st.ceil?WH-.3:24);
  if(opts.noLights!==true)lightRoom(grid.rooms[0]);
};

function buildDoor(d,st,look,WH){const len=3*C;const th=C*.45;const dh=Math.min(WH,st.arch==='islands'?6.8:WH);const g=new THREE.Group();
  const w=d.horiz?th:len,dep=d.horiz?len:th;
  if(d.locked){const m=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0xffcf3a,emissive:0xaa7a00,emissiveIntensity:1.2,transparent:true,opacity:.7}));m.scale.set(w,dh,dep);m.position.y=dh/2;g.add(m);}
  else if(st.doors==='blast'||st.doors==='gate'){const met=GFX.mat(st.doors==='gate'?0x3a3028:0x5a5c60,st.doors==='gate'?'wood':'metal');const halfL=len/2;
    for(const s of[-1,1]){const p=new THREE.Mesh(rboxGeo,met);p.scale.set(d.horiz?th:halfL-.05,dh,d.horiz?halfL-.05:th);p.position.set(d.horiz?0:s*halfL/2,dh/2,d.horiz?s*halfL/2:0);g.add(p);}
    const stripe=new THREE.Mesh(boxGeo,emM(st.doors==='gate'?0xff3a1a:0xffb020,1.5));stripe.scale.set(d.horiz?th+.05:len,.25,d.horiz?len:th+.05);stripe.position.y=2.4;g.add(stripe);
    const lightL=new THREE.Mesh(boxGeo,emM(0xff2a1a,2.5));lightL.scale.set(d.horiz?th+.08:.5,.5,d.horiz?.5:th+.08);lightL.position.y=dh-.8;g.add(lightL);g.userData.lamp=lightL;}
  else{const m=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0xff3a1a,emissive:0xff2a00,emissiveIntensity:1.4,transparent:true,opacity:.55,depthWrite:false}));m.scale.set(w,dh,dep);m.position.y=dh/2;g.add(m);
    for(const s of[-1,1]){const post=new THREE.Mesh(rboxGeo,GFX.mat(0x2a2a30,'metal',{size:128}));post.scale.set(d.horiz?th+.3:.5,dh+.3,d.horiz?.5:th+.3);post.position.set(d.horiz?0:s*len/2,(dh+.3)/2,d.horiz?s*len/2:0);world.add(post);post.position.x+=d.x;post.position.z+=d.z;}}
  const blocker=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({visible:false}));blocker.visible=false;blocker.scale.set(w,dh,dep);blocker.position.y=dh/2;g.add(blocker);
  g.position.set(d.x,d.open?-dh-1:0,d.z);world.add(g);
  const s={min:new THREE.Vector3(d.x-w/2,0,d.z-dep/2),max:new THREE.Vector3(d.x+w/2,dh,d.z+dep/2),mesh:blocker,off:d.open};solids.push(s);solidMeshes.push(blocker);d.mesh=g;d.solid=s;d.yOpen=-dh-1;d.yClosed=0;
  if(d.locked){d.open=false;s.off=false;g.position.y=0;for(const k of d.cells)grid.dc[k]=1;}
}
function buildRockWalls(need,look,st,rnd){const m=GFX.mat(look.wall[0],look.wall[1]);const lists=[[],[],[],[]];const tall=st.arch==='outdoor';
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=idx(i,j);if(!need[k])continue;const x=cx(i)+(rnd()-.5)*.8,z=cx(j)+(rnd()-.5)*.8;const v=Math.floor(rnd()*4);
    const s=C*(.72+rnd()*.3);lists[v].push([x,s*.5,z,s,s*1.3,s,0,rnd()*6,0]);
    const hgt=tall?rand(6,14):st.wallH;const v2=(v+1)%4;lists[v2].push([x+(rnd()-.5),hgt*.55,z+(rnd()-.5),s*.9,hgt*.55,s*.9,0,rnd()*6,0]);
    if(tall&&rnd()<.35)lists[(v+2)%4].push([x,hgt+rand(1,4),z,s*.7,rand(2,5),s*.7,rnd()*.4,rnd()*6,0]);}
  lists.forEach((l,i)=>inst(ROCKS[i],m,l));}
function buildRims(need,look,rnd){const m=GFX.mat(look.wall[0],look.wall[1]);const l=[];
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const k=idx(i,j);if(!need[k])continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=idx(i+dx,j+dz);if(grid.t[kk]===T_WALL&&!(grid.h[kk]>0))continue;
    l.push([cx(i)+dx*C*.42,.35,cx(j)+dz*C*.42,dx?.3:C*.5,.7+rnd()*.4,dx?C*.5:.3,0,0,0]);}}
  inst(rboxGeo,m,l);}
function buildIslands(L,look,rnd){
  const fm=GFX.mat(look.floor[0],look.floor[1]);const wm=GFX.mat(look.wall[0],look.wall[1]);
  for(const R of grid.rooms){const w=(R.i1-R.i0+1)*C,d=(R.j1-R.j0+1)*C;const top=new THREE.Mesh(boxGeo,blockMat(look.floor[0],look.floor[1],Math.round(d/C),Math.round(w/C)));top.scale.set(w,1.2,d);top.position.set(R.cx,-.6,R.cz);top.receiveShadow=true;world.add(top);
    const under=new THREE.Mesh(ROCKS[R.idx%4],wm);under.scale.set(w*.52,Math.max(w,d)*.8,d*.52);under.position.set(R.cx,-Math.max(w,d)*.62,R.cz);world.add(under);}
  // bridges: corridor cells
  const bm=GFX.mat(look.floor[1]==='bone'?0xd8ccb0:0x4a4a52,look.floor[1]==='bone'?'bone':'metal');const deck=[],posts=[];
  for(let k=0;k<N*N;k++){if(grid.roomOf[k]>=0)continue;const tt=grid.t[k];if(tt!==T_FLOOR&&tt!==T_DOOR)continue;const i=k%N,j=(k/N)|0;deck.push([cx(i),-.25,cx(j),C,.5,C,0,0,0]);
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=idx(i+dx,j+dz);if(grid.t[kk]===T_WALL&&grid.roomOf[kk]<0)posts.push([cx(i)+dx*C*.45,.6,cx(j)+dz*C*.45,.15,1.2,.15,0,0,0]);}}
  inst(boxGeo,bm,deck);inst(CYL,bm,posts);
  // the abyss
  const lava=look.abyss==='lava';const ab=new THREE.Mesh(new THREE.PlaneGeometry(900,900),lava?emM(0xff4a00,1.1):new THREE.MeshBasicMaterial({color:look.abyssCol||0x10081a,fog:true}));ab.rotation.x=-Math.PI/2;ab.position.y=lava?-30:-80;world.add(ab);
  if(lava){WORLD_ANIM.push(dt=>{ab.material.emissiveIntensity=1.1+Math.sin(performance.now()/700)*.25;});}
  // floating debris
  const fl=[];for(let i=0;i<70;i++){const a=rnd()*6.28,r=ARENA+rand(10,120),s=rand(2,9);fl.push([Math.cos(a)*r,rand(-40,30),Math.sin(a)*r,s,s*rand(.6,1.4),s,rnd(),rnd()*6,rnd()]);}
  inst(ROCKS[1],wm,fl,false);
}
function buildDistant(L,look,rnd){const m=GFX.mat(new THREE.Color(look.wall[0]).multiplyScalar(.7).getHex(),look.wall[1]);const mts=[[],[]];
  for(let i=0;i<46;i++){const a=i/46*Math.PI*2+rnd()*.1,r=ARENA+rand(40,110),s=rand(18,40);mts[i%2].push([Math.cos(a)*r,-s*.15,Math.sin(a)*r,s,s*rand(.9,2.2),s,0,rnd()*6,0]);}
  mts.forEach((l,i)=>inst(ROCKS[i+1],m,l,false));
  if(look.props.includes('gatefar')){const g=new THREE.Group();const sm=GFX.mat(0x1a1414,'brick');boxIn(g,sm,14,70,14,-30,35,0);boxIn(g,sm,14,70,14,30,35,0);boxIn(g,sm,80,14,16,0,72,0);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(46,64),emM(0xff3a1a,1.4));p.position.set(0,32,0);g.add(p);g.position.set(0,0,-ARENA-120);world.add(g);}
  if(look.props.includes('crownsky')){const c=new THREE.Mesh(new THREE.TorusGeometry(60,4,10,64),emM(0xffcf3a,1.6));c.position.set(0,110,-40);c.rotation.x=1.2;world.add(c);WORLD_ANIM.push(dt=>{c.rotation.z+=dt*.04;});
    for(let i=0;i<12;i++){const s=new THREE.Mesh(CONE,emM(0xffcf3a,1.6));const a=i/12*Math.PI*2;s.scale.set(4,18,4);s.position.set(Math.cos(a)*60,0,Math.sin(a)*60);c.add(s);s.lookAt(0,0,0);s.rotateX(Math.PI/2);}}
  if(look.props.includes('drill')){const d=PROP.drill(look);d.scale.setScalar(3);d.position.set(ARENA+20,0,-30);world.add(d);}}
function buildTrim(faces,look,st){const tm=look.trim?emM(look.trim,st.arch==='facility'?1.3:.9):null;const base=GFX.mat(new THREE.Color(look.wall[0]).multiplyScalar(.6).getHex(),'metal',{size:128});const bl=[],tl=[],cl=[];
  for(const f of faces){const ox=f.dx*.06,oz=f.dz*.06;const along=f.dx?[.2,C]:[C,.2];bl.push([f.x+ox*2,.3,f.z+oz*2,along[0],.6,along[1],0,0,0]);
    if(tm)tl.push([f.x+ox,st.arch==='facility'?3.2:st.wallH-2.5,f.z+oz,f.dx?.12:C,.14,f.dx?C:.12,0,0,0]);if(st.arch==='hall')cl.push([f.x+ox*3,st.wallH-.6,f.z+oz*3,f.dx?.6:C,1.2,f.dx?C:.6,0,0,0]);}
  inst(boxGeo,base,bl);if(tm)inst(boxGeo,tm,tl,false);inst(boxGeo,base,cl);}
function buildCeilingDetail(look,st,rnd){const H=st.wallH;
  if(st.arch==='caves'){const m=GFX.mat(look.ceil[0],look.ceil[1]);const l=[];for(let k=0;k<N*N;k++){if(grid.t[k]===T_WALL||rnd()>.12)continue;const i=k%N,j=(k/N)|0;const len=rand(1.2,4);l.push([cx(i)+rand(-1,1),H-len/2,cx(j)+rand(-1,1),rand(.3,.8),len,rand(.3,.8),Math.PI,rnd()*6,0]);}inst(CONE,m,l);return;}
  const beam=GFX.mat(new THREE.Color(look.ceil[0]).multiplyScalar(1.3).getHex(),'metal',{size:128});const lights=[],beams=[];
  for(const R of grid.rooms){if(R.type==='vault'||R.type==='trial')continue;for(let i=R.i0+1;i<R.i1;i+=3)beams.push([cx(i),H-.4,R.cz,.5,.8,(R.j1-R.j0+1)*C,0,0,0]);
    if(st.arch==='facility')for(let i=R.i0+2;i<R.i1-1;i+=3)for(let j=R.j0+2;j<R.j1-1;j+=4)lights.push([cx(i)+C*1.5,H-.12,cx(j),1.8,.12,.6,0,0,0]);}
  inst(boxGeo,beam,beams);if(lights.length)inst(boxGeo,emM(look.light||0xffe6c8,2.4),lights,false);
  if(st.arch==='hall')for(const R of grid.rooms){if(R.type==='vault'||R.type==='trial')continue;const ch=new THREE.Group();const r=new THREE.Mesh(TOR,GFX.mat(0x3a3028,'metal',{size:128}));r.scale.setScalar(1.6);r.rotation.x=Math.PI/2;ch.add(r);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const f=new THREE.Mesh(SPH,glowM(look.light||0xffcf6a));f.scale.set(.08,.14,.08);f.position.set(Math.cos(a)*1.6,.2,Math.sin(a)*1.6);ch.add(f);}
    const c=PROP.chain(look);c.position.y=H-ch.position.y;ch.position.set(R.cx,H-4,R.cz);c.position.set(0,4,0);ch.add(c);world.add(ch);}}
function dressRooms(faces,look,st,rnd,WH){
  const doorNear=(x,z)=>grid.doors.some(d=>Math.abs(x-d.x)<C*2.6&&Math.abs(z-d.z)<C*2.6);
  const pool=look.props.filter(p=>PROP[p]&&!['rails','boulder','obelisk','gatefar','crownsky','drill'].includes(p));
  // lamps at room corners
  for(const R of grid.rooms){for(const[i,j]of[[R.i0,R.j0],[R.i1,R.j0],[R.i0,R.j1],[R.i1,R.j1]]){const k=idx(i,j);if(grid.t[k]!==T_FLOOR||doorNear(cx(i),cx(j)))continue;
    const kind=st.arch==='facility'?'lamp':st.arch==='caves'?'lantern':'brazier';
    if(kind==='brazier')vis(PROP.brazier(look),cx(i),0,cx(j));
    else if(kind==='lantern')vis(PROP.lantern(look),cx(i),-1.5,cx(j));
    else{const g=new THREE.Group();boxIn(g,GFX.mat(0x2a2a30,'metal',{size:128}),.3,2.6,.3,0,1.3,0);const l=new THREE.Mesh(boxGeo,emM(look.light||0xffe6c8,2.6));l.scale.set(.36,.5,.36);l.position.y=2.75;g.add(l);vis(g,cx(i),0,cx(j));}}}
  if(!pool.length)return;
  // wall-mounted and floor props along faces
  const wallProps=['window','banner','pipes','lavafall','eyes','crypt','alarm','timber','lantern'],hang=['chain','hooks','meat','resin'];
  let n=0;for(const f of faces){if(rnd()>.16)continue;const fx=cx(f.fk%N),fz=cx((f.fk/N)|0);if(doorNear(fx,fz))continue;const kind=pool[Math.floor(rnd()*pool.length)];
    if((kind==='window'||kind==='banner'||kind==='lavafall')&&!st.ceil&&st.arch!=='outdoor')continue;
    const g=PROP[kind](look);if(!g)continue;n++;
    if(wallProps.includes(kind)){vis(g,f.x,0,f.z,f.ry);}
    else if(hang.includes(kind)){if(!st.ceil)continue;vis(g,fx+rand(-.8,.8),WH,fz+rand(-.8,.8));}
    else{const ox=(fx-f.x)*.15,oz=(fz-f.z)*.15;vis(g,f.x+(fx-f.x)*.55+ox,0,f.z+(fz-f.z)*.55+oz,f.ry);}}
  if(look.props.includes('throne')){const B=grid.rooms.find(r=>r.type==='boss');if(B){const g=PROP.throne(look);vis(g,B.cx,0,cx(B.j0)+C*.2);}}
  if(look.props.includes('runes'))for(const R of grid.rooms){if(R.type!=='main'&&R.type!=='boss')continue;const g=PROP.runes(look);g.scale.setScalar(2.2);vis(g,R.cx,surfaceAt(R.cx,R.cz),R.cz);WORLD_ANIM.push(dt=>{g.rotation.y+=dt*.3;});}
  // animate alarms and lava falls
  world.traverse(o=>{if(o.userData&&o.userData.alarm){const a=o.userData.alarm;WORLD_ANIM.push(()=>{a.material.emissiveIntensity=Math.sin(performance.now()/180)>0?3:.2;});}});
}
/* keep the player under the roof */
frameHooks.push(()=>{if(G.ceil&&!G.trial&&P.pos.y+P.height+.25>G.ceil){P.pos.y=G.ceil-P.height-.25;if(P.vel.y>0)P.vel.y=0;}});
