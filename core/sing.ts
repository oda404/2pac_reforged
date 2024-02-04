import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnectionStatus
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import { CacheType, ChatInputCommandInteraction, Client, VoiceBasedChannel } from "discord.js";
const youtubesearchapi = require("youtube-search-api");
import { createWriteStream, existsSync, mkdirSync } from "fs";

interface StreamInfo {
    url: string;
    type: string;
    request: number;
};

interface StreamContext {
    guild_id: string;
    vc_id: string;
    player: AudioPlayer;
    queue: StreamInfo[];
    last_queue_request: number;
    current_request: number;
    error?: string;
};

interface PlaylistResponse {
    message: string;
    streams_queued: number;
}

let sing_contexts: StreamContext[] = [];

const is_yt_link = (str: string) => str.match(/^(https:\/\/)?(www.)?youtube.com/) !== null;
const song_cache_dir = "cache.songs";
const make_song_cache_path = (guild_id: string) => `${song_cache_dir}/guild_${guild_id}.mp3`;

async function tpac_stream_yt(url: string, ctx: StreamContext) {

    const cache_name = make_song_cache_path(ctx.guild_id);

    const ws = createWriteStream(cache_name);

    /* Why don't i stream it directly? Because it fails randomly :) */
    ytdl(url, { filter: 'audioonly' })
        .on("data", (chunk) => {
            ws.write(chunk);
        })
        .on("error", (err) => {
            ctx.error = err.message;
            ctx.player.emit("idle");
        })
        .on("close", () => {
            ctx.error = "Failed to download video, try again";
            ctx.player.emit("idle");
        })
        .on("end", () => {
            ws.end();
            ctx.player.play(createAudioResource(cache_name));
        });
}

async function tpac_stream_next_queued(ctx: StreamContext, drain_reqs: boolean = false) {

    if (ctx.queue.length === 0) {
        console.error("Tried to play queued song, but queue was empty!");
        return; // should not happen
    }

    if (drain_reqs && ctx.current_request !== -1) {
        while (ctx.queue.length > 0 && ctx.queue[0].request === ctx.current_request)
            ctx.queue.shift();

        if (ctx.queue.length === 0) {
            console.error("Queue was empty after draining!");
            return; // should not happen
        }
    }

    const stream = ctx.queue.shift()!;
    ctx.current_request = stream.request;

    switch (stream.type) {
        case "yt":
            tpac_stream_yt(stream.url, ctx)
            break;

        default:
            console.error(`Unknown stream type "${stream.type}"`);
            break;
    }
}

async function tpac_queue_yt_playlist(playlist_id: string, ctx: StreamContext): Promise<PlaylistResponse> {

    let playlist_data;
    try {
        playlist_data = await youtubesearchapi.GetPlaylistData(playlist_id);
    } catch (e) {
        return { message: "Invalid playlist, idk what this means, it can't be done.", streams_queued: 0 };
    }

    if (playlist_data.items.length === 0)
        return { message: "Playlist is empty!", streams_queued: 0 };

    let title: string | null = playlist_data.metadata.playlistMetadataRenderer.title;

    const requestn = ctx.last_queue_request++;
    playlist_data.items.forEach((video: any) => {
        ctx.queue.push({ type: "yt", url: `https://youtube.com/watch?v=${video.id}`, request: requestn });
    });

    return { message: `Playing playlist [${title !== null ? title : "???"}] with ${playlist_data.items.length} songs`, streams_queued: playlist_data.items.length };
}

async function play_song_impl(ctx: StreamContext, song: string): Promise<string> {
    let info: string = "";

    if (is_yt_link(song)) {

        /* URL shits it's pants if the url doesn't have a scheme */
        if (!song.startsWith("https://"))
            song = "https://" + song;

        const url = new URL(song);

        const playlist_id: string | null = url.searchParams.get("list");
        if (playlist_id) {
            let response = await tpac_queue_yt_playlist(playlist_id, ctx);
            info = response.message;
            if (response.streams_queued === 0)
                return info;
        }
        else {
            // Simple video
            info = "Playing video";
            ctx.queue.push({ url: song, type: "yt", request: ctx.last_queue_request++ });
        }
    }
    else {
        const res = await youtubesearchapi.GetListByKeyword(song, true, 1);
        if (res.items.length === 0)
            return "No videos were found!";

        switch (res.items[0].type) {
            case "playlist":
                let response = await tpac_queue_yt_playlist(res.items[0].id, ctx);
                info = response.message;
                if (response.streams_queued === 0)
                    return info;

                break;

            case "video":
                info = `Playing [${res.items[0].title}]`;
                ctx.queue.push({ type: "yt", url: `https://youtube.com/watch?v=${res.items[0].id}`, request: ctx.last_queue_request++ });
                break;

            default:
                info = "Don't know how to play this video";
                break;
        }
    }

    tpac_stream_next_queued(ctx, true);
    return info;
}

