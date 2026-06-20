// /play — şarkı/URL çal (YouTube + Spotify metadata via LavaSrc). Herkes kullanabilir.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getLavalink, formatDuration } from "../features/music/index.js";
import { getMusicConfig } from "../lib/guildConfig.js";

const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Şarkı çalar (arama veya YouTube/Spotify linki)")
    .setDMPermission(false)
    .addStringOption((o) => o.setName("sarki").setDescription("Şarkı adı veya link").setRequired(true)),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const voice = interaction.member.voice.channel;
    if (!voice) {
      await interaction.reply({ content: "Önce bir ses kanalına gir.", flags: MessageFlags.Ephemeral });
      return;
    }

    const lavalink = getLavalink();
    const anyConnected = lavalink && [...lavalink.nodeManager.nodes.values()].some((n) => n.connected);
    if (!lavalink || !anyConnected) {
      await interaction.reply({ content: "🎵 Müzik sunucusuna (Lavalink) şu an bağlanılamıyor.", flags: MessageFlags.Ephemeral });
      return;
    }

    const query = interaction.options.getString("sarki", true);
    const cfg = await getMusicConfig(interaction.guild.id);
    await interaction.deferReply();

    let player = lavalink.getPlayer(interaction.guild.id);
    if (player && player.voiceChannelId && player.voiceChannelId !== voice.id) {
      await interaction.editReply("Bot başka bir ses kanalında. Önce oraya gel ya da `/stop` yap.");
      return;
    }
    if (!player) {
      player = lavalink.createPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voice.id,
        textChannelId: interaction.channelId,
        selfDeaf: true,
        volume: cfg.defaultVolume,
      });
    }
    if (!player.connected) await player.connect();

    let res;
    try {
      res = await player.search({ query }, interaction.user);
    } catch (err) {
      console.error("Arama hatası:", err);
      await interaction.editReply("⚠️ Arama sırasında hata oluştu.");
      return;
    }

    if (!res || res.loadType === "error" || res.loadType === "empty" || res.tracks.length === 0) {
      await interaction.editReply(`🔍 **${query}** için sonuç bulunamadı.`);
      if (!player.queue.current && !player.playing) await player.destroy("Sonuç yok").catch(() => {});
      return;
    }

    const free = Math.max(0, cfg.maxQueue - player.queue.tracks.length);
    if (free === 0) {
      await interaction.editReply(`Kuyruk dolu (maks ${cfg.maxQueue}).`);
      return;
    }

    let reply: string;
    if (res.loadType === "playlist") {
      const slice = res.tracks.slice(0, free);
      await player.queue.add(slice);
      reply = `📃 **${res.playlist?.title ?? "Liste"}** — **${slice.length}** parça kuyruğa eklendi.`;
    } else {
      const track = res.tracks[0];
      await player.queue.add(track);
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`➕ Kuyruğa eklendi: **[${track.info.title}](${track.info.uri ?? ""})** \`${track.info.isStream ? "CANLI" : formatDuration(track.info.duration ?? 0)}\``);
      await interaction.editReply({ embeds: [embed] });
      if (!player.playing && !player.paused) await player.play();
      return;
    }

    await interaction.editReply(reply);
    if (!player.playing && !player.paused) await player.play();
  },
};

export default play;
