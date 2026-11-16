import { NavigatorSearchResultList, NavigatorSearchSaveComposer, PerkEnum } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText, localizeWithFallback, NavigatorSearchResultViewDisplayMode, SendMessageComposer } from '../../../api';
import { LosIcon } from '../../../common/lucadoos';
import { useNavigatorUiStore } from '../../../hooks';
import { usePerkAllowed } from '../../../state/perkAllowancesStore';
import { LosNavigatorRoom } from './LosNavigatorRoom';

interface LosNavigatorCategoryProps {
    result: NavigatorSearchResultList;
    parentCode: string;
    parentFilter: string;
    forceOpen: boolean;
}

const isEventView = (code: string) => code === 'roomads_view' || code === 'new_ads' || code.startsWith('eventcategory__');

const categoryTitle = (result: NavigatorSearchResultList) => {
    if (result.data) return result.data;
    if (!result.code) return '';
    if (result.code.startsWith('${')) return result.code.slice(2, result.code.length - 1);

    return localizeWithFallback('navigator.searchcode.title.' + result.code, result.code);
};

/** One block of rooms: a header that folds it, with the list or tile switch, "more" and "save search". */
export const LosNavigatorCategory: FC<LosNavigatorCategoryProps> = ({ result, parentCode, parentFilter, forceOpen }) => {
    const isOpen = useNavigatorUiStore((state) => {
        if (state.collapsedResultCodes.includes(result.code)) return false;

        return forceOpen || state.expandedResultCodes.includes(result.code) || !result.closed;
    });
    const canPickMode = usePerkAllowed(PerkEnum.NAVIGATOR_ROOM_THUMBNAIL_CAMERA);
    const pickedMode = useNavigatorUiStore((state) => state.resultViewModes[result.code] ?? result.mode);
    // Without the thumbnail perk only the official tab keeps the mode the server sent.
    const mode = canPickMode ? pickedMode : parentCode === 'official_view' ? result.mode : NavigatorSearchResultViewDisplayMode.LIST;
    const tiles = mode >= NavigatorSearchResultViewDisplayMode.THUMBNAILS;
    const title = categoryTitle(result);
    const store = useNavigatorUiStore.getState;

    return (
        <section className={`los-nav-category${isOpen ? '' : ' is-closed'}`}>
            <header className="los-nav-category__header">
                <button
                    type="button"
                    className="los-nav-category__toggle"
                    aria-expanded={isOpen}
                    onClick={() => store().setResultCollapsed(result.code, isOpen)}
                >
                    <LosIcon name="chevron" size={14} />
                    <span>{title}</span>
                    <small>{result.rooms.length}</small>
                </button>
                {isOpen && canPickMode && (
                    <button
                        type="button"
                        className="los-icon-button"
                        title={
                            tiles
                                ? localizeWithFallback('navigator.viewmode.list', 'Show rooms as a list')
                                : localizeWithFallback('navigator.viewmode.tiles', 'Show rooms as tiles')
                        }
                        onClick={() =>
                            store().setResultViewMode(
                                result.code,
                                tiles ? NavigatorSearchResultViewDisplayMode.LIST : NavigatorSearchResultViewDisplayMode.THUMBNAILS
                            )
                        }
                    >
                        <LosIcon name={tiles ? 'list' : 'grid'} size={14} />
                    </button>
                )}
                {result.action === 1 && (
                    <button
                        type="button"
                        className="los-icon-button"
                        title={LocalizeText('navigator.more.rooms')}
                        onClick={() => store().setSearch(result.code, parentFilter)}
                    >
                        <LosIcon name="more" size={14} />
                    </button>
                )}
                {isOpen && result.action === 2 && (
                    <button type="button" className="los-icon-button" title={LocalizeText('navigator.back')} onClick={() => store().goBack()}>
                        <LosIcon name="back" size={14} />
                    </button>
                )}
                {!parentCode.includes('official_view') && (
                    <button
                        type="button"
                        className="los-icon-button"
                        title={LocalizeText('navigator.tooltip.add.saved.search')}
                        onClick={() => SendMessageComposer(new NavigatorSearchSaveComposer(result.code, parentFilter))}
                    >
                        <LosIcon name="bookmark" size={14} />
                    </button>
                )}
            </header>
            {isOpen && (
                <div className={tiles ? 'los-nav-category__tiles' : 'los-nav-category__rows'}>
                    {result.rooms.map((room, index) => (
                        <LosNavigatorRoom
                            key={room.roomId || index}
                            room={room}
                            tile={tiles}
                            eventTitle={isEventView(result.code) || isEventView(parentCode)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};
