import { FC } from 'react';
import { LocalizeText } from '../../api';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorHotLookThumbnailView } from './AvatarEditorHotLookThumbnailView';

export const AvatarEditorHotLooksView: FC = () => {
    const { hotLooks, gender, loadAvatarData } = useAvatarEditor();

    // HotLooksModel.selectHotLook: a look without a figure stays listed but is not loaded.
    return (
        <div className="volt-avatar-editor-hotlooks">
            <span className="los-ae__text volt-avatar-editor-hotlooks-title">{LocalizeText('avatareditor.hotlooks.title')}</span>
            <span className="los-ae__text volt-avatar-editor-hotlooks-choose">{LocalizeText('avatareditor.hotlooks.choose')}</span>
            <div className="volt-avatar-editor-hotlooks-grid">
                {hotLooks
                    .filter((look) => look.gender.toUpperCase() === gender)
                    .map((look, index) => (
                        <button
                            type="button"
                            key={index}
                            className="volt-avatar-editor-hotlook"
                            aria-label={LocalizeText('avatareditor.hotlooks.choose')}
                            onClick={() => look.figureString && loadAvatarData(look.figureString, look.gender.toUpperCase())}
                        >
                            <AvatarEditorHotLookThumbnailView figure={look.figureString} gender={look.gender.toUpperCase()} />
                        </button>
                    ))}
            </div>
        </div>
    );
};
