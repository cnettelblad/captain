import Event from '../Event/Event.js';
import IntroductionHandler from '../Handlers/IntroductionHandler.js';
export default class MessageCreate extends Event {
    name = 'messageCreate';
    handlers = [IntroductionHandler];
}
