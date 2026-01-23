import Job from '../Jobs/Job.js';
import TankService from '../Services/TankService.js';
export default class TankJob extends Job {
    schedule = '* * * * *'; // Every minute
    async execute() {
        const tankService = new TankService(this.client);
        const sentences = await tankService.getExpiringSentences(60000);
        if (sentences.length === 0) {
            return;
        }
        const now = Date.now();
        for (const sentence of sentences) {
            if (!sentence.expiresAt)
                continue;
            const timeRemaining = sentence.expiresAt.getTime() - now;
            if (timeRemaining <= 0) {
                // Already expired, free immediately
                await tankService.freeUser(sentence.userId, null);
                console.log(`[TankJob] Freed user ${sentence.userId} (sentence expired)`);
            }
            else {
                // Expires within the next minute, schedule precise timeout
                setTimeout(async () => {
                    await tankService.freeUser(sentence.userId, null);
                    console.log(`[TankJob] Freed user ${sentence.userId} (scheduled release)`);
                }, timeRemaining);
                console.log(`[TankJob] Scheduled release for user ${sentence.userId} in ${timeRemaining}ms`);
            }
        }
    }
}
