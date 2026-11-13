(()=>{'use strict';
const c=document.getElementById('game'),ctx=c.getContext('2d'),$=id=>document.getElementById(id);ctx.imageSmoothingEnabled=false;
const W=360,H=560,C=40,ROWS=14,COLS=9;
const route=[[4,-1],[4,0],[4,1],[3,1],[2,1],[2,2],[2,3],[3,3],[4,3],[5,3],[6,3],[6,4],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[3,7],[4,7],[5,7],[6,7],[6,8],[6,9],[5,9],[4,9],[4,10],[4,11],[4,12],[4,13],[4,14]];
const cells=new Set(route.filter(([x,y])=>y>=0&&y<ROWS).map(([x,y])=>x+','+y));
const defs={archer:{cost:50,range:110,rate:.58,damage:15,color:'#ffe5a3'},cannon:{cost:90,range:92,rate:1.55,damage:34,color:'#f6a94e'},frost:{cost:75,range:100,rate:1.1,damage:8,color:'#9feeff'}};
const mobs={skeleton:{hp:38,spd:39,reward:10,leak:2},goblin:{hp:48,spd:54,reward:12,leak:2},wolf:{hp:44,spd:78,reward:13,leak:2},knight:{hp:115,spd:32,reward:21,leak:3},mage:{hp:82,spd:42,reward:18,leak:3},golem:{hp:210,spd:23,reward:30,leak:4}};
const bosses=[{name:'ВОЖДЬ ГОБЛИНОВ',kind:'chief',hp:700,spd:29,reward:150,leak:8},{name:'КОСТЯНОЙ ГЕНЕРАЛ',kind:'general',hp:1250,spd:26,reward:240,leak:10},{name:'ТЕНЕВОЙ МАГ',kind:'shadow',hp:1800,spd:32,reward:340,leak:12},{name:'КАМЕННЫЙ ТИТАН',kind:'titan',hp:3000,spd:18,reward:500,leak:15},{name:'КОРОЛЬ НЕЖИТИ',kind:'king',hp:4300,spd:24,reward:700,leak:20}];
const modes=[{name:'ЛЁГКИЙ',waves:20,place:'🍁 ОСЕННИЙ ЛЕС',pool:['skeleton','goblin','wolf'],tint:'#49683e',reward:1},{name:'СРЕДНИЙ',waves:40,place:'⛰ ГОРНАЯ ДОЛИНА',pool:['goblin','knight','mage'],tint:'#57665a',reward:2},{name:'ХАРД',waves:60,place:'🌋 ОГНЕННЫЕ ЗЕМЛИ',pool:['knight','golem','mage'],tint:'#79503a',reward:3},{name:'КОШМАР',waves:80,place:'🌑 ПРОКЛЯТОЕ КОРОЛЕВСТВО',pool:['golem','mage','knight'],tint:'#493b66',reward:4}];
const walls=[{name:'Деревянная стена',cost:50,hp:100},{name:'Каменная стена',cost:150,hp:250},{name:'Железный барьер',cost:350,hp:500},{name:'Магический щит',cost:700,hp:900},{name:'Королевская крепость',cost:1500,hp:2000}];
const getNum=(k,d=0)=>{try{return Math.max(0,Number(localStorage.getItem(k))||d)}catch(e){return d}};
const saveNum=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(e){}};
let gems=getNum('absGems3'),ownedWall=Math.min(walls.length-1,getNum('absWall3')),modeIndex=0,wallHp=0,wallCooldown=0;
let hp=20,gold=130,wave=0,score=0,towers=[],enemies=[],bullets=[],particles=[],spawn=null,playing=false,active=false,selectedType='archer',selectedTower=null,speed=1,last=0,sound=true,best=0,clock=0;
try{best=Number(localStorage.getItem('absoluteDefenseBest')||0)}catch(e){} $('best').textContent=best;
function updateGems(){ $('gems').textContent=gems;$('shopGems').textContent=gems;saveNum('absGems3',gems) }
function showMenu(){playing=false;active=false;spawn=null;enemies=[];bullets=[];$('overlay').classList.add('hidden');$('kingdomShop').classList.add('hidden');$('kingdomMenu').classList.remove('hidden');renderModes()}
function renderModes(){ $('modeList').innerHTML=modes.map((m,i)=>'<button data-mode="'+i+'"><span>'+m.name+'<br><small>'+m.place+'</small></span><b>'+m.waves+' 🌊</b></button>').join('');document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{modeIndex=Number(b.dataset.mode);init();$('kingdomMenu').classList.add('hidden');$('overlay').classList.add('hidden')})}
function renderShop(){updateGems();$('shopItems').innerHTML=walls.map((w,i)=>'<div class="shop-item"><div><b>🛡 '+w.name+'</b><small>Прочность: '+w.hp+'</small></div><button data-wall="'+i+'">'+(i===ownedWall?'ВЫБРАНО':w.cost+' 💎')+'</button></div>').join('');document.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.wall);if(i===ownedWall)return;if(gems<walls[i].cost){notice('Недостаточно изумрудов');return}gems-=walls[i].cost;ownedWall=i;saveNum('absWall3',i);wallHp=walls[i].hp;updateGems();renderShop()})}
$('menuBtn').onclick=showMenu;$('shopBtn').onclick=()=>{$('kingdomMenu').classList.add('hidden');$('kingdomShop').classList.remove('hidden');renderShop()};$('openShop').onclick=$('shopBtn').onclick;$('shopBack').onclick=()=>{$('kingdomShop').classList.add('hidden');$('kingdomMenu').classList.remove('hidden')};updateGems();renderModes();
const rand=(x,y)=>{let n=Math.sin(x*127.1+y*311.7+4)*43758.5453;return n-Math.floor(n)};
function notice(s){$('hint').textContent=s}function tone(f=440,d=.05){if(!sound)return;try{let A=window.AudioContext||window.webkitAudioContext,a=window._absAudio||(window._absAudio=new A()),o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.025,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d)}catch(e){}}
function sync(){$('hp').textContent=hp;$('gold').textContent=gold;$('wave').textContent=wave;$('score').textContent=score;let cost=selectedTower?Math.floor(defs[selectedTower.type].cost*(.75+selectedTower.level*.65)):0;$('upgradeBtn').disabled=!selectedTower||gold<cost;$('upgradeBtn').textContent=selectedTower?'⬆ '+cost+' 🪙':'⬆ Улучшить'}
function init(){hp=20;gold=130;wave=0;wallHp=walls[ownedWall].hp;wallCooldown=0;score=0;towers=[];enemies=[];bullets=[];particles=[];spawn=null;playing=true;active=false;selectedTower=null;speed=1;clock=0;$('speedBtn').textContent='⏩ x1';$('waveBtn').disabled=false;$('waveBtn').textContent='▶ НАЧАТЬ ВОЛНУ';notice('Построй башни. Боссы приходят на каждой 5-й волне!');sync()}
function typesForWave(w){let a=modes[modeIndex].pool.slice(0,w<3?1:w<8?2:3);return a}
function makeEnemy(kind,boss=false,config=null){let m=config||mobs[kind],scale=boss?1:1+Math.max(0,wave-1)*.17;let max=Math.round(m.hp*scale);enemies.push({kind,boss,name:boss?m.name:'',x:route[0][0]*C+C/2,y:-C/2,idx:0,hp:max,max,speed:m.spd*(boss?1:1+Math.min(wave*.009,.25)),reward:m.reward,leak:m.leak,slow:0,phase:Math.random()*6.28});}
function waveStart(){if(!playing||active)return;if(wave>=modes[modeIndex].waves){notice('🏆 РЕЖИМ ПРОЙДЕН!');return}wave++;active=true;let boss=wave%5===0;spawn={left:5+wave*2,timer:.2,interval:Math.max(.34,.95-wave*.022),bossPending:boss};$('waveBtn').disabled=true;$('waveBtn').textContent='⚔ ВОЛНА ИДЁТ';notice(boss?'👑 БОСС НА ВОЛНЕ '+wave+'!':'⚔ Волна '+wave+'! Защити замок.');tone(boss?190:620,.16);sync()}
function spawnOne(){let pool=typesForWave(wave),r=Math.random(),kind=pool[Math.floor(r*pool.length)];if(wave>=5&&r<.16)kind='knight';makeEnemy(kind)}
function pop(x,y,color,count=6){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*110,vy:(Math.random()-.5)*110,life:.4,color})}
function finish(){playing=false;active=false;if(score>best){best=score;try{localStorage.setItem('absoluteDefenseBest',String(best))}catch(e){}}$('best').textContent=best;$('overlayTitle').textContent='ЗАМОК ПАЛ!';$('overlayText').textContent='Ты дошёл до волны '+wave+'. Очки: '+score+'. Построй новую защиту!';$('overlayBtn').textContent='ИГРАТЬ СНОВА';$('overlay').classList.remove('hidden');tone(130,.3)}

