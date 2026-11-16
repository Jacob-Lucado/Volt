import { FC, ReactNode } from 'react';
import {
    FURNI_MAIN_FILTER,
    FURNI_TYPE_OPTIONS,
    FurniMainFilter,
    furniMainFilterKey,
    furniTypeFilterKey,
    LocalizeText,
    localizeWithFallback
} from '../../../api';
import { DraggableWindow } from '../../../common';
import { LosIcon, LosWindow } from '../../../common/lucadoos';
import { BADGE_MAIN_ACHIEVEMENTS, BADGE_MAIN_ALL, BADGE_MAIN_NORMAL } from '../views/InventoryCategoryFilterView';

export interface LosInventoryTab {
    name: string;
    label: string;
    count: number;
}

const FILTER_LABELS: Record<string, string> = {
    all: 'All',
    floor_items: 'Floor items',
    wall_items: 'Wall items',
    room_layout: 'Room layout',
    any: 'Any type',
    tiles_or_rugs: 'Tiles and rugs',
    ltd: 'Limited',
    credit_furni: 'Credit furni',
    pet_food: 'Pet food',
    non_tradable: 'Non-tradable'
};

const filterLabel = (key: string, id: string) => {
    const fallback = FILTER_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');

    return localizeWithFallback(key, fallback);
};

export const LosInventoryFilter: FC<{
    kind: 'furni' | 'badges';
    search: string;
    mainFilter: string;
    typeFilter: string;
    onSearch: (value: string) => void;
    onMainFilter: (value: string) => void;
    onTypeFilter: (value: string) => void;
}> = ({ kind, search, mainFilter, typeFilter, onSearch, onMainFilter, onTypeFilter }) => {
    const typeOptions = FURNI_TYPE_OPTIONS[(mainFilter as FurniMainFilter) || FURNI_MAIN_FILTER.ALL] || FURNI_TYPE_OPTIONS.all;
    const searchLabel = localizeWithFallback('generic.search', 'Search');

    return (
        <div className="los-inv__filter">
            <label className="los-inv__search">
                <LosIcon name="search" size={14} />
                <input
                    className="los-input"
                    type="text"
                    aria-label={searchLabel}
                    placeholder={searchLabel}
                    value={search}
                    onChange={(event) => onSearch(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') onSearch('');
                    }}
                />
            </label>
            <select
                className="los-select"
                aria-label={localizeWithFallback('inventory.filter.category', 'Category')}
                value={mainFilter}
                onChange={(event) => onMainFilter(event.target.value)}
            >
                {kind === 'furni' &&
                    Object.values(FURNI_MAIN_FILTER).map((id) => (
                        <option key={id} value={id}>
                            {filterLabel(furniMainFilterKey(id), id)}
                        </option>
                    ))}
                {kind === 'badges' && (
                    <>
                        <option value={BADGE_MAIN_ALL}>{localizeWithFallback('inventory.badges.filter.all', 'All')}</option>
                        <option value={BADGE_MAIN_NORMAL}>{localizeWithFallback('inventory.badges.filter.normal_badges', 'Normal badges')}</option>
                        <option value={BADGE_MAIN_ACHIEVEMENTS}>{localizeWithFallback('inventory.badges.filter.achievements', 'Achievements')}</option>
                    </>
                )}
            </select>
            {kind === 'furni' && (
                <select
                    className="los-select"
                    aria-label={localizeWithFallback('inventory.filter.type', 'Type')}
                    value={typeFilter}
                    onChange={(event) => onTypeFilter(event.target.value)}
                >
                    {typeOptions.map((id) => (
                        <option key={id} value={id}>
                            {filterLabel(furniTypeFilterKey(id), id)}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};

export const LosInventory: FC<{
    tabs: LosInventoryTab[];
    currentTab: string;
    filter?: ReactNode;
    children?: ReactNode;
    onTab: (name: string) => void;
    onClose: () => void;
}> = ({ tabs, currentTab, filter = null, children = null, onTab, onClose }) => (
    <DraggableWindow uniqueKey="inventory" handleSelector=".los-window__bar" constrainToViewport={true}>
        <LosWindow className="los-inv" icon="box" title={LocalizeText('inventory.title')} onClose={onClose}>
            <div className="los-tabs los-inv__tabs" role="tablist">
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        type="button"
                        role="tab"
                        aria-selected={tab.name === currentTab}
                        className={`los-tab${tab.name === currentTab ? ' is-active' : ''}`}
                        onClick={() => onTab(tab.name)}
                    >
                        {tab.label}
                        {tab.count > 0 && <span className="los-inv__badge">{tab.count}</span>}
                    </button>
                ))}
            </div>
            {filter}
            <div className="los-inv__content">{children}</div>
        </LosWindow>
    </DraggableWindow>
);
