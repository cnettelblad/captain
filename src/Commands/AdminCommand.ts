import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ChatInputCommandInteraction,
    Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import BirthdayJob from '#captain/Jobs/BirthdayJob.js';
import OldSchoolJob from '#captain/Jobs/OldSchoolJob.js';
import MeetupService from '#captain/Services/MeetupService.js';

export default class AdminCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator commands')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
        )
        .addSubcommandGroup((group) =>
            group
                .setName('birthday')
                .setDescription('Birthday management')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('announce')
                        .setDescription('Manually trigger birthday announcements for today'),
                ),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('oldschool')
                .setDescription('Old School role management')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('run')
                        .setDescription('Manually trigger the Old School role check'),
                ),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('met')
                .setDescription('Meetup management')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Create a confirmed meetup between two users')
                        .addUserOption((option) =>
                            option.setName('user1').setDescription('First user').setRequired(true),
                        )
                        .addUserOption((option) =>
                            option.setName('user2').setDescription('Second user').setRequired(true),
                        ),
                ),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'birthday' && subcommand === 'announce') {
            await this.handleBirthdayAnnounce(client, interaction);
        } else if (subcommandGroup === 'oldschool' && subcommand === 'run') {
            await this.handleOldSchoolRun(client, interaction);
        } else if (subcommandGroup === 'met' && subcommand === 'add') {
            await this.handleMetAdd(client, interaction);
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

    private async handleOldSchoolRun(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const oldSchoolJob = new OldSchoolJob(client);
        await oldSchoolJob.execute();

        await interaction.editReply('Old School role check completed. Check console for results.');
    }

    private async handleMetAdd(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void> {
        const user1 = interaction.options.getUser('user1', true);
        const user2 = interaction.options.getUser('user2', true);

        if (user1.id === user2.id) {
            await interaction.reply({
                content: 'Cannot create a meetup between the same user.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (user1.bot || user2.bot) {
            await interaction.reply({
                content: 'Cannot create a meetup with a bot.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meetupService = new MeetupService(client);
        const existingEncounter = await meetupService.findEncounter(user1.id, user2.id);

        if (existingEncounter?.status === 'confirmed') {
            await interaction.editReply(`Meetup between ${user1} and ${user2} already exists.`);
            return;
        }

        if (existingEncounter) {
            await meetupService.updateToConfirmed(existingEncounter);
        } else {
            await meetupService.createConfirmedEncounter(user1.id, user2.id, interaction.user.id);
        }

        await interaction.editReply(`Meetup between ${user1} and ${user2} has been created.`);
    }
}
