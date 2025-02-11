import {
  AppleMusicExtractor,
  AttachmentExtractor,
  SoundCloudExtractor,
  SpotifyExtractor,
} from "@discord-player/extractor";
import { Player, useMainPlayer } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Guild,
} from "discord.js";
import { decideCommand, tuyanhemCommand } from "./commands/misc/decide.js";
import { gachaCommand } from "./commands/misc/gacha.js";
import { infoCommand } from "./commands/misc/info.js";
import { jpyCommand } from "./commands/misc/jpy.js";
import { lyricsCommand } from "./commands/player/lyrics.js";
import { playCommand } from "./commands/player/play/command.js";
import { playContextMenu } from "./commands/player/play/contextMenu.js";
import { queueCommand } from "./commands/player/queue/command.js";
import { repeatCommand } from "./commands/player/repeat.js";
import { shuffleCommand } from "./commands/player/shuffle.js";
import { skipCommand } from "./commands/player/skip.js";
import { stopCommand } from "./commands/player/stop.js";
import { artworkCommand } from "./commands/utility/artwork.js";
import { blueskyCommand } from "./commands/utility/bluesky.js";
import { instagramCommand } from "./commands/utility/instagram.js";
import { pixivCommand } from "./commands/utility/pixiv.js";
import { tiktokCommand } from "./commands/utility/tiktok.js";
import { twitterCommand, xCommand } from "./commands/utility/twitter.js";
import { NavidromeExtractor } from "./extractor/navidrome.js";
import { logger } from "./lib/logger.js";
import { register } from "./lib/register.js";
import type {
  AutocompleteSlashCommand,
  ContextMenuCommand,
  SlashCommand,
} from "./model/command.js";

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
  // playback-related
  playCommand,
  queueCommand,
  shuffleCommand,
  repeatCommand,
  skipCommand,
  stopCommand,
  playContextMenu,
  lyricsCommand,
];

// Create the player client
const player = new Player(client);

await register(commands);

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) {
    logger.error("Unsupported interaction");
    return;
  }

  const player = useMainPlayer();
  const data = {
    guild: interaction.guild,
  };

  if (interaction.isChatInputCommand()) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName}~`);
      return;
    }

    try {
      await player.context.provide(data, () =>
        (command as SlashCommand).execute(interaction),
      );
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

  if (interaction.isMessageContextMenuCommand()) {
    const command = commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      logger.error(`Không tìm thấy lệnh ${interaction.commandName}~`);
      return;
    }

    try {
      await player.context.provide(data, () =>
        (command as ContextMenuCommand).execute(interaction),
      );
    } catch (e) {
      logger.error(e);
    }

    return;
  }
});

if (
  process.env.NAVIDROME_CLIENT_COUNT &&
  Number.parseInt(process.env.NAVIDROME_CLIENT_COUNT) > 0
) {
  const clientCount = Number.parseInt(process.env.NAVIDROME_CLIENT_COUNT);
  player.extractors.register(
    NavidromeExtractor,
    Array.from({ length: clientCount }).map((_, i) => ({
      url: process.env[`NAVIDROME_URL_${i}`] || "",
      username: process.env[`NAVIDROME_USERNAME_${i}`] || "",
      password: process.env[`NAVIDROME_PASSWORD_${i}`] || "",
      alternateUrl: process.env[`NAVIDROME_ALTERNATE_URL_${i}`],
    })),
  );
}
player.extractors.register(YoutubeiExtractor, {});
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
