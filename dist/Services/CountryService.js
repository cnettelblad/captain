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
    async addOrUpdateCountry(userId, countryCode, visitedAt, note) {
        const changes = [];
        const existing = await prisma.userCountry.findUnique({
            where: { userId_countryCode: { userId, countryCode } },
        });
        if (!existing) {
            await prisma.userCountry.create({ data: { userId, countryCode, visitedAt, note } });
            changes.push({ code: countryCode, action: 'created' });
        }
        else {
            const updateData = {};
            if (visitedAt !== null)
                updateData.visitedAt = visitedAt;
            if (note !== null)
                updateData.note = note;
            if (Object.keys(updateData).length > 0) {
                await prisma.userCountry.update({
                    where: { userId_countryCode: { userId, countryCode } },
                    data: updateData,
                });
                changes.push({ code: countryCode, action: 'updated' });
            }
        }
        const country = this.resolveCountry(countryCode);
        if (country && !country.un && country.parent) {
            const parentExists = await prisma.userCountry.findUnique({
                where: { userId_countryCode: { userId, countryCode: country.parent } },
            });
            if (!parentExists) {
                await prisma.userCountry.create({ data: { userId, countryCode: country.parent } });
                changes.push({ code: country.parent, action: 'created' });
            }
        }
        return changes;
    }
    getTerritoryCount() {
        return countries.filter((c) => !c.un).length;
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
    async getCountryUsers(countryCode) {
        return prisma.userCountry.findMany({
            where: { countryCode },
            orderBy: { createdAt: 'asc' },
        });
    }
}
