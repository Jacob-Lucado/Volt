import { AchievementData } from '@volt/renderer';
import { FC } from 'react';
import { AchievementCategory, AchievementUtilities, getAchievementCategoryUnseenCount, IAchievementCategory, LocalizeText } from '../../../api';
import { DraggableWindow, LayoutCurrencyIcon } from '../../../common';
import { LosIcon, LosWindow } from '../../../common/lucadoos';
import { useAchievements } from '../../../hooks';
import { AchievementBadgeView } from '../AchievementBadgeView';

const Bar: FC<{ label?: string; progress: number; max: number }> = ({ label, progress, max }) => {
    const percent = max > 0 ? Math.max(0, Math.min(100, (progress / max) * 100)) : 0;

    return (
        <div className="los-ach__bar">
            <div className="los-ach__track">
                <i style={{ width: `${percent}%` }} />
            </div>
            {label && <small>{label}</small>}
        </div>
    );
};

const Categories: FC<{ categories: IAchievementCategory[]; onSelect: (code: string) => void }> = ({ categories, onSelect }) => {
    const { unseenAchievements } = useAchievements();

    return (
        <div className="los-ach__cats">
            {categories.map((category) => {
                const progress = AchievementUtilities.getAchievementCategoryProgress(category);
                const max = AchievementUtilities.getAchievementCategoryMaxProgress(category);
                const unseen = unseenAchievements ? getAchievementCategoryUnseenCount(unseenAchievements, category.code) : 0;

                return (
                    <button key={category.code} type="button" className="los-ach__cat" onClick={() => onSelect(category.code)}>
                        {unseen > 0 && <span className="los-ach__unseen">{unseen}</span>}
                        <img
                            src={AchievementUtilities.getAchievementCategoryImageUrl(category)}
                            alt=""
                            draggable={false}
                            onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
                        />
                        <b>{AchievementUtilities.getAchievementCategoryName(category)}</b>
                        <Bar progress={progress} max={max} label={`${progress}/${max}`} />
                    </button>
                );
            })}
        </div>
    );
};

const Details: FC<{ achievement: AchievementData }> = ({ achievement }) => {
    const code = AchievementUtilities.getAchievementBadgeCode(achievement);
    const showReward = AchievementUtilities.shouldShowAchievementReward(achievement);
    const showProgress = AchievementUtilities.shouldShowAchievementProgress(achievement);

    return (
        <div className="los-ach__details">
            <div className="los-ach__big">
                <AchievementBadgeView achievement={achievement} scale={2} />
            </div>
            <div className="los-ach__info">
                <b>{AchievementUtilities.getAchievementBadgeName(code)}</b>
                <p>{AchievementUtilities.getAchievementBadgeDescription(code)}</p>
                <small>
                    {LocalizeText(
                        'achievements.details.level',
                        ['level', 'limit'],
                        [AchievementUtilities.getAchievementLevel(achievement).toString(), achievement.levelCount.toString()]
                    )}
                </small>
                {showReward && (
                    <span className="los-ach__reward">
                        {LocalizeText('achievements.details.reward')} <b>{achievement.levelRewardPoints}</b>
                        <LayoutCurrencyIcon type={achievement.levelRewardPointType} />
                    </span>
                )}
                {showProgress && (
                    <Bar
                        progress={achievement.currentPoints - achievement.scoreAtStartOfLevel}
                        max={achievement.scoreLimit - achievement.scoreAtStartOfLevel}
                        label={LocalizeText(
                            'achievements.details.progress',
                            ['progress', 'limit'],
                            [achievement.currentPoints.toString(), achievement.scoreLimit.toString()]
                        )}
                    />
                )}
            </div>
        </div>
    );
};

const Category: FC<{ category: AchievementCategory }> = ({ category }) => {
    const { visibleAchievements = [], selectedAchievement, selectAchievement, unseenAchievements } = useAchievements();

    return (
        <>
            <div className="los-ach__grid">
                {visibleAchievements.map((achievement) => (
                    <button
                        key={achievement.achievementId}
                        type="button"
                        className={`los-ach__tile${selectedAchievement === achievement ? ' is-selected' : ''}${unseenAchievements?.has(achievement.achievementId) ? ' is-unseen' : ''}`}
                        onClick={() => selectAchievement(achievement)}
                    >
                        <AchievementBadgeView achievement={achievement} />
                    </button>
                ))}
            </div>
            {!!selectedAchievement && <Details achievement={selectedAchievement} />}
        </>
    );
};

export const LosAchievements: FC<{ windowPosition: { x: number; y: number }; onPositionChange: (position: { x: number; y: number }) => void }> = ({
    windowPosition,
    onPositionChange
}) => {
    const {
        close,
        goBack,
        achievementCategories = [],
        setSelectedCategoryCode,
        achievementScore = 0,
        getProgress = 0,
        getMaxProgress = 0,
        selectedCategory = null
    } = useAchievements();

    return (
        <DraggableWindow
            uniqueKey="achievements"
            handleSelector=".los-window__bar"
            initialPosition={windowPosition}
            onPositionChange={onPositionChange}
            unconstrainedPosition
        >
            <LosWindow
                className="los-ach"
                icon="trophy"
                title={LocalizeText('inventory.achievements')}
                onClose={close}
                actions={
                    selectedCategory && (
                        <button type="button" className="los-window__button" title={LocalizeText('generic.back')} onClick={goBack}>
                            <LosIcon name="back" size={14} />
                        </button>
                    )
                }
            >
                <div className="los-ach__body los-scroll">
                    {!selectedCategory ? (
                        <>
                            <div className="los-ach__summary">
                                <b>{LocalizeText('achievements.categories.score', ['score'], [achievementScore.toString()])}</b>
                                <Bar
                                    progress={getProgress}
                                    max={getMaxProgress}
                                    label={LocalizeText(
                                        'achievements.categories.totalprogress',
                                        ['progress', 'limit'],
                                        [getProgress.toString(), getMaxProgress.toString()]
                                    )}
                                />
                            </div>
                            <Categories categories={achievementCategories} onSelect={setSelectedCategoryCode} />
                        </>
                    ) : (
                        <>
                            <div className="los-ach__summary">
                                <b>{AchievementUtilities.getAchievementCategoryName(selectedCategory)}</b>
                                <Bar
                                    progress={selectedCategory.getProgress()}
                                    max={selectedCategory.getMaxProgress()}
                                    label={LocalizeText(
                                        'achievements.details.categoryprogress',
                                        ['progress', 'limit'],
                                        [selectedCategory.getProgress().toString(), selectedCategory.getMaxProgress().toString()]
                                    )}
                                />
                            </div>
                            <Category category={selectedCategory} />
                        </>
                    )}
                </div>
            </LosWindow>
        </DraggableWindow>
    );
};
