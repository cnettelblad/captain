import {Client, GatewayIntentBits, TextChannel} from 'discord.js'
import { config } from 'dotenv'
import MessageCreate from "Captain/Event/MessageCreate";
import Event from "Captain/Event/Event";

config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
})

const events: Event<any>[] = [
    new MessageCreate(client),
];

// Register events
events.forEach(event => {
    client.on(
        event.constructor.name.charAt(0).toLowerCase() + event.constructor.name.slice(1),
        (...args) =>  event.execute(...args)
    )
})

client.once('ready', async () => {
    console.log('Bot is ready!')
    const guilds = await client.guilds.fetch()
    guilds.forEach(guild => {
        console.log(`Guild: ${guild.name} (ID: ${guild.id})`)
    })
})

client.login(process.env.DISCORD_TOKEN).catch(console.error)