import SlashCommand from '../Commands/SlashCommand.js';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../Services/Prisma.js';
export default class BirthdayCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Manage your birthday')
        .addSubcommand((subcommand) => subcommand
        .setName('add')
        .setDescription('Set your birthday (month and day only)')
        .addStringOption((option) => option
        .setName('month')
        .setDescription('Month (1-12 or name e.g March)')
        .setRequired(true))
        .addIntegerOption((option) => option
        .setName('day')
        .setDescription('Day of the month (1-31)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(31)))
        .addSubcommand((subcommand) => subcommand.setName('remove').setDescription('Remove your birthday from the system'));
    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'add') {
            await this.handleAdd(interaction);
        }
        else if (subcommand === 'remove') {
            await this.handleRemove(interaction);
        }
    }
    async handleAdd(interaction) {
        const monthInput = interaction.options.getString('month', true);
        const day = interaction.options.getInteger('day', true);
        const userId = interaction.user.id;
        let month;
        try {
            month = this.parseMonth(monthInput);
        }
        catch (error) {
            await interaction.reply({
                content: 'Invalid month format. Please use a number (1-12) or month name (e.g., Mar, March).',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const daysInMonth = new Date(2000, month, 0).getDate();
        if (day > daysInMonth) {
            await interaction.reply({
                content: `Invalid date.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        try {
            await prisma.birthday.upsert({
                where: { userId },
                update: { month, day },
                create: {
                    userId,
                    month,
                    day,
                },
            });
            const formattedDate = new Date(2000, month - 1, day).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
            });
            await interaction.reply({
                content: `Your birthday has been set to ${formattedDate}!`,
                flags: MessageFlags.Ephemeral,
            });
        }
        catch (error) {
            console.error('Error saving birthday:', error);
            await interaction.reply({
                content: 'An error occurred while saving your birthday. Please try again.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
    async handleRemove(interaction) {
        const userId = interaction.user.id;
        try {
            const deleted = await prisma.birthday.delete({
                where: { userId },
            });
            if (deleted) {
                await interaction.reply({
                    content: 'Your birthday has been removed from the system.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
        catch (error) {
            await interaction.reply({
                content: "You don't have your birthday set.",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
    parseMonth(input) {
        const normalized = input.trim().toLowerCase();
        const numericMonth = parseInt(normalized);
        if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
            return numericMonth;
        }
        const monthNames = {
            jan: 1,
            january: 1,
            feb: 2,
            february: 2,
            mar: 3,
            march: 3,
            apr: 4,
            april: 4,
            may: 5,
            jun: 6,
            june: 6,
            jul: 7,
            july: 7,
            aug: 8,
            august: 8,
            sep: 9,
            sept: 9,
            september: 9,
            oct: 10,
            october: 10,
            nov: 11,
            november: 11,
            dec: 12,
            december: 12,
        };
        if (normalized in monthNames) {
            return monthNames[normalized];
        }
        throw new Error('Invalid month');
    }
}
