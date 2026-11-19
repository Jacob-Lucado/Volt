import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { compositeAir32RetainedToOpaque, resolveLineMetrics, roundTiesEven } from '../../../../../common/native-text/Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle, supportsNativeText } from '../../../../../common/native-text/NativeFont';
import { useNativeTextScale } from '../../../../../common/native-text/NativeTextScale';
import { nativeTextStyles } from '../../../../../common/native-text/NativeTextStyles';

interface CatalogNativeHtmlTextProps {
    /** The page text, as the html window's htmlText. */
    html: string;
    /** The html window's width; lines wrap inside its 2px gutters. */
    width: number;
    /** The surface colour under the text. */
    background: number;
    className?: string;
}

type Run = { text: string; style: NativeFontStyle };

// LocalizationCatalogWidget.setLinkStyle: a:link is underlined #333333.
const LINK_COLOR = 0x333333;

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0' };

const decodeEntities = (text: string) =>
    text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, name: string) => {
        if (name[0] === '#') {
            const hex = name[1] === 'x';
            const digits = name.slice(hex ? 2 : 1);
            if (!hex && !/^\d+$/.test(digits)) return entity;

            // Flash reads numeric entities as unsigned 16-bit character codes.
            let code = 0;
            const radix = hex ? 16 : 10;
            for (const digit of digits) code = (code * radix + parseInt(digit, radix)) & 0xffff;

            return code >= 0xd800 && code <= 0xdfff ? '' : String.fromCharCode(code);
        }

        const key = name.toLowerCase();
        return Object.hasOwn(ENTITIES, key) ? ENTITIES[key] : entity;
    });

