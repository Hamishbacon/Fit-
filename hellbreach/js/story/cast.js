/* =====================================================================
   CAST — every speaking character: name, role, colour, pixel portrait
   and synthesized "voice" (pitched blips for humans, growls for demons).
   ===================================================================== */
const CAST={
 warden:{name:'WARDEN',role:'Subject Seven · Project LANTERN',col:'#8ee05a',voice:{f:120,w:'square',v:.035}},
 okafor:{name:'OKAFOR',role:'Commander · UNS Long Vigil',col:'#ffae1f',voice:{f:210,w:'triangle',v:.05}},
 vesta:{name:'VESTA',role:'Suit Intelligence',col:'#3ac0ff',voice:{f:640,w:'sine',v:.04}},
 rook:{name:'ROOK',role:'Cpl. Hana Vasquez · Fireteam Ash',col:'#d8c49a',voice:{f:290,w:'triangle',v:.05}},
 reyne:{name:'REYNE',role:'Dr. Tomas Reyne · Helix Dynamics',col:'#c07aff',voice:{f:165,w:'triangle',v:.05}},
 marine:{name:'MARINE',role:'Fireteam Ash',col:'#9ab0c8',voice:{f:240,w:'square',v:.03}},
 survivor:{name:'SURVIVOR',role:'Erebus colonist',col:'#ffcf8a',voice:{f:330,w:'triangle',v:.04}},
 brandt:{name:'BRANDT',role:'Foreman · Deep Mine 4',col:'#ffcf3a',voice:{f:150,w:'triangle',v:.05}},
 log:{name:'AUDIO LOG',role:'Recovered recording',col:'#b59c88',voice:{f:260,w:'triangle',v:.03}},
 demon:{name:'THE HOST',role:'',col:'#ff3a1a',demon:true,voice:{f:70,w:'sawtooth',v:.07}},
 butcher:{name:'THE BUTCHER',role:'Warlord of the Breach',col:'#ff5a3a',demon:true,voice:{f:62,w:'sawtooth',v:.08}},
 tyrant:{name:'FORGE TYRANT',role:'Warlord of the Depths',col:'#ff9a1a',demon:true,voice:{f:55,w:'sawtooth',v:.08}},
 vharos:{name:'VHAROS',role:'The Arch-Warlord',col:'#ff2a2a',demon:true,voice:{f:48,w:'sawtooth',v:.09}},
 knight:{name:'THE PALE KNIGHT',role:'Sword of the Void',col:'#d8d8ff',demon:true,voice:{f:120,w:'sawtooth',v:.06}},
 god:{name:'THE HOLLOW GOD',role:'That Which Waits Beyond',col:'#ffcf3a',demon:true,voice:{f:40,w:'sine',v:.1}}
};

