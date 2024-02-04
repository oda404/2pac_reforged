import { REST, Routes } from "discord.js";
import { DISCORD_TOKEN, DISCORD_CLIENT_ID } from "./environ";
import { exit } from "process";

export const TPAC_COMMAND_PLAYSONG = "singasong";
export const TPAC_COMMAND_LEAVE = "leave";
export const TPAC_COMMAND_SKIP = "skip";
export const TPAC_COMMAND_SKIP_PLAYLIST = "skip_pl";

const commands = [
    {
        name: TPAC_COMMAND_PLAYSONG,
        description: 'Join the caller\'s vc and play a song.',
        options: [
            {
                name: 'song',
                description: 'YouTube URL/YouTube search',
                type: 3,
                required: 'true'
            }
        ],
    },
    {
        name: TPAC_COMMAND_LEAVE,
        description: 'Stop playing and leave the vc.',
    },
    {
        name: TPAC_COMMAND_SKIP,
        description: 'Skip a single song.',
    }
];

export async function tpac_register_commands() {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
        exit(1);
    }
}
