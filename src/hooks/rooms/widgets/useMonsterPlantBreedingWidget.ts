import {
    BreedPetsMessageComposer,
    GetRoomEngine,
    GetSessionDataManager,
    IPetBreedingResultData,
    RoomObjectCategory,
    RoomObjectType,
    RoomSessionPetBreedingEvent,
    RoomSessionPetBreedingResultEvent,
    RoomSessionPetLevelUpdateEvent,
    RoomSessionPetStatusUpdateEvent
} from '@volt/renderer';
import { useState } from 'react';
import { LocalizeText, NotificationAlertType, RoomWidgetUpdateRoomObjectEvent, SendMessageComposer, UseProductItem } from '../../../api';
import { useUiEvent, useVoltEvent } from '../../events';
import { useNotificationActions } from '../../notification';
import { useObjectDeselectedEvent, useObjectSelectedEvent } from '../engine';
import { useRoom } from '../useRoom';

export interface BreedingPair {
    requestRoomIndex: number;
    targetRoomIndex: number;
}

export interface BreedingConfirmation extends BreedingPair {
    /** The other owner asks: the request text and the accept button instead of the description and the breed button. */
    isRequest: boolean;
}

export interface BreedingResult {
    first: IPetBreedingResultData;
    second: IPetBreedingResultData;
}

const firstFigurePart = (figure: string) => {
    const parts = (figure ?? '').split(' ');

    return parts.length ? parseInt(parts[0]) : -1;
};

