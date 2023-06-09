import type {
  AutocompletePlayerCommand,
  PlayerCommand,
} from "./types/command.js";

import { logger } from "./lib/logger.js";
import { register } from "./lib/register.js";

import * as dotenv from "dotenv";
import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import { Player } from "discord-player";
import {
  AttachmentExtractor,
  YouTubeExtractor,
} from "@discord-player/extractor";

import { youtubeCommand } from "./commands/player/youtube.js";
import { skipCommand } from "./commands/player/skip.js";
import { stopCommand } from "./commands/player/stop.js";
import { pingCommand } from "./commands/misc/ping.js";
import {
  attachmentCommand,
  attachmentContextMenu,
} from "./commands/player/attachment.js";
import { queueCommand } from "./commands/player/queue.js";

dotenv.config();

if (!process.env.DISCORD_TOKEN)
  throw new Error("Discord token is not defined.");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Registering commands
const commands: PlayerCommand[] = [
  youtubeCommand,
  attachmentContextMenu,
  attachmentCommand,
  skipCommand,
  stopCommand,
  pingCommand,
  queueCommand,
];

await register(commands);

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName
    ) as AutocompletePlayerCommand | undefined;

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

  if (
    interaction.isChatInputCommand() ||
    interaction.isMessageContextMenuCommand()
  ) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName
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

  if (interaction.isButton()) {
    const action = commands.find(
      (action) => action.data.name === interaction.customId
    );

    if (!action) {
      logger.error(`Không thực thi được hành động ${interaction.customId}`);
      return;
    }

    try {
      await action.execute(interaction);
    } catch (e) {
      logger.error(e);
    }
  }
});

// Start the client
const player = new Player(client);

player.extractors.register(YouTubeExtractor, {});
player.extractors.register(AttachmentExtractor, {});

logger.info("Ready.");

// Start the bot
client.login(DISCORD_TOKEN);

// Misc stuff. TODO: might refactor into a file
player.events.on("playerStart", (_, track) => {
  // Emitted when the player starts to play a song
  client.user?.setActivity(track.title, { type: ActivityType.Listening });
});

player.events.on("emptyQueue", () => {
  // Emitted when the player queue has finished
  client.user?.setActivity(undefined);
});
