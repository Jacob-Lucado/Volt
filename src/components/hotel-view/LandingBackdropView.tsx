import { FC, ReactNode } from 'react';
import { LandingBackdrop } from '../../api/hotel-view/landingBackdrop';

interface LandingBackdropViewProps {
    backdrop: LandingBackdrop;
    children?: ReactNode;
}

// The landing view scenery as AIR lays it out: the top colour fills the sky, the gradient
// spans the width above the bottom edge, and the left and right artwork sit in its corners.
// The widget grid comes between them: above the right artwork, below the left one.
export const LandingBackdropView: FC<LandingBackdropViewProps> = ({ backdrop, children }) => (
    <div className="landing-backdrop" style={{ backgroundImage: `url("${backdrop.topUrl}")` }}>
        <div className="landing-backdrop-gradient" style={{ backgroundImage: `url("${backdrop.gradientUrl}")` }} aria-hidden="true" />
        <img className="landing-backdrop-right" src={backdrop.rightUrl} alt="" draggable={false} aria-hidden="true" />
        {children}
        <img className="landing-backdrop-left" src={backdrop.leftUrl} alt="" draggable={false} aria-hidden="true" />
    </div>
);
