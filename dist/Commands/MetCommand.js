import SlashCommand from '../Commands/SlashCommand.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder, } from 'discord.js';
import MeetupService from '../Services/MeetupService.js';
export default class MetCommand extends SlashCommand {
    data = new SlashCommandBuilder()
        .setName('met')
        .setDescription('Record that you met another user in person')
        .addUserOption((option) => option.setName('user').setDescription('The user you met').setRequired(true));
    async notifyInitiator(client, initiatorId, otherUserId) {
        try {
            const initiator = await client.users.fetch(initiatorId);
            await initiator.send(`<@${otherUserId}> has confirmed that you met!`);
        }
        catch {
            // Ignore DM failures
        }
    }
    async execute(client, interaction) {
        const targetUser = interaction.options.getUser('user', true);
        const initiator = interaction.user;
        const meetupService = new MeetupService(client);
        if (targetUser.id === initiator.id) {
            await interaction.reply({
                content: "You can't record a meetup with yourself!",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (targetUser.bot) {
            await interaction.reply({
                content: "You can't record a meetup with a bot!",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const pendingCount = await meetupService.countPendingByUser(initiator.id);
        if (pendingCount >= 10) {
            await interaction.reply({
                content: 'You have too many pending meetup requests. Please wait for some to be confirmed or declined before sending more.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const existingEncounter = await meetupService.findEncounter(initiator.id, targetUser.id);
        if (existingEncounter) {
            if (existingEncounter.status === 'confirmed') {
                await interaction.reply({
                    content: `You already have a confirmed meetup with ${targetUser}!`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (existingEncounter.status === 'pending') {
                if (existingEncounter.createdBy !== initiator.id) {
                    await meetupService.confirmEncounter(existingEncounter);
                    await this.notifyInitiator(client, existingEncounter.createdBy, initiator.id);
                    await interaction.reply({
                        content: `Meetup with ${targetUser} confirmed!`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                await interaction.reply({
                    content: `There's already a pending meetup request between you and ${targetUser}.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (existingEncounter.status === 'rejected' &&
                existingEncounter.createdBy !== initiator.id) {
                await meetupService.confirmEncounter(existingEncounter);
                await this.notifyInitiator(client, existingEncounter.createdBy, initiator.id);
                await interaction.reply({
                    content: `Meetup with ${targetUser} confirmed!`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            if (existingEncounter.status === 'rejected' &&
                existingEncounter.createdBy === initiator.id &&
                existingEncounter.updatedAt < fourteenDaysAgo) {
                await meetupService.updateToPending(existingEncounter, initiator.id);
            }
            else {
                await interaction.reply({
                    content: `Your previous meetup request with ${targetUser} was rejected. You can only send a new request after 14 days.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }
        else {
            await meetupService.createEncounter(initiator.id, targetUser.id, initiator.id);
        }
        const confirmButton = new ButtonBuilder()
            .setCustomId(`met_confirm_${initiator.id}_${targetUser.id}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);
        const declineButton = new ButtonBuilder()
            .setCustomId(`met_decline_${initiator.id}_${targetUser.id}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmButton, declineButton);
        try {
            await targetUser.send({
                content: `${initiator} claims to have met you in person! Please confirm or decline:`,
                components: [row],
            });
            await interaction.reply({
                content: `Meetup request has been sent to ${targetUser}.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        catch {
            await interaction.reply({
                content: `Unable to send a DM to ${targetUser}. Their privacy settings may be blocking messages from bots.\n\nAsk them to run \`/met @${initiator.username}\` to confirm the meetup.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
    async handleButton(interaction) {
        const [, action, initiatorId, targetId] = interaction.customId.split('_');
        const meetupService = new MeetupService(interaction.client);
        if (interaction.user.id !== targetId) {
            await interaction.reply({
                content: 'This confirmation request is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const encounter = await meetupService.findEncounter(initiatorId, targetId);
        if (!encounter || encounter.status !== 'pending') {
            await interaction.reply({
                content: 'This meetup request is no longer valid.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (action === 'confirm') {
            await meetupService.confirmEncounter(encounter);
            await this.notifyInitiator(interaction.client, encounter.createdBy, targetId);
        }
        else {
            await meetupService.rejectEncounter(encounter);
        }
        await interaction.update({
            content: action === 'confirm'
                ? `Confirmed meeting <@${initiatorId}>!`
                : `Declined the meetup request from <@${initiatorId}>.`,
            components: [],
        });
    }
}
