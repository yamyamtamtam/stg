"use strict";
//======================================================================
// シナリオ3「オンラインサロンの宗教」〜再現性の疑問〜
// 道中: ワナビー男(お金弾)/ワナビー女(美容弾)
// ボス: オンラインサロン主。誇符(派手だが安置だらけ)→詐符(完全ランダム弾)
//       →符減「オリジナルカルト映画」(信者のチケット弾+教祖への称賛弾、教祖は撃たない)
//======================================================================
(function(){

//--- お金弾(銭形コイン)スプライト: 金の縁+四角い穴+ハイライト。spinでくるくる回す ---
function makeCoin(r){
  const pad=2, size=Math.ceil((r+pad)*2);
  const c=document.createElement("canvas"); c.width=c.height=size;
  const g=c.getContext("2d"); g.translate(size/2,size/2);
  g.fillStyle="#b8860b"; g.beginPath(); g.arc(0,0,r,0,TAU); g.fill();        // 縁(暗い金)
  g.fillStyle="#ffd76e"; g.beginPath(); g.arc(0,0,r*0.82,0,TAU); g.fill();   // 面
  g.fillStyle="#e8b84a"; g.beginPath(); g.arc(0,0,r*0.55,0,TAU); g.fill();   // 内圏
  g.fillStyle="#8a6508"; g.fillRect(-r*0.26,-r*0.26,r*0.52,r*0.52);          // 四角い穴(銭形)
  g.strokeStyle="rgba(255,255,255,0.85)"; g.lineWidth=1.5;
  g.beginPath(); g.arc(0,0,r*0.68,-2.3,-1.2); g.stroke();                    // ハイライト
  return c;
}
const COIN = makeCoin(8), COIN_BIG = makeCoin(10);

//--- チケット弾スプライト: 映画の半券(ノッチ+ミシン目)。ひらひら舞いながら飛んでくる ---
function makeTicket(){
  const w=26, h=14;
  const c=document.createElement("canvas"); c.width=w+4; c.height=h+4;
  const g=c.getContext("2d"); g.translate(2,2);
  g.fillStyle="#ff5d7a"; g.fillRect(0,0,w,h);                                 // 本体
  g.globalCompositeOperation="destination-out";                               // 両側の半円ノッチ
  g.beginPath(); g.arc(w*0.72,0,2.6,0,TAU); g.fill();
  g.beginPath(); g.arc(w*0.72,h,2.6,0,TAU); g.fill();
  g.globalCompositeOperation="source-over";
  g.strokeStyle="#ffd6e0"; g.lineWidth=1; g.strokeRect(1.5,1.5,w-3,h-3);      // 内枠
  g.setLineDash([2,2]); g.strokeStyle="#fff";                                 // ミシン目
  g.beginPath(); g.moveTo(w*0.72,1); g.lineTo(w*0.72,h-1); g.stroke();
  g.setLineDash([]);
  g.fillStyle="#fff"; g.beginPath(); g.arc(w*0.3,h/2,2.2,0,TAU); g.fill();    // 券面の丸
  return c;
}
const TICKET = makeTicket();

const BEAUTY_WORDS=[["美肌","#ff8ab0"],["小顔","#f2a0b0"],["艶","#c9a7ff"]];
const beautyWord = ()=>BEAUTY_WORDS[Math.floor(rand(0,3))];

// 勧誘の行列: 全員が同じサインカーブ(y=f(x))をなぞって数珠つなぎで横断するワナビー男。
// たまに自機へコインを1枚投げる
zakoAI.snakeM = function(e){
  e.x += e.snakeDir*2.2;
  e.y = e.snakeY + Math.sin(e.x*0.018)*55;
  if(e.t%60===e.seed%60) shot(e.x,e.y,aimAt(e.x,e.y),2.4,{sprite:COIN,spin:0.14,color:"#ffd76e",r:5});
};

// マルチ商法ピラミッド編隊: 定位置に整列して停止し、上の段から順にコインの扇を
// 下へカスケード発射(上に立つほど儲かる)。ひとしきり撒いたら上へ帰っていく
zakoAI.pyramidM = function(e){
  if(e.t<100){ e.y += (e.ty-e.y)*0.07; return; }
  if(e.t<380){
    if((e.t-100-e.row*18)%110===0){
      nway(e.x,e.y+8, Math.PI/2 + (e.x<W/2?0.15:-0.15), 3, 0.65, 1.9, {sprite:COIN,spin:0.14,color:"#ffd76e",r:5});
    }
    return;
  }
  e.y-=1.8; e.x+=(e.x<W/2?-1:1)*0.6;
};

// DM奇襲: 画面横から自機の高さ付近ににゅっと現れ、美容弾のリングを1発置いて即撤退するワナビー女
zakoAI.ambushF = function(e){
  if(e.t<42){ e.x += e.dir*2.8; return; }
  if(e.t===64){ const wd=beautyWord(); ring(e.x,e.y,7,1.5,rand(0,TAU),{word:wd[0],color:wd[1],r:7}); }
  if(game.diff>=2 && e.t===88) shot(e.x,e.y,aimAt(e.x,e.y),2.8,{word:"垢抜け",color:"#ff8ab0",r:7}); // HARD+: 撤退際に一撃
  if(e.t>100) e.x -= e.dir*3.2;
};

// セミナー講師: 画面上部に居座り、重力で放物線を描くコインの噴水をばら撒き続ける中型機
zakoAI.lecturerM = function(e){
  if(e.t<70){ e.y+=1.2; return; }
  if(e.t<520){
    const iv = game.diff>=2 ? 7 : 11;
    if(e.t%iv===0){
      // 初速は控えめに(真上に強く投げると画面上端のカリング y>-30 で弾が消えるため)
      const a = -Math.PI/2 + rand(-1.2,1.2);
      const sp = rand(1.5,2.6);
      shot(e.x,e.y-6,a,sp,{sprite:COIN,spin:0.2,color:"#ffd76e",r:5,
        update(bl){ bl.vy += 0.045; bl.x+=bl.vx; bl.y+=bl.vy; }, // 重力で降り注ぐ
      });
    }
    if(e.t%160===80) e.tx = clamp(e.x+rand(-70,70), 60, W-60);
    if(e.tx!==undefined) e.x += (e.tx-e.x)*0.04;
    return;
  }
  e.y-=1.4;
};

// 成り上がり: 画面下の左右端から上へ駆け上がるワナビー女。内側へ美容弾の扇を撃つ
zakoAI.riserF = function(e){
  e.y -= 1.7; e.x += Math.sin(e.t*0.08)*0.8;
  if(e.t%70===30){
    const wd=beautyWord();
    nway(e.x,e.y, e.x<W/2 ? 0.35 : Math.PI-0.35, 3, 0.5, 1.8, {word:wd[0],color:wd[1],r:7}); // 内側へ
  }
};

// 決算報告: 左右の上角から対角線に横切りながらコインを落とすワナビー男(フィナーレのX交差)
zakoAI.diagM = function(e){
  e.x += e.vx; e.y += 1.7;
  if(e.t%55===e.seed%55) shot(e.x,e.y,Math.PI/2+rand(-0.25,0.25),1.6,{sprite:COIN,spin:0.14,color:"#ffd76e",r:5});
};

// 信者(符減で召喚): 教祖の周りを回りながら自機へチケット弾を乱射し、
// 教祖に向かって称賛の言葉弾を撃ち続ける(称賛弾は教祖を突き抜けて飛んでいく)
zakoAI.believer = function(e){
  const PRAISE=[["神回","#ffd76e"],["有益","#ffd76e"],["さすが","#fff1c4"],["尊敬","#fff1c4"]];
  e.orbitA += e.spin;
  e.x = boss.x + Math.cos(e.orbitA)*e.orbitR;
  e.y = boss.y + Math.sin(e.orbitA)*e.orbitR;
  if((e.t+e.seed)%50===0) shot(e.x,e.y,aimAt(e.x,e.y),2.3,{sprite:TICKET,spin:0.09,color:"#ff8ab0",r:6});
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
  // --- 第1波: 勧誘の行列(左→右のスネーク8連) ---
  for(let i=0;i<8;i++) at(60+i*16, ()=>spawnEnemy({
    x:-20, y:100, snakeDir:1, snakeY:100, seed:i*13, hp:6,
    ai:zakoAI.snakeM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:130, dropPow:i===7?1:0,
  }));
  // --- 第2波: 勧誘の行列(右→左、少し低い段) ---
  for(let i=0;i<8;i++) at(320+i*16, ()=>spawnEnemy({
    x:W+20, y:170, snakeDir:-1, snakeY:170, seed:i*13+7, hp:6,
    ai:zakoAI.snakeM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:130, dropPow:i===7?1:0,
  }));
  // --- 第3波: マルチ商法ピラミッド(1-2-3-4の10人が整列してコインをカスケード) ---
  {
    const rows=[[0],[-1,1],[-2,0,2],[-3,-1,1,3]];
    rows.forEach((cols,row)=>{
      for(const c of cols) at(620+row*14, ()=>spawnEnemy({
        x:W/2+c*38, y:-24-row*10, ty:56+row*34, row, hp:9,
        ai:zakoAI.pyramidM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:170, dropPow:row===0?2:0, dropPoint:1,
      }));
    });
  }
  // --- 第4波: DM奇襲(左右から自機の高さ付近へ交互ににゅっ) ---
  for(let i=0;i<6;i++) at(1020+i*46, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:300+(i%3)*70, dir:i%2?-1:1, hp:7,
    ai:zakoAI.ambushF, sprite:IMG.WANNABE_F_SPRITE, color:"#ff8ab0", score:160, dropPow:i%3===0?1:0,
  }));
  // --- 第5波: セミナー講師x2(重力コインの噴水を撒き続ける中型機) ---
  at(1290, ()=>spawnEnemy({x:W*0.28,y:-30,hp:110,r:16,ai:zakoAI.lecturerM,sprite:IMG.WANNABE_M_SPRITE,color:"#ffb14d",score:1800,dropPow:3,dropPoint:4}));
  at(1350, ()=>spawnEnemy({x:W*0.72,y:-30,hp:110,r:16,ai:zakoAI.lecturerM,sprite:IMG.WANNABE_M_SPRITE,color:"#ffb14d",score:1800,dropPow:3,dropPoint:4}));
  // --- 第6波: 成り上がりラッシュ(画面下の左右端から駆け上がる) ---
  for(let i=0;i<8;i++) at(1600+i*28, ()=>spawnEnemy({
    x:i%2?W-42:42, y:H+20, hp:6,
    ai:zakoAI.riserF, sprite:IMG.WANNABE_F_SPRITE, color:"#ff8ab0", score:140,
  }));
  // --- 最終波: 決算報告(上角からのX交差でコインを落とす) ---
  for(let i=0;i<8;i++) at(1860+i*22, ()=>spawnEnemy({
    x:i%2?W+20:-20, y:-20+(i%4)*14, vx:i%2?-2.0:2.0, seed:i*17, hp:7,
    ai:zakoAI.diagM, sprite:IMG.WANNABE_M_SPRITE, color:"#ffd76e", score:150, dropPow:i%4===0?1:0,
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

// 誇符のデコ弾: ボスの周りを回転するだけの派手な月弾・コインの三重リング(自機には飛んでこない)。
// update指定の弾は直進せず毎フレームこの関数だけで動く。フェーズ切替・ボムで消える
function spawnHokoDecoration(b){
  // 外周は 半径+ゆらぎ7 がボス可動域(x:60〜W-60)から画面外カリング(±30)にかからない80まで
  const RINGS = [
    {n:18, R:42, spin: 0.030, moon:true,  color:"#ffd76e", r:5},
    {n:24, R:61, spin:-0.022, moon:false, color:"#ff9de0", r:5, coin:true},
    {n:30, R:80, spin: 0.016, moon:true,  color:"#c96bff", r:4},
  ];
  for(const ring of RINGS){
    for(let i=0;i<ring.n;i++){
      const a0 = i/ring.n*TAU;
      shot(b.x, b.y, a0, 0, {
        color:ring.color, r:ring.r, moon:ring.moon,
        sprite: ring.coin ? COIN_BIG : null, spin: ring.coin ? 0.1 : 0,
        update(bl){
          if(!boss) return;
          const RR = ring.R + Math.sin(bl.t*0.05 + a0)*7; // 半径をゆらして華やかに
          bl.angle = a0 + bl.t*ring.spin;
          bl.x = boss.x + Math.cos(bl.angle)*RR;
          bl.y = boss.y + Math.sin(bl.angle)*RR;
        },
      });
    }
  }
}

const spells = [
  {
    name:"通常攻撃", hp:340, time:1800, spell:false,
    fire(b){
      if(b.t%55===0) nway(b.x,b.y,aimAt(b.x,b.y),4,0.8,2.4,{sprite:COIN,spin:0.14,color:"#ffd76e",r:5});
      if(b.t%90===40) ring(b.x,b.y,12,1.6,b.t*0.02,{color:"#7ee6a0",r:4});
      if(game.diff>=2 && b.t%70===20) shot(b.x,b.y,aimAt(b.x,b.y),3.2,{word:"月100万",color:"#ff8ab0",r:8}); // HARD+: 高速の煽り弾
      if(b.t%140===0) bossMove(b);
    },
  },
  {
    name:"誇符「人生を変えるAI活用術5選【永久保存版】」", hp:500, time:2100, spell:true,
    onStart(b){ spawnHokoDecoration(b); },
    fire(b){
      // 見た目はボスの周りを回る大量の月弾・コイン(デコ弾: 回るだけで飛んでこない)で超派手。
      // 実際に飛んでくる弾はごく薄く、安置が5つ常に空いている(盛った実績と同じで中身スカスカ)
      if(!eBullets.some(x=>x.update) && b.t%60===30) spawnHokoDecoration(b); // ボムで消されたら飾り直す
      if(b.t%50===0){
        const th = game.diff>=2 ? 0.35 : 0.55;
        for(let i=0;i<30;i++){
          const a=i/30*TAU;
          if(Math.sin(a*5+0.6)<th) continue; // 5つの広い固定安置
          shot(b.x,b.y,a,1.2,{color:"#ff9de0",r:4});
        }
      }
      if(b.t%150===75){
        // 「①〜⑤」の番号弾をゆっくり自機へ(5選の演出)
        const NUM=["①","②","③","④","⑤"];
        for(let i=0;i<5;i++) shot(b.x,b.y,aimAt(b.x,b.y)+(i-2)*0.22,1.5,{word:NUM[i],color:"#8ad4ff",r:7});
      }
      if(b.t%300===150) bossMove(b,40);
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
  bgTheme:"salon",
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
