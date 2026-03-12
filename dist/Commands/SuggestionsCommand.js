import SlashCommand from '../Commands/SlashCommand.js';
import SuggestionService from '../Services/SuggestionService.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle, FileUploadBuilder, LabelBuilder, TextDisplayBuilder, } from 'discord.js';
const SUGGESTIONS_LOG_CHANNEL = '1481647283513593918';
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
            '📩 **Click the button below to submit your idea**.')
            .setFooter({
            text: 'Wanderlust • Community Feedback',
            iconURL: 'https://cdn.discordapp.com/icons/583718278468206612/8da571af17099658cbe95519cfea6934.webp?size=64',
        })
            .setThumbnail('https://i.imgur.com/FjO3Ng5.png')
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
        const infoText = new TextDisplayBuilder()
            .setContent('This form is for feedback and ideas to improve **Wanderlust**, for ban appeals or issues with other members, please contact staff directly.');
        const input = new TextInputBuilder()
            .setCustomId('suggestions_input')
            .setPlaceholder('Describe your idea...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        const label = new LabelBuilder()
            .setLabel('Feedback & Ideas')
            .setDescription('Share your thoughts on how we can improve Wanderlust!')
            .setTextInputComponent(input);
        const fileUpload = new FileUploadBuilder()
            .setCustomId('suggestions_attachments')
            .setMaxValues(5)
            .setRequired(false);
        const attachmentLabel = new LabelBuilder()
            .setLabel('Attachments')
            .setDescription('Optionally attach images or files to your suggestion.')
            .setFileUploadComponent(fileUpload);
        modal
            .addTextDisplayComponents(infoText)
            .addLabelComponents(label)
            .addLabelComponents(attachmentLabel);
        await interaction.showModal(modal);
    }
    async handleModal(interaction) {
        const suggestion = interaction.fields.getTextInputValue('suggestions_input');
        const uploadedFiles = interaction.fields.getUploadedFiles('suggestions_attachments');
        const attachments = uploadedFiles
            ? [...uploadedFiles.values()].map((file) => ({
                url: file.url,
                filename: file.name,
                contentType: file.contentType,
                size: file.size,
            }))
            : [];
        await this.suggestionService.create(interaction.user.id, suggestion, attachments);
        const logChannel = await interaction.client.channels.fetch(SUGGESTIONS_LOG_CHANNEL);
        if (logChannel?.isTextBased()) {
            const embed = new EmbedBuilder()
                .setAuthor({
                name: interaction.user.displayName,
                iconURL: interaction.user.displayAvatarURL(),
            })
                .setDescription(suggestion)
                .setColor(0x5865f2)
                .setTimestamp();
            if (attachments.length > 0) {
                embed.setImage(attachments[0].url);
            }
            if (attachments.length > 1) {
                embed.addFields({
                    name: 'Additional Attachments',
                    value: attachments.slice(1).map((a) => `[${a.filename}](${a.url})`).join('\n'),
                });
            }
            await logChannel.send({ embeds: [embed] });
        }
        await interaction.reply({
            content: 'Your suggestion has been submitted. Thank you!',
            flags: MessageFlags.Ephemeral,
        });
    }
}
