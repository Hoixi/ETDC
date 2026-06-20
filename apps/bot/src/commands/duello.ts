// /duello — başka bir oyuncuyla PvP. Güç belirleyici ama zayıfın da şansı var.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { loadFighter, battle } from "../features/arena/index.js";

const DUEL_CD_MS = 60_000;

function elo(rA: number, rB: number, aWon: boolean): [number, number] {
  const expA = 1 / (1 + 10 ** ((rB - rA) / 400));
  const k = 32;
  const sA = aWon ? 1 : 0;
  return [Math.round(rA + k * (sA - expA)), Math.round(rB + k * (1 - sA - (1 - expA)))];
}

const duello: Command = {
  data: new SlashCommandBuilder()
    .setName("duello")
    .setDescription("Başka bir oyuncuya meydan oku (PvP)")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Rakibin").setRequired(true)),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser("uye", true);
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "Kendinle dövüşemezsin 🤡", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: "Botlarla dövüşülmez. `/avlan` ile canavar avla.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();
    const { guild, user } = interaction;
    const a = await loadFighter(guild.id, user.id, user.username);

    if (a.player.lastDuelAt && Date.now() - a.player.lastDuelAt.getTime() < DUEL_CD_MS) {
      const ready = Math.ceil((DUEL_CD_MS - (Date.now() - a.player.lastDuelAt.getTime())) / 1000);
      await interaction.editReply(`⏳ Nefeslen! ${ready} sn sonra tekrar dövüşebilirsin.`);
      return;
    }

    const b = await loadFighter(guild.id, target.id, target.username);
    const res = battle(a.fighter, b.fighter, a.fighter.luck);
    const aWon = res.winner === a.fighter;
    const [na, nb] = elo(a.player.elo, b.player.elo, aWon);

    await prisma.$transaction([
      prisma.arenaPlayer.update({
        where: { guildId_userId: { guildId: guild.id, userId: user.id } },
        data: { elo: na, lastDuelAt: new Date(), wins: { increment: aWon ? 1 : 0 }, losses: { increment: aWon ? 0 : 1 } },
      }),
      prisma.arenaPlayer.update({
        where: { guildId_userId: { guildId: guild.id, userId: target.id } },
        data: { elo: nb, wins: { increment: aWon ? 0 : 1 }, losses: { increment: aWon ? 1 : 0 } },
      }),
    ]);

    const dA = na - a.player.elo;
    const dB = nb - b.player.elo;
    const embed = new EmbedBuilder()
      .setColor(res.upset ? 0xffc83d : 0xff2e97)
      .setAuthor({ name: `⚔️ ${user.username} vs ${target.username}` })
      .setDescription(res.log.join("\n"))
      .addFields(
        { name: "Kazanan", value: `🏆 **${res.winner.name}**`, inline: true },
        { name: "Güç", value: `${a.fighter.power} vs ${b.fighter.power}`, inline: true },
        { name: "ELO", value: `${user.username}: ${na} (${dA >= 0 ? "+" : ""}${dA})\n${target.username}: ${nb} (${dB >= 0 ? "+" : ""}${dB})` },
      )
      .setFooter({ text: `${user.username} kazanma şansı: %${Math.round(res.chance * 100)}` });

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

export default duello;
