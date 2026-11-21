import { FC } from 'react';
import { LocalizeText, UnreleasedWiredText } from '../../../api';
import { WiredSourceTypeSelector } from './WiredSourceTypeSelector';

/** The furni / users switch of the context menu boxes. Furni context menus do not exist yet, so only users can be chosen. */
export const WiredContextMenuTargetToggle: FC<{}> = () => (
    <WiredSourceTypeSelector
        disabledTypes={['furni']}
        labels={{ furni: LocalizeText(UnreleasedWiredText.TARGET_FURNI), user: LocalizeText(UnreleasedWiredText.TARGET_USERS) }}
        types={['furni', 'user']}
        value="user"
        onChange={() => undefined}
    />
);
