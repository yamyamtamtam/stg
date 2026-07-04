"use strict";
//======================================================================
// シナリオ2「オタサーの森」
// 道中: チー牛/豚(単語弾)
// ボス: オタサーの姫。召集(チー牛/豚を召喚するのみ)→全滅で発狂
//       →病符/複数「チン騎士ファンネル」/円符(6体召喚、撃破するまでダメージが通りにくい)
//======================================================================
(function(){

// チー牛: 「うおw」「@」「嫉妬か？」を単語弾として撃つ(ボス召喚時は自分を中心に周回、時間経過で自機へ突撃)
zakoAI.chiuma = function(e){
  const WORDS=[["うおw","#8ad4ff"],["@","#ffb14d"],["嫉妬か？","#ff6e9c"]];
  if(e.orbit && e.chargeAt && e.t>=e.chargeAt){
    if(!e.chargeVec){ const a=aimAt(e.x,e.y); e.chargeVec={vx:Math.cos(a)*3.2, vy:Math.sin(a)*3.2}; }
    e.x+=e.chargeVec.vx; e.y+=e.chargeVec.vy;
    if(e.t%20===0){ const wd=WORDS[Math.floor(rand(0,3))]; shot(e.x,e.y,aimAt(e.x,e.y),2.4,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.orbit){
    e.orbitA += 0.028;
    e.x = boss.x + Math.cos(e.orbitA)*e.orbitR;
    e.y = boss.y + Math.sin(e.orbitA)*e.orbitR;
    if(e.t%70===30){ const wd=WORDS[Math.floor(rand(0,3))]; shot(e.x,e.y,aimAt(e.x,e.y),2.0,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.vx!==undefined){
    e.x += e.vx; e.y += Math.sin(e.t*0.05)*0.8;
    if(e.t%50===20){ const wd=WORDS[Math.floor(rand(0,3))]; shot(e.x,e.y,aimAt(e.x,e.y),2.6,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.t<60) e.y+=2.2;
  else if(e.t===70||e.t===95||e.t===120) nway(e.x,e.y,aimAt(e.x,e.y),3,0.5,2.2,{word:WORDS[Math.floor(rand(0,3))][0],color:"#8ad4ff",r:7});
  else if(e.t>150){ e.y-=1.6; e.x+=(e.exitDir||1)*1.2; }
};

// 豚: 「w」「草」を単語弾として撃つ(ボス召喚時は自分を中心に周回、時間経過で自機へ突撃)
zakoAI.buta = function(e){
  const WORDS=[["w","#7ee6a0"],["草","#7ee6a0"]];
  if(e.orbit && e.chargeAt && e.t>=e.chargeAt){
    if(!e.chargeVec){ const a=aimAt(e.x,e.y); e.chargeVec={vx:Math.cos(a)*3.0, vy:Math.sin(a)*3.0}; }
    e.x+=e.chargeVec.vx; e.y+=e.chargeVec.vy;
    if(e.t%22===0){ const wd=WORDS[Math.floor(rand(0,2))]; shot(e.x,e.y,aimAt(e.x,e.y),2.3,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.orbit){
    e.orbitA -= 0.024;
    e.x = boss.x + Math.cos(e.orbitA)*e.orbitR;
    e.y = boss.y + Math.sin(e.orbitA)*e.orbitR;
    if(e.t%60===15){ const wd=WORDS[Math.floor(rand(0,2))]; shot(e.x,e.y,aimAt(e.x,e.y),1.9,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.vx!==undefined){
    e.x += e.vx; e.y += Math.cos(e.t*0.05)*0.8;
    if(e.t%45===15){ const wd=WORDS[Math.floor(rand(0,2))]; ring(e.x,e.y,5,1.4,rand(0,TAU),{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.t<60) e.y+=2.0;
  else if(e.t%60===30){ const wd=WORDS[Math.floor(rand(0,2))]; ring(e.x,e.y,6,1.5,rand(0,TAU),{word:wd[0],color:wd[1],r:7}); }
  else if(e.t>280){ e.y-=1.4; e.x+=(e.exitDir||-1)*1.0; }
};

// kind: "intro"(召集: 通常HPで登場) / "charge"(複数: 周回後に自機へ突撃、要撃破ではない)
// / "orbit"(円符: 周回し続ける。撃破するまでボスのダメージが通りにくい)
const ZAKO_BASE_HP = {chiuma:8, buta:7}; // 雑魚として出る時の基本耐久力
const BOSS_SUMMON_HP_MULT = 5; // ボス戦中のチー牛/豚はこの倍率で耐久力が上がる
function spawnSummons(kind){
  if(kind==="intro"){
    const defs = [
      {type:"chiuma", ai:zakoAI.chiuma, sprite:IMG.CHIUMA_SPRITE, color:"#8ad4ff", side:-1},
      {type:"buta",   ai:zakoAI.buta,   sprite:IMG.BUTA_SPRITE,   color:"#7ee6a0", side: 1},
    ];
    for(const d of defs){
      spawnEnemy({
        x:W/2+d.side*90, y:-30, hp:ZAKO_BASE_HP[d.type]*BOSS_SUMMON_HP_MULT, r:12, ai:d.ai, zType:d.type, sprite:d.sprite, color:d.color,
        score:400, dropPow:1, dropPoint:2, summonTag:d.type,
      });
    }
    return;
  }
  const n = kind==="orbit" ? 6 : 2; // 円符: チー牛/豚交互に6体、複数: 2体
  for(let i=0;i<n;i++){
    const type = i%2===0 ? "chiuma" : "buta";
    const ai = type==="chiuma" ? zakoAI.chiuma : zakoAI.buta;
    const sprite = type==="chiuma" ? IMG.CHIUMA_SPRITE : IMG.BUTA_SPRITE;
    const color = type==="chiuma" ? "#8ad4ff" : "#7ee6a0";
    spawnEnemy({
      x:boss.x, y:boss.y, hp:ZAKO_BASE_HP[type]*BOSS_SUMMON_HP_MULT, r:12, ai, zType:type, sprite, color,
      score:600, dropPow:1, dropPoint:2,
      summonTag: kind==="orbit" ? type : undefined,
      orbit:true, orbitA:i/n*TAU, orbitR:56,
      chargeAt: kind==="charge" ? 220 : 0,
    });
  }
}

function buildStage(){
  // --- 第1波: チー牛編隊(降下) ---
  for(let i=0;i<5;i++) at(60+i*22, ()=>spawnEnemy({
    x:80+i*70, y:-20, hp:8, ai:zakoAI.chiuma, zType:"chiuma", sprite:IMG.CHIUMA_SPRITE, color:"#8ad4ff", exitDir: i<3?-1:1, score:180,
  }));
  // --- 第2波: 豚の左右横切り ---
  for(let i=0;i<6;i++) at(340+i*30, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:60+i*22, vx:i%2?-2.2:2.2, hp:7,
    ai:zakoAI.buta, zType:"buta", sprite:IMG.BUTA_SPRITE, color:"#7ee6a0", score:150, dropPow:i%3===0?1:0,
  }));
  // --- 第3波: チー牛の雨 ---
  for(let i=0;i<8;i++) at(650+i*35, ()=>spawnEnemy({
    x:rand(50,W-50), y:-20, hp:8, ai:zakoAI.chiuma, zType:"chiuma", sprite:IMG.CHIUMA_SPRITE, color:"#8ad4ff", score:160,
  }));
  // --- 豚ラッシュ ---
  for(let i=0;i<10;i++) at(1050+i*16, ()=>spawnEnemy({
    x:rand(40,W-40), y:-20, hp:6, ai:zakoAI.buta, zType:"buta", sprite:IMG.BUTA_SPRITE, exitDir:Math.random()<0.5?-1:1, score:130,
  }));
  for(let i=0;i<8;i++) at(1350+i*25, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:rand(50,180), vx:i%2?-2.6:2.6, hp:7, ai:zakoAI.chiuma, zType:"chiuma", sprite:IMG.CHIUMA_SPRITE, color:"#8ad4ff", score:150,
  }));
  // --- 最終波: 混成ラッシュ ---
  for(let i=0;i<10;i++) at(1700+i*18, ()=>spawnEnemy({
    x:rand(40,W-40), y:-20, hp: i%2?6:8, ai: i%2?zakoAI.buta:zakoAI.chiuma, zType: i%2?"buta":"chiuma",
    sprite: i%2?IMG.BUTA_SPRITE:IMG.CHIUMA_SPRITE,
    color: i%2?"#7ee6a0":"#8ad4ff", score:150, exitDir: Math.random()<0.5?-1:1,
  }));
  // --- ボス登場 ---
  at(2150, startDialogue);
}

const DIALOG_PRE = [
  {who:"うらら", text:"おや、あれは？"},
  {who:"オタサーの姫", text:"みんな優しいから一緒にいて楽しい〜！"},
  {who:"うらら", text:"だからへんな騎士が多かったのか…"},
  {who:"オタサーの姫", text:"誰か作業通話付き合って〜。"},
  {who:"うらら", text:"付き合うよ〜"},
  {who:"オタサーの姫", text:"……。"},
];
const DIALOG_POST = [
  {who:"うらら", text:"オタ達いなくなったけどどうするの？"},
  {who:"オタサーの姫", text:"………。(ギャルきらい)"},
];

const spells = [
  {
    name:"召集", hp:99999, time:99999, spell:false,
    onStart(){ spawnSummons("intro"); },
    // チー牛と豚がやられたらぴえん顔で発狂して次フェーズへ
    checkAdvance(b){
      if(!enemies.some(e=>e.summonTag)){ b.enraged = true; return true; }
      return false;
    },
    fire(b){
      if(b.t%160===0) bossMove(b, 50);
    },
  },
  {
    name:"病符「私がいなくなってもみんな困らないんだ…」", hp:480, time:2000, spell:true,
    fire(b){
      // 発狂後の苛烈な弾幕: 高密度リング+自機狙いの扇
      if(b.t%50===0) ring(b.x,b.y,20,1.8,b.t*0.02,{color:"#ff8ab0",r:4});
      if(b.t%35===15) nway(b.x,b.y,aimAt(b.x,b.y),5,0.7,2.8,{color:"#ff5d7a",r:5});
      if(game.diff>=2 && b.t%80===40) ring(b.x,b.y,14,1.5,-b.t*0.025,{color:"#8ad4ff",r:4});
      if(b.t%180===90) bossMove(b);
    },
  },
  {
    name:"複数「チン騎士ファンネル」", hp:540, time:2100, spell:true,
    fire(b){
      // チー牛と豚がボスを取り囲むように周回し、しばらくすると自機へ突撃してくる(繰り返し湧く)
      if(b.t>=0 && b.t%260===0) spawnSummons("charge");
      if(b.t%70===35) ring(b.x,b.y,18,1.6,b.t*0.018,{color:"#ff9de0",r:4});
      if(game.diff>=2 && b.t%22===10){
        const WORDS=[["さすが","#ffd76e"],["いいね","#ff6e9c"]];
        const wd=WORDS[Math.floor(rand(0,2))];
        shot(b.x,b.y,rand(0,TAU),2.0,{word:wd[0],color:wd[1],r:6});
      }
    },
  },
  {
    name:"円符「オタサーの姫」", hp:620, time:2200, spell:true,
    onStart(){ spawnSummons("orbit"); },
    fire(b){
      // 自分を中心にチー牛と豚を周回させつつ月弾リング+自機狙いの扇
      if(b.t%90===0) ring(b.x,b.y,16,1.4,b.t*0.02,{moon:true,color:"#e8829e",r:4});
      if(b.t%50===25) nway(b.x,b.y,aimAt(b.x,b.y),5,0.8,2.4,{color:"#c9a7ff",r:5});
      if(game.diff>=2 && b.t%60===30) ring(b.x,b.y,12,1.3,-b.t*0.022,{color:"#8ad4ff",r:4});
    },
  },
];

registerScenario({
  name:"オタサーの森", sub:"貢ぎ物募集中",
  buildStage,
  dialogPre: DIALOG_PRE,
  dialogPost: DIALOG_POST,
  boss: {
    name: "オタサーの姫",
    spells,
    sprite: b => b.enraged
      ? (b.dir<0 ? IMG.HIME_ANGRY_SPRITE_LEFT : b.dir>0 ? IMG.HIME_ANGRY_SPRITE_RIGHT : IMG.HIME_ANGRY_SPRITE)
      : (b.dir<0 ? IMG.HIME_SPRITE_LEFT      : b.dir>0 ? IMG.HIME_SPRITE_RIGHT      : IMG.HIME_SPRITE),
    cutIn: IMG.HIME_PORTRAIT,
    dialog: () => ({img:IMG.HIME_PORTRAIT, scale:0.80, margin:-10, bottom:96}),
  },
});

})();
