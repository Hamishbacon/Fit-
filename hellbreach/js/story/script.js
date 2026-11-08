/* =====================================================================
   STORY — the campaign script.
   The overarching objective: feed the LANTERN four Warlord hearts and
   burn the Breach shut. Every mission has a briefing, unique room
   objectives, radio dialogue, a boss with something to say, and a debrief.
   Room kinds: p purge · g gates · s survive · e elites (original) plus
   rescue · escort · activate · defend · holdout · capture · carry ·
   assassinate · purify · darkness · gauntlet (see systems/missions.js).
   ===================================================================== */
const STORY={};

STORY.episodes=[
 {name:'EPISODE I',title:'THE BREACH',desc:'A Warden drops onto a dying moon. Find the survivors. Kill the first Warlord.'},
 {name:'EPISODE II',title:'INFERNO DEPTHS',desc:'Down through the forges to find the man who built the door, and the weapon.'},
 {name:'EPISODE III',title:'THRONE OF ASH',desc:'The Ninth Gate. The Arch-Warlord. The truth about the lock.'},
 {name:'EPISODE IV',title:'VOID ETERNAL',desc:'Something older is awake. Somebody has to hold the door.'}
];

STORY.prologue=[
 {kick:'EREBUS SYSTEM · 2291',text:'Erebus is a mining moon at the edge of Coalition space. Thirty thousand people lived here. Most of them worked for Helix Dynamics.'},
 {kick:'THE KEPLER BORE',text:'Helix drove the Kepler Bore eleven kilometres into the crust, chasing an energy signature no instrument could explain.'},
 {kick:'DAY ONE · 0212',text:'The drill broke through. Something on the other side had been waiting a very long time.'},
 {kick:'DAY THREE',text:'Forty-one hours later the colony was gone. The Coalition calls it the Breach. The survivors call it Hellbreach. The things that came through call themselves the Host.'},
 {kick:'UNS LONG VIGIL · HIGH ORBIT',text:'One frigate answered the distress call. In its cold-storage bay it carries the only weapon the Host has never seen.'},
 {kick:'PROJECT LANTERN',text:'A soldier rebuilt around a stolen demon heart. Callsign: Warden. Designation: Subject Seven.',lines:[['okafor','Warden. Wake up. You drop in ninety seconds.'],['vesta','Suit online. Heart rhythm irregular. That is expected. Welcome back.']]}
];

/* Lines spoken by each boss. Keyed by BOSSES key. */
STORY.bossLines={
 ravager:{intro:'THE LITTLE LIGHT CRAWLS DOWN TO US. GOOD. WE ARE HUNGRY.',low:'MORE... SEND MORE OF YOU...',death:'THE OTHERS... WILL TASTE YOU...',hint:[['vesta','It charges in straight lines. Bait it into a wall and it stuns itself.']]},
 hound:{intro:'I SMELL NO FEAR ON YOU, LITTLE LIGHT. HOW DISAPPOINTING.',low:'THE PACK... THE PACK REMEMBERS...',death:'*a long, broken howl*',hint:[['rook','Big dog! Sidestep the charge and dump into its side!']]},
 maw:{intro:'YOU BROKE MY FIRES? I WILL LIGHT NEW ONES. INSIDE YOU.',low:'THE FURNACE... GROWS COLD...',death:'ASH... TO ASH...',hint:[['vesta','Fire pillars track your last position. Keep moving and they will miss.']]},
 brood:{intro:'MY CHILDREN ARE HUNGRY, AND YOU ARE SO VERY WARM.',low:'HATCH, MY DARLINGS! HATCH!',death:'MY... BROOD...',hint:[['vesta','The eggs hatch swarmlings. Grenades clear them fast.']]},
 butcher:{intro:'A WARDEN! I SAVED A HOOK JUST FOR YOU, TIN MAN.',p2:'HAHA! COME CLOSER! LET ME HUG YOU!',p3:'MEAT! I NEED MORE MEAT!',low:'NOT YET! I AM NOT FULL YET!',death:'THE LOCK... HEHEHE... YOU DO NOT EVEN KNOW... ABOUT THE LOCK...',
   hint:[['vesta','The hook pulls you in. Dash sideways when you hear the chain.'],['okafor','Hit it in the head. Enough damage there will break its guard.']],hint3:[['vesta','It is eating corpses to heal. Splatter the bodies, or break its guard and stop it.']]},
 deacon:{intro:'KNEEL, LITTLE LIGHT. THE SERMON BEGINS.',low:'THE CHOIR... FALLS SILENT...',death:'AMEN...',hint:[['vesta','Its homing shots turn slowly. Break line of sight behind a pillar.']]},
 marrow:{intro:'I HAVE BUILT BRIDGES FROM A THOUSAND WORLDS\' BONES. YOURS WILL SPAN A SMALL GAP.',low:'CRACKING... I AM CRACKING...',death:'DUST...',hint:[['rook','It drops meteors where you\'re standing. Don\'t stand still!']]},
 hydra:{intro:'THREE MOUTHS. THREE HUNGERS. ONE LITTLE LIGHT.',low:'WE GROW BACK. WE ALWAYS GROW BACK.',death:'*the heads scream as one, then stop*',hint:[['vesta','The body is shielded while the heads live. Kill the heads, then hit the core while it is stunned.']]},
 golem:{intro:'THE TRANSLATOR STAYS. THE LIGHT GOES OUT.',low:'MY SLAG... COOLS...',death:'STONE... SLEEPS...',hint:[['reyne','The golem is slow! Stay at range and keep moving. Please!']]},
 tyrant:{intro:'EVERY GATE YOU HAVE SEEN, I HAMMERED FROM A WORLD LIKE YOURS.',p2:'THE FORGE RISES! DROWN IN IT!',p3:'I AM THE ANVIL, AND YOU ARE THE IRON!',low:'THE FIRE... IS GOING OUT...',death:'FOOLS... WITHOUT US... WHO HOLDS... THE DOOR?',
   hint:[['vesta','Destroy the ward crystals when its shield goes up.']],hint2:[['vesta','Magma surge! Get on a platform or cover. Anything above the floor.']]},
 widow:{intro:'COLD, ISN\'T IT? LET ME WRAP YOU UP SNUG.',low:'THE WEB... TEARS...',death:'SO... COLD...',hint:[['vesta','Its webs slow you. Dash out of them and keep your distance.']]},
 hollow:{intro:'WE SEE YOU. WE HAVE ALWAYS SEEN YOU. WE WATCHED THEM CARVE YOU, LITTLE LIGHT.',low:'THE EYE... CLOSES...',death:'WE... STILL... SEE...',hint:[['vesta','It is only vulnerable while its eye is open. Watch for the lids.']]},
 gatekeeper:{intro:'NONE PASS THE NINTH. NONE HAVE EVER PASSED THE NINTH.',low:'THE GATE... MUST HOLD...',death:'THEN... YOU... PASS...',hint:[['vesta','Its beam sweeps slowly. Stay behind a pillar and flank it.']]},
 necrarch:{intro:'DEATH IS A DOOR, AND I KEEP THE KEY.',low:'RISE! ALL OF YOU, RISE!',death:'THE DOOR... OPENS... FOR ME...',hint:[['vesta','It raises necromancers. Kill them first or the dead keep coming.']]},
 arch:{intro:'SO. THEY SENT THEIR LITTLE LIGHT TO SNUFF OUT THE LAST CANDLE.',p2:'YOU ARE A CHILD PLAYING WITH A LOCK YOU DO NOT UNDERSTAND.',p3:'THEN BURN WITH ME, AND SEE WHAT YOU HAVE FREED.',low:'STOP. LISTEN TO ME. YOU MUST STOP.',death:'FOOL... WE WERE NOT THE INVADERS... WE WERE THE LOCK. AND YOU... HAVE OPENED... THE DOOR.',
   hint:[['vesta','Vharos summons echoes of itself. They die fast. It does not.']],hint2:[['vesta','The throne room is burning. Watch the floor.']]},
 themaw:{intro:'THE GARDEN FEEDS. THE GARDEN GROWS. THE GARDEN IS NEVER FULL.',low:'WITHERING...',death:'*the garden exhales*',hint:[['vesta','Kill the heads to open the body. Same as the hydra, but angrier.']]},
 argus:{intro:'A HUNDRED EYES, AND EVERY ONE HAS WATCHED YOU DIE. THIS IS ONLY THE FIRST TIME YOU WILL NOTICE.',low:'BLIND... WE GO BLIND...',death:'DARK... AT LAST...',hint:[['vesta','Laser spokes. Jump them. Hit the eye when it opens.']]},
 empress:{intro:'YOUR MOTHER-SHIP FELL INTO MY NEST. HOW KIND OF YOU TO DELIVER IT.',low:'MY HIVE! MY HIVE WEEPS!',death:'THE QUEEN... IS... DEAD...',hint:[['okafor','Keep it off balance, Warden. Headshots. Break it.']]},
 knight:{voice:'knight',intro:'Seven. I made you. Did you know that? I am sorry. I am so sorry. Please. Just lie down.',p2:'She was never there. It wore her voice. It wore her VOICE.',low:'It promised me. It promised.',
   death:'The Lantern needs a living heart to burn. Not three. Four. I built you to be the fourth. Forgive me, Seven.',hint:[['vesta','His blade lunges in a straight line. Dash through it.']]},
 god:{voice:'god',intro:'WE REMEMBER THE JAILERS. WE REMEMBER THE LOCK. WE REMEMBER EVERY WORLD. NOW WE WILL REMEMBER YOURS.',p2:'THE LITTLE LIGHT BURNS SO BRIGHTLY. IT WILL GUTTER.',p3:'WHY DO YOU STAND? NOTHING STANDS. NOTHING HAS EVER STOOD.',low:'WHAT ARE YOU?',death:'WARDEN...',
   hint:[['vesta','When it opens its eye wide, break line of sight. Do not let it look at you.']],hint2:[['vesta','Ward crystals again. Destroy them.']]}
};

