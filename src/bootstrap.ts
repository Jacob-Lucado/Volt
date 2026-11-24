import { derivePetConfig, DerivedPetConfig, PetDefinition } from './api/volt/PetData';
import { parseJsonDocument, UiJsonMode } from './json/JsonDocumentParser';
import { configFileUrl, getClientMode, installSecureFetch } from './secure-assets';

declare const __VOLT_JSON_MODE__: UiJsonMode | undefined;

const resolveJsonMode = (): UiJsonMode => {
    try {
        if (typeof __VOLT_JSON_MODE__ !== 'undefined' && __VOLT_JSON_MODE__) {
            if (__VOLT_JSON_MODE__ === 'legacy' || __VOLT_JSON_MODE__ === 'jsonc' || __VOLT_JSON_MODE__ === 'auto') return __VOLT_JSON_MODE__;
        }
    } catch {}

    return 'auto';
};

const ensureMobileViewport = () => {
    let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }

    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
};

// Before any request: take the website's SSO ticket out of the URL. The production loader
// (configuration/bootstrap.js) has usually done that already and left it in memory.
const takeSsoTicket = (): string => {
    const handedOver = window.__voltLaunchCredentials?.ssoTicket;

    if (handedOver !== undefined) {
        delete window.__voltLaunchCredentials;

        return handedOver;
    }

    const url = new URL(window.location.href);
    const ssoTicket = url.searchParams.get('sso') || '';

    if (url.searchParams.has('sso')) {
        url.searchParams.delete('sso');
        window.history.replaceState(window.history.state, '', url.toString());
    }

    return ssoTicket;
};

const ssoTicket = takeSsoTicket();

ensureMobileViewport();

const setBootDebug = (message: string) => {
    try {
        (window as any).__voltBootDebug = message;
        const secureNode = document.getElementById('volt-secure-debug');

        if (secureNode) secureNode.textContent = `${secureNode.textContent}\n${message}`;
    } catch {}
};

const deployBaseUrl = (): string => {
    try {
        const loaderBase = (window as any).__voltLoaderBase;
        if (typeof loaderBase === 'string' && loaderBase.length) return new URL('..', loaderBase).toString();
    } catch {}

    try {
        const moduleUrl = (import.meta as any).url;
        if (typeof moduleUrl === 'string' && moduleUrl.length) return new URL('..', new URL('.', moduleUrl)).toString();
    } catch {}

    try {
        const base = (import.meta as any).env?.BASE_URL;
        if (typeof base === 'string' && base.length) {
            const trimmed = base.replace(/^\/+/, '').replace(/\/+$/, '');
            return trimmed ? `${window.location.origin}/${trimmed}/` : `${window.location.origin}/`;
        }
    } catch {}

    return `${window.location.origin}/`;
};

// Reuse documents already parsed by index.html's inline prefetcher, or parse the SSI block once.
const readBootDocument = <T = unknown>(name: string): T | null => {
    const preParsed = (window as any).__voltBootParsed as Record<string, unknown> | undefined;

    if (preParsed && Object.prototype.hasOwnProperty.call(preParsed, name)) {
        return (preParsed[name] ?? null) as T | null;
    }

    const text = document.getElementById(`volt-boot-${name}`)?.textContent?.trim();

    if (!text || text.startsWith('<!--')) return null;

    try {
        return parseJsonDocument(text, resolveJsonMode(), `${name}.json`) as T;
    } catch {
        setBootDebug(`boot: inline ${name} unusable, fetching it`);

        return null;
    }
};