// ABS_GAME_610
const adminEvent={
 id:-1,
 until:0,
 elapsed:0
};

window.addEventListener(
 "absolute:global-event",
 function(event){
  const d=event.detail||{};
  const id=Number(d.id);
  const start=Number(d.startedAt);
  const duration=Number(d.duration);

  if(!Number.isInteger(id) ||
     !Number.isFinite(start) ||
     !Number.isFinite(duration))return;

  adminEvent.id=id;
  adminEvent.until=start+duration*1000;
  adminEvent.elapsed=0;
 }
);


// ABS_REWARDS_70
const rewardEvents={
 20:{seconds:10,coins:50,label:"🪙 Дождь монет"},
 21:{seconds:10,gems:2,label:"💎 Алмазный дождь"},
 22:{seconds:15,coins:100,gems:1,label:"📦 Сундук с неба"},
 26:{seconds:10,coins:20,label:"🌟 Золотой час"},
 27:{seconds:20,random:true,label:"🎡 Колесо удачи"},
 28:{seconds:15,random:true,label:"🔮 Мистический ящик"},
 29:{seconds:30,coins:500,gems:5,label:"🎰 Джекпот"},
 47:{seconds:10,random:true,label:"🍀 Монета удачи"}
};

function adminTick(dt){
 if(!playing)return;

 if(Date.now()>=adminEvent.until){
  adminEvent.id=-1;
  return;
 }

 const config=rewardEvents[adminEvent.id];
 if(!config)return;

 adminEvent.elapsed+=Math.min(dt,.06);

 if(adminEvent.elapsed<config.seconds)return;

 adminEvent.elapsed-=config.seconds;

 let coins=config.coins||0;
 let diamonds=config.gems||0;

 if(config.random){
  const roll=Math.random();

  if(adminEvent.id===27){
   coins=roll<.5?50:200;
  }

  if(adminEvent.id===28){
   diamonds=roll<.7?1:3;
  }

  if(adminEvent.id===47){
   coins=roll<.5?10:100;
  }
 }

 gold+=coins;
 gems+=diamonds;

 if(diamonds)updateGems();
 sync();

 notice(
  config.label+
  (coins?" +"+coins+" 🪙":"")+
  (diamonds?" +"+diamonds+" 💎":"")
 );

 for(let i=0;i<18;i++){
  pop(
   Math.random()*W,
   Math.random()*H,
   diamonds?"#79eaff":"#ffd66b",
   2
  );
 }
}

