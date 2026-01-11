import Event from '#captain/Event/Event.js';

export default class GuildMemberAdd extends Event<'guildMemberAdd'> {
    name = 'guildMemberAdd' as const;
    handlers = [
        // IntroductionHandler
    ];
}
