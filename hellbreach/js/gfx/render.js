/* =====================================================================
   RENDER — the modern look.
   - High-resolution procedural textures with matching normal maps
     (brick, metal, flagstone, concrete, rock, tile, grate, bone, flesh,
     ice, dirt, wood, organic skin) instead of 8-bit pixel textures.
   - Physically based materials (MeshStandardMaterial).
   - Rounded geometry for creatures, people and weapons.
   - Post-processing: bloom, filmic tone mapping, colour grade, vignette,
     film grain and FXAA. Quality presets in Settings.
   ===================================================================== */
const GFX={};

/* ---------- tileable noise ---------- */
function _hash(x,y,s){let h=(x*374761393+y*668265263+s*1442695041)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295;}
function vnoise(x,y,p,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const m=a=>((a%p)+p)%p;const a=_hash(m(xi),m(yi),s),b=_hash(m(xi+1),m(yi),s),c=_hash(m(xi),m(yi+1),s),d=_hash(m(xi+1),m(yi+1),s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,p,oct,s){let t=0,amp=.5,f=1,n=0;for(let o=0;o<oct;o++){t+=amp*vnoise(x*f,y*f,p*f,s+o*17);n+=amp;amp*=.5;f*=2;}return t/n;}
function ridged(x,y,p,oct,s){let t=0,amp=.5,f=1,n=0;for(let o=0;o<oct;o++){t+=amp*(1-Math.abs(vnoise(x*f,y*f,p*f,s+o*31)*2-1));n+=amp;amp*=.5;f*=2;}return t/n;}
/* tileable voronoi: returns [f1,f2,cellId] */
function voro(x,y,p,s){const xi=Math.floor(x),yi=Math.floor(y);let f1=9,f2=9,id=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx_=xi+i,cy_=yi+j;const mx=((cx_%p)+p)%p,my=((cy_%p)+p)%p;
    const px=cx_+_hash(mx,my,s),py=cy_+_hash(mx,my,s+7);const d=Math.hypot(px-x,py-y);if(d<f1){f2=f1;f1=d;id=mx*131+my;}else if(d<f2)f2=d;}
  return[f1,f2,id];}

