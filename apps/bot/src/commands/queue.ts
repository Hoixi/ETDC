// /queue — kuyruğu göster (herkes).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getActivePlayer, formatDuration } from "../features/music/index.js";

const queue: Command = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Çalma kuyruğunu gösterir").setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const current = player.queue.current;
    const upcoming = player.queue.tracks;
    if (!current && upcoming.length === 0) {
      await interaction.reply({ content: "Kuyruk boş.", flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = upcoming.slice(0, 10).map((t, i) => {
      const dur = t.info.duration ?? 0;
      return `\`${i + 1}.\` [${t.info.title}](${t.info.uri ?? ""}) \`${formatDuration(dur)}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎶 Çalma Kuyruğu")
      .setDescription(
        (current ? `**Şimdi:** [${current.info.title}](${current.info.uri})\n\n` : "") +
          (lines.length ? `**Sırada:**\n${lines.join("\n")}` : "*Sırada başka parça yok.*"),
      )
      .setFooter({
        text: `Toplam ${upcoming.length} parça · Döngü: ${player.repeatMode === "off" ? "kapalı" : player.repeatMode}`,
      });
    if (upcoming.length > 10) embed.setDescription(`${embed.data.description}\n\n*…ve ${upcoming.length - 10} parça daha.*`);

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

export default queue;
