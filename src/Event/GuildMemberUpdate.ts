import Event from '#captain/Event/Event.js';

export default class GuildMemberUpdate extends Event<'guildMemberUpdate'> {
    name = 'guildMemberUpdate' as const;
    handlers = [
        // IntroductionHandler
    ];
}
