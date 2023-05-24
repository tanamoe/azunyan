import type { AutocompletePlayerCommand, PlayerCommand } from "./command.js";
import type { Client, Collection } from "discord.js";

export interface PlayerClient extends Client {
  commands: Collection<string, PlayerCommand | AutocompletePlayerCommand>;
}