const loadClientMode = async () => {
    try {
        if ((window as any).__voltClientMode) return;

        const inline = readBootDocument<Record<string, unknown>>('client-mode');

        if (inline && typeof inline === 'object') {
            (window as any).__voltClientMode = inline;
            setBootDebug('boot: client-mode inline');

            return;
        }

        const url = new URL('configuration/client-mode.json', deployBaseUrl());
        url.searchParams.set('v', Date.now().toString(36));

        const response = await fetch(url.toString());

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const mode = resolveJsonMode();

        (window as any).__voltClientMode = parseJsonDocument(text, mode, url.toString());
        setBootDebug(`boot: client-mode loaded (mode=${mode})`);
    } catch (error) {
        setBootDebug(`boot: client-mode fallback ${error?.message || error}`);
    }
};

// Boot documents are plain files; a secure-assets deploy serves its configuration encrypted instead.
const inlineConfigDocument = <T = unknown>(name: string): T | null =>
    (getClientMode().secureAssetsEnabled ? null : readBootDocument<T>(name));

const loadPetConfig = async (): Promise<DerivedPetConfig | null> => {
    try {
        const url = configFileUrl('pets.json', true);
        let parsed = inlineConfigDocument<{ pets?: unknown } | unknown[]>('pets');

        if (parsed === null) {
            const response = await fetch(url);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            parsed = parseJsonDocument(text, resolveJsonMode(), url) as { pets?: unknown } | unknown[];
        }
        const list = Array.isArray(parsed) ? parsed : (parsed as { pets?: unknown })?.pets;
        const derived = derivePetConfig(list as PetDefinition[]);

        setBootDebug(derived ? 'boot: pet config loaded' : 'boot: pets.json empty, using config pet.types');

        return derived;
    } catch (error) {
        setBootDebug(`boot: pets.json fallback ${error?.message || error}`);

        return null;
    }
};

const preconnectUrls = (values: string[]) => {
    const origins = new Set<string>();

    for (const value of values) {
        try {
            const origin = value ? new URL(value, window.location.href).origin : '';

            if (origin && origin !== window.location.origin && origin.startsWith('http')) origins.add(origin);
        } catch {}
    }

    for (const origin of origins) {
        if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;

        const link = document.createElement('link');

        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }
};

