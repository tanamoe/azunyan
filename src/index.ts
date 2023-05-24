import type {
  AutocompletePlayerCommand,
  PlayerCommand,
} from "./types/command.js";
import type { PlayerClient } from "./types/client.js";

import { logger } from "./lib/logger.js";
import { register } from "./lib/register.js";

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { Player } from "discord-player";
import {
  AttachmentExtractor,
  YouTubeExtractor,
} from "@discord-player/extractor";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DISCORD_TOKEN)
  throw new Error("Discord token is not defined.");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
}) as PlayerClient;

// Registering commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    const { command }: { command: PlayerCommand | AutocompletePlayerCommand } =
      await import(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = (interaction.client as PlayerClient).commands.get(
      interaction.commandName
    ) as AutocompletePlayerCommand;

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName}`);
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (e) {
      logger.error(e);
    }
  }

  if (interaction.isChatInputCommand()) {
    const command = (interaction.client as PlayerClient).commands.get(
      interaction.commandName
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName} nyaaaaa~`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (e) {
      logger.error(e);
    }
  }
});

// Start the client
await register(client);

const player = new Player(client);

player.extractors.register(YouTubeExtractor, {});
player.extractors.register(AttachmentExtractor, {});

logger.info("Ready.");

// Start the bot
client.login(DISCORD_TOKEN);
