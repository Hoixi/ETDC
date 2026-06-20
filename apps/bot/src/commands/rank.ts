// /rank — kendi veya başka birinin level kartı.
import { SlashCommandBuilder, MessageFlags, AttachmentBuilder } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { drawRankCard, getRank, levelProgress } from "../features/levels/index.js";

const rank: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Level kartını gösterir")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Kartını görmek istediğin üye")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Sadece sunucuda kullanılabilir.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();

    const user = interaction.options.getUser("uye") ?? interaction.user;
    const row = await prisma.memberXP.findUnique({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: user.id } },
    });

    if (!row || row.xp === 0) {
      await interaction.editReply(
        user.id === interaction.user.id
          ? "Henüz hiç XP'n yok. Sohbete katıl! 💬"
          : `**${user.username}** henüz XP kazanmamış.`,
      );
      return;
    }

    const { level, current, needed } = levelProgress(row.xp);
    const rankNo = await getRank(interaction.guild.id, user.id);

    const buffer = await drawRankCard({
      avatarUrl: user.displayAvatarURL({ extension: "png", size: 256 }),
      username: user.username,
      level,
      rank: rankNo,
      currentXp: current,
      neededXp: needed,
      totalXp: row.xp,
    });

    await interaction.editReply({
      files: [new AttachmentBuilder(buffer, { name: "rank.png" })],
    });
  },
};

export default rank;
