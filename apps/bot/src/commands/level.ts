// /level — XP ayarları + level ödül rolleri (panel UI Milestone 7'de).
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma } from "@hoixi/db";
import { patchConfig, getLevelConfig } from "../lib/guildConfig.js";
import type { LevelConfig } from "../lib/config-types.js";
import type { Command } from "../types.js";

const level: Command = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("XP/level ayarları ve ödül rolleri")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("ayarla")
        .setDescription("XP ayarlarını değiştir")
        .addBooleanOption((o) => o.setName("durum").setDescription("Sistem açık/kapalı"))
        .addIntegerOption((o) => o.setName("mesaj_xp").setDescription("Mesaj başına taban XP").setMinValue(1).setMaxValue(100))
        .addIntegerOption((o) => o.setName("cooldown").setDescription("XP cooldown (saniye)").setMinValue(0).setMaxValue(600))
        .addChannelOption((o) => o.setName("duyuru_kanali").setDescription("Level-up duyuru kanalı (boş = aynı kanal)").addChannelTypes(ChannelType.GuildText))
        .addBooleanOption((o) => o.setName("duyuru").setDescription("Level-up duyurusu yapılsın mı"))
        .addBooleanOption((o) => o.setName("ses_xp").setDescription("Sesli kanal XP'si açık/kapalı"))
        .addIntegerOption((o) => o.setName("ses_xp_dk").setDescription("Sesli kanalda dakika başına XP").setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((s) =>
      s
        .setName("odul-ekle")
        .setDescription("Bir levele ödül rolü ata")
        .addIntegerOption((o) => o.setName("level").setDescription("Hangi level").setRequired(true).setMinValue(1))
        .addRoleOption((o) => o.setName("rol").setDescription("Verilecek rol").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("odul-sil")
        .setDescription("Bir levelin ödül rolünü kaldır")
        .addIntegerOption((o) => o.setName("level").setDescription("Hangi level").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((s) => s.setName("odul-liste").setDescription("Level ödül rollerini listele"))
    .addSubcommand((s) => s.setName("goster").setDescription("Mevcut XP ayarlarını göster")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Sadece sunucuda kullanılabilir.", flags: MessageFlags.Ephemeral });
      return;
    }
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case "ayarla": return configure(interaction);
      case "odul-ekle": return addReward(interaction);
      case "odul-sil": return removeReward(interaction);
      case "odul-liste": return listRewards(interaction);
      case "goster": return show(interaction);
    }
  },
};

async function configure(interaction: ChatInputCommandInteraction<"cached">) {
  const patch: Partial<LevelConfig> = {};
  const durum = interaction.options.getBoolean("durum");
  const mesajXp = interaction.options.getInteger("mesaj_xp");
  const cooldown = interaction.options.getInteger("cooldown");
  const kanal = interaction.options.getChannel("duyuru_kanali");
  const duyuru = interaction.options.getBoolean("duyuru");
  const sesXp = interaction.options.getBoolean("ses_xp");
  const sesXpDk = interaction.options.getInteger("ses_xp_dk");

  if (durum !== null) patch.enabled = durum;
  if (mesajXp !== null) patch.xpPerMsg = mesajXp;
  if (cooldown !== null) patch.cooldownSec = cooldown;
  if (kanal) patch.levelUpChannelId = kanal.id;
  if (duyuru !== null) patch.announceLevelUp = duyuru;
  if (sesXp !== null) patch.voiceXpEnabled = sesXp;
  if (sesXpDk !== null) patch.voiceXpPerMin = sesXpDk;

  if (Object.keys(patch).length === 0) {
    await interaction.reply({ content: "Değiştirilecek alan vermedin.", flags: MessageFlags.Ephemeral });
    return;
  }
  await patchConfig(interaction.guild.id, "levelConfig", patch);
  await interaction.reply({ content: `✅ Ayarlar güncellendi: ${Object.keys(patch).join(", ")}`, flags: MessageFlags.Ephemeral });
}

async function addReward(interaction: ChatInputCommandInteraction<"cached">) {
  const lvl = interaction.options.getInteger("level", true);
  const role = interaction.options.getRole("rol", true);

  if (role.id === interaction.guild.id) {
    await interaction.reply({ content: "@everyone ödül rolü olamaz.", flags: MessageFlags.Ephemeral });
    return;
  }
  await prisma.levelReward.upsert({
    where: { guildId_level: { guildId: interaction.guild.id, level: lvl } },
    create: { guildId: interaction.guild.id, level: lvl, roleId: role.id },
    update: { roleId: role.id },
  });
  await interaction.reply({ content: `✅ **Level ${lvl}** → ${role} ödülü ayarlandı.`, flags: MessageFlags.Ephemeral });
}

async function removeReward(interaction: ChatInputCommandInteraction<"cached">) {
  const lvl = interaction.options.getInteger("level", true);
  const deleted = await prisma.levelReward
    .delete({ where: { guildId_level: { guildId: interaction.guild.id, level: lvl } } })
    .catch(() => null);
  await interaction.reply({
    content: deleted ? `🗑️ Level ${lvl} ödülü kaldırıldı.` : `Level ${lvl} için ödül yoktu.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function listRewards(interaction: ChatInputCommandInteraction<"cached">) {
  const rewards = await prisma.levelReward.findMany({
    where: { guildId: interaction.guild.id },
    orderBy: { level: "asc" },
  });
  if (rewards.length === 0) {
    await interaction.reply({ content: "Henüz ödül rolü yok. `/level odul-ekle` ile ekle.", flags: MessageFlags.Ephemeral });
    return;
  }
  const lines = rewards.map((r) => `• **Level ${r.level}** → <@&${r.roleId}>`);
  await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function show(interaction: ChatInputCommandInteraction<"cached">) {
  const c = await getLevelConfig(interaction.guild.id);
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("XP / Level Ayarları")
    .setDescription(
      [
        `Durum: **${c.enabled ? "açık" : "kapalı"}**`,
        `Mesaj XP: **${c.xpPerMsg}** (+0..9), cooldown **${c.cooldownSec}sn**`,
        `Sesli XP: **${c.voiceXpEnabled ? "açık" : "kapalı"}**, dakika başına **${c.voiceXpPerMin}**`,
        `Level-up duyurusu: **${c.announceLevelUp ? "açık" : "kapalı"}**`,
        `Duyuru kanalı: ${c.levelUpChannelId ? `<#${c.levelUpChannelId}>` : "mesajın geldiği kanal"}`,
      ].join("\n"),
    );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export default level;
