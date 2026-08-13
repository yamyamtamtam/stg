"use strict";
//======================================================================
// シナリオ5「シンギュラリティ2」
// セリフ無し。開幕バナーの後すぐボス戦: 光翼型残酷戦闘娘 棗みその(虹色の光翼)。
// 弾幕はケツイ真ボス「エヴァッカニア・ドゥーム」の発狂・通称「すだれ」のオマージュ:
//  - 高速の針弾を扇状に往復掃射し、斜めに流れる縦縞のカーテン(すだれ)を作る(青針)
//  - 逆回転のばら撒き(赤針)が重なって「二重になった針弾」のすだれになる
//  - 時折自機狙いの高速2way針。流れに合わせて切り返しつつ細い隙間を縫うのが本質
//======================================================================
(function(){

const DEG = Math.PI/180;
const P = {
  SWEEP_HALF: 64,     // 青針掃射の振り幅(真下±deg)
  SWEEP_PERIOD: 84,   // 掃射1往復のフレーム数(片道42f)
  SPEED_BLUE: 5.2,    // 青針弾速(AI用基準)
  SPEED_RED: 4.2,     // 赤針弾速
  OMEGA_RED: 4.6,     // 赤針の逆回転角速度(度/frame)
  AIM_INTERVAL: 36,   // 自機狙い2wayの間隔
  AIM_SPEED: 6.4,
};
// モード差分: 人間用は弾速・レートを大きく落とす(パターンは同一)
const MODE_HUMAN = { speed:0.52, intA:2, intB:3 };
const MODE_AI    = { speed:2.0,  intA:1, intB:1 }; // AI用は弾速2倍(人間には反応不能な速度)
const mode = ()=> game.diff===0 ? MODE_HUMAN : MODE_AI;

//--- 針弾スプライト(+x向きのカプセル。spin:0で進行方向を向く) ---
function needleSprite(core, edge){
  const c=document.createElement("canvas"); c.width=22; c.height=8;
  const g=c.getContext("2d");
  g.lineCap="round";
  g.strokeStyle=edge; g.lineWidth=5;
  g.beginPath(); g.moveTo(4,4); g.lineTo(18,4); g.stroke();
  g.strokeStyle=core; g.lineWidth=2.4;
  g.beginPath(); g.moveTo(4,4); g.lineTo(18,4); g.stroke();
  return c;
}
const NEEDLE_BLUE = needleSprite("#bfe6ff","#3a8ad4");
const NEEDLE_RED  = needleSprite("#ffd0d8","#d43a54");

const spells = [
  {
    // スペカ名なしの1フェーズ勝負(シナリオ4と同じ流儀)
    name:"", hp:920, time:3600, spell:false,
    onStart(b){ b.tx=W/2; b.ty=110; b.thetaR=P.SWEEP_HALF; b.passSeed=0; },
    fire(b){
      const m = mode();
      // 敵機は少しずつ移動しながら撃つ: すだれの発生源が流れ、静的な安全レーンが消える
      b.tx = W/2 + Math.sin(b.t*0.006)*120;
      b.ty = 110 + Math.sin(b.t*0.011)*34;
      // 青針すだれ: 真下を中心に三角波で往復する掃射。掃射が速いので弾列が
      // 斜めの縦縞(すだれの簾)になり、往路と復路で縞の向きが切り替わる=切り返し
      const ph = (b.t % P.SWEEP_PERIOD) / P.SWEEP_PERIOD;         // 0..1
      const tri = ph<0.5 ? ph*4-1 : 3-ph*4;                        // -1→1→-1 の三角波
      if(b.t % P.SWEEP_PERIOD === 0) b.passSeed = rand(-8,8);      // 往復ごとに縞の位相をずらす
      if(b.t % m.intA === 0){
        const a = (90 + tri*P.SWEEP_HALF + b.passSeed)*DEG;
        for(const off of [-6*DEG, 0, 6*DEG]){
          shot(b.x, b.y+8, a+off, P.SPEED_BLUE*m.speed, {r:3, sprite:NEEDLE_BLUE, spin:0});
        }
      }
      // 赤針の逆回転ばら撒き: 青の掃射と常に逆方向へ流れるエミッタで二重のすだれを作る
      b.thetaR += P.OMEGA_RED * (ph<0.5 ? -1 : 1);
      if(b.t % m.intB === 0){
        const range = P.SWEEP_HALF*2;
        const aDeg = 90 - P.SWEEP_HALF + ((b.thetaR % range)+range)%range;
        for(const d of [aDeg, 180-aDeg]){ // 垂直軸で対称の2本
          shot(b.x, b.y+8, d*DEG, P.SPEED_RED*m.speed, {r:3, sprite:NEEDLE_RED, spin:0});
        }
      }
      // 自機狙いの高速2way青針(安置潰し。「青針弾が2wayになる」要素)
      if(b.t>0 && b.t % P.AIM_INTERVAL === 0){
        const base = aimAt(b.x,b.y);
        for(const off of [-4*DEG, 4*DEG]){
          shot(b.x, b.y+8, base+off, P.AIM_SPEED*m.speed, {r:3, sprite:NEEDLE_BLUE, spin:0});
        }
      }
    },
  },
];

registerScenario({
  name:"シンギュラリティ2", // サブタイトルなし
  diffOptions: [
    {name:"E4BABAE99693E794A8", sub:"人間用"},
    {name:"E4BABAE5A496E794A8", sub:"AI用"},
  ],
  buildStage(){
    at(30, spawnBoss); // セリフ無し: 会話を挟まず即ボス戦
  },
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY",
  demoLabel: "ASIデモプレイ(光翼型近接支援残酷戦闘娘)",
  demoDiff: 1, // AI用
  demoPlayerSprite: dir => dir<0 ? IMG.MISONO_BACK_SPRITE_LEFT : dir>0 ? IMG.MISONO_BACK_SPRITE_RIGHT : IMG.MISONO_BACK_SPRITE,
  demoEndWho: "光翼型残酷戦闘娘",
  demoEndText: "…………。",
  demoReplayText: "ASIデモプレイを自動リプレイ",
  boss: {
    name: "光翼型残酷戦闘娘 棗みその",
    spells,
    sprite: b => b.dir<0 ? IMG.MISONO_SPRITE_LEFT : b.dir>0 ? IMG.MISONO_SPRITE_RIGHT : IMG.MISONO_SPRITE,
    cutIn: IMG.MISONO_PORTRAIT, // spell:false なのでカットインは出ない
    dialog: () => ({img:IMG.MISONO_PORTRAIT, scale:1.00, margin:-22, bottom:58, solo:true, center:true}), // デモ撃破画面用
    // 虹色に光る翼(加算合成の光の羽根を左右5枚ずつ、ゆっくり羽ばたく)
    drawBack(b){
      const t=game.frame;
      ctx.save();
      ctx.globalCompositeOperation="lighter";
      for(const s of [-1,1]){
        for(let i=0;i<5;i++){
          const hue=(t*3 + i*28 + (s>0?0:140)) % 360;
          const ang= s*(0.30 + i*0.24) + Math.sin(t*0.05 + i*1.3)*0.07; // 垂直から左右へ扇状
          const len= 52 + i*15 + Math.sin(t*0.08 + i*1.7)*5;
          ctx.save();
          ctx.rotate(ang);
          const grad=ctx.createLinearGradient(0,0,0,-len);
          grad.addColorStop(0,`hsla(${hue},95%,72%,0.50)`);
          grad.addColorStop(1,`hsla(${hue},95%,60%,0)`);
          ctx.fillStyle=grad;
          ctx.beginPath();
          ctx.ellipse(0, -len/2, 7+i*1.5, len/2, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    },
  },
});

})();