const fontStyle = (tag: string, style: NativeFontStyle): NativeFontStyle => {
    const next = { ...style };
    const color = /\bcolor\s*=\s*["']?#([0-9a-f]{6})/i.exec(tag);
    const size = /\bsize\s*=\s*["']?([+-]?)(\d+)/i.exec(tag);

    if (color) next.color = parseInt(color[1], 16);
    if (size) next.size = Math.max(1, size[1] ? style.size + Number(size[1] + size[2]) : Number(size[2]));

    return next;
};

/**
 * Flash htmlText: a tag runs from "<" to the next ">", and a tag Flash does not know is dropped with its markup. So
 * "<<i>" is one unknown tag named "<i", and the text after it is not italic.
 */
const parseRuns = (html: string, base: NativeFontStyle): Run[] => {
    const runs: Run[] = [];
    const stack: { name: string; style: NativeFontStyle }[] = [];
    const style = () => (stack.length ? stack[stack.length - 1].style : base);
    const source = html.replace(/\r\n?/g, '\n');
    let index = 0;

    while (index < source.length) {
        const open = source.indexOf('<', index);
        const close = open < 0 ? -1 : source.indexOf('>', open);

        if (open < 0 || close < 0) {
            runs.push({ text: decodeEntities(source.slice(index)), style: style() });
            break;
        }

        if (open > index) runs.push({ text: decodeEntities(source.slice(index, open)), style: style() });

        index = close + 1;

        const tag = source.slice(open + 1, close).trim();
        const closing = tag.startsWith('/');
        const name = (closing ? tag.slice(1) : tag).split(/[\s/]/)[0].toLowerCase();

        if (closing) {
            const at = stack.map((entry) => entry.name).lastIndexOf(name);

            if (at >= 0) stack.length = at;
            if (name === 'p' || name === 'li') runs.push({ text: '\n', style: style() });
            continue;
        }

        if (name === 'br') {
            runs.push({ text: '\n', style: style() });
            continue;
        }

        const current = style();
        let next: NativeFontStyle = null;

        if (name === 'b') next = { ...current, bold: true };
        else if (name === 'i') next = { ...current, italic: true };
        else if (name === 'u') next = { ...current, underline: true };
        else if (name === 'a') next = { ...current, underline: true, color: LINK_COLOR };
        else if (name === 'font') next = fontStyle(tag, current);
        else if (name === 'p' || name === 'li' || name === 'span' || name === 'textformat') next = current;

        if (next && !tag.endsWith('/')) stack.push({ name, style: next });
    }

    return runs.filter((run) => run.text.length);
};

/**
 * AIR html window text (u_regular, word wrap, not scrollable) drawn natively: bold, italic and link runs share one TextField
 * layout, so lines wrap across runs and every baseline sits on round(2 + ascent + index * lineHeight).
 */
export const CatalogNativeHtmlText: FC<CatalogNativeHtmlTextProps> = ({ html, width, background, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [height, setHeight] = useState<number>(null);
    const scale = useNativeTextScale();
    const plainText = useMemo(() => parseRuns(html ?? '', nativeTextStyles.u_regular).map((run) => run.text).join(''), [html]);

    useEffect(() => {
        let disposed = false;

        const render = async () => {
            const base: NativeFontStyle = { ...nativeTextStyles.u_regular, color: 0 };
            const runs = parseRuns(html ?? '', base);
            const loadedRuns = await Promise.all(runs.map(async (run) => ({ ...run, loaded: await loadNativeFont(run.style) })));
            if (disposed || loadedRuns.some((run) => !supportsNativeText(run.loaded.font, run.text.replace(/\n/g, '')))) return;

            type LoadedRun = (typeof loadedRuns)[number];
            type Piece = LoadedRun & { x: number };
            const limit = width - 4;
            const lines: Piece[][] = [[]];
            // The run of the line break that ends each line: an empty line takes its height from it.
            const lineBreaks: LoadedRun[] = [];
            let lineWidth = 0;
            // A line is drawn per style run, like one TextField line: same-style tokens join so their advances stay unrounded.
            const push = (run: (typeof loadedRuns)[number], text: string) => {
                const line = lines[lines.length - 1];
                const previous = line[line.length - 1];
                if (previous && previous.style === run.style) {
                    previous.text += text;
                    lineWidth = previous.x + measureNativeText(run.loaded.font, previous.text, run.style);
                    return;
                }
                line.push({ ...run, text, x: lineWidth });
                lineWidth += measureNativeText(run.loaded.font, text, run.style);
            };
            const newLine = (lineBreak: LoadedRun = null) => {
                lineBreaks.push(lineBreak);
                lines.push([]);
                lineWidth = 0;
            };

            // TextField.wrapText: whitespace hangs at the end of its line, a word that does not fit starts the next one.
            for (const run of loadedRuns) {
                for (const token of run.text.split(/(\n|[^\S\n]+)/).filter(Boolean)) {
                    if (token === '\n') {
                        newLine(run);
                        continue;
                    }
                    const tokenWidth = measureNativeText(run.loaded.font, token, run.style);
                    if (/^\s+$/.test(token) || lineWidth + tokenWidth <= limit || lineWidth === 0) {
                        push(run, token);
                        continue;
                    }
                    newLine();
                    push(run, token);
                }
            }

            lineBreaks.push(loadedRuns[loadedRuns.length - 1] ?? null);

            const baseLoaded = await loadNativeFont(base);
            if (disposed || !canvasRef.current) return;
            const metricsOf = (run: LoadedRun) => (run ? resolveLineMetrics(run.loaded.font.swfFont, run.style.size, false) : resolveLineMetrics(baseLoaded.font.swfFont, base.size, false));
            // A TextField line is as high as the biggest font on it, including its line break; every run sits on the line's baseline.
            let top = 0;
            const baselines = lines.map((line, index) => {
                const runs = [...line, lineBreaks[index]].filter(Boolean);
                const metrics = (runs.length ? runs : [null]).map(metricsOf);
                const ascent = Math.max(...metrics.map((value) => value.ascent));
                const baseline = 2 + top + ascent;

                top += ascent + Math.max(...metrics.map((value) => value.descent));

                return baseline;
            });
            const pieceOffset = (piece: Piece, index: number) => roundTiesEven(baselines[index]) - roundTiesEven(2 + metricsOf(piece).ascent);
            const fieldHeight = Math.ceil(top) + 4;
            const pixelWidth = width * scale;
            const pixelHeight = fieldHeight * scale;
            const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);

            lines.forEach((line, index) =>
                line.forEach((piece) => {
                    if (!piece.text.trim() && !piece.style.underline) return;
                    piece.loaded.renderer.render(piece.text, {
                        size: piece.style.size * scale,
                        color: piece.style.color ?? 0,
                        antiAliasType: piece.style.antiAliasType ?? 'advanced',
                        gridFitType: 'pixel',
                        thickness: piece.style.thickness ?? 0,
                        sharpness: piece.style.sharpness ?? 0,
                        kerning: piece.style.kerning ?? true,
                        fontStyle: piece.style.italic ? 'italic' : 'normal',
                        stageQuality: 'high',
                        renderingPipeline: 'habbo-retained',
                        textDecoration: piece.style.underline ? 'underline' : null,
                        target: {
                            pixels: pixels.subarray(pieceOffset(piece, index) * scale * pixelWidth * 4),
                            width: pixelWidth,
                            height: pixelHeight - pieceOffset(piece, index) * scale,
                            offsetX: Math.round(piece.x * scale)
                        }
                    });
                })
            );

            const canvas = canvasRef.current;
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            const composited = compositeAir32RetainedToOpaque(pixels, [(background >>> 16) & 255, (background >>> 8) & 255, background & 255, 255]);
            canvas.getContext('2d').putImageData(new ImageData(composited, pixelWidth, pixelHeight), 0, 0);
            setHeight(fieldHeight);
        };

        render().catch((error) => {
            if (!disposed) console.warn('Native html text rendering failed', error);
        });

        return () => {
            disposed = true;
        };
    }, [html, width, background, scale]);

    return (
        <div className={className}>
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{ display: height ? 'block' : 'none', width, height: height ?? undefined, imageRendering: scale > 1 ? 'auto' : 'pixelated' }}
            />
            <span
                style={
                    height
                        ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre-wrap' }
                        : { whiteSpace: 'pre-wrap' }
                }
            >
                {plainText}
            </span>
        </div>
    );
};
