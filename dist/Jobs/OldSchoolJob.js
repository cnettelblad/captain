import Job from '../Jobs/Job.js';
export default class OldSchoolJob extends Job {
    schedule = '0 0 * * *'; // UTC midnight daily
    GUILD_ID = '583718278468206612';
    OLD_SCHOOL_ROLE_ID = '1462105639428948108';
    QUALIFYING_ROLE_IDS = [
        '1262837817650974740', // Boarding Group One
        '820406960520298516', // Frequent Flyer
    ];
    GUILD_CREATED_TIMESTAMP = 1559239682548;
    // Dry run mode - set to false to actually assign/remove roles
    DRY_RUN = false;
    async execute() {
        const guild = await this.client.guilds.fetch(this.GUILD_ID);
        const now = Date.now();
        const serverAge = now - this.GUILD_CREATED_TIMESTAMP;
        const twoThirdsAge = (serverAge * 2) / 3;
        const cutoffTimestamp = now - twoThirdsAge;
        console.log(`[OldSchoolJob] Server age: ${Math.floor(serverAge / (1000 * 60 * 60 * 24))} days`);
        console.log(`[OldSchoolJob] Cutoff date: ${new Date(cutoffTimestamp).toISOString()}`);
        let toAddRole = [];
        let toRemoveRole = [];
        // Paginate through all members (1000 per request)
        let lastMemberId;
        let processedCount = 0;
        while (true) {
            const members = await guild.members.list({
                limit: 1000,
                after: lastMemberId,
            });
            if (members.size === 0) {
                break;
            }
            processedCount += members.size;
            console.log(`[OldSchoolJob] Processing batch of ${members.size} members (total: ${processedCount})`);
            for (const [, member] of members) {
                const hasQualifyingRole = this.QUALIFYING_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId));
                const hasOldSchoolRole = member.roles.cache.has(this.OLD_SCHOOL_ROLE_ID);
                const joinedAt = member.joinedTimestamp;
                if (!joinedAt) {
                    continue;
                }
                const isOldEnough = joinedAt < cutoffTimestamp;
                if (hasQualifyingRole && isOldEnough && !hasOldSchoolRole) {
                    toAddRole.push(member);
                }
                else if (hasOldSchoolRole && !hasQualifyingRole) {
                    toRemoveRole.push(member);
                }
            }
            lastMemberId = members.last()?.id;
            if (members.size < 1000) {
                break;
            }
        }
        console.log(`[OldSchoolJob] Total members processed: ${processedCount}`);
        console.log(`[OldSchoolJob] Members to receive Old School role: ${toAddRole.length}`);
        console.log(`[OldSchoolJob] Members to have Old School role removed: ${toRemoveRole.length}`);
        if (this.DRY_RUN) {
            console.log('[OldSchoolJob] DRY RUN - No roles were modified');
            if (toAddRole.length > 0) {
                console.log('[OldSchoolJob] Would add role to:', toAddRole.map((m) => m.user.tag).join(', '));
            }
            if (toRemoveRole.length > 0) {
                console.log('[OldSchoolJob] Would remove role from:', toRemoveRole.map((m) => m.user.tag).join(', '));
            }
            return;
        }
        // Add roles
        for (const member of toAddRole) {
            try {
                await member.roles.add(this.OLD_SCHOOL_ROLE_ID);
                console.log(`[OldSchoolJob] Added Old School role to ${member.user.tag}`);
            }
            catch (error) {
                console.error(`[OldSchoolJob] Failed to add role to ${member.user.tag}:`, error);
            }
        }
        // Remove roles
        for (const member of toRemoveRole) {
            try {
                await member.roles.remove(this.OLD_SCHOOL_ROLE_ID);
                console.log(`[OldSchoolJob] Removed Old School role from ${member.user.tag}`);
            }
            catch (error) {
                console.error(`[OldSchoolJob] Failed to remove role from ${member.user.tag}:`, error);
            }
        }
        console.log('[OldSchoolJob] Completed role updates');
    }
}
