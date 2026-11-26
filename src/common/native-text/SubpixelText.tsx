import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { classicBackground, classicInk } from './ClassicPalette';
import { NativeText } from './NativeText';

/**
 * AIR draws a TextField with gridFitType "subpixel" (and every centred or right-aligned advanced field, where "pixel" falls back to it):
 * glyphs sit on 1/20 px pens and each pen phase has its own raster. These styles carry AIR's own rasters per phase
 * (WIN63-202610201032, rendered by the AIR runtime); characters without one are drawn by NativeText.
 */
export type SubpixelTextStyle = 'u_regular' | 'u_regular_11' | 'u_bold' | 'u_bold_default' | 'u_headline_small' | 'u_headline_medium' | 'il_bold_white';

type FontAsset = { metrics: string; atlas: string };

// The advanced rasterizer thickens light text (Air32 color type): light colours have their own rasters.
const fontAssets: Record<SubpixelTextStyle, { dark?: FontAsset; light?: FontAsset }> = {
    u_regular: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular.png', import.meta.url).href
        },
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular_light.png', import.meta.url).href
        }
    },
    // Ubuntu 11 (80 / -15): u_regular at font size 11, and id_link_regular in white.
    u_regular_11: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular_11.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular_11.png', import.meta.url).href
        },
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular_11_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular_11_light.png', import.meta.url).href
        }
    },
    u_bold_default: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_bold_default.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_bold_default.png', import.meta.url).href
        }
    },
    u_bold: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_bold.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_bold.png', import.meta.url).href
        },
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_bold_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_bold_light.png', import.meta.url).href
        }
    },
    u_headline_small: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_headline_small.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_headline_small.png', import.meta.url).href
        }
    },
    // Ubuntu bold 16 (80 / -15) in white only: the Wired Creator Tools header title.
    u_headline_medium: {
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_headline_medium_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_headline_medium_light.png', import.meta.url).href
        }
    },
    il_bold_white: {
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/il_bold_white_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/il_bold_white_light.png', import.meta.url).href
        }
    }
};

const unstyledButton: CSSProperties = { margin: 0, padding: 0, border: 0, background: 'none', cursor: 'pointer' };

const isLightColor = (color: number) => 30 * ((color >>> 16) & 255) + 59 * ((color >>> 8) & 255) + 11 * (color & 255) > 20000;

interface SubpixelFont {
    size: number;
    emSquare: number;
    ascent: number;
    descent: number;
    /** DefineFont3 advance per character code, in 1/20480 em. */
    advance: Record<string, number>;
    /** Per character code, the tile of each pen phase: [atlasX, atlasY, width, height, x from the pen's pixel, y from the field top]. */
    glyphs: Record<string, number[][]>;
    /** The field row AIR draws the underline on; styles without it have no underline. */
    underlineY?: number;
    coverage: Uint8ClampedArray;
    atlasWidth: number;
}

const loadingFonts = new Map<string, Promise<SubpixelFont>>();

const loadSubpixelFont = (style: SubpixelTextStyle, light: boolean) => {
    const variant = (light && fontAssets[style].light) || !fontAssets[style].dark ? 'light' : 'dark';
    const key = `${style}:${variant}`;
    if (!loadingFonts.has(key)) {
        const asset = fontAssets[style][variant];
        const loading = (async () => {
            const [metrics, image] = await Promise.all([
                fetch(asset.metrics).then((response) => response.json()),
                new Promise<HTMLImageElement>((resolve, reject) => {
                    const element = new Image();
                    element.onload = () => resolve(element);
                    element.onerror = reject;
                    element.src = asset.atlas;
                })
            ]);
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const rgba = context.getImageData(0, 0, image.width, image.height).data;
            const coverage = new Uint8ClampedArray(image.width * image.height);
            for (let index = 0; index < coverage.length; index++) coverage[index] = rgba[index * 4];
            return { ...metrics, coverage, atlasWidth: image.width } as SubpixelFont;
        })();
        loadingFonts.set(key, loading);
        loading.catch(() => loadingFonts.delete(key));
    }
    return loadingFonts.get(key);
};

