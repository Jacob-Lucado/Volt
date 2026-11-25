import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker, RoomEngineEvent, RoomId } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Permission } from '../../api/permissions';
import { lazyWindow } from '../../common/lazyWindow';
import { useHasPermission, useModAlertStore, useModTools, useVoltEvent } from '../../hooks';
import type { ModToolsInitialRoomState } from './ModToolsContent';

const LazyModToolsContent = lazyWindow(
    () => import('./ModToolsContent').then((module) => ({ default: module.ModToolsContent })),
    'ModTools'
);

export const ModToolsView: FC<{}> = () => {
    const { settings = null } = useModTools();
    const canUseModTools = useHasPermission(Permission.ModerationTool);
    const hasAlerts = useModAlertStore((state) => state.alerts.length > 0);
    const [hasMounted, setHasMounted] = useState(false);
    const [isContentReady, setIsContentReady] = useState(false);
    const [pendingRoom, setPendingRoom] = useState<ModToolsInitialRoomState | null>(null);
    const [pendingLinks, setPendingLinks] = useState<string[]>([]);
    const settingsSeenRef = useRef(false);
    const canUseModToolsRef = useRef(canUseModTools);
    const isContentReadyRef = useRef(false);

    useEffect(() => {
        canUseModToolsRef.current = canUseModTools;
    }, [canUseModTools]);

    useEffect(() => {
        if (settings) settingsSeenRef.current = true;

        if (settings || canUseModTools || hasAlerts) setHasMounted(true);
    }, [settings, canUseModTools, hasAlerts]);

    useVoltEvent<RoomEngineEvent>([RoomEngineEvent.INITIALIZED, RoomEngineEvent.DISPOSED], (event) => {
        if (isContentReadyRef.current || RoomId.isRoomPreviewerId(event.roomId)) return;

        const entered = event.type === RoomEngineEvent.INITIALIZED;

        setPendingRoom({
            roomId: entered ? event.roomId : -1,
            enteredAfterSettings: entered && settingsSeenRef.current
        });
    });

    useEffect(() => {
        if (isContentReady) return;

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                if (isContentReadyRef.current) return;

                if (!canUseModToolsRef.current && !settingsSeenRef.current) return;

                setPendingLinks((prev) => [...prev, url]);
                setHasMounted(true);
            },
            eventUrlPrefix: 'mod-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [isContentReady]);

    const handleReady = useCallback(() => {
        isContentReadyRef.current = true;
        setIsContentReady(true);
    }, []);

    const clearPendingLinks = useCallback(() => {
        setPendingLinks((prev) => (prev.length ? [] : prev));
    }, []);

    const handleChunkError = useCallback(() => {
        isContentReadyRef.current = false;
        setIsContentReady(false);
        setHasMounted(false);
    }, []);

    if (!hasMounted) return null;

    return (
        <LazyModToolsContent
            initialLinks={pendingLinks}
            initialRoom={pendingRoom}
            onChunkError={handleChunkError}
            onInitialLinksHandled={clearPendingLinks}
            onReady={handleReady}
        />
    );
};
