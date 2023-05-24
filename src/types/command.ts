import type {
  BaseInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
  Message,
} from "discord.js";

export interface PlayerCommand {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
  execute(interaction: BaseInteraction): Promise<void | Message>;
}

export interface AutocompletePlayerCommand extends PlayerCommand {
  autocomplete(interaction: AutocompleteInteraction): Promise<void>;
}
