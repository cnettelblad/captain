import { ChatInputCommandInteraction, Interaction } from "discord.js";
import SlashCommand from "Captain/Commands/SlashCommand";

export default class CommandDispatcher {
    private commands: Map<string, SlashCommand> = new Map();

    constructor(commands: SlashCommand[]) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }

    async handle(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction.client, interaction as ChatInputCommandInteraction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);

            const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}
