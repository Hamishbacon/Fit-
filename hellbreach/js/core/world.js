/* ---------- WORLD: MULTI-ROOM MAPS ---------- */
const C=2.6,N=56,ARENA=N*C/2,SLOT=14;
const T_FLOOR=0,T_WALL=1,T_PILLAR=2,T_COVER=3,T_PLAT=4,T_LAVA=5,T_STAIR=6,T_PAD=7,T_DOOR=8;
let world=new THREE.Group();scene.add(world);
let solids=[],solidMeshes=[],torches=[],grid=null;
const cx=i=>-ARENA+(i+.5)*C, ci=x=>clamp(Math.floor((x+ARENA)/C),0,N-1);
const idx=(i,j)=>j*N+i;
function seeded(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}}
const frameHooks=[];

let sIndex=[];
function indexSolids(){sIndex=Array.from({length:N*N},()=>[]);
  solids.forEach(s=>{for(let i=ci(s.min.x-.6);i<=ci(s.max.x+.6);i++)for(let j=ci(s.min.z-.6);j<=ci(s.max.z+.6);j++)sIndex[idx(i,j)].push(s);});}
function near(x,z,r){const out=new Set();for(let i=ci(x-r);i<=ci(x+r);i++)for(let j=ci(z-r);j<=ci(z+r);j++)for(const s of sIndex[idx(i,j)])out.add(s);return out;}
resolveXZ=function(pos,rad,feet,height){
  for(const s of near(pos.x,pos.z,rad+.2)){if(s.off)continue;
    if(feet>=s.max.y-.05||feet+height<=s.min.y)continue;
    const qx=clamp(pos.x,s.min.x,s.max.x),qz=clamp(pos.z,s.min.z,s.max.z);const dx=pos.x-qx,dz=pos.z-qz,d2=dx*dx+dz*dz;
    if(d2<rad*rad){if(d2>1e-6){const d=Math.sqrt(d2);pos.x+=dx/d*(rad-d);pos.z+=dz/d*(rad-d);}
      else{const px=Math.min(pos.x-s.min.x,s.max.x-pos.x),pz=Math.min(pos.z-s.min.z,s.max.z-pos.z);
        if(px<pz)pos.x=(pos.x-s.min.x<s.max.x-pos.x)?s.min.x-rad:s.max.x+rad;else pos.z=(pos.z-s.min.z<s.max.z-pos.z)?s.min.z-rad:s.max.z+rad;}}
  }
  pos.x=clamp(pos.x,-ARENA+rad,ARENA-rad);pos.z=clamp(pos.z,-ARENA+rad,ARENA-rad);
};
groundAt=function(x,z,feet,rad){let g=0;for(const s of near(x,z,rad+.1)){if(s.off)continue;if(x+rad>s.min.x&&x-rad<s.max.x&&z+rad>s.min.z&&z-rad<s.max.z&&s.max.y<=feet+.45)g=Math.max(g,s.max.y);}return g;};
inSolid=function(p){for(const b of near(p.x,p.z,.2)){if(b.off)continue;if(p.x>b.min.x&&p.x<b.max.x&&p.z>b.min.z&&p.z<b.max.z&&p.y<b.max.y&&p.y>b.min.y)return b;}return null;};

