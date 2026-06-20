// /leaderboard — ilk 10 (embed).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { levelFromTotalXp } from "../features/levels/index.js";

const MEDALS = ["🥇", "🥈", "🥉"];

const leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Sunucunun XP sıralaması (ilk 10)")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Sadece sunucuda kullanılabilir.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();

    const top = await prisma.memberXP.findMany({
      where: { guildId: interaction.guild.id, xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: 10,
    });

    if (top.length === 0) {
      await interaction.editReply("Henüz sıralama yok. Sohbete katılın! 💬");
      return;
    }

    const lines = await Promise.all(
      top.map(async (row, i) => {
        const member = await interaction.guild.members.fetch(row.userId).catch(() => null);
        const name = member?.user.username ?? `Bilinmeyen (${row.userId})`;
        const place = MEDALS[i] ?? `**${i + 1}.**`;
        return `${place} ${name} — Level **${levelFromTotalXp(row.xp)}** · ${row.xp} XP`;
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏆 ${interaction.guild.name} — Sıralama`)
      .setDescription(lines.join("\n"))
      .setThumbnail(interaction.guild.iconURL());

    await interaction.editReply({ embeds: [embed] });
  },
};

export default leaderboard;
