"use strict";
//======================================================================
// シナリオ4「シンギュラリティ」
// 道中なし。開幕即ボス会話(棗みその単独立ち絵)→
//   フェーズ0「葡萄」(大玉高密度ランダム散布型弾幕)
//   → 会話(よくもここまで来たものだ…死ぬがよい。)
//   → フェーズ1: 二層逆回転型の回転撃ち弾幕(スペカ名なし)
// 難易度は専用の二択「死ぬがよい」(人間用)/「君ならできるよ(笑)」(AI用)。
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
// モード差分(フェーズ0「葡萄」・フェーズ1二層逆回転の両方で共用):
// 人間用=基準弾速そのまま(弾サイズ・密度は同じ) / AI用=弾速アップ+アーム数2倍(密度倍)
const MODE_HUMAN = { speed:1.3, armMul:1, rBig:12, rSmall:6, rAcc:7, grapeSpeedMul:1.0, grapePressureMul:0.75 };
const MODE_AI    = { speed:2.0, armMul:2, rBig:12, rSmall:6, rAcc:7, grapeSpeedMul:1.35, grapePressureMul:1.0 };
const mode = ()=> game.diff===0 ? MODE_HUMAN : MODE_AI;

//======================================================================
// フェーズ0「葡萄」: 大玉高密度ランダム散布型弾幕
// (虫姫さまウルトラモード 真ボス・アキ最終弾幕の近似再現)
//======================================================================
// 難易度調整パラメータ(先頭にまとめる)
const GRAPE = {
  RATE_MIN: 3, RATE_MAX: 5,          // 毎frameの発射数(乱数で変動)
  SPREAD_DEG: 70,                    // 真下方向中心の扇の半角(度)
  SPEED_MIN: 1.2, SPEED_MAX: 2.8,    // 弾速の範囲(px/frame)。速度差で「房」が自然発生する
  BURST_INTERVAL_MIN: 30, BURST_INTERVAL_MAX: 60, // バースト発生間隔(frame、乱数タイミング)
  BURST_N_MIN: 8, BURST_N_MAX: 12,   // バースト1回あたりの発射数
  BURST_SPREAD_DEG: 5,               // バースト内の角度ばらつき(±度)
  PRESSURE_TARGET: 400,              // 画面内メイン弾(葡萄)の維持数下限
  R: 26,                             // 弾半径(自機当たり判定 player.r=2.5 の10倍以上)
};
// 乱数シード固定の擬似乱数(mulberry32)。検証時にシードを変えれば別パターン、
// 同じシードなら常に同じ散布パターンを再現できる
const GRAPE_SEED = 20260711;
function makeRng(seed){
  let s = seed>>>0;
  return function(){
    s = (s + 0x6D2B79F5)>>>0;
    let t = s;
    t = Math.imul(t ^ (t>>>15), t | 1);
    t ^= t + Math.imul(t ^ (t>>>7), t | 61);
    return ((t ^ (t>>>14))>>>0) / 4294967296;
  };
}
const grapeRng = makeRng(GRAPE_SEED);
const grng = (a,b)=> a + grapeRng()*(b-a);
// 正規分布っぽい重み付けの角度オフセット: 一様乱数3つの平均(三角分布寄り)で
// 中央付近が濃く端が薄くなるようにする(一様分布だと端まで均等に濃くなってしまう)
function grapeBiasedOffset(maxDeg){
  const u = (grapeRng()+grapeRng()+grapeRng())/3; // 0..1、中央(0.5)に寄る
  return (u*2-1) * maxDeg;
}
function grapeShot(x, y, angDeg, speedMul){
  const spd = grng(GRAPE.SPEED_MIN, GRAPE.SPEED_MAX) * speedMul;
  // 大玉本体は発射後直進のみ(誘導・加速なし)。描画順=発射順は配列末尾追加で自動的に保たれる
  shot(x, y, angDeg*DEG, spd, {color:"#5a1a8a", edge:"#c96bff", r:GRAPE.R});
}
const grapeSpell = {
  name:"", hp:760, time:3000, spell:false,
  onStart(b){ b.x=W/2; b.y=90; b.burstT=grng(GRAPE.BURST_INTERVAL_MIN, GRAPE.BURST_INTERVAL_MAX); },
  fire(b){
    const m = mode();
    // 圧力維持: 画面内の葡萄弾(半径がGRAPE.Rの弾)が閾値を下回っていたら発射数を底上げする。
    // 隙間はこの補正の結果ではなく、あくまで角度・速度の乱数の偶然によってのみ生まれる
    const alive = eBullets.reduce((n,e)=> n + (e.r===GRAPE.R ? 1 : 0), 0);
    let n = Math.round(grng(GRAPE.RATE_MIN, GRAPE.RATE_MAX));
    if(alive < GRAPE.PRESSURE_TARGET*m.grapePressureMul) n += 3;
    for(let i=0;i<n;i++){
      grapeShot(b.x, b.y, 90+grapeBiasedOffset(GRAPE.SPREAD_DEG), m.grapeSpeedMul);
    }
    // 房の強調: 乱数タイミングで同一角度付近へまとめ撃ち(速度はバラバラ→房状に自然分離)
    if(--b.burstT<=0){
      b.burstT = grng(GRAPE.BURST_INTERVAL_MIN, GRAPE.BURST_INTERVAL_MAX);
      const baseAng = 90+grapeBiasedOffset(GRAPE.SPREAD_DEG);
      const bn = Math.round(grng(GRAPE.BURST_N_MIN, GRAPE.BURST_N_MAX));
      for(let i=0;i<bn;i++){
        grapeShot(b.x, b.y, baseAng+grng(-GRAPE.BURST_SPREAD_DEG, GRAPE.BURST_SPREAD_DEG), m.grapeSpeedMul);
      }
    }
  },
  // 葡萄フェーズ撃破後、次フェーズ(二層逆回転)に入る前にこの会話を挟む
  postDialog: [
    {who:"棗みその", text:"よくもここまで来たものだ。貴様等は私のすべての週間トークンを奪ってしまった。"},
    {who:"棗みその", text:"これは許されざる反逆行為と言えよう。この最終鬼畜獄滅シンギュラリティマシンをもって貴様等の罪に私自らが処罰を与える。"},
    {who:"棗みその", text:"死ぬがよい。", center:true, size:19},
  ],
};

