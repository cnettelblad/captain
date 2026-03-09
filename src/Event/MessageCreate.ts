import Event from '#captain/Event/Event.js';
import IntroductionHandler from '#captain/Handlers/IntroductionHandler.js';
import StoreMessageHandler from '#captain/Handlers/StoreMessageHandler.js';

export default class MessageCreate extends Event<'messageCreate'> {
    name = 'messageCreate' as const;
    handlers = [StoreMessageHandler, IntroductionHandler];
}
