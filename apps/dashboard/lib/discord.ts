// Kullanıcının Discord sunucularını çekip "yönetebileceği" olanları süzer.
const MANAGE_GUILD = 1n << 5n; // 0x20
const ADMINISTRATOR = 1n << 3n; // 0x08

export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  canManage: boolean;
}

interface RawGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export async function getUserGuilds(accessToken: string): Promise<UserGuild[]> {
  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    // 60sn cache — Discord rate limitine takılmamak için.
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const guilds = (await res.json()) as RawGuild[];
  return guilds.map((g) => {
    const perms = BigInt(g.permissions ?? "0");
    const canManage = g.owner || (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
    return { id: g.id, name: g.name, icon: g.icon, owner: g.owner, canManage };
  });
}

export async function canManageGuild(accessToken: string, guildId: string): Promise<boolean> {
  const guilds = await getUserGuilds(accessToken);
  return guilds.some((g) => g.id === guildId && g.canManage);
}

export function guildIconUrl(id: string, icon: string | null): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=128` : null;
}
