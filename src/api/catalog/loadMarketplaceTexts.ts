import { GetLocalizationManager, VoltLogger } from '@volt/renderer';

const marketplaceTextsUrl = () => new URL('configuration/marketplace-texts.json', document.baseURI).toString();

export const fetchMarketplaceTexts = async (): Promise<Record<string, unknown> | null> =>
{
    const url = marketplaceTextsUrl();

    try
    {
        const dataCache = (globalThis as {
            __voltPrefetchData?: Map<string, Promise<{ ok: boolean; status: number; json?: unknown; text?: string }>>;
        }).__voltPrefetchData;
        const prefetchedData = dataCache?.get(url);

        if (prefetchedData)
        {
            dataCache.delete(url);

            const entry = await prefetchedData;

            if (!entry?.ok) throw new Error(`HTTP ${entry?.status ?? 'no response'}`);
            if (entry.json !== undefined) return entry.json as Record<string, unknown>;
            if (typeof entry.text === 'string') return JSON.parse(entry.text) as Record<string, unknown>;
        }

        const cache = (globalThis as { __voltPrefetchCache?: Map<string, Promise<Response>> }).__voltPrefetchCache;
        const prefetched = cache?.get(url);

        if (prefetched) cache.delete(url);

        const response = await (prefetched ?? fetch(url));

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return (await response.json()) as Record<string, unknown>;
    }
    catch (error)
    {
        VoltLogger.warn(`[Localization] Marketplace texts unavailable at ${url}; the default texts stay in use`, error);
        return null;
    }
};

export const applyMarketplaceTexts = (texts: Record<string, unknown> | null): void =>
{
    if (!texts) return;

    const localization = GetLocalizationManager();

    for (const [key, value] of Object.entries(texts))
    {
        if (typeof value === 'string') localization.setValue(key, value);
    }
};

/**
 * Supplemental marketplace texts (public/configuration/marketplace-texts.json), applied over the loaded localization.
 * They are optional: a hotel whose configuration host does not serve the file keeps the default texts and still boots.
 */
export const loadMarketplaceTexts = async (): Promise<void> =>
{
    applyMarketplaceTexts(await fetchMarketplaceTexts());
};
