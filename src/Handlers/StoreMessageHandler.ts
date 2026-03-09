import { Handler } from '#captain/Handlers/Handler.js';
import MessageService from '#captain/Services/MessageService.js';

export default class StoreMessageHandler extends Handler<'messageCreate'> {
    private messageService = new MessageService();

    async handle() {
        const [message] = this.args;

        if (!message.guildId) return;

        await this.messageService.store(message).catch(console.error);
    }
}
