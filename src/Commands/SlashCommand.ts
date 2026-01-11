import { ChatInputCommandInteraction, Client, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";

export default abstract class SlashCommand {
    public abstract data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

    public abstract execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void>;
}
