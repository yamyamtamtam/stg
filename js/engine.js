"use strict";
//======================================================================
// 基本セットアップ
//======================================================================

//--- BGM(タイトル〜チュートリアル / 道中 / ボス戦。ボス戦はみそのとオタサーの姫で共通) ---
// BGMはSE(Web Audio)より控えめにしてSEが埋もれないようにする。
// BGM_SRC(js/gen/audio.js)の全キーを自動でAudio化し BGM.<キー> で参照する
const BGM_VOLUME = 0.26;
const BGM = {};
for(const k in BGM_SRC){
  const a = new Audio(); a.src = BGM_SRC[k]; a.loop = true; a.volume = BGM_VOLUME;
  BGM[k] = a;
}
let currentBgm = null;
function playBgm(track){
  if(currentBgm !== track){
    if(currentBgm) currentBgm.pause();
    currentBgm = track;
    if(track) track.currentTime = 0;
  }
  // 初回はジェスチャー前でplay()が拒否されうるので、実際に鳴るまで毎フレーム再試行する
  if(track && track.paused) track.play().catch(()=>{});
}
// state/ボスの有無からその場面のBGMを決めて切り替える(タイトル〜チュートリアルは共通、プレイ中は道中/ボス戦を自動切替)。
// シナリオが bgm:"キー名" を定義していると、会話パート〜ボス撃破(会話含む)はその曲に差し替わる
function updateBgm(){
  if(INTRO_ORDER.includes(game.state)){ playBgm(BGM.TITLE); return; }
  if(game.state==="play"){
    const sb = curScenario() && curScenario().bgm;
    if(sb && (boss || game.dialog || game.demo)){ playBgm(BGM[sb]); return; }
    playBgm(boss ? BGM.BOSS : BGM.STAGE);
    return;
  }
  playBgm(null);
}

//--- 太陽弾(自機)スプライト ---
function makeSun(r, core, rim){
  const pad=5, size=Math.ceil((r+pad)*2);
  const c=document.createElement("canvas"); c.width=c.height=size;
  const g=c.getContext("2d"); g.translate(size/2,size/2);
  g.fillStyle=rim;
  for(let i=0;i<8;i++){ g.save(); g.rotate(i*Math.PI/4); g.fillRect(-1.3,-(r+3.5),2.6,4.5); g.restore(); }
  g.beginPath(); g.arc(0,0,r,0,Math.PI*2); g.fill();
  g.fillStyle=core; g.beginPath(); g.arc(0,0,r*0.6,0,Math.PI*2); g.fill();
  return c;
}
const sunMain = makeSun(5.5,"#fff6cc","#ffb64a");
const sunOpt  = makeSun(3.8,"#ffedb0","#ff9a3a");

//--- 三日月弾(ボス)スプライト: 色ごとにキャッシュ ---
const moonCache = new Map();
function moonSprite(color, r){
  const key = color+"|"+r;
  let c = moonCache.get(key); if(c) return c;
  const pad=3, size=Math.ceil((r+pad)*2);
  c=document.createElement("canvas"); c.width=c.height=size;
  const g=c.getContext("2d"); g.translate(size/2,size/2);
  g.fillStyle="#ffffff"; g.beginPath(); g.arc(0,0,r,0,Math.PI*2); g.fill();
  g.fillStyle=color;     g.beginPath(); g.arc(0,0,r*0.8,0,Math.PI*2); g.fill();
  g.globalCompositeOperation="destination-out";
  g.beginPath(); g.arc(r*0.55,0,r*0.78,0,Math.PI*2); g.fill();
  moonCache.set(key,c); return c;
}
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const W = cv.width, H = cv.height;
const TAU = Math.PI * 2;
const rand = (a,b)=>a+Math.random()*(b-a);
const clamp = (v,a,b)=>v<a?a:v>b?b:v;