/* ---------- texture patterns: (u,v in 0..1) -> [height 0..1, brightness, tintR, tintG, tintB] ---------- */
const PAT={
 brick(u,v){const rows=8,row=Math.floor(v*rows),off=(row%2)*.5,bu=(u*4+off)%4,bx=Math.floor(bu),fx=bu-bx,fy=v*rows-row;
   const mort=fx<.035||fy<.07;const id=_hash(bx,row,3);const n=fbm(u*8,v*8,8,4,1);
   if(mort)return[.15+n*.1,.5+n*.15];const edge=Math.min(fx,1-fx,fy*.5,(1-fy)*.5);return[.75+n*.25-Math.max(0,.06-edge)*3,.8+id*.28+(n-.5)*.35-(fy>.8?.08:0)];},
 metal(u,v){const p=2,gx=(u*p)%1,gy=(v*p)%1;const seam=gx<.012||gy<.012||gx>.988||gy>.988;const riv=[.06,.94].some(a=>[.06,.94].some(b=>Math.hypot(gx-a,gy-b)<.022));
   const brush=fbm(u*64,v*2,64,3,5),n=fbm(u*6,v*6,6,4,9);const scr=ridged(u*12+n,v*12,12,3,4);
   if(seam)return[.1,.45];if(riv)return[1,1.15];return[.6+n*.1,.82+brush*.18+(n-.5)*.25+(scr>.93?.25:0)];},
 floor(u,v){const[f1,f2,id]=voro(u*5,v*5,5,11);const e=f2-f1;const n=fbm(u*10,v*10,10,4,2);const gap=e<.06;
   if(gap)return[.1+n*.1,.45+n*.2];return[.6+n*.3+Math.min(e,.3),.78+_hash(id,1,2)*.3+(n-.5)*.35];},
 concrete(u,v){const n=fbm(u*8,v*8,8,5,21),p=fbm(u*40,v*40,40,2,22);const pore=p<.22;const line=(u*2)%1<.006||(v*2)%1<.006;const stain=fbm(u*3,v*3,3,3,23);
   return[line?.3:pore?.35:.65+n*.2,(line?.6:pore?.7:.86+(n-.5)*.3)-Math.max(0,stain-.6)*.6];},
 rock(u,v){const r=ridged(u*5,v*5,5,5,31),n=fbm(u*12,v*12,12,4,32);const crack=ridged(u*9,v*9,9,3,33);
   return[r*.8+n*.2-(crack>.92?.3:0),.62+r*.45+(n-.5)*.3-(crack>.92?.3:0)];},
 tile(u,v){const p=8,gx=(u*p)%1,gy=(v*p)%1,id=_hash(Math.floor(u*p),Math.floor(v*p),41);const g=gx<.05||gy<.05;const n=fbm(u*16,v*16,16,3,42);
   return g?[.2,.5]:[.8+n*.1,.85+id*.15+(n-.5)*.2];},
 grate(u,v){const p=16,a=((u+v)*p)%1,b=((u-v+1)*p)%1;const d=Math.min(Math.abs(a-.5),Math.abs(b-.5));const n=fbm(u*8,v*8,8,3,51);
   return d<.12?[.85,1.05+n*.1]:[.35,.62+n*.15];},
 wood(u,v){const n=fbm(u*3,v*24,3,4,61);const ring=(Math.sin((v*24+n*6)*Math.PI)*.5+.5);const plank=(u*4)%1<.02;
   return plank?[.15,.45]:[.55+ring*.2,.7+ring*.3+(n-.5)*.2];},
 bone(u,v){const n=fbm(u*7,v*7,7,5,71),por=fbm(u*50,v*50,50,2,72);const[f1,f2]=voro(u*3,v*3,3,73);const seam=f2-f1<.05;
   return[seam?.2:.6+n*.3-(por<.25?.25:0),seam?.55:.9+(n-.5)*.25-(por<.25?.25:0)];},
 flesh(u,v){const vein=ridged(u*6,v*6,6,4,81),n=fbm(u*9,v*9,9,4,82);const isV=vein>.86;
   return[.5+n*.4+(isV?.3:0),isV?1.35:.75+(n-.5)*.45,isV?1.25:1,isV?.6:1,isV?.6:1];},
 ice(u,v){const n=fbm(u*4,v*4,4,5,91),c=ridged(u*7,v*7,7,4,92);const cr=c>.9;return[.7+n*.2-(cr?.3:0),.9+n*.2+(cr?.25:0)];},
 dirt(u,v){const n=fbm(u*10,v*10,10,5,101),p=fbm(u*60,v*60,60,2,102);const peb=p>.78;return[.5+n*.3+(peb?.3:0),.78+(n-.5)*.4+(peb?.2:0)];},
 skin(u,v){const n=fbm(u*6,v*6,6,4,111),s=fbm(u*28,v*28,28,2,112);const[f1,f2]=voro(u*10,v*10,10,113);const sc=f2-f1<.06;
   return[.55+n*.25+s*.15-(sc?.2:0),.82+(n-.5)*.35-(sc?.12:0)];},
 cloth(u,v){const w=(Math.sin(u*Math.PI*128)*.5+.5)*(Math.sin(v*Math.PI*128)*.5+.5);const n=fbm(u*8,v*8,8,3,121);return[.5+w*.3,.85+w*.1+(n-.5)*.25];}
};
const KIND_PROPS={brick:[.85,0],metal:[.42,.6],floor:[.8,0],concrete:[.92,0],rock:[.9,0],tile:[.35,.05],grate:[.5,.7],wood:[.75,0],bone:[.7,0],flesh:[.38,0],ice:[.15,.1],dirt:[.95,0],skin:[.62,0],cloth:[.95,0]};
const _tex={};
function genTex(col,kind,size){
  const key=col+'|'+kind+'|'+size;if(_tex[key])return _tex[key];
  const S_=size,cv=document.createElement('canvas'),nv=document.createElement('canvas');cv.width=cv.height=nv.width=nv.height=S_;
  const g=cv.getContext('2d'),gn=nv.getContext('2d');const img=g.createImageData(S_,S_),nimg=gn.createImageData(S_,S_);const H=new Float32Array(S_*S_);
  const base=new THREE.Color(col);const f=PAT[kind]||PAT.concrete;
  for(let y=0;y<S_;y++)for(let x=0;x<S_;x++){const r=f(x/S_,y/S_);const i=y*S_+x;H[i]=r[0];const k=r[1];
    img.data[i*4]=clamp(base.r*k*(r[2]||1)*255,0,255);img.data[i*4+1]=clamp(base.g*k*(r[3]||1)*255,0,255);img.data[i*4+2]=clamp(base.b*k*(r[4]||1)*255,0,255);img.data[i*4+3]=255;}
  const str=kind==='metal'||kind==='tile'?3:5;
  for(let y=0;y<S_;y++)for(let x=0;x<S_;x++){const i=y*S_+x;const hx=H[y*S_+(x+1)%S_]-H[y*S_+(x+S_-1)%S_],hy=H[((y+1)%S_)*S_+x]-H[((y+S_-1)%S_)*S_+x];
    const nx=-hx*str,ny=-hy*str,l=Math.hypot(nx,ny,1);nimg.data[i*4]=(nx/l*.5+.5)*255;nimg.data[i*4+1]=(ny/l*.5+.5)*255;nimg.data[i*4+2]=(1/l*.5+.5)*255;nimg.data[i*4+3]=255;}
  g.putImageData(img,0,0);gn.putImageData(nimg,0,0);
  const mk=c=>{const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;};
  return _tex[key]={map:mk(cv),normal:mk(nv)};
}
GFX.tex=genTex;

