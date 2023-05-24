import type {
  BaseInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
  Message,
  ContextMenuCommandBuilder,
  InteractionResponse,
} from "discord.js";

export interface PlayerCommand {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
    | ContextMenuCommandBuilder;
  execute(
    interaction: BaseInteraction
  ): Promise<void | Message | InteractionResponse>;
}

export interface AutocompletePlayerCommand extends PlayerCommand {
  autocomplete(interaction: AutocompleteInteraction): Promise<void>;
}
