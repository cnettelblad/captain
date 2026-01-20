import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import SlashCommand from '#captain/Commands/SlashCommand.js';
import MetCommand from '#captain/Commands/MetCommand.js';

export default class CommandDispatcher {
    private commands: Map<string, SlashCommand> = new Map();

    constructor(commands: SlashCommand[]) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }

    async handle(interaction: Interaction): Promise<void> {
        if (interaction.isChatInputCommand()) {
            await this.handleCommand(interaction);
        } else if (interaction.isButton()) {
            await this.handleButton(interaction);
        }
    }

    private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const command = this.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction.client, interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);

            const errorMessage = {
                content: 'There was an error while executing this command!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    private async handleButton(interaction: import('discord.js').ButtonInteraction): Promise<void> {
        try {
            // Handle met command buttons
            if (interaction.customId.startsWith('met_')) {
                const metCommand = this.commands.get('met') as MetCommand | undefined;
                if (metCommand) {
                    await metCommand.handleButton(interaction);
                }
                return;
            }
        } catch (error) {
            console.error(`Error handling button interaction:`, error);

            const errorMessage = {
                content: 'There was an error processing your response!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}
