// /stop — müziği durdur, kuyruğu temizle, kanaldan ayrıl (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const stop: Command = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Müziği durdurur ve kanaldan ayrılır").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "Bunun için DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    await player.destroy("Kullanıcı durdurdu").catch(() => {});
    await interaction.reply("⏹️ Müzik durduruldu, kuyruk temizlendi.");
  },
};

export default stop;
