export default class Event {
    client;
    once = false;
    constructor(client) {
        this.client = client;
    }
    async execute(...args) {
        for (const HandlerClass of this.handlers) {
            const handler = new HandlerClass(this.client, args);
            await handler.handle();
        }
    }
}
