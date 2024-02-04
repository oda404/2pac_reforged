
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';
import { DISCORD_TOKEN } from './environ';
import { TPAC_COMMAND_LEAVE, TPAC_COMMAND_PLAYSONG, tpac_register_commands } from './commands';
import { tpac_leave, tpac_singasong } from "./sing";
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

        if (process.env.NODE_ENV === "dev") {
            client.user?.setPresence({
                activities: [
                    {
                        type: ActivityType.Custom,
                        name: "Running in dev mode",
                    }
                ],
                status: "idle"
            });
        }
        else {
            client.user?.setPresence({
                activities: [{
                    type: ActivityType.Custom,
                    name: `Running on 2pac-${process.env.npm_package_version}`
                }],
                status: "online"
            });
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === TPAC_COMMAND_PLAYSONG) {
            const song = interaction.options.getString("song");
            if (!song) {
                interaction.reply("2pac error no song given!");
                return;
            }

            tpac_singasong(interaction, client, song);
            return;
        }

        if (interaction.commandName === TPAC_COMMAND_LEAVE) {
            tpac_leave(interaction, client);
            return;
        }

        interaction.reply("Unhandled interaction, contact the nigga who wrote this");
    });

    client.login(DISCORD_TOKEN);
}

main();
