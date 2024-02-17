# 2PAC - Discord bot that actually plays music
As simple as that. All readily available Discord music bots that came after the shutdown of Rythm don't work with YouTube. This one does.

## What can this thing do?
Good features:
- Plays YouTube videos, provided either a link or a search query
- Plays videos from a playlist
- Uses `/` commands

Bad features:
- Only works with YouTube
- Can't play age restricted videos
- Can't play auto-generated playlists
- When playing a playlist it's always going to start playing from the begining of said playlist and not from the video you provided (if any)

Feel free to fix these if they bother you.

## How to use
First you have to create a Discord app through their dev portal and add it to your server. <br>
You'll need the app's <b>token</b> and <b>client id</b>.

### Download:
Clone this repository:
```console
git clone https://github.com/oda404/2pac_reforged
```

Go into the source directory & install dependencies:
```console
yarn install
```

### Configuration:
Rename the `.env.example` file to `.env` and edit the contents to match your app.
```console
DISCORD_TOKEN="<your_discord_app_token>"
DISCORD_CLIENT_ID="<your_discord_app_client_id>"
```

### Run:
Start the bot by running:
```console
yarn compile-run
```

If you plan on working on the bot, I recommend running it like this:
```console
yarn dev
```

## License
MIT. Do whatever you want as long as you credit me.
