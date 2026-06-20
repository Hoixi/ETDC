// Bir RolePanel kaydını Discord mesajına (embed + buton satırları) çevirir.
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle as DjsButtonStyle,
  EmbedBuilder,
  parseEmoji,
} from "discord.js";
import { ButtonStyle, type RoleButton, type RolePanel } from "@hoixi/db";

// customId formatı: role:<panelId>:<buttonId>  (persistent — restart sonrası da çalışır)
export const ROLE_BUTTON_PREFIX = "role";
export const buildCustomId = (panelId: string, buttonId: string) =>
  `${ROLE_BUTTON_PREFIX}:${panelId}:${buttonId}`;

export function parseRoleCustomId(
  customId: string,
): { panelId: string; buttonId: string } | null {
  const parts = customId.split(":");
  if (parts.length !== 3 || parts[0] !== ROLE_BUTTON_PREFIX) return null;
  return { panelId: parts[1], buttonId: parts[2] };
}

// Panel embed JSON'ı (Guild.embed alanında saklanan şekil)
export interface PanelEmbed {
  title?: string;
  description?: string;
  color?: number | string;
  image?: string;
  thumbnail?: string;
  footer?: string;
}

function resolveColor(c?: number | string): number | undefined {
  if (typeof c === "number") return c;
  if (typeof c === "string") {
    const n = parseInt(c.replace("#", ""), 16);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

const STYLE_MAP: Record<ButtonStyle, DjsButtonStyle> = {
  [ButtonStyle.PRIMARY]: DjsButtonStyle.Primary,
  [ButtonStyle.SECONDARY]: DjsButtonStyle.Secondary,
  [ButtonStyle.SUCCESS]: DjsButtonStyle.Success,
  [ButtonStyle.DANGER]: DjsButtonStyle.Danger,
};

function buildEmbed(raw: unknown): EmbedBuilder {
  const e = (raw ?? {}) as PanelEmbed;
  const embed = new EmbedBuilder();
  if (e.title) embed.setTitle(e.title);
  if (e.description) embed.setDescription(e.description);
  const color = resolveColor(e.color);
  if (color !== undefined) embed.setColor(color);
  if (e.image) embed.setImage(e.image);
  if (e.thumbnail) embed.setThumbnail(e.thumbnail);
  if (e.footer) embed.setFooter({ text: e.footer });
  // Hiçbir alan yoksa boş embed Discord'a gönderilemez → zaman damgalı placeholder.
  if (!e.title && !e.description) embed.setDescription("Rol seçimi");
  return embed;
}

function applyEmoji(btn: ButtonBuilder, emoji?: string | null) {
  if (!emoji) return;
  try {
    const parsed = parseEmoji(emoji);
    if (!parsed?.name) return;
    btn.setEmoji(
      parsed.id
        ? { id: parsed.id, name: parsed.name, animated: parsed.animated }
        : parsed.name,
    );
  } catch {
    /* geçersiz emoji'yi sessizce atla */
  }
}

function buildComponents(
  panelId: string,
  buttons: RoleButton[],
): ActionRowBuilder<ButtonBuilder>[] {
  const sorted = [...buttons].sort((a, b) => a.order - b.order);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  // Discord limiti: satır başına 5 buton, en fazla 5 satır (25 buton).
  for (let i = 0; i < sorted.length && rows.length < 5; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const b of sorted.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(buildCustomId(panelId, b.id))
        .setLabel(b.label.slice(0, 80))
        .setStyle(STYLE_MAP[b.style]);
      applyEmoji(btn, b.emoji);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

// Hem yeni gönderim hem edit için aynı payload (sadece embeds + components).
export function buildPanelMessage(
  panel: RolePanel & { buttons: RoleButton[] },
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  return {
    embeds: [buildEmbed(panel.embed)],
    components: buildComponents(panel.id, panel.buttons),
  };
}
