import cron from 'node-cron';
export default class Job {
    client;
    constructor(client) {
        this.client = client;
    }
    start() {
        cron.schedule(this.schedule, async () => {
            try {
                await this.execute();
            }
            catch (error) {
                console.error(`Error executing job ${this.constructor.name}:`, error);
            }
        });
        console.log(`${this.constructor.name} scheduled with cron: ${this.schedule}`);
    }
}