/* 16x16 pixel portraits. Each letter is a palette entry, '.' is background. */
const PORTRAITS={
 warden:{bg:['#1a2414','#0a0e08'],pal:{h:'#3c4a36',H:'#5e7052',v:'#ff8a1a',V:'#ffd27a',k:'#111111',s:'#252c22'},map:[
'................','.....hhhhhh.....','...hhHHHHHHhh...','..hHHHhhhhHHHh..','..hHhhhhhhhhHh..','.hHhkkkkkkkkhHh.','.hHkvvvvvvvvkHh.','.hHkvVVvvvvvkHh.',
'.hhkvvvvvvvvkhh.','.hhkkkkkkkkkkhh.','.shhhhhhhhhhhhs.','..shhHhhhhHhhs..','..sshhhkkhhhss..','...sshhhhhhss...','..HHsssssssssHH.','.HHHHhhhhhhHHHH.']},
 okafor:{bg:['#2a1e08','#120c04'],pal:{b:'#1a1210',S:'#7a4a32',s:'#5a3422',k:'#140c08',w:'#e8e0d0',r:'#4a2018',m:'#6a6a70',u:'#2a3a5a',g:'#ffae1f'},map:[
'................','.....bbbbbb.....','....bbbbbbbb....','...bbSSSSSSbb...','...bSSSSSSSSb...','..mbSkwSSwkSbm..','..mSSSSSSSSSSm..','..mSSSSssSSSSm..',
'...SSSSSSSSSS.m.','...SSSrrrrSSS.m.','....SSSSSSSS..m.','.....ssssss.....','...uuuSSSSuuu...','..uuuuuuuuuuuu..','.uugguuuuuuuuuu.','.uuuuuuuuuuuuuu.']},
 vesta:{bg:['#06182a','#020810'],pal:{c:'#1a6a9a',C:'#3ac0ff',W:'#e8f8ff'},map:[
'................','......cccc......','....cc....cc....','...c..CCCC..c...','..c..C....C..c..','..c.C..WW..C.c..','.c..C.WWWW.C..c.','.c..C.WWWW.C..c.',
'.c..C..WW..C..c.','..c..C....C..c..','..c...CCCC...c..','...c........c...','....cc....cc....','......cccc......','................','................']},
 rook:{bg:['#22200e','#0e0c06'],pal:{h:'#4a5a3a',H:'#6a7a52',v:'#2a3a4a',S:'#b07a58',s:'#8a5a40',k:'#1a1210',r:'#7a3a2a',u:'#3a4a2a'},map:[
'................','....hhhhhhhh....','...hHHHHHHHHh...','..hHhhhhhhhhHh..','..hhvvvvvvvvhh..','..hhSSSSSSSShh..','..hSkkSSSSkkSh..','..hSSSSSSSrSSh..',
'..hSSSSssSSrSh..','..hhSSSSSSSShh..','...hSSrrrrSSh...','...hhSSSSSShh...','....uuSSSSuu....','..uuuuuuuuuuuu..','.uuhuuuuuuuuhuu.','.uuuuuuuuuuuuuu.']},
 reyne:{bg:['#1e0e2a','#0a0410'],pal:{g:'#9a9aa0',S:'#d8b8a0',s:'#b0907a',k:'#222228',w:'#9ad8ff',r:'#8a5a50',W:'#e8e8e8'},map:[
'................','....gggggggg....','...gggggggggg...','..ggSSSSSSSSgg..','..gSSSSSSSSSSg..','..SkkkSSSSkkkS..','..SkwkkkkkkwkS..','..SkkkSSSSkkkS..',
'..SSSSSssSSSSS..','...SSSSSSSSSS...','...SSSrrrrSSS...','....SSSSSSSS....','.....ssssss.....','..WWWWSSSSWWWW..','.WWWWWkWWkWWWWW.','.WWWWWkWWkWWWWW.']},
 marine:{bg:['#141c24','#080c10'],pal:{h:'#4a5a6a',H:'#6a7a8a',v:'#3ab0ff',V:'#9ae0ff',k:'#111111',u:'#3a4a5a'},map:[
'................','....hhhhhhhh....','...hHHHHHHHHh...','..hHhhhhhhhhHh..','..hhkkkkkkkkhh..','..hkvvvvvvvvkh..','..hkvVVvvvvvkh..','..hkvvvvvvvvkh..',
'..hhkkkkkkkkhh..','..hhhhhhhhhhhh..','...hhhHkkHhhh...','...hhhhhhhhhh...','....uuhhhhuu....','..uuuuuuuuuuuu..','.uuHuuuuuuuuHuu.','.uuuuuuuuuuuuuu.']},
 survivor:{bg:['#2a1a08','#100a04'],pal:{y:'#e8b020',Y:'#ffd040',S:'#c89070',s:'#a0705a',k:'#1a1210',r:'#7a3a2a',o:'#d86a1a'},map:[
'................','.....yyyyyy.....','....yYYYYYYy....','...yyyyyyyyyy...','..yyyyyyyyyyyy..','...SSSSSSSSSS...','...SkkSSSSkkS...','...SSSSSSSSSS...',
'...SSSSssSSSS...','...SSSSSSSSSS...','....SSrrrrSS....','....SSSSSSSS....','.....ssssss.....','..oooooooooooo..','.oooooyooyooooo.','.oooooooooooooo.']},
 demon:{bg:['#2a0806','#100202'],pal:{h:'#d8ccb0',S:'#8a2a1a',s:'#5a1a10',e:'#ffcc00',k:'#1a0404',w:'#f0e8d0'},map:[
'.h............h.','.hh..........hh.','..hh........hh..','..hhhSSSSSShhh..','...SSSSSSSSSS...','..SSSSSSSSSSSS..','..SeeeSSSSeeeS..','..SSeSSSSSSeSS..',
'..SSSSSssSSSSS..','..SSSSSSSSSSSS..','..SkwkwkwkwkSS..','..SSkkkkkkkkSS..','...SSwSwSwSSS...','....SSSSSSSS....','..ssssssssssss..','.ssssssssssssss.']},
 god:{bg:['#2a2004','#0a0800'],pal:{t:'#a08a40',w:'#fff0d0',g:'#ffcf3a',k:'#1a0e00'},map:[
'................','...t........t...','....t.wwww.t....','.....wwwwww.....','...wwwwwwwwww...','..wwwwgggggwww..','..wwwggkkgggww..','.wwwggkkkkggwww.',
'.wwwggkkkkggwww.','..wwwggkkgggww..','..wwwwgggggwww..','...wwwwwwwwww...','....tww..wwt....','...t..t..t..t...','..t..t....t..t..','.t..t......t..t.']},
 knight:{bg:['#141428','#06060e'],pal:{h:'#a8a8c0',H:'#e0e0f0',k:'#141420',e:'#a87aff',p:'#3a2a5a'},map:[
'................','......hhhh......','....hhHHHHhh....','...hHHHHHHHHh...','...hHHHHHHHHh...','..hHHkkkkkkHHh..','..hHkeeeeeekHh..','..hHHkkkkkkHHh..',
'..hHHHHkkHHHHh..','...hHHHkkHHHh...','...hhHHkkHHhh...','....hhHHHHhh....','.....hhhhhh.....','..pphhhhhhhhpp..','.pppppppppppppp.','.pppppppppppppp.']}
};
/* Warlords share the demon face with their own colours */
PORTRAITS.butcher=Object.assign({},PORTRAITS.demon,{bg:['#3a0a06','#120202'],pal:Object.assign({},PORTRAITS.demon.pal,{S:'#a05040',s:'#6a2a20',e:'#ff2200'})});
PORTRAITS.tyrant=Object.assign({},PORTRAITS.demon,{bg:['#3a1a04','#120800'],pal:Object.assign({},PORTRAITS.demon.pal,{S:'#4a3a32',s:'#2a201a',e:'#ffff44',h:'#ff7a1a'})});
PORTRAITS.vharos=Object.assign({},PORTRAITS.demon,{bg:['#200000','#080000'],pal:Object.assign({},PORTRAITS.demon.pal,{S:'#6a0a08',s:'#2a0000',e:'#ffffff',h:'#ffcf3a'})});
PORTRAITS.brandt=Object.assign({},PORTRAITS.survivor,{pal:Object.assign({},PORTRAITS.survivor.pal,{S:'#b07a5a',o:'#5a5a5a'})});
PORTRAITS.log=Object.assign({},PORTRAITS.survivor,{bg:['#1a1410','#080604'],pal:{y:'#3a3430',Y:'#5a5048',S:'#4a4038',s:'#3a3028',k:'#1a1410',r:'#2a2018',o:'#2a2420'}});

