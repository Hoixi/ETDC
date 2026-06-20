// /ban — üye yasakla (sunucuda olmayan kullanıcıyı da ID ile).
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { logModAction } from "../features/logging/index.js";

const ban: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bir kullanıcıyı yasaklar")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Yasaklanacak kullanıcı").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep"))
    .addIntegerOption((o) =>
      o.setName("mesaj_sil_gun").setDescription("Son kaç günün mesajları silinsin (0-7)").setMinValue(0).setMaxValue(7),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("uye", true);
    const reason = interaction.options.getString("sebep") ?? "Belirtilmedi";
    const days = interaction.options.getInteger("mesaj_sil_gun") ?? 0;

    const member = interaction.options.getMember("uye");
    if (member && !member.bannable) {
      await interaction.reply({ content: "Bu üyeyi yasaklayamıyorum (yetki/rol hiyerarşisi).", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.guild.bans.create(user.id, {
      reason: `${interaction.user.tag}: ${reason}`,
      deleteMessageSeconds: days * 86400,
    });
    await interaction.reply({ content: `🔨 **${user.tag}** yasaklandı. Sebep: ${reason}`, flags: MessageFlags.Ephemeral });
    await logModAction({ guild: interaction.guild, action: "Ban", target: user, moderator: interaction.user, reason });
  },
};

export default ban;
