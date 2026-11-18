import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { HubRareValue, localizeWithFallback, searchHubValues } from '../../api';
import { Column, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../common';

const text = (key: string, fallback: string) => localizeWithFallback(key, fallback);

/** A quick price check for rares: type a furni name and see its trading value without leaving the room. */
export const RareValuesView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<HubRareValue[]>([]);
    const [failed, setFailed] = useState(false);
    const [searched, setSearched] = useState(false);
    const latest = useRef(0);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((previous) => !previous);
                        return;
                }
            },
            eventUrlPrefix: 'rare-values/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        const query = term.trim();

        if (query.length < 2) {
            setResults([]);
            setSearched(false);
            setFailed(false);

            return;
        }

        const ticket = ++latest.current;
        const timer = setTimeout(async () => {
            try {
                const found = await searchHubValues(query);

                if (ticket !== latest.current) return;

                setResults(found);
                setFailed(false);
            } catch {
                if (ticket === latest.current) setFailed(true);
            }

            if (ticket === latest.current) setSearched(true);
        }, 250);

        return () => clearTimeout(timer);
    }, [term]);

    if (!isVisible) return null;

    return (
        <VoltCardView className="min-w-0 w-[min(360px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] resize-none" theme="primary-slim">
            <VoltCardHeaderView headerText={text('rarevalues.title', 'Rare values')} onCloseClick={() => setIsVisible(false)} />
            <VoltCardContentView>
                <Column gap={2}>
                    <input
                        autoFocus
                        className="form-control form-control-sm"
                        maxLength={60}
                        placeholder={text('rarevalues.search', 'Search for a rare')}
                        type="text"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                    />
                    <Column gap={1} className="max-h-[max(160px,min(360px,calc(100vh-520px)))] overflow-y-auto pr-1">
                        {failed && <Text small>{text('rarevalues.failed', 'Could not look that up right now.')}</Text>}
                        {!failed && searched && results.length === 0 && <Text small>{text('rarevalues.none', 'No rares match that name.')}</Text>}
                        {results.map((rare, index) => (
                            <Column key={`${rare.name}-${index}`} gap={0} className="p-2 rounded bg-card-grid-item/30">
                                <Text bold>{rare.name}</Text>
                                <Text small>
                                    {rare.credits ? `${rare.credits} ${text('rarevalues.credits', 'credits')}` : text('rarevalues.nocredits', 'No credit value')}
                                    {rare.other && rare.other !== '0' && rare.other_label ? ` · ${rare.other} ${rare.other_label}` : ''}
                                </Text>
                            </Column>
                        ))}
                    </Column>
                </Column>
            </VoltCardContentView>
        </VoltCardView>
    );
};