window.absoluteAdminPurchase=function(item){
 if(!playing)return "Сначала начни игру";

 if(item==="coins"){
  if(gems<10)return "Недостаточно изумрудов";
  gems-=10;
  gold+=300;
  updateGems();
  sync();
  return "Получено 300 монет";
 }

 if(item==="gems"){
  if(gold<500)return "Недостаточно монет";
  gold-=500;
  gems+=5;
  updateGems();
  sync();
  return "Получено 5 изумрудов";
 }

 if(item==="heal"){
  if(gold<150)return "Недостаточно монет";
  gold-=150;
  hp=Math.min(20,hp+10);
  sync();
  return "Замок восстановлен";
 }

 return "Товар не найден";
};


// ABS_ENEMIES_70

const enemyEventState={
 lastKey:"",
 nextSpawn:0
};

function enemyEventActive(id){
 return playing &&
        adminEvent.id===id &&
        Date.now()<adminEvent.until;
}

function enemyEventBoss(name,multiplier=1){
 const base=bosses[
  Math.floor(Math.random()*bosses.length)
 ];

 const config={
  ...base,
  name:name,
  hp:Math.round(base.hp*multiplier),
  reward:Math.round(base.reward*multiplier)
 };

 makeEnemy(base.kind,true,config);
}

function enemyEventSpawn(){
 if(!playing)return;

 const id=adminEvent.id;

 if(id<10||id>19)return;
 if(Date.now()>=adminEvent.until)return;

 const now=Date.now();

 if(now<enemyEventState.nextSpawn)return;

 enemyEventState.nextSpawn=now+8000;

 if(id===10){
  enemyEventBoss("КОРОЛЬ ДРАКОНОВ",2.5);
  notice("🐉 Король драконов атакует!");
 }

 if(id===11){
  for(let i=0;i<8;i++)
   makeEnemy("skeleton");

  notice("💀 Армия скелетов!");
 }

 if(id===12){
  enemyEventBoss("ДЕМОН ХАОСА",2);
  notice("😈 Демон хаоса!");
 }

 if(id===13){
  for(let i=0;i<7;i++)
   makeEnemy("goblin");

  notice("🧟 Зомби-апокалипсис!");
 }

 if(id===14){
  for(let i=0;i<3;i++){
   makeEnemy("golem");
   const e=enemies[enemies.length-1];
   e.hp*=3;
   e.max*=3;
   e.speed*=0.7;
   e.reward*=2;
  }

  notice("👹 Гигантские враги!");
 }

 if(id===15){
  for(let i=0;i<5;i++){
   makeEnemy("knight");
   const e=enemies[enemies.length-1];
   e.hp=Math.round(e.hp*1.8);
   e.max=e.hp;
   e.speed*=1.3;
  }

  notice("🧬 Мутировавшие враги!");
 }

 if(id===16){
  for(let i=0;i<6;i++)
   makeEnemy("mage");

  notice("👽 Инопланетное вторжение!");
 }

 if(id===17){
  enemyEventBoss("КЛОН БОССА",0.7);
  enemyEventBoss("КЛОН БОССА",0.7);

  notice("👥 Клоны боссов!");
 }

 if(id===18){
  enemyEventBoss("БОСС РАЗРАБОТЧИКА",4);

  notice("👑 Босс разработчика!");
 }

 if(id===19){
  enemyEventBoss("СЛУЧАЙНЫЙ БОСС",1.2);

  notice("🎰 Рулетка боссов!");
 }

 sync();
}

