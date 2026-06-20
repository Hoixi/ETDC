// /log — log kanallarını ayarla (panel UI Milestone 7'de).
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { patchConfig, getLogConfig } from "../lib/guildConfig.js";
import type { LogConfig } from "../lib/config-types.js";
import type { Command } from "../types.js";

const log: Command = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Log kanallarını ayarla")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("ayarla")
        .setDescription("Log kanallarını seç (boş bıraktığın değişmez)")
        .addChannelOption((o) => o.setName("giris_cikis").setDescription("Üye giriş/çıkış logu").addChannelTypes(ChannelType.GuildText))
        .addChannelOption((o) => o.setName("mod").setDescription("Moderasyon logu").addChannelTypes(ChannelType.GuildText))
        .addChannelOption((o) => o.setName("mesaj").setDescription("Mesaj sil/düzenle logu").addChannelTypes(ChannelType.GuildText)),
    )
    .addSubcommand((s) => s.setName("goster").setDescription("Mevcut log kanallarını göster"))
    .addSubcommand((s) =>
      s
        .setName("kapat")
        .setDescription("Bir log türünü kapat")
        .addStringOption((o) =>
          o.setName("tur").setDescription("Hangi log").setRequired(true).addChoices(
            { name: "Giriş/Çıkış", value: "joinLeave" },
            { name: "Moderasyon", value: "modLog" },
            { name: "Mesaj", value: "messageLog" },
          ),
        ),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "ayarla") {
      const patch: Partial<LogConfig> = {};
      const jl = interaction.options.getChannel("giris_cikis");
      const mod = interaction.options.getChannel("mod");
      const msg = interaction.options.getChannel("mesaj");
      if (jl) patch.joinLeave = jl.id;
      if (mod) patch.modLog = mod.id;
      if (msg) patch.messageLog = msg.id;
      if (Object.keys(patch).length === 0) {
        await interaction.reply({ content: "Hiç kanal vermedin.", flags: MessageFlags.Ephemeral });
        return;
      }
      await patchConfig(interaction.guild.id, "logConfig", patch);
      await interaction.reply({ content: `✅ Log kanalları güncellendi: ${Object.keys(patch).join(", ")}`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "kapat") {
      const tur = interaction.options.getString("tur", true) as keyof LogConfig;
      await patchConfig<LogConfig>(interaction.guild.id, "logConfig", { [tur]: null });
      await interaction.reply({ content: `✅ ${tur} logu kapatıldı.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const cfg = await getLogConfig(interaction.guild.id);
    const fmt = (id: string | null) => (id ? `<#${id}>` : "—");
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Log Kanalları")
      .addFields(
        { name: "📥 Giriş/Çıkış", value: fmt(cfg.joinLeave), inline: true },
        { name: "⚖️ Moderasyon", value: fmt(cfg.modLog), inline: true },
        { name: "✏️ Mesaj", value: fmt(cfg.messageLog), inline: true },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default log;
