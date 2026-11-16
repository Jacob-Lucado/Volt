import { NavigatorSavedSearch } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';
import quicklinkAdd from '../../../../assets/images/navigator/air/quicklink-add.png';
import { NavigatorSearchSavesResultItemView } from './NavigatorSearchSavesResultItemView';

export interface NavigatorSearchSavesResultViewProps {
    searches: NavigatorSavedSearch[];
}

export const NavigatorSearchSavesResultView: FC<NavigatorSearchSavesResultViewProps> = (props) => {
    const { searches = [] } = props;

    return (
        <div className="volt-navigator-search-saves-result">
            <div className="volt-navigator-search-saves-result__header">
                <img className="volt-navigator-search-saves-result__header-icon" src={quicklinkAdd} alt="" width={18} height={18} />
                <span className="volt-navigator-search-saves-result__header-label">
                    <NativeText text={LocalizeText('navigator.quick.links.title')} textStyle="id_heading_2" background={0xfba800} nativeResolution />
                </span>
            </div>
            <div className="volt-navigator-search-saves-result__list">
                {searches?.map((search: NavigatorSavedSearch) => (
                    <NavigatorSearchSavesResultItemView key={search.id} search={search} />
                ))}
            </div>
        </div>
    );
};
