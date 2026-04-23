import SlashCommand from '../Commands/SlashCommand.js';
import { EmbedBuilder, MessageFlags, SlashCommandBuilder, } from 'discord.js';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
const DOCS_PATH = fileURLToPath(new URL('../../docs/commands', import.meta.url));
const HELP_FILE = 'HelpCommand.md';
const EMBED_DESCRIPTION_CAP = 4096;
function commandNameFromFile(filename) {
    const match = filename.match(/^(.+)Command\.md$/);
    return match ? match[1].toLowerCase() : null;
}
function loadDocMap() {
    const map = new Map();
    try {
        for (const file of readdirSync(DOCS_PATH)) {
            const name = commandNameFromFile(file);
            if (name)
                map.set(name, file);
        }
    }
    catch (err) {
        console.warn(`[HelpCommand] Could not read docs from ${DOCS_PATH}:`, err);
    }
    return map;
}
export default class HelpCommand extends SlashCommand {
    commandToFile = loadDocMap();
    data = new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with any bot command')
        .addStringOption((o) => o
        .setName('command')
        .setDescription('The command to get help for (e.g. met, birthday)')
        .setRequired(false))
        .addUserOption((o) => o
        .setName('user')
        .setDescription('Tag a user to ping them in the response')
        .setRequired(false));
    async execute(_client, interaction) {
        const rawCommand = interaction.options.getString('command');
        const user = interaction.options.getUser('user');
        const requested = rawCommand?.trim().toLowerCase().replace(/^\//, '') ?? '';
        let docFile = HELP_FILE;
        let errorPrefix = '';
        if (requested) {
            const matched = this.commandToFile.get(requested);
            if (matched) {
                docFile = matched;
            }
            else {
                errorPrefix = `No command found called \`${rawCommand}\`. Here's the general help instead:`;
            }
        }
        let docContent;
        try {
            docContent = readFileSync(join(DOCS_PATH, docFile), 'utf8');
        }
        catch (err) {
            console.error('[HelpCommand] Failed to read doc:', err);
            await interaction.reply({
                content: 'Help documentation is missing — please alert an admin.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (docContent.length > EMBED_DESCRIPTION_CAP) {
            docContent = docContent.slice(0, EMBED_DESCRIPTION_CAP - 3) + '...';
        }
        const pingPart = user ? `<@${user.id}>` : '';
        const content = [pingPart, errorPrefix].filter(Boolean).join(' ') || undefined;
        const embed = new EmbedBuilder().setDescription(docContent).setColor(0x2383db);
        await interaction.reply({
            content,
            embeds: [embed],
            allowedMentions: user ? { users: [user.id] } : { parse: [] },
        });
    }
}
