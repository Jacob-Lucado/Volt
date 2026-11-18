import { FC } from 'react';
import { NativeCenteredField } from '../../../../../common/native-text/NativeCenteredField';
import { useTextWindowWidths } from '../../../../../common/native-text/useTextWindowWidths';
import { NativeText } from '../../../../../common/native-text/NativeText';

/** The button_shiny_regular text field height, Flash gutters included. */
const FIELD_HEIGHT = 18;

/** The heights with their own skin images; other heights stretch the 22px skin. */
const SKIN_HEIGHTS = [24, 25, 30];

interface CatalogAirShinyButtonProps {
    caption: string;
    /** Window x, y, width and height from the layout XML. */
    rect: [number, number, number, number];
    /** default: button style 3 (button_shiny). green: style 6, the 0x00aa00 skin with the button_shiny_black layout. */
    tint?: 'default' | 'green';
    disabled?: boolean;
    /** ButtonController sets resize-to-content: the width follows the caption field plus the label margins, the left edge stays. */
    fitCaption?: boolean;
    className?: string;
    onClick?: () => void;
}

/**
 * AIR button style 3 / 6 (habbo_skin_button_shiny_default_xml, 5px caps). The caption label is centred on both axes and
 * floored to whole pixels; its margins are 8/2/8/3 (button_shiny) or 10/5/10/6 with a white caption (button_shiny_black).
 */
export const CatalogAirShinyButton: FC<CatalogAirShinyButtonProps> = ({
    caption,
    rect,
    tint = 'default',
    disabled = false,
    fitCaption = false,
    className = '',
    onClick
}) => {
    const [x, y, layoutWidth, height] = rect;
    const green = tint === 'green';
    const fieldWidth = useTextWindowWidths(fitCaption ? [{ text: caption, textStyle: 'button_shiny_regular' }] : [])?.[0];
    const width = fitCaption && fieldWidth !== undefined ? fieldWidth + (green ? 20 : 16) : layoutWidth;
    const [top, bottom] = green ? [5, 6] : [2, 3];
    const captionTop = Math.floor((height - (FIELD_HEIGHT + top + bottom)) / 2) + top;
    const heightClass = SKIN_HEIGHTS.includes(height) ? `is-h${height}` : '';

    return (
        <button
            className={`volt-catalog-air-shiny is-${tint} ${heightClass} ${className}`.replace(/\s+/g, ' ').trim()}
            disabled={disabled}
            style={{ left: x, top: y, width, height }}
            type="button"
            onClick={onClick}
        >
            <span className="volt-catalog-air-shiny-caption" style={{ top: captionTop }}>
                <NativeCenteredField width={width}>
                    <NativeText
                        transparent
                        background={green ? 0x00aa00 : 0xf2f2f2}
                        overrides={green ? { color: 0xffffff } : undefined}
                        text={caption}
                        textStyle="button_shiny_regular"
                    />
                </NativeCenteredField>
            </span>
        </button>
    );
};
