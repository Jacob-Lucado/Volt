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
