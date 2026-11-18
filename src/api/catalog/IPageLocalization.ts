export interface IPageLocalization {
    getText(index: number): string;
    readonly textCount: number;
    getImage(index: number): string;
}
