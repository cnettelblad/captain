import { prisma } from '#captain/Services/Prisma.js';
import countries from '#captain/Data/countries.json' with { type: 'json' };
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
    async addOrUpdateCountry(userId, countryCode, visitedAt, note) {
        const updateData = {};
        if (visitedAt !== null)
            updateData.visitedAt = visitedAt;
        if (note !== null)
            updateData.note = note;
        return prisma.userCountry.upsert({
            where: { userId_countryCode: { userId, countryCode } },
            create: { userId, countryCode, visitedAt, note },
            update: updateData,
        });
    }
    async removeCountry(userId, countryCode) {
        return prisma.userCountry.delete({
            where: { userId_countryCode: { userId, countryCode } },
        });
    }
    async getUserCountries(userId) {
        return prisma.userCountry.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
