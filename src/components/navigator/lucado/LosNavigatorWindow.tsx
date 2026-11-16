import { NavigatorDeleteSavedSearchComposer, NavigatorSavedSearch, NavigatorSearchResultSet, NavigatorTopLevelContext } from '@volt/renderer';
import { CSSProperties, FC, PointerEvent, useEffect, useRef } from 'react';
import { CreateLinkEvent, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../api';
import { DraggableWindow } from '../../../common';
import { LosIcon, LosWindow } from '../../../common/lucadoos';
import { useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../hooks';
import { LosNavigatorCategory } from './LosNavigatorCategory';
import { LosNavigatorSearch } from './LosNavigatorSearch';

interface LosNavigatorWindowProps {
    contexts: NavigatorTopLevelContext[];
    activeCode: string;
    searchResult: NavigatorSearchResultSet | null;
    savedSearches: NavigatorSavedSearch[];
    isFetching: boolean;
    showSaved: boolean;
    position: { x: number; y: number };
    height: number;
}

const MIN_HEIGHT = 420;

const savedSearchLabel = (search: NavigatorSavedSearch) => {
    let code = search.code || '';

    if (code.startsWith('${')) code = code.slice(2, code.length - 1);
    if (code.startsWith('category__')) code = code.slice('category__'.length);

    const title = localizeWithFallback('navigator.searchcode.title.' + code, search.code || code);

    return search.filter ? `${title} - ${search.filter}` : title;
};

const saveBounds = (element: HTMLElement | null) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    useNavigatorUiStore
        .getState()
        .persistWindowSettings({ x: Math.round(rect.left), y: Math.round(rect.top), width: element.offsetWidth, height: element.offsetHeight });
};

/** The Navigator as a LucadoOS window: tabs, search, folding room lists, saved searches and the room actions. */
export const LosNavigatorWindow: FC<LosNavigatorWindowProps> = (props) => {
    const { contexts, activeCode, searchResult, savedSearches, isFetching, showSaved, position, height } = props;
    const frameRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ y: number; height: number } | null>(null);
    const store = useNavigatorUiStore.getState;
    const popup = useNavigatorRoomInfoPopupStore.getState;
    const promotes = searchResult?.code === 'myworld_view' || searchResult?.code === 'roomads_view';

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [searchResult]);

    const act = (action: () => void) => () => {
        popup().hide();
        action();
    };

    const onResizeStart = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { y: event.clientY, height };
    };

    const onResizeMove = (event: PointerEvent<HTMLButtonElement>) => {
        if (!dragRef.current) return;

        useNavigatorUiStore.setState({ windowHeight: Math.max(MIN_HEIGHT, Math.round(dragRef.current.height + event.clientY - dragRef.current.y)) });
    };

    const onResizeEnd = () => {
        if (!dragRef.current) return;

        dragRef.current = null;
        saveBounds(frameRef.current);
    };

    return (
        <DraggableWindow
            uniqueKey="navigator"
            handleSelector=".los-window__bar"
            initialPosition={position}
            constrainToViewport={true}
            onPositionChange={(next) => {
                useNavigatorUiStore.setState({ windowX: next.x, windowY: next.y });
                requestAnimationFrame(() => saveBounds(frameRef.current));
            }}
        >
            <div ref={frameRef}>
                <LosWindow
                    className={`los-navigator${showSaved ? ' has-saved' : ''}`}
                    style={{ '--los-navigator-height': `${Math.max(MIN_HEIGHT, height)}px` } as CSSProperties}
                    icon="compass"
                    title={LocalizeText(isFetching ? 'navigator.title.is.busy' : 'navigator.title')}
                    onClose={() => store().hide()}
                    actions={
                        <>
                            <button
                                type="button"
                                className={`los-window__button${showSaved ? ' is-on' : ''}`}
                                aria-label={localizeWithFallback('navigator.tooltip.left.show.hide', 'Show or hide quick links')}
                                aria-pressed={showSaved}
                                title={localizeWithFallback('navigator.quick.links.title', 'Quick links')}
                                onClick={act(() => {
                                    store().toggleSavesSearches();
                                    requestAnimationFrame(() => saveBounds(frameRef.current));
                                })}
                            >
                                <LosIcon name="bookmark" size={14} />
                            </button>
                            <button
                                type="button"
                                className="los-window__button"
                                aria-label={LocalizeText('generic.help')}
                                onClick={() => CreateLinkEvent('habbopages/navigator')}
                            >
                                <LosIcon name="help" size={15} />
                            </button>
                        </>
                    }
                >
                    <div className="los-tabs" role="tablist">
                        {contexts.map((context) => (
                            <button
                                key={context.code}
                                type="button"
                                role="tab"
                                aria-selected={context.code === activeCode}
                                className={`los-tab${context.code === activeCode ? ' is-active' : ''}`}
                                onClick={act(() => store().setTab(context.code))}
                            >
                                {LocalizeText('navigator.toplevelview.' + context.code)}
                            </button>
                        ))}
                    </div>
                    <LosNavigatorSearch searchResult={searchResult} />
                    <div className="los-navigator__panes">
                        {showSaved && (
                            <nav className="los-navigator__saved los-scroll" aria-label={localizeWithFallback('navigator.quick.links.title', 'Quick links')}>
                                <b>{localizeWithFallback('navigator.quick.links.title', 'Quick links')}</b>
                                {savedSearches.map((search) => (
                                    <div key={search.id} className="los-navigator__saved-row">
                                        <button
                                            type="button"
                                            title={LocalizeText('navigator.tooltip.open.saved.search')}
                                            onClick={() => store().setSearch(search.code, search.filter || '')}
                                        >
                                            {savedSearchLabel(search)}
                                        </button>
                                        <button
                                            type="button"
                                            className="los-icon-button"
                                            aria-label={LocalizeText('navigator.tooltip.remove.saved.search')}
                                            title={LocalizeText('navigator.tooltip.remove.saved.search')}
                                            onClick={() => SendMessageComposer(new NavigatorDeleteSavedSearchComposer(search.id))}
                                        >
                                            <LosIcon name="close" size={12} />
                                        </button>
                                    </div>
                                ))}
                                {savedSearches.length === 0 && (
                                    <p>{localizeWithFallback('navigator.quick.links.empty', 'Save a search with the bookmark on its header.')}</p>
                                )}
                            </nav>
                        )}
                        <div ref={listRef} className={`los-navigator__list los-scroll${isFetching ? ' is-busy' : ''}`}>
                            {searchResult?.results.map((result, index) => (
                                <LosNavigatorCategory
                                    key={result.code || index}
                                    result={result}
                                    parentCode={searchResult.code}
                                    parentFilter={searchResult.data}
                                    forceOpen={searchResult.results.length === 1}
                                />
                            ))}
                            {searchResult && !searchResult.results?.length && (
                                <p className="los-navigator__empty">
                                    {LocalizeText(
                                        searchResult.code === 'myworld_view' ? 'navigator.roomsettings.moderation.none' : 'navigator.search.returned.no.results'
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    <footer className="los-navigator__actions">
                        <button type="button" className="los-button los-button--primary" onClick={act(() => store().openCreator())}>
                            <LosIcon name="plus" size={15} />
                            {localizeWithFallback('navigator.create.room', LocalizeText('navigator.createroom.create'))}
                        </button>
                        {promotes ? (
                            <button type="button" className="los-button" onClick={act(() => CreateLinkEvent('catalog/open/room_ad'))}>
                                <LosIcon name="megaphone" size={15} />
                                {LocalizeText('navigator.promote.room')}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="los-button"
                                onClick={act(() => {
                                    CreateLinkEvent('navigator/goto/random_friending_room');
                                    store().hide();
                                })}
                            >
                                <LosIcon name="dice" size={15} />
                                {LocalizeText('navigator.random.room')}
                            </button>
                        )}
                    </footer>
                    <button
                        type="button"
                        className="los-navigator__resize"
                        aria-label={localizeWithFallback('navigator.resize', 'Resize Navigator')}
                        onPointerDown={onResizeStart}
                        onPointerMove={onResizeMove}
                        onPointerUp={onResizeEnd}
                        onPointerCancel={onResizeEnd}
                        onLostPointerCapture={onResizeEnd}
                    />
                </LosWindow>
            </div>
        </DraggableWindow>
    );
};
