import {
    GetRoomEngine,
    GetSessionDataManager,
    IFurnitureData,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    RoomSessionPresentEvent
} from '@volt/renderer';
import { useRef, useState } from 'react';
import { HasPermission, Permission, ProductTypeEnum } from '../../../../api';
import { useVoltEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

export interface EcotronBoxContents {
    name: string;
    iconUrl: string;
}

/** EcotronBoxFurniWidget with FurnitureEcotronBoxWidgetHandler: the box tag card, then the box contents once it is opened. */
const useFurnitureEcotronBoxWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const [date, setDate] = useState('');
    const [furniTypeName, setFurniTypeName] = useState('');
    const [canOpen, setCanOpen] = useState(false);
    const [contents, setContents] = useState<EcotronBoxContents>(null);
    const openingRef = useRef(false);
    const { roomSession = null } = useRoom();

    // hideInterface keeps the box while it is being opened, so its contents still show.
    const hide = () => {
        setIsVisible(false);
        if (!openingRef.current) setObjectId(-1);
        setDate('');
        setCanOpen(false);
    };

    const onClose = () => {
        openingRef.current = false;
        hide();
    };

    const openBox = () => {
        if (openingRef.current || objectId === -1 || !canOpen || !roomSession) return;

        openingRef.current = true;
        roomSession.openGift(objectId);
    };

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ECOTRONBOX, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const data = roomObject?.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA);

        if (data === undefined || data === null) return;

        const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);

        openingRef.current = false;
        setObjectId(event.objectId);
        setDate(data);
        setFurniTypeName(GetSessionDataManager().getFloorItemData(typeId)?.className ?? '');
        setCanOpen(!!roomSession?.isRoomOwner || HasPermission(Permission.RoomOwnerAny));
        setContents(null);
        setIsVisible(true);
    });

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_PRESENT, onClose);

    useVoltEvent<RoomSessionPresentEvent>(RoomSessionPresentEvent.RSPE_PRESENT_OPENED, (event) => {
        if (!openingRef.current) return;

        openingRef.current = false;

        let furniData: IFurnitureData = null;
        let iconUrl: string = null;

        if (event.itemType === ProductTypeEnum.FLOOR) {
            furniData = GetSessionDataManager().getFloorItemData(event.classId);
            iconUrl = GetRoomEngine().getFurnitureFloorIconUrl(event.classId);
        } else if (event.itemType === ProductTypeEnum.WALL) {
            furniData = GetSessionDataManager().getWallItemData(event.classId);
            iconUrl = GetRoomEngine().getFurnitureWallIconUrl(event.classId);
        }

        if (!iconUrl) return;

        setObjectId(0);
        setContents({ name: furniData?.name ?? '', iconUrl });
        setCanOpen(false);
        setIsVisible(true);
    });

    useFurniRemovedEvent(objectId !== -1, (event) => {
        if (event.id === objectId) hide();
    });

    return { isVisible, date, furniTypeName, canOpen, contents, openBox, onClose };
};

export const useFurnitureEcotronBoxWidget = useFurnitureEcotronBoxWidgetState;
