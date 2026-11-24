import { FC, lazy, Suspense, useCallback, useState } from 'react';
import { CatalogEvent, CatalogInitGiftEvent } from '../../../../events';
import { useUiEvent } from '../../../../hooks';

const LazyCatalogGiftContent = lazy(() =>
    import('./CatalogGiftContent').then((module) => ({ default: module.CatalogGiftContent }))
);

export const CatalogGiftView: FC = () => {
    const [hasMounted, setHasMounted] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<CatalogInitGiftEvent | null>(null);

    const onInitGift = useCallback(
        (event: CatalogInitGiftEvent) => {
            if (hasMounted) return;

            setPendingEvent(event);
            setHasMounted(true);
        },
        [hasMounted]
    );

    useUiEvent<CatalogInitGiftEvent>(CatalogEvent.INIT_GIFT, onInitGift);

    const clearPendingEvent = useCallback(() => setPendingEvent(null), []);

    if (!hasMounted) return null;

    return (
        <Suspense fallback={null}>
            <LazyCatalogGiftContent initialGiftEvent={pendingEvent} onInitialGiftHandled={clearPendingEvent} />
        </Suspense>
    );
};
