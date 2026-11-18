import { ButtonHTMLAttributes, DetailedHTMLProps, PropsWithChildren, Ref, useImperativeHandle } from 'react';
import { AirButtonKindName, textCaption, useAirButton } from '../common/air/AirSkinButton';
import { classNames } from './classNames';

const classes = {
    base: 'inline-flex justify-center items-center gap-2 rounded-none leading-tight cursor-pointer select-none',
    disabled: 'opacity-55 pointer-events-none',
    size: {
        default: '',
        lg: 'px-5 py-1 min-h-[28px] text-sm font-bold',
        xl: 'px-6 py-1.5 min-h-[32px] text-sm font-bold'
    },
    variant: {
        default: 'habbo-btn-secondary',
        primary: 'habbo-btn-primary',
        buy: 'habbo-btn-buy',
        success: 'habbo-btn-success',
        danger: 'habbo-btn-danger'
    }
};

type VoltButtonProps = PropsWithChildren<{
    color?: 'default' | 'primary' | 'buy' | 'success' | 'danger' | 'dark' | 'ghost';
    size?: 'default' | 'lg' | 'xl';
    outline?: boolean;
    ref?: Ref<HTMLButtonElement>;
}> &
    DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

/** The AIR button each skinned colour stands for. */
const AIR_KIND: Partial<Record<VoltButtonProps['color'], AirButtonKindName>> = {
    default: 'default',
    primary: 'shiny-thick-green',
    buy: 'shiny-thick-green',
    success: 'shiny-thick-green',
    danger: 'red'
};

export const VoltButton = (props: VoltButtonProps) => {
    const caption = textCaption(props.children);
    // A call site with its own classes may restyle the button, so it keeps the CSS skin until its window is moved to AIR.
    const kind =
        caption !== null && !props.className && !props.outline && (props.size ?? 'default') === 'default' ? AIR_KIND[props.color ?? 'default'] : undefined;

    return kind ? <AirCaptionVoltButton {...props} caption={caption} kind={kind} /> : <SkinnedVoltButton {...props} />;
};

/** A text-only button drawn like the AIR button it stands for: skin, label size and NativeText caption. */
const AirCaptionVoltButton = ({
    ref,
    caption,
    kind,
    color,
    size,
    outline,
    type = 'button',
    className = null,
    style,
    children,
    ...rest
}: VoltButtonProps & { caption: string; kind: AirButtonKindName }) => {
    const air = useAirButton<HTMLButtonElement>({ kind, caption });
    useImperativeHandle(ref, () => air.ref.current, [air.ref]);

    return (
        <button
            {...rest}
            ref={air.ref}
            className={classNames('air-skin-button select-none', className)}
            data-air-kind={air.kind}
            style={{ ...air.style, ...style }}
            type={type}
        >
            {air.caption}
        </button>
    );
};

const SkinnedVoltButton = ({
    ref,
    color = 'default',
    size = 'default',
    outline = false,
    disabled = false,
    type = 'button',
    className = null,
    ...rest
}: VoltButtonProps) => {
    const variantClass =
        color === 'dark'
            ? 'btn-dark'
            : color === 'ghost'
              ? 'habbo-btn-secondary !bg-transparent'
              : classes.variant[color in classes.variant ? color : 'default'];

    return (
        <button
            ref={ref}
            className={classNames(
                classes.base,
                classes.size[size],
                color === 'dark' && size === 'default' && 'px-3 py-0.5 min-h-[22px] font-bold text-[11px]',
                outline ? 'habbo-btn-secondary !bg-transparent' : variantClass,
                disabled && classes.disabled,
                className
            )}
            disabled={disabled}
            type={type}
            {...rest}
        />
    );
};
