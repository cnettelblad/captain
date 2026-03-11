import SlashCommand from '../Commands/SlashCommand.js';
import SuggestionService from '../Services/SuggestionService.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle, } from 'discord.js';
export default class SuggestionsCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('suggestions')
        .setDescription('Manage server suggestions')
        .addSubcommand((sub) => sub
        .setName('set')
        .setDescription('Set up the suggestions prompt in a channel')
        .addChannelOption((option) => option
        .setName('channel')
        .setDescription('The channel to post the suggestions prompt in')
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName('list')
        .setDescription('View all submitted suggestions')
        .addIntegerOption((option) => option
        .setName('page')
        .setDescription('Page number')
        .setMinValue(1)));
    suggestionService = new SuggestionService();
    async execute(_client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'set') {
            return this.handleSet(interaction);
        }
        if (subcommand === 'list') {
            return this.handleList(interaction);
        }
    }
    async handleSet(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            await interaction.reply({
                content: 'You need the **Manage Server** permission to use this command.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const channel = interaction.options.getChannel('channel', true);
        const textChannel = await interaction.guild?.channels.fetch(channel.id);
        if (!textChannel || !textChannel.isTextBased()) {
            await interaction.reply({
                content: 'Please select a text channel.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle('💡 Wanderlust - Feedback & Ideas')
            .setDescription('Got an idea that could improve **Wanderlust**?\n\n' +
            'We\'d love to hear it! Your suggestions help us make the server better for everyone.\n\n' +
            'All suggestions will be reviewed by the staff team and may be put up for a community vote.\n\n' +
            'Click the button below to submit your idea.')
            .setFooter({
            text: 'Wanderlust • Community Feedback',
        })
            .setColor(0x5865f2);
        const button = new ButtonBuilder()
            .setCustomId('suggestions_submit')
            .setLabel('Submit a Suggestion')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(button);
        await textChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({
            content: `Suggestions prompt has been posted in <#${channel.id}>.`,
            flags: MessageFlags.Ephemeral,
        });
    }
    async handleList(interaction) {
        const page = interaction.options.getInteger('page') ?? 1;
        const { suggestions, total, totalPages } = await this.suggestionService.list(page);
        if (suggestions.length === 0) {
            await interaction.reply({
                content: total === 0
                    ? 'No suggestions have been submitted yet.'
                    : `No suggestions found on page ${page}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const lines = suggestions.map((s, i) => {
            const index = (page - 1) * 10 + i + 1;
            const date = s.createdAt.toLocaleDateString();
            return `**${index}.** ${s.suggestion}\n> — <@${s.userId}> · ${date}`;
        });
        const embed = new EmbedBuilder()
            .setTitle('Suggestions')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: `Page ${page} of ${totalPages} · ${total} total suggestions` })
            .setColor(0x5865f2);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    async handleButton(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('suggestions_modal')
            .setTitle('Submit a Suggestion');
        const input = new TextInputBuilder()
            .setCustomId('suggestions_input')
            .setLabel('Your suggestion')
            .setPlaceholder('Describe your idea...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1024);
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }
    async handleModal(interaction) {
        const suggestion = interaction.fields.getTextInputValue('suggestions_input');
        await this.suggestionService.create(interaction.user.id, suggestion);
        await interaction.reply({
            content: 'Your suggestion has been submitted. Thank you!',
            flags: MessageFlags.Ephemeral,
        });
    }
}
