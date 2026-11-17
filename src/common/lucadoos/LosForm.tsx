import { FC, ReactNode } from 'react';

/** A labelled form row used inside LucadoOS windows. */
export const LosField: FC<{ label?: string; error?: string; hint?: string; children: ReactNode }> = ({ label, error, hint, children }) => (
    <div className={`los-field${error ? ' is-invalid' : ''}`}>
        {label && <span className="los-field__label">{label}</span>}
        {children}
        {hint && !error && <small className="los-field__hint">{hint}</small>}
        {error && (
            <small className="los-field__error" role="alert">
                {error}
            </small>
        )}
    </div>
);

export const LosCheck: FC<{ checked: boolean; label: string; disabled?: boolean; onChange: (checked: boolean) => void }> = ({
    checked,
    label,
    disabled = false,
    onChange
}) => (
    <label className={`los-check${disabled ? ' is-disabled' : ''}`}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span className="los-check__box" />
        <span>{label}</span>
    </label>
);

export const LosRadio: FC<{ checked: boolean; label: string; onChange: (checked: boolean) => void }> = ({ checked, label, onChange }) => (
    <label className="los-check los-check--radio">
        <input type="radio" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="los-check__box" />
        <span>{label}</span>
    </label>
);

export const LosSelect: FC<{
    value: number | string;
    options: { value: number | string; label: string }[];
    disabled?: boolean;
    onChange: (value: number) => void;
}> = ({ value, options, disabled = false, onChange }) => (
    <select className="los-select" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => (
            <option key={option.value} value={option.value}>
                {option.label}
            </option>
        ))}
    </select>
);
