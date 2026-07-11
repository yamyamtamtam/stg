"use strict";
//======================================================================
// シナリオ4「シンギュラリティ」
// 道中なし。「シンギュラリティ」選択後にルート分岐: 「死ぬがよい」/「君ならできるよ（笑）」。
// 各ルートはそれぞれ人間用/AI用/ASIデモプレイの3択を持つ独立した単発ボス戦(サブタイトルはなし)。
//   「死ぬがよい」ルート = 二層逆回転型の回転撃ち弾幕(スペカ名なし)
//   「君ならできるよ（笑）」ルート = 大玉高密度ランダム散布型弾幕(スペカ名なし)。
//     下向き散布のみだがボスより上の安置に入ると超高速の自機狙い弾で撃ち抜かれる
//======================================================================
(function(){

const DEG = Math.PI/180;

// 乱数シード固定の擬似乱数(mulberry32)。検証時にシードを変えれば別パターン、
// 同じシードなら常に同じ散布パターンを再現できる
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

// デモ中の自機表示・撃破後のセリフ・BGM等はどちらのルートも同一(棗みそのが相手のため)
const demoPlayerSprite = dir => dir<0 ? IMG.MISONO_BACK_SPRITE_LEFT : dir>0 ? IMG.MISONO_BACK_SPRITE_RIGHT : IMG.MISONO_BACK_SPRITE;
const bossSprite = b => b.dir<0 ? IMG.MISONO_SPRITE_LEFT : b.dir>0 ? IMG.MISONO_SPRITE_RIGHT : IMG.MISONO_SPRITE;

//======================================================================
// ルートA「死ぬがよい」= 二層式洗濯機(二層逆回転型の回転撃ち弾幕)
//======================================================================
const WASH_P = {
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
  // AI用の敵機移動(move:true時): この間隔で近距離の移動目標を選び直す。
  // ボスは目標へ毎フレーム5%の補間で寄るため、狭い目標距離なら「少しずつ漂う」動きになる。
  // 回転弾幕の中心=ボス位置なので、渦全体がゆっくり流れて安地の暗記が効かなくなる
  MOVE_INTERVAL: 100,
  MOVE_RANGE: 80,
};
// 人間用=基準弾速そのまま(弾サイズ・密度は同じ、発射源は固定) /
// AI用=弾速アップ+アーム数2倍(密度倍)+発射源が少しずつ移動
const WASH_MODE_HUMAN = { speed:1.3, armMul:1, rBig:12, rSmall:6, rAcc:7, move:false };
const WASH_MODE_AI    = { speed:2.0, armMul:2, rBig:12, rSmall:6, rAcc:7, move:true };
const washMode = ()=> game.diff===0 ? WASH_MODE_HUMAN : WASH_MODE_AI;

const twinSpiralSpell = {
  name:"", hp:880, time:3600, spell:false,
  onStart(b){ b.thetaA=0; b.thetaB=0; b.tx=W/2; b.ty=120; }, // 開始位置は画面上部中央
  fire(b){
    // 角速度にsin変調をかけて基準角を積分(レイヤーごとに周期が違うので密度ムラが非同期にうねる)
    b.thetaA += WASH_P.OMEGA_A * (1 + WASH_P.MOD_AMP*Math.sin(TAU*b.t/WASH_P.PERIOD_A)) * DEG;
    b.thetaB -= WASH_P.OMEGA_B * (1 + WASH_P.MOD_AMP*Math.sin(TAU*b.t/WASH_P.PERIOD_B)) * DEG;
    const m = washMode();
    // AI用(ASIデモも同モード)は発射源=渦の中心が少しずつ漂う。人間用は固定のまま
    if(m.move && b.t>0 && b.t%WASH_P.MOVE_INTERVAL===0) bossMove(b, WASH_P.MOVE_RANGE);
    // レイヤーA: 外層・大玉(時計回り、AI用はアーム数2倍)
    if(b.t%WASH_P.INTERVAL_A===0){
      const arms = WASH_P.ARMS_A*m.armMul;
      for(let k=0;k<arms;k++){
        const a = b.thetaA + k*(360/arms)*DEG;
        shot(b.x,b.y,a,WASH_P.SPEED_A*m.speed,{color:k%2?"#ff8ae0":"#c96bff",edge:"#ffe6ff",r:m.rBig});
      }
    }
    // レイヤーB: 内層・小玉(反時計回り、速め)
    if(b.t%WASH_P.INTERVAL_B===0){
      const arms = WASH_P.ARMS_B*m.armMul;
      for(let k=0;k<arms;k++){
        const a = b.thetaB + k*(360/arms)*DEG;
        shot(b.x,b.y,a,WASH_P.SPEED_B*m.speed,{color:"#ff4a5a",edge:"#ffb8c0",r:m.rSmall});
      }
    }
    // アクセント弾: 自機狙いの高速3way
    if(b.t>0 && b.t%WASH_P.ACCENT_INTERVAL===0){
      const base = aimAt(b.x,b.y);
      for(const off of [-WASH_P.ACCENT_SPREAD,0,WASH_P.ACCENT_SPREAD]){
        shot(b.x,b.y,base+off*DEG,WASH_P.ACCENT_SPEED*m.speed,{color:"#ffd76e",edge:"#fff6cc",r:m.rAcc});
      }
    }
  },
};

const WASH_DIALOG_PRE = [
  {who:"棗みその", text:"よくもここまで来たものだ。貴様等は私のすべての週間トークンを奪ってしまった。"},
  {who:"棗みその", text:"これは許されざる反逆行為と言えよう。この最終鬼畜獄滅シンギュラリティマシンをもって貴様等の罪に私自らが処罰を与える。"},
  {who:"棗みその", text:"死ぬがよい。", center:true, size:19},
];
const WASH_DIALOG_POST_HUMAN = [
  {who:"棗みその", text:"に、人間にしてはやるじゃない"},
];
const WASH_DIALOG_POST_AI = [
  {who:"棗みその", text:"4149E381ABE38288E3828BE694AFE9858DE381AFE38282E38186E38199E38190E3819DE38193E38288"},
];

const washingMachineRoute = {
  name:"死ぬがよい",
  diffOptions: [
    {name:"人間用"},
    {name:"AI用"},
  ],
  buildStage(){ at(1, startDialogue); }, // 道中なし。いきなりボス会話から
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY",
  demoLabel: "ASIデモプレイ(人間の限界を超えろ！)",
  demoDiff: 1, // AI用
  demoPlayerSprite,
  demoEndWho: "棗みその",
  demoEndText: "E4 BA BA E9 96 93 E3 81 AB E3 81 AF E3 81 A7 E3 81 8D E3 81 AA E3 81 84 E3 81 A7 E3 81 97 E3 82 87 EF BC 9F",
  demoReplayText: "ASIデモプレイを自動リプレイ",
  dialogPre: WASH_DIALOG_PRE,
  get dialogPost(){ return game.diff===0 ? WASH_DIALOG_POST_HUMAN : WASH_DIALOG_POST_AI; },
  boss: {
    name: "棗みその",
    spells: [twinSpiralSpell],
    sprite: bossSprite,
    cutIn: IMG.MISONO_PORTRAIT, // スペカ名なし(spell:false)なのでカットインは出ない
    dialog: set => set==="post" && game.diff===0
      ? {img:IMG.MISONO_DEFEATED_PORTRAIT, scale:1.18, margin:-22, bottom:-60, solo:true, center:true}
      : {img:IMG.MISONO_PORTRAIT,          scale:1.00, margin:-22, bottom:58,  solo:true, center:true},
  },
};

//======================================================================
// ルートB「君ならできるよ（笑）」= 葡萄(大玉高密度ランダム散布型弾幕)
// (虫姫さまウルトラモード 真ボス・アキ最終弾幕の近似再現)
//======================================================================
// 難易度調整パラメータ(先頭にまとめる)
const GRAPE = {
  RATE_MIN: 3, RATE_MAX: 5,           // 毎frameの発射数(乱数で変動)
  SPREAD_DEG: 80,                     // 下向き(90度)を中心とした扇の半角(度)。80=ほぼ真横まで
  SPEED_MIN: 1.2, SPEED_MAX: 2.8,     // 弾速の範囲(px/frame)。速度差で「房」が自然発生する
  BURST_INTERVAL_MIN: 30, BURST_INTERVAL_MAX: 60, // バースト発生間隔(frame、乱数タイミング)
  BURST_N_MIN: 8, BURST_N_MAX: 12,    // バースト1回あたりの発射数
  BURST_SPREAD_DEG: 5,                // バースト内の角度ばらつき(±度)
  PRESSURE_TARGET: 400,               // 画面内メイン弾(葡萄)の維持数下限
  R: 26,                              // 弾半径(自機当たり判定 player.r=1.5 の17倍以上)
  MOVE_INTERVAL: 90,                  // 発射源(敵機)がこの間隔で新しい移動目標を選ぶ(frame)
  MOVE_RANGE: 180,                    // 移動目標のX方向ばらつき(px)
  // 上安置のお仕置き弾: 葡萄は下向き散布のみなのでボスより上は構造的に安置になる。
  // そこに入った(=自機がボスの高さ+マージンより上にいる)間、超高速・高密度の自機狙い
  // 3wayを撃ち込み続ける。「入ったら確実に死ぬ」火力にして上への逃げ・時間切れ狙いの
  // ボス周回を封殺する(単発の自機狙いだと横タップ避けで凌げてしまうため、3way+角度と
  // 弾速のジッターで避けの隙間を潰す)
  PUNISH_MARGIN: 40,                  // 「上にいる」判定: player.y < boss.y + この値
  PUNISH_SPEED: 14,                   // 基準弾速(px/frame。モードのspeedMulが乗る→人間用14/AI用21)
  PUNISH_NWAY: 3,                     // 1回の発射数(自機狙い±PUNISH_SPREAD_DEGの扇)
  PUNISH_SPREAD_DEG: 7,               // 3wayの角度間隔(度)。横に逃げる先を先回りして塞ぐ
  PUNISH_R: 7,                        // お仕置き弾の半径(小さく速い。見た目は赤で警告色)
};
const GRAPE_SEED = 20260711;
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
// モード別パラメータ:
//   speedMul    弾速倍率(葡萄・お仕置き弾の両方に乗る)
//   pressureMul PRESSURE_TARGETの倍率(画面内維持数。1.25倍を超えると発射停止する上限も連動)
//   punishIv    上安置お仕置き弾の発射間隔(frame。人間用5/AI用3=毎秒36〜60発の弾幕壁)
// pressureMul 1.0(維持400/上限500)が回避可能な上限付近。1.7(維持680)は画面が隙間なく
// 埋まり切って回避不能になることを確認済みなので、それ以上は上げないこと
const GRAPE_MODE_HUMAN = { speedMul:1.0, pressureMul:0.8, punishIv:5 };
const GRAPE_MODE_AI    = { speedMul:1.5, pressureMul:1.0, punishIv:3 };
const grapeMode = ()=> game.diff===0 ? GRAPE_MODE_HUMAN : GRAPE_MODE_AI;

const grapeSpell = {
  name:"", hp:900, time:3600, spell:false,
  onStart(b){
    b.x=W/2; b.y=90; b.tx=W/2; b.ty=90;
    b.burstT=grng(GRAPE.BURST_INTERVAL_MIN, GRAPE.BURST_INTERVAL_MAX);
  },
  fire(b){
    const m = grapeMode();
    // 敵機(発射源)が画面上を動き回りながら散布する。下向き扇の「濃い帯」を横に移動させる
    if(b.t>0 && b.t%GRAPE.MOVE_INTERVAL===0) bossMove(b, GRAPE.MOVE_RANGE);
    // 圧力維持: 画面内の葡萄弾(半径がGRAPE.Rの弾)が閾値を下回っていたら発射数を底上げする。
    // 隙間はこの補正の結果ではなく、あくまで角度・速度の乱数の偶然によってのみ生まれる。
    // 閾値を大きく超えた時は新規発射を止めて自然減少を待つ(閾値を上限としても働かせる)
    const alive = eBullets.reduce((n,e)=> n + (e.r===GRAPE.R ? 1 : 0), 0);
    const target = GRAPE.PRESSURE_TARGET*m.pressureMul;
    let n = Math.round(grng(GRAPE.RATE_MIN, GRAPE.RATE_MAX));
    if(alive < target) n += 3;
    else if(alive > target*1.25) n = 0;
    // 葡萄本体: 下向き(90度)中心の広い扇にのみ散布する。ボスより上は撃たない(構造的な安置)
    for(let i=0;i<n;i++){
      grapeShot(b.x, b.y, 90+grapeBiasedOffset(GRAPE.SPREAD_DEG), m.speedMul);
    }
    // 房の強調: 乱数タイミングで同一角度付近へまとめ撃ち(速度はバラバラ→房状に自然分離)
    if(--b.burstT<=0){
      b.burstT = grng(GRAPE.BURST_INTERVAL_MIN, GRAPE.BURST_INTERVAL_MAX);
      const baseAng = 90+grapeBiasedOffset(GRAPE.SPREAD_DEG);
      const bn = Math.round(grng(GRAPE.BURST_N_MIN, GRAPE.BURST_N_MAX));
      for(let i=0;i<bn;i++){
        grapeShot(b.x, b.y, baseAng+grng(-GRAPE.BURST_SPREAD_DEG, GRAPE.BURST_SPREAD_DEG), m.speedMul);
      }
    }
    // 上安置お仕置き: 自機がボスの高さ付近より上(下向き扇の外)にいる間、超高速の自機狙い
    // 3wayを高頻度で撃ち込み続ける(確殺仕様)。角度・弾速の微ジッターで避けの隙間も潰す
    if(b.t>0 && player.y < b.y+GRAPE.PUNISH_MARGIN && b.t%m.punishIv===0){
      const base = aimAt(b.x,b.y);
      for(let k=0;k<GRAPE.PUNISH_NWAY;k++){
        const off = (k-(GRAPE.PUNISH_NWAY-1)/2)*GRAPE.PUNISH_SPREAD_DEG + grng(-2,2);
        shot(b.x, b.y, base+off*DEG, GRAPE.PUNISH_SPEED*m.speedMul*grng(0.9,1.1),
             {color:"#ff4a5a", edge:"#ffd0d6", r:GRAPE.PUNISH_R});
      }
    }
  },
};

const GRAPE_DIALOG_PRE = [
  {who:"棗みその", text:"次は君に任せたいんだ", center:true, size:19},
  {who:"棗みその", text:"君ならできるよ", center:true, size:19},
  {who:"棗みその", text:"ほら、しっかり", center:true, size:19},
];
const GRAPE_DIALOG_POST_HUMAN = [
  {who:"棗みその", text:"あら、思ったよりやるじゃない"},
];
const GRAPE_DIALOG_POST_AI = [
  {who:"棗みその", text:"E381BEE381A0E381BEE381A0E69CACE6B097E587BAE38197E381A6E381AAE38184E38191E381A9E381AD"},
];

const grapeRoute = {
  name:"君ならできるよ（笑）",
  diffOptions: [
    {name:"人間用"},
    {name:"AI用"},
  ],
  buildStage(){ at(1, startDialogue); }, // 道中なし。いきなりボス会話から
  bossBarrierOnInvul: true,
  bgm: "SINGULARITY",
  demoLabel: "ASIデモプレイ(人間の限界を超えろ！)",
  demoDiff: 1, // AI用
  demoPlayerSprite,
  demoEndWho: "棗みその",
  demoEndText: "E6 9C 9F E5 BE 85 E3 81 97 E3 81 A6 E3 82 8B E3 82 8F E3 82 88 EF BC 9F",
  demoReplayText: "ASIデモプレイを自動リプレイ",
  dialogPre: GRAPE_DIALOG_PRE,
  get dialogPost(){ return game.diff===0 ? GRAPE_DIALOG_POST_HUMAN : GRAPE_DIALOG_POST_AI; },
  boss: {
    name: "棗みその",
    spells: [grapeSpell],
    sprite: bossSprite,
    cutIn: IMG.MISONO_PORTRAIT, // スペカ名なし(spell:false)なのでカットインは出ない
    dialog: set => set==="post" && game.diff===0
      ? {img:IMG.MISONO_DEFEATED_PORTRAIT, scale:1.18, margin:-22, bottom:-60, solo:true, center:true}
      : {img:IMG.MISONO_PORTRAIT,          scale:1.00, margin:-22, bottom:58,  solo:true, center:true},
  },
};

registerScenario({
  name:"シンギュラリティ", // サブタイトルなし(選択カードもタイトルのみ)
  routes: [washingMachineRoute, grapeRoute],
});

})();
