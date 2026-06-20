// /warn — uyarı ver (DB'de tutulur).
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { logModAction } from "../features/logging/index.js";

const warn: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Bir üyeye uyarı verir")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Uyarılacak üye").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep").setRequired(true)),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("uye", true);
    const reason = interaction.options.getString("sebep", true);

    if (user.bot) {
      await interaction.reply({ content: "Botlara uyarı verilemez.", flags: MessageFlags.Ephemeral });
      return;
    }

    await prisma.warning.create({
      data: {
        guild: { connectOrCreate: { where: { id: interaction.guild.id }, create: { id: interaction.guild.id } } },
        userId: user.id,
        moderator: interaction.user.id,
        reason,
      },
    });
    const count = await prisma.warning.count({ where: { guildId: interaction.guild.id, userId: user.id } });

    await interaction.reply({ content: `⚠️ **${user.tag}** uyarıldı (toplam **${count}** uyarı). Sebep: ${reason}`, flags: MessageFlags.Ephemeral });
    await logModAction({ guild: interaction.guild, action: "Uyarı", target: user, moderator: interaction.user, reason, extra: `Toplam ${count} uyarı` });
  },
};

export default warn;