window.addEventListener(
 "absolute:global-event",
 event=>{
  const d=event.detail||{};
  const key=String(d.id)+":"+
            String(d.startedAt);

  if(key!==enemyEventState.lastKey){
   enemyEventState.lastKey=key;
   enemyEventState.nextSpawn=0;
  }
 }
);

function update(dt){enemyEventSpawn();adminTick(dt);if(!playing)return;dt=Math.min(dt,.06)*speed;clock+=dt;
if(spawn){spawn.timer-=dt;while(spawn.left>0&&spawn.timer<=0){spawnOne();spawn.left--;spawn.timer+=spawn.interval}if(spawn.left===0){if(spawn.bossPending){let b=bosses[Math.min(Math.floor(wave/5)-1,bosses.length-1)];makeEnemy(b.kind,true,{...b,hp:Math.round(b.hp*Math.pow(1.4,Math.max(0,Math.floor(wave/5)-5)))});notice('👑 '+b.name+' НА ПОЛЕ!');spawn.bossPending=false;tone(145,.3)}spawn=null}}
for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],next=route[e.idx+1];e.attackCd=(e.attackCd===undefined?1.4:e.attackCd-dt);if(e.idx>=28&&e.attackCd<=0&&wallHp>0){wallHp=Math.max(0,wallHp-(e.boss?22:5));e.attackCd=e.boss?1.8:2.5;pop(e.x,e.y,'#ffb75c',2)}if(!next){enemies.splice(i,1);if(wallHp>0){let hit=Math.min(wallHp,e.leak*15);wallHp-=hit;hp-=Math.max(0,e.leak-Math.ceil(hit/15))}else hp-=e.leak;pop(e.x,e.y,'#f65b57',12);if(hp<=0){hp=0;sync();finish();return}continue}let tx=next[0]*C+C/2,ty=next[1]*C+C/2,dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy),step=e.speed*(e.slow>0?.52:1)*dt;if(e.slow>0)e.slow-=dt;if(d<=step){e.x=tx;e.y=ty;e.idx++}else if(d>0){e.x+=dx/d*step;e.y+=dy/d*step}}
for(let t of towers){t.cool-=dt;if(t.cool>0)continue;let d=defs[t.type],range=d.range+(t.level-1)*10,targets=enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<range).sort((a,b)=>b.idx-a.idx);if(targets.length){let e=targets[0];bullets.push({x:t.x,y:t.y,target:e,type:t.type,damage:d.damage*(1+(t.level-1)*.65),speed:t.type==='cannon'?230:330});t.cool=d.rate/(1+(t.level-1)*.13);tone(t.type==='frost'?730:t.type==='cannon'?170:510,.02)}}
for(let i=bullets.length-1;i>=0;i--){let b=bullets[i],e=b.target;if(!enemies.includes(e)){bullets.splice(i,1);continue}let dx=e.x-b.x,dy=e.y-b.y,d=Math.hypot(dx,dy),step=b.speed*dt;if(d<=step+8){let victims=b.type==='cannon'?enemies.filter(v=>Math.hypot(v.x-e.x,v.y-e.y)<46):[e];for(let v of victims){if(!enemies.includes(v))continue;v.hp-=b.damage;if(b.type==='frost')v.slow=1.7;pop(v.x,v.y,defs[b.type].color,3);if(v.hp<=0){enemies.splice(enemies.indexOf(v),1);if(window.absoluteSeason)window.absoluteSeason.recordKill(1);gold+=v.reward;if(v.boss){gems+=8*modes[modeIndex].reward;updateGems()}score+=v.boss?500+wave*25:10+wave*2;pop(v.x,v.y,v.boss?'#f5c44d':'#9cdd78',v.boss?24:8);if(v.boss){notice('🏆 БОСС ПОБЕЖДЁН! +'+v.reward+' монет');tone(900,.3)}}}bullets.splice(i,1);sync()}else if(d>0){b.x+=dx/d*step;b.y+=dy/d*step}}
for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}if(active&&!spawn&&enemies.length===0){active=false;if(window.absoluteSeason)window.absoluteSeason.recordBattle();let bonus=30+wave*5;gold+=bonus;gems+=modes[modeIndex].reward;updateGems();if(wave>=modes[modeIndex].waves){playing=false;$('overlayTitle').textContent='🏆 ПОБЕДА!';$('overlayText').textContent='Режим '+modes[modeIndex].name+' пройден! '+wave+' волн. Изумруды: '+gems;$('overlayBtn').textContent='В МЕНЮ';$('overlay').classList.remove('hidden');$('waveBtn').disabled=true}else{notice('🏆 Волна '+wave+' отбита! Бонус '+bonus+' монет и изумруды.');$('waveBtn').disabled=false;$('waveBtn').textContent='▶ СЛЕДУЮЩАЯ ВОЛНА'}tone(880,.15);sync()}}
function rect(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function pixel(x,y,scale,art,palette){let lines=art.trim().split('/');for(let j=0;j<lines.length;j++)for(let i=0;i<lines[j].length;i++){let col=palette[lines[j][i]];if(col)rect(x+i*scale,y+j*scale,scale,scale,col)}}
const sprites={
skeleton:['..wwww../.wwwwww./.wkwkw./.wwdww./..wwww../...gg.../.gggggg./g.gggg.g/..g..g../..g..g..',{w:'#eee7cf',k:'#27212c',d:'#aa8b74',g:'#b9b5a7'}],
goblin:['..gggg../.gggggg./ggkgkg.g/gggggggg/.ggddgg./..rrrr../.rrrrrr./r.rrrr.r/..r..r..',{g:'#74b93c',k:'#211f28',d:'#3b6a29',r:'#8b4038'}],
wolf:['........ /..dddd../.dddddd./ddkddkdd/dddddddd/.dddddd./.d.dd.d./d..dd..d/........'.replace(/ /g,''),{d:'#65606a',k:'#e3423b'}],
knight:['..hhhh../.hhhhhh./.hkhkh./.hhhhhh./..rrrr../.rrrrrr./rrrrrrrr/..r..r../.rr..rr.',{h:'#8f91a1',k:'#ffd57c',r:'#8e4d3f'}],
mage:['...pp.../..pppp../.ppkkpp./.pppppp./..pppp../.pppppp./pppppppp/..p..p../.p....p.',{p:'#693e86',k:'#e875ff'}],
golem:['..ssss../.ssssss./ssks skss/ssssssss/.ssssss./ssssssss/ss.ssss.ss/..s..s../.ss..ss.'.replace(/ /g,''),{s:'#77717b',k:'#ff7938'}],
chief:['..yyyy../.y.y..y./.gggggg./ggkgkg.g/gggggggg/.rrrrrr./rrrrrrrr/r.rrrr.r/..r..r..',{y:'#f7bc45',g:'#68b533',k:'#2b2025',r:'#b34b38'}],
general:['..yyyy../.y.yy.y./.wwwwww./wwkwkw.w/wwwwwwww/.hhhhhh./hhhhhhhh/h.hhhh.h/..h..h..',{y:'#f6c04e',w:'#e4dacb',k:'#342533',h:'#727787'}],
shadow:['...pp.../..pppp../.ppkkpp./.pppppp./.pppppp./pppppppp/pppppppp/.p.pp.p./p......p',{p:'#4b2c71',k:'#d979ff'}],
titan:['.ssssss./ssssssss/ssks skss/ssssssss/ssssssss/ssssssss/ss.ssss.ss/ss.ssss.ss/ss......ss'.replace(/ /g,''),{s:'#706b6c',k:'#ff742f'}],
king:['..yyyy../.y.yy.y./.pppppp./ppkppkpp/pppppppp/.pphhpp./pphhhhpp/pphhhhpp/p.p..p.p',{y:'#ffc347',p:'#63418e',k:'#f2a1ff',h:'#96919d'}]};
function drawMob(e){let scale=e.boss?4:3,sz=scale*8,xx=Math.round(e.x-sz/2),yy=Math.round(e.y-sz/2+Math.sin(clock*7+e.phase)*1.5),sprite=sprites[e.kind]||sprites.skeleton;rect(xx-2,yy+sz-4,sz+4,4,'#27351f');pixel(xx,yy,scale,sprite[0],sprite[1]);let bw=e.boss?48:28;rect(e.x-bw/2,e.y-sz/2-9,bw,5,'#3e242b');rect(e.x-bw/2,e.y-sz/2-9,bw*Math.max(0,e.hp/e.max),5,e.boss?'#ff6550':'#8cdb72');if(e.boss){ctx.fillStyle='#ffda86';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(e.name,e.x,e.y-sz/2-13)}if(e.slow>0){ctx.strokeStyle='#8fe9ff';ctx.lineWidth=2;ctx.strokeRect(xx-2,yy-2,sz+4,sz+4)}}
function draw(){ctx.clearRect(0,0,W,H);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){let n=rand(x*43,y*19),road=cells.has(x+','+y);rect(x*C,y*C,C,C,road?'#a1784f':n>.5?modes[modeIndex].tint:'#426038');if(road){rect(x*C+2,y*C+2,C-4,C-4,'#b48a59');if(n>.4)rect(x*C+8,y*C+24,7,3,'#9a7048')}else{if(n>.35){rect(x*C+8,y*C+8,4,4,'#6f8b45');rect(x*C+27,y*C+25,4,4,'#bd8d43')}if(n>.8)rect(x*C+13,y*C+19,6,6,'#c97534')}}
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!cells.has(x+','+y)&&rand(x*3,y*99)>.84&&!towers.some(a=>a.cx===x&&a.cy===y)){rect(x*C+15,y*C+13,10,17,'#62442f');rect(x*C+7,y*C+5,26,17,'#bd6b30');rect(x*C+13,y*C,16,14,'#e49b39')}
if(wallHp>0){rect(4*C-13,H-62,66,9,'#24252a');rect(4*C-12,H-61,64*Math.max(0,wallHp/walls[ownedWall].hp),7,'#6de5a3')}rect(4*C-4,H-35,48,35,'#57505c');rect(4*C+3,H-49,34,19,'#777080');rect(4*C+12,H-26,16,26,'#34212a');rect(4*C-8,H-44,12,44,'#88818a');rect(5*C-4,H-44,12,44,'#88818a');rect(4*C-10,H-49,16,9,'#bbb3a4');rect(5*C-6,H-49,16,9,'#bbb3a4');
for(let t of towers){let d=defs[t.type];if(t===selectedTower){ctx.strokeStyle='#ffe19c99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,d.range+(t.level-1)*10,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff5b3';ctx.strokeRect(t.cx*C+2,t.cy*C+2,36,36)}rect(t.x-15,t.y-11,30,25,'#3d2b35');rect(t.x-12,t.y-15,24,9,t.type==='frost'?'#75c7df':t.type==='cannon'?'#ba6850':'#d7a85d');ctx.font='22px serif';ctx.textAlign='center';ctx.fillText(t.type==='archer'?'🏹':t.type==='cannon'?'💣':'❄️',t.x,t.y+10);if(t.level>1){ctx.font='bold 11px sans-serif';ctx.fillStyle='#fff1aa';ctx.fillText('+'+(t.level-1),t.x+13,t.y-12)}}
for(let e of enemies)drawMob(e);for(let b of bullets){ctx.fillStyle=defs[b.type].color;ctx.beginPath();ctx.arc(b.x,b.y,b.type==='cannon'?7:4,0,Math.PI*2);ctx.fill()}for(let p of particles){ctx.globalAlpha=Math.max(0,p.life/.4);rect(p.x,p.y,4,4,p.color)}ctx.globalAlpha=1;rect(0,0,W,6,'#241c27');ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillStyle='#ffe8a6';ctx.fillText(active?(wave%5===0?'👑 БОСС · ':'⚔ ВОЛНА ')+wave:modes[modeIndex].place,10,22)}
function loop(ts){if(!last)last=ts;let dt=(ts-last)/1000;last=ts;update(dt);draw();requestAnimationFrame(loop)}
c.addEventListener('pointerdown',ev=>{if(!playing)return;ev.preventDefault();let r=c.getBoundingClientRect(),x=Math.floor((ev.clientX-r.left)/r.width*W/C),y=Math.floor((ev.clientY-r.top)/r.height*H/C);if(x<0||x>=COLS||y<0||y>=ROWS)return;let old=towers.find(a=>a.cx===x&&a.cy===y);if(old){selectedTower=old;notice('Башня '+old.level+' уровня. Нажми «Улучшить».');sync();return}if(cells.has(x+','+y)){notice('⛔ На дороге строить нельзя!');tone(150);return}let d=defs[selectedType];if(gold<d.cost){notice('🪙 Недостаточно монет!');tone(150);return}gold-=d.cost;let t={cx:x,cy:y,x:x*C+C/2,y:y*C+C/2,type:selectedType,level:1,cool:0};towers.push(t);selectedTower=t;pop(t.x,t.y,'#ffda7b',10);tone(680);notice('Башня построена!');sync()});
document.querySelectorAll('[data-tower]').forEach(b=>b.addEventListener('click',()=>{selectedType=b.dataset.tower;selectedTower=null;document.querySelectorAll('[data-tower]').forEach(z=>z.classList.toggle('selected',z===b));notice('Выбран тип: '+b.querySelector('b').textContent+'. Коснись свободной клетки.');sync()}));
$('upgradeBtn').onclick=()=>{if(!selectedTower)return;let cost=Math.floor(defs[selectedTower.type].cost*(.75+selectedTower.level*.65));if(gold<cost)return;gold-=cost;selectedTower.level++;pop(selectedTower.x,selectedTower.y,'#f9dd7b',12);notice('⬆ Башня улучшена до '+selectedTower.level+' уровня!');tone(800,.12);sync()};$('waveBtn').onclick=waveStart;$('speedBtn').onclick=()=>{speed=speed===1?2:1;$('speedBtn').textContent='⏩ x'+speed};$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'🔊':'🔇'};$('overlayBtn').onclick=()=>{if(wave>=modes[modeIndex].waves&&hp>0){showMenu()}else{init();$('overlay').classList.add('hidden')}};requestAnimationFrame(loop);
})();
