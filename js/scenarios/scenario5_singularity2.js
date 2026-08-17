"use strict";
//======================================================================
// シナリオ5「シンギュラリティ2」
// セリフ無し。開幕バナーの後すぐボス戦: 光翼型残酷戦闘娘 棗みその(虹色の光翼)。
// 弾幕はケツイ真ボス「エヴァッカニア・ドゥーム」の発狂・通称「すだれ」の再現:
//  - ボスから大赤弾・大青弾(キャリア)が画面左右へ向けて打ち出され、
//    そのキャリアから高速の針弾が真下へ連射される=移動する発生源から簾が垂れる
//  - キャリアは左右交互・高さ違いで撃ち出され、縦縞の隙間が常に流れる
//  - 時折自機狙いの高速2way針。流れに合わせて切り返しつつ細い隙間を縫うのが本質
//======================================================================
(function(){

const DEG = Math.PI/180;
const P = {
  CARRIER_SPEED: 1.9, // キャリア(大玉)の横移動速度(基準)
  CARRIER_INT: 16,    // キャリア射出間隔(frame、基準)
  NEEDLE_SPEED: 5.2,  // キャリアから降る針弾の速度(基準)
  NEEDLE_INT: 4,      // キャリアが針弾を落とす間隔(frame、基準)
  AIM_INTERVAL: 36,   // 自機狙い2wayの間隔
  AIM_SPEED: 6.4,
};
// モード差分: 人間用は弾速・レートを大きく落とす(パターンは同一)
const MODE_HUMAN = { speed:0.52, intC:26, intN:6 };
const MODE_AI    = { speed:2.0,  intC:16, intN:2 }; // AI用は弾速2倍(針は2fごとに投下して縞を密に)
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

// キャリア(大玉)発射: 画面左右へ横移動しながら、真下へ高速針弾を連射する。
// update()フックで「直進+針弾の連射」を弾自身が行う(発生源が動く簾)
function fireCarrier(b, dir, kind, yOfs){
  const m = mode();
  const needle = kind==="red" ? NEEDLE_RED : NEEDLE_BLUE;
  const colors = kind==="red" ? {color:"#ff4a5a", edge:"#ffb8c0"} : {color:"#4a9ae0", edge:"#c8e6ff"};
  shot(b.x, b.y + yOfs, dir>0 ? 0 : Math.PI, P.CARRIER_SPEED*m.speed, {
    r: 12, ...colors,
    update(o){
      o.x += o.vx; o.y += o.vy;   // 横へ直進
      if(o.t % m.intN === 0){     // 真下へ高速針弾(僅かな角度ゆらぎで簾のムラを出す)
        shot(o.x, o.y+10, (90+rand(-2,2))*DEG, P.NEEDLE_SPEED*m.speed, {r:3, sprite:needle, spin:0});
      }
    },
  });
}

const spells = [
  {
    // スペカ名なしの1フェーズ勝負(シナリオ4と同じ流儀)
    name:"", hp:920, time:3600, spell:false,
    onStart(b){ b.tx=W/2; b.ty=110; b.volley=0; },
    fire(b){
      const m = mode();
      // 敵機は少しずつ移動しながら撃つ: 射出位置が流れ、静的な安全レーンが消える
      b.tx = W/2 + Math.sin(b.t*0.006)*120;
      b.ty = 110 + Math.sin(b.t*0.011)*34;
      // 大赤弾・大青弾を画面左右へ射出(色は左右交互に入れ替え、高さも波打たせる)
      if(b.t % m.intC === 0){
        b.volley++;
        const yOfs = Math.sin(b.volley*1.7)*16;
        const flip = b.volley%2===0;
        fireCarrier(b, -1, flip?"red":"blue", yOfs);
        fireCarrier(b, +1, flip?"blue":"red", -yOfs);
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
