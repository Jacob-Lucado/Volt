import { GroupItem } from '../../../../../../api';

export interface RecyclerInventoryChoice {
    iconUrl: string;
    itemId: number;
    name: string;
}

export const normalizeRecyclerSlotCount = (value: unknown, fallback = 8) => {
    const count = Number(value);

    return Number.isInteger(count) && count > 0 ? Math.min(count, 12) : fallback;
};

export const getRecyclerEligibleItemIds = (groups: readonly GroupItem[]) =>
    new Set(groups.flatMap((group) => group.items.filter((item) => item.recyclable && !item.locked).map((item) => item.id)));
