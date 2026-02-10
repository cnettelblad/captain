import crypto from 'crypto';
import { prisma } from '../Services/Prisma.js';
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_API_SECRET = process.env.LASTFM_API_SECRET;
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
export default class LastFmService {
    /**
     * Validates that Last.fm API credentials are configured
     */
    validateConfig() {
        if (!LASTFM_API_KEY || !LASTFM_API_SECRET) {
            throw new Error('Last.fm API credentials not configured. Please set LASTFM_API_KEY and LASTFM_API_SECRET environment variables.');
        }
    }
    /**
     * Generates MD5 signature for Last.fm API requests
     */
    generateSignature(params) {
        const sorted = Object.keys(params).sort();
        const string = sorted.map((key) => key + params[key]).join('') + LASTFM_API_SECRET;
        return crypto.createHash('md5').update(string, 'utf8').digest('hex');
    }
    /**
     * Makes a request to the Last.fm API
     */
    async makeRequest(params) {
        this.validateConfig();
        const queryParams = new URLSearchParams({
            ...params,
            api_key: LASTFM_API_KEY,
            format: 'json',
        });
        const response = await fetch(`${LASTFM_API_URL}?${queryParams}`);
        const data = await response.json();
        if (data.error) {
            throw new Error(`Last.fm API Error: ${data.message}`);
        }
        return data;
    }
    /**
     * Stores or updates a user's Last.fm username
     */
    async setUsername(discordUserId, lastfmUsername) {
        // Validate username exists on Last.fm
        await this.getUserInfo(lastfmUsername);
        return prisma.lastFmUser.upsert({
            where: { userId: discordUserId },
            update: { lastfmUsername, updatedAt: new Date() },
            create: {
                userId: discordUserId,
                lastfmUsername,
            },
        });
    }
    /**
     * Removes a user's Last.fm connection
     */
    async removeUsername(discordUserId) {
        await prisma.lastFmUser.delete({
            where: { userId: discordUserId },
        });
    }
    /**
     * Gets a user's stored Last.fm username
     */
    async getUsername(discordUserId) {
        const user = await prisma.lastFmUser.findUnique({
            where: { userId: discordUserId },
        });
        return user?.lastfmUsername ?? null;
    }
    /**
     * Gets user info from Last.fm
     */
    async getUserInfo(username) {
        const data = await this.makeRequest({
            method: 'user.getinfo',
            user: username,
        });
        const user = data.user;
        return {
            name: user.name,
            realname: user.realname || undefined,
            playcount: user.playcount,
            registered: user.registered.unixtime,
            country: user.country || undefined,
            image: user.image?.[3]?.['#text'] || undefined,
            url: user.url,
        };
    }
    /**
     * Gets a user's recent tracks
     */
    async getRecentTracks(username, limit = 10) {
        const data = await this.makeRequest({
            method: 'user.getrecenttracks',
            user: username,
            limit: limit.toString(),
            extended: '1',
        });
        const tracks = data.recenttracks?.track;
        if (!tracks || tracks.length === 0) {
            return [];
        }
        return tracks.map((track) => ({
            name: track.name,
            artist: track.artist?.name || track.artist?.['#text'] || 'Unknown',
            album: track.album?.['#text'] || undefined,
            image: track.image?.[3]?.['#text'] || undefined,
            nowPlaying: track['@attr']?.nowplaying === 'true',
            date: track.date?.uts || undefined,
        }));
    }
    /**
     * Gets a user's top artists for a given period
     */
    async getTopArtists(username, period = 'overall', limit = 10) {
        const data = await this.makeRequest({
            method: 'user.gettopartists',
            user: username,
            period,
            limit: limit.toString(),
        });
        const artists = data.topartists?.artist;
        if (!artists || artists.length === 0) {
            return [];
        }
        return artists.map((artist) => ({
            name: artist.name,
            playcount: artist.playcount,
            image: artist.image?.[3]?.['#text'] || undefined,
            url: artist.url || undefined,
        }));
    }
    /**
     * Gets a user's top albums for a given period
     */
    async getTopAlbums(username, period = 'overall', limit = 10) {
        const data = await this.makeRequest({
            method: 'user.gettopalbums',
            user: username,
            period,
            limit: limit.toString(),
        });
        const albums = data.topalbums?.album;
        if (!albums || albums.length === 0) {
            return [];
        }
        return albums.map((album) => ({
            name: album.name,
            artist: album.artist?.name || album.artist?.['#text'] || 'Unknown',
            playcount: album.playcount,
            image: album.image?.[3]?.['#text'] || undefined,
            url: album.url || undefined,
        }));
    }
    /**
     * Gets a user's top tracks for a given period
     */
    async getTopTracks(username, period = 'overall', limit = 10) {
        const data = await this.makeRequest({
            method: 'user.gettoptracks',
            user: username,
            period,
            limit: limit.toString(),
        });
        const tracks = data.toptracks?.track;
        if (!tracks || tracks.length === 0) {
            return [];
        }
        return tracks.map((track) => ({
            name: track.name,
            artist: track.artist?.name || track.artist?.['#text'] || 'Unknown',
            playcount: track.playcount,
            image: track.image?.[3]?.['#text'] || undefined,
        }));
    }
    /**
     * Formats a period string for display
     */
    formatPeriod(period) {
        const periodMap = {
            overall: 'All Time',
            '7day': 'Last 7 Days',
            '1month': 'Last Month',
            '3month': 'Last 3 Months',
            '6month': 'Last 6 Months',
            '12month': 'Last Year',
        };
        return periodMap[period];
    }
    /**
     * Calculates taste compatibility between two users
     * Returns a percentage based on shared top artists
     */
    async compareTaste(username1, username2) {
        const [user1Artists, user2Artists] = await Promise.all([
            this.getTopArtists(username1, 'overall', 50),
            this.getTopArtists(username2, 'overall', 50),
        ]);
        const user1Map = new Map(user1Artists.map((a) => [a.name.toLowerCase(), a.playcount]));
        const user2Map = new Map(user2Artists.map((a) => [a.name.toLowerCase(), a.playcount]));
        const sharedArtists = [];
        let totalScore = 0;
        user1Artists.forEach((artist, index) => {
            const artistName = artist.name.toLowerCase();
            if (user2Map.has(artistName)) {
                const user2Index = user2Artists.findIndex((a) => a.name.toLowerCase() === artistName);
                // Score based on positions in top lists
                const score = Math.max(0, 50 - index) + Math.max(0, 50 - user2Index);
                totalScore += score;
                sharedArtists.push({
                    name: artist.name,
                    user1Plays: artist.playcount,
                    user2Plays: user2Map.get(artistName),
                });
            }
        });
        // Calculate compatibility percentage
        const maxPossibleScore = 50 * 50; // If all top 50 matched perfectly
        const compatibility = Math.min(100, Math.round((totalScore / maxPossibleScore) * 100));
        // Sort shared artists by combined play count
        sharedArtists.sort((a, b) => {
            const aTotal = parseInt(a.user1Plays) + parseInt(a.user2Plays);
            const bTotal = parseInt(b.user1Plays) + parseInt(b.user2Plays);
            return bTotal - aTotal;
        });
        return {
            compatibility,
            sharedArtists: sharedArtists.slice(0, 10), // Top 10 shared artists
        };
    }
}