const floorToTwips = (value: number) => Math.floor(value * 20) / 20;

/** Where the line starts in its field, in twips: at the 2px gutter, or centred on the field's own width. */
const lineOrigin = (align: SubpixelTextProps['align'], fieldWidth: number, exact: number, flooredWidth: number): number => {
    switch (align) {
        case 'center':
            return Math.round(((fieldWidth - Math.floor(exact / 20)) / 2) * 20);
        case 'field':
            return Math.round(((fieldWidth - Math.round(exact / 20)) / 2) * 20);
        case 'cell':
            return Math.floor((fieldWidth - Math.round(exact / 20)) / 2) * 20;
        case 'paragraph':
            return Math.floor((fieldWidth * 20 - flooredWidth) / 2);
        case 'right':
            return Math.floor(fieldWidth - flooredWidth / 20 - 4) * 20 + 40;
        default:
            return 40;
    }
};

/**
 * An html window's field is its floored textWidth plus the 4px gutters wide (whole pixels), and TextSkinRenderer puts it at
 * floor(width - field) when right-aligned or floor(width / 2 - field / 2) when centred; the line starts at the 2px gutter.
 */
const htmlLineOrigin = (align: SubpixelTextProps['align'], width: number, flooredWidth: number): number => {
    const field = Math.floor(flooredWidth / 20) + 4;
    return ((align === 'right' ? width - field : Math.floor(width / 2 - field / 2)) + 2) * 20;
};

interface SubpixelTextProps {
    text: string;
    textStyle: SubpixelTextStyle;
    color?: number;
    /** The surface colour the coverage is blended onto; ignored when transparent. */
    background: number;
    transparent?: boolean;
    /**
     * `field`: a TextField that centres itself (auto size "center"); it centres the text width rounded to whole pixels, not floored.
     * `cell`: a table cell's centred TextField; the field lands on a whole pixel, so a half pixel goes left.
     * `paragraph`: one line of a centred multiline field; it centres the sum of the advances floored to twips.
     * `right`: an auto size "right" window of `width`: TextSkinRenderer draws the text-sized field at floor(width - field width).
     */
    align?: 'left' | 'center' | 'field' | 'cell' | 'paragraph' | 'right';
    /** Underline the whole line, or the characters from start up to (not including) end. */
    underline?: boolean | [number, number];
    /** An html window: a whole-pixel field (see htmlLineOrigin), and its underline ends on the nearest pixel edge instead of the last whole pixel. */
    html?: boolean;
    /**
     * The index of the first character of each html run after the first (a link or an underline starts a run). In a centred or
     * right-aligned html window a run starts at the previous run start plus that run's advances floored to twips.
     */
    runs?: number[];
    /** An html link over the characters from start up to (not including) end: a click on their advances runs onClick. */
    link?: { range: [number, number]; onClick: () => void };
    /** A fixed text field width (gutters included); by default the field fits the text. */
    width?: number;
    className?: string;
    style?: CSSProperties;
    /** Hide the text from assistive technology, for an extra copy drawn for another state of the same label. */
    ariaHidden?: boolean;
    /** The pen of the first character in px from the field's left edge (whole twips); replaces `align`. */
    penX?: number;
}

/** The exact width of a line, in px: the sum of its DefineFont3 advances. */
export const measureSubpixelText = async (textStyle: SubpixelTextStyle, text: string, color = 0): Promise<number> => {
    const font = await loadSubpixelFont(textStyle, isLightColor(color));

    return [...text].reduce((sum, character) => sum + ((font.advance[character.charCodeAt(0)] ?? 0) * font.size) / font.emSquare, 0);
};

