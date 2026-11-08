"use strict";
const $=id=>document.getElementById(id);
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- DATA ---------- */
const WEAPONS=[
 {id:'pistol',name:'SIDEARM',cost:0,dmg:40,rate:.24,mag:12,reload:.9,spread:.006,pellets:1,auto:false,col:0xc9c2b0,kick:.06,sound:'pew',desc:'Reliable semi-auto. Aim for the head.'},
 {id:'shotgun',name:'COMBAT SHOTGUN',cost:120,dmg:24,rate:.8,mag:8,reload:1.6,spread:.06,pellets:10,auto:false,col:0xb07a3a,kick:.18,sound:'boom',desc:'Pump-action. One-shots most demons up close.'},
 {id:'rifle',name:'ASSAULT RIFLE',cost:300,dmg:32,rate:.095,mag:30,reload:1.4,spread:.012,pellets:1,auto:true,col:0x7a8a5a,kick:.045,sound:'pew2',desc:'Full auto. Steady at range.'},
 {id:'sshot',name:'DOUBLE BARREL',cost:550,dmg:30,rate:1.05,mag:2,reload:1.3,spread:.1,pellets:20,auto:false,col:0x8a5a2a,kick:.34,sound:'bigboom',desc:'Two shells, one massive blast. Splatters most demons.'},
 {id:'chain',name:'CHAINGUN',cost:800,dmg:20,rate:.052,mag:150,reload:2.6,spread:.03,pellets:1,auto:true,col:0x9a9a9a,kick:.02,sound:'tik',spin:true,desc:'Spins up, then shreds. Slows you while firing.'},
 {id:'sniper',name:'LONGBOW SNIPER',cost:1000,dmg:300,rate:1.1,mag:5,reload:2,spread:0,pellets:1,auto:false,col:0x4a6a8a,kick:.25,sound:'crack',pierce:true,scope:true,desc:'Right-click to scope. Punches through rows of demons.'},
 {id:'rocket',name:'ROCKET LAUNCHER',cost:1300,dmg:230,rate:.95,mag:4,reload:2,spread:0,pellets:1,auto:false,col:0xc23a1a,kick:.22,proj:true,speed:32,splash:5,sound:'rocket',desc:'Explosive rockets. Keep your distance.'},
 {id:'plasma',name:'PLASMA RIFLE',cost:1700,dmg:38,rate:.075,mag:60,reload:1.8,spread:.01,pellets:1,auto:true,col:0x3ab8ff,kick:.02,proj:true,speed:60,plasma:true,sound:'zap',desc:'Rapid bolts of superheated plasma.'},
 {id:'anni',name:'ANNIHILATOR',cost:2800,dmg:1100,rate:2.4,mag:1,reload:3.2,spread:0,pellets:1,auto:false,col:0x6dff3a,kick:.4,proj:true,speed:16,splash:10,big:true,sound:'anni',desc:'One slow orb. Erases everything around it.'}
];
/* ---------- SAVE ---------- */
const SAVE_KEY='hellbreach-save-v2';
let save={coins:0,owned:['pistol'],stars:{},best:0,unlocked:1};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s)save=Object.assign(save,s);}catch(e){}
function persist(){if(window._wiping)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}

/* ---------- AUDIO (synth) ---------- */
let actx=null,master=null;
function audioInit(){if(actx)return;try{actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=.5*(typeof S!=='undefined'?S.vol:.7);master.connect(actx.destination);}catch(e){}}
function tone(type,f0,f1,dur,vol=.4,noise=false){
  if(!actx)return;const t=actx.currentTime;const g=actx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);g.connect(master);
  if(noise){const len=Math.floor(actx.sampleRate*dur);const b=actx.createBuffer(1,len,actx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=actx.createBufferSource();s.buffer=b;const fl=actx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f0;s.connect(fl);fl.connect(g);s.start(t);return;}
  const o=actx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);o.connect(g);o.start(t);o.stop(t+dur);
}
const SFX={
 pew:()=>{tone('',2500,0,.12,.45,true);tone('square',300,90,.08,.2)},
 pew2:()=>{tone('',2200,0,.09,.4,true);tone('sawtooth',260,80,.07,.15)},
 tik:()=>{tone('',2800,0,.06,.3,true);tone('square',180,90,.04,.1)},
 boom:()=>{tone('',1200,0,.4,.8,true);tone('sine',120,35,.3,.6)},
 bigboom:()=>{tone('',900,0,.6,1,true);tone('sine',90,25,.45,.8)},
 crack:()=>{tone('',4000,0,.25,.9,true);tone('square',600,60,.2,.3)},
 rocket:()=>{tone('sawtooth',160,500,.35,.3);tone('',700,0,.35,.4,true)},
 zap:()=>{tone('sawtooth',900,1600,.06,.12);tone('sine',1800,600,.05,.1)},
 anni:()=>{tone('sawtooth',80,600,.9,.4);tone('sine',60,30,1,.5)},
 explode:()=>{tone('',800,0,.8,1,true);tone('sine',70,25,.7,.8)},
 hit:()=>{tone('',600,0,.05,.2,true)},
 head:()=>{tone('',1400,0,.08,.3,true);tone('triangle',900,1500,.06,.15)},
 hurt:()=>{tone('sawtooth',160,70,.22,.35)},
 coin:()=>{tone('square',660,660,.05,.1);setTimeout(()=>tone('square',990,990,.08,.1),50)},
 reload:()=>{tone('',3000,0,.04,.3,true);setTimeout(()=>tone('',2000,0,.05,.35,true),220)},
 die:()=>{tone('sawtooth',140,40,.45,.3);tone('',400,0,.3,.4,true)},
 gib:()=>{tone('',500,0,.35,.7,true);tone('sine',80,30,.3,.5)},
 growl:()=>{tone('sawtooth',90,60,.5,.12);tone('square',70,50,.4,.06)},
 wave:()=>{[110,110,165,147].forEach((f,i)=>setTimeout(()=>tone('sawtooth',f,f*.98,.25,.25),i*180))},
 boss:()=>{[73,69,55].forEach((f,i)=>setTimeout(()=>{tone('sawtooth',f,f*.8,.7,.4);tone('square',f*2,f,.6,.1)},i*380))},
 enemyShot:()=>{tone('',900,0,.15,.15,true);tone('sine',300,120,.15,.1)},
 jump:()=>{tone('',300,0,.08,.15,true)},
 pin:()=>{tone('square',2400,2400,.04,.1)},
 punch:()=>{tone('',500,0,.12,.6,true);tone('sine',140,50,.12,.5)},
 armor:()=>{tone('square',440,880,.12,.15)}
};

