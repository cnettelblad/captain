import { randomUUID } from 'node:crypto';
import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import CountryService, { Country } from '#captain/Services/CountryService.js';

interface PendingAdd {
    userId: string;
    country: string;
    visitedAt: Date | null;
    note: string | null;
    createdAt: number;
}

const PENDING_TTL = 15 * 60 * 1000;

export default class CountriesCommand extends SlashCommand {
    private pendingAdds = new Map<string, PendingAdd>();

    public data = new SlashCommandBuilder()
        .setName('countries')
        .setDescription('Track countries you have visited')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add')
                .setDescription('Add a country you have visited')
                .addStringOption((option) =>
                    option
                        .setName('country')
                        .setDescription('Country name, code, or flag emoji')
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName('date')
                        .setDescription('When you visited (e.g. 2024-06-15)')
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName('note')
                        .setDescription('A note about your visit')
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription('List the countries you have visited'),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('remove')
                .setDescription('Remove a country from your list')
                .addStringOption((option) =>
                    option
                        .setName('country')
                        .setDescription('Country name, code, or flag emoji')
                        .setRequired(true),
                ),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await this.handleAdd(client, interaction);
        } else if (subcommand === 'list') {
            await this.handleList(client, interaction);
        } else if (subcommand === 'remove') {
            await this.handleRemove(interaction);
        }
    }

    private async handleAdd(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        const input = interaction.options.getString('country', true);
        const dateInput = interaction.options.getString('date');
        const note = interaction.options.getString('note');

        let visitedAt: Date | null = null;
        if (dateInput) {
            visitedAt = new Date(dateInput);
            if (isNaN(visitedAt.getTime())) {
                await interaction.reply({
                    content: 'Invalid date format. Use a format like 2024-06-15.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        const countryService = new CountryService();
        const country = countryService.resolveCountry(input);

        if (!country && input.trim().length >= 3) {
            const partialMatches = countryService.resolvePartial(input);

            if (partialMatches.length > 0) {
                return this.handlePartialMatches(interaction, partialMatches);
            }
        }

        if (!country) {
            await interaction.reply({
                content: `Could not find a country matching "${input}".`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const result = await countryService.addOrUpdateCountry(
            interaction.user.id,
            country.code,
            visitedAt,
            note,
        );
        const isUpdate = result.createdAt.getTime() !== result.updatedAt.getTime();

        if (isUpdate) {
            const parts: string[] = [];
            if (note) parts.push(`note: ${note}`);
            if (visitedAt)
                parts.push(
                    `visited: ${visitedAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}`,
                );

            await interaction.reply({
                content: `Updated ${country.emoji} ${country.name} (${parts.join(', ')})`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        let message = `${country.emoji} ${country.name} added to your visited countries!`;
        if (visitedAt) {
            message += ` (visited ${visitedAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })})`;
        }

        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }

    private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
        const input = interaction.options.getString('country', true);
        const countryService = new CountryService();
        const country = countryService.resolveCountry(input);

        if (!country) {
            await interaction.reply({
                content: `Could not find a country matching "${input}".`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            await countryService.removeCountry(interaction.user.id, country.code);
        } catch (error: any) {
            if (error?.code === 'P2025') {
                await interaction.reply({
                    content: `${country.emoji} ${country.name} is not on your list.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            throw error;
        }

        await interaction.reply({
            content: `${country.emoji} ${country.name} removed from your visited countries.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    public async handleButton(interaction: ButtonInteraction): Promise<void> {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const pendingId = parts[2];

        const pending = this.pendingAdds.get(pendingId);

        if (!pending) {
            await interaction.update({ content: 'This interaction has expired.', components: [] });
            return;
        }

        if (interaction.user.id !== pending.userId) {
            await interaction.reply({
                content: 'This button is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        this.pendingAdds.delete(pendingId);

        if (action === 'decline') {
            await interaction.update({ content: 'Cancelled.', components: [] });
            return;
        }

        const countryService = new CountryService();
        const country = countryService.resolveCountry(pending.country);

        if (!country) {
            await interaction.update({ content: 'Could not find that country.', components: [] });
            return;
        }

        await countryService.addOrUpdateCountry(
            interaction.user.id,
            country.code,
            pending.visitedAt,
            pending.note,
        );

        await interaction.update({
            content: `${country.emoji} ${country.name} added to your visited countries!`,
            components: [],
        });
    }

    public async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        const [, action, pendingId] = interaction.customId.split('_');

        if (action !== 'add') return;

        const pending = this.pendingAdds.get(pendingId);

        if (!pending) {
            await interaction.update({ content: 'This interaction has expired.', components: [] });
            return;
        }

        if (interaction.user.id !== pending.userId) {
            await interaction.reply({
                content: 'This menu is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        this.pendingAdds.delete(pendingId);

        if (interaction.values[0] === 'none') {
            await interaction.update({
                content: 'Cancelled.',
                components: [],
            });
            return;
        }

        const countryCode = interaction.values[0];
        const countryService = new CountryService();
        const country = countryService.resolveCountry(countryCode);

        if (!country) {
            await interaction.update({ content: 'Could not find that country.', components: [] });
            return;
        }

        await countryService.addOrUpdateCountry(
            interaction.user.id,
            country.code,
            pending.visitedAt,
            pending.note,
        );

        await interaction.update({
            content: `${country.emoji} ${country.name} added to your visited countries!`,
            components: [],
        });
    }

    private async handleList(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        await interaction.deferReply();

        const countryService = new CountryService();
        const userCountries = await countryService.getUserCountries(interaction.user.id);

        if (userCountries.length === 0) {
            await interaction.editReply(
                "You haven't added any countries yet! Use `/countries add` to get started.",
            );
            return;
        }

        userCountries.sort((a, b) => {
            const dateA = a.visitedAt ?? a.createdAt;
            const dateB = b.visitedAt ?? b.createdAt;
            return dateA.getTime() - dateB.getTime();
        });

        const lines = userCountries.map((uc) => {
            const country = countryService.resolveCountry(uc.countryCode);
            const emoji = country?.emoji ?? '🏳️';
            const name = country?.name ?? uc.countryCode;
            return uc.note ? `${emoji} ${name} (${uc.note})` : `${emoji} ${name}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.displayName}'s Visited Countries`)
            .setColor(0x2383db)
            .setFooter({ text: `${userCountries.length} countries visited in total` });

        let columnCount = 1;

        if (lines.length > 20) {
            columnCount = 3;
        } else if (lines.length > 10) {
            columnCount = 2;
        }

        if (columnCount === 1) {
            embed.setDescription(lines.join('\n'));
        } else {
            const perColumn = Math.ceil(lines.length / columnCount);
            for (let i = 0; i < columnCount; i++) {
                const chunk = lines.slice(i * perColumn, (i + 1) * perColumn);
                embed.addFields({ name: '\u200b', value: chunk.join('\n'), inline: true });
            }
        }

        await interaction.editReply({ embeds: [embed] });
    }

    private async handlePartialMatches(
        interaction: ChatInputCommandInteraction,
        matches: Country[],
    ): Promise<void> {
        const dateInput = interaction.options.getString('date');
        const note = interaction.options.getString('note');

        let visitedAt: Date | null = null;
        if (dateInput) {
            visitedAt = new Date(dateInput);
            if (isNaN(visitedAt.getTime())) visitedAt = null;
        }

        this.cleanStalePending();
        const pendingId = randomUUID();
        this.pendingAdds.set(pendingId, {
            userId: interaction.user.id,
            country: matches[0].code,
            visitedAt,
            note,
            createdAt: Date.now(),
        });

        const options = matches.slice(0, 4).map((c) => ({
            label: c.name,
            value: c.code,
            emoji: c.emoji,
        }));

        if (options.length === 1) {
            const confirmButton = new ButtonBuilder()
                .setCustomId(`countries_add_${pendingId}`)
                .setLabel(`Yes`)
                .setStyle(ButtonStyle.Primary);

            const declineButton = new ButtonBuilder()
                .setCustomId(`countries_decline_${pendingId}`)
                .setLabel('No')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                confirmButton,
                declineButton,
            );

            await interaction.reply({
                content: `Did you mean ${options[0].emoji} **${options[0].label}**?`,
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        options.push({
            label: 'None of the above',
            value: 'none',
            emoji: '❌',
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`countries_add_${pendingId}`)
            .setPlaceholder('Select a country')
            .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.reply({
            content: `Multiple countries match your input. Please select one:`,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    private cleanStalePending(): void {
        const now = Date.now();
        for (const [id, pending] of this.pendingAdds) {
            if (now - pending.createdAt > PENDING_TTL) {
                this.pendingAdds.delete(id);
            }
        }
    }
}
