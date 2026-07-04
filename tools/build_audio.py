#!/usr/bin/env python3
"""
BGM埋め込みスクリプト
- assets/audio/ の mp3 を base64 化して index.html に埋め込む

使い方:
  python3 tools/build_audio.py
依存: なし(標準ライブラリのみ)
"""
import base64, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

FILES = {
    'BGM_TITLE': 'assets/audio/bgm_title.mp3',   # タイトル〜チュートリアル
    'BGM_STAGE': 'assets/audio/bgm_stage.mp3',   # 道中
    'BGM_BOSS':  'assets/audio/bgm_boss.mp3',    # ボス戦(みその/オタサーの姫 共通)
}

def main():
    html_path = ROOT / 'index.html'
    html = html_path.read_text(encoding='utf-8')
    for name, relpath in FILES.items():
        data = (ROOT / relpath).read_bytes()
        b64 = base64.b64encode(data).decode()
        pat = re.compile(name + r'="data:audio/mpeg;base64,[^"]*"')
        assert pat.search(html), f'{name} not found in index.html'
        html = pat.sub(f'{name}="data:audio/mpeg;base64,{b64}"', html)
        print(f'injected {name} ({len(b64)} chars from {relpath}, {len(data)} bytes)')
    html_path.write_text(html, encoding='utf-8')
    print('index.html updated')

if __name__ == '__main__':
    main()
