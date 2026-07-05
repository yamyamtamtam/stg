# インターネット民俗STG

東方Projectライクな縦スクロール弾幕STG。依存ライブラリ・ビルド工程なしの素のHTML+JSで動作します(`index.html` をブラウザで開くだけ。file://でもGitHub Pagesでも可)。

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
- シナリオ選択制(タイトル後に選択):
  - 「ホモガキミームの海」: ボス・考現学陰キャ 棗みその(月弾)
    - 月符「AIからの電気信号」/ 倫符「米国からの輸出規制」/「Claudeの辛口忖度なし批評」
  - 「オタサーの森」: 雑魚・チー牛/豚(単語弾)、ボス・オタサーの姫
    - 開幕はチー牛と豚を召喚するのみ。2体を倒すと発狂(ぴえん顔)して本気の弾幕に
    - 病符「私がいなくなってもみんな困らないんだ…」/ 複数「チン騎士ファンネル」/ 円符「オタサーの姫」(チー牛・豚を再召喚して周回、撃破するまでダメージが通りにくい)
  - 「オンラインサロンの宗教」: 雑魚・ワナビー男(お金弾)/ワナビー女(美容弾)、ボス・オンラインサロン主
    - 誇符「人生を変えるAI活用術5選【永久保存版】」(派手だが安置だらけのスカスカ弾幕)
    - 詐符「【2026年最新版】Claude Fableだけで月100万円稼ぐ方法」(再現性のない完全ランダム弾)
    - 符減「オリジナルカルト映画」(教祖は撃たず、信者がチケット弾で攻撃+教祖へ称賛弾を撃ち続ける。信者生存中はダメージが通りにくい)
- ボス戦前に会話パート、グレイズ・スペルカードカットインなど東方風システム一式
- SEはWeb Audio APIによる8bit風プロシージャル合成(音源ファイル不要)、BGMはタイトル〜チュートリアル/道中/ボス戦(みそのとオタサーの姫で共通)の3曲を切替再生

## ファイル構成
```
index.html                  エントリポイント(マークアップ+scriptタグの読み込み順定義のみ)
css/style.css               スタイル
js/engine.js                共通エンジン(入力/自機/弾/敵/描画/会話/ボス進行/シナリオレジストリ)
js/scenarios/scenario1_homogaki.js  シナリオ1「ホモガキミームの海」(道中+みその一式)
js/scenarios/scenario2_otasa.js     シナリオ2「オタサーの森」(チー牛/豚+姫一式)
js/main.js                  起動(シナリオ登録確定+メインループ開始)
js/gen/sprites.js           自動生成: ドット絵/立ち絵のbase64(手で編集しない)
js/gen/audio.js             自動生成: BGMのbase64(手で編集しない)
assets/source/              キャラ元絵(立ち絵・ドット化のリファレンス)
assets/sprites/             生成済みドット絵のプレビュー(EPX適用後)
assets/audio/               BGM音源(mp3。タイトル/道中/ボス戦)
tools/build_sprites.py      ドット絵の再生成 → js/gen/sprites.js を書き出し
tools/build_audio.py        BGM → js/gen/audio.js を書き出し
```

## シナリオの追加方法
1. `js/scenarios/scenarioN_xxx.js` を作る(既存の2ファイルが実例。IIFEで包んで最後に `registerScenario({...})`)
   - 契約: `{name, sub, buildStage(), dialogPre, dialogPost, boss:{name, spells, sprite(b), cutIn, dialog(set)}}`
   - 専用の雑魚AIは `zakoAI.xxx = function(e){...}` でファイル内から拡張できる
2. `index.html` の `js/main.js` より前に `<script src="js/scenarios/scenarioN_xxx.js"></script>` を1行追加
3. 新キャラのドット絵/立ち絵が要る場合は `tools/build_sprites.py` にピクセルマップ等を追加して
   `python3 tools/build_sprites.py --inject` → コード側からは `IMG.<定数名>` で参照

## 開発メモ
- ドット絵はピクセルマップ(文字列)→ PNG → EPX(Scale2x)で丸み付与、という工程で生成
- スプライトを変更したら:
  ```bash
  pip install pillow
  python3 tools/build_sprites.py --inject
  ```
- BGMを差し替えたら `assets/audio/bgm_{title,stage,boss}.mp3` を上書きして:
  ```bash
  python3 tools/build_audio.py
  ```
- js/engine.js の主なセクション: 入力(キー/タッチ) → 弾ヘルパー(shot/nway/ring) →
  汎用雑魚AI(zakoAI) → ステージタイムライン(at/buildStage) → 会話 → ボス進行(nextPhase) →
  描画(drawBG/drawPlayer/drawBoss/drawBullets/drawDialog...)
- GitHub Pages にそのままデプロイ可能(静的ファイルのみ。Settings → Pages でブランチを指定するだけ)
