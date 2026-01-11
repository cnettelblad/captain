import {Client, GatewayIntentBits} from 'discord.js'
import { config } from 'dotenv'
import MessageCreate from "Captain/Event/MessageCreate";
import CommandDispatcher from "Captain/Dispatcher/CommandDispatcher";
import Event from "Captain/Event/Event";
import { readdirSync } from 'fs';
import { join } from 'path';
import SlashCommand from 'Captain/Commands/SlashCommand';

config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
})

// Load slash commands
const commands: SlashCommand[] = [];
const commandsPath = join(__dirname, 'Commands');

async function loadCommands() {
    const commandFiles = readdirSync(commandsPath).filter((file: string) =>
        (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'SlashCommand.ts' && file !== 'SlashCommand.js'
    );

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const commandModule = await import(filePath);
        const CommandClass = commandModule.default;

        if (CommandClass && CommandClass.prototype instanceof SlashCommand) {
            const commandInstance = new CommandClass();
            commands.push(commandInstance);
            console.log(`Loaded command: ${commandInstance.data.name}`);
        }
    }
}

async function initialize() {
    await loadCommands();

    const events: Event<any>[] = [
        new MessageCreate(client),
    ];

    events.forEach(event => {
        client.on(
            event.constructor.name.charAt(0).toLowerCase() + event.constructor.name.slice(1),
            (...args: any[]) =>  event.execute(...args)
        )
    })

    const commandDispatcher = new CommandDispatcher(commands);
    client.on('interactionCreate', (interaction) => commandDispatcher.handle(interaction))

    client.once('clientReady', async () => {
        console.log('Bot is ready!')
        const guilds = await client.guilds.fetch()
        guilds.forEach((guild: any) => {
            console.log(`Guild: ${guild.name} (ID: ${guild.id})`)
        })
    })

    await client.login(process.env.DISCORD_TOKEN).catch(console.error);
}

initialize().catch(console.error);