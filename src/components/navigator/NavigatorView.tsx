import {
    AddLinkEventTracker,
    ConvertGlobalRoomIdMessageComposer,
    ForwardToSomeRoomMessageComposer,
    GetCategoriesWithUserCountMessageComposer,
    HabboWebTools,
    ILinkEventTracker,
    LegacyExternalInterface,
    NavigatorInitComposer,
    NavigatorSettingsEvent,
    RemoveLinkEventTracker,
    RoomSessionEvent
} from '@volt/renderer';
import { FC, useEffect } from 'react';
import { SendMessageComposer, TryVisitRoom } from '../../api';
import { WidgetErrorBoundary } from '../../common';
import {
    useMessageEvent,
    useNavigatorData,
    useNavigatorRoomInfoPopupStore,
    useNavigatorSearch,
    useNavigatorUiState,
    useNavigatorUiStore,
    useVoltEvent
} from '../../hooks';
import { LosNavigatorRoomPopup } from './lucado/LosNavigatorRoomPopup';
import { LosNavigatorWindow } from './lucado/LosNavigatorWindow';
import { NavigatorDoorStateView } from './views/NavigatorDoorStateView';
import { NavigatorRoomCreatorView } from './views/NavigatorRoomCreatorView';
import { NavigatorRoomInfoView } from './views/NavigatorRoomInfoView';
import { NavigatorRoomLinkView } from './views/NavigatorRoomLinkView';
import { NavigatorRoomSettingsView } from './views/room-settings/NavigatorRoomSettingsView';

const SEARCH_LINK_TABS = new Set(['official_view', 'hotel_view', 'roomads_view', 'myworld_view']);

export const NavigatorView: FC<{}> = () => {
    const { topLevelContext, topLevelContexts, navigatorData, navigatorSearches } = useNavigatorData();
    const { searchResult, isFetching } = useNavigatorSearch();
    const { isVisible, isCreatorOpen, isRoomInfoOpen, isRoomLinkOpen, isOpenSavesSearches, needsInit, currentTabCode, windowX, windowY, windowHeight } =
        useNavigatorUiState();
    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, () => {
        useNavigatorUiStore.getState().hide();
        useNavigatorUiStore.getState().closeCreator();
        useNavigatorRoomInfoPopupStore.getState().hide();
    });

    useMessageEvent<NavigatorSettingsEvent>(NavigatorSettingsEvent, (event) => {
        const parser = event.getParser();
        useNavigatorUiStore.getState().applyServerSettings({
            openSearches: parser.leftPanelHidden,
            windowX: parser.windowX,
            windowY: parser.windowY,
            windowHeight: parser.windowHeight
        });
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;
                const store = useNavigatorUiStore.getState();
                switch (parts[1]) {
                    case 'show':
                        store.show();
                        return;
                    case 'hide':
                    case 'close':
                        store.hide();
                        return;
                    case 'toggle':
                        store.toggle();
                        return;
                    case 'toggle-room-info':
                        store.toggleRoomInfo();
                        return;
                    case 'toggle-room-link':
                        store.toggleRoomLink();
                        return;
                    case 'goto': {
                        if (parts.length <= 2) return;
                        const target = parts.slice(2).join('/');
                        if (target === 'home') {
                            if (navigatorData.homeRoomId <= 0) return;
                            TryVisitRoom(navigatorData.homeRoomId);
                            return;
                        }
                        if (target === 'random_friending_room') {
                            SendMessageComposer(new ForwardToSomeRoomMessageComposer('random_friending_room'));
                            return;
                        }
                        const roomId = Number.parseInt(target, 10);
                        if (!Number.isNaN(roomId) && String(roomId) === target) {
                            TryVisitRoom(roomId);
                            return;
                        }
                        SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(target));
                        return;
                    }
                    case 'create':
                        store.openCreator();
                        return;
                    case 'search': {
                        if (parts.length <= 2) return;
                        // AIR links are navigator/search/<filter>; navigator/search/<tab>/<filter> picks the tab too.
                        const hasTab = SEARCH_LINK_TABS.has(parts[2]);
                        store.setSearch(hasTab ? parts[2] : 'hotel_view', parts.slice(hasTab ? 3 : 2).join('/'));
                        store.show();
                        return;
                    }
                    case 'tag':
                        store.setSearch('hotel_view', `tag:${parts.slice(2).join('/')}`);
                        store.show();
                        return;
                    case 'tab':
                        if (parts[2]) store.setTab(parts[2]);
                        store.show();
                        return;
                    case 'me':
                        store.setTab('myworld_view');
                        store.show();
                        return;
                }
            },
            eventUrlPrefix: 'navigator/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [navigatorData.homeRoomId]);

    useEffect(() => {
        if (searchResult) useNavigatorRoomInfoPopupStore.getState().hide();
    }, [searchResult]);

    useEffect(() => {
        if (!needsInit) return;
        SendMessageComposer(new NavigatorInitComposer());
        SendMessageComposer(new GetCategoriesWithUserCountMessageComposer());
        useNavigatorUiStore.getState().markInitDone();
    }, [needsInit]);

    useEffect(() => {
        LegacyExternalInterface.addCallback(HabboWebTools.OPENROOM, (k: string) => SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(k)));
    }, []);

    useEffect(() => {
        useNavigatorUiStore.getState().hydrateAirPreferences();
    }, []);

    useEffect(() => {
        if (!isVisible) useNavigatorRoomInfoPopupStore.getState().hide();
    }, [isVisible]);

    return (
        <>
            {isVisible && topLevelContexts?.length > 0 && (
                <LosNavigatorWindow
                    contexts={topLevelContexts}
                    activeCode={currentTabCode || topLevelContext?.code || ''}
                    searchResult={searchResult}
                    savedSearches={navigatorSearches || []}
                    isFetching={isFetching}
                    showSaved={isOpenSavesSearches}
                    position={{ x: windowX, y: windowY }}
                    height={windowHeight || 560}
                />
            )}
            <WidgetErrorBoundary name="NavigatorRoomCreator">
                <NavigatorRoomCreatorView />
            </WidgetErrorBoundary>
            <LosNavigatorRoomPopup />
            <WidgetErrorBoundary name="NavigatorDoorState">
                <NavigatorDoorStateView />
            </WidgetErrorBoundary>
            {isRoomInfoOpen && (
                <WidgetErrorBoundary name="NavigatorRoomInfo">
                    <NavigatorRoomInfoView onCloseClick={() => useNavigatorUiStore.getState().setRoomInfoOpen(false)} />
                </WidgetErrorBoundary>
            )}
            {isRoomLinkOpen && (
                <WidgetErrorBoundary name="NavigatorRoomLink">
                    <NavigatorRoomLinkView onCloseClick={() => useNavigatorUiStore.getState().setRoomLinkOpen(false)} />
                </WidgetErrorBoundary>
            )}
            <WidgetErrorBoundary name="NavigatorRoomSettings">
                <NavigatorRoomSettingsView />
            </WidgetErrorBoundary>
        </>
    );
};
