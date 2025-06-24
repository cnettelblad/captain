import Event from 'Captain/Event/Event'

export default class GuildMemberUpdate extends Event<'guildMemberUpdate'> {
    name = 'guildMemberUpdate' as const;
    handlers = [
        // IntroductionHandler
    ];
}