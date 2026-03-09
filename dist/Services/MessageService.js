import { prisma } from '../Services/Prisma.js';
export default class MessageService {
    async store(message) {
        await prisma.message.create({
            data: {
                id: message.id,
                serverId: message.guildId,
                channelId: message.channelId,
                userId: message.author.id,
                content: message.content,
                isBot: message.author.bot,
                replyToId: message.reference?.messageId ?? null,
                attachmentCount: message.attachments.size,
            },
        });
    }
    async update(message) {
        const existing = await prisma.message.findUnique({
            where: { id: message.id },
        });
        if (!existing)
            return;
        await prisma.$transaction([
            prisma.messageEdit.create({
                data: {
                    messageId: message.id,
                    oldContent: existing.content,
                },
            }),
            prisma.message.update({
                where: { id: message.id },
                data: { content: message.content },
            }),
        ]);
    }
    async softDelete(messageId) {
        await prisma.message.update({
            where: { id: messageId },
            data: { deletedAt: new Date() },
        }).catch(() => {
            // Message may not exist in DB (sent before tracking was enabled)
        });
    }
}
