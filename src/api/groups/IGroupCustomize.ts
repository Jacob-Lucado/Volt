export interface IGroupCustomize {
    badgeBases: { id: number; code: number; images: string[] }[];
    badgeSymbols: { id: number; code: number; images: string[] }[];
    badgePartColors: { id: number; color: string }[];
    groupColorsA: { id: number; color: string }[];
    groupColorsB: { id: number; color: string }[];
}
