// /panel — şifresiz panel giriş linki (Discord'da girişli olduğun için OAuth gerekmez).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { makeLoginUrl, panelButtonRow } from "../features/arena/index.js";

const panel: Command = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Karakter panelini şifresiz açacak kişisel link verir")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const url = makeLoginUrl(interaction.user.id, interaction.guild.id, interaction.user.username);
    if (!url) {
      await interaction.reply({ content: "Panel girişi şu an yapılandırılmamış (INTERNAL_API_KEY yok).", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({
      content: "🎪 **Sana özel panel linki** — şifre gerekmez, tıkla gir. (15 dk geçerli, sadece sen görüyorsun.)",
      components: [panelButtonRow(url)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default panel;
