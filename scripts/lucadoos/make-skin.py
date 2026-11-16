#!/usr/bin/env python3
"""Draws the LucadoOS window skin over the client's bitmap slices.

Every slice keeps its exact size and nine-slice cuts, so no window layout moves. Run it from the repo root:

    python3 scripts/lucadoos/make-skin.py

LucadoOS(TM) is a trademark of Jacob Lucado.
"""
import base64
import colorsys
import io
import os
import re

from PIL import Image, ImageDraw

IMAGES = os.path.join('src', 'assets', 'images')
SLICES = os.path.join(IMAGES, 'habbo-skin', 'slices')
# Window art only. Room, avatar and toolbar icon art keeps its own colours.
UI_FOLDERS = (
    'habbo-skin', 'catalog', 'navigator', 'inventory', 'friends', 'purse', 'purse-swf', 'chat-input-swf', 'infostand', 'notifications', 'rightside',
    'avatar-menu', 'help', 'groups', 'user-profile', 'user-settings', 'achievements', 'quests', 'room-widgets', 'room-tools-swf', 'wired',
    'wiredtools', 'floorplan-editor', 'floorplaneditor', 'camera', 'ui', 'scrollbar', 'toolbar-swf', 'modtool', 'hc-center', 'trax',
)
# The toolbar folder is mostly icons, so only its frames and backgrounds are listed.
TOOLBAR_ART = ('collapse-border-3b3933', 'divider', 'friend-tab-border-74dbfa', 'friend-tab-border-7fc8de', 'friend-tab-border-91e1f9', 'friends-browse-bg', 'memenu-bg', 'memenu-circle')
# Window art whose classic teal becomes LucadoOS blue. Currency icons keep their colours.
TEAL_FOLDERS = ('habbo-skin', 'navigator', 'inventory', 'friends', 'notifications', 'infostand', 'chat-input-swf', 'avatar-menu')
# Stylesheets left alone: this skin's own file, chat bubbles and name colours, the loading screen, and the purse with its currency colours.
CSS_SKIP = ('css/lucadoos', 'css/chat', 'css/loading', 'css/purse')
SS = 8  # Shapes are drawn 8 times larger, then scaled down for smooth edges.

NAVY_TOP, NAVY_BOTTOM = (30, 45, 68), (17, 26, 41)
EDGE = (10, 16, 26)
ACCENT, ACCENT_2 = (77, 163, 255), (124, 108, 255)
PAPER, PAPER_EDGE = (238, 242, 247), (176, 189, 206)
INK = (58, 74, 97)


def rgba(color, alpha=255):
    return (color[0], color[1], color[2], alpha)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def canvas(width, height):
    return Image.new('RGBA', (width * SS, height * SS), (0, 0, 0, 0))


