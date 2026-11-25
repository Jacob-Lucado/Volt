import { FC, useCallback, useRef, useState } from 'react';
import { lazyWindow } from '../../../../common/lazyWindow';
import { CatalogEvent, CatalogInitGiftEvent } from '../../../../events';
import { useUiEvent } from '../../../../hooks';

const LazyCatalogGiftContent = lazyWindow(
    () => import('./CatalogGiftContent').then((module) => ({ default: module.CatalogGiftContent })),
    'CatalogGift'
);

export const CatalogGiftView: FC = () => {
    const [hasMounted, setHasMounted] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<CatalogInitGiftEvent | null>(null);
    const isContentReadyRef = useRef(false);

    const onInitGift = useCallback((event: CatalogInitGiftEvent) => {
        if (isContentReadyRef.current) return;

        setPendingEvent(event);
        setHasMounted(true);
    }, []);

    useUiEvent<CatalogInitGiftEvent>(CatalogEvent.INIT_GIFT, onInitGift);

    const handleReady = useCallback(() => {
        isContentReadyRef.current = true;
    }, []);

    const clearPendingEvent = useCallback(() => setPendingEvent(null), []);

    const handleChunkError = useCallback(() => {
        isContentReadyRef.current = false;
        setHasMounted(false);
        setPendingEvent(null);
    }, []);

    if (!hasMounted) return null;

    return (
        <LazyCatalogGiftContent
            initialGiftEvent={pendingEvent}
            onChunkError={handleChunkError}
            onInitialGiftHandled={clearPendingEvent}
            onReady={handleReady}
        />
    );
};
