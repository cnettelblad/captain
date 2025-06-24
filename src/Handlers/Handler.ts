import {Client, ClientEvents} from 'discord.js';

export abstract class Handler<K extends keyof ClientEvents> {
    constructor(
        protected client: Client,
        protected args: ClientEvents[K]
    ) {}

    abstract handle(): Promise<void> | void;
}