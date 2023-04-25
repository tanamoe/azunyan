import { register } from "../register.js";

import { Events } from "discord.js";
import { Player } from "discord-player";
import {
  AttachmentExtractor,
  YouTubeExtractor,
} from "@discord-player/extractor";

import type { AEvent } from "../types/event.js";
import type { AClient } from "../types/client.js";

export const event: AEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: AClient) {
    await register(client);

    const player = new Player(client);

    player.extractors.register(YouTubeExtractor, {});
    player.extractors.register(AttachmentExtractor, {});

    console.log(`Ready! Logged in as ${client.user!.tag}`);
  },
};
