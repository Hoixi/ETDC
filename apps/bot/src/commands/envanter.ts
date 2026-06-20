// /envanter — çantadaki eşyaları listele (tam yönetim panelde).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { getPlayer, itemLine, RARITY_ORDER, makeLoginUrl, panelButtonRow } from "../features/arena/index.js";

const MAX_SHOWN = 12;

const envanter: Command = {
  data: new SlashCommandBuilder()
    .setName("envanter")
    .setDescription("Çantandaki eşyaları gösterir")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    await getPlayer(interaction.guild.id, interaction.user.id);

    const items = await prisma.arenaItem.findMany({
      where: { guildId: interaction.guild.id, userId: interaction.user.id },
    });

    if (items.length === 0) {
      await interaction.reply({ content: "🎒 Çantan boş. `/kas` ile eşya kasmaya başla!", flags: MessageFlags.Ephemeral });
      return;
    }

    // Nadirlik (yüksek→düşük), sonra iLvl'e göre sırala.
    items.sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.iLvl - a.iLvl,
    );

    const shown = items.slice(0, MAX_SHOWN);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: `${interaction.user.username} — Çanta (${items.length})`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(shown.map(itemLine).join("\n"))
      .setFooter({
        text: items.length > MAX_SHOWN ? `…ve ${items.length - MAX_SHOWN} eşya daha · tümü panelde: panel.enterthedarkcarnival.com/arena` : "Eşyalarını panelden giy: panel.enterthedarkcarnival.com/arena",
      });

    const url = makeLoginUrl(interaction.user.id, interaction.guild.id, interaction.user.username);
    await interaction.reply({
      embeds: [embed],
      components: url ? [panelButtonRow(url)] : [],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default envanter;
