import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, RoomObjectCategory } from '@volt/renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';
import { DispatchUiEvent, GetConfigurationValue, GetRoomSession, GetUserProfile, localizeWithFallback } from '../../api';
import { LayoutItemCountView } from '../../common';
import { LosIcon } from '../../common/lucadoos';
import { GuideToolEvent } from '../../events';
import { useGroupForumUnreadStore } from '../../state/groupForumUnreadStore';

export const ToolbarMeView: FC<
    PropsWithChildren<{
        useGuideTool: boolean;
        setMeExpanded: Dispatch<SetStateAction<boolean>>;
    }>
> = (props) => {
    const { useGuideTool = false, setMeExpanded = null, children = null } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    // MeMenuNewController.unseenForumsCount: the forums item carries the number of the user's forums with unread messages.
    const unreadForumsCount = useGroupForumUnreadStore((state) => state.unreadForumsCount);

    useEffect(() => {
        const roomSession = GetRoomSession();

        if (!roomSession) return;

        GetRoomEngine().selectRoomObject(roomSession.roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT);
    }, []);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (elementRef.current && elementRef.current.contains(event.target as Node)) return;

            setMeExpanded(false);
        };

        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);

        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setMeExpanded]);

    const open = (action: () => void) => {
        setMeExpanded(false);
        action();
    };

    return (
        <div ref={elementRef} className="los-menu">
            {GetConfigurationValue('guides.enabled') && useGuideTool && (
                <button
                    type="button"
                    className="los-menu__item"
                    onClick={() => open(() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL)))}
                >
                    <LosIcon name="help" size={16} />
                    <span>{localizeWithFallback('widget.memenu.guide', 'Helper tool')}</span>
                </button>
            )}
            <button type="button" className="los-menu__item" onClick={() => open(() => GetUserProfile(GetSessionDataManager().userId))}>
                <LosIcon name="user" size={16} />
                <span>{localizeWithFallback('widget.memenu.profile', 'My profile')}</span>
            </button>
            <button type="button" className="los-menu__item" onClick={() => open(() => CreateLinkEvent('navigator/search/myworld_view'))}>
                <LosIcon name="home" size={16} />
                <span>{localizeWithFallback('widget.memenu.myrooms', 'My rooms')}</span>
            </button>
            <button type="button" className="los-menu__item" onClick={() => open(() => CreateLinkEvent('avatar-editor/show'))}>
                <LosIcon name="shirt" size={16} />
                <span>{localizeWithFallback('widget.memenu.editavatar', 'Change looks')}</span>
            </button>
            <button type="button" className="los-menu__item" onClick={() => open(() => CreateLinkEvent('groupforum/list/my'))}>
                <LosIcon name="chat" size={16} />
                <span>{localizeWithFallback('widget.memenu.forums', 'Forums')}</span>
                {unreadForumsCount > 0 && <LayoutItemCountView count={unreadForumsCount} />}
            </button>
            {/* MeMenuNewController (toolbar/memenu/MeMenuNewController.as:29): Collectibles shows only when both hub flags are on. */}
            {GetConfigurationValue('classic.collectibles.hub.enabled') && GetConfigurationValue('collectibles.hub.enabled') && (
                <button type="button" className="los-menu__item" onClick={() => open(() => CreateLinkEvent('collectibles/open'))}>
                    <LosIcon name="grid" size={16} />
                    <span>{localizeWithFallback('memenu.collectibles', 'Collectibles')}</span>
                </button>
            )}
            <button type="button" className="los-menu__item" onClick={() => open(() => CreateLinkEvent('daily-hub/toggle'))}>
                <LosIcon name="gift" size={16} />
                <span>{localizeWithFallback('memenu.dailyhub', 'Daily Hub')}</span>
            </button>
            {children}
        </div>
    );
};
