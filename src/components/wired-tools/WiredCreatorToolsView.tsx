import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { ensureWiredTextsLoaded } from '../../api/wired/loadWiredTexts';
import { lazyWindow } from '../../common/lazyWindow';
import { useWiredMenuErrors } from '../../hooks';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const LazyWiredCreatorToolsContent = lazyWindow(async () => {
    const [, module] = await Promise.all([ensureWiredTextsLoaded(), import('./WiredCreatorToolsContent')]);

    return { default: module.WiredCreatorToolsContent };
}, 'WiredCreatorTools');

export const WiredCreatorToolsView: FC<{}> = () => {
    const isVisible = useWiredCreatorToolsUiStore((s) => s.isVisible);
    const setIsVisible = useWiredCreatorToolsUiStore((s) => s.setIsVisible);
    const [hasMounted, setHasMounted] = useState(false);
    const [isContentReady, setIsContentReady] = useState(false);
    const [initialLink, setInitialLink] = useState<string | null>(null);
    const isContentReadyRef = useRef(false);

    useWiredMenuErrors();

    useEffect(() => {
        if (isVisible) setHasMounted(true);
    }, [isVisible]);

    useEffect(() => {
        if (isContentReady) return;

        const handleDeferredLink = (url: string) => {
            if (isContentReadyRef.current) return;

            setInitialLink(url);
            setHasMounted(true);
        };

        const toolsTracker: ILinkEventTracker = {
            eventUrlPrefix: 'wired-tools/',
            linkReceived: handleDeferredLink
        };
        const menuTracker: ILinkEventTracker = {
            eventUrlPrefix: 'wiredmenu/',
            linkReceived: handleDeferredLink
        };

        AddLinkEventTracker(toolsTracker);
        AddLinkEventTracker(menuTracker);

        return () => {
            RemoveLinkEventTracker(toolsTracker);
            RemoveLinkEventTracker(menuTracker);
        };
    }, [isContentReady]);

    const handleReady = useCallback(() => {
        isContentReadyRef.current = true;
        setIsContentReady(true);
    }, []);

    const clearInitialLink = useCallback(() => setInitialLink(null), []);

    const handleChunkError = useCallback(() => {
        isContentReadyRef.current = false;
        setIsContentReady(false);
        setHasMounted(false);
        setInitialLink(null);
        setIsVisible(false);
    }, [setIsVisible]);

    if (!hasMounted) return null;

    return (
        <LazyWiredCreatorToolsContent
            initialLink={initialLink}
            onChunkError={handleChunkError}
            onInitialLinkHandled={clearInitialLink}
            onReady={handleReady}
        />
    );
};
