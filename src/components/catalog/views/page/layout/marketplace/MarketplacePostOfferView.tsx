import { FC, lazy, Suspense, useCallback, useState } from 'react';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useUiEvent } from '../../../../../../hooks';

const LazyMarketplacePostOfferContent = lazy(() =>
    import('./MarketplacePostOfferContent').then((module) => ({ default: module.MarketplacePostOfferContent }))
);

export const MarketplacePostOfferView: FC<{}> = () =>
{
    const [hasMounted, setHasMounted] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<CatalogPostMarketplaceOfferEvent | null>(null);

    const onPostMarketplace = useCallback(
        (event: CatalogPostMarketplaceOfferEvent) =>
        {
            if (hasMounted) return;

            setPendingEvent(event);
            setHasMounted(true);
        },
        [hasMounted]
    );

    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, onPostMarketplace);

    const clearPendingEvent = useCallback(() => setPendingEvent(null), []);

    if (!hasMounted) return null;

    return (
        <Suspense fallback={null}>
            <LazyMarketplacePostOfferContent initialEvent={pendingEvent} onInitialEventHandled={clearPendingEvent} />
        </Suspense>
    );
};
