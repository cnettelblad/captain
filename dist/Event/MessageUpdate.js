import Event from '../Event/Event.js';
import UpdateMessageHandler from '../Handlers/UpdateMessageHandler.js';
export default class MessageUpdate extends Event {
    name = 'messageUpdate';
    handlers = [UpdateMessageHandler];
}
