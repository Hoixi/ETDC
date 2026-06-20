import Link from "next/link";
import { botApi } from "@/lib/botApi";
import { getGuildRow } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const CARDS = [
  { slug: "roles", title: "Rol Mesajları", desc: "Butonlu rol panelleri oluştur", icon: "🎭" },
  { slug: "welcome", title: "Karşılama", desc: "Resimli karşılama/uğurlama kartı", icon: "👋" },
  { slug: "levels", title: "Level", desc: "XP ayarları ve ödül rolleri", icon: "⭐" },
  { slug: "logging", title: "Loglama", desc: "Olay log kanalları", icon: "📋" },
  { slug: "music", title: "Müzik", desc: "DJ rolü ve müzik ayarları", icon: "🎵" },
  { slug: "streams", title: "Yayın Bildirimi", desc: "Kick canlı bildirimi", icon: "🔴" },
];

export default async function GuildOverview({ params }: { params: { guildId: string } }) {
  const [info, row] = await Promise.all([
    botApi.safe.guildInfo(params.guildId),
    getGuildRow(params.guildId),
  ]);

  const panelCount = await import("@hoixi/db").then((m) =>
    m.prisma.rolePanel.count({ where: { guildId: params.guildId } }),
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Genel Bakış</h1>
      <p className="mb-6 text-sm text-gray-400">{info?.name ?? "Sunucu"} · {info?.memberCount ?? "?"} üye</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card"><div className="text-2xl font-bold text-white">{info?.memberCount ?? "—"}</div><div className="text-xs text-gray-500">Üye</div></div>
        <div className="card"><div className="text-2xl font-bold text-white">{panelCount}</div><div className="text-xs text-gray-500">Rol Paneli</div></div>
        <div className="card"><div className="text-2xl font-bold text-white">{row?.levelConfig ? "Özel" : "Varsayılan"}</div><div className="text-xs text-gray-500">Level Ayarı</div></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.slug} href={`/dashboard/${params.guildId}/${c.slug}`} className="card transition hover:border-accent">
            <div className="mb-2 text-2xl">{c.icon}</div>
            <div className="font-medium text-white">{c.title}</div>
            <div className="text-sm text-gray-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