function tpac_connect_to_vc(inter: ChatInputCommandInteraction<CacheType>, vc: VoiceBasedChannel) {

    let connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator
    });

    const ctx: StreamContext = {
        guild_id: vc.guildId,
        vc_id: vc.id,
        player: createAudioPlayer(),
        queue: [],
        last_queue_request: 0,
        current_request: -1
    };
    sing_contexts.push(ctx);

    ctx.player.on(AudioPlayerStatus.Idle, async () => {
        if (ctx.error) {
            await inter.channel?.send(ctx.error);
            ctx.error = undefined;
        }

        if (ctx.queue.length === 0)
            connection?.disconnect();
        else
            tpac_stream_next_queued(ctx);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        const idx = sing_contexts.indexOf(ctx);
        if (idx === -1) {
            console.error("Couldn't find index of ctx to be destroyed!");
            connection?.destroy();
            return;
        }

        sing_contexts.splice(idx, 1);
        connection?.destroy();
    });

    connection.on(VoiceConnectionStatus.Ready, async () => {
        if (connection.subscribe(ctx.player) === undefined) {
            console.error("Failed to subscribe to player!");
            connection.destroy();
        }
    });

    return ctx;
}

function tpac_find_vc(inter: ChatInputCommandInteraction<CacheType>, client: Client, check_joinable: boolean = false): VoiceBasedChannel | null {
    let guild = client.guilds.cache.get(inter.guildId!);
    if (!guild) {
        inter.reply("Internal error, try again.");
        console.error("Failed to get calling guild!");
        return null;
    }

    let member = guild?.members.cache.get(inter.member?.user.id!);
    if (!member) {
        console.error("Failed to get calling member info!");
        inter.reply("Internal error, try again.");
        return null;
    }

    let vc = member.voice.channel;
    if (!vc) {
        inter.reply("Your bitch ass is not in a voice channel");
        return null;
    }

    if (check_joinable && !vc.joinable) {
        inter.reply("Can't join this voice channel");
        return null;
    }

    return vc;
}

export async function tpac_singasong(inter: ChatInputCommandInteraction<CacheType>, client: Client, song: string) {

    const vc = tpac_find_vc(inter, client, true);
    if (!vc)
        return;

    let ctx: StreamContext | undefined;
    if (getVoiceConnection(vc.guild.id) === undefined)
        ctx = tpac_connect_to_vc(inter, vc);
    else
        ctx = sing_contexts.find((c) => { return c.guild_id === vc!.guildId && c.vc_id === vc!.id });

    if (!ctx) {
        inter.reply("Internal error, try again.");
        console.error("Failed to get a valid stream context!");
        return;
    }

    console.log(`${sing_contexts.length}`)

    inter.reply(await play_song_impl(ctx, song));
}

export async function tpac_leave(inter: ChatInputCommandInteraction<CacheType>, client: Client) {
    const vc = tpac_find_vc(inter, client, true);
    if (!vc)
        return;

    let ctx = sing_contexts.find((c) => { return c.guild_id === vc!.guildId && c.vc_id === vc!.id });
    if (!ctx) {
        inter.reply("You are not in the same vc.");
        return;
    }

    ctx.queue = [];
    ctx.player.emit("idle");

    inter.reply("13.09.1996");
}


export async function tpac_skip_one(inter: ChatInputCommandInteraction<CacheType>, client: Client) {
    const vc = tpac_find_vc(inter, client, true);
    if (!vc)
        return;

    let ctx = sing_contexts.find((c) => { return c.guild_id === vc!.guildId && c.vc_id === vc!.id });
    if (!ctx) {
        inter.reply("You are not in the same vc.");
        return;
    }

    inter.reply("Skipped");
    ctx.player.emit("idle");
}