/* mesh helpers */
const blockMats={};
function blockMat(col,kind,ry,rx=1){const k=col+kind+ry+'x'+rx;if(!blockMats[k]){const t=detailTex(col,kind).clone();t.needsUpdate=true;t.repeat.set(rx,ry);blockMats[k]=new THREE.MeshLambertMaterial({map:t});}return blockMats[k];}
function addBox(x,z,w,h,d,col,kind,y=0,solid=true){
  const m=new THREE.Mesh(boxGeo,blockMat(col,kind,Math.max(1,Math.round(h/C)),Math.max(1,Math.round(Math.max(w,d)/C))));m.scale.set(w,h,d);m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;world.add(m);
  if(solid){const s={min:new THREE.Vector3(x-w/2,y,z-d/2),max:new THREE.Vector3(x+w/2,y+h,z+d/2),mesh:m};solids.push(s);solidMeshes.push(m);m.userData.solid=s;}
  return m;
}
function addTorch(x,z,h,col,withLight){
  addBox(x,z,.6,h,.6,0x2a2220,'metal');
  const f=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:col}));f.scale.set(.42,.7,.42);f.position.set(x,h+.4,z);world.add(f);
  let l=null;if(withLight){l=new THREE.PointLight(col,1.7,24,1.6);l.position.set(x,h+1.2,z);world.add(l);}
  torches.push({f,l,t:Math.random()*10});
}
/* pooled lights: a fixed light count means no shader recompiles while you play */
const roomLights=[];for(let i=0;i<8;i++){const l=new THREE.PointLight(0xff5a1a,0,26,1.6);scene.add(l);roomLights.push(l);}
const flashPool=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffffff,0,10);scene.add(l);flashPool.push({l,life:0,max:1,i:0});}
lightFlash=function(pos,col,intensity,dist,life){const f=flashPool.reduce((a,b)=>a.life<b.life?a:b);f.l.position.copy(pos);f.l.color.set(col);f.l.distance=dist;f.i=intensity;f.life=f.max=life;f.l.intensity=intensity;};
frameHooks.push(dt=>{for(const f of flashPool){if(f.life>0){f.life-=dt;f.l.intensity=f.i*Math.max(0,f.life/f.max);}}});
function lightRoom(r){const col=G.L?G.L.torch:0xff5a1a;const st=G.L&&G.L.style;roomLights.forEach((l,i)=>{const p=r&&r.lights[i];if(p){l.position.set(p[0],p[1],p[2]);l.color.set(st&&st.lightCol!=null?st.lightCol:col);l.intensity=st?st.lightI:1.9;l.distance=st?st.lightD:26;}else l.intensity=0;});}
frameHooks.push(()=>{sun.position.set(P.pos.x+28,50,P.pos.z+18);sun.target.position.set(P.pos.x,0,P.pos.z);sun.target.updateMatrixWorld();});
Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34});sun.shadow.camera.updateProjectionMatrix();

