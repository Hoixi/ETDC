// /nowplaying — şu an çalan parça + ilerleme (herkes).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, formatDuration, trackRequesterMention } from "../features/music/index.js";

function progressBar(pos: number, dur: number, size = 18): string {
  if (!dur) return "🔴 Canlı yayın";
  const ratio = Math.min(1, pos / dur);
  const filled = Math.round(ratio * size);
  return "▬".repeat(filled) + "🔘" + "▬".repeat(Math.max(0, size - filled));
}

const nowplaying: Command = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Şu an çalan parçayı gösterir").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;
    const current = player.queue.current;
    if (!current) {
      await interaction.reply({ content: "Şu an çalan bir şey yok.", flags: MessageFlags.Ephemeral });
      return;
    }
    const dur = current.info.duration;
    const pos = player.position;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: "Şimdi çalıyor 🎶" })
      .setTitle(current.info.title.slice(0, 256))
      .setURL(current.info.uri)
      .setDescription(
        `${progressBar(pos, dur)}\n\`${formatDuration(pos)} / ${current.info.isStream ? "CANLI" : formatDuration(dur)}\``,
      )
      .addFields(
        { name: "İsteyen", value: trackRequesterMention(current), inline: true },
        { name: "Ses", value: `%${player.volume}`, inline: true },
        { name: "Döngü", value: player.repeatMode === "off" ? "kapalı" : player.repeatMode, inline: true },
      );
    if (current.info.artworkUrl) embed.setThumbnail(current.info.artworkUrl);
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

export default nowplaying;
