import SlashCommand from '../Commands/SlashCommand.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import BirthdayJob from '../Jobs/BirthdayJob.js';
import OldSchoolJob from '../Jobs/OldSchoolJob.js';
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
        .setDescription('Manually trigger birthday announcements for today')))
        .addSubcommandGroup((group) => group
        .setName('oldschool')
        .setDescription('Old School role management')
        .addSubcommand((subcommand) => subcommand
        .setName('run')
        .setDescription('Manually trigger the Old School role check')));
    async execute(client, interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        if (subcommandGroup === 'birthday' && subcommand === 'announce') {
            await this.handleBirthdayAnnounce(client, interaction);
        }
        else if (subcommandGroup === 'oldschool' && subcommand === 'run') {
            await this.handleOldSchoolRun(client, interaction);
        }
    }
    async handleBirthdayAnnounce(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const birthdayJob = new BirthdayJob(client);
        await birthdayJob.execute();
        await interaction.editReply('Birthday announcements have been sent');
    }
    async handleOldSchoolRun(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const oldSchoolJob = new OldSchoolJob(client);
        await oldSchoolJob.execute();
        await interaction.editReply('Old School role check completed. Check console for results.');
    }
}
