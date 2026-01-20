import SlashCommand from '#captain/Commands/SlashCommand.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { prisma } from '#captain/Services/Prisma.js';
import { UserEncounter } from '@prisma/client';

export default class MetCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName('met')
        .setDescription('Record that you met another user in person')
        .addUserOption((option) =>
            option.setName('user').setDescription('The user you met').setRequired(true),
        );

    public async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);
        const initiator = interaction.user;

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

        const pendingCount = await prisma.userEncounter.count({
            where: {
                createdBy: initiator.id,
                status: 'pending',
            },
        });

        if (pendingCount >= 10) {
            await interaction.reply({
                content:
                    'You have too many pending meetup requests. Please wait for some to be confirmed or declined before sending more.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Normalize user IDs so userA is always the smaller ID
        const [userA, userB] = [initiator.id, targetUser.id].sort();
        const existingEncounter = await prisma.userEncounter.findUnique({
            where: {
                userA_userB: { userA, userB },
            },
        });

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
                    await this.confirmEncounter(existingEncounter, client);
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

            if (
                existingEncounter.status === 'rejected' &&
                existingEncounter.createdBy !== initiator.id
            ) {
                await this.confirmEncounter(existingEncounter, client);
                await interaction.reply({
                    content: `Meetup with ${targetUser} confirmed!`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            if (
                existingEncounter.status === 'rejected' &&
                existingEncounter.createdBy === initiator.id &&
                existingEncounter.updatedAt < fourteenDaysAgo
            ) {
                await prisma.userEncounter.update({
                    where: { id: existingEncounter.id },
                    data: { status: 'pending', createdBy: initiator.id },
                });
            } else {
                await interaction.reply({
                    content: `Your previous meetup request with ${targetUser} was rejected. You can only send a new request after 14 days.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        } else {
            await prisma.userEncounter.create({
                data: { userA, userB, createdBy: initiator.id, status: 'pending' },
            });
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId(`met_confirm_${initiator.id}_${targetUser.id}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId(`met_decline_${initiator.id}_${targetUser.id}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            confirmButton,
            declineButton,
        );

        try {
            await targetUser.send({
                content: `${initiator} claims to have met you in person! Please confirm or decline:`,
                components: [row],
            });

            await interaction.reply({
                content: `Meetup request has been sent to ${targetUser}.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch {
            await interaction.reply({
                content: `Unable to send a DM to ${targetUser}. Their privacy settings may be blocking messages from bots.\n\nAsk them to run \`/met @${initiator.username}\` to confirm the meetup.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }

    public async handleButton(interaction: ButtonInteraction): Promise<void> {
        const [, action, initiatorId, targetId] = interaction.customId.split('_');

        if (interaction.user.id !== targetId) {
            await interaction.reply({
                content: 'This confirmation request is not for you!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const [userA, userB] = [initiatorId, targetId].sort();

        const encounter = await prisma.userEncounter.findUnique({
            where: {
                userA_userB: { userA, userB },
            },
        });

        if (!encounter || encounter.status !== 'pending') {
            await interaction.reply({
                content: 'This meetup request is no longer valid.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (action === 'confirm') {
            await this.confirmEncounter(encounter, interaction.client);
        } else {
            await prisma.userEncounter.update({
                where: { id: encounter.id },
                data: { status: 'rejected' },
            });
        }

        await interaction.update({
            content:
                action === 'confirm'
                    ? `Confirmed meeting <@${initiatorId}>!`
                    : `Declined the meetup request from <@${initiatorId}>.`,
            components: [],
        });
    }

    private async confirmEncounter(encounter: UserEncounter, client: Client): Promise<void> {
        await prisma.userEncounter.update({
            where: { id: encounter.id },
            data: { status: 'confirmed' },
        });

        try {
            const otherUserId =
                encounter.createdBy === encounter.userA ? encounter.userB : encounter.userA;
            const initiator = await client.users.fetch(encounter.createdBy);
            await initiator.send(`<@${otherUserId}> has confirmed that you met!`);
        } catch {
            // Ignore DM failures
        }

        this.handleMilestone(encounter, client);
    }

    private async handleMilestone(encounter: UserEncounter, client: Client): Promise<void> {
        const { userA, userB } = encounter;

        const MILESTONE_ROLES = {
            1: '1230237976605360168',
            5: '1230238066510139434',
            10: '1230238118729351189',
            25: '1352005935798947872',
            50: '1380168192999030814',
            100: '1380169001652719756',
        } as const;

        const [confirmedCountA, confirmedCountB] = await Promise.all([
            prisma.userEncounter.count({ where: { userA, status: 'confirmed' } }),
            prisma.userEncounter.count({ where: { userB, status: 'confirmed' } }),
        ]);

        const targets = [
            { userId: userA, count: confirmedCountA },
            { userId: userB, count: confirmedCountB },
        ];

        for (const { userId, count } of targets) {
            /**
             * This is a bit ugly, might refactor later idk.
             */
            const milestone = MILESTONE_ROLES[count as keyof typeof MILESTONE_ROLES];

            if (!milestone) continue;

            const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);

            if (!guild) continue;

            const member = await guild.members.fetch(userId);

            if (!member) continue;

            const role = await guild.roles.fetch(milestone);

            if (!role) continue;

            await member.roles.add(role);

            for (const [milestoneCount, roleId] of Object.entries(MILESTONE_ROLES)) {
                if (parseInt(milestoneCount) < count && member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId);
                }
            }

            try {
                await member.send(
                    `🎉 Congratulations! You've reached ${count} confirmed meetups and earned the ${role.name} role! 🎉`,
                );
            } catch {
                // Ignore DM failures
            }
        }
    }
}
