import Event from '../Event/Event.js';
import IntroductionHandler from '../Handlers/IntroductionHandler.js';
import StoreMessageHandler from '../Handlers/StoreMessageHandler.js';
export default class MessageCreate extends Event {
    name = 'messageCreate';
    handlers = [StoreMessageHandler, IntroductionHandler];
}
