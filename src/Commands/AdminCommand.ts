import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ChatInputCommandInteraction,
    Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from 'discord.js';
import { prisma } from '#captain/Services/Prisma.js';
import { env } from 'process';
import BirthdayJob from '#captain/Jobs/BirthdayJob.js';

export default class AdminCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup((group) =>
            group
                .setName('birthday')
                .setDescription('Birthday management')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('announce')
                        .setDescription('Manually trigger birthday announcements for today'),
                ),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'birthday' && subcommand === 'announce') {
            await this.handleBirthdayAnnounce(client, interaction);
        }
    }

    private async handleBirthdayAnnounce(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const birthdayJob = new BirthdayJob(client);
        await birthdayJob.execute();

        await interaction.editReply('Birthday announcements have been sent');
    }
}
