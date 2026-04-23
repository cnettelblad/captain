# 🎵 Last.fm

Link your [Last.fm](https://www.last.fm/) account to share what you're listening to, show off your top artists, and see how your music taste stacks up against friends.

## Setup

### Link your account
```
/fm set [username]
```
**Example:** `/fm set carlnett`

### Unlink
```
/fm unset
```

## Commands

### ▶️ Now playing
```
/fm np [user]
```
**Example:** `/fm np @SomeUser`

The track you (or the tagged user) are currently scrobbling. Leave `user` empty to check your own.

### 🎧 Recent tracks
```
/fm recent [user] [limit(default 10)]
```
**Examples:**
- `/fm recent`
- `/fm recent @SomeUser 15`

Up to **15** of your most recent tracks.

### 🏆 Top artists / albums / tracks
```
/fm top [type] [period(default All Time)] [user]
```
**Example:** `/fm top Artists Last Month @SomeUser`

`type` can be **Artists**, **Albums**, or **Tracks**. Periods: **Last 7 Days**, **1 / 3 / 6 / 12 Months**, or **All Time**.

### 👤 Profile
```
/fm profile [user]
```
**Example:** `/fm profile @SomeUser`

Account age, total scrobbles, and country.

### 🔥 Compare
```
/fm compare [user]
```
**Example:** `/fm compare @Friend`

Compatibility score based on shared top artists.
