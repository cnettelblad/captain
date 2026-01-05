import SlashCommand from "Captain/Commands/SlashCommand";
import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";

export default class PingCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!');

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await interaction.editReply(`Pong! Latency: ${latency}ms. API Latency: ${apiLatency}ms`);
    }
}
