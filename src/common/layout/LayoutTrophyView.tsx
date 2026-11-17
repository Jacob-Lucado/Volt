import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../api';
import { DraggableWindow } from '../draggable-window';
import { loadNativeFont, measureNativeText } from '../native-text/NativeFont';
import { NativeText } from '../native-text/NativeText';
import { nativeTextStyles } from '../native-text/NativeTextStyles';

interface LayoutTrophyViewProps {
    color: string;
    message: string;
    date: string;
    senderName: string;
    customTitle?: string;
    onCloseClick: () => void;
}

// AIR TrophyTheme header colours: gold, silver, bronze. Text is drawn on the same colour.
const THEME_COLORS = [0xecc547, 0xc9bdcc, 0xb87834];

// Width of the greeting text field in the AIR trophy layout (gutters included).
const GREETING_WIDTH = 297;

// The title and name fields are auto-sized to int(textWidth + 4) (AIR TextController.draw). The title keeps its centre in the 120 wide
// header and the name keeps its right edge at x 320 (WindowController.setRectangle).
const TITLE_FIELD_WIDTH = 120;
const NAME_RIGHT = 320;

const useAutoFieldWidth = (text: string): number | null => {
    const [width, setWidth] = useState<number | null>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles.u_bold;

        loadNativeFont(style)
            .then(({ font }) => !disposed && setWidth(Math.floor(measureNativeText(font, text, style)) + 4))
            .catch(() => !disposed && setWidth(null));

        return () => {
            disposed = true;
        };
    }, [text]);

    return width;
};

export const LayoutTrophyView: FC<LayoutTrophyViewProps> = (props) => {
    const { color = '', message = '', date = '', senderName = '', customTitle = null, onCloseClick = null } = props;
    const theme = Math.min(Math.max((parseInt(color, 10) || 1) - 1, 0), 2);
    const background = THEME_COLORS[theme];
    const title = LocalizeText('widget.furni.trophy.title');
    const titleWidth = useAutoFieldWidth(title);
    const nameWidth = useAutoFieldWidth(senderName);

    return (
        <DraggableWindow handleSelector=".volt-layout-trophy">
            <div className={`volt-layout-trophy trophy-${theme + 1}`}>
                <div className="trophy-header" style={{ backgroundColor: `#${background.toString(16)}` }}>
                    <div style={titleWidth ? { left: Math.trunc((TITLE_FIELD_WIDTH - titleWidth) / 2) } : undefined}>
                        <NativeText text={title} textStyle="u_bold" background={background} width={titleWidth ?? TITLE_FIELD_WIDTH} align={titleWidth ? undefined : 'center'} nativeResolution />
                    </div>
                </div>
                <div className="trophy-content">
                    {customTitle && <NativeText text={customTitle} textStyle="u_bold" background={background} width={GREETING_WIDTH} maxWidth={GREETING_WIDTH} nativeResolution />}
                    <NativeText text={message.replace(/\\r/g, '\n')} textStyle="u_regular" background={background} width={GREETING_WIDTH} maxWidth={GREETING_WIDTH} nativeResolution />
                </div>
                <div className="trophy-date">
                    <NativeText text={date} textStyle="u_bold" background={background} nativeResolution />
                </div>
                <div className="trophy-name" style={nameWidth ? { left: NAME_RIGHT - nameWidth } : { right: 340 - NAME_RIGHT }}>
                    <NativeText text={senderName} textStyle="u_bold" background={background} width={nameWidth ?? undefined} nativeResolution />
                </div>
                <button type="button" className="trophy-close" aria-label={LocalizeText('generic.close')} onClick={onCloseClick} />
            </div>
        </DraggableWindow>
    );
};
