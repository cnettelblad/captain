import { prisma } from '../Services/Prisma.js';
const MILESTONE_ROLES = {
    1: '1230237976605360168',
    5: '1230238066510139434',
    10: '1230238118729351189',
    25: '1352005935798947872',
    50: '1380168192999030814',
    100: '1380169001652719756',
};
const GUILD_ID = '583718278468206612';
export default class MeetupService {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Normalizes two user IDs so userA is always the smaller ID.
     * This ensures consistent composite key ordering.
     */
    normalizeUserIds(userId1, userId2) {
        return [userId1, userId2].sort();
    }
    /**
     * Finds an existing encounter between two users.
     */
    async findEncounter(userId1, userId2) {
        const [userA, userB] = this.normalizeUserIds(userId1, userId2);
        return prisma.userEncounter.findUnique({
            where: { userA_userB: { userA, userB } },
        });
    }
    /**
     * Creates a new pending encounter between two users.
     */
    async createEncounter(userId1, userId2, createdBy) {
        const [userA, userB] = this.normalizeUserIds(userId1, userId2);
        return prisma.userEncounter.create({
            data: { userA, userB, createdBy, status: 'pending' },
        });
    }
    /**
     * Creates a confirmed encounter between two users (for admin use).
     */
    async createConfirmedEncounter(userId1, userId2, createdBy) {
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
    async confirmEncounter(encounter) {
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
    getOtherUserId(encounter) {
        return encounter.createdBy === encounter.userA ? encounter.userB : encounter.userA;
    }
    /**
     * Updates an existing encounter's status to confirmed and handles milestones (for admin use).
     */
    async updateToConfirmed(encounter) {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'confirmed' },
        });
        await this.handleMilestone(encounter);
    }
    /**
     * Rejects an encounter.
     */
    async rejectEncounter(encounter) {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'rejected' },
        });
    }
    /**
     * Updates a rejected encounter to pending (for re-requests after cooldown).
     */
    async updateToPending(encounter, createdBy) {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'pending', createdBy },
        });
    }
    /**
     * Counts pending encounters created by a user.
     */
    async countPendingByUser(userId) {
        return prisma.userEncounter.count({
            where: { createdBy: userId, status: 'pending' },
        });
    }
    /**
     * Handles milestone role assignments for both users in an encounter.
     */
    async handleMilestone(encounter) {
        await this.handleMilestoneInternal(encounter);
    }
    async handleMilestoneInternal(encounter) {
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
            const milestone = MILESTONE_ROLES[count];
            if (!milestone)
                continue;
            try {
                const guild = await this.client.guilds.fetch(GUILD_ID);
                if (!guild)
                    continue;
                const member = await guild.members.fetch(userId);
                if (!member)
                    continue;
                const role = await guild.roles.fetch(milestone);
                if (!role)
                    continue;
                await member.roles.add(role);
                console.log(`[MeetupService] Assigned ${role.name} to user ${member.user.tag} for reaching ${count} confirmed meetups.`);
                for (const [milestoneCount, roleId] of Object.entries(MILESTONE_ROLES)) {
                    if (parseInt(milestoneCount) < count && member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                    }
                }
                try {
                    console.log(`[MeetupService] Sending DM to user ${member.user.tag} for milestone achievement.`);
                    await member.send(`🎉 Congratulations! You've reached ${count} confirmed meetups and earned the ${role.name} role! 🎉`);
                }
                catch {
                    console.log(`[MeetupService] Failed to send DM to user ${member.user.tag}.`);
                }
            }
            catch {
                console.log(`[MeetupService] Could not process milestone for user ${userId} (may not be in server).`);
            }
        }
    }
}
