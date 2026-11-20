import { CreateLinkEvent, DesktopViewEvent } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import { LosIcon } from '../../../../common/lucadoos';
import { useActiveRoomSessionSnapshot, useMessageEvent, useRoomPromote } from '../../../../hooks';
import { RoomPromoteEditWidgetView } from './views';

// Room controller level 1 (guest rights) can manage the room ad like the owner.
const GUEST_CONTROLLER_LEVEL = 1;

// RoomEventInfoCtrl (iro_event_info_xml): a 195px toolbar extension, 25px contracted or 135px expanded. Its backgrounds and icon are the originals of
// ${image.library.url}Events/ (images.habbo.com/c_images/Events, last modified 2011-08-26), bundled so a hotel without that folder still shows the window.
export const RoomPromotesWidgetView: FC<{}> = () => {
    const [isEditingPromote, setIsEditingPromote] = useState<boolean>(false);
    const [expanded, setExpanded] = useState<boolean>(true);
    const { promoteInformation, setPromoteInformation, setIsExtended } = useRoomPromote();
    const roomSession = useActiveRoomSessionSnapshot();
    const enabled = useMemo(() => GetConfigurationValue<boolean>('eventinfo.enabled', true), []);
    const roomId = roomSession?.roomId ?? -1;

    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, () => setPromoteInformation(null));

    // Leaving a room drops its edit window and shows the next room's window expanded again.
    useEffect(() => {
        setIsEditingPromote(false);
        setExpanded(true);
    }, [roomId]);

    const eventData = promoteInformation?.data && promoteInformation.data.adId !== -1 ? promoteInformation.data : null;

    // The edit window belongs to the event it was opened for.
    useEffect(() => {
        if (!eventData) setIsEditingPromote(false);
    }, [eventData]);

    if (!enabled || !roomSession) return null;

    const hasEvent = !!eventData;
    const isOwner = roomSession.isRoomOwner;
    const canManage = isOwner || roomSession.controllerLevel === GUEST_CONTROLLER_LEVEL;

    if (!hasEvent && !canManage) return null;

    // RoomEventInfoCtrl.canExtend: with a total-time limit, an extension must still end inside the maximum.
    const canExtend = (() => {
        if (!eventData) return false;
        if (!GetConfigurationValue<boolean>('roomad.limit_total_time', false)) return true;

        const extension = GetConfigurationValue<number>('room_ad.duration.minutes', 120) * 60 * 1000;
        const maximum = GetConfigurationValue<number>('room_ad.maximum_total_time.minutes', 10080) * 60 * 1000;

        return eventData.expirationDate.getTime() + extension < Date.now() + maximum;
    })();

    const isExpanded = expanded && hasEvent;
    const showModify = isExpanded && canManage;
    const showInProgress = isExpanded && !canManage;

    const onBackgroundClick = () => {
        if (hasEvent) setExpanded((value) => !value);
        else CreateLinkEvent('catalog/open/room_ad');
    };

    const extend = () => {
        setIsExtended(true);
        CreateLinkEvent('catalog/open/room_ad');
    };

    return (
        <>
            <div className={`los-event${isExpanded ? ' is-expanded' : ''}`}>
                <button type="button" className="los-event__head" onClick={onBackgroundClick}>
                    <LosIcon name="megaphone" size={14} />
                    <span>{hasEvent ? eventData.eventName : LocalizeText('roomad.get.event')}</span>
                    {hasEvent && <LosIcon name="chevron" size={12} />}
                </button>
                {isExpanded && (
                    <div className="los-event__body">
                        <p>{eventData.eventDescription}</p>
                        {showInProgress && <b>{LocalizeText('navigator.eventinprogress')}</b>}
                        {showModify && (
                            <div className="los-event__actions">
                                <button type="button" className="los-button" onClick={() => setIsEditingPromote(true)}>
                                    {LocalizeText('navigator.roominfo.editevent')}
                                </button>
                                {canExtend && (
                                    <button type="button" className="los-button" onClick={extend}>
                                        {LocalizeText('roomad.extend.event')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Keyed by the event: when another event replaces this one the window starts over from the new event instead of saving the old draft into it. */}
            {isEditingPromote && hasEvent && (
                <RoomPromoteEditWidgetView
                    key={eventData.adId}
                    eventDescription={eventData.eventDescription}
                    eventId={eventData.adId}
                    eventName={eventData.eventName}
                    onClose={() => setIsEditingPromote(false)}
                />
            )}
        </>
    );
};
