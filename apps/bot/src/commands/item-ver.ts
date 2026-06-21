// /item-ver — kendi envanterinden bir eşyayı bir arkadaşına aktarır (autocomplete ile seçilir).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { getPlayer, RARITY, SLOT, itemLine } from "../features/arena/index.js";

const itemVer: Command = {
  data: new SlashCommandBuilder()
    .setName("item-ver")
    .setDescription("Envanterindeki bir eşyayı bir arkadaşına verir")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Eşyayı göndereceğin kişi").setRequired(true))
    .addStringOption((o) =>
      o.setName("esya").setDescription("Vereceğin eşya").setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    if (!interaction.inCachedGuild()) return;
    const focused = interaction.options.getFocused().toLowerCase();
    const items = await prisma.arenaItem.findMany({
      where: { guildId: interaction.guild.id, userId: interaction.user.id },
      orderBy: { iLvl: "desc" },
      take: 60,
    });
    const choices = items
      .filter((it) => !focused || it.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((it) => {
        const up = it.upgrade > 0 ? `+${it.upgrade} ` : "";
        const label = `${RARITY[it.rarity].emoji} ${up}${it.name} · ${SLOT[it.slot].label} · iLvl ${it.iLvl}`;
        return { name: label.slice(0, 100), value: it.id };
      });
    await interaction.respond(choices);
  },

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const { guild, user } = interaction;
    const target = interaction.options.getUser("uye", true);
    const itemId = interaction.options.getString("esya", true);

    if (target.id === user.id) {
      await interaction.reply({ content: "Kendine eşya veremezsin 🙂", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: "Botlara eşya verilemez.", flags: MessageFlags.Ephemeral });
      return;
    }

    const item = await prisma.arenaItem.findUnique({ where: { id: itemId } });
    if (!item || item.guildId !== guild.id || item.userId !== user.id) {
      await interaction.reply({ content: "Bu eşya sana ait değil ya da bulunamadı. Listeden seç.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Alıcının kaydı hazır olsun, sonra eşyayı ona aktar (giyili ise çıkar).
    await getPlayer(guild.id, target.id);
    await prisma.arenaItem.update({
      where: { id: itemId },
      data: { userId: target.id, equipped: false },
    });

    const embed = new EmbedBuilder()
      .setColor(RARITY[item.rarity].color)
      .setAuthor({ name: "🎁 Eşya Hediyesi", iconURL: user.displayAvatarURL() })
      .setDescription(`**${user.username}** → ${target}\n${itemLine(item)}`)
      .setFooter({ text: `${target.username} envanterine eklendi · panelden giyebilir` });

    await interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
  },
};

export default itemVer;
