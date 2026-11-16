import { FC } from 'react';
import { NotificationBubbleItem, NotificationBubbleType, OpenUrl } from '../../../../api';
import clubIcon from '../../../../assets/images/notifications/styles/if_icon_hc.png';
import recyclerIcon from '../../../../assets/images/notifications/styles/if_icon_recycler.png';
import infoIcon from '../../../../assets/images/notifications/styles/if_icon_temp.png';
import vipIcon from '../../../../assets/images/notifications/styles/if_icon_vip.png';
import { NativeNotificationBubbleView } from '../native/NativeNotificationBubbleView';

// habbo_notifications_config_xml "styles": the icon a style shows when the notification brings none of its own.
const STYLE_ICONS: Record<string, string> = {
    [NotificationBubbleType.INFO]: infoIcon,
    receivedcredits: infoIcon,
    [NotificationBubbleType.CLUB]: clubIcon,
    [NotificationBubbleType.VIP]: vipIcon,
    [NotificationBubbleType.RECYCLEROK]: recyclerIcon
};

export interface NotificationDefaultBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = ({ item = null, onClose = null }) => (
    <NativeNotificationBubbleView
        iconUrl={item.iconUrl || STYLE_ICONS[item.notificationType]}
        message={item.message}
        onActivate={() => item.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
        onClose={onClose}
    />
);
