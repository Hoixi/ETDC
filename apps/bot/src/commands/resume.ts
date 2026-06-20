// /resume — devam ettir (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const resume: Command = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Duraklatılmış müziğe devam eder").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!player.paused) {
      await interaction.reply({ content: "Zaten çalıyor.", flags: MessageFlags.Ephemeral });
      return;
    }
    await player.resume();
    await interaction.reply("▶️ Devam ediyor.");
  },
};

export default resume;
