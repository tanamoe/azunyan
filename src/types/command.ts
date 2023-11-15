import type {
  BaseInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
  Message,
  ContextMenuCommandBuilder,
  InteractionResponse,
} from "discord.js";

export interface AppCommand {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
    | ContextMenuCommandBuilder;
  execute(
    interaction: BaseInteraction,
  ): Promise<void | Message | InteractionResponse>;
}

export interface AutocompleteAppCommand extends AppCommand {
  autocomplete(interaction: AutocompleteInteraction): Promise<void>;
}
