# CLAUDE.md — プロジェクトコンテキスト

## 概要
東方風の弾幕STG「インターネット民俗STG」。ビルド工程なしの素のHTML+JS。
classic `<script src>` の読み込み順だけで動く(file://でもGitHub Pagesでも可)。

## ファイル構成と読み込み順(index.html に定義)
1. `js/gen/sprites.js` — **自動生成**。base64画像 `SPRITE_SRC` と `IMG.<KEY>`(Image化済み)。手で編集しない
2. `js/gen/audio.js` — **自動生成**。BGM base64 `BGM_SRC.{TITLE,STAGE,BOSS,SINGULARITY}`。手で編集しない
3. `js/engine.js` — 共通エンジン(下記)
4. `js/scenarios/scenario*.js` — 各シナリオ。IIFEで包み `registerScenario()` で登録
5. `js/main.js` — シナリオ選択カード確定 + `loop()` 起動

CSSは `css/style.css`。全ファイルのトップレベル `const/let` はグローバル字句スコープを
共有する(classic script)ので、エンジンの関数・変数はシナリオファイルからそのまま使える。
シナリオファイル内部はIIFEでローカル化し、名前衝突を防ぐこと。

## js/engine.js の構成
- 入力: `keys{}`(キーボード) / `touch{}`(タッチ。ドラッグ移動・ダブルタップボム・2本指低速)
- 弾: `shot()/nway()/ring()`。opt で `moon`(三日月弾) `word`(文字弾) `seq`(114514数字弾)
  `accel/turn` `sprite/spin`(canvas画像弾: コイン・チケット等。spin=0で進行方向を向く)
  `update(b)`(指定すると直進せず毎フレームこの関数だけで動く。ボス周回のデコ弾等)を指定
- 汎用雑魚AI: `zakoAI.{diver,crosser,swirler}`。シナリオ固有AIは各シナリオファイルが
  `zakoAI.xxx = function(e){...}` で追加(fortress→シナリオ1、chiuma/buta→シナリオ2、
  wannabeM/wannabeF/believer→シナリオ3)
- ステージ: `at(frame,fn)` でタイムライン構築。2150fで `startDialogue`(会話→ボス)が通例
- 会話: `game.dialog` が非nullの間ゲーム進行停止。`DIALOG_OVER`(ゲームオーバー)のみエンジン側
- ボス進行: `nextPhase()`がスペル配列を順に消化。スペル要素のフック:
  - `fire(b)` 毎フレーム / `onStart(b)` フェーズ開始時(召喚など) /
    `checkAdvance(b)` trueを返すとHP残でも次フェーズへ(例: 召喚全滅で発狂)
  - `summonTag` 付きの敵が生存中はボスへのダメージが0.12倍(エンジン共通機構)
- 自機: 扇状ショット(パワー1.0-4.0で1/3/5/7/9本)。スマホオプション2台(slowLerpで横⇔前方)。
  当たり判定は中心の小さい玉のみ(player.r=1.5=直径3px)で、緑コアのマーカーと同径
- `loop()`: 全ロジックが60fps前提のフレーム単位で書かれているため、`requestAnimationFrame`の
  コールバック間隔をそのままティックにはせず、実時間を計測した固定タイムステップ+
  アキュムレータで`update()`の呼び出し回数を60回/秒に正規化している(120Hz等の高リフレッシュ
  レート端末で処理速度が上がってしまうのを防ぐため)。新しく時間経過に依存する処理を足す時も
  「1フレーム=1/60秒」の前提のまま書いてよい
- レイアウト: css/style.css のメディアクエリと js/engine.js の `PHONE_LAYOUT`(同一条件を
  matchMediaで判定)が対になっている。狭い画面/タッチ縦向き/タッチ横向きでも狭い場合は
  スマホ的な全画面レイアウト、タッチ横向きで広い場合(タブレット横)だけサイドパネル付きの
  PC同様レイアウトになる(操作方法自体はタッチデバイスなら常にタッチのまま = `IS_TOUCH`)
- 描画: drawBG(01レイン+グリッチ) → 敵(e.sprite優先) → ボス(浮遊カード) → 自機 → 弾 →
  自機の当たり判定マーカー(プレイ中常時表示。敵弾より上のレイヤーなので大玉弾幕に埋もれない) →
  バナー/カットイン/HUD/会話。敵・ボスのスプライト/立ち絵はシナリオ定義から引く
- ASIデモ: `demoDodge()` = ビームサーチ式の経路探索AI(**無敵チート無し**。`playerHit()`は
  デモ中も普通に効く)。弾を等速直線で先読みし、生き残れる経路の一手目だけ実行して毎フレーム
  再探索。`demoSafeSpot()`(2D安全マップ)が長期の退避先を、ルート定義の`demoBeltY(boss)`が
  推奨滞空高度を与える。シナリオ4の両弾幕は「生存回廊」(ゆっくり漂う回廊柱を滞空帯で横切る
  弾道を発射時に間引く仕組み)で理論上回避不能な瞬間を構造的に排除しており、デモの完走
  (被弾ゼロ)はこの保証の実測テストを兼ねる
- SE: Web Audio APIの8bit風プロシージャル合成。BGM: `updateBgm()` がstate/bossで自動切替。
  シナリオ定義に `bgm:"キー名"` があると会話〜ボス撃破はその曲(BGM追加は build_audio.py の FILES に1行)

## シナリオの追加手順(1日1シナリオ運用)
1. `js/scenarios/scenarioN_xxx.js` を新規作成。既存3ファイル(シナリオ1〜3)が実例で、契約は:
   ```js
   registerScenario({
     name, sub,                    // 選択画面・道中バナー表示
     diffOptions,                  // 任意: [{name,sub},...] で難易度選択をシナリオ専用の選択肢に差し替え
                                   // (game.diffがそのindexになる)
     buildStage(),                 // at()でタイムライン構築。最後に at(2150, startDialogue)
     dialogPre, dialogPost,        // [{who, text}, ...]
     boss: {
       name,
       spells,                     // [{name, hp, time, spell, fire(b), onStart?, checkAdvance?}]
       sprite(b),                  // 弾幕中ドット絵(b.dir/b.enragedで差分)
       cutIn,                      // スペカカットイン立ち絵(IMG.XXX)
       dialog(set),                // 会話立ち絵 {img, scale, margin, bottom}("pre"/"post")
     },
   });
   ```
   分岐のあるシナリオ(シナリオ4が実例)は上記の代わりに `routes:[{name, sub, ...上記と同じ契約}, ...]` を
   定義できる。`name/sub` はルート選択カードの表示に使われ、選択後は `curRoute()` がそのルートの
   設定を返す(`curScenario()` はシナリオ全体=ルート選択前の情報のみ。道中バナーの名前表示に使う)。
   ルート選択画面はシナリオ選択→難易度選択の間に挟まり、`routes` を定義しないシナリオでは自動的に
   スキップされる
2. `index.html` の `js/main.js` より前に `<script>` タグを1行追加
3. 新スプライトが要る場合は `tools/build_sprites.py` にピクセルマップ/立ち絵を追加して
   `--inject` → `IMG.<定数名>` で参照。敵定義に `sprite: IMG.XXX` を渡すと雑魚の絵になる
4. ASIデモプレイ(難易度選択画面下の自動デモボタン)が要る場合はシナリオ(または各ルート)に
   `demoLabel/demoDiff/demoEndWho/demoEndText/demoReplayText` を定義。自機の見た目を
   差し替えたい場合は `demoPlayerSprite(dir)` も追加(シナリオ4は棗みその後ろ姿)。
   回転弾幕など「適正高度」があるパターンは `demoBeltY(boss)` で回避AIに滞空高度を教える

## アセットパイプライン
- ドット絵: `tools/build_sprites.py` 内のピクセルマップ(文字列アート)が原本。
  render → EPX(Scale2x で角を斜め補間=丸み) → PNG
- 立ち絵: assets/source/ の元絵を αトリム→クロップ→縮小→255色減色。
  背景透過pngが手に入る場合はそれを使い輪郭に沿った切り抜きにする(不透明背景からの
  自前セグメンテーションは苦戦するので避け、ユーザーに透過版をもらう)
- **画像を変更したら** `python3 tools/build_sprites.py --inject`(js/gen/sprites.js を再生成)
- BGM: `assets/audio/bgm_{title,stage,boss}.mp3` → `python3 tools/build_audio.py`
  (js/gen/audio.js を再生成)
- assets/sprites/ は生成物のプレビュー用。ゲームは js/gen/sprites.js の base64 を参照する
- PWA: `manifest.json`(インストール時タイトルは「IT STG」)+ `sw.js`(オフラインキャッシュ)。
  アイコンは `tools/build_icons.py` が棗みその立ち絵(assets/source/misono_full.png)の顔周りを
  切り抜いて assets/icons/ に生成する。`sw.js` のキャッシュ対象リストを変えたら `CACHE` の
  バージョン番号を上げること
- OGP: index.html の og:*/twitter:* メタタグ + `tools/build_ogp.py` が生成する assets/ogp.png
  (棗みその立ち絵+タイトルの合成)。og:image は GitHub Pages の絶対URL決め打ちなので、
  リポジトリ移転時は index.html 側のURLも直すこと

## 規約・注意
- 描画はドット絵部分で `imageSmoothingEnabled=false` + 整数座標(Math.round)
- 敵弾の当たり判定は円(b.r)。月弾/文字弾は見た目の方が大きい(プレイヤー有利)に統一
- 会話・カットイン等のテキストは日本語。自機: 神北うらら
- js/gen/ の2ファイルは巨大base64行を含む。**直接Read/Editしない**(必ずtoolsで再生成)
- 変更後は全jsを `node --check` で構文確認し、ブラウザ(Playwright可)でタイトル→シナリオ選択
  →ステージ→会話→ボス撃破→クリアまで通しで確認すること
