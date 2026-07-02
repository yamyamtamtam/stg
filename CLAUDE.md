# CLAUDE.md — プロジェクトコンテキスト

## 概要
東方風の弾幕STG「インターネット民俗STG」。**index.html 単体で完結**する構成
(CSS/JS/画像すべて埋め込み)。ビルド工程なし、ブラウザで開けば動く。

## アーキテクチャ(index.html 内)
- `<script>` 1本目: base64画像定数(URARA_SPRITE / MISONO_SPRITE / ZAKO_SPRITE /
  ZAKO2_SPRITE / URARA_PORTRAIT / MISONO_PORTRAIT)
- `<script>` 2本目: ゲーム本体。60fps requestAnimationFrame。主な構成:
  - 入力: `keys{}`(キーボード) / `touch{}`(タッチ。ドラッグ移動・ダブルタップボム・2本指低速)
  - 弾: `shot()/nway()/ring()`。opt で `moon`(三日月弾) `word`(文字弾) `seq`(114514数字弾)
    `accel/turn` を指定
  - 雑魚: `zakoAI.{diver,crosser,swirler,fortress}`。fortress は単語弾の扇を撃つ中型機
  - ステージ: `buildStage()` がタイムライン(`at(frame,fn)`)を構築。2150fで会話→ボス
  - 会話: `DIALOG` 配列 + `drawDialog()`。`game.dialog` が非nullの間ゲーム進行停止
  - ボス: `spells` 配列(通常+スペカ3枚)。カットインは `cutIn` オブジェクト(side:left/right)
  - 自機: 扇状ショット(パワー1.0-4.0で1/3/5/7/9本)。スマホオプション2台(slowLerpで横⇔前方)
  - 描画: drawBG(01レイン+グリッチ) → 敵/ボス(浮遊カード) → 自機 → 弾 → バナー/カットイン/HUD/会話

## アセットパイプライン
- ドット絵: `tools/build_sprites.py` 内のピクセルマップ(文字列アート)が原本。
  render → EPX(Scale2x で角を斜め補間=丸み) → PNG
- 立ち絵: assets/source/ の元絵を αトリム→クロップ(みそのは上70%)→縮小→255色減色
- **画像を変更したら** `python3 tools/build_sprites.py --inject` で index.html に再注入
- assets/sprites/ は生成物のプレビュー用。ゲームは index.html 内の base64 を参照する

## 規約・注意
- 描画はドット絵部分で `imageSmoothingEnabled=false` + 整数座標(Math.round)
- 敵弾の当たり判定は円(b.r)。月弾/文字弾は見た目の方が大きい(プレイヤー有利)に統一
- 会話・カットイン等のテキストは日本語。キャラ名: 神北うらら(自機)/棗みその(ボス)
- 変更後は `node --check` 相当の構文確認と、ブラウザでタイトル→ステージ→会話→ボス撃破
  まで通しで確認すること
