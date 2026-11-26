const SURFACE = 0xf4f1e8;
const PANEL = 0xfaf8f1;
const ROW = 0xe4dfd0;
const EDGE = 0xcfc8b4;
const INK = 0x1d2a38;
const SOFT = 0x5d6b7a;

const BACKGROUNDS = new Map<number, number>([
    [0xdfdfdf, SURFACE],
    [0xe1e1e1, SURFACE],
    [0xe2e2e2, SURFACE],
    [0xe9e9e1, PANEL],
    [0xebebeb, PANEL],
    [0xececec, PANEL],
    [0xeeeeee, PANEL],
    [0xf3f3f3, PANEL],
    [0xd9d9d9, ROW],
    [0xdadada, ROW],
    [0xe6e6e6, ROW],
    [0xdbdddf, ROW],
    [0xcccccc, ROW],
    [0xbdbdb5, EDGE]
]);

const INKS = new Map<number, number>([
    [0x000000, INK],
    [0x151515, INK],
    [0x333333, INK],
    [0x666666, SOFT],
    [0x777777, SOFT]
]);

export const classicBackground = (color: number): number => BACKGROUNDS.get(color) ?? color;

export const classicInk = (color: number | undefined): number | undefined => (color === undefined ? color : (INKS.get(color) ?? color));
