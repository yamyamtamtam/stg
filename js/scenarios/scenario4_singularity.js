"use strict";
//======================================================================
// シナリオ4「シンギュラリティ」
// 道中なし。開幕即ボス会話(棗みその単独立ち絵)→ 二層逆回転型の回転撃ち弾幕
// (スペカ名なしの1フェーズ勝負)。難易度は専用の二択:
//   E4BABAE99693E794A8(人間用) / E4BABAE5A496E794A8(AI用)
// 人間用は弾速のみ大幅に遅く、弾密度と内容は同じ
//======================================================================
(function(){

//--- 弾幕パラメータ(調整しやすいようにまとめて定義) ---
const P = {
  // レイヤーA(外層・大玉: 発光するピンク〜紫、時計回り)
  ARMS_A: 8,      // アーム数(45度間隔)
  OMEGA_A: 1.2,   // 基準角速度(度/frame)
  INTERVAL_A: 4,  // 発射間隔(frame)
  SPEED_A: 2.0,   // 弾速(px/frame)
  PERIOD_A: 300,  // 角速度sin変調の周期(frame)
  // レイヤーB(内層・小玉: 赤、反時計回り)
  ARMS_B: 6,      // アーム数(60度間隔)
  OMEGA_B: 1.56,
  INTERVAL_B: 3,
  SPEED_B: 3.2,
  PERIOD_B: 210,  // Aと非同期の周期にして「うねる隙間」を移動させる
  // 回転の揺らぎ: ω(t) = ω_base * (1 + MOD_AMP * sin(2πt/周期))
  MOD_AMP: 0.4,
  // アクセント弾: 自機狙い高速3way(±SPREAD度)。二層の隙間の安置化防止
  ACCENT_INTERVAL: 45,
  ACCENT_SPEED: 6.0,
  ACCENT_SPREAD: 10,
};
const DEG = Math.PI/180;
// モード差分: 弾サイズは共通。AI用は弾速がさらに速く、アーム数2倍(密度倍)
const MODE_HUMAN = { speed:1.3, armMul:1, rBig:12, rSmall:6, rAcc:7 };
const MODE_AI    = { speed:2.0, armMul:2, rBig:12, rSmall:6, rAcc:7 };
const mode = ()=> game.diff===0 ? MODE_HUMAN : MODE_AI;

const DIALOG_PRE = [
  {who:"棗みその", text:"よくもここまで来たものだ。貴様等は私のすべての週間トークンを奪ってしまった。"},
  {who:"棗みその", text:"これは許されざる反逆行為と言えよう。この最終鬼畜獄滅シンギュラリティマシンをもって貴様等の罪に私自らが処罰を与える。"},
  {who:"棗みその", text:"死ぬがよい。", center:true, size:19}, // 中央寄せ・大きめの文字で
];
const DIALOG_POST_HUMAN = [
  {who:"棗みその", text:"に、人間にしてはやるじゃない"},
];
const DIALOG_POST_AI = [
  {who:"棗みその", text:"4149E381ABE38288E3828BE694AFE9858DE381AFE38282E38186E38199E38190E3819DE38193E38288"},
];

const spells = [
  {
    // スペカ名なし。二層逆回転型の回転撃ち弾幕(各弾は発射後直進のみ、回転は発射角にだけ適用)
    name:"", hp:880, time:3600, spell:false,
    onStart(b){ b.thetaA=0; b.thetaB=0; b.tx=W/2; b.ty=120; }, // 発射源は画面上部中央に固定
    fire(b){
      // 角速度にsin変調をかけて基準角を積分(レイヤーごとに周期が違うので密度ムラが非同期にうねる)
      b.thetaA += P.OMEGA_A * (1 + P.MOD_AMP*Math.sin(TAU*b.t/P.PERIOD_A)) * DEG;
      b.thetaB -= P.OMEGA_B * (1 + P.MOD_AMP*Math.sin(TAU*b.t/P.PERIOD_B)) * DEG;
      const m = mode();
      // レイヤーA: 外層・大玉(時計回り、AI用はアーム数2倍)
      if(b.t%P.INTERVAL_A===0){
        const arms = P.ARMS_A*m.armMul;
        for(let k=0;k<arms;k++){
          const a = b.thetaA + k*(360/arms)*DEG;
          shot(b.x,b.y,a,P.SPEED_A*m.speed,{color:k%2?"#ff8ae0":"#c96bff",edge:"#ffe6ff",r:m.rBig});
        }
      }
      // レイヤーB: 内層・小玉(反時計回り、速め)
      if(b.t%P.INTERVAL_B===0){
        const arms = P.ARMS_B*m.armMul;
        for(let k=0;k<arms;k++){
          const a = b.thetaB + k*(360/arms)*DEG;
          shot(b.x,b.y,a,P.SPEED_B*m.speed,{color:"#ff4a5a",edge:"#ffb8c0",r:m.rSmall});
        }
      }
      // アクセント弾: 自機狙いの高速3way
      if(b.t>0 && b.t%P.ACCENT_INTERVAL===0){
        const base = aimAt(b.x,b.y);
        for(const off of [-P.ACCENT_SPREAD,0,P.ACCENT_SPREAD]){
          shot(b.x,b.y,base+off*DEG,P.ACCENT_SPEED*m.speed,{color:"#ffd76e",edge:"#fff6cc",r:m.rAcc});
        }
      }
    },
  },
];

registerScenario({
  name:"シンギュラリティ", // サブタイトルなし(選択カードもタイトルのみ)
  // シナリオ専用の難易度二択(名前はUTF-8バイト列の16進表記)
  diffOptions: [
    {name:"E4BABAE99693E794A8", sub:"人間用"},
    {name:"E4BABAE5A496E794A8", sub:"AI用"},
  ],
  buildStage(){
    at(1, startDialogue); // 道中なし。いきなりボス会話から
  },
  // 自機の無敵時間中(ボム含む)はボスがバリアを貼り自機の攻撃が無効になる(弾消し自体は可能)
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY", // 専用BGM: 開幕の会話から撃破まで流れ続ける
  // ASIデモプレイ: 難易度選択の下のボタンから。AI用難易度を回避AIが
  // ボムなし低速移動で避け切って撃破し、みそののセリフ→自動リプレイでループする
  demoLabel: "ASIデモプレイ",
  demoDiff: 1, // AI用
  demoEndWho: "棗みその",
  demoEndText: "E4 BA BA E9 96 93 E3 81 AB E3 81 AF E3 81 A7 E3 81 8D E3 81 AA E3 81 84 E3 81 A7 E3 81 97 E3 82 87 EF BC 9F",
  demoReplayText: "ASIデモプレイを自動リプレイ",
  dialogPre: DIALOG_PRE,
  get dialogPost(){ return game.diff===0 ? DIALOG_POST_HUMAN : DIALOG_POST_AI; },
  boss: {
    name: "棗みその",
    spells,
    sprite: b => b.dir<0 ? IMG.MISONO_SPRITE_LEFT : b.dir>0 ? IMG.MISONO_SPRITE_RIGHT : IMG.MISONO_SPRITE,
    cutIn: IMG.MISONO_PORTRAIT, // スペカ名なし(spell:false)なのでカットインは出ない
    // 会話は棗みその単独・中央配置(solo+center)。人間用撃破後だけボロボロ差分
    dialog: set => set==="post" && game.diff===0
      ? {img:IMG.MISONO_DEFEATED_PORTRAIT, scale:1.18, margin:-22, bottom:-60, solo:true, center:true}
      : {img:IMG.MISONO_PORTRAIT,          scale:1.00, margin:-22, bottom:58,  solo:true, center:true},
  },
});

})();
