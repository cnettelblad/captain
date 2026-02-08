export default class CommandDispatcher {
    commands = new Map();
    constructor(commands) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }
    async handle(interaction) {
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
    async handleCommand(interaction) {
        const command = this.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction.client, interaction);
        }
        catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            const errorMessage = {
                content: 'There was an error while executing this command!',
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            }
            else {
                await interaction.reply(errorMessage);
            }
        }
    }
    async handleSelectMenu(interaction) {
        try {
            if (interaction.customId.startsWith('countries_')) {
                const countriesCommand = this.commands.get('countries');
                return countriesCommand.handleSelectMenu(interaction);
            }
        }
        catch (error) {
            console.error(`Error handling select menu interaction:`, error);
            const errorMessage = {
                content: 'There was an error processing your selection!',
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            }
            else {
                await interaction.reply(errorMessage);
            }
        }
    }
    async handleButton(interaction) {
        try {
            if (interaction.customId.startsWith('met_')) {
                const metCommand = this.commands.get('met');
                return metCommand.handleButton(interaction);
            }
            if (interaction.customId.startsWith('meetup_')) {
                const meetupCommand = this.commands.get('meetup');
                return meetupCommand.handleButton(interaction);
            }
            if (interaction.customId.startsWith('countries_')) {
                const countriesCommand = this.commands.get('countries');
                return countriesCommand.handleButton(interaction);
            }
        }
        catch (error) {
            console.error(`Error handling button interaction:`, error);
            const errorMessage = {
                content: 'There was an error processing your response!',
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            }
            else {
                await interaction.reply(errorMessage);
            }
        }
    }
}
