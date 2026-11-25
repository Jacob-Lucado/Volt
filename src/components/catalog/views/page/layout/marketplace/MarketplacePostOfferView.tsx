import { FC, useCallback, useRef, useState } from 'react';
import { lazyWindow } from '../../../../../../common/lazyWindow';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useUiEvent } from '../../../../../../hooks';

const LazyMarketplacePostOfferContent = lazyWindow(
    () => import('./MarketplacePostOfferContent').then((module) => ({ default: module.MarketplacePostOfferContent })),
    'MarketplacePostOffer'
);

export const MarketplacePostOfferView: FC<{}> = () =>
{
    const [hasMounted, setHasMounted] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<CatalogPostMarketplaceOfferEvent | null>(null);
    const isContentReadyRef = useRef(false);

    const onPostMarketplace = useCallback((event: CatalogPostMarketplaceOfferEvent) =>
    {
        if (isContentReadyRef.current) return;

        setPendingEvent(event);
        setHasMounted(true);
    }, []);

    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, onPostMarketplace);

    const handleReady = useCallback(() =>
    {
        isContentReadyRef.current = true;
    }, []);

    const clearPendingEvent = useCallback(() => setPendingEvent(null), []);

    const handleChunkError = useCallback(() =>
    {
        isContentReadyRef.current = false;
        setHasMounted(false);
        setPendingEvent(null);
    }, []);

    if (!hasMounted) return null;

    return (
        <LazyMarketplacePostOfferContent
            initialEvent={pendingEvent}
            onChunkError={handleChunkError}
            onInitialEventHandled={clearPendingEvent}
            onReady={handleReady}
        />
    );
};
