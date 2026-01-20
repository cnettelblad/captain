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
} from 'discord.js';
import MeetupService from '#captain/Services/MeetupService.js';

const GUILD_ID = '583718278468206612';

export default class MeetupCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('meetup')
        .setDescription('Meetup related commands')
        .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription("List the people you've met"),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            await this.handleList(client, interaction);
        }
    }

    private async handleList(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meetupService = new MeetupService(client);
        const encounters = await meetupService.getConfirmedMeetups(interaction.user.id);

        if (encounters.length === 0) {
            await interaction.editReply("You haven't met anyone yet!");
            return;
        }

        const userIds = encounters.map((e) =>
            e.userA === interaction.user.id ? e.userB : e.userA,
        );

        const guild = await client.guilds.fetch(GUILD_ID);
        const displayNames: string[] = [];

        for (const userId of userIds) {
            let displayName: string;
            try {
                const member = await guild.members.fetch(userId);
                displayName = `<@${member.id}>`;
            } catch {
                try {
                    const user = await client.users.fetch(userId);
                    displayName = `~~${user.username}~~`;
                } catch {
                    displayName = `~~Unknown User~~`;
                }
            }
            displayNames.push(displayName);
        }

        const rowCount = Math.ceil(displayNames.length / 3);
        const columns: string[][] = [[], [], []];

        for (let i = 0; i < displayNames.length; i++) {
            const columnIndex = Math.floor(i / rowCount);
            const orderNumber = i + 1;
            columns[columnIndex].push(`${orderNumber}. ${displayNames[i]}`);
        }

        const fields = columns
            .filter((col) => col.length > 0)
            .map((col) => ({
                name: '\u200b',
                value: col.join('\n'),
                inline: true,
            }));

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.displayName}'s Meetup List`)
            .setDescription(
                `Below are the people that have met ${interaction.user.displayName} in person.`,
            )
            .setColor(0x2383db)
            .setFields(fields)
            .setFooter({ text: 'Use /meetup list to see your list.' });

        const shareButton = new ButtonBuilder()
            .setCustomId(`meetup_share_${interaction.user.id}`)
            .setLabel('Share')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(shareButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    }

    public async handleButton(interaction: ButtonInteraction): Promise<void> {
        const [, action, userId] = interaction.customId.split('_');

        if (action !== 'share') return;

        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: 'This button is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const embed = interaction.message.embeds[0];

        if (!embed) {
            await interaction.reply({
                content: 'Could not find the embed to share.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (interaction.channel && 'send' in interaction.channel) {
            await interaction.channel.send({ embeds: [embed] });
        }

        await interaction.update({ components: [] });
    }
}
