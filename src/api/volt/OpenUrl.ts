import { CreateLinkEvent } from '@volt/renderer';
import { isSafeExternalUrl } from '../utils';

export const OpenUrl = (url: string) => {
    if (!url || !url.length) return;

    if (isSafeExternalUrl(url)) {
        // noopener keeps the opened page from reaching and redirecting the client tab.
        window.open(url.trim(), '_blank', 'noopener,noreferrer');
    } else {
        CreateLinkEvent(url);
    }
};
