import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ReportState, ReportType } from '../../api';
import { useHelp } from '../../hooks';
import { NameChangeView } from './views/name-change/NameChangeView';

const LazyHelpWindow = lazy(() =>
    import('./HelpWindow').then((module) => ({ default: module.HelpWindow }))
);
const LazySanctionSatusView = lazy(() =>
    import('./views/SanctionStatusView').then((module) => ({ default: module.SanctionSatusView }))
);

export const HelpView: FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { activeReport, setActiveReport, sanctionInfo = null } = useHelp();
    const hasActiveReport = activeReport !== null;
    const isOpen = isVisible || hasActiveReport;

    const onClose = useCallback(() => {
        setActiveReport(null);
        setIsVisible(false);
    }, [setActiveReport]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        break;
                    case 'hide':
                        onClose();
                        break;
                    case 'toggle':
                        if (hasActiveReport) onClose();
                        else setIsVisible((value) => !value);
                        break;
                    case 'report':
                        if (parts.length >= 5 && parts[2] === 'room') {
                            const roomId = Number.parseInt(parts[3], 10);
                            if (Number.isFinite(roomId)) {
                                setActiveReport({
                                    reportType: ReportType.ROOM,
                                    currentStep: ReportState.SELECT_TOPICS,
                                    roomId,
                                    roomName: unescape(parts.slice(4).join('/')),
                                    reportedUserId: -1,
                                    reportedChats: [],
                                    cfhCategory: -1,
                                    cfhTopic: -1,
                                    messageId: -1,
                                    threadId: -1,
                                    groupId: -1,
                                    extraData: '',
                                    roomObjectId: -1,
                                    message: ''
                                });
                            }
                        }
                        break;
                }
            },
            eventUrlPrefix: 'help/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [hasActiveReport, onClose, setActiveReport]);

    return (
        <>
            {isOpen && (
                <Suspense fallback={null}>
                    <LazyHelpWindow isVisible={isVisible} setIsVisible={setIsVisible} onClose={onClose} />
                </Suspense>
            )}
            {sanctionInfo && (
                <Suspense fallback={null}>
                    <LazySanctionSatusView />
                </Suspense>
            )}
            <NameChangeView />
        </>
    );
};
