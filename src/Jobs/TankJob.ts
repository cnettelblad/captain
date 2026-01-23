import Job from '#captain/Jobs/Job.js';
import TankService from '#captain/Services/TankService.js';

export default class TankJob extends Job {
    schedule = '* * * * *'; // Every minute

    async execute(): Promise<void> {
        const tankService = new TankService(this.client);
        const expiredSentences = await tankService.getExpiredSentences();

        if (expiredSentences.length === 0) {
            return;
        }

        for (const sentence of expiredSentences) {
            await tankService.freeUser(sentence.userId, null);
            console.log(`[TankJob] Freed user ${sentence.userId} (sentence expired)`);
        }

        console.log(`[TankJob] Processed ${expiredSentences.length} expired tank sentence(s)`);
    }
}
