// /loop — döngü modu (DJ/yönetici).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { RepeatMode } from "lavalink-client";
import type { Command } from "../types.js";
import { getActivePlayer, requireSameVoice, isDJ } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const LABELS: Record<RepeatMode, string> = {
  off: "🚫 Kapalı",
  track: "🔂 Tek şarkı",
  queue: "🔁 Tüm kuyruk",
};

const loop: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Döngü modunu ayarlar")
    .setDMPermission(false)
    .addStringOption((o) =>
      o.setName("mod").setDescription("Döngü modu").setRequired(true).addChoices(
        { name: "Kapalı", value: "off" },
        { name: "Tek şarkı", value: "track" },
        { name: "Tüm kuyruk", value: "queue" },
      ),
    ),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    if (!(await requireSameVoice(interaction, player))) return;
    if (!isDJ(interaction.member, await getMusicConfig(interaction.guild.id))) {
      await interaction.reply({ content: "DJ rolü veya yönetici yetkisi gerekli.", flags: MessageFlags.Ephemeral });
      return;
    }
    const mode = interaction.options.getString("mod", true) as RepeatMode;
    await player.setRepeatMode(mode);
    await interaction.reply(`Döngü: ${LABELS[mode]}`);
  },
};

export default loop;