export const SubpixelText: FC<SubpixelTextProps> = ({
    text,
    textStyle,
    color: colorProp = 0,
    background: backgroundProp,
    transparent = false,
    align = 'left',
    underline = false,
    html = false,
    runs,
    link,
    width,
    className,
    style,
    ariaHidden = false,
    penX
}) => {
    const background = classicBackground(backgroundProp);
    const color = classicInk(colorProp);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>(null);
    const [fallback, setFallback] = useState(false);
    const [linkBox, setLinkBox] = useState<{ left: number; width: number }>(null);
    // Arrays change identity on every render; the effect keys on their contents.
    const underlineKey = underline === true ? 'line' : underline ? underline.join(',') : '';
    const runsKey = runs?.join(',') ?? '';
    const linkKey = link?.range.join(',') ?? '';

    useEffect(() => {
        let disposed = false;
        setSize(null);
        loadSubpixelFont(textStyle, isLightColor(color))
            .then((font) => {
                if (disposed || !canvasRef.current) return;
                if ([...text].some((character) => character !== ' ' && !font.glyphs[character.charCodeAt(0)])) {
                    setFallback(true);
                    return;
                }
                setFallback(false);
                const twips = (character: string) => ((font.advance[character.charCodeAt(0)] ?? 0) * font.size * 20) / font.emSquare;
                const exact = [...text].reduce((sum, character) => sum + twips(character), 0);
                const textWidth = Math.floor(exact / 20);
                const fieldWidth = width ?? textWidth + 4;
                const textHeight = floorToTwips((font.ascent * font.size) / font.emSquare) + floorToTwips((font.descent * font.size) / font.emSquare);
                const fieldHeight = Math.ceil(textHeight) + 4;
                const flooredWidth = [...text].reduce((sum, character) => sum + Math.floor(twips(character)), 0);
                const origin =
                    penX !== undefined
                        ? Math.round(penX * 20)
                        : html && align !== 'left'
                          ? htmlLineOrigin(align, fieldWidth, flooredWidth)
                          : lineOrigin(align, fieldWidth, exact, flooredWidth);
                const coverage = new Uint8ClampedArray(fieldWidth * fieldHeight);
                const characters = [...text];
                const runStarts = runsKey ? runsKey.split(',').map(Number) : [];
                const pens: number[] = [];
                let runOrigin = origin;
                let cumulative = 0;
                let runFlooredWidth = 0;
                for (const [index, character] of characters.entries()) {
                    if (runStarts.includes(index)) {
                        runOrigin += runFlooredWidth;
                        cumulative = 0;
                        runFlooredWidth = 0;
                    }
                    const pen = runOrigin + Math.floor(cumulative + 0.5);
                    pens.push(pen);
                    const tile = font.glyphs[character.charCodeAt(0)]?.[((pen % 20) + 20) % 20];
                    if (tile) {
                        const [atlasX, atlasY, tileWidth, tileHeight, offsetX, offsetY] = tile;
                        const left = Math.floor(pen / 20) + offsetX;
                        for (let y = 0; y < tileHeight; y++) {
                            const targetY = offsetY + y;
                            if (targetY < 0 || targetY >= fieldHeight) continue;
                            for (let x = 0; x < tileWidth; x++) {
                                const targetX = left + x;
                                if (targetX < 0 || targetX >= fieldWidth) continue;
                                const value = font.coverage[(atlasY + y) * font.atlasWidth + atlasX + x];
                                const index = targetY * fieldWidth + targetX;
                                if (value > coverage[index]) coverage[index] = value;
                            }
                        }
                    }
                    cumulative += twips(character);
                    runFlooredWidth += Math.floor(twips(character));
                }
                // A text window's underline ends on the last whole pixel of the underlined advances floored to twips.
                if (underlineKey && font.underlineY !== undefined && font.underlineY < fieldHeight) {
                    const [first, last] = underlineKey === 'line' ? [0, characters.length] : underlineKey.split(',').map(Number);
                    const start = pens[first] ?? origin;
                    const end = start + characters.slice(first, last).reduce((sum, character) => sum + Math.floor(twips(character)), 0);
                    const row = font.underlineY * fieldWidth;
                    const endX = Math.min((html ? Math.round : Math.floor)(end / 20), fieldWidth);
                    for (let x = Math.max(0, Math.floor(start / 20)); x < endX; x++) coverage[row + x] = 255;
                }
                if (linkKey) {
                    const [first, last] = linkKey.split(',').map(Number);
                    const start = pens[first] ?? origin;
                    const end = start + characters.slice(first, last).reduce((sum, character) => sum + Math.floor(twips(character)), 0);
                    setLinkBox({ left: Math.floor(start / 20), width: Math.ceil(end / 20) - Math.floor(start / 20) });
                } else setLinkBox(null);
                const pixels = new Uint8ClampedArray(fieldWidth * fieldHeight * 4);
                const foreground = [(color >>> 16) & 255, (color >>> 8) & 255, color & 255];
                const surface = [(background >>> 16) & 255, (background >>> 8) & 255, background & 255];
                for (let index = 0; index < coverage.length; index++) {
                    const alpha = coverage[index];
                    for (let channel = 0; channel < 3; channel++)
                        pixels[index * 4 + channel] = transparent
                            ? foreground[channel]
                            : textStyle === 'u_bold_default'
                              ? ((surface[channel] * (256 - alpha) + foreground[channel] * alpha) >> 8)
                              : Math.round(surface[channel] + (alpha * (foreground[channel] - surface[channel])) / 255);
                    pixels[index * 4 + 3] = transparent ? alpha : 255;
                }
                const canvas = canvasRef.current;
                canvas.width = fieldWidth;
                canvas.height = fieldHeight;
                canvas.getContext('2d').putImageData(new ImageData(pixels, fieldWidth, fieldHeight), 0, 0);
                setSize({ width: fieldWidth, height: fieldHeight });
            })
            .catch(() => !disposed && setFallback(true));
        return () => {
            disposed = true;
        };
    }, [text, textStyle, color, background, transparent, align, underlineKey, html, runsKey, linkKey, width, penX]);

    return (
        <span aria-hidden={ariaHidden || undefined} className={className} style={{ display: 'inline-block', verticalAlign: 'top', position: 'relative', ...size, ...style }}>
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: size ? 'block' : 'none', width: size?.width, height: size?.height, imageRendering: 'pixelated' }} />
            {fallback && link ? (
                <span style={{ display: 'inline-block', width, textAlign: align === 'left' || align === 'right' ? align : 'center', whiteSpace: 'pre', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'HabboAirUbuntu, Ubuntu, sans-serif', fontSize: textStyle === 'u_regular_11' ? 11 : undefined }}>
                    {[...text].slice(0, link.range[0]).join('')}
                    <button style={{ ...unstyledButton, color: 'inherit', font: 'inherit', textDecoration: underline ? 'underline' : undefined }} type="button" onClick={link.onClick}>
                        {[...text].slice(...link.range).join('')}
                    </button>
                    {[...text].slice(link.range[1]).join('')}
                </span>
            ) : fallback ? (
                <NativeText
                    nativeResolution
                    align={align === 'left' ? 'left' : align === 'right' ? 'right' : 'center'}
                    ariaHidden={ariaHidden}
                    background={background}
                    overrides={
                        textStyle === 'u_bold_default'
                            ? { color, underline: !!underline, sharpness: 0, thickness: 0 }
                            : textStyle === 'u_regular_11'
                              ? { color, underline: !!underline, size: 11 }
                              : { color, underline: !!underline }
                    }
                    text={text}
                    textStyle={textStyle === 'u_bold_default' ? 'u_bold' : textStyle === 'u_regular_11' ? 'u_regular' : textStyle}
                    transparent={transparent}
                    width={width}
                />
            ) : (
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre' }}>{text}</span>
            )}
            {!fallback && link && linkBox && size && (
                <button
                    aria-label={[...text].slice(...link.range).join('')}
                    style={{ ...unstyledButton, position: 'absolute', left: linkBox.left, top: 0, width: linkBox.width, height: size.height }}
                    type="button"
                    onClick={link.onClick}
                />
            )}
        </span>
    );
};
