// Düello daveti: karşı taraf "Kabul Et" demeden dövüş başlamaz (puan sömürüsü engeli).
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { prisma } from "@hoixi/db";
import { loadFighter, battle } from "./index.js";

export const DUEL_CD_MS = 60_000;
export const DUEL_PREFIX = "duel";

function elo(rA: number, rB: number, aWon: boolean): [number, number] {
  const expA = 1 / (1 + 10 ** ((rB - rA) / 400));
  const k = 32;
  const sA = aWon ? 1 : 0;
  return [Math.round(rA + k * (sA - expA)), Math.round(rB + k * (1 - sA - (1 - expA)))];
}

export function challengeMessage(challenger: User, target: User) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${DUEL_PREFIX}:acc:${challenger.id}:${target.id}`).setLabel("Kabul Et ⚔️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${DUEL_PREFIX}:dec:${challenger.id}:${target.id}`).setLabel("Reddet").setStyle(ButtonStyle.Danger),
  );
  return {
    content: `⚔️ ${target}, **${challenger.username}** seni düelloya çağırdı! Kabul ediyor musun?`,
    components: [row],
    allowedMentions: { users: [target.id] as string[] },
  };
}

export async function handleDuelButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const [, action, challengerId, targetId] = interaction.customId.split(":");

  // Sadece davet edilen kişi cevaplayabilir.
  if (interaction.user.id !== targetId) {
    await interaction.reply({ content: "Bu düello daveti sana ait değil.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === "dec") {
    await interaction.update({ content: `🚫 **${interaction.user.username}** düelloyu reddetti.`, components: [] });
    return;
  }

  await interaction.deferUpdate();
  const guild = interaction.guild;
  const chMember = await guild.members.fetch(challengerId).catch(() => null);
  const a = await loadFighter(guild.id, challengerId, chMember?.user.username ?? "Meydan okuyan");

  if (a.player.lastDuelAt && Date.now() - a.player.lastDuelAt.getTime() < DUEL_CD_MS) {
    await interaction.editReply({ content: "⏳ Meydan okuyan henüz dövüşemez (bekleme süresi).", components: [] });
    return;
  }

  const b = await loadFighter(guild.id, targetId, interaction.user.username);
  const res = battle(a.fighter, b.fighter, a.fighter.luck);
  const aWon = res.winner === a.fighter;
  const [na, nb] = elo(a.player.elo, b.player.elo, aWon);

  await prisma.$transaction([
    prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: challengerId } },
      data: { elo: na, lastDuelAt: new Date(), wins: { increment: aWon ? 1 : 0 }, losses: { increment: aWon ? 0 : 1 } },
    }),
    prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: targetId } },
      data: { elo: nb, wins: { increment: aWon ? 0 : 1 }, losses: { increment: aWon ? 1 : 0 } },
    }),
  ]);

  const chName = chMember?.user.username ?? "Meydan okuyan";
  const dA = na - a.player.elo;
  const dB = nb - b.player.elo;
  const embed = new EmbedBuilder()
    .setColor(res.upset ? 0xffc83d : 0xff2e97)
    .setAuthor({ name: `⚔️ ${chName} vs ${interaction.user.username}` })
    .setDescription(res.log.join("\n"))
    .addFields(
      { name: "Kazanan", value: `🏆 **${res.winner.name}**`, inline: true },
      { name: "Güç", value: `${a.fighter.power} vs ${b.fighter.power}`, inline: true },
      { name: "ELO", value: `${chName}: ${na} (${dA >= 0 ? "+" : ""}${dA})\n${interaction.user.username}: ${nb} (${dB >= 0 ? "+" : ""}${dB})` },
    );

  await interaction.editReply({ content: "⚔️ Düello tamamlandı!", embeds: [embed], components: [] });
}
