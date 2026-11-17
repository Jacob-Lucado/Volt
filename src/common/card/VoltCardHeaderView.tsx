import { FC, MouseEvent } from 'react';
import { FaFlag } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { Base, Column, ColumnProps, Flex } from '..';
import { LosIcon } from '../lucadoos/LosIcon';
import { useVoltCardContext } from './VoltCardContext';

interface VoltCardHeaderViewProps extends ColumnProps {
    headerText: string;
    isGalleryPhoto?: boolean;
    noCloseButton?: boolean;
    isInfoToHabboPages?: boolean;
    onReportPhoto?: (event: MouseEvent) => void;
    onClickInfoHabboPages?: (event: MouseEvent) => void;
    onCloseClick: (event: MouseEvent) => void;
}

export const VoltCardHeaderView: FC<VoltCardHeaderViewProps> = (props) => {
    const {
        headerText = null,
        isGalleryPhoto = false,
        noCloseButton = false,
        isInfoToHabboPages = false,
        onReportPhoto = null,
        onClickInfoHabboPages = null,
        onCloseClick = null,
        justifyContent = 'center',
        alignItems = 'center',
        classNames = [],
        className = '',
        children = null,
        ...rest
    } = props;

    const { isWired } = useVoltCardContext();

    const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    if (!isWired) {
        return (
            <Column
                classNames={['volt-card-header-shell', 'los-window__bar', 'drag-handler', ...classNames]}
                className={className}
                justifyContent="start"
                alignItems="center"
                {...rest}
            >
                <span className="los-window__title volt-card-title">{headerText}</span>
                <span className="los-window__actions">
                    {isGalleryPhoto && (
                        <button type="button" className="los-window__button volt-card-header-report-camera" onClick={onReportPhoto} onMouseDownCapture={onMouseDown}>
                            <FaFlag className="fa-icon" />
                        </button>
                    )}
                    {isInfoToHabboPages && (
                        <button type="button" className="los-window__button volt-card-header-info-habbopages" onClick={onClickInfoHabboPages} onMouseDownCapture={onMouseDown}>
                            <LosIcon name="info" size={14} />
                        </button>
                    )}
                    {children}
                    {!noCloseButton && (
                        <button
                            type="button"
                            className="los-window__button los-window__button--close"
                            aria-label={LocalizeText('generic.close')}
                            onClick={onCloseClick}
                            onMouseDownCapture={onMouseDown}
                        >
                            <LosIcon name="close" size={14} />
                        </button>
                    )}
                </span>
            </Column>
        );
    }

    return (
        <Column
            center
            classNames={[
                'volt-card-header-shell',
                'relative',
                'flex',
                'items-center',
                'justify-center',
                'flex-col',
                'drag-handler',
                'min-h-card-header',
                'max-h-card-header',
                ...classNames
            ]}
            className={className}
            {...rest}
        >
            <Flex center fullWidth>
                <span className="volt-card-title text-white">{headerText}</span>
                {isGalleryPhoto && (
                    <Base className="inset-e-4 volt-card-header-report-camera" position="absolute" onClick={onReportPhoto}>
                        <FaFlag className="fa-icon" />
                    </Base>
                )}
                {isInfoToHabboPages && (
                    <Base className="absolute right-8 volt-card-header-info-habbopages cursor-pointer" position="absolute" onClick={onClickInfoHabboPages} />
                )}
                {children}
                <div
                    className="absolute flex items-center justify-center cursor-pointer right-2 volt-card-close-button"
                    onClick={onCloseClick}
                    onMouseDownCapture={onMouseDown}
                ></div>
            </Flex>
        </Column>
    );
};
