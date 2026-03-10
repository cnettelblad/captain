import { prisma } from '../Services/Prisma.js';
export default class SuggestionService {
    async create(userId, suggestion) {
        return prisma.suggestion.create({
            data: { userId, suggestion },
        });
    }
    async list(page = 1, pageSize = 10) {
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