//----------------------------------------------------------------------
// SE(Web Audio APIによる8bit風プロシージャル合成。音源ファイル不要)
//----------------------------------------------------------------------
let actx = null;
function ensureAudio(){
  if(!actx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    actx = new AC();
  }
  if(actx.state==="suspended") actx.resume();
  return actx;
}
// 矩形波/三角波の短音。freqEnd指定でピッチが滑らかに変化(8bit機のポルタメント風)
function seTone(freq, dur, opt={}){
  const ac = ensureAudio(); if(!ac) return;
  const t0 = ac.currentTime + (opt.delay||0);
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.type = opt.wave || "square";
  osc.frequency.setValueAtTime(freq, t0);
  if(opt.freqEnd!=null) osc.frequency.exponentialRampToValueAtTime(Math.max(1,opt.freqEnd), t0+dur);
  const vol = opt.vol ?? 0.15;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
// ノイズバースト(被弾/爆発/ボム用)。減衰ホワイトノイズ+任意フィルタ
function seNoise(dur, opt={}){
  const ac = ensureAudio(); if(!ac) return;
  const t0 = ac.currentTime + (opt.delay||0);
  const n = Math.max(1, Math.floor(ac.sampleRate*dur));
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * (1-i/n)**1.5;
  const src = ac.createBufferSource(); src.buffer = buf;
  const gain = ac.createGain();
  const vol = opt.vol ?? 0.15;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  let node = src;
  if(opt.filterFreq){
    const filt = ac.createBiquadFilter();
    filt.type = opt.filterType || "lowpass";
    filt.frequency.value = opt.filterFreq;
    node.connect(filt); node = filt;
  }
  node.connect(gain).connect(ac.destination);
  src.start(t0);
}
const seShot        = ()=> seTone(880, 0.06, {wave:"square", freqEnd:640, vol:0.10});
const seEnemyPop     = ()=>{ seTone(320, 0.11, {wave:"square", freqEnd:70, vol:0.19}); seNoise(0.08, {vol:0.13, filterFreq:2200, filterType:"bandpass"}); };
const seHit          = ()=>{ seNoise(0.22, {vol:0.32, filterFreq:900, filterType:"lowpass"}); seTone(160, 0.22, {wave:"sawtooth", freqEnd:50, vol:0.20}); };
const seBomb         = ()=>{ seTone(90, 0.7, {wave:"sawtooth", freqEnd:760, vol:0.24}); seNoise(0.7, {vol:0.18, filterFreq:1400, filterType:"lowpass"}); };
const seItem         = ()=>{ seTone(660, 0.08, {wave:"square", vol:0.14}); seTone(990, 0.11, {wave:"square", vol:0.14, delay:0.06}); };
const seGraze        = ()=> seTone(1500, 0.03, {wave:"square", vol:0.055});
const seMenuMove     = ()=> seTone(440, 0.045, {wave:"square", vol:0.11});
const seMenuConfirm  = ()=>{ seTone(660, 0.05, {wave:"square", vol:0.14}); seTone(880, 0.07, {wave:"square", vol:0.14, delay:0.05}); };

//----------------------------------------------------------------------
// 入力
//----------------------------------------------------------------------
const keys = {};
addEventListener("keydown", e=>{
  updateBgm(); // 最初のユーザー操作(ジェスチャー)でBGM再生を許可させる
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Shift"].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
  // デモ中はZ/Escでタイトルへ戻るのみ受け付ける
  if(game.demo && game.state==="play"){
    if(!e.repeat && (e.key==="z"||e.key==="Z"||e.key==="Escape")) demoExit();
    return;
  }
  if(e.key==="Escape") togglePause();
  if(game.dialog && !e.repeat && (e.key==="z"||e.key==="Z")){ advanceDialog(); return; }
  if(game.state==="difficulty" && !e.repeat && (e.key==="ArrowUp"||e.key==="ArrowDown")){
    // 最下段の難易度からさらに↓でデモボタン(あれば)にフォーカスが移る
    if(e.key==="ArrowDown"){
      if(!game.demoFocus && game.diff===diffCount()-1 && demoChip()) game.demoFocus=true;
      else if(!game.demoFocus) game.diff = clamp(game.diff+1, 0, diffCount()-1);
    }else{
      if(game.demoFocus) game.demoFocus=false;
      else game.diff = clamp(game.diff-1, 0, diffCount()-1);
    }
    seMenuMove();
  }
  if(game.state==="difficulty" && game.demoFocus && !e.repeat && (e.key==="z"||e.key==="Z")){
    seMenuConfirm(); startDemo(); return;
  }
  if(game.state==="scenario" && !e.repeat && (e.key==="ArrowUp"||e.key==="ArrowDown")){
    game.scenario = clamp(game.scenario + (e.key==="ArrowDown"?1:-1), 0, SCENARIOS.length-1);
    seMenuMove();
  }
  if((game.state==="over"||game.state==="clear") && !e.repeat && (e.key==="ArrowUp"||e.key==="ArrowDown")){
    game.endSel = clamp(game.endSel + (e.key==="ArrowDown"?1:-1), 0, END_CHIPS.length-1);
    seMenuMove();
  }
  if(INTRO_ORDER.includes(game.state) && !e.repeat && (e.key==="z"||e.key==="Z")){ introAdvance(); return; }
  if((game.state==="over"||game.state==="clear") && !e.repeat && (e.key==="z"||e.key==="Z")){
    seMenuConfirm();
    if(game.endSel===0) startGame(); else backToTitle();
  }
});
addEventListener("keyup", e=> keys[e.key]=false);

//--- タッチ操作(スマホ): ドラッグで移動 / ダブルタップでボム / 2本指で低速 ---
const IS_TOUCH = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;
const touch = {active:false, slow:false, bomb:false, dx:0, dy:0, lastTap:0, lx:0, ly:0};
// canvasはobject-fit:containで表示されるため、CSSボックスと実際の描画領域がズレる(上下/左右に余白ができる)。
// クライアント座標→canvas座標の変換はそのズレを差し引く必要がある。
function clientToCanvas(clientX, clientY){
  const rect = cv.getBoundingClientRect();
  const scale = Math.min(rect.width/W, rect.height/H);
  const offX = rect.left + (rect.width - W*scale)/2;
  const offY = rect.top + (rect.height - H*scale)/2;
  return { x:(clientX-offX)/scale, y:(clientY-offY)/scale, scale };
}
cv.addEventListener("touchstart", e=>{
  updateBgm(); // 最初のユーザー操作(ジェスチャー)でBGM再生を許可させる
  e.preventDefault();
  const t=e.touches[0];
  touch.lx=t.clientX; touch.ly=t.clientY;
  touch.active=true;
  touch.slow = e.touches.length>=2;
  // デモ中はどこをタップしてもタイトルへ戻る
  if(game.demo && game.state==="play"){
    demoExit(); touch.active=false; touch.lastTap=0; return;
  }
  if(game.state!=="play"){
    if(game.state==="difficulty"){
      const {x:cx,y:cy} = clientToCanvas(t.clientX, t.clientY);
      const dc = demoChip();
      if(dc && cx>=dc.x&&cx<=dc.x+dc.w&&cy>=dc.y&&cy<=dc.y+dc.h){ seMenuConfirm(); startDemo(); touch.lastTap=0; return; }
      const chip=diffChips().find(c=>cx>=c.x&&cx<=c.x+c.w&&cy>=c.y&&cy<=c.y+c.h);
      if(chip){ game.diff=chip.i; introAdvance(); touch.lastTap=0; return; } // 難易度をタップしたら即次の画面へ
    }
    if(game.state==="scenario"){
      const {x:cx,y:cy} = clientToCanvas(t.clientX, t.clientY);
      const chip=SCENARIO_CHIPS.find(c=>cx>=c.x&&cx<=c.x+c.w&&cy>=c.y&&cy<=c.y+c.h);
      if(chip){ game.scenario=chip.i; introAdvance(); touch.lastTap=0; return; } // シナリオをタップしたら即次の画面へ
    }
    if(INTRO_ORDER.includes(game.state)){ introAdvance(); touch.lastTap=0; return; }
    if(game.state==="over"||game.state==="clear"){
      // エンドメニュー(もう一度やる/タイトルに戻る)のボタンタップのみ反応
      const {x:cx,y:cy} = clientToCanvas(t.clientX, t.clientY);
      const chip=END_CHIPS.find(c=>cx>=c.x&&cx<=c.x+c.w&&cy>=c.y&&cy<=c.y+c.h);
      if(chip){ seMenuConfirm(); if(chip.i===0) startGame(); else backToTitle(); }
      touch.lastTap=0; return;
    }
    seMenuConfirm(); startGame(); touch.lastTap=0; return;
  }
  if(game.dialog){ advanceDialog(); touch.lastTap=0; return; }
  const now=performance.now();
  if(now-touch.lastTap<280){ touch.bomb=true; touch.lastTap=0; }
  else touch.lastTap=now;
},{passive:false});
cv.addEventListener("touchmove", e=>{
  e.preventDefault();
  const t=e.touches[0];
  const { scale } = clientToCanvas(t.clientX, t.clientY);
  touch.dx += (t.clientX-touch.lx)/scale*1.15;
  touch.dy += (t.clientY-touch.ly)/scale*1.15;
  touch.lx=t.clientX; touch.ly=t.clientY;
  touch.slow = e.touches.length>=2;
},{passive:false});
cv.addEventListener("touchend", e=>{
  e.preventDefault();
  if(e.touches.length===0){ touch.active=false; touch.slow=false; }
  else touch.slow = e.touches.length>=2;
},{passive:false});

//----------------------------------------------------------------------
// ゲーム全体の状態
//----------------------------------------------------------------------
const game = {
  state:"title",       // title | scenario | difficulty | playerinfo | tutorial | play | over | clear
  paused:false,
  frame:0,
  score:0, hi:0,
  scroll:0,
  shake:0,
  diff:1,               // 難易度: 0=EASY 1=NORMAL 2=HARD 3=LUNATIC
  scenario:0,           // シナリオ: 0=ホモガキミームの海 1=オタサーの森
  tutIdx:0, tutTimer:0,  // 操作チュートリアル(自動再生)の進行
  overPending:false,     // ゲームオーバー会話が進行中/予約済み(ボス撃破会話に上書きされないようにする)
  endSel:0,              // クリア/ゲームオーバー画面のメニュー選択: 0=もう一度やる 1=タイトルに戻る
  demo:false,            // ASIデモプレイ中(回避AIが操作。タップ/Zでタイトルへ)
  demoEnd:null,          // デモ撃破後の画面 {t}(セリフ→自動リプレイ)
  demoFocus:false,       // 難易度選択画面でデモボタンにフォーカスしているか
};

//--- 難易度設定(4段階): 弾速よりも弾密度/パターン数・敵HP・初期残機/ボム数で調整 ---
const DIFF_NAMES        = ["EASY","NORMAL","HARD","LUNATIC"];
const DIFF_SUBTITLE     = ["インターネット初心者","SNS中毒者","ドパガキ","手遅れ"];
const DIFF_BULLET_SPEED = [0.9,   1.0,     1.05,  1.1];  // 弾速は控えめに
const DIFF_DENSITY      = [0.6,   1.0,     1.35,  1.75]; // nway/ring等の弾数倍率
const DIFF_HP           = [0.7,   1.0,     1.3,   1.7];
const DIFF_LIVES        = [4,     3,       2,     2];
const DIFF_BOMBS        = [4,     3,       2,     1];
// 難易度選択画面の選択カード(縦一列。タッチ当たり判定と描画で共有)
const DIFF_ROW_H = 56, DIFF_ROW_GAP = 10;
const DIFF_CHIPS = DIFF_NAMES.map((name,i)=>({
  name, i, w:320, h:DIFF_ROW_H,
  x: (W-320)/2,
  y: (H/2 - ((DIFF_ROW_H+DIFF_ROW_GAP)*DIFF_NAMES.length-DIFF_ROW_GAP)/2) + i*(DIFF_ROW_H+DIFF_ROW_GAP),
}));
// シナリオが diffOptions([{name, sub}, ...])を定義していると難易度選択がその内容に差し替わる
// (例: シナリオ4の人間用/AI用二択)。game.diff はその配列のインデックスになり、
// DIFF_BULLET_SPEED 等の共通テーブルも同じインデックスで引かれる
function diffOptions(){
  const sc = SCENARIOS[game.scenario];
  return (sc && sc.diffOptions) || null;
}
function diffCount(){ const o = diffOptions(); return o ? o.length : DIFF_NAMES.length; }
function diffChips(){
  const o = diffOptions();
  if(!o) return DIFF_CHIPS;
  return o.map((d,i)=>({
    name:d.name, sub:d.sub, i, w:320, h:DIFF_ROW_H,
    x: (W-320)/2,
    y: (H/2 - ((DIFF_ROW_H+DIFF_ROW_GAP)*o.length-DIFF_ROW_GAP)/2) + i*(DIFF_ROW_H+DIFF_ROW_GAP),
  }));
}
// シナリオが demoLabel を定義していると難易度選択の下にデモプレイボタンが出る(シナリオ4のASIデモ)
function demoChip(){
  const sc = SCENARIOS[game.scenario];
  if(!sc || !sc.demoLabel) return null;
  const chips = diffChips();
  const bottom = chips[chips.length-1].y + chips[0].h;
  return {x:(W-220)/2, y:bottom+16, w:220, h:40};
}

// クリア/ゲームオーバー画面のメニュー(縦一列。タッチ当たり判定と描画で共有)
const END_MENU = ["もう一度やる","タイトルに戻る"];
const END_ROW_H = 44, END_ROW_GAP = 10, END_ROW_W = 220;
const END_CHIPS = END_MENU.map((name,i)=>({
  name, i, w:END_ROW_W, h:END_ROW_H,
  x: (W-END_ROW_W)/2,
  y: H/2 + 4 + i*(END_ROW_H+END_ROW_GAP),
}));
function backToTitle(){
  game.state="title";
  comments=[]; commentTimer=0; // タイトルの流れコメントを初期化
}

//----------------------------------------------------------------------
// 開幕演出: タイトル→シナリオ選択→難易度選択→自機紹介→操作チュートリアル
//----------------------------------------------------------------------
const INTRO_ORDER = ["title","scenario","difficulty","playerinfo","tutorial"];
// シナリオレジストリ: js/scenarios/*.js が registerScenario() で自分を登録する。
// 契約: {name, sub, buildStage(), dialogPre, dialogPost,
//        boss:{name, spells, sprite(b), cutIn, dialog(set)}}
// spells の各要素: {name, hp, time, spell, fire(b)} + 任意で onStart(b)(フェーズ開始時) /
// checkAdvance(b)(trueを返すとHP残でもフェーズ遷移。召喚全滅で発狂など)
const SCENARIOS = [];
function registerScenario(sc){ SCENARIOS.push(sc); }
function curScenario(){ return SCENARIOS[game.scenario]; }
// demo: チュートリアル中に自機を自動操作して見せる実演の種類
const TUTORIAL_STEPS_KB = [
  {key:"矢印キー", desc:"移動", demo:"move"},
  {key:"Z", desc:"ショット / 決定・会話送り", demo:"shot"},
  {key:"X", desc:"陽符(ボム)", demo:"bomb"},
  {key:"Shift", desc:"低速移動(当たり判定表示)", demo:"slow"},
];
const TUTORIAL_STEPS_TOUCH = [
  {key:"ドラッグ", desc:"移動(自動ショット)", demo:"move"},
  {key:"ダブルタップ", desc:"ボム", demo:"bomb"},
  {key:"2本指タッチ", desc:"低速移動", demo:"slow"},
  {key:"タップ", desc:"スタート・会話送り", demo:"shot"},
];
function introAdvance(){
  const idx = INTRO_ORDER.indexOf(game.state);
  if(idx===-1) return;
  seMenuConfirm();
  if(idx===INTRO_ORDER.length-1){ keys["Shift"]=false; startGame(); return; }
  game.state = INTRO_ORDER[idx+1];
  if(game.state==="difficulty"){ game.diff = clamp(game.diff, 0, diffCount()-1); game.demoFocus=false; } // シナリオ専用難易度は選択肢数が違う
  if(game.state==="tutorial"){ game.tutIdx=0; game.tutTimer=0; resetTutorialDemoStep(); }
}
function resetTutorialDemoStep(){
  player.x=W/2; player.y=H-80; player.dir=0; player.bombTime=0;
  pBullets.length=0;
  keys["Shift"]=false;
}

//--- タイトル画面のニコニコ動画風流れコメント ---
const COMMENT_POOL = [
  "888888888","うらら可愛い","みそのちゃん今日も辛口","初見です","この動画好き",
  "wwwwwwwww","2145514","乙です","キタ━━━━(゚∀゚)━━━━!!","うぽつ",
  "かわいい","912","こマ?","ファッ!?","おっつおっつ","陽キャで草","解説乙",
];
let comments = [], commentTimer = 0;
function spawnComment(){
  comments.push({
    text: COMMENT_POOL[Math.floor(rand(0,COMMENT_POOL.length))],
    y: rand(24, H-40), x: W+20, speed: rand(1.2,3.4),
    color: ["#ffffff","#ffd76e","#7ee6a0","#ff8ab0","#8ad4ff"][Math.floor(rand(0,5))],
    size: Math.floor(rand(12,18)),
  });
}
function updateIntro(){
  if(game.state==="title"){
    if(--commentTimer<=0){ spawnComment(); commentTimer=rand(20,45); }
    for(const c of comments) c.x -= c.speed;
    comments = comments.filter(c=>c.x > -260);
  }
  if(game.state==="tutorial"){
    const steps = IS_TOUCH ? TUTORIAL_STEPS_TOUCH : TUTORIAL_STEPS_KB;
    updateTutorialDemo();
    if(++game.tutTimer > 150){
      game.tutTimer=0; game.tutIdx++;
      if(game.tutIdx>=steps.length){ keys["Shift"]=false; startGame(); }
      else resetTutorialDemoStep();
    }
  }
}

// チュートリアル各項目を自機の自動操作で実演する
function updateTutorialDemo(){
  const steps = IS_TOUCH ? TUTORIAL_STEPS_TOUCH : TUTORIAL_STEPS_KB;
  const demo = steps[game.tutIdx % steps.length].demo;
  const t = game.tutTimer;

  if(demo==="move"){
    player.x = clamp(W/2 + Math.sin(t*0.06)*70, 12, W-12);
    player.dir = Math.cos(t*0.06)>=0 ? 1 : -1;
    player.slowLerp += (0-player.slowLerp)*0.2;
  }else if(demo==="shot"){
    player.dir = 0;
    player.slowLerp += (0-player.slowLerp)*0.2;
    if(t%6===0){
      const n=5;
      for(let i=0;i<n;i++){
        const off = i/(n-1)-0.5;
        const a = -Math.PI/2 + off*0.6;
        pBullets.push({x:player.x+off*16, y:player.y-10, vx:Math.cos(a)*6, vy:Math.sin(a)*6, dmg:0, r:i===2?4:3, type:i===2?"main":"opt"});
      }
    }
  }else if(demo==="bomb"){
    player.dir = 0;
    player.slowLerp += (0-player.slowLerp)*0.2;
    if(t===0) player.bombTime=120;
    if(player.bombTime>0) player.bombTime--;
  }else{ // slow
    player.x = clamp(W/2 + Math.sin(t*0.05)*20, 12, W-12);
    player.dir = 0;
    keys["Shift"] = true;
    player.slowLerp += (1-player.slowLerp)*0.15;
  }
  if(demo!=="slow") keys["Shift"]=false;

  for(const b of pBullets){ b.x+=b.vx; b.y+=b.vy; }
  pBullets = pBullets.filter(b=>b.y>-30 && b.y<H+30 && b.x>-30 && b.x<W+30);
}

const player = {
  x:W/2, y:H-80, r:2.5, grazeR:16,
  speed:4.0, slowSpeed:1.8,
  lives:3, bombs:3, power:1, slowLerp:0,
  invul:0, bombTime:0,
  shotCd:0, alive:true, respawn:0,
  dir:0,                              // 移動方向(-1左/0直立/1右): 傾き差分スプライット選択用
};

let pBullets=[], eBullets=[], enemies=[], items=[], effects=[], boss=null, cutIn=null;
let grazeSoundFrame = -1; // 同一フレームで複数グレイズしても音は1回だけ鳴らす

//======================================================================
// エフェクト
//======================================================================
function burst(x,y,color,n=12,spd=3){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), s=rand(spd*.3,spd);
    effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(15,30),max:30,color,r:rand(1.5,3.5)});
  }
}
function popText(x,y,text,color="#ffd76e"){
  effects.push({x,y,vx:0,vy:-0.7,life:40,max:40,color,text});
}

