"use strict";
//======================================================================
// シナリオ1「ホモガキミームの海」
// 道中: 汎用雑魚(diver/crosser/swirler) + 中型機fortress
// ボス: 考現学陰キャ 棗みその(月弾) 通常+スペカ3枚
//======================================================================
(function(){

// 画面上部に停止して単語弾の扇を大量発射する中型機
zakoAI.fortress = function(e){
  if(e.t<70) e.y+=1.4;
  else if(e.t<430){
    if(e.t%16===0){
      const WORDS=[["寺院","#ffb14d"],["機械","#8ad4ff"],["教え","#b78aff"],["ティーダ","#7ee6a0"]];
      const base = aimAt(e.x,e.y);
      const spr = 2.0 + Math.sin(e.t*0.02)*0.5;
      const nFan = Math.max(3, Math.round(5 * DIFF_DENSITY[game.diff]));
      for(let i=0;i<nFan;i++){
        const a = base + (i/(nFan-1)-0.5)*spr;
        const wd = WORDS[Math.floor(rand(0,4))];
        shot(e.x,e.y+6,a,rand(1.5,2.5),{word:wd[0],color:wd[1],r:7});
      }
      if(game.diff>=3 && e.t%32===0){
        // LUNATIC: 背面にも単語弾の扇を追加してパターンを増やす
        for(let i=0;i<3;i++){
          const a = base+Math.PI + (i/2-0.5)*1.6;
          const wd = WORDS[Math.floor(rand(0,4))];
          shot(e.x,e.y+6,a,rand(1.3,2.0),{word:wd[0],color:wd[1],r:7});
        }
      }
    }
  }
  else e.y-=1.2;
};

function buildStage(){
  // --- 第1波: ダイバー編隊 ---
  for(let i=0;i<5;i++) at(60+i*20, ()=>spawnEnemy({
    x:80+i*70, y:-20, hp:8, ai:zakoAI.diver, exitDir: i<3?-1:1, score:150,
  }));
  // --- 第2波: 左右からクロッサー ---
  for(let i=0;i<6;i++) at(320+i*30, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:60+i*22, vx:i%2?-2.4:2.4, hp:6,
    ai:zakoAI.crosser, color:"#ffb14d", score:120, dropPow:i%3===0?1:0,
  }));
  // --- 第3波: スワーラー雨 ---
  for(let i=0;i<8;i++) at(620+i*35, ()=>spawnEnemy({
    x:rand(50,W-50), y:-20, hp:7, ai:zakoAI.swirler, color:"#b78aff", score:130,
  }));
  // --- 中型機 x2 ---
  at(1000, ()=>spawnEnemy({x:W*0.3,y:-30,hp:120,r:18,ai:zakoAI.fortress,color:"#ff6e9c",score:2000,dropPow:3,dropPoint:5}));
  at(1060, ()=>spawnEnemy({x:W*0.7,y:-30,hp:120,r:18,ai:zakoAI.fortress,color:"#ff6e9c",score:2000,dropPow:3,dropPoint:5}));
  // --- ラッシュ ---
  for(let i=0;i<10;i++) at(1500+i*15, ()=>spawnEnemy({
    x:rand(40,W-40), y:-20, hp:5, ai:zakoAI.diver, exitDir:Math.random()<0.5?-1:1, score:100,
  }));
  for(let i=0;i<8;i++) at(1750+i*25, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:rand(50,180), vx:i%2?-2.6:2.6, hp:6, ai:zakoAI.crosser, color:"#ffb14d", score:120,
  }));
  // --- ボス登場 ---
  at(2150, startDialogue);
}

const DIALOG_PRE = [
  {who:"うらら", text:"みそのちゃんきたよ〜〜"},
  {who:"みその", text:"あんた、あのインターネットミームをかき分けて、ここまできたの...？暇？"},
  {who:"うらら", text:"暇じゃないけど、ClaudeFableで遊んでたらこうなっちゃって..."},
  {who:"みその", text:"はぁ....しょうがないから少し遊んであげるわ...."},
  {who:"うらら", text:"いえーい！"},
];
const DIALOG_POST = [
  {who:"うらら", text:"バイブコーディング楽しすぎ！！"},
  {who:"みその", text:"……まぁ、ほどほどにしときなよ"},
];

