// Bot iç API'sine sunucu tarafından çağrı (INTERNAL_API_KEY ile). Sadece server'da kullan.
const BASE = process.env.BOT_API_URL ?? "http://127.0.0.1:3001";
const KEY = process.env.INTERNAL_API_KEY ?? "";

export class BotApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": KEY,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Bot API hatası (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new BotApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

export interface ApiChannel {
  id: string;
  name: string;
  type: number;
  position: number;
}
export interface ApiRole {
  id: string;
  name: string;
  color: string;
  position: number;
  managed: boolean;
  assignable: boolean;
}
export interface ApiGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  botHighestRolePosition: number;
}

export const botApi = {
  health: () => request<{ ok: boolean; user?: string }>("/health"),
  channels: (guildId: string) => request<ApiChannel[]>(`/guilds/${guildId}/channels`),
  roles: (guildId: string) => request<ApiRole[]>(`/guilds/${guildId}/roles`),
  guildInfo: (guildId: string) => request<ApiGuildInfo>(`/guilds/${guildId}/info`),
  createRole: (guildId: string, name: string, color?: string) =>
    request<ApiRole>(`/guilds/${guildId}/roles`, { method: "POST", body: JSON.stringify({ name, color }) }),
  publishPanel: (panelId: string, channelId?: string) =>
    request<{ messageId: string; channelId: string }>(`/panels/${panelId}/publish`, {
      method: "POST",
      body: JSON.stringify({ channelId }),
    }),
  deletePanel: (panelId: string) =>
    request<{ ok: boolean }>(`/panels/${panelId}/delete`, { method: "POST", body: JSON.stringify({}) }),
  invalidateConfig: (guildId: string) =>
    request<{ ok: boolean }>(`/config/invalidate`, { method: "POST", body: JSON.stringify({ guildId }) }),

  // Arena ekonomi
  arenaSalvage: (g: string, u: string, itemId: string) =>
    request<{ gained: number; tokens: number }>(`/arena/${g}/${u}/salvage`, { method: "POST", body: JSON.stringify({ itemId }) }),
  arenaSalvageBulk: (g: string, u: string, rarities: string[]) =>
    request<{ count: number; gained: number; tokens: number }>(`/arena/${g}/${u}/salvage-bulk`, { method: "POST", body: JSON.stringify({ rarities }) }),
  arenaUpgrade: (g: string, u: string, itemId: string) =>
    request<{ success: boolean; upgrade: number; cost: number; tokens: number }>(`/arena/${g}/${u}/upgrade`, { method: "POST", body: JSON.stringify({ itemId }) }),
  arenaReroll: (g: string, u: string, itemId: string) =>
    request<{ cost: number; tokens: number }>(`/arena/${g}/${u}/reroll`, { method: "POST", body: JSON.stringify({ itemId }) }),
  arenaWheel: (g: string, u: string) =>
    request<{ reward: { type: string; amount?: number; item?: { name: string; rarity: string; iLvl: number } }; tokens: number }>(`/arena/${g}/${u}/wheel`, { method: "POST", body: JSON.stringify({}) }),
  arenaWheelBulk: (g: string, u: string, count: number) =>
    request<{ spins: number; spent: number; jetonGained: number; items: { name: string; rarity: string; iLvl: number }[]; tokens: number }>(`/arena/${g}/${u}/wheel-bulk`, { method: "POST", body: JSON.stringify({ count }) }),
  // Arena skill tree
  arenaSkillAllocate: (g: string, u: string, nodeId: string) =>
    request<{ skills: Record<string, number>; available: number }>(`/arena/${g}/${u}/skill/allocate`, { method: "POST", body: JSON.stringify({ nodeId }) }),
  arenaSkillRespec: (g: string, u: string) =>
    request<{ skills: Record<string, number>; tokens: number; available: number }>(`/arena/${g}/${u}/skill/respec`, { method: "POST", body: JSON.stringify({}) }),
  // Arena aktif yetenekler + addon
  arenaAbilityEquip: (g: string, u: string, key: string) =>
    request<{ abilities: unknown }>(`/arena/${g}/${u}/ability/equip`, { method: "POST", body: JSON.stringify({ key }) }),
  arenaAbilityUnequip: (g: string, u: string, key: string) =>
    request<{ abilities: unknown }>(`/arena/${g}/${u}/ability/unequip`, { method: "POST", body: JSON.stringify({ key }) }),
  arenaAbilityAttach: (g: string, u: string, abilityKey: string, addonKey: string) =>
    request<{ abilities: unknown }>(`/arena/${g}/${u}/ability/attach`, { method: "POST", body: JSON.stringify({ abilityKey, addonKey }) }),
  arenaAbilityDetach: (g: string, u: string, abilityKey: string, addonKey: string) =>
    request<{ abilities: unknown }>(`/arena/${g}/${u}/ability/detach`, { method: "POST", body: JSON.stringify({ abilityKey, addonKey }) }),
  // Bot ayakta değilse bile panel açılabilsin diye "yumuşak" versiyon.
  safe: {
    async channels(guildId: string): Promise<ApiChannel[]> {
      try {
        return await botApi.channels(guildId);
      } catch {
        return [];
      }
    },
    async roles(guildId: string): Promise<ApiRole[]> {
      try {
        return await botApi.roles(guildId);
      } catch {
        return [];
      }
    },
    async guildInfo(guildId: string): Promise<ApiGuildInfo | null> {
      try {
        return await botApi.guildInfo(guildId);
      } catch {
        return null;
      }
    },
  },
};
