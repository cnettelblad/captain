import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";

export default abstract class SlashCommand {
    public abstract data: SlashCommandBuilder;

    public abstract execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void>;
}
