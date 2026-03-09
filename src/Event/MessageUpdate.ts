import Event from '#captain/Event/Event.js';
import UpdateMessageHandler from '#captain/Handlers/UpdateMessageHandler.js';

export default class MessageUpdate extends Event<'messageUpdate'> {
    name = 'messageUpdate' as const;
    handlers = [UpdateMessageHandler];
}
