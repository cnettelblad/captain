import { prisma } from '../Services/Prisma.js';
import countries from '../Data/countries.json' with { type: 'json' };
export default class CountryService {
    resolveCountry(input) {
        const normalized = input.trim();
        const byCode = countries.find((c) => c.code.toLowerCase() === normalized.toLowerCase());
        if (byCode)
            return byCode;
        const byEmoji = countries.find((c) => c.emoji === normalized);
        if (byEmoji)
            return byEmoji;
        const byName = countries.find((c) => c.name.toLowerCase() === normalized.toLowerCase());
        if (byName)
            return byName;
        return null;
    }
    /**
     * Returns all countries whose name partially matches the input.
     */
    resolvePartial(input) {
        const normalized = input.trim().toLowerCase();
        return countries.filter((c) => c.name.toLowerCase().includes(normalized));
    }
    async addCountry(userId, countryCode, visitedAt, note) {
        return prisma.userCountry.create({
            data: {
                userId,
                countryCode,
                visitedAt,
                note,
            },
        });
    }
    async getUserCountries(userId) {
        return prisma.userCountry.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
