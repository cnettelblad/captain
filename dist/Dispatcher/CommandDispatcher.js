export default class CommandDispatcher {
    commands = new Map();
    constructor(commands) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }
    async handle(interaction) {
        if (!interaction.isChatInputCommand())
            return;
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
}
