import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeShortNumber, LocalizeText } from '../../api';
import { DraggableWindow, LayoutCurrencyIcon } from '../../common';
import { LosWindow } from '../../common/lucadoos';
import { CatalogEffectsHost, useCatalogActions, useCatalogData, useCatalogUiState, usePurse } from '../../hooks';
import { useCatalogPageQuery } from '../../hooks/catalog/useCatalogQueries';
import { getCatalogHeaderDescription, getCatalogPlainText } from './catalogLocalization.helpers';
import { parseCatalogTabLabel } from './catalogTabLabel';
import { LosCatalogNav } from './lucado/LosCatalogNav';
import { CatalogLoadingStateView } from './views/CatalogLoadingStateView';
import { CatalogPlacedOfferConfirmView } from './views/CatalogPlacedOfferConfirmView';
import { CatalogBuilderHeaderView } from './views/catalog-header/CatalogBuilderHeaderView';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { CatalogSearchView } from './views/page/common/CatalogSearchView';
import { catalogPageHidesLeftPane, getCatalogLayoutDefinition } from './views/page/layout/catalogLayoutRegistry';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

// The Builders Club page icon (LocalizationCatalogWidget: builder pages show icon_193 in the header).
const BUILDER_HEADER_ICON = 193;

/** catalog_ubuntu catalog.header.image: AIR keeps this default while a Builders Club page sets no header image of its own. */
const BUILDER_HEADER_IMAGE = 'catalog_header_roombuilder';

/** AIR HabboCatalog.toggleCatalog: the Builders Club catalogue is only there while builders.club.enabled is on. */
const isBuildersClubEnabled = () => GetConfigurationValue<boolean>('builders.club.enabled', true);

