import { ChangeEvent, FC } from 'react';
import { WiredDropdown } from './WiredDropdown';

export interface WiredEditableDropdownProps {
    value: string;
    options: string[];
    maxLength?: number;
    caption?: string;
    onChange: (value: string) => void;
}

/** A dropdown whose text can also be typed: the field covers the caption and the arrow still opens the list. */
export const WiredEditableDropdown: FC<WiredEditableDropdownProps> = ({ value, options, maxLength = 0, caption = '', onChange }) => (
    <div className="volt-wired__editable-dropdown">
        <WiredDropdown
            caption=""
            options={options.map((label, id) => ({ id, label }))}
            value={-1}
            onChange={(id) => { if (options[id] !== undefined) onChange(options[id]); }}
        />
        <input
            aria-label={caption}
            className="volt-wired__editable-dropdown-field"
            maxLength={maxLength > 0 ? maxLength : undefined}
            spellCheck={false}
            type="text"
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        />
    </div>
);
