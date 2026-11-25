import {
    AddLinkEventTracker,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomGeometry,
    RoomSessionEvent
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CameraEffectSelection, deleteTrustedCamera, GetConfigurationValue, LocalizeText, NotificationAlertType } from '../../api';
import { lazyWindow } from '../../common/lazyWindow';
import { useAchievements, useCamera, useNotification, useRoom, useVoltEvent } from '../../hooks';
import { getCameraAchievementLevel } from './CameraAirUtilities';

const MODE_NONE: number = 0;
const MODE_CAPTURE: number = 1;
const MODE_EDITOR: number = 2;
const MODE_CHECKOUT: number = 3;
const CAMERA_CANVAS_ID = 1;
const DEFAULT_ROOM_ZOOM = 1;
const ROOM_ZOOM_EPSILON = 0.001;

const LazyCameraWidgetContent = lazyWindow(
    () => import('./CameraWidgetContent').then((module) => ({ default: module.CameraWidgetContent })),
    'CameraWidget'
);

const getLogicalRoomZoom = (roomId: number): number => {
    const roomEngine = GetRoomEngine();
    const displayScale = roomEngine.getRoomInstanceRenderingCanvasScale(roomId, CAMERA_CANVAS_ID);
    const geometry = roomEngine.getRoomInstanceGeometry(roomId, CAMERA_CANVAS_ID);
    const geometryScale = geometry?.scale ?? RoomGeometry.SCALE_ZOOMED_IN;

    return displayScale * (geometryScale / RoomGeometry.SCALE_ZOOMED_IN);
};

const isDefaultRoomZoom = (roomId: number): boolean => Math.abs(getLogicalRoomZoom(roomId) - DEFAULT_ROOM_ZOOM) <= ROOM_ZOOM_EPSILON;

export const CameraWidgetView: FC<{}> = () => {
    const [mode, setMode] = useState<number>(MODE_NONE);
    const [checkoutEffects, setCheckoutEffects] = useState<CameraEffectSelection[]>([]);
    const [checkoutZoom, setCheckoutZoom] = useState(false);
    const {
        availableEffects = [],
        selectedPictureIndex = -1,
        setSelectedPictureIndex = null,
        setActivePictureSlotIndex = null,
        cameraRoll = Array(5).fill(null),
        setCameraRoll = null,
        price = { credits: 0, duckets: 0, publishDucketPrice: 0 }
    } = useCamera();
    const { achievementCategories = [], ensureAchievementsInitialized = null } = useAchievements();
    const { simpleAlert = null } = useNotification();
    const { roomSession = null } = useRoom();

    const myLevel = useMemo(() => getCameraAchievementLevel(achievementCategories), [achievementCategories]);

    useEffect(() => {
        if (roomSession && ensureAchievementsInitialized) ensureAchievementsInitialized();
    }, [roomSession, ensureAchievementsInitialized]);

    const openCamera = useCallback(() => {
        if (!roomSession) return;

        if (!isDefaultRoomZoom(roomSession.roomId)) {
            simpleAlert(LocalizeText('camera.zoom.missing.body'), NotificationAlertType.WINDOW, null, null, LocalizeText('camera.zoom.missing.header'));
            return;
        }

        setSelectedPictureIndex(-1);
        setMode(MODE_CAPTURE);
    }, [roomSession, setSelectedPictureIndex, simpleAlert]);

    const closeCamera = useCallback(() => {
        setSelectedPictureIndex(-1);
        setMode(MODE_NONE);
    }, [setSelectedPictureIndex]);

    const checkoutPictureUrl = (pictureUrl: string, effects: CameraEffectSelection[] = [], zoom = false) => {
        if (GetSessionDataManager().isSafetyLocked) {
            simpleAlert(LocalizeText('notifications.text.safety_locked'), null, null, null, LocalizeText('generic.alert.title'));

            if (!GetConfigurationValue<boolean>('camera.effects.enabled', true)) {
                setSelectedPictureIndex(-1);
                setMode(MODE_NONE);
            }

            return;
        }

        setCheckoutEffects(effects);
        setCheckoutZoom(zoom);
        setMode(MODE_CHECKOUT);
    };

    const processAction = (type: string) => {
        switch (type) {
            case 'close':
                closeCamera();
                return;
            case 'edit':
                if (selectedPictureIndex < 0 || !cameraRoll[selectedPictureIndex]?.draftId) return;

                if (!GetConfigurationValue<boolean>('camera.effects.enabled', true)) {
                    checkoutPictureUrl(cameraRoll[selectedPictureIndex].imageUrl);
                    return;
                }

                setMode(MODE_EDITOR);
                return;
            case 'delete':
                if (selectedPictureIndex < 0) return;

                deleteTrustedCamera(cameraRoll[selectedPictureIndex]?.draftId);
                cameraRoll[selectedPictureIndex]?.texture?.destroy?.(true);
                setCameraRoll((previous) => previous.map((picture, index) => (index === selectedPictureIndex ? null : picture)));
                setActivePictureSlotIndex(selectedPictureIndex);
                setSelectedPictureIndex(-1);
                return;
            case 'editor_cancel':
                openCamera();
                return;
        }
    };

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => {
        closeCamera();
    });

    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.ROOM_ZOOMED, (event) => {
        if (!roomSession || event.roomId !== roomSession.roomId || isDefaultRoomZoom(event.roomId)) return;

        closeCamera();
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        openCamera();
                        return;
                    case 'hide':
                        closeCamera();
                        return;
                    case 'toggle':
                        setSelectedPictureIndex(-1);

                        if (mode === MODE_NONE) openCamera();
                        else setMode(MODE_NONE);
                        return;
                }
            },
            eventUrlPrefix: 'camera/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [mode, openCamera, closeCamera, setSelectedPictureIndex]);

    if (mode === MODE_NONE) return null;

    return (
        <LazyCameraWidgetContent
            availableEffects={availableEffects}
            checkoutEffects={checkoutEffects}
            checkoutZoom={checkoutZoom}
            mode={mode}
            myLevel={myLevel}
            onAction={processAction}
            onCheckout={checkoutPictureUrl}
            onChunkError={closeCamera}
            price={price}
            selectedPicture={cameraRoll[selectedPictureIndex] ?? null}
        />
    );
};
