import { Client, ClientEvents } from 'discord.js';
import { Handler } from '#captain/Handlers/Handler.js';

type HandlerConstructor<K extends keyof ClientEvents> = new (
    client: Client,
    args: ClientEvents[K],
) => Handler<K>;

export default abstract class Event<K extends keyof ClientEvents> {
    abstract name: K;
    abstract handlers: HandlerConstructor<K>[];
    once: boolean = false;

    constructor(protected client: Client) {}

    async execute(...args: ClientEvents[K]) {
        for (const HandlerClass of this.handlers) {
            const handler = new HandlerClass(this.client, args);
            await handler.handle();
        }
    }
}
