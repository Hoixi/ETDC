// /jeton-ver — kendi arena jetonundan bir üyeye aktarır.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { getPlayer } from "../features/arena/index.js";

const jetonVer: Command = {
  data: new SlashCommandBuilder()
    .setName("jeton-ver")
    .setDescription("Kendi jetonundan bir arkadaşına aktarır")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Jeton göndereceğin kişi").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("miktar").setDescription("Gönderilecek jeton").setRequired(true).setMinValue(1).setMaxValue(1000000),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const { guild, user } = interaction;
    const target = interaction.options.getUser("uye", true);
    const amount = interaction.options.getInteger("miktar", true);

    if (target.id === user.id) {
      await interaction.reply({ content: "Kendine jeton gönderemezsin 🙂", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: "Botlara jeton gönderilemez.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Gönderenin kaydı + alıcının kaydı hazır olsun.
    await getPlayer(guild.id, user.id);
    await getPlayer(guild.id, target.id);

    // Koşullu düşüm (atomik): yalnızca yeterli bakiye varsa düşer.
    const dec = await prisma.arenaPlayer.updateMany({
      where: { guildId: guild.id, userId: user.id, tokens: { gte: amount } },
      data: { tokens: { decrement: amount } },
    });
    if (dec.count === 0) {
      const me = await getPlayer(guild.id, user.id);
      await interaction.reply({ content: `Yetersiz jeton. Bakiyen: ${me.tokens} 🎟️`, flags: MessageFlags.Ephemeral });
      return;
    }

    const receiver = await prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: target.id } },
      data: { tokens: { increment: amount } },
    });
    const sender = await getPlayer(guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(0xffc83d)
      .setAuthor({ name: "🎟️ Jeton Transferi", iconURL: user.displayAvatarURL() })
      .setDescription(`**${user.username}** → ${target}\n**${amount} 🎟️ jeton** gönderildi!`)
      .setFooter({ text: `${user.username}: ${sender.tokens} 🎟️ · ${target.username}: ${receiver.tokens} 🎟️` });

    await interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
  },
};

export default jetonVer;
