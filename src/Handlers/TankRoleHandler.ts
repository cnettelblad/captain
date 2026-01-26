import { Handler } from '#captain/Handlers/Handler.js';
import { AuditLogEvent } from 'discord.js';
import TankService from '#captain/Services/TankService.js';

const TANK_ROLE = '1070394685039853618';

export default class TankRoleHandler extends Handler<'guildMemberUpdate'> {
    async handle() {
        const [oldMember, newMember] = this.args;

        const hadTankRole = oldMember.roles.cache.has(TANK_ROLE);
        const hasTankRole = newMember.roles.cache.has(TANK_ROLE);

        if (hadTankRole === hasTankRole) {
            return;
        }

        const executor = await this.getExecutor(newMember.id);

        // If the bot made the change, ignore it (already handled by commands)
        if (executor?.id === this.client.user?.id) {
            return;
        }

        const tankService = new TankService(this.client);

        if (!hadTankRole && hasTankRole) {
            await this.handleTankRoleAdded(tankService, newMember.id, executor?.id ?? null);
        } else if (hadTankRole && !hasTankRole) {
            await this.handleTankRoleRemoved(tankService, newMember.id, executor?.id ?? null);
        }
    }

    private async handleTankRoleAdded(
        tankService: TankService,
        userId: string,
        executorId: string | null,
    ) {
        const activeSentences = await tankService.getActiveSentences(userId);
        if (activeSentences.length > 0) {
            return;
        }

        await tankService.createManualSentence(userId, executorId);

        console.log(
            `[TankRoleHandler] User ${userId} was manually tanked by ${executorId ?? 'unknown'}`,
        );
    }

    private async handleTankRoleRemoved(
        tankService: TankService,
        userId: string,
        executorId: string | null,
    ) {
        const freed = await tankService.freeUser(userId, executorId);

        if (freed) {
            console.log(
                `[TankRoleHandler] User ${userId} was manually freed by ${executorId ?? 'unknown'}`,
            );
        }
    }

    private async getExecutor(targetId: string) {
        const [, newMember] = this.args;

        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberRoleUpdate,
                limit: 5,
            });

            const entry = auditLogs.entries.find(
                (e) => e.target?.id === targetId && Date.now() - e.createdTimestamp < 5000,
            );

            return entry?.executor ?? null;
        } catch {
            return null;
        }
    }
}