/* ---------- GENERATION ---------- */
function genLevel(L,seed,single){
  const r=seeded(seed*7919+101),ri=(a,b)=>a+Math.floor(r()*(b-a+1));
  const t=new Int8Array(N*N).fill(T_WALL),h=new Float32Array(N*N),sd=new Array(N*N).fill(null),lo=new Float32Array(N*N);
  const roomOf=new Int16Array(N*N).fill(-1),dc=new Uint8Array(N*N),res=new Uint8Array(N*N);
  const rooms=[],doors=[];const side={};
  const mkRoom=(i0,j0,i1,j1,type,slots)=>{const R={i0,j0,i1,j1,type,slots,idx:rooms.length,doors:[],state:'idle',seen:false};rooms.push(R);return R;};
  if(single){mkRoom(15,15,40,40,'single',[]);}
  else{
    let M=L.rooms,path=null;
    for(let tries=0;tries<400&&!path;tries++){
      const p=[[ri(0,3),3]],used=new Set([p[0]+'']);
      while(p.length<M+1){const[x,y]=p[p.length-1];const o=[[1,0],[-1,0],[0,-1],[0,1]].map(d=>[x+d[0],y+d[1]]).filter(([a,b])=>a>=0&&b>=0&&a<4&&b<4&&!used.has(a+','+b));
        if(!o.length)break;const n=o[Math.floor(r()*o.length)];p.push(n);used.add(n+'');}
      if(p.length===M+1)path=p;else if(tries>300)M--;
    }
    const slotRoom=(sx,sy,w,hh,type)=>{const x0=sx*SLOT,y0=sy*SLOT;const i0=x0+1+Math.floor(r()*(13-w)),j0=y0+1+Math.floor(r()*(13-hh));return mkRoom(i0,j0,i0+w-1,j0+hh-1,type,[[sx,sy]]);};
    for(let k=0;k<M-1;k++)slotRoom(path[k][0],path[k][1],ri(10,12),ri(10,12),k===0?'start':'main');
    const a=path[M-1],b=path[M];
    mkRoom(Math.min(a[0],b[0])*SLOT+1,Math.min(a[1],b[1])*SLOT+1,Math.max(a[0],b[0])*SLOT+12,Math.max(a[1],b[1])*SLOT+12,'boss',[a,b]);
    const usedS=new Set(path.map(p=>p+''));
    const attach=(type,w)=>{const cand=[];for(let k=1;k<M-1;k++)for(const d of[[1,0],[-1,0],[0,1],[0,-1]]){const s=[path[k][0]+d[0],path[k][1]+d[1]];if(s[0]>=0&&s[1]>=0&&s[0]<4&&s[1]<4&&!usedS.has(s+''))cand.push([k,s]);}
      if(!cand.length)return null;const[k,s]=cand[Math.floor(r()*cand.length)];usedS.add(s+'');
      const x0=s[0]*SLOT,y0=s[1]*SLOT,o=Math.floor((12-w)/2)+1;const R=mkRoom(x0+o,y0+o,x0+o+w-1,y0+o+w-1,type,[s]);R.parent=k;return R;};
    side.vault=attach('vault',7);side.trial=L.trial!=null?attach('trial',8):null;
    // corridors
    const link=(A,B)=>{let best=null;for(const sa of A.slots)for(const sb of B.slots){const dx=sb[0]-sa[0],dy=sb[1]-sa[1];if(Math.abs(dx)+Math.abs(dy)===1)best=[dx,dy];}
      if(!best)return;const[dx,dy]=best;
      if(dx){const Lr=dx>0?A:B,Rr=dx>0?B:A;const jlo=Math.max(Lr.j0,Rr.j0),jhi=Math.min(Lr.j1,Rr.j1),c=Math.floor((jlo+jhi)/2);
        for(let i=Lr.i1+1;i<Rr.i0;i++)for(let j=c-1;j<=c+1;j++)t[idx(i,j)]=T_FLOOR;
        mkDoor(Lr,Lr.i1+1,c,true,Rr);mkDoor(Rr,Rr.i0-1,c,true,Lr);
        for(let j=c-1;j<=c+1;j++)for(let q=0;q<3;q++){res[idx(Lr.i1-q,j)]=1;res[idx(Rr.i0+q,j)]=1;}}
      else{const Tr=dy>0?A:B,Br=dy>0?B:A;const ilo=Math.max(Tr.i0,Br.i0),ihi=Math.min(Tr.i1,Br.i1),c=Math.floor((ilo+ihi)/2);
        for(let j=Tr.j1+1;j<Br.j0;j++)for(let i=c-1;i<=c+1;i++)t[idx(i,j)]=T_FLOOR;
        mkDoor(Tr,c,Tr.j1+1,false,Br);mkDoor(Br,c,Br.j0-1,false,Tr);
        for(let i=c-1;i<=c+1;i++)for(let q=0;q<3;q++){res[idx(i,Tr.j1-q)]=1;res[idx(i,Br.j0+q)]=1;}}
    };
    const mkDoor=(R,i,j,horiz,other)=>{const cells=[];for(let q=-1;q<=1;q++){const k=horiz?idx(i,j+q):idx(i+q,j);cells.push(k);t[k]=T_DOOR;}
      const d={room:R.idx,other:other.idx,cells,x:cx(i),z:cx(j),horiz,open:true,locked:R.type==='vault'};doors.push(d);R.doors.push(d);};
    for(let k=0;k<M-1;k++)link(rooms[k],rooms[k+1]);
    for(const R of rooms)if(R.parent!=null)link(rooms[R.parent],R);
  }
  // fill rooms
  for(const R of rooms){for(let i=R.i0;i<=R.i1;i++)for(let j=R.j0;j<=R.j1;j++){const k=idx(i,j);t[k]=T_FLOOR;roomOf[k]=R.idx;}
    R.cx=(cx(R.i0)+cx(R.i1))/2;R.cz=(cx(R.j0)+cx(R.j1))/2;R.w=R.i1-R.i0+1;R.h=R.j1-R.j0+1;
    R.lights=[[cx(R.i0+1),4,cx(R.j0+1)],[cx(R.i1-1),4,cx(R.j0+1)],[cx(R.i0+1),4,cx(R.j1-1)],[cx(R.i1-1),4,cx(R.j1-1)]];if(R.type==='boss'||R.type==='single')R.lights.push([R.cx,7,R.cz]);}
  for(const d of doors)for(const k of d.cells)t[k]=T_DOOR;
  // templates (mirrored across each room's x axis)
  for(const R of rooms){
    const mi=i=>R.i0+R.i1-i;
    const ok=(i,j)=>i>=R.i0&&i<=R.i1&&j>=R.j0&&j<=R.j1&&!res[idx(i,j)]&&t[idx(i,j)]===T_FLOOR&&!(Math.abs(i-(R.i0+R.i1)/2)<1&&R.type==='start'&&Math.abs(j-(R.j0+R.j1)/2)<1);
    const set=(i,j,type,hh=0,dir=null,low=0)=>{for(const[a,dx]of[[i,1],[mi(i),-1]]){if(!ok(a,j)&&!(t[idx(a,j)]===type))continue;const k=idx(a,j);t[k]=type;h[k]=hh;sd[k]=dir?[dir[0]*dx,dir[1]]:null;lo[k]=low;}};
    const ccx=(R.i0+R.i1)/2,ccy=(R.j0+R.j1)/2;
    const inner=(fn)=>{for(let i=R.i0;i<=Math.floor(ccx);i++)for(let j=R.j0;j<=R.j1;j++)fn(i,j,Math.abs(i-ccx),Math.abs(j-ccy));};
    const pick=()=>[R.i0+1+Math.floor(r()*Math.max(1,Math.floor(R.w/2)-2)),R.j0+1+Math.floor(r()*Math.max(1,R.h-2))];
    const cover=(n)=>{for(let q=0,tr=0;q<n&&tr<60;tr++){const[i,j]=pick();if(!ok(i,j)||!ok(i,j+1))continue;set(i,j,T_COVER,1.1);if(r()<.5)set(i,j+1,T_COVER,1.1);q++;}};
    const plat=(n)=>{for(let q=0,tr=0;q<n&&tr<80;tr++){const[i,j]=pick();const hh=[1.2,2.4,2.4][Math.floor(r()*3)];
      if(![[i,j],[i,j+1],[i-1,j],[i-1,j+1]].every(([a,b])=>ok(a,b)))continue;set(i,j,T_PLAT,hh);set(i,j+1,T_PLAT,hh);
      if(hh>1.3&&ok(i-1,j)){set(i-1,j,T_STAIR,hh,[1,0],0);}q++;}};
    let tpl=R.type==='start'?'start':R.type==='boss'?'arena':R.type==='vault'?'vault':R.type==='trial'?'start':R.type==='single'?(L.tpl[Math.floor(r()*L.tpl.length)]):L.tpl[Math.floor(r()*L.tpl.length)];
    R.tpl=tpl;
    if(tpl==='plaza'){inner((i,j,dx,dy)=>{if(dx<=1.5&&dy<=1.5)set(i,j,T_PLAT,2);});inner((i,j,dx,dy)=>{if(dx>1.5&&dx<=2.5&&dy<=.5)set(i,j,T_STAIR,2,[1,0],0);});cover(2);}
    else if(tpl==='pit'){inner((i,j,dx,dy)=>{if(dx<=1.5&&dy<=1.5)set(i,j,T_PLAT,1.1);else if(dx<=3.5&&dy<=3.5&&dx>.5&&dy>.5)set(i,j,T_LAVA);});cover(1);}
    else if(tpl==='tower'){inner((i,j,dx,dy)=>{if(dx<=.5&&dy<=.5)set(i,j,T_PLAT,4.8);});inner((i,j,dx,dy)=>{if(dx>.5&&dx<=1.5&&dy<=.5&&j===Math.floor(ccy)){const k=idx(i,j);if(ok(i,j)){t[k]=T_PAD;sd[k]=[1,0];const m=idx(mi(i),j);if(ok(mi(i),j)){t[m]=T_PAD;sd[m]=[-1,0];}}}});plat(2);}
    else if(tpl==='halls'){const wi=R.i0+3;for(let j=R.j0+2;j<=R.j1-2;j++){if(Math.abs(j-ccy)<1.2)continue;set(wi,j,T_WALL,3.2);}cover(2);}
    else if(tpl==='lavafield'){for(let n=0;n<3;n++){let[i,j]=pick();for(let s=0;s<6;s++){set(i,j,T_LAVA);const d=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(r()*4)];i+=d[0];j+=d[1];}}plat(2);}
    else if(tpl==='ledges'){for(const jj of[R.j0,R.j1])for(let i=R.i0+2;i<=Math.floor(ccx);i++)set(i,jj,T_PLAT,2.4);for(const jj of[R.j0,R.j1])if(ok(R.i0+1,jj))set(R.i0+1,jj,T_STAIR,2.4,[1,0],0);cover(2);}
    else if(tpl==='nave'){for(const fy of[.2,.4,.6,.8]){set(Math.round(R.i0+(R.w-1)*.2),Math.round(R.j0+(R.h-1)*fy),T_PILLAR,9);}cover(2);}
    else if(tpl==='pillars'){for(const[fx,fy]of[[.22,.25],[.22,.75]])set(Math.round(R.i0+(R.w-1)*fx),Math.round(R.j0+(R.h-1)*fy),T_PILLAR,6);cover(3);plat(1);}
    else if(tpl==='arena'){const long=R.h>R.w;const n=long?3:2;for(let q=0;q<n;q++){const fy=(q+.5)/n;set(Math.round(R.i0+(R.w-1)*.24),Math.round(R.j0+(R.h-1)*fy),T_PILLAR,7);}
      if(!long){for(let q=0;q<3;q++)set(Math.round(R.i0+(R.w-1)*.24),Math.round(R.j0+(R.h-1)*(q+.5)/3),T_PILLAR,7);}
      cover(3);for(let n2=0;n2<2;n2++){let[i,j]=pick();for(let s=0;s<4;s++){if(Math.abs(i-ccx)>3)set(i,j,T_LAVA);i+=r()<.5?1:-1;}}plat(2);}
    else if(tpl==='vault'){inner((i,j,dx,dy)=>{if(dx<=.5&&dy<=.5)set(i,j,T_PLAT,.5);});}
    else if(tpl==='start'){cover(2);}
  }
  // connectivity
  const blocked=k=>t[k]===T_WALL||t[k]===T_PILLAR;
  const sr=rooms[0];const spawn={i:Math.floor((sr.i0+sr.i1)/2),j:single?sr.j1-2:Math.floor((sr.j0+sr.j1)/2)};t[idx(spawn.i,spawn.j)]=T_FLOOR;
  for(let pass=0;pass<8;pass++){const seen=new Uint8Array(N*N);const q=[idx(spawn.i,spawn.j)];seen[q[0]]=1;
    while(q.length){const k=q.pop();const i=k%N,j=(k/N)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+dx,b=j+dz;if(a<0||b<0||a>=N||b>=N)continue;const kk=idx(a,b);if(!seen[kk]&&!blocked(kk)){seen[kk]=1;q.push(kk);}}}
    let fixed=false;for(let k=0;k<N*N;k++){if(roomOf[k]>=0&&!blocked(k)&&!seen[k]){const i=k%N,j=(k/N)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=idx(i+dx,j+dz);if(blocked(kk)&&roomOf[kk]>=0){t[kk]=T_FLOOR;h[kk]=0;fixed=true;}}}}
    if(!fixed)break;}
  const pads=[];for(let k=0;k<N*N;k++)if(t[k]===T_PAD)pads.push({i:k%N,j:(k/N)|0,dir:sd[k]});
  return{t,h,sd,lo,pads,spawn,rooms,doors,roomOf,dc,side,single};
}
function navH(k){const t=grid.t[k];if(t===T_PLAT)return grid.h[k];if(t===T_STAIR)return(grid.h[k]+grid.lo[k])/2;if(t===T_COVER)return 1.1;return 0;}
function surfaceAt(x,z){const i=ci(x),j=ci(z),k=idx(i,j),t=grid.t[k];
  if(t===T_PLAT)return grid.h[k];if(t===T_COVER)return 1.1;
  if(t===T_STAIR){const d=grid.sd[k];const u=d[0]!==0?((x-(cx(i)-C/2))/C):((z-(cx(j)-C/2))/C);const p=(d[0]>0||d[1]>0)?u:1-u;const step=Math.min(4,Math.floor(p*5));return grid.lo[k]+(grid.h[k]-grid.lo[k])*(step+1)/5;}
  return 0;}

