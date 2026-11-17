import { FC } from 'react';
import { getNavigatorUserCountColor } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';
import userCountIcon from '../../../../assets/images/navigator/air/icon-usercount.png';

interface NavigatorUserCountViewProps {
    userCount: number;
    maxUserCount: number;
}

export const NavigatorUserCountView: FC<NavigatorUserCountViewProps> = (props) => {
    const { userCount, maxUserCount } = props;

    const color = getNavigatorUserCountColor(userCount, maxUserCount);

    return (
        <span className="volt-navigator-air__usercount" style={{ backgroundColor: color }}>
            <img src={userCountIcon} alt="" />
            <NativeText
                text={String(userCount)}
                textStyle="u_bold"
                background={parseInt(color.slice(1), 16)}
                overrides={{ color: 0xffffff }}
                tinted
                nativeResolution
            />
        </span>
    );
};
