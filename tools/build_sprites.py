#!/usr/bin/env python3
"""
ドット絵ビルドスクリプト
- ピクセルマップ(文字列)からスプライトPNGを生成
- EPX(Scale2x)で角を斜め補間して丸みを付与
- 立ち絵をクロップ/縮小/減色してカットイン用に加工
- index.html 内の base64 定数を差し替え

使い方:
  python3 tools/build_sprites.py            # assets/sprites/ を再生成
  python3 tools/build_sprites.py --inject   # 生成 + index.html に埋め込み
依存: pillow  (pip install pillow)
"""
import base64, io, re, sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
hex_ = lambda s: (int(s[0:2],16), int(s[2:4],16), int(s[4:6],16), 255)

# ======================================================================
# パレット & ピクセルマップ
# ======================================================================
URARA_PAL = {
 'O':hex_('3a2620'),'G':hex_('f4d488'),'g':hex_('fff1c4'),'d':hex_('d8b264'),
 'P':hex_('f2a9c0'),'p':hex_('e08aa8'),
 'W':hex_('f8f6f1'),'w':hex_('ddd6c8'),
 'C':hex_('dcae62'),'c':hex_('bd8f4a'),
 'K':hex_('7a5240'),'D':hex_('55382c'),'q':hex_('93684f'),
 'T':hex_('46332c'),'S':hex_('2e2019'),
}
URARA = [  # 神北うらら(後ろ姿) 20x28
"......OOOOOOOO......",
"....OGGggGGGGGGO....",
"...OGGgggGGGGGGGO...",
"..OGGggGGGGGGGGGGO..",
"..OGGgGGGGGGGGGGdO..",
".OGGGGGGGGGGGGGGGdO.",
".OGGGGGGGGGGGGGGGdO.",
".OGGGGGGGGGGGGGGGdO.",
".OGGGGGGGGGGGGGGddO.",
".OGPGGGGGGGGGGGGPdO.",
".OPPpGGGGGGGGGGpPPO.",
"..OPpPPGGGGGGPPpPO..",
"...OPppPPPPPPppPO...",
"..OPpO........OpPO..",
"....OWWWWWWWWWWO....",
"...OWWWWWWWWWWWWO...",
"...OWWWwWWWWwWWWO...",
"...OWWWwWWWWwWWWO...",
".OCCCCCCCCCCCCCCCCO.",
".OCcCCCCccCCCCCcCCO.",
".OCCcCCCCCCCCCcCCCO.",
"...OKqDKKKDKqKKKO...",
"..ODKqKKDKKqKKDKKO..",
"..OKKqDKKKDqKKKKKO..",
"...ODDDDDDDDDDDDO...",
"......OTT..TTO......",
"......OTT..TTO......",
".....OSSSO..OSSSO...",
]

MISONO_PAL = {
 'O':hex_('2c2338'),'H':hex_('ece8f2'),'h':hex_('ffffff'),
 'L':hex_('c3b2e6'),'v':hex_('9f86d6'),
 'F':hex_('ffe3c8'),'f':hex_('f7b8c4'),'M':hex_('c97a85'),
 'e':hex_('7a4dd8'),'E':hex_('b79cf0'),
 'U':hex_('4a3c60'),'u':hex_('3a2f4e'),'s':hex_('cfc4e8'),'m':hex_('e6d9fa'),
 'p':hex_('8257c9'),'P':hex_('241d30'),'B':hex_('241d30'),'b':hex_('6e4fb0'),
}
MISONO = [  # 棗みその 22x40 (頭身を上げるため胴体・脚を延長)
".......OOOOOOOO.......",
"......OHHhhHHHHO......",
".....OHHhhHHHHHHO.....",
"....OHHhHHHHHHHHHO....",
"...OHHHHHHHHHHHHHHO...",
"..OHHHHHHHHHHHHHHHHO..",
"..OHHHHHHHHHHHHHHHHO..",
"..OHHOFFFFFFFFFFOHHO..",
"..OHHFFFFFFFFFFFFHHO..",
"..OHHFFeEFFFFeEFFHHO..",
"..OHHFfFFFFFFFFfFHHO..",
"..OHHFFFFFMMFFFFFHHO..",
"..OHHOFFFFFFFFFFOHHO..",
"..OHHPpUUUUUUUUpPHHO..",
"..OHHUUUsUUUUsUUUHHO..",
"..OHHUUUsUUUUsUUUHHO..",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHuUUUUUUUUUUUUuHHO.",
"..OHHUUUUUmmUUUUUHHO..",
"..OHHUUUUmmUUUUUUHHO..",
"..OHHUUUmmUUUUUUUHHO..",
"..OHHUUUmmUUUUUUUHHO..",
"..OHHUUUUmmUUUUUUHHO..",
"..OHHUUUUUmmmUUUUHHO..",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHuUUUUUUUUUUUUuHHO.",
".OHHOuUUUUUUUUUUuOHHO.",
".OLHOOUUUUUUUUUUOOHLO.",
".OLL..OOOOOOOOOO..LLO.",
".OLL..OOOOOOOOOO..LLO.",
"..OLL...FF..FF...LLO..",
"..OLL...FF..FF...LLO..",
"..OLL...FF..FF...LLO..",
"..OLL...BB..BB...LLO..",
"..OLL...BB..BB...LLO..",
"...OLL..bb..bb..LLO...",
"....OO..........OO....",
]

