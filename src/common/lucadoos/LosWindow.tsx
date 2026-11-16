import { CSSProperties, FC, ReactNode } from 'react';
import { LocalizeText } from '../../api';
import { LosIcon, LosIconName } from './LosIcon';

export interface LosWindowProps {
    title: string;
    icon?: LosIconName;
    className?: string;
    style?: CSSProperties;
    /** Extra buttons shown before the close button. */
    actions?: ReactNode;
    onClose: () => void;
    children?: ReactNode;
}

/** The LucadoOS window: a glass panel with a title bar that also drags it. Put it inside a DraggableWindow with handleSelector=".los-window__bar". */
export const LosWindow: FC<LosWindowProps> = (props) => {
    const { title, icon = null, className = '', style = null, actions = null, onClose, children = null } = props;

    return (
        <div className={`los-window ${className}`} style={style}>
            <header className="los-window__bar">
                {icon && <LosIcon name={icon} />}
                <span className="los-window__title">{title}</span>
                <span className="los-window__actions">
                    {actions}
                    <button type="button" className="los-window__button los-window__button--close" aria-label={LocalizeText('generic.close')} onClick={onClose}>
                        <LosIcon name="close" size={14} />
                    </button>
                </span>
            </header>
            <div className="los-window__body">{children}</div>
        </div>
    );
};
