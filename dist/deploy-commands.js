import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import SlashCommand from '#captain/Commands/SlashCommand.js';
dotenv.config();
const commands = [];
const commandsPath = fileURLToPath(new URL('./Commands', import.meta.url));
async function deployCommands() {
    const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js') && file !== 'SlashCommand.js');
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
    if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
        throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
    }
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    let data;
    if (process.env.DISCORD_GUILD_ID) {
        // Deploy to specific guild (faster for development)
        data = await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commands });
        console.log(`Successfully reloaded commands for guild ${process.env.DISCORD_GUILD_ID}`);
    }
    else {
        // Deploy globally (takes up to 1 hour to propagate)
        data = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
            body: commands,
        });
        console.log('Successfully reloaded global commands');
    }
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}
deployCommands();
