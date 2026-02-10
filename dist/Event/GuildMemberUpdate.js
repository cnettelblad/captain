import Event from '../Event/Event.js';
import TankRoleHandler from '../Handlers/TankRoleHandler.js';
export default class GuildMemberUpdate extends Event {
    name = 'guildMemberUpdate';
    handlers = [TankRoleHandler];
}
