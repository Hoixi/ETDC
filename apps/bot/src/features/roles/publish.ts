// Bir paneli kanala yayınlar veya mevcut mesajını günceller.
// Milestone 6'da panel iç API'si de bu fonksiyonları çağıracak.
import {
  DiscordAPIError,
  type Client,
  type Message,
} from "discord.js";
import { prisma } from "@hoixi/db";
import { buildPanelMessage } from "./render.js";

export class PanelPublishError extends Error {}

async function loadPanel(panelId: string) {
  const panel = await prisma.rolePanel.findUnique({
    where: { id: panelId },
    include: { buttons: true },
  });
  if (!panel) throw new PanelPublishError("Panel bulunamadı.");
  return panel;
}

/**
 * Paneli yayınlar. messageId varsa mevcut mesajı edit'ler (yenisini atmaz),
 * mesaj silinmişse yeniden gönderir. channelId override edilebilir.
 */
export async function publishPanel(
  client: Client,
  panelId: string,
  opts: { channelId?: string } = {},
): Promise<Message> {
  const panel = await loadPanel(panelId);
  const channelId = opts.channelId ?? panel.channelId;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    throw new PanelPublishError("Hedef kanal bulunamadı veya metin kanalı değil.");
  }

  const payload = buildPanelMessage(panel);

  // Mevcut mesajı düzenlemeyi dene.
  if (panel.messageId) {
    try {
      const existing = await channel.messages.fetch(panel.messageId);
      const edited = await existing.edit(payload);
      if (channelId !== panel.channelId) {
        await prisma.rolePanel.update({
          where: { id: panelId },
          data: { channelId },
        });
      }
      return edited;
    } catch (err) {
      // Mesaj silinmiş (Unknown Message) → yeniden gönder. Başka hatayı yükselt.
      if (!(err instanceof DiscordAPIError && err.code === 10008)) throw err;
    }
  }

  const sent = await channel.send(payload);
  await prisma.rolePanel.update({
    where: { id: panelId },
    data: { messageId: sent.id, channelId },
  });
  return sent;
}

/** Panel mesajını Discord'dan ve kaydı DB'den siler. */
export async function deletePanel(
  client: Client,
  panelId: string,
): Promise<void> {
  const panel = await prisma.rolePanel.findUnique({ where: { id: panelId } });
  if (!panel) throw new PanelPublishError("Panel bulunamadı.");

  if (panel.messageId) {
    const channel = await client.channels.fetch(panel.channelId).catch(() => null);
    if (channel?.isTextBased() && "messages" in channel) {
      await channel.messages.delete(panel.messageId).catch(() => {
        /* mesaj zaten silinmişse önemli değil */
      });
    }
  }
  await prisma.rolePanel.delete({ where: { id: panelId } });
}
