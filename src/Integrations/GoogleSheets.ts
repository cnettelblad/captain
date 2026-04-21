interface BatchGetResponse {
    spreadsheetId: string;
    valueRanges: {
        range: string;
        majorDimension: 'ROWS';
        values?: string[][];
    }[];
}

interface CacheEntry {
    data: string[][][];
    expiresAt: number;
}

export default class GoogleSheetsClient {
    private cache = new Map<string, CacheEntry>();

    constructor(
        private readonly apiKey: string,
        private readonly cacheTtlMs: number = 60_000,
    ) {}

    async batchGet(spreadsheetId: string, ranges: string[]): Promise<string[][][]> {
        const cacheKey = `${spreadsheetId}:${ranges.join('|')}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }

        const params = new URLSearchParams();
        for (const range of ranges) params.append('ranges', range);
        params.set('key', this.apiKey);
        params.set('majorDimension', 'ROWS');

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            spreadsheetId,
        )}/values:batchGet?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Google Sheets API ${res.status}: ${body}`);
        }

        const body = (await res.json()) as BatchGetResponse;
        const data = ranges.map((_, i) => body.valueRanges[i]?.values ?? []);
        this.cache.set(cacheKey, { data, expiresAt: now + this.cacheTtlMs });
        return data;
    }
}
