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
            {isVisible && (
                <VoltCardView
                    classNames={['volt-catalog-window', ...(isBuilder ? ['is-builder'] : [])]}
                    frameStyle={3}
                    initialPosition={initialPosition.current}
                    isResizable
                    resizeAxis="vertical"
                    uniqueKey="catalog"
                    onPositionChange={onPositionChange}
                >
                    <VoltCardHeaderView headerText="" onCloseClick={() => setIsVisible(false)}>
                        {/* header_3 caption: u_frame_title in white, centred over the title bar (frame_3 leaves 6px left and 8px right: 556px). */}
                        <NativeCenteredField className="volt-catalog-title" width={556}>
                            <NativeText
                                nativeResolution
                                background={isBuilder ? 0xd79b34 : 0x32699d}
                                overrides={{ color: 0xffffff }}
                                text={isBusy ? LocalizeText('generic.loading') || 'Loading...' : LocalizeText(isBuilder ? 'builder.catalog.title' : 'catalog.title')}
                                textStyle="u_frame_title"
                            />
                        </NativeCenteredField>
                    </VoltCardHeaderView>
                    <div className="volt-catalog-mobile-header">
                        <div className="volt-catalog-mobile-currency">
                            <div className="volt-catalog-coin">
                                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
                                <LayoutCurrencyIcon type={-1} />
                            </div>
                            {displayedCurrencies.map((type) => (
                                <div key={type} className="volt-catalog-coin">
                                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                                    <LayoutCurrencyIcon type={type} />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* HabboCatalog.useNonTabbedCatalog: the Builders Club catalogue (catalog_ubuntu) has no tabs. */}
                    {!isBuilder && (
                        <VoltCardTabsView classNames={['volt-catalog-tabs-shell']} justifyContent="start">
                            {visibleTabs.map((child) => (
                                <VoltCardTabsItemView
                                    key={child.id}
                                    isActive={child === currentTab}
                                    style={{ width: tabWidth, flexBasis: tabWidth }}
                                    title={child.localization}
                                    onClick={() => {
                                        if (searchResult) setSearchResult(null);

                                        showTab(child);
                                    }}
                                >
                                    <CatalogTabLabel text={getSwfTabLabel(child.localization)} width={tabWidth} />
                                </VoltCardTabsItemView>
                            ))}
                        </VoltCardTabsView>
                    )}
                    <div className={`volt-catalog-standard-header ${isBuilder ? 'is-builder' : ''}`}>
                        <div
                            className="volt-catalog-standard-header-bg"
                            style={headerImage ? { backgroundImage: `url(${headerImage})` } : undefined}
                        />
                        <div className="volt-catalog-standard-header-icon">
                            <CatalogIconView icon={isBuilder ? BUILDER_HEADER_ICON : (activeCatalogNode?.iconId ?? rootNode?.iconId ?? 1)} />
                        </div>
                        <div className="volt-catalog-standard-header-copy">
                            {isBuilder ? (
                                <CatalogBuilderHeaderView />
                            ) : (
                                <>
                                    {/* catalog.header.title (80, 11) u_headline_big and catalog.header.description (80, 34), white over the header picture. */}
                                    <NativeText
                                        nativeResolution
                                        transparent
                                        background={0x0b3155}
                                        className="volt-catalog-standard-header-title"
                                        overrides={{ color: 0xffffff }}
                                        text={
                                            searchResult
                                                ? LocalizeText('catalog.search.header')
                                                : getSwfTabLabel(activeCatalogNode?.localization ?? LocalizeText('catalog.title'))
                                        }
                                        textStyle="u_headline_big"
                                    />
                                    <NativeText
                                        nativeResolution
                                        transparent
                                        background={0x0b3155}
                                        className="volt-catalog-standard-header-description"
                                        maxWidth={HEADER_DESCRIPTION_FIELD_WIDTH}
                                        overrides={{ color: 0xffffff }}
                                        text={getCatalogPlainText(
                                            searchResult
                                                ? LocalizeText('catalog.search.results', ['count', 'needle'], [String(searchResult.offers.length), searchResult.searchValue])
                                                : getCatalogHeaderDescription(currentPage?.layoutCode, currentPage?.localization)
                                        )}
                                        textStyle="u_regular"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                    <VoltCardContentView classNames={['volt-catalog-content-shell']}>
                        <div className={`volt-catalog-stage ${sidebarHidden ? 'is-navigation-hidden' : ''}`}>
                            {!sidebarHidden && (
                                <div className="volt-catalog-sidebar">
                                    <div className="volt-catalog-search-shell">
                                        <CatalogSearchView />
                                    </div>
                                    <div className="volt-catalog-navigation-shell">
                                        {currentTab && <CatalogNavigationView isBuilder={isBuilder} node={currentTab} />}
                                    </div>
                                </div>
                            )}
                            <div aria-busy={isBusy} className="volt-catalog-layout-shell">
                                <div className="volt-catalog-layout-header-shell">
                                    <CatalogBreadcrumbView />
                                    <div className="volt-catalog-layout-hero">
                                        {!!currentPage?.localization?.getImage(0) && <img alt="" src={currentPage.localization.getImage(0)} />}
                                    </div>
                                </div>
                                <div className="volt-catalog-layout-container">{GetCatalogLayout(currentPage, hideCatalogNavigation)}</div>
                            </div>
                        </div>
                    </VoltCardContentView>
                    {(isBusy || catalogLoadError) && <CatalogLoadingStateView error={catalogLoadError} onRetry={retryCurrentPage} />}
                </VoltCardView>
            )}
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
