// /kas — 1 saatlik idle kasma oturumu başlat.
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { getPlayer } from "../features/arena/index.js";
import { getArenaConfig } from "../lib/guildConfig.js";

const ts = (d: Date) => `<t:${Math.floor(d.getTime() / 1000)}:R>`;

const kas: Command = {
  data: new SlashCommandBuilder()
    .setName("kas")
    .setDescription("1 saatlik eşya kasma oturumu başlatır")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const cfg = await getArenaConfig(interaction.guild.id);
    if (!cfg.enabled) {
      await interaction.reply({ content: "🎪 Arena bu sunucuda kapalı.", flags: MessageFlags.Ephemeral });
      return;
    }
    const player = await getPlayer(interaction.guild.id, interaction.user.id);
    const now = Date.now();

    if (player.grindEndsAt && !player.grindCollected) {
      if (player.grindEndsAt.getTime() > now) {
        await interaction.reply({
          content: `⏳ Zaten kasıyorsun! Oturum ${ts(player.grindEndsAt)} bitecek.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.reply({
        content: "🎁 Önceki kasman bitti ama ganimetini almadın. Önce `/topla` yap!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const endsAt = new Date(now + cfg.grindMinutes * 60_000);
    await prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } },
      data: { grindEndsAt: endsAt, grindCollected: false },
    });

    await interaction.reply(
      `🎪 **Kasmaya başladın!** Karnaval enkazını eşeliyorsun...\n` +
        `Oturum ${ts(endsAt)} bitecek. Sonra \`/topla\` ile ganimetini al.`,
    );
  },
};

export default kas;