/* ---------- material overrides ---------- */
const _stdCache={};
function stdMat(col,kind,o){o=o||{};const key=col+kind+JSON.stringify(o);if(_stdCache[key])return _stdCache[key];const t=genTex(col,kind,o.size||256);const kp=KIND_PROPS[kind]||[.8,0];
  const m=new THREE.MeshStandardMaterial({map:t.map,normalMap:t.normal,roughness:o.rough??kp[0],metalness:o.metal??kp[1],emissive:o.emissive||0});
  if(o.ns)m.normalScale.set(o.ns,o.ns);return _stdCache[key]=m;}
GFX.mat=stdMat;
detailTex=function(col,kind){return genTex(col,kind,256).map;};
blockMat=function(col,kind,ry,rx=1){const k=col+kind+ry+'x'+rx;if(!blockMats[k]){const t=genTex(col,kind,256);const kp=KIND_PROPS[kind]||[.8,0];
  const map=t.map.clone(),nm=t.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(rx,ry);nm.repeat.set(rx,ry);
  blockMats[k]=new THREE.MeshStandardMaterial({map,normalMap:nm,roughness:kp[0],metalness:kp[1]});}return blockMats[k];};
skinMat=function(col){if(skinCache[col])return skinCache[col];const t=genTex(col,'skin',128);return skinCache[col]=new THREE.MeshStandardMaterial({map:t.map,normalMap:t.normal,roughness:.62,metalness:.05});};
mat=function(col,emissive=0){const k=col+'_'+emissive;if(!matCache[k]){matCache[k]=new THREE.MeshStandardMaterial({color:col,emissive:emissive,emissiveIntensity:emissive&&emissive===col?1.8:1,roughness:.55,metalness:.12});}return matCache[k];};

/* ---------- rounded geometry for creatures, people and guns ---------- */
function roundedBox(r,seg){const g=new THREE.BoxGeometry(1,1,1,seg,seg,seg);const p=g.attributes.position,v=new THREE.Vector3(),inner=new THREE.Vector3();const h=.5-r;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);inner.set(clamp(v.x,-h,h),clamp(v.y,-h,h),clamp(v.z,-h,h));v.sub(inner);if(v.lengthSq()>0)v.setLength(r);v.add(inner);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
const rboxGeo=roundedBox(.2,4);