//======================================================================
// 敵弾ヘルパー
//======================================================================
function shot(x,y,angle,speed,opt={}){
  speed *= DIFF_BULLET_SPEED[game.diff];
  const digit = opt.seq ? DIGIT_SEQ[digitIdx++ % DIGIT_SEQ.length] : null;
  eBullets.push({
    x,y, angle, speed,
    vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
    r: digit ? Math.max(opt.r ?? 4, 6.5) : (opt.r ?? 4), // 数字弾は視認性のため一回り大きく
    color: opt.color ?? "#ff6e9c",
    edge: opt.edge ?? "#fff",
    accel: opt.accel ?? 0,
    turn: opt.turn ?? 0,
    moon: opt.moon ?? false,
    digit,
    word: opt.word ?? null,
    sprite: opt.sprite ?? null,  // canvas/Imageをそのまま弾として描く(コイン・チケット等)
    spin: opt.spin ?? 0,         // sprite弾の回転速度(0なら進行方向を向く)
    grazed:false, t:0,
    update: opt.update ?? null,  // 指定すると毎フレームこれだけで動く(通常の直進の代わり。ボス周回のデコ弾等)
  });
}
const aimAt = (x,y)=>Math.atan2(player.y-y, player.x-x);
const DIGIT_SEQ = ["1","1","4","5","1","4"]; let digitIdx=0;

// n-way弾
function nway(x,y,center,n,spread,speed,opt){
  n = Math.max(1, Math.round(n * DIFF_DENSITY[game.diff]));
  for(let i=0;i<n;i++){
    const a = center + (n>1 ? (i/(n-1)-0.5)*spread : 0);
    shot(x,y,a,speed,opt);
  }
}
// 全方位リング
function ring(x,y,n,speed,offset=0,opt){
  n = Math.max(3, Math.round(n * DIFF_DENSITY[game.diff]));
  for(let i=0;i<n;i++) shot(x,y,offset+i/n*TAU,speed,opt);
}

//======================================================================
// 敵
//======================================================================
function spawnEnemy(def){
  const hp = (def.hp ?? 10) * DIFF_HP[game.diff];
  enemies.push(Object.assign({
    x:0,y:0,hp:10,r:12,t:0,score:100,dropPow:1,dropPoint:1,
    color:"#8ad4ff", dead:false,
  }, def, {hp}));
}

// 雑魚の行動パターン集
const zakoAI = {
  // 上から降りて停止→撃って離脱
  diver(e){
    if(e.t<60) e.y+=2.2;
    else if(e.t===70||e.t===85||e.t===100){
      nway(e.x,e.y,aimAt(e.x,e.y),3,0.5,2.4,{seq:true,color:"#8ad4ff"});
    }
    else if(game.diff>=2 && (e.t===77||e.t===92||e.t===107)){
      shot(e.x,e.y,aimAt(e.x,e.y),3.0,{seq:true,color:"#ff9de0",r:4}); // HARD+: 単発弾を挟んでパターンを密に
    }
    else if(e.t>130){ e.y-=1.6; e.x+=e.exitDir*1.2; }
  },
  // 横切りつつ自機狙い
  crosser(e){
    e.x += e.vx; e.y += Math.sin(e.t*0.05)*0.8;
    if(e.t%45===20) shot(e.x,e.y,aimAt(e.x,e.y),2.8,{seq:true,color:"#ffb14d",r:5});
    if(game.diff>=2 && e.t%45===35) nway(e.x,e.y,aimAt(e.x,e.y),3,0.4,2.6,{seq:true,color:"#ffb14d",r:4}); // HARD+: 追加の3way
  },
  // 蛇行して降りてリング弾
  swirler(e){
    e.y += 1.3; e.x += Math.sin(e.t*0.06)*2;
    if(e.t%70===40) ring(e.x,e.y,14,1.6,rand(0,TAU),{seq:true,color:"#b78aff",r:4});
    if(game.diff>=2 && e.t%70===10) nway(e.x,e.y,aimAt(e.x,e.y),3,0.5,2.2,{seq:true,color:"#b78aff",r:4}); // HARD+: 自機狙いも追加
  },
};

//======================================================================
// ステージ・タイムライン
//======================================================================
let timeline=[], tlIndex=0, stageT=0;
function at(f,fn){ timeline.push({f,fn}); }

function buildStage(){
  timeline=[]; tlIndex=0; stageT=0;
  curScenario().buildStage();
}

//======================================================================
// 会話パート(ボス戦前・ボス撃破後)
//======================================================================
const DIALOG_OVER = [
  {who:"うらら", text:"悔しい〜〜"},
];
function startDialogue(){
  game.dialog = {idx:0, set:"pre"};
  eBullets.length=0; pBullets.length=0;
}
function startDialogueAfter(){
  game.dialog = {idx:0, set:"post"};
  eBullets.length=0; pBullets.length=0;
}
function startDialogueOver(){
  game.dialog = {idx:0, set:"over"};
  eBullets.length=0; pBullets.length=0;
}
function dialogList(){
  if(game.dialog.set==="post") return curScenario().dialogPost;
  if(game.dialog.set==="over") return DIALOG_OVER;
  return curScenario().dialogPre;
}
function advanceDialog(){
  if(!game.dialog) return;
  const list = dialogList();
  game.dialog.idx++;
  if(game.dialog.idx>=list.length){
    const set = game.dialog.set;
    game.dialog=null;
    if(set==="post"){ if(game.state==="play"){ game.state="clear"; game.endSel=0; } }
    else if(set==="over"){ game.state="over"; game.endSel=0; }
    else spawnBoss();
  }
}

//======================================================================
// ボス
//======================================================================
function spawnBoss(){
  boss = {
    x:W/2, y:-60, tx:W/2, ty:120, r:20, t:0,
    phase:-1, hp:0, maxHp:1, spellTime:0, spellMax:0,
    name: curScenario().boss.name,
    dead:false, moveT:0, dir:0, dmgMult:1, enraged:false,
  };
  nextPhase();
}
function curSpells(){ return curScenario().boss.spells; }
function bossMove(b, range=120){
  b.tx = clamp(b.x + rand(-range,range), 60, W-60);
  b.ty = clamp(120 + rand(-40,40), 70, 200);
}

function nextPhase(){
  if(!boss) return;
  boss.phase++;
  const list = curSpells();
  if(boss.phase >= list.length){ bossDefeated(); return; }
  const sp = list[boss.phase];
  boss.hp = boss.maxHp = sp.hp * DIFF_HP[game.diff];
  boss.spellMax = boss.spellTime = sp.time;
  boss.t = -60; // 登場/切替の待ち
  boss.dmgMult = 1;
  eBullets.length = 0; // 弾消し
  enemies = enemies.filter(e=>!e.zType); // 前フェーズの召喚キャラ(チー牛/豚)を消す
  burst(boss.x,boss.y,"#ffd76e",30,5);
  if(sp.spell) cutIn = {t:0, dur:150, name:sp.name, img: curScenario().boss.cutIn, side:"right"};
  boss.tx=W/2; boss.ty=120;
  if(sp.onStart) sp.onStart(boss);
}

function bossDefeated(){
  burst(boss.x,boss.y,"#ffd76e",60,7);
  burst(boss.x,boss.y,"#ff6e9c",60,5);
  game.shake=20; seEnemyPop();
  addScore(50000);
  for(let i=0;i<12;i++) items.push(makeItem(boss.x+rand(-40,40), boss.y+rand(-30,30), i<4?"pow":"point"));
  boss=null;
  eBullets.length=0;
  enemies = enemies.filter(e=>!e.zType); // 残ったチー牛/豚を消す
  setTimeout(()=>{
    if(game.state!=="play" || game.overPending) return;
    if(game.demo) game.demoEnd = {t:0}; // デモ撃破後はみそののセリフ→自動リプレイ
    else startDialogueAfter();
  }, 2200);
}

