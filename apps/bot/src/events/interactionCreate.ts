// Tüm etkileşimleri (slash command, buton, autocomplete) ilgili handler'a yönlendirir.
// Buton rol sistemi (Milestone 2) buraya customId router olarak eklenecek.
import { Events, MessageFlags } from "discord.js";
import type { HoixiClient } from "../client.js";
import type { BotEvent } from "../types.js";
import { ROLE_BUTTON_PREFIX, handleRoleButton } from "../features/roles/index.js";
import { DUEL_PREFIX, handleDuelButton } from "../features/arena/index.js";

const interactionCreate: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const client = interaction.client as HoixiClient;

    // --- Autocomplete ---
    if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try {
          await cmd.autocomplete(interaction);
        } catch (err) {
          console.error(`Autocomplete hatası (${interaction.commandName}):`, err);
        }
      }
      return;
    }

    // --- Slash command ---
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) {
        console.warn(`Bilinmeyen komut: ${interaction.commandName}`);
        return;
      }
      try {
        await cmd.execute(interaction);
      } catch (err) {
        console.error(`Komut hatası (${interaction.commandName}):`, err);
        const msg = "⚠️ Komut çalışırken bir hata oluştu.";
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
          await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
      return;
    }

    // --- Buton router (customId prefix'ine göre yönlendir) ---
    if (interaction.isButton()) {
      if (interaction.customId.startsWith(`${DUEL_PREFIX}:`)) {
        try {
          await handleDuelButton(interaction);
        } catch (err) {
          console.error("Düello buton hatası:", err);
        }
        return;
      }
      if (interaction.customId.startsWith(`${ROLE_BUTTON_PREFIX}:`)) {
        try {
          await handleRoleButton(interaction);
        } catch (err) {
          console.error("Buton rol hatası:", err);
          const msg = "⚠️ İşlem sırasında bir hata oluştu.";
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
          } else {
            await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
          }
        }
      }
      return;
    }
  },
};

export default interactionCreate;
