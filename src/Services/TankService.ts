import { Client, GuildMember, TextChannel } from 'discord.js';
import { prisma } from '#captain/Services/Prisma.js';

const TANK_ROLE = '1070394685039853618';
const TANK_CHANNEL = '1070394518223999067';
const GUILD_ID = '583718278468206612';

export default class TankService {
    constructor(private client: Client) {}

    /**
     * Tanks a user by adding the tank role and creating a database record.
     */
    public async tankUser(
        member: GuildMember,
        tankedBy: string,
        durationMs: number | null,
        reason: string | null,
    ): Promise<void> {
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
    public async sendTankWelcome(userId: string): Promise<void> {
        const channel = await this.client.channels.fetch(TANK_CHANNEL);

        if (channel && channel.isTextBased()) {
            await (channel as TextChannel).send(
                `<@${userId}> it seems like you need to cool down, welcome to the tank!`,
            );
        }
    }

    /**
     * Frees a user by removing the tank role and marking their sentence as freed.
     */
    public async freeUser(userId: string, freedBy: string | null = null): Promise<boolean> {
        const guild = await this.client.guilds.fetch(GUILD_ID);

        try {
            const member = await guild.members.fetch(userId);
            await member.roles.remove(TANK_ROLE);
        } catch {
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
     * Creates a tank sentence without adding the role (for manual role additions).
     */
    public async createManualSentence(
        userId: string,
        tankedBy: string | null,
    ): Promise<void> {
        await prisma.tankSentence.create({
            data: {
                userId,
                tankedBy: tankedBy ?? 'manual',
                reason: null,
                expiresAt: null,
            },
        });
    }

    /**
     * Gets active (not freed) tank sentences for a user.
     */
    public async getActiveSentences(userId: string) {
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
    public async getExpiredSentences() {
        return prisma.tankSentence.findMany({
            where: {
                expiresAt: {
                    lte: new Date(),
                },
                freedAt: null,
            },
        });
    }

    /**
     * Gets sentences expiring within the specified remaining time (in milliseconds).
     * This includes already expired sentences and those expiring soon.
     */
    public async getExpiringSentences(remainingTime: number = 60000) {
        const windowEnd = new Date(Date.now() + remainingTime);

        return prisma.tankSentence.findMany({
            where: {
                expiresAt: {
                    lte: windowEnd,
                },
                freedAt: null,
            },
        });
    }
}
