import { FC, lazy, Suspense } from 'react';
import { ensureWiredTextsLoaded } from '../../api/wired/loadWiredTexts';
import { useWired } from '../../hooks';

const LazyWiredEditorContent = lazy(async () => {
    const [, module] = await Promise.all([ensureWiredTextsLoaded(), import('./WiredEditorContent')]);

    return { default: module.WiredEditorContent };
});

export const WiredView: FC<{}> = () => {
    const { trigger = null } = useWired();

    if (!trigger) return null;

    return (
        <Suspense fallback={null}>
            <LazyWiredEditorContent />
        </Suspense>
    );
};
