import SlashCommand from '../Commands/SlashCommand.js';
import { EmbedBuilder, MessageFlags, SlashCommandBuilder, } from 'discord.js';
import LastFmService from '../Services/LastFm/LastFmService.js';
export default class FmCommand extends SlashCommand {
    lastFmService = new LastFmService();
    data = new SlashCommandBuilder()
        .setName('fm')
        .setDescription('Last.fm music statistics')
        .addSubcommand((subcommand) => subcommand
        .setName('set')
        .setDescription('Link your Last.fm account')
        .addStringOption((option) => option
        .setName('username')
        .setDescription('Your Last.fm username')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('unset').setDescription('Unlink your Last.fm account'))
        .addSubcommand((subcommand) => subcommand
        .setName('np')
        .setDescription('Show now playing or recent track')
        .addUserOption((option) => option.setName('user').setDescription('User to check (defaults to you)')))
        .addSubcommand((subcommand) => subcommand
        .setName('recent')
        .setDescription('Show recent tracks')
        .addUserOption((option) => option.setName('user').setDescription('User to check (defaults to you)'))
        .addIntegerOption((option) => option
        .setName('limit')
        .setDescription('Number of tracks to show (1-15)')
        .setMinValue(1)
        .setMaxValue(15)))
        .addSubcommand((subcommand) => subcommand
        .setName('top')
        .setDescription('Show top artists, albums, or tracks')
        .addStringOption((option) => option
        .setName('type')
        .setDescription('What to show')
        .setRequired(true)
        .addChoices({ name: 'Artists', value: 'artists' }, { name: 'Albums', value: 'albums' }, { name: 'Tracks', value: 'tracks' }))
        .addStringOption((option) => option
        .setName('period')
        .setDescription('Time period')
        .addChoices({ name: 'Last 7 Days', value: '7day' }, { name: 'Last Month', value: '1month' }, { name: 'Last 3 Months', value: '3month' }, { name: 'Last 6 Months', value: '6month' }, { name: 'Last Year', value: '12month' }, { name: 'All Time', value: 'overall' }))
        .addUserOption((option) => option.setName('user').setDescription('User to check (defaults to you)')))
        .addSubcommand((subcommand) => subcommand
        .setName('profile')
        .setDescription('Show Last.fm profile stats')
        .addUserOption((option) => option.setName('user').setDescription('User to check (defaults to you)')))
        .addSubcommand((subcommand) => subcommand
        .setName('compare')
        .setDescription('Compare music taste with another user')
        .addUserOption((option) => option
        .setName('user')
        .setDescription('User to compare with')
        .setRequired(true)));
    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            switch (subcommand) {
                case 'set':
                    await this.handleSet(interaction);
                    break;
                case 'unset':
                    await this.handleUnset(interaction);
                    break;
                case 'np':
                    await this.handleNowPlaying(interaction);
                    break;
                case 'recent':
                    await this.handleRecent(interaction);
                    break;
                case 'top':
                    await this.handleTop(interaction);
                    break;
                case 'profile':
                    await this.handleProfile(interaction);
                    break;
                case 'compare':
                    await this.handleCompare(interaction);
                    break;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            await interaction.reply({
                content: `Error: ${errorMessage}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
    async handleSet(interaction) {
        const username = interaction.options.getString('username', true);
        const userId = interaction.user.id;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            await this.lastFmService.setUsername(userId, username);
            await interaction.editReply(`Successfully linked your Last.fm account: **${username}**\n` +
                `You can now use other /fm commands!`);
        }
        catch (error) {
            await interaction.editReply(`Failed to link Last.fm account. Please make sure the username **${username}** exists on Last.fm.`);
        }
    }
    async handleUnset(interaction) {
        const userId = interaction.user.id;
        try {
            await this.lastFmService.removeUsername(userId);
            await interaction.reply({
                content: 'Your Last.fm account has been unlinked.',
                flags: MessageFlags.Ephemeral,
            });
        }
        catch (error) {
            await interaction.reply({
                content: 'You do not have a linked Last.fm account.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
    async handleNowPlaying(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await interaction.deferReply();
        const username = await this.getUsername(targetUser);
        const tracks = await this.lastFmService.getRecentTracks(username, 1);
        if (tracks.length === 0) {
            await interaction.editReply(`${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} not listened to anything recently.`);
            return;
        }
        const track = tracks[0];
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${targetUser.username}${track.nowPlaying ? ' is now playing' : "'s last track"}`,
            iconURL: targetUser.displayAvatarURL(),
        })
            .setTitle(`${track.artist} — ${track.name}`)
            .setURL(`https://www.last.fm/user/${username}`)
            .setColor(track.nowPlaying ? 0x00ff00 : 0x3b82f6);
        if (track.album) {
            embed.addFields({ name: 'Album', value: track.album, inline: true });
        }
        if (track.image) {
            embed.setThumbnail(track.image);
        }
        if (!track.nowPlaying && track.date) {
            const timestamp = parseInt(track.date);
            embed.setFooter({ text: `Played` });
            embed.setTimestamp(timestamp * 1000);
        }
        await interaction.editReply({ embeds: [embed] });
    }
    async handleRecent(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const limit = interaction.options.getInteger('limit') || 10;
        await interaction.deferReply();
        const username = await this.getUsername(targetUser);
        const tracks = await this.lastFmService.getRecentTracks(username, limit);
        if (tracks.length === 0) {
            await interaction.editReply(`${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} not listened to anything recently.`);
            return;
        }
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${targetUser.username}'s recent tracks`,
            iconURL: targetUser.displayAvatarURL(),
        })
            .setColor(0x3b82f6)
            .setURL(`https://www.last.fm/user/${username}`)
            .setDescription(tracks
            .map((track, i) => {
            const nowPlaying = track.nowPlaying ? '🎵 ' : `${i + 1}. `;
            return `${nowPlaying}**${track.artist}** — ${track.name}`;
        })
            .join('\n'));
        if (tracks[0].image) {
            embed.setThumbnail(tracks[0].image);
        }
        await interaction.editReply({ embeds: [embed] });
    }
    async handleTop(interaction) {
        const type = interaction.options.getString('type', true);
        const period = (interaction.options.getString('period') || 'overall');
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await interaction.deferReply();
        const username = await this.getUsername(targetUser);
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${targetUser.username}'s top ${type}`,
            iconURL: targetUser.displayAvatarURL(),
        })
            .setColor(0x3b82f6)
            .setURL(`https://www.last.fm/user/${username}`)
            .setFooter({ text: this.lastFmService.formatPeriod(period) });
        if (type === 'artists') {
            const artists = await this.lastFmService.getTopArtists(username, period, 10);
            if (artists.length === 0) {
                await interaction.editReply('No data available for this time period.');
                return;
            }
            embed.setDescription(artists
                .map((artist, i) => `${i + 1}. **${artist.name}** — ${artist.playcount} plays`)
                .join('\n'));
            if (artists[0].image) {
                embed.setThumbnail(artists[0].image);
            }
        }
        else if (type === 'albums') {
            const albums = await this.lastFmService.getTopAlbums(username, period, 10);
            if (albums.length === 0) {
                await interaction.editReply('No data available for this time period.');
                return;
            }
            embed.setDescription(albums
                .map((album, i) => `${i + 1}. **${album.artist}** — ${album.name} (${album.playcount} plays)`)
                .join('\n'));
            if (albums[0].image) {
                embed.setThumbnail(albums[0].image);
            }
        }
        else {
            const tracks = await this.lastFmService.getTopTracks(username, period, 10);
            if (tracks.length === 0) {
                await interaction.editReply('No data available for this time period.');
                return;
            }
            embed.setDescription(tracks
                .map((track, i) => `${i + 1}. **${track.artist}** — ${track.name} (${track.playcount} plays)`)
                .join('\n'));
            if (tracks[0].image) {
                embed.setThumbnail(tracks[0].image);
            }
        }
        await interaction.editReply({ embeds: [embed] });
    }
    async handleProfile(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await interaction.deferReply();
        const username = await this.getUsername(targetUser);
        const userInfo = await this.lastFmService.getUserInfo(username);
        const registeredDate = new Date(parseInt(userInfo.registered) * 1000);
        const accountAge = Math.floor((Date.now() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${targetUser.username}'s Last.fm profile`,
            iconURL: targetUser.displayAvatarURL(),
        })
            .setTitle(userInfo.name)
            .setURL(userInfo.url)
            .setColor(0x3b82f6)
            .addFields({
            name: 'Total Scrobbles',
            value: parseInt(userInfo.playcount).toLocaleString(),
            inline: true,
        }, {
            name: 'Account Age',
            value: `${accountAge.toLocaleString()} days`,
            inline: true,
        });
        if (userInfo.realname) {
            embed.addFields({ name: 'Name', value: userInfo.realname, inline: true });
        }
        if (userInfo.country) {
            embed.addFields({ name: 'Country', value: userInfo.country, inline: true });
        }
        if (userInfo.image) {
            embed.setThumbnail(userInfo.image);
        }
        await interaction.editReply({ embeds: [embed] });
    }
    async handleCompare(interaction) {
        const targetUser = interaction.options.getUser('user', true);
        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                content: 'You cannot compare with yourself!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.deferReply();
        const username1 = await this.getUsername(interaction.user);
        const username2 = await this.getUsername(targetUser);
        const comparison = await this.lastFmService.compareTaste(username1, username2);
        const compatibilityEmoji = comparison.compatibility >= 70
            ? '🔥'
            : comparison.compatibility >= 50
                ? '👍'
                : comparison.compatibility >= 30
                    ? '😐'
                    : '😬';
        const embed = new EmbedBuilder()
            .setTitle(`${compatibilityEmoji} Music Taste Compatibility`)
            .setDescription(`**${interaction.user.username}** and **${targetUser.username}** have **${comparison.compatibility}%** compatible music taste!`)
            .setColor(comparison.compatibility >= 70
            ? 0x22c55e
            : comparison.compatibility >= 50
                ? 0x3b82f6
                : 0xef4444);
        if (comparison.sharedArtists.length > 0) {
            embed.addFields({
                name: 'Top Shared Artists',
                value: comparison.sharedArtists
                    .slice(0, 5)
                    .map((artist, i) => `${i + 1}. **${artist.name}**\n` +
                    `   ${interaction.user.username}: ${artist.user1Plays} plays | ` +
                    `${targetUser.username}: ${artist.user2Plays} plays`)
                    .join('\n'),
            });
        }
        else {
            embed.addFields({
                name: 'Shared Artists',
                value: 'No shared artists found in your top 50!',
            });
        }
        await interaction.editReply({ embeds: [embed] });
    }
    /**
     * Helper to get Last.fm username for a Discord user
     */
    async getUsername(user) {
        const username = await this.lastFmService.getUsername(user.id);
        if (!username) {
            throw new Error(`${user.id === user.client.user.id ? 'You do' : `${user.username} does`} not have a linked Last.fm account. ` +
                `Use \`/fm set <username>\` to link an account.`);
        }
        return username;
    }
}
