// Bot iç API'si (Fastify). SADECE localhost'ta dinler, INTERNAL_API_KEY ile korunur.
// Panel canlı Discord aksiyonlarını (kanal/rol listesi, rol oluştur, panel yayınla,
// welcome önizleme, config cache invalidate) buradan çağırır.
import Fastify from "fastify";
import { ChannelType, PermissionFlagsBits, type Client } from "discord.js";
import { env } from "../config.js";
import { publishPanel, deletePanel, PanelPublishError } from "../features/roles/index.js";
import { drawWelcomeCard } from "../features/welcome/index.js";
import { applyPlaceholders } from "../lib/placeholders.js";
import { invalidateGuild } from "../lib/guildConfig.js";
import {
  salvageItem, upgradeItem, rerollItem, spinWheel, allocateSkill, respecSkills,
  equipAbility, unequipAbility, attachAddon, detachAddon,
} from "../features/arena/index.js";

export async function startApi(client: Client): Promise<void> {
  if (!env.INTERNAL_API_KEY) {
    console.warn("⚠️ INTERNAL_API_KEY tanımsız — bot iç API başlatılmadı (panel canlı aksiyonları çalışmaz).");
    return;
  }

  const app = Fastify({ logger: false });

  // Auth: her istekte x-internal-key header'ı doğrula.
  app.addHook("onRequest", async (req, reply) => {
    if (req.headers["x-internal-key"] !== env.INTERNAL_API_KEY) {
      await reply.code(401).send({ error: "Yetkisiz" });
    }
  });

  // Guild'i getir; yoksa 404.
  const requireGuild = (guildId: string) => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new NotFound("Sunucu bulunamadı veya bot içinde değil.");
    return guild;
  };

  app.get("/health", async () => ({ ok: true, user: client.user?.tag }));

  // --- Kanal listesi (metin kanalları) ---
  app.get<{ Params: { guildId: string } }>("/guilds/:guildId/channels", async (req) => {
    const guild = requireGuild(req.params.guildId);
    return guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.rawPosition }))
      .sort((a, b) => a.position - b.position);
  });

  // --- Rol listesi (botun atayabileceği bilgisiyle) ---
  app.get<{ Params: { guildId: string } }>("/guilds/:guildId/roles", async (req) => {
    const guild = requireGuild(req.params.guildId);
    const botHighest = guild.members.me?.roles.highest.position ?? 0;
    return guild.roles.cache
      .filter((r) => r.id !== guild.id) // @everyone hariç
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        managed: r.managed,
        assignable: !r.managed && r.position < botHighest,
      }))
      .sort((a, b) => b.position - a.position);
  });

  // --- Guild bilgisi ---
  app.get<{ Params: { guildId: string } }>("/guilds/:guildId/info", async (req) => {
    const guild = requireGuild(req.params.guildId);
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      memberCount: guild.memberCount,
      botHighestRolePosition: guild.members.me?.roles.highest.position ?? 0,
    };
  });

  // --- Kullanıcının yönetici yetkisi var mı (panel gating ikinci doğrulama) ---
  app.get<{ Params: { guildId: string; userId: string } }>(
    "/guilds/:guildId/members/:userId/can-manage",
    async (req) => {
      const guild = requireGuild(req.params.guildId);
      const member = await guild.members.fetch(req.params.userId).catch(() => null);
      const canManage = Boolean(
        member?.permissions.has(PermissionFlagsBits.ManageGuild) ||
          member?.permissions.has(PermissionFlagsBits.Administrator),
      );
      return { canManage };
    },
  );

  // --- Yeni rol oluştur ---
  app.post<{ Params: { guildId: string }; Body: { name: string; color?: string } }>(
    "/guilds/:guildId/roles",
    async (req, reply) => {
      const guild = requireGuild(req.params.guildId);
      const { name, color } = req.body ?? {};
      if (!name || name.length > 100) {
        return reply.code(400).send({ error: "Geçersiz rol adı." });
      }
      const role = await guild.roles.create({
        name,
        color: (color as `#${string}`) ?? undefined,
        reason: "Panelden oluşturuldu",
      });
      return { id: role.id, name: role.name, color: role.hexColor, position: role.position };
    },
  );

  // --- Panel yayınla / güncelle ---
  app.post<{ Params: { panelId: string }; Body: { channelId?: string } }>(
    "/panels/:panelId/publish",
    async (req, reply) => {
      try {
        const msg = await publishPanel(client, req.params.panelId, { channelId: req.body?.channelId });
        return { messageId: msg.id, channelId: msg.channelId };
      } catch (err) {
        if (err instanceof PanelPublishError) return reply.code(400).send({ error: err.message });
        throw err;
      }
    },
  );

  // --- Panel sil (mesaj + kayıt) ---
  app.post<{ Params: { panelId: string } }>("/panels/:panelId/delete", async (req, reply) => {
    try {
      await deletePanel(client, req.params.panelId);
      return { ok: true };
    } catch (err) {
      if (err instanceof PanelPublishError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  // --- Welcome kartı önizleme (PNG) ---
  app.post<{
    Body: { avatarUrl?: string; title: string; subtitle: string; backgroundUrl?: string; color?: string; username?: string; memberCount?: number; serverName?: string };
  }>("/preview/welcome", async (req, reply) => {
    const b = req.body;
    const ctx = {
      userMention: b.username ?? "Kullanıcı",
      username: b.username ?? "Kullanıcı",
      memberCount: b.memberCount ?? 100,
      serverName: b.serverName ?? "Sunucu",
    };
    const buffer = await drawWelcomeCard({
      avatarUrl: b.avatarUrl ?? "https://cdn.discordapp.com/embed/avatars/0.png",
      title: applyPlaceholders(b.title ?? "Hoş geldin {user}!", ctx),
      subtitle: applyPlaceholders(b.subtitle ?? "{memberCount}. üyemizsin", ctx),
      backgroundUrl: b.backgroundUrl ?? null,
      accentColor: b.color ?? "#5865F2",
    });
    reply.header("Content-Type", "image/png");
    return reply.send(buffer);
  });

  // --- Config cache invalidate (panel DB'ye yazınca çağırır) ---
  app.post<{ Body: { guildId: string } }>("/config/invalidate", async (req, reply) => {
    if (!req.body?.guildId) return reply.code(400).send({ error: "guildId gerekli" });
    invalidateGuild(req.body.guildId);
    return { ok: true };
  });

  // --- Arena ekonomi (panel oyuncu paneli üzerinden çağırır) ---
  type ArenaParams = { guildId: string; userId: string };
  const send = (reply: import("fastify").FastifyReply, r: { ok: boolean; error?: string }) =>
    r.ok ? r : reply.code(400).send(r);

  app.post<{ Params: ArenaParams; Body: { itemId: string } }>(
    "/arena/:guildId/:userId/salvage",
    async (req, reply) => send(reply, await salvageItem(req.params.guildId, req.params.userId, req.body.itemId)),
  );
  app.post<{ Params: ArenaParams; Body: { itemId: string } }>(
    "/arena/:guildId/:userId/upgrade",
    async (req, reply) => send(reply, await upgradeItem(req.params.guildId, req.params.userId, req.body.itemId)),
  );
  app.post<{ Params: ArenaParams; Body: { itemId: string } }>(
    "/arena/:guildId/:userId/reroll",
    async (req, reply) => send(reply, await rerollItem(req.params.guildId, req.params.userId, req.body.itemId)),
  );
  app.post<{ Params: ArenaParams }>(
    "/arena/:guildId/:userId/wheel",
    async (req, reply) => send(reply, await spinWheel(req.params.guildId, req.params.userId)),
  );

  // --- Arena skill tree ---
  app.post<{ Params: ArenaParams; Body: { nodeId: string } }>(
    "/arena/:guildId/:userId/skill/allocate",
    async (req, reply) => send(reply, await allocateSkill(req.params.guildId, req.params.userId, req.body.nodeId)),
  );
  app.post<{ Params: ArenaParams }>(
    "/arena/:guildId/:userId/skill/respec",
    async (req, reply) => send(reply, await respecSkills(req.params.guildId, req.params.userId)),
  );

  // --- Arena aktif yetenekler + addon ---
  app.post<{ Params: ArenaParams; Body: { key: string } }>(
    "/arena/:guildId/:userId/ability/equip",
    async (req, reply) => send(reply, await equipAbility(req.params.guildId, req.params.userId, req.body.key)),
  );
  app.post<{ Params: ArenaParams; Body: { key: string } }>(
    "/arena/:guildId/:userId/ability/unequip",
    async (req, reply) => send(reply, await unequipAbility(req.params.guildId, req.params.userId, req.body.key)),
  );
  app.post<{ Params: ArenaParams; Body: { abilityKey: string; addonKey: string } }>(
    "/arena/:guildId/:userId/ability/attach",
    async (req, reply) => send(reply, await attachAddon(req.params.guildId, req.params.userId, req.body.abilityKey, req.body.addonKey)),
  );
  app.post<{ Params: ArenaParams; Body: { abilityKey: string; addonKey: string } }>(
    "/arena/:guildId/:userId/ability/detach",
    async (req, reply) => send(reply, await detachAddon(req.params.guildId, req.params.userId, req.body.abilityKey, req.body.addonKey)),
  );

  // Hata yakalayıcı
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof NotFound) return reply.code(404).send({ error: err.message });
    console.error("API hatası:", err);
    return reply.code(500).send({ error: "Sunucu hatası" });
  });

  try {
    await app.listen({ host: env.BOT_API_HOST, port: env.BOT_API_PORT });
    console.log(`🔌 Bot iç API: http://${env.BOT_API_HOST}:${env.BOT_API_PORT}`);
  } catch (err) {
    console.error("Bot iç API başlatılamadı:", err);
  }
}

class NotFound extends Error {}
