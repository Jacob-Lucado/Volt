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
    TRIGGER_GROUP_MEMBERSHIP: 9000,
    TRIGGER_CLICK_CONTEXT_MENU: 9001,
    ADDON_CONTEXT_MENU_ITEM: 9000
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
    LEAVES_GROUP: 'wiredfurni.params.plus.leaves_group',
    BUTTON_ID: 'wiredfurni.params.plus.button_id',
    BUTTON_TEXT: 'wiredfurni.params.plus.button_text',
    USER_RESTRICTIONS: 'wiredfurni.params.plus.user_restrictions',
    RESTRICTION_USER: 'wiredfurni.params.plus.restriction.user',
    RESTRICTION_PET: 'wiredfurni.params.plus.restriction.pet',
    RESTRICTION_BOT: 'wiredfurni.params.plus.restriction.bot',
    /** Followed by the `WiredContextMenuUserScope` value. */
    USER_SCOPE: 'wiredfurni.params.plus.user_scope.',
    /** Followed by the `WiredContextMenuPetScope` value. */
    PET_SCOPE: 'wiredfurni.params.plus.pet_scope.',
    VISIBILITY_CONDITION: 'wiredfurni.params.plus.visibility_condition',
    ENABLE_CONDITION: 'wiredfurni.params.plus.enable_condition',
    ALL_CONDITIONS_MUST_MATCH: 'wiredfurni.params.plus.all_conditions_must_match',
    ADD_CONDITION: 'wiredfurni.params.plus.add_condition',
    CONDITION_COUNT: 'wiredfurni.params.plus.condition_count',
    CONDITION_EXISTS: 'wiredfurni.params.plus.condition.exists',
    CONDITION_NOT_EXISTS: 'wiredfurni.params.plus.condition.not_exists',
    TARGET_USERS: 'wiredfurni.params.plus.target.users',
    TARGET_FURNI: 'wiredfurni.params.plus.target.furni'
} as const;

/** The target type of `GetWiredContextMenuComposer`; the target id of a room unit is its room index. */
export const WiredContextMenuTargetType = {
    ROOM_UNIT: 0,
    FLOOR_FURNI: 1
} as const;

/** What a context menu box works on. Only users exist so far; furni is reserved. */
export const WiredContextMenuTarget = {
    USERS: 0,
    FURNI: 1
} as const;

export const WiredContextMenuUserScope = {
    EVERYONE: 0,
    EVERYONE_EXCEPT_ME: 1,
    ONLY_ME: 2
} as const;

export const WiredContextMenuPetScope = {
    ALL_PETS: 0,
    MY_PETS: 1
} as const;

/** 0-5 are Habbo's wired comparators; 6 and 7 are Plus. */
export const WiredContextMenuOperator = {
    LESS: 0,
    EQUAL: 1,
    GREATER: 2,
    LESS_EQUAL: 3,
    NOT_EQUAL: 4,
    GREATER_EQUAL: 5,
    EXISTS: 6,
    NOT_EXISTS: 7
} as const;

export const WiredContextMenuLimits = {
    BUTTON_ID_LENGTH: 32,
    BUTTON_TEXT_LENGTH: 64,
    CONDITIONS: 3
} as const;

/** A button id holds only A-Z, a-z, 0-9 and _. */
export const sanitizeWiredContextMenuButtonId = (value: string) => value.replace(/[^A-Za-z0-9_]/g, '').slice(0, WiredContextMenuLimits.BUTTON_ID_LENGTH);

/** A button text has no tab or line break. */
export const sanitizeWiredContextMenuButtonText = (value: string) => value.replace(/[\t\r\n]/g, '').slice(0, WiredContextMenuLimits.BUTTON_TEXT_LENGTH);

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
        [UnreleasedWiredCode.TRIGGER_GROUP_MEMBERSHIP]: 'wiredfurni.plus.title.group_membership',
        [UnreleasedWiredCode.TRIGGER_CLICK_CONTEXT_MENU]: 'wiredfurni.plus.title.click_context_menu'
    },
    extra: {
        [UnreleasedWiredCode.ADDON_CONTEXT_MENU_ITEM]: 'wiredfurni.plus.title.context_menu_item'
    }
};

export const unreleasedWiredTitleKey = (wiredType: string, code: number | undefined): string | null =>
    (code === undefined ? null : UNRELEASED_WIRED_TITLES[wiredType]?.[code] ?? null);

const unreleasedOfferTitles = new Map([
    ['wf_act_invite_to_group', UNRELEASED_WIRED_TITLES.action[UnreleasedWiredCode.ACTION_INVITE_TO_GROUP]],
    ['wf_act_remove_from_group', UNRELEASED_WIRED_TITLES.action[UnreleasedWiredCode.ACTION_REMOVE_FROM_GROUP]],
    ['wf_trg_group_membership', UNRELEASED_WIRED_TITLES.trigger[UnreleasedWiredCode.TRIGGER_GROUP_MEMBERSHIP]],
    ['wf_trg_click_context_menu', UNRELEASED_WIRED_TITLES.trigger[UnreleasedWiredCode.TRIGGER_CLICK_CONTEXT_MENU]],
    ['wf_xtra_context_menu_item', UNRELEASED_WIRED_TITLES.extra[UnreleasedWiredCode.ADDON_CONTEXT_MENU_ITEM]]
]);

export const unreleasedOfferTitleKey = (offerKey: string) => unreleasedOfferTitles.get(offerKey);

const conditionOffset = 8;

export const WiredContextMenuLayout = {
    visibilityOffset: conditionOffset,
    enableOffset: conditionOffset + 2 * WiredContextMenuLimits.CONDITIONS,
    defaults: [
        WiredContextMenuTarget.USERS, 1, WiredContextMenuUserScope.EVERYONE_EXCEPT_ME, 0, WiredContextMenuPetScope.ALL_PETS, 0, 0, 0,
        ...Array.from({ length: 2 * WiredContextMenuLimits.CONDITIONS }, () => [WiredContextMenuOperator.EXISTS, 0]).flat()
    ]
} as const;
