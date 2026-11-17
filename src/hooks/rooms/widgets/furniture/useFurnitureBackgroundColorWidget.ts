import { ApplyTonerComposer, GetRoomEngine, IRoomSession, RoomControllerLevel, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@volt/renderer';
import { useState } from 'react';
import { HasPermission, Permission, SendMessageComposer } from '../../../../api';
import { useVoltEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

const canUseToner = (roomSession: IRoomSession) =>
    !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST || HasPermission(Permission.RoomOwnerAny));

const useFurnitureBackgroundColorWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [lightness, setLightness] = useState(0);
    const { roomSession = null } = useRoom();

    const applyToner = () => SendMessageComposer(new ApplyTonerComposer(objectId, hue, saturation, lightness));

    const toggleToner = () => roomSession.useMultistateItem(objectId);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setHue(0);
        setSaturation(0);
        setLightness(0);
    };

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_BACKGROUND_COLOR, (event) => {
        if (!canUseToner(roomSession)) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const model = roomObject.model;

        setObjectId(event.objectId);
        setCategory(event.category);
        setHue(Math.max(model.getValue<number>(RoomObjectVariable.FURNITURE_ROOM_BACKGROUND_COLOR_HUE) || 0, 0));
        setSaturation(Math.max(model.getValue<number>(RoomObjectVariable.FURNITURE_ROOM_BACKGROUND_COLOR_SATURATION) || 0, 0));
        setLightness(Math.max(model.getValue<number>(RoomObjectVariable.FURNITURE_ROOM_BACKGROUND_COLOR_LIGHTNESS) || 0, 0));
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, hue, saturation, lightness, setHue, setSaturation, setLightness, applyToner, toggleToner, onClose };
};

export const useFurnitureBackgroundColorWidget = useFurnitureBackgroundColorWidgetState;
