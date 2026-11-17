import { PetFigureData } from '@volt/renderer';
import { CSSProperties, FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import penImage from '../../../../assets/images/catalog/air/skin/common-small-pen.png';
import { DraggableWindow, LayoutPetImageView } from '../../../../common';
import { NativeCenteredField } from '../../../../common/native-text/NativeCenteredField';
import { NativeText } from '../../../../common/native-text/NativeText';
import { usePetPackageWidget } from '../../../../hooks';
import '../../../../css/room/PetPackage.css';
import { Native0Border, Native0Frame } from '../../../mod-tools/native/NativeWindow0';
import { Native3Frame, Native3ThickButton } from '../../../mod-tools/native/NativeWindow3';

const NAME_MAX_LENGTH = 15;
// The small layout's texts set their font in the layout instead of a text style, so Flash keeps its default sharpness and thickness.
const FLASH_DEFAULT_RENDERING = { sharpness: 0, thickness: 0 };
const HEADER_BODY_COLOR = 0x0e3f52;
const FRAME3_BODY_COLOR = 0xe9e9e1;

const rect = (x: number, y: number, width?: number, height?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width, height });

/** Centred like AIR's window center(): whole pixels, rounded down. */
const centred = (width: number, height: number) => ({ x: Math.floor((window.innerWidth - width) / 2), y: Math.floor((window.innerHeight - height) / 2) });

/** A child of fixed size centred in a box on whole pixels, rounded towards zero like BitmapData.copyPixels, and clipped to the box. */
const CentredBox: FC<{ x: number; y: number; width: number; height: number; children: ReactNode }> = ({ x, y, width, height, children }) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ left: 0, top: 0 });

    useLayoutEffect(() => {
        const element = innerRef.current?.firstElementChild as HTMLElement;

        if (!element) return;

        const place = () => setOffset({ left: Math.trunc((width - element.offsetWidth) / 2), top: Math.trunc((height - element.offsetHeight) / 2) });
        const observer = new ResizeObserver(place);

        place();
        observer.observe(element);

        return () => observer.disconnect();
    }, [width, height]);

    return (
        <div style={{ ...rect(x, y, width, height), overflow: 'hidden' }}>
            <div ref={innerRef} style={{ position: 'absolute', ...offset }}>
                {children}
            </div>
        </div>
    );
};

interface PetPackageLayoutProps {
    petName: string;
    onChangePetName: (name: string) => void;
    onConfirm: () => void;
    onClose: () => void;
}

/** AIR layout `petpackage` (280x160, frame style 0): shown when the package sends the pet's figure. The pet is drawn facing 90 degrees at scale 64 without custom parts. */
const PetPackageFigureView: FC<PetPackageLayoutProps & { figure: PetFigureData }> = ({ figure, petName, onChangePetName, onConfirm, onClose }) => (
    <Native0Frame caption={LocalizeText('widgets.petpackage.name.title')} height={160} width={280} onClose={onClose}>
        <Native0Border height={128} width={267} x={0} y={0}>
            <Native0Border color={0xf0f0f0} height={64} width={64} x={11} y={11}>
                <CentredBox height={60} width={60} x={2} y={2}>
                    <LayoutPetImageView direction={2} paletteId={figure.paletteId} petColor={figure.color} typeId={figure.typeId} />
                </CentredBox>
            </Native0Border>
            <div style={rect(84, 16)}>
                <NativeText
                    background={0xffffff}
                    maxWidth={174}
                    overrides={FLASH_DEFAULT_RENDERING}
                    text={LocalizeText('widgets.petpackage.name.select')}
                    textStyle="u_bold"
                />
            </div>
            <Native0Border height={25} width={175} x={83} y={49}>
                <input
                    className="volt-pet-package__input is-small"
                    maxLength={NAME_MAX_LENGTH}
                    name="input"
                    spellCheck={false}
                    style={rect(7, 4, 160, 17)}
                    type="text"
                    value={petName}
                    onChange={(event) => onChangePetName(event.target.value)}
                />
            </Native0Border>
            <div className="volt-pet-package__cancel" role="button" style={rect(10, 90, 68, 29)} onClick={onClose}>
                <div style={rect(1, 6, 64, 17)}>
                    <NativeCenteredField width={64}>
                        <NativeText
                            background={0xffffff}
                            overrides={{ ...FLASH_DEFAULT_RENDERING, underline: true }}
                            text={LocalizeText('generic.cancel')}
                            textStyle="u_regular"
                        />
                    </NativeCenteredField>
                </div>
            </div>
            <Native3ThickButton
                height={28}
                label={LocalizeText('widgets.petpackage.name.pick')}
                minWidth={125}
                width={175}
                x={131}
                y={91}
                onClick={onConfirm}
            />
        </Native0Border>
    </Native0Frame>
);

