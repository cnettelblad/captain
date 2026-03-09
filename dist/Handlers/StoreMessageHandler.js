import { Handler } from '../Handlers/Handler.js';
import MessageService from '../Services/MessageService.js';
export default class StoreMessageHandler extends Handler {
    messageService = new MessageService();
    async handle() {
        const [message] = this.args;
        if (!message.guildId)
            return;
        await this.messageService.store(message).catch(console.error);
    }
}
