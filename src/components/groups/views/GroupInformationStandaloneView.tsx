import { GroupInformationEvent, GroupInformationParser } from '@volt/renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { DraggableWindow } from '../../../common';
import { LosWindow } from '../../../common/lucadoos';
import { useMessageEvent } from '../../../hooks';
import { GroupInformationView } from './GroupInformationView';

export const GroupInformationStandaloneView: FC<{}> = () => {
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser>(null);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if ((groupInformation && groupInformation.id === parser.id) || parser.flag) setGroupInformation(parser);
    });

    if (!groupInformation) return null;

    return (
        <DraggableWindow uniqueKey="group-information" handleSelector=".los-window__bar">
            <LosWindow className="los-grp-window" icon="group" title={LocalizeText('group.window.title')} onClose={() => setGroupInformation(null)}>
                <GroupInformationView groupInformation={groupInformation} />
            </LosWindow>
        </DraggableWindow>
    );
};
