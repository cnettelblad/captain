import SlashCommand from '../Commands/SlashCommand.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import TankService from '../Services/TankService.js';
import { parseDuration, formatDuration } from '../Utils/Duration.js';
export default class TankCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('tank')
        .setDescription('Send a user to the tank')
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
        .addUserOption((option) => option.setName('user').setDescription('The user to tank').setRequired(true))
        .addStringOption((option) => option.setName('duration').setDescription('Duration (e.g., 1h, 30m, 1d)').setRequired(false))
        .addStringOption((option) => option.setName('reason').setDescription('Reason for tanking').setRequired(false));
    async execute(client, interaction) {
        const user = interaction.options.getUser('user', true);
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');
        if (user.bot) {
            await interaction.reply({
                content: 'Cannot tank a bot.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const tankService = new TankService(client);
        let durationMs = null;
        if (durationInput) {
            durationMs = parseDuration(durationInput);
            if (durationMs === null) {
                await interaction.reply({
                    content: 'Invalid duration format. Use formats like: 30s, 5m, 1h, 1d',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }
        const member = await interaction.guild?.members.fetch(user.id);
        if (!member) {
            await interaction.reply({
                content: 'User is not in this server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await tankService.tankUser(member, interaction.user.id, durationMs, reason);
        const durationText = durationMs ? formatDuration(durationMs) : 'indefinitely';
        let message = `${user} was tanked by ${interaction.user} for ${durationText}.`;
        if (reason) {
            message += ` Reason: ${reason}`;
        }
        await interaction.reply(message);
        await tankService.sendTankWelcome(user.id);
    }
}
