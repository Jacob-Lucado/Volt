import { GetSessionDataManager, RoomSettingsComposer, UpdateHomeRoomMessageComposer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { FriendlyTime, GetConfigurationValue, GetGroupInformation, GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../api';
import { LayoutBadgeImageView, LayoutRoomThumbnailView } from '../../../common';
import { LosIcon } from '../../../common/lucadoos';
import { useHelp, useNavigatorData, useNavigatorFavourite, useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../hooks';

const tradeModeText = (tradeMode: number) =>
    LocalizeText(tradeMode === 1 ? 'trading.mode.controller' : tradeMode === 2 ? 'trading.mode.free' : 'trading.mode.not.allowed');

/** The card that opens beside a room in the Navigator: its picture, owner, details, tags and quick actions. */
export const LosNavigatorRoomPopup: FC<{}> = () => {
    const room = useNavigatorRoomInfoPopupStore((state) => state.room);
    const visible = useNavigatorRoomInfoPopupStore((state) => state.visible);
    const x = useNavigatorRoomInfoPopupStore((state) => state.x);
    const y = useNavigatorRoomInfoPopupStore((state) => state.y);
    const { navigatorData } = useNavigatorData();
    const { isFavourite, toggle: toggleFavourite } = useNavigatorFavourite(room?.roomId ?? 0);
    const { report = null } = useHelp();
    const [homeOverride, setHomeOverride] = useState(0);

    useEffect(() => {
        setHomeOverride(0);
    }, [room?.roomId, visible]);

    if (!visible || !room) return null;

    const popup = useNavigatorRoomInfoPopupStore.getState;
    const hasGroup = room.groupBadgeCode?.length > 0;
    const isOwner = GetSessionDataManager().userName === room.ownerName;
    const isHome = homeOverride === room.roomId || navigatorData?.homeRoomId === room.roomId;
    const canReport = GetConfigurationValue<boolean>('room.report.enabled', false) && !isOwner;

    const andClose = (action: () => void) => () => {
        action();
        popup().hide();
    };

    return (
        <div
            role="dialog"
            aria-label={LocalizeText('navigator.room.info.popup.title')}
            className="los-window los-room-popup"
            style={{ left: x, top: y }}
            onMouseEnter={() => popup().setHovered(true)}
            onMouseLeave={() => popup().setHovered(false)}
            onClick={(event) => event.stopPropagation()}
        >
            <div className="los-room-popup__top">
                <LayoutRoomThumbnailView className="los-room-popup__thumb" customUrl={room.officialRoomPicRef} roomId={room.roomId}>
                    {hasGroup && <LayoutBadgeImageView badgeCode={room.groupBadgeCode} className="los-room-popup__badge" isGroup={true} />}
                </LayoutRoomThumbnailView>
                <div className="los-room-popup__copy">
                    <b>{room.roomName}</b>
                    <p>{room.description}</p>
                    {room.showOwner && (
                        <button type="button" className="los-room-popup__link" onClick={andClose(() => GetUserProfile(room.ownerId))}>
                            <LosIcon name="user" size={13} />
                            {room.ownerName}
                        </button>
                    )}
                    {hasGroup && (
                        <button type="button" className="los-room-popup__link" onClick={andClose(() => GetGroupInformation(room.habboGroupId))}>
                            <LosIcon name="group" size={13} />
                            {room.groupName}
                        </button>
                    )}
                </div>
            </div>
            <dl className="los-room-popup__facts">
                <dt>{LocalizeText('navigator.roompopup.property.trading')}</dt>
                <dd>{tradeModeText(room.tradeMode)}</dd>
                {GetConfigurationValue<boolean>('room.ranking.enabled', false) && (
                    <>
                        <dt>{LocalizeText('navigator.roompopup.property.ranking')}</dt>
                        <dd>{room.ranking}</dd>
                    </>
                )}
                <dt>{LocalizeText('navigator.roompopup.property.max_users')}</dt>
                <dd>{room.maxUserCount}</dd>
            </dl>
            {room.tags?.length > 0 && (
                <div className="los-room-popup__tags">
                    {room.tags.map((tag) => (
                        <button key={tag} type="button" onClick={andClose(() => useNavigatorUiStore.getState().setSearch('hotel_view', `tag:${tag}`))}>
                            #{tag}
                        </button>
                    ))}
                </div>
            )}
            {room.roomAdExpiresInMin > 0 && (
                <div className="los-room-popup__event">
                    <LosIcon name="megaphone" size={15} />
                    <div>
                        <b>{room.roomAdName}</b>
                        <p>{room.roomAdDescription}</p>
                        <small>
                            {LocalizeText('roomad.event.expiration_time')} {FriendlyTime.format(room.roomAdExpiresInMin * 60)}
                        </small>
                    </div>
                </div>
            )}
            <div className="los-room-popup__actions">
                <button type="button" className={`los-button${isFavourite ? ' is-on' : ''}`} aria-pressed={isFavourite} onClick={() => toggleFavourite()}>
                    <LosIcon name="heart" size={14} />
                    {LocalizeText('navigator.room.popup.room.info.favorite')}
                </button>
                <button
                    type="button"
                    className={`los-button${isHome ? ' is-on' : ''}`}
                    aria-pressed={isHome}
                    onClick={() => {
                        if (isHome) return;

                        SendMessageComposer(new UpdateHomeRoomMessageComposer(room.roomId));
                        setHomeOverride(room.roomId);
                    }}
                >
                    <LosIcon name="home" size={14} />
                    {LocalizeText('navigator.room.popup.room.info.home')}
                </button>
                {isOwner && (
                    <button type="button" className="los-button" onClick={andClose(() => SendMessageComposer(new RoomSettingsComposer(room.roomId)))}>
                        <LosIcon name="gear" size={14} />
                        {LocalizeText('navigator.room.popup.info.room.settings')}
                    </button>
                )}
                {canReport && (
                    <button
                        type="button"
                        className="los-button"
                        onClick={andClose(() => report?.(ReportType.ROOM, { roomId: room.roomId, roomName: room.roomName }))}
                    >
                        <LosIcon name="flag" size={14} />
                        {LocalizeText('navigator.room.popup.report.room')}
                    </button>
                )}
            </div>
        </div>
    );
};
