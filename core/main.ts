
import { REST, Routes, Interaction, CacheType } from 'discord.js';
import { createAudioPlayer, joinVoiceChannel, createAudioResource, AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { Client, GatewayIntentBits } from 'discord.js';
import ytdl from 'ytdl-core'
import fs from "fs"
import { exit } from 'process';
const youtubesearchapi = require("youtube-search-api");
require("dotenv").config();

const player = createAudioPlayer();
let resource = createAudioResource("/home/oda/Downloads/cam.mp3");

const TOKEN = process.env.DISCORD_TOKEN || exit(1);
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || exit(1);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

async function singasong(inter: any, song: string) {

    let guild = client.guilds.cache.get(inter.guildId!);
    if (!guild) {
        await inter.reply("Internal 2pacerror, contact the nigga who wrote this");
        return;
    }

    let member = guild?.members.cache.get(inter.member?.user.id!);
    if (!member) {
        await inter.reply("Internal 2pacerror, contact the nigga who wrote this");
        return;
    }

    let voice = member.voice.channel;
    if (!voice?.joinable) {
        await inter.reply("Can't join this voice channel cuh");
        return;
    }

    player.pause();
    let connection = getVoiceConnection(voice.guild.id);
    if (connection === undefined) {
        connection = joinVoiceChannel({
            channelId: voice.id,
            guildId: voice.guild.id,
            adapterCreator: voice.guild.voiceAdapterCreator
        });
        connection.subscribe(player);
    }

    let info: string = "";

    if (
        song.startsWith("https://youtube.com") ||
        song.startsWith("youtube.com") ||
        song.startsWith("www.youtube.com") ||
        song.startsWith("https://www.youtube.com")
    ) {
        ytdl(song, { filter: 'audioonly' }).pipe(fs.createWriteStream('tmp.mp3')).on("finish", () => {
            resource = createAudioResource("tmp.mp3");
            player.play(resource);
        })
    }
    else {
        const res = await youtubesearchapi.GetListByKeyword(song, false, 5);
        if (res.items[0].length === 0) {
            await inter.reply("2pac found nothing");
            return;
        }

        info = ` - playing ${res.items[0].title}`;
        ytdl(`https://www.youtube.com/watch?v=${res.items[0].id}`, { filter: 'audioonly' }).pipe(fs.createWriteStream('tmp.mp3')).on("finish", () => {
            resource = createAudioResource("tmp.mp3");
            player.play(resource);
        })
    }

    await inter.reply(`2pacalypse has begun${info}`);
}

async function main() {

    const commands = [
        {
            name: 'singasong',
            description: 'sing a song',
            options: [
                {
                    name: 'song',
                    description: 'song to play',
                    type: 3,
                    required: 'true'
                }
            ]
        },
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    client.on('ready', () => {
        console.log(`Logged in as ${client!.user!.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "singasong")
            await singasong(interaction, interaction.options.getString("song", true))

    });

    player.on(AudioPlayerStatus.Idle, () => {

    });

    client.login(TOKEN);
}

main();
