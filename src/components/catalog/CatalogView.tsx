import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { CatalogType, GetConfigurationValue } from '../../api';
import { lazyWindow } from '../../common/lazyWindow';
import { CatalogEffectsHost, useCatalogActions, useCatalogData, useCatalogUiState } from '../../hooks';
import { CatalogPlacedOfferConfirmView } from './views/CatalogPlacedOfferConfirmView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

const LazyCatalogWindowContent = lazyWindow(
    () => import('./CatalogWindowContent').then((module) => ({ default: module.CatalogWindowContent })),
    'Catalog'
);

const isBuildersClubEnabled = () => GetConfigurationValue<boolean>('builders.club.enabled', true);

const getCatalogTypeFromLink = (type?: string) => {
    switch ((type || '').toLowerCase()) {
        case 'bc':
        case 'builder':
        case 'buildersclub':
        case 'builders_club':
        case 'warehouse':
            return isBuildersClubEnabled() ? CatalogType.BUILDER : CatalogType.NORMAL;
        default:
            return CatalogType.NORMAL;
    }
};

const CatalogViewInner: FC<{}> = () => {
    const { isVisible = false, setIsVisible = null } = useCatalogUiState();
    const {
        openPageById = null,
        openPageByName = null,
        openPageByOfferId = null,
        openCatalogByType = null,
        toggleCatalogByType = null
    } = useCatalogActions();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts.length > 2) {
                            openCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        if (parts.length > 2) {
                            toggleCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'warehouse':
                        openCatalogByType(getCatalogTypeFromLink('warehouse'));

                        if (parts.length === 4 && parts[2] === 'offerId') {
                            openPageByOfferId(parseInt(parts[3]));

                            return;
                        }

                        if (parts.length > 2 && parts[2]) {
                            const pageId = Number(parts[2]);

                            if (Number.isInteger(pageId) && pageId > 0) openPageById(pageId);
                            else openPageByName(parts[2]);
                        }

                        return;
                    case 'open':
                        if (parts.length > 2) openCatalogByType(CatalogType.NORMAL);

                        if (parts.length > 2) {
                            if (parts.length === 4) {
                                switch (parts[2]) {
                                    case 'offerId':
                                        openPageByOfferId(parseInt(parts[3]));
                                        return;
                                }
                            } else {
                                const pageId = Number(parts[2]);

                                if (Number.isInteger(pageId) && pageId > 0) openPageById(pageId);
                                else openPageByName(parts[2]);
                            }
                        } else {
                            setIsVisible(true);
                        }

                        return;
                }
            },
            eventUrlPrefix: 'catalog/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, openPageById, openPageByOfferId, openPageByName, openCatalogByType, toggleCatalogByType]);

    const handleChunkError = useCallback(() => setIsVisible(false), [setIsVisible]);

    return (
        <>
            {isVisible && <LazyCatalogWindowContent onChunkError={handleChunkError} />}
            <CatalogGiftView />
            <CatalogPlacedOfferConfirmView />
            <MarketplacePostOfferView />
        </>
    );
};

export const CatalogView: FC<{}> = () => {
    const { catalogLocalizationVersion = 0 } = useCatalogData();

    return (
        <>
            <CatalogEffectsHost />
            <div className="hidden" data-catalog-localization-version={catalogLocalizationVersion} />
            <CatalogViewInner />
        </>
    );
};
