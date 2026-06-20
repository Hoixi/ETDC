// /topla — biten kasma oturumunun ganimetini topla.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import {
  getPlayer,
  generateItem,
  aggregateStats,
  addXp,
  itemLine,
  RARITY,
  RARITY_ORDER,
  type GeneratedItem,
} from "../features/arena/index.js";
import { getArenaConfig } from "../lib/guildConfig.js";

const ts = (d: Date) => `<t:${Math.floor(d.getTime() / 1000)}:R>`;

const topla: Command = {
  data: new SlashCommandBuilder()
    .setName("topla")
    .setDescription("Biten kasma oturumunun ganimetini toplar")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const { guild, user } = interaction;
    const player = await getPlayer(guild.id, user.id);
    const now = Date.now();

    if (!player.grindEndsAt || player.grindCollected) {
      await interaction.reply({ content: "Aktif kasman yok. `/kas` ile başla.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (player.grindEndsAt.getTime() > now) {
      await interaction.reply({ content: `⏳ Kasman henüz bitmedi — ${ts(player.grindEndsAt)} hazır olur.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();

    // Giyili Şans drop kalitesini artırır.
    const equipped = await prisma.arenaItem.findMany({ where: { guildId: guild.id, userId: user.id, equipped: true } });
    const luck = aggregateStats(equipped).luck;

    // Ganimet üret (iLvl level'a göre ölçeklenir, adet panelden ayarlı).
    const cfg = await getArenaConfig(guild.id);
    const drops: GeneratedItem[] = Array.from({ length: cfg.dropsPerSession }, () =>
      generateItem(player.level, luck),
    );

    await prisma.arenaItem.createMany({
      data: drops.map((d) => ({ guildId: guild.id, userId: user.id, ...d })),
    });

    // XP: taban + nadirlik bonusu
    const xpGain = 60 + drops.reduce((s, d) => s + RARITY_ORDER.indexOf(d.rarity) * 15, 0);
    const { leveledUp, newLevel } = await addXp(guild.id, user.id, xpGain);

    await prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: user.id } },
      data: { grindCollected: true, grindEndsAt: null },
    });

    // En yüksek nadirliğe göre embed rengi
    const best = drops.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a));
    const embed = new EmbedBuilder()
      .setColor(RARITY[best.rarity].color)
      .setAuthor({ name: `${user.username} ganimetini topladı 🎁` })
      .setDescription(drops.map((d) => itemLine(d)).join("\n"))
      .setFooter({ text: `+${xpGain} XP${leveledUp ? ` · 🎉 Level ${newLevel}!` : ""} · panelden giy: panel.enterthedarkcarnival.com/arena` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default topla;
