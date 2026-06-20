// /warnings — bir üyenin uyarılarını listele + tekil/toplu sil.
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";

const warnings: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Üye uyarılarını yönet")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName("liste").setDescription("Bir üyenin uyarılarını gösterir")
        .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName("sil").setDescription("Tek bir uyarıyı ID ile siler")
        .addStringOption((o) => o.setName("id").setDescription("Uyarı ID (liste'den)").setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName("temizle").setDescription("Bir üyenin tüm uyarılarını siler")
        .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true)),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    if (sub === "liste") return list(interaction);
    if (sub === "sil") return removeOne(interaction);
    return clearAll(interaction);
  },
};

async function list(interaction: ChatInputCommandInteraction<"cached">) {
  const user = interaction.options.getUser("uye", true);
  const rows = await prisma.warning.findMany({
    where: { guildId: interaction.guild.id, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  if (rows.length === 0) {
    await interaction.reply({ content: `**${user.tag}** için uyarı yok.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0xeb6420)
    .setTitle(`${user.tag} — Uyarılar (${rows.length})`)
    .setDescription(
      rows
        .map(
          (w) =>
            `\`${w.id.slice(0, 8)}\` <t:${Math.floor(w.createdAt.getTime() / 1000)}:R> — <@${w.moderator}>\n> ${w.reason}`,
        )
        .join("\n\n"),
    )
    .setFooter({ text: "Silmek için: /warnings sil id:<tam-id>" });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function removeOne(interaction: ChatInputCommandInteraction<"cached">) {
  const id = interaction.options.getString("id", true);
  // Kısaltılmış id de kabul et (ilk 8 karakter).
  const found = await prisma.warning.findFirst({
    where: { guildId: interaction.guild.id, id: { startsWith: id } },
  });
  if (!found) {
    await interaction.reply({ content: "Bu ID ile uyarı bulunamadı.", flags: MessageFlags.Ephemeral });
    return;
  }
  await prisma.warning.delete({ where: { id: found.id } });
  await interaction.reply({ content: `🗑️ Uyarı silindi (\`${found.id.slice(0, 8)}\`).`, flags: MessageFlags.Ephemeral });
}

async function clearAll(interaction: ChatInputCommandInteraction<"cached">) {
  const user = interaction.options.getUser("uye", true);
  const { count } = await prisma.warning.deleteMany({
    where: { guildId: interaction.guild.id, userId: user.id },
  });
  await interaction.reply({ content: `🧹 **${user.tag}** için **${count}** uyarı silindi.`, flags: MessageFlags.Ephemeral });
}

export default warnings;
