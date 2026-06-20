// /pause — duraklat (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const pause: Command = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Müziği duraklatır").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (player.paused) {
      await interaction.reply({ content: "Zaten duraklatılmış. `/resume` ile devam et.", flags: MessageFlags.Ephemeral });
      return;
    }
    await player.pause();
    await interaction.reply("⏸️ Duraklatıldı.");
  },
};

export default pause;
