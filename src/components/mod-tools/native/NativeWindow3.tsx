import { CSSProperties, FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import ubuntuAtlas from '../../../assets/mod-tools/skins/habbo-ubuntu-skin.png';
import blueAtlas from '../../../assets/mod-tools/skins/habbo-blue-skin.png';
import closeXml from '../../../assets/mod-tools/skins/skin-button_close_3.xml?raw';
import frameXml from '../../../assets/mod-tools/skins/skin-frame_3.xml?raw';
import thickXml from '../../../assets/mod-tools/skins/skin-button_shiny_thick.xml?raw';
import '../../../css/mod-tools/NativeWindow3.css';
import { parseNativeSkin } from './NativeSkin';
import { multiplyColorChannel, NativeSkinView } from './NativeSkinView';

// Window-manager style 3 (the Ubuntu skin): frame_3 coloured 0xff418db0, close button, shiny thick button, Ubuntu text styles.
const SKINS = { frame: parseNativeSkin(frameXml), close: parseNativeSkin(closeXml), thick: parseNativeSkin(thickXml) };

export const FRAME3_COLOR = 0x418db0;
/** The title bar pixel of the frame_3 skin before the frame colour is applied. */
const FRAME3_TITLE_SKIN = 0xd7dbdc;

/** A window colour multiplied over a skin colour, channel by channel, like the skin renderer. */
const multiply = (color: number, tint: number): number => [16, 8, 0].reduce((result, shift) => result | (multiplyColorChannel((color >> shift) & 255, (tint >> shift) & 255) << shift), 0);

const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

interface Native3FrameProps {
    width: number;
    height: number;
    title: string;
    onClose: () => void;
    /** The frame's window colour (0x418db0 unless the layout sets its own). */
    color?: number;
    /** The client area origin: the frame margins (6, 25) unless the layout sets its own margin variables. */
    clientX?: number;
    clientY?: number;
    children?: ReactNode;
}

/** Frame style 3: the 9-slice frame_3 skin, a 19x20 close button at (width - 28, 8) and the content area at the frame margins (6, 25). */
export const Native3Frame: FC<Native3FrameProps> = ({ width, height, title, onClose, color = FRAME3_COLOR, clientX = 6, clientY = 25, children }) => {
    const [closeState, setCloseState] = useState<'default' | 'hovering' | 'pressed'>('default');
    const titleColor = multiply(FRAME3_TITLE_SKIN, color);

    return (
        <section aria-label={title} className="native3-frame" role="dialog" style={{ width, height }}>
            <NativeSkinView atlas={ubuntuAtlas} color={color} height={height} layout="frame_3" skin={SKINS.frame} width={width} />
            <div className="native3-title" style={{ left: 0, top: 4, width, height: 27 }}>
                <NativeText background={titleColor} overrides={{ color: 0xffffff }} text={title} textStyle="u_frame_title" />
            </div>
            <div
                aria-label="Close"
                className="native3-close"
                role="button"
                style={rect(width - 28, 8, 19, 20)}
                onClick={onClose}
                onPointerDown={() => setCloseState('pressed')}
                onPointerEnter={() => setCloseState('hovering')}
                onPointerLeave={() => setCloseState('default')}
                onPointerUp={() => setCloseState('hovering')}
            >
                <NativeSkinView atlas={ubuntuAtlas} height={20} layout="button_close_3" skin={SKINS.close} state={closeState} width={19} />
            </div>
            <div className="native3-client" style={{ left: clientX, top: clientY }}>
                {children}
            </div>
        </section>
    );
};

// The label is set over the bands of the shiny face (per state), each band against its own colour. The light band ends at half the button height.
const faceBands = (state: string, height: number): { from: number; to: number; color: number }[] => {
    const middle = Math.ceil(height / 2);

    if (state === 'hovering') return [{ from: 0, to: middle, color: 0xffffff }, { from: middle, to: height, color: 0xebebeb }];

    const [edge, face] = state === 'pressed' ? [0xa3a3a3, 0xe1e1e1] : [0xd9d9d9, 0xf3f3f3];

    return [{ from: 0, to: 4, color: edge }, { from: 4, to: middle, color: face }, { from: middle, to: height, color: edge }];
};

interface Native3ThickButtonProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    /** The button's window colour (RGB), multiplied over the skin and the label bands. */
    color?: number;
    /** A white label (the black button layout of a coloured button). */
    whiteLabel?: boolean;
    /** With a minimum width the button sizes itself to its label plus 10px margins on both sides, between minWidth and width. */
    minWidth?: number;
    onClick?: () => void;
}

/** `button_thick` of style 3 (shiny thick): the label is Ubuntu bold, centred on whole pixels (measured against the native Ok button: 1px right, 3px down of the centred field). */
export const Native3ThickButton: FC<Native3ThickButtonProps> = ({ x, y, width: maxWidth, height, label, color, whiteLabel = false, minWidth, onClick }) => {
    const [over, setOver] = useState(false);
    const [down, setDown] = useState(false);
    const state = down ? 'pressed' : over ? 'hovering' : 'default';
    const labelRef = useRef<HTMLDivElement>(null);
    const [labelWidth, setLabelWidth] = useState(0);
    const [labelHeight, setLabelHeight] = useState(0);
    const width = minWidth === undefined ? maxWidth : Math.min(maxWidth, Math.max(minWidth, labelWidth + 20));
    // A button that sizes itself to its label centres the label with the half pixel to the right.
    const left = minWidth === undefined ? Math.floor((width - labelWidth) / 2) + 1 : Math.ceil((width - labelWidth) / 2);
    const offset = { left, top: Math.floor((height - labelHeight) / 2) + 3 };
    const bands = faceBands(state, height).map((band) => (color === undefined ? band : { ...band, color: multiply(band.color, color) }));
    const labelProps = whiteLabel ? { overrides: { color: 0xffffff } } : {};

    useLayoutEffect(() => {
        const element = labelRef.current;

        if (!element) return;

        const measure = () => {
            setLabelWidth(element.offsetWidth);
            setLabelHeight(element.offsetHeight);
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [label]);

    return (
        <div
            className="native3-box native3-button"
            style={rect(x, y, width, height)}
            onClick={onClick}
            onPointerDown={() => setDown(true)}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => {
                setOver(false);
                setDown(false);
            }}
            onPointerUp={() => setDown(false)}
        >
            <NativeSkinView atlas={blueAtlas} color={color} height={height} layout="button_shiny_thick" skin={SKINS.thick} state={state} width={width} />
            <div ref={labelRef} className="native3-button__label" style={offset}>
                <NativeText background={bands[0].color} text={label} textStyle="u_bold" style={{ visibility: 'hidden' }} {...labelProps} />
            </div>
            {bands.map((band) => (
                <div key={band.from} className="native3-button__band" style={{ top: band.from, height: band.to - band.from, width }}>
                    <div className="native3-button__label" style={{ left: offset.left, top: offset.top - band.from }}>
                        <NativeText background={band.color} text={label} textStyle="u_bold" {...labelProps} />
                    </div>
                </div>
            ))}
        </div>
    );
};
