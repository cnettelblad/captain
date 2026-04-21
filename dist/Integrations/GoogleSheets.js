export default class GoogleSheetsClient {
    apiKey;
    cacheTtlMs;
    cache = new Map();
    constructor(apiKey, cacheTtlMs = 60_000) {
        this.apiKey = apiKey;
        this.cacheTtlMs = cacheTtlMs;
    }
    async batchGet(spreadsheetId, ranges) {
        const cacheKey = `${spreadsheetId}:${ranges.join('|')}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }
        const params = new URLSearchParams();
        for (const range of ranges)
            params.append('ranges', range);
        params.set('key', this.apiKey);
        params.set('majorDimension', 'ROWS');
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Google Sheets API ${res.status}: ${body}`);
        }
        const body = (await res.json());
        const data = ranges.map((_, i) => body.valueRanges[i]?.values ?? []);
        this.cache.set(cacheKey, { data, expiresAt: now + this.cacheTtlMs });
        return data;
    }
}
