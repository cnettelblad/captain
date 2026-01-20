import {
    ChatInputCommandInteraction,
    Client,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export default abstract class SlashCommand {
    public abstract data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;

    public abstract execute(
        client: Client,
        interaction: ChatInputCommandInteraction,
    ): Promise<void>;
}