/* Generic chatter */
STORY.chatter={
 survivorFree:['Thank god. Thank god!','I thought nobody was coming.','Go, go, they\'re coming back!','You\'re one of the Wardens? I heard the rumours.','My family... have you seen the shelter on C-deck?','I can run. I can run!'],
 survivorSafe:['Survivor at the evac point.','Another one out.','Evac confirms pickup.'],
 marineContact:['Contact!','Hostiles, multiple!','Here they come!','Eyes up, Ash!','Weapons free!'],
 marineKill:['Got one!','Scratch one.','That\'s a kill.','Down it goes!','Ha! Stay down.'],
 marineDown:['I\'m hit! I\'m hit!','Man down!','Need a hand here!','Can\'t... get up...'],
 marineRevive:['Thanks, Warden. Owe you one.','Back in it!','Not today, demon.'],
 marineBoss:['What the hell is THAT?!','Big one! Big one!','Ash, focus fire on the giant!','Oh, I hate that.'],
 vestaLow:['Vitals critical. Retreat and recover.','Warden, you are dying. I would prefer you didn\'t.','Find health. Finish something. Now.'],
 okaforRoom:['Room clear. Keep moving.','Good. Next.','That\'s the way. Push on.','Overwatch confirms. Area secure.']
};

/* Missions, index-aligned with LEVELS. */
STORY.missions=[
 {code:'M01',name:'FIRST LIGHT',loc:'Kepler Ridge Outpost',time:'0347 · DAY 3 OF THE BREACH',rooms:5,
  brief:[['okafor','Fireteam Ash went down at Kepler Ridge six hours ago. Their beacon is still pinging, which means somebody is still alive to press it.'],['okafor','Find them. Then restart the outpost relay so I can see what we are fighting.'],['vesta','I will walk you through the suit. Try not to break it on day one.']],
  obj:['Rescue Fireteam Ash','Purge the motor pool','Restart the outpost relay','Kill the champion'],
  intro:[['okafor','Overwatch to Warden. You\'re on the ground. Ash is somewhere in the barracks ahead. Move.'],['vesta','Doors seal behind you until a room is clear. Your health comes back by killing. That is how the heart works.']],
  spec:[{k:'rescue',n:3,recruit:true,say:{start:[['rook','Is that... Overwatch sent a WARDEN? Get these cages open before they finish their snack!']],done:[['rook','Fireteam Ash, on the Warden. Weapons free.'],['rook','Name\'s Vasquez. Everyone calls me Rook. Don\'t ask.']]}},
   {k:'p',say:{start:[['rook','Contacts! Lots of \'em!']],done:[['okafor','Good. The relay is through the next hall.']]}},
   {k:'activate',n:2,style:'terminal',say:{start:[['vesta','Relay consoles located. Stand at each one while I bypass the lockout.']],done:[['okafor','Relay is up. I can see the valley now.'],['okafor','Warden... it is worse than we thought.']]}}],
  outro:[['okafor','The relay is feeding us everything. There are four signatures down there big enough to bend gravity.'],['vesta','The Coalition is calling them Warlords. Each one anchors part of the Breach.'],['okafor','Then we pull the anchors. Reyne\'s LANTERN can burn the Breach shut, if we feed it their hearts.'],['rook','Hearts. Plural. Great. I love a scavenger hunt.']],
  codex:['c_warden','c_okafor','c_vesta','c_rook','l_erebus','x_lantern'],
  log:['survivor','Shift log, Kepler Ridge. The ground has been humming for a week. Helix says it\'s the Bore. The dogs won\'t stop barking at the floor.']},

 {code:'M02',name:'THE LONG CRAWL',loc:'The Blood Quarry',time:'0920 · DAY 3',rooms:5,allies:{n:2,rook:true},
  brief:[['okafor','Two hundred colonists are sheltering in a mining crawler at the bottom of the Blood Quarry. Its engine is dead and the Host is closing in.'],['vesta','I can slave the crawler\'s drive to your suit. It moves when you are close. Keep it alive and get it to the freight lift.']],
  obj:['Clear the quarry floor','Escort Crawler Nine to the lift','Destroy the hell gates','Kill the champion'],
  intro:[['rook','Crawler Nine, this is Fireteam Ash. Hang tight, we\'re bringing a Warden.'],['survivor','Please hurry. They\'re scratching at the hull.']],
  spec:[{k:'p'},{k:'escort',npc:'crawler',say:{start:[['vesta','Crawler drive slaved. It advances only while you are within twelve metres.']],done:[['survivor','We\'re on the lift! God bless you, Warden. God bless every one of you.']]}},
   {k:'g',say:{start:[['rook','Those portals keep puking demons. Shut \'em!']]}}],
  outro:[['okafor','Crawler Nine is topside. Two hundred and six people, Warden.'],['rook','Hey. That\'s the first good news this moon\'s had in three days.'],['okafor','Don\'t get comfortable. The Furnace Works is running again, and the Host is using it to forge something.']],
  codex:['l_quarry'],log:['survivor','Crawler Nine, day two. Water for four days. Air for three. The children have stopped asking when we\'re leaving.']},

 {code:'M03',name:'COOLANT',loc:'Furnace Works',time:'1405 · DAY 3',rooms:5,
  brief:[['okafor','Helix\'s smelting plant is running at full capacity. Nobody human is running it.'],['okafor','Vent the coolant valves, crash the smelters, then take the service lift into the depths.'],['okafor','Ash stays topside with the survivors. You are alone for this one.']],
  obj:['Open the three coolant valves','Survive the meltdown','Hold the lift controls','Kill the champion'],
  intro:[['vesta','Ambient temperature four hundred degrees. Your suit is rated for five. Let\'s not test the margin.']],
  spec:[{k:'activate',n:3,style:'valve',say:{start:[['vesta','Three valves. Stand at each until the wheel turns.']],done:[['vesta','Coolant venting. The smelters will crack in thirty seconds. They know what you did.']]}},
   {k:'s',say:{start:[['okafor','The whole plant is going critical. Hold on!']]}},
   {k:'defend',obj:'console',t:40,say:{start:[['vesta','Lift called. It needs forty seconds and that console intact.']],done:[['vesta','Lift is here. Going down.']]}}],
  outro:[['vesta','Warden, I have found something in the forge logs. Helix kept working after the Breach. Someone stayed down here on purpose.'],['okafor','Who?'],['vesta','The access codes belong to Dr. Tomas Reyne.'],['okafor','The man who built LANTERN. Find him, Warden. Alive, if you can.']],
  codex:['c_reyne','l_furnace'],log:['reyne','Personal log. The forge is running without us. I fed it the glyph sequence and it simply... started. I should be afraid. I mostly feel close to her.']},

 {code:'M04',name:'BLACKOUT',loc:'The Deep Mines',time:'2210 · DAY 3',rooms:5,env:{dark:true},
  brief:[['okafor','The deep mines lost power on day one. Our scans show heat signatures in the lower galleries. Miners. Maybe forty.'],['okafor','There is also a nest. Something big is breeding down there.'],['vesta','Bring your flashlight. I have already turned it on.']],
  obj:['Free the caged miners','Survive the blackout','Kill the elites','Kill the Brood Mother'],
  intro:[['vesta','No light, no signal past fifty metres. Flashlight engaged.'],['brandt','Is someone there? This is Foreman Brandt. We\'re in the cages. They keep us... for the eggs.']],
  spec:[{k:'rescue',n:4,say:{start:[['vesta','Free the miners. They will run for the lift shaft.']],done:[['brandt','That\'s everyone who\'s left. Thank you. Kill the thing at the bottom. Please.']]}},
   {k:'darkness',say:{start:[['vesta','Power surge. Something cut the lights. Movement all around you.']],done:[['vesta','Lights restored. Mostly.']]}},
   {k:'e'}],
  outro:[['okafor','Forty-one miners, Warden.'],['brandt','I saw Reyne down in the Bore three weeks before the Breach. Alone. He was talking to the rock.'],['vesta','Not to the rock. Through it.'],['okafor','The Butcher\'s Pit is next. The first Warlord. Ash is coming back to you for this one.']],
  codex:['c_brandt','l_mines','h_brood'],log:['brandt','Foreman Brandt. Day four in the cages. The spider comes at the shift change, like it\'s been reading our rosters. We sing so the young ones can\'t hear it.']},

 {code:'M05',name:'THE BUTCHER\'S BILL',loc:'The Butcher\'s Pit',time:'0600 · DAY 4',rooms:5,allies:{n:2,rook:true},heart:true,
  brief:[['okafor','The Butcher holds the Pit. It is the first of the four anchors and the closest thing the Host has to a quartermaster.'],['okafor','Every colonist it takes ends up on its hooks. We end that today.'],['okafor','Bring me its heart.']],
  obj:['Run the hook gauntlet','Purge the slaughter floor','Kill the Butcher\'s Hookmen','Slay the Warlord'],
  intro:[['rook','Ash is on you, Warden. For the record, I could smell this place from orbit.'],['vesta','Cardiac reading spiking. Yours, not hers. The heart in your chest knows what is ahead.']],
  spec:[{k:'gauntlet',say:{start:[['vesta','The ceiling hooks are dropping. Don\'t stand still. Reach the far gate.']],done:[['rook','Everyone breathing? Good. Keep it that way.']]}},
   {k:'p'},
   {k:'assassinate',n:2,names:['GORRA THE FLAYER','MAKK HOOK-HAND'],say:{start:[['okafor','Two of the Butcher\'s lieutenants are on that floor. Take them both.']]}}],
  outro:[['vesta','Warlord heart secured. LANTERN accepted it. One of four.'],['rook','So that\'s what one of those looks like inside. I need a very long shower.'],['okafor','Its last words. "The lock." VESTA?'],['vesta','Unknown. Logged.'],['okafor','Then we keep going. Down into the Inferno Depths. Reyne is down there somewhere.']],
  codex:['h_butcher','x_hearts'],log:['survivor','If anyone finds this: the big one counts us. Every morning it counts us. Yesterday it counted to nine. Today it only got to six.'],
  interlude:{kick:'END OF EPISODE I · THE BREACH',text:'The first anchor falls. On the Long Vigil, Commander Okafor reads Reyne\'s personnel file for the ninth time. One line keeps her awake. Next of kin: Mira Reyne, age nine. Status: missing in the Bore.'}},

 {code:'M06',name:'CHOIR',loc:'The Bone Cathedral',time:'1130 · DAY 4',rooms:5,allies:{n:2,rook:true},
  brief:[['okafor','There is a structure in the depths that was not there a week ago. "Cathedral" is the best word we have for it.'],['okafor','Reyne\'s transponder pinged from inside it twice in the last hour. Plant the uplink in the nave and hold it while I triangulate.']],
  obj:['Destroy the bone altars','Hold the uplink','Kill the elites','Kill the Deacon'],
  intro:[['demon','Do you hear the choir, Warden? Every voice in it was once a colonist.'],['rook','Okay. I hate this one.']],
  spec:[{k:'purify',n:3,nest:'altar',say:{start:[['vesta','The altars feed a corruption field. Destroy them before it saturates your suit.']],done:[['vesta','Field collapsing. Breathe.']]}},
   {k:'defend',obj:'uplink',t:45,say:{start:[['okafor','Uplink is down and transmitting. Keep the Host off it for forty-five seconds.']],done:[['okafor','Got him. Reyne is in the Crucible.'],['okafor','And Warden... he is broadcasting. On a frequency we never gave him.']]}},
   {k:'e'}],
  outro:[['vesta','I have decoded part of Reyne\'s broadcast. It is one word, repeated.'],['okafor','What word?'],['vesta','"Mira."'],['rook','His kid. The file said his kid was lost in the Bore.'],['okafor','Keep moving.']],
  codex:['l_cathedral'],log:['log','Helix Security, Bore Level 9. Dr. Reyne requested a cot be moved to the drill head. When asked why, he said he wanted to be there when she answered.']},

 {code:'M07',name:'SUBJECT SEVEN',loc:'Ossuary Bridges',time:'1700 · DAY 4',rooms:5,allies:{n:2,rook:true},
  brief:[['okafor','The bone bridges span a chasm two kilometres deep. Helix had a research post on the far side.'],['okafor','There is a data core in there with Reyne\'s research. Nothing transmits out of that chasm, so it has to be carried by hand.'],['rook','And then we hold the bridge anchors so Ash can cross. Easy.']],
  obj:['Destroy the hell gates','Carry the data core to the relay','Secure the bridge anchors','Kill the Marrow King'],
  spec:[{k:'g'},{k:'carry',item:'core',say:{start:[['vesta','The core is heavy. You will be slow, and a hard hit will make you drop it.']],done:[['vesta','Core uploaded. Reading.'],['vesta','Warden. Reyne did not just build LANTERN. He built you.']]}},
   {k:'capture',n:2,say:{start:[['rook','Hold those anchor points and Ash crosses behind you.']]}}],
  outro:[['okafor','Project LANTERN. Subject Seven. I signed off on it without reading past the summary.'],['vesta','The heart in your chest was taken from a demon Helix captured in a breach test. Two years ago.'],['rook','Two YEARS? They opened this thing before?'],['okafor','Briefly. And they kept a piece. Warden... I am sorry.'],['warden','Doesn\'t matter. It works.']],
  codex:['x_seven'],log:['reyne','LANTERN, entry 112. Subject Seven survived integration. The heart accepted the host. Or the host accepted the heart. I am no longer sure which of them is in charge.']},

 {code:'M08',name:'ERUPTION',loc:'Magma Foundry',time:'0210 · DAY 5',rooms:5,env:{meteors:true},escape:{t:80},
  brief:[['okafor','The Host is pumping magma up through the foundry to melt a path to the surface. If it reaches the shelters, everyone we saved dies.'],['okafor','Plant charges on the three pump pylons and blow them. Then get out. The foundry will not survive it.']],
  obj:['Purge the foundry floor','Plant charges on the pylons','Survive the backlash','Kill the Slag Hydra','Escape before the eruption'],
  intro:[['vesta','The ceiling is shedding molten slag. Watch for the red circles.']],
  spec:[{k:'p'},{k:'activate',n:3,style:'charge',boom:true,say:{start:[['vesta','Charges ready. Hold position at each pylon to plant.']],done:[['vesta','Charges armed. Three. Two...']]}},
   {k:'s',say:{start:[['okafor','The whole level is shaking apart. Hold on!']]}}],
  escapeSay:[['okafor','The chamber is coming down! Get back to the entry lift! Move, Warden. MOVE!']],
  outro:[['rook','Remind me never to let you plan a demolition.'],['okafor','Pumps are down. Magma is receding. Good work.'],['vesta','Reyne\'s transponder is active again. The Crucible. He is alive, and he is not moving.']],
  codex:['l_foundry','h_hydra'],log:['survivor','Pump tech Okonjo. They made us run the pumps. Then they didn\'t need us to. I\'m hiding in the coolant duct. It\'s getting warmer.']},

 {code:'M09',name:'THE TRANSLATOR',loc:'The Crucible',time:'0900 · DAY 5',rooms:5,
  brief:[['okafor','Reyne is in the Crucible, caged. The Host has been keeping him alive for a reason.'],['okafor','Get him out. Bring him to the forge gate. Then he answers my questions.']],
  obj:['Free Dr. Reyne','Escort Reyne to the forge gate','Kill the elites','Kill the Slag Golem'],
  spec:[{k:'rescue',n:1,vip:'reyne',say:{start:[['vesta','Reyne\'s biosignature is in this room. Caged.']],done:[['reyne','You... you\'re Seven. God. You are actually walking.'],['reyne','They kept me alive to translate the gate glyphs. I am the only one who can read them.']]}},
   {k:'escort',npc:'reyne',say:{start:[['reyne','The forge gate is on the far side. I am not a soldier, Warden. I will stay behind you.']],done:[['reyne','This is it. Let me work.']]}},
   {k:'e'}],
  outro:[['okafor','Doctor Reyne. You have a great deal to answer for.'],['reyne','I know. Helix wanted a power source. I gave them a door. Mira was with me the day we opened it.'],['reyne','She is not dead, Commander. I hear her. Every night, I hear her through the gate.'],['okafor','The Forge Tyrant holds the second anchor. Help us close the Breach, and I will help you find her. If she is there.'],['reyne','Then let us kill a Warlord.']],
  codex:['c_mira','l_crucible'],log:['reyne','They let me keep a photograph. I don\'t think they understand what it is. Or they understand exactly what it is.']},

 {code:'M10',name:'THE ANVIL',loc:'Forge of the Tyrant',time:'1600 · DAY 5',rooms:5,allies:{n:2,rook:true},heart:true,
  brief:[['reyne','The Tyrant\'s forge is sealed by glyph-lock. Give me fifty seconds at the seal and I can open it.'],['okafor','Ash is with you. Keep the doctor breathing.'],['reyne','The Tyrant is bound to the forge itself. Seize the bellows and its armour will soften.']],
  obj:['Protect Reyne while he breaks the seal','Seize the forge bellows','Purge the anvil hall','Slay the Forge Tyrant'],
  spec:[{k:'defend',obj:'reyne',t:50,say:{start:[['reyne','Working. Keep them off me!']],done:[['reyne','The seal is open! Go, go!']]}},
   {k:'capture',n:2,say:{start:[['reyne','The bellows! Stand on the glyph circles until they burn out.']]}},
   {k:'p'}],
  outro:[['vesta','Second heart secured. LANTERN is at half charge.'],['reyne','"Who holds the door." Strange phrasing. In the glyphs the Warlords are called Ka-tuun. I always read it as "conquerors".'],['okafor','And now?'],['reyne','It is an old dialect. Conquerors. Certainly conquerors.'],['rook','He\'s lying.'],['okafor','I know.']],
  codex:['h_tyrant','l_forge'],log:['demon','*glyph-script, machine translated* THE NINE HOLD. THE NINE HAVE ALWAYS HELD. WHAT SLEEPS BELOW THE CROWN MUST NOT HEAR THE KNOCKING.'],
  interlude:{kick:'END OF EPISODE II · INFERNO DEPTHS',text:'Two anchors burned. Deep beneath the forge, Tomas Reyne sits awake beside the Lantern, running his fingers over glyphs he translated correctly years ago. Ka-tuun. Not conquerors. Jailers.'}},

 {code:'M11',name:'WHITE-OUT',loc:'Frozen Abyss',time:'0100 · DAY 6',rooms:5,env:{fog:[5,42]},
  brief:[['okafor','Beyond the forge the Breach opens onto ice. VESTA says it is not our ice. It is not from Erebus.'],['reyne','The Breach touches other worlds. Places the Host has already consumed.'],['okafor','Something spider-shaped is laying in the ice caves. Burn the egg sacs before they hatch an army.']],
  obj:['Burn the egg sacs','Survive the white-out','Kill the elites','Kill the Rime Widow'],
  spec:[{k:'purify',n:3,nest:'egg',say:{start:[['vesta','Egg sacs. The cold slows the hatching. Not by much.']],done:[['vesta','Sacs destroyed.']]}},
   {k:'darkness',say:{start:[['vesta','White-out. Visibility is gone. Stay close to the walls.']]}},{k:'e'}],
  outro:[['vesta','The ice is full of bodies. Not human. Thousands of them, in the same posture, facing the same direction.'],['reyne','They were facing the Hollow Crown. Something there called to them.'],['okafor','Something? Doctor.'],['reyne','I do not know. Truly.']],
  codex:['l_abyss'],log:['log','*unknown language. VESTA partial translation:* ...the jailers sleep... the door must not... we were so many... we were so many...']},

 {code:'M12',name:'LOW ORBIT',loc:'Void Spires',time:'0800 · DAY 6',rooms:5,env:{grav:.55},
  brief:[['reyne','The spires bend gravity around the Breach. Attune all three and Ash can open a stable path to the Ninth Gate.'],['vesta','Expect low gravity. Your jumps will carry. Do not jump off anything you cannot see the bottom of.']],
  obj:['Attune the void spires','Carry the void shard to the lens','Destroy the hell gates','Kill the Hollow'],
  spec:[{k:'capture',n:3,say:{start:[['reyne','Stand inside each spire circle. They attune to the heart in your chest.']]}},
   {k:'carry',item:'shard',say:{start:[['reyne','The shard focuses the lens. Carry it. Gently. It is older than our sun.']]}},{k:'g'}],
  outro:[['okafor','The path to the Ninth Gate is open. Vharos is waiting at the end of it. The Arch-Warlord.'],['rook','Ash is ready. All of us.'],['okafor','Rook, the Gate is a meat grinder.'],['rook','Yes ma\'am. That\'s why you\'re sending us.']],
  codex:['l_spires','h_hollow'],log:['reyne','Mira, if you can hear this. Daddy\'s coming. I\'ve found the way. It just costs a little more than I thought.']},

 {code:'M13',name:'HOLD THE DOOR',loc:'The Ninth Gate',time:'1300 · DAY 6',rooms:5,allies:{n:3,rook:true},
  brief:[['okafor','The Ninth Gate is the throne room\'s front door. Reyne needs sixty seconds at the gate mechanism. The Host will throw everything at you.'],['rook','Fireteam Ash holds the line. Warden walks through. That\'s the plan.'],['okafor','That is the plan.']],
  obj:['Hold the gate with Fireteam Ash','Purge the gatehouse','Kill the Gate Wardens','Kill the Gatekeeper'],
  spec:[{k:'holdout',obj:'gate',t:60,ashStays:true,say:{start:[['rook','Ash, form up on the Warden! Nothing gets past us!']],mid:[['marine','There\'s too many of them!'],['rook','Then we kill too many of them!']],done:[['reyne','It\'s open!'],['rook','Warden, go. Ash stays. Somebody has to hold the door behind you.'],['rook','Don\'t argue. You don\'t talk anyway. Go!']]}},
   {k:'p'},{k:'assassinate',n:2,names:['VHAL OF THE NINE','THE SEVERED'],say:{start:[['vesta','Two gate wardens. Named, armoured, angry.']]}}],
  outro:[['okafor','Ash, report.'],['okafor','Fireteam Ash, report.'],['vesta','Their beacons went dark ninety seconds ago, Commander. All four.'],['okafor','Log it. Corporal Hana Vasquez and Fireteam Ash. Held the Ninth Gate.'],['warden','They held it.']],
  codex:['x_ash','l_gate'],log:['rook','Rook here. If you\'re hearing this, I didn\'t make it back to the dropship, so somebody owes me twenty credits. Tell the Warden... tell them they were good company.']},

 {code:'M14',name:'THE MOURNERS',loc:'Catacombs of Woe',time:'1900 · DAY 6',rooms:5,
  brief:[['reyne','Beneath the throne are the catacombs where the Host keeps its dead. The Necrarch raises them as fast as you can kill them.'],['okafor','Three of its priests anchor the catacomb wards. Kill them and the Necrarch is exposed.']],
  obj:['Kill the Three Mourners','Cleanse the burial wards','Purge the ossuary','Kill the Necrarch'],
  spec:[{k:'assassinate',n:3,names:['THE FIRST MOURNER','THE SECOND MOURNER','THE LAST MOURNER'],say:{start:[['demon','We mourn the jailers. We mourn the lock. We mourn YOU, little light.']]}},
   {k:'purify',n:3,nest:'altar'},{k:'p'}],
  outro:[['reyne','Commander. When this is over I want to go through the Hollow Crown. Alone, if I have to.'],['okafor','Why?'],['reyne','Because that is where she is.']],
  codex:['h_necrarch'],log:['log','*Necrarch prayer, translated* ...and the Nine shall stand at the nine doors, and the Hollow shall sleep, and none shall wake it but by the death of the last...']},

 {code:'M15',name:'THE LAST CANDLE',loc:'Throne of Ash',time:'0300 · DAY 7',rooms:5,heart:true,
  brief:[['okafor','This is it. Vharos, the Arch-Warlord. Kill it, take the third heart, and LANTERN can seal the Breach.'],['reyne','The Lantern will be vulnerable while it calibrates near the throne. Protect it.'],['vesta','Whatever happens in there, Warden, your heart rate is the steadiest thing on this channel.']],
  obj:['Cross the burning causeway','Protect the Lantern while it calibrates','Kill the elites','Slay the Arch-Warlord'],
  spec:[{k:'gauntlet',say:{start:[['vesta','The causeway is under bombardment. Run.']]}},
   {k:'defend',obj:'lantern',t:45,say:{start:[['reyne','Calibrating. The Lantern draws them like moths. Hold!']],done:[['reyne','Calibrated. It is ready for the third heart.']]}},{k:'e'}],
  outro:[['vesta','Third heart secured. And... Commander, a new signature. Below everything. It is waking up.'],['okafor','Reyne. What did Vharos mean? "We were the lock."'],['vesta','Dr. Reyne has left the throne room. He has taken the Lantern. And the hearts.'],['okafor','He knew. He knew the whole time.']],
  codex:['h_vharos','x_lock'],log:['reyne','Forgive me. The Warlords were the lock. The Hollow God is what they locked away. It says it has Mira. It says the hearts will open her cage. I have to know.'],
  interlude:{kick:'END OF EPISODE III · THRONE OF ASH',text:'Vharos is dead. The Warlords were never the invaders. They were the jailers of something older, the thing the glyphs call the Hollow God. With the last jailer gone, it is waking. And the only man who understood the lock has carried the key into the dark to trade for his daughter.'}},

 {code:'M16',name:'ROOTS',loc:'Flesh Gardens',time:'0700 · DAY 7',rooms:5,
  brief:[['okafor','Reyne went through the Flesh Gardens toward the Hollow Crown. The Host is growing something in there, using the Breach itself as soil.'],['vesta','The corruption is denser than anything we have seen. Burn the growths fast.'],['okafor','Find his trail, Warden. Then find him.']],
  obj:['Burn the heart-growths','Purge the garden','Seize the root nodes','Kill the Maw'],
  intro:[['reyne','Commander, if you can hear this, I am sorry. It has her. It offered a trade. The hearts, for Mira.'],['okafor','Tomas, it is lying to you.'],['reyne','Maybe. But I have to know.']],
  spec:[{k:'purify',n:4,nest:'growth',rate:1.5},{k:'p'},{k:'capture',n:2}],
  outro:[['vesta','Reyne\'s trail leads up the Spire of Eyes. He is moving fast. Something is helping him.'],['okafor','Or carrying him.']],
  codex:['l_gardens','h_god'],log:['log','*recording of a child\'s voice, looping* Daddy? Daddy, it\'s dark. Daddy, it\'s so dark here. *VESTA: the waveform is synthetic.*']},

 {code:'M17',name:'BLIND',loc:'Spire of Eyes',time:'1200 · DAY 7',rooms:5,
  brief:[['vesta','Argus watches the whole spire. Everything it sees, the Hollow God sees.'],['okafor','There are old Helix mirror arrays on the spire. Realign them and blind it.']],
  obj:['Realign the mirror arrays','Survive the dark stair','Destroy the hell gates','Kill Argus'],
  spec:[{k:'activate',n:3,style:'mirror',say:{start:[['vesta','Three mirror arrays. Hold position while each one tracks.']],done:[['vesta','Arrays aligned. Argus is half-blind. It is also furious.']]}},
   {k:'darkness'},{k:'g'}],
  outro:[['okafor','Warden. I am bringing the Long Vigil down into the Breach.'],['vesta','Commander, that is...'],['okafor','Suicide, yes. The Host is boarding us anyway. Better to fall where we can help.'],['okafor','We are down. The Kestrel survived. Barely. We are somewhere in the Hive.']],
  codex:['h_argus'],log:['log','Long Vigil, deck four. Boarders in the cold-storage bay. They went straight for the LANTERN cradle. They knew exactly what was kept there.']},

 {code:'M18',name:'KESTREL',loc:'The Weeping Hive',time:'1830 · DAY 7',rooms:5,
  brief:[['okafor','The Long Vigil is wreckage, Warden. My crew is scattered through the Hive. Get them to the Kestrel and hold the landing zone until she can lift.'],['vesta','The Hive Empress is aware of you. It is laying for an army.']],
  obj:['Rescue the Long Vigil crew','Hold the landing zone','Burn the brood clusters','Kill the Hive Empress'],
  spec:[{k:'rescue',n:3,say:{start:[['okafor','Three of my people are pinned in this chamber. Get them to the evac marker.']]}},
   {k:'holdout',obj:'beacon',t:50,dropship:true,say:{start:[['okafor','Kestrel inbound. Hold the landing zone, Warden. Stay inside the ring!']],done:[['okafor','Kestrel is wheels up. Every survivor aboard. Warden... thank you.']]}},
   {k:'purify',n:3,nest:'egg'}],
  outro:[['okafor','VESTA has found Reyne. The Abyssal Citadel. He has... changed.'],['vesta','His biosignature is no longer human, Commander.']],
  codex:['l_hive'],log:['okafor','Personal log. I gave the order to activate Subject Seven. I told myself it was a weapon. It keeps saving my people. Weapons don\'t do that.']},

 {code:'M19',name:'THE PALE KNIGHT',loc:'Abyssal Citadel',time:'0100 · DAY 8',rooms:5,
  brief:[['okafor','The Pale Knight is Tomas Reyne. Whatever the Hollow God promised him, this is what he paid.'],['vesta','The Lantern is in the citadel. Recover it. And Warden... if there is any of him left in that armour, talk to him.'],['vesta','Or don\'t. You rarely do.']],
  obj:['Cross the citadel bridge','Kill the Knight\'s heralds','Recover the Lantern','Defeat the Pale Knight'],
  spec:[{k:'gauntlet'},{k:'assassinate',n:2,names:['THE HERALD OF DUSK','THE HERALD OF ASH'],say:{start:[['knight','Seven. Turn back. Please. These two will not ask as nicely as I am.']]}},
   {k:'carry',item:'lantern',say:{start:[['vesta','The Lantern. It is still warm. Bring it to the citadel gate.']],done:[['vesta','Lantern secured. Three hearts inside. Still burning.']]}}],
  outro:[['okafor','Is that true, VESTA? A fourth heart?'],['vesta','Yes. LANTERN was designed around Subject Seven\'s heart from the beginning.'],['okafor','Then we find another way.'],['warden','No. We don\'t.'],['okafor','Warden...'],['warden','Open a path to the Crown.']],
  codex:['x_fourth'],log:['reyne','If I become something else, Seven, kill it. Then take my notes. Page forty. I wrote the truth there, because I could never say it out loud.']},

 {code:'M20',name:'THE HOLLOW CROWN',loc:'The Hollow Crown',time:'0402 · DAY 9',rooms:5,
  brief:[['vesta','The Hollow Crown. The god\'s prison, and now its throne.'],['okafor','Anchor the Lantern. Hold it while it primes. Burn its roots. Then kill a god.'],['okafor','Warden. Whatever you are about to do... it has been an honour.']],
  obj:['Anchor the Lantern pylons','Hold the Lantern while it primes','Burn the god\'s roots','Kill the Hollow God'],
  intro:[['god','LITTLE LIGHT. YOU CARRY OUR JAILERS\' HEARTS. HOW THOUGHTFUL.']],
  spec:[{k:'capture',n:3,say:{start:[['vesta','Three pylons. Anchor them with the heart.']]}},
   {k:'holdout',obj:'lantern',t:60,say:{start:[['vesta','Lantern priming. Stay in the light, Warden. Stay with it.']],done:[['vesta','Primed. It is ready for the god.']]}},
   {k:'purify',n:3,nest:'growth'}],
  codex:['x_end'],log:['log','*the Lantern hums. Under the hum, very faintly, the voice of a woman named Hana Vasquez: "Go on, Warden. We\'ve got the door."*']}
];

