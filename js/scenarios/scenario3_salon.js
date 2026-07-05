"use strict";
//======================================================================
// シナリオ3「オンラインサロンの宗教」〜再現性の疑問〜
// 道中: ワナビー男(お金弾)/ワナビー女(美容弾)
// ボス: オンラインサロン主。誇符(派手だが安置だらけ)→詐符(完全ランダム弾)
//       →符減「オリジナルカルト映画」(信者のチケット弾+教祖への称賛弾、教祖は撃たない)
//======================================================================
(function(){

// ワナビー男: お金の単語弾を撃つ(「¥」「万円」「不労所得」)
zakoAI.wannabeM = function(e){
  const WORDS=[["¥","#ffd76e"],["万円","#ffd76e"],["不労所得","#ffb14d"]];
  if(e.vx!==undefined){
    e.x += e.vx; e.y += Math.sin(e.t*0.05)*0.8;
    if(e.t%50===20){ const wd=WORDS[Math.floor(rand(0,3))]; shot(e.x,e.y,aimAt(e.x,e.y),2.6,{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.t<60) e.y+=2.2;
  else if(e.t===70||e.t===95||e.t===120){ const wd=WORDS[Math.floor(rand(0,3))]; nway(e.x,e.y,aimAt(e.x,e.y),3,0.5,2.2,{word:wd[0],color:wd[1],r:7}); }
  else if(e.t>150){ e.y-=1.6; e.x+=(e.exitDir||1)*1.2; }
};

// ワナビー女: 美容の単語弾を撃つ(「美肌」「小顔」「艶」)
zakoAI.wannabeF = function(e){
  const WORDS=[["美肌","#ff8ab0"],["小顔","#f2a0b0"],["艶","#c9a7ff"]];
  if(e.vx!==undefined){
    e.x += e.vx; e.y += Math.cos(e.t*0.05)*0.8;
    if(e.t%45===15){ const wd=WORDS[Math.floor(rand(0,3))]; ring(e.x,e.y,5,1.4,rand(0,TAU),{word:wd[0],color:wd[1],r:7}); }
    return;
  }
  if(e.t<60) e.y+=2.0;
  else if(e.t%60===30){ const wd=WORDS[Math.floor(rand(0,3))]; ring(e.x,e.y,6,1.5,rand(0,TAU),{word:wd[0],color:wd[1],r:7}); }
  else if(e.t>280){ e.y-=1.4; e.x+=(e.exitDir||-1)*1.0; }
};

// 信者(符減で召喚): 教祖の周りを回りながら自機へチケット弾を乱射し、
// 教祖に向かって称賛の言葉弾を撃ち続ける(称賛弾は教祖を突き抜けて飛んでいく)
zakoAI.believer = function(e){
  const PRAISE=[["神回","#ffd76e"],["有益","#ffd76e"],["さすが","#fff1c4"],["尊敬","#fff1c4"]];
  e.orbitA += e.spin;
  e.x = boss.x + Math.cos(e.orbitA)*e.orbitR;
  e.y = boss.y + Math.sin(e.orbitA)*e.orbitR;
  if((e.t+e.seed)%50===0) shot(e.x,e.y,aimAt(e.x,e.y),2.3,{word:"チケット",color:"#ff8ab0",r:7});
  if((e.t+e.seed)%28===14){
    const wd=PRAISE[Math.floor(rand(0,4))];
    shot(e.x,e.y,Math.atan2(boss.y-e.y,boss.x-e.x),1.4,{word:wd[0],color:wd[1],r:6});
  }
};

// 信者6人を召喚(ワナビー男女交互)。生存中は教祖へのダメージが通りにくい(summonTag)
function spawnBelievers(){
  for(let i=0;i<6;i++){
    const male = i%2===0;
    spawnEnemy({
      x:boss.x, y:boss.y, hp:40, r:12, ai:zakoAI.believer,
      zType: male?"wannabe_m":"wannabe_f",
      sprite: male?IMG.WANNABE_M_SPRITE:IMG.WANNABE_F_SPRITE,
      color: male?"#ffd76e":"#ff8ab0",
      score:600, dropPow:1, dropPoint:2,
      summonTag: male?"wannabe_m":"wannabe_f",
      orbitA:i/6*TAU, orbitR:64, spin: male?0.022:-0.022, seed:i*9,
    });
  }
}

function buildStage(){
  // --- 第1波: ワナビー男の編隊(降下) ---
  for(let i=0;i<5;i++) at(60+i*22, ()=>spawnEnemy({
    x:80+i*70, y:-20, hp:8, ai:zakoAI.wannabeM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", exitDir: i<3?-1:1, score:180,
  }));
  // --- 第2波: ワナビー女の左右横切り ---
  for(let i=0;i<6;i++) at(340+i*30, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:60+i*22, vx:i%2?-2.2:2.2, hp:7,
    ai:zakoAI.wannabeF, sprite:IMG.WANNABE_F_SPRITE, color:"#ff8ab0", score:150, dropPow:i%3===0?1:0,
  }));
  // --- 第3波: ワナビー男の雨 ---
  for(let i=0;i<8;i++) at(650+i*35, ()=>spawnEnemy({
    x:rand(50,W-50), y:-20, hp:8, ai:zakoAI.wannabeM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:160,
  }));
  // --- ワナビー女ラッシュ ---
  for(let i=0;i<10;i++) at(1050+i*16, ()=>spawnEnemy({
    x:rand(40,W-40), y:-20, hp:6, ai:zakoAI.wannabeF, sprite:IMG.WANNABE_F_SPRITE, color:"#ff8ab0", exitDir:Math.random()<0.5?-1:1, score:130,
  }));
  for(let i=0;i<8;i++) at(1350+i*25, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:rand(50,180), vx:i%2?-2.6:2.6, hp:7, ai:zakoAI.wannabeM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:150,
  }));
  // --- 最終波: 混成ラッシュ ---
  for(let i=0;i<10;i++) at(1700+i*18, ()=>spawnEnemy({
    x:rand(40,W-40), y:-20, hp: i%2?6:8, ai: i%2?zakoAI.wannabeF:zakoAI.wannabeM,
    sprite: i%2?IMG.WANNABE_F_SPRITE:IMG.WANNABE_M_SPRITE,
    color: i%2?"#ff8ab0":"#ffd76e", score:150, exitDir: Math.random()<0.5?-1:1,
  }));
  // --- ボス登場 ---
  at(2150, startDialogue);
}

const DIALOG_PRE = [
  {who:"サロン王", text:"まだインターネットで消耗してるの？"},
  {who:"うらら", text:"別にしてないけど…"},
  {who:"サロン王", text:"稼ぎたくない？年収300万で満足しちゃダメです。絶対に人生変わります"},
  {who:"うらら", text:"話通じなさそう…"},
  {who:"サロン王", text:"今しかありません！今入れば月額2万円でコーチングします"},
  {who:"うらら", text:"だめだこりゃ"},
];
const DIALOG_POST = [
  {who:"サロン王", text:"これからはAIの時代です。乗り遅れた人から脱落してゆきます"},
  {who:"うらら", text:"一生やってろ！"},
];

const spells = [
  {
    name:"通常攻撃", hp:340, time:1800, spell:false,
    fire(b){
      if(b.t%55===0) nway(b.x,b.y,aimAt(b.x,b.y),4,0.8,2.4,{word:"¥",color:"#ffd76e",r:7});
      if(b.t%90===40) ring(b.x,b.y,12,1.6,b.t*0.02,{color:"#7ee6a0",r:4});
      if(game.diff>=2 && b.t%70===20) shot(b.x,b.y,aimAt(b.x,b.y),3.2,{word:"月100万",color:"#ff8ab0",r:8}); // HARD+: 高速の煽り弾
      if(b.t%140===0) bossMove(b);
    },
  },
  {
    name:"誇符「人生を変えるAI活用術5選【永久保存版】」", hp:500, time:2100, spell:true,
    fire(b){
      // 見た目は5本腕の派手な密集リングだが、扇形の安置が5つ常に空いていて弾速も遅い
      // (盛った実績と同じで中身スカスカ)。HARD+は安置がやや狭くなる
      if(b.t%30===0){
        const th = game.diff>=2 ? 0.05 : 0.25;
        for(let i=0;i<60;i++){
          const a=i/60*TAU;
          if(Math.sin(a*5+0.6)<th) continue; // 5つの固定安置
          shot(b.x,b.y,a,1.3+(i%2)*0.5,{color:i%2?"#ffd76e":"#ff9de0",r:i%2?6:4});
        }
      }
      if(b.t%120===60){
        // 「①〜⑤」の番号弾をゆっくり自機へ(5選の演出)
        const NUM=["①","②","③","④","⑤"];
        for(let i=0;i<5;i++) shot(b.x,b.y,aimAt(b.x,b.y)+(i-2)*0.22,1.6,{word:NUM[i],color:"#8ad4ff",r:7});
      }
      if(b.t%240===120) bossMove(b,50);
    },
  },
  {
    name:"詐符「【2026年最新版】Claude Fableだけで月100万円稼ぐ方法」", hp:560, time:2100, spell:true,
    fire(b){
      // 完全ランダム弾: 角度・速度・大きさ・加速・軌道に一切の再現性がない
      if(b.t%5===0){
        const n = Math.max(1, Math.round(2*DIFF_DENSITY[game.diff]));
        for(let i=0;i<n;i++){
          shot(b.x,b.y,rand(0,TAU),rand(0.8,3.2),{
            color:["#ffd76e","#ff6e9c","#8ad4ff","#7ee6a0","#c96bff"][Math.floor(rand(0,5))],
            r:rand(3,7), accel:rand(-0.005,0.02), turn:rand(-0.02,0.02),
          });
        }
      }
      if(Math.random()<0.015) shot(b.x,b.y,aimAt(b.x,b.y),rand(2,4),{word:"月100万",color:"#ffd76e",r:8});
      if(b.t%150===75) bossMove(b);
    },
  },
  {
    name:"符減「オリジナルカルト映画」", hp:520, time:2400, spell:true,
    onStart(){ spawnBelievers(); },
    fire(b){
      // 教祖自身は自機に弾を撃たない。攻撃は信者のチケット弾のみで、
      // 信者は教祖に向けて称賛の言葉弾を常に撃ち続ける(summonTagで教祖は硬い)
      if(b.t%200===100) bossMove(b, 40);
      if(b.t%300===299 && !enemies.some(e=>e.summonTag)) spawnBelievers(); // 上映は続く(信者を補充)
    },
  },
];

registerScenario({
  name:"オンラインサロンの宗教", sub:"再現性の疑問",
  buildStage,
  dialogPre: DIALOG_PRE,
  dialogPost: DIALOG_POST,
  boss: {
    name: "オンラインサロン主",
    spells,
    sprite: b => b.dir<0 ? IMG.SALON_SPRITE_LEFT : b.dir>0 ? IMG.SALON_SPRITE_RIGHT : IMG.SALON_SPRITE,
    cutIn: IMG.SALON_PORTRAIT,
    dialog: () => ({img:IMG.SALON_PORTRAIT, scale:0.82, margin:-8, bottom:96}),
  },
});

})();
