"use strict";
//======================================================================
// シナリオ6「シンギュラリティ3」
// 弾幕は『虫姫さまふたり』ウルトラの真ボス「真アキ(&アッカ)」の再現:
//  1. 大玉リング+自機狙い高速小弾の連射(前半)
//  2. 発狂: 光点(発射源)が画面中央付近を左右にゆっくり動きながら、全方位へ
//     大量の紫弾を撒き散らす(「光点ずらし」で光点との相対位置を微調整して避けるアレ)
//  3. 自機の無敵中(ボム/復活)はボムバリアを展開(bossBarrierOnInvul)。さらに
//     バリアに攻撃を当てると128wayの超高速打ち返しが飛んでくる(onBarrierHit)
//======================================================================
(function(){

const DEG = Math.PI/180;
// モード差分: 人間用は弾速とレートを落とす(パターンは同一)
const MODE_HUMAN = { speed:0.55, rate:2, revN:48,  revSpeed:2.8 };
const MODE_AI    = { speed:1.15, rate:1, revN:128, revSpeed:5.0 }; // 打ち返しは本家同様128way超高速
const mode = ()=> game.diff===0 ? MODE_HUMAN : MODE_AI;

// 上の安置対策(全モード共通): ボスと同じ高さ以上に張り付く自機へ、確殺の超高速8way自機狙い。
// 弾速はモード倍率をかけない絶対値(人間用でも逃げ切れない=安置禁止の明示)
function punishTopCamp(b){
  if(player.y < b.y + 36 && b.t % 28 === 0){
    const base = aimAt(b.x, b.y);
    for(let i=0;i<8;i++){
      const off = (i/7 - 0.5) * 30*DEG;
      shot(b.x, b.y, base+off, 9.0, {r:4, color:"#ffd76e", edge:"#fff6cc"});
    }
  }
}

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
      if(b.t % (22*m.rate) === 0){
        b.ringOfs += 0.19;
        ring(b.x, b.y, 18, 1.5*m.speed, b.ringOfs, {r:11, color:"#c96bff", edge:"#f0d8ff"});
      }
      // 自機狙い高速小弾: 3連バースト(1発ずつ僅かに角度が散る)
      if(b.t % (13*m.rate) < 3*m.rate && b.t % m.rate === 0){
        shot(b.x, b.y+10, aimAt(b.x,b.y)+rand(-4,4)*DEG, 4.6*m.speed, {r:4, color:"#8ad4ff", edge:"#e6f6ff"});
      }
      punishTopCamp(b);
    },
  },
  {
    // 発狂: 光点(=ボス)が画面中央付近へ降りてきて、左右にゆっくり移動しながら
    // 全方位へ大量の紫弾をランダム角度・ランダム弾速で撒き散らす。
    // 弾は360度どこへでも飛ぶため安置はなく、光点との相対位置を保つ微調整
    // (光点ずらし)で紫の隙間を縫い続けるしかない
    name:"", hp:620, time:3600, spell:false,
    onStart(b){ b.tx=W/2; b.ty=H*0.45; },
    fire(b){
      const m = mode();
      b.tx = W/2 + Math.sin(b.t*0.008)*140;      // 中央付近を左右にゆっくり
      b.ty = H*0.45 + Math.sin(b.t*0.013)*18;    // 高さはほぼ中央のまま微揺れ
      if(b.t % m.rate === 0){
        for(let k=0;k<5;k++){
          const a = rand(0,TAU);                  // 全方位
          const sp = rand(1.5,3.9)*m.speed;       // 弾速もランダム=散布のムラ
          shot(b.x, b.y, a, sp, {r:6, color:k%2?"#c96bff":"#ff8ae0", edge:"#f0d8ff"});
        }
      }
      if(b.t % (60*m.rate) === 30*m.rate){        // 大玉アクセント: 自機側へ緩く5way
        nway(b.x, b.y, aimAt(b.x,b.y), 5, 0.9, 1.4*m.speed, {r:12, color:"#9a4dff", edge:"#e0ccff"});
      }
      // 全方位撒きなので上部安置が存在せず、確殺8way(punishTopCamp)はこのフェーズでは不要
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
