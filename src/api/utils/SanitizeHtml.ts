import { CreateLinkEvent } from '@volt/renderer';
import DOMPurify, { Config } from 'dompurify';

// Any link that opens a new browsing context gets a safe rel so it cannot
// reverse-tabnab the opener. Registered once at module load; applies to every
// call on the shared DOMPurify instance, such as the habbopages viewer.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const element = node as Element;

    if (element.tagName === 'A' && element.getAttribute('target')) {
        element.setAttribute('rel', 'noopener noreferrer');
    }
});

const EVENT_SCHEME = 'event:';
// The two slashes matter: `https:path` and `https:/path` resolve against the client's own origin.
const WEB_LINK = /^https?:\/\//i;
// Every instance drops data attributes from its input, so only the hotel instance can emit this mark.
const HOTEL_EVENT_LINK = 'data-hotel-event-link';

// Web links open in a new tab that cannot reach the client. Marked `event:` links stay in the client. Other links lose their href.
const restrictLinks = (keepEventLinks: boolean) => (node: Node) => {
    const element = node as Element;

    if (element.tagName !== 'A') return;

    const href = element.getAttribute('href') ?? '';

    if (WEB_LINK.test(href)) {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
    } else if (keepEventLinks && href.startsWith(EVENT_SCHEME)) {
        element.setAttribute(HOTEL_EVENT_LINK, '');
    } else {
        element.removeAttribute('href');
    }
};

const createSanitizer = (config: Config, { keepEventLinks = false, keepStyle }: { keepEventLinks?: boolean; keepStyle?: (style: string) => boolean } = {}) => {
    const purifier = DOMPurify(window);

    purifier.addHook('afterSanitizeAttributes', restrictLinks(keepEventLinks));

    if (keepStyle) {
        purifier.addHook('uponSanitizeAttribute', (_node, data) => {
            if (data.attrName === 'style' && !keepStyle(data.attrValue)) data.keepAttr = false;
        });
    }

    return (html: string): string => purifier.sanitize(html ?? '', { ...config, ALLOW_DATA_ATTR: false });
};

const FORMATTING_TAGS = ['b', 'i', 'u', 'br', 'span', 'div', 'p', 'strong', 'em'];

// The colour spans and table tabs that RoomChatFormatter writes.
const CHAT_STYLE = /^(?:\s*(?:color\s*:\s*(?:#[0-9a-f]{3,8}|[a-z]+)|display\s*:\s*inline-block|min-width\s*:\s*4em)\s*(?:;|$))+\s*$/i;

/** For text from players, staff or the server, such as alerts and notifications: formatting and web links only. */
export const SanitizeHtml = createSanitizer({ ALLOWED_TAGS: [...FORMATTING_TAGS, 'a'], ALLOWED_ATTR: ['href'], ALLOWED_URI_REGEXP: WEB_LINK });

/** For chat that went through RoomChatFormatter, which encodes the player's text and adds colour spans. */
export const SanitizeChatHtml = createSanitizer({ ALLOWED_TAGS: FORMATTING_TAGS, ALLOWED_ATTR: ['style'] }, { keepStyle: (style) => CHAT_STYLE.test(style) });

/**
 * For the hotel's own texts, such as catalog pages and localisation texts, which may carry images, styling and `event:` links.
 * Only these links run in the client. Never use it for text that contains anything a player wrote or chose.
 */
export const SanitizeHotelHtml = createSanitizer(
    {
        ALLOWED_TAGS: [...FORMATTING_TAGS, 'a', 'img'],
        ALLOWED_ATTR: ['href', 'class', 'style', 'src', 'alt'],
        // DOMPurify's default rule without the mail and phone schemes, plus `event:`. Links are limited further by restrictLinks.
        ALLOWED_URI_REGEXP: /^(?:https?:\/\/|event:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
    },
    { keepEventLinks: true }
);

const HTML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Encodes plain text, such as a name or a server value, before it is placed into HTML. */
export const EncodeHtml = (value: string): string => (value ?? '').replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);

// Runs the `event:` links of hotel texts in the client unless a view already handled the click.
if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || !(event.target instanceof Element)) return;

        const link = event.target.closest('a');
        const href = link?.getAttribute('href') ?? '';

        if (!link?.hasAttribute(HOTEL_EVENT_LINK) || !href.startsWith(EVENT_SCHEME)) return;

        event.preventDefault();
        CreateLinkEvent(href.slice(EVENT_SCHEME.length));
    });
}
