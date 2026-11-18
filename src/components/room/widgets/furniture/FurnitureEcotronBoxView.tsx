import { FC, SyntheticEvent, useLayoutEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import cardBackground from '../../../../assets/images/room-widgets/ecotron-box/ecotronbox_card_bg.png';
import furnimaticCardBackground from '../../../../assets/images/room-widgets/ecotron-box/ecotronbox_card_bg_furnimatic.png';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useFurnitureEcotronBoxWidget } from '../../../../hooks';

const CARD_BACKGROUND = 0xfafbfc;
const PREVIEW_SIZE = 39;
const NO_KERNING = { kerning: false };

// EcotronBoxFurniWidget picks the layout by the box's furni class; other classes get no card.
const CARDS: Record<string, { background: string; texts: string }> = {
    '': { background: cardBackground, texts: 'ecotronbox' },
    ecotron_box: { background: cardBackground, texts: 'ecotronbox' },
    matic_box: { background: furnimaticCardBackground, texts: 'furnimaticbox' }
};

/** A style 0 button or button_thick: resized to its caption field plus the label's 8px side margins. */
const CardButton: FC<{ caption: string; thick?: boolean; left: number; onClick: () => void }> = ({ caption, thick = false, left, onClick }) => {
    const fieldRef = useRef<HTMLSpanElement>(null);
    const [fieldWidth, setFieldWidth] = useState(0);

    useLayoutEffect(() => {
        const field = fieldRef.current;

        if (!field) return;

        const measure = () => setFieldWidth(field.offsetWidth);
        const observer = new ResizeObserver(measure);

        measure();
        observer.observe(field);

        return () => observer.disconnect();
    }, []);

    return (
        <button type="button" className={'volt-ecotron-box__button' + (thick ? ' is-thick' : '')} style={{ left, width: fieldWidth + 16 }} onClick={onClick}>
            <span ref={fieldRef} className="volt-ecotron-box__caption">
                <NativeText
                    nativeResolution
                    transparent
                    background={0xffffff}
                    overrides={NO_KERNING}
                    text={caption}
                    textStyle={thick ? 'button_bold' : 'button_regular'}
                />
            </span>
        </button>
    );
};

/** ecotronbox_card / ecotronbox_card_furnimatic, created at 100,100 and dragged by any point. */
export const FurnitureEcotronBoxView: FC<{}> = () => {
    const {
        isVisible = false,
        date = '',
        furniTypeName = '',
        canOpen = false,
        contents = null,
        openBox = null,
        onClose = null
    } = useFurnitureEcotronBoxWidget();
    const [iconOffset, setIconOffset] = useState<{ left: number; top: number }>(null);
    const card = CARDS[furniTypeName];

    if (!isVisible || !card) return null;

    // showIcon copies the icon into the 39x39 preview at int((39 - size) / 2).
    const placeIcon = (event: SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;

        setIconOffset({ left: Math.trunc((PREVIEW_SIZE - naturalWidth) / 2), top: Math.trunc((PREVIEW_SIZE - naturalHeight) / 2) });
    };

    return (
        <DraggableWindow
            handleSelector=".volt-ecotron-box"
            initialPosition={{ x: 100, y: 100 }}
            unconstrainedPosition
            windowPosition={DraggableWindowPosition.NOTHING}
        >
            <div className="volt-ecotron-box" role="dialog">
                <img alt="" className="volt-ecotron-box__background" draggable={false} src={card.background} />
                {contents && (
                    <span className="volt-ecotron-box__preview">
                        <img
                            alt=""
                            draggable={false}
                            src={contents.iconUrl}
                            style={iconOffset ? { left: iconOffset.left, top: iconOffset.top } : { visibility: 'hidden' }}
                            onLoad={placeIcon}
                        />
                    </span>
                )}
                <span className="volt-ecotron-box__date">
                    <NativeText
                        nativeResolution
                        transparent
                        background={CARD_BACKGROUND}
                        maxWidth={104}
                        overrides={NO_KERNING}
                        text={date}
                        textStyle="regular"
                    />
                </span>
                <span className="volt-ecotron-box__message">
                    <NativeText
                        nativeResolution
                        transparent
                        background={CARD_BACKGROUND}
                        maxWidth={139}
                        overrides={NO_KERNING}
                        text={contents ? contents.name : LocalizeText(`widget.furni.${card.texts}.title`)}
                        textStyle="regular"
                    />
                </span>
                {canOpen && <CardButton thick caption={LocalizeText(`widget.furni.${card.texts}.open`)} left={47} onClick={openBox} />}
                <CardButton caption={LocalizeText('generic.close')} left={200} onClick={onClose} />
            </div>
        </DraggableWindow>
    );
};