ZAKO_PAL = {
 'O':hex_('241820'),'K':hex_('3a2530'),'S':hex_('e8a878'),
 'e':hex_('2c1a22'),'n':hex_('b04838'),'m':hex_('8c3030'),'N':hex_('2c3350'),
}
ZAKO = [  # 小雑魚(顔面) 14x15
"...OOOOOOOO...",
"..OKKKKKKKKO..",
".OKKKKKKKKKKO.",
".OKKSSSSSKKKO.",
".OKSSSSSSSKKO.",
".OKSeeSSeeKKO.",
".OKSSSSSSSKO..",
".OKSSSnSSSKO..",
"..OSSSSSSSO...",
"..OSmmmSSSO...",
"..OSSSSSSO....",
"...OSSSSSO....",
"..ONNSSNNNO...",
".ONNNNNNNNNO..",
"..OOOOOOOOO...",
]

ZAKO2_PAL = {
 'O':hex_('2a1a14'),'K':hex_('a05c2c'),'k':hex_('c47a3e'),
 'B':hex_('3e6fc4'),'b':hex_('7ea3e0'),
 'S':hex_('d99a6c'),'e':hex_('3a241c'),'n':hex_('b06a42'),
 'm':hex_('8a4a3a'),'g':hex_('ffd76e'),
}
ZAKO2 = [  # 強雑魚(バンダナ) 14x16
"...OK.OO.KO...",
"..OKKOKKOKKO..",
"..OKkKKkKKKO..",
".OBBBBBBBBBBO.",
".OBbBBbBBbBBO.",
".OBBBBBBBBBBO.",
".OSSSSSSSSSSO.",
".OSeeSSSeeSSO.",
"gOSSSSnSSSSO..",
"OgOSSSSSSSSO..",
".OSSSSSSSSO...",
".OSSmmmmSSO...",
"..OSSSSSSO....",
"..OSSSSSSO....",
".OSSSSSSSSSO..",
".OOOOOOOOOOO..",
]

# ======================================================================
def render(rows, pal):
    w, h = len(rows[0]), len(rows)
    for i, r in enumerate(rows):
        assert len(r) == w, f"row{i} len={len(r)} expected {w}"
    im = Image.new('RGBA', (w, h), (0,0,0,0)); px = im.load()
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != '.': px[x, y] = pal[c]
    return im

def epx(im):
    """EPX(Scale2x): 角・階段を斜めに補間して丸みを出す2倍拡大"""
    w, h = im.size; src = im.load()
    out = Image.new('RGBA', (w*2, h*2), (0,0,0,0)); dst = out.load()
    T = (0,0,0,0)
    get = lambda x, y: src[x, y] if 0 <= x < w and 0 <= y < h else T
    for y in range(h):
        for x in range(w):
            P=get(x,y); A=get(x,y-1); B=get(x+1,y); C=get(x-1,y); D=get(x,y+1)
            p1=p2=p3=p4=P
            if C==A and C!=D and A!=B: p1=A
            if A==B and A!=C and B!=D: p2=B
            if D==C and D!=B and C!=A: p3=C
            if B==D and B!=A and D!=C: p4=D
            dst[2*x,2*y]=p1; dst[2*x+1,2*y]=p2; dst[2*x,2*y+1]=p3; dst[2*x+1,2*y+1]=p4
    return out

def lean(im, max_shift, pad):
    """移動時の傾き差分スプライット生成: 行ごとに横シフトし、下端(足元)を軸に上ほど傾ける"""
    w, h = im.size
    out = Image.new('RGBA', (w+pad*2, h), (0,0,0,0))
    for y in range(h):
        shift = round(max_shift * (1 - y/(h-1))) if h > 1 else 0
        row = im.crop((0, y, w, y+1))
        out.paste(row, (pad+shift, y), row)
    return out