const interpolateRawConfig = (
    value: string,
    defs: Record<string, unknown>,
    gamedataVersions: Record<string, string> | null
): string => {
    let resolved = value.replace(/\$\{(.*?)\}/g, (match, key) => {
        const entry = defs[key];

        return typeof entry === 'string' && entry.length ? entry : match;
    });

    if (resolved.includes('%timestamp%') && gamedataVersions) {
        const file = resolved.split(/[?#]/, 1)[0].split('/').pop();
        const version = file ? gamedataVersions[file] : null;

        if (typeof version === 'string' && version.length) {
            resolved = resolved.replace(/([?&])t=%timestamp%/i, `$1v=${encodeURIComponent(version)}`);
        }
    }

    return resolved;
};

const startEarlySocket = (socketUrl: string) => {
    if (!socketUrl || !/^wss?:\/\//i.test(socketUrl)) return;

    try {
        const socket = new WebSocket(socketUrl);
        socket.binaryType = 'arraybuffer';

        const early = {
            url: socketUrl,
            socket,
            opened: false,
            closed: null as CloseEvent | null,
            errored: false,
            messages: [] as ArrayBuffer[],
            detach: () => {}
        };
        const onOpen = () => { early.opened = true; };
        const onClose = (event: CloseEvent) => { early.closed = event; };
        const onError = () => { early.errored = true; };
        const onMessage = (event: MessageEvent) => {
            if (event.data instanceof ArrayBuffer) early.messages.push(event.data);
        };

        socket.addEventListener('open', onOpen);
        socket.addEventListener('close', onClose);
        socket.addEventListener('error', onError);
        socket.addEventListener('message', onMessage);

        early.detach = () => {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('close', onClose);
            socket.removeEventListener('error', onError);
            socket.removeEventListener('message', onMessage);
        };

        (globalThis as any).__voltEarlySocket = early;
    } catch {}
};

const prefetchBootResources = (
    rendererConfig: Record<string, unknown>,
    uiConfig: Record<string, unknown> | null,
    furnidataVersion: string | null,
    gamedataVersions: Record<string, string> | null
) => {
    // Resolve flat base strings once so nested ${asset.url} / ${gamedata.url} references expand cleanly.
    const defs: Record<string, unknown> = { ...(uiConfig || {}), ...rendererConfig };

    for (let pass = 0; pass < 2; pass++) {
        for (const [key, val] of Object.entries(defs)) {
            if (typeof val === 'string' && val.includes('${')) {
                defs[key] = interpolateRawConfig(val, defs, gamedataVersions);
            }
        }
    }

    preconnectUrls(
        ['asset.url', 'gamedata.url', 'image.library.url', 'images.url', 'furnidata.url', 'api.url']
            .map((key) => (typeof defs[key] === 'string' ? (defs[key] as string) : ''))
    );

    if (ssoTicket && !defs['crypto.ws.enabled'] && typeof defs['socket.url'] === 'string' && !(globalThis as any).__voltEarlySocket) {
        startEarlySocket(defs['socket.url']);
    }

    const cache: Map<string, Promise<Response>> = (globalThis as any).__voltPrefetchCache ?? new Map<string, Promise<Response>>();
    (globalThis as any).__voltPrefetchCache = cache;
    const dataCache: Map<string, Promise<unknown>> | undefined = (globalThis as any).__voltPrefetchData;

    const warm = (url: string) => {
        if (!url || url.includes('%timestamp%') || url.includes('${') || cache.has(url) || dataCache?.has(url)) return;

        const pending = fetch(url);
        pending.catch(() => cache.delete(url));
        cache.set(url, pending);
    };

    // Furnidata with version hash matches GetFurnitureDataUrl(true).
    if (typeof defs['furnidata.url'] === 'string') {
        let furniUrl = interpolateRawConfig(defs['furnidata.url'], defs, gamedataVersions);

        if (furnidataVersion) {
            try {
                const u = new URL(furniUrl, window.location.href);
                u.searchParams.delete('t');
                u.searchParams.set('v', furnidataVersion);
                furniUrl = u.toString();
            } catch {}
        }

        warm(furniUrl);
    }

    for (const key of ['productdata.url', 'avatar.actions.url', 'avatar.figuredata.url', 'avatar.figuremap.url', 'avatar.effectmap.url']) {
        if (typeof defs[key] === 'string') warm(interpolateRawConfig(defs[key] as string, defs, gamedataVersions));
    }

    const externalTexts = defs['external.texts.url'];
    if (Array.isArray(externalTexts)) {
        for (const entry of externalTexts) {
            if (typeof entry !== 'string' || !entry) break;
            warm(interpolateRawConfig(entry, defs, gamedataVersions));
        }
    }

    const preloadAssets = defs['preload.assets.urls'];
    for (const entry of (Array.isArray(preloadAssets) ? preloadAssets : [preloadAssets])) {
        if (typeof entry === 'string' && entry) warm(interpolateRawConfig(entry, defs, gamedataVersions));
    }

    warm(new URL('configuration/marketplace-texts.json', document.baseURI).toString());

    // Pre-fetch mandatory avatar bundles in the configured bundle format alongside FigureMap.json.
    const bundleFormat = String(defs['asset.bundle.format'] || 'hab').trim().toLowerCase() === 'nitro' ? 'nitro' : 'hab';
    const withBundleFormat = (url: string) => url.replace(/\.(?:hab|nitro)(?=$|[?#])/i, `.${bundleFormat}`);
    let warmedAvatars = false;
    try {
        const cachedAvatarUrls = JSON.parse(window.localStorage?.getItem('volt.boot.mandatoryAvatarUrls') || 'null');
        if (Array.isArray(cachedAvatarUrls)) {
            for (const url of cachedAvatarUrls) {
                if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
                    warm(withBundleFormat(url));
                    warmedAvatars = true;
                }
            }
        }
    } catch {}
    if (!warmedAvatars && typeof defs['avatar.asset.url'] === 'string') {
        const template = interpolateRawConfig(defs['avatar.asset.url'] as string, defs, gamedataVersions);
        for (const lib of ['hh_human_body', 'hh_human_item']) {
            warm(withBundleFormat(template.replace(/%libname%/gi, lib)));
        }
    }
};

await loadClientMode();

installSecureFetch();
setBootDebug('boot: secure fetch installed');

const search = new URLSearchParams(window.location.search);
const clientMode = getClientMode();

(window as any).VoltSecureApiUrl = clientMode.apiBaseUrl || window.location.origin;
(window as any).VoltClientMode = clientMode;
const rendererConfigUrl = configFileUrl('renderer-config.json', true);
const uiConfigUrl = configFileUrl('ui-config.json', true);

const inlineRendererConfig = inlineConfigDocument<Record<string, unknown>>('renderer-config');
const inlineUiConfig = inlineConfigDocument<Record<string, unknown>>('ui-config');

const furnidataVersion = (() => {
    const parsed = inlineConfigDocument<{ version?: unknown }>('furnidata-version');
    const version = parsed?.version;

    return typeof version === 'string' && /^[0-9a-f]{8,64}$/i.test(version) ? version : null;
})();

const gamedataVersions = (() => {
    const parsed = inlineConfigDocument<{ files?: unknown }>('gamedata-versions');
    const files = parsed?.files;

    if (!files || typeof files !== 'object') return null;

    const versions = Object.fromEntries(
        Object.entries(files as Record<string, unknown>).filter(
            ([file, version]) => file && typeof version === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(version)
        )
    ) as Record<string, string>;

    return Object.keys(versions).length ? versions : null;
})();

(window as any).VoltConfig = {
    'config.urls': [rendererConfigUrl, uiConfigUrl],
    ...(furnidataVersion ? { 'furnidata.version': furnidataVersion } : {}),
    ...(gamedataVersions ? { 'gamedata.versions': gamedataVersions } : {}),
    'sso.ticket': ssoTicket || null,
    'forward.type': search.get('room') ? 2 : -1,
    'forward.id': search.get('room') || 0,
    'friend.id': search.get('friend') || 0
};

// Legacy aliases so external scripts written against the old Nitro globals keep working
(window as any).NitroConfig = (window as any).VoltConfig;
(window as any).NitroClientMode = clientMode;
(window as any).NitroSecureApiUrl = (window as any).VoltSecureApiUrl;

setBootDebug('boot: VoltConfig assigned');

// Open preconnects, WebSocket, and gamedata fetches immediately before the renderer and React chunks finish evaluating.
if (inlineRendererConfig && !clientMode.secureAssetsEnabled) {
    prefetchBootResources(inlineRendererConfig, inlineUiConfig, furnidataVersion, gamedataVersions);
}

// Download and evaluate the runtime and React bundles in parallel while gamedata and the WebSocket are already in flight.
const runtimeModule = import('./boot/HotelRuntime');
const appModule = import('./index');
runtimeModule.catch(() => {});
appModule.catch(() => {});

const petConfigLoad = loadPetConfig();

const [{ bootstrapHotelConfiguration, startHotelRuntime }, petConfig] = await Promise.all([runtimeModule, petConfigLoad]);

await bootstrapHotelConfiguration({
    rendererConfigUrl,
    uiConfigUrl,
    inlineRendererConfig,
    inlineUiConfig,
    petConfig,
    ssoTicket,
    preconnectUrls,
    setBootDebug
});

if (ssoTicket) {
    const viewport = window.visualViewport;
    startHotelRuntime(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight).catch(() => {});
}

appModule
    .then(({ mountApp }) => {
        mountApp();
        setBootDebug('boot: app mounted');
    })
    .catch((error) => {
        setBootDebug(`boot: import failed ${error?.message || error}`);
        throw error;
    });
