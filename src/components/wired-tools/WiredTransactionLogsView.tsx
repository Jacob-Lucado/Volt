import { WiredTransactionLogListEvent } from '@volt/renderer';
import { FC, useState } from 'react';
import { useMessageEvent } from '../../hooks';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE, WiredTransactionLogsPage, WiredTransactionLogsWindow } from './WiredTransactionLogsWindow';

export const WiredTransactionLogsView: FC = () => {
    const [data, setData] = useState<WiredTransactionLogsPage | null>(null);

    useMessageEvent<WiredTransactionLogListEvent>(WiredTransactionLogListEvent, (event) => {
        const page = event.getParser();
        if (page?.amount !== WIRED_TRANSACTION_LOGS_PAGE_SIZE) return;

        setData({ listType: page.listType, listId: page.listId, totalLogs: page.totalLogs, page: page.page, logs: [...page.logs] });
    });

    return data && <WiredTransactionLogsWindow data={data} onClose={() => setData(null)} />;
};