//======================================================================
// アイテム
//======================================================================
function makeItem(x,y,type){
  return {x,y,vy:-2.2,type,r:7,t:0};
}
function dropItems(e){
  for(let i=0;i<(e.dropPow||0);i++) items.push(makeItem(e.x+rand(-10,10),e.y,"pow"));
  for(let i=0;i<(e.dropPoint||0);i++) items.push(makeItem(e.x+rand(-10,10),e.y,"point"));
}

//======================================================================
// スコア/UI
//======================================================================
function addScore(v){
  game.score+=v;
  if(game.score>game.hi) game.hi=game.score;
}
function updateUI(){
  document.getElementById("uiScore").textContent = game.score.toLocaleString();
  document.getElementById("uiHi").textContent = game.hi.toLocaleString();
  document.getElementById("uiLives").textContent = "★".repeat(Math.max(0,player.lives));
  document.getElementById("uiBombs").textContent = "✦".repeat(Math.max(0,player.bombs));
  document.getElementById("uiPower").textContent = player.power.toFixed(2)+" / 4.00";
  document.getElementById("powfill").style.width = (player.power/4*100)+"%";
  document.getElementById("uiGraze").textContent = game.graze||0;
}

//======================================================================
// プレイヤー処理
//======================================================================
function updatePlayer(){
  if(!player.alive){
    if(--player.respawn<=0){
      player.alive=true; player.x=W/2; player.y=H-60; player.invul=180;
    }
    return;
  }
  // 入力: 通常はキー/タッチ、デモ中は回避AIが操作(常に低速・ボムなし・オートショット)
  let slow, dx=0, dy=0;
  if(game.demo){
    const m = demoDodge();
    dx=m.dx; dy=m.dy; slow=true;
  }else{
    slow = keys["Shift"] || touch.slow;
    if(keys["ArrowLeft"])dx--; if(keys["ArrowRight"])dx++;
    if(keys["ArrowUp"])dy--;   if(keys["ArrowDown"])dy++;
  }
  player.slowLerp += ((slow?1:0)-player.slowLerp)*0.18;
  const sp = slow ? player.slowSpeed : player.speed;
  if(dx&&dy){dx*=0.7071;dy*=0.7071;}
  player.x=clamp(player.x+dx*sp, 12, W-12);
  player.y=clamp(player.y+dy*sp, 12, H-12);
  let hIn = dx;
  if(!game.demo && (touch.dx||touch.dy)){
    player.x=clamp(player.x+touch.dx, 12, W-12);
    player.y=clamp(player.y+touch.dy, 12, H-12);
    hIn = touch.dx;
    touch.dx=0; touch.dy=0;
  }
  player.dir = hIn>0.3 ? 1 : hIn<-0.3 ? -1 : 0; // 移動方向: 傾き差分スプライット選択用
  if(player.invul>0)player.invul--;
  if(player.bombTime>0)player.bombTime--;
  if(player.shotCd>0)player.shotCd--;

  // ショット: パワー(取得したPアイテム量)で扇状に本数・角度が拡大
  if(!game.dialog && (game.demo||keys["z"]||keys["Z"]||touch.active) && player.shotCd<=0){
    player.shotCd=4;
    seShot();
    const tiers = Math.floor(player.power);              // 0..4
    const n = 1 + tiers*2;                               // 1,3,5,7,9本の扇
    const spread = (slow?0.35:1.0) * (0.22 + player.power*0.13); // 低速時は収束
    for(let i=0;i<n;i++){
      const off = n>1 ? (i/(n-1)-0.5)*2 : 0;             // -1..+1
      const a = -Math.PI/2 + off*spread;
      const main = i===(n-1)/2;
      pBullets.push({
        x:player.x+off*8, y:player.y-10,
        vx:Math.cos(a)*11, vy:Math.sin(a)*11,
        dmg: main?3.5:1.1, r: main?4:3, type: main?"main":"opt",
      });
    }
  }

  // ボム(デモ中のAIはボムを使わない)
  if(!game.demo && !game.dialog && (keys["x"]||keys["X"]||touch.bomb) && player.bombs>0 && player.bombTime<=0){
    player.bombs--; player.bombTime=120; player.invul=Math.max(player.invul,150);
    game.shake=12; seBomb();
    cutIn = {t:0, dur:110, name:"陽符「民俗学の灯」", img:IMG.URARA_PORTRAIT, side:"left"};
  }
  touch.bomb=false;
  // ボム効果: 全弾消し+全体ダメージ
  if(player.bombTime>60){
    for(const b of eBullets){ addScore(10); burstMaybe(b); }
    eBullets.length=0;
    for(const e of enemies) e.hp-=1.2;
    if(boss&&boss.t>=0) boss.hp-=1.0*(boss.dmgMult ?? 1); // バリア中(dmgMult=0)はボム直撃も無効
  }
}
function burstMaybe(b){ if(Math.random()<0.2) burst(b.x,b.y,b.color,3,1.5); }

//======================================================================
// デモプレイ(ASI): 回避AIが低速移動・ボムなしで弾幕を避けながら撃破する。
// シナリオが demoLabel を定義すると難易度選択画面に専用ボタンが出る。
// 使用するシナリオ側フィールド: demoLabel / demoDiff / demoEndWho / demoEndText / demoReplayText
//======================================================================
function startDemo(){
  game.diff = curScenario().demoDiff ?? game.diff;
  startGame();
  game.demo = true;
  timeline=[]; tlIndex=0;   // 会話・道中なしで即ボス戦
  game.banner=null;
  player.power=4;
  player.invul=0;           // ASIは被弾しないので開幕無敵は不要(バリア誤発動も防ぐ)
  spawnBoss();
}
function demoExit(){
  seMenuConfirm();
  game.demo=false; game.demoEnd=null;
  boss=null; eBullets=[]; pBullets=[]; enemies=[]; effects=[]; items=[]; cutIn=null;
  backToTitle();
}
// 回避AI: 9方向それぞれについて数フレーム先の弾との接近度を採点し、最も安全な方向へ動く。
// ホームポジション(ボス直下・画面下部)への弱い引力で射線も維持する
function demoDodge(){
  const sp = player.slowSpeed;
  const homeX = boss ? boss.x : W/2, homeY = H-110;
  let best={dx:0,dy:0}, bestScore=-Infinity;
  for(let mx=-1;mx<=1;mx++)for(let my=-1;my<=1;my++){
    let danger=0;
    for(const b of eBullets){
      for(let k=4;k<=28;k+=8){
        const bx=b.x+b.vx*k, by=b.y+b.vy*k;
        const px=clamp(player.x+mx*sp*k,12,W-12), py=clamp(player.y+my*sp*k,12,H-12);
        const d2=(bx-px)**2+(by-py)**2;
        const rr=(b.r+player.r+7)*3;
        if(d2<rr*rr) danger += rr*rr/(d2+1);
      }
    }
    const nx=clamp(player.x+mx*sp*10,12,W-12), ny=clamp(player.y+my*sp*10,12,H-12);
    let score = -danger
      - ((nx-homeX)**2)*0.00005 - ((ny-homeY)**2)*0.00008; // ホームへの弱い引力
    if(nx<36||nx>W-36||ny>H-28||ny<H*0.45) score -= 0.6;     // 壁ぎわ・上半分は避ける
    if(score>bestScore){ bestScore=score; best={dx:mx,dy:my}; }
  }
  return best;
}

function playerHit(){
  if(game.demo) return; // デモのASIは被弾しない(全て避け切る)
  if(player.invul>0||player.bombTime>0||!player.alive) return;
  seHit();
  player.alive=false; player.respawn=60;
  player.lives--;
  player.power=Math.max(1,player.power-1);
  for(let i=0;i<3;i++) items.push(makeItem(player.x+rand(-35,35), player.y-rand(20,70), "pow")); // 復活用に散らばる
  game.shake=15;
  burst(player.x,player.y,"#ff5d7a",40,6);
  burst(player.x,player.y,"#ffffff",20,3);
  // 弾を少し消して救済
  eBullets = eBullets.filter(b=>((b.x-player.x)**2+(b.y-player.y)**2)>150*150);
  if(player.lives<0){
    player.lives=0; player.respawn=99999; // ゲームオーバー会話中は復活させない
    game.overPending=true; // ボス撃破タイミングと重なってもボス撃破会話に上書きされないようにする
    setTimeout(()=>{ if(game.state==="play") startDialogueOver(); }, 900);
  }
  else player.bombs=Math.max(player.bombs,2);
}

