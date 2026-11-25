import { UnreleasedHabboHeaders } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, sanitizeWiredContextMenuButtonId, UnreleasedWiredText, WiredContextMenuLimits, WiredContextMenuTarget, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredContextMenuTargetToggle } from '../WiredContextMenuTargetToggle';
import { WiredEditableDropdown } from '../WiredEditableDropdown';
import { WiredSection } from '../WiredSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** `wf_trg_click_context_menu`: ints [targetKind], text = the button id (empty leaves the box inactive). */
export const WiredTriggerClickContextMenuView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [buttonId, setButtonId] = useState('');

    useEffect(() => {
        if (trigger) setButtonId(sanitizeWiredContextMenuButtonId(trigger.stringData ?? ''));
    }, [trigger]);

    // The server lists the button ids of the room's context menu items, sorted and without duplicates.
    const buttonIds = useMemo(() => {
        const context = trigger?.contexts?.find((entry) => entry.type === UnreleasedHabboHeaders.WIRED_EDITOR_CONTEXT_BUTTON_IDS);

        return context?.type === UnreleasedHabboHeaders.WIRED_EDITOR_CONTEXT_BUTTON_IDS ? context.buttonIds : [];
    }, [trigger]);

    const save = () => {
        setIntParams([WiredContextMenuTarget.USERS]);
        setStringParam(buttonId);
    };

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}
            headerControls={<WiredContextMenuTargetToggle />}>
            <WiredSection title={LocalizeText(UnreleasedWiredText.BUTTON_ID)}>
                <WiredEditableDropdown caption={LocalizeText(UnreleasedWiredText.BUTTON_ID)} maxLength={WiredContextMenuLimits.BUTTON_ID_LENGTH} options={buttonIds} value={buttonId}
                    onChange={(value) => setButtonId(sanitizeWiredContextMenuButtonId(value))} />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
