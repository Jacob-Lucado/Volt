import { GetSessionDataManager } from '@volt/renderer';
import { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { LocalizeText, UnreleasedWiredText, WiredFurniType } from '../../../../api';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredDropdown } from '../WiredDropdown';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';

/** The groups of the editing user that the user owns; the server refuses to save any other group. */
const useOwnedGroupOptions = () => {
    const { data: groups = [], refresh } = useUserGroups();
    const { trigger = null } = useWired();

    useEffect(() => {
        if (trigger) refresh?.();
    }, [trigger, refresh]);

    return useMemo(() => {
        const userId = GetSessionDataManager().userId;

        return groups.filter((group) => group.ownerId === userId).map((group) => ({ id: group.groupId, label: group.groupName }));
    }, [groups]);
};

const OwnedGroupSection: FC<PropsWithChildren<{ groupId: number; onChange: (groupId: number) => void }>> = ({ groupId, onChange, children = null }) => {
    const options = useOwnedGroupOptions();

    return (
        <WiredSection title={LocalizeText(UnreleasedWiredText.GROUPS_YOU_OWN)}>
            <WiredDropdown caption={LocalizeText(UnreleasedWiredText.GROUPS_YOU_OWN)} options={options} value={groupId} onChange={onChange} />
            {children}
        </WiredSection>
    );
};

const USER_SOURCES = <WiredAdvancedSourceRows rows={[{ kind: 'users', slot: 0 }]} />;

/** `wf_act_invite_to_group`: ints [groupId]; groupId 0 leaves the box inactive. */
export const WiredActionInviteToGroupView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [groupId, setGroupId] = useState(0);

    useEffect(() => {
        if (trigger) setGroupId(Math.max(0, trigger.intData?.[0] ?? 0));
    }, [trigger]);

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={() => setIntParams([groupId])} footer={USER_SOURCES}>
            <OwnedGroupSection groupId={groupId} onChange={setGroupId} />
        </WiredActionBaseView>
    );
};

/** `wf_act_remove_from_group`: ints [groupId, cancelInvitation], defaults [0, 1]. */
export const WiredActionRemoveFromGroupView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [groupId, setGroupId] = useState(0);
    const [cancelInvitation, setCancelInvitation] = useState(true);

    useEffect(() => {
        if (!trigger) return;

        setGroupId(Math.max(0, trigger.intData?.[0] ?? 0));
        setCancelInvitation((trigger.intData?.length ?? 0) > 1 ? trigger.intData[1] === 1 : true);
    }, [trigger]);

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={() => setIntParams([groupId, cancelInvitation ? 1 : 0])} footer={USER_SOURCES}>
            <OwnedGroupSection groupId={groupId} onChange={setGroupId}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={cancelInvitation} label={LocalizeText(UnreleasedWiredText.CANCEL_GROUP_INVITATION)} last={true} onChange={setCancelInvitation} />
                </WiredCheckboxGroup>
            </OwnedGroupSection>
        </WiredActionBaseView>
    );
};
