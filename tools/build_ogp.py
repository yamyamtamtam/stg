#!/usr/bin/env python3
"""
OGP画像生成スクリプト
- 棗みその立ち絵(上半身)とゲームタイトルを1200x630のOGP画像に合成する

使い方:
  python3 tools/build_ogp.py
依存: pillow, numpy (フォントはIPAGothicを使用)
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'ogp.png'
FONT_PATH = pathlib.Path('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf')

W, H = 1200, 630
BG_INNER = (46, 27, 74)  # box-shadow #1d0f3a寄りの中心色
BG_OUTER = (10, 7, 20)   # --bg: #0a0714

# みその立ち絵から頭〜パーカー下あたりまでを切り抜く座標(misono_full.png 1024x1536中)
MISONO_CROP = (140, 20, 880, 1020)

def radial_bg(w, h, cx_ratio, cy_ratio):
    y, x = np.mgrid[0:h, 0:w]
    cx, cy = w * cx_ratio, h * cy_ratio
    maxd = np.sqrt(max(cx, w - cx) ** 2 + max(cy, h - cy) ** 2)
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxd
    d = np.clip(d, 0, 1)[..., None]
    inner = np.array(BG_INNER, dtype=float)
    outer = np.array(BG_OUTER, dtype=float)
    arr = (inner * (1 - d) + outer * d).astype('uint8')
    return Image.fromarray(arr, 'RGB').convert('RGBA')

def main():
    canvas = radial_bg(W, H, cx_ratio=0.66, cy_ratio=0.5)

    src = Image.open(ROOT / 'assets/source/misono_full.png').convert('RGBA')
    chara = src.crop(MISONO_CROP)
    target_h = round(H * 1.14)
    scale = target_h / chara.height
    chara = chara.resize((round(chara.width * scale), target_h), Image.LANCZOS)
    px = W - round(chara.width * 0.74)  # 右寄せ、少し画面外にはみ出させる
    py = H - chara.height + 14
    canvas.alpha_composite(chara, (px, py))

    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(FONT_PATH), 62)
    sub_font = ImageFont.truetype(str(FONT_PATH), 25)
    tx, ty = 60, H // 2 - 60

    def shadow_text(xy, text, font, fill):
        x, y = xy
        draw.text((x + 2, y + 3), text, font=font, fill=(5, 3, 12, 200))
        draw.text((x, y), text, font=font, fill=fill)

    shadow_text((tx, ty), "インターネット", title_font, (233, 226, 245, 255))
    shadow_text((tx, ty + 74), "民俗STG", title_font, (233, 226, 245, 255))
    shadow_text((tx + 2, ty + 156), "東方風ブラウザ弾幕STG", sub_font, (201, 167, 255, 255))

    canvas.convert('RGB').save(OUT)
    print('assets/ogp.png', canvas.size)

if __name__ == '__main__':
    main()
