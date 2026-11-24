import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ensureWiredTextsLoaded } from '../../api/wired/loadWiredTexts';
import { useWiredMenuErrors } from '../../hooks';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const LazyWiredCreatorToolsContent = lazy(async () => {
    const [, module] = await Promise.all([ensureWiredTextsLoaded(), import('./WiredCreatorToolsContent')]);

    return { default: module.WiredCreatorToolsContent };
});

export const WiredCreatorToolsView: FC<{}> = () => {
    const isVisible = useWiredCreatorToolsUiStore((s) => s.isVisible);
    const [hasMounted, setHasMounted] = useState(false);
    const [initialLink, setInitialLink] = useState<string | null>(null);

    useWiredMenuErrors();

    useEffect(() => {
        if (isVisible) setHasMounted(true);
    }, [isVisible]);

    useEffect(() => {
        if (hasMounted) return;

        const handleDeferredLink = (url: string) => {
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
    }, [hasMounted]);

    const clearInitialLink = useCallback(() => setInitialLink(null), []);

    if (!hasMounted) return null;

    return (
        <Suspense fallback={null}>
            <LazyWiredCreatorToolsContent initialLink={initialLink} onInitialLinkHandled={clearInitialLink} />
        </Suspense>
    );
};
