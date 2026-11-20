#!/usr/bin/env python3
"""Recolors the client's classic teal to LucadoOS blue. Shapes, lightness and every other color stay as they are.

Run it from the repo root on a clean checkout:

    python3 scripts/lucadoos/recolor.py

LucadoOS(TM) is a trademark of Jacob Lucado.
"""
import base64
import colorsys
import io
import os
import re

from PIL import Image

IMAGES = os.path.join('src', 'assets', 'images')
CSS = os.path.join('src', 'css')
FOLDERS = (
    'habbo-skin', 'navigator', 'inventory', 'friends', 'notifications', 'infostand', 'chat-input-swf', 'avatar-menu', 'catalog', 'groups',
    'achievements', 'user-profile', 'user-settings', 'help', 'purse', 'purse-swf', 'rightside', 'room-tools-swf', 'toolbar-swf', 'ui',
)
CSS_SKIP = ('css/chat', 'css/loading')
# The toolbar folder is mostly icons, so only its frames and backgrounds are recolored.
TOOLBAR_ART = ('collapse-border-3b3933', 'divider', 'friend-tab-border-74dbfa', 'friend-tab-border-7fc8de', 'friend-tab-border-91e1f9', 'friends-browse-bg', 'memenu-bg', 'memenu-circle')
# Window colors written in code. Game art, wired effects, game center and tests keep theirs.
CODE_ROOTS = (os.path.join('src', 'components'), os.path.join('src', 'common'), os.path.join('src', 'api', 'ui-settings'))
CODE_SKIP = ('game-center', 'snowstorm', 'Nft', 'collectibles', 'cursed-dragon', 'avatar-info', 'room-promotes', 'chest', '.test.', 'NativeChatText', 'TraxSoundSets', 'WiredTextFormattingHelp', 'airChatStyles', 'buildersClub', 'CatalogGuildSelector', 'QuestCompleted')
TEAL_FROM, TEAL_TO = 176 / 360, 207 / 360
BLUE = 209 / 360


def luminance(r, g, b):
    return .2126 * r + .7152 * g + .0722 * b


def teal_as_blue(r, g, b):
    hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if not (TEAL_FROM <= hue <= TEAL_TO) or saturation < .22:
        return (r, g, b)
    saturation = min(1, saturation * 1.1)
    out = tuple(round(c * 255) for c in colorsys.hls_to_rgb(BLUE, lightness, saturation))
    # Vivid text and accents keep their brightness, since blue reads darker than teal at the same lightness.
    if saturation > .85 and lightness > .3:
        target = luminance(r, g, b)
        low, high = lightness, .9
        for _ in range(12):
            mid = (low + high) / 2
            out = tuple(round(c * 255) for c in colorsys.hls_to_rgb(BLUE, mid, saturation))
            low, high = (mid, high) if luminance(*out) < target else (low, mid)
    return out


def recolor_image(image):
    if getattr(image, 'is_animated', False):
        return None
    image = image.convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a:
                pixels[x, y] = teal_as_blue(r, g, b) + (a,)
    return image


HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGB = re.compile(r'(rgba?\(\s*)(\d{1,3})(\s*,?\s*)(\d{1,3})(\s*,?\s*)(\d{1,3})')
DATA_PNG = re.compile(r'data:image/png;base64,([A-Za-z0-9+/=]+)')


def recolor_css(path):
    with open(path, encoding='utf-8') as file:
        css = file.read()

    def hex_colour(match):
        digits = match.group(1)
        if len(digits) == 3:
            digits = ''.join(c * 2 for c in digits)
        return '#%02x%02x%02x' % teal_as_blue(int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16))

    def rgb_colour(match):
        r, g, b = teal_as_blue(int(match.group(2)), int(match.group(4)), int(match.group(6)))
        return f'{match.group(1)}{r}{match.group(3)}{g}{match.group(5)}{b}'

    def inlined(encoded):
        try:
            image = recolor_image(Image.open(io.BytesIO(base64.b64decode(encoded))))
        except Exception:
            return encoded
        if image is None:
            return encoded
        out = io.BytesIO()
        image.save(out, 'PNG', optimize=True)
        return base64.b64encode(out.getvalue()).decode()

    # Splitting on the inlined bitmaps keeps their base64 text away from the color patterns.
    pieces = DATA_PNG.split(css)
    for i, piece in enumerate(pieces):
        pieces[i] = 'data:image/png;base64,' + inlined(piece) if i % 2 else RGB.sub(rgb_colour, HEX.sub(hex_colour, piece))
    out = ''.join(pieces)
    if out != css:
        with open(path, 'w', encoding='utf-8') as file:
            file.write(out)


CODE_HEX = re.compile(r'(#|0x)([0-9a-fA-F]{6})\b')


def recolor_code(path):
    with open(path, encoding='utf-8') as file:
        code = file.read()

    def swap(match):
        digits = match.group(2)
        r, g, b = teal_as_blue(int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16))
        return '%s%02x%02x%02x' % (match.group(1), r, g, b) if digits.islower() or not digits.isupper() else '%s%02X%02X%02X' % (match.group(1), r, g, b)

    out = CODE_HEX.sub(swap, code)
    if out != code:
        with open(path, 'w', encoding='utf-8') as file:
            file.write(out)


def main():
    for part in FOLDERS:
        for folder, _, names in os.walk(os.path.join(IMAGES, part)):
            for name in names:
                if name.endswith('.png'):
                    path = os.path.join(folder, name)
                    image = recolor_image(Image.open(path))
                    if image is not None:
                        image.save(path)
    for name in TOOLBAR_ART:
        for folder, _, names in os.walk(os.path.join(IMAGES, 'toolbar')):
            for file in names:
                if file.startswith(name) and file.endswith('.png'):
                    path = os.path.join(folder, file)
                    image = recolor_image(Image.open(path))
                    if image is not None:
                        image.save(path)
    for root in CODE_ROOTS:
        for folder, _, names in os.walk(root):
            for name in names:
                path = os.path.join(folder, name)
                if name.endswith(('.ts', '.tsx')) and not any(skip in path for skip in CODE_SKIP):
                    recolor_code(path)
    for folder, _, names in os.walk(CSS):
        if any(skip in folder.replace(os.sep, '/') for skip in CSS_SKIP):
            continue
        for name in names:
            if name.endswith('.css'):
                recolor_css(os.path.join(folder, name))


if __name__ == '__main__':
    main()
