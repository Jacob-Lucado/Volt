import { FC, PropsWithChildren, ReactNode } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredTriggerBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    footer?: ReactNode;
    /** Source-type controls placed beside the AIR summary header. */
    headerControls?: ReactNode;
    footerCollapsible?: boolean;
    /** AIR advancedAlwaysVisible: the footer is the expanded advanced wrapper with no toggle. */
    advancedAlwaysVisible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves the picks section out (AIR forceHidePickFurniInstructions). */
    showSelection?: boolean;
    nativeLayout?: boolean;
}

export const WiredTriggerBaseView: FC<PropsWithChildren<WiredTriggerBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        hasSpecialInput = false,
        children = null,
        footer = null,
        headerControls = null,
        footerCollapsible = true,
        advancedAlwaysVisible = false,
        selectionPreview = null,
        showSelection = true,
        nativeLayout = false
    } = props;

    const onSave = () => save && save();

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={onSave}
            wiredType="trigger"
            footer={footer}
            headerControls={headerControls}
            footerCollapsible={footerCollapsible}
            advancedAlwaysVisible={advancedAlwaysVisible}
            selectionPreview={selectionPreview}
            showSelection={showSelection}
            nativeLayout={nativeLayout}
        >
            {children}
        </WiredBaseView>
    );
};
