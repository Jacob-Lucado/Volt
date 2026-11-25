import { GetLocalizationManager, VoltLogger } from '@volt/renderer';

let wiredTextsPromise: Promise<void> | null = null;

/**
 * Shipped texts (public/configuration/wired-texts.json), mostly taken from Habbo's external texts.
 * They only fill keys the hotel's own texts lack, so a hotel can still override any of them in its gamedata.
 * The file is optional: a hotel whose configuration host does not serve it still boots.
 */
export const loadWiredTexts = async (): Promise<void> =>
{
    const url = new URL('configuration/wired-texts.json', document.baseURI).toString();

    try
    {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const texts = (await response.json()) as Record<string, unknown>;
        const localization = GetLocalizationManager();
        let addedAny = false;

        for (const [key, value] of Object.entries(texts))
        {
            if (typeof value === 'string' && !localization.hasValue(key))
            {
                localization.setValue(key, value);
                addedAny = true;
            }
        }

        if (addedAny && typeof window !== 'undefined')
        {
            window.dispatchEvent(new CustomEvent('volt-localization-updated'));
        }
    }
    catch (error)
    {
        VoltLogger.warn(`[Localization] Shipped texts unavailable at ${url}; missing keys stay unlocalized`, error);
    }
};

/** Starts or joins the one-time background load of shipped wired fallback texts. */
export const ensureWiredTextsLoaded = (): Promise<void> =>
    (wiredTextsPromise ??= loadWiredTexts());
