import { GroupInvitationEvent, GroupInvitationReplyComposer } from '@volt/renderer';
import { FC, useState } from 'react';
import { GetRoomSession, GroupInvitationAnswer, GroupInvitationMuteScope, GroupInvitationText, localizeWithFallback, SendMessageComposer } from '../../../api';
import { LayoutBadgeImageView, VoltCardHeaderView, VoltCardView } from '../../../common';
import { HabboDropMenuView } from '../../../common/dropmenu/HabboDropMenuView';
import { useMessageEvent } from '../../../hooks';

interface GroupInvitation {
    groupId: number;
    groupName: string;
    badgeCode: string;
    roomId: number;
}

// "Do not show again during this session" lasts until the client reloads.
const mutedRooms = new Set<number>();
let mutedEverywhere = false;

const isMuted = (roomId: number) => mutedEverywhere || mutedRooms.has(roomId);

const invitationRoomId = (parserRoomId: number) => parserRoomId || GetRoomSession()?.roomId || 0;

export const GroupInvitationView: FC<{}> = () => {
    const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
    const [dontShow, setDontShow] = useState(false);
    const [muteScope, setMuteScope] = useState<number>(GroupInvitationMuteScope.ROOM);

    useMessageEvent<GroupInvitationEvent>(GroupInvitationEvent, (event) => {
        const parser = event.getParser();
        const invitation: GroupInvitation = {
            groupId: parser.groupId,
            groupName: parser.groupName,
            badgeCode: parser.badgeCode,
            roomId: invitationRoomId(parser.roomId)
        };

        // A muted invitation counts as "Decide later": the server already keeps it, so nothing is sent.
        if (isMuted(invitation.roomId)) return;

        setInvitations((current) => [...current.filter((entry) => entry.groupId !== invitation.groupId), invitation]);
    });

    const invitation = invitations[0] ?? null;

    if (!invitation) return null;

    const answer = (value: number) => {
        SendMessageComposer(new GroupInvitationReplyComposer(invitation.groupId, value));

        if (dontShow) {
            if (muteScope === GroupInvitationMuteScope.ALL_ROOMS) mutedEverywhere = true;
            else mutedRooms.add(invitation.roomId);
        }

        setInvitations((current) => current.filter((entry) => entry.groupId !== invitation.groupId && !isMuted(entry.roomId)));
        setDontShow(false);
        setMuteScope(GroupInvitationMuteScope.ROOM);
    };

    return (
        <VoltCardView className="volt-group-invitation" isResizable={false} uniqueKey="group-invitation">
            <VoltCardHeaderView headerText={localizeWithFallback(...GroupInvitationText.TITLE)} onCloseClick={() => answer(GroupInvitationAnswer.DECIDE_LATER)} />
            <div className="volt-group-invitation__content">
                <div className="volt-group-invitation__panel">
                    <div className="volt-group-invitation__badge">
                        <LayoutBadgeImageView badgeCode={invitation.badgeCode} isGroup showInfo={false} />
                    </div>
                    <div className="volt-group-invitation__copy">
                        <span className="volt-group-invitation__question">{localizeWithFallback(...GroupInvitationText.QUESTION)}</span>
                        <span className="volt-group-invitation__name">{invitation.groupName}</span>
                    </div>
                </div>
                <div className="volt-group-invitation__buttons">
                    <button className="volt-group-invitation__button volt-group-invitation__button--accept" type="button" onClick={() => answer(GroupInvitationAnswer.ACCEPT)}>
                        {localizeWithFallback(...GroupInvitationText.ACCEPT)}
                    </button>
                    <button className="volt-group-invitation__button" type="button" onClick={() => answer(GroupInvitationAnswer.REJECT)}>
                        {localizeWithFallback(...GroupInvitationText.REJECT)}
                    </button>
                    <button className="volt-group-invitation__button volt-group-invitation__button--later" type="button" onClick={() => answer(GroupInvitationAnswer.DECIDE_LATER)}>
                        {localizeWithFallback(...GroupInvitationText.LATER)}
                    </button>
                </div>
                <div className="volt-group-invitation__divider" />
                <div className="volt-group-invitation__footer">
                    <label className="volt-group-invitation__dont-show">
                        <input checked={dontShow} type="checkbox" onChange={(event) => setDontShow(event.target.checked)} />
                        <span>{localizeWithFallback(...GroupInvitationText.DONT_SHOW)}</span>
                    </label>
                    <HabboDropMenuView
                        className="volt-group-invitation__scope"
                        disabled={!dontShow}
                        label={localizeWithFallback(...GroupInvitationText.DONT_SHOW)}
                        options={[
                            { value: GroupInvitationMuteScope.ROOM, label: localizeWithFallback(...GroupInvitationText.SCOPE_ROOM) },
                            { value: GroupInvitationMuteScope.ALL_ROOMS, label: localizeWithFallback(...GroupInvitationText.SCOPE_ALL) }
                        ]}
                        value={muteScope}
                        onSelect={(value) => setMuteScope(Number(value))}
                    />
                </div>
            </div>
        </VoltCardView>
    );
};
