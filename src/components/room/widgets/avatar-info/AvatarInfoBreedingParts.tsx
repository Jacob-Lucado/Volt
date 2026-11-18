import { FC, ReactNode, RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import breedPreviewBackground from '../../../../assets/images/room-widgets/avatar-info/breed-pets-preview-bg.png';
import { NativeCenteredField } from '../../../../common/native-text/NativeCenteredField';
import { NativeText } from '../../../../common/native-text/NativeText';
import { measureSubpixelText, SubpixelText } from '../../../../common/native-text/SubpixelText';

/** The frame_3 content fill the texts are drawn on. */
export const BREEDING_SURFACE = 0xe9e9e1;

/** The frame title bar after the frame colour 0xff418db0 multiplies the skin. */
const FRAME_TITLE_COLOR = 0x377998;

export const BreedingFrameTitle: FC<{ text: string }> = ({ text }) => (
    <NativeText background={FRAME_TITLE_COLOR} className="volt-breed-pets-title" overrides={{ color: 0xffffff }} text={text} textStyle="u_frame_title" />
);

interface BreedingButtonProps {
    caption: string;
    /** shiny: button style 3 (button_shiny). thick: button_thick style 5 tinted 0x00aa00 (button_shiny_thick_black layout). */
    variant: 'shiny' | 'thick';
    width?: number;
    className?: string;
    onClick: () => void;
}

/** A 30px high AIR button. Both labels have an 18px text field centred inside their margins (2/3 for shiny, 5/6 for thick), so it starts 5px down. */
export const BreedingButton: FC<BreedingButtonProps> = ({ caption, variant, width = 122, className = '', onClick }) => {
    const thick = variant === 'thick';

    return (
        <button className={`volt-breed-pets-button is-${variant} ${className}`.trim()} style={{ width }} type="button" onClick={onClick}>
            <span className="volt-breed-pets-button-caption">
                <NativeCenteredField width={width}>
                    <NativeText
                        nativeResolution
                        transparent
                        background={thick ? 0x00aa00 : 0xf2f2f2}
                        overrides={thick ? { color: 0xffffff } : undefined}
                        text={caption}
                        textStyle={thick ? 'button_shiny_bold' : 'button_shiny_regular'}
                    />
                </NativeCenteredField>
            </span>
        </button>
    );
};

// The image views size their element from inline styles once the image arrives, so follow the element's style and box.
const useChildSize = (ref: RefObject<HTMLElement>) => {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const wrapper = ref.current;

        if (!wrapper) return;

        const measure = () => {
            const child = wrapper.firstElementChild as HTMLElement;
            const width = child?.offsetWidth ?? 0;
            const height = child?.offsetHeight ?? 0;

            setSize((prevValue) => (prevValue.width === width && prevValue.height === height ? prevValue : { width, height }));
        };
        const resizeObserver = new ResizeObserver(measure);
        const mutationObserver = new MutationObserver(() => {
            if (wrapper.firstElementChild) resizeObserver.observe(wrapper.firstElementChild);
            measure();
        });

        measure();
        if (wrapper.firstElementChild) resizeObserver.observe(wrapper.firstElementChild);
        mutationObserver.observe(wrapper, { attributes: true, childList: true, subtree: true });

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [ref]);

    return size;
};

interface BreedingPreviewProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

/** updatePreviewImage: breed_pets_preview_bg_png (122x130) with the image copied on top at whole pixels, centred. */
export const BreedingPreview: FC<BreedingPreviewProps> = ({ children, className = '', onClick }) => {
    const imageRef = useRef<HTMLDivElement>(null);
    const { width, height } = useChildSize(imageRef);

    return (
        <div className={`volt-breed-pets-preview ${className}`.trim()} style={{ backgroundImage: `url(${breedPreviewBackground})` }} onClick={onClick}>
            <div ref={imageRef} className="volt-breed-pets-preview-image" style={{ left: Math.floor((122 - width) / 2), top: Math.floor((130 - height) / 2) }}>
                {children}
            </div>
        </div>
    );
};

/** A layout text with auto_size "center" and no word wrap: the field fits the text and is centred in the window. */
export const BreedingCenteredName: FC<{ text: string; x?: number }> = ({ text, x = 0 }) => (
    <div className="volt-breed-pets-line" style={{ marginLeft: x }}>
        <SubpixelText align="field" background={BREEDING_SURFACE} text={text} textStyle="u_regular" width={122} />
    </div>
);

/** A layout text with auto_size "center" and word wrap: the field keeps the window width and centres each line. */
export const BreedingCenteredText: FC<{ text: string; width: number }> = ({ text, width }) => {
    const [singleLine, setSingleLine] = useState<boolean>(null);

    useEffect(() => {
        let disposed = false;

        measureSubpixelText('u_regular', text)
            .then((textWidth) => !disposed && setSingleLine(textWidth <= width - 4))
            .catch(() => !disposed && setSingleLine(false));

        return () => {
            disposed = true;
        };
    }, [text, width]);

    if (singleLine === null) return <div className="volt-breed-pets-line" />;

    if (singleLine)
        return (
            <div className="volt-breed-pets-line">
                <SubpixelText align="center" background={BREEDING_SURFACE} text={text} textStyle="u_regular" width={width} />
            </div>
        );

    return (
        <NativeText
            nativeResolution
            truncateHeight
            align="center"
            background={BREEDING_SURFACE}
            maxWidth={width}
            text={text}
            textStyle="u_regular"
            width={width}
        />
    );
};

interface BreedingBodyTextProps {
    text: string;
    italic?: boolean;
    x?: number;
}

/** The 13px auto_size "left" texts of the dialogs: 254 wide windows, word wrap. */
export const BreedingBodyText: FC<BreedingBodyTextProps> = ({ text, italic = false, x = 10 }) => (
    <div className="volt-breed-pets-body-text" style={{ marginLeft: x }}>
        <NativeText
            nativeResolution
            transparent
            truncateHeight
            background={BREEDING_SURFACE}
            maxWidth={254}
            overrides={{ size: 13 }}
            text={text}
            textStyle={italic ? 'u_italic' : 'u_regular'}
        />
    </div>
);