//======================================================================
// メイン更新
//======================================================================
function update(){
  game.frame++; game.scroll+=1.2;
  if(game.shake>0)game.shake--;
  if(game.banner && ++game.banner.t>game.banner.dur) game.banner=null;

  // デモ撃破後の画面: みそののセリフを10秒表示 → リプレイ告知(2秒) → デモをループ
  if(game.demoEnd){
    game.demoEnd.t++;
    for(const f of effects){ f.x+=f.vx||0; f.y+=f.vy||0; f.life--; }
    effects=effects.filter(f=>f.life>0);
    if(game.demoEnd.t > 720){ startDemo(); return; }
    updateUI();
    return;
  }

  // 会話中はゲーム進行を停止(移動のみ可)
  if(game.dialog){
    updatePlayer();
    for(const f of effects){ f.x+=f.vx||0; f.y+=f.vy||0; f.life--; }
    effects=effects.filter(f=>f.life>0);
    updateUI();
    return;
  }

  // タイムライン進行(ボス戦中は停止)
  if(!boss){
    stageT++;
    while(tlIndex<timeline.length && timeline[tlIndex].f<=stageT){
      timeline[tlIndex++].fn();
    }
  }

  updatePlayer();

  // 自弾
  for(const b of pBullets){ b.x+=b.vx; b.y+=b.vy; }
  pBullets=pBullets.filter(b=>b.y>-20&&b.x>-20&&b.x<W+20);

  // 敵
  for(const e of enemies){
    e.t++; e.ai(e);
    // 被弾判定
    for(const b of pBullets){
      if(b.hit)continue;
      if((b.x-e.x)**2+(b.y-e.y)**2 < (e.r+b.r)**2){
        b.hit=true; e.hp-=b.dmg; addScore(10);
      }
    }
    if(e.hp<=0){
      e.dead=true; addScore(e.score); dropItems(e);
      burst(e.x,e.y,e.color,16,4);
      popText(e.x,e.y,"+"+e.score);
      seEnemyPop();
    }
  }
  enemies=enemies.filter(e=>!e.dead && e.y<H+60 && e.y>-120 && e.x>-60 && e.x<W+60);
  pBullets=pBullets.filter(b=>!b.hit);

  // ボス
  if(boss){
    boss.t++;
    const bdx = boss.tx-boss.x;
    boss.x += bdx*0.05;
    boss.y += (boss.ty-boss.y)*0.05;
    boss.dir = Math.abs(bdx)>2 ? (bdx>0?1:-1) : 0; // 移動方向: 傾き差分スプライット選択用
    if(boss.t>=0){
      const sp=curSpells()[boss.phase];
      sp.fire(boss);
      boss.spellTime--;
      boss.dmgMult = enemies.some(e=>e.summonTag) ? 0.12 : 1; // 召喚キャラが生きている間はダメージが通りにくい
      // シナリオが bossBarrierOnInvul を立てていると、自機の無敵時間中(ボム含む)は
      // ボスがバリアを貼って自機の攻撃を完全に無効化する(シナリオ4の仕様)
      boss.barrier = !!(curScenario().bossBarrierOnInvul && (player.invul>0 || player.bombTime>0));
      if(boss.barrier) boss.dmgMult = 0;
      for(const b of pBullets){
        if(b.hit)continue;
        if((b.x-boss.x)**2+(b.y-boss.y)**2<(boss.r+b.r)**2){ b.hit=true; boss.hp-=b.dmg*boss.dmgMult; addScore(10); }
      }
      pBullets=pBullets.filter(b=>!b.hit);
      if(sp.checkAdvance && sp.checkAdvance(boss)){
        nextPhase(); // スペル側の遷移条件(例: 召喚キャラ全滅で発狂)を満たした
      } else if(boss.hp<=0){
        addScore(sp.spell?20000:8000);
        if(sp.spell) popText(boss.x,boss.y,"スペルカード撃破!","#ffd76e");
        nextPhase();
      } else if(boss.spellTime<=0){
        nextPhase(); // 時間切れ(ボーナスなし)
      }
    }
  }

  // 敵弾
  for(const b of eBullets){
    b.t++;
    if(b.update){
      b.update(b); // カスタム移動(ボス周回のデコ弾など)。通常の直進はしない
    }else{
      if(b.accel){ b.speed+=b.accel; }
      if(b.turn){ b.angle+=b.turn; }
      if(b.accel||b.turn){ b.vx=Math.cos(b.angle)*b.speed; b.vy=Math.sin(b.angle)*b.speed; }
      b.x+=b.vx; b.y+=b.vy;
    }

    if(player.alive && player.invul<=0){
      const d2=(b.x-player.x)**2+(b.y-player.y)**2;
      // グレイズ
      if(!b.grazed && d2 < (player.grazeR+b.r)**2 && d2 > (player.r+b.r)**2){
        b.grazed=true; game.graze=(game.graze||0)+1; addScore(50);
        burst(player.x,player.y,"#ffffff",2,2);
        if(grazeSoundFrame!==game.frame){ grazeSoundFrame=game.frame; seGraze(); }
      }
      // 被弾
      if(d2 < (player.r+b.r)**2){ playerHit(); }
    }
  }
  eBullets=eBullets.filter(b=>b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);

  // 敵と自機の体当たり
  if(player.alive&&player.invul<=0){
    for(const e of enemies){
      if((e.x-player.x)**2+(e.y-player.y)**2<(e.r+player.r+4)**2) playerHit();
    }
  }

  // アイテム
  const magnet = player.y<H*0.25; // 上部で全回収
  for(const it of items){
    it.t++;
    if(magnet || (it.x-player.x)**2+(it.y-player.y)**2<70*70){
      const a=Math.atan2(player.y-it.y,player.x-it.x);
      it.x+=Math.cos(a)*8; it.y+=Math.sin(a)*8;
    }else{
      it.vy=Math.min(2.4,it.vy+0.08); it.y+=it.vy;
    }
    if(player.alive&&(it.x-player.x)**2+(it.y-player.y)**2<(it.r+10)**2){
      it.got=true; seItem();
      if(it.type==="pow"){
        if(player.power<4){
          const before=Math.floor(player.power);
          player.power=Math.min(4,player.power+0.20); addScore(100);
          if(Math.floor(player.power)>before) popText(player.x,player.y-26,"POWER UP!","#ffd76e");
        } else addScore(1000);
      }else{ addScore(500+ (game.graze||0)*5); }
    }
  }
  items=items.filter(it=>!it.got&&it.y<H+20);

  // カットイン
  if(cutIn && ++cutIn.t > cutIn.dur) cutIn = null;

  // エフェクト
  for(const f of effects){ f.x+=f.vx||0; f.y+=f.vy||0; f.life--; }
  effects=effects.filter(f=>f.life>0);

  updateUI();
}

//======================================================================
// 描画
//======================================================================
function drawBG(){
  ctx.fillStyle="#05030c"; ctx.fillRect(0,0,W,H);
  // 星
  ctx.save();
  for(let i=0;i<60;i++){
    const seed=i*137.5;
    const x=(seed*7)%W;
    const y=((seed*13)+game.scroll*(0.3+i%3*0.35))%H;
    const s=(i%3)+1;
    ctx.globalAlpha=0.25+ (i%4)*0.15;
    ctx.fillStyle=i%7===0?"#c9a7ff":"#8a90c9";
    ctx.fillRect(x,y,s,s);
  }
  ctx.restore();
  // 緑の01レイン(低アルファで視認性キープ)
  ctx.font="10px monospace"; ctx.textAlign="left";
  for(let i=0;i<16;i++){
    const seed=i*97.3;
    const rx=(seed*13)%W;
    const sp=1.5+(i%4)*0.8;
    const ry=(seed*29+game.scroll*sp)%(H+60)-30;
    ctx.fillStyle=`rgba(90,220,140,${0.05+(i%3)*0.04})`;
    for(let k=0;k<5;k++){
      const ch=((i*7+k*3+((game.scroll/16)|0))%2)?"1":"0";
      ctx.fillText(ch,rx,ry-k*13);
    }
  }
  // グリッチノイズ: 走査帯の水平ズレ + 色帯
  if(Math.random()<0.06){
    const gy=rand(0,H-14), gh=rand(3,12), gx=rand(-14,14);
    ctx.drawImage(cv, 0,gy,W,gh, gx,gy,W,gh);
    ctx.fillStyle="rgba(126,230,160,0.05)"; ctx.fillRect(0,gy,W,gh);
  }
  if(Math.random()<0.03){
    ctx.fillStyle="rgba(255,80,120,0.05)";
    ctx.fillRect(0,rand(0,H),W,rand(1,3));
  }
  // 霧
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"rgba(40,20,80,0.25)");
  g.addColorStop(1,"rgba(10,5,25,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}

function drawPhone(px,py,s){
  ctx.save(); ctx.translate(Math.round(px),Math.round(py));
  ctx.rotate(s*0.12);
  ctx.globalAlpha=0.6;
  ctx.fillStyle="#1b1730"; ctx.fillRect(-4,-7,8,14);
  ctx.strokeStyle="#9f86d6"; ctx.strokeRect(-4,-7,8,14);
  ctx.fillStyle=`hsl(${(game.frame*3)%360},70%,62%)`; ctx.fillRect(-3,-5,6,9);
  ctx.fillStyle="#c9c2e8"; ctx.fillRect(-1,5,2,1);
  ctx.restore(); ctx.globalAlpha=1;
}

function drawPlayer(){
  if(!player.alive)return;
  if(player.invul>0 && Math.floor(game.frame/4)%2===0) ctx.globalAlpha=0.4;
  const x=player.x,y=player.y;
  // 神北うらら(後ろ姿ドット): 移動方向で少し傾いた差分スプライットに切替。
  // ASIデモプレイ中はシナリオが demoPlayerSprite を定義していればそちらを使う(例: シナリオ4は棗みその後ろ姿)
  const demoSpr = game.demo && curScenario().demoPlayerSprite;
  const spr = demoSpr ? demoSpr(player.dir)
    : player.dir<0 ? IMG.URARA_SPRITE_LEFT : player.dir>0 ? IMG.URARA_SPRITE_RIGHT : IMG.URARA_SPRITE;
  if(spr.complete && spr.naturalWidth){
    const s=1, sw=spr.naturalWidth*s, sh=spr.naturalHeight*s;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(spr, Math.round(x-sw/2), Math.round(y-sh/2), sw, sh);
    ctx.imageSmoothingEnabled=true;
  }else{
    ctx.fillStyle="#f4d488";
    ctx.beginPath(); ctx.moveTo(x,y-12); ctx.lineTo(x-9,y+10); ctx.lineTo(x+9,y+10); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha=1;
  // 両脇のスマホ(半透明0.6): 通常=横 / 低速=前方に収束
  {
    const L=player.slowLerp;
    const bob=Math.sin(game.frame*0.1)*2;
    for(const s of [-1,1]){
      const ox = s*(24-(24-10)*L);
      const oy = (6-(6+26)*L)+bob;
      drawPhone(x+ox, y+oy, s);
    }
  }
  // 低速時: 当たり判定ドット(白フチ+赤コア、点滅)。デモ中は常時低速なので常に表示
  if(keys["Shift"] || game.demo){
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y)); ctx.rotate(game.frame*0.04);
    ctx.strokeStyle="rgba(200,180,255,0.7)";
    ctx.strokeRect(-9,-9,18,18);
    ctx.restore();
    const px=Math.round(x)-3, py=Math.round(y)-3;
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#ffffff";                       // 白の菱形フチ
    ctx.fillRect(px+2,py,2,2);   ctx.fillRect(px+2,py+4,2,2);
    ctx.fillRect(px,py+2,2,2);   ctx.fillRect(px+4,py+2,2,2);
    ctx.fillStyle=Math.floor(game.frame/8)%2===0?"#ff2a4a":"#ff8aa0"; // 赤コア点滅
    ctx.fillRect(px+2,py+2,2,2);
    ctx.imageSmoothingEnabled=true;
  }
  // ボムエフェクト
  if(player.bombTime>0){
    const pr=(120-player.bombTime)/120*520;
    ctx.strokeStyle=`rgba(255,205,110,${player.bombTime/120})`;
    ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(x,y,pr,0,TAU); ctx.stroke();
    ctx.lineWidth=1;
  }
}

