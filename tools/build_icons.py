#!/usr/bin/env python3
"""
PWAアイコン生成スクリプト
- 棗みその立ち絵(assets/source/misono_full.png)から顔周りを正方形に切り抜き
- ゲームと同系色のラジアルグラデーション背景に合成して各サイズのPNGを書き出す

使い方:
  python3 tools/build_icons.py
依存: pillow, numpy
"""
import pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'

# 立ち絵から顔〜パーカーの月マークあたりまでを正方形クロップ(元画像1024x1536中の座標)
FACE_CROP = (272, 40, 752, 520)

# 背景色: index.html の --bg / #wrap の box-shadow の色に合わせたラジアルグラデーション
BG_INNER = (46, 27, 74)   # 中心のほんのり明るい紫(box-shadow #1d0f3a寄り)
BG_OUTER = (10, 7, 20)    # --bg: #0a0714

def radial_bg(size):
    y, x = np.mgrid[0:size, 0:size]
    cx = cy = size / 2
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size / 2 * 1.05)
    d = np.clip(d, 0, 1)[..., None]
    inner = np.array(BG_INNER, dtype=float)
    outer = np.array(BG_OUTER, dtype=float)
    arr = (inner * (1 - d) + outer * d).astype('uint8')
    return Image.fromarray(arr, 'RGB').convert('RGBA')

def make_icon(face, size, subject_ratio):
    canvas = radial_bg(size)
    sub = round(size * subject_ratio)
    face_resized = face.resize((sub, sub), Image.LANCZOS)
    pos = ((size - sub) // 2, (size - sub) // 2)
    canvas.alpha_composite(face_resized, pos)
    return canvas.convert('RGB')

def main():
    src = Image.open(ROOT / 'assets/source/misono_full.png').convert('RGBA')
    face = src.crop(FACE_CROP)  # 480x480, 背景は既に透過(アルファ0)
    OUT.mkdir(parents=True, exist_ok=True)

    # 通常アイコン(purpose:any): 余白控えめ
    for size in (192, 512):
        im = make_icon(face, size, subject_ratio=0.90)
        im.save(OUT / f'icon-{size}.png')
        print(f'icons/icon-{size}.png {im.size}')

    # maskableアイコン: OSに丸くマスクされても顔が切れないよう安全マージンを広めに
    for size in (192, 512):
        im = make_icon(face, size, subject_ratio=0.62)
        im.save(OUT / f'icon-maskable-{size}.png')
        print(f'icons/icon-maskable-{size}.png {im.size}')

    # iOSホーム画面用(角丸はOS側で自動処理されるので正方形のまま)
    im = make_icon(face, 180, subject_ratio=0.92)
    im.save(OUT / 'apple-touch-icon-180.png')
    print('icons/apple-touch-icon-180.png', im.size)

    # ブラウザタブ用favicon(小さいので顔を大きめに)
    for size in (32, 16):
        im = make_icon(face, size, subject_ratio=0.98)
        im.save(OUT / f'favicon-{size}.png')
        print(f'icons/favicon-{size}.png {im.size}')

if __name__ == '__main__':
    main()
