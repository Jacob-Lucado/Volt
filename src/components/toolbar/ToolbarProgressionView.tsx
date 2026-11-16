import { CreateLinkEvent, RewardTrackData } from '@volt/renderer';
import { Dispatch, FC, SetStateAction, useEffect, useRef } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../api';
import { LayoutItemCountView } from '../../common';
import { LosIcon } from '../../common/lucadoos';

interface ToolbarProgressionViewProps {
    achievementCount: number;
    dailyTaskCount: number;
    rewardTracks: RewardTrackData[];
    setExpanded: Dispatch<SetStateAction<boolean>>;
}

export const ToolbarProgressionView: FC<ToolbarProgressionViewProps> = ({ achievementCount, dailyTaskCount, rewardTracks, setExpanded }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const introductionCount = rewardTracks.find((track) => track.id === 'introduction')?.claimablePrizeCount ?? 0;
    // ProgMenuController.onRewardTracks (toolbar/progmenu/ProgMenuController.as:76): every active track other than
    // the introduction gets a clone of the introduction item, named by widget.progmenu.rewardtrack.<id>.
    const extraTracks = rewardTracks.filter((track) => track.id !== 'introduction');

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (elementRef.current?.contains(event.target as Node)) return;
            setExpanded(false);
        };
        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);
        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setExpanded]);

    const open = (link: string) => {
        setExpanded(false);
        CreateLinkEvent(link);
    };

    return (
        <div ref={elementRef} className="los-menu">
            {GetConfigurationValue('dailytasks.enabled') && (
                <button type="button" className="los-menu__item" onClick={() => open('dailytasks/open')}>
                    <LosIcon name="list" size={16} />
                    <span>{localizeWithFallback('widget.progmenu.dailytasks', 'Daily tasks')}</span>
                    {dailyTaskCount > 0 && <LayoutItemCountView count={dailyTaskCount} />}
                </button>
            )}
            {!GetConfigurationValue('toolbar.hide.quests') && (
                <button type="button" className="los-menu__item" onClick={() => open('quests/toggle')}>
                    <LosIcon name="flag" size={16} />
                    <span>{localizeWithFallback('widget.progmenu.quests', 'Quests')}</span>
                </button>
            )}
            <button type="button" className="los-menu__item" onClick={() => open('achievements/toggle')}>
                <LosIcon name="trophy" size={16} />
                <span>{localizeWithFallback('widget.progmenu.achievements', 'Achievements')}</span>
                {achievementCount > 0 && <LayoutItemCountView count={achievementCount} />}
            </button>
            <button type="button" className="los-menu__item" onClick={() => open('badge-leaderboard/show')}>
                <LosIcon name="chart" size={16} />
                <span>{localizeWithFallback('widget.progmenu.leaderboards', 'Leaderboards')}</span>
            </button>
            <button type="button" className="los-menu__item" onClick={() => open('reward_track/open/introduction')}>
                <LosIcon name="gift" size={16} />
                <span>{localizeWithFallback('widget.progmenu.introduction', 'Introduction')}</span>
                {introductionCount > 0 && <LayoutItemCountView count={introductionCount} />}
            </button>
            {extraTracks.map((track) => (
                <button key={track.id} type="button" className="los-menu__item" onClick={() => open(`reward_track/open/${track.id}`)}>
                    <LosIcon name="gift" size={16} />
                    <span>{localizeWithFallback(`widget.progmenu.rewardtrack.${track.id}`, `widget.progmenu.rewardtrack.${track.id}`)}</span>
                    {track.claimablePrizeCount > 0 && <LayoutItemCountView count={track.claimablePrizeCount} />}
                </button>
            ))}
        </div>
    );
};
