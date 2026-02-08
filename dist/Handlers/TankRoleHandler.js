import { Handler } from '../Handlers/Handler.js';
import { AuditLogEvent } from 'discord.js';
import TankService from '../Services/TankService.js';
const TANK_ROLE = '1070394685039853618';
export default class TankRoleHandler extends Handler {
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
        }
        else if (hadTankRole && !hasTankRole) {
            await this.handleTankRoleRemoved(tankService, newMember.id, executor?.id ?? null);
        }
    }
    async handleTankRoleAdded(tankService, userId, executorId) {
        const activeSentences = await tankService.getActiveSentences(userId);
        if (activeSentences.length > 0) {
            return;
        }
        await tankService.createManualSentence(userId, executorId);
        console.log(`[TankRoleHandler] User ${userId} was manually tanked by ${executorId ?? 'unknown'}`);
    }
    async handleTankRoleRemoved(tankService, userId, executorId) {
        const freed = await tankService.freeUser(userId, executorId);
        if (freed) {
            console.log(`[TankRoleHandler] User ${userId} was manually freed by ${executorId ?? 'unknown'}`);
        }
    }
    async getExecutor(targetId) {
        const [, newMember] = this.args;
        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberRoleUpdate,
                limit: 5,
            });
            const entry = auditLogs.entries.find((e) => e.target?.id === targetId && Date.now() - e.createdTimestamp < 5000);
            return entry?.executor ?? null;
        }
        catch {
            return null;
        }
    }
}
