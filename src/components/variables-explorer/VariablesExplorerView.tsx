import { FC, useState } from 'react';
import { ExplorerConnection, WebApiVariable } from '../../api';
import { WidgetErrorBoundary } from '../../common/error-boundary/WidgetErrorBoundary';
import { lazyWindow } from '../../common/lazyWindow';
import { useVariablesExplorerStore } from '../../state/variablesExplorer';

const LazyVariablesExplorerConnectView = lazyWindow(
    () => import('./VariablesExplorerConnectView').then((module) => ({ default: module.VariablesExplorerConnectView })),
    'VariablesExplorerConnect'
);
const LazyVariablesExplorerMainView = lazyWindow(
    () => import('./VariablesExplorerMainView').then((module) => ({ default: module.VariablesExplorerMainView })),
    'VariablesExplorerMain'
);

interface ExplorerSession {
    connection: ExplorerConnection;
    variables: WebApiVariable[];
    openCount: number;
}

/** Connect form first, then the explorer. Keys live only in this state unless the user asked to remember them. */
export const VariablesExplorerView: FC = () => {
    const isOpen = useVariablesExplorerStore((s) => s.isOpen);
    const prefill = useVariablesExplorerStore((s) => s.prefill);
    const openCount = useVariablesExplorerStore((s) => s.openCount);
    const close = useVariablesExplorerStore((s) => s.close);
    const [session, setSession] = useState<ExplorerSession | null>(null);
    const [disconnected, setDisconnected] = useState<{ roomId: number; openCount: number } | null>(null);

    if (!isOpen) return null;

    const closeExplorer = () => {
        setSession(null);
        close();
    };

    const activeSession = session?.openCount === openCount ? session : null;

    return (
        <WidgetErrorBoundary name="VariablesExplorer">
            {activeSession ? (
                <LazyVariablesExplorerMainView
                    connection={activeSession.connection}
                    initialVariables={activeSession.variables}
                    onChunkError={closeExplorer}
                    onClose={closeExplorer}
                    onDisconnect={() => {
                        setDisconnected({ roomId: activeSession.connection.roomId, openCount });
                        setSession(null);
                    }}
                />
            ) : (
                <LazyVariablesExplorerConnectView
                    key={openCount}
                    onChunkError={closeExplorer}
                    onClose={closeExplorer}
                    onConnected={(connection, variables) => setSession({ connection, variables, openCount })}
                    prefill={disconnected?.openCount === openCount ? { roomId: disconnected.roomId } : prefill}
                />
            )}
        </WidgetErrorBoundary>
    );
};
