import { FC } from 'react';

/** Line icons for LucadoOS windows, drawn on a 24px grid. */
const PATHS = {
    back: 'M15 5l-7 7 7 7',
    bag: 'M5 8h14l-1 12H6zM9 8V7a3 3 0 0 1 6 0v1',
    bell: 'M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0',
    bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
    bookmark: 'M7 4h10v16l-5-4-5 4z',
    box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
    camera: 'M4 8h3.5l1.5-2h6l1.5 2H20v11H4zM12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    chart: 'M5 20V11M12 20V4M19 20v-6',
    chat: 'M5 5h14v10H10l-4 4v-4H5z',
    chevron: 'M9 6l6 6-6 6',
    close: 'M6 6l12 12M18 6L6 18',
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
    flag: 'M5 21V4h11l-1.5 4L16 12H5',
    gamepad: 'M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.5 1.5L14.5 14h-5l-1 1.5A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4zM8 10.5v3M6.5 12h3M16 12h.01',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
    gift: 'M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-1.5-4-6-3.5-4.5-.8C8.3 9 12 9 12 9zM12 9c1.5-4 6-3.5 4.5-.8C15.7 9 12 9 12 9z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    group: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M17 14a6 6 0 0 1 4 5',
    hammer: 'M13.5 5.5l5 5-2 2-5-5zM12.5 8.5L4 17l3 3 8.5-8.5',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    height: 'M12 4v16M8.5 7.5L12 4l3.5 3.5M8.5 16.5L12 20l3.5-3.5',
    help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5',
    hidden: 'M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 6 8.5 6a14 14 0 0 1-2.4 3M6.3 7.8A14 14 0 0 0 3.5 12s3.5 6 8.5 6a8 8 0 0 0 3-.6',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    hotel: 'M5 21V5h9v16M14 10h5v11M3 21h18M8.5 9h2M8.5 13h2M8.5 17h2',
    image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5 5 5M15 9h.01',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
    list: 'M4 6h16M4 12h16M4 18h16',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    megaphone: 'M4 10v4h3l8 5V5L7 10zM18 9a4 4 0 0 1 0 6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    plus: 'M12 5v14M5 12h14',
    refresh: 'M19 6v5h-5M5 18v-5h5M18 11a7 7 0 0 0-12.5-3M6 13a7 7 0 0 0 12.5 3',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    shield: 'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6zM9 12l2 2 4-4',
    shirt: 'M8 4l4 2 4-2 5 4-3 3-2-1.5V20H8v-9.5L6 12 3 8z',
    swap: 'M4 8h14l-3-3M20 16H6l3 3',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7',
    trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v6M13.5 11v6',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
    usersearch: 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 19a6.5 6.5 0 0 1 9-6M17 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM21 21l-2.2-2.2'
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