const doorMat=new THREE.MeshLambertMaterial({color:0xff3a1a,emissive:0x991a00,transparent:true,opacity:.8});
const vaultDoorMat=new THREE.MeshLambertMaterial({color:0xffcf3a,emissive:0x8a6000,transparent:true,opacity:.85});
function buildWorld(L,seedNum,opts){
  opts=opts||{};const single=opts.single||G.state==='menu';
  scene.remove(world);world=new THREE.Group();scene.add(world);solids=[];solidMeshes=[];torches=[];
  grid=genLevel(L,seedNum,single);
  scene.background=new THREE.Color(L.sky);scene.fog=new THREE.Fog(L.fog,16,78);
  renderer.shadowMap.enabled=S.shadows;sun.castShadow=S.shadows;
  hemi.color.set(0xffe0d0);hemi.groundColor.set(L.torch);hemi.intensity=.55;sun.color.set(L.torch).lerp(new THREE.Color(0xffffff),.5);sun.intensity=.75;
  if(typeof gunHemi!=='undefined'){gunHemi.groundColor.set(L.torch);gunKey.color.set(L.torch).lerp(new THREE.Color(0xffffff),.6);}
  {const cv=document.createElement('canvas');cv.width=2;cv.height=128;const g=cv.getContext('2d');const gr=g.createLinearGradient(0,0,0,128);
   gr.addColorStop(0,'#'+new THREE.Color(L.sky).multiplyScalar(.5).getHexString());gr.addColorStop(.62,'#'+new THREE.Color(L.sky).getHexString());gr.addColorStop(.8,'#'+new THREE.Color(L.fog).lerp(new THREE.Color(L.torch),.35).getHexString());gr.addColorStop(1,'#'+new THREE.Color(L.fog).getHexString());
   g.fillStyle=gr;g.fillRect(0,0,2,128);const tx=new THREE.CanvasTexture(cv);
   const dome=new THREE.Mesh(new THREE.SphereGeometry(190,24,12),new THREE.MeshBasicMaterial({map:tx,side:THREE.BackSide,fog:false,depthWrite:false}));world.add(dome);world.userData.dome=dome;}
  const gt=detailTex(L.ground,'floor').clone();gt.needsUpdate=true;gt.repeat.set(N/2,N/2);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(N*C+60,N*C+60),new THREE.MeshLambertMaterial({map:gt}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;world.add(fl);
  const B=L.block,t=grid.t,h=grid.h;
  // outer walls, merged into long boxes
  const need=new Uint8Array(N*N),done=new Uint8Array(N*N);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=idx(i,j);if(t[k]!==T_WALL||h[k]>0)continue;
    for(let a=-1;a<=1&&!need[k];a++)for(let b=-1;b<=1;b++){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N)continue;const kk=idx(ii,jj);if(t[kk]!==T_WALL||h[kk]>0){need[k]=1;break;}}}
  const WH=7.5;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=idx(i,j);if(!need[k]||done[k])continue;
    let w=1;while(i+w<N&&need[idx(i+w,j)]&&!done[idx(i+w,j)])w++;
    if(w>1){for(let q=0;q<w;q++)done[idx(i+q,j)]=1;addBox(cx(i)+(w-1)*C/2,cx(j),w*C,WH,C,B[0],'brick');}
    else{let hh=1;while(j+hh<N&&need[idx(i,j+hh)]&&!done[idx(i,j+hh)])hh++;for(let q=0;q<hh;q++)done[idx(i,j+q)]=1;addBox(cx(i),cx(j)+(hh-1)*C/2,C,WH,hh*C,B[0],'brick');}}
  const lavaMat=mat(L.torch,new THREE.Color(L.torch).multiplyScalar(.85).getHex());
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=idx(i,j),tt=t[k],x=cx(i),z=cx(j);
    if(tt===T_WALL&&h[k]>0)addBox(x,z,C,h[k],C,B[2],'brick');
    else if(tt===T_PILLAR){addBox(x,z,C*.8,h[k],C*.8,B[2],'brick');const cap=new THREE.Mesh(boxGeo,mat(B[1]));cap.scale.set(C*.95,.5,C*.95);cap.position.set(x,h[k]+.25,z);world.add(cap);}
    else if(tt===T_COVER)addBox(x,z,C*.92,1.1,C*.92,B[1],'metal');
    else if(tt===T_PLAT)addBox(x,z,C,h[k],C,B[2],h[k]>3?'brick':'metal');
    else if(tt===T_STAIR){const d=grid.sd[k],lo=grid.lo[k],hi=h[k];for(let s=0;s<5;s++){const top=lo+(hi-lo)*(s+1)/5;const off=(-C/2+C/10+s*C/5);const px=d[0]?x+d[0]*off:x,pz=d[1]?z+d[1]*off:z;addBox(px,pz,d[0]?C/5:C,top,d[1]?C/5:C,B[1],'metal');}}
    else if(tt===T_LAVA){const m=new THREE.Mesh(boxGeo,lavaMat);m.scale.set(C,.06,C);m.position.set(x,.02,z);world.add(m);}
    else if(tt===T_PAD){const p=new THREE.Mesh(new THREE.CylinderGeometry(C*.38,C*.42,.18,10),mat(0x30ff9a,0x10a060));p.position.set(x,.09,z);world.add(p);
      const a=new THREE.Mesh(new THREE.ConeGeometry(.35,.6,4),mat(0x30ff9a,0x30ff9a));a.position.set(x,.6,z);world.add(a);torches.push({f:a,l:null,t:0,pad:true});}
  }
  // doors
  for(const d of grid.doors){const len=3*C;const m=new THREE.Mesh(boxGeo,d.locked?vaultDoorMat:doorMat);m.scale.set(d.horiz?C*.45:len,6.8,d.horiz?len:C*.45);m.position.set(d.x,d.open?-7:3.4,d.z);world.add(m);
    const s={min:new THREE.Vector3(d.x-m.scale.x/2,0,d.z-m.scale.z/2),max:new THREE.Vector3(d.x+m.scale.x/2,6.8,d.z+m.scale.z/2),mesh:m,off:d.open};solids.push(s);solidMeshes.push(m);d.mesh=m;d.solid=s;
    if(d.locked){d.open=false;s.off=false;m.position.y=3.4;for(const k of d.cells)grid.dc[k]=1;}}
  // torches at room corners
  for(const R of grid.rooms){for(const[i,j]of[[R.i0,R.j0],[R.i1,R.j0],[R.i0,R.j1],[R.i1,R.j1]]){const k=idx(i,j);if(t[k]===T_FLOOR&&!grid.doors.some(d=>Math.abs(cx(i)-d.x)<C*2.2&&Math.abs(cx(j)-d.z)<C*2.2))addTorch(cx(i),cx(j),2.2,L.torch,false);}}
  indexSolids();
  for(let i=0;i<20;i++){const hh=rand(16,46);const a=i/20*Math.PI*2;const p=new THREE.Mesh(new THREE.ConeGeometry(rand(4,8),hh,4),mat(B[2],new THREE.Color(L.torch).multiplyScalar(.12).getHex()));p.position.set(Math.cos(a)*(ARENA+30),hh/2,Math.sin(a)*(ARENA+30));world.add(p);}
  const eg=new THREE.BufferGeometry();const pts=[];for(let i=0;i<500;i++)pts.push(rand(-80,80),rand(2,30),rand(-80,80));eg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const em=new THREE.Points(eg,new THREE.PointsMaterial({color:L.torch,size:.15}));world.add(em);world.userData.embers=em;
  lightRoom(grid.rooms[0]);
}
function setDoor(d,open){if(d.open===open)return;d.open=open;d.solid.off=open;for(const k of d.cells)grid.dc[k]=open?0:1;d.anim=open?(d.yOpen??-7):(d.yClosed??3.4);if(!open)tone('sawtooth',90,60,.4,.25);else tone('',600,0,.4,.25,true);}
frameHooks.push(dt=>{if(!grid||!grid.doors)return;for(const d of grid.doors){if(d.anim==null||!d.mesh)continue;d.mesh.position.y+=(d.anim-d.mesh.position.y)*Math.min(1,dt*6);if(Math.abs(d.anim-d.mesh.position.y)<.02){d.mesh.position.y=d.anim;d.anim=null;}}});

