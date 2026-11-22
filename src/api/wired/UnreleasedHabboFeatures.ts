/**
 * Plus codes, enums and text keys for Habbo features that are teased but not shipped in any Habbo client yet.
 * Replace each value with Habbo's real one once Habbo ships the feature; nothing else holds them.
 * The packet ids are in the renderer's `UnreleasedHabboHeaders`.
 */

/** The answer of `GroupInvitationReplyComposer`. */
export const GroupInvitationAnswer = {
    ACCEPT: 0,
    REJECT: 1,
    DECIDE_LATER: 2
} as const;

/** Where "Do not show again during this session" hides further group invitations. */
export const GroupInvitationMuteScope = {
    ROOM: 0,
    ALL_ROOMS: 1
} as const;

export const GroupInvitationText = {
    TITLE: ['group.invitation.title', 'Group invitation'],
    QUESTION: ['group.invitation.question', 'Would you like to join this group?'],
    ACCEPT: ['group.invitation.accept', 'Accept'],
    REJECT: ['group.invitation.reject', 'Reject'],
    LATER: ['group.invitation.later', 'Decide later'],
    DONT_SHOW: ['group.invitation.dont_show', 'Do not show again during this session'],
    SCOPE_ROOM: ['group.invitation.scope.room', 'In this room'],
    SCOPE_ALL: ['group.invitation.scope.all', 'In all rooms']
} as const;

/** Wired codes per family (the code the server sends with the editor data). */
export const UnreleasedWiredCode = {
    ACTION_INVITE_TO_GROUP: 9000,
    ACTION_REMOVE_FROM_GROUP: 9001,
    TRIGGER_GROUP_MEMBERSHIP: 9000
} as const;

/** `wf_trg_group_membership` int 0. */
export const WiredGroupMembershipMode = {
    ROOM_GROUP: 0,
    PICKED_GROUP: 1
} as const;

/** `wf_trg_group_membership` int 2. */
export const WiredGroupMembershipChange = {
    JOINS: 0,
    LEAVES: 1
} as const;

export const UnreleasedWiredText = {
    GROUPS_YOU_OWN: 'wiredfurni.params.plus.groups_you_own',
    CANCEL_GROUP_INVITATION: 'wiredfurni.params.plus.cancel_group_invitation',
    CHOOSE_GROUP: 'wiredfurni.params.plus.choose_group',
    CURRENT_GROUP: 'wiredfurni.params.plus.current_group',
    SELECT_FROM_LIST: 'wiredfurni.params.plus.select_from_list',
    TRIGGER_WHEN_USER: 'wiredfurni.params.plus.trigger_when_user',
    JOINS_GROUP: 'wiredfurni.params.plus.joins_group',
    LEAVES_GROUP: 'wiredfurni.params.plus.leaves_group'
} as const;

/**
 * The borrowed furni have placeholder names, so these boxes take their editor title from these keys.
 * Keyed by the `wiredType` of `WiredBaseView` and the wired code.
 */
const UNRELEASED_WIRED_TITLES: Record<string, Record<number, string>> = {
    action: {
        [UnreleasedWiredCode.ACTION_INVITE_TO_GROUP]: 'wiredfurni.plus.title.invite_to_group',
        [UnreleasedWiredCode.ACTION_REMOVE_FROM_GROUP]: 'wiredfurni.plus.title.remove_from_group'
    },
    trigger: {
        [UnreleasedWiredCode.TRIGGER_GROUP_MEMBERSHIP]: 'wiredfurni.plus.title.group_membership'
    }
};

export const unreleasedWiredTitleKey = (wiredType: string, code: number | undefined): string | null =>
    (code === undefined ? null : UNRELEASED_WIRED_TITLES[wiredType]?.[code] ?? null);
