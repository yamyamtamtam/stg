"use strict";
//======================================================================
// 起動: 全シナリオの登録が終わった後に選択画面UIを確定してメインループ開始
// (index.html の <script> 読み込み順で必ず最後に来ること)
//======================================================================
// シナリオ選択画面の選択カード(縦一列。難易度選択画面と同じ構造)
const SCENARIO_ROW_H = 64, SCENARIO_ROW_GAP = 12;
const SCENARIO_CHIPS = SCENARIOS.map((sc,i)=>({
  sc, i, w:320, h:SCENARIO_ROW_H,
  x: (W-320)/2,
  y: (H/2 - ((SCENARIO_ROW_H+SCENARIO_ROW_GAP)*SCENARIOS.length-SCENARIO_ROW_GAP)/2) + i*(SCENARIO_ROW_H+SCENARIO_ROW_GAP),
}));
loop();
