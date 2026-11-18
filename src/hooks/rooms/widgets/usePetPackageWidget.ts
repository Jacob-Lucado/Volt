import { OpenPetPackageMessageComposer, PetFigureData, RoomSessionPetPackageEvent } from '@volt/renderer';
import { useRef, useState } from 'react';
import { LocalizeText, NotificationAlertType, SendMessageComposer } from '../../../api';
import { useVoltEvent } from '../../events';
import { useNotification } from '../../notification';

interface PetPackageState {
    objectId: number;
    figure: PetFigureData;
}

const PET_NAME_ERRORS: Record<number, string> = { 1: 'long', 2: 'short', 3: 'chars' };

/**
 * The alert text for a refused pet name. The `.additionalInfo` text with the server's info is used when the server sent info
 * and the hotel has that text; otherwise the plain text.
 */
export const getPetPackageNameError = (errorCode: number, info: string = null): string => {
    if (!errorCode) return '';

    const key = `catalog.alert.petname.${PET_NAME_ERRORS[errorCode] ?? 'bobba'}`;

    if (info && info.length) {
        const additionalKey = `${key}.additionalInfo`;
        const additional = LocalizeText(additionalKey, ['additional_info'], [info]);

        if (additional && additional.length && additional !== additionalKey) return additional;
    }

    return LocalizeText(key);
};

const usePetPackageWidgetState = () => {
    const [state, setState] = useState<PetPackageState>(null);
    const [petName, setPetName] = useState('');
    const isPending = useRef(false);
    const { simpleAlert = null } = useNotification();

    const alert = (message: string) => simpleAlert(message, NotificationAlertType.WINDOW, null, null, LocalizeText('widgets.petpackage.alert.petname.title'));

    const onClose = () => {
        isPending.current = false;
        setState(null);
        setPetName('');
    };

    const onConfirm = () => {
        if (!state || isPending.current) return;

        if (!petName.length) {
            alert(LocalizeText('catalog.alert.petname.short'));
            return;
        }

        isPending.current = true;
        SendMessageComposer(new OpenPetPackageMessageComposer(state.objectId, petName));
    };

    useVoltEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_REQUESTED, (event) => {
        if (!event) return;

        isPending.current = false;
        setPetName('');
        setState({ objectId: event.objectId, figure: event.figureData ?? null });
    });

    useVoltEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_RESULT, (event) => {
        if (!event || !isPending.current) return;

        isPending.current = false;

        if (event.nameValidationStatus === 0) {
            onClose();
            return;
        }

        alert(getPetPackageNameError(event.nameValidationStatus, event.nameValidationInfo));
    });

    return {
        isVisible: !!state,
        objectId: state?.objectId ?? -1,
        figure: state?.figure ?? null,
        petName,
        onChangePetName: setPetName,
        onConfirm,
        onClose
    };
};

export const usePetPackageWidget = usePetPackageWidgetState;
