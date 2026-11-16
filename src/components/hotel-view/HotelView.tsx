import { GetSessionDataManager } from '@volt/renderer';
import { FC } from 'react';
import { getLandingBackdrop } from '../../api';
import logoDrape from '../../assets/images/hotelview/reception/reception_logo_drape.png';
import { LayoutAvatarImageView } from '../../common';
import { LandingDynamicLayoutView } from './landing/LandingDynamicLayoutView';
import { LandingBackdropView } from './LandingBackdropView';

export const HotelView: FC = () => (
    // HabboLandingView: the landing window fills the desktop and sits on its bottom edge, behind the translucent toolbar
    // (WidgetContainerLayout.as:303-323).
    <div className="volt-hotel-view block fixed w-full h-full overflow-hidden">
        <LandingBackdropView backdrop={getLandingBackdrop()}>
            <LandingDynamicLayoutView />
        </LandingBackdropView>
        <img className="landing-logo" src={logoDrape} alt="" draggable={false} />
        <LayoutAvatarImageView classNames={['hotelview-avatar']} figure={GetSessionDataManager().figure} gender={GetSessionDataManager().gender} direction={2} />
    </div>
);
