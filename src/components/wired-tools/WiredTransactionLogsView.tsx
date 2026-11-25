import { IWiredTransactionInfo, WiredTransactionLogListEvent } from '@volt/renderer';
import { FC, useCallback, useState } from 'react';
import { lazyWindow } from '../../common/lazyWindow';
import { useMessageEvent } from '../../hooks';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE } from './WiredTransactionLogs.constants';

interface WiredTransactionLogsPage {
    listType: number;
    listId: number;
    totalLogs: number;
    page: number;
    logs: IWiredTransactionInfo[];
}

const LazyWiredTransactionLogsWindow = lazyWindow(
    () => import('./WiredTransactionLogsWindow').then((module) => ({ default: module.WiredTransactionLogsWindow })),
    'WiredTransactionLogs'
);

export const WiredTransactionLogsView: FC = () => {
    const [data, setData] = useState<WiredTransactionLogsPage | null>(null);

    useMessageEvent<WiredTransactionLogListEvent>(WiredTransactionLogListEvent, (event) => {
        const page = event.getParser();
        if (page?.amount !== WIRED_TRANSACTION_LOGS_PAGE_SIZE) return;

        setData({ listType: page.listType, listId: page.listId, totalLogs: page.totalLogs, page: page.page, logs: [...page.logs] });
    });

    const close = useCallback(() => setData(null), []);

    if (!data) return null;

    return <LazyWiredTransactionLogsWindow data={data} onChunkError={close} onClose={close} />;
};
