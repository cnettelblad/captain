import Event from '../Event/Event.js';
import DeleteMessageHandler from '../Handlers/DeleteMessageHandler.js';
export default class MessageDelete extends Event {
    name = 'messageDelete';
    handlers = [DeleteMessageHandler];
}
