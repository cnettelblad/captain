import Event from '#captain/Event/Event.js';
import IntroductionHandler from '#captain/Handlers/IntroductionHandler.js';
export default class MessageCreate extends Event {
    name = 'messageCreate';
    handlers = [IntroductionHandler];
}
