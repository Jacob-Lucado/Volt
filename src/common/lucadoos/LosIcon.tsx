import { FC } from 'react';

/** Line icons for LucadoOS windows, drawn on a 24px grid. */
const PATHS = {
    back: 'M15 5l-7 7 7 7',
    bell: 'M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0',
    bookmark: 'M7 4h10v16l-5-4-5 4z',
    chevron: 'M9 6l6 6-6 6',
    close: 'M6 6l12 12M18 6L6 18',
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
    flag: 'M5 21V4h11l-1.5 4L16 12H5',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    group: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M17 14a6 6 0 0 1 4 5',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5',
    hidden: 'M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 6 8.5 6a14 14 0 0 1-2.4 3M6.3 7.8A14 14 0 0 0 3.5 12s3.5 6 8.5 6a8 8 0 0 0 3-.6',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
    list: 'M4 6h16M4 12h16M4 18h16',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    megaphone: 'M4 10v4h3l8 5V5L7 10zM18 9a4 4 0 0 1 0 6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    plus: 'M12 5v14M5 12h14',
    refresh: 'M19 6v5h-5M5 18v-5h5M18 11a7 7 0 0 0-12.5-3M6 13a7 7 0 0 0 12.5 3',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0'
} as const;

export type LosIconName = keyof typeof PATHS;

export const LosIcon: FC<{ name: LosIconName; size?: number }> = ({ name, size = 16 }) => (
    <svg
        className="los-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d={PATHS[name]} />
    </svg>
);