/** AvatarInfoWidget's monster plant breeding: the breed bubbles, the confirmation window, the waiting dialog and the result window. */
export const useMonsterPlantBreedingWidget = () => {
    const [breedBubbles, setBreedBubbles] = useState<UseProductItem[]>([]);
    const [confirmation, setConfirmation] = useState<BreedingConfirmation>(null);
    const [waiting, setWaiting] = useState<BreedingPair>(null);
    const [result, setResult] = useState<BreedingResult>(null);
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotificationActions();

    const sendBreedPets = (state: number, pair: BreedingPair) => {
        const requestPet = roomSession?.userDataManager.getUserDataByIndex(pair.requestRoomIndex);
        const targetPet = roomSession?.userDataManager.getUserDataByIndex(pair.targetRoomIndex);

        if (!requestPet || !targetPet) return;

        SendMessageComposer(new BreedPetsMessageComposer(state, requestPet.webID, targetPet.webID));
    };

    const removeBreedBubblesWithId = (roomIndex: number) =>
        setBreedBubbles((prevValue) => prevValue.filter((bubble) => bubble.id !== roomIndex && bubble.requestRoomObjectId !== roomIndex));

    const findPetRoomIndex = (webId: number) => roomSession?.userDataManager.getPetData(webId)?.roomIndex ?? -1;

    const isSamePair = (pair: BreedingPair, requestRoomIndex: number, targetRoomIndex: number) =>
        !!pair && pair.requestRoomIndex === requestRoomIndex && pair.targetRoomIndex === targetRoomIndex;

    // RWUAM_REQUEST_BREED_PET: a bubble over every other plant of the same type that can breed now and whose owner is in the room
    // and is the user, or has allowed breeding.
    const requestBreedMenu = (petWebId: number) => {
        if (!roomSession?.userDataManager) return;

        const source = roomSession.userDataManager.getPetData(petWebId);

        if (!source) return;

        const petType = firstFigurePart(source.figure);
        const userId = GetSessionDataManager().userId;
        const bubbles: UseProductItem[] = [];

        for (const roomObject of GetRoomEngine().getRoomObjects(roomSession.roomId, RoomObjectCategory.UNIT)) {
            const userData = roomSession.userDataManager.getUserDataByIndex(roomObject.id);

            if (!userData || userData.type !== RoomObjectType.PET || !userData.canBreed) continue;

            if (!userData.hasBreedingPermission && userData.ownerId !== userId) continue;

            if (!roomSession.userDataManager.getUserData(userData.ownerId)) continue;

            if (firstFigurePart(userData.figure) !== petType || userData.roomIndex === source.roomIndex) continue;

            bubbles.push(new UseProductItem(userData.roomIndex, RoomObjectCategory.UNIT, userData.name, source.roomIndex, roomObject.id, -1, false));
        }

        setConfirmation(null);
        setBreedBubbles(bubbles);
    };

    const chooseBreedTarget = (item: UseProductItem) => {
        setBreedBubbles([]);
        setConfirmation({ requestRoomIndex: item.requestRoomObjectId, targetRoomIndex: item.targetRoomObjectId, isRequest: false });
    };

    const cancelConfirmation = () => {
        if (!confirmation) return;

        sendBreedPets(BreedPetsMessageComposer.STATE_CANCEL, confirmation);
        setConfirmation(null);
    };

    const acceptConfirmation = () => {
        if (!confirmation) return;

        setConfirmation(null);
        sendBreedPets(BreedPetsMessageComposer.STATE_ACCEPT, confirmation);
    };

    const breed = () => {
        if (!confirmation) return;

        sendBreedPets(BreedPetsMessageComposer.STATE_START, confirmation);

        const requestPet = roomSession?.userDataManager.getUserDataByIndex(confirmation.requestRoomIndex);
        const targetPet = roomSession?.userDataManager.getUserDataByIndex(confirmation.targetRoomIndex);

        if (requestPet && targetPet && requestPet.ownerId !== targetPet.ownerId)
            setWaiting({ requestRoomIndex: confirmation.requestRoomIndex, targetRoomIndex: confirmation.targetRoomIndex });

        setConfirmation(null);
    };

    const closeWaiting = () => setWaiting(null);

    const cancelWaiting = () => {
        if (waiting) sendBreedPets(BreedPetsMessageComposer.STATE_CANCEL, waiting);

        setWaiting(null);
    };

    useVoltEvent<RoomSessionPetBreedingEvent>(RoomSessionPetBreedingEvent.PET_BREEDING, (event) => {
        const requestRoomIndex = findPetRoomIndex(event.ownPetId);
        const targetRoomIndex = findPetRoomIndex(event.otherPetId);

        switch (event.state) {
            case 0:
                setConfirmation({ requestRoomIndex, targetRoomIndex, isRequest: false });
                return;
            case 1:
                setConfirmation((prevValue) => (isSamePair(prevValue, requestRoomIndex, targetRoomIndex) ? null : prevValue));
                setWaiting(null);
                simpleAlert(
                    LocalizeText('breedpets.cancel.notification.text'),
                    NotificationAlertType.WINDOW,
                    null,
                    null,
                    LocalizeText('breedpets.cancel.notification.title')
                );
                return;
            case 2:
                setConfirmation((prevValue) => (isSamePair(prevValue, requestRoomIndex, targetRoomIndex) ? null : prevValue));
                setWaiting(null);
                return;
            case 3:
                setConfirmation({ requestRoomIndex, targetRoomIndex, isRequest: true });
                return;
        }
    });

    useVoltEvent<RoomSessionPetBreedingResultEvent>(RoomSessionPetBreedingResultEvent.PET_BREEDING_RESULT, (event) => {
        if (!event.resultData || !event.otherResultData) return;

        setResult({ first: event.resultData, second: event.otherResultData });
    });

    useVoltEvent<RoomSessionPetStatusUpdateEvent>(RoomSessionPetStatusUpdateEvent.PET_STATUS_UPDATE, (event) =>
        removeBreedBubblesWithId(findPetRoomIndex(event.petId))
    );

    useVoltEvent<RoomSessionPetLevelUpdateEvent>(RoomSessionPetLevelUpdateEvent.PET_LEVEL_UPDATE, (event) =>
        removeBreedBubblesWithId(findPetRoomIndex(event.petId))
    );

    useObjectSelectedEvent(() => setBreedBubbles([]));

    useObjectDeselectedEvent(() => setBreedBubbles([]));

    useUiEvent<RoomWidgetUpdateRoomObjectEvent>(RoomWidgetUpdateRoomObjectEvent.USER_REMOVED, (event) => {
        removeBreedBubblesWithId(event.id);
        setConfirmation((prevValue) => (prevValue && (prevValue.requestRoomIndex === event.id || prevValue.targetRoomIndex === event.id) ? null : prevValue));
    });

    return {
        breedBubbles,
        removeBreedBubble: (item: UseProductItem) => setBreedBubbles((prevValue) => prevValue.filter((bubble) => bubble !== item)),
        requestBreedMenu,
        chooseBreedTarget,
        confirmation,
        cancelConfirmation,
        acceptConfirmation,
        breed,
        waiting,
        closeWaiting,
        cancelWaiting,
        result,
        closeResult: () => setResult(null)
    };
};
