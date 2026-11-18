import { useEffect, useState } from 'react';
import { loadNativeFont, measureNativeText } from './NativeFont';
import { NativeTextStyleName, nativeTextStyles } from './NativeTextStyles';

export interface TextWindowField {
    text: string;
    textStyle: NativeTextStyleName;
}

/** The widths of auto sized text windows, floor(textWidth + 4) each, or null until the fonts are loaded. */
export const useTextWindowWidths = (fields: TextWindowField[]): number[] | null => {
    const [widths, setWidths] = useState<number[]>(null);
    const key = JSON.stringify(fields);

    useEffect(() => {
        let disposed = false;
        const measured = (JSON.parse(key) as TextWindowField[]).map(async ({ text, textStyle }) => {
            const style = nativeTextStyles[textStyle];
            const { font } = await loadNativeFont(style);
            return Math.floor(measureNativeText(font, text, style) + 4);
        });
        Promise.all(measured)
            .then((result) => !disposed && setWidths(result))
            .catch(() => !disposed && setWidths(null));

        return () => {
            disposed = true;
        };
    }, [key]);

    return widths;
};
