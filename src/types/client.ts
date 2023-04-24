import type { Client, Collection } from "discord.js";
import type { ACommand } from "./command.js";

export interface AClient extends Client {
  commands: Collection<string, ACommand>;
}
