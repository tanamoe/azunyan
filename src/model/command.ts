import type {
  AutocompleteInteraction,
  BaseInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export abstract class BaseCommand<T, U extends BaseInteraction> {
  /**
   * Go-based error handling
   */
  constructor(
    public readonly data: T,
    public readonly execute: (interaction: U) => Promise<Error | null>,
  ) {}
}

export class SlashCommand extends BaseCommand<
  | SlashCommandBuilder
  | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
  | SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction
> {
  constructor(
    public readonly data:
      | SlashCommandBuilder
      | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
      | SlashCommandSubcommandsOnlyBuilder,
    public readonly execute: (
      interaction: ChatInputCommandInteraction,
    ) => Promise<Error | null>,
  ) {
    super(data, execute);
  }
}

export class AutocompleteSlashCommand extends SlashCommand {
  constructor(
    public readonly data:
      | SlashCommandBuilder
      | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
      | SlashCommandSubcommandsOnlyBuilder,
    public readonly execute: (
      interaction: ChatInputCommandInteraction,
    ) => Promise<Error | null>,
    public readonly autocomplete: (
      interaction: AutocompleteInteraction,
    ) => Promise<Error | null>,
  ) {
    super(data, execute);
  }
}

export class ContextMenuCommand extends BaseCommand<
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction
> {
  constructor(
    public readonly data: ContextMenuCommandBuilder,
    public readonly execute: (
      interaction: MessageContextMenuCommandInteraction,
    ) => Promise<Error | null>,
  ) {
    super(data, execute);
  }
}

export class ButtonCommand extends BaseCommand<null, ButtonInteraction> {
  constructor(
    public readonly execute: (
      interaction: ButtonInteraction,
    ) => Promise<Error | null>,
  ) {
    super(null, execute);
  }
}
