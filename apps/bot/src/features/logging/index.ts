// Log sistemi: join/leave, mesaj sil/düzenle, mod aksiyonları → panelden seçili kanallara.
import {
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type PartialGuildMember,
  type Message,
  type PartialMessage,
  type GuildTextBasedChannel,
  type User,
} from "discord.js";
import { getLogConfig } from "../../lib/guildConfig.js";
import type { LogConfig } from "../../lib/config-types.js";

async function getLogChannel(
  guild: Guild,
  type: keyof LogConfig,
): Promise<GuildTextBasedChannel | null> {
  const cfg = await getLogConfig(guild.id);
  const id = cfg[type];
  if (!id) return null;
  const channel = guild.channels.cache.get(id) ?? (await guild.channels.fetch(id).catch(() => null));
  if (!channel?.isTextBased() || !("send" in channel)) return null;
  return channel as GuildTextBasedChannel;
}

async function send(channel: GuildTextBasedChannel | null, embed: EmbedBuilder) {
  if (!channel) return;
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

export async function logMemberJoin(member: GuildMember): Promise<void> {
  const ch = await getLogChannel(member.guild, "joinLeave");
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setDescription(`📥 ${member} sunucuya **katıldı**.`)
    .addFields({
      name: "Hesap oluşturulma",
      value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    })
    .setFooter({ text: `Üye #${member.guild.memberCount} • ID: ${member.id}` })
    .setTimestamp();
  await send(ch, embed);
}

export async function logMemberLeave(
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const ch = await getLogChannel(member.guild, "joinLeave");
  const roles = member.roles?.cache
    ?.filter((r) => r.id !== member.guild.id)
    .map((r) => r.toString())
    .join(", ");
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setDescription(`📤 **${member.user.tag}** sunucudan **ayrıldı**.`)
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
  if (roles) embed.addFields({ name: "Roller", value: roles.slice(0, 1024) });
  await send(ch, embed);
}

export async function logMessageDelete(
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guild || message.author?.bot) return;
  const ch = await getLogChannel(message.guild, "messageLog");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setAuthor({
      name: message.author?.tag ?? "Bilinmeyen",
      iconURL: message.author?.displayAvatarURL(),
    })
    .setDescription(
      `🗑️ <#${message.channelId}> kanalındaki mesaj **silindi**.\n\n${message.content?.slice(0, 1800) || "*(içerik yok / embed)*"}`,
    )
    .setFooter({ text: `Yazar ID: ${message.author?.id ?? "?"}` })
    .setTimestamp();
  await send(ch, embed);
}

export async function logMessageEdit(
  oldMsg: Message | PartialMessage,
  newMsg: Message | PartialMessage,
): Promise<void> {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return; // embed yüklenmesi vb. → atla
  const ch = await getLogChannel(newMsg.guild, "messageLog");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setAuthor({
      name: newMsg.author?.tag ?? "Bilinmeyen",
      iconURL: newMsg.author?.displayAvatarURL(),
    })
    .setDescription(`✏️ <#${newMsg.channelId}> kanalında mesaj **düzenlendi**. [Git](${newMsg.url})`)
    .addFields(
      { name: "Önce", value: (oldMsg.content || "*(yok)*").slice(0, 1024) },
      { name: "Sonra", value: (newMsg.content || "*(yok)*").slice(0, 1024) },
    )
    .setFooter({ text: `Yazar ID: ${newMsg.author?.id ?? "?"}` })
    .setTimestamp();
  await send(ch, embed);
}

export interface ModActionLog {
  guild: Guild;
  action: string; // "Kick", "Ban", "Timeout", "Uyarı", "Mesaj Temizleme"
  target: User;
  moderator: User;
  reason?: string;
  extra?: string;
}

export async function logModAction(data: ModActionLog): Promise<void> {
  const ch = await getLogChannel(data.guild, "modLog");
  const embed = new EmbedBuilder()
    .setColor(0xeb6420)
    .setAuthor({ name: data.target.tag, iconURL: data.target.displayAvatarURL() })
    .setDescription(`⚖️ **${data.action}**`)
    .addFields(
      { name: "Üye", value: `${data.target} (${data.target.id})`, inline: true },
      { name: "Yetkili", value: `${data.moderator}`, inline: true },
      { name: "Sebep", value: data.reason || "*Belirtilmedi*" },
    )
    .setTimestamp();
  if (data.extra) embed.addFields({ name: "Detay", value: data.extra });
  await send(ch, embed);
}
