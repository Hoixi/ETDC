// /siralama — arena ELO sıralaması (ilk 10).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";

const MEDALS = ["🥇", "🥈", "🥉"];

const siralama: Command = {
  data: new SlashCommandBuilder()
    .setName("siralama")
    .setDescription("Arena ELO sıralaması (ilk 10)")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();

    const top = await prisma.arenaPlayer.findMany({
      where: { guildId: interaction.guild.id, OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }] },
      orderBy: { elo: "desc" },
      take: 10,
    });

    if (top.length === 0) {
      await interaction.editReply("Henüz dövüşen yok. `/duello @kişi` ya da `/avlan` ile başla!");
      return;
    }

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const m = await interaction.guild.members.fetch(p.userId).catch(() => null);
        const name = m?.user.username ?? `Bilinmeyen`;
        const place = MEDALS[i] ?? `**${i + 1}.**`;
        return `${place} ${name} — 🏆 **${p.elo}** · ${p.wins}G/${p.losses}M`;
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0xffc83d)
      .setTitle(`🎪 ${interaction.guild.name} — Arena Sıralaması`)
      .setDescription(lines.join("\n"));

    await interaction.editReply({ embeds: [embed] });
  },
};

export default siralama;