def portrait(path, height, crop_ratio=None):
    """立ち絵加工: αでトリム → (任意)下をカット → 縮小 → 減色"""
    im = Image.open(path)
    im = im.crop(im.getchannel('A').getbbox())
    if crop_ratio:
        im = im.crop((0, 0, im.width, int(im.height*crop_ratio)))
    w = round(im.width * height / im.height)
    im = im.resize((w, height), Image.LANCZOS)
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(colors=255, method=Image.Quantize.FASTOCTREE,
                                   dither=Image.Dither.FLOYDSTEINBERG).convert('RGB')
    out = q.convert('RGBA'); out.putalpha(a)
    return out

def to_b64(im):
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode()

URARA_LEAN, MISONO_LEAN = 3, 5  # 傾き差分スプライットの最大シフト量(px, EPX後の等倍)

def build():
    urara_im, misono_im = epx(render(URARA, URARA_PAL)), epx(render(MISONO, MISONO_PAL))
    sprites = {
        'urara':       lean(urara_im, 0, URARA_LEAN),
        'urara_left':  lean(urara_im, -URARA_LEAN, URARA_LEAN),
        'urara_right': lean(urara_im,  URARA_LEAN, URARA_LEAN),
        'misono':       lean(misono_im, 0, MISONO_LEAN),
        'misono_left':  lean(misono_im, -MISONO_LEAN, MISONO_LEAN),
        'misono_right': lean(misono_im,  MISONO_LEAN, MISONO_LEAN),
        'zako':   epx(render(ZAKO,   ZAKO_PAL)),
        'zako2':  epx(render(ZAKO2,  ZAKO2_PAL)),
    }
    outdir = ROOT / 'assets' / 'sprites'
    outdir.mkdir(parents=True, exist_ok=True)
    for name, im in sprites.items():
        im.save(outdir / f'{name}.png')
        print(f'sprites/{name}.png {im.size}')
    ports = {
        # うらら正面(ボム/会話用)
        'URARA_PORTRAIT':  portrait(ROOT/'assets/source/urara_front.png', 420),
        # みその: 頭〜太もも(全身の70%)でクロップ
        'MISONO_PORTRAIT': portrait(ROOT/'assets/source/misono_full.png', 400, crop_ratio=0.70),
        # みその: ボス撃破後会話用(ボロボロの全身)
        'MISONO_DEFEATED_PORTRAIT': portrait(ROOT/'assets/source/misono_defeated.png', 420),
        # うらら: ゲームオーバー会話用(悔しがる顔)
        'URARA_CRY_PORTRAIT': portrait(ROOT/'assets/source/urara_cry.png', 420),
    }
    return sprites, ports

def inject(sprites, ports):
    html_path = ROOT / 'index.html'
    html = html_path.read_text(encoding='utf-8')
    mapping = {
        'URARA_SPRITE':       to_b64(sprites['urara']),
        'URARA_SPRITE_LEFT':  to_b64(sprites['urara_left']),
        'URARA_SPRITE_RIGHT': to_b64(sprites['urara_right']),
        'MISONO_SPRITE':       to_b64(sprites['misono']),
        'MISONO_SPRITE_LEFT':  to_b64(sprites['misono_left']),
        'MISONO_SPRITE_RIGHT': to_b64(sprites['misono_right']),
        'ZAKO_SPRITE':   to_b64(sprites['zako']),
        'ZAKO2_SPRITE':  to_b64(sprites['zako2']),
        'URARA_PORTRAIT':  to_b64(ports['URARA_PORTRAIT']),
        'MISONO_PORTRAIT': to_b64(ports['MISONO_PORTRAIT']),
        'MISONO_DEFEATED_PORTRAIT': to_b64(ports['MISONO_DEFEATED_PORTRAIT']),
        'URARA_CRY_PORTRAIT': to_b64(ports['URARA_CRY_PORTRAIT']),
    }
    for name, b64 in mapping.items():
        pat = re.compile(name + r'="data:image/png;base64,[^"]+"')
        assert pat.search(html), f'{name} not found in index.html'
        html = pat.sub(f'{name}="data:image/png;base64,{b64}"', html)
        print(f'injected {name} ({len(b64)} chars)')
    html_path.write_text(html, encoding='utf-8')

if __name__ == '__main__':
    sprites, ports = build()
    if '--inject' in sys.argv:
        inject(sprites, ports)
        print('index.html updated')
