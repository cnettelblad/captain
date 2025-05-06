"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages
    ]
});
const introductionChannels = [
    '1369321526431580261', // Test Server
    '590966486567354370' // Wanderlust
];
const newIntroductionMessages = [
    'Well, well, well! What do we have here? A new member? Welcome to Wanderlust, :user! Delightful to have you on board!',
    'Ah, a new face! Welcome to the server, :user! We are thrilled to have you here!',
    'I haven\'nt seen an introduction like this in ages! Welcome to the server, :user! We are excited to have you here!',
    'Hold up! Is it really :user? Welcome! We are so glad to have you here!',
    'A new member? How exciting! Welcome to the server, :user! Hope you have a great time here!',
];
const oldIntroductionMessages = [
    'About time you introduced yourself, :user! I was starting to think you were a ghost!',
    'Finally! An introduction! Almost thought you were a bot, :user!',
    'I\'d be lying if I said I wasn\'t waiting for this introduction, :user!',
    'Well, well, well! Look who finally decided to introduce themselves! Happy getting to know ya, :user!',
    'For a moment there I thought you were never going to introduce yourself, :user! Glad you did!',
];
client.on('messageCreate', async (msg) => {
    const userName = msg.author.displayName;
    const cleanUserName = userName.replace(/<a?:\w+:\d+>/g, '');
    // If msg.channel is not type of text channel, return
    if (!(msg.channel instanceof discord_js_1.TextChannel))
        return;
    // Make sure it's a "default" message
    if (msg.type !== 0)
        return;
    if (introductionChannels.includes(msg.channel.id)) {
        // See how long the user has been in the server
        const member = await msg.guild?.members.fetch(msg.author.id);
        if (!member)
            return;
        const joinedAt = member.joinedAt;
        const daysInGuild = Math.floor(((new Date).getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
        // Add wave emoji reaction
        msg.react('👋').catch(console.error);
        // Create a thread
        msg.startThread({
            name: `${cleanUserName}'s introduction`,
            autoArchiveDuration: 60,
            reason: 'Creating an introduction thread'
        }).then(thread => {
            // Welcome and mention the user
            // replace :user with the user mention
            const welcomeMessage = daysInGuild < 7
                ? newIntroductionMessages[Math.floor(Math.random() * newIntroductionMessages.length)]
                : oldIntroductionMessages[Math.floor(Math.random() * oldIntroductionMessages.length)];
            const message = welcomeMessage.replace(':user', `<@${msg.author.id}>`);
            thread.send(message);
        }).catch(console.error);
    }
});
client.once('ready', async () => {
    console.log('Bot is ready!');
    const guilds = await client.guilds.fetch();
    guilds.forEach(guild => {
        console.log(`Guild: ${guild.name} (ID: ${guild.id})`);
    });
});
client.login(process.env.DISCORD_TOKEN);
