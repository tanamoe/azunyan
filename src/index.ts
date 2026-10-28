import { loadEnvFile } from "node:process";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { decideCommand, tuyanhemCommand } from "./commands/misc/decide.js";
import { gachaCommand } from "./commands/misc/gacha.js";
import { infoCommand } from "./commands/misc/info.js";
import { jpyCommand } from "./commands/misc/jpy.js";
import { artworkCommand } from "./commands/utility/artwork.js";
import { blueskyCommand } from "./commands/utility/bluesky.js";
import { instagramCommand } from "./commands/utility/instagram.js";
import { pixivCommand } from "./commands/utility/pixiv.js";
import { tiktokCommand } from "./commands/utility/tiktok.js";
import { twitterCommand, xCommand } from "./commands/utility/twitter.js";
import { logger } from "./lib/logger.js";
import { register } from "./lib/register.js";
import { Scrobble } from "./lib/scrobble.js";
import type { AutocompleteSlashCommand } from "./model/command.js";

loadEnvFile();

if (!process.env.DISCORD_TOKEN) {
  throw new Error("Discord token is not defined.");
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const commands = [
  // misc
  gachaCommand,
  infoCommand,
  jpyCommand,
  decideCommand,
  tuyanhemCommand,
  // utility
  artworkCommand,
  twitterCommand,
  xCommand,
  pixivCommand,
  instagramCommand,
  tiktokCommand,
  blueskyCommand,
];

await register(commands);

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) {
    logger.error("Unsupported interaction");
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName}~`);
      return;
    }

    try {
      command.execute(interaction);
    } catch (e) {
      logger.error(e);
    }

    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName}~`);
      return;
    }

    try {
      await (command as AutocompleteSlashCommand).autocomplete(interaction);
    } catch (e) {
      logger.error(e);
    }

    return;
  }
});

export const scrobble = new Scrobble();

logger.ready("Logged in and ready");

// Start the bot
client.login(DISCORD_TOKEN);
