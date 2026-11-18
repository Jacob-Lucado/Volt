import { FC } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeFontStyle } from '../../../common/native-text/NativeFont';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';

// The AIR info panels draw word wrapped text windows. An auto sized window stops growing at its height_max and a fixed
// one keeps its height: whatever does not fit is cut off, not scrolled and not shown with an ellipsis.
export const InventoryInfoTextView: FC<{
    text: string;
    className?: string;
    textStyle?: NativeTextStyleName;
    width?: number;
    maxHeight?: number;
    height?: number;
    overrides?: Partial<NativeFontStyle>;
    maxLines?: number;
    overflowReplace?: string;
}> = ({ text, className = '', textStyle = 'u_regular', width, maxHeight, height, overrides, maxLines, overflowReplace }) => (
    // An empty auto sized text window is only its two 2px gutters high.
    <div className={className} style={{ width, maxHeight, height: height ?? (text ? undefined : 4), overflow: 'hidden' }}>
        {text && (
            <NativeText
                text={text}
                textStyle={textStyle}
                background={0xe9e9e1}
                maxWidth={width}
                overrides={overrides}
                maxLines={maxLines}
                overflowReplace={overflowReplace}
                clipToWindow
                transparent
                nativeResolution
            />
        )}
    </div>
);