/* ---------- THREE SETUP ---------- */
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false});
renderer.autoClear=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const pixScale=()=>{try{return (typeof S!=='undefined'&&S.pix)||+(JSON.parse(localStorage.getItem('hellbreach-settings'))||{}).pix||1;}catch(e){return 1;}};
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,1,.05,300);
scene.add(camera);
const hemi=new THREE.HemisphereLight(0xffffff,0x445566,.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xff9a7a,.7);sun.position.set(28,50,18);scene.add(sun);scene.add(sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:140});sun.shadow.bias=-.0008;sun.shadow.normalBias=.02;
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,2)/pixScale());renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

function pixelTex(c1,c2,n=8,noise=.08,cracks=false){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');const s=64/n;
  const a=new THREE.Color(c1),b=new THREE.Color(c2);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const c=((x+y)%2?a:b).clone();const k=1+(Math.random()-.5)*noise*2;c.multiplyScalar(k);g.fillStyle='#'+c.getHexString();g.fillRect(x*s,y*s,s,s);}
  if(cracks){g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=2;for(let i=0;i<5;i++){g.beginPath();let x=Math.random()*64,y=Math.random()*64;g.moveTo(x,y);for(let j=0;j<4;j++){x+=rand(-12,12);y+=rand(-12,12);g.lineTo(x,y);}g.stroke();}}
  const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
/* detailed pixel textures: bricks, metal plates, flagstones */
const texCache={};
function detailTex(col,kind){
  const key=col+kind;if(texCache[key])return texCache[key];
  const N=32,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d');const base=new THREE.Color(col);
  const px=(x,y,c,k)=>{const cc=c.clone().multiplyScalar(k);g.fillStyle='#'+cc.getHexString();g.fillRect(x,y,1,1);};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let k=.9+Math.random()*.2;
    if(kind==='brick'){const row=y>>3,off=(row%2)*8,bx=((x+off)%16),by=y%8;const bid=row*7+((x+off)>>4);k*=.85+((bid*9301+49297)%233)/233*.3;
      if(by===0||bx===0)k=.45;else if(by===1||bx===1)k*=1.18;else if(by===7||bx===15)k*=.72;}
    else if(kind==='metal'){const bx=x%16,by=y%16;if(bx===0||by===0)k=.5;else if(bx===1||by===1)k*=1.25;else if(bx===15||by===15)k*=.7;
      if((bx===3||bx===12)&&(by===3||by===12))k=1.5;if(y%5===0&&Math.random()<.4)k*=.92;}
    else{const bx=x%16,by=y%16;const sid=(x>>4)+(y>>4)*3;k*=.88+(sid%3)*.08;if(bx===0||by===0)k=.5;else if(bx===1||by===1)k*=1.12;}
    px(x,y,base,k);}
  if(kind!=='metal'){g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();let x=Math.random()*N|0,y=Math.random()*N|0;g.moveTo(x+.5,y+.5);for(let j=0;j<3;j++){x+=rand(-6,6)|0;y+=rand(-6,6)|0;g.lineTo(x+.5,y+.5);}g.stroke();}}
  if(kind==='floor'&&Math.random()<.7){g.fillStyle='rgba(60,0,0,.35)';g.fillRect(rand(4,20)|0,rand(4,20)|0,rand(3,8)|0,rand(2,6)|0);}
  const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return texCache[key]=t;
}
const skinCache={};
function skinMat(col){if(skinCache[col])return skinCache[col];const cv=document.createElement('canvas');cv.width=cv.height=8;const g=cv.getContext('2d');const c=new THREE.Color(col);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const k=.82+Math.random()*.3-(y===7?.15:0);g.fillStyle='#'+c.clone().multiplyScalar(k).getHexString();g.fillRect(x,y,1,1);}
  const t=new THREE.CanvasTexture(cv);t.magFilter=t.minFilter=THREE.NearestFilter;return skinCache[col]=new THREE.MeshLambertMaterial({map:t,emissive:0});}
const matCache={};
function mat(col,emissive=0){const k=col+'_'+emissive;if(!matCache[k])matCache[k]=new THREE.MeshLambertMaterial({color:col,emissive:emissive});return matCache[k];}
const boxGeo=new THREE.BoxGeometry(1,1,1);