/* ---------- renderer & post-processing ---------- */
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const GRADE={uniforms:{tDiffuse:{value:null},exposure:{value:1.0},sat:{value:1.12},vig:{value:.85},grain:{value:.035},time:{value:0},tint:{value:new THREE.Color(1,1,1)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float exposure,sat,vig,grain,time;uniform vec3 tint;varying vec2 vUv;
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
  float rnd(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233))+time)*43758.5453);}
  void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exposure*tint;c=aces(c*1.05)*1.08;float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);
   vec2 d=vUv-.5;c*=1.-vig*dot(d,d)*1.25;c+=(rnd(vUv*vec2(731.,577.))-.5)*grain;gl_FragColor=vec4(c,1.);}`};
const Post={on:false,
 init(){try{
   const hf=renderer.capabilities.isWebGL2||renderer.extensions.has('OES_texture_half_float');
   const rt=new THREE.WebGLRenderTarget(4,4,{type:hf?THREE.HalfFloatType:THREE.UnsignedByteType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
   this.comp=new THREE.EffectComposer(renderer,rt);
   this.main=new THREE.RenderPass(scene,camera);this.comp.addPass(this.main);
   this.gun=new THREE.RenderPass(gunScene,gunCam);this.gun.clear=false;this.gun.clearDepth=true;this.comp.addPass(this.gun);
   this.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.5,.4,.86);this.comp.addPass(this.bloom);
   this.grade=new THREE.ShaderPass(GRADE);this.comp.addPass(this.grade);
   this.fxaa=new THREE.ShaderPass(THREE.FXAAShader);this.comp.addPass(this.fxaa);
   this.on=true;this.size();}catch(e){console.warn('post-processing unavailable',e);this.on=false;}},
 size(){if(!this.comp)return;const pr=renderer.getPixelRatio();const w=innerWidth,h=innerHeight;this.comp.setPixelRatio(pr);this.comp.setSize(w,h);
   this.fxaa.uniforms.resolution.value.set(1/(w*pr),1/(h*pr));this.bloom.resolution.set(w*pr/2,h*pr/2);}
};
function renderFrame(){
  const showGun=G.state!=='menu'&&gunRoot.visible;if(gunCam.aspect!==camera.aspect){gunCam.aspect=camera.aspect;gunCam.updateProjectionMatrix();}
  const q=S.gfx||'high';
  if(Post.on&&q!=='low'){Post.gun.enabled=showGun;Post.bloom.enabled=true;Post.fxaa.enabled=q==='high'&&S.pix<=1;Post.grade.uniforms.time.value=performance.now()%1000;
    Post.bloom.strength=GFX.bloom??.5;Post.grade.uniforms.exposure.value=(GFX.exposure??.92)*(G.style&&G.style.expo||1)*(G.look&&G.look.expo||1);Post.comp.render();return;}
  renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);
  if(showGun){renderer.clearDepth();renderer.render(gunScene,gunCam);}
}
function applyGfx(){const q=S.gfx||'high';const sz=q==='high'?2048:1024;if(sun.shadow.mapSize.x!==sz){sun.shadow.mapSize.set(sz,sz);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  resize();renderer.toneMapping=q==='low'?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=1.1;Post.size();}
resize=function(){const w=innerWidth,h=innerHeight;const lowK=(S&&S.gfx==='low')?.75:1;renderer.setPixelRatio(Math.min(devicePixelRatio,2)*lowK/pixScale());renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
addEventListener('resize',()=>{resize();Post.size();});

/* ---------- init (runs after every core script) ---------- */
for(const c of[matCache,skinCache,blockMats,texCache])for(const k in c)delete c[k];
if(!S.gfx2){S.gfx2=true;S.pix=1;S.gfx=S.gfx||'high';try{localStorage.setItem('hellbreach-settings',JSON.stringify(S));}catch(e){}resize();}
Post.init();applyGfx();gunKey.intensity=.6;
const _rsG=renderSettings;
renderSettings=function(P_){_rsG(P_);const sec=document.createElement('section');sec.className='wide';
  sec.innerHTML='<h3>GRAPHICS</h3><div class="sr"><label>Quality</label><div class="dif">'+[['high','HIGH'],['medium','MEDIUM'],['low','LOW']].map(([k,l])=>'<button data-gfx="'+k+'" class="'+((S.gfx||'high')===k?'sel':'')+'">'+l+'</button>').join('')+'</div></div>'+
   '<div class="sr"><label>Cutscenes (mission intros, boss intros, outros)</label><button class="tg'+(save.skipCine?'':' on')+'" id="s_cine">'+(save.skipCine?'OFF':'ON')+'</button></div>'+
   '<div class="note">High: bloom, film grade, anti-aliasing, sharp shadows. Medium: bloom and grade, softer shadows. Low: no post-processing, for slower devices. "Pixel look" above brings back the retro 8-bit style.</div>';
  P_.querySelector('.set').insertBefore(sec,P_.querySelector('.set').firstChild);
  sec.querySelector('#s_cine').onclick=()=>{save.skipCine=!save.skipCine;persist();renderTab('settings');};
  sec.querySelectorAll('[data-gfx]').forEach(b=>b.onclick=()=>{S.gfx=b.dataset.gfx;saveSettings();applyGfx();renderTab('settings');});};
const _asG=applySettings;applySettings=function(){_asG();if(Post.comp)Post.size();};
showMenu();
