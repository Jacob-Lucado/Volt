import { IWiredTransactionInfo, WiredTransactionLogListEvent } from '@volt/renderer';
import { FC, lazy, Suspense, useState } from 'react';
import { useMessageEvent } from '../../hooks';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE } from './WiredTransactionLogs.constants';

interface WiredTransactionLogsPage {
    listType: number;
    listId: number;
    totalLogs: number;
    page: number;
    logs: IWiredTransactionInfo[];
}

const LazyWiredTransactionLogsWindow = lazy(() =>
    import('./WiredTransactionLogsWindow').then((module) => ({ default: module.WiredTransactionLogsWindow }))
);

export const WiredTransactionLogsView: FC = () => {
    const [data, setData] = useState<WiredTransactionLogsPage | null>(null);

    useMessageEvent<WiredTransactionLogListEvent>(WiredTransactionLogListEvent, (event) => {
        const page = event.getParser();
        if (page?.amount !== WIRED_TRANSACTION_LOGS_PAGE_SIZE) return;

        setData({ listType: page.listType, listId: page.listId, totalLogs: page.totalLogs, page: page.page, logs: [...page.logs] });
    });

    if (!data) return null;

    return (
        <Suspense fallback={null}>
            <LazyWiredTransactionLogsWindow data={data} onClose={() => setData(null)} />
        </Suspense>
    );
};
