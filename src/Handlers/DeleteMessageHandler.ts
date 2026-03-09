import { Handler } from '#captain/Handlers/Handler.js';
import MessageService from '#captain/Services/MessageService.js';

export default class DeleteMessageHandler extends Handler<'messageDelete'> {
    private messageService = new MessageService();

    async handle() {
        const [message] = this.args;

        if (!message.guildId) return;

        await this.messageService.softDelete(message.id).catch(console.error);
    }
}
