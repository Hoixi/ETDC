// Komut ve event modülleri için ortak sözleşmeler.
import type {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  ClientEvents,
} from "discord.js";

// SlashCommandBuilder zincir metodları farklı tipler döndürebildiği için union.
export type CommandData =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder;

export interface Command {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void> | void;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void> | void;
}

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}
