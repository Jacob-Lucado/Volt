import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';

export interface CatalogTouchTitleBarProps {
    crumb: string;
    title: string;
    onBack?: () => void;
    onSearch?: () => void;
}

/** Phone title bar: back to the category list, the page name under its trail, and search beside the shared close button. */
export const CatalogTouchTitleBar: FC<CatalogTouchTitleBarProps> = ({ crumb, title, onBack, onSearch }) => (
    <div className="volt-catalog-touch-title-bar">
        {onBack && <button aria-label={LocalizeText('generic.back')} className="volt-catalog-touch-back" type="button" onClick={onBack} />}
        <div className="volt-catalog-touch-title">
            {!!crumb && <span className="volt-catalog-touch-crumb">{crumb}</span>}
            <strong>{title}</strong>
        </div>
        {onSearch && (
            <button aria-label={localizeWithFallback('generic.search', 'Search')} className="volt-catalog-touch-search" type="button" onClick={onSearch} />
        )}
    </div>
);
