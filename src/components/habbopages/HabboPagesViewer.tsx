import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker, VoltLogger } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api';
import { lazyWindow } from '../../common/lazyWindow';
import type { HabboPageContent } from './HabboPagesWindow';

const NEW_LINE_REGEX = /\n\r|\n|\r/gm;

const LazyHabboPagesWindow = lazyWindow(
    () => import('./HabboPagesWindow').then((module) => ({ default: module.HabboPagesWindow })),
    'HabboPages'
);

export const HabboPagesViewer: FC<{}> = () => {
    const [page, setPage] = useState<HabboPageContent>(null);
    const requestRef = useRef<AbortController>(null);

    const openPage = useCallback(async (path: string) => {
        requestRef.current?.abort();
        const request = new AbortController();
        requestRef.current = request;
        const url = GetConfigurationValue<string>('habbopages.url') + path;

        try {
            const response = await fetch(url, { signal: request.signal });

            if (!response.ok) throw new Error(response.statusText);

            const splitData = (await response.text()).split(NEW_LINE_REGEX);
            const line = (splitData.shift() ?? '').split('|');
            let dimensions: HabboPageContent['dimensions'] = null;

            if (line[1] && line[1].split(';').length === 2) {
                const [width, height] = line[1].split(';').map((value) => parseInt(value, 10));

                if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) dimensions = { width, height };
            }

            if (requestRef.current === request && !request.signal.aborted) setPage({ dimensions, header: line[0], markup: splitData.join('\n') });
        } catch (error) {
            if (request.signal.aborted) return;
            VoltLogger.error(`Failed to fetch ${url}`);
        }
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const path = url.slice('habbopages/'.length);

                if (!path) return;

                openPage(path);
            },
            eventUrlPrefix: 'habbopages/'
        };

        AddLinkEventTracker(linkTracker);

        return () => {
            requestRef.current?.abort();
            requestRef.current = null;
            RemoveLinkEventTracker(linkTracker);
        };
    }, [openPage]);

    const closePage = () => {
        requestRef.current?.abort();
        requestRef.current = null;
        setPage(null);
    };

    if (!page) return null;

    return <LazyHabboPagesWindow onChunkError={closePage} onClose={closePage} page={page} />;
};
