import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import SlashCommand from '#captain/Commands/SlashCommand.js';

dotenv.config();

const commands: any[] = [];
const commandsPath = fileURLToPath(new URL('./Commands', import.meta.url));

function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    for (const arg of process.argv.slice(2)) {
        if (arg.includes('=')) {
            const [key, value] = arg.split('=');
            args[key] = value;
        }
    }
    return args;
}

async function deployCommands() {
    const clearGuild = process.argv.includes('--clear-guild');
    const args = parseArgs();

    if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
        throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    // Handle single command deployment to a specific guild
    if (args.guild && args.command) {
        const commandFile = `${args.command}.js`;
        const filePath = join(commandsPath, commandFile);

        try {
            const commandModule = await import(filePath);
            const CommandClass = commandModule.default;

            if (!CommandClass || !(CommandClass.prototype instanceof SlashCommand)) {
                throw new Error(`${args.command} is not a valid SlashCommand`);
            }

            const commandInstance = new CommandClass();
            const commandData = commandInstance.data.toJSON();

            console.log(`Deploying ${commandInstance.data.name} to guild ${args.guild}...`);

            await rest.post(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, args.guild),
                { body: commandData },
            );

            console.log(`Successfully deployed ${commandInstance.data.name} to guild ${args.guild}`);
        } catch (error) {
            console.error(`Failed to deploy command:`, error);
        }
        return;
    }

    if (clearGuild) {
        if (!process.env.DISCORD_GUILD_ID) {
            throw new Error('Missing DISCORD_GUILD_ID environment variable for --clear-guild');
        }
        console.log(`Clearing all guild-specific commands for guild ${process.env.DISCORD_GUILD_ID}...`);
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID,
            ),
            { body: [] },
        );
        console.log('Successfully cleared all guild-specific commands.');
        return;
    }

    const commandFiles = readdirSync(commandsPath).filter(
        (file) => file.endsWith('.js') && file !== 'SlashCommand.js',
    );

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const commandModule = await import(filePath);
        const CommandClass = commandModule.default;

        if (CommandClass && CommandClass.prototype instanceof SlashCommand) {
            const commandInstance = new CommandClass();
            commands.push(commandInstance.data.toJSON());
            console.log(`Loaded command: ${commandInstance.data.name}`);
        }
    }

    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let data: any;
    if (process.env.DISCORD_GUILD_ID) {
        // Deploy to specific guild (faster for development)
        data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID,
            ),
            { body: commands },
        );
        console.log(`Successfully reloaded commands for guild ${process.env.DISCORD_GUILD_ID}`);
    } else {
        // Deploy globally (takes up to 1 hour to propagate)
        data = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
            body: commands,
        });
        console.log('Successfully reloaded global commands');
    }

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}

deployCommands();
