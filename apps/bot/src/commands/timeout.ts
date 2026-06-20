// /timeout — üyeyi susturur (dakika). 0 = susturmayı kaldır.
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { logModAction } from "../features/logging/index.js";

const MAX_MIN = 40320; // Discord limiti: 28 gün

const timeout: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Bir üyeyi belirli süre susturur")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Susturulacak üye").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("dakika").setDescription("Süre (dakika, 0 = kaldır)").setRequired(true).setMinValue(0).setMaxValue(MAX_MIN),
    )
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const member = interaction.options.getMember("uye");
    const minutes = interaction.options.getInteger("dakika", true);
    const reason = interaction.options.getString("sebep") ?? "Belirtilmedi";

    if (!member) {
      await interaction.reply({ content: "Bu üye sunucuda değil.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: "Bu üyeyi susturamıyorum (yetki/rol hiyerarşisi).", flags: MessageFlags.Ephemeral });
      return;
    }

    if (minutes === 0) {
      await member.timeout(null, `${interaction.user.tag}: ${reason}`);
      await interaction.reply({ content: `🔊 **${member.user.tag}** susturması kaldırıldı.`, flags: MessageFlags.Ephemeral });
      await logModAction({ guild: interaction.guild, action: "Susturma Kaldırma", target: member.user, moderator: interaction.user, reason });
      return;
    }

    await member.timeout(minutes * 60_000, `${interaction.user.tag}: ${reason}`);
    await interaction.reply({ content: `🔇 **${member.user.tag}** ${minutes} dakika susturuldu. Sebep: ${reason}`, flags: MessageFlags.Ephemeral });
    await logModAction({ guild: interaction.guild, action: "Timeout", target: member.user, moderator: interaction.user, reason, extra: `${minutes} dakika` });
  },
};

export default timeout;
