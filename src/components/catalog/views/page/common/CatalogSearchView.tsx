import { GetSessionDataManager, IFurnitureData } from '@volt/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
    CatalogPage,
    FurnitureOffer,
    GetProductDataForLocalization,
    IPurchasableOffer,
    LocalizeText,
    localizeWithFallback,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { LosIcon } from '../../../../../common/lucadoos';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { useCatalogStore } from '../../../../../hooks/catalog/catalogStore';
import { getNodesByOfferIdFromMap } from '../../../../../hooks/catalog/useCatalog.helpers';
import { readCatalogIndex } from '../../../../../hooks/catalog/useCatalogQueries';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    filterCatalogSearchNodes,
    findCatalogSearchMatches,
    isCatalogSearchEnterKey,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';

/** HabboCatalog.ensureSearchEntries: a furni is found by its name and by its product data name. */
const getSearchTerms = (furniture: IFurnitureData): string[] => [
    furniture.name,
    (GetProductDataForLocalization(furniture.fullName) ?? GetProductDataForLocalization(furniture.className))?.name
];

export const CatalogSearchView: FC<{}> = () => {
    const [searchValue, setSearchValue] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const { rootNode = null } = useCatalogData();
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentType = null, previousPageId = -1, setSearchResult = null, setCurrentPage = null } = useCatalogUiState();
    const { openPageById = null } = useCatalogActions();

    // HabboCatalog.performSearch (HabboCatalog.as:1901-1968): the results page, and the navigator filtered to the pages
    // that sell a match or whose name holds the text.
    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !search.length) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const index = readCatalogIndex(currentType);
            const nodesByOfferId = (offerId: number) => getNodesByOfferIdFromMap(offerId, index?.offersToNodes, true);
            const matches = findCatalogSearchMatches(furnitureDatas, search, currentType, nodesByOfferId, getSearchTerms);
            const offers: IPurchasableOffer[] = matches.offers.map((match) => new FurnitureOffer(match.furniture, match.offerId, match.isRent));

            useCatalogStore.setState({ activeNodes: [], openNodes: [] });
            setSearchResult(new SearchResult(search, offers, filterCatalogSearchNodes(search, matches.furniLines, matches.pageIds, rootNode)));
            setCurrentPage(
                new CatalogPage(
                    -1,
                    'default_3x3',
                    new PageLocalization(
                        ['catalog_header_roombuilder', 'credits_v3_teaser'],
                        [LocalizeText('catalog.search.results', ['count', 'needle'], [String(offers.length), search])]
                    ),
                    offers,
                    false,
                    1,
                    currentType
                )
            );
        },
        [currentType, rootNode, setCurrentPage, setSearchResult]
    );

    // HabboCatalog.onClearSearch: an empty field goes back to the page that was open before the search.
    const endSearch = useCallback(() => {
        setSearchResult(null);
        setCurrentPage(null);

        if (previousPageId > 0) openPageById(previousPageId);
    }, [openPageById, previousPageId, setCurrentPage, setSearchResult]);

    const scheduleSearch = useCallback(
        (value: string, immediate = false) => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);

            if (!value.length) {
                endSearch();

                return;
            }

            if (immediate) {
                runSearch(value);

                return;
            }

            if (!shouldRunCatalogSearch(value)) return;

            searchTimeout.current = setTimeout(() => runSearch(value), CATALOG_SEARCH_DEBOUNCE_MS);
        },
        [endSearch, runSearch]
    );

    const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearchValue(value);
        scheduleSearch(value);
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isCatalogSearchEnterKey(event.key, searchValue)) return;

        event.preventDefault();
        scheduleSearch(searchValue, true);
    };

    const clearSearch = () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setSearchValue('');
        endSearch();
        inputRef.current?.focus();
    };

    useEffect(() => {
        if (searchValue) scheduleSearch(searchValue);
    }, [currentType, rootNode]);

    useEffect(() => () => searchTimeout.current && clearTimeout(searchTimeout.current), []);

    const hasQuery = searchValue.length > 0;

    return (
        <div className="los-cat__search">
            <LosIcon name="search" size={14} />
            <input
                ref={inputRef}
                aria-label={LocalizeText('catalog.search')}
                className="los-input"
                placeholder={LocalizeText('catalog.search')}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            {hasQuery && (
                <button aria-label={localizeWithFallback('generic.clear', 'Clear')} className="los-cat__search-clear" type="button" onClick={clearSearch}>
                    <LosIcon name="close" size={12} />
                </button>
            )}
        </div>
    );
};