function drawEnemies(){
  for(const e of enemies){
    ctx.save(); ctx.translate(Math.round(e.x),Math.round(e.y));
    // 種別カラーのオーラ(脈動)
    const pulse=1+Math.sin(e.t*0.12)*0.12;
    ctx.globalAlpha=0.30; ctx.fillStyle=e.color;
    ctx.beginPath(); ctx.arc(0,0,(e.r*1.35+3)*pulse,0,TAU); ctx.fill();
    ctx.globalAlpha=0.55; ctx.strokeStyle=e.color; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,(e.r*1.35+3)*pulse,0,TAU); ctx.stroke();
    ctx.lineWidth=1; ctx.globalAlpha=1;
    // 顔面ドット
    const strong = e.r>14;
    const spr = e.sprite || (strong ? IMG.ZAKO2_SPRITE : IMG.ZAKO_SPRITE);
    if(spr.complete && spr.naturalWidth){
      const s = strong ? 2 : 1;
      const sw=spr.naturalWidth*s, sh=spr.naturalHeight*s;
      const bob=Math.sin(e.t*0.15)*2;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(spr, Math.round(-sw/2), Math.round(-sh/2+bob), sw, sh);
      ctx.imageSmoothingEnabled=true;
    }else{
      ctx.fillStyle=e.color;
      ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    }
    if(spr===IMG.ZAKO_SPRITE){
      ctx.font="bold 13px monospace"; ctx.textAlign="center";
      ctx.lineWidth=3; ctx.strokeStyle="rgba(10,7,20,0.85)";
      ctx.strokeText("810", 0, -e.r-12);
      ctx.fillStyle="#9dffc0";
      ctx.fillText("810", 0, -e.r-12);
      ctx.lineWidth=1; ctx.textAlign="left";
    }
    ctx.restore();
  }
}

function drawBoss(){
  if(!boss)return;
  const b=boss;
  ctx.save(); ctx.translate(b.x,b.y);
  // オーラ
  ctx.globalAlpha=0.25+Math.sin(game.frame*0.1)*0.08;
  ctx.fillStyle="#c96bff";
  ctx.beginPath(); ctx.arc(0,0,b.r*2.2,0,TAU); ctx.fill();
  ctx.globalAlpha=1;
  // 浮遊する半透明カード
  for(let i=0;i<5;i++){
    const ca=game.frame*0.02+i*TAU/5;
    const cx=Math.cos(ca)*40, cy=Math.sin(ca)*22-4;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(ca)*0.4);
    ctx.globalAlpha=0.45;
    ctx.fillStyle="#f4efff"; ctx.fillRect(-6,-9,12,18);
    ctx.strokeStyle="#8257c9"; ctx.strokeRect(-6,-9,12,18);
    ctx.fillStyle="#c9a7ff"; ctx.fillRect(-4,-6,8,3);
    ctx.restore(); ctx.globalAlpha=1;
  }
  // 体(ドット絵スプライト: ふわふわ上下、移動方向で傾き差分に切替)
  const bSpr = curScenario().boss.sprite(b);
  if(bSpr.complete && bSpr.naturalWidth){
    const scale=1, sw=bSpr.naturalWidth*scale, sh=bSpr.naturalHeight*scale;
    const bob=Math.sin(game.frame*0.07)*4;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(bSpr, -sw/2, -sh/2+bob, sw, sh);
    ctx.imageSmoothingEnabled=true;
  }else{
    ctx.fillStyle="#7b4dff"; ctx.beginPath(); ctx.arc(0,0,b.r,0,TAU); ctx.fill();
  }
  // バリア(自機無敵中は攻撃無効: bossBarrierOnInvul シナリオ用の視覚表示)
  if(b.barrier){
    const rr = b.r*2.4 + Math.sin(game.frame*0.25)*2;
    ctx.globalAlpha = 0.5 + Math.sin(game.frame*0.2)*0.15;
    ctx.strokeStyle="#8ad4ff"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,rr,0,TAU); ctx.stroke();
    ctx.globalAlpha = 0.12; ctx.fillStyle="#8ad4ff";
    ctx.beginPath(); ctx.arc(0,0,rr,0,TAU); ctx.fill();
    ctx.lineWidth=1; ctx.globalAlpha=1;
  }
  ctx.restore();

  // HPバー
  if(b.t>=0){
    const sp=curSpells()[b.phase];
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(20,14,W-40,8);
    ctx.fillStyle=sp.spell?"#ffd76e":"#ff5d7a";
    ctx.fillRect(20,14,(W-40)*clamp(b.hp/b.maxHp,0,1),8);
    ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.strokeRect(20,14,W-40,8);
    // 残りフェーズ数(星)
    ctx.fillStyle="#c9a7ff"; ctx.font="10px monospace";
    ctx.fillText("★".repeat(curSpells().length-1-b.phase), 20, 36);
    // スペル名とタイマー
    ctx.textAlign="right"; ctx.fillStyle="#e8e2f5"; ctx.font="11px sans-serif";
    ctx.fillText(sp.name, W-22, 38);
    ctx.fillStyle="#ffd76e"; ctx.font="bold 13px monospace";
    ctx.fillText(Math.ceil(b.spellTime/60), W-22, 54);
    ctx.textAlign="left";
  } else {
    ctx.textAlign="center"; ctx.fillStyle="#c9a7ff"; ctx.font="bold 14px sans-serif";
    ctx.fillText(b.name, W/2, 60); ctx.textAlign="left";
  }
}

function drawPlayerBullets(){
  // 自弾(太陽モチーフ: くるくる回る)。敵弾幕と重なった時に見づらくならないよう最背面(drawItemsより前)で描く。
  // ASIデモ中は棗みそのが自機なので同じ軌道のまま月弾の見た目に差し替える
  ctx.globalAlpha=0.95;
  for(const b of pBullets){
    const spr = game.demo
      ? (b.type==="main" ? moonSprite("#c9a7ff",6.5) : moonSprite("#e0c8ec",4.8))
      : (b.type==="main" ? sunMain : sunOpt);
    ctx.save(); ctx.translate(b.x,b.y);
    ctx.rotate(game.frame*0.15 + b.x*0.05);
    ctx.drawImage(spr, -spr.width/2, -spr.height/2);
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

function drawEnemyBullets(){
  // 敵弾: 単語弾 / 三日月(ボス) / 縁取り丸(+数字)。アイテムと見分けやすいよう薄くブラーをかける
  // (弾数が多い時はブラーが重くなるので無効化する: シンギュラリティ弾幕等の対策)
  ctx.filter = eBullets.length>500 ? "none" : "blur(0.7px)";
  for(const b of eBullets){
    if(b.sprite){
      // スプライト弾(コイン・チケット等): spin指定でくるくる回転、0なら進行方向を向く
      ctx.save(); ctx.translate(b.x,b.y);
      ctx.rotate(b.spin ? b.t*b.spin : b.angle);
      ctx.drawImage(b.sprite, -b.sprite.width/2, -b.sprite.height/2);
      ctx.restore();
    }else if(b.word){
      ctx.save(); ctx.translate(b.x,b.y);
      ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.lineWidth=3; ctx.strokeStyle="rgba(5,3,12,0.9)";
      ctx.strokeText(b.word,0,0);
      ctx.fillStyle=b.color; ctx.fillText(b.word,0,0);
      ctx.restore();
    }else if(b.moon){
      const spr = moonSprite(b.color, b.r+2);
      ctx.save(); ctx.translate(b.x,b.y);
      ctx.rotate(b.angle + game.frame*0.06);
      ctx.drawImage(spr, -spr.width/2, -spr.height/2);
      ctx.restore();
    }else{
      ctx.fillStyle=b.edge;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU); ctx.fill();
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.62,0,TAU); ctx.fill();
      if(b.digit){
        ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.lineWidth=2.5; ctx.strokeStyle="rgba(255,255,255,0.65)";
        ctx.strokeText(b.digit,b.x,b.y+0.5);
        ctx.fillStyle="#1a0f2a";
        ctx.fillText(b.digit,b.x,b.y+0.5);
        ctx.lineWidth=1;
      }
    }
  }
  ctx.filter="none";
  ctx.textAlign="left"; ctx.textBaseline="alphabetic";
}

function drawItems(){
  for(const it of items){
    ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(it.t*0.08);
    ctx.fillStyle= it.type==="pow" ? "#ff4d6e" : "#4d9dff";
    ctx.fillRect(-6,-6,12,12);
    ctx.fillStyle="#fff"; ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(it.type==="pow"?"P":"点",0,1);
    ctx.restore();
  }
  ctx.textAlign="left"; ctx.textBaseline="alphabetic";
}

