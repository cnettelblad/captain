# Last.fm Integration

Last.fm for Captain bot by muffn_

## Commands

- `/fm set <username>` - Link your Last.fm account
- `/fm unset` - Unlink your account
- `/fm np [user]` - Now playing / recent track
- `/fm recent [user] [limit]` - Recent tracks (1-15)
- `/fm top <type> [period] [user]` - Top artists/albums/tracks
- `/fm profile [user]` - User stats
- `/fm compare <user>` - Compare music taste

## Setup

### 1. Add last.fm api key/secret to .env

```env
LASTFM_API_KEY=your_api_key
LASTFM_API_SECRET=your_shared_secret
```

### 2. Deploy

```bash
npm run build
npm start  # Migrations to add tables to db will run
node dist/deploy-commands.js
```

## Database Migrations

Adds one new table: `LastFmUser`
- Stores Discord user ID → Last.fm username mappings
- Does not affect existing tables
- Migration applies automatically on start

## Architecture

- **Service**: `LastFmService.ts` - Last.fm API client
- **Command**: `FmCommand.ts` - Slash command implementation
- **Database**: `LastFmUser` model in Prisma schema
