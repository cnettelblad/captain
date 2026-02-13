import { prisma } from '#captain/Services/Prisma.js';
import countries from '#captain/Data/countries.json' with { type: 'json' };

export interface Country {
    name: string;
    code: string;
    emoji: string;
    un: boolean;
    parent: string | null;
}

export default class CountryService {
    public resolveCountry(input: string): Country | null {
        const normalized = input.trim();

        const byCode = countries.find((c) => c.code.toLowerCase() === normalized.toLowerCase());
        if (byCode) return byCode;

        const byEmoji = countries.find((c) => c.emoji === normalized);
        if (byEmoji) return byEmoji;

        const byName = countries.find((c) => c.name.toLowerCase() === normalized.toLowerCase());
        if (byName) return byName;

        return null;
    }

    /**
     * Returns all countries whose name partially matches the input.
     */
    public resolvePartial(input: string): Country[] {
        const normalized = input.trim().toLowerCase();

        return countries.filter((c) => c.name.toLowerCase().includes(normalized));
    }

    public async addOrUpdateCountry(
        userId: string,
        countryCode: string,
        visitedAt: Date | null,
        note: string | null,
    ) {
        const updateData: Record<string, unknown> = {};
        if (visitedAt !== null) updateData.visitedAt = visitedAt;
        if (note !== null) updateData.note = note;

        const result = await prisma.userCountry.upsert({
            where: { userId_countryCode: { userId, countryCode } },
            create: { userId, countryCode, visitedAt, note },
            update: updateData,
        });

        const country = this.resolveCountry(countryCode);
        if (country && !country.un && country.parent) {
            await prisma.userCountry.upsert({
                where: { userId_countryCode: { userId, countryCode: country.parent } },
                create: { userId, countryCode: country.parent },
                update: {},
            });
        }

        return result;
    }

    public getTerritoryCount(): number {
        return countries.filter((c) => !c.un).length;
    }

    public async removeCountry(userId: string, countryCode: string) {
        return prisma.userCountry.delete({
            where: { userId_countryCode: { userId, countryCode } },
        });
    }

    public async getUserCountries(userId: string) {
        return prisma.userCountry.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }

    public async getCountryUsers(countryCode: string) {
        return prisma.userCountry.findMany({
            where: { countryCode },
            orderBy: { createdAt: 'asc' },
        });
    }
}
