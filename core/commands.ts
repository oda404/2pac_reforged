import { REST, Routes } from "discord.js";
import { DISCORD_TOKEN, DISCORD_CLIENT_ID } from "./environ";
import { exit } from "process";

export const TPAC_COMMAND_PLAYSONG = "singasong";

const commands = [
    {
        name: TPAC_COMMAND_PLAYSONG,
        description: 'sing a song',
        options: [
            {
                name: 'song',
                description: 'song to play',
                type: 3,
                required: 'true'
            },
            {
                name: 'stable',
                description: 'Use stable playback. May take longer to start playing.',
                type: 5,
                required: 'false'
            }
        ],
    },
    {
        name: 'pause',
        description: 'pause the current song',
    },
    {
        name: 'resume',
        description: 'resume the paused song',
    },
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