const _portCache={};
function portraitCanvas(id){
  if(_portCache[id])return _portCache[id];
  const p=PORTRAITS[id]||PORTRAITS.marine;const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,p.bg[0]);gr.addColorStop(1,p.bg[1]);g.fillStyle=gr;g.fillRect(0,0,64,64);
  p.map.forEach((row,y)=>{for(let x=0;x<16;x++){const c=p.pal[row[x]];if(!c)continue;g.fillStyle=c;g.fillRect(x*4,y*4,4,4);}});
  // scanlines for a radio-feed look
  g.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<64;y+=2)g.fillRect(0,y,64,1);
  return _portCache[id]=cv;
}
function drawPortrait(target,id){const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,target.width,target.height);g.drawImage(portraitCanvas(id),0,0,target.width,target.height);}

/* Voice: one blip per word. Demons get a low growl underneath. */
const Voice={
 blip(id){
  if(!actx||!master)return;const c=CAST[id]||CAST.marine;const v=c.voice;const t=actx.currentTime;
  const f=v.f*rand(.85,1.2);const o=actx.createOscillator(),g=actx.createGain();o.type=v.w;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*rand(.7,1.1),t+.07);
  g.gain.setValueAtTime(v.v*(S.vol>0?1:0),t);g.gain.exponentialRampToValueAtTime(.0005,t+.085);o.connect(g);g.connect(master);o.start(t);o.stop(t+.1);
  if(c.demon){const o2=actx.createOscillator(),g2=actx.createGain();o2.type='square';o2.frequency.value=f*.5;g2.gain.setValueAtTime(v.v*.6,t);g2.gain.exponentialRampToValueAtTime(.0005,t+.12);o2.connect(g2);g2.connect(master);o2.start(t);o2.stop(t+.13);}
 },
 radio(){if(actx)tone('',3200,0,.06,.06,true);}
};
