import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';

const DOCS_PATH = fileURLToPath(new URL('../../docs/commands', import.meta.url));
const HELP_FILE = 'HelpCommand.md';
const EMBED_DESCRIPTION_CAP = 4096;

const MOD_COMMANDS: { name: string; description: string }[] = [
    { name: 'free', description: 'Free a user from the tank 🐠' },
    { name: 'tank', description: 'Send a user to the tank 🐟' },
];
const MOD_COMMAND_NAMES = new Set(MOD_COMMANDS.map((c) => c.name));

function commandNameFromFile(filename: string): string | null {
    const match = filename.match(/^(.+)Command\.md$/);
    return match ? match[1].toLowerCase() : null;
}

function loadDocMap(): Map<string, string> {
    const map = new Map<string, string>();
    try {
        for (const file of readdirSync(DOCS_PATH)) {
            const name = commandNameFromFile(file);
            if (name) map.set(name, file);
        }
    } catch (err) {
        console.warn(`[HelpCommand] Could not read docs from ${DOCS_PATH}:`, err);
    }
    return map;
}

export default class HelpCommand extends SlashCommand {
    private commandToFile = loadDocMap();

    public data = new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with any bot command')
        .addStringOption((o) =>
            o
                .setName('command')
                .setDescription('The command to get help for (e.g. met, birthday)')
                .setRequired(false),
        )
        .addUserOption((o) =>
            o
                .setName('user')
                .setDescription('Tag a user to ping them in the response')
                .setRequired(false),
        );

    public async execute(_client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const rawCommand = interaction.options.getString('command');
        const user = interaction.options.getUser('user');

        const requested = rawCommand?.trim().toLowerCase().replace(/^\//, '') ?? '';

        const hasMod =
            interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers) ?? false;

        if (requested && MOD_COMMAND_NAMES.has(requested) && !hasMod) {
            await interaction.reply({
                content: `You need the **Moderate Members** permission to view help for \`/${requested}\`.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        let docFile = HELP_FILE;
        let errorPrefix = '';

        if (requested) {
            const matched = this.commandToFile.get(requested);
            if (matched) {
                docFile = matched;
            } else {
                errorPrefix = `No command found called \`${rawCommand}\`. Here's the general help instead:`;
            }
        }

        let body: string;
        try {
            body = readFileSync(join(DOCS_PATH, docFile), 'utf8');
        } catch (err) {
            console.error('[HelpCommand] Failed to read doc:', err);
            await interaction.reply({
                content: 'Help documentation is missing — please alert an admin.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (docFile === HELP_FILE && hasMod) {
            body +=
                '\n\n## 🛡️ Mod Commands\n\n' +
                MOD_COMMANDS.map((c) => `- \`/${c.name}\` — ${c.description}`).join('\n');
        }

        if (body.length > EMBED_DESCRIPTION_CAP) {
            body = body.slice(0, EMBED_DESCRIPTION_CAP - 3) + '...';
        }

        const pingPart = user ? `<@${user.id}>` : '';
        const content = [pingPart, errorPrefix].filter(Boolean).join(' ') || undefined;

        const embed = new EmbedBuilder().setDescription(body).setColor(0x2383db);

        await interaction.reply({
            content,
            embeds: [embed],
            allowedMentions: user ? { users: [user.id] } : { parse: [] },
        });
    }
}
