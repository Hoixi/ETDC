// /karakter — giyili ekipman + toplam statlar + güç.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import {
  getPlayer,
  aggregateStats,
  powerScore,
  itemLine,
  AFFIX,
  makeLoginUrl,
  panelButtonRow,
  type AffixType,
} from "../features/arena/index.js";

const karakter: Command = {
  data: new SlashCommandBuilder()
    .setName("karakter")
    .setDescription("Giyili ekipmanını ve statlarını gösterir")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Karakterini görmek istediğin üye")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("uye") ?? interaction.user;
    const player = await getPlayer(interaction.guild.id, user.id);

    const equipped = await prisma.arenaItem.findMany({
      where: { guildId: interaction.guild.id, userId: user.id, equipped: true },
    });

    const stats = aggregateStats(equipped);
    const power = powerScore(stats);

    const gearText =
      equipped.length > 0
        ? equipped.map(itemLine).join("\n")
        : "_Hiç eşya giymiyorsun. Panelden giy: panel.enterthedarkcarnival.com/arena_";

    const secondary = (Object.entries(stats.affixes) as [AffixType, number][])
      .map(([k, v]) => `${AFFIX[k].label} ${v}${AFFIX[k].suffix}`)
      .join(" · ");

    const embed = new EmbedBuilder()
      .setColor(0xff2e97)
      .setAuthor({ name: `${user.username} — Karakter`, iconURL: user.displayAvatarURL() })
      .setDescription(`**Güç:** ⚡ ${power} · **Seviye:** ${player.level}\n\n${gearText}`)
      .addFields({
        name: "Toplam stat",
        value:
          `ATK ${stats.atk} · DEF ${stats.def} · HP ${stats.hp} · SPD ${stats.spd} · LUCK ${stats.luck}` +
          (secondary ? `\n${secondary}` : ""),
      })
      .setFooter({ text: "Ekipmanı panelden değiştir: panel.enterthedarkcarnival.com/arena" });

    const self = user.id === interaction.user.id;
    const url = self ? makeLoginUrl(interaction.user.id, interaction.guild.id, interaction.user.username) : null;
    await interaction.reply({
      embeds: [embed],
      components: url ? [panelButtonRow(url)] : [],
      flags: self ? undefined : MessageFlags.Ephemeral,
    });
  },
};

export default karakter;
