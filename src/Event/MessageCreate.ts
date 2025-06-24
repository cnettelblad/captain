import { Message } from 'discord.js';
import Event from 'Captain/Event/Event';
import IntroductionHandler from 'Captain/Handlers/IntroductionHandler';

export default class MessageCreate extends Event<'messageCreate'> {
    name = 'messageCreate' as const;
    handlers = [
        IntroductionHandler
    ];
}