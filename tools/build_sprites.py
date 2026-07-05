#!/usr/bin/env python3
"""
ドット絵ビルドスクリプト
- ピクセルマップ(文字列)からスプライトPNGを生成
- EPX(Scale2x)で角を斜め補間して丸みを付与
- 立ち絵をクロップ/縮小/減色してカットイン用に加工
- js/gen/sprites.js (自動生成ファイル) を丸ごと書き出す

使い方:
  python3 tools/build_sprites.py            # assets/sprites/ を再生成
  python3 tools/build_sprites.py --inject   # 生成 + js/gen/sprites.js を書き出し
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

# 棗みその後ろ姿(ASIデモプレイの自機用): うららの後ろ姿と同じシルエット(構図)を流用し、
# みそのの配色(銀髪+パーカー+ショートパンツ+黒ニーソ)に配色し直したもの
MISONO_BACK_PAL = {
 'O':hex_('241820'),
 'G':hex_('ece8f2'),'g':hex_('ffffff'),'d':hex_('c3b2e6'),  # 髪(地/ハイライト/影): 銀髪
 'P':hex_('7a4dd8'),'p':hex_('5a37a8'),                      # 髪飾り(地/影): 差し色の紫でハッキリ見せる
 'W':hex_('9f86d6'),'w':hex_('8257c9'),                      # パーカー本体(地/影)
 'C':hex_('4a3c60'),'c':hex_('3a2f4e'),                      # ショートパンツ
 'K':hex_('12141a'),'q':hex_('0c0e12'),'D':hex_('12141a'),   # 黒ニーソ
 'T':hex_('1a1424'),'S':hex_('0c0e12'),                      # 足首/靴
}
MISONO_BACK = list(URARA)

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

CHIUMA_PAL = {
 'O':hex_('231a1c'), 'K':hex_('2e2622'), 'k':hex_('45392f'),
 'S':hex_('d4b896'), 's':hex_('c2a17e'),
 'G':hex_('4a4642'), 'e':hex_('f0ede8'), 'n':hex_('a8876a'),
 'm':hex_('b89474'), 'q':hex_('8a5850'), 'N':hex_('2c3350'),
}
CHIUMA = [  # チー牛(顔面) 14x15
"..OOOOOOOOOO..",
".OKKKKKKKKKKO.",
".OKkkKKKKkkKO.",
".OKSSSSSSSSKO.",
".OSGGGGGGGGSO.",
".OSGeGGGGeGSO.",
".OSGGGGGGGGSO.",
"..OSSSnSSSO...",
"..OSmSSSmSO...",
"..OSSqqqSSO...",
"...OSSSSSO....",
"...OSSSSSO....",
"..ONNSSNNNO...",
".ONNNNNNNNNO..",
"..OOOOOOOOO...",
]

BUTA_PAL = {
 'O':hex_('3a1c1c'), 'K':hex_('e8a0a8'), 'k':hex_('f2bcc2'),
 'S':hex_('f0a8b0'), 's':hex_('e88f9a'),
 'n':hex_('7a3038'), 'e':hex_('2c1418'), 'm':hex_('c25a68'),
}
BUTA = [  # 豚(顔面) 14x15
"..OKKKKKKKO...",
".OKKKKKKKKKO..",
"OKKSSSSSSSKKO.",
"OKSSSSSSSSSKO.",
"OKSeSSSSSeSKO.",
"OKSSSSSSSSSKO.",
"OKSSnnnnnSSKO.",
"OKSSnnnnnSSKO.",
"OKSSnnnnnSSKO.",
".OKSSSmSSSKO..",
"..OKSSSSSKO...",
"..OKKSSSKKO...",
"...OKKKKKO....",
"....OKKKO.....",
".....OOO......",
]

HIME_PAL = {
 'O':hex_('2c2338'),
 'H':hex_('f2e2ba'), 'h':hex_('fbf3dc'),   # 髪(地/ハイライト)
 'R':hex_('c9a8d9'), 'r':hex_('e0c8ec'),   # 左花(ラベンダー)
 'P':hex_('e69a92'), 'p':hex_('f2bcb4'),   # 右花(ピンク)
 'G':hex_('7fae7a'),                       # 葉
 'F':hex_('fbe3cc'), 'f':hex_('f4b8c0'), 't':hex_('7ec6f0'),
 'E':hex_('6b5842'), 'e':hex_('ffffff'), 'M':hex_('c97a85'),
 'D':hex_('cfc9de'), 'd':hex_('e6e2f0'),   # ドレス(ラベンダーグレー・地/ハイライト)
 'B':hex_('eeaebb'), 'W':hex_('f5f3f7'), 'K':hex_('5c4a3a'),
}
HIME = [  # オタサーの姫(通常) 22x34: 添付イラスト(ブロンド+花冠+ラベンダーグレーのドレス)を元にドット絵化
".......OOOOOOOO.......",
"......ORRHHHHPPO......",
".....ORrRHHHHPpPO.....",
"....OGRRHHHHHHPGPO....",
"....OHHHHHHHHHHHHO....",
"..OOHHHHHHHHHHHHHHOO..",
"..OHHHHHHHHHHHHHHHHO..",
".OOOHHOFFFFFFFFOHHOO..",
"..OHHFFFFFFFFFFFFHHO..",
"..OHHFFeEFFFFeEFFHHO..",
"..OHHFfFFFFFFFFfFHHO..",
"..OHHFFFFFMMFFFFFHHO..",
"..OHHOFFFFFFFFFFOHHO..",
".OHHHOOOOOOOOOOOOHHHO.",
".OHHHDDBBBBBBBBDDHHHO.",
"OHHDDDDDBBBBBBDDDDDHHO",
"OHDDDDDDDDDDDDDDDDDDHO",
"OHDDDDDDDDDDDDDDDDDDHO",
"OHdDDDDDDDDDDDDDDDdDHO",
"OHdDDDDDDDDDDDDDDDdDHO",
"HdDDDDDDDDDDDDDDDDDdDH",
"HdDDDDDDDDDDDDDDDDDdDH",
"HdDDDDDDDDDDDDDDDDDdDH",
".HDDDDDDDDDDDDDDDDDDH.",
".HWWDDDDDDDDDDDDWWWDH.",
".HWWWWWWWWWWWWWWWWWWH.",
"..WWWWWWWWWWWWWWWWWW..",
"..WWWWWWWWWWWWWWWWWW..",
"...WW..FF....FF..WW...",
"...W..FFFF..FFFF..W...",
"....O..FFFF..FFFF.....",
".......FFFF..FFFF.....",
".......OKKO..OKKO.....",
"........KK....KK......",
]
HIME_ANGRY = list(HIME)  # 発狂("ぴえん")顔差分: 顔部分だけ差し替え
HIME_ANGRY[8]  = "..OHHFFFOFFFFOFFFHHO.."  # 眉間にシワ
HIME_ANGRY[10] = "..OHHFftFFFFFFtfFHHO.."  # 涙目
HIME_ANGRY[11] = "..OHHFFFFFMMMMFFFHHO.."  # 開いた口(発狂)

WANNABE_M_PAL = {
 'O':hex_('1e1a24'),'K':hex_('2e2a34'),'k':hex_('4a4456'),   # 髪(黒・ツヤ)
 'S':hex_('e8b88a'),                                          # 肌
 'g':hex_('ffd76e'),                                          # 金の目(¥に目がくらむ)
 'n':hex_('b07848'),'m':hex_('8c4a38'),                       # 鼻/口
 'N':hex_('20304e'),'w':hex_('e8e6e0'),                       # スーツ/シャツ
}
WANNABE_M = [  # ワナビー男(お金弾) 14x15
"..OOOOOOOOOO..",
".OKKKKKKKKKKO.",
".OKkKKKKKKkKO.",
".OKSSSSSSSSKO.",
".OSSSSSSSSSSO.",
".OSggSSSSggSO.",
".OSggSSSSggSO.",
"..OSSSnSSSO...",
"..OSSmmmSSO...",
"..OSSmmmSSO...",
"...OSSSSSO....",
"..ONNwwNNNO...",
".ONNNwwNNNNO..",
".ONNNwwNNNNO..",
"..OOOOOOOOO...",
]

WANNABE_F_PAL = {
 'O':hex_('2a1a20'),'K':hex_('c08a5e'),'k':hex_('d8a476'),   # 髪(明るめブラウン)
 'S':hex_('f5cfae'),                                          # 肌
 'e':hex_('2c1418'),'E':hex_('9a6ab0'),                       # 目/アイシャドウ
 'b':hex_('f2a0b0'),'m':hex_('d4506a'),                       # チーク/リップ
 'P':hex_('e88fb8'),'w':hex_('fbe8f0'),                       # 服(ピンク)
}
WANNABE_F = [  # ワナビー女(美容弾) 14x15
".OKKOOOOOOKKO.",
"OKKKKKKKKKKKKO",
"OKkKKKKKKKKkKO",
"OKKSSSSSSSSKKO",
"OKSSSSSSSSSSKO",
"OKSEeSSSSeESKO",
"OKSSSSSSSSSSKO",
"OKbSSSmmSSSbKO",
"OKKSSSSSSSSKKO",
".OKSSSSSSSSKO.",
".OKOSSSSSSOKO.",
".OKOwwwwwwOKO.",
"..OPPwwwwPPO..",
"..OPPPPPPPPO..",
"...OOOOOOOO...",
]

SALON_PAL = {
 'O':hex_('161a26'),                      # 輪郭
 'H':hex_('232838'),'h':hex_('3c445c'),   # 髪(黒髪ツヤ)
 'F':hex_('f2c49a'),                      # 肌
 'e':hex_('ffffff'),'E':hex_('241a12'),   # 目(見開き)
 'n':hex_('c08a5c'),                      # 鼻
 'm':hex_('9a4534'),'w':hex_('ffffff'),   # 口(ニカッ)/歯
 'S':hex_('2c3d60'),'s':hex_('415988'),   # スーツ(ネイビー)
 'W':hex_('f4f2ec'),'v':hex_('d9d6cc'),   # シャツ(白Vネック)
 'B':hex_('10141e'),                      # ボタン
 'P':hex_('222a40'),'K':hex_('12141a'),   # パンツ/靴
}
SALON = [  # オンラインサロン主(見開き目+営業スマイル+ネイビースーツ) 22x38
"......OOOOOOOOOO......",
".....OHHHHHHHHHHO.....",
"....OHhHHHHHHHHHHO....",
"...OHhhHHHHHHHHHHHO...",
"...OHhHHHHHHHHHHHHO...",
"...OHHHHHHHHHHHHHHO...",
"...OHHOFFFFFFFFOHHO...",
"...OHFFFFFFFFFFFFHO...",
"...OHFeeEFFFFeeEFHO...",
"...OHFeeEFFFFeeEFHO...",
"...OHFFFFFnnFFFFFHO...",
"...OHFFmwwwwwwmFFHO...",
"...OHFFFmmmmmmFFFHO...",
"....OFFFFFFFFFFFFO....",
".....OOFFFFFFFFOO.....",
".......OFFFFFFO.......",
"..OOSSSOFFFFFFOSSSOO..",
".OSSSSSOWFFFFWOSSSSSO.",
".OSSsSSOWWFFWWOSSsSSO.",
".OSSsSSOWWWWWWOSSsSSO.",
"OSSsSSOWWWWWWWWOSSsSSO",
"OSSsSSOWWWWWWWWOSSsSSO",
"OSSsSSOWWWWWWWWOSSsSSO",
"OSSsSBOWWWWWWWWOBSsSSO",
"OSSsSSOWWWWWWWWOSSsSSO",
"OSSsSSOWWWWWWWWOSSsSSO",
"OSSsSBOWWWWWWWWOBSsSSO",
"OSSsSSOWWvvWWWWOSSsSSO",
"OSSsSSOWWWWWWWWOSSsSSO",
".OSSSSOWWWWWWWWOSSSSO.",
".OSSSSOOWWWWWWOOSSSSO.",
"..OSSSSOOOOOOOOSSSSO..",
"..OPPPPPPO..OPPPPPPO..",
"..OPPPPPO....OPPPPPO..",
"...OPPPPO....OPPPPO...",
"...OPPPPO....OPPPPO...",
"..OKKKKKO....OKKKKKO..",
"...OOOOO......OOOOO...",
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

URARA_LEAN, MISONO_LEAN, HIME_LEAN, SALON_LEAN = 3, 5, 4, 4  # 傾き差分スプライットの最大シフト量(px, EPX後の等倍)

def build():
    urara_im, misono_im = epx(render(URARA, URARA_PAL)), epx(render(MISONO, MISONO_PAL))
    misono_back_im = epx(render(MISONO_BACK, MISONO_BACK_PAL))
    hime_im, hime_angry_im = epx(render(HIME, HIME_PAL)), epx(render(HIME_ANGRY, HIME_PAL))
    salon_im = epx(render(SALON, SALON_PAL))
    sprites = {
        'urara':       lean(urara_im, 0, URARA_LEAN),
        'urara_left':  lean(urara_im, -URARA_LEAN, URARA_LEAN),
        'urara_right': lean(urara_im,  URARA_LEAN, URARA_LEAN),
        'misono_back':       lean(misono_back_im, 0, URARA_LEAN),
        'misono_back_left':  lean(misono_back_im, -URARA_LEAN, URARA_LEAN),
        'misono_back_right': lean(misono_back_im,  URARA_LEAN, URARA_LEAN),
        'misono':       lean(misono_im, 0, MISONO_LEAN),
        'misono_left':  lean(misono_im, -MISONO_LEAN, MISONO_LEAN),
        'misono_right': lean(misono_im,  MISONO_LEAN, MISONO_LEAN),
        'zako':   epx(render(ZAKO,   ZAKO_PAL)),
        'zako2':  epx(render(ZAKO2,  ZAKO2_PAL)),
        'chiuma': epx(render(CHIUMA, CHIUMA_PAL)),
        'buta':   epx(render(BUTA,   BUTA_PAL)),
        'hime':             lean(hime_im, 0, HIME_LEAN),
        'hime_left':        lean(hime_im, -HIME_LEAN, HIME_LEAN),
        'hime_right':       lean(hime_im,  HIME_LEAN, HIME_LEAN),
        'hime_angry':       lean(hime_angry_im, 0, HIME_LEAN),
        'hime_angry_left':  lean(hime_angry_im, -HIME_LEAN, HIME_LEAN),
        'hime_angry_right': lean(hime_angry_im,  HIME_LEAN, HIME_LEAN),
        'wannabe_m': epx(render(WANNABE_M, WANNABE_M_PAL)),
        'wannabe_f': epx(render(WANNABE_F, WANNABE_F_PAL)),
        'salon':       lean(salon_im, 0, SALON_LEAN),
        'salon_left':  lean(salon_im, -SALON_LEAN, SALON_LEAN),
        'salon_right': lean(salon_im,  SALON_LEAN, SALON_LEAN),
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
        # オタサーの姫: 立ち絵をそのまま楕円ビネットでクロップ(会話・カットイン用)
        'HIME_PORTRAIT': portrait(ROOT/'assets/source/hime_bust.png', 420),
        # オンラインサロン主: AI生成の実写写真をそのまま使用(切り抜きなし)
        'SALON_PORTRAIT': portrait(ROOT/'assets/source/salon_boss.png', 420),
    }
    return sprites, ports

def inject(sprites, ports):
    mapping = {
        'URARA_SPRITE':       to_b64(sprites['urara']),
        'URARA_SPRITE_LEFT':  to_b64(sprites['urara_left']),
        'URARA_SPRITE_RIGHT': to_b64(sprites['urara_right']),
        'MISONO_SPRITE':       to_b64(sprites['misono']),
        'MISONO_SPRITE_LEFT':  to_b64(sprites['misono_left']),
        'MISONO_SPRITE_RIGHT': to_b64(sprites['misono_right']),
        'MISONO_BACK_SPRITE':       to_b64(sprites['misono_back']),
        'MISONO_BACK_SPRITE_LEFT':  to_b64(sprites['misono_back_left']),
        'MISONO_BACK_SPRITE_RIGHT': to_b64(sprites['misono_back_right']),
        'ZAKO_SPRITE':   to_b64(sprites['zako']),
        'ZAKO2_SPRITE':  to_b64(sprites['zako2']),
        'CHIUMA_SPRITE': to_b64(sprites['chiuma']),
        'BUTA_SPRITE':   to_b64(sprites['buta']),
        'HIME_SPRITE':             to_b64(sprites['hime']),
        'HIME_SPRITE_LEFT':        to_b64(sprites['hime_left']),
        'HIME_SPRITE_RIGHT':       to_b64(sprites['hime_right']),
        'HIME_ANGRY_SPRITE':       to_b64(sprites['hime_angry']),
        'HIME_ANGRY_SPRITE_LEFT':  to_b64(sprites['hime_angry_left']),
        'HIME_ANGRY_SPRITE_RIGHT': to_b64(sprites['hime_angry_right']),
        'WANNABE_M_SPRITE': to_b64(sprites['wannabe_m']),
        'WANNABE_F_SPRITE': to_b64(sprites['wannabe_f']),
        'SALON_SPRITE':       to_b64(sprites['salon']),
        'SALON_SPRITE_LEFT':  to_b64(sprites['salon_left']),
        'SALON_SPRITE_RIGHT': to_b64(sprites['salon_right']),
        'URARA_PORTRAIT':  to_b64(ports['URARA_PORTRAIT']),
        'MISONO_PORTRAIT': to_b64(ports['MISONO_PORTRAIT']),
        'MISONO_DEFEATED_PORTRAIT': to_b64(ports['MISONO_DEFEATED_PORTRAIT']),
        'URARA_CRY_PORTRAIT': to_b64(ports['URARA_CRY_PORTRAIT']),
        'HIME_PORTRAIT': to_b64(ports['HIME_PORTRAIT']),
        'SALON_PORTRAIT': to_b64(ports['SALON_PORTRAIT']),
    }
    out = ['// AUTO-GENERATED by tools/build_sprites.py --inject — 手で編集しないこと',
           '"use strict";',
           'const SPRITE_SRC = {']
    for name, b64 in mapping.items():
        out.append(f'{name}: "data:image/png;base64,{b64}",')
        print(f'injected {name} ({len(b64)} chars)')
    out += ['};',
            '// 各アセットを Image 化して IMG.<KEY> で参照できるようにする',
            'const IMG = {};',
            'for(const k in SPRITE_SRC){ IMG[k] = new Image(); IMG[k].src = SPRITE_SRC[k]; }',
            '']
    (ROOT / 'js' / 'gen' / 'sprites.js').write_text('\n'.join(out), encoding='utf-8')

if __name__ == '__main__':
    sprites, ports = build()
    if '--inject' in sys.argv:
        inject(sprites, ports)
        print('js/gen/sprites.js updated')
