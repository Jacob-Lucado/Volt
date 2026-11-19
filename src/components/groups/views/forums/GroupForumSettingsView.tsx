import { ExtendedForumData, UpdateForumSettingsMessageComposer } from '@volt/renderer';
import { FC, useRef, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_HEADER, ForumButton, ForumFrame } from './GroupForumLayout';

// Permission levels: 0 everybody, 1 group members, 2 group administrators, 3 the owner.
const OPTION_KEYS = [
    'groupforum.permissions.option_all',
    'groupforum.permissions.option_group_members',
    'groupforum.permissions.option_group_admins',
    'groupforum.permissions.option_owner'
];

interface Section {
    labelKey: string;
    y: number;
    levels: number[];
}

// groupforum_forum_settings: four sections at client y 100, 190, 300 and 410; each radio row is 20px high.
const SECTIONS: Section[] = [
    { labelKey: 'groupforum.permissions.read_label', y: 100, levels: [0, 1, 2] },
    { labelKey: 'groupforum.permissions.post_message_label', y: 190, levels: [0, 1, 2, 3] },
    { labelKey: 'groupforum.permissions.post_thread_label', y: 300, levels: [0, 1, 2, 3] },
    { labelKey: 'groupforum.permissions.moderate_label', y: 410, levels: [2, 3] }
];

/**
 * ForumSettingsView.setSelectorState: posting can not be open to more people than reading, and starting threads not to more
 * than posting, so each choice is raised to at least the level chosen above it. Moderating is for administrators at least.
 */
const limitLevels = ([read, postMessage, postThread, moderate]: number[]): number[] => {
    const limitedPostMessage = Math.max(read, postMessage);

    return [read, limitedPostMessage, Math.max(limitedPostMessage, postThread), Math.max(2, moderate)];
};

/** The lowest level each section can take; the options below it are disabled at half alpha. */
const minimumLevels = (levels: number[]): number[] => [0, levels[0], levels[1], 2];

interface GroupForumSettingsViewProps {
    forumData: ExtendedForumData;
    groupId: number;
    /** The newest forum data of the group, read when OK is pressed. */
    readForumData: () => ExtendedForumData | null;
    initialPosition: { x: number; y: number };
    onClose: () => void;
}

export const GroupForumSettingsView: FC<GroupForumSettingsViewProps> = ({ forumData, groupId, readForumData, initialPosition, onClose }) => {
    const [levels, setLevels] = useState<number[]>(() =>
        limitLevels([forumData.readPermissions, forumData.postMessagePermissions, forumData.postThreadPermissions, forumData.moderatePermissions])
    );
    const minimum = minimumLevels(levels);

    // Two presses before the window closes still send one update.
    const saved = useRef<boolean>(false);

    const save = () => {
        const live = readForumData();

        // The right to change the settings is checked at the moment of sending: it can have been taken away while the window was open.
        if (saved.current || !live || live.groupId !== groupId || !live.canChangeSettings) {
            if (!saved.current) onClose();

            return;
        }

        saved.current = true;
        SendMessageComposer(new UpdateForumSettingsMessageComposer(groupId, levels[0], levels[1], levels[2], levels[3]));
        onClose();
    };

    return (
        <ForumFrame
            className="volt-group-forum-settings"
            height={545}
            initialPosition={initialPosition}
            isResizable={true}
            minHeight={455}
            resizeAxis="vertical"
            title={LocalizeText('groupforum.settings.window_title')}
            width={350}
            onClose={onClose}
            onHelp={() => CreateLinkEvent('habbopages/forums')}
        >
            <div className="volt-forum__header" style={{ width: 348 }}>
                <div className="volt-forum__header-icon">
                    <div className="volt-forum__header-badge">
                        <LayoutBadgeImageView badgeCode={forumData.icon} isGroup={true} />
                    </div>
                </div>
                <GroupText background={FORUM_HEADER} height={30} overrides={{ size: 24, color: 0xffffff }} text={forumData.name} textStyle="u_headline_big" width={255} x={90} y={10} />
                <GroupText background={FORUM_HEADER} height={40} overrides={flatText(12, { color: 0xffffff })} text={forumData.description} width={254} wrap x={90} y={40} />
            </div>
            {SECTIONS.map((section, sectionIndex) => (
                <div key={section.labelKey} className="volt-forum__section" style={{ top: section.y }}>
                    <GroupText text={LocalizeText(section.labelKey)} x={0} y={0} />
                    {section.levels.map((level, row) => (
                        <div key={level} style={level < minimum[sectionIndex] ? { opacity: 0.5 } : undefined}>
                            <button
                                aria-checked={levels[sectionIndex] === level}
                                className={`volt-group-native__check is-radio${levels[sectionIndex] === level ? ' is-checked' : ''}`}
                                disabled={level < minimum[sectionIndex]}
                                role="radio"
                                style={{ left: 20, top: 23 + row * 20 }}
                                type="button"
                                onClick={() => setLevels((previous) => limitLevels(previous.map((value, index) => (index === sectionIndex ? level : value))))}
                            />
                            <GroupText text={LocalizeText(OPTION_KEYS[level])} x={40} y={20 + row * 20} />
                        </div>
                    ))}
                </div>
            ))}
            <div className="volt-forum__footer is-settings">
                <ForumButton label={LocalizeText('groupforum.settings.cancel')} width={120} x={25} onClick={onClose} />
                <ForumButton label={LocalizeText('groupforum.settings.ok')} tint="blue" width={120} x={190} onClick={save} />
            </div>
        </ForumFrame>
    );
};
