import { Events } from "discord.js";
import { AEvent } from "../types/event.js";
import { register } from "../register.js";
import type { AClient } from "../types/client.js";
import { Player } from "discord-player";

export const event: AEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: AClient) {
    await register(client);

    const player = new Player(client);

    console.log(`Ready! Logged in as ${client.user!.tag}`);
  },
};
