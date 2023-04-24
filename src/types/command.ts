import type {
  BaseInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
} from "discord.js";

export interface ACommand {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
  execute(interaction: BaseInteraction): any;
  autocomplete?(interaction: AutocompleteInteraction): any;
}
