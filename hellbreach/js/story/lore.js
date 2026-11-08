/* =====================================================================
   LORE — more of the world: the Host's demons (unlocked the first time
   you kill one), the factions, and the places between the missions.
   ===================================================================== */
Object.assign(STORY.codex,{
 w_helix:{cat:'THE WORLD',t:'HELIX DYNAMICS',b:'The corporation that owned Erebus, its mines, its people and, on paper, the Breach. Helix\'s board voted to keep drilling after the first breach test. The minutes record no objections.',need:0},
 w_bore:{cat:'THE WORLD',t:'THE KEPLER BORE',b:'Eleven kilometres of shaft, lined with glyphs nobody carved. The drill head is still down there, fused to the rock, humming.',need:1},
 w_coalition:{cat:'THE WORLD',t:'THE COALITION',b:'The union of human colony worlds. It sent one frigate to Erebus because one frigate was in range. It has since sent nothing else, and has stopped answering the Long Vigil\'s requests.',need:2},
 w_vigil:{cat:'THE WORLD',t:'UNS LONG VIGIL',b:'A Coalition patrol frigate, 340 crew. Commander Okafor\'s third ship and, she suspects, her last. Its cold-storage bay was refitted for one passenger: the LANTERN cradle.',need:3},
 w_host:{cat:'THE WORLD',t:'THE HOST',b:'What the demons call themselves. Not an army so much as an ecosystem: everything that lives on the far side of the Breach, and everything it has eaten.',need:4},
 w_glyphs:{cat:'THE WORLD',t:'THE GATE GLYPHS',b:'A script found on every gate and Warlord. Reyne cracked it in eighteen months. It is mostly prayers, and every prayer is about keeping something asleep.',need:6},
 w_heart:{cat:'THE WORLD',t:'THE HEART IN YOUR CHEST',b:'It belonged to something called a Ka-tuun-ri: a lesser jailer. When the Warden is angry, it remembers its oath.',need:9}
});
const DEMON_LORE={husk:'Colonists the Host wore first. They still carry the rifles they died with, and they still aim like people.',swarmling:'Larval Host, hatched by the thousand. Each one is mostly mouth.',
 fiend:'The Host\'s infantry. They throw fire because they enjoy it.',leaper:'Built for ambush, with legs that store energy like springs. They are patient until they are not.',gnasher:'A beast of burden that the Host stopped bothering to tame.',
 spitter:'Its acid is digestive. It is pre-chewing you.',bloater:'A walking reservoir of gas. Other demons give it a wide berth, and so should you.',marksman:'A husk that kept its patience. The laser is a courtesy.',
 stalker:'Bends light around itself. VESTA can see the edges; you can see the shimmer.',wraith:'A floating skull of the Host\'s old dead, still angry.',revenant:'Skeletal soldiers bolted to rocket racks. Necrarch work.',
 shielder:'Carries a ward stripped from a jailer\'s gate. It cannot turn quickly.',necromancer:'Priest of the Necrarch. It does not raise the dead for loyalty. It raises them for spite.',summoner:'Opens small gates with its hands. Kill it before it finishes the sentence.',
 juggernaut:'Armoured siege beast. Its back is open because nothing has ever been behind it.',brute:'The Host\'s heavy infantry: slow, huge and sure of itself.'};
for(const[k,b]of Object.entries(DEMON_LORE))STORY.codex['e_'+k]={cat:'BESTIARY',t:ENEMY[k].name.toUpperCase(),b,kill:k};
/* unlock rules */
frameHooks.push(dt=>{G._loreT=(G._loreT||0)-dt;if(G._loreT>0)return;G._loreT=2;
  for(const[k,v]of Object.entries(STORY.codex)){if(save.story.codex[k])continue;if(v.kill&&st('t_'+v.kill)>0)Codex.unlock(k);else if(v.need!=null&&save.story.done[v.need])Codex.unlock(k);}});
/* codex tab knows the new categories */
const _cxR=Codex.render.bind(Codex);
Codex.render=function(P_,sub){_cxR(P_,sub);if((sub||Codex.sub)!=='lore')return;const C=STORY.codex;
  for(const cat of['THE WORLD','BESTIARY']){const sec=document.createElement('section');sec.className='ep';sec.innerHTML='<div class="ephead"><span>CODEX</span><h2>'+cat+'</h2></div><div class="cxg">'+Object.entries(C).filter(([k,v])=>v.cat===cat).map(([k,v])=>save.story.codex[k]?
    '<div class="cx"><b>'+v.t+'</b><p>'+v.b+'</p></div>':'<div class="cx locked"><b>???</b><p>'+(v.kill?'Kill one to learn more.':'Keep playing the story.')+'</p></div>').join('')+'</div>';P_.appendChild(sec);}};
