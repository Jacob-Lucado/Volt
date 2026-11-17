import { FC, useMemo } from 'react';
import { AirButtonKindName, textCaption, useAirButton } from './air/AirSkinButton';
import { Flex, FlexProps } from './Flex';
import { ButtonSizeType, ColorVariantType } from './types';

export interface ButtonProps extends FlexProps {
    variant?: ColorVariantType;
    size?: ButtonSizeType;
    active?: boolean;
    disabled?: boolean;
}

/** The AIR button each skinned variant stands for. */
const AIR_KIND: Partial<Record<ColorVariantType, AirButtonKindName>> = {
    primary: 'shiny-thick-green',
    success: 'shiny-thick-green',
    danger: 'red',
    secondary: 'default',
    warning: 'default',
    gray: 'default'
};

const SKIN_CLASS = /^habbo-btn-[a-z]+$/;

/** A call site with its own classes may restyle the button, so it keeps the CSS skin until its window is moved to AIR. */
const airKind = ({ variant = 'primary', size = 'sm', className = '', classNames = [] }: ButtonProps): AirButtonKindName | null => {
    const classes = [...classNames, ...className.split(/\s+/)].filter(Boolean);
    if (classes.some((name) => !SKIN_CLASS.test(name))) return null;
    if (classes.includes('habbo-btn-black')) return 'black';
    return size === 'sm' ? (AIR_KIND[variant] ?? null) : null;
};

export const Button: FC<ButtonProps> = (props) => {
    const caption = textCaption(props.children);
    const kind = caption === null ? null : airKind(props);

    return kind ? <AirCaptionButton {...props} caption={caption} kind={kind} /> : <SkinnedButton {...props} />;
};

/** A text-only button drawn like the AIR button it stands for: skin, label size and NativeText caption. */
const AirCaptionButton: FC<ButtonProps & { caption: string; kind: AirButtonKindName }> = ({
    caption,
    kind,
    variant,
    size,
    active = false,
    disabled = false,
    classNames = [],
    className = '',
    style,
    children,
    ...rest
}) => {
    const air = useAirButton<HTMLDivElement>({ kind, caption });
    const ownClasses = [...classNames, ...className.split(/\s+/)].filter((name) => name && (!SKIN_CLASS.test(name) || name === 'habbo-btn-black'));

    return (
        <Flex
            {...rest}
            className={['air-skin-button pointer-events-auto select-none', active && 'active', disabled && 'is-disabled pointer-events-none', ...ownClasses]
                .filter(Boolean)
                .join(' ')}
            data-air-kind={air.kind}
            display="inline-block"
            innerRef={air.ref}
            style={{ ...air.style, ...style }}
        >
            {air.caption}
        </Flex>
    );
};

const SkinnedButton: FC<ButtonProps> = (props) => {
    const { variant = 'primary', size = 'sm', active = false, disabled = false, classNames = [], ...rest } = props;

    const getClassNames = useMemo(() => {
        // Skinned small buttons take size, padding and font from the .habbo-btn-* skin
        // metrics; unskinned variants keep their utility sizing.
        const skinned = size === 'sm' && ['primary', 'success', 'danger', 'warning', 'secondary', 'gray'].includes(variant);

        const newClassNames: string[] = [
            skinned
                ? 'pointer-events-auto leading-tight text-center no-underline cursor-pointer select-none rounded-none'
                : 'pointer-events-auto font-bold leading-tight text-center no-underline cursor-pointer select-none px-[.75rem] py-[.375rem] text-[.9rem] rounded-none'
        ];

        if (variant) {
            if (variant == 'primary' || variant == 'success') newClassNames.push('habbo-btn-primary');

            if (variant == 'danger') newClassNames.push('habbo-btn-danger');

            if (variant == 'warning' || variant == 'secondary' || variant == 'gray') newClassNames.push('habbo-btn-secondary');

            if (variant == 'black')
                newClassNames.push(
                    'text-white  bg-[#000] border-[#000] [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white  hover:bg-[#000] hover:border-[#000]'
                );

            if (variant == 'dark')
                newClassNames.push(
                    'text-white bg-dark [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white hover:bg-[#18181bfb] hover:border-[#161619fb]'
                );
        }

        if (size) {
            if (size == 'sm') {
                newClassNames.push(skinned ? 'rounded-none!' : 'px-[.5rem]! py-[.25rem]! text-[.7875rem]! rounded-none! min-h-[24px]!');
            }
        }

        if (active) newClassNames.push('active');

        if (disabled) newClassNames.push('pointer-events-none opacity-[.65] [box-shadow:none]');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [variant, size, active, disabled, classNames]);

    return <Flex center display="inline-flex" classNames={getClassNames} {...rest} />;
};
