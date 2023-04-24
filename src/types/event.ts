import type { ClientEvents } from "discord.js";

export interface AEvent {
  name: keyof ClientEvents;
  once?: boolean;
  execute(...args: any): any;
}
