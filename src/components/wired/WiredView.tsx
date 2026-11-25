import { FC, useCallback } from 'react';
import { ensureWiredTextsLoaded } from '../../api/wired/loadWiredTexts';
import { lazyWindow } from '../../common/lazyWindow';
import { useWired } from '../../hooks';

const LazyWiredEditorContent = lazyWindow(async () => {
    const [, module] = await Promise.all([ensureWiredTextsLoaded(), import('./WiredEditorContent')]);

    return { default: module.WiredEditorContent };
}, 'WiredEditor');

export const WiredView: FC<{}> = () => {
    const { trigger = null, setTrigger = null } = useWired();
    const handleChunkError = useCallback(() => setTrigger?.(null), [setTrigger]);

    if (!trigger) return null;

    return <LazyWiredEditorContent onChunkError={handleChunkError} />;
};
