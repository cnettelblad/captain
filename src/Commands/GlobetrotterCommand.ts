import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import GoogleSheetsClient from '#captain/Integrations/GoogleSheets.js';
import GlobetrotterSummary from '#captain/Globetrotter/2026/Summary.js';
import { UserSummary } from '#captain/Globetrotter/2026/types.js';
import {
    CATEGORY_EMOJI,
    MEDAL_EMOJI,
    REPEATABLE_DISPLAY,
} from '#captain/Globetrotter/2026/Labels.js';

export default class GlobetrotterCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('globetrotter')
        .setDescription('Globetrotter challenge stats')
        .addSubcommand((sub) =>
            sub.setName('me').setDescription('Show your Globetrotter submission summary'),
        );

    public async execute(_client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const sub = interaction.options.getSubcommand();
        if (sub !== 'me') return;

        const apiKey = process.env.GOOGLE_API_KEY;
        const spreadsheetId = process.env.GLOBETROTTER_26_SHEET_ID;

        if (!apiKey || !spreadsheetId) {
            await interaction.reply({
                content: 'Globetrotter is not configured on this server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sheets = new GoogleSheetsClient(apiKey);
        const service = new GlobetrotterSummary(sheets, spreadsheetId);

        let summary: UserSummary | null;
        try {
            summary = await service.getByDiscordId(interaction.user.id);
        } catch (err) {
            console.error('[Globetrotter] Failed to fetch summary:', err);
            await interaction.editReply('Could not fetch Globetrotter data. Try again later.');
            return;
        }

        if (!summary) {
            await interaction.editReply(
                "You're not registered in the Globetrotter sheet — ask an admin to add your Discord ID.",
            );
            return;
        }

        await interaction.deleteReply();
        await interaction.followUp({ embeds: [this.buildEmbed(summary)] });
    }

    private buildEmbed(summary: UserSummary): EmbedBuilder {
        const medal = MEDAL_EMOJI[summary.rank];
        const titleSuffix = medal ? ` ${medal}` : '';

        const description =
            `${summary.username} has completed **${summary.nonRecurringCompleted}** out of the ` +
            `**${summary.nonRecurringTotal}** non-recurring challenges and made ` +
            `**${summary.recurringSubmissions}** recurring ` +
            `${plural(summary.recurringSubmissions, 'submission')}, yielding ` +
            `**${summary.totalPoints}** ${plural(summary.totalPoints, 'point')} in total.`;

        const overviewValue = summary.repeatable
            .map((r) => {
                const display = REPEATABLE_DISPLAY[r.id];
                if (display) return `${display.emoji} ${display.label(r.count)}`;
                return `• ${r.count} × ${r.name}`;
            })
            .join('\n');

        const categoryValue = summary.categories
            .filter((c) => c.letter !== 'A')
            .map(
                (c) => `${CATEGORY_EMOJI[c.letter]} **${c.name}:** ${c.completed}/${c.total}`,
            )
            .join('\n');

        return new EmbedBuilder()
            .setTitle(`${summary.username}'s Globetrotter Stats${titleSuffix}`)
            .setDescription(description)
            .setColor(0x2383db)
            .addFields(
                { name: 'Recurring Submissions', value: overviewValue, inline: true },
                { name: 'Submissions by Category', value: categoryValue, inline: true },
            );
    }
}

function plural(n: number, singular: string, pluralForm: string = singular + 's'): string {
    return n === 1 ? singular : pluralForm;
}
