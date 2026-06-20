// /music — müzik ayarları (DJ rol, varsayılan ses, kuyruk limiti). Panel UI Milestone 7'de.
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { patchConfig, getMusicConfig } from "../lib/guildConfig.js";
import type { MusicConfig } from "../lib/config-types.js";
import type { Command } from "../types.js";

const music: Command = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Müzik ayarları")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("ayarla")
        .setDescription("Müzik ayarlarını değiştir")
        .addRoleOption((o) => o.setName("dj_rol").setDescription("DJ rolü (skip/stop/volume bu role açık)"))
        .addIntegerOption((o) => o.setName("varsayilan_ses").setDescription("Varsayılan ses (0-150)").setMinValue(0).setMaxValue(150))
        .addIntegerOption((o) => o.setName("max_kuyruk").setDescription("Maksimum kuyruk uzunluğu").setMinValue(1).setMaxValue(1000))
        .addIntegerOption((o) => o.setName("bos_ayril_sn").setDescription("Boş kanalda kaç sn sonra ayrılsın").setMinValue(30).setMaxValue(3600)),
    )
    .addSubcommand((s) => s.setName("goster").setDescription("Mevcut müzik ayarlarını göster")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "ayarla") {
      const patch: Partial<MusicConfig> = {};
      const dj = interaction.options.getRole("dj_rol");
      const vol = interaction.options.getInteger("varsayilan_ses");
      const maxQ = interaction.options.getInteger("max_kuyruk");
      const leave = interaction.options.getInteger("bos_ayril_sn");
      if (dj) patch.djRoleId = dj.id;
      if (vol !== null) patch.defaultVolume = vol;
      if (maxQ !== null) patch.maxQueue = maxQ;
      if (leave !== null) patch.autoLeaveSec = leave;
      if (Object.keys(patch).length === 0) {
        await interaction.reply({ content: "Değiştirilecek alan vermedin.", flags: MessageFlags.Ephemeral });
        return;
      }
      await patchConfig(interaction.guild.id, "musicConfig", patch);
      await interaction.reply({ content: `✅ Müzik ayarı güncellendi: ${Object.keys(patch).join(", ")}`, flags: MessageFlags.Ephemeral });
      return;
    }

    const c = await getMusicConfig(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Müzik Ayarları")
      .addFields(
        { name: "DJ rolü", value: c.djRoleId ? `<@&${c.djRoleId}>` : "herkes", inline: true },
        { name: "Varsayılan ses", value: `%${c.defaultVolume}`, inline: true },
        { name: "Max kuyruk", value: String(c.maxQueue), inline: true },
        { name: "Boş ayrılma", value: `${c.autoLeaveSec} sn`, inline: true },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  },
};

export default music;
