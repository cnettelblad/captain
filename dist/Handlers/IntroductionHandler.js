import { Handler } from '#captain/Handlers/Handler.js';
import { PermissionsBitField } from 'discord.js';
export default class IntroductionHandler extends Handler {
    introductionChannels = [
        '1370421583683915788', // Test Server
        '590966486567354370', // Wanderlust
    ];
    newIntroductionMessages = [
        'Well, well, well! What do we have here? A new member? Welcome to Wanderlust, :user! Delighted to have you on board!',
        'Ah, a new face! Welcome to the server, :user! We are thrilled to have you here!',
        "I haven't seen an introduction like this in ages! Welcome to the server, :user! We are excited to have you here!",
        'Hold up! Is it really :user? Welcome! We are so glad to have you here!',
        'A new member? How exciting! Welcome to the server, :user! Hope you have a great time here!',
    ];
    oldIntroductionMessages = [
        'About time you introduced yourself, :user! I was starting to think you were a ghost!',
        'Finally! An introduction! Almost thought you were a bot, :user!',
        "I'd be lying if I said I wasn't waiting for this introduction, :user!",
        'Well, well, well! Look who finally decided to introduce themselves! Happy getting to know ya, :user!',
        'For a moment there I thought you were never going to introduce yourself, :user! Glad you did!',
    ];
    async handle() {
        const [message] = this.args;
        if (!this.introductionChannels.includes(message.channel.id))
            return;
        // Make sure it's a "default" message
        if (message.type !== 0)
            return;
        // See how long the user has been in the server
        const member = await message.guild?.members.fetch(message.author.id);
        if (!member)
            return;
        if (member.permissions.has(PermissionsBitField.Flags.ManageGuild))
            return;
        if (member.user.bot)
            return;
        const joinedAt = member.joinedAt;
        const daysInGuild = Math.floor((new Date().getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
        // Add wave emoji reaction
        message.react('👋').catch(console.error);
        // Create a thread
        message
            .startThread({
            name: `${message.author.displayName}'s introduction`,
            autoArchiveDuration: 60,
            reason: 'Creating an introduction thread',
        })
            .then((thread) => {
            const welcomeMessage = daysInGuild < 7
                ? this.newIntroductionMessages[Math.floor(Math.random() * this.newIntroductionMessages.length)]
                : this.oldIntroductionMessages[Math.floor(Math.random() * this.oldIntroductionMessages.length)];
            thread
                .send(welcomeMessage.replace(':user', `<@${message.author.id}>`))
                .catch(console.error);
        })
            .catch(console.error);
    }
}
