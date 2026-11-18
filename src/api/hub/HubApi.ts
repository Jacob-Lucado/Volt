import { GetConfiguration } from '@volt/renderer';

export interface HubDaily {
    claimed: boolean;
    streak: number;
    best_streak: number;
    total_claims: number;
    amount: number;
}

export interface HubRiddle {
    question: string;
    hint: string | null;
    reward: number;
    solved: boolean;
    solvers: number;
}

export interface HubEvent {
    title: string;
    location: string | null;
    starts_at: string;
}

export interface HubPoll {
    question: string;
    choices: { label: string; votes: number }[];
    voted: number | null;
}

export interface HubNews {
    title: string;
    category: string;
    body: string;
    published_at: string | null;
}

export interface HubState {
    news?: HubNews | null;
    daily: HubDaily;
    poll?: HubPoll | null;
    riddle: HubRiddle | null;
    event: HubEvent | null;
}

export interface HubActionResult {
    ok: boolean;
    message: string;
    daily?: HubDaily;
    riddle?: HubRiddle | null;
    poll?: HubPoll | null;
}

const getBase = (): string => {
    let configured = '/client-hub';

    try {
        const config = GetConfiguration();

        configured = config.interpolate(config.getValue<string>('hub.endpoint', configured));
    } catch {
        // Fall back to the same-origin default when the configuration is not loaded yet.
    }

    return configured.replace(/\/$/, '');
};

/** The CMS sets its CSRF token as a readable cookie; it must come back as a header on every write. */
export const readXsrfToken = (cookies: string = document.cookie): string => {
    const match = cookies.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> => {
    const response = await fetch(`${getBase()}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.method && init.method !== 'GET' ? { 'X-XSRF-TOKEN': readXsrfToken() } : {})
        }
    });

    const text = await response.text();
    let body: T = null;

    try {
        body = text ? (JSON.parse(text) as T) : null;
    } catch {
        body = null;
    }

    return { status: response.status, body };
};

export const fetchHubState = async (): Promise<HubState> => {
    const { status, body } = await request<HubState>('');

    if (status < 200 || status >= 300 || !body) throw new Error(`hub_${status}`);

    return body;
};

const action = async (path: string, payload?: object): Promise<HubActionResult> => {
    const { status, body } = await request<HubActionResult>(path, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined });

    if (body && typeof body.message === 'string') return body;

    return { ok: false, message: status === 429 ? 'Slow down a little and try again.' : 'Something went wrong. Try again.' };
};

export const claimHubDaily = (): Promise<HubActionResult> => action('/daily');

export const answerHubRiddle = (answer: string): Promise<HubActionResult> => action('/riddle', { answer });

export const voteHubPoll = (option: number): Promise<HubActionResult> => action('/poll', { option });

export interface HubRareValue {
    name: string;
    credits: string | null;
    other: string | null;
    other_label: string | null;
}

export const searchHubValues = async (term: string): Promise<HubRareValue[]> => {
    const { status, body } = await request<{ results: HubRareValue[] }>(`/values?q=${encodeURIComponent(term)}`);

    if (status < 200 || status >= 300 || !body) throw new Error(`hub_${status}`);

    return body.results ?? [];
};
