import { CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { LosIcon } from '../../../common/lucadoos';

export const LosInventoryEmpty: FC = () => (
    <div className="los-inv__empty">
        <span className="los-inv__empty-mark">
            <LosIcon name="box" size={30} />
        </span>
        <strong>{LocalizeText('inventory.empty.title')}</strong>
        <p>{LocalizeText('inventory.empty.desc')}</p>
        <button type="button" className="los-button los-button--primary" onClick={() => CreateLinkEvent('catalog/toggle/normal')}>
            <LosIcon name="bag" size={14} />
            {LocalizeText('inventory.open.catalog')}
        </button>
    </div>
);
