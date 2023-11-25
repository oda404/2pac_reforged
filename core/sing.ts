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
import { Client } from "discord.js";
const youtubesearchapi = require("youtube-search-api");
import { createWriteStream } from "fs";

interface SingContext {
    guild_id: string;
    player: AudioPlayer;
    queue: string[];
    stable: boolean;
    ytdl_shat_pants: boolean;
};

let sing_contexts: SingContext[] = [];

const is_yt_link = (str: string) => {
    return str.startsWith("https://youtube.com") ||
        str.startsWith("youtube.com") ||
        str.startsWith("www.youtube.com") ||
        str.startsWith("https://www.youtube.com");
}

function stream_resource_from_ytdl(ctx: SingContext, url: string) {
    let resource = createAudioResource(ytdl(url, { filter: 'audioonly' }).on("error", () => {
        ctx.ytdl_shat_pants = true;
        ctx.player.stop(true);
    }));
    ctx.player.play(resource);
}

async function stream_resource_from_cache(ctx: SingContext, url: string) {

    let cache_name = `song_guild_${ctx.guild_id}.mp3`;
    ytdl(url, { filter: 'audioonly' }).pipe(createWriteStream(cache_name))
        .on("error", () => {
            ctx.ytdl_shat_pants = true;
            ctx.player.stop(true);
        })
        .on("finish", () => {
            ctx.player.play(createAudioResource(cache_name));
        });
}

async function play_song_impl(ctx: SingContext, song: string): Promise<string | null> {
    let info: string = "";

    if (is_yt_link(song)) {
        if (ctx.stable)
            stream_resource_from_cache(ctx, song);
        else
            stream_resource_from_ytdl(ctx, song);
    }
    else {
        const res = await youtubesearchapi.GetListByKeyword(song, false, 1);
        if (res.items[0].length === 0) {
            return "2pac found nothing";
        }
        info = ` - playing ${res.items[0].title}`;

        const url = `https://www.youtube.com/watch?v=${res.items[0].id}`;
        if (ctx.stable)
            stream_resource_from_cache(ctx, url)
        else
            stream_resource_from_ytdl(ctx, url);
    }

    return `2pacalypse has begun${info}`;
}

export async function tpac_singasong(inter: any, client: Client, song: string, stable: boolean) {

    let guild = client.guilds.cache.get(inter.guildId!);
    if (!guild) {
        inter.reply("Internal 2pacerror, contact the nigga who wrote me");
        return;
    }

    let member = guild?.members.cache.get(inter.member?.user.id!);
    if (!member) {
        inter.reply("Internal 2pacerror, contact the nigga who wrote me");
        return;
    }

    let voice = member.voice.channel;
    if (!voice) {
        inter.reply("Your bitch ass is not in a voice channel");
        return
    }

    if (!voice.joinable) {
        inter.reply("Can't join this voice channel");
        return;
    }

    let connection = getVoiceConnection(voice.guild.id);
    if (connection === undefined) {
        connection = joinVoiceChannel({
            channelId: voice.id,
            guildId: voice.guild.id,
            adapterCreator: voice.guild.voiceAdapterCreator
        });

        const ctx: SingContext = {
            guild_id: voice.guildId,
            player: createAudioPlayer(),
            queue: [],
            stable: stable,
            ytdl_shat_pants: false
        };
        sing_contexts.push(ctx);

        ctx.player.on(AudioPlayerStatus.Idle, async () => {
            if (ctx.ytdl_shat_pants) {
                console.log(inter.channel?.isTextBased);
                await inter.channel?.send("YT timeout. Too bad");
                ctx.ytdl_shat_pants = false;
            }

            if (ctx.queue.length === 0)
                connection?.disconnect();
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            const ctx = sing_contexts.find((c) => { return c.guild_id == voice?.guildId });
            if (!ctx) {
                inter.reply("Internal 2pacerror, contact the nigga who wrote me");
                return;
            }

            const idx = sing_contexts.indexOf(ctx);
            if (idx === -1) {
                inter.reply("Internal 2pacerror, contact the nigga who wrote me");
                return;
            }

            sing_contexts.splice(idx, 1);
            connection?.destroy();
        })

        connection.on(VoiceConnectionStatus.Ready, async () => {
            if (connection!.subscribe(ctx.player) !== undefined) {
                const res = await play_song_impl(ctx, song);
                if (res)
                    inter.reply(res);
            }
        });

        return;
    }

    const ctx = sing_contexts.find((c) => { return c.guild_id == voice?.guildId });
    if (!ctx) {
        inter.reply("Internal 2pacerror, contact the nigga who wrote me");
        return;
    }

    const res = await play_song_impl(ctx, song);
    if (res)
        inter.reply(res);
}
