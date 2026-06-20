// /kick — üye at.
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { logModAction } from "../features/logging/index.js";

const kick: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Bir üyeyi sunucudan atar")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Atılacak üye").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const member = interaction.options.getMember("uye");
    const reason = interaction.options.getString("sebep") ?? "Belirtilmedi";

    if (!member) {
      await interaction.reply({ content: "Bu üye sunucuda değil.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ content: "Bu üyeyi atamıyorum (yetki/rol hiyerarşisi).", flags: MessageFlags.Ephemeral });
      return;
    }

    await member.kick(`${interaction.user.tag}: ${reason}`);
    await interaction.reply({ content: `👢 **${member.user.tag}** atıldı. Sebep: ${reason}`, flags: MessageFlags.Ephemeral });
    await logModAction({ guild: interaction.guild, action: "Kick", target: member.user, moderator: interaction.user, reason });
  },
};

export default kick;
