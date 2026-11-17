import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';

interface NavigatorEmptyStateViewProps {
    code: string;
}

export const NavigatorEmptyStateView: FC<NavigatorEmptyStateViewProps> = (props) => {
    const { code } = props;
    const messageKey = code === 'myworld_view' ? 'navigator.roomsettings.moderation.none' : 'navigator.search.returned.no.results';

    return (
        <div className="volt-navigator-air__empty">
            <NativeText text={LocalizeText(messageKey)} textStyle="u_headline_medium" background={0xeceae0} width={286} align="center" nativeResolution />
        </div>
    );
};