def finish(image, name):
    out = image.resize((image.width // SS, image.height // SS), Image.LANCZOS)
    out.save(os.path.join(SLICES, name + '.png'))


def box(draw, x0, y0, x1, y1, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS - 1, y1 * SS - 1], radius * SS, fill=fill, outline=outline, width=round(width * SS))


def gradient(width, height, top, bottom):
    image = Image.new('RGBA', (width * SS, height * SS))
    draw = ImageDraw.Draw(image)
    for y in range(height * SS):
        draw.line([(0, y), (width * SS, y)], fill=rgba(mix(top, bottom, y / max(1, height * SS - 1))))
    return image


def masked(fill, mask_draw):
    """Paints `fill` (an image) through a shape drawn by `mask_draw(draw)`."""
    mask = Image.new('L', fill.size, 0)
    mask_draw(ImageDraw.Draw(mask))
    out = Image.new('RGBA', fill.size, (0, 0, 0, 0))
    out.paste(fill, (0, 0), mask)
    return out


def frame(name, header_top, header_bottom, line):
    """Window frame, 26x55: a 33px title bar over the paper body, cut 33/10/10/10."""
    w, h = 26, 55
    image = canvas(w, h)
    draw = ImageDraw.Draw(image)
    box(draw, 0, 0, w, h, 8, fill=rgba(EDGE))
    body = Image.new('RGBA', image.size, rgba(PAPER))
    body.paste(gradient(w, 33, header_top, header_bottom), (0, 0))
    ImageDraw.Draw(body).rectangle([0, 32 * SS, w * SS, 33 * SS - 1], fill=rgba(line))
    ImageDraw.Draw(body).rectangle([0, SS, w * SS, SS + SS // 2], fill=rgba(mix(header_top, (255, 255, 255), .14)))
    image.alpha_composite(masked(body, lambda d: d.rounded_rectangle([SS, SS, (w - 1) * SS - 1, (h - 1) * SS - 1], 7 * SS, fill=255)))
    finish(image, name)


def glyph_button(name, glyph, fill, fill_alpha, mark=(255, 255, 255)):
    """Title bar button, 19x20: a soft square with an X or a question mark."""
    w, h = 19, 20
    image = canvas(w, h)
    draw = ImageDraw.Draw(image)
    box(draw, 1, 1, w - 1, h - 1, 5, fill=rgba(fill, fill_alpha))
    cx, cy, r, t = w * SS / 2, h * SS / 2, 3.6 * SS, round(1.7 * SS)
    if glyph == 'x':
        draw.line([(cx - r, cy - r), (cx + r, cy + r)], fill=rgba(mark), width=t)
        draw.line([(cx - r, cy + r), (cx + r, cy - r)], fill=rgba(mark), width=t)
    else:
        draw.arc([cx - 3 * SS, cy - 5.2 * SS, cx + 3 * SS, cy + .8 * SS], 180, 80, fill=rgba(mark), width=t)
        draw.line([(cx, cy + .2 * SS), (cx, cy + 1.6 * SS)], fill=rgba(mark), width=t)
        draw.ellipse([cx - SS, cy + 3 * SS, cx + SS, cy + 5 * SS], fill=rgba(mark))
    finish(image, name)


def tab(state, fill, selected=False):
    """Tabs, 32px tall: a 22px piece plus its 9/4/9 left, middle and right cuts."""
    w, h = 22, 32
    image = canvas(w, h)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle([SS, 3 * SS, (w - 1) * SS - 1, (h + 8) * SS], 6 * SS, fill=rgba(fill), outline=rgba(PAPER_EDGE), width=SS)
    if selected:
        draw.rounded_rectangle([SS, 3 * SS, (w - 1) * SS - 1, 5 * SS], SS, fill=rgba(ACCENT))
        draw.rectangle([2 * SS, 5 * SS, (w - 2) * SS - 1, 6 * SS], fill=rgba(fill))
    else:
        draw.rectangle([0, (h - 1) * SS, w * SS, h * SS], fill=rgba(PAPER_EDGE))
    small = image.resize((w, h), Image.LANCZOS)
    small.save(os.path.join(SLICES, f'tab-3-{state}.png'))
    small.crop((0, 0, 9, h)).save(os.path.join(SLICES, f'tab-3-{state}-left.png'))
    small.crop((9, 0, 13, h)).save(os.path.join(SLICES, f'tab-3-{state}-mid.png'))
    small.crop((13, 0, 22, h)).save(os.path.join(SLICES, f'tab-3-{state}-right.png'))


def button(name, top, bottom, edge, radius=None):
    """Push button at the slice's own size: a soft gradient, one edge colour, a top highlight."""
    w, h = Image.open(os.path.join(SLICES, name + '.png')).size
    radius = radius if radius is not None else min(5, (min(w, h) - 1) // 2)
    image = canvas(w, h)
    box(ImageDraw.Draw(image), 0, 0, w, h, radius, fill=rgba(edge))
    face = gradient(w, h, top, bottom)
    ImageDraw.Draw(face).rectangle([0, SS, w * SS, SS + SS // 2], fill=rgba(mix(top, (255, 255, 255), .5)))
    image.alpha_composite(masked(face, lambda d: d.rounded_rectangle([SS, SS, (w - 1) * SS - 1, (h - 1) * SS - 1], max(1, radius - 1) * SS, fill=255)))
    finish(image, name)


def button_family(prefix, suffixes, base_top, base_bottom, edge, disabled=False):
    states = {
        'default': (base_top, base_bottom, edge),
        'hover': (mix(base_top, (255, 255, 255), .35), mix(base_bottom, (255, 255, 255), .25), mix(edge, ACCENT, .55)),
        'pressed': (mix(base_bottom, (0, 0, 0), .08), mix(base_top, (0, 0, 0), .04), edge),
        'disabled': (mix(base_top, PAPER, .75), mix(base_bottom, PAPER, .75), mix(edge, PAPER, .6)),
    }
    for state, (top, bottom, line) in states.items():
        for suffix in suffixes:
            name = f'{prefix}-{state}{suffix}'
            if os.path.exists(os.path.join(SLICES, name + '.png')):
                button(name, top, bottom, line)


def recolor(name):
    """Keeps a slice's shape and swaps its greys for the LucadoOS blue-greys."""
    path = os.path.join(SLICES, name)
    image = Image.open(path).convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            _, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if saturation > .18 and .08 < lightness < .95:
                continue
            pixels[x, y] = rgba(mix(INK, (249, 251, 253), lightness ** .85), a)
    image.save(path)


def cool_grey(r, g, b):
    """A warm or neutral grey as a LucadoOS blue-grey. Lightness stays, so contrast does too."""
    hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if saturation > .2 and not (.08 < hue < .2 and saturation < .35):
        return None
    tint = .2 * (1 - abs(2 * lightness - 1)) ** .5
    return tuple(round(c * 255) for c in colorsys.hls_to_rgb(214 / 360, lightness, tint))


def teal_as_navy(r, g, b):
    """The classic teal as LucadoOS blue: dark and mid teals go navy, light ones go sky blue."""
    hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if not (183 / 360 <= hue <= 207 / 360) or saturation < .22:
        return None
    # Vivid mid blues are accents and status colours, so they only change hue and stay bright.
    if lightness < .62 and not (saturation > .7 and lightness > .45):
        lightness, saturation = lightness * .55 + .03, saturation * .7
    return tuple(round(c * 255) for c in colorsys.hls_to_rgb(214 / 360, lightness, saturation))


def retint(r, g, b, teal):
    return cool_grey(r, g, b) or (teal_as_navy(r, g, b) if teal else None) or (r, g, b)


def retint_image(image, teal):
    if getattr(image, 'is_animated', False):
        return None
    image = image.convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a:
                pixels[x, y] = retint(r, g, b, teal) + (a,)
    return image


def retint_file(path, teal):
    image = retint_image(Image.open(path), teal)
    if image is not None:
        image.save(path)


HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGB = re.compile(r'(rgba?\(\s*)(\d{1,3})(\s*,?\s*)(\d{1,3})(\s*,?\s*)(\d{1,3})')
DATA_PNG = re.compile(r'data:image/png;base64,([A-Za-z0-9+/=]+)')


def retint_css(path):
    """Gives a stylesheet's own colours and inlined bitmaps the same treatment as the bitmap files."""
    with open(path, encoding='utf-8') as file:
        css = file.read()

    def hex_colour(match):
        digits = match.group(1)
        if len(digits) == 3:
            digits = ''.join(c * 2 for c in digits)
        return '#%02x%02x%02x' % retint(int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16), True)

    def rgb_colour(match):
        r, g, b = retint(int(match.group(2)), int(match.group(4)), int(match.group(6)), True)
        return f'{match.group(1)}{r}{match.group(3)}{g}{match.group(5)}{b}'

    def inlined(encoded):
        try:
            image = retint_image(Image.open(io.BytesIO(base64.b64decode(encoded))), True)
        except Exception:
            return encoded
        if image is None:
            return encoded
        out = io.BytesIO()
        image.save(out, 'PNG', optimize=True)
        return base64.b64encode(out.getvalue()).decode()

    # Splitting on the inlined bitmaps keeps their base64 text away from the colour patterns.
    pieces = DATA_PNG.split(css)
    for i, piece in enumerate(pieces):
        pieces[i] = 'data:image/png;base64,' + inlined(piece) if i % 2 else RGB.sub(rgb_colour, HEX.sub(hex_colour, piece))
    out = ''.join(pieces)
    if out != css:
        with open(path, 'w', encoding='utf-8') as file:
            file.write(out)


def main():
    for part in UI_FOLDERS:
        for folder, _, names in os.walk(os.path.join(IMAGES, part)):
            for name in names:
                if name.endswith('.png'):
                    retint_file(os.path.join(folder, name), part in TEAL_FOLDERS)

    for name in TOOLBAR_ART:
        retint_file(os.path.join(IMAGES, 'toolbar', 'air', name + '.png'), True)

    for root in ('src/css', 'src/components'):
        for folder, _, names in os.walk(root):
            if any(part in folder.replace(os.sep, '/') for part in CSS_SKIP):
                continue
            for name in names:
                if name.endswith('.css'):
                    retint_css(os.path.join(folder, name))

    frame('frame-ubuntu-3', NAVY_TOP, NAVY_BOTTOM, ACCENT)
    frame('frame-ubuntu-3-teal', NAVY_TOP, NAVY_BOTTOM, ACCENT)
    frame('frame-ubuntu-3-base', (255, 255, 255), (226, 232, 240), (150, 164, 184))
    frame('frame-ubuntu-3-bc', (52, 40, 22), (30, 24, 16), (238, 180, 37))
    frame('frame-ubuntu-3-builder', (48, 36, 70), (26, 20, 44), ACCENT_2)
    frame('frame-ubuntu-3-camera', (34, 38, 46), (18, 20, 26), (148, 163, 184))
    frame('frame-ubuntu-3-d43d59', (70, 26, 36), (40, 16, 24), (229, 72, 77))

    glyph_button('close-3-default', 'x', (255, 255, 255), 26)
    glyph_button('close-3-hover', 'x', (229, 72, 77), 255)
    glyph_button('close-3-pressed', 'x', (184, 48, 54), 255)
    glyph_button('help-3-default', '?', (255, 255, 255), 26)
    glyph_button('help-3-hover', '?', ACCENT, 255)
    glyph_button('help-3-pressed', '?', (52, 128, 214), 255)

    tab('default', (214, 222, 233))
    tab('hover', (228, 234, 242))
    tab('selected', PAPER, selected=True)

    white, mist = (255, 255, 255), (228, 234, 243)
    button_family('button', [''], white, mist, (165, 179, 198))
    button_family('button-thick', [''], white, mist, (165, 179, 198))
    button_family('button-black', [''], (44, 60, 86), (24, 34, 52), EDGE)
    button_family('button-help', [''], (112, 182, 255), (61, 143, 232), (43, 118, 204))
    button_family('button-settings', [''], (150, 136, 255), (110, 94, 235), (88, 72, 205))
    button_family('button-shiny', ['', '-cccccc', '-h24', '-h25', '-h30'], white, mist, (165, 179, 198))
    button_family('button-shiny-thick', ['', '-h35'], white, mist, (165, 179, 198))
    button_family('button-shiny-thick', ['-0bb3e3-h35'], (112, 182, 255), (61, 143, 232), (43, 118, 204))
    button_family('button-shiny-large', [''], white, mist, (165, 179, 198))
    for prefix in ('button-shiny-green', 'button-shiny-thick-green'):
        button_family(prefix, ['', '-h30'], (74, 212, 140), (34, 172, 102), (23, 138, 80))
    for prefix in ('button-shiny-red', 'button-shiny-e33934'):
        button_family(prefix, [''], (244, 110, 108), (216, 60, 64), (176, 44, 50))
    button('button-shiny-thick-2d2a27', (44, 60, 86), (24, 34, 52), EDGE)
    button('button-logout-disabled', mix(white, PAPER, .75), mix(mist, PAPER, .75), (205, 213, 224))

    for name in sorted(os.listdir(SLICES)):
        if name.endswith('.png') and name.startswith(('scroll-', 'checkbox-', 'radio-', 'dropmenu-', 'droplist-', 'button-group-', 'scaler-3', 'window-resize-grip')):
            recolor(name)


if __name__ == '__main__':
    main()
