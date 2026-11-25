import { ComponentType, FC } from 'react';
import { lazyWindow } from './lazyWindow';

type EmojiPickerProps = Record<string, unknown>;

/**
 * emoji-mart's data bundle (`@emoji-mart/data`) is ~430 KB (~82 KB gzip) and was
 * pulled into the initial app bundle by three always-mounted views that import it
 * statically. The picker itself opens rarely, so we load both the data and the
 * `<Picker>` component on demand via a dynamic import - deferring that payload out
 * of first paint. Drop-in for `<Picker data={data} ... />` (the `data` prop is
 * injected here; forward every other prop unchanged).
 */
const PickerWithData = lazyWindow(
    async () => {
        const [dataModule, pickerModule] = await Promise.all([import('@emoji-mart/data'), import('@emoji-mart/react')]);

        const data = (dataModule as { default: unknown }).default;
        const Picker = (pickerModule as { default: ComponentType<EmojiPickerProps> }).default;

        const Wrapped: ComponentType<EmojiPickerProps> = (props) => <Picker data={data} {...props} />;

        return { default: Wrapped };
    },
    'EmojiPicker',
    <div className="px-2 py-1 text-[11px] text-white/60">…</div>
);

export const LazyEmojiPicker: FC<EmojiPickerProps> = (props) => <PickerWithData {...props} />;
