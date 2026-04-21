import GoogleSheetsClient from '#captain/Integrations/GoogleSheets.js';
import {
    CHALLENGE_CATEGORIES,
    CATEGORY_ORDER,
    CategoryLetter,
    categoryFromChallengeId,
} from '#captain/Globetrotter/2026/Categories.js';
import {
    CategoryRollup,
    Challenge,
    LogRow,
    Rank,
    RepeatableRow,
    UserSummary,
} from '#captain/Globetrotter/2026/types.js';

const RANGES = {
    users: 'Users!A2:B',
    challenges: 'Challenges!A2:D',
    log: 'ChallengeLog!A2:C',
} as const;

function rankFromPoints(points: number): Rank {
    if (points >= 300) return 'Gold';
    if (points >= 200) return 'Silver';
    if (points >= 100) return 'Bronze';
    return 'None';
}

function parseChallenge(row: string[]): Challenge | null {
    const [id, name, pointsStr, repeatable] = row;
    if (!id) return null;
    return {
        id: id.trim(),
        name: name?.trim() ?? '',
        points: parseInt(pointsStr ?? '0', 10) || 0,
        repeatable: (repeatable ?? '').trim().toLowerCase() === 'yes',
    };
}

export default class GlobetrotterSummary {
    constructor(
        private readonly sheets: GoogleSheetsClient,
        private readonly spreadsheetId: string,
    ) {}

    async getByDiscordId(discordId: string): Promise<UserSummary | null> {
        const [usersRaw, challengesRaw, logRaw] = await this.sheets.batchGet(this.spreadsheetId, [
            RANGES.users,
            RANGES.challenges,
            RANGES.log,
        ]);

        const username = usersRaw
            .find((row) => (row[1] ?? '').trim() === discordId)?.[0]
            ?.trim();

        if (!username) return null;

        const challengesById = new Map<string, Challenge>();
        for (const row of challengesRaw) {
            const c = parseChallenge(row);
            if (c) challengesById.set(c.id, c);
        }

        const log: LogRow[] = logRaw
            .filter((row) => (row[1] ?? '').trim() === username && (row[2] ?? '').trim() !== '')
            .map((row) => {
                const challengeId = row[2].trim();
                const challenge = challengesById.get(challengeId);
                return {
                    date: (row[0] ?? '').trim(),
                    challengeId,
                    challengeName: challenge?.name ?? '',
                    points: challenge?.points ?? 0,
                };
            });

        const totalSubmissions = log.length;
        const totalPoints = log.reduce((sum, row) => sum + row.points, 0);

        const nonRecurringTotal = [...challengesById.values()].filter((c) => !c.repeatable).length;
        const completedNonRecurring = new Set<string>();
        let recurringSubmissions = 0;
        for (const row of log) {
            const challenge = challengesById.get(row.challengeId);
            if (!challenge) continue;
            if (challenge.repeatable) recurringSubmissions += 1;
            else completedNonRecurring.add(challenge.id);
        }

        const repeatable: RepeatableRow[] = [...challengesById.values()]
            .filter((c) => c.repeatable)
            .map((c) => ({
                id: c.id,
                name: c.name,
                count: log.filter((r) => r.challengeId === c.id).length,
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const categoryMap = new Map<CategoryLetter, CategoryRollup>();
        for (const letter of CATEGORY_ORDER) {
            categoryMap.set(letter, {
                letter,
                name: CHALLENGE_CATEGORIES[letter],
                completed: 0,
                total: 0,
            });
        }
        for (const challenge of challengesById.values()) {
            const letter = categoryFromChallengeId(challenge.id);
            if (!letter) continue;
            categoryMap.get(letter)!.total += 1;
        }
        const seenPerCategory = new Map<CategoryLetter, Set<string>>();
        for (const row of log) {
            const letter = categoryFromChallengeId(row.challengeId);
            if (!letter) continue;
            let seen = seenPerCategory.get(letter);
            if (!seen) {
                seen = new Set<string>();
                seenPerCategory.set(letter, seen);
            }
            if (seen.has(row.challengeId)) continue;
            seen.add(row.challengeId);
            categoryMap.get(letter)!.completed += 1;
        }

        return {
            username,
            totalSubmissions,
            totalPoints,
            rank: rankFromPoints(totalPoints),
            nonRecurringCompleted: completedNonRecurring.size,
            nonRecurringTotal,
            recurringSubmissions,
            repeatable,
            categories: [...categoryMap.values()],
            log,
        };
    }
}
