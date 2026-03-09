import Event from '#captain/Event/Event.js';
import DeleteMessageHandler from '#captain/Handlers/DeleteMessageHandler.js';

export default class MessageDelete extends Event<'messageDelete'> {
    name = 'messageDelete' as const;
    handlers = [DeleteMessageHandler];
}
