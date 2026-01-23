import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ChatInputCommandInteraction,
    Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import TankService from '#captain/Services/TankService.js';

export default class FreeCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('free')
        .setDescription('Free a user from the tank')
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
        .addUserOption((option) =>
            option.setName('user').setDescription('The user to free').setRequired(true),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
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
