import { CreateLinkEvent } from '@volt/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPageName, FriendlyTime, GetConfigurationValue, LocalizeFormattedNumber, LocalizeShortNumber, localizeWithFallback } from '../../../api';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { LosIcon } from '../../../common/lucadoos';
import { usePurse } from '../../../hooks';
import { SeasonalView } from '../views/SeasonalView';

const CURRENCIES: Record<number, { icon: string; key: string; fallback: string; open: () => void }> = {
    5: {
        icon: diamondIcon,
        key: 'achievements.activitypoint.5',
        fallback: 'Diamonds',
        open: () => CreateLinkEvent('catalog/open/' + CatalogPageName.LOYALTY_INFO)
    },
    [-1]: {
        icon: creditsIcon,
        key: 'purse_coins',
        fallback: 'Credits',
        open: () => {
            const url = GetConfigurationValue<string>('web.shop.relative.url', '');

            if (url) window.open(url, '_blank');
        }
    },
    0: {
        icon: ducketsIcon,
        key: 'achievements.activitypoint.0',
        fallback: 'Duckets',
        open: () => CreateLinkEvent('catalog/open/' + CatalogPageName.DUCKET_INFO)
    }
};

const SETTINGS: [string, string, string][] = [
    ['audio', 'widget.memenu.settings.audio', 'Sound settings'],
    ['chat', 'widget.memenu.settings.chat', 'Chat settings'],
    ['other', 'widget.memenu.settings.other', 'Other settings']
];

const seasonalTypes = () => {
    if (!GetConfigurationValue<boolean>('seasonalcurrencyindicator.enabled', false)) return [];

    const types: number[] = [];

    for (const part of String(GetConfigurationValue<string>('seasonalcurrencyindicator.active', '') ?? '').split(',')) {
        const value = part.trim();

        if (value === '' || Number.isNaN(Number(value))) continue;

        const type = Math.trunc(Number(value));

        if (!types.includes(type)) types.push(type);
    }

    return types;
};

export const LosPurse: FC = () => {
    const { purse = null, hcDisabled = false } = usePurse();
    const [menuOpen, setMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const shown = useMemo(() => GetConfigurationValue<number[]>('system.currency.types', []), []);
    const short = useMemo(() => GetConfigurationValue<boolean>('currency.display.number.short', false), []);
    const seasonal = useMemo(seasonalTypes, []);

    useEffect(() => {
        if (!menuOpen) return;

        const close = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };

        document.addEventListener('pointerdown', close);

        return () => document.removeEventListener('pointerdown', close);
    }, [menuOpen]);

    if (!purse) return null;

    const balances: [number, number][] = [];

    if (purse.activityPoints?.has(5) && shown.includes(5)) balances.push([5, purse.activityPoints.get(5) || 0]);

    balances.push([-1, purse.credits]);

    if (purse.activityPoints?.has(0) && shown.includes(0)) balances.push([0, purse.activityPoints.get(0) || 0]);

    // The club chip reads "Join" under one day left, else the time left.
    const clubDays = purse.clubPeriods * 31 + purse.clubDays;
    const clubLabel =
        clubDays < 1
            ? localizeWithFallback('purse.clubdays.zero.amount.text', 'Get')
            : FriendlyTime.shortFormat(
                  purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < 1440 ? purse.minutesUntilExpiration * 60 : clubDays * 86400
              );
    const earningsLabel = localizeWithFallback('earnings.title', 'Earnings');
    const helpLabel = localizeWithFallback('toolbar.help', 'Help');
    const settingsLabel = localizeWithFallback('widget.memenu.settings', 'Settings');

    const openSettings = (section: string) => {
        CreateLinkEvent('user-settings/show/' + section);
        setMenuOpen(false);
    };

    return (
        <div ref={rootRef} className="los-purse">
            <div className="los-purse__bar">
                {balances.map(([type, amount]) => {
                    const currency = CURRENCIES[type];
                    const name = localizeWithFallback(currency.key, currency.fallback);

                    return (
                        <button
                            key={type}
                            type="button"
                            className="los-purse__chip"
                            title={`${LocalizeFormattedNumber(amount)} ${name}`}
                            aria-label={name}
                            onClick={currency.open}
                        >
                            <img src={currency.icon} alt="" />
                            <span>{short ? LocalizeShortNumber(amount).toLowerCase() : LocalizeFormattedNumber(amount)}</span>
                        </button>
                    );
                })}
                <span className="los-purse__split" aria-hidden="true" />
                {!hcDisabled && (
                    <button
                        type="button"
                        className={`los-purse__chip los-purse__chip--club${clubDays >= 1 ? ' is-member' : ''}`}
                        aria-label={localizeWithFallback('catalog.club.hc', 'Habbo Club')}
                        onClick={() => CreateLinkEvent('habboUI/open/hccenter')}
                    >
                        <b>HC</b>
                        <span>{clubLabel}</span>
                    </button>
                )}
                <button type="button" className="los-purse__chip" onClick={() => CreateLinkEvent('habboUI/open/vault')}>
                    <span>{earningsLabel}</span>
                </button>
                <span className="los-purse__split" aria-hidden="true" />
                <button type="button" className="los-purse__icon" title={helpLabel} aria-label={helpLabel} onClick={() => CreateLinkEvent('help/show')}>
                    <LosIcon name="help" size={15} />
                </button>
                <button
                    type="button"
                    className={`los-purse__icon${menuOpen ? ' is-on' : ''}`}
                    title={settingsLabel}
                    aria-label={settingsLabel}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((value) => !value)}
                >
                    <LosIcon name="gear" size={15} />
                </button>
            </div>
            {menuOpen && (
                <div className="los-purse__menu">
                    {SETTINGS.map(([section, key, fallback]) => (
                        <button key={section} type="button" onClick={() => openSettings(section)}>
                            {localizeWithFallback(key, fallback)}
                        </button>
                    ))}
                    {GetConfigurationValue<boolean>('user.custom.filter.enabled', false) && (
                        <button type="button" onClick={() => openSettings('wordfilter')}>
                            {localizeWithFallback('word_filter.settings.title', 'Word filter')}
                        </button>
                    )}
                </div>
            )}
            {seasonal.length > 0 && (
                <div className="volt-purse__other">
                    {seasonal.map((type) => (
                        <SeasonalView key={type} type={type} amount={purse.activityPoints.get(type) || 0} />
                    ))}
                </div>
            )}
        </div>
    );
};
