import { IGroupCustomize } from './IGroupCustomize';

export class GroupBadgePart
{
    public static BASE: string = 'b';
    public static SYMBOL: string = 's';

    public type: string;
    /** The badge editor id the server lists and expects back. Badge codes name the same part by its badge code id. */
    public key: number;
    public color: number;
    public position: number;

    constructor(type: string, key?: number, color?: number, position?: number)
    {
        this.type = type;
        this.key = key ?? 0;
        this.color = color ?? 0;
        this.position = position ?? 4;
    }

    /** The code to draw: a layer without a part (key 0, including an unset base) or a part the editor does not list draws nothing. */
    public getPreviewCode(customize: IGroupCustomize): string
    {
        if (this.key === 0) return null;

        const codeId = GroupBadgePart.getCodeId(customize, this.type, this.key);

        if (codeId === null) return null;

        return GroupBadgePart.getCode(this.type, codeId, this.color, this.position);
    }

    public static getCodeId(customize: IGroupCustomize, type: string, key: number): number
    {
        const parts = (type === GroupBadgePart.BASE) ? customize?.badgeBases : customize?.badgeSymbols;

        return parts?.find((part) => part.id === key)?.code ?? null;
    }

    public static getCode(type: string, codeId: number, color: number, position: number): string
    {
        return type + (codeId < 10 ? '0' : '') + codeId + (color < 10 ? '0' : '') + color + position;
    }

    public static getBadgeCode(parts: GroupBadgePart[], customize: IGroupCustomize): string
    {
        return (parts ?? []).map((part) => part.getPreviewCode(customize) ?? '').join('');
    }

    /**
     * The wire list (key, color, position per layer) the v75 client sends: only layers that hold a part the editor lists. The server reads the first
     * triple as the base, so a badge whose base is unset or not listed (a symbol would move into the base slot) is refused with null.
     */
    public static serialize(parts: GroupBadgePart[], customize: IGroupCustomize): number[] | null
    {
        if (!parts || !parts.length || parts[0].type !== GroupBadgePart.BASE || !parts[0].getPreviewCode(customize)) return null;

        const badge: number[] = [];

        parts.forEach((part) =>
        {
            if (!part.getPreviewCode(customize)) return;

            badge.push(part.key, part.color, part.position);
        });

        return badge;
    }
}
