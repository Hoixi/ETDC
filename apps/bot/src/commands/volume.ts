// /volume — ses seviyesi (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const volume: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ses seviyesini ayarlar (0-150)")
    .setDMPermission(false)
    .addIntegerOption((o) => o.setName("seviye").setDescription("0-150").setRequired(true).setMinValue(0).setMaxValue(150)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    const v = interaction.options.getInteger("seviye", true);
    await player.setVolume(v);
    await interaction.reply(`🔊 Ses seviyesi **%${v}** olarak ayarlandı.`);
  },
};

export default volume;