/** Page renderers drawn in the glass style. The rest keep the light sheet. */
const DARK_RENDERERS = ['default', 'frontpage'];

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
    const { rootNode = null, currentPage = null, searchResult = null, isBusy = false, catalogLoadError = null } = useCatalogData();
    const {
        isVisible = false,
        setIsVisible = null,
        setNavigationHidden = null,
        currentTab = null,
        activeNodes = [],
        setSearchResult = null,
        pageId: openPageId = -1,
        currentType = null
    } = useCatalogUiState();
    const loadedPage = useCatalogPageQuery(currentType || CatalogType.NORMAL, openPageId, isVisible).data?.page ?? null;
    const isBuilder = currentType === CatalogType.BUILDER;
    const {
        openPageById = null,
        openPageByName = null,
        openPageByOfferId = null,
        showTab = null,
        getNodeById = null,
        openCatalogByType = null,
        toggleCatalogByType = null,
        retryCurrentPage = null
    } = useCatalogActions();
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);
    // The header belongs to the open page: a folder (pageId -1) can be active without opening one.
    const pageId = currentPage?.pageId ?? -1;
    const headerImage =
        currentPage?.localization?.getImage(0) ||
        (isBuilder ? GetConfigurationValue<string>('catalog.asset.image.url', '').replace('%name%', BUILDER_HEADER_IMAGE) : '');
    const activeCatalogNode =
        (pageId > -1 && (activeNodes.findLast((node) => node.pageId === pageId) ?? getNodeById(pageId, rootNode))) || activeNodes.at(-1) || null;
    // Keep technical suffixes and numeric page hints out of the tab captions.
    const stripSwfTabSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
    const getSwfTabLabel = (label: string) => stripSwfTabSuffix(parseCatalogTabLabel(label).name);

    const hideCatalogNavigation = useCallback(() => setNavigationHidden(true), [setNavigationHidden]);

    const visibleTabs = rootNode?.children.filter((child) => child.isVisible) ?? [];

    // Search draws into the page already open. The result page is synthetic, so the pane follows the page that stayed open.
    const searchKeepsOpenPane = !!searchResult && currentPage?.pageId === -1;
    const paneLayoutCode = searchKeepsOpenPane ? loadedPage?.layoutCode : currentPage?.layoutCode;
    const sidebarHidden = catalogPageHidesLeftPane(paneLayoutCode);

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
                    // HabboCatalog.linkReceived: catalog/warehouse opens the Builders Club catalogue, at a page when one is named.
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
                        // catalog/open names a page of the normal catalogue.
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

    return (
        <>
            {isVisible && (
                <DraggableWindow uniqueKey="catalog" handleSelector=".los-window__bar" constrainToViewport={true}>
                    <LosWindow
                        className={`los-cat volt-catalog-window${isBuilder ? ' is-builder' : ''}`}
                        icon={isBuilder ? 'hammer' : 'bag'}
                        title={isBusy ? LocalizeText('generic.loading') || 'Loading...' : LocalizeText(isBuilder ? 'builder.catalog.title' : 'catalog.title')}
                        onClose={() => setIsVisible(false)}
                    >
                        {/* The Builders Club catalogue has no tabs. */}
                        {!isBuilder && (
                            <div className="los-tabs los-cat__tabs" role="tablist">
                                {visibleTabs.map((child) => (
                                    <button
                                        key={child.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={child === currentTab}
                                        className={`los-tab${child === currentTab ? ' is-active' : ''}`}
                                        title={child.localization}
                                        onClick={() => {
                                            if (searchResult) setSearchResult(null);
                                            showTab(child);
                                        }}
                                    >
                                        {getSwfTabLabel(child.localization)}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="los-cat__header">
                            {headerImage && <div className="los-cat__header-art" style={{ backgroundImage: `url(${headerImage})` }} />}
                            <div className="los-cat__header-icon">
                                <CatalogIconView icon={isBuilder ? BUILDER_HEADER_ICON : (activeCatalogNode?.iconId ?? rootNode?.iconId ?? 1)} />
                            </div>
                            <div className="los-cat__header-copy">
                                {isBuilder ? (
                                    <CatalogBuilderHeaderView />
                                ) : (
                                    <>
                                        <strong>
                                            {searchResult
                                                ? LocalizeText('catalog.search.header')
                                                : getSwfTabLabel(activeCatalogNode?.localization ?? LocalizeText('catalog.title'))}
                                        </strong>
                                        <p>
                                            {getCatalogPlainText(
                                                searchResult
                                                    ? LocalizeText(
                                                          'catalog.search.results',
                                                          ['count', 'needle'],
                                                          [String(searchResult.offers.length), searchResult.searchValue]
                                                      )
                                                    : getCatalogHeaderDescription(currentPage?.layoutCode, currentPage?.localization)
                                            )}
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="los-cat__purse">
                                <span>
                                    <LayoutCurrencyIcon type={-1} />
                                    {LocalizeShortNumber(purse?.credits ?? 0)}
                                </span>
                                {displayedCurrencies.map((type) => (
                                    <span key={type}>
                                        <LayoutCurrencyIcon type={type} />
                                        {LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className={`los-cat__body${sidebarHidden ? ' is-wide' : ''}`}>
                            {!sidebarHidden && (
                                <div className="los-cat__sidebar">
                                    <CatalogSearchView />
                                    {currentTab && <LosCatalogNav node={currentTab} />}
                                </div>
                            )}
                            <div
                                aria-busy={isBusy}
                                className={`los-cat__page${DARK_RENDERERS.includes(getCatalogLayoutDefinition(currentPage?.layoutCode)?.renderer) ? ' is-dark' : ''}`}
                            >
                                <div className="volt-catalog-layout-shell">
                                    <div className="volt-catalog-layout-container">{GetCatalogLayout(currentPage, hideCatalogNavigation)}</div>
                                </div>
                            </div>
                        </div>
                        {/* Redraws dark page text on a light fill as white text on nothing, for the dark pages. */}
                        <svg aria-hidden="true" className="los-cat__defs" width="0" height="0">
                            <filter id="los-cat-ink" colorInterpolationFilters="sRGB">
                                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.9 -0.9 -0.9 2 0" />
                            </filter>
                        </svg>
                        {(isBusy || catalogLoadError) && <CatalogLoadingStateView error={catalogLoadError} onRetry={retryCurrentPage} />}
                    </LosWindow>
                </DraggableWindow>
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
