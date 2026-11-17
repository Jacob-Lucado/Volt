import { FC, useMemo } from 'react';
import { getPlainNotificationText } from './getPlainNotificationText';
import { BUBBLE_FADE_IN_MS, useNativeBubbleLife } from './useNativeBubbleLife';

export interface NativeNotificationBubbleViewProps {
    message: string;
    iconUrl?: string;
    /** Run when the bubble is clicked, before it fades out. */
    onActivate?: () => void;
    onClose: () => void;
}

// layout_notification_xml: 190x66 style-1 (black) border, 50x50 icon at (8,8), Volter Bold white text at (66,8) 116 wide. Click acts on
// the item's link and fades the bubble out; it fades in and out over a second each and stays 15 s.
export const NativeNotificationBubbleView: FC<NativeNotificationBubbleViewProps> = ({ message, iconUrl, onActivate, onClose }) => {
    const { shown, dismiss, hoverProps } = useNativeBubbleLife(onClose);
    const { markup: messageMarkup, text: plainMessage } = useMemo(() => getPlainNotificationText(message), [message]);

    return (
        <div className="volt-native-bubble-slot">
            <div
                className="volt-native-bubble"
                style={{ opacity: shown ? 1 : 0, transition: `opacity ${BUBBLE_FADE_IN_MS}ms linear` }}
                onClick={() => {
                    onActivate?.();
                    dismiss();
                }}
                {...hoverProps}
            >
                {!!iconUrl && (
                    <div className="volt-native-bubble-icon">
                        <img alt="" draggable={false} src={iconUrl} />
                    </div>
                )}
                {plainMessage !== null ? (
                    <div className="volt-native-bubble-text">{plainMessage}</div>
                ) : (
                    <div className="volt-native-bubble-text" dangerouslySetInnerHTML={{ __html: messageMarkup }} />
                )}
            </div>
        </div>
    );
};