const spells = [
  {
    name:"通常攻撃", hp:350, time:1800, spell:false,
    fire(b){
      if(b.t%50===0) nway(b.x,b.y,aimAt(b.x,b.y),5,0.9,2.6,{color:"#8ad4ff",r:5});
      if(b.t%80===30) ring(b.x,b.y,16,1.8,b.t*0.02,{moon:true,color:"#b78aff"});
      if(game.diff>=2 && b.t%110===55) ring(b.x,b.y,10,1.6,-b.t*0.025,{color:"#ffb14d",r:4}); // HARD+: 逆回転リングを追加
      if(b.t%140===0) bossMove(b);
    },
  },
  {
    name:"月符「AIからの電気信号」", hp:520, time:2100, spell:true,
    fire(b){
      // 二重逆回転スパイラル: 月弾スパイラル×通常弾スパイラルの混合
      if(b.t%4===0){
        const a1 = b.t*0.11, a2 = -b.t*0.13+1.7;
        for(let k=0;k<4;k++){
          shot(b.x,b.y,a1+k*TAU/4,2.0,{moon:true,color:"#c96bff",r:4});
          shot(b.x,b.y,a2+k*TAU/4,1.6,{color:"#6bb8ff",r:4});
        }
      }
      if(b.t%160===80) nway(b.x,b.y,aimAt(b.x,b.y),3,0.35,3.4,{color:"#ffd76e",r:5});
      if(game.diff>=2 && b.t%8===4){
        // HARD+: 第三のスパイラル腕を追加してパターンを密に
        const a3 = b.t*0.09+2.3;
        shot(b.x,b.y,a3,1.4,{moon:true,color:"#ff9de0",r:4});
      }
    },
  },
  {
    name:"倫符「米国からの輸出規制」", hp:560, time:2100, spell:true,
    fire(b){
      // 規制の壁(通常弾)+ 隙間を縫って飛ぶ高速月弾
      if(b.t%70===0){
        const gap = rand(0.35,TAU-0.35);
        for(let i=0;i<36;i++){
          const a=i/36*TAU;
          let d=Math.abs(((a-gap+Math.PI)%TAU)-Math.PI);
          if(d>0.42) shot(b.x,b.y,a,1.15,{color:"#ff5d7a",r:5});
        }
      }
      if(b.t%55===25) shot(b.x,b.y,aimAt(b.x,b.y),4.2,{moon:true,color:"#ffffff",r:4});
      if(game.diff>=2 && b.t%70===35){
        // HARD+: タイミングをずらした第二の壁を追加
        const gap2 = rand(0.35,TAU-0.35);
        for(let i=0;i<24;i++){
          const a=i/24*TAU;
          let d=Math.abs(((a-gap2+Math.PI)%TAU)-Math.PI);
          if(d>0.5) shot(b.x,b.y,a,1.35,{moon:true,color:"#ffd76e",r:4});
        }
      }
      if(b.t%200===100) bossMove(b, 60);
    },
  },
  {
    name:"「Claudeの辛口忖度なし批評」", hp:700, time:2400, spell:true,
    fire(b){
      // 加速する月弾リング + 曲がる通常弾の奔流 + 月弾の自機狙い扇
      if(b.t%90===0){
        ring(b.x,b.y,24,1.2,b.t*0.015,{moon:true,color:"#ffd76e",r:4,accel:0.012});
      }
      if(b.t%6===0){
        const a=b.t*0.17;
        shot(b.x,b.y,a,2.6,{color:"#ff6e9c",r:4,turn:0.012});
        shot(b.x,b.y,a+Math.PI,2.6,{color:"#8ad4ff",r:4,turn:-0.012});
      }
      if(b.t%150===75) nway(b.x,b.y,aimAt(b.x,b.y),7,1.3,2.2,{moon:true,color:"#b78aff",r:5});
      if(game.diff>=2 && b.t%90===45){
        // HARD+: 逆回転リングを重ねてパターンを密に
        ring(b.x,b.y,16,1.0,-b.t*0.02,{color:"#c96bff",r:4});
      }
    },
  },
];

registerScenario({
  name:"ホモガキミームの海", sub:"114514 connect.",
  buildStage,
  dialogPre: DIALOG_PRE,
  dialogPost: DIALOG_POST,
  boss: {
    name: "考現学陰キャ 棗みその",
    spells,
    sprite: b => b.dir<0 ? IMG.MISONO_SPRITE_LEFT : b.dir>0 ? IMG.MISONO_SPRITE_RIGHT : IMG.MISONO_SPRITE,
    cutIn: IMG.MISONO_PORTRAIT,
    // みその: 拡大しつつ下に沈めて(窓に隠す)身長低めに見せる。
    // ボス撃破後のボロボロ立ち絵は大きさそのままでもっと下に沈め、うららより少し身長低く見せる
    dialog: set => set==="post"
      ? {img:IMG.MISONO_DEFEATED_PORTRAIT, scale:1.18, margin:-22, bottom:-60}
      : {img:IMG.MISONO_PORTRAIT,          scale:1.00, margin:-22, bottom:58},
  },
});

})();
