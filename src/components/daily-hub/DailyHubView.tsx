import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { answerHubRiddle, claimHubDaily, fetchHubState, HubActionResult, HubState, localizeWithFallback } from '../../api';
import { Button, Column, Flex, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../common';

const text = (key: string, fallback: string) => localizeWithFallback(key, fallback);

const formatStart = (iso: string): string => {
    const date = new Date(iso);

    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
};

/** The Daily Hub: the daily reward, the riddle of the day and the next event, without leaving the room. */
export const DailyHubView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [state, setState] = useState<HubState>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [answer, setAnswer] = useState('');
    const [message, setMessage] = useState<{ ok: boolean; text: string }>(null);

    const load = useCallback(async () => {
        try {
            setState(await fetchHubState());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

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
            eventUrlPrefix: 'daily-hub/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        setMessage(null);
        load();
    }, [isVisible, load]);

    const apply = (result: HubActionResult) => {
        setMessage({ ok: result.ok, text: result.message });
        setState((previous) => (previous ? { ...previous, ...(result.daily ? { daily: result.daily } : {}), ...(result.riddle !== undefined ? { riddle: result.riddle } : {}) } : previous));
    };

    const claim = async () => {
        if (busy) return;

        setBusy(true);
        apply(await claimHubDaily());
        setBusy(false);
    };

    const submit = async (event: { preventDefault: () => void }) => {
        event.preventDefault();

        if (busy || !answer.trim()) return;

        setBusy(true);

        const result = await answerHubRiddle(answer.trim());

        apply(result);
        if (result.ok) setAnswer('');
        setBusy(false);
    };

    if (!isVisible) return null;

    return (
        <VoltCardView className="min-w-0 w-[min(400px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] resize-none" theme="primary-slim">
            <VoltCardHeaderView headerText={text('dailyhub.title', 'Daily Hub')} onCloseClick={() => setIsVisible(false)} />
            <VoltCardContentView>
                {failed && !state && (
                    <Column gap={1} className="p-2">
                        <Text>{text('dailyhub.unavailable', 'The Daily Hub is not available right now.')}</Text>
                        <Button onClick={load}>{text('dailyhub.retry', 'Try again')}</Button>
                    </Column>
                )}
                {state && (
                    <Column gap={2}>
                        <Column gap={1} className="p-2 rounded bg-card-grid-item/30">
                            <Text bold>{text('dailyhub.reward', 'Daily reward')}</Text>
                            <Text small>
                                {text('dailyhub.streak', 'Streak')}: {state.daily.streak} · {text('dailyhub.best', 'Best')}: {state.daily.best_streak}
                            </Text>
                            <Button variant="success" disabled={state.daily.claimed || busy} onClick={claim}>
                                {state.daily.claimed
                                    ? text('dailyhub.claimed', 'Claimed. Come back tomorrow')
                                    : `${text('dailyhub.claim', 'Claim')} ${state.daily.amount} ${text('dailyhub.credits', 'credits')}`}
                            </Button>
                        </Column>

                        <Column gap={1} className="p-2 rounded bg-card-grid-item/30">
                            <Text bold>{text('dailyhub.riddle', 'Riddle of the day')}</Text>
                            {!state.riddle && <Text small>{text('dailyhub.noriddle', 'No riddle today. Check back tomorrow.')}</Text>}
                            {state.riddle && (
                                <>
                                    <Text>{state.riddle.question}</Text>
                                    {state.riddle.hint && (
                                        <Text small className="text-gray-700">
                                            {text('dailyhub.hint', 'Hint')}: {state.riddle.hint}
                                        </Text>
                                    )}
                                    {state.riddle.solved ? (
                                        <Text small bold>
                                            {text('dailyhub.solved', 'You solved it. Come back tomorrow.')}
                                        </Text>
                                    ) : (
                                        <form onSubmit={submit}>
                                            <Flex gap={1}>
                                                <input
                                                    className="form-control form-control-sm flex-1 min-w-0"
                                                    maxLength={100}
                                                    placeholder={text('dailyhub.answer', 'Your answer')}
                                                    type="text"
                                                    value={answer}
                                                    onChange={(event) => setAnswer(event.target.value)}
                                                />
                                                <Button disabled={busy || !answer.trim()}>
                                                    {text('dailyhub.submit', 'Answer')}
                                                </Button>
                                            </Flex>
                                        </form>
                                    )}
                                </>
                            )}
                        </Column>

                        {state.event && (
                            <Column gap={0} className="p-2 rounded bg-card-grid-item/30">
                                <Text bold>{text('dailyhub.event', 'Next event')}</Text>
                                <Text>{state.event.title}</Text>
                                <Text small className="text-gray-700">
                                    {formatStart(state.event.starts_at)}
                                    {state.event.location ? ` · ${state.event.location}` : ''}
                                </Text>
                            </Column>
                        )}

                        {message && (
                            <Text small bold className={message.ok ? 'text-green-700' : 'text-red-700'}>
                                {message.text}
                            </Text>
                        )}
                    </Column>
                )}
            </VoltCardContentView>
        </VoltCardView>
    );
};
