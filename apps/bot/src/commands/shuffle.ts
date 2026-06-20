// /shuffle — kuyruğu karıştır (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const shuffle: Command = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Kuyruğu karıştırır").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (player.queue.tracks.length < 2) {
      await interaction.reply({ content: "Karıştırmak için kuyrukta en az 2 parça olmalı.", flags: MessageFlags.Ephemeral });
      return;
    }
    await player.queue.shuffle();
    await interaction.reply(`🔀 Kuyruk karıştırıldı (${player.queue.tracks.length} parça).`);
  },
};

export default shuffle;
