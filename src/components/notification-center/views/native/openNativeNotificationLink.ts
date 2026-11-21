import { CreateLinkEvent } from '@volt/renderer';
import { isSafeExternalUrl, OpenUrl } from '../../../../api';

// v75 Notification link handling: "event:" links run a link event and close the alert, http and https links open a page.
export const openNativeNotificationLink = (url: string) => {
    if (!url) return;

    if (url.startsWith('event:')) CreateLinkEvent(url.substring(6));
    else if (isSafeExternalUrl(url)) OpenUrl(url);
};
