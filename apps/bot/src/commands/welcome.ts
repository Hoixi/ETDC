// Karşılama/uğurlama ayarları (panel UI Milestone 7'de; bu komut bot tarafı test + hızlı ayar).
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  AttachmentBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { patchConfig, getWelcomeConfig, getGoodbyeConfig } from "../lib/guildConfig.js";
import { applyPlaceholders } from "../lib/placeholders.js";
import { drawWelcomeCard } from "../features/welcome/index.js";
import type { WelcomeConfig, GoodbyeConfig } from "../lib/config-types.js";
import type { Command } from "../types.js";

const HEX = /^#?[0-9a-fA-F]{6}$/;

function collectPatch(
  interaction: ChatInputCommandInteraction<"cached">,
): Partial<WelcomeConfig> {
  const patch: Partial<WelcomeConfig> = {};
  const channel = interaction.options.getChannel("kanal");
  const title = interaction.options.getString("baslik");
  const subtitle = interaction.options.getString("altbaslik");
  const bg = interaction.options.getString("arkaplan");
  const color = interaction.options.getString("renk");
  const enabled = interaction.options.getBoolean("durum");

  if (channel) patch.channelId = channel.id;
  if (title !== null) patch.title = title;
  if (subtitle !== null) patch.subtitle = subtitle;
  if (bg !== null) patch.backgroundUrl = bg || null;
  if (color !== null && HEX.test(color)) patch.color = color.startsWith("#") ? color : `#${color}`;
  if (enabled !== null) patch.enabled = enabled;
  return patch;
}

const welcome: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Karşılama/uğurlama ayarları")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("ayarla")
        .setDescription("Karşılama kartını ayarla")
        .addChannelOption((o) => o.setName("kanal").setDescription("Karşılama kanalı").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("baslik").setDescription("Başlık ({user} {username} {memberCount} {server})"))
        .addStringOption((o) => o.setName("altbaslik").setDescription("Alt başlık (placeholder destekli)"))
        .addStringOption((o) => o.setName("arkaplan").setDescription("Arka plan görsel URL (boş = gradient)"))
        .addStringOption((o) => o.setName("renk").setDescription("Vurgu rengi hex (örn #5865F2)"))
        .addBooleanOption((o) => o.setName("durum").setDescription("Açık/kapalı")),
    )
    .addSubcommand((s) =>
      s
        .setName("veda")
        .setDescription("Uğurlama kartını ayarla")
        .addChannelOption((o) => o.setName("kanal").setDescription("Uğurlama kanalı").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("baslik").setDescription("Başlık (placeholder destekli)"))
        .addStringOption((o) => o.setName("altbaslik").setDescription("Alt başlık"))
        .addStringOption((o) => o.setName("arkaplan").setDescription("Arka plan görsel URL"))
        .addStringOption((o) => o.setName("renk").setDescription("Vurgu rengi hex"))
        .addBooleanOption((o) => o.setName("durum").setDescription("Açık/kapalı")),
    )
    .addSubcommand((s) =>
      s
        .setName("test")
        .setDescription("Kartın nasıl göründüğünü senin profilinle önizle")
        .addStringOption((o) =>
          o.setName("tur").setDescription("welcome / goodbye").addChoices(
            { name: "Karşılama", value: "welcome" },
            { name: "Uğurlama", value: "goodbye" },
          ),
        ),
    )
    .addSubcommand((s) => s.setName("goster").setDescription("Mevcut ayarları göster")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Sadece sunucuda kullanılabilir.", flags: MessageFlags.Ephemeral });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "ayarla" || sub === "veda") {
      const patch = collectPatch(interaction);
      if (Object.keys(patch).length === 0) {
        await interaction.reply({ content: "Değiştirilecek bir alan vermedin.", flags: MessageFlags.Ephemeral });
        return;
      }
      await patchConfig(interaction.guild.id, sub === "ayarla" ? "welcomeConfig" : "goodbyeConfig", patch);
      await interaction.reply({
        content: `✅ ${sub === "ayarla" ? "Karşılama" : "Uğurlama"} ayarı güncellendi: ${Object.keys(patch).join(", ")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "test") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const kind = interaction.options.getString("tur") ?? "welcome";
      const cfg =
        kind === "goodbye"
          ? await getGoodbyeConfig(interaction.guild.id)
          : await getWelcomeConfig(interaction.guild.id);
      const member = interaction.member as GuildMember;
      const ctx = {
        userMention: member.displayName,
        username: member.user.username,
        memberCount: interaction.guild.memberCount,
        serverName: interaction.guild.name,
      };
      const buffer = await drawWelcomeCard({
        avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
        title: applyPlaceholders(cfg.title, ctx),
        subtitle: applyPlaceholders(cfg.subtitle, ctx),
        backgroundUrl: cfg.backgroundUrl,
        accentColor: cfg.color,
      });
      await interaction.editReply({
        content: `**${kind === "goodbye" ? "Uğurlama" : "Karşılama"} önizleme** (durum: ${cfg.enabled ? "açık" : "kapalı"}, kanal: ${cfg.channelId ? `<#${cfg.channelId}>` : "seçilmedi"})`,
        files: [new AttachmentBuilder(buffer, { name: "preview.png" })],
      });
      return;
    }

    // goster
    const w = await getWelcomeConfig(interaction.guild.id);
    const g = await getGoodbyeConfig(interaction.guild.id);
    const fmt = (c: WelcomeConfig | GoodbyeConfig) =>
      `durum: **${c.enabled ? "açık" : "kapalı"}**\nkanal: ${c.channelId ? `<#${c.channelId}>` : "—"}\nbaşlık: ${c.title}\nalt: ${c.subtitle}\nrenk: ${c.color}\narkaplan: ${c.backgroundUrl ?? "—"}`;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Karşılama / Uğurlama Ayarları")
      .addFields(
        { name: "🎉 Karşılama", value: fmt(w) },
        { name: "👋 Uğurlama", value: fmt(g) },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default welcome;
