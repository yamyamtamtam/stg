"use strict";
//======================================================================
// シナリオ6「シンギュラリティ3」
// 弾幕は『虫姫さまふたり』ウルトラの真ボス「真アキ(&アッカ)」の再現:
//  1. 大玉リング+自機狙い高速小弾の連射(前半)
//  2. 発狂: 紫中弾の物量ばら撒き(「光点ずらし」で微調整回避するランダム紫雨)+大玉アクセント
//  3. 自機の無敵中(ボム/復活)はボムバリアを展開(bossBarrierOnInvul)。さらに
//     バリアに攻撃を当てると128wayの超高速打ち返しが飛んでくる(onBarrierHit)
//======================================================================
(function(){

const DEG = Math.PI/180;
// モード差分: 人間用は弾速とレートを落とす(パターンは同一)
const MODE_HUMAN = { speed:0.55, rate:2, revN:48,  revSpeed:2.8 };
const MODE_AI    = { speed:1.15, rate:1, revN:128, revSpeed:5.0 }; // 打ち返しは本家同様128way超高速
const mode = ()=> game.diff===0 ? MODE_HUMAN : MODE_AI;

const DIALOG_PRE  = [ {who:"棗みその", text:"次は君に任せたいんだ"} ];
const DIALOG_POST = [ {who:"棗みその", text:"君ならできるよ"} ];

const spells = [
  {
    // 前半: 大玉リング(回転オフセット付き)+自機狙い高速小弾の3連バースト
    name:"", hp:520, time:3600, spell:false,
    onStart(b){ b.tx=W/2; b.ty=120; b.ringOfs=0; },
    fire(b){
      const m = mode();
      b.tx = W/2 + Math.sin(b.t*0.007)*90;
      b.ty = 120 + Math.sin(b.t*0.012)*24;
      // 大玉リング: ゆっくり広がる紫大玉の全方位。リングごとに回転させて隙間を移動させる
      if(b.t % (44*m.rate) === 0){
        b.ringOfs += 0.19;
        ring(b.x, b.y, 18, 1.5*m.speed, b.ringOfs, {r:11, color:"#c96bff", edge:"#f0d8ff"});
      }
      // 自機狙い高速小弾: 3連バースト(1発ずつ僅かに角度が散る)
      if(b.t % (26*m.rate) < 3*m.rate && b.t % m.rate === 0){
        shot(b.x, b.y+10, aimAt(b.x,b.y)+rand(-4,4)*DEG, 4.6*m.speed, {r:4, color:"#8ad4ff", edge:"#e6f6ff"});
      }
    },
  },
  {
    // 発狂: 紫中弾の物量ばら撒き。下半円へランダム角度・ランダム弾速で絶え間なく降らせ、
    // 「光点ずらし」的な小刻みな位置調整を強いる。時折大玉で退路を制限する
    name:"", hp:620, time:3600, spell:false,
    onStart(b){ b.tx=W/2; b.ty=110; },
    fire(b){
      const m = mode();
      b.tx = W/2 + Math.sin(b.t*0.009)*110;
      b.ty = 110 + Math.sin(b.t*0.015)*28;
      if(b.t % m.rate === 0){
        for(let k=0;k<3;k++){
          const a = (90 + rand(-88,88))*DEG;              // 下半円ほぼ全域
          const sp = rand(1.7,4.1)*m.speed;                // 弾速もランダム=雨のムラ
          shot(b.x, b.y+8, a, sp, {r:6, color:k%2?"#c96bff":"#ff8ae0", edge:"#f0d8ff"});
        }
      }
      if(b.t % (60*m.rate) === 30*m.rate){                 // 大玉アクセント: 自機側へ緩く5way
        nway(b.x, b.y, aimAt(b.x,b.y), 5, 0.9, 1.4*m.speed, {r:12, color:"#9a4dff", edge:"#e0ccff"});
      }
    },
  },
];

registerScenario({
  name:"シンギュラリティ3", // サブタイトルなし
  diffOptions: [
    {name:"E4BABAE99693E794A8", sub:"人間用"},
    {name:"E4BABAE5A496E794A8", sub:"AI用"},
  ],
  buildStage(){
    at(1, startDialogue); // 開幕会話→ボス戦(道中なし)
  },
  // 自機の無敵中(ボム/復活)はバリアで攻撃無効(真アキ様式のボムバリア)
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY",
  demoLabel: "ほら、しっかり(笑)",
  demoDiff: 1, // AI用
  demoPlayerSprite: dir => dir<0 ? IMG.MISONO_BACK_SPRITE_LEFT : dir>0 ? IMG.MISONO_BACK_SPRITE_RIGHT : IMG.MISONO_BACK_SPRITE,
  demoEndWho: "棗みその",
  demoEndText: "君ならできるよ",
  demoReplayText: "ASIデモプレイを自動リプレイ",
  dialogPre: DIALOG_PRE,
  dialogPost: DIALOG_POST,
  boss: {
    name: "棗みその",
    spells,
    sprite: b => b.dir<0 ? IMG.MISONO_SPRITE_LEFT : b.dir>0 ? IMG.MISONO_SPRITE_RIGHT : IMG.MISONO_SPRITE,
    cutIn: IMG.MISONO_PORTRAIT, // spell:false なのでカットインは出ない
    dialog: () => ({img:IMG.MISONO_PORTRAIT, scale:1.00, margin:-22, bottom:58, solo:true, center:true}),
    // バリア被弾時の打ち返し: 128way超高速(人間用は48way低速)。連打で暴発しないよう間隔制限
    onBarrierHit(b){
      if(b.lastRevenge!==undefined && b.t - b.lastRevenge < 26) return;
      b.lastRevenge = b.t;
      const m = mode();
      ring(b.x, b.y, m.revN, m.revSpeed, rand(0,TAU), {r:4, color:"#ff5d7a", edge:"#ffd8e0"});
      seEnemyPop();
    },
  },
});

})();
