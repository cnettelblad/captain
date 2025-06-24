import Event from 'Captain/Event/Event'

export default class GuildMemberAdd extends Event<'guildMemberAdd'> {
    name = 'guildMemberAdd' as const;
    handlers = [
        // IntroductionHandler
    ];
}