/** AIR layout `petpackage_new` (475x250, frame style 3 in 0x67a3bf with 33px top margin): shown when the package sends no figure. */
const PetPackageBoxView: FC<PetPackageLayoutProps> = ({ petName, onChangePetName, onConfirm, onClose }) => (
    <Native3Frame clientX={0} clientY={33} color={0x67a3bf} height={250} title={LocalizeText('widgets.petpackage.name.title')} width={475} onClose={onClose}>
        <div style={{ ...rect(1, 0, 473, 100), backgroundColor: '#376275' }}>
            <div style={{ ...rect(2, 2, 469, 95), backgroundColor: '#0e3f52' }} />
            <CentredBox height={93} width={85} x={3} y={5}>
                <img
                    alt=""
                    className="volt-pet-package__box"
                    draggable={false}
                    src={`${GetConfigurationValue<string>('image.library.url')}client_static/petpackage_box.png`}
                />
            </CentredBox>
        </div>
        <div style={rect(96, 11)}>
            <NativeText
                background={HEADER_BODY_COLOR}
                overrides={{ color: 0xffffff, size: 24 }}
                text={LocalizeText('petpackage.header.title')}
                textStyle="u_headline_big"
            />
        </div>
        <div style={rect(96, 41)}>
            <NativeText
                background={HEADER_BODY_COLOR}
                leading={2}
                maxWidth={354}
                overrides={{ color: 0xffffff }}
                text={LocalizeText('widgets.petpackage.name.select')}
                textStyle="u_regular"
            />
        </div>
        <Native0Border height={34} width={417} x={17} y={115}>
            <input
                className="volt-pet-package__input is-big"
                maxLength={NAME_MAX_LENGTH}
                name="input"
                spellCheck={false}
                style={rect(7, 6, 380, 22)}
                type="text"
                value={petName}
                onChange={(event) => onChangePetName(event.target.value)}
            />
            <img alt="" draggable={false} src={penImage} style={rect(393, 8)} />
        </Native0Border>
        <div className="volt-pet-package__cancel" role="button" style={rect(107, 165, 101, 32)} onClick={onClose}>
            {/* The text window centres itself in its 83px box (relative_scale_center) after it sizes to the caption. */}
            <div style={rect(9, 8, 83, 17)}>
                <NativeCenteredField width={83}>
                    <NativeText
                        background={FRAME3_BODY_COLOR}
                        overrides={{ color: 0x333333, underline: true }}
                        text={LocalizeText('generic.cancel')}
                        textStyle="u_regular"
                    />
                </NativeCenteredField>
            </div>
        </div>
        <Native3ThickButton
            whiteLabel
            color={0x00aa00}
            height={33}
            label={LocalizeText('widgets.petpackage.name.pick')}
            minWidth={130}
            width={195}
            x={239}
            y={164}
            onClick={onConfirm}
        />
    </Native3Frame>
);

export const PetPackageWidgetView: FC<{}> = () => {
    const { isVisible = false, objectId = -1, figure = null, petName = '', onChangePetName = null, onConfirm = null, onClose = null } = usePetPackageWidget();

    if (!isVisible) return null;

    const props = { petName, onChangePetName, onConfirm, onClose };
    const [width, height] = figure ? [280, 160] : [475, 250];

    return (
        <DraggableWindow
            key={`${objectId}-${figure ? 'figure' : 'box'}`}
            handleSelector=".native0-header, .native3-title"
            initialPosition={centred(width, height)}
        >
            <div className="volt-pet-package">{figure ? <PetPackageFigureView figure={figure} {...props} /> : <PetPackageBoxView {...props} />}</div>
        </DraggableWindow>
    );
};
