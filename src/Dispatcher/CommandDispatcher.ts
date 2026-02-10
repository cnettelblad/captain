import { ChatInputCommandInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import SlashCommand from '#captain/Commands/SlashCommand.js';
import MetCommand from '#captain/Commands/MetCommand.js';
import MeetupCommand from '#captain/Commands/MeetupCommand.js';
import CountriesCommand from '#captain/Commands/CountriesCommand.js';

export default class CommandDispatcher {
    private commands: Map<string, SlashCommand> = new Map();

    constructor(commands: SlashCommand[]) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }

    async handle(interaction: Interaction): Promise<void> {
        if (interaction.isChatInputCommand()) {
            return this.handleCommand(interaction);
        }

        if (interaction.isButton()) {
            return this.handleButton(interaction);
        }

        if (interaction.isStringSelectMenu()) {
            return this.handleSelectMenu(interaction);
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

    private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        try {
            if (interaction.customId.startsWith('countries_')) {
                const countriesCommand = this.commands.get('countries') as CountriesCommand;
                return countriesCommand.handleSelectMenu(interaction);
            }
        } catch (error) {
            console.error(`Error handling select menu interaction:`, error);

            const errorMessage = {
                content: 'There was an error processing your selection!',
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
            if (interaction.customId.startsWith('met_')) {
                const metCommand = this.commands.get('met') as MetCommand;
                return metCommand.handleButton(interaction);
            }

            if (interaction.customId.startsWith('meetup_')) {
                const meetupCommand = this.commands.get('meetup') as MeetupCommand;
                return meetupCommand.handleButton(interaction);
            }

            if (interaction.customId.startsWith('countries_')) {
                const countriesCommand = this.commands.get('countries') as CountriesCommand;
                return countriesCommand.handleButton(interaction);
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
