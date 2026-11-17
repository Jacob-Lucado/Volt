import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText } from '../../api';
import fxSrc from '../../assets/images/avatareditor/air/effects-fx.png';
import clearSrc from '../../assets/images/avatareditor/clear-icon.png';
import { ClassicScrollAreaView } from '../../common/scroll-area/ClassicScrollAreaView';
import { useAvatarEditor } from '../../hooks';
import { getEditorEffectSeconds } from '../../hooks/avatar-editor/useAvatarEditorEffects';
import { useAvatarEditorGridWheel } from '../../hooks/avatar-editor/useAvatarEditorGridWheel';

// EffectsParamView opens this page; the stock catalogue's Clothing > Effects.
const EFFECTS_CATALOG_PAGE = 'ny2015_permeffects';
const EFFECT_ICONS = import.meta.glob('../../assets/images/avatareditor/effects/*.png', { eager: true, import: 'default' });

export const AvatarEditorEffectsView: FC = () => {
    const container = useRef<HTMLDivElement>(null);
    useAvatarEditorGridWheel(container);
    const { effects, selectedEffect, selectEditorEffect } = useAvatarEditor();
    const [, setTick] = useState(0);
    const selected = effects.find((effect) => effect.type === selectedEffect);
    // Native WJ paints grid progress when R3e rebuilds the inventory;
    // b3e's timer updates only the selected effect's details panel.
    const gridProgress = useMemo(
        () => new Map(effects.map((effect) => [effect.type, Math.floor(40 * (effect.permanent ? 1 : getEditorEffectSeconds(effect) / effect.duration))])),
        [effects]
    );

    useEffect(() => {
        if (!selected?.active || selected.permanent) return;

        const timer = window.setInterval(() => setTick((tick) => tick + 1), 1000);
        return () => window.clearInterval(timer);
    }, [selected]);

    const secondsLeft = selected ? getEditorEffectSeconds(selected) : 0;
    const getTimeText = () => {
        if (selected.permanent) return LocalizeText('avatareditor.effects.active.permanent');
        if (secondsLeft > 86400) return LocalizeText('avatareditor.effects.active.daysleft', ['days_left'], [String(Math.floor(secondsLeft / 86400))]);

        const hours = Math.floor(secondsLeft / 3600);
        const minutes = String(Math.floor(secondsLeft / 60) % 60).padStart(2, '0');
        const seconds = String(secondsLeft % 60).padStart(2, '0');
        const time = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${minutes}:${seconds}`;
        return LocalizeText('avatareditor.effects.active.timeleft', ['time_left'], [time]);
    };

    return (
        <div ref={container} className="volt-avatar-editor-effects">
            <div className="volt-avatar-editor-effects-heading">
                <img src={fxSrc} alt="" draggable={false} />
                <span className="los-ae__text">{LocalizeText('inventory.effects')}</span>
            </div>
            <button
                type="button"
                className="volt-avatar-editor-effects-shop"
                onClick={() =>
                    CreateLinkEvent(`catalog/open/${GetConfigurationValue<string>('avatareditor.effects.buy.button.catalog.page.name', EFFECTS_CATALOG_PAGE)}`)
                }
            >
                <span className="los-ae__text">{LocalizeText('avatareditor.effects.shop')}</span>
            </button>
            {effects.length === 0 ? (
                <div className="volt-avatar-editor-effects-empty">
                    <span className="los-ae__text">{LocalizeText('avatar.editor.content.title')}</span>
                    <span className="los-ae__text volt-avatar-editor-effects-notification">{LocalizeText('avatar.editor.content.notification')}</span>
                </div>
            ) : (
                <div className="volt-avatar-editor-parts-grid volt-avatar-editor-effects-grid">
                    <ClassicScrollAreaView contentClassName="volt-avatar-editor-effect-items" scrollStep={50}>
                        {[null, ...effects].map((effect) => {
                            const type = effect?.type ?? -1;
                            const icon = effect ? EFFECT_ICONS[`../../assets/images/avatareditor/effects/fx_icon_${type}.png`] : clearSrc;
                            return (
                                <button
                                    type="button"
                                    key={type}
                                    className={`volt-avatar-editor-effect-item avatar-parts${selectedEffect === type ? ' part-selected' : ''}`}
                                    aria-pressed={selectedEffect === type}
                                    aria-label={effect ? LocalizeText(`fx_${type}`) : LocalizeText('avatareditor.clear')}
                                    onMouseDown={() => selectEditorEffect(type)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') selectEditorEffect(type);
                                    }}
                                >
                                    {icon && <img src={icon} alt="" draggable={false} />}
                                    {effect?.amount > 1 && (
                                        <div className="volt-avatar-editor-effect-amount">
                                            <span className="los-ae__text">{String(effect.amount)}</span>
                                        </div>
                                    )}
                                    {effect && (effect.active || effect.permanent) && (
                                        <div className="volt-avatar-editor-effect-duration">
                                            <div style={{ width: gridProgress.get(type) }} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </ClassicScrollAreaView>
                </div>
            )}
            {selected && (
                <>
                    <div className="volt-avatar-editor-effect-name">
                        <span className="los-ae__text">{LocalizeText(`fx_${selected.type}`)}</span>
                    </div>
                    {!selected.active && !selected.permanent ? (
                        <div className="volt-avatar-editor-effect-activate">
                            <span className="los-ae__text">{LocalizeText('avatareditor.save.to.activate')}</span>
                        </div>
                    ) : (
                        <div className="volt-avatar-editor-effect-time">
                            <div className="volt-avatar-editor-effect-time-bar">
                                <div style={{ width: Math.floor(120 * (selected.permanent ? 1 : secondsLeft / selected.duration)) }} />
                            </div>
                            <span className="los-ae__text">{getTimeText()}</span>
                            <span aria-hidden="true" className="volt-avatar-editor-effect-time-ink">
                                <span className="los-ae__text">{getTimeText()}</span>
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
