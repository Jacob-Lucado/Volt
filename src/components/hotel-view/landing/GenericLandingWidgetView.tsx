import { CreateLinkEvent } from '@volt/renderer';
import { FC, ReactNode } from 'react';
import { getLandingPaneWidth, getLandingProperty, getLandingWidgetConf, isWideLandingSlot, LANDING_CONTENT_START_X, LocalizeText, OpenUrl, parseLandingPairs } from '../../../api';
import { AirButton } from '../../../common/air/AirWindow';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeFontStyle } from '../../../common/native-text/NativeFont';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';

// generic_widget_xml: a 20x20 bitmap at (10, 10) and a 250 wide content list at (0, 0), in a container 30 high.
const DEFAULT_BITMAP_X = 10;
const DEFAULT_BITMAP_Y = 10;
const CONTENT_WIDTH = 250;
const CONTAINER_HEIGHT = 30;
// The gradient behind the widgets, for compositing the glyph edges.
const TEXT_BACKGROUND = 0x27277f;

interface LandingTextColors {
    color?: number;
    etchingColor?: number;
    etchingPosition?: string;
}

// CommonWidgetSettings: landing.view.common.* recolour every COLORABLE text when set.
const getCommonTextColors = (): LandingTextColors =>
{
    const colors: LandingTextColors = {};
    const textColor = getLandingProperty('landing.view.common.textcolor');
    const etchingColor = getLandingProperty('landing.view.common.etchingcolor');
    const etchingPosition = getLandingProperty('landing.view.common.etchingposition');

    if(textColor) colors.color = parseInt(textColor, 16);
    if(etchingColor) colors.etchingColor = (0xff000000 | parseInt(etchingColor, 16)) >>> 0;
    if(etchingPosition) colors.etchingPosition = etchingPosition;

    return colors;
};

const LandingText: FC<{ text: string; width: number; textStyle: NativeTextStyleName; overrides: Partial<NativeFontStyle>; className: string }> = ({ text, width, textStyle, overrides, className }) => (
    <div className={className} style={{ width }}>
        <NativeText transparent truncateHeight background={TEXT_BACKGROUND} maxWidth={width - 4} overrides={overrides} text={text} textStyle={textStyle} />
    </div>
);

const LandingButton: FC<{ caption: string; onClick: () => void }> = ({ caption, onClick }) => (
    <div className="landing-element-button">
        <AirButton className="landing-element-button__pill" onClick={onClick}>{LocalizeText(caption)}</AirButton>
    </div>
);

// class_4332.createHandler and the element_<type> layouts; the content list stops at the first element it has no layout for.
const createElement = (args: string[], key: number, colors: LandingTextColors): ReactNode | false =>
{
    const [type, textKey = '', value = ''] = args;
    const width = args[2] && (type === 'caption' || type === 'bodytext') ? parseInt(args[2]) || CONTENT_WIDTH : CONTENT_WIDTH;

    switch(type)
    {
        // element_caption_xml: il_heading_1 at 18 px, at most two lines.
        case 'caption':
            return <LandingText key={key} className="landing-element-caption" overrides={{ size: 18, ...colors }} text={LocalizeText(textKey)} textStyle="il_heading_1" width={width} />;
        // element_bodytext_xml has no text_style: style 100 is the Illumina Light theme, whose default is il_regular (ThemeManager.as:129).
        case 'bodytext':
            return <LandingText key={key} className="landing-element-bodytext" overrides={{ ...colors }} text={LocalizeText(textKey)} textStyle="il_regular" width={width} />;
        // CatalogButtonElementHandler
        case 'catalogbutton':
            return <LandingButton key={key} caption={textKey} onClick={() => CreateLinkEvent(value ? `catalog/open/${ value }` : 'catalog/open')} />;
        case 'internallinkbutton':
            return <LandingButton key={key} caption={textKey} onClick={() => value && CreateLinkEvent(value)} />;
        // class_4365 opens the page in the browser.
        case 'link':
            return <LandingButton key={key} caption={textKey} onClick={() => value && OpenUrl(value)} />;
        default:
            return false;
    }
};

/** GenericWidget: an optional picture and a column of text and button elements, both set by landing.view.<code>.layout / .conf. */
export const GenericLandingWidgetView: FC<{ slot: number; code: string }> = ({ slot, code }) =>
{
    const wide = isWideLandingSlot(slot);
    const colors = getCommonTextColors();
    let bitmapUrl = '';
    let bitmapX = DEFAULT_BITMAP_X;
    let bitmapY = DEFAULT_BITMAP_Y;
    let bitmapWidth: number = undefined;
    let bitmapHeight: number = undefined;
    let contentX = wide ? LANDING_CONTENT_START_X : 0;
    let contentY = 0;
    let contentWidth = CONTENT_WIDTH;
    let height = CONTAINER_HEIGHT;

    for(const [key, value] of parseLandingPairs(getLandingWidgetConf(slot, code, 'layout')))
    {
        const number = parseInt(value);

        switch(key)
        {
            case 'bitmap.uri': bitmapUrl = value; break;
            case 'bitmap.width': bitmapWidth = number; break;
            case 'bitmap.height': bitmapHeight = number; break;
            case 'bitmap.x': bitmapX = number; break;
            case 'bitmap.y': bitmapY = number; break;
            case 'content.x': contentX = number; break;
            case 'content.y': contentY = number; break;
            case 'content.width': contentWidth = number; break;
            case 'container.height': height = Math.max(number, height); break;
        }
    }

    const elements: ReactNode[] = [];

    for(const args of parseLandingPairs(getLandingWidgetConf(slot, code, 'conf')))
    {
        const element = createElement(args, elements.length, colors);

        if(element === false) break;

        elements.push(element);
    }

    return (
        <div className="landing-generic-widget" style={{ width: getLandingPaneWidth(wide), minHeight: height }}>
            {bitmapUrl && <img alt="" className="landing-generic-widget__bitmap" draggable={false} src={bitmapUrl} style={{ left: bitmapX, top: bitmapY, width: bitmapWidth, height: bitmapHeight }} />}
            <div className="landing-generic-widget__content" style={{ marginLeft: contentX, marginTop: contentY, width: contentWidth }}>
                {elements}
            </div>
        </div>
    );
};
