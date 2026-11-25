import { FurnitureExchangeComposer, GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@volt/renderer';
import { useState } from 'react';
import { IsOwnerOfFurniture, SendMessageComposer } from '../../../../api';
import { useVoltEvent } from '../../../events';

const useFurnitureExchangeWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [value, setValue] = useState(0);

    const onClose = () => {
        setObjectId(-1);
        setValue(0);
    };

    const redeem = () => {
        SendMessageComposer(new FurnitureExchangeComposer(objectId));

        onClose();
    };

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_CREDITFURNI, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        // CFC_ credit furni are "Non-redeemable" on Habbo, so the server refuses to exchange them.
        if (!roomObject || !IsOwnerOfFurniture(roomObject) || roomObject.type.toUpperCase().startsWith('CFC_')) return;

        setObjectId(event.objectId);
        setValue(roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_CREDIT_VALUE) || 0);
    });

    return { objectId, value, redeem, onClose };
};

export const useFurnitureExchangeWidget = useFurnitureExchangeWidgetState;