/* ---------- PLACEMENT HELPERS ---------- */
function openCells(filter){const out=[];for(let i=1;i<N-1;i++)for(let j=1;j<N-1;j++){const k=idx(i,j);if(filter(grid.t[k],i,j,k))out.push([i,j]);}return out;}
function curRoomObj(){return grid&&grid.rooms&&G.curRoom>=0?grid.rooms[G.curRoom]:null;}
function inRoom(R,i,j,m=0){return i>=R.i0+m&&i<=R.i1-m&&j>=R.j0+m&&j<=R.j1-m;}
function farCells(n,minFromPlayer,minApart,types=[T_FLOOR],R){
  R=R||curRoomObj();
  const c=openCells((tt,i,j)=>types.includes(tt)&&(!R||inRoom(R,i,j,1))).sort(()=>Math.random()-.5);
  for(let md=minFromPlayer;md>=0;md-=4){const out=[];for(const p of c){if(Math.hypot(cx(p[0])-P.pos.x,cx(p[1])-P.pos.z)<md)continue;if(out.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])*C>=minApart))out.push(p);if(out.length>=n)return out;}if(out.length&&md<=0)return out;}
  return c.slice(0,n);
}
function spawnPoint(){
  const R=curRoomObj();
  const c=openCells((tt,i,j)=>(tt===T_FLOOR||tt===T_PLAT)&&(!R||inRoom(R,i,j,1))&&Math.hypot(cx(i)-P.pos.x,cx(j)-P.pos.z)>(R?8:13));
  const p=c[Math.floor(Math.random()*c.length)]||(R?[Math.floor((R.i0+R.i1)/2),R.j0+1]:[13,3]);return[cx(p[0])+rand(-.6,.6),cx(p[1])+rand(-.6,.6)];
}
function placeSecrets(){
  if(!grid.rooms||grid.single)return[];
  const out=[];const used=[];const add=(i,j,y)=>{if(used.some(([a,b])=>Math.hypot(a-i,b-j)<6))return;used.push([i,j]);out.push(new THREE.Vector3(cx(i),y+1,cx(j)));};
  const plats=openCells((tt,i,j,k)=>tt===T_PLAT&&grid.h[k]>=2&&grid.roomOf[k]>0&&grid.rooms[grid.roomOf[k]].type==='main').map(([i,j])=>[i,j,grid.h[idx(i,j)]]).sort((a,b)=>b[2]-a[2]||Math.random()-.5);
  for(const[i,j,hh]of plats){add(i,j,hh);if(out.length>=3)break;}
  const extra=openCells((tt,i,j,k)=>(tt===T_COVER||tt===T_LAVA)&&grid.roomOf[k]>0).sort(()=>Math.random()-.5);
  for(const[i,j]of extra){if(out.length>=3)break;add(i,j,grid.t[idx(i,j)]===T_COVER?1.1:0);}
  for(const R of grid.rooms){if(out.length>=3)break;if(R.type==='main')add(R.i0,R.j1,0);}
  return out.slice(0,3);
}

