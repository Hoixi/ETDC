// /profil — arena profili (level, jeton, ELO, W/L).
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { getPlayer, levelProgress } from "../features/arena/index.js";

const profil: Command = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Arena profilini gösterir")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Profilini görmek istediğin üye")),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("uye") ?? interaction.user;
    const player = await getPlayer(interaction.guild.id, user.id);
    const itemCount = await prisma.arenaItem.count({
      where: { guildId: interaction.guild.id, userId: user.id },
    });
    const prog = levelProgress(player.xp);

    const total = player.wins + player.losses;
    const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;

    let grind = "boşta";
    if (player.grindEndsAt && !player.grindCollected) {
      grind =
        player.grindEndsAt.getTime() > Date.now()
          ? `kasıyor (${`<t:${Math.floor(player.grindEndsAt.getTime() / 1000)}:R>`})`
          : "ganimet hazır — `/topla`";
    }

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setAuthor({ name: `${user.username} — Karnaval Arenası`, iconURL: user.displayAvatarURL() })
      .addFields(
        { name: "Seviye", value: `**${prog.level}** (${prog.current}/${prog.needed} XP)`, inline: true },
        { name: "Jeton", value: `🎟️ ${player.tokens}`, inline: true },
        { name: "Rank (ELO)", value: `🏆 ${player.elo}`, inline: true },
        { name: "Galibiyet / Mağlubiyet", value: `${player.wins}G / ${player.losses}M (%${winRate})`, inline: true },
        { name: "Envanter", value: `🎒 ${itemCount} eşya`, inline: true },
        { name: "Kasma", value: grind, inline: true },
      )
      .setFooter({ text: "Eşyalarını panelden giy: panel.enterthedarkcarnival.com/arena" });

    await interaction.reply({ embeds: [embed], flags: user.id === interaction.user.id ? undefined : MessageFlags.Ephemeral });
  },
};

export default profil;
