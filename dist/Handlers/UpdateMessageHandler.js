import { Handler } from '../Handlers/Handler.js';
import MessageService from '../Services/MessageService.js';
export default class UpdateMessageHandler extends Handler {
    messageService = new MessageService();
    async handle() {
        const [, newMessage] = this.args;
        if (!newMessage.guildId)
            return;
        const fetched = newMessage.partial ? await newMessage.fetch() : newMessage;
        await this.messageService.update(fetched).catch(console.error);
    }
}