function drawEffects(){
  for(const f of effects){
    const a=f.life/f.max;
    if(f.text){
      ctx.globalAlpha=a; ctx.fillStyle=f.color; ctx.font="bold 12px sans-serif"; ctx.textAlign="center";
      ctx.fillText(f.text,f.x,f.y); ctx.textAlign="left";
    }else{
      ctx.globalAlpha=a; ctx.fillStyle=f.color;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r*a,0,TAU); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

function wrapCenterText(text, cx, startY, maxW, lineH){
  ctx.textAlign="center";
  let line="", y=startY; const lines=[];
  for(const ch of text){
    if(ctx.measureText(line+ch).width>maxW){ lines.push(line); line=ch; }
    else line+=ch;
  }
  lines.push(line);
  for(const l of lines){ ctx.fillText(l, cx, y); y+=lineH; }
  return y;
}

// クリア/ゲームオーバー画面の縦並びメニュー(もう一度やる/タイトルに戻る)。
// キーボードでは選択中の項目を金色で強調する(タップは直接どちらかを押す)
function drawEndMenu(){
  for(const c of END_CHIPS){
    const active = c.i===game.endSel;
    ctx.fillStyle = active ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.10)";
    ctx.fillRect(c.x,c.y,c.w,c.h);
    ctx.strokeStyle = active ? "#ffd76e" : "#8b7fb5"; ctx.lineWidth = 1;
    ctx.strokeRect(c.x,c.y,c.w,c.h);
    ctx.fillStyle = active ? "#ffd76e" : "#e8e2f5"; ctx.font = "bold 15px sans-serif"; ctx.textAlign="center";
    ctx.fillText(c.name, c.x+c.w/2, c.y+28);
  }
  ctx.lineWidth=1;
  const bottom = END_CHIPS[END_CHIPS.length-1].y + END_ROW_H;
  ctx.fillStyle="#6f639b"; ctx.font="10px sans-serif";
  if(!IS_TOUCH) ctx.fillText("↑ ↓ で選択 / Z で決定", W/2, bottom+22);
}

function drawOverlay(){
  if(game.state==="play"&&!game.paused)return;
  ctx.fillStyle="rgba(5,3,12,0.75)"; ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";
  if(game.state==="title"){
    ctx.fillStyle="#c9a7ff"; ctx.font="bold 27px serif";
    ctx.fillText("インターネット民俗STG",W/2,H/2-60);
    ctx.fillStyle="#e8e2f5"; ctx.font="14px sans-serif";
    if(Math.floor(game.frame/30)%2===0) ctx.fillText(IS_TOUCH?"タップで次へ":"Z キーで次へ",W/2,H/2+60);
    // ニコニコ動画風の流れコメント
    ctx.textAlign="left";
    for(const c of comments){
      ctx.font=`bold ${c.size}px sans-serif`;
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillText(c.text, c.x+1, c.y+1);
      ctx.fillStyle=c.color; ctx.fillText(c.text, c.x, c.y);
    }
  }
  else if(game.state==="scenario"){
    const listTop = SCENARIO_CHIPS[0].y, listBottom = SCENARIO_CHIPS[SCENARIO_CHIPS.length-1].y+SCENARIO_CHIPS[0].h;
    ctx.fillStyle="#c9a7ff"; ctx.font="bold 18px sans-serif";
    ctx.fillText("シナリオ選択",W/2,listTop-30);
    for(const c of SCENARIO_CHIPS){
      // 全項目を同じ透過率・色・太さで統一表示する
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(c.x,c.y,c.w,c.h);
      ctx.strokeStyle = "#8b7fb5"; ctx.lineWidth = 1;
      ctx.strokeRect(c.x,c.y,c.w,c.h);
      ctx.fillStyle = "#e8e2f5"; ctx.font = "bold 17px serif";
      // サブタイトルなしのシナリオはタイトルをカード中央(縦)に1行だけ表示
      ctx.fillText(c.sc.name, c.x+c.w/2, c.sc.sub ? c.y+28 : c.y+38);
      if(c.sc.sub){
        ctx.fillStyle = "#8b7fb5"; ctx.font = "11px monospace";
        ctx.fillText("- "+c.sc.sub+" -", c.x+c.w/2, c.y+48);
      }
    }
    ctx.lineWidth=1;
    ctx.fillStyle="#6f639b"; ctx.font="10px sans-serif";
    if(!IS_TOUCH) ctx.fillText("↑ ↓ で選択",W/2,listBottom+22);
    ctx.fillStyle="#e8e2f5"; ctx.font="14px sans-serif";
    if(Math.floor(game.frame/30)%2===0) ctx.fillText(IS_TOUCH?"タップで決定":"Z キーで決定",W/2,listBottom+(IS_TOUCH?26:46));
  }
  else if(game.state==="difficulty"){
    const chips = diffChips(); // シナリオ専用の難易度(diffOptions)があればそちらを表示
    const listTop = chips[0].y, listBottom = chips[chips.length-1].y+chips[0].h;
    ctx.fillStyle="#c9a7ff"; ctx.font="bold 18px sans-serif";
    ctx.fillText("難易度選択",W/2,listTop-30);
    for(const c of chips){
      // 全項目を同じ透過率・色・太さで統一表示する
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(c.x,c.y,c.w,c.h);
      ctx.strokeStyle = "#8b7fb5"; ctx.lineWidth = 1;
      ctx.strokeRect(c.x,c.y,c.w,c.h);
      ctx.fillStyle = "#e8e2f5"; ctx.font = "bold 15px monospace";
      ctx.fillText(c.name, c.x+c.w/2, c.y+24);
      ctx.fillStyle = "#8b7fb5"; ctx.font = "11px sans-serif";
      ctx.fillText("「"+(c.sub ?? DIFF_SUBTITLE[c.i])+"」", c.x+c.w/2, c.y+42);
    }
    // デモプレイボタン(難易度カードとは別デザイン: 黒地+金の二重枠。↓でフォーカス/タップで即開始)
    const dc = demoChip();
    if(dc){
      const focus = game.demoFocus;
      ctx.fillStyle = focus ? "rgba(255,215,110,0.18)" : "rgba(5,3,12,0.8)";
      ctx.fillRect(dc.x,dc.y,dc.w,dc.h);
      ctx.strokeStyle="#ffd76e"; ctx.lineWidth = focus?2:1;
      ctx.strokeRect(dc.x,dc.y,dc.w,dc.h);
      ctx.strokeRect(dc.x+3,dc.y+3,dc.w-6,dc.h-6);
      ctx.fillStyle="#ffd76e"; ctx.font="bold 14px monospace";
      ctx.fillText("▶ "+SCENARIOS[game.scenario].demoLabel, dc.x+dc.w/2, dc.y+25);
      ctx.lineWidth=1;
    }
    const hintBase = dc ? dc.y+dc.h : listBottom;
    ctx.lineWidth=1;
    ctx.fillStyle="#6f639b"; ctx.font="10px sans-serif";
    if(!IS_TOUCH) ctx.fillText("↑ ↓ で選択",W/2,hintBase+22);
    ctx.fillStyle="#e8e2f5"; ctx.font="14px sans-serif";
    if(Math.floor(game.frame/30)%2===0) ctx.fillText(IS_TOUCH?"タップで決定":"Z キーで決定",W/2,hintBase+(IS_TOUCH?26:46));
  }
  else if(game.state==="playerinfo"){
    ctx.fillStyle="#c9a7ff"; ctx.font="bold 16px sans-serif";
    ctx.fillText("自機紹介",W/2,H*0.10);
    if(IMG.URARA_PORTRAIT.complete && IMG.URARA_PORTRAIT.naturalWidth){
      const scale=0.62, pw=IMG.URARA_PORTRAIT.naturalWidth*scale, ph=IMG.URARA_PORTRAIT.naturalHeight*scale;
      ctx.drawImage(IMG.URARA_PORTRAIT, W/2-pw/2, H*0.13, pw, ph);
    }
    ctx.fillStyle="#ffd76e"; ctx.font="bold 18px serif";
    ctx.fillText("神北うらら", W/2, H*0.62);
    ctx.fillStyle="#e8e2f5"; ctx.font="12px sans-serif";
    wrapCenterText("オタクに優しいインターネットと民俗学が大好きなギャルだよ〜〜", W/2, H*0.68, 320, 18);
    ctx.fillStyle="#8ad4ff"; ctx.font="12px sans-serif";
    ctx.fillText("ショット: 前方拡散型「陽キャのオーラ」", W/2, H*0.79);
    ctx.fillStyle="#ff8ab0"; ctx.font="12px sans-serif";
    ctx.fillText("ボム: 陽符「民俗学の灯」", W/2, H*0.79+22);
    ctx.fillStyle="#e8e2f5"; ctx.font="14px sans-serif";
    if(Math.floor(game.frame/30)%2===0) ctx.fillText(IS_TOUCH?"タップで次へ":"Z キーで次へ",W/2,H*0.94);
  }
  else if(game.state==="tutorial"){
    const steps = IS_TOUCH ? TUTORIAL_STEPS_TOUCH : TUTORIAL_STEPS_KB;
    const tip = steps[game.tutIdx % steps.length];
    ctx.fillStyle="#c9a7ff"; ctx.font="bold 16px sans-serif";
    ctx.fillText("操作方法", W/2, H/2-70);
    const bw=240, bh=54, bx=(W-bw)/2, by=H/2-40;
    ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle="#ffd76e"; ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle="#ffd76e"; ctx.font="bold 20px monospace";
    ctx.fillText(tip.key, W/2, by+34);
    ctx.fillStyle="#e8e2f5"; ctx.font="14px sans-serif";
    ctx.fillText(tip.desc, W/2, H/2+38);
    const dotY=H/2+64, totalW=(steps.length-1)*18;
    for(let i=0;i<steps.length;i++){
      ctx.beginPath();
      ctx.arc(W/2-totalW/2+i*18, dotY, i===game.tutIdx%steps.length?4:2.5, 0, TAU);
      ctx.fillStyle = i===game.tutIdx%steps.length ? "#ffd76e" : "#4a4066";
      ctx.fill();
    }
    ctx.fillStyle="#6f639b"; ctx.font="11px sans-serif";
    if(Math.floor(game.frame/30)%2===0) ctx.fillText(IS_TOUCH?"タップでスキップ":"Z キーでスキップ", W/2, H/2+92);
  }
  else if(game.state==="over"){
    ctx.fillStyle="#ff5d7a"; ctx.font="bold 30px serif";
    ctx.fillText("GAME OVER",W/2,H/2-64);
    ctx.fillStyle="#e8e2f5"; ctx.font="13px sans-serif";
    ctx.fillText("SCORE: "+game.score.toLocaleString(),W/2,H/2-28);
    drawEndMenu();
  }
  else if(game.state==="clear"){
    ctx.fillStyle="#ffd76e"; ctx.font="bold 28px serif";
    ctx.fillText("STAGE CLEAR!",W/2,H/2-64);
    ctx.fillStyle="#e8e2f5"; ctx.font="13px sans-serif";
    ctx.fillText("SCORE: "+game.score.toLocaleString(),W/2,H/2-28);
    drawEndMenu();
  }
  else if(game.paused){
    ctx.fillStyle="#e8e2f5"; ctx.font="bold 22px sans-serif";
    ctx.fillText("PAUSE",W/2,H/2);
  }
  ctx.textAlign="left";
}

function drawCutIn(){
  if(!cutIn) return;
  const t = cutIn.t, dur = cutIn.dur, right = cutIn.side !== "left";
  const ease = x => 1-Math.pow(1-x,3);
  let a, slide;
  if(t < 25){ const p=ease(t/25); a=p; slide=(1-p)*80; }
  else if(t > dur-25){ const p=(t-(dur-25))/25; a=1-p; slide=-ease(p)*40; }
  else { a=1; slide=0; }

  ctx.save();
  // 背景の帯(ボス=紫 / 陽符=暖色)
  ctx.globalAlpha = a*0.28;
  const col = right ? "120,70,220" : "235,165,70";
  const g = ctx.createLinearGradient(0,H*0.18,0,H*0.85);
  g.addColorStop(0,`rgba(${col},0)`);
  g.addColorStop(0.5,`rgba(${col},0.8)`);
  g.addColorStop(1,`rgba(${col},0)`);
  ctx.fillStyle=g; ctx.fillRect(0,H*0.18,W,H*0.67);

  // 立ち絵: 左右どちらかからふわっと
  const img = cutIn.img;
  ctx.globalAlpha = a*0.92;
  const pw = img.naturalWidth||280, ph = img.naturalHeight||420;
  const px = right ? W-pw-16+slide : 16-slide;
  const py = H-ph-70+Math.sin(game.frame*0.05)*4;
  if(img.complete && img.naturalWidth) ctx.drawImage(img, px, py);

  // 名前プレート(立ち絵と反対側)。長いスペカ名は自動改行して全文を見せる
  ctx.globalAlpha = a;
  ctx.font="bold 19px serif";
  const maxW = W-120, lineH = 26;
  const lines=[]; let line="";
  for(const ch of cutIn.name){
    if(ctx.measureText(line+ch).width>maxW){ lines.push(line); line=ch; }
    else line+=ch;
  }
  lines.push(line);
  const tw = Math.max(...lines.map(l=>ctx.measureText(l).width));
  const tx = right ? 24-slide*0.5 : W-tw-24+slide*0.5;
  const ty = H*0.30;
  ctx.fillStyle="rgba(5,3,12,0.85)";
  ctx.fillRect(tx-10, ty-24, tw+20, 34+(lines.length-1)*lineH);
  ctx.strokeStyle = right ? "#c9a7ff" : "#ffd76e";
  ctx.strokeRect(tx-10, ty-24, tw+20, 34+(lines.length-1)*lineH);
  ctx.fillStyle="#ffd76e"; ctx.textAlign="left";
  lines.forEach((l,i)=>ctx.fillText(l, tx, ty+i*lineH));
  ctx.restore();
}

function drawBanner(){
  if(!game.banner || game.state!=="play" || game.dialog) return; // 会話パート中はステージ名を出さない
  const t=game.banner.t, dur=game.banner.dur;
  const a = t<30 ? t/30 : t>dur-40 ? Math.max(0,(dur-t)/40) : 1;
  const sc = curScenario();
  ctx.save(); ctx.globalAlpha=a; ctx.textAlign="center";
  ctx.fillStyle="#7ee6a0"; ctx.font="bold 24px serif";
  ctx.fillText(sc.name, W/2, H*0.34);
  if(sc.sub){
    ctx.fillStyle="#8b7fb5"; ctx.font="12px monospace";
    ctx.fillText("- "+sc.sub+" -", W/2, H*0.34+26);
  }
  ctx.restore(); ctx.textAlign="left";
}

function drawDialog(){
  if(!game.dialog) return;
  const isOver = game.dialog.set==="over";
  const list = dialogList();
  const d = list[game.dialog.idx];
  const uraraTurn = d.who==="うらら";
  const drawP=(img,pos,active,scale,margin,bottom)=>{
    // pos: true=左寄せ / false=右寄せ / "center"=中央配置
    if(!(img.complete&&img.naturalWidth)) return;
    const pw=img.naturalWidth*scale, ph=img.naturalHeight*scale;
    const px = pos==="center" ? (W-pw)/2 : pos ? margin : W-pw-margin;
    const py = H-ph-bottom;  // bottom: 下端の高さ(小さいほど下に沈む)
    ctx.globalAlpha = active?1:0.35;
    if(!active) ctx.filter="brightness(0.6)";
    ctx.drawImage(img,px,py,pw,ph);
    ctx.filter="none"; ctx.globalAlpha=1;
  };
  if(isOver){
    // ゲームオーバー会話: うらら単独を画面正面(中央)に表示
    if(IMG.URARA_CRY_PORTRAIT.complete && IMG.URARA_CRY_PORTRAIT.naturalWidth){
      const scale=1.05, pw=IMG.URARA_CRY_PORTRAIT.naturalWidth*scale, ph=IMG.URARA_CRY_PORTRAIT.naturalHeight*scale;
      ctx.drawImage(IMG.URARA_CRY_PORTRAIT, (W-pw)/2, H-ph-118, pw, ph);
    }
  }else{
    // 話者を後に描いて手前に出す。ボス立ち絵の画像/配置はシナリオ定義から取得
    // (bd.solo=ボス単独でうららを出さない / bd.center=ボス立ち絵を画面中央に配置)
    const bd = curScenario().boss.dialog(game.dialog.set);
    const ports = [
      [bd.img, bd.center?"center":false, !uraraTurn, bd.scale, bd.margin, bd.bottom],
    ];
    if(!bd.solo) ports.push([IMG.URARA_PORTRAIT, true, uraraTurn, 0.85, 8, 108]);
    ports.sort((a,b)=>(a[2]?1:0)-(b[2]?1:0));
    for(const p of ports) drawP(...p);
  }
  // ノベル風テキストボックス
  const bx=14, by=H-124, bw=W-28, bh=104;
  ctx.fillStyle="rgba(8,5,18,0.9)"; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle = uraraTurn?"#ffd76e":"#c9a7ff"; ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle   = uraraTurn?"#ffd76e":"#c9a7ff";
  ctx.font="bold 13px sans-serif"; ctx.textAlign="left";
  ctx.fillText(d.who, bx+14, by+24);
  // セリフ本文: 会話データの size(px)/center(中央寄せ)指定に対応(例: シナリオ4「死ぬがよい。」)
  const fsize = d.size || 13;
  ctx.fillStyle="#e8e2f5"; ctx.font=fsize+"px sans-serif";
  const maxW=bw-28;
  const lines=[]; let line="";
  for(const ch of d.text){
    if(ctx.measureText(line+ch).width>maxW){ lines.push(line); line=ch; }
    else line+=ch;
  }
  lines.push(line);
  const lineH = Math.round(fsize*1.55);
  let ly = d.center ? by + (bh - (lines.length-1)*lineH)/2 + fsize*0.35 + 6 : by+48;
  for(const l of lines){
    if(d.center){ ctx.textAlign="center"; ctx.fillText(l, bx+bw/2, ly); ctx.textAlign="left"; }
    else ctx.fillText(l, bx+14, ly);
    ly += lineH;
  }
  if(Math.floor(game.frame/25)%2===0){
    ctx.fillStyle="#8b7fb5"; ctx.font="11px sans-serif"; ctx.textAlign="right";
    ctx.fillText(IS_TOUCH?"タップで次へ ▼":"Z で次へ ▼", bx+bw-12, by+bh-10);
    ctx.textAlign="left";
  }
}

function drawDifficultyBadge(){
  if(game.state!=="play") return;
  const opts = diffOptions();
  const label = opts ? opts[game.diff].name : DIFF_NAMES[game.diff];
  ctx.save();
  ctx.font="bold 10px monospace"; ctx.textAlign="left";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle="rgba(5,3,12,0.55)"; ctx.fillRect(6,6,tw+14,16);
  ctx.strokeStyle="rgba(201,167,255,0.5)"; ctx.strokeRect(6,6,tw+14,16);
  ctx.fillStyle="#c9a7ff"; ctx.fillText(label,13,17.5);
  ctx.restore(); ctx.textAlign="left";
}

function drawHUD(){
  if(!IS_TOUCH || game.state!=="play" || game.dialog) return;
  ctx.save();
  ctx.fillStyle="rgba(5,3,12,0.55)"; ctx.fillRect(0,H-24,W,24);
  ctx.font="bold 12px monospace"; ctx.textAlign="left";
  ctx.fillStyle="#ffd76e"; ctx.fillText(game.score.toLocaleString(), 8, H-8);
  ctx.textAlign="right";
  ctx.fillStyle="#ff5d7a"; ctx.fillText("★"+Math.max(0,player.lives), W-64, H-8);
  ctx.fillStyle="#7ee6a0"; ctx.fillText("✦"+Math.max(0,player.bombs), W-8, H-8);
  ctx.fillStyle="#241b3f"; ctx.fillRect(W/2-50,H-17,100,7);
  ctx.fillStyle="#c9a7ff"; ctx.fillRect(W/2-50,H-17,100*player.power/4,7);
  ctx.restore(); ctx.textAlign="left";
}

// ASIデモ中の常時表示: デモバッジ+タイトルへ戻る案内
function drawDemoHud(){
  if(!game.demo || game.state!=="play") return;
  ctx.save();
  // 右上バッジ
  ctx.font="bold 10px monospace"; ctx.textAlign="right";
  ctx.fillStyle="#7ee6a0"; ctx.fillText("ASI DEMO PLAY", W-8, H-34);
  // 戻るボタン(下部右)
  const label = IS_TOUCH ? "タップでタイトルに戻る" : "Z: タイトルに戻る";
  ctx.font="10px sans-serif";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle="rgba(5,3,12,0.6)"; ctx.fillRect(W-tw-22, H-24, tw+16, 18);
  ctx.strokeStyle="rgba(126,230,160,0.5)"; ctx.strokeRect(W-tw-22, H-24, tw+16, 18);
  ctx.fillStyle="#7ee6a0"; ctx.fillText(label, W-14, H-11);
  ctx.restore(); ctx.textAlign="left";
}

// デモ撃破後の画面: みそのの立ち絵+セリフ(入力待ちなし)→10秒後にリプレイ告知
function drawDemoEnd(){
  const de = game.demoEnd; if(!de) return;
  const sc = curScenario();
  const bd = sc.boss.dialog("pre");
  const img = bd.img;
  if(img.complete && img.naturalWidth){
    const pw=img.naturalWidth*bd.scale, ph=img.naturalHeight*bd.scale;
    const px = bd.center ? (W-pw)/2 : W-pw-bd.margin;
    ctx.drawImage(img, px, H-ph-bd.bottom, pw, ph);
  }
  // セリフボックス(会話と同じ見た目)
  const bx=14, by=H-124, bw=W-28, bh=104;
  ctx.fillStyle="rgba(8,5,18,0.9)"; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle="#c9a7ff"; ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle="#c9a7ff"; ctx.font="bold 13px sans-serif"; ctx.textAlign="left";
  ctx.fillText(sc.demoEndWho||"", bx+14, by+24);
  ctx.fillStyle="#e8e2f5"; ctx.font="13px sans-serif";
  const maxW=bw-28; let line="", ly=by+48;
  for(const ch of sc.demoEndText||""){
    if(ctx.measureText(line+ch).width>maxW){ ctx.fillText(line,bx+14,ly); line=ch; ly+=20; }
    else line+=ch;
  }
  ctx.fillText(line,bx+14,ly);
  // 10秒後: 自動リプレイ告知
  if(de.t>600){
    ctx.textAlign="center";
    ctx.fillStyle="rgba(5,3,12,0.75)"; ctx.fillRect(0,H*0.40-24,W,36);
    ctx.fillStyle="#7ee6a0"; ctx.font="bold 15px monospace";
    ctx.fillText(sc.demoReplayText||"", W/2, H*0.40);
    ctx.textAlign="left";
  }
}

function render(){
  ctx.save();
  if(game.shake>0) ctx.translate(rand(-game.shake,game.shake)*0.5, rand(-game.shake,game.shake)*0.5);
  drawBG();
  drawPlayerBullets();
  drawItems();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawEnemyBullets();
  drawEffects();
  drawBanner();
  drawCutIn();
  drawDifficultyBadge();
  drawHUD();
  drawDialog();
  drawDemoEnd();
  drawDemoHud();
  ctx.restore();
  drawOverlay();
}

//======================================================================
// 制御
//======================================================================
function startGame(){
  game.state="play"; game.paused=false;
  game.score=0; game.graze=0; game.shake=0; game.overPending=false;
  player.lives=DIFF_LIVES[game.diff]; player.bombs=DIFF_BOMBS[game.diff]; player.power=1;
  player.x=W/2; player.y=H-80; player.alive=true; player.invul=120;
  player.bombTime=0; player.slowLerp=0; player.dir=0;
  pBullets=[]; eBullets=[]; enemies=[]; items=[]; effects=[]; boss=null; cutIn=null;
  game.dialog=null;
  game.demo=false; game.demoEnd=null;
  game.banner={t:0, dur:210};
  buildStage();
}
function togglePause(){
  if(game.state==="play") game.paused=!game.paused;
}

function loop(){
  if(game.state==="play" && !game.paused) update();
  else { game.frame++; updateIntro(); }
  updateBgm();
  render();
  requestAnimationFrame(loop);
}
