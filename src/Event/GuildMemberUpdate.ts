import Event from '#captain/Event/Event.js';
import TankRoleHandler from '#captain/Handlers/TankRoleHandler.js';

export default class GuildMemberUpdate extends Event<'guildMemberUpdate'> {
    name = 'guildMemberUpdate' as const;
    handlers = [TankRoleHandler];
}
