import SlashCommand from '#captain/Commands/SlashCommand.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import BirthdayJob from '#captain/Jobs/BirthdayJob.js';
export default class AdminCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup((group) => group
        .setName('birthday')
        .setDescription('Birthday management')
        .addSubcommand((subcommand) => subcommand
        .setName('announce')
        .setDescription('Manually trigger birthday announcements for today')));
    async execute(client, interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        if (subcommandGroup === 'birthday' && subcommand === 'announce') {
            await this.handleBirthdayAnnounce(client, interaction);
        }
    }
    async handleBirthdayAnnounce(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const birthdayJob = new BirthdayJob(client);
        await birthdayJob.execute();
        await interaction.editReply('Birthday announcements have been sent');
    }
}
