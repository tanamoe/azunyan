import {
  AppleMusicExtractor,
  AttachmentExtractor,
  SoundCloudExtractor,
  SpotifyExtractor,
  YouTubeExtractor,
} from "@discord-player/extractor";
import { Player } from "discord-player";
import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import { decideCommand, tuyanhemCommand } from "./commands/misc/decide.js";
import { gachaCommand } from "./commands/misc/gacha.js";
import { infoCommand } from "./commands/misc/info.js";
import { jpyCommand } from "./commands/misc/jpy.js";
import { playCommand } from "./commands/player/play/command.js";
import { playContextMenu } from "./commands/player/play/contextMenu.js";
import { queueCommand } from "./commands/player/queue/command.js";
import { skipCommand } from "./commands/player/skip.js";
import { stopCommand } from "./commands/player/stop.js";
import { artworkCommand } from "./commands/utility/artwork.js";
import { pixivCommand } from "./commands/utility/pixiv.js";
import { twitterCommand, xCommand } from "./commands/utility/twitter.js";
import { logger } from "./lib/logger.js";
import { register } from "./lib/register.js";
import type {
  AutocompleteSlashCommand,
  ContextMenuCommand,
  SlashCommand,
} from "./model/command.js";

if (!process.env.DISCORD_TOKEN)
  throw new Error("Discord token is not defined.");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const commands = [
  gachaCommand,
  infoCommand,
  jpyCommand,
  decideCommand,
  tuyanhemCommand,
  artworkCommand,
  twitterCommand,
  xCommand,
  pixivCommand,
  playCommand,
  queueCommand,
  skipCommand,
  stopCommand,
  playContextMenu,
];

await register(commands);

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    const command = commands.find(
      (command) => command.data?.name === interaction.commandName,
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName} nyaaaaa~`);
      return;
    }

    try {
      if (interaction.isAutocomplete())
        await (command as AutocompleteSlashCommand).autocomplete(interaction);
      else if (interaction.isChatInputCommand())
        await (command as SlashCommand).execute(interaction);
      else if (interaction.isMessageContextMenuCommand())
        await (command as ContextMenuCommand).execute(interaction);
    } catch (e) {
      logger.error(e);
    }

    return;
  }
});

// Create the player client
const player = new Player(client);

player.extractors.register(YouTubeExtractor, {});
player.extractors.register(SpotifyExtractor, {});
player.extractors.register(AttachmentExtractor, {});
player.extractors.register(AppleMusicExtractor, {});
player.extractors.register(SoundCloudExtractor, {});

logger.ready("Logged in and ready");

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

player.events.on("error", (_, error) => {
  // Emitted when the player queue encounters error
  logger.error(error);
});

player.events.on("playerError", (_, error) => {
  // Emitted when the audio player errors while streaming audio track
  logger.error(error);
});
