import { Handler } from '../Handlers/Handler.js';
import MessageService from '../Services/MessageService.js';
export default class DeleteMessageHandler extends Handler {
    messageService = new MessageService();
    async handle() {
        const [message] = this.args;
        if (!message.guildId)
            return;
        await this.messageService.softDelete(message.id).catch(console.error);
    }
}
