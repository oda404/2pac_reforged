
import { Client, GatewayIntentBits } from 'discord.js';
import { DISCORD_TOKEN } from './environ';
import { TPAC_COMMAND_PLAYSONG, tpac_register_commands } from './commands';
import { tpac_singasong } from "./sing";
import { exit } from 'process';

const client = new Client(
    {
        intents: [
            GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates
        ]
    }
);

async function main() {

    await tpac_register_commands();

    process.on('SIGINT', function () {
        client.destroy();
        exit(0);
    });

    client.on('ready', () => {
        console.log(`Logged in as ${client!.user!.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === TPAC_COMMAND_PLAYSONG) {
            const song = interaction.options.getString("song");
            if (!song) {
                interaction.reply("2pac error no song given!");
                return;
            }

            let stable = interaction.options.getBoolean("stable");
            // if (stable === null)
            stable = true;
            tpac_singasong(interaction, client, song, stable);
            return;
        }

        interaction.reply("Unhandled interaction, contact the nigga who wrote this");
    });

    client.login(DISCORD_TOKEN);

    client.destroy()
}

main();