STORY.ending=[
 {kick:'THE HOLLOW CROWN',text:'The Lantern takes three hearts and asks for a fourth.',lines:[['okafor','Warden, the Lantern is at full burn. VESTA, get them out of there.'],['vesta','I can\'t, Commander. It needs a living heart. They\'re holding it closed. From the inside.']]},
 {kick:'',text:'Somebody has to hold the door.',lines:[['warden','Somebody has to hold the door.']]},
 {kick:'DAY 9 · 0402',text:'The Breach closed at 0402 on the ninth day. Erebus has no stars now, only a faint light under the crust that never goes out.'},
 {kick:'AFTER',text:'Two hundred thousand people were evacuated from the Erebus system. The names of Fireteam Ash are carved into the Kepler Ridge relay. Under them, someone carved a number. Seven.'},
 {kick:'',text:'Every night, Commander Okafor opens the same channel.',lines:[['okafor','Overwatch to Warden. Overwatch to Warden. I will keep calling.']]},
 {kick:'THE END',text:'Thank you for playing HELLBREACH.'},
 {kick:'· · ·',text:'',lines:[['warden','Overwatch. This is Warden. Something on the other side is knocking.']]}
];

/* CODEX: unlocked by story progress and intel logs. */
STORY.codex={
 c_warden:{cat:'PEOPLE',t:'WARDEN · SUBJECT SEVEN',b:'The seventh and only surviving subject of Project LANTERN. A Coalition marine rebuilt around a demon heart taken in a breach test two years before the colony fell. Rage, flame and the healing hunger are not equipment. They are the heart. The Warden rarely speaks.'},
 c_okafor:{cat:'PEOPLE',t:'CMDR. INES OKAFOR',b:'Commanding officer of the frigate UNS Long Vigil, callsign Overwatch. Twenty-two years in service. Signed the order to wake Subject Seven, and has regretted not reading the full file ever since.'},
 c_vesta:{cat:'PEOPLE',t:'VESTA',b:'The Warden\'s suit intelligence. Tactical, patient, and drier than Erebus. VESTA monitors the heart in the Warden\'s chest at all times. It has never once described the readings as normal.'},
 c_rook:{cat:'PEOPLE',t:'CPL. HANA "ROOK" VASQUEZ',b:'Leader of Fireteam Ash, the only Coalition ground unit to survive the first week. Funny when it matters, quiet when it matters more. The nickname is from a chess game she has never admitted to losing.'},
 c_reyne:{cat:'PEOPLE',t:'DR. TOMAS REYNE',b:'Helix Dynamics\' chief of xeno-engineering. Designed the Kepler Bore, the LANTERN device and the Warden. The only living human who can read the gate glyphs. He has not slept properly since the day his daughter went down the Bore with him.'},
 c_mira:{cat:'PEOPLE',t:'MIRA REYNE',b:'Age nine. Listed as missing in the Bore on Day One. Her father insists he can hear her through the gate. VESTA has analysed the recordings and stopped volunteering an opinion.'},
 c_brandt:{cat:'PEOPLE',t:'FOREMAN ALEKS BRANDT',b:'Shift foreman, Deep Mine 4. Kept forty miners alive in the Brood Mother\'s cages for five days by organising singing rotas so nobody had to listen to it feeding.'},
 l_erebus:{cat:'PLACES',t:'EREBUS',b:'A tidally locked mining moon of a gas giant at the edge of Coalition space. Rich in heavy metals and, according to Helix, something more valuable that nobody could name.'},
 l_quarry:{cat:'PLACES',t:'THE BLOOD QUARRY',b:'Helix\'s open-cut iron quarry. The red colour used to be oxide.'},
 l_furnace:{cat:'PLACES',t:'FURNACE WORKS',b:'The colony smelter. After the Breach it kept running with nobody at the controls, forging weapons for hands much larger than human ones.'},
 l_mines:{cat:'PLACES',t:'DEEP MINE 4',b:'The deepest gallery on Erebus before the Bore. The Brood Mother nested here because it was warm, dark and full of people.'},
 l_cathedral:{cat:'PLACES',t:'THE BONE CATHEDRAL',b:'Grown, not built, in under a week. Its pillars are colonists. The choir is too.'},
 l_foundry:{cat:'PLACES',t:'MAGMA FOUNDRY',b:'A geothermal plant the Host repurposed into a pump, pushing magma toward the surface shelters. It no longer exists.'},
 l_crucible:{cat:'PLACES',t:'THE CRUCIBLE',b:'A ritual forge where the Host melts down conquered worlds into gates. Reyne was kept here, translating, for six days.'},
 l_forge:{cat:'PLACES',t:'FORGE OF THE TYRANT',b:'The second anchor. The Tyrant was physically bound to its anvil by chains older than the Earth.'},
 l_abyss:{cat:'PLACES',t:'THE FROZEN ABYSS',b:'Ice from a world that is not Erebus. Its frozen inhabitants all face the Hollow Crown.'},
 l_spires:{cat:'PLACES',t:'THE VOID SPIRES',b:'Gravity lenses built by the jailers to keep the space around the Crown stable. Gravity is optional near them.'},
 l_gate:{cat:'PLACES',t:'THE NINTH GATE',b:'The front door to the Throne of Ash. Fireteam Ash held it. Their beacons are still there.'},
 l_gardens:{cat:'PLACES',t:'THE FLESH GARDENS',b:'Where the Breach is used as soil. Whatever grows here is the Hollow God\'s, and it is hungry.'},
 l_hive:{cat:'PLACES',t:'THE WEEPING HIVE',b:'The Hive Empress\'s nest, and the grave of the UNS Long Vigil. The weeping is the walls.'},
 h_brood:{cat:'THE HOST',t:'BROOD MOTHER',b:'A champion that breeds swarmlings in living hosts. It does not hate humans. It simply finds them very useful.'},
 h_butcher:{cat:'THE HOST',t:'THE BUTCHER',b:'First of the Warlords and quartermaster of the Host. It counts its prisoners every morning. It never counted the right way.'},
 h_hydra:{cat:'THE HOST',t:'SLAG HYDRA',b:'Three heads, one shielded body. The heads regrow. The body does not.'},
 h_tyrant:{cat:'THE HOST',t:'THE FORGE TYRANT',b:'Second of the Warlords. It forged the gates between worlds, and asked with its dying breath who would hold the door.'},
 h_hollow:{cat:'THE HOST',t:'THE HOLLOW',b:'An eye of the Hollow God, sent ahead. What it sees, the god sees.'},
 h_necrarch:{cat:'THE HOST',t:'THE NECRARCH',b:'Keeper of the Host\'s dead, and its only historian. Its prayers describe the jailers in detail.'},
 h_vharos:{cat:'THE HOST',t:'VHAROS, THE ARCH-WARLORD',b:'Last of the Nine. Ten thousand years a jailer. It tried to warn you, in the end.'},
 h_argus:{cat:'THE HOST',t:'ARGUS',b:'The Hundred-Eyed. Every eye is a window for the Hollow God.'},
 h_god:{cat:'THE HOST',t:'THE HOLLOW GOD',b:'The thing beneath the Crown. It has consumed worlds beyond counting and remembers every one. The Warlords were not its army. They were its prison.'},
 x_lantern:{cat:'LANTERN',t:'PROJECT LANTERN',b:'A Helix containment device designed by Dr. Reyne. Fed with the burning hearts of the Breach\'s anchors, it can, in theory, seal the Breach permanently. Its full specification was never shared with the Coalition.'},
 x_hearts:{cat:'LANTERN',t:'WARLORD HEARTS',b:'The hearts of the Warlords burn without a body. LANTERN accepts them like fuel. Reyne\'s notes call them "keys", which nobody noticed at the time.'},
 x_seven:{cat:'LANTERN',t:'SUBJECT SEVEN FILE',b:'Six subjects rejected the heart. The seventh did not. The file\'s last line reads: integration complete, host compatible with LANTERN core. Okafor did not read that far.'},
 x_ash:{cat:'LANTERN',t:'FIRETEAM ASH',b:'Cpl. Hana Vasquez. Pvt. Danny Osei. Pvt. Mika Hale. Pvt. Ruth Kade. Held the Ninth Gate.'},
 x_lock:{cat:'LANTERN',t:'THE LOCK',b:'The Nine Warlords were living keystones holding the Hollow God\'s prison shut. Each Warlord killed was one less lock. Reyne translated this correctly two years before the Breach.'},
 x_fourth:{cat:'LANTERN',t:'THE FOURTH HEART',b:'LANTERN needs four hearts to burn: three dead, one living. It was always meant to be the Warden\'s.'},
 x_end:{cat:'LANTERN',t:'THE WARDEN',b:'Somebody has to hold the door.'}
};
