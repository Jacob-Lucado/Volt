import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, UnreleasedWiredText, WiredFurniType, WiredGroupMembershipChange, WiredGroupMembershipMode } from '../../../../api';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** `wf_trg_group_membership`: ints [groupMode, groupId, change], defaults [0, 0, 0]. The list holds every group of the editing user. */
export const WiredTriggerGroupMembershipView: FC<{}> = () => {
    const { data: groups = [], refresh: refreshGroups } = useUserGroups();
    const { trigger = null, setIntParams = null } = useWired();
    const [mode, setMode] = useState<number>(WiredGroupMembershipMode.ROOM_GROUP);
    const [groupId, setGroupId] = useState(0);
    const [change, setChange] = useState<number>(WiredGroupMembershipChange.JOINS);

    useEffect(() => {
        if (trigger) refreshGroups?.();
    }, [trigger, refreshGroups]);

    useEffect(() => {
        if (!trigger) return;

        const [savedMode = 0, savedGroupId = 0, savedChange = 0] = trigger.intData ?? [];

        setMode(savedMode === WiredGroupMembershipMode.PICKED_GROUP ? WiredGroupMembershipMode.PICKED_GROUP : WiredGroupMembershipMode.ROOM_GROUP);
        setGroupId(Math.max(0, savedGroupId));
        setChange(savedChange === WiredGroupMembershipChange.LEAVES ? WiredGroupMembershipChange.LEAVES : WiredGroupMembershipChange.JOINS);
    }, [trigger]);

    const groupOptions = useMemo(() => groups.map((group) => ({ id: group.groupId, label: group.groupName })), [groups]);

    const save = () => setIntParams([mode, mode === WiredGroupMembershipMode.PICKED_GROUP ? groupId : 0, change]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText(UnreleasedWiredText.CHOOSE_GROUP)}>
                <WiredRadioGroup
                    name="groupMembershipMode"
                    value={mode}
                    onChange={setMode}
                    options={[
                        { id: WiredGroupMembershipMode.ROOM_GROUP, label: LocalizeText(UnreleasedWiredText.CURRENT_GROUP) },
                        {
                            id: WiredGroupMembershipMode.PICKED_GROUP,
                            label: LocalizeText(UnreleasedWiredText.SELECT_FROM_LIST),
                            extra: <WiredDropdown caption={LocalizeText('wiredfurni.tooltip.group')} options={groupOptions} value={groupId} onChange={setGroupId} />
                        }
                    ]}
                />
            </WiredSection>
            <WiredSection title={LocalizeText(UnreleasedWiredText.TRIGGER_WHEN_USER)}>
                <WiredRadioGroup
                    name="groupMembershipChange"
                    value={change}
                    onChange={setChange}
                    options={[
                        { id: WiredGroupMembershipChange.JOINS, label: LocalizeText(UnreleasedWiredText.JOINS_GROUP) },
                        { id: WiredGroupMembershipChange.LEAVES, label: LocalizeText(UnreleasedWiredText.LEAVES_GROUP) }
                    ]}
                />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
