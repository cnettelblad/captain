import SlashCommand from "Captain/Commands/SlashCommand";
import { ChatInputCommandInteraction, Client, MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "Captain/Services/Prisma";

export default class BirthdayCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Manage your birthday')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Set your birthday')
                .addStringOption(option =>
                    option
                        .setName('date')
                        .setDescription('Your birthday (format: YYYY-MM-DD or YY-MM-DD)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your birthday from the system')
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await this.handleAdd(interaction);
        } else if (subcommand === 'remove') {
            await this.handleRemove(interaction);
        }
    }

    private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
        const dateInput = interaction.options.getString('date', true);
        const userId = interaction.user.id;

        let parsedDate: Date;
        try {
            parsedDate = this.parseDate(dateInput);
        } catch (error) {
            await interaction.reply({
                content: 'Invalid date format. Please use YYYY-MM-DD or YY-MM-DD format.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            await prisma.birthday.upsert({
                where: { userId },
                update: { date: parsedDate },
                create: {
                    userId,
                    date: parsedDate
                }
            });

            const formattedDate = parsedDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            await interaction.reply({
                content: `Your birthday has been set to ${formattedDate}!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error saving birthday:', error);
            await interaction.reply({
                content: 'An error occurred while saving your birthday. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
        const userId = interaction.user.id;

        try {
            const deleted = await prisma.birthday.delete({
                where: { userId }
            });

            if (deleted) {
                await interaction.reply({
                    content: 'Your birthday has been removed from the system.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            await interaction.reply({
                content: 'You don\'t have your birthday set.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    private parseDate(dateInput: string): Date {
        // YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            return date;
        }

        // YY-MM-DD format
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateInput)) {
            const [yearShort, month, day] = dateInput.split('-').map(Number);

            // Assume users are at least 16 years old
            // If YY > (current year - 16), assume 1900s, otherwise assume 2000s
            const currentYear = new Date().getFullYear();
            const cutoffYear = currentYear - 16;
            const cutoffYearShort = cutoffYear % 100;
            const year = yearShort > cutoffYearShort
                ? 1900 + yearShort
                : 2000 + yearShort;

            const date = new Date(year, month - 1, day);

            if (isNaN(date.getTime()) || date.getMonth() !== month - 1) {
                throw new Error('Invalid date');
            }
            return date;
        }

        throw new Error('Invalid date format');
    }
}
