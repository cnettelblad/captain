import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import MessageCreate from '#captain/Event/MessageCreate.js';
import CommandDispatcher from '#captain/Dispatcher/CommandDispatcher.js';
import Event from '#captain/Event/Event.js';
import Job from '#captain/Jobs/Job.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import SlashCommand from '#captain/Commands/SlashCommand.js';

config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Load slash commands
const commands: SlashCommand[] = [];
const commandsPath = fileURLToPath(new URL('./Commands', import.meta.url));

async function loadCommands() {
    const commandFiles = readdirSync(commandsPath).filter(
        (file: string) =>
            (file.endsWith('.ts') || file.endsWith('.js')) &&
            file !== 'SlashCommand.ts' &&
            file !== 'SlashCommand.js',
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

// Load and schedule jobs
const jobs: Job[] = [];
const jobsPath = fileURLToPath(new URL('./Jobs', import.meta.url));

async function loadJobs() {
    const jobFiles = readdirSync(jobsPath).filter(
        (file: string) =>
            (file.endsWith('.ts') || file.endsWith('.js')) &&
            file !== 'Job.ts' &&
            file !== 'Job.js',
    );

    for (const file of jobFiles) {
        const filePath = join(jobsPath, file);
        const jobModule = await import(filePath);
        const JobClass = jobModule.default;

        if (JobClass && JobClass.prototype instanceof Job) {
            const jobInstance = new JobClass(client);
            jobs.push(jobInstance);
            console.log(`Loaded job: ${jobInstance.constructor.name}`);
        }
    }
}

async function initialize() {
    await loadCommands();
    await loadJobs();

    const events: Event<any>[] = [new MessageCreate(client)];

    events.forEach((event) => {
        client.on(
            event.constructor.name.charAt(0).toLowerCase() + event.constructor.name.slice(1),
            (...args: any[]) => event.execute(...args),
        );
    });

    const commandDispatcher = new CommandDispatcher(commands);
    client.on('interactionCreate', (interaction) => commandDispatcher.handle(interaction));

    client.once('clientReady', async () => {
        console.log('Bot is ready!');
        const guilds = await client.guilds.fetch();
        guilds.forEach((guild: any) => {
            console.log(`Guild: ${guild.name} (ID: ${guild.id})`);
        });

        // Start all scheduled jobs
        jobs.forEach((job) => job.start());
    });

    await client.login(process.env.DISCORD_TOKEN).catch(console.error);
}

initialize().catch(console.error);
