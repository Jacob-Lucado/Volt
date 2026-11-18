import { FC } from 'react';
import { NativeText } from '../../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../../common/native-text/NativeTextStyles';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

export const ROOM_SETTINGS_BACKGROUND = 0xe9e9e1;
// Line height of the 12px Ubuntu styles (ascent + descent in twips).
const UBUNTU_12_LINE_HEIGHT = 13.4;

interface RoomSettingsTextViewProps {
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    textStyle?: NativeTextStyleName;
    /** multiline + word_wrap: lines wrap inside the window width. */
    wrap?: boolean;
    /** auto_size: the window grows to the text, so nothing is clipped. Without it the window clips the text. */
    autoSize?: boolean;
    /** The text window is blended to 0.5 (RoomSettingsCtrl.disableWindow). */
    disabled?: boolean;
    /** Clicking the text toggles this control, like the checkbox window under it in AIR. */
    htmlFor?: string;
    background?: number;
    className?: string;
}

// A ros_room_settings text window: the TextField raster (with its 2px gutter) at the window origin.
export const RoomSettingsTextView: FC<RoomSettingsTextViewProps> = (props) => {
    const { x, y, w, h, text, textStyle = 'u_regular', wrap = false, autoSize = !wrap, disabled = false, htmlFor, background = ROOM_SETTINGS_BACKGROUND, className = '' } = props;
    const raster = <NativeText background={background} maxWidth={wrap ? w : undefined} text={text} textStyle={textStyle} />;
    // A TextField only draws the lines that fit whole inside its height and 2px gutters.
    const visibleLines = Math.floor((h - 4) / UBUNTU_12_LINE_HEIGHT);
    const clipHeight = wrap && !autoSize ? Math.ceil(2 + visibleLines * UBUNTU_12_LINE_HEIGHT) : h;

    return (
        <NavigatorRoomSettingsAtView className={`ros-native${autoSize ? '' : ' ros-clip'}${disabled ? ' ros-disabled' : ''} ${className}`.trim()} h={clipHeight} w={w} x={x} y={y}>
            {htmlFor ? <label htmlFor={htmlFor}>{raster}</label> : raster}
        </NavigatorRoomSettingsAtView>
    );
};
