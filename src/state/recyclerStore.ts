import { createVoltStore } from './createVoltStore';

/**
 * HabboInventory.setupRecycler: while an open Furni-Matic page is shown, inventory tiles mark recyclable furni and the
 * furni in the recycler slots are locked out of the inventory counts.
 */
interface RecyclerState {
    active: boolean;
    slotItemIds: readonly number[];
    setActive: (active: boolean) => void;
    setSlotItemIds: (ids: readonly number[]) => void;
}

export const useRecyclerStore = createVoltStore<RecyclerState>()((set) => ({
    active: false,
    slotItemIds: [],
    setActive: (active: boolean) => set((state) => (state.active === active ? state : { active })),
    setSlotItemIds: (slotItemIds: readonly number[]) => set({ slotItemIds })
}));
