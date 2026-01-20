import SlashCommand from '../Commands/SlashCommand.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import { prisma } from '../Services/Prisma.js';
import BirthdayJob from '../Jobs/BirthdayJob.js';
import OldSchoolJob from '../Jobs/OldSchoolJob.js';
import MetCommand from '../Commands/MetCommand.js';
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
        .setDescription('Manually trigger the Old School role check')))
        .addSubcommandGroup((group) => group
        .setName('met')
        .setDescription('Meetup management')
        .addSubcommand((subcommand) => subcommand
        .setName('add')
        .setDescription('Create a confirmed meetup between two users')
        .addUserOption((option) => option.setName('user1').setDescription('First user').setRequired(true))
        .addUserOption((option) => option.setName('user2').setDescription('Second user').setRequired(true))));
    async execute(client, interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        if (subcommandGroup === 'birthday' && subcommand === 'announce') {
            await this.handleBirthdayAnnounce(client, interaction);
        }
        else if (subcommandGroup === 'oldschool' && subcommand === 'run') {
            await this.handleOldSchoolRun(client, interaction);
        }
        else if (subcommandGroup === 'met' && subcommand === 'add') {
            await this.handleMetAdd(client, interaction);
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
    async handleMetAdd(client, interaction) {
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
        const [userA, userB] = [user1.id, user2.id].sort();
        const existingEncounter = await prisma.userEncounter.findUnique({
            where: { userA_userB: { userA, userB } },
        });
        if (existingEncounter?.status === 'confirmed') {
            await interaction.editReply(`Meetup between ${user1} and ${user2} already exists.`);
            return;
        }
        if (existingEncounter) {
            await prisma.userEncounter.update({
                where: { id: existingEncounter.id },
                data: { status: 'confirmed' },
            });
        }
        else {
            const encounter = await prisma.userEncounter.create({
                data: {
                    userA,
                    userB,
                    createdBy: interaction.user.id,
                    status: 'confirmed',
                },
            });
            await MetCommand.handleMilestone(encounter, client);
        }
        await interaction.editReply(`Meetup between ${user1} and ${user2} has been created.`);
    }
}
