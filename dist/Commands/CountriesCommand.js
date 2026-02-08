import SlashCommand from '#captain/Commands/SlashCommand.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder, } from 'discord.js';
import CountryService from '#captain/Services/CountryService.js';
export default class CountriesCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('countries')
        .setDescription('Track countries you have visited')
        .addSubcommand((subcommand) => subcommand
        .setName('add')
        .setDescription('Add a country you have visited')
        .addStringOption((option) => option
        .setName('country')
        .setDescription('Country name, code, or flag emoji')
        .setRequired(true))
        .addStringOption((option) => option
        .setName('date')
        .setDescription('When you visited (e.g. 2024-06-15)')
        .setRequired(false))
        .addStringOption((option) => option
        .setName('note')
        .setDescription('A note about your visit')
        .setRequired(false)))
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List the countries you have visited'));
    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'add') {
            await this.handleAdd(client, interaction);
        }
        else if (subcommand === 'list') {
            await this.handleList(client, interaction);
        }
    }
    async handleAdd(client, interaction) {
        const input = interaction.options.getString('country', true);
        const dateInput = interaction.options.getString('date');
        const note = interaction.options.getString('note');
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
        let visitedAt = null;
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
        try {
            await countryService.addCountry(interaction.user.id, country.code, visitedAt, note);
        }
        catch (error) {
            if (error?.code === 'P2002') {
                await interaction.reply({
                    content: `You already have ${country.emoji} ${country.name} on your list.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            throw error;
        }
        let message = `${country.emoji} ${country.name} added to your visited countries!`;
        if (visitedAt) {
            message += ` (visited ${visitedAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })})`;
        }
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
    async handleButton(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const userId = parts[2];
        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: 'This button is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (action === 'decline') {
            await interaction.update({ content: 'Cancelled.', components: [] });
            return;
        }
        const countryCode = parts[3];
        const countryService = new CountryService();
        const country = countryService.resolveCountry(countryCode);
        if (!country) {
            await interaction.update({ content: 'Could not find that country.', components: [] });
            return;
        }
        try {
            await countryService.addCountry(interaction.user.id, country.code, null, null);
        }
        catch (error) {
            if (error?.code === 'P2002') {
                await interaction.update({
                    content: `You already have ${country.emoji} ${country.name} on your list.`,
                    components: [],
                });
                return;
            }
            throw error;
        }
        await interaction.update({
            content: `${country.emoji} ${country.name} added to your visited countries!`,
            components: [],
        });
    }
    async handleSelectMenu(interaction) {
        const [, action, userId] = interaction.customId.split('_');
        if (action !== 'add')
            return;
        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: 'This menu is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
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
        try {
            await countryService.addCountry(interaction.user.id, country.code, null, null);
        }
        catch (error) {
            if (error?.code === 'P2002') {
                await interaction.update({
                    content: `You already have ${country.emoji} ${country.name} on your list.`,
                    components: [],
                });
                return;
            }
            throw error;
        }
        await interaction.update({
            content: `${country.emoji} ${country.name} added to your visited countries!`,
            components: [],
        });
    }
    async handleList(client, interaction) {
        await interaction.deferReply();
        const countryService = new CountryService();
        const userCountries = await countryService.getUserCountries(interaction.user.id);
        if (userCountries.length === 0) {
            await interaction.editReply("You haven't added any countries yet! Use `/countries add` to get started.");
            return;
        }
        const lines = userCountries.map((uc) => {
            const country = countryService.resolveCountry(uc.countryCode);
            const emoji = country?.emoji ?? '🏳️';
            const name = country?.name ?? uc.countryCode;
            return `${emoji} ${name}`;
        });
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.displayName}'s Visited Countries`)
            .setDescription(lines.join('\n'))
            .setColor(0x2383db)
            .setFooter({ text: `${userCountries.length} countries visited` });
        await interaction.editReply({ embeds: [embed] });
    }
    async handlePartialMatches(interaction, matches) {
        const options = matches.slice(0, 4).map((c) => ({
            label: c.name,
            value: c.code,
            emoji: c.emoji,
        }));
        options.push({
            label: 'None of the above',
            value: 'none',
            emoji: '❌',
        });
        if (options.length === 1) {
            const confirmButton = new ButtonBuilder()
                .setCustomId(`countries_add_${interaction.user.id}_${options[0].value}`)
                .setLabel(`Yes`)
                .setStyle(ButtonStyle.Primary);
            const declineButton = new ButtonBuilder()
                .setCustomId(`countries_decline_${interaction.user.id}`)
                .setLabel('No')
                .setStyle(ButtonStyle.Danger);
            const row = new ActionRowBuilder().addComponents(confirmButton, declineButton);
            await interaction.reply({
                content: `Did you mean ${options[0].emoji} **${options[0].label}**?`,
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`countries_add_${interaction.user.id}`)
            .setPlaceholder('Select a country')
            .addOptions(options);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({
            content: `Multiple countries match your input. Please select one:`,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
}
