# インターネット民俗STG 〜唯心論 vs 唯物論〜

東方Projectライクな縦スクロール弾幕STG。**単一HTMLファイル**(依存ライブラリなし・画像はbase64埋め込み)で動作します。

## 遊び方

`index.html` をブラウザで開くだけ。

### キーボード
| キー | 操作 |
|---|---|
| 矢印 | 移動 |
| Z | ショット / 決定・会話送り |
| X | 陽符(ボム) |
| Shift | 低速移動(当たり判定表示・スマホオプション前方集中) |
| Esc | ポーズ |

### タッチ(スマホ)
- ドラッグ: 移動(自動ショット)
- ダブルタップ: ボム
- 2本指タッチ: 低速移動
- タップ: スタート / リトライ / 会話送り

## ゲーム内容
- 自機: 神北うらら(太陽弾・扇状ショット。Pアイテムで1→3→5→7→9本に拡大)
- ボス: 考現学陰キャ 棗みその(月弾)
  - 月符「AIからの電気信号」/ 倫符「米国からの輸出規制」/「Claudeの辛口忖度なし批評」
- ボス戦前に会話パート、グレイズ・スペルカードカットインなど東方風システム一式

## ファイル構成
```
index.html              ゲーム本体(これ1つで完結)
assets/source/          キャラ元絵(立ち絵・ドット化のリファレンス)
assets/sprites/         生成済みドット絵(EPX適用後)
tools/build_sprites.py  ドット絵の再生成 & index.htmlへのbase64注入
```

## 開発メモ
- ドット絵はピクセルマップ(文字列)→ PNG → EPX(Scale2x)で丸み付与、という工程で生成
- スプライトを変更したら:
  ```bash
  pip install pillow
  python3 tools/build_sprites.py --inject
  ```
- index.html 内の主なセクション: 入力(キー/タッチ) → 弾ヘルパー(shot/nway/ring) →
  雑魚AI(zakoAI) → ステージタイムライン(buildStage) → 会話(DIALOG) → ボス(spells) →
  描画(drawBG/drawPlayer/drawBoss/drawBullets/drawDialog...)
- GitHub Pages にそのままデプロイ可能(単一ファイルなので Settings → Pages → main を指定するだけ)
