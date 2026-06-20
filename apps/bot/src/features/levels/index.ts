// XP/level: mesaj XP'si, level atlama duyurusu, ödül rolleri.
import {
  EmbedBuilder,
  type GuildMember,
  type GuildTextBasedChannel,
  type Message,
} from "discord.js";
import { getLevelConfig } from "../../lib/guildConfig.js";
import type { LevelConfig } from "../../lib/config-types.js";
import { addXp, isOnCooldown } from "./xp.js";
import { applyLevelRewards } from "./rewards.js";

export * from "./xp.js";
export { drawRankCard } from "./card.js";
export { startVoiceXpLoop } from "./voice.js";

// Mesaj başına XP.
export async function handleMessageXp(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot || message.system) return;

  const cfg = await getLevelConfig(message.guild.id);
  if (!cfg.enabled) return;
  if (await isOnCooldown(message.guild.id, message.author.id, cfg.cooldownSec)) return;

  // Küçük rastgelelik (xpPerMsg taban, +0..9).
  const amount = cfg.xpPerMsg + Math.floor(Math.random() * 10);
  const res = await addXp(message.guild.id, message.author.id, amount, true);

  if (res.leveledUp && message.member) {
    const rewards = await applyLevelRewards(message.member, res.newLevel);
    if (cfg.announceLevelUp) {
      await announceLevelUp(message.member, res.newLevel, cfg, rewards.map((r) => r.toString()), message.channel as GuildTextBasedChannel);
    }
  }
}

export async function announceLevelUp(
  member: GuildMember,
  level: number,
  cfg: LevelConfig,
  rewardMentions: string[],
  fallbackChannel: GuildTextBasedChannel | null,
): Promise<void> {
  let channel: GuildTextBasedChannel | null = fallbackChannel;
  if (cfg.levelUpChannelId) {
    const c = member.guild.channels.cache.get(cfg.levelUpChannelId);
    if (c?.isTextBased() && "send" in c) channel = c as GuildTextBasedChannel;
  }
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setDescription(`🎉 ${member} **Level ${level}**'e ulaştı!`);
  if (rewardMentions.length) {
    embed.addFields({ name: "Yeni ödül rolü", value: rewardMentions.join(", ") });
  }
  await channel
    .send({ embeds: [embed], allowedMentions: { users: [member.id] } })
    .catch(() => {});
}
