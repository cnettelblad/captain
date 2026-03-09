import { Handler } from '#captain/Handlers/Handler.js';
import MessageService from '#captain/Services/MessageService.js';

export default class UpdateMessageHandler extends Handler<'messageUpdate'> {
    private messageService = new MessageService();

    async handle() {
        const [, newMessage] = this.args;

        if (!newMessage.guildId) return;

        const fetched = newMessage.partial ? await newMessage.fetch() : newMessage;

        await this.messageService.update(fetched).catch(console.error);
    }
}
