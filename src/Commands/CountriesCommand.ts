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
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('who')
                .setDescription('See who has visited a country')
                .addStringOption((option) =>
                    option
                        .setName('country')
                        .setDescription('Country name, code, or flag emoji')
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('compare')
                .setDescription('Compare visited countries with another user')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to compare with')
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
        } else if (subcommand === 'who') {
            await this.handleWho(client, interaction);
        } else if (subcommand === 'compare') {
            await this.handleCompare(interaction);
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

        if (country.parent) {
            const parent = countryService.resolveCountry(country.parent);
            if (parent) message += `\n${parent.emoji} ${parent.name} was also added.`;
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

        let message = `${country.emoji} ${country.name} added to your visited countries!`;
        if (country.parent) {
            const parent = countryService.resolveCountry(country.parent);
            if (parent) message += `\n${parent.emoji} ${parent.name} was also added.`;
        }

        await interaction.update({ content: message, components: [] });
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

        let message = `${country.emoji} ${country.name} added to your visited countries!`;
        if (country.parent) {
            const parent = countryService.resolveCountry(country.parent);
            if (parent) message += `\n${parent.emoji} ${parent.name} was also added.`;
        }

        await interaction.update({ content: message, components: [] });
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

        const resolved = userCountries.map((uc) => ({
            record: uc,
            country: countryService.resolveCountry(uc.countryCode),
        }));

        const lines = resolved.map(({ record, country }) => {
            const emoji = country?.emoji ?? '🏳️';
            const name = country?.name ?? record.countryCode;
            return record.note ? `${emoji} ${name} (${record.note})` : `${emoji} ${name}`;
        });

        const unCount = resolved.filter(({ country }) => country?.un).length;
        const territoryCount = resolved.filter(({ country }) => country && !country.un).length;
        const totalTerritories = countryService.getTerritoryCount();

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.displayName}'s Visited Countries`)
            .setColor(0x2383db)
            .setFooter({ text: `${unCount}/195 UN countries · ${territoryCount}/${totalTerritories} ISO 3166 territories` });

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

    private async handleWho(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        const input = interaction.options.getString('country', true);
        const countryService = new CountryService();
        const country = countryService.resolveCountry(input);

        if (!country && input.trim().length >= 3) {
            const partialMatches = countryService.resolvePartial(input);

            if (partialMatches.length === 1) {
                return this.handleWhoForCountry(client, interaction, partialMatches[0]);
            }
        }

        if (!country) {
            await interaction.reply({
                content: `Could not find a country matching "${input}".`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        return this.handleWhoForCountry(client, interaction, country);
    }

    private async handleWhoForCountry(
        client: Client,
        interaction: ChatInputCommandInteraction,
        country: Country,
    ): Promise<void> {
        await interaction.deferReply();

        const countryService = new CountryService();
        const visitors = await countryService.getCountryUsers(country.code);

        if (visitors.length === 0) {
            await interaction.editReply(`Nobody has visited ${country.emoji} ${country.name} yet.`);
            return;
        }

        const lines = await Promise.all(
            visitors.map(async (v) => {
                const user = await interaction.guild?.members.fetch(v.userId).catch(() => null);
                if (!user) return null;
                const name = `<@${v.userId}>`;
                return v.note ? `${name} (${v.note})` : name;
            }),
        );

        const filteredLines = lines.filter((line) => line !== null) as string[];

        const embed = new EmbedBuilder()
            .setTitle(`People who have been to ${country.emoji} ${country.name}`)
            .setDescription(filteredLines.join('\n'))
            .setColor(0x2383db)
            .setFooter({ text: `${visitors.length} visitor${visitors.length === 1 ? '' : 's'}` });

        await interaction.editReply({ embeds: [embed] });
    }

    private async handleCompare(interaction: ChatInputCommandInteraction): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);

        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                content: "You can't compare with yourself!",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply();

        const countryService = new CountryService();
        const [userACountries, userBCountries] = await Promise.all([
            countryService.getUserCountries(interaction.user.id),
            countryService.getUserCountries(targetUser.id),
        ]);

        const userACodes = new Set(userACountries.map((c) => c.countryCode));
        const userBCodes = new Set(userBCountries.map((c) => c.countryCode));

        const commonCodes = [...userACodes].filter((code) => userBCodes.has(code));
        const onlyACodes = [...userACodes].filter((code) => !userBCodes.has(code));
        const onlyBCodes = [...userBCodes].filter((code) => !userACodes.has(code));

        if (userACodes.size === 0 && userBCodes.size === 0) {
            await interaction.editReply('Neither of you have added any countries yet!');
            return;
        }

        const resolve = (codes: string[]) =>
            codes
                .map((code) => countryService.resolveCountry(code))
                .filter((c) => c !== null)
                .sort((a, b) => a.name.localeCompare(b.name));

        const formatLine = (c: Country) => `${c.emoji} ${c.name}`;

        const userAMention = `<@${interaction.user.id}>`;
        const userBMention = `<@${targetUser.id}>`;

        const summaryLines = [
            `${userAMention} and ${userBMention} have **${commonCodes.length}** countries in common.`,
        ];
        if (onlyACodes.length > 0)
            summaryLines.push(
                `${userAMention} has visited ${onlyACodes.length} countr${onlyACodes.length === 1 ? 'y' : 'ies'} that ${userBMention} hasn't been to.`,
            );
        if (onlyBCodes.length > 0)
            summaryLines.push(
                `${userBMention} has visited ${onlyBCodes.length} countr${onlyBCodes.length === 1 ? 'y' : 'ies'} that ${userAMention} hasn't been to.`,
            );

        summaryLines.push(
            `In total they have visited ${userACodes.size + userBCodes.size - commonCodes.length} unique countries.`,
        );

        const embed = new EmbedBuilder()
            .setTitle('Country Comparison')
            .setDescription(summaryLines.join('\n'))
            .setColor(0x2383db)
            .setFooter({ text: `${userACodes.size} vs ${userBCodes.size} countries visited` });

        const onlyALines = resolve(onlyACodes).map(formatLine);
        const onlyBLines = resolve(onlyBCodes).map(formatLine);
        const commonLines = resolve(commonCodes).map(formatLine);

        if (commonLines.length > 0) {
            embed.addFields({ name: 'In Common', value: commonLines.join('\n'), inline: false });
        }

        if (onlyALines.length > 0 || onlyBLines.length > 0) {
            embed.addFields(
                {
                    name: `${interaction.user.displayName} (${onlyALines.length})`,
                    value: onlyALines.join('\n') || '\u200b',
                    inline: true,
                },
                {
                    name: `${targetUser.displayName} (${onlyBLines.length})`,
                    value: onlyBLines.join('\n') || '\u200b',
                    inline: true,
                },
            );
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
