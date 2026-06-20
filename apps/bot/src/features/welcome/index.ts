// Karşılama/uğurlama: config'i oku, kartı çiz, hedef kanala gönder.
import {
  AttachmentBuilder,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { getWelcomeConfig, getGoodbyeConfig } from "../../lib/guildConfig.js";
import { applyPlaceholders, type PlaceholderContext } from "../../lib/placeholders.js";
import { drawWelcomeCard } from "./card.js";

export { drawWelcomeCard } from "./card.js";

function ctxFor(member: GuildMember | PartialGuildMember): PlaceholderContext {
  return {
    // Kartta okunaklı olsun diye mention yerine görünen ad.
    userMention: member.displayName ?? member.user.username,
    username: member.user.username,
    memberCount: member.guild.memberCount,
    serverName: member.guild.name,
  };
}

async function buildAttachment(
  member: GuildMember | PartialGuildMember,
  cfg: { title: string; subtitle: string; backgroundUrl: string | null; color: string },
): Promise<AttachmentBuilder> {
  const ctx = ctxFor(member);
  const buffer = await drawWelcomeCard({
    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
    title: applyPlaceholders(cfg.title, ctx),
    subtitle: applyPlaceholders(cfg.subtitle, ctx),
    backgroundUrl: cfg.backgroundUrl,
    accentColor: cfg.color,
  });
  return new AttachmentBuilder(buffer, { name: "welcome.png" });
}

export async function handleMemberJoin(member: GuildMember): Promise<void> {
  const cfg = await getWelcomeConfig(member.guild.id);
  if (!cfg.enabled || !cfg.channelId) return;

  const channel = member.guild.channels.cache.get(cfg.channelId);
  if (!channel?.isTextBased() || !("send" in channel)) return;

  const attachment = await buildAttachment(member, cfg);
  await channel
    .send({
      content: `${member}`, // ping
      files: [attachment],
      allowedMentions: { users: [member.id] },
    })
    .catch((err) => console.error("Welcome gönderilemedi:", err));
}

export async function handleMemberLeave(
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const cfg = await getGoodbyeConfig(member.guild.id);
  if (!cfg.enabled || !cfg.channelId) return;

  const channel = member.guild.channels.cache.get(cfg.channelId);
  if (!channel?.isTextBased() || !("send" in channel)) return;

  const attachment = await buildAttachment(member, cfg);
  await channel
    .send({ files: [attachment], allowedMentions: { parse: [] } })
    .catch((err) => console.error("Goodbye gönderilemedi:", err));
}
