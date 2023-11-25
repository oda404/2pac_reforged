import { exit } from "process";
require("dotenv").config();

if (!process.env.DISCORD_TOKEN) {
    console.log("DISCORD_TOKEN not found in environ.");
    exit(1);
}
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!process.env.DISCORD_CLIENT_ID) {
    console.log("DISCORD_CLIENT_ID not found in environ.");
    exit(1);
}
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
