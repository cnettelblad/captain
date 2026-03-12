import { prisma } from '#captain/Services/Prisma.js';

export default class SuggestionService {
    public async create(userId: string, suggestion: string, attachments: { url: string; filename: string; contentType: string | null; size: number | null }[] = []) {
        return prisma.suggestion.create({
            data: {
                userId,
                suggestion,
                attachments: attachments.length > 0 ? {
                    create: attachments,
                } : undefined,
            },
        });
    }

    public async list(page: number = 1, pageSize: number = 10) {
        const skip = (page - 1) * pageSize;

        const [suggestions, total] = await Promise.all([
            prisma.suggestion.findMany({
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.suggestion.count({
                where: { deletedAt: null },
            }),
        ]);

        return { suggestions, total, page, totalPages: Math.ceil(total / pageSize) };
    }
}
