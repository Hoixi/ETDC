// /yayin — Kick yayın bildirimi ayarları (izole modül; panel UI Milestone 7'de).
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { patchConfig, getStreamConfig } from "../lib/guildConfig.js";
import type { StreamConfig } from "../lib/config-types.js";
import { fetchKickChannel } from "../features/streams/kick.js";
import type { Command } from "../types.js";

const yayin: Command = {
  data: new SlashCommandBuilder()
    .setName("yayin")
    .setDescription("Kick yayın bildirimi ayarları")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("ayarla")
        .setDescription("Yayın bildirimini ayarla")
        .addStringOption((o) => o.setName("kick_kanal").setDescription("Kick kullanıcı adı (örn: hoixi)"))
        .addChannelOption((o) => o.setName("bildirim_kanali").setDescription("Bildirim gönderilecek kanal").addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName("ping_rol").setDescription("Canlıya geçince etiketlenecek rol"))
        .addBooleanOption((o) => o.setName("durum").setDescription("Açık/kapalı"))
        .addIntegerOption((o) => o.setName("aralik_sn").setDescription("Kontrol aralığı (saniye, min 60)").setMinValue(60).setMaxValue(900)),
    )
    .addSubcommand((s) =>
      s.setName("test").setDescription("Kick kanalının şu anki durumunu kontrol et")
        .addStringOption((o) => o.setName("kick_kanal").setDescription("Kick kullanıcı adı").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("goster").setDescription("Mevcut yayın ayarlarını göster")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "ayarla") {
      const patch: Partial<StreamConfig> = {};
      const kick = interaction.options.getString("kick_kanal");
      const ch = interaction.options.getChannel("bildirim_kanali");
      const role = interaction.options.getRole("ping_rol");
      const durum = interaction.options.getBoolean("durum");
      const aralik = interaction.options.getInteger("aralik_sn");
      if (kick !== null) patch.kickChannel = kick.trim().toLowerCase();
      if (ch) patch.discordChannelId = ch.id;
      if (role) patch.pingRoleId = role.id;
      if (durum !== null) patch.enabled = durum;
      if (aralik !== null) patch.pollSec = aralik;
      if (Object.keys(patch).length === 0) {
        await interaction.reply({ content: "Değiştirilecek alan vermedin.", flags: MessageFlags.Ephemeral });
        return;
      }
      await patchConfig(interaction.guild.id, "streamConfig", patch);
      await interaction.reply({ content: `✅ Yayın ayarı güncellendi: ${Object.keys(patch).join(", ")}`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "test") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const kick = interaction.options.getString("kick_kanal", true);
      const info = await fetchKickChannel(kick);
      if (!info) {
        await interaction.editReply("⚠️ Kick kanalına ulaşılamadı (kanal adı yanlış olabilir veya API erişimi engellendi).");
        return;
      }
      await interaction.editReply(
        info.isLive
          ? `🔴 **${kick}** şu an CANLI: ${info.title} (${info.viewers} izleyici)\n${info.url}`
          : `⚫ **${kick}** şu an yayında değil.`,
      );
      return;
    }

    const c = await getStreamConfig(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0x53fc18)
      .setTitle("Kick Yayın Bildirimi")
      .addFields(
        { name: "Durum", value: c.enabled ? "açık" : "kapalı", inline: true },
        { name: "Kick kanalı", value: c.kickChannel ?? "—", inline: true },
        { name: "Bildirim kanalı", value: c.discordChannelId ? `<#${c.discordChannelId}>` : "—", inline: true },
        { name: "Ping rolü", value: c.pingRoleId ? `<@&${c.pingRoleId}>` : "—", inline: true },
        { name: "Aralık", value: `${c.pollSec} sn`, inline: true },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  },
};

export default yayin;
