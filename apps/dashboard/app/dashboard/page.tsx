import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { signOut } from "@/auth";
import { getUserGuilds, guildIconUrl } from "@/lib/discord";
import { botApi } from "@/lib/botApi";

export const dynamic = "force-dynamic";

function inviteUrl(guildId: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID ?? "";
  const perms = "1374891765462"; // ManageRoles, ManageMessages, Kick/Ban, ModerateMembers, Connect/Speak vb.
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${perms}&guild_id=${guildId}`;
}

export default async function DashboardHome() {
  const session = await requireSession();
  const guilds = (await getUserGuilds(session.accessToken!)).filter((g) => g.canManage);

  // Botun hangi sunucularda olduğunu kontrol et.
  const presence = await Promise.all(
    guilds.map(async (g) => ({ id: g.id, inGuild: Boolean(await botApi.safe.guildInfo(g.id)) })),
  );
  const presenceMap = new Map(presence.map((p) => [p.id, p.inGuild]));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sunucularım</h1>
          <p className="text-sm text-gray-400">Yönettiğin sunuculardan birini seç.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn-ghost">Çıkış</button>
        </form>
      </header>

      {guilds.length === 0 ? (
        <div className="card text-center text-gray-400">
          Yönetici yetkin olan bir sunucu bulunamadı.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((g) => {
            const inGuild = presenceMap.get(g.id);
            const icon = guildIconUrl(g.id, g.icon);
            return (
              <div key={g.id} className="card flex flex-col">
                <div className="mb-4 flex items-center gap-3">
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" className="h-12 w-12 rounded-full" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-hover text-lg font-bold">
                      {g.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{g.name}</div>
                    <div className="text-xs text-gray-500">{g.owner ? "Sahip" : "Yönetici"}</div>
                  </div>
                </div>
                {inGuild ? (
                  <Link href={`/dashboard/${g.id}`} className="btn mt-auto">
                    Yönet
                  </Link>
                ) : (
                  <a href={inviteUrl(g.id)} target="_blank" rel="noreferrer" className="btn-ghost mt-auto">
                    Botu Ekle
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