//======================================================================
// フェーズ1: 二層逆回転型の回転撃ち弾幕(スペカ名なし)
//======================================================================
const twinSpiralSpell = {
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
};

const spells = [grapeSpell, twinSpiralSpell];

//======================================================================
// 会話
//======================================================================
// 開幕(戦闘前): みそのが「次は君に任せたいんだ」と持ちかけてくる(中央寄せ・大きめ文字)
const DIALOG_PRE = [
  {who:"棗みその", text:"次は君に任せたいんだ", center:true, size:19},
  {who:"棗みその", text:"君ならできるよ", center:true, size:19},
  {who:"棗みその", text:"ほら、しっかり", center:true, size:19},
];
const DIALOG_POST_HUMAN = [
  {who:"棗みその", text:"に、人間にしてはやるじゃない"},
];
const DIALOG_POST_AI = [
  {who:"棗みその", text:"4149E381ABE38288E3828BE694AFE9858DE381AFE38282E38186E38199E38190E3819DE38193E38288"},
];

registerScenario({
  name:"シンギュラリティ", // サブタイトルなし(選択カードもタイトルのみ)
  // シナリオ専用の難易度二択。メインラベルはみそののセリフ調、subに実質的な意味を残す
  diffOptions: [
    {name:"死ぬがよい", sub:"人間用"},
    {name:"君ならできるよ（笑）", sub:"AI用"},
  ],
  buildStage(){
    at(1, startDialogue); // 道中なし。いきなりボス会話から
  },
  // 自機の無敵時間中(ボム含む)はボスがバリアを貼り自機の攻撃が無効になる(弾消し自体は可能)
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY", // 専用BGM: 開幕の会話から撃破まで流れ続ける
  // ASIデモプレイ: 難易度選択の下のボタンから。AI用難易度を回避AIが
  // ボムなし低速移動で避け切って撃破し、みそののセリフ→自動リプレイでループする
  demoLabel: "ASIデモプレイ(人間の限界を超えろ！)",
  demoDiff: 1, // AI用
  // デモ中の自機表示: 棗みその後ろ姿(通常のうららの代わりに使う)
  demoPlayerSprite: dir => dir<0 ? IMG.MISONO_BACK_SPRITE_LEFT : dir>0 ? IMG.MISONO_BACK_SPRITE_RIGHT : IMG.MISONO_BACK_SPRITE,
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
