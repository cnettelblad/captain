import { Handler } from '#captain/Handlers/Handler.js';
import { GuildMemberFlags } from 'discord-api-types/v10';
export default class MemberOnboardedHandler extends Handler {
    async handle() {
        const [oldMember, newMember] = this.args;
        if (oldMember.flags.has(GuildMemberFlags.CompletedOnboarding))
            return;
        if (newMember.flags.has(GuildMemberFlags.CompletedOnboarding)) {
            const sysChan = newMember.guild.systemChannel;
            if (!sysChan)
                return;
            sysChan
                .send(`Ladies and gentlemen .. *static noises* .. ${newMember} has boarded!`)
                .catch(console.error);
        }
    }
}
