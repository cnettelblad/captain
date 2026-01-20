import { Client } from 'discord.js';
import { prisma } from '#captain/Services/Prisma.js';
import { UserEncounter } from '@prisma/client';

const MILESTONE_ROLES = {
    1: '1230237976605360168',
    5: '1230238066510139434',
    10: '1230238118729351189',
    25: '1352005935798947872',
    50: '1380168192999030814',
    100: '1380169001652719756',
} as const;

const GUILD_ID = '583718278468206612';

export default class MeetupService {
    constructor(private client: Client) {}

    /**
     * Normalizes two user IDs so userA is always the smaller ID.
     * This ensures consistent composite key ordering.
     */
    public normalizeUserIds(userId1: string, userId2: string): [string, string] {
        return [userId1, userId2].sort() as [string, string];
    }

    /**
     * Finds an existing encounter between two users.
     */
    public async findEncounter(userId1: string, userId2: string): Promise<UserEncounter | null> {
        const [userA, userB] = this.normalizeUserIds(userId1, userId2);
        return prisma.userEncounter.findUnique({
            where: { userA_userB: { userA, userB } },
        });
    }

    /**
     * Creates a new pending encounter between two users.
     */
    public async createEncounter(
        userId1: string,
        userId2: string,
        createdBy: string,
    ): Promise<UserEncounter> {
        const [userA, userB] = this.normalizeUserIds(userId1, userId2);
        return prisma.userEncounter.create({
            data: { userA, userB, createdBy, status: 'pending' },
        });
    }

    /**
     * Creates a confirmed encounter between two users (for admin use).
     */
    public async createConfirmedEncounter(
        userId1: string,
        userId2: string,
        createdBy: string,
    ): Promise<UserEncounter> {
        const [userA, userB] = this.normalizeUserIds(userId1, userId2);

        return prisma.$transaction(async (tx) => {
            const encounter = await tx.userEncounter.create({
                data: { userA, userB, createdBy, status: 'confirmed' },
            });

            await this.handleMilestoneInternal(encounter);

            return encounter;
        });
    }

    /**
     * Confirms an existing encounter and handles milestone roles.
     */
    public async confirmEncounter(encounter: UserEncounter): Promise<void> {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'confirmed' },
        });

        const { userA, userB } = encounter;
        console.log(`[MeetupService] Encounter between ${userA} and ${userB} confirmed.`);

        await this.handleMilestone(encounter);
    }

    /**
     * Gets the "other" user ID in an encounter (the one who didn't create it).
     */
    public getOtherUserId(encounter: UserEncounter): string {
        return encounter.createdBy === encounter.userA ? encounter.userB : encounter.userA;
    }

    /**
     * Updates an existing encounter's status to confirmed and handles milestones (for admin use).
     */
    public async updateToConfirmed(encounter: UserEncounter): Promise<void> {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'confirmed' },
        });

        await this.handleMilestone(encounter);
    }

    /**
     * Rejects an encounter.
     */
    public async rejectEncounter(encounter: UserEncounter): Promise<void> {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'rejected' },
        });
    }

    /**
     * Updates a rejected encounter to pending (for re-requests after cooldown).
     */
    public async updateToPending(encounter: UserEncounter, createdBy: string): Promise<void> {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'pending', createdBy },
        });
    }

    /**
     * Counts pending encounters created by a user.
     */
    public async countPendingByUser(userId: string): Promise<number> {
        return prisma.userEncounter.count({
            where: { createdBy: userId, status: 'pending' },
        });
    }

    /**
     * Handles milestone role assignments for both users in an encounter.
     */
    public async handleMilestone(encounter: UserEncounter): Promise<void> {
        await this.handleMilestoneInternal(encounter);
    }

    private async handleMilestoneInternal(encounter: UserEncounter): Promise<void> {
        const { userA, userB } = encounter;

        const [confirmedCountA, confirmedCountB] = await Promise.all([
            prisma.userEncounter.count({ where: { userA, status: 'confirmed' } }),
            prisma.userEncounter.count({ where: { userB, status: 'confirmed' } }),
        ]);

        const targets = [
            { userId: userA, count: confirmedCountA },
            { userId: userB, count: confirmedCountB },
        ];

        for (const { userId, count } of targets) {
            const milestone = MILESTONE_ROLES[count as keyof typeof MILESTONE_ROLES];

            if (!milestone) continue;

            try {
                const guild = await this.client.guilds.fetch(GUILD_ID);

                if (!guild) continue;

                const member = await guild.members.fetch(userId);

                if (!member) continue;

                const role = await guild.roles.fetch(milestone);

                if (!role) continue;

                await member.roles.add(role);

                console.log(
                    `[MeetupService] Assigned ${role.name} to user ${member.user.tag} for reaching ${count} confirmed meetups.`,
                );

                for (const [milestoneCount, roleId] of Object.entries(MILESTONE_ROLES)) {
                    if (parseInt(milestoneCount) < count && member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                    }
                }

                try {
                    console.log(
                        `[MeetupService] Sending DM to user ${member.user.tag} for milestone achievement.`,
                    );
                    await member.send(
                        `🎉 Congratulations! You've reached ${count} confirmed meetups and earned the ${role.name} role! 🎉`,
                    );
                } catch {
                    console.log(`[MeetupService] Failed to send DM to user ${member.user.tag}.`);
                }
            } catch {
                console.log(
                    `[MeetupService] Could not process milestone for user ${userId} (may not be in server).`,
                );
            }
        }
    }
}
