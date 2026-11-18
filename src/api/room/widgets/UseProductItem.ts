import { GetSessionDataManager, IFurnitureData, RoomObjectCategory } from '@volt/renderer';
import { GetFurnitureDataForRoomObject } from '../../volt/session/GetFurnitureDataForRoomObject';

export class UseProductItem {
    constructor(
        public readonly id: number,
        public readonly category: number,
        public readonly name: string,
        public readonly requestRoomObjectId: number,
        public readonly targetRoomObjectId: number,
        public readonly requestInventoryStripId: number,
        public readonly replace: boolean
    ) {}

    // An inventory product has no room object: requestRoomObjectId then holds its furniture type id.
    public get productItemId(): number {
        return this.requestInventoryStripId > -1 ? this.requestInventoryStripId : this.requestRoomObjectId;
    }

    public getFurnitureData(roomId: number): IFurnitureData {
        if (this.requestInventoryStripId > -1) return GetSessionDataManager().getFloorItemData(this.requestRoomObjectId);

        return GetFurnitureDataForRoomObject(roomId, this.requestRoomObjectId, RoomObjectCategory.FLOOR);
    }
}
