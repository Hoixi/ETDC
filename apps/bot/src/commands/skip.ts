// /skip — sıradaki şarkıya geç (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const skip: Command = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Sıradaki şarkıya geçer").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "Bunun için DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    const title = player.queue.current?.info.title ?? "Şarkı";
    await player.skip(undefined, false).catch(() => {});
    await interaction.reply(`⏭️ **${title}** geçildi.`);
  },
};

export default skip;
