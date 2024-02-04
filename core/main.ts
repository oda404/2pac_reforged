
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';
import { DISCORD_TOKEN } from './environ';
import { TPAC_COMMAND_LEAVE, TPAC_COMMAND_PLAYSONG, TPAC_COMMAND_SKIP, tpac_register_commands } from './commands';
import { tpac_leave, tpac_singasong, tpac_skip_one } from "./sing";
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

        switch (interaction.commandName) {
            case TPAC_COMMAND_PLAYSONG:
                const song = interaction.options.getString("song");
                if (!song) {
                    interaction.reply("No song was given!");
                    break;
                }

                tpac_singasong(interaction, client, song);
                break;

            case TPAC_COMMAND_LEAVE:
                tpac_leave(interaction, client);
                break;

            case TPAC_COMMAND_SKIP:
                tpac_skip_one(interaction, client);
                break;

            default:
                interaction.reply("Unhandled interaction!");
                break;
        }

    });

    client.login(DISCORD_TOKEN);
}

main();
