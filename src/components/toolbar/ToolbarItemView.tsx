import { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, Ref } from 'react';
import { localizeWithFallback } from '../../api';
import { LosIcon, LosIconName } from '../../common/lucadoos';
import { classNames } from '../../layout';

type ToolbarItemViewProps = PropsWithChildren<{
    icon: string;
    ref?: Ref<HTMLDivElement>;
}> &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const TOOLBAR_LABELS: Record<string, [string, string]> = {
    habbo: ['toolbar.icon.tooltip.exitroom.hotelview', 'Hotel view'],
    house: ['toolbar.icon.tooltip.exitroom.home', 'Home room'],
    rooms: ['toolbar.icon.label.navigator', 'Navigator'],
    progression: ['toolbar.icon.label.progression', 'Progress'],
    game: ['toolbar.icon.label.games', 'Games'],
    stories: ['toolbar.icon.label.stories', 'Stories'],
    catalog: ['toolbar.icon.label.catalogue', 'Shop'],
    buildersclub: ['toolbar.icon.label.builder', 'BC Warehouse'],
    inventory: ['toolbar.icon.label.inventory', 'Inventory'],
    'wired-tools': ['toolbar.icon.label.wired_menu', 'Wired'],
    camera: ['camera.interface.title', 'Camera'],
    friendall: ['toolbar.icon.label.friendlist', 'Friends'],
    friendsearch: ['friendlist.search', 'Find friends'],
    message: ['toolbar.icon.label.messenger', 'Messenger'],
    modtools: ['toolbar.icon.label.modtools', 'Moderator tools'],
    buildheight: ['toolbar.icon.label.buildheight', 'Build height']
};

const TOOLBAR_ICONS: Record<string, LosIconName> = {
    habbo: 'hotel',
    house: 'home',
    rooms: 'compass',
    progression: 'trophy',
    game: 'gamepad',
    stories: 'image',
    catalog: 'bag',
    buildersclub: 'hammer',
    inventory: 'box',
    'wired-tools': 'bolt',
    camera: 'camera',
    friendall: 'group',
    friendsearch: 'usersearch',
    message: 'chat',
    modtools: 'shield',
    buildheight: 'height'
};

export const ToolbarItemView = ({ ref, icon = null, className = null, title, 'aria-label': ariaLabel, ...rest }: ToolbarItemViewProps) => {
    const labelDefinition = TOOLBAR_LABELS[icon];
    const lineIcon = TOOLBAR_ICONS[icon];
    const label = title ?? (labelDefinition ? localizeWithFallback(...labelDefinition) : undefined);

    return (
        <div
            ref={ref}
            data-toolbar-tooltip={label}
            aria-label={ariaLabel ?? label}
            className={classNames('cursor-pointer relative', `volt-icon icon-${icon}`, lineIcon && 'los-tb', className)}
            {...rest}
        >
            {lineIcon && <LosIcon name={lineIcon} size={20} />}
        </div>
    );
};
