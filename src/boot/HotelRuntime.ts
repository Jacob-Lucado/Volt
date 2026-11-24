import 'pixi.js/browser';
import {
    GetAssetManager, GetAvatarRenderManager, GetCommunication, GetConfiguration, GetDesiredResolution,
    GetLocalizationManager, GetRoomContentLoader, GetRoomEngine, GetRoomSessionManager, GetSessionDataManager,
    GetSoundManager, GetTicker, PrepareRenderer, VoltLogger
} from '@volt/renderer';
import { DerivedPetConfig } from '../api/volt/PetData';
import { applyMarketplaceTexts, fetchMarketplaceTexts } from '../api/catalog/loadMarketplaceTexts';
import { ensureWiredTextsLoaded } from '../api/wired/loadWiredTexts';

type ProgressListener = (percent: number) => void;

let runtime: ReturnType<typeof prepareHotelRuntime> | undefined;
let currentProgress = 10;
const progressListeners = new Set<ProgressListener>();

const reportProgress = (percent: number) => {
    if (percent > currentProgress) {
        currentProgress = percent;
        progressListeners.forEach((listener) => listener(currentProgress));
    }
};

const phase = async <T>(name: string, task: () => Promise<T>, weight?: number): Promise<T> => {
    performance.mark(`volt:${name}:start`);
    const result = await task();
    performance.mark(`volt:${name}:end`);
    if (weight) reportProgress(Math.min(95, currentProgress + weight));
    return result;
};

export interface BootstrapConfigOptions {
    rendererConfigUrl: string;
    uiConfigUrl: string;
    inlineRendererConfig: Record<string, unknown> | null;
    inlineUiConfig: Record<string, unknown> | null;
    petConfig: DerivedPetConfig | null;
    ssoTicket: string;
    preconnectUrls: (urls: string[]) => void;
    setBootDebug: (message: string) => void;
}

export const bootstrapHotelConfiguration = async (options: BootstrapConfigOptions): Promise<void> => {
    const { rendererConfigUrl, uiConfigUrl, inlineRendererConfig, inlineUiConfig, petConfig, ssoTicket, preconnectUrls, setBootDebug } = options;
    const config = GetConfiguration();

    if (inlineRendererConfig !== null) config.preloadDocument(rendererConfigUrl, inlineRendererConfig);
    if (inlineUiConfig !== null) config.preloadDocument(uiConfigUrl, inlineUiConfig);

    try {
        await config.init();
        setBootDebug('boot: configuration init done');
    } catch (error) {
        setBootDebug(`boot: configuration init failed ${(error as Error)?.message || error}`);
    }

    preconnectUrls(
        ['asset.url', 'gamedata.url', 'image.library.url', 'images.url', 'furnidata.url', 'api.url'].map((key) => {
            const value = config.getValue<string>(key, '');

            return value ? config.interpolate(value) : '';
        })
    );

    // With a hand-off ticket, log in now while React and the UI bundle evaluate.
    if (ssoTicket) {
        const communicationInit = GetCommunication().init();

        communicationInit.catch(() => {});
        (window as any).__voltEarlyCommunicationInit = communicationInit;
        setBootDebug('boot: socket started');
    }

    if (petConfig) {
        Object.assign((window as any).VoltConfig, petConfig);
        config.parseConfiguration(petConfig, true);
    }
};

const prepareHotelRuntime = async (width: number, height: number) => {
    await GetConfiguration().init();
    const config = GetConfiguration();
    GetTicker().maxFPS = config.getValue<number>('system.fps.max', 60);
    VoltLogger.LOG_DEBUG = config.getValue<boolean>('system.log.debug', true);
    VoltLogger.LOG_WARN = config.getValue<boolean>('system.log.warn', false);
    VoltLogger.LOG_ERROR = config.getValue<boolean>('system.log.error', false);
    VoltLogger.LOG_EVENTS = config.getValue<boolean>('system.log.events', false);
    VoltLogger.LOG_PACKETS = config.getValue<boolean>('system.log.packets', false);

    const rawUseBackBuffer = window.VoltConfig?.['renderer.useBackBuffer'];
    const renderer = phase('renderer', () => PrepareRenderer({
        width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)),
        resolution: GetDesiredResolution(), autoDensity: true, backgroundAlpha: 0,
        preference: 'webgl', eventMode: 'none', failIfMajorPerformanceCaveat: false,
        roundPixels: true, skipExtensionImports: true,
        useBackBuffer: rawUseBackBuffer === undefined || rawUseBackBuffer === true || rawUseBackBuffer === 'true'
    }), 15);
    const configuredAssets = config.getValue<unknown>('preload.assets.urls');
    const assetUrls = (Array.isArray(configuredAssets) ? configuredAssets : [configuredAssets])
        .filter((value): value is string => typeof value === 'string' && !!value)
        .map(value => config.interpolate(value));

    // Fetch supplemental marketplace texts alongside base localization instead of serially after it.
    const marketplaceTextsFetch = fetchMarketplaceTexts();
    const localization = phase('localization', async () => {
        const [, marketplaceTexts] = await Promise.all([GetLocalizationManager().init(), marketplaceTextsFetch]);
        applyMarketplaceTexts(marketplaceTexts);
        // Shipped wired fallback texts only backfill missing keys; warm in the background without blocking boot.
        void ensureWiredTextsLoaded();
    }, 15);

    const session = phase('session-data', () => GetSessionDataManager().init(localization), 20);
    const avatars = phase('avatars', () => GetAvatarRenderManager().init(), 15);
    // Built-in images and mandatory room libraries decode in parallel with renderer and session data.
    const assets = phase('assets', () => GetAssetManager().downloadAssets(assetUrls), 10);
    const mandatoryRoomAssets = typeof GetRoomContentLoader().preloadMandatoryLibraries === 'function'
        ? GetRoomContentLoader().preloadMandatoryLibraries()
        : Promise.resolve();
    const rooms = Promise.all([renderer, session, mandatoryRoomAssets]).then(() => phase('rooms', async () => {
        await GetRoomSessionManager().init();
        await GetRoomEngine().init();
    }, 15));

    // All handlers and mandatory assets must exist before App mounts MainView,
    // which releases the connection's queued login packets.
    const [readyRenderer] = await Promise.all([renderer, localization, session, avatars, assets, rooms, GetSoundManager().init()]);
    reportProgress(95);
    performance.mark('volt:runtime-ready');
    return readyRenderer;
};

/** Bootstrap and React (including StrictMode) share one engine initialization. */
export const startHotelRuntime = (width: number, height: number, onProgress?: ProgressListener) => {
    if (onProgress) {
        progressListeners.add(onProgress);
        onProgress(currentProgress);
    }

    const promise = (runtime ??= prepareHotelRuntime(width, height));

    if (onProgress) {
        promise.finally(() => progressListeners.delete(onProgress));
    }

    return promise;
};
