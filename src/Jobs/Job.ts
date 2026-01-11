import { Client } from 'discord.js';
import cron from 'node-cron';

export default abstract class Job {
    protected client: Client;
    abstract schedule: string;

    constructor(client: Client) {
        this.client = client;
    }

    abstract execute(): Promise<void>;

    start() {
        cron.schedule(this.schedule, async () => {
            try {
                await this.execute();
            } catch (error) {
                console.error(`Error executing job ${this.constructor.name}:`, error);
            }
        });

        console.log(`${this.constructor.name} scheduled with cron: ${this.schedule}`);
    }
}