/* ---------- NAVIGATION (flow field) ---------- */
let navDist=new Float32Array(N*N),navT=0;
function buildNav(){
  const D=navDist;D.fill(1e9);const start=idx(ci(P.pos.x),ci(P.pos.z));D[start]=0;
  const heap=[[0,start]];const push=(d,k)=>{heap.push([d,k]);let n=heap.length-1;while(n>0){const p=(n-1)>>1;if(heap[p][0]<=heap[n][0])break;[heap[p],heap[n]]=[heap[n],heap[p]];n=p;}};
  const pop=()=>{const top=heap[0];const end=heap.pop();if(heap.length){heap[0]=end;let n=0;for(;;){const l=2*n+1,r=l+1;let m=n;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===n)break;[heap[m],heap[n]]=[heap[n],heap[m]];n=m;}}return top;};
  const bl=kk=>{const t=grid.t[kk];return t===T_WALL||t===T_PILLAR||(t===T_DOOR&&grid.dc&&grid.dc[kk]);};
  while(heap.length){const[d,k]=pop();if(d>D[k])continue;const i=k%N,j=(k/N)|0;const hk=navH(k);
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=i+dx,b=j+dz;if(a<1||b<1||a>N-2||b>N-2)continue;const kk=idx(a,b),t=grid.t[kk];
      if(bl(kk))continue;if(dx&&dz&&(bl(idx(i+dx,j))||bl(idx(i,j+dz))))continue;
      if(Math.abs(navH(kk)-hk)>2.7)continue;
      const nd=d+(dx&&dz?1.414:1)*(t===T_LAVA?8:1);if(nd<D[kk]){D[kk]=nd;push(nd,kk);}}}
}
function navDir(e,out){
  const i=ci(e.pos.x),j=ci(e.pos.z),k=idx(i,j);
  const dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z,dist=Math.hypot(dx,dz);
  if(dist<C*1.6||navDist[k]>=1e9)return out.set(dx,0,dz).normalize();
  let best=navDist[k],bi=i,bj=j;
  for(const[ax,az]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=i+ax,b=j+az;if(a<1||b<1||a>N-2||b>N-2)continue;const d=navDist[idx(a,b)];if(d<best){best=d;bi=a;bj=b;}}
  if(bi===i&&bj===j)return out.set(dx,0,dz).normalize();
  return out.set(cx(bi)-e.pos.x,0,cx(bj)-e.pos.z).normalize();
}

/* ---------- HAZARDS ---------- */
function hazardTick(dt){
  const k=idx(ci(P.pos.x),ci(P.pos.z)),t=grid.t[k];
  if(t===T_LAVA&&P.pos.y<.2){P.lavaT=(P.lavaT||0)+dt;if(P.lavaT>.25){P.lavaT=0;hurtPlayer(6,true);P.vel.y=Math.max(P.vel.y,3.5);burst(P.pos.clone().setY(.2),0xff7a00,4,3,.8,.4);}}
  if(t===T_PAD&&P.pos.y<.3&&P.vel.y<=0){const p=grid.pads.find(p=>idx(p.i,p.j)===k);P.vel.y=17.5;if(p){P.vel.x=p.dir[0]*5;P.vel.z=p.dir[1]*5;}P.onGround=false;P.padT=.6;SFX.jump();tone('sine',300,1200,.25,.25);ring(P.pos.clone(),0x30ff9a,3,.4);}
}
