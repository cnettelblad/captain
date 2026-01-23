import SlashCommand from '../Commands/SlashCommand.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import TankService from '../Services/TankService.js';
export default class FreeCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('free')
        .setDescription('Free a user from the tank')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((option) => option.setName('user').setDescription('The user to free').setRequired(true));
    async execute(client, interaction) {
        const user = interaction.options.getUser('user', true);
        const tankService = new TankService(client);
        const activeSentences = await tankService.getActiveSentences(user.id);
        if (activeSentences.length === 0) {
            await interaction.reply({
                content: `${user} is not currently in the tank.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await tankService.freeUser(user.id, interaction.user.id);
        await interaction.reply(`${user} has been freed from the tank by ${interaction.user}.`);
    }
}
