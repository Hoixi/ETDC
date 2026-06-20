// /clear — kanaldan toplu mesaj sil (14 günden eski olanlar Discord'da silinemez).
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
} from "discord.js";
import type { Command } from "../types.js";

const clear: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Kanaldan toplu mesaj siler")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((o) => o.setName("adet").setDescription("Silinecek mesaj sayısı (1-100)").setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName("uye").setDescription("Sadece bu üyenin mesajları")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Bu komut sadece metin kanallarında çalışır.", flags: MessageFlags.Ephemeral });
      return;
    }

    const amount = interaction.options.getInteger("adet", true);
    const user = interaction.options.getUser("uye");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messages = await channel.messages.fetch({ limit: user ? 100 : amount });
    if (user) {
      messages = messages.filter((m) => m.author.id === user.id);
      // İlk N tanesini al
      const ids = [...messages.keys()].slice(0, amount);
      messages = messages.filter((m) => ids.includes(m.id));
    }

    const deleted = await channel.bulkDelete(messages, true);
    await interaction.editReply(
      `🧹 **${deleted.size}** mesaj silindi.${user ? ` (sadece ${user.username})` : ""}` +
        (deleted.size < amount ? "\n*(14 günden eski mesajlar silinemez.)*" : ""),
    );
  },
};

export default clear;
