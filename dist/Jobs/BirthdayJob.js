import Job from '../Jobs/Job.js';
import { prisma } from '../Services/Prisma.js';
import { env } from 'process';
export default class BirthdayJob extends Job {
    schedule = '0 12 * * *';
    birthdayChannelId = env.NODE_ENV === 'production' ? '583718278468206614' : '1204231308427919400';
    async execute() {
        const today = new Date();
        const currentMonth = today.getUTCMonth() + 1;
        const currentDay = today.getUTCDate();
        const birthdays = await prisma.birthday.findMany({
            where: {
                month: currentMonth,
                day: currentDay,
            },
        });
        if (birthdays.length === 0) {
            console.log('No birthdays today');
            return;
        }
        const channel = await this.client.channels.fetch(this.birthdayChannelId);
        if (!channel || !channel.isTextBased()) {
            console.error('Birthday channel not found or is not a text channel');
            return;
        }
        const message = this.getBirthdayMessage(birthdays.map((b) => b.userId));
        await channel.send(message);
        console.log(`Announced ${birthdays.length} birthday(s)`);
    }
    getBirthdayMessage(userIds) {
        const userMentions = userIds.map((id) => `<@${id}>`);
        if (userIds.length === 1) {
            const messages = [
                `🎉 Happy Birthday, ${userMentions[0]}! Hope you have an amazing day! 🎂`,
                `🎈 It's ${userMentions[0]}'s birthday! Wishing you all the best! 🎁`,
                `🎊 Happy Birthday to ${userMentions[0]}! May your day be filled with joy! 🎉`,
                `🎂 Celebrating ${userMentions[0]} today! Happy Birthday! 🎈`,
                `🥳 ${userMentions[0]} is having a birthday! Let's celebrate! 🎊`,
            ];
            return messages[Math.floor(Math.random() * messages.length)];
        }
        let mentionsList;
        if (userIds.length === 2) {
            mentionsList = `${userMentions[0]} and ${userMentions[1]}`;
        }
        else {
            const lastMention = userMentions[userMentions.length - 1];
            const otherMentions = userMentions.slice(0, -1).join(', ');
            mentionsList = `${otherMentions} and ${lastMention}`;
        }
        const multipleMessages = [
            `🎉 Happy Birthday to ${mentionsList}! Hope you all have an amazing day! 🎂`,
            `🎈 It's a special day for ${mentionsList}! Wishing you all the best! 🎁`,
            `🎊 Celebrating ${mentionsList} today! Happy Birthday everyone! 🎉`,
            `🎂 Multiple birthdays today! Happy Birthday to ${mentionsList}! 🎈`,
            `🥳 Let's celebrate ${mentionsList} today! Happy Birthday! 🎊`,
        ];
        return multipleMessages[Math.floor(Math.random() * multipleMessages.length)];
    }
}
