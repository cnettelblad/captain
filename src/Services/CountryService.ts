import { prisma } from '#captain/Services/Prisma.js';
import countries from '#captain/Data/countries.json' with { type: 'json' };

export interface Country {
    name: string;
    code: string;
    emoji: string;
    unicode: string;
    image: string;
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

    public async addCountry(
        userId: string,
        countryCode: string,
        visitedAt: Date | null,
        note: string | null,
    ) {
        return prisma.userCountry.create({
            data: {
                userId,
                countryCode,
                visitedAt,
                note,
            },
        });
    }

    public async getUserCountries(userId: string) {
        return prisma.userCountry.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
