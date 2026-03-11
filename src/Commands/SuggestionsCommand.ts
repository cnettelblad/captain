import SlashCommand from '#captain/Commands/SlashCommand.js';
import SuggestionService from '#captain/Services/SuggestionService.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    SlashCommandSubcommandsOnlyBuilder,
    SlashCommandBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    TextDisplayBuilder,
} from 'discord.js';

export default class SuggestionsCommand extends SlashCommand {
    public data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
        .setName('suggestions')
        .setDescription('Manage server suggestions')
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Set up the suggestions prompt in a channel')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to post the suggestions prompt in')
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('View all submitted suggestions')
                .addIntegerOption((option) =>
                    option
                        .setName('page')
                        .setDescription('Page number')
                        .setMinValue(1),
                ),
        );

    private suggestionService = new SuggestionService();

    public async execute(_client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            return this.handleSet(interaction);
        }

        if (subcommand === 'list') {
            return this.handleList(interaction);
        }
    }

    private async handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
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
            .setDescription(
                'Got an idea that could improve **Wanderlust**?\n\n' +
                'We\'d love to hear it! Your suggestions help us make the server better for everyone.\n\n' +
                '📩 **Click the button below to submit your idea**.'
            )
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

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await (textChannel as TextChannel).send({ embeds: [embed], components: [row] });

        await interaction.reply({
            content: `Suggestions prompt has been posted in <#${channel.id}>.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
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

    public async handleButton(interaction: ButtonInteraction): Promise<void> {
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
            .setDescription('Share your thoughts on how we can improve Wanderlust! Your suggestions help us create a better experience for everyone.')
            .setTextInputComponent(input);

        modal
            .addTextDisplayComponents(infoText)
            .addLabelComponents(label);

        await interaction.showModal(modal);
    }

    public async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
        const suggestion = interaction.fields.getTextInputValue('suggestions_input');

        await this.suggestionService.create(interaction.user.id, suggestion);

        await interaction.reply({
            content: 'Your suggestion has been submitted. Thank you!',
            flags: MessageFlags.Ephemeral,
        });
    }
}
