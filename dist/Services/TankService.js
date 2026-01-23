import { prisma } from '../Services/Prisma.js';
const TANK_ROLE = '1070394685039853618';
const TANK_CHANNEL = '1070394518223999067';
const GUILD_ID = '583718278468206612';
export default class TankService {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Tanks a user by adding the tank role and creating a database record.
     */
    async tankUser(member, tankedBy, durationMs, reason) {
        const fish = await member.guild.roles.fetch(TANK_ROLE);
        if (!fish) {
            throw new Error('Tank role not found');
        }
        await member.roles.add(fish);
        const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
        await prisma.tankSentence.create({
            data: {
                userId: member.id,
                tankedBy,
                reason,
                expiresAt,
            },
        });
    }
    /**
     * Sends the welcome message to the tank channel.
     */
    async sendTankWelcome(userId) {
        const channel = await this.client.channels.fetch(TANK_CHANNEL);
        if (channel && channel.isTextBased()) {
            await channel.send(`<@${userId}> it seems like you need to cool down, welcome to the tank!`);
        }
    }
    /**
     * Frees a user by removing the tank role and marking their sentence as freed.
     */
    async freeUser(userId, freedBy = null) {
        const guild = await this.client.guilds.fetch(GUILD_ID);
        try {
            const member = await guild.members.fetch(userId);
            await member.roles.remove(TANK_ROLE);
        }
        catch {
            // User may have left the server
        }
        const updated = await prisma.tankSentence.updateMany({
            where: {
                userId,
                freedAt: null,
            },
            data: {
                freedAt: new Date(),
                freedBy,
            },
        });
        return updated.count > 0;
    }
    /**
     * Gets active (not freed) tank sentences for a user.
     */
    async getActiveSentences(userId) {
        return prisma.tankSentence.findMany({
            where: {
                userId,
                freedAt: null,
            },
        });
    }
    /**
     * Gets expired sentences that need to be processed.
     */
    async getExpiredSentences() {
        return prisma.tankSentence.findMany({
            where: {
                expiresAt: {
                    lte: new Date(),
                },
                freedAt: null,
            },
        });
    }
}